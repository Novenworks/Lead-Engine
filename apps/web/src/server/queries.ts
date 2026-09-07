import "server-only";
import { z } from "zod";
import { prisma, type Prisma } from "@leadengine/db";
import { PIPELINE_STAGES } from "@leadengine/core";

/**
 * Read queries.
 *
 * All filtering, sorting and pagination happens in Postgres against indexed
 * columns. Nothing here returns an unbounded set for the client to filter.
 */

export const PAGE_SIZE = 50;

export const prospectFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  stage: z.enum(PIPELINE_STAGES).optional(),
  qualification: z.enum(["REVIEW", "QUALIFIED", "DISQUALIFIED"]).optional(),
  category: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  region: z.string().trim().max(40).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
  minReviews: z.coerce.number().int().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  website: z.enum(["any", "with", "without"]).default("any"),
  agency: z.enum(["any", "flagged", "clear"]).default("any"),
  sort: z
    .enum(["score", "name", "reviews", "activity", "opportunity", "strength"])
    .default("score"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  includeArchived: z.coerce.boolean().default(false),
});

export type ProspectFilters = z.infer<typeof prospectFilterSchema>;

export function parseProspectFilters(params: Record<string, string | undefined>): ProspectFilters {
  const parsed = prospectFilterSchema.safeParse(params);
  // A malformed query string falls back to defaults rather than erroring the page.
  return parsed.success ? parsed.data : prospectFilterSchema.parse({});
}

function buildWhere(workspaceId: string, filters: ProspectFilters): Prisma.ProspectWhereInput {
  const where: Prisma.ProspectWhereInput = { workspaceId };

  if (!filters.includeArchived) where.archivedAt = null;
  if (filters.stage) where.pipelineStage = filters.stage;
  if (filters.qualification) where.qualification = filters.qualification;
  if (filters.category) where.primaryCategory = { contains: filters.category, mode: "insensitive" };
  if (filters.city) where.city = { contains: filters.city, mode: "insensitive" };
  if (filters.region) where.region = { equals: filters.region, mode: "insensitive" };
  if (filters.minReviews !== undefined) where.reviewCount = { gte: filters.minReviews };
  if (filters.minRating !== undefined) where.rating = { gte: filters.minRating };
  if (filters.website === "with") where.hasWebsite = true;
  if (filters.website === "without") where.hasWebsite = false;
  if (filters.agency === "flagged") where.agencyManaged = true;
  if (filters.agency === "clear") where.agencyManaged = false;

  if (filters.minScore !== undefined || filters.maxScore !== undefined) {
    where.opportunityScore = {
      ...(filters.minScore !== undefined ? { gte: filters.minScore } : {}),
      ...(filters.maxScore !== undefined ? { lte: filters.maxScore } : {}),
    };
  }

  if (filters.q) {
    const term = filters.q;
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { normalizedName: { contains: term.toLowerCase() } },
      { primaryCategory: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
      { websites: { some: { rootDomain: { contains: term.toLowerCase() } } } },
      { notes: { some: { body: { contains: term, mode: "insensitive" } } } },
    ];
  }

  return where;
}

function buildOrderBy(filters: ProspectFilters): Prisma.ProspectOrderByWithRelationInput[] {
  const dir = filters.direction;
  switch (filters.sort) {
    case "name":
      return [{ name: dir }];
    case "reviews":
      return [{ reviewCount: { sort: dir, nulls: "last" } }, { name: "asc" }];
    case "activity":
      return [{ lastActivityAt: dir }];
    case "opportunity":
      return [{ websiteOpportunityScore: { sort: dir, nulls: "last" } }, { name: "asc" }];
    case "strength":
      return [{ businessStrengthScore: { sort: dir, nulls: "last" } }, { name: "asc" }];
    default:
      return [{ opportunityScore: { sort: dir, nulls: "last" } }, { name: "asc" }];
  }
}

export interface ProspectRow {
  id: string;
  name: string;
  primaryCategory: string | null;
  city: string | null;
  region: string | null;
  opportunityScore: number | null;
  businessStrengthScore: number | null;
  websiteOpportunityScore: number | null;
  rating: number | null;
  reviewCount: number | null;
  agencyManaged: boolean;
  hasWebsite: boolean;
  pipelineStage: string;
  qualification: string;
  lastActivityAt: Date;
  nextAction: string | null;
  websiteDomain: string | null;
}

export async function listProspects(
  workspaceId: string,
  filters: ProspectFilters,
): Promise<{ rows: ProspectRow[]; total: number; page: number; pageCount: number }> {
  const where = buildWhere(workspaceId, filters);
  const [total, records] = await Promise.all([
    prisma.prospect.count({ where }),
    prisma.prospect.findMany({
      where,
      orderBy: buildOrderBy(filters),
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { primaryWebsite: { select: { rootDomain: true } } },
    }),
  ]);

  return {
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    rows: records.map((record) => ({
      id: record.id,
      name: record.name,
      primaryCategory: record.primaryCategory,
      city: record.city,
      region: record.region,
      opportunityScore: record.opportunityScore,
      businessStrengthScore: record.businessStrengthScore,
      websiteOpportunityScore: record.websiteOpportunityScore,
      rating: record.rating,
      reviewCount: record.reviewCount,
      agencyManaged: record.agencyManaged,
      hasWebsite: record.hasWebsite,
      pipelineStage: record.pipelineStage,
      qualification: record.qualification,
      lastActivityAt: record.lastActivityAt,
      nextAction: record.nextAction,
      websiteDomain: record.primaryWebsite?.rootDomain ?? null,
    })),
  };
}

/** Points for the Opportunity Matrix — only prospects that have been scored. */
export async function matrixPoints(workspaceId: string, filters: ProspectFilters) {
  const where = buildWhere(workspaceId, filters);
  return prisma.prospect.findMany({
    where: { ...where, scoredAt: { not: null } },
    select: {
      id: true,
      name: true,
      primaryCategory: true,
      city: true,
      opportunityScore: true,
      businessStrengthScore: true,
      websiteOpportunityScore: true,
      reviewCount: true,
      rating: true,
      pipelineStage: true,
      qualification: true,
      agencyManaged: true,
    },
    orderBy: { opportunityScore: "desc" },
    take: 400,
  });
}

export async function getProspectDetail(workspaceId: string, prospectId: string) {
  return prisma.prospect.findFirst({
    where: { id: prospectId, workspaceId },
    include: {
      primaryWebsite: true,
      primaryLocation: true,
      websites: true,
      locations: true,
      contacts: { orderBy: { createdAt: "asc" } },
      signals: { orderBy: { type: "asc" } },
      sources: true,
      notes: { orderBy: { createdAt: "desc" }, take: 50 },
      stageHistory: { orderBy: { createdAt: "desc" }, take: 30 },
      externalRefs: { orderBy: { createdAt: "desc" } },
      screenshots: { orderBy: { capturedAt: "desc" }, take: 1 },
      activity: { orderBy: { createdAt: "desc" }, take: 40 },
      scoreSnapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { components: { orderBy: { sortOrder: "asc" } } },
      },
      tags: { include: { tag: true } },
    },
  });
}

export type ProspectDetail = NonNullable<Awaited<ReturnType<typeof getProspectDetail>>>;

export async function workspaceCounts(workspaceId: string) {
  const [total, qualified, review, disqualified, needsEnrichment, openDuplicates, pendingResults] =
    await Promise.all([
      prisma.prospect.count({ where: { workspaceId, archivedAt: null } }),
      prisma.prospect.count({
        where: { workspaceId, archivedAt: null, qualification: "QUALIFIED" },
      }),
      prisma.prospect.count({ where: { workspaceId, archivedAt: null, qualification: "REVIEW" } }),
      prisma.prospect.count({
        where: { workspaceId, archivedAt: null, qualification: "DISQUALIFIED" },
      }),
      prisma.website.count({ where: { workspaceId, enrichmentStatus: "NOT_ATTEMPTED" } }),
      prisma.duplicateCandidate.count({ where: { workspaceId, status: "OPEN" } }),
      prisma.discoveryResult.count({ where: { workspaceId, decision: "PENDING" } }),
    ]);
  return {
    total,
    qualified,
    review,
    disqualified,
    needsEnrichment,
    openDuplicates,
    pendingResults,
  };
}
