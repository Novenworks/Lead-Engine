import "server-only";
import {
  DEFAULT_SCORING_CONFIG,
  factsFromSignals,
  scoreProspect,
  scoringConfigSchema,
  type ScoringConfig,
} from "@leadengine/core";
import { prisma } from "@leadengine/db";

/**
 * Scoring, persisted.
 *
 * The engine itself is pure and lives in @leadengine/core. This module is only
 * responsible for gathering facts, writing the snapshot with its components,
 * and refreshing the denormalized columns the list and matrix views read.
 */

/**
 * Workspace scoring configuration.
 *
 * V1 stores it as a SavedSearch-adjacent settings row rather than a bespoke
 * table: one JSON document per workspace, validated on read so a bad edit
 * degrades to defaults instead of breaking scoring.
 */
const SETTINGS_NAME = "__scoring_config";

export async function getScoringConfig(workspaceId: string): Promise<ScoringConfig> {
  const row = await prisma.savedSearch.findUnique({
    where: {
      workspaceId_kind_name: { workspaceId, kind: "PROSPECT_VIEW", name: SETTINGS_NAME },
    },
  });
  if (!row) return DEFAULT_SCORING_CONFIG;

  const parsed = scoringConfigSchema.safeParse(row.params);
  return parsed.success ? parsed.data : DEFAULT_SCORING_CONFIG;
}

export async function saveScoringConfig(
  workspaceId: string,
  config: ScoringConfig,
): Promise<void> {
  const params = scoringConfigSchema.parse(config);
  await prisma.savedSearch.upsert({
    where: {
      workspaceId_kind_name: { workspaceId, kind: "PROSPECT_VIEW", name: SETTINGS_NAME },
    },
    create: { workspaceId, kind: "PROSPECT_VIEW", name: SETTINGS_NAME, params },
    update: { params },
  });
}

export interface RescoreResult {
  total: number;
  suggestedQualification: "REVIEW" | "QUALIFIED" | "DISQUALIFIED";
  disqualifiers: string[];
}

/**
 * Recompute and store a prospect's Opportunity Score.
 *
 * An operator override is respected: if `qualificationOverridden` is set, the
 * score is refreshed but the qualification verdict is left alone, so a human
 * decision is never quietly reversed by a re-run.
 */
export async function rescoreProspect(
  workspaceId: string,
  prospectId: string,
  userId: string | null,
): Promise<RescoreResult | null> {
  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, workspaceId },
    include: {
      signals: true,
      contacts: true,
      primaryLocation: true,
    },
  });
  if (!prospect) return null;

  const config = await getScoringConfig(workspaceId);

  const facts = factsFromSignals(prospect.signals, {
    primaryCategory: prospect.primaryCategory,
    secondaryCategories: prospect.secondaryCategories,
    region: prospect.primaryLocation?.region ?? prospect.region,
    hasWebsite: prospect.hasWebsite,
    hasPublicPhone: prospect.contacts.some((c) => c.kind === "PHONE"),
    hasPublicEmail: prospect.contacts.some((c) => c.kind === "EMAIL"),
  });

  const result = scoreProspect(facts, config);

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
        components: {
          create: result.components.map((component) => ({
            dimension: component.dimension,
            key: component.key,
            label: component.label,
            points: component.points,
            maxPoints: component.maxPoints,
            reason: component.reason,
            signalTypes: component.signalTypes,
            sortOrder: component.sortOrder,
          })),
        },
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
        // A human verdict outranks the rules engine.
        ...(prospect.qualificationOverridden
          ? {}
          : { qualification: result.suggestedQualification }),
      },
    });

    await tx.activityEvent.create({
      data: {
        workspaceId,
        prospectId,
        type: "PROSPECT_SCORED",
        summary: `Scored ${result.total}/100 (${result.suggestedQualification.toLowerCase()})`,
        detail: { disqualifiers: result.disqualifiers, modelVersion: result.modelVersion },
        userId,
      },
    });
  });

  return {
    total: result.total,
    suggestedQualification: result.suggestedQualification,
    disqualifiers: result.disqualifiers,
  };
}

/** Rescore many prospects, e.g. after a settings change. */
export async function rescoreWorkspace(
  workspaceId: string,
  userId: string | null,
  limit = 500,
): Promise<number> {
  const prospects = await prisma.prospect.findMany({
    where: { workspaceId, archivedAt: null },
    select: { id: true },
    take: limit,
  });
  for (const prospect of prospects) {
    await rescoreProspect(workspaceId, prospect.id, userId);
  }
  return prospects.length;
}
