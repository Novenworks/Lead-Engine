import "server-only";
import { prisma, type JobType, type Prisma } from "@leadengine/db";

/**
 * Job enqueueing.
 *
 * The worker owns execution (apps/worker); the web app only ever enqueues.
 * Every enqueue carries an idempotency key so clicking "Enrich" twice, or a
 * bulk action overlapping a previous one, does not queue the same work twice.
 */

export interface EnqueueResult {
  jobId: string;
  /** True when an equivalent job was already queued or running. */
  deduplicated: boolean;
}

export async function enqueueJob(
  workspaceId: string,
  type: JobType,
  payload: Prisma.InputJsonValue,
  idempotencyKey: string,
): Promise<EnqueueResult> {
  const existing = await prisma.job.findFirst({
    where: {
      workspaceId,
      type,
      idempotencyKey,
      state: { in: ["QUEUED", "RUNNING"] },
    },
    select: { id: true },
  });
  if (existing) return { jobId: existing.id, deduplicated: true };

  try {
    const job = await prisma.job.create({
      data: { workspaceId, type, payload, idempotencyKey },
    });
    return { jobId: job.id, deduplicated: false };
  } catch {
    // Unique violation from a concurrent enqueue: reuse the winner.
    const winner = await prisma.job.findUnique({ where: { idempotencyKey } });
    if (winner) return { jobId: winner.id, deduplicated: true };
    throw new Error("Could not enqueue job.");
  }
}

/**
 * Idempotency keys include a coarse timestamp bucket so a *later* deliberate
 * re-run is possible while rapid double-clicks still collapse.
 */
function bucket(minutes = 10): string {
  return String(Math.floor(Date.now() / (minutes * 60_000)));
}

export function enqueueWebsiteEnrichment(
  workspaceId: string,
  prospectId: string,
  websiteId: string,
) {
  return enqueueJob(
    workspaceId,
    "WEBSITE_ENRICHMENT",
    { prospectId, websiteId },
    `enrich:${websiteId}:${bucket()}`,
  );
}

export function enqueueScreenshot(workspaceId: string, prospectId: string, websiteId: string) {
  return enqueueJob(
    workspaceId,
    "SCREENSHOT_CAPTURE",
    { prospectId, websiteId },
    `shot:${websiteId}:${bucket(60)}`,
  );
}

export function enqueueBulkScore(workspaceId: string) {
  return enqueueJob(workspaceId, "BULK_SCORE", { workspaceId }, `score:${workspaceId}:${bucket()}`);
}

export function enqueueIntegrationHandoff(workspaceId: string, externalReferenceId: string) {
  return enqueueJob(
    workspaceId,
    "INTEGRATION_HANDOFF",
    { externalReferenceId },
    `handoff:${externalReferenceId}`,
  );
}

/** Worker health, for the honest "worker offline" state in the UI. */
export async function workerHealth(workspaceId: string) {
  const [queued, running, failed, oldest] = await Promise.all([
    prisma.job.count({ where: { workspaceId, state: "QUEUED" } }),
    prisma.job.count({ where: { workspaceId, state: "RUNNING" } }),
    prisma.job.count({ where: { workspaceId, state: "FAILED" } }),
    prisma.job.findFirst({
      where: { workspaceId, state: "QUEUED" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const oldestAgeMs = oldest ? Date.now() - oldest.createdAt.getTime() : 0;
  // Nothing has been picked up in five minutes: the worker is probably down.
  const stalled = queued > 0 && oldestAgeMs > 5 * 60_000;

  return { queued, running, failed, stalled, oldestAgeMs };
}
