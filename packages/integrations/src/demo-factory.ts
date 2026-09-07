import { z } from "zod";
import { IntegrationError } from "./audit-workspace";

/**
 * Demo Factory integration boundary.
 *
 * Demo Factory builds the alternative site. LeadEngine's only job is to hand
 * over identity, the current website, and the audit reference if one exists.
 * There is deliberately no site-building logic here.
 */

export const demoFactoryHandoffSchema = z.object({
  leadEngineProspectId: z.string(),
  leadEngineWorkspaceId: z.string(),
  business: z.object({
    name: z.string(),
    primaryCategory: z.string().nullable(),
    websiteUrl: z.string().nullable(),
    city: z.string().nullable(),
    region: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
  }),
  /** AuditWorkspace audit id, when the prospect has been audited. */
  auditReference: z
    .object({
      system: z.literal("AUDIT_WORKSPACE"),
      externalId: z.string(),
      externalUrl: z.string().nullable(),
    })
    .nullable(),
  requestedAt: z.string(),
});

export type DemoFactoryHandoff = z.infer<typeof demoFactoryHandoffSchema>;

export interface DemoFactoryReference {
  externalId: string;
  externalUrl: string | null;
  status: string | null;
}

export interface DemoFactoryClient {
  readonly configured: boolean;
  createProject(input: DemoFactoryHandoff): Promise<DemoFactoryReference>;
}

export class UnconfiguredDemoFactoryClient implements DemoFactoryClient {
  readonly configured = false;

  async createProject(): Promise<DemoFactoryReference> {
    throw new IntegrationError(
      "NOT_CONFIGURED",
      "Demo Factory is not configured. Set DEMO_FACTORY_API_URL and DEMO_FACTORY_API_TOKEN.",
    );
  }
}

export class HttpDemoFactoryClient implements DemoFactoryClient {
  readonly configured = true;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 20_000,
  ) {}

  async createProject(input: DemoFactoryHandoff): Promise<DemoFactoryReference> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl.replace(/\/$/, "")}/v1/projects`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(demoFactoryHandoffSchema.parse(input)),
      });
    } catch (error) {
      throw new IntegrationError("UNAVAILABLE", "Could not reach Demo Factory.", error);
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 401 || response.status === 403) {
      throw new IntegrationError("UNAUTHORIZED", "Demo Factory rejected the API token.");
    }
    if (response.status >= 500) {
      throw new IntegrationError("UNAVAILABLE", `Demo Factory returned HTTP ${response.status}.`);
    }
    if (!response.ok) {
      throw new IntegrationError(
        "REJECTED",
        `Demo Factory rejected the handoff (HTTP ${response.status}).`,
      );
    }

    const body = (await response.json().catch(() => {
      throw new IntegrationError("PROTOCOL_ERROR", "Demo Factory returned invalid JSON.");
    })) as { id?: string; projectId?: string; url?: string; status?: string };

    const externalId = body.id ?? body.projectId;
    if (!externalId) {
      throw new IntegrationError(
        "PROTOCOL_ERROR",
        "Demo Factory accepted the handoff but returned no project id.",
      );
    }
    return { externalId, externalUrl: body.url ?? null, status: body.status ?? null };
  }
}

export function createDemoFactoryClient(env: {
  DEMO_FACTORY_API_URL?: string | undefined;
  DEMO_FACTORY_API_TOKEN?: string | undefined;
}): DemoFactoryClient {
  const url = env.DEMO_FACTORY_API_URL?.trim();
  const token = env.DEMO_FACTORY_API_TOKEN?.trim();
  if (!url || !token) return new UnconfiguredDemoFactoryClient();
  return new HttpDemoFactoryClient(url, token);
}
