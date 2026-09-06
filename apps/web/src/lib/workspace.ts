import "server-only";
import { cache } from "react";
import { prisma } from "@leadengine/db";
import { authMode, assertAuthConfig } from "./env";

/**
 * Tenancy.
 *
 * Every read and every write in this app goes through `requireWorkspace()` and
 * scopes by the workspace id it returns. A workspace id supplied by the
 * browser is never trusted — see `assertProspectInWorkspace`.
 */

export interface Operator {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  /** True when this workspace holds seeded fixture data. */
  isFixture: boolean;
  mode: "clerk" | "dev";
}

export class NotAuthenticatedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "NotAuthenticatedError";
  }
}

export class AuthNotConfiguredError extends Error {
  constructor() {
    super("Authentication is not configured");
    this.name = "AuthNotConfiguredError";
  }
}

/** The single operator identity used by the development auth fallback. */
const DEV_USER_ID = "dev-operator";
const DEV_WORKSPACE_SLUG = "novenworks";

interface ClerkIdentity {
  userId: string;
  /** Clerk organization id, when the user is acting inside an organization. */
  orgId: string | null;
  orgSlug: string | null;
}

async function clerkIdentity(): Promise<ClerkIdentity> {
  // Imported lazily so the app boots in dev mode without Clerk keys present.
  const { auth } = await import("@clerk/nextjs/server");
  const session = await auth();
  if (!session.userId) throw new NotAuthenticatedError();
  return {
    userId: session.userId,
    orgId: session.orgId ?? null,
    orgSlug: session.orgSlug ?? null,
  };
}

async function ensureWorkspace(params: {
  userId: string;
  clerkOrgId: string | null;
  name: string;
  slug: string;
}): Promise<{ id: string; name: string; slug: string; isFixture: boolean }> {
  if (params.clerkOrgId) {
    const existing = await prisma.workspace.findUnique({ where: { clerkOrgId: params.clerkOrgId } });
    if (existing) {
      await prisma.membership.upsert({
        where: { workspaceId_userId: { workspaceId: existing.id, userId: params.userId } },
        create: { workspaceId: existing.id, userId: params.userId, role: "MEMBER" },
        update: {},
      });
      return existing;
    }
  } else {
    // No Clerk organization: use the workspace this user already belongs to.
    const membership = await prisma.membership.findFirst({
      where: { userId: params.userId },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });
    if (membership) return membership.workspace;
  }

  // Slugs are unique, so a concurrent first request can lose the race.
  const slug = params.clerkOrgId ? `${params.slug}-${params.clerkOrgId.slice(-6)}` : params.slug;
  try {
    return await prisma.workspace.create({
      data: {
        name: params.name,
        slug,
        clerkOrgId: params.clerkOrgId,
        memberships: { create: { userId: params.userId, role: "OWNER" } },
      },
    });
  } catch {
    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (!existing) throw new Error(`Could not create or find workspace "${slug}".`);
    await prisma.membership.upsert({
      where: { workspaceId_userId: { workspaceId: existing.id, userId: params.userId } },
      create: { workspaceId: existing.id, userId: params.userId, role: "MEMBER" },
      update: {},
    });
    return existing;
  }
}

/**
 * Resolve the current operator and their workspace.
 *
 * Memoized per request by `react/cache`, so a page that calls it from several
 * components still performs one lookup.
 */
export const requireWorkspace = cache(async (): Promise<Operator> => {
  assertAuthConfig();
  const mode = authMode();

  if (mode === "unconfigured") throw new AuthNotConfiguredError();

  if (mode === "dev") {
    const workspace = await ensureWorkspace({
      userId: DEV_USER_ID,
      clerkOrgId: null,
      name: "Novenworks",
      slug: DEV_WORKSPACE_SLUG,
    });
    return {
      userId: DEV_USER_ID,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      isFixture: workspace.isFixture,
      mode: "dev",
    };
  }

  const identity = await clerkIdentity();
  const label = identity.orgSlug ?? "Novenworks";
  const workspace = await ensureWorkspace({
    userId: identity.userId,
    clerkOrgId: identity.orgId,
    name: label,
    slug: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "workspace",
  });

  return {
    userId: identity.userId,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceSlug: workspace.slug,
    isFixture: workspace.isFixture,
    mode: "clerk",
  };
});

/**
 * Confirm a prospect id from a URL or form belongs to the caller's workspace.
 *
 * Every action that takes a prospect id calls this. It returns the id so the
 * call site reads as `const id = await assertProspectInWorkspace(...)` and a
 * missing check is visible in review.
 */
export async function assertProspectInWorkspace(
  workspaceId: string,
  prospectId: string,
): Promise<string> {
  const found = await prisma.prospect.findFirst({
    where: { id: prospectId, workspaceId },
    select: { id: true },
  });
  if (!found) {
    // Deliberately indistinguishable from "does not exist" so the response
    // cannot be used to probe for ids in other workspaces.
    throw new Error("Prospect not found.");
  }
  return found.id;
}
