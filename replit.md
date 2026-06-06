# LeadEngine by Novenworks

A multi-client lead capture CRM for local service businesses. Client websites submit leads to one central dashboard where each owner manages their pipeline, tracks statuses, and adds notes.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at /api)
- `pnpm --filter @workspace/lead-engine run dev` — run the frontend (port 19500)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `RESEND_API_KEY` — Resend key for email notifications (app works without it)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + express-session + connect-pg-simple
- DB: PostgreSQL + Drizzle ORM
- Auth: Custom session-based auth with bcryptjs
- Email: Resend
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite + TanStack Query + wouter + shadcn/ui
- Build: esbuild (CJS bundle)

## Where things live

- API spec: `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema/` (users.ts, clients.ts, leads.ts)
- Routes: `artifacts/api-server/src/routes/` (auth, clients, leads, dashboard)
- Email: `artifacts/api-server/src/lib/email.ts`
- Frontend pages: `artifacts/lead-engine/src/pages/`

## Demo Accounts (password: `password123`)

| Email | Role |
|---|---|
| admin@novenworks.com | Admin |
| owner@citrus-sage.com | Owner — Citrus & Sage |
| owner@yardsanity.com | Owner — YardSanity |
| owner@espressoglow.com | Owner — Espresso Glow |

## Architecture decisions

- Custom session auth (not Replit Auth) — owners log in with their business email and password
- Lead capture endpoint (`POST /api/leads/capture`) is public — validates client slug + API key before saving
- Email notifications are fire-and-forget — errors are logged but don't block the API response
- Admin role sees all clients and all leads; owner role is scoped to their single client

## Product

- Public `POST /api/leads/capture` endpoint accepts lead form submissions from any client website
- Admin dashboard: manage all clients, view all leads, copy embed code per client
- Owner dashboard: view own leads, update status/notes, see pipeline stats
- Embed code generator creates ready-to-paste HTML/JS form for each client website

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm run typecheck:libs` after changing `lib/*` schema files before typechecking artifact packages
- The `from` email in `artifacts/api-server/src/lib/email.ts` must be a verified Resend domain
- Adding a new owner account requires inserting a user row directly (or via admin UI if built)
- `pnpm --filter @workspace/db run push-force` if push fails with column conflicts

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `README.md` for setup instructions and embed code documentation
