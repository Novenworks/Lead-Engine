import "server-only";
import { prisma } from "@leadengine/db";
import {
  auditHandoffSchema,
  demoFactoryHandoffSchema,
  type AuditHandoff,
  type DemoFactoryHandoff,
} from "@leadengine/integrations";

/**
 * Handoff payload assembly.
 *
 * The important discipline here is what these payloads *do not* say. LeadEngine
 * sends its shallow read under `leadEngineAssessment`, never as findings.
 * AuditWorkspace forms its own view of the site.
 */

export async function buildAuditHandoff(
  workspaceId: string,
  prospectId: string,
): Promise<AuditHandoff | null> {
  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, workspaceId },
    include: {
      primaryWebsite: true,
      primaryLocation: true,
      contacts: true,
      sources: true,
      signals: true,
      scoreSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!prospect) return null;

  const snapshot = prospect.scoreSnapshots[0];
  const agency = prospect.signals.find((s) => s.type === "AGENCY_CREDIT_DETECTED");

  const payload: AuditHandoff = {
    leadEngineProspectId: prospect.id,
    leadEngineWorkspaceId: workspaceId,
    business: {
      name: prospect.name,
      primaryCategory: prospect.primaryCategory,
      websiteUrl: prospect.primaryWebsite?.url ?? null,
      location: prospect.primaryLocation
        ? {
            formatted: prospect.primaryLocation.formatted,
            city: prospect.primaryLocation.city,
            region: prospect.primaryLocation.region,
            postalCode: prospect.primaryLocation.postalCode,
            latitude: prospect.primaryLocation.latitude,
            longitude: prospect.primaryLocation.longitude,
          }
        : null,
      // Public business contact details only — no personal contact data.
      contacts: prospect.contacts
        .filter((contact) => contact.kind === "PHONE" || contact.kind === "EMAIL")
        .map((contact) => ({ kind: contact.kind, value: contact.value })),
    },
    sources: prospect.sources.map((source) => ({
      provider: source.provider,
      externalId: source.externalId,
    })),
    leadEngineAssessment: {
      opportunityScore: snapshot?.total ?? prospect.opportunityScore ?? 0,
      businessFitScore: snapshot?.businessFitScore ?? 0,
      businessStrengthScore: snapshot?.businessStrengthScore ?? 0,
      websiteOpportunityScore: snapshot?.websiteOpportunityScore ?? 0,
      reachabilityScore: snapshot?.reachabilityScore ?? 0,
      scoringModelVersion: snapshot?.modelVersion ?? "unscored",
      qualification: prospect.qualification,
      signals: prospect.signals.map((signal) => ({
        type: signal.type,
        value: signal.value,
        booleanValue: signal.booleanValue,
        confidence: signal.confidence,
        evidence: signal.evidence,
        observedAt: signal.observedAt.toISOString(),
      })),
      agencyCredit: agency
        ? { detected: true, confidence: agency.confidence, evidence: agency.evidence }
        : { detected: false, confidence: null, evidence: null },
    },
    requestedAt: new Date().toISOString(),
  };

  // Parse before returning so a malformed payload fails here, with a clear
  // error, rather than at the far end of an HTTP call.
  return auditHandoffSchema.parse(payload);
}

export async function buildDemoFactoryHandoff(
  workspaceId: string,
  prospectId: string,
): Promise<DemoFactoryHandoff | null> {
  const prospect = await prisma.prospect.findFirst({
    where: { id: prospectId, workspaceId },
    include: {
      primaryWebsite: true,
      contacts: true,
      externalRefs: {
        where: { system: "AUDIT_WORKSPACE", externalId: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!prospect) return null;

  const audit = prospect.externalRefs[0];

  return demoFactoryHandoffSchema.parse({
    leadEngineProspectId: prospect.id,
    leadEngineWorkspaceId: workspaceId,
    business: {
      name: prospect.name,
      primaryCategory: prospect.primaryCategory,
      websiteUrl: prospect.primaryWebsite?.url ?? null,
      city: prospect.city,
      region: prospect.region,
      phone: prospect.contacts.find((c) => c.kind === "PHONE")?.value ?? null,
      email: prospect.contacts.find((c) => c.kind === "EMAIL")?.value ?? null,
    },
    auditReference:
      audit && audit.externalId
        ? {
            system: "AUDIT_WORKSPACE" as const,
            externalId: audit.externalId,
            externalUrl: audit.externalUrl,
          }
        : null,
    requestedAt: new Date().toISOString(),
  });
}
