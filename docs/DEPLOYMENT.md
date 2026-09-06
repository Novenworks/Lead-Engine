# Deployment

```
Vercel     ── apps/web
Render     ── apps/worker (Background Worker)
Neon       ── PostgreSQL
Clerk      ── authentication
Cloudflare R2 ── optional durable artifacts
```

The web app and the worker share a database and nothing else. Neither imports
the other.

## Neon

1. Create a project and copy the pooled connection string.
2. Apply migrations from a machine that has the repo:

   ```bash
   DATABASE_URL="postgresql://…" pnpm --filter @leadengine/db exec prisma migrate deploy
   ```

Both the web app and the worker use `@prisma/adapter-pg` over the standard
Postgres wire protocol, so the pooled Neon URL works for both. Prisma 7 reads
the CLI's URL from `packages/db/prisma.config.ts`, not from the schema.

## Clerk

Create an application, then set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and
`CLERK_SECRET_KEY` on Vercel. Both are required — with either missing, and
without the development fallback (which production refuses), the app renders a
configuration-required page instead of serving data.

Clerk organizations map to workspaces via `Workspace.clerkOrgId`. Without an
organization, a user gets a personal workspace on first sign-in.

## Vercel

- Root directory: repository root (the monorepo is a pnpm workspace).
- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm --filter @leadengine/db run generate && pnpm --filter @leadengine/web run build`
- Output: `apps/web/.next`

The Prisma client is generated into `packages/db/src/generated`, which is
gitignored, so `prisma generate` must run before the build.

Environment: `DATABASE_URL`, both Clerk keys, `NEXT_PUBLIC_APP_URL`, plus any
provider and integration values from `.env.example`. Do **not** set
`LEADENGINE_DEV_AUTH`.

`/api/health` returns `{status, database, authMode}` and a 503 when the
database is unreachable — use it as the health check.

## Render — background worker

`render.yaml` in the repository root declares the service. Or configure by hand:

- Type: Background Worker
- Build: `pnpm install --frozen-lockfile && pnpm --filter @leadengine/db run generate`
- Start: `pnpm --filter @leadengine/worker run start`
- Environment: `DATABASE_URL`, `WORKER_POLL_INTERVAL_MS`, `WORKER_CONCURRENCY`,
  plus screenshot and integration credentials if used.

The worker handles `SIGTERM` by draining in-flight jobs for up to 30 seconds,
so a deploy does not strand a job in `RUNNING`. Jobs whose lock is older than
ten minutes are reclaimed automatically, which covers a hard kill.

**Without the worker running**, website enrichment and screenshots queue and
never complete. The app detects this — anything queued longer than five minutes
raises a banner saying the worker looks offline. Scoring, discovery,
qualification and handoffs all still work.

## Cloudflare R2 (optional)

Only needed if a screenshot provider returns bytes rather than a hosted URL.
Neither current adapter does, so R2 is unused today. `ScreenshotReference` has
a `storageKey` column for when it is.

## Migrations

`prisma migrate deploy` is forward-only and safe to run repeatedly. Run it
before deploying code that depends on a new column. There is no automatic
migration on boot — neither the web app nor the worker migrates on start, so a
rollback never has to race a schema change.

## Verifying a deployment

1. `GET /api/health` → `{"status":"ok","database":"ok","authMode":"clerk"}`.
   If `authMode` is anything else in production, Clerk is misconfigured.
2. Sign in; Settings → Connections shows what is and is not connected.
3. Run a discovery search. If the banner says demo data, the Google key is
   missing.
4. Enrich one prospect and confirm it leaves the queued state — that proves the
   worker is alive and can reach the internet.
