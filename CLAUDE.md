# LeadEngine — project context

## What this is

Novenworks' prospect discovery and qualification engine. It answers one
question: **which local businesses are worth spending Novenworks time on?**

Position in the revenue workflow:
`LeadEngine → AuditWorkspace → Demo Factory → WalkReplay`.
LeadEngine finds the opportunity; the others prove, build and sell it.

Target user: a Novenworks operator prospecting local service businesses
(plumbers, HVAC, med spas, dentists, contractors) in the Inland Empire and
wider California. Single operator today; the workspace model is already
multi-tenant.

**Success is opportunity quality × evidence × operator speed — not row count.**

## Hard boundaries

LeadEngine performs **shallow** qualification only. It must never grow into:

- A deep website audit — no crawler, Lighthouse, axe, page inventory, SEO or
  CRO analysis. That is **AuditWorkspace**. The handoff is the boundary.
- A site builder → **Demo Factory** · Screenshot infrastructure → **SnapSave**
- A CRM, client portal or project management → **PortelOS**
- A cold-email/SMS platform. V1 records outreach _intent_ only.
- An inbound lead-capture form product (the repo's superseded former product).
- An "AI picks your leads" tool. **V1 requires no LLM.** The score is
  deterministic and explainable, and must stay that way.

## Architecture

```
apps/web        Next.js 16 App Router, React 19, Tailwind v4  → Vercel
apps/worker     Node + tsx job runner                          → Render
packages/core   Pure domain: normalize, dedupe, SSRF fetch, extract, score
packages/db     Prisma 7 schema + client + fixture seed        → Neon
packages/providers    Discovery (demo, google) + screenshot adapters
packages/integrations AuditWorkspace + Demo Factory contracts
```

- **pnpm workspace**, Node 22, strict TypeScript 5.9.
- **Prisma 7**: no `url` in `schema.prisma` — the CLI reads
  `packages/db/prisma.config.ts`; the runtime uses `@prisma/adapter-pg`.
  The client generates into `packages/db/src/generated` (gitignored), so
  `pnpm db:generate` must run before any build.
- The web app never fetches a prospect's website. All outbound traffic to the
  open internet lives in the worker, behind the SSRF guard.
- `packages/core` has no database and no framework, so scoring and the guard
  are exhaustively testable. Both apps call the same functions — they cannot
  drift.
- Client components must import vocabulary from `@leadengine/core/vocab`, not
  the barrel; the barrel reaches `node:net` and will break the client bundle.

## Conventions

- Business logic stays out of React components. Reads are server components
  calling Prisma; writes are server actions in `apps/web/src/server/actions.ts`.
- Every action: resolve the workspace from the session via
  `requireWorkspace()`, validate input with zod, check any browser-supplied id
  with `assertProspectInWorkspace()`, return a message rather than throwing.
- **Never trust a `workspaceId` from a form or query string.**
- Provider SDKs stay behind adapters. Nothing above `packages/providers` sees a
  vendor payload.
- Filters live in the URL so views are shareable and savable.
- Signals are facts; score components are interpretations. Never mix them.
- Status is never carried by colour alone — pair a hue with a glyph or word.

## Honesty rules (these are product requirements, not style)

- Never render a success that did not happen. An unconfigured integration says
  so and records the request as pending.
- Demo provider results are always labelled fictional. Never present fixtures
  as Google data.
- "We didn't check" must never score or read the same as "we checked and it's
  bad".
- Provider cost is shown only when the provider reports it. Never estimate.
- Agency-credit detection is a heuristic and is presented as one: evidence,
  confidence, and an operator override that is recorded.

## Commands

```bash
pnpm dev            # web on :3000
pnpm dev:worker     # background worker
pnpm typecheck      # whole workspace
pnpm lint
pnpm test           # vitest; DB suites skip without TEST_DATABASE_URL
pnpm build
pnpm db:generate    # required before build
pnpm db:seed        # 8 fictional prospects

node scripts/qa.mjs <url>           # every screen at 1440/1024/390
node scripts/qa-workflow.mjs <url>  # end-to-end workflow, needs the worker
```

Before opening a PR: typecheck, lint, `prettier --check`, test, build. CI runs
all five plus a committed-secret scan.

## Security

**The repository is public.** No keys, no real prospect data, no contact lists.
All fixtures are invented on `.example` domains. CI fails on credential shapes
and on any committed `.env`.

The SSRF guard in `packages/core/src/url-safety.ts` is the most sensitive code
here. Do not weaken it for convenience: scheme/host/port allowlists, every DNS
answer checked against reserved ranges, the validated address pinned via
Node's `lookup` (this is what closes DNS rebinding), every redirect hop
re-validated, byte and time caps, `accept-encoding: identity`, no JS execution.

Clerk is the auth provider. The dev fallback (`LEADENGINE_DEV_AUTH=true`) is
refused whenever `NODE_ENV` or `VERCEL_ENV` is production — keep it that way.

## Known limitations

- The Google Places adapter is **unverified against the live API** — no key was
  available at build time. Fixture-tested only.
- AuditWorkspace and Demo Factory endpoint shapes are LeadEngine's proposal and
  need agreeing on both sides.
- No CSV import, no map view yet — both deliberately deferred, see
  `docs/ROADMAP.md`.
- The temporary wordmark/app mark live only in
  `apps/web/src/components/wordmark.tsx` and `apps/web/src/app/icon.svg`.
  The permanent logo is not approved; replace those two files together and
  do not inline the mark elsewhere.

## Documentation

`docs/ARCHITECTURE.md` · `docs/DATA_MODEL.md` · `docs/SCORING.md` ·
`docs/SECURITY.md` · `docs/INTEGRATIONS.md` · `docs/DEPLOYMENT.md` ·
`docs/ROADMAP.md`. The superseded inbound-CRM product is archived under
`docs/legacy/inbound-lead-crm/`.

Keep these current when architecture, scoring, security or integration
contracts change. Code is the source of truth for what exists; docs are the
source of truth for intent and constraints.
