import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";
export { PrismaClient };

declare global {
  // Reused across Next.js dev hot reloads so we don't exhaust Neon connections.
  // eslint-disable-next-line no-var
  var __leadenginePrisma: PrismaClient | undefined;
}

function create(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.PRISMA_LOG === "query" ? ["query", "warn", "error"] : ["warn", "error"],
  });
}

export const prisma: PrismaClient = globalThis.__leadenginePrisma ?? create();

if (process.env.NODE_ENV !== "production") {
  globalThis.__leadenginePrisma = prisma;
}
