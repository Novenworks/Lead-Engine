import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";
export { PrismaClient };

declare global {
  // Reused across Next.js dev hot reloads so we don't exhaust Neon connections.
  var __leadenginePrisma: PrismaClient | undefined;
}

function create(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.PRISMA_LOG === "query" ? ["query", "warn", "error"] : ["warn", "error"],
  });
  if (process.env.NODE_ENV !== "production") globalThis.__leadenginePrisma = client;
  return client;
}

let instance: PrismaClient | undefined;

function client(): PrismaClient {
  instance ??= globalThis.__leadenginePrisma ?? create();
  return instance;
}

/**
 * The shared Prisma client.
 *
 * Construction is deferred to first use rather than to module load. ESM
 * hoists imports above statements, so an eagerly-created client would read
 * DATABASE_URL before a script's `dotenv` call had run — which is exactly the
 * kind of ordering bug that only shows up in one entry point.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(client(), property, receiver);
  },
  has(_target, property) {
    return Reflect.has(client(), property);
  },
});
