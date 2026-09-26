# LeadEngine — Internal Tool Assessment

Assessed 2026-09-26 against `main` @ `9969306` (PR #1 merge). Read-only phase:
no product code was changed to produce this document.

Legend used throughout:

- **[Fact]** — observed in code, a command's output, or a live run.
- **[Inference]** — reasoned from facts, not directly observed.
- **[Rec]** — recommendation.
- **[Unverified]** — could not be checked in this environment.

---

## 1. Executive summary

**LeadEngine is well engineered and has never been used.** The code is clean,
strictly typed, tested (169 passing tests), and honest about what it doesn't
know. Every local quality gate passes, and the end-to-end browser workflow runs.
But:

- **[Fact]** It has never run against real data. The Google Places adapter has
  never made a live call, and every prospect seen so far is a fixture.
- **[Fact]** It isn't deployed. No Vercel project is linked to this repo.
- **[Fact]** With Clerk configured (production mode), there's no way to sign
  in. No sign-in page, sign-in link or sign-out exists, so a production deploy
  shows a dead-end "Sign in required" page.
- **[Fact]** Four bugs affect correctness in the core loop (§8). Two were
  reproduced live: a website stuck on "queued" forever, and prospects
  auto-disqualified before their website was ever checked.
- **[Fact]** The operator's daily loop is missing its throughput pieces:
  - no automatic or bulk website inspection
  - no follow-up/call list (`nextActionDate` is written but never read)
  - no export

**Diagnosis.** It's over-built in breadth and under-built in the one workflow
that makes money. There are 23 tables, 11 pipeline stages, multi-tenancy, two
handoff integrations to services that may not exist yet, screenshot adapters,
saved views and an opportunity matrix. Meanwhile, going from "search Redlands
plumbers" to "a list of 15 businesses to call today" takes one click per
prospect to inspect, and ends on a screen you can't export.

**Recommendation: don't rewrite. Fix, connect, trim, then use it.**

1. P0 (about 1–2 days): working production sign-in with an allowlist, a live
   Google smoke test, and fixes for the stuck-queue bug and the
   unchecked-website disqualification bug. Then deploy.
2. P1 (about 2–3 days): inspect websites automatically on add, bulk actions,
   a "Call list" view built on next-action dates, CSV export, honest handoff
   wording, and hiding integrations that aren't connected.
3. **Then stop building.** Use it on 2–3 real Inland Empire markets for two
   weeks and let what you actually need decide P2.

Everything else is P2/P3 or deletion.

---

## 2. What the product currently is

**[Fact]** A pnpm monorepo with two apps:

- a Next.js 16 web app, and
- a Postgres-polled Node worker,

sharing four packages:

- `core` — pure logic
- `db` — Prisma 7
- `providers` — Google/demo discovery and screenshot adapters
- `integrations` — AuditWorkspace and Demo Factory HTTP clients

**[Fact]** It lets one operator:

1. Search a market (category + location) through a discovery provider. The
   demo provider (10 fictional businesses) is the default.
2. Triage results into prospects, with strong-identifier dedupe and
   weak-match duplicate suggestions.
3. Queue a shallow homepage fetch (SSRF-guarded, in the worker) that produces
   signals: HTTPS, viewport, CTA, booking, tel link, meta, agency credit, CMS
   and so on.
4. Compute a deterministic 0–100 Opportunity Score, with per-rule reasons and
   a QUALIFIED/REVIEW/DISQUALIFIED verdict.
5. Override the verdict, move stages, add notes, set a next action, save views,
   and view a list, a matrix, a pipeline and an activity feed.
6. "Hand off" to AuditWorkspace or Demo Factory. Unconfigured today, so the
   request is only recorded locally.

**[Fact]** Repo history: May–June 2026, the repo was a Replit-built **inbound
lead-capture CRM**, a different product. On 2026-09-06 it was replaced
wholesale (PR #1: +8.9k/−30.9k lines). The old product is archived under
`docs/legacy/inbound-lead-crm/`.

## 3. Intended purpose

**[Fact, from CLAUDE.md and README]** To answer "which local businesses are
worth Novenworks' time?". It's the first stage of
`LeadEngine → AuditWorkspace → Demo Factory → WalkReplay`.

**[Fact]** Hard boundaries, which are sensible and should be kept:

- shallow checks only
- no crawler or audit
- no CRM
- no outreach sending
- no LLM

**[Inference]** The primary user is the founder/operator prospecting service
businesses (plumbing, HVAC, med spa, dental, roofing) in the Inland Empire.
The outcome they need is a short, ranked, _callable_ list of businesses with a
visibly weak website and a proven customer base. Row count doesn't matter.

## 4. Current architecture

```
INPUTS                PROCESSING                    STORAGE           LOGIC / OUTPUTS
──────                ──────────                    ───────           ───────────────
Operator (browser) ─▶ Next.js server actions ─────▶ Postgres ───────▶ Server-component pages
  search form           (apps/web/src/server/          (Neon in prod,     /discover /prospects
  manual add            actions.ts, 1092 lines)         23 tables)        /prospects/[id] /pipeline
  qualify/stage/notes       │  sync: discovery call                         /duplicates /saved
                            │  sync: scoring                                /activity /settings
Google Places API ◀─────────┘  (web → Google, in request)                 /api/health
  (unverified live)         │
                            └─ enqueue Job row ─▶ Job table ◀─ claim (FOR UPDATE SKIP LOCKED)
                                                                │
                                          apps/worker (Render) ─┘
                                            WEBSITE_ENRICHMENT → SSRF-guarded fetch → signals → rescore
                                            SCREENSHOT_CAPTURE → Urlbox/SnapSave (off by default)
                                            BULK_SCORE          (implemented, never enqueued)
                                            INTEGRATION_HANDOFF (implemented, never enqueued)
                                            CSV_IMPORT / DISCOVERY_DETAILS (stubs)

External: Clerk (auth) · Google Places + Geocoding · prospect websites ·
          Urlbox/SnapSave (optional) · AuditWorkspace / Demo Factory (contracts only)
Hosting (intended, not live): Vercel (web) · Render starter worker · Neon · Clerk
```

Key facts:

- **Auth.** `requireWorkspace()` (`apps/web/src/lib/workspace.ts`) resolves
  the workspace from Clerk, or from dev auth (`LEADENGINE_DEV_AUTH=true`, which
  is refused in production). Every action checks browser-supplied ids with
  `assertProspectInWorkspace()`.
- **Read model.** Scores are denormalised onto `Prospect` for list and filter
  queries. `ScoreSnapshot` and `ScoreComponent` hold the history.
- **Scoring config** is stored as a hidden `SavedSearch` row named
  `__scoring_config` (`apps/web/src/server/scoring.ts:26`). The worker reads
  it too, and has its own copy of the lookup at `apps/worker/src/handlers.ts:52`.
- **Scoring persistence is duplicated.** `rescoreProspect` (web) and
  `scoreOne` (worker) are near-identical copies. The web copy writes a
  `PROSPECT_SCORED` activity; the worker copy doesn't.
- **Env vars:** `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
  `CLERK_SECRET_KEY`, `LEADENGINE_DEV_AUTH`, `NEXT_PUBLIC_APP_URL`,
  `BUSINESS_DISCOVERY_PROVIDER`, `GOOGLE_MAPS_API_KEY`,
  `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` (unused), `SCREENSHOT_PROVIDER`,
  `URLBOX_*`, `SNAPSAVE_*`, `AUDIT_WORKSPACE_*`, `DEMO_FACTORY_*`,
  `WORKER_POLL_INTERVAL_MS`, `WORKER_CONCURRENCY`, `TEST_DATABASE_URL`.
- **No LLM or AI usage anywhere** (confirmed). No analytics. Logging is
  `console.error` in web and JSON logs in the worker. No file uploads.
  Playwright is used only by the QA scripts.

## 5. Current user workflow (observed)

1. **Discover.** Enter a category and location, then submit. The Google call
   runs synchronously inside the server action and returns **at most 20
   results** (`google.ts:241`; `nextPageToken` is requested but never used).
   `minReviews` and the website filter are applied _after_ the fetch, so a
   filtered search can return only a handful.
2. **Review results.** Select rows and click "Add" or "Reject". Already-tracked
   businesses are marked. ✅
3. **Prospect created and scored immediately, but the website hasn't been
   checked**, so Website Opportunity is 0 of 40. ⚠️ No enrichment is queued.
4. **Open each prospect one by one** and click "Inspect website". There's no
   bulk action. ❌ This is where most operator time goes.
5. Wait for the worker. Score updates. Read the Signal Stack. ✅ Good.
6. **Qualify or override.** ✅ Reasons are required for disqualification, and
   overrides are recorded.
7. **"Run audit".** Only records a local `PENDING_HANDOFF`. The copy promises
   it "will be sent once the integration is set up". It never will (§8, B4).
8. **Set next action and date.** Moves the prospect to OUTREACH. The date is
   then never shown or queried anywhere. ❌ There's no "who do I call today"
   screen, and no phone column in the list.
9. **Leave the tool to actually call or email.** No export. ❌

Dead ends and missing steps are marked ❌ above. The core loop costs one click
per prospect to enrich, and a manual copy-out to act on the results.

## 6. Verification results

Environment: Node 22.22.2, pnpm 10.33.0, local PostgreSQL 16, Chromium from
`/opt/pw-browsers`.

| Check                                    | Result                                                                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`         | ✅ clean                                                                                                                                 |
| `pnpm db:generate`                       | ✅                                                                                                                                       |
| `prisma migrate deploy` (fresh DB)       | ✅ one migration (`20260906203132_init`)                                                                                                 |
| Schema ↔ migrated DB drift               | ✅ none                                                                                                                                  |
| `pnpm typecheck`                         | ✅ 6/6 packages                                                                                                                          |
| `pnpm lint`                              | ✅                                                                                                                                       |
| `pnpm format:check`                      | ✅                                                                                                                                       |
| `pnpm test` (with `TEST_DATABASE_URL`)   | ✅ 10 files, 169 tests                                                                                                                   |
| `pnpm build`                             | ✅ all routes compile                                                                                                                    |
| `pnpm db:seed`                           | ✅ 8 fictional prospects, verdicts as documented                                                                                         |
| `/api/health`                            | ✅ `{"status":"ok","database":"ok","authMode":"dev"}`                                                                                    |
| `scripts/qa.mjs` (8 pages × 3 viewports) | ✅ no overflow or console errors                                                                                                         |
| `scripts/qa-workflow.mjs`                | 23/24. The single failure is a console 404, most likely `/favicon.ico` (confirmed to 404; only `icon.svg` exists)                        |
| **Probe: un-inspected prospect**         | ❌ Manual prospect with a site and phone scored **16 → DISQUALIFIED (NO_RELEVANT_OPPORTUNITY)** before inspection; **50 → REVIEW** after |
| **Probe: re-inspect within 10 min**      | ❌ `Website.enrichmentStatus` stuck at `QUEUED`, zero jobs queued; the worker-offline banner can't detect it                             |
| Vercel deployment                        | ❌ No Vercel project linked to this repo (checked via the Vercel connector)                                                              |

**[Unverified]**

- Clerk sign-in in a browser (no keys). The defect in B1 comes from reading
  the code.
- Live Google Places responses and SKU cost.
- The Render worker deploy.
- The real AuditWorkspace and Demo Factory endpoints. Neither is known to
  exist.

## 7. Feature inventory

| Feature                                       | State                | Evidence / location                                                                                                                                                         | Importance                 | Recommendation                                                   |
| --------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| Demo discovery provider                       | Working              | `packages/providers/src/discovery/demo.ts`; QA passes                                                                                                                       | Dev only                   | Keep                                                             |
| Google Places discovery                       | Partial (unverified) | `google.ts`; fixture tests only; ≤20 results, no pagination                                                                                                                 | **Critical**               | P0 live smoke test; P2 pagination                                |
| Discovery result triage                       | Working              | `discover/results.tsx`, `decideDiscoveryResults`                                                                                                                            | High                       | Keep; add "add + inspect" (P1)                                   |
| Strong-identifier dedupe                      | Working              | `core/dedupe.ts`, `prospect-write.ts`; 12 tests                                                                                                                             | High                       | Keep                                                             |
| Weak duplicate suggestions and merge          | Working but weak     | Merge doesn't move signals, snapshots, tags, stage history or screenshots (docs say signals move); other open candidates for the merged record stay open (`actions.ts:835`) | Medium                     | P2 fix; not in nav (linked from Prospects only), fine            |
| Manual add prospect                           | Working              | `new-prospect.tsx`, `createProspect`                                                                                                                                        | High                       | Keep                                                             |
| Shallow website enrichment (SSRF-safe)        | Working              | `core/website/fetch.ts`, `url-safety.ts`; 51 tests; pinned DNS lookup, per-hop revalidation, byte cap                                                                       | **Critical**               | Keep; trigger automatically (P1); fix stuck-queue (P0)           |
| Agency-credit detection                       | Working              | `core/website/agency.ts`, override path                                                                                                                                     | Medium                     | Keep                                                             |
| Deterministic scoring + Signal Stack          | Working but weak     | `core/scoring/engine.ts`; bug B2 (unchecked website means disqualified)                                                                                                     | **Critical**               | P0 fix B2                                                        |
| Qualification override                        | Working              | `setQualification`; recorded, respected by rescore                                                                                                                          | High                       | Keep                                                             |
| Pipeline (11 stages) + history                | Working              | `pipeline/page.tsx`; AUDITED/DEMO_READY/ENGAGED reachable only manually                                                                                                     | Medium                     | Keep enum; don't add stages                                      |
| Notes                                         | Working              | `notes.tsx`, `addNote`                                                                                                                                                      | High                       | Keep                                                             |
| Next action + date                            | Partial              | Written in `markForOutreach`; date never displayed or queried                                                                                                               | **High**                   | P1 Call list                                                     |
| Prospect list: server-side filters/sort/pages | Working              | `server/queries.ts`                                                                                                                                                         | High                       | Keep; add phone and next-action-date columns                     |
| Opportunity Matrix                            | Working              | `components/opportunity-matrix.tsx` (450 lines)                                                                                                                             | Low–medium                 | Keep as is; no further investment                                |
| Saved views                                   | Working              | `saved/page.tsx`, `saveSearch`                                                                                                                                              | Low                        | Keep; don't extend                                               |
| Activity feed                                 | Working              | `activity/page.tsx`                                                                                                                                                         | Low                        | Keep                                                             |
| Scoring settings                              | Working but weak     | Rescores up to 500 prospects synchronously in the request (`actions.ts:1089`); stored as a magic `SavedSearch` row; blank "min strength" field silently becomes 0           | Medium                     | P1 move to `BULK_SCORE` job; P2 proper column                    |
| Worker-offline banner                         | Working              | `workerHealth()`                                                                                                                                                            | Medium                     | Keep                                                             |
| Clerk auth (production)                       | **Broken**           | No sign-in route, link, `<SignIn/>` or sign-out; `clerkMiddleware()` doesn't protect; users without an org all collide into the `novenworks` workspace (`workspace.ts:98`)  | **Critical**               | P0                                                               |
| Dev auth fallback                             | Working              | `lib/env.ts`, refused in production                                                                                                                                         | Dev                        | Keep                                                             |
| AuditWorkspace handoff                        | Stub/mock            | Payload built and stored; never sent when unconfigured; replay job never enqueued; each click creates another reference                                                     | Medium (future)            | P1 honest wording; P2 wire the replay when AuditWorkspace exists |
| Demo Factory handoff                          | Stub/mock            | Same pattern, `requestDemoProject`                                                                                                                                          | Low                        | P1 hide unless configured                                        |
| Screenshots (Urlbox/SnapSave)                 | Stub (off)           | Default `none`; SnapSave adapter is a placeholder                                                                                                                           | Low                        | Leave dormant; P3 remove if SnapSave isn't coming                |
| `BULK_SCORE` job                              | Dead                 | `enqueueBulkScore` never called                                                                                                                                             | —                          | Wire it in P1 (settings save)                                    |
| `INTEGRATION_HANDOFF` job                     | Dead                 | `enqueueIntegrationHandoff` never called; key has no time bucket, so it can only ever run once                                                                              | —                          | Wire in P2 with AuditWorkspace                                   |
| `CSV_IMPORT` / `DISCOVERY_DETAILS` jobs       | Stub                 | Handler throws / no-op (`handlers.ts:408–435`)                                                                                                                              | —                          | Remove (P3)                                                      |
| `ImportBatch` table                           | Dead                 | No reads or writes                                                                                                                                                          | —                          | Remove (P3)                                                      |
| Tags (`Tag`, `ProspectTag`)                   | Dead                 | Loaded in `getProspectDetail`, never rendered or written                                                                                                                    | —                          | Remove (P3)                                                      |
| `getDetails()` / `getAuditStatus()`           | Dead                 | Implemented and tested, never called                                                                                                                                        | —                          | Leave; remove when touched                                       |
| Map key env (`NEXT_PUBLIC_GOOGLE_MAPS_…`)     | Dead                 | `mapsBrowserKey()` unused                                                                                                                                                   | —                          | Remove (P3)                                                      |
| `docs/legacy/inbound-lead-crm/` (332 KB)      | Dead                 | PDFs, screenshots and an OpenAPI spec for the superseded product                                                                                                            | —                          | Remove (P3); git history keeps it                                |
| **Automatic/bulk enrichment**                 | Missing, required    | —                                                                                                                                                                           | **Critical to throughput** | P1                                                               |
| **Call list (due/overdue next actions)**      | Missing, required    | —                                                                                                                                                                           | **High**                   | P1                                                               |
| **CSV export of filtered view**               | Missing, required    | —                                                                                                                                                                           | **High**                   | P1                                                               |
| CSV import                                    | Nice-to-have         | Roadmap                                                                                                                                                                     | Low                        | P3; manual add covers it                                         |
| Map view                                      | Nice-to-have         | Roadmap                                                                                                                                                                     | Low                        | P3                                                               |
| Contact-attempt log                           | Nice-to-have         | Roadmap; notes cover it for now                                                                                                                                             | Low                        | P2 only if notes prove insufficient                              |

## 8. Problems and technical debt

### Bugs (all confirmed in code; B2 and B3 reproduced live)

**B1 — Production sign-in doesn't exist (Critical).**

- **[Fact]** In Clerk mode, `NotAuthenticatedError` renders "Sign in required"
  with no link or form (`apps/web/src/app/(app)/layout.tsx:52`).
- **[Fact]** There's no `/sign-in` route, no `<SignIn/>`, no `<UserButton/>`,
  and no sign-out anywhere in `apps/web/src`.
- **[Fact]** `proxy.ts` mounts `clerkMiddleware()` without protection.
- **Result:** a production deploy can't be used.
- **B1b.** In `ensureWorkspace`, a Clerk user with no organisation who has no
  membership tries to create slug `novenworks`, hits the unique constraint,
  and **joins the existing Novenworks workspace as MEMBER**
  (`workspace.ts:98–118`).
  - **[Inference]** If Clerk sign-ups are open (Clerk's default), anyone who
    signs up can read and write all prospect data.

**B2 — Unchecked website means disqualified (High).**

- **[Fact]** `engine.ts:639`: `total < reviewFloor` gives DISQUALIFIED plus
  `NO_RELEVANT_OPPORTUNITY`, even when `websiteReachable === null`, i.e. up to
  40 points were never measured.
- This breaks the project's own rule: "we didn't check" must never read as
  "bad".
- **Reproduced:** 16 → DISQUALIFIED before inspection, 50 → REVIEW after.

**B3 — Re-inspect within 10 minutes sticks on QUEUED forever (High).**

- **[Fact]** `Job.idempotencyKey` is globally `@unique`, and finished jobs keep
  their key.
- `enqueueJob` (`jobs.ts:21`) looks only for QUEUED/RUNNING duplicates. It
  then hits the unique violation and returns the _SUCCEEDED_ job as
  "deduplicated".
- `enrichProspect` still sets `enrichmentStatus: "QUEUED"`.
- **Reproduced.** The same defect affects screenshots (60-minute bucket).

**B4 — Pending handoffs are never sent (Medium; honesty rule).**

- **[Fact]** The UI promises "will be sent once the integration is set up".
- Nothing ever enqueues `INTEGRATION_HANDOFF`.
- The key `handoff:${id}` has no bucket, so even when wired it could only
  ever run once (see B3).
- "Request another audit" creates a new reference instead of retrying.

**B5 — Settings save rescores synchronously (Medium, grows with data).**

- **[Fact]** `rescoreWorkspace` loops up to 500 prospects inside the request.
  Each rescore is about 5 queries plus a transaction.
- **[Inference]** At a few hundred prospects on Neon this approaches serverless
  timeouts. `BULK_SCORE` already exists in the worker, unused.

**B6 — Smaller issues (Low):**

- `enrichProspect` picks the oldest website, not `primaryWebsiteId`.
- The next-action panel treats QUEUED as enriched, so it suggests "Qualify"
  while inspection is still pending.
- A blank `minBusinessStrengthToQualify` silently becomes 0.
- `/favicon.ico` returns 404.
- `requestAudit` has no double-click protection.
- Merge gaps (see the inventory table).

### Technical debt

- **Duplicated scoring persistence.** Web and worker have two copies (§4). The
  "cannot drift" claim in CLAUDE.md is true of the _engine_, not of the
  persistence around it.
- **Scoring config hidden in `SavedSearch`.** Works (it's filtered from the
  Saved page), but it's a trap for the next developer.
- **Discovery runs synchronously in the web request.** Acceptable at 20
  results. Revisit only if pagination makes searches slow.
- **Docs drift.**
  - Handoff replay and "signals move on merge" are described as working; they
    don't.
  - `docs/ARCHITECTURE.md` says both apps "call the same functions".
  - `docs/SCORING.md` doesn't mention B2.

### Security posture

- **[Fact] Good:**
  - SSRF guard (scheme/port/host allowlists, all DNS answers checked, pinned
    lookup, per-hop revalidation, 2 MB cap, identity encoding), with 51 tests.
  - Workspace scoping on every action.
  - Dev auth refused in production.
  - CI secret scan.
  - Security headers.
- **[Fact] Gaps:**
  - B1/B1b.
  - No rate limit on discovery. A single operator is fine; Google cost is
    bounded by clicks.

## 9. Complexity and removal opportunities

| Item                                           | Why it exists                   | Verdict                                                                                                              |
| ---------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Multi-tenant workspaces + Clerk orgs           | "Future SaaS"                   | **Keep, don't extend.** It's built and tested; ripping it out costs more than keeping it. Fix B1b with an allowlist. |
| 23 tables                                      | Spec-driven completeness        | Remove the 3 dead ones (`ImportBatch`, `Tag`, `ProspectTag`) in P3. Keep the rest.                                   |
| Separate worker service on Render              | SSRF isolation, retries         | **Keep.** It's built and tested, and a starter instance is cheap. (Alternative considered below.)                    |
| AuditWorkspace / Demo Factory clients          | Downstream pipeline             | Keep the code (small, tested). **Hide Demo Factory in the UI** until configured. Reword AuditWorkspace.              |
| Screenshot providers                           | Visual preview                  | Dormant; don't turn on. Remove in P3 if SnapSave isn't planned within a quarter.                                     |
| Job types `CSV_IMPORT`, `DISCOVERY_DETAILS`    | Placeholders                    | Delete.                                                                                                              |
| Opportunity Matrix, Saved views, Activity feed | Nice analysis surfaces          | "Interesting", not "customers will pay". Keep as is; **no further investment**.                                      |
| `docs/legacy/`                                 | Archive of a superseded product | Delete; git history is the archive.                                                                                  |
| Separate `apps/web/CLAUDE.md` + `AGENTS.md`    | Auto-written by `next dev`      | Leave (Next regenerates them).                                                                                       |

**Alternative considered and rejected for now:** running jobs from a Vercel
Cron route instead of a Render worker.

- **Pro:** one less service.
- **Cons:**
  - per-minute cron needs Vercel Pro;
  - it puts outbound fetches on the web host;
  - it rewrites working, tested code.
- **Revisit only** if Render becomes a real operational burden.

## 10. Recommended target architecture

**Keep the current architecture.** The target is the same diagram with these
deltas:

1. **Auth.**
   - Current problem: can't sign in; open-signup data exposure.
   - Change: add a `/sign-in/[[...sign-in]]` page with Clerk `<SignIn/>`,
     redirect unauthenticated users there, add `<UserButton/>` to the shell,
     and enforce `LEADENGINE_ALLOWED_EMAILS` (comma-separated) in
     `requireWorkspace()`. Also restrict sign-ups in the Clerk dashboard.
   - Benefit: a deployable, private tool.
   - Cost: about half a day.
   - Risk: Next 16 + Clerk 7 proxy conventions (read
     `node_modules/next/dist/docs` first, per `apps/web/AGENTS.md`).
2. **Queue idempotency.**
   - Current problem: B3/B4.
   - Change: clear `idempotencyKey` (set it to null) when a job reaches
     SUCCEEDED or terminal FAILED, in `completeJob` and `failJob`.
   - Benefit: dedupe still collapses double-clicks, and re-runs work.
   - Cost: two lines plus tests. No migration.
   - Risk: minimal.
3. **Shared scoring persistence.**
   - Current problem: drift between the web and worker copies.
   - Change: move `getScoringConfig` and `rescoreProspect` into
     `packages/db/src/scoring.ts` (it already depends on core). Both apps
     import it.
   - Benefit: one code path.
   - Cost: about 2 hours.
   - Risk: low; covered by the existing tests plus one new test.
   - Priority: P2, unless P1 already touches scoring persistence.
4. **Enrichment trigger.**
   - Current problem: manual, one prospect at a time.
   - Change: `addProspect` enqueues `WEBSITE_ENRICHMENT` when a website
     exists. Add a bulk "Inspect selected" action on the list.
   - Benefit: the biggest operator time saving.
   - Cost: small.
   - Risk: a burst of outbound fetches. `WORKER_CONCURRENCY=2` already
     throttles it.

No new frameworks, services or tables are needed for V1.

## 11. V1 product definition

**V1 = "From a market search to a call list in under 10 minutes, on real data,
deployed privately."**

An operator can:

1. **Sign in** on the production URL. Only allowlisted emails get in.
2. **Search a real market** (Google Places), e.g. "HVAC contractor, Redlands
   CA". Fictional data is clearly labelled when Google isn't configured.
3. **Add results in bulk.** Each new prospect is **inspected automatically**,
   scored within about a minute, and never auto-disqualified for a site that
   wasn't checked.
4. **Scan a ranked list** with score, verdict, rating, review count, phone,
   website and next-action date. Filter to Qualified. Read _why_ in the
   Signal Stack.
5. **Qualify, override or disqualify** with a reason. **Set a next action and
   date.**
6. **Open "Call list"**: every prospect with a next action due today or
   overdue, with phone and website, sorted by date and then score.
7. **Export** any filtered list to CSV.
8. **Request an audit.** It's recorded honestly as "held locally — not sent",
   until AuditWorkspace exists.

**Operational requirements:**

- Deployed on Vercel + Render + Neon.
- `/api/health` is green.
- CI is green.
- The worker restarts cleanly.
- Real prospect data never enters the public repo.

## 12. Explicit non-goals for V1

- CSV import, map view, screenshots in production, a second discovery provider
- A contact-attempt log as its own entity (notes are enough)
- Sending email or SMS, sequences, templates, or AI-written outreach
- Live AuditWorkspace or Demo Factory integration, or audit status sync
- Scheduled re-enrichment, scoring experiments, per-user dashboards
- More pipeline stages, more tables, a UI or config package
- Any LLM feature
- Multi-client or SaaS features: billing, org management UI, onboarding

## 13. Prioritised backlog

| ID  | Item                                                                                                             | Priority | Why this priority                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------- |
| A1  | Clerk sign-in page, redirect, UserButton, email allowlist (B1, B1b)                                              | **P0**   | Without it the production deploy can't be used, and could leak data |
| A2  | Fix queue idempotency: clear the key on terminal state; only set QUEUED when a new job is created (B3)           | **P0**   | Silently stuck state in the core loop                               |
| A3  | Engine: never `NO_RELEVANT_OPPORTUNITY`/DISQUALIFIED while the website is unchecked; hold in REVIEW (B2)         | **P0**   | Wrong verdicts on the main list; breaks the product's own rule      |
| A4  | Live Google Places smoke test with a real key; fix the mapping if needed; record the real SKU/cost               | **P0**   | The whole product depends on real discovery; currently unverified   |
| A5  | Deploy: Neon, Vercel, Render, Clerk; follow `docs/DEPLOYMENT.md`'s verification checklist                        | **P0**   | Not usable until deployed                                           |
| B1  | Auto-enqueue enrichment when a prospect with a website is added                                                  | **P1**   | Removes the one-click-per-prospect bottleneck                       |
| B2  | Bulk actions on the list: select → inspect / disqualify / change stage                                           | **P1**   | Triage speed; the single-prospect paths already exist               |
| B3  | "Call list" view: due/overdue `nextActionDate`, with phone; add phone and next-date columns to the list          | **P1**   | Turns qualification into action; the date is currently write-only   |
| B4  | CSV export of the current filtered prospect view                                                                 | **P1**   | Lets the operator or a VA work the list outside the tool; cheap     |
| B5  | Handoff honesty: reword "will be sent" to "held locally, not sent"; hide Demo Factory unless configured          | **P1**   | Honesty rule; removes a UI surface that can't do anything           |
| B6  | Settings save enqueues `BULK_SCORE` instead of rescoring synchronously (B5)                                      | **P1**   | Avoids timeouts once real data grows; the job already exists        |
| B7  | Add `favicon.ico` (or a metadata icon link) so QA passes 24/24                                                   | **P1**   | Keeps the QA script a trustworthy gate; trivial                     |
| C1  | Extract shared scoring persistence into `packages/db`                                                            | P2       | Drift risk, but no bug today                                        |
| C2  | Google pagination (`nextPageToken`, up to 60) and apply `minReviews` before the page cap                         | P2       | Do it only if live use shows 20 results per search is limiting      |
| C3  | Merge completeness: move snapshots, stage history, screenshots and discovery results; close sibling candidates   | P2       | Correctness, but merges are rare                                    |
| C4  | Move scoring config to a `Workspace.settings` JSON column                                                        | P2       | Removes the magic row; needs a migration                            |
| C5  | Wire `INTEGRATION_HANDOFF` replay and a retry button, **when AuditWorkspace exists**                             | P2       | Depends on another product                                          |
| C6  | Small fixes from B6 (primary website, QUEUED next-action, blank field, double-click)                             | P2       | Polish                                                              |
| C7  | Update docs for the drift listed in §8                                                                           | P2       | Do it alongside each fix                                            |
| D1  | Delete dead code: `ImportBatch`, `Tag`/`ProspectTag`, `CSV_IMPORT`/`DISCOVERY_DETAILS`, map key env, legacy docs | P3       | Clarity only                                                        |
| D2  | CSV import, map view, screenshots, contact log, audit status sync                                                | P3       | Only when real usage asks for them                                  |

## 14. Phased implementation plan

Each phase is a small PR, independently reviewable, with CI green. Before
every PR, run:

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

Tests need `TEST_DATABASE_URL` pointing at a migrated throwaway Postgres.

### Phase 0 — Correctness fixes (A2, A3, B7) · about half a day

- **Objective:** the core loop tells the truth.
- **Files:**
  - `apps/worker/src/queue.ts` (`completeJob` and `failJob` set
    `idempotencyKey: null` in terminal states)
  - `apps/web/src/server/jobs.ts`
  - `apps/web/src/server/actions.ts#enrichProspect` (set QUEUED only when a
    job is really queued or running)
  - `packages/core/src/scoring/engine.ts` (verdict: when
    `facts.hasWebsite && facts.websiteReachable === null`, cap at REVIEW and
    skip `NO_RELEVANT_OPPORTUNITY`; hard disqualifiers still apply)
  - `apps/web/src/app/` (favicon)
  - `docs/SCORING.md`
- **Dependencies:** none.
- **Acceptance:**
  - Re-inspecting twice within 10 minutes runs twice and ends in a
    non-QUEUED state.
  - An un-inspected prospect with total < 30 reads REVIEW, with a component
    saying why.
  - The seed verdicts are unchanged (they're all enriched).
  - `qa-workflow.mjs` passes 24/24.
- **Tests:**
  - queue test: re-enqueue after SUCCEEDED creates a new job
  - scoring test: unchecked website below the floor gives REVIEW
  - an existing scoring test for "checked and bad" still gives DISQUALIFIED
- **Risks:** other verdict tests may encode the old behaviour. Update them
  deliberately and document the change in `SCORING.md`.

### Phase 1 — Private production access (A1) · about half a day

- **Objective:** only Novenworks can sign in.
- **Files:**
  - new `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx`
  - `apps/web/src/app/(app)/layout.tsx` (redirect instead of dead-end)
  - `apps/web/src/components/app-shell.tsx` (UserButton; client import is
    guarded when Clerk is off)
  - `apps/web/src/lib/workspace.ts` + `lib/env.ts` (allowlist via
    `LEADENGINE_ALLOWED_EMAILS`; unknown user gets "Not authorised")
  - `.env.example`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`
- **Dependencies:** Clerk dev instance keys for local testing.
- **Acceptance:**
  - With Clerk keys, visiting `/prospects` signed out lands on `/sign-in`.
  - An allowlisted user reaches the app.
  - A non-allowlisted user sees "Not authorised" and no data.
  - Sign-out works.
  - Dev auth still works without Clerk keys.
- **Tests:**
  - unit test for the allowlist function
  - manual browser run with Clerk dev keys
  - `qa.mjs` in dev-auth mode still passes
- **Risks:**
  - Next 16 proxy + Clerk 7 API differences: read
    `node_modules/next/dist/docs` and Clerk's Next 16 guide first.
  - Keep ClerkProvider conditional (dev mode must not crash).

### Phase 2 — Real data + deploy (A4, A5) · about 1 day, mostly operator time

- **Objective:** LeadEngine running in production on real Google data.
- **Work:**
  1. Create a restricted Google Maps key (Places API (New) + Geocoding).
  2. Run 3 searches locally and compare to Google Maps.
  3. Fix the mapping in `packages/providers/src/discovery/google.ts` if
     needed, and add a fixture from a real (anonymised) response shape to
     `providers.test.ts`, _without real business data_.
  4. Record the real SKU and cost in `docs/INTEGRATIONS.md`.
  5. Provision Neon, run `migrate deploy`, set up Vercel (env from §4) and
     Render (`render.yaml`).
  6. Run the §"Verifying a deployment" checklist in `docs/DEPLOYMENT.md`.
- **Dependencies:** Phase 1; a Google billing account.
- **Acceptance:**
  - Health shows `authMode: "clerk"`.
  - A real search returns real businesses with ratings, reviews and websites.
  - Enrichment completes in production.
  - No real data is committed.
- **Risks:**
  - Field-mask or SKU surprises (cost).
  - Neon pooled-URL behaviour with the pg adapter.
  - Render build needs `corepack enable` (already in `render.yaml`).

### Phase 3 — Throughput (B1, B2, B6) · about 1 day

- **Objective:** adding 20 prospects needs no further clicks to get them
  scored properly.
- **Files:**
  - `apps/web/src/server/prospect-write.ts` or the callers in `actions.ts`
    (enqueue enrichment after create when a website exists; outside the
    transaction)
  - `apps/web/src/app/(app)/prospects/table.tsx` + new `bulkAction` server
    action (zod: ids ≤ 200, action enum; each id checked against the
    workspace)
  - `updateScoringSettings` → `enqueueBulkScore`
- **Dependencies:** Phase 0 (idempotency fix).
- **Acceptance:**
  - Adding 10 results creates 10 enrichment jobs.
  - The list shows scores updating without per-prospect clicks.
  - Bulk disqualify requires a reason.
  - Settings save returns immediately and the rescore completes in the worker.
- **Tests:**
  - action tests for workspace scoping of bulk ids (follow `tenancy.test.ts`)
  - an extended `qa-workflow.mjs` step
- **Risks:** fixture `.example` domains fail DNS. That's expected, and
  produces the honest "does not load" state.

### Phase 4 — Act on the list (B3, B4, B5) · about 1 day

- **Objective:** qualification becomes calls.
- **Files:**
  - new `apps/web/src/app/(app)/calls/page.tsx`: `nextActionDate <= end of
today`, not archived, sorted by date then score; shows phone
    (`BusinessContact` PHONE), website, last note
  - nav entry in `app-shell.tsx`
  - list columns for phone and next date (`queries.ts` ProspectRow)
  - new route handler `apps/web/src/app/api/export/prospects/route.ts`:
    CSV of `listProspects` filters without pagination, capped (e.g. 5,000),
    workspace-scoped via `requireWorkspace()`
  - `integrations.tsx` wording; hide the Demo Factory panel when unconfigured
- **Dependencies:** Phase 3 (optional).
- **Acceptance:**
  - Setting a next action for today shows the prospect in Call list.
  - Export respects the current filters and opens cleanly in Google Sheets.
  - No handoff copy promises a future send.
- **Tests:**
  - CSV escaping unit test (commas, quotes, newlines)
  - workspace-scoping test for the export
  - add a `/calls` screen to `qa.mjs`
- **Risks:** CSV injection. Prefix cells starting with `= + - @` with `'`.

**Then stop and use it for two weeks.** Log friction in `docs/ROADMAP.md`.
Choose from P2 based on that log, not on this document.

## 15. Acceptance criteria (V1 done)

1. Production URL; only allowlisted accounts can sign in; health is green
   with `authMode: "clerk"`.
2. A real Google search → bulk add → all prospects inspected and scored within
   about 2 minutes, with no clicks per prospect.
3. No prospect is DISQUALIFIED because of an unchecked website. Re-inspection
   always completes.
4. The Call list shows today's and overdue next actions, with phone numbers.
   CSV export works for any filter.
5. No UI copy claims an integration did something it didn't.
6. CI green (typecheck, lint, format, test, build, secret scan); `qa.mjs` and
   `qa-workflow.mjs` pass fully.
7. Docs (`SCORING`, `DEPLOYMENT`, `SECURITY`, `INTEGRATIONS`, `ROADMAP`)
   match the code.
8. **Business check:** at least one real market run produces at least 10
   qualified prospects that the operator agrees are worth calling. If not,
   retune scoring settings before building anything else.

## 16. Risks and unresolved questions

- **Does AuditWorkspace exist, and when?** If it's more than a month away, B5
  (honest wording) is the right amount of work and C5 waits. _Needs an answer
  from the owner._
- **Is Demo Factory real?** There are active head-spa demo sites on Vercel,
  which suggests demos are built by hand today. If so, hide the Demo Factory
  panel.
- **`leadfinder` Vercel project.** It's a Vite app, created around July 2026,
  whose last deployment was cancelled. It may be an earlier or overlapping
  prospecting tool. _Confirm it's abandoned_, so two tools don't compete.
  Treat it as reference only.
- **Google cost.** The requested fields (rating, userRatingCount, websiteUri,
  phone) probably put Text Search in a higher-priced SKU. _[Unverified]_
  Measure it in Phase 2.
- **Clerk plan and sign-up settings.** Confirm sign-ups can be restricted on
  the current plan. The env allowlist covers it either way.
- **Scoring fit.** The weights are untested on real markets. The business
  strength gate and thresholds may need tuning after the first real run. They
  can be changed in Settings; no code needed.
- **Public repo.** Fixtures must stay fictional. Real exports must never be
  committed. CI scans only for credential shapes, not for prospect data.

## 17. Recommended first implementation task

**Phase 0**:

- clear idempotency keys on terminal job states (fixes B3/B4 at the root);
- set `QUEUED` only when a job was really enqueued;
- stop disqualifying prospects whose website hasn't been checked (B2);
- add the favicon.

It's about half a day, has no external dependencies, is fully testable
locally, and makes every later phase trustworthy. Immediately after it, and
in parallel since it's operator work: **get a Google Maps API key and a Clerk
dev instance**, because Phases 1–2 are blocked on those, not on code.
