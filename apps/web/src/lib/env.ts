import "server-only";

/**
 * Environment access, in one place, with the production safety rails.
 *
 * Nothing here reads a secret into the client bundle: this module is
 * server-only and every value is consumed inside server components, server
 * actions or route handlers.
 */

function flag(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

/** True in any deployed production environment (Vercel or a plain Node host). */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

export const clerkConfigured = (): boolean =>
  Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() && process.env.CLERK_SECRET_KEY?.trim(),
  );

/**
 * The development auth fallback.
 *
 * It requires an explicit opt-in AND a non-production environment. If someone
 * sets the opt-in in production, `assertAuthConfig()` throws at first use
 * rather than quietly running an app with no authentication.
 */
export const devAuthRequested = (): boolean => flag(process.env.LEADENGINE_DEV_AUTH);

export function devAuthAllowed(): boolean {
  return devAuthRequested() && !isProduction();
}

export type AuthMode = "clerk" | "dev" | "unconfigured";

export function authMode(): AuthMode {
  if (clerkConfigured()) return "clerk";
  if (devAuthAllowed()) return "dev";
  return "unconfigured";
}

/**
 * Fails loudly on a dangerous configuration. Called from the app shell so a
 * misconfigured deployment shows an error instead of an open door.
 */
export function assertAuthConfig(): void {
  if (isProduction() && devAuthRequested() && !clerkConfigured()) {
    throw new Error(
      "LEADENGINE_DEV_AUTH is set in a production environment. " +
        "The development auth fallback is refused in production — configure Clerk instead.",
    );
  }
}

export const providerEnv = () => ({
  BUSINESS_DISCOVERY_PROVIDER: process.env.BUSINESS_DISCOVERY_PROVIDER,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  SCREENSHOT_PROVIDER: process.env.SCREENSHOT_PROVIDER,
  URLBOX_API_KEY: process.env.URLBOX_API_KEY,
  URLBOX_API_SECRET: process.env.URLBOX_API_SECRET,
  SNAPSAVE_API_URL: process.env.SNAPSAVE_API_URL,
  SNAPSAVE_API_TOKEN: process.env.SNAPSAVE_API_TOKEN,
});

export const integrationEnv = () => ({
  AUDIT_WORKSPACE_API_URL: process.env.AUDIT_WORKSPACE_API_URL,
  AUDIT_WORKSPACE_API_TOKEN: process.env.AUDIT_WORKSPACE_API_TOKEN,
  DEMO_FACTORY_API_URL: process.env.DEMO_FACTORY_API_URL,
  DEMO_FACTORY_API_TOKEN: process.env.DEMO_FACTORY_API_TOKEN,
});

/** Public map key, safe to expose — Google keys are restricted by referrer. */
export const mapsBrowserKey = (): string | null =>
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY?.trim() || null;
