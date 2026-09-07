import { describe, expect, it } from "vitest";
import {
  auditHandoffSchema,
  createAuditWorkspaceClient,
  createDemoFactoryClient,
  demoFactoryHandoffSchema,
  HttpAuditWorkspaceClient,
  HttpDemoFactoryClient,
  UnconfiguredAuditWorkspaceClient,
  UnconfiguredDemoFactoryClient,
  type AuditHandoff,
} from "../index";

const handoff: AuditHandoff = {
  leadEngineProspectId: "p1",
  leadEngineWorkspaceId: "w1",
  business: {
    name: "Cedar Peak Plumbing",
    primaryCategory: "Plumber",
    websiteUrl: "https://cedarpeak.example",
    location: {
      formatted: "418 W State St, Redlands, CA 92373",
      city: "Redlands",
      region: "CA",
      postalCode: "92373",
      latitude: 34.0556,
      longitude: -117.1825,
    },
    contacts: [{ kind: "PHONE", value: "(909) 555-0142" }],
  },
  sources: [{ provider: "google", externalId: "ChIJexample" }],
  leadEngineAssessment: {
    opportunityScore: 84,
    businessFitScore: 25,
    businessStrengthScore: 20,
    websiteOpportunityScore: 32,
    reachabilityScore: 7,
    scoringModelVersion: "1.0.0",
    qualification: "QUALIFIED",
    signals: [
      {
        type: "VIEWPORT_META_PRESENT",
        value: null,
        booleanValue: false,
        confidence: "HIGH",
        evidence: "No viewport meta tag",
        observedAt: new Date().toISOString(),
      },
    ],
    agencyCredit: { detected: false, confidence: null, evidence: null },
  },
  requestedAt: new Date().toISOString(),
};

describe("audit handoff payload", () => {
  it("serializes and round-trips", () => {
    const parsed = auditHandoffSchema.parse(handoff);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it("namespaces LeadEngine's score so it cannot be read as an audit finding", () => {
    const parsed = auditHandoffSchema.parse(handoff);
    expect(parsed.leadEngineAssessment.opportunityScore).toBe(84);
    // There is no top-level score, findings or verdict field to confuse.
    expect(parsed).not.toHaveProperty("score");
    expect(parsed).not.toHaveProperty("findings");
    expect(parsed).not.toHaveProperty("auditScore");
  });

  it("rejects a payload missing the business identity", () => {
    const broken = structuredClone(handoff) as Record<string, unknown>;
    delete (broken.business as Record<string, unknown>).name;
    expect(() => auditHandoffSchema.parse(broken)).toThrow();
  });

  it("carries only the contact kinds LeadEngine collects", () => {
    const parsed = auditHandoffSchema.parse(handoff);
    for (const contact of parsed.business.contacts) {
      expect(["PHONE", "EMAIL"]).toContain(contact.kind);
    }
  });
});

describe("demo factory handoff payload", () => {
  it("serializes with and without an audit reference", () => {
    const base = {
      leadEngineProspectId: "p1",
      leadEngineWorkspaceId: "w1",
      business: {
        name: "Cedar Peak Plumbing",
        primaryCategory: "Plumber",
        websiteUrl: "https://cedarpeak.example",
        city: "Redlands",
        region: "CA",
        phone: "(909) 555-0142",
        email: null,
      },
      auditReference: null,
      requestedAt: new Date().toISOString(),
    };
    expect(() => demoFactoryHandoffSchema.parse(base)).not.toThrow();
    expect(() =>
      demoFactoryHandoffSchema.parse({
        ...base,
        auditReference: {
          system: "AUDIT_WORKSPACE",
          externalId: "aud_123",
          externalUrl: "https://audit.example/aud_123",
        },
      }),
    ).not.toThrow();
  });

  it("rejects an audit reference from an unknown system", () => {
    expect(() =>
      demoFactoryHandoffSchema.parse({
        leadEngineProspectId: "p1",
        leadEngineWorkspaceId: "w1",
        business: {
          name: "x",
          primaryCategory: null,
          websiteUrl: null,
          city: null,
          region: null,
          phone: null,
          email: null,
        },
        auditReference: { system: "SOMETHING_ELSE", externalId: "1", externalUrl: null },
        requestedAt: new Date().toISOString(),
      }),
    ).toThrow();
  });
});

describe("unconfigured integrations fail honestly", () => {
  it("returns the unconfigured client when either env var is missing", () => {
    expect(createAuditWorkspaceClient({})).toBeInstanceOf(UnconfiguredAuditWorkspaceClient);
    expect(
      createAuditWorkspaceClient({ AUDIT_WORKSPACE_API_URL: "https://a.example" }),
    ).toBeInstanceOf(UnconfiguredAuditWorkspaceClient);
    expect(createDemoFactoryClient({})).toBeInstanceOf(UnconfiguredDemoFactoryClient);
    expect(createDemoFactoryClient({ DEMO_FACTORY_API_TOKEN: "t" })).toBeInstanceOf(
      UnconfiguredDemoFactoryClient,
    );
  });

  it("throws NOT_CONFIGURED rather than returning a fabricated reference", async () => {
    const audit = createAuditWorkspaceClient({});
    expect(audit.configured).toBe(false);
    await expect(audit.createAudit(handoff)).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
    await expect(audit.getAuditStatus("x")).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("becomes configured only when both values are present", () => {
    const client = createAuditWorkspaceClient({
      AUDIT_WORKSPACE_API_URL: "https://audit.example",
      AUDIT_WORKSPACE_API_TOKEN: "token",
    });
    expect(client.configured).toBe(true);
  });
});

describe("http integration clients", () => {
  it("sends the handoff and returns the issued reference", async () => {
    let sent: unknown;
    const client = new HttpAuditWorkspaceClient(
      "https://audit.example/",
      "token",
      async (_url, init) => {
        sent = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({ id: "aud_1", url: "https://audit.example/aud_1", status: "QUEUED" }),
          { status: 201 },
        );
      },
    );

    const reference = await client.createAudit(handoff);
    expect(reference).toEqual({
      externalId: "aud_1",
      externalUrl: "https://audit.example/aud_1",
      status: "QUEUED",
    });
    expect(sent).toMatchObject({ leadEngineProspectId: "p1" });
  });

  it("maps transport failures onto typed codes", async () => {
    const cases: Array<[number, string]> = [
      [401, "UNAUTHORIZED"],
      [403, "UNAUTHORIZED"],
      [500, "UNAVAILABLE"],
      [422, "REJECTED"],
    ];
    for (const [status, code] of cases) {
      const client = new HttpAuditWorkspaceClient(
        "https://audit.example",
        "token",
        async () => new Response("nope", { status }),
      );
      await expect(client.createAudit(handoff), String(status)).rejects.toMatchObject({ code });
    }
  });

  it("treats a network failure as unavailable, not as a rejection", async () => {
    const client = new HttpAuditWorkspaceClient("https://audit.example", "token", async () => {
      throw new Error("ECONNREFUSED");
    });
    await expect(client.createAudit(handoff)).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("refuses a 2xx response that carries no audit id", async () => {
    const client = new HttpAuditWorkspaceClient(
      "https://audit.example",
      "token",
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    await expect(client.createAudit(handoff)).rejects.toMatchObject({ code: "PROTOCOL_ERROR" });
  });

  it("refuses a non-JSON response", async () => {
    const client = new HttpAuditWorkspaceClient(
      "https://audit.example",
      "token",
      async () => new Response("<html>maintenance</html>", { status: 200 }),
    );
    await expect(client.createAudit(handoff)).rejects.toMatchObject({ code: "PROTOCOL_ERROR" });
  });

  it("creates a demo factory project", async () => {
    const client = new HttpDemoFactoryClient(
      "https://demo.example",
      "token",
      async () => new Response(JSON.stringify({ projectId: "prj_1" }), { status: 200 }),
    );
    const reference = await client.createProject({
      leadEngineProspectId: "p1",
      leadEngineWorkspaceId: "w1",
      business: {
        name: "Cedar Peak Plumbing",
        primaryCategory: "Plumber",
        websiteUrl: null,
        city: "Redlands",
        region: "CA",
        phone: null,
        email: null,
      },
      auditReference: null,
      requestedAt: new Date().toISOString(),
    });
    expect(reference.externalId).toBe("prj_1");
  });
});
