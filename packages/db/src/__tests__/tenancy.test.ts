import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env", "../../.env"], quiet: true });

/**
 * Tenant isolation, at the database level.
 *
 * The application scopes every query by workspaceId. These tests assert the
 * property that scoping is meant to guarantee: with two workspaces holding
 * lookalike data, a query scoped to one can never return the other's rows —
 * and the unique indexes that power deduplication are per-workspace, so two
 * tenants can legitimately track the same business.
 */

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (TEST_DATABASE_URL) process.env.DATABASE_URL = TEST_DATABASE_URL;

const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

describeDb("workspace isolation", () => {
  let prisma: typeof import("../index").prisma;
  let alpha: string;
  let beta: string;
  let alphaProspect: string;
  let betaProspect: string;

  beforeAll(async () => {
    ({ prisma } = await import("../index"));

    const suffix = Math.random().toString(36).slice(2, 10);
    const a = await prisma.workspace.create({
      data: { slug: `alpha-${suffix}`, name: "Alpha Agency" },
    });
    const b = await prisma.workspace.create({
      data: { slug: `beta-${suffix}`, name: "Beta Agency" },
    });
    alpha = a.id;
    beta = b.id;

    // Deliberately identical business data in both workspaces.
    for (const [workspaceId, label] of [
      [alpha, "alpha"],
      [beta, "beta"],
    ] as const) {
      const prospect = await prisma.prospect.create({
        data: {
          workspaceId,
          name: "Cedar Peak Plumbing",
          normalizedName: "cedar peak plumbing",
          primaryCategory: "Plumber",
          city: "Redlands",
          region: "CA",
          opportunityScore: 91,
          notes: { create: { workspaceId, body: `${label} private note` } },
          signals: {
            create: {
              workspaceId,
              type: "GOOGLE_RATING",
              source: "DEMO_PROVIDER",
              numericValue: 4.9,
            },
          },
          identities: {
            create: {
              workspaceId,
              kind: "ROOT_DOMAIN",
              namespace: "",
              value: "cedarpeak.example",
            },
          },
          activity: {
            create: { workspaceId, type: "PROSPECT_ADDED", summary: `${label} added` },
          },
        },
      });
      if (workspaceId === alpha) alphaProspect = prospect.id;
      else betaProspect = prospect.id;
    }
  });

  afterAll(async () => {
    await prisma.workspace.deleteMany({ where: { id: { in: [alpha, beta] } } });
    await prisma.$disconnect();
  });

  it("scopes prospects to one workspace", async () => {
    const rows = await prisma.prospect.findMany({ where: { workspaceId: alpha } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(alphaProspect);
  });

  it("cannot read another workspace's prospect by id", async () => {
    const stolen = await prisma.prospect.findFirst({
      where: { id: betaProspect, workspaceId: alpha },
    });
    expect(stolen).toBeNull();
  });

  it("keeps notes, signals and activity private to their workspace", async () => {
    const notes = await prisma.prospectNote.findMany({ where: { workspaceId: alpha } });
    expect(notes).toHaveLength(1);
    expect(notes[0]!.body).toBe("alpha private note");

    const signals = await prisma.prospectSignal.findMany({ where: { workspaceId: alpha } });
    expect(signals.every((s) => s.prospectId === alphaProspect)).toBe(true);

    const activity = await prisma.activityEvent.findMany({ where: { workspaceId: alpha } });
    expect(activity.every((a) => a.summary.startsWith("alpha"))).toBe(true);
  });

  it("lets two workspaces track the same business independently", async () => {
    // The identity unique index is (workspace, kind, namespace, value), so the
    // same root domain in two workspaces is not a conflict.
    const both = await prisma.prospectIdentity.findMany({
      where: { value: "cedarpeak.example", workspaceId: { in: [alpha, beta] } },
    });
    expect(both).toHaveLength(2);
  });

  it("refuses a duplicate identity inside one workspace", async () => {
    await expect(
      prisma.prospectIdentity.create({
        data: {
          workspaceId: alpha,
          prospectId: alphaProspect,
          kind: "ROOT_DOMAIN",
          namespace: "",
          value: "cedarpeak.example",
        },
      }),
    ).rejects.toThrow();
  });

  it("updates scoped by workspace cannot touch another tenant's row", async () => {
    const result = await prisma.prospect.updateMany({
      where: { id: betaProspect, workspaceId: alpha },
      data: { qualification: "DISQUALIFIED" },
    });
    expect(result.count).toBe(0);

    const untouched = await prisma.prospect.findUniqueOrThrow({ where: { id: betaProspect } });
    expect(untouched.qualification).toBe("REVIEW");
  });

  it("deletes scoped by workspace cannot remove another tenant's row", async () => {
    const result = await prisma.prospect.deleteMany({
      where: { id: betaProspect, workspaceId: alpha },
    });
    expect(result.count).toBe(0);
    expect(await prisma.prospect.count({ where: { id: betaProspect } })).toBe(1);
  });

  it("allows many manually created prospects in one workspace", async () => {
    // Regression: ProspectSource is unique on (workspaceId, provider,
    // externalId). Manual and CSV entries have no external id, and writing ""
    // instead of NULL meant the second manual prospect in a workspace failed
    // with a unique-constraint violation. Postgres treats NULLs as distinct,
    // so NULL is the correct value.
    for (const name of ["Willow Creek Doors", "Ridgeline Fencing", "Alder Pool Care"]) {
      await prisma.prospect.create({
        data: {
          workspaceId: alpha,
          name,
          normalizedName: name.toLowerCase(),
          sources: { create: { workspaceId: alpha, provider: "manual", externalId: null } },
        },
      });
    }

    const manual = await prisma.prospectSource.count({
      where: { workspaceId: alpha, provider: "manual" },
    });
    expect(manual).toBe(3);
  });

  it("still deduplicates provider sources that do carry an external id", async () => {
    const prospect = await prisma.prospect.create({
      data: {
        workspaceId: beta,
        name: "Provider Sourced Co",
        normalizedName: "provider sourced co",
        sources: {
          create: { workspaceId: beta, provider: "google", externalId: "ChIJduplicate" },
        },
      },
    });

    await expect(
      prisma.prospectSource.create({
        data: {
          workspaceId: beta,
          prospectId: prospect.id,
          provider: "google",
          externalId: "ChIJduplicate",
        },
      }),
    ).rejects.toThrow();
  });

  it("removes every tenant row when a workspace is deleted", async () => {
    const suffix = Math.random().toString(36).slice(2, 10);
    const temp = await prisma.workspace.create({
      data: {
        slug: `temp-${suffix}`,
        name: "Temp",
        prospects: {
          create: {
            name: "Doomed Co",
            normalizedName: "doomed co",
          },
        },
      },
      include: { prospects: true },
    });
    const prospectId = temp.prospects[0]!.id;

    await prisma.workspace.delete({ where: { id: temp.id } });
    expect(await prisma.prospect.count({ where: { id: prospectId } })).toBe(0);
  });
});
