import { NextResponse, type NextRequest } from "next/server";

/**
 * Next 16 proxy (the former `middleware` convention).
 *
 * Clerk's middleware is only mounted when Clerk is configured: importing
 * `clerkMiddleware` unconditionally throws when the keys are absent, which
 * would break the documented development auth mode.
 *
 * The real access gate is not here. `requireWorkspace()` runs on every server
 * render and every server action, so a request that slips past this file still
 * cannot read another workspace's data.
 */
const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() && process.env.CLERK_SECRET_KEY?.trim(),
);

async function withClerk(request: NextRequest) {
  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  return clerkMiddleware()(request, {} as never);
}

export default async function proxy(request: NextRequest) {
  if (clerkConfigured) return withClerk(request);
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals and static files.
    "/((?!_next|.*\\..*).*)",
  ],
};
