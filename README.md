# LeadEngine

**Novenworks' prospect discovery and qualification engine.**

Its job is to answer one question: _which local businesses are actually worth
spending Novenworks time on?_

LeadEngine is the front of a four-stage revenue workflow:

```
LeadEngine  →  AuditWorkspace  →  Demo Factory  →  WalkReplay
finds the      proves the         builds the       sells the
opportunity    opportunity        alternative      difference
```

Success is not a big database. A hundred thousand rows is not success. A
smaller set where the operator can immediately see _"Strong business. Weak
website. Good fit. Reachable. Worth auditing."_ — that is success.

> **Note:** this repository previously implemented a different product, a
> multi-client inbound website lead-capture CRM. That direction is superseded.
> Its documentation and screenshots are archived under
> [`docs/legacy/inbound-lead-crm/`](docs/legacy/inbound-lead-crm/).

---

## What LeadEngine does

1. **Discover** — search a market by category and geography through a pluggable
   business-data provider.
2. **Review** — provider results land in a queue, not in your prospect list. You
   decide what is worth tracking.
3. **Deduplicate** — a business that arrives twice becomes one record.
4. **Enrich, shallowly** — fetch the homepage once and record obvious,
   decision-relevant facts.
5. **Score** — a deterministic 0–100 Opportunity Score, with every point
   attributable to a named rule and the evidence behind it.
6. **Qualify** — qualified, needs review, or disqualified with a structured
   reason. You can always override the engine, and the override is recorded.
7. **Hand off** — send qualified prospects to AuditWorkspace for the deep
   investigation.

## What LeadEngine deliberately does not do

It is not AuditWorkspace, and it never pretends to be. LeadEngine performs
**shallow** qualification only — enough to decide whether a business deserves a
real audit. It does not run a crawler, Lighthouse, axe, an accessibility or SEO
audit, a page inventory, a conversion audit, or screenshot analysis. When a
prospect deserves that, you press **Run Audit** and AuditWorkspace forms its
own verdict.

It is also not: an inbound lead-capture form product, a general CRM, a
cold-email platform, a client portal, or an "AI picks your leads" tool. V1
requires no LLM at all — see [docs/SCORING.md](docs/SCORING.md).

Once a prospect becomes a client, the long-term relationship belongs elsewhere
in the Novenworks platform. LeadEngine keeps the history and stops there.

---

## Architecture

| Piece              | Technology                   | Runs on                    |
| ------------------ | ---------------------------- | -------------------------- |
| Web application    | Next.js App Router, React 19 | Vercel                     |
| Background worker  | Node.js + TypeScript         | Render Background Worker   |
| Database           | PostgreSQL via Prisma        | Neon                       |
| Authentication     | Clerk                        | —                          |
| Business discovery | Provider adapters            | Google Places (New) / demo |
| Screenshots        | Provider adapters            | Urlbox / SnapSave / off    |
| Deep audit         | HTTP contract                | AuditWorkspace             |

```
apps/
  web/        Next.js App Router application
  worker/     Job runner: website enrichment, screenshots, scoring, handoffs
packages/
  core/       Normalization, dedupe, SSRF-safe fetch, extraction, scoring
  db/         Prisma schema, client and fixture seed
  providers/  Business discovery and screenshot provider boundaries
  integrations/ AuditWorkspace and Demo Factory contracts
```

Detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ·
[docs/DATA_MODEL.md](docs/DATA_MODEL.md)

---

## Local development

Requirements: Node 22+, pnpm 10, PostgreSQL 16.

```bash
pnpm install
cp .env.example .env          # then fill in DATABASE_URL

pnpm db:generate              # generate the Prisma client
pnpm --filter @leadengine/db exec prisma migrate dev
pnpm db:seed                  # eight fictional prospects

pnpm dev                      # web app on :3000
pnpm dev:worker               # worker, in a second terminal
```

`pnpm db:seed` creates a workspace of clearly fictional businesses on
`.example` domains, chosen to exercise the qualification logic: an ideal
target, an agency-managed site, a weak business, a competent site, a business
with no website, one whose site does not load, a near-duplicate pair, and an
out-of-area business.

### Signing in locally

Set Clerk keys, or use the development fallback:

```bash
LEADENGINE_DEV_AUTH=true
```

This gives you a single local operator with no sign-in. It is **refused**
whenever `NODE_ENV` or `VERCEL_ENV` is `production` — a production deployment
without Clerk shows a configuration-required page rather than an open door.

### Without a Google key

LeadEngine is fully usable with no third-party credentials. The demo discovery
provider returns fictional businesses, and every screen that shows them says
so. Set `BUSINESS_DISCOVERY_PROVIDER=google` and `GOOGLE_MAPS_API_KEY` for real
data; if the key is missing, LeadEngine falls back to demo results and tells
you, rather than presenting fixtures as Google data.

---

## Commands

| Command           | What it does                               |
| ----------------- | ------------------------------------------ |
| `pnpm dev`        | Web app in development                     |
| `pnpm dev:worker` | Background worker                          |
| `pnpm build`      | Production build of every package          |
| `pnpm typecheck`  | TypeScript across the workspace            |
| `pnpm lint`       | ESLint                                     |
| `pnpm test`       | Vitest (unit + database integration)       |
| `pnpm db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `pnpm db:seed`    | Load fictional fixture data                |

Browser QA (needs a running app):

```bash
node scripts/qa.mjs http://localhost:3000           # every screen at 1440/1024/390
node scripts/qa-workflow.mjs http://localhost:3000  # the end-to-end workflow
```

---

## Testing

Unit tests need nothing. Database tests need `TEST_DATABASE_URL`; without it
they skip rather than silently pass.

```bash
createdb leadengine_test
export TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/leadengine_test"
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @leadengine/db exec prisma migrate deploy
pnpm test
```

Covered: normalization, deduplication, SSRF blocking (including redirect
re-validation against a real server), HTML extraction, agency-credit detection,
scoring and its explainability, provider adapters and their failure modes,
handoff serialization, workspace isolation, and job-queue concurrency.

Provider and integration tests use fixtures and injected `fetch`. CI never
needs production secrets.

---

## Security model

The repository is public. Treat every committed byte as readable by the
internet — no keys, no real prospect data, no customer contact lists. CI fails
on committed credential shapes.

The most security-sensitive component is the shallow website fetcher, which
follows operator- and provider-supplied URLs. It is hardened against SSRF: a
scheme/host/port allowlist, rejection of every reserved and private IP range,
DNS-rebinding resistance by pinning the validated address, re-validation of
every redirect hop, response size and time limits, and no JavaScript execution.

Full detail, including the threat model and what is _not_ covered:
[docs/SECURITY.md](docs/SECURITY.md)

---

## Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — how the pieces fit and why
- [DATA_MODEL.md](docs/DATA_MODEL.md) — entities, tenancy and deduplication
- [SCORING.md](docs/SCORING.md) — the Opportunity Score, rule by rule
- [SECURITY.md](docs/SECURITY.md) — threat model, SSRF, auth, tenancy
- [INTEGRATIONS.md](docs/INTEGRATIONS.md) — provider and handoff boundaries
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) — Vercel, Render, Neon, Clerk
- [ROADMAP.md](docs/ROADMAP.md) — what ships next, and what is out of scope

---

## Known limitations

- **The Google Places adapter is unverified against the live API.** No API key
  was available during the build. Its response mapping is covered by fixture
  tests only; treat the first real search as a smoke test.
- **AuditWorkspace and Demo Factory contracts are provisional.** Both services
  were unavailable, so the request and response shapes are LeadEngine's
  proposal and will need agreeing on both sides.
- **No map view yet.** List and Matrix cover the V1 workflow; the map is
  deferred rather than half-built.
- **No CSV import yet.** Manual entry and discovery cover V1. See the roadmap.
- **Agency-credit detection is a heuristic**, and the product presents it as
  one: evidence, a confidence level, and an operator override.
