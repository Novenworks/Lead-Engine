import { NextResponse } from "next/server";
import { prisma } from "@leadengine/db";
import { authMode } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Liveness plus a real database round-trip, for Vercel and Render checks. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "ok", authMode: authMode() });
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "unreachable", authMode: authMode() },
      { status: 503 },
    );
  }
}
