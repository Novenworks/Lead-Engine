import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthNotConfiguredError, NotAuthenticatedError, requireWorkspace } from "@/lib/workspace";
import { authMode, providerEnv } from "@/lib/env";
import { workerHealth } from "@/server/jobs";
import { createDiscoveryProvider, discoveryProviderDegraded } from "@leadengine/providers";

export const dynamic = "force-dynamic";

/**
 * Honest failure before anything else renders.
 *
 * A misconfigured deployment gets a page that says exactly what is wrong,
 * rather than a stack trace or — worse — an app with no authentication.
 */
function ConfigurationRequired({ title, body }: { title: string; body: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-shell-950 px-6">
      <div className="max-w-lg rounded-panel border border-shell-700 bg-shell-900 p-6 text-shell-300">
        <h1 className="text-base font-semibold text-white">{title}</h1>
        <div className="mt-2 space-y-2 text-sm leading-relaxed">{body}</div>
      </div>
    </main>
  );
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  let operator;
  try {
    operator = await requireWorkspace();
  } catch (error) {
    if (error instanceof AuthNotConfiguredError) {
      return (
        <ConfigurationRequired
          title="Authentication is not configured"
          body={
            <>
              <p>
                LeadEngine will not run without an authentication provider. Set{" "}
                <code className="font-mono text-volt-300">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>{" "}
                and <code className="font-mono text-volt-300">CLERK_SECRET_KEY</code>.
              </p>
              <p>
                For local development only, set{" "}
                <code className="font-mono text-volt-300">LEADENGINE_DEV_AUTH=true</code>. That
                fallback is refused in production.
              </p>
            </>
          }
        />
      );
    }
    if (error instanceof NotAuthenticatedError) {
      return (
        <ConfigurationRequired
          title="Sign in required"
          body={<p>Sign in with your Novenworks account to continue.</p>}
        />
      );
    }
    throw error;
  }

  const health = await workerHealth(operator.workspaceId);
  const provider = createDiscoveryProvider(providerEnv());
  const degraded = discoveryProviderDegraded(providerEnv());

  const banners: ReactNode[] = [];

  if (operator.mode === "dev") {
    banners.push(
      <Banner key="dev" tone="warn">
        Development authentication is active — every visitor is the same local operator. This mode
        cannot run in production.
      </Banner>,
    );
  }

  if (!provider.returnsRealData) {
    banners.push(
      <Banner key="fixtures" tone="info">
        Discovery is running the <strong>demo provider</strong>. Every business it returns is
        fictional.
        {degraded ? " Google was selected but GOOGLE_MAPS_API_KEY is not set." : ""}
      </Banner>,
    );
  }

  if (health.stalled) {
    banners.push(
      <Banner key="worker" tone="bad">
        {health.queued} background job(s) have been waiting more than five minutes. The worker looks
        offline — website enrichment and screenshots will not complete until it is running.
      </Banner>,
    );
  }

  return (
    <AppShell
      workspaceName={operator.workspaceName}
      operatorLabel={
        operator.mode === "dev" ? "Local operator (dev auth)" : `Signed in · ${authMode()}`
      }
      banner={banners.length > 0 ? <div>{banners}</div> : undefined}
    >
      {children}
    </AppShell>
  );
}

function Banner({ tone, children }: { tone: "warn" | "info" | "bad"; children: ReactNode }) {
  const styles = {
    warn: "bg-warn-100 text-warn-700 border-warn-500/40",
    info: "bg-signal-100 text-signal-800 border-signal-400/40",
    bad: "bg-bad-100 text-bad-700 border-bad-500/40",
  } as const;
  const glyph = { warn: "▲", info: "◆", bad: "■" } as const;
  return (
    <div
      role="status"
      className={`flex items-start gap-2 border-b px-4 py-2 text-xs lg:px-6 ${styles[tone]}`}
    >
      <span aria-hidden="true" className="font-mono leading-5">
        {glyph[tone]}
      </span>
      <p className="leading-5">{children}</p>
    </div>
  );
}
