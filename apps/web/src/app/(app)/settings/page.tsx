import {
  createDiscoveryProvider,
  createScreenshotProvider,
  discoveryProviderDegraded,
} from "@leadengine/providers";
import { createAuditWorkspaceClient, createDemoFactoryClient } from "@leadengine/integrations";
import { SCORING_MODEL_VERSION } from "@leadengine/core";
import { requireWorkspace } from "@/lib/workspace";
import { authMode, integrationEnv, providerEnv } from "@/lib/env";
import { getScoringConfig } from "@/server/scoring";
import { workerHealth } from "@/server/jobs";
import { PageHeader } from "@/components/app-shell";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { ScoringSettingsForm } from "./scoring-form";

export const dynamic = "force-dynamic";

/**
 * Settings: the few knobs worth exposing, plus an honest report of what is and
 * is not connected. Deliberately not a rule builder.
 */
export default async function SettingsPage() {
  const { workspaceId, workspaceName, mode } = await requireWorkspace();

  const [config, health] = await Promise.all([
    getScoringConfig(workspaceId),
    workerHealth(workspaceId),
  ]);

  const discovery = createDiscoveryProvider(providerEnv());
  const screenshots = createScreenshotProvider(providerEnv());
  const audit = createAuditWorkspaceClient(integrationEnv());
  const demoFactory = createDemoFactoryClient(integrationEnv());

  return (
    <>
      <PageHeader title="Settings" subtitle={`Workspace: ${workspaceName}`} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title={`Scoring model ${SCORING_MODEL_VERSION}`}>
          <p className="mb-3 text-xs leading-relaxed text-ink-700">
            The Opportunity Score is a rules engine, not a model. These settings change what the
            rules consider a good fit. Saving rescores every prospect in this workspace, and any
            qualification you set by hand is preserved as an override.
          </p>
          <ScoringSettingsForm config={config} />
        </Panel>

        <div className="space-y-4">
          <Panel title="Connections">
            <dl className="space-y-3 text-xs">
              <Connection
                label="Authentication"
                ok={mode === "clerk"}
                okText="Clerk"
                offText={`Development fallback (${authMode()})`}
                detail={
                  mode === "clerk"
                    ? "Signed-in users are resolved through Clerk."
                    : "Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY. This fallback cannot run in production."
                }
              />
              <Connection
                label="Discovery"
                ok={discovery.returnsRealData}
                okText={discovery.label}
                offText={discovery.label}
                detail={
                  discovery.returnsRealData
                    ? "Real business data from Google Places."
                    : discoveryProviderDegraded(providerEnv())
                      ? "Google was selected but GOOGLE_MAPS_API_KEY is not set, so fictional demo results are returned instead."
                      : "Fictional demo results. Set BUSINESS_DISCOVERY_PROVIDER=google and GOOGLE_MAPS_API_KEY for real data."
                }
              />
              <Connection
                label="Screenshots"
                ok={screenshots.isConfigured()}
                okText={screenshots.label}
                offText="Disabled"
                detail={
                  screenshots.isConfigured()
                    ? "Website previews are captured on demand."
                    : "Set SCREENSHOT_PROVIDER (urlbox or snapsave) plus its credentials. Previews are optional — qualification does not depend on them."
                }
              />
              <Connection
                label="AuditWorkspace"
                ok={audit.configured}
                okText="Connected"
                offText="Not configured"
                detail={
                  audit.configured
                    ? "Qualified prospects can be handed off for the deep audit."
                    : "Audit requests are recorded locally and marked pending until AUDIT_WORKSPACE_API_URL and AUDIT_WORKSPACE_API_TOKEN are set."
                }
              />
              <Connection
                label="Demo Factory"
                ok={demoFactory.configured}
                okText="Connected"
                offText="Not configured"
                detail={
                  demoFactory.configured
                    ? "Audited prospects can be pushed to Demo Factory."
                    : "Demo requests are recorded locally until DEMO_FACTORY_API_URL and DEMO_FACTORY_API_TOKEN are set."
                }
              />
            </dl>
          </Panel>

          <Panel title="Background worker">
            <dl className="space-y-1.5 text-xs">
              <Stat label="Queued" value={health.queued} />
              <Stat label="Running" value={health.running} />
              <Stat label="Failed" value={health.failed} />
            </dl>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
              {health.stalled
                ? "Jobs have been waiting more than five minutes. Start the worker (pnpm dev:worker locally, or the Render background worker in production)."
                : "Website inspection and screenshot capture run in the worker process, not in the web app."}
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Connection({
  label,
  ok,
  okText,
  offText,
  detail,
}: {
  label: string;
  ok: boolean;
  okText: string;
  offText: string;
  detail: string;
}) {
  return (
    <div>
      <dt className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide text-ink-500">{label}</span>
        <Badge tone={ok ? "good" : "warn"} glyph={ok ? "●" : "▲"}>
          {ok ? okText : offText}
        </Badge>
      </dt>
      <dd className="mt-1 text-[11px] leading-relaxed text-ink-700">{detail}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-700">{label}</dt>
      <dd className="tabular font-medium text-ink-900">{value}</dd>
    </div>
  );
}
