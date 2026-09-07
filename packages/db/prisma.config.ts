import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 moves the connection URL out of schema.prisma. The CLI (migrate,
 * db push, studio) reads it from here; the runtime client gets it through the
 * pg driver adapter in src/index.ts.
 *
 * Env is loaded from this package first, then the repo root, so a single root
 * .env works for the whole workspace.
 */
loadEnv({ path: [".env", "../../.env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx src/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
