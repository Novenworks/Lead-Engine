# Architecture

## The shape of the system

```
                    ┌──────────────────────┐
  Operator ────────▶│  apps/web (Vercel)   │
                    │  Next.js App Router  │
                    └───────┬──────────────┘
                            │ Prisma
                    ┌───────▼──────────────┐        ┌────────────────────┐
                    │  PostgreSQL (Neon)   │◀───────│ apps/worker        │
                    │  jobs + prospects    │  claim │ (Render Background)│
                    └──────────────────────┘        └────────┬───────────┘
                                                             │ outbound HTTP
                              ┌──────────────────────────────┼─────────────┐
                              ▼                ▼             ▼             ▼
                     prospect websites   screenshots   AuditWorkspace  Demo Factory
                     (SSRF-guarded)      (provider)    (contract)      (contract)
```

The web app never makes an outbound call to a prospect's website. Everything
that touches the open internet runs in the worker, behind the SSRF guard.

## Why these boundaries

**Web and worker are separate processes.** Fetching a stranger's homepage is
slow, unpredictable and hostile. Doing it inside a request would tie a page
render to a third party's uptime, and doing it in a serverless function would
put the SSRF guard on the same host as the app. A long-lived worker is also
where retries, backoff and concurrency limits belong.

**The database is the queue.** At this scale a Redis or a broker would be a
second thing to run, monitor and pay for. `FOR UPDATE SKIP LOCKED` gives safe
concurrent claiming in one statement, and jobs are queryable alongside the data
they act on. If throughput ever outgrows it, the queue interface in
`apps/worker/src/queue.ts` is the only thing that changes.

**`packages/core` has no database and no framework.** Normalization, dedupe,
the SSRF guard, HTML extraction and scoring are pure functions. That is why the
scoring engine can be tested exhaustively without a database, and why the
worker and the web app cannot drift apart on what a score means: both call the
same function.

**Providers sit behind interfaces.** Nothing above `packages/providers` has
ever seen a Google payload. Swapping vendors, or adding a second one, is a new
adapter plus a config value.

## Packages

| Package                    | Contains                                                                         | Depends on            |
| -------------------------- | -------------------------------------------------------------------------------- | --------------------- |
| `@leadengine/core`         | Normalization, dedupe, SSRF guard + fetch, extraction, agency detection, scoring | zod, node-html-parser |
| `@leadengine/db`           | Prisma schema, generated client, fixture seed                                    | core (seed only)      |
| `@leadengine/providers`    | `BusinessDiscoveryProvider`, `ScreenshotProvider` and their adapters             | core                  |
| `@leadengine/integrations` | AuditWorkspace and Demo Factory contracts                                        | zod                   |
| `@leadengine/web`          | The application                                                                  | all of the above      |
| `@leadengine/worker`       | The job runner                                                                   | all of the above      |

`@leadengine/core` also exports a `./vocab` subpath containing only the plain
string-union vocabulary (pipeline stages, signal types, disqualification
reasons). Client components import from there so a React bundle never pulls in
`node:net` through the barrel.

## Request flow

Reads are React Server Components calling `packages/db` directly. Writes are
Server Actions in `apps/web/src/server/actions.ts`. Both go through
`requireWorkspace()` first, which resolves the operator's workspace from the
session — never from a form field.

Filters live in the URL, so every view is shareable, bookmarkable and savable
without extra machinery. `parseProspectFilters` validates the query string with
zod and falls back to defaults rather than erroring a page on a malformed URL.

## The read model

`Prospect` carries denormalized columns — `opportunityScore`,
`businessStrengthScore`, `websiteOpportunityScore`, `rating`, `reviewCount`,
`agencyManaged`, `city`, `region`. `ScoreSnapshot` and `ProspectSignal` remain
the source of truth; the columns exist so list, filter, sort and matrix queries
run in Postgres against indexes instead of loading rows into React. They are
written in the same transaction as the snapshot that produced them.

## Deviations from the original specification

- **`DiscoveryQuery` was folded into `DiscoveryRun` and `SavedSearch`.** A run
  already stores the parameters it used; a separate query entity would have
  been a third place to keep the same fields in sync. `SavedSearch` covers the
  "reusable named search" need.
- **No `ImportBatch` usage yet.** The table exists, but CSV import is not
  implemented — see [ROADMAP.md](ROADMAP.md). It is deferred rather than
  shipped half-working.
- **The map view is not built.** List and Matrix cover the V1 workflow.
- **No `ui` or `config` package.** They would have been three files each. UI
  primitives live in `apps/web/src/components/ui`; config lives with the code
  that reads it.
