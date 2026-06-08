---
name: Session persistence in production
description: Two production session failure modes — missing trust proxy (most common) and missing session table.
---

# Session persistence in production

## Mode 1 — trust proxy missing (PRIMARY FIX)

**Symptom:** Login returns 200, but the very next `/auth/me` returns 401 with ~1ms response time (no DB round-trip at all).

**Why:** In production, `NODE_ENV=production` sets `cookie.secure: true`. Express-session checks `req.secure` before writing the `Set-Cookie` header. Behind Replit's reverse proxy the internal connection is plain HTTP, so `req.secure === false` — express-session silently skips writing the cookie. The browser never receives it, so every subsequent request is unauthenticated.

**Fix:** Add to `app.ts` immediately after `const app = express()`, before the session middleware:
```js
app.set("trust proxy", 1);
```
This makes Express read `X-Forwarded-Proto: https` from Replit's proxy and set `req.secure = true`.

## Mode 2 — session table missing

**Why:** `connect-pg-simple`'s `createTableIfMissing: true` can fail silently when the DB user lacks CREATE TABLE permissions. Sessions are attempted but not stored.

**How to check:** Query `information_schema.tables` for the `session` table. If missing, create it manually:
```sql
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
```
The Drizzle schema does NOT manage this table — it's owned by `connect-pg-simple`.
