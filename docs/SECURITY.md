# Security model

## The repository is public

Treat every committed byte as readable by the internet. No API keys, no
database URLs, no tokens, no real prospect data, no customer contact lists, no
private notes. All fixtures are invented and use the reserved `.example` TLD.

CI fails the build on committed credential shapes (Stripe, Google, Resend, AWS,
GitHub, Anthropic keys, private key blocks, populated Postgres URLs) and on any
committed `.env` file. The check is in `.github/workflows/ci.yml`.

The old product's seeded demo credentials (`password123`) are gone along with
the session-auth code that used them.

## Authentication

Clerk. `requireWorkspace()` runs on every server render and every server
action; the Next proxy is a convenience, not the gate.

There is one development fallback, and it is structurally constrained:

```
LEADENGINE_DEV_AUTH=true          # opt-in
AND NODE_ENV !== "production"
AND VERCEL_ENV !== "production"
```

If the opt-in is set in a production environment, `assertAuthConfig()` throws
rather than serving. With neither Clerk nor a valid fallback, the app renders a
configuration-required page and no data query runs. Verified: `next start`
(which sets `NODE_ENV=production`) reports `authMode: "unconfigured"` even with
the flag set.

## Tenant isolation

- Every tenant table carries `workspaceId`.
- The workspace comes from the session. A `workspaceId` in a form or query
  string is never trusted.
- Ids arriving from a browser go through `assertProspectInWorkspace()` first.
- Cross-workspace reads return "not found", indistinguishable from a genuinely
  missing record, so responses cannot be used to probe for ids.
- Unique indexes are per workspace, so tenants can track the same business
  without interfering.

`packages/db/src/__tests__/tenancy.test.ts` asserts these against a real
database, including that scoped `updateMany`/`deleteMany` cannot touch another
tenant's rows.

## Website fetching — the main attack surface

The shallow enrichment fetcher follows URLs supplied by operators and by
third-party providers, so those URLs are treated as attacker-controlled. The
guard is `packages/core/src/url-safety.ts` and `packages/core/src/website/fetch.ts`.

**Three layers:**

1. **Shape validation before any resolution** — `http`/`https` only; no
   credentials in the URL; ports restricted to 80/443/8080/8443 so the fetcher
   cannot be used as an internal port scanner; a hostname denylist
   (`localhost`, `metadata.google.internal`, `169.254.169.254`, …) and suffix
   denylist (`.local`, `.internal`, `.corp`, `.home.arpa`, …); public hostnames
   must contain a dot.

2. **Every DNS answer checked** — the request is rejected if _any_ returned
   address is in a reserved range, rather than filtering to the good ones. That
   stops a host mixing a public and a private record to slip past.

   Blocked IPv4: `0.0.0.0/8`, `10/8`, `100.64/10`, `127/8`, `169.254/16`,
   `172.16/12`, `192.0.0/24`, `192.0.2/24`, `192.88.99/24`, `192.168/16`,
   `198.18/15`, `198.51.100/24`, `203.0.113/24`, `224/4`, `240/4`.
   Blocked IPv6: `::`, `::1`, everything in `::/80` judged by its embedded
   IPv4, NAT64 `64:ff9b::/96`, `100::/64`, `2001:db8::/32`, `fc00::/7`,
   `fe80::/10`, `ff00::/8`. Unparseable input fails closed.

3. **DNS rebinding closed by pinning** — the validated address is passed to
   Node's `lookup` hook, so the address that was checked is the address
   connected to. There is no second resolution to poison. TLS is still verified
   against the original hostname.

**Redirects are re-validated.** Every hop repeats all three layers; a redirect
into private space fails the whole fetch. This is tested end-to-end against a
real local server that redirects to `169.254.169.254` and to `10.0.0.7`.

**Resource limits:** 15s total budget, 8s per hop, 5 redirects, 2 MB response
cap enforced on the running byte total (not the declared `Content-Length`),
HTML content types only.

**Decompression bombs** are avoided rather than mitigated: the fetcher sends
`accept-encoding: identity`, so there is no decompression step and the byte cap
is the real size.

**No JavaScript execution.** A page that needs rendering is marked `LIMITED`
and the score says the shallow checks may understate it. LeadEngine does not
run a browser; that is AuditWorkspace's job.

## Input validation

Every server action validates with zod at the boundary and returns a message
rather than throwing an opaque 500. Discovery parameters, filters, saved
searches and scoring settings are all schema-validated on read as well as
write, so a corrupted stored value degrades to defaults instead of breaking a
page.

## Outbound data

The AuditWorkspace handoff carries public business contact details only —
phone and email as published by the business. No personal contact data is
collected or forwarded. LeadEngine's own score travels namespaced under
`leadEngineAssessment` so it can never be mistaken for an audit finding.

## What is not covered

- **No rate limiting on server actions.** A single-operator internal tool
  behind Clerk; worth adding before any multi-tenant or public exposure.
- **No audit log of reads.** Writes produce activity events; reads do not.
- **No CSP.** `X-Content-Type-Options`, `Referrer-Policy` and `X-Frame-Options`
  are set; a full Content-Security-Policy is not yet configured.
- **Screenshot provider URLs are rendered directly** in an `<img>`. They come
  from a configured provider, not from prospect data.
- **The Google adapter is unverified against the live API** (no key was
  available), so its error handling is exercised only against fixtures.
