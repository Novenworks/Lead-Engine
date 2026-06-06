---
name: Session table setup
description: connect-pg-simple createTableIfMissing fails silently; session table must be created manually if sessions don't work.
---

# Session Table for connect-pg-simple

When sessions don't persist (login works but /me returns 401), check if the `session` table exists.

**Why:** `connect-pg-simple`'s `createTableIfMissing: true` option can fail silently when the table doesn't exist. The session cookie is set but nothing is written to the DB.

**How to apply:** If sessions aren't working on a new environment (new DB, fresh deploy), create the table manually:

```sql
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
```

This is also needed after wiping/recreating the database. The Drizzle schema does NOT manage this table — it's owned by `connect-pg-simple`.

**Tip:** Add `sessionStore.on("error", ...)` to catch future store errors in the logs.
