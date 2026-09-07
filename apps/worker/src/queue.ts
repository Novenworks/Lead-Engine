import { prisma, type Job, type JobState } from "@leadengine/db";

/**
 * The job queue, in Postgres.
 *
 * Claiming uses `FOR UPDATE SKIP LOCKED`, so several worker processes (or
 * several concurrent slots in one process) can pull from the same queue
 * without ever handing the same job to two runners. No Redis, no broker —
 * the database we already have is enough at this scale.
 */

export interface ClaimedJob {
  id: string;
  workspaceId: string;
  type: Job["type"];
  payload: unknown;
  attempts: number;
  maxAttempts: number;
}

/**
 * Atomically claim up to `limit` runnable jobs for this worker.
 *
 * The UPDATE ... FROM (SELECT ... FOR UPDATE SKIP LOCKED) shape does the
 * select and the claim in one statement, so there is no window between
 * choosing a job and marking it taken.
 */
export async function claimJobs(workerId: string, limit: number): Promise<ClaimedJob[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      workspaceId: string;
      type: Job["type"];
      payload: unknown;
      attempts: number;
      maxAttempts: number;
    }>
  >`
    UPDATE "Job" AS j
    SET "state" = 'RUNNING',
        "lockedAt" = NOW(),
        "lockedBy" = ${workerId},
        "startedAt" = COALESCE(j."startedAt", NOW()),
        "attempts" = j."attempts" + 1
    FROM (
      SELECT "id"
      FROM "Job"
      WHERE "state" = 'QUEUED'
        AND "runAfter" <= NOW()
      ORDER BY "runAfter" ASC, "createdAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    ) AS claimed
    WHERE j."id" = claimed."id"
    RETURNING j."id", j."workspaceId", j."type", j."payload", j."attempts", j."maxAttempts"
  `;
  return rows;
}

export async function completeJob(jobId: string): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      state: "SUCCEEDED",
      finishedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      lastError: null,
    },
  });
}

/**
 * Fail a job, retrying with exponential backoff until `maxAttempts`.
 *
 * A dead domain must not be retried forever: once the attempts are spent the
 * job is FAILED and stays failed until someone looks at it.
 */
export async function failJob(
  jobId: string,
  attempts: number,
  maxAttempts: number,
  error: unknown,
): Promise<{ willRetry: boolean }> {
  const message = error instanceof Error ? error.message : String(error);
  const exhausted = attempts >= maxAttempts;

  if (exhausted) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        state: "FAILED",
        finishedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: message.slice(0, 1000),
      },
    });
    return { willRetry: false };
  }

  // 30s, 2m, 8m …
  const delayMs = 30_000 * 4 ** (attempts - 1);
  await prisma.job.update({
    where: { id: jobId },
    data: {
      state: "QUEUED",
      runAfter: new Date(Date.now() + delayMs),
      lockedAt: null,
      lockedBy: null,
      lastError: message.slice(0, 1000),
    },
  });
  return { willRetry: true };
}

/**
 * Return jobs abandoned by a worker that died mid-run.
 *
 * A RUNNING job whose lock is older than `staleAfterMs` is assumed orphaned;
 * its attempt is already counted, so it will not loop forever.
 */
export async function reclaimStaleJobs(staleAfterMs: number): Promise<number> {
  const cutoff = new Date(Date.now() - staleAfterMs);
  const result = await prisma.job.updateMany({
    where: { state: "RUNNING" as JobState, lockedAt: { lt: cutoff } },
    data: { state: "QUEUED", lockedAt: null, lockedBy: null, runAfter: new Date() },
  });
  return result.count;
}
