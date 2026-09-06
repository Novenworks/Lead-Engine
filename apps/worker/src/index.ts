import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { prisma } from "@leadengine/db";
import { claimJobs, completeJob, failJob, reclaimStaleJobs } from "./queue";
import { runJob } from "./handlers";
import { log } from "./log";

loadEnv({ path: [".env", "../../.env"], quiet: true });

/**
 * The LeadEngine background worker.
 *
 * Deployed as a Render Background Worker. It polls the Postgres job queue,
 * claims work with FOR UPDATE SKIP LOCKED, and runs at most
 * WORKER_CONCURRENCY jobs at a time. Shutting down waits for in-flight jobs
 * so a deploy never leaves a job stuck in RUNNING.
 */

const WORKER_ID = `${process.env.RENDER_INSTANCE_ID ?? "local"}-${randomUUID().slice(0, 8)}`;
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 2000);
const CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY ?? 2));
/** A RUNNING job untouched for this long is assumed orphaned by a dead worker. */
const STALE_AFTER_MS = 10 * 60_000;

let shuttingDown = false;
let inFlight = 0;

async function processOne(job: Awaited<ReturnType<typeof claimJobs>>[number]): Promise<void> {
  const startedAt = Date.now();
  try {
    await runJob(job);
    await completeJob(job.id);
    log.info(
      { jobId: job.id, type: job.type, ms: Date.now() - startedAt },
      "job completed",
    );
  } catch (error) {
    const { willRetry } = await failJob(job.id, job.attempts, job.maxAttempts, error);
    log.error(
      {
        jobId: job.id,
        type: job.type,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
        willRetry,
        err: error instanceof Error ? error.message : String(error),
      },
      willRetry ? "job failed, will retry" : "job failed permanently",
    );
  }
}

async function tick(): Promise<void> {
  const capacity = CONCURRENCY - inFlight;
  if (capacity <= 0) return;

  const jobs = await claimJobs(WORKER_ID, capacity);
  if (jobs.length === 0) return;

  for (const job of jobs) {
    inFlight++;
    void processOne(job).finally(() => {
      inFlight--;
    });
  }
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    log.error({}, "DATABASE_URL is not set; the worker cannot start");
    process.exit(1);
  }

  log.info({ workerId: WORKER_ID, concurrency: CONCURRENCY, pollMs: POLL_INTERVAL_MS }, "worker started");

  const reclaimed = await reclaimStaleJobs(STALE_AFTER_MS);
  if (reclaimed > 0) log.warn({ reclaimed }, "requeued jobs orphaned by a previous worker");

  let sinceReclaim = 0;
  while (!shuttingDown) {
    try {
      await tick();

      // Sweep for orphaned jobs every ~2 minutes rather than every poll.
      sinceReclaim += POLL_INTERVAL_MS;
      if (sinceReclaim >= 120_000) {
        sinceReclaim = 0;
        const count = await reclaimStaleJobs(STALE_AFTER_MS);
        if (count > 0) log.warn({ reclaimed: count }, "requeued stale running jobs");
      }
    } catch (error) {
      // A transient database error must not kill the process — Render would
      // restart it, but the backoff here is cheaper and quieter.
      log.error(
        { err: error instanceof Error ? error.message : String(error) },
        "poll failed; backing off",
      );
      await sleep(5000);
    }
    await sleep(POLL_INTERVAL_MS);
  }

  log.info({ inFlight }, "draining in-flight jobs before exit");
  const deadline = Date.now() + 30_000;
  while (inFlight > 0 && Date.now() < deadline) await sleep(200);

  await prisma.$disconnect();
  log.info({}, "worker stopped");
  process.exit(0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    if (shuttingDown) return;
    log.info({ signal }, "shutdown requested");
    shuttingDown = true;
  });
}

main().catch((error) => {
  log.error({ err: error instanceof Error ? error.stack : String(error) }, "worker crashed");
  process.exit(1);
});
