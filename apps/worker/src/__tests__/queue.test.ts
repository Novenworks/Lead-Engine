import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env", "../../.env"], quiet: true });

/**
 * Job queue behaviour, against a real Postgres.
 *
 * The property that matters: two workers pulling at the same instant must
 * never receive the same job. That is what FOR UPDATE SKIP LOCKED buys, and
 * it can only be verified against a real database.
 */

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (TEST_DATABASE_URL) process.env.DATABASE_URL = TEST_DATABASE_URL;

const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

describeDb("job queue", () => {
  let prisma: typeof import("@leadengine/db").prisma;
  let claimJobs: typeof import("../queue").claimJobs;
  let completeJob: typeof import("../queue").completeJob;
  let failJob: typeof import("../queue").failJob;
  let reclaimStaleJobs: typeof import("../queue").reclaimStaleJobs;
  let workspaceId: string;

  beforeAll(async () => {
    ({ prisma } = await import("@leadengine/db"));
    ({ claimJobs, completeJob, failJob, reclaimStaleJobs } = await import("../queue"));

    const workspace = await prisma.workspace.create({
      data: { slug: `jobs-${Math.random().toString(36).slice(2, 10)}`, name: "Jobs" },
    });
    workspaceId = workspace.id;
  });

  beforeEach(async () => {
    await prisma.job.deleteMany({ where: { workspaceId } });
  });

  afterAll(async () => {
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.$disconnect();
  });

  const seed = (count: number) =>
    prisma.job.createMany({
      data: Array.from({ length: count }, (_, index) => ({
        workspaceId,
        type: "BULK_SCORE" as const,
        payload: { index },
        idempotencyKey: `test-${workspaceId}-${index}-${Math.random()}`,
      })),
    });

  it("claims queued jobs and marks them running", async () => {
    await seed(3);
    const claimed = await claimJobs("worker-a", 3);
    expect(claimed).toHaveLength(3);

    const states = await prisma.job.findMany({
      where: { workspaceId },
      select: { state: true, lockedBy: true },
    });
    expect(states.every((s) => s.state === "RUNNING" && s.lockedBy === "worker-a")).toBe(true);
  });

  it("never hands the same job to two concurrent workers", async () => {
    await seed(20);

    // Five workers grabbing simultaneously, enough capacity to want overlap.
    const batches = await Promise.all([
      claimJobs("worker-a", 10),
      claimJobs("worker-b", 10),
      claimJobs("worker-c", 10),
      claimJobs("worker-d", 10),
      claimJobs("worker-e", 10),
    ]);

    const ids = batches.flat().map((job) => job.id);
    expect(ids).toHaveLength(20);
    expect(new Set(ids).size).toBe(20);
  });

  it("counts an attempt on every claim", async () => {
    await seed(1);
    const [claimed] = await claimJobs("worker-a", 1);
    expect(claimed!.attempts).toBe(1);
  });

  it("does not claim jobs scheduled for the future", async () => {
    await prisma.job.create({
      data: {
        workspaceId,
        type: "BULK_SCORE",
        payload: {},
        runAfter: new Date(Date.now() + 60_000),
        idempotencyKey: `future-${Math.random()}`,
      },
    });
    expect(await claimJobs("worker-a", 5)).toHaveLength(0);
  });

  it("marks a completed job succeeded and releases the lock", async () => {
    await seed(1);
    const [claimed] = await claimJobs("worker-a", 1);
    await completeJob(claimed!.id);

    const job = await prisma.job.findUniqueOrThrow({ where: { id: claimed!.id } });
    expect(job.state).toBe("SUCCEEDED");
    expect(job.lockedBy).toBeNull();
    expect(job.finishedAt).not.toBeNull();
  });

  it("requeues a failure with backoff until attempts are spent", async () => {
    await seed(1);
    const [claimed] = await claimJobs("worker-a", 1);

    const first = await failJob(claimed!.id, 1, 3, new Error("temporary"));
    expect(first.willRetry).toBe(true);

    const requeued = await prisma.job.findUniqueOrThrow({ where: { id: claimed!.id } });
    expect(requeued.state).toBe("QUEUED");
    expect(requeued.lastError).toContain("temporary");
    // Backoff pushes runAfter into the future, so it is not immediately reclaimed.
    expect(requeued.runAfter.getTime()).toBeGreaterThan(Date.now());
    expect(await claimJobs("worker-a", 5)).toHaveLength(0);
  });

  it("stops retrying a permanently bad job", async () => {
    await seed(1);
    const [claimed] = await claimJobs("worker-a", 1);

    const final = await failJob(claimed!.id, 3, 3, new Error("dead domain"));
    expect(final.willRetry).toBe(false);

    const job = await prisma.job.findUniqueOrThrow({ where: { id: claimed!.id } });
    expect(job.state).toBe("FAILED");
    expect(job.finishedAt).not.toBeNull();
    // A failed job is never picked up again.
    expect(await claimJobs("worker-a", 5)).toHaveLength(0);
  });

  it("backs off further with each attempt", async () => {
    await seed(2);
    const claimed = await claimJobs("worker-a", 2);
    await failJob(claimed[0]!.id, 1, 5, new Error("x"));
    await failJob(claimed[1]!.id, 3, 5, new Error("x"));

    const [early, late] = await Promise.all([
      prisma.job.findUniqueOrThrow({ where: { id: claimed[0]!.id } }),
      prisma.job.findUniqueOrThrow({ where: { id: claimed[1]!.id } }),
    ]);
    expect(late.runAfter.getTime()).toBeGreaterThan(early.runAfter.getTime());
  });

  it("reclaims jobs orphaned by a worker that died mid-run", async () => {
    await seed(1);
    const [claimed] = await claimJobs("worker-a", 1);

    // Simulate a lock taken an hour ago by a process that never came back.
    await prisma.job.update({
      where: { id: claimed!.id },
      data: { lockedAt: new Date(Date.now() - 3_600_000) },
    });

    expect(await reclaimStaleJobs(600_000)).toBe(1);
    const reclaimed = await prisma.job.findUniqueOrThrow({ where: { id: claimed!.id } });
    expect(reclaimed.state).toBe("QUEUED");
    expect(reclaimed.lockedBy).toBeNull();
    expect(await claimJobs("worker-b", 1)).toHaveLength(1);
  });

  it("leaves a freshly locked job alone", async () => {
    await seed(1);
    await claimJobs("worker-a", 1);
    expect(await reclaimStaleJobs(600_000)).toBe(0);
  });

  it("enforces idempotency keys so the same work is not queued twice", async () => {
    const key = `dedupe-${Math.random()}`;
    await prisma.job.create({
      data: { workspaceId, type: "WEBSITE_ENRICHMENT", payload: {}, idempotencyKey: key },
    });
    await expect(
      prisma.job.create({
        data: { workspaceId, type: "WEBSITE_ENRICHMENT", payload: {}, idempotencyKey: key },
      }),
    ).rejects.toThrow();
  });
});
