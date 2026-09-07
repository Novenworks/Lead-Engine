import { z } from "zod";
import {
  DEFAULT_FETCH_LIMITS,
  extractObservations,
  factsFromSignals,
  fetchWebsite,
  normalizeEmail,
  observationsToSignals,
  scoreProspect,
  scoringConfigSchema,
  DEFAULT_SCORING_CONFIG,
  type SignalInput,
  type ScoringConfig,
} from "@leadengine/core";
import { createScreenshotProvider } from "@leadengine/providers";
import {
  createAuditWorkspaceClient,
  createDemoFactoryClient,
  auditHandoffSchema,
  demoFactoryHandoffSchema,
} from "@leadengine/integrations";
import { prisma, type EnrichmentStatus, type Prisma } from "@leadengine/db";
import type { ClaimedJob } from "./queue";
import { log } from "./log";

/**
 * Job handlers.
 *
 * The worker owns everything that touches the outside world: fetching a
 * prospect's homepage, capturing a screenshot, and pushing a handoff to
 * another Novenworks service. The web app only enqueues.
 */

/** Map a fetch failure onto the stored enrichment status. */
const FAILURE_STATUS: Record<string, EnrichmentStatus> = {
  INVALID_URL: "INVALID_URL",
  BLOCKED_SCHEME: "BLOCKED_BY_POLICY",
  BLOCKED_HOST: "BLOCKED_BY_POLICY",
  BLOCKED_PORT: "BLOCKED_BY_POLICY",
  BLOCKED_ADDRESS: "BLOCKED_BY_POLICY",
  DNS_FAILURE: "UNREACHABLE",
  TIMEOUT: "TIMEOUT",
  TOO_LARGE: "TOO_LARGE",
  UNSUPPORTED_CONTENT_TYPE: "FAILED",
  TOO_MANY_REDIRECTS: "FAILED",
  HTTP_ERROR: "UNREACHABLE",
  NETWORK_ERROR: "UNREACHABLE",
};

async function scoringConfig(workspaceId: string): Promise<ScoringConfig> {
  const row = await prisma.savedSearch.findUnique({
    where: {
      workspaceId_kind_name: { workspaceId, kind: "PROSPECT_VIEW", name: "__scoring_config" },
    },
  });
  if (!row) return DEFAULT_SCORING_CONFIG;
  const parsed = scoringConfigSchema.safeParse(row.params);
  return parsed.success ? parsed.data : DEFAULT_SCORING_CONFIG;
}

async function writeSignals(
  workspaceId: string,
  prospectId: string,
  signals: SignalInput[],
): Promise<void> {
  for (const signal of signals) {
    const data = {
      workspaceId,
      prospectId,
      type: signal.type,
      source: signal.source,
      confidence: signal.confidence ?? "MEDIUM",
      value: signal.value ?? null,
      numericValue: signal.numericValue ?? null,
      booleanValue: signal.booleanValue ?? null,
      evidence: signal.evidence ?? null,
      sourceReference: signal.sourceReference ?? null,
      observedAt: new Date(),
    };
    await prisma.prospectSignal.upsert({
      where: {
        prospectId_type_source: { prospectId, type: signal.type, source: signal.source },
      },
      create: data,
      update: data,
    });
  }
}

/**
 * Recompute and persist a prospect's score. Mirrors the web app's version;
 * both call the same pure engine, so the numbers cannot drift apart.
 */
export async function scoreOne(workspaceId: string, prospectId: string): Promise<number | null> {
  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, workspaceId },
    include: { signals: true, contacts: true, primaryLocation: true },
  });
  if (!prospect) return null;

  const config = await scoringConfig(workspaceId);
  const result = scoreProspect(
    factsFromSignals(prospect.signals, {
      primaryCategory: prospect.primaryCategory,
      secondaryCategories: prospect.secondaryCategories,
      region: prospect.primaryLocation?.region ?? prospect.region,
      hasWebsite: prospect.hasWebsite,
      hasPublicPhone: prospect.contacts.some((c) => c.kind === "PHONE"),
      hasPublicEmail: prospect.contacts.some((c) => c.kind === "EMAIL"),
    }),
    config,
  );

  await prisma.$transaction(async (tx) => {
    await tx.scoreSnapshot.create({
      data: {
        workspaceId,
        prospectId,
        total: result.total,
        businessFitScore: result.businessFitScore,
        businessStrengthScore: result.businessStrengthScore,
        websiteOpportunityScore: result.websiteOpportunityScore,
        reachabilityScore: result.reachabilityScore,
        suggestedQualification: result.suggestedQualification,
        disqualifiers: result.disqualifiers,
        modelVersion: result.modelVersion,
        components: { create: result.components },
      },
    });
    await tx.prospect.update({
      where: { id: prospectId },
      data: {
        opportunityScore: result.total,
        businessFitScore: result.businessFitScore,
        businessStrengthScore: result.businessStrengthScore,
        websiteOpportunityScore: result.websiteOpportunityScore,
        reachabilityScore: result.reachabilityScore,
        scoredAt: new Date(),
        agencyManaged: result.disqualifiers.includes("AGENCY_MANAGED"),
        ...(prospect.qualificationOverridden
          ? {}
          : { qualification: result.suggestedQualification }),
      },
    });
  });

  return result.total;
}

// --- WEBSITE_ENRICHMENT -----------------------------------------------------

const enrichPayload = z.object({ prospectId: z.string(), websiteId: z.string() });

async function handleWebsiteEnrichment(job: ClaimedJob): Promise<void> {
  const { prospectId, websiteId } = enrichPayload.parse(job.payload);

  const website = await prisma.website.findFirst({
    where: { id: websiteId, workspaceId: job.workspaceId, prospectId },
  });
  if (!website) {
    log.warn({ websiteId }, "website disappeared before enrichment; nothing to do");
    return;
  }

  const result = await fetchWebsite(website.url, DEFAULT_FETCH_LIMITS);

  if (!result.ok) {
    await prisma.website.update({
      where: { id: website.id },
      data: {
        enrichmentStatus: FAILURE_STATUS[result.reason] ?? "FAILED",
        enrichmentError: `${result.reason}: ${result.detail}`.slice(0, 400),
        lastEnrichedAt: new Date(),
        httpStatus: result.status ?? null,
      },
    });

    // A site that will not load is itself a strong signal, not just an error.
    await writeSignals(job.workspaceId, prospectId, [
      {
        type: "WEBSITE_FETCH_FAILED",
        source: "WEBSITE_FETCH",
        booleanValue: true,
        value: result.reason,
        confidence: "HIGH",
        evidence: result.detail,
        sourceReference: website.url,
      },
      {
        type: "WEBSITE_REACHABLE",
        source: "WEBSITE_FETCH",
        booleanValue: false,
        confidence: "HIGH",
        evidence: result.detail,
        sourceReference: website.url,
      },
    ]);

    await scoreOne(job.workspaceId, prospectId);
    await prisma.activityEvent.create({
      data: {
        workspaceId: job.workspaceId,
        prospectId,
        type: "PROSPECT_ENRICHED",
        summary: `Website inspection failed: ${result.reason}`,
        detail: { reason: result.reason, detail: result.detail },
      },
    });
    return;
  }

  const observations = extractObservations(result);
  const signals = observationsToSignals(result, observations, website.url);

  // Clear a previous failure so a recovered site is not stuck looking broken.
  await prisma.prospectSignal.deleteMany({
    where: { prospectId, type: "WEBSITE_FETCH_FAILED", source: "WEBSITE_FETCH" },
  });

  await writeSignals(job.workspaceId, prospectId, signals);

  await prisma.website.update({
    where: { id: website.id },
    data: {
      enrichmentStatus: observations.renderRequired ? "LIMITED" : "OK",
      enrichmentError: null,
      lastEnrichedAt: new Date(),
      finalUrl: result.finalUrl,
      httpStatus: result.status,
      usesHttps: result.usesHttps,
      title: observations.title,
      metaDescription: observations.metaDescription,
      responseMs: result.responseMs,
    },
  });

  // Public business emails found on the site become real contact records.
  for (const address of observations.emails.slice(0, 3)) {
    const email = normalizeEmail(address);
    if (!email) continue;
    await prisma.businessContact.upsert({
      where: { prospectId_kind_value: { prospectId, kind: "EMAIL", value: email } },
      create: {
        workspaceId: job.workspaceId,
        prospectId,
        kind: "EMAIL",
        value: email,
        normalized: email,
        source: "website",
      },
      update: {},
    });
  }

  for (const social of observations.socialLinks.slice(0, 5)) {
    await prisma.businessContact.upsert({
      where: { prospectId_kind_value: { prospectId, kind: "SOCIAL_URL", value: social } },
      create: {
        workspaceId: job.workspaceId,
        prospectId,
        kind: "SOCIAL_URL",
        value: social,
        normalized: social.toLowerCase(),
        source: "website",
      },
      update: {},
    });
  }

  const total = await scoreOne(job.workspaceId, prospectId);

  await prisma.activityEvent.create({
    data: {
      workspaceId: job.workspaceId,
      prospectId,
      type: "PROSPECT_ENRICHED",
      summary: `Website inspected — ${signals.length} signals recorded${
        total !== null ? `, score ${total}/100` : ""
      }`,
      detail: {
        agencyCredit: observations.agencyCredit?.confidence ?? null,
        cms: observations.cmsHint,
        renderRequired: observations.renderRequired,
      },
    },
  });
}

// --- SCREENSHOT_CAPTURE -----------------------------------------------------

const screenshotPayload = z.object({ prospectId: z.string(), websiteId: z.string() });

async function handleScreenshotCapture(job: ClaimedJob): Promise<void> {
  const { prospectId, websiteId } = screenshotPayload.parse(job.payload);
  const provider = createScreenshotProvider(process.env);

  if (!provider.isConfigured()) {
    // Not an error worth retrying: nothing is configured to do the work.
    log.info({ jobId: job.id }, "screenshot provider not configured; skipping");
    return;
  }

  const website = await prisma.website.findFirst({
    where: { id: websiteId, workspaceId: job.workspaceId, prospectId },
  });
  if (!website) return;

  const capture = await provider.capture({
    url: website.finalUrl ?? website.url,
    width: 1440,
    height: 900,
  });

  await prisma.screenshotReference.create({
    data: {
      workspaceId: job.workspaceId,
      prospectId,
      websiteId: website.id,
      provider: capture.provider,
      url: capture.url,
      storageKey: capture.storageKey,
      width: capture.width,
      height: capture.height,
    },
  });
}

// --- BULK_SCORE -------------------------------------------------------------

async function handleBulkScore(job: ClaimedJob): Promise<void> {
  const prospects = await prisma.prospect.findMany({
    where: { workspaceId: job.workspaceId, archivedAt: null },
    select: { id: true },
    take: 1000,
  });
  for (const prospect of prospects) {
    await scoreOne(job.workspaceId, prospect.id);
  }
  log.info({ count: prospects.length }, "bulk score complete");
}

// --- INTEGRATION_HANDOFF ----------------------------------------------------

const handoffPayload = z.object({ externalReferenceId: z.string() });

/**
 * Retry a handoff that was recorded while the integration was unavailable.
 * The payload stored on the reference is replayed verbatim.
 */
async function handleIntegrationHandoff(job: ClaimedJob): Promise<void> {
  const { externalReferenceId } = handoffPayload.parse(job.payload);

  const reference = await prisma.externalReference.findFirst({
    where: { id: externalReferenceId, workspaceId: job.workspaceId },
  });
  if (!reference) return;
  if (reference.status === "ACKNOWLEDGED") return;

  const stored = (reference.summary as { handoff?: unknown } | null)?.handoff;
  if (!stored) {
    await prisma.externalReference.update({
      where: { id: reference.id },
      data: { status: "FAILED", lastError: "No stored handoff payload to send." },
    });
    return;
  }

  if (reference.system === "AUDIT_WORKSPACE") {
    const client = createAuditWorkspaceClient(process.env);
    if (!client.configured) {
      log.info({ referenceId: reference.id }, "AuditWorkspace not configured; leaving pending");
      return;
    }
    const created = await client.createAudit(auditHandoffSchema.parse(stored));
    await prisma.externalReference.update({
      where: { id: reference.id },
      data: {
        status: "ACKNOWLEDGED",
        externalId: created.externalId,
        externalUrl: created.externalUrl,
        externalStatus: created.status,
        lastSyncedAt: new Date(),
        lastError: null,
      },
    });
    return;
  }

  const client = createDemoFactoryClient(process.env);
  if (!client.configured) {
    log.info({ referenceId: reference.id }, "Demo Factory not configured; leaving pending");
    return;
  }
  const created = await client.createProject(demoFactoryHandoffSchema.parse(stored));
  await prisma.externalReference.update({
    where: { id: reference.id },
    data: {
      status: "ACKNOWLEDGED",
      externalId: created.externalId,
      externalUrl: created.externalUrl,
      externalStatus: created.status,
      lastSyncedAt: new Date(),
      lastError: null,
    },
  });
}

// --- CSV_IMPORT -------------------------------------------------------------

async function handleCsvImport(job: ClaimedJob): Promise<void> {
  // CSV import is processed synchronously in the web app so the operator sees
  // validation errors immediately. The job type exists for a future
  // large-file path; today reaching here means something enqueued it by
  // mistake, and failing loudly is better than silently doing nothing.
  throw new Error(
    `CSV_IMPORT jobs are not handled by the worker (job ${job.id}); imports run in the web app.`,
  );
}

export async function runJob(job: ClaimedJob): Promise<void> {
  switch (job.type) {
    case "WEBSITE_ENRICHMENT":
      return handleWebsiteEnrichment(job);
    case "SCREENSHOT_CAPTURE":
      return handleScreenshotCapture(job);
    case "BULK_SCORE":
      return handleBulkScore(job);
    case "INTEGRATION_HANDOFF":
      return handleIntegrationHandoff(job);
    case "CSV_IMPORT":
      return handleCsvImport(job);
    case "DISCOVERY_DETAILS":
      // Details are fetched inline during a discovery run today.
      log.warn({ jobId: job.id }, "DISCOVERY_DETAILS is not implemented; marking complete");
      return;
    default: {
      const exhaustive: never = job.type;
      throw new Error(`Unknown job type: ${String(exhaustive)}`);
    }
  }
}

export type { Prisma };
