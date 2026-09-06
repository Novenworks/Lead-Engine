import "server-only";
import {
  buildIdentities,
  identifyingIdentities,
  normalizeAddress,
  normalizeBusinessName,
  normalizeEmail,
  normalizePhone,
  normalizeWebsiteUrl,
  weakDuplicateMatch,
  DUPLICATE_SUGGESTION_THRESHOLD,
  type SignalInput,
} from "@leadengine/core";
import type { DiscoveryBusiness } from "@leadengine/providers";
import { prisma, type Prisma } from "@leadengine/db";
import { rescoreProspect } from "./scoring";

/**
 * The single write path for creating a prospect, whether the business came
 * from a discovery run, a CSV import or a manual form.
 *
 * Deduplication happens here, not in the UI:
 *   - strong identifiers (place id, root domain, phone, address hash) collapse
 *     onto the existing prospect;
 *   - weak name/locality similarity produces a DuplicateCandidate for a human.
 */

export type ProspectOrigin = "google" | "demo" | "manual" | "csv";

export interface AddProspectInput {
  workspaceId: string;
  userId: string | null;
  provider: ProspectOrigin;
  business: DiscoveryBusiness;
  /** True when the business came from the fictional demo provider. */
  isFixture: boolean;
  /**
   * The real street line, when the caller has it as a separate field.
   *
   * Providers return one `formattedAddress` that starts with the street, so
   * splitting on the first comma is right for them. Manual and CSV entry have
   * the street as its own field and must pass it here — deriving it from a
   * synthesized "City, State" string would yield the city and give every
   * address-less business in that city the same identity.
   */
  addressLine1?: string | null;
}

export interface AddProspectResult {
  prospectId: string;
  created: boolean;
  /** Set when a strong identifier matched an existing prospect. */
  matchedOn: string | null;
  duplicateCandidateIds: string[];
}

/** The transactional client Prisma hands to `$transaction` callbacks. */
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function signalSource(provider: ProspectOrigin): SignalInput["source"] {
  switch (provider) {
    case "google":
      return "GOOGLE_PLACES";
    case "demo":
      return "DEMO_PROVIDER";
    case "csv":
      return "CSV_IMPORT";
    default:
      return "MANUAL";
  }
}

/** Provider-derived facts, recorded as signals so scoring has one input shape. */
function providerSignals(business: DiscoveryBusiness, provider: ProspectOrigin): SignalInput[] {
  const source = signalSource(provider);
  const reference = business.externalId ?? provider;
  const signals: SignalInput[] = [];

  if (business.category) {
    signals.push({
      type: "BUSINESS_CATEGORY",
      source,
      value: business.category,
      confidence: "HIGH",
      evidence: `Category reported by ${provider}: ${business.category}`,
      sourceReference: reference,
    });
  }
  if (business.rating !== null) {
    signals.push({
      type: "GOOGLE_RATING",
      source,
      numericValue: business.rating,
      value: business.rating.toFixed(1),
      confidence: "HIGH",
      evidence: `${business.rating.toFixed(1)} stars`,
      sourceReference: reference,
    });
  }
  if (business.reviewCount !== null) {
    signals.push({
      type: "GOOGLE_REVIEW_COUNT",
      source,
      numericValue: business.reviewCount,
      value: String(business.reviewCount),
      confidence: "HIGH",
      evidence: `${business.reviewCount} reviews`,
      sourceReference: reference,
    });
  }

  signals.push({
    type: "PHONE_PRESENT",
    source,
    booleanValue: Boolean(normalizePhone(business.phone)),
    value: normalizePhone(business.phone),
    confidence: "HIGH",
    evidence: business.phone ? `Public phone: ${business.phone}` : "No public phone found",
    sourceReference: reference,
  });

  signals.push({
    type: "WEBSITE_PRESENT",
    source,
    booleanValue: Boolean(normalizeWebsiteUrl(business.websiteUrl)),
    value: business.websiteUrl,
    confidence: "HIGH",
    evidence: business.websiteUrl ? `Website: ${business.websiteUrl}` : "No website on file",
    sourceReference: reference,
  });

  if (business.businessStatus && business.businessStatus !== "OPERATIONAL") {
    signals.push({
      type: "BUSINESS_CLOSED",
      source,
      booleanValue: true,
      value: business.businessStatus,
      confidence: "HIGH",
      evidence: `${provider} reports status ${business.businessStatus}`,
      sourceReference: reference,
    });
  }

  return signals;
}

/** Upsert signals so re-running discovery or enrichment refreshes rather than duplicates. */
export async function writeSignals(
  tx: Tx,
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
    await tx.prospectSignal.upsert({
      where: {
        prospectId_type_source: {
          prospectId,
          type: signal.type,
          source: signal.source,
        },
      },
      create: data,
      update: data,
    });
  }
}

async function findByIdentities(
  tx: Tx,
  workspaceId: string,
  identities: ReturnType<typeof buildIdentities>,
): Promise<{ prospectId: string; matchedOn: string } | null> {
  if (identities.length === 0) return null;
  const match = await tx.prospectIdentity.findFirst({
    where: {
      workspaceId,
      OR: identities.map((identity) => ({
        kind: identity.kind,
        namespace: identity.namespace,
        value: identity.value,
      })),
    },
    // Place ids are the most trustworthy; fall back to the rest in schema order.
    orderBy: { kind: "asc" },
  });
  if (!match) return null;
  return { prospectId: match.prospectId, matchedOn: match.kind };
}

async function attachIdentities(
  tx: Tx,
  workspaceId: string,
  prospectId: string,
  identities: ReturnType<typeof buildIdentities>,
): Promise<void> {
  for (const identity of identities) {
    // A value already claimed by a different prospect is left alone: stealing
    // it would silently rewrite the other record's identity.
    await tx.prospectIdentity.createMany({
      data: [{ workspaceId, prospectId, kind: identity.kind, namespace: identity.namespace, value: identity.value }],
      skipDuplicates: true,
    });
  }
}

/**
 * Look for weak duplicates of a freshly created prospect and record them as
 * suggestions. Never merges — the operator decides.
 */
async function suggestDuplicates(
  tx: Tx,
  workspaceId: string,
  prospect: { id: string; name: string; normalizedName: string; city: string | null; region: string | null },
): Promise<string[]> {
  // Candidates share at least one name token, which keeps this cheap.
  const tokens = prospect.normalizedName.split(" ").filter((t) => t.length > 2);
  if (tokens.length === 0) return [];

  const nearby = await tx.prospect.findMany({
    where: {
      workspaceId,
      id: { not: prospect.id },
      archivedAt: null,
      OR: tokens.map((token) => ({ normalizedName: { contains: token } })),
    },
    select: { id: true, name: true, city: true, region: true },
    take: 25,
  });

  const created: string[] = [];
  for (const other of nearby) {
    const match = weakDuplicateMatch(
      { name: prospect.name, city: prospect.city, region: prospect.region },
      { name: other.name, city: other.city, region: other.region },
    );
    if (match.confidence < DUPLICATE_SUGGESTION_THRESHOLD) continue;

    // Order the pair deterministically so A/B and B/A cannot both exist.
    const [a, b] = prospect.id < other.id ? [prospect.id, other.id] : [other.id, prospect.id];
    const existing = await tx.duplicateCandidate.findUnique({
      where: { prospectAId_prospectBId: { prospectAId: a, prospectBId: b } },
    });
    if (existing) continue;

    const row = await tx.duplicateCandidate.create({
      data: {
        workspaceId,
        prospectAId: a,
        prospectBId: b,
        confidence: match.confidence,
        reasons: match.reasons,
      },
    });
    created.push(row.id);
  }
  return created;
}

/**
 * Add a business to the workspace, or attach it to the prospect it already is.
 */
export async function addProspect(input: AddProspectInput): Promise<AddProspectResult> {
  const { workspaceId, userId, provider, business } = input;

  const addressParts = {
    line1: input.addressLine1 ?? business.formattedAddress?.split(",")[0] ?? null,
    city: business.city,
    region: business.region,
    postalCode: business.postalCode,
    country: "US",
  };

  const identities = identifyingIdentities(
    buildIdentities({
      provider,
      externalId: business.externalId,
      websiteUrl: business.websiteUrl,
      phone: business.phone,
      address: addressParts,
    }),
  );

  const website = normalizeWebsiteUrl(business.websiteUrl);
  const phone = normalizePhone(business.phone);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await findByIdentities(tx, workspaceId, identities);

    if (existing) {
      // Same business seen again: refresh provenance and signals, keep the
      // operator's stage, qualification and notes untouched.
      await tx.prospectSource.upsert({
        where: {
          workspaceId_provider_externalId: {
            workspaceId,
            provider,
            externalId: business.externalId ?? "",
          },
        },
        create: {
          workspaceId,
          prospectId: existing.prospectId,
          provider,
          externalId: business.externalId ?? "",
          raw: business.raw as Prisma.InputJsonValue,
        },
        update: { lastSeenAt: new Date(), raw: business.raw as Prisma.InputJsonValue },
      });
      await attachIdentities(tx, workspaceId, existing.prospectId, identities);
      await writeSignals(tx, workspaceId, existing.prospectId, providerSignals(business, provider));

      return {
        prospectId: existing.prospectId,
        created: false,
        matchedOn: existing.matchedOn,
        duplicateCandidateIds: [] as string[],
      };
    }

    const prospect = await tx.prospect.create({
      data: {
        workspaceId,
        name: business.name,
        normalizedName: normalizeBusinessName(business.name),
        primaryCategory: business.category,
        rating: business.rating,
        reviewCount: business.reviewCount,
        hasWebsite: Boolean(website),
        city: business.city,
        region: business.region,
        stageHistory: {
          create: { workspaceId, toStage: "DISCOVERED", reason: `Added from ${provider}`, userId },
        },
        sources: {
          create: {
            workspaceId,
            provider,
            externalId: business.externalId ?? "",
            raw: business.raw as Prisma.InputJsonValue,
          },
        },
      },
    });

    const location = await tx.businessLocation.create({
      data: {
        workspaceId,
        prospectId: prospect.id,
        line1: addressParts.line1,
        city: business.city,
        region: business.region,
        postalCode: business.postalCode,
        country: "US",
        formatted: business.formattedAddress,
        normalized: normalizeAddress(addressParts),
        latitude: business.latitude,
        longitude: business.longitude,
      },
    });

    let websiteId: string | null = null;
    if (website) {
      const row = await tx.website.create({
        data: {
          workspaceId,
          prospectId: prospect.id,
          url: website.url,
          rootDomain: website.rootDomain,
          usesHttps: website.usesHttps,
        },
      });
      websiteId = row.id;
    }

    await tx.prospect.update({
      where: { id: prospect.id },
      data: { primaryLocationId: location.id, primaryWebsiteId: websiteId },
    });

    if (phone) {
      await tx.businessContact.create({
        data: {
          workspaceId,
          prospectId: prospect.id,
          kind: "PHONE",
          value: business.phone ?? phone,
          normalized: phone,
          source: provider,
        },
      });
    }

    await attachIdentities(tx, workspaceId, prospect.id, identities);
    await writeSignals(tx, workspaceId, prospect.id, providerSignals(business, provider));

    const duplicateCandidateIds = await suggestDuplicates(tx, workspaceId, {
      id: prospect.id,
      name: prospect.name,
      normalizedName: prospect.normalizedName,
      city: prospect.city,
      region: prospect.region,
    });

    await tx.activityEvent.create({
      data: {
        workspaceId,
        prospectId: prospect.id,
        type: "PROSPECT_ADDED",
        summary: `${prospect.name} added from ${provider}${input.isFixture ? " (demo data)" : ""}`,
        userId,
      },
    });

    return {
      prospectId: prospect.id,
      created: true,
      matchedOn: null,
      duplicateCandidateIds,
    };
  });

  // Scoring runs outside the transaction: it only reads signals and writes a
  // snapshot, and keeping it out shortens the lock window.
  await rescoreProspect(workspaceId, result.prospectId, userId);
  return result;
}

export interface ManualProspectInput {
  name: string;
  websiteUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  category?: string | null;
  line1?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  note?: string | null;
}

/** Manual and CSV entry funnel into the same write path as discovery. */
export async function addManualProspect(
  workspaceId: string,
  userId: string | null,
  input: ManualProspectInput,
  provider: ProspectOrigin = "manual",
): Promise<AddProspectResult> {
  const addressLine = [input.line1, input.city, input.region, input.postalCode]
    .filter((part) => part && part.trim().length > 0)
    .join(", ");

  const result = await addProspect({
    workspaceId,
    userId,
    provider,
    isFixture: false,
    addressLine1: input.line1?.trim() || null,
    business: {
      externalId: null,
      name: input.name.trim(),
      category: input.category?.trim() || null,
      formattedAddress: addressLine || null,
      city: input.city?.trim() || null,
      region: input.region?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      latitude: null,
      longitude: null,
      phone: input.phone?.trim() || null,
      websiteUrl: input.websiteUrl?.trim() || null,
      rating: null,
      reviewCount: null,
      businessStatus: null,
      raw: { provider, enteredBy: userId },
    },
  });

  const email = normalizeEmail(input.email);
  if (email) {
    await prisma.businessContact.upsert({
      where: {
        prospectId_kind_value: { prospectId: result.prospectId, kind: "EMAIL", value: email },
      },
      create: {
        workspaceId,
        prospectId: result.prospectId,
        kind: "EMAIL",
        value: email,
        normalized: email,
        source: provider,
      },
      update: {},
    });
    await prisma.prospectSignal.upsert({
      where: {
        prospectId_type_source: {
          prospectId: result.prospectId,
          type: "PUBLIC_EMAIL_PRESENT",
          source: provider === "csv" ? "CSV_IMPORT" : "MANUAL",
        },
      },
      create: {
        workspaceId,
        prospectId: result.prospectId,
        type: "PUBLIC_EMAIL_PRESENT",
        source: provider === "csv" ? "CSV_IMPORT" : "MANUAL",
        booleanValue: true,
        value: email,
        confidence: "HIGH",
        evidence: `Business email entered by an operator: ${email}`,
      },
      update: { value: email, booleanValue: true },
    });
    await rescoreProspect(workspaceId, result.prospectId, userId);
  }

  if (input.note?.trim()) {
    await prisma.prospectNote.create({
      data: { workspaceId, prospectId: result.prospectId, body: input.note.trim(), userId },
    });
  }

  return result;
}
