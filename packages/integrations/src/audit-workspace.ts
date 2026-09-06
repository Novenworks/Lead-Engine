import { z } from "zod";

/**
 * AuditWorkspace integration boundary.
 *
 * LeadEngine finds the opportunity; AuditWorkspace proves it. This file is the
 * whole contract between them. Two rules it enforces:
 *
 *  1. We never touch AuditWorkspace's database. HTTP only.
 *  2. We never send LeadEngine's Opportunity Score as if it were an audit
 *     finding. The handoff carries our score under `leadEngineAssessment`,
 *     clearly labelled as our shallow read, and the audit forms its own view.
 */

export const auditHandoffSchema = z.object({
  /** Stable LeadEngine identifiers so results can be linked back. */
  leadEngineProspectId: z.string(),
  leadEngineWorkspaceId: z.string(),

  business: z.object({
    name: z.string(),
    primaryCategory: z.string().nullable(),
    websiteUrl: z.string().nullable(),
    location: z
      .object({
        formatted: z.string().nullable(),
        city: z.string().nullable(),
        region: z.string().nullable(),
        postalCode: z.string().nullable(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
      })
      .nullable(),
    /** Public business contact details only. */
    contacts: z.array(
      z.object({
        kind: z.string(),
        value: z.string(),
      }),
    ),
  }),

  /** Where this business came from, so the audit can cite provenance. */
  sources: z.array(
    z.object({
      provider: z.string(),
      externalId: z.string().nullable(),
    }),
  ),

  /**
   * LeadEngine's shallow read. Explicitly namespaced so nothing downstream can
   * mistake it for audit output.
   */
  leadEngineAssessment: z.object({
    opportunityScore: z.number().int().min(0).max(100),
    businessFitScore: z.number().int(),
    businessStrengthScore: z.number().int(),
    websiteOpportunityScore: z.number().int(),
    reachabilityScore: z.number().int(),
    scoringModelVersion: z.string(),
    qualification: z.string(),
    /** Shallow signals, as evidence — not as findings. */
    signals: z.array(
      z.object({
        type: z.string(),
        value: z.string().nullable(),
        booleanValue: z.boolean().nullable(),
        confidence: z.string(),
        evidence: z.string().nullable(),
        observedAt: z.string(),
      }),
    ),
    agencyCredit: z
      .object({
        detected: z.boolean(),
        confidence: z.string().nullable(),
        evidence: z.string().nullable(),
      })
      .nullable(),
  }),

  requestedAt: z.string(),
});

export type AuditHandoff = z.infer<typeof auditHandoffSchema>;

export interface AuditReference {
  externalId: string;
  externalUrl: string | null;
  status: string | null;
}

export interface AuditStatus {
  externalId: string;
  status: string;
  /** Whatever summary AuditWorkspace chooses to expose; never invented here. */
  summary: Record<string, unknown> | null;
  externalUrl: string | null;
}

export type IntegrationErrorCode =
  | "NOT_CONFIGURED"
  | "UNAUTHORIZED"
  | "UNAVAILABLE"
  | "REJECTED"
  | "PROTOCOL_ERROR";

export class IntegrationError extends Error {
  constructor(
    readonly code: IntegrationErrorCode,
    message: string,
    readonly reason?: unknown,
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}

export interface AuditWorkspaceClient {
  readonly configured: boolean;
  createAudit(input: AuditHandoff): Promise<AuditReference>;
  getAuditStatus(externalId: string): Promise<AuditStatus>;
}

/**
 * Used whenever AUDIT_WORKSPACE_API_URL/TOKEN are not both set.
 *
 * It throws NOT_CONFIGURED rather than pretending. The web app catches that
 * and records an internal AuditRequest in PENDING_HANDOFF state, so the
 * operator's intent is preserved and the UI says "integration unavailable"
 * instead of showing a fake success.
 */
export class UnconfiguredAuditWorkspaceClient implements AuditWorkspaceClient {
  readonly configured = false;

  async createAudit(): Promise<AuditReference> {
    throw new IntegrationError(
      "NOT_CONFIGURED",
      "AuditWorkspace is not configured. Set AUDIT_WORKSPACE_API_URL and AUDIT_WORKSPACE_API_TOKEN.",
    );
  }

  async getAuditStatus(): Promise<AuditStatus> {
    throw new IntegrationError("NOT_CONFIGURED", "AuditWorkspace is not configured.");
  }
}

export class HttpAuditWorkspaceClient implements AuditWorkspaceClient {
  readonly configured = true;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 20_000,
  ) {}

  private async call(path: string, init: RequestInit): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
          ...(init.headers ?? {}),
        },
      });
    } catch (error) {
      throw new IntegrationError("UNAVAILABLE", "Could not reach AuditWorkspace.", error);
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401 || response.status === 403) {
      throw new IntegrationError("UNAUTHORIZED", "AuditWorkspace rejected the API token.");
    }
    if (response.status >= 500) {
      throw new IntegrationError("UNAVAILABLE", `AuditWorkspace returned HTTP ${response.status}.`);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new IntegrationError(
        "REJECTED",
        `AuditWorkspace rejected the handoff (HTTP ${response.status}). ${body.slice(0, 300)}`,
      );
    }

    try {
      return await response.json();
    } catch (error) {
      throw new IntegrationError("PROTOCOL_ERROR", "AuditWorkspace returned invalid JSON.", error);
    }
  }

  async createAudit(input: AuditHandoff): Promise<AuditReference> {
    const body = (await this.call("/v1/audits", {
      method: "POST",
      body: JSON.stringify(auditHandoffSchema.parse(input)),
    })) as { id?: string; auditId?: string; url?: string; status?: string };

    const externalId = body.id ?? body.auditId;
    if (!externalId) {
      throw new IntegrationError(
        "PROTOCOL_ERROR",
        "AuditWorkspace accepted the handoff but returned no audit id.",
      );
    }
    return { externalId, externalUrl: body.url ?? null, status: body.status ?? null };
  }

  async getAuditStatus(externalId: string): Promise<AuditStatus> {
    const body = (await this.call(`/v1/audits/${encodeURIComponent(externalId)}`, {
      method: "GET",
    })) as { status?: string; summary?: Record<string, unknown>; url?: string };

    return {
      externalId,
      status: body.status ?? "UNKNOWN",
      summary: body.summary ?? null,
      externalUrl: body.url ?? null,
    };
  }
}

export function createAuditWorkspaceClient(env: {
  AUDIT_WORKSPACE_API_URL?: string | undefined;
  AUDIT_WORKSPACE_API_TOKEN?: string | undefined;
}): AuditWorkspaceClient {
  const url = env.AUDIT_WORKSPACE_API_URL?.trim();
  const token = env.AUDIT_WORKSPACE_API_TOKEN?.trim();
  if (!url || !token) return new UnconfiguredAuditWorkspaceClient();
  return new HttpAuditWorkspaceClient(url, token);
}
