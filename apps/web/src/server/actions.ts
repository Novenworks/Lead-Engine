"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PIPELINE_STAGES, DISQUALIFICATION_REASONS, normalizeWebsiteUrl } from "@leadengine/core";
import { createDiscoveryProvider, discoverySearchInputSchema, DiscoveryProviderError } from "@leadengine/providers";
import { createAuditWorkspaceClient, createDemoFactoryClient, IntegrationError } from "@leadengine/integrations";
import { prisma, type Prisma } from "@leadengine/db";
import { requireWorkspace, assertProspectInWorkspace } from "@/lib/workspace";
import { providerEnv, integrationEnv } from "@/lib/env";
import { addManualProspect, addProspect } from "./prospect-write";
import { rescoreProspect, rescoreWorkspace, saveScoringConfig, getScoringConfig } from "./scoring";
import { enqueueScreenshot, enqueueWebsiteEnrichment } from "./jobs";
import { buildAuditHandoff, buildDemoFactoryHandoff } from "./handoff";

/**
 * Every mutation in the app.
 *
 * Rules that hold for all of them:
 *  - the workspace comes from the session, never from the form;
 *  - any id from the client is checked against that workspace first;
 *  - input is validated with zod at the boundary;
 *  - failures return a message instead of throwing an opaque 500.
 */

export interface ActionState {
  ok: boolean;
  message: string;
  /** Where to send the operator next, when the action created something. */
  redirectTo?: string;
}

function fail(message: string): ActionState {
  return { ok: false, message };
}

// --- Discovery --------------------------------------------------------------

export async function runDiscoverySearch(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const { workspaceId, userId } = await requireWorkspace();

  const parsed = discoverySearchInputSchema.safeParse({
    category: formData.get("category"),
    locationText: formData.get("locationText"),
    radiusMeters: formData.get("radiusMeters") ? Number(formData.get("radiusMeters")) : undefined,
    minRating: formData.get("minRating") ? Number(formData.get("minRating")) : undefined,
    minReviews: formData.get("minReviews") ? Number(formData.get("minReviews")) : undefined,
    websiteFilter: formData.get("websiteFilter") ?? "any",
    maxResults: formData.get("maxResults") ? Number(formData.get("maxResults")) : 20,
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the search fields and try again.");
  }
  const input = parsed.data;

  const provider = createDiscoveryProvider(providerEnv());

  const run = await prisma.discoveryRun.create({
    data: {
      workspaceId,
      provider: provider.id,
      category: input.category,
      locationText: input.locationText,
      radiusMeters: input.radiusMeters ?? null,
      minRating: input.minRating ?? null,
      minReviews: input.minReviews ?? null,
      websiteFilter: input.websiteFilter,
      createdByUserId: userId,
    },
  });

  try {
    const result = await provider.search(input);

    // Mark results that already exist so the operator is not asked to triage
    // a business they are already tracking.
    const domains = new Map<string, string>();
    for (const business of result.businesses) {
      const website = normalizeWebsiteUrl(business.websiteUrl);
      if (website) domains.set(business.externalId ?? website.rootDomain, website.rootDomain);
    }

    const known = await prisma.prospectIdentity.findMany({
      where: {
        workspaceId,
        OR: [
          {
            kind: "PROVIDER_PLACE_ID",
            namespace: provider.id,
            value: { in: result.businesses.map((b) => b.externalId ?? "").filter(Boolean) },
          },
          { kind: "ROOT_DOMAIN", value: { in: [...domains.values()] } },
        ],
      },
      select: { kind: true, value: true, prospectId: true },
    });
    const knownPlaceIds = new Map(
      known.filter((k) => k.kind === "PROVIDER_PLACE_ID").map((k) => [k.value, k.prospectId]),
    );
    const knownDomains = new Map(
      known.filter((k) => k.kind === "ROOT_DOMAIN").map((k) => [k.value, k.prospectId]),
    );

    await prisma.discoveryResult.createMany({
      data: result.businesses.map((business) => {
        const website = normalizeWebsiteUrl(business.websiteUrl);
        const existingId =
          (business.externalId ? knownPlaceIds.get(business.externalId) : undefined) ??
          (website ? knownDomains.get(website.rootDomain) : undefined) ??
          null;
        return {
          workspaceId,
          runId: run.id,
          externalId: business.externalId,
          name: business.name,
          category: business.category,
          formattedAddress: business.formattedAddress,
          city: business.city,
          region: business.region,
          postalCode: business.postalCode,
          latitude: business.latitude,
          longitude: business.longitude,
          phone: business.phone,
          websiteUrl: business.websiteUrl,
          rating: business.rating,
          reviewCount: business.reviewCount,
          businessStatus: business.businessStatus,
          prospectId: existingId,
          decision: existingId ? ("ALREADY_TRACKED" as const) : ("PENDING" as const),
        };
      }),
    });

    const newCount = result.businesses.filter((business) => {
      const website = normalizeWebsiteUrl(business.websiteUrl);
      return !(
        (business.externalId && knownPlaceIds.has(business.externalId)) ||
        (website && knownDomains.has(website.rootDomain))
      );
    }).length;

    await prisma.discoveryRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCEEDED",
        resultCount: result.businesses.length,
        newCount,
        finishedAt: new Date(),
      },
    });

    await prisma.providerUsage.create({
      data: {
        workspaceId,
        runId: run.id,
        provider: result.usage.provider,
        operation: result.usage.operation,
        requestCount: result.usage.requestCount,
        resultCount: result.usage.resultCount,
        durationMs: result.usage.durationMs,
        success: result.usage.success,
        reportedCostUsd: result.usage.reportedCostUsd ?? null,
      },
    });

    await prisma.activityEvent.create({
      data: {
        workspaceId,
        type: "DISCOVERY_RUN_COMPLETED",
        summary: `${input.category} in ${input.locationText} — ${result.businesses.length} results, ${newCount} new`,
        detail: { provider: provider.id, isFixture: result.isFixture },
        userId,
      },
    });

    revalidatePath("/discover");
    return {
      ok: true,
      message: `${result.businesses.length} results (${newCount} new).`,
      redirectTo: `/discover?run=${run.id}`,
    };
  } catch (error) {
    const code = error instanceof DiscoveryProviderError ? error.code : "PROVIDER_ERROR";
    await prisma.discoveryRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errorCode: code,
        errorMessage: error instanceof Error ? error.message.slice(0, 400) : String(error),
        finishedAt: new Date(),
      },
    });
    await prisma.providerUsage.create({
      data: {
        workspaceId,
        runId: run.id,
        provider: provider.id,
        operation: "searchText",
        requestCount: 1,
        resultCount: 0,
        success: false,
        errorCode: code,
      },
    });
    revalidatePath("/discover");

    const messages: Record<string, string> = {
      NOT_CONFIGURED: "The discovery provider is not configured. Check Settings.",
      INVALID_LOCATION: "That location could not be found. Try 'City, State'.",
      RATE_LIMITED: "The provider rate-limited this search. Wait a moment and retry.",
      QUOTA_EXCEEDED: "The provider's quota is exhausted. Check your API billing.",
      PROVIDER_UNAVAILABLE: "The discovery provider could not be reached.",
    };
    return fail(messages[code] ?? "The search failed. The run is recorded with the error.");
  }
}

const decisionSchema = z.object({
  resultIds: z.array(z.string().min(1)).min(1).max(200),
  decision: z.enum(["ADDED", "REJECTED"]),
});

export async function decideDiscoveryResults(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const { workspaceId, userId } = await requireWorkspace();

  const parsed = decisionSchema.safeParse({
    resultIds: formData.getAll("resultIds").map(String),
    decision: formData.get("decision"),
  });
  if (!parsed.success) return fail("Select at least one result first.");

  // Scoped by workspaceId, so ids from another workspace simply match nothing.
  const results = await prisma.discoveryResult.findMany({
    where: { id: { in: parsed.data.resultIds }, workspaceId, decision: "PENDING" },
    include: { run: { select: { provider: true } } },
  });
  if (results.length === 0) return fail("Those results have already been decided.");

  if (parsed.data.decision === "REJECTED") {
    await prisma.discoveryResult.updateMany({
      where: { id: { in: results.map((r) => r.id) }, workspaceId },
      data: { decision: "REJECTED", decidedAt: new Date(), decidedByUserId: userId },
    });
    revalidatePath("/discover");
    return { ok: true, message: `Rejected ${results.length} result(s).` };
  }

  let added = 0;
  let matched = 0;
  for (const result of results) {
    const outcome = await addProspect({
      workspaceId,
      userId,
      provider: result.run.provider === "google" ? "google" : "demo",
      isFixture: result.run.provider !== "google",
      business: {
        externalId: result.externalId,
        name: result.name,
        category: result.category,
        formattedAddress: result.formattedAddress,
        city: result.city,
        region: result.region,
        postalCode: result.postalCode,
        latitude: result.latitude,
        longitude: result.longitude,
        phone: result.phone,
        websiteUrl: result.websiteUrl,
        rating: result.rating,
        reviewCount: result.reviewCount,
        businessStatus: result.businessStatus,
        raw: { discoveryResultId: result.id },
      },
    });
    if (outcome.created) added++;
    else matched++;

    await prisma.discoveryResult.update({
      where: { id: result.id },
      data: {
        decision: outcome.created ? "ADDED" : "ALREADY_TRACKED",
        prospectId: outcome.prospectId,
        decidedAt: new Date(),
        decidedByUserId: userId,
      },
    });
  }

  revalidatePath("/discover");
  revalidatePath("/prospects");
  return {
    ok: true,
    message:
      matched > 0
        ? `Added ${added}. ${matched} already matched an existing prospect.`
        : `Added ${added} prospect(s).`,
  };
}

// --- Prospect creation ------------------------------------------------------

const manualSchema = z.object({
  name: z.string().trim().min(2, "Business name is required.").max(160),
  websiteUrl: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(160).optional(),
  category: z.string().trim().max(80).optional(),
  line1: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  region: z.string().trim().max(40).optional(),
  postalCode: z.string().trim().max(20).optional(),
  note: z.string().trim().max(2000).optional(),
});

export async function createProspect(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const { workspaceId, userId } = await requireWorkspace();

  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  if (parsed.data.websiteUrl && !normalizeWebsiteUrl(parsed.data.websiteUrl)) {
    return fail("That website address is not a usable http(s) URL.");
  }

  const result = await addManualProspect(workspaceId, userId, parsed.data);
  revalidatePath("/prospects");

  return {
    ok: true,
    message: result.created
      ? "Prospect created."
      : "That business is already tracked — opening the existing record.",
    redirectTo: `/prospects/${result.prospectId}`,
  };
}

// --- Enrichment and scoring -------------------------------------------------

export async function enrichProspect(prospectId: string): Promise<ActionState> {
  const { workspaceId } = await requireWorkspace();
  await assertProspectInWorkspace(workspaceId, prospectId);

  const website = await prisma.website.findFirst({
    where: { prospectId, workspaceId },
    orderBy: { createdAt: "asc" },
  });
  if (!website) return fail("This prospect has no website to inspect.");

  await enqueueWebsiteEnrichment(workspaceId, prospectId, website.id);
  await prisma.website.update({
    where: { id: website.id },
    data: { enrichmentStatus: "QUEUED", enrichmentError: null },
  });

  revalidatePath(`/prospects/${prospectId}`);
  return { ok: true, message: "Website inspection queued." };
}

export async function captureScreenshot(prospectId: string): Promise<ActionState> {
  const { workspaceId } = await requireWorkspace();
  await assertProspectInWorkspace(workspaceId, prospectId);

  const website = await prisma.website.findFirst({ where: { prospectId, workspaceId } });
  if (!website) return fail("This prospect has no website to capture.");

  await enqueueScreenshot(workspaceId, prospectId, website.id);
  revalidatePath(`/prospects/${prospectId}`);
  return { ok: true, message: "Screenshot queued." };
}

export async function rescore(prospectId: string): Promise<ActionState> {
  const { workspaceId, userId } = await requireWorkspace();
  await assertProspectInWorkspace(workspaceId, prospectId);
  const result = await rescoreProspect(workspaceId, prospectId, userId);
  revalidatePath(`/prospects/${prospectId}`);
  return result
    ? { ok: true, message: `Rescored: ${result.total}/100.` }
    : fail("Could not rescore this prospect.");
}

// --- Qualification and pipeline --------------------------------------------

const qualifySchema = z.object({
  prospectId: z.string().min(1),
  qualification: z.enum(["REVIEW", "QUALIFIED", "DISQUALIFIED"]),
  reason: z.enum(DISQUALIFICATION_REASONS).optional(),
  note: z.string().trim().max(600).optional(),
});

export async function setQualification(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const { workspaceId, userId } = await requireWorkspace();

  const parsed = qualifySchema.safeParse({
    prospectId: formData.get("prospectId"),
    qualification: formData.get("qualification"),
    reason: formData.get("reason") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return fail("Choose a qualification outcome.");

  const prospectId = await assertProspectInWorkspace(workspaceId, parsed.data.prospectId);
  const { qualification, reason, note } = parsed.data;

  if (qualification === "DISQUALIFIED" && !reason) {
    return fail("Pick a disqualification reason so the decision is reviewable later.");
  }

  const latest = await prisma.scoreSnapshot.findFirst({
    where: { prospectId, workspaceId },
    orderBy: { createdAt: "desc" },
    select: { suggestedQualification: true },
  });
  // An operator decision that differs from the engine is recorded as an override
  // so future rescoring does not silently undo it.
  const overriding = latest ? latest.suggestedQualification !== qualification : false;

  await prisma.$transaction(async (tx) => {
    await tx.prospect.update({
      where: { id: prospectId },
      data: {
        qualification,
        disqualificationReason: qualification === "DISQUALIFIED" ? reason : null,
        qualificationNote: note ?? null,
        qualificationOverridden: overriding,
        qualifiedByUserId: userId,
        qualifiedAt: new Date(),
        lastActivityAt: new Date(),
        // Qualifying advances the pipeline; the other outcomes leave it alone.
        ...(qualification === "QUALIFIED" ? { pipelineStage: "QUALIFIED" as const } : {}),
      },
    });

    if (qualification === "QUALIFIED") {
      await tx.pipelineStageHistory.create({
        data: { workspaceId, prospectId, toStage: "QUALIFIED", reason: note ?? null, userId },
      });
    }

    await tx.activityEvent.create({
      data: {
        workspaceId,
        prospectId,
        type:
          qualification === "QUALIFIED"
            ? "PROSPECT_QUALIFIED"
            : qualification === "DISQUALIFIED"
              ? "PROSPECT_DISQUALIFIED"
              : "PROSPECT_UPDATED",
        summary: overriding
          ? `Operator set qualification to ${qualification.toLowerCase()} (overriding the score)`
          : `Qualification set to ${qualification.toLowerCase()}`,
        detail: { reason: reason ?? null, note: note ?? null, overriding },
        userId,
      },
    });

    if (overriding) {
      await tx.activityEvent.create({
        data: {
          workspaceId,
          prospectId,
          type: "QUALIFICATION_OVERRIDDEN",
          summary: `Override: engine suggested ${latest?.suggestedQualification.toLowerCase()}, operator chose ${qualification.toLowerCase()}`,
          detail: { note: note ?? null },
          userId,
        },
      });
    }
  });

  revalidatePath(`/prospects/${prospectId}`);
  revalidatePath("/prospects");
  return { ok: true, message: `Marked ${qualification.toLowerCase()}.` };
}

export async function clearQualificationOverride(prospectId: string): Promise<ActionState> {
  const { workspaceId, userId } = await requireWorkspace();
  const id = await assertProspectInWorkspace(workspaceId, prospectId);
  await prisma.prospect.update({
    where: { id },
    data: { qualificationOverridden: false, qualificationNote: null },
  });
  await rescoreProspect(workspaceId, id, userId);
  revalidatePath(`/prospects/${id}`);
  return { ok: true, message: "Override cleared; the engine's verdict applies again." };
}

const stageSchema = z.object({
  prospectId: z.string().min(1),
  stage: z.enum(PIPELINE_STAGES),
  reason: z.string().trim().max(400).optional(),
});

export async function setStage(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const { workspaceId, userId } = await requireWorkspace();
  const parsed = stageSchema.safeParse({
    prospectId: formData.get("prospectId"),
    stage: formData.get("stage"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return fail("Choose a pipeline stage.");

  const prospectId = await assertProspectInWorkspace(workspaceId, parsed.data.prospectId);
  const current = await prisma.prospect.findUniqueOrThrow({
    where: { id: prospectId },
    select: { pipelineStage: true, name: true },
  });
  if (current.pipelineStage === parsed.data.stage) {
    return { ok: true, message: "Already at that stage." };
  }

  await prisma.$transaction([
    prisma.prospect.update({
      where: { id: prospectId },
      data: {
        pipelineStage: parsed.data.stage,
        lastActivityAt: new Date(),
        ...(parsed.data.stage === "ARCHIVED" ? { archivedAt: new Date() } : { archivedAt: null }),
      },
    }),
    prisma.pipelineStageHistory.create({
      data: {
        workspaceId,
        prospectId,
        fromStage: current.pipelineStage,
        toStage: parsed.data.stage,
        reason: parsed.data.reason ?? null,
        userId,
      },
    }),
    prisma.activityEvent.create({
      data: {
        workspaceId,
        prospectId,
        type: "STAGE_CHANGED",
        summary: `Stage: ${current.pipelineStage.toLowerCase()} → ${parsed.data.stage.toLowerCase()}`,
        userId,
      },
    }),
  ]);

  revalidatePath(`/prospects/${prospectId}`);
  revalidatePath("/pipeline");
  return { ok: true, message: `Moved to ${parsed.data.stage.toLowerCase()}.` };
}

// --- Notes and next action --------------------------------------------------

export async function addNote(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const { workspaceId, userId } = await requireWorkspace();
  const body = String(formData.get("body") ?? "").trim();
  const prospectId = await assertProspectInWorkspace(
    workspaceId,
    String(formData.get("prospectId") ?? ""),
  );
  if (body.length === 0) return fail("Write something first.");
  if (body.length > 4000) return fail("That note is too long (4000 characters max).");

  await prisma.$transaction([
    prisma.prospectNote.create({ data: { workspaceId, prospectId, body, userId } }),
    prisma.prospect.update({ where: { id: prospectId }, data: { lastActivityAt: new Date() } }),
    prisma.activityEvent.create({
      data: {
        workspaceId,
        prospectId,
        type: "NOTE_ADDED",
        summary: body.length > 80 ? `${body.slice(0, 80)}…` : body,
        userId,
      },
    }),
  ]);

  revalidatePath(`/prospects/${prospectId}`);
  return { ok: true, message: "Note added." };
}

export async function markForOutreach(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const { workspaceId, userId } = await requireWorkspace();
  const prospectId = await assertProspectInWorkspace(
    workspaceId,
    String(formData.get("prospectId") ?? ""),
  );
  const nextAction = String(formData.get("nextAction") ?? "").trim();
  const dateValue = String(formData.get("nextActionDate") ?? "").trim();
  if (nextAction.length === 0) return fail("Describe the next action.");

  const parsedDate = dateValue ? new Date(dateValue) : null;
  if (parsedDate && Number.isNaN(parsedDate.getTime())) return fail("That date is not valid.");

  await prisma.$transaction([
    prisma.prospect.update({
      where: { id: prospectId },
      data: {
        nextAction,
        nextActionDate: parsedDate,
        pipelineStage: "OUTREACH",
        lastActivityAt: new Date(),
      },
    }),
    prisma.pipelineStageHistory.create({
      data: { workspaceId, prospectId, toStage: "OUTREACH", reason: nextAction, userId },
    }),
    prisma.activityEvent.create({
      data: {
        workspaceId,
        prospectId,
        type: "OUTREACH_MARKED",
        summary: `Ready for outreach — ${nextAction}`,
        userId,
      },
    }),
  ]);

  revalidatePath(`/prospects/${prospectId}`);
  return { ok: true, message: "Marked ready for outreach." };
}

// --- Integrations -----------------------------------------------------------

export async function requestAudit(prospectId: string): Promise<ActionState> {
  const { workspaceId, userId } = await requireWorkspace();
  const id = await assertProspectInWorkspace(workspaceId, prospectId);

  const client = createAuditWorkspaceClient(integrationEnv());
  const handoff = await buildAuditHandoff(workspaceId, id);
  if (!handoff) return fail("Could not assemble the audit handoff for this prospect.");

  const reference = await prisma.externalReference.create({
    data: {
      workspaceId,
      prospectId: id,
      system: "AUDIT_WORKSPACE",
      status: "PENDING_HANDOFF",
      requestedByUserId: userId,
      summary: { handoff } as Prisma.InputJsonValue,
    },
  });

  await prisma.$transaction([
    prisma.prospect.update({
      where: { id },
      data: { pipelineStage: "AUDIT_REQUESTED", lastActivityAt: new Date() },
    }),
    prisma.pipelineStageHistory.create({
      data: { workspaceId, prospectId: id, toStage: "AUDIT_REQUESTED", userId },
    }),
    prisma.activityEvent.create({
      data: {
        workspaceId,
        prospectId: id,
        type: "AUDIT_REQUESTED",
        summary: client.configured
          ? "Audit requested from AuditWorkspace"
          : "Audit requested — held locally, AuditWorkspace is not configured",
        userId,
      },
    }),
  ]);

  if (!client.configured) {
    revalidatePath(`/prospects/${id}`);
    return {
      ok: true,
      message:
        "AuditWorkspace is not configured, so the request is recorded here and will be sent once the integration is set up.",
    };
  }

  try {
    const created = await client.createAudit(handoff);
    await prisma.externalReference.update({
      where: { id: reference.id },
      data: {
        status: "ACKNOWLEDGED",
        externalId: created.externalId,
        externalUrl: created.externalUrl,
        externalStatus: created.status,
        lastSyncedAt: new Date(),
      },
    });
    await prisma.activityEvent.create({
      data: {
        workspaceId,
        prospectId: id,
        type: "AUDIT_LINKED",
        summary: `AuditWorkspace audit ${created.externalId} linked`,
        userId,
      },
    });
    revalidatePath(`/prospects/${id}`);
    return { ok: true, message: "Handed off to AuditWorkspace." };
  } catch (error) {
    const code = error instanceof IntegrationError ? error.code : "UNAVAILABLE";
    await prisma.externalReference.update({
      where: { id: reference.id },
      data: {
        status: "FAILED",
        lastError: error instanceof Error ? error.message.slice(0, 400) : String(error),
      },
    });
    revalidatePath(`/prospects/${id}`);
    return fail(
      code === "UNAUTHORIZED"
        ? "AuditWorkspace rejected the API token. The request is saved and can be retried."
        : "AuditWorkspace could not be reached. The request is saved and can be retried.",
    );
  }
}

export async function requestDemoProject(prospectId: string): Promise<ActionState> {
  const { workspaceId, userId } = await requireWorkspace();
  const id = await assertProspectInWorkspace(workspaceId, prospectId);

  const client = createDemoFactoryClient(integrationEnv());
  const handoff = await buildDemoFactoryHandoff(workspaceId, id);
  if (!handoff) return fail("Could not assemble the Demo Factory handoff for this prospect.");

  const reference = await prisma.externalReference.create({
    data: {
      workspaceId,
      prospectId: id,
      system: "DEMO_FACTORY",
      status: "PENDING_HANDOFF",
      requestedByUserId: userId,
      summary: { handoff } as Prisma.InputJsonValue,
    },
  });

  await prisma.activityEvent.create({
    data: {
      workspaceId,
      prospectId: id,
      type: "DEMO_REQUESTED",
      summary: client.configured
        ? "Demo project requested from Demo Factory"
        : "Demo project requested — held locally, Demo Factory is not configured",
      userId,
    },
  });

  if (!client.configured) {
    revalidatePath(`/prospects/${id}`);
    return {
      ok: true,
      message:
        "Demo Factory is not configured, so the request is recorded here and will be sent once the integration is set up.",
    };
  }

  try {
    const created = await client.createProject(handoff);
    await prisma.externalReference.update({
      where: { id: reference.id },
      data: {
        status: "ACKNOWLEDGED",
        externalId: created.externalId,
        externalUrl: created.externalUrl,
        externalStatus: created.status,
        lastSyncedAt: new Date(),
      },
    });
    await prisma.prospect.update({
      where: { id },
      data: { pipelineStage: "DEMO_READY", lastActivityAt: new Date() },
    });
    revalidatePath(`/prospects/${id}`);
    return { ok: true, message: "Handed off to Demo Factory." };
  } catch (error) {
    await prisma.externalReference.update({
      where: { id: reference.id },
      data: {
        status: "FAILED",
        lastError: error instanceof Error ? error.message.slice(0, 400) : String(error),
      },
    });
    revalidatePath(`/prospects/${id}`);
    return fail("Demo Factory could not be reached. The request is saved and can be retried.");
  }
}

// --- Duplicates -------------------------------------------------------------

const duplicateSchema = z.object({
  candidateId: z.string().min(1),
  action: z.enum(["MERGE", "KEEP_SEPARATE", "DISMISS"]),
  /** Which of the pair survives a merge. */
  keepId: z.string().min(1).optional(),
});

export async function resolveDuplicate(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const { workspaceId, userId } = await requireWorkspace();
  const parsed = duplicateSchema.safeParse({
    candidateId: formData.get("candidateId"),
    action: formData.get("action"),
    keepId: formData.get("keepId") || undefined,
  });
  if (!parsed.success) return fail("Choose what to do with this suggestion.");

  const candidate = await prisma.duplicateCandidate.findFirst({
    where: { id: parsed.data.candidateId, workspaceId, status: "OPEN" },
  });
  if (!candidate) return fail("That suggestion has already been resolved.");

  if (parsed.data.action !== "MERGE") {
    await prisma.$transaction([
      prisma.duplicateCandidate.update({
        where: { id: candidate.id },
        data: {
          status: parsed.data.action === "DISMISS" ? "DISMISSED" : "KEPT_SEPARATE",
          resolvedAt: new Date(),
          resolvedByUserId: userId,
        },
      }),
      prisma.activityEvent.create({
        data: {
          workspaceId,
          prospectId: candidate.prospectAId,
          type: "DUPLICATE_DISMISSED",
          summary:
            parsed.data.action === "DISMISS"
              ? "Duplicate suggestion dismissed"
              : "Marked as two separate businesses",
          userId,
        },
      }),
    ]);
    revalidatePath("/duplicates");
    return { ok: true, message: "Suggestion resolved." };
  }

  const keepId = parsed.data.keepId;
  if (!keepId || ![candidate.prospectAId, candidate.prospectBId].includes(keepId)) {
    return fail("Choose which record to keep.");
  }
  const mergeId = keepId === candidate.prospectAId ? candidate.prospectBId : candidate.prospectAId;

  await mergeProspects(workspaceId, userId, keepId, mergeId, candidate.id);
  revalidatePath("/duplicates");
  revalidatePath("/prospects");
  return { ok: true, message: "Records merged; source provenance was preserved." };
}

/**
 * Merge two prospects.
 *
 * Provenance survives: sources, signals, notes, contacts, locations, websites,
 * identities and activity move to the surviving record. The merged record is
 * archived rather than deleted so history stays auditable.
 */
async function mergeProspects(
  workspaceId: string,
  userId: string | null,
  keepId: string,
  mergeId: string,
  candidateId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const merged = await tx.prospect.findFirstOrThrow({
      where: { id: mergeId, workspaceId },
      select: { name: true },
    });

    // Identities can collide; move the ones that do not and drop the rest,
    // since a colliding value already points at the surviving record.
    const identities = await tx.prospectIdentity.findMany({ where: { prospectId: mergeId } });
    for (const identity of identities) {
      const clash = await tx.prospectIdentity.findFirst({
        where: {
          workspaceId,
          kind: identity.kind,
          namespace: identity.namespace,
          value: identity.value,
          prospectId: keepId,
        },
      });
      if (clash) await tx.prospectIdentity.delete({ where: { id: identity.id } });
      else
        await tx.prospectIdentity.update({
          where: { id: identity.id },
          data: { prospectId: keepId },
        });
    }

    await tx.prospectSource.updateMany({ where: { prospectId: mergeId }, data: { prospectId: keepId } });
    await tx.prospectNote.updateMany({ where: { prospectId: mergeId }, data: { prospectId: keepId } });
    await tx.businessLocation.updateMany({ where: { prospectId: mergeId }, data: { prospectId: keepId } });
    await tx.activityEvent.updateMany({ where: { prospectId: mergeId }, data: { prospectId: keepId } });
    await tx.externalReference.updateMany({ where: { prospectId: mergeId }, data: { prospectId: keepId } });

    // Websites and contacts carry uniqueness constraints scoped to the
    // prospect, so move only the ones that would not collide.
    const websites = await tx.website.findMany({ where: { prospectId: mergeId } });
    for (const website of websites) {
      const clash = await tx.website.findFirst({
        where: { prospectId: keepId, rootDomain: website.rootDomain },
      });
      if (!clash) await tx.website.update({ where: { id: website.id }, data: { prospectId: keepId } });
    }
    const contacts = await tx.businessContact.findMany({ where: { prospectId: mergeId } });
    for (const contact of contacts) {
      const clash = await tx.businessContact.findFirst({
        where: { prospectId: keepId, kind: contact.kind, value: contact.value },
      });
      if (!clash)
        await tx.businessContact.update({ where: { id: contact.id }, data: { prospectId: keepId } });
    }

    await tx.prospect.update({
      where: { id: mergeId },
      data: {
        archivedAt: new Date(),
        pipelineStage: "ARCHIVED",
        qualification: "DISQUALIFIED",
        disqualificationReason: "DUPLICATE",
        qualificationNote: `Merged into ${keepId}`,
        primaryWebsiteId: null,
        primaryLocationId: null,
      },
    });

    await tx.duplicateCandidate.update({
      where: { id: candidateId },
      data: { status: "MERGED", resolvedAt: new Date(), resolvedByUserId: userId },
    });

    await tx.activityEvent.create({
      data: {
        workspaceId,
        prospectId: keepId,
        type: "DUPLICATE_MERGED",
        summary: `Merged duplicate "${merged.name}" into this record`,
        detail: { mergedProspectId: mergeId },
        userId,
      },
    });
  });

  await rescoreProspect(workspaceId, keepId, userId);
}

// --- Saved searches ---------------------------------------------------------

export async function saveSearch(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const { workspaceId, userId } = await requireWorkspace();
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "PROSPECT_VIEW");
  const params = String(formData.get("params") ?? "");

  if (name.length < 2) return fail("Give the saved search a name.");
  if (name.startsWith("__")) return fail("Names starting with __ are reserved.");
  if (kind !== "PROSPECT_VIEW" && kind !== "DISCOVERY") return fail("Unknown saved search type.");

  let parsedParams: Record<string, string>;
  try {
    parsedParams = Object.fromEntries(new URLSearchParams(params));
  } catch {
    return fail("Could not read the current filters.");
  }

  await prisma.savedSearch.upsert({
    where: { workspaceId_kind_name: { workspaceId, kind, name } },
    create: { workspaceId, kind, name, params: parsedParams, createdByUserId: userId },
    update: { params: parsedParams },
  });

  revalidatePath("/saved");
  return { ok: true, message: `Saved "${name}".` };
}

export async function deleteSavedSearch(id: string): Promise<ActionState> {
  const { workspaceId } = await requireWorkspace();
  const deleted = await prisma.savedSearch.deleteMany({ where: { id, workspaceId } });
  revalidatePath("/saved");
  return deleted.count > 0
    ? { ok: true, message: "Saved search deleted." }
    : fail("That saved search no longer exists.");
}

// --- Settings ---------------------------------------------------------------

export async function updateScoringSettings(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const { workspaceId, userId } = await requireWorkspace();
  const current = await getScoringConfig(workspaceId);

  const list = (value: FormDataEntryValue | null): string[] =>
    String(value ?? "")
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

  const qualifyThreshold = Number(formData.get("qualifyThreshold"));
  const reviewFloor = Number(formData.get("reviewFloor"));
  if (!Number.isFinite(qualifyThreshold) || !Number.isFinite(reviewFloor)) {
    return fail("Thresholds must be numbers.");
  }
  if (reviewFloor >= qualifyThreshold) {
    return fail("The review floor must be below the qualify threshold.");
  }

  try {
    await saveScoringConfig(workspaceId, {
      ...current,
      targetCategories: list(formData.get("targetCategories")),
      excludedCategories: list(formData.get("excludedCategories")),
      targetRegions: list(formData.get("targetRegions")),
      qualifyThreshold,
      reviewFloor,
      agencyCreditDisqualifies: formData.get("agencyCreditDisqualifies") === "on",
      minReviewsForRating: Number(formData.get("minReviewsForRating")) || current.minReviewsForRating,
      minBusinessStrengthToQualify: Number(formData.get("minBusinessStrengthToQualify") ?? current.minBusinessStrengthToQualify),
    });
  } catch {
    return fail("Those settings are not valid.");
  }

  const count = await rescoreWorkspace(workspaceId, userId);
  revalidatePath("/settings");
  revalidatePath("/prospects");
  return { ok: true, message: `Settings saved. ${count} prospect(s) rescored.` };
}
