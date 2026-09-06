# LeadEngine by Novenworks

A multi-client lead capture CRM for local service businesses. Multiple client websites can submit leads into one central LeadEngine app. Each business owner can log in and see their own leads, update statuses, add notes, and avoid losing prospects.

## Quick Start

### 1. Configure environment variables

Copy `.env.example` to a `.env` file or set the following secrets in Replit:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (auto-set by Replit DB) |
| `SESSION_SECRET` | Long random string for signing session cookies |
| `RESEND_API_KEY` | Your Resend API key for email notifications |

Get a Resend API key at [resend.com](https://resend.com) — free tier allows up to 3,000 emails/month.

### 2. Demo accounts (pre-seeded)

All demo accounts use the password: **`password123`**

| Email | Role | Business |
|---|---|---|
| `admin@novenworks.com` | Admin | All clients |
| `owner@citrus-sage.com` | Owner | Citrus & Sage |
| `owner@yardsanity.com` | Owner | YardSanity |
| `owner@espressoglow.com` | Owner | Espresso Glow |

### 3. Adding a new client

**As an admin:**

1. Log in as `admin@novenworks.com`
2. Go to **Clients** → **Create Client**
3. Fill in business name, slug (URL-friendly, e.g. `acme-plumbing`), owner email, and notification email
4. An API key is auto-generated

**Create an owner account via SQL** (or via future admin UI):

```sql
INSERT INTO users (email, name, password_hash, role, client_id)
VALUES ('owner@acmeplumbing.com', 'Owner Name', '<bcrypt-hash>', 'owner', <client_id>);
```

To generate a bcrypt hash: `node -e "const b=require('bcryptjs'); console.log(b.hashSync('yourpassword', 10))"`

### 4. Embed the lead capture form

1. Log in as admin
2. Go to **Clients** → select a client → **Embed Code** tab
3. Copy the HTML/JS snippet and paste it into the client's website

The form submits to `POST /api/leads/capture` with:
- `clientSlug` — the client's unique slug
- `apiKey` — the client's API key
- Lead fields: name, email, phone, serviceInterest, message, source

## Architecture

```
artifacts/
  api-server/     — Express 5 backend (auth, clients, leads, dashboard routes)
  lead-engine/    — React + Vite frontend (owner & admin dashboards)
lib/
  db/             — Drizzle ORM schema (users, clients, leads tables)
  api-spec/       — OpenAPI spec (source of truth for all API contracts)
  api-client-react/ — Generated React Query hooks
  api-zod/        — Generated Zod validation schemas
```

## Lead Statuses

| Status | Meaning |
|---|---|
| **New** | Fresh lead, not yet contacted |
| **Contacted** | Reached out, awaiting response |
| **Booked** | Appointment or job scheduled |
| **Won** | Successfully converted to customer |
| **Lost** | Did not convert |

## Development Commands

```bash
# Run API server
pnpm --filter @workspace/api-server run dev

# Run frontend
pnpm --filter @workspace/lead-engine run dev

# Typecheck all packages
pnpm run typecheck

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Regenerate API hooks from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

## Email Notifications

When a lead is captured via the public `/api/leads/capture` endpoint, LeadEngine automatically sends an email to the client's `notification_email` using [Resend](https://resend.com).

If `RESEND_API_KEY` is not set, the app still works — emails are skipped with a warning in the logs.

**Note:** Update the `from` address in `artifacts/api-server/src/lib/email.ts` to match a domain you own and have verified in Resend.

## Roadmap (V2+)

- Automated follow-up email sequences
- SMS notifications via Twilio
- AI-powered lead scoring
- Multi-user teams per client
- Lead import via CSV
