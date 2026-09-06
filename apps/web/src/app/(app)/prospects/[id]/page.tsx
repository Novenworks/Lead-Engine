import Link from "next/link";
import { notFound } from "next/navigation";
import { createScreenshotProvider } from "@leadengine/providers";
import { createAuditWorkspaceClient, createDemoFactoryClient } from "@leadengine/integrations";
import { requireWorkspace } from "@/lib/workspace";
import { integrationEnv, providerEnv } from "@/lib/env";
import { getProspectDetail } from "@/server/queries";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { SignalStack } from "@/components/signal-stack";
import { ProspectActions } from "./actions-panel";
import { NotesSection } from "./notes";
import { ResearchSection } from "./research";
import { IntegrationsSection } from "./integrations";

export const dynamic = "force-dynamic";

const ENRICHMENT_MESSAGE: Record<string, { tone: "warn" | "bad" | "neutral"; text: string }> = {
  NOT_ATTEMPTED: { tone: "neutral", text: "Website has not been inspected yet." },
  QUEUED: { tone: "neutral", text: "Website inspection is queued for the worker." },
  LIMITED: {
    tone: "warn",
    text: "The homepage renders client-side, so shallow checks may understate the site. Run an audit for the real picture.",
  },
  UNREACHABLE: { tone: "bad", text: "The website did not load." },
  TIMEOUT: { tone: "bad", text: "The website did not respond in time." },
  BLOCKED_BY_POLICY: {
    tone: "bad",
    text: "That address was refused by the fetch security policy (private, reserved or non-web address).",
  },
  INVALID_URL: { tone: "bad", text: "The stored website address is not a usable http(s) URL." },
  TOO_LARGE: { tone: "bad", text: "The homepage exceeded the response size limit." },
  FAILED: { tone: "bad", text: "The website inspection failed." },
};

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspaceId } = await requireWorkspace();
  const { id } = await params;

  const prospect = await getProspectDetail(workspaceId, id);
  if (!prospect) notFound();

  const snapshot = prospect.scoreSnapshots[0];
  const website = prospect.primaryWebsite ?? prospect.websites[0] ?? null;
  const screenshotProvider = createScreenshotProvider(providerEnv());
  const auditClient = createAuditWorkspaceClient(integrationEnv());
  const demoClient = createDemoFactoryClient(integrationEnv());

  const auditRef = prospect.externalRefs.find((ref) => ref.system === "AUDIT_WORKSPACE") ?? null;
  const demoRef = prospect.externalRefs.find((ref) => ref.system === "DEMO_FACTORY") ?? null;

  const enrichment = website ? ENRICHMENT_MESSAGE[website.enrichmentStatus] : undefined;
  const location = prospect.primaryLocation ?? prospect.locations[0] ?? null;
  const phone = prospect.contacts.find((c) => c.kind === "PHONE");
  const email = prospect.contacts.find((c) => c.kind === "EMAIL");

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-2 text-xs">
        <Link href="/prospects" className="text-signal-600 underline">
          Prospects
        </Link>
        <span className="mx-1.5 text-ink-500" aria-hidden="true">
          /
        </span>
        <span className="text-ink-700">{prospect.name}</span>
      </nav>

      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink-900">{prospect.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-700">
            <span>{prospect.primaryCategory ?? "Category unknown"}</span>
            {location?.formatted ? (
              <>
                <span aria-hidden="true" className="text-ink-500">
                  ·
                </span>
                <span>{location.formatted}</span>
              </>
            ) : null}
            {phone ? (
              <>
                <span aria-hidden="true" className="text-ink-500">
                  ·
                </span>
                <a href={`tel:${phone.normalized ?? phone.value}`} className="text-signal-600 underline">
                  {phone.value}
                </a>
              </>
            ) : null}
            {website ? (
              <>
                <span aria-hidden="true" className="text-ink-500">
                  ·
                </span>
                <a
                  href={website.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-signal-600 underline"
                >
                  {website.rootDomain}
                </a>
              </>
            ) : null}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge
              tone={
                prospect.qualification === "QUALIFIED"
                  ? "good"
                  : prospect.qualification === "DISQUALIFIED"
                    ? "bad"
                    : "warn"
              }
              glyph={
                prospect.qualification === "QUALIFIED"
                  ? "●"
                  : prospect.qualification === "DISQUALIFIED"
                    ? "○"
                    : "◆"
              }
            >
              {prospect.qualification.toLowerCase()}
              {prospect.disqualificationReason
                ? ` · ${prospect.disqualificationReason.toLowerCase().replace(/_/g, " ")}`
                : ""}
            </Badge>
            <Badge tone="neutral">
              {prospect.pipelineStage.toLowerCase().replace(/_/g, " ")}
            </Badge>
            {prospect.qualificationOverridden ? (
              <Badge tone="signal" glyph="✎">
                operator override
              </Badge>
            ) : null}
            {prospect.agencyManaged ? (
              <Badge tone="bad" glyph="✕">
                agency-managed
              </Badge>
            ) : null}
            {!prospect.hasWebsite ? (
              <Badge tone="volt" glyph="◆">
                no website
              </Badge>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-2 min-w-0 xl:order-1">
          <Tabs
            tabs={[
              {
                id: "overview",
                label: "Overview",
                content: (
                  <div className="space-y-4">
                    {enrichment && enrichment.tone !== "neutral" ? (
                      <div
                        role="status"
                        className={`rounded-panel border px-3 py-2 text-xs ${
                          enrichment.tone === "bad"
                            ? "border-bad-500/40 bg-bad-100 text-bad-700"
                            : "border-warn-500/40 bg-warn-100 text-warn-700"
                        }`}
                      >
                        <span aria-hidden="true" className="mr-1.5 font-mono">
                          {enrichment.tone === "bad" ? "■" : "▲"}
                        </span>
                        {enrichment.text}
                        {website?.enrichmentError ? (
                          <span className="mt-1 block font-mono text-[11px] opacity-80">
                            {website.enrichmentError}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    <Panel title="Website preview">
                      <WebsitePreview
                        screenshotUrl={prospect.screenshots[0]?.url ?? null}
                        providerConfigured={screenshotProvider.isConfigured()}
                        providerLabel={screenshotProvider.label}
                        websiteUrl={website?.url ?? null}
                      />
                    </Panel>

                    <Panel title="What we know">
                      <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                        <Fact label="Reputation">
                          {prospect.rating !== null
                            ? `${prospect.rating.toFixed(1)}★ from ${prospect.reviewCount ?? 0} reviews`
                            : "No rating data"}
                        </Fact>
                        <Fact label="Website">
                          {website ? (
                            <>
                              {website.rootDomain}
                              {website.usesHttps === false ? " (no HTTPS)" : ""}
                              {website.httpStatus ? ` · HTTP ${website.httpStatus}` : ""}
                            </>
                          ) : (
                            "None on file"
                          )}
                        </Fact>
                        <Fact label="Public phone">{phone?.value ?? "Not found"}</Fact>
                        <Fact label="Public email">{email?.value ?? "Not found"}</Fact>
                        <Fact label="Page title">{website?.title ?? "—"}</Fact>
                        <Fact label="Last inspected">
                          {website?.lastEnrichedAt
                            ? website.lastEnrichedAt.toLocaleString()
                            : "Never"}
                        </Fact>
                        <Fact label="Next action">{prospect.nextAction ?? "—"}</Fact>
                        <Fact label="Sources">
                          {prospect.sources.map((s) => s.provider).join(", ") || "—"}
                        </Fact>
                      </dl>
                    </Panel>

                    <NotesSection
                      prospectId={prospect.id}
                      notes={prospect.notes.map((note) => ({
                        id: note.id,
                        body: note.body,
                        createdAt: note.createdAt,
                      }))}
                    />
                  </div>
                ),
              },
              {
                id: "signals",
                label: "Signals",
                count: prospect.signals.length,
                content: snapshot ? (
                  <Panel>
                    <SignalStack
                      total={snapshot.total}
                      modelVersion={snapshot.modelVersion}
                      scoredAt={snapshot.createdAt}
                      disqualifiers={snapshot.disqualifiers}
                      components={snapshot.components}
                      signals={prospect.signals}
                    />
                  </Panel>
                ) : (
                  <EmptyState
                    title="Not scored yet"
                    body="Scoring runs when a prospect is added and after each enrichment. Use Rescore in the actions panel to run it now."
                  />
                ),
              },
              {
                id: "research",
                label: "Research",
                content: (
                  <ResearchSection
                    contacts={prospect.contacts.map((c) => ({
                      id: c.id,
                      kind: c.kind,
                      value: c.value,
                      source: c.source,
                    }))}
                    locations={prospect.locations.map((l) => ({
                      id: l.id,
                      formatted: l.formatted,
                      city: l.city,
                      region: l.region,
                      postalCode: l.postalCode,
                      latitude: l.latitude,
                      longitude: l.longitude,
                    }))}
                    websites={prospect.websites.map((w) => ({
                      id: w.id,
                      url: w.url,
                      rootDomain: w.rootDomain,
                      title: w.title,
                      metaDescription: w.metaDescription,
                      status: w.enrichmentStatus,
                    }))}
                    sources={prospect.sources.map((s) => ({
                      id: s.id,
                      provider: s.provider,
                      externalId: s.externalId,
                      firstSeenAt: s.firstSeenAt,
                    }))}
                    signals={prospect.signals.map((s) => ({
                      type: s.type,
                      value: s.value,
                      evidence: s.evidence,
                      sourceReference: s.sourceReference,
                    }))}
                  />
                ),
              },
              {
                id: "activity",
                label: "Activity",
                count: prospect.activity.length,
                content: (
                  <Panel bodyClassName="p-0">
                    <ol className="divide-y divide-paper-200">
                      {prospect.activity.map((event) => (
                        <li key={event.id} className="flex gap-3 px-4 py-2.5 text-xs">
                          <time
                            dateTime={event.createdAt.toISOString()}
                            className="tabular w-32 shrink-0 text-ink-500"
                          >
                            {event.createdAt.toLocaleString()}
                          </time>
                          <span className="min-w-0 flex-1">
                            <span className="block text-ink-900">{event.summary}</span>
                            <span className="text-[11px] text-ink-500">
                              {event.type.toLowerCase().replace(/_/g, " ")}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </Panel>
                ),
              },
              {
                id: "integrations",
                label: "Integrations",
                content: (
                  <IntegrationsSection
                    prospectId={prospect.id}
                    qualification={prospect.qualification}
                    auditConfigured={auditClient.configured}
                    demoConfigured={demoClient.configured}
                    auditRef={
                      auditRef
                        ? {
                            status: auditRef.status,
                            externalId: auditRef.externalId,
                            externalUrl: auditRef.externalUrl,
                            externalStatus: auditRef.externalStatus,
                            lastError: auditRef.lastError,
                            createdAt: auditRef.createdAt,
                            summary: auditRef.summary as Record<string, unknown> | null,
                          }
                        : null
                    }
                    demoRef={
                      demoRef
                        ? {
                            status: demoRef.status,
                            externalId: demoRef.externalId,
                            externalUrl: demoRef.externalUrl,
                            lastError: demoRef.lastError,
                            createdAt: demoRef.createdAt,
                          }
                        : null
                    }
                  />
                ),
              },
            ]}
          />
        </div>

        <aside className="order-1 xl:order-2">
          <ProspectActions
            prospectId={prospect.id}
            name={prospect.name}
            qualification={prospect.qualification}
            pipelineStage={prospect.pipelineStage}
            overridden={prospect.qualificationOverridden}
            hasWebsite={Boolean(website)}
            enrichmentStatus={website?.enrichmentStatus ?? null}
            score={snapshot?.total ?? prospect.opportunityScore ?? null}
            businessStrength={prospect.businessStrengthScore}
            websiteOpportunity={prospect.websiteOpportunityScore}
            businessFit={prospect.businessFitScore}
            reachability={prospect.reachabilityScore}
            suggested={snapshot?.suggestedQualification ?? null}
            auditConfigured={auditClient.configured}
            demoConfigured={demoClient.configured}
            hasAudit={Boolean(auditRef)}
            hasDemo={Boolean(demoRef)}
            nextAction={prospect.nextAction}
            screenshotConfigured={screenshotProvider.isConfigured()}
          />
        </aside>
      </div>
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-xs text-ink-900">{children}</dd>
    </div>
  );
}

function WebsitePreview({
  screenshotUrl,
  providerConfigured,
  providerLabel,
  websiteUrl,
}: {
  screenshotUrl: string | null;
  providerConfigured: boolean;
  providerLabel: string;
  websiteUrl: string | null;
}) {
  if (!websiteUrl) {
    return (
      <p className="text-xs text-ink-700">
        This business has no website on file — which is itself the opportunity.
      </p>
    );
  }
  if (screenshotUrl) {
    return (
      // A remote screenshot from an arbitrary provider: a plain img keeps it
      // out of Next's optimizer, which would need every host allow-listed.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={screenshotUrl}
        alt={`Homepage screenshot of ${websiteUrl}`}
        className="w-full rounded border border-paper-300"
        loading="lazy"
      />
    );
  }
  return (
    <div className="rounded border border-dashed border-paper-300 bg-paper-50 px-3 py-6 text-center">
      <p className="text-xs font-medium text-ink-900">No preview captured</p>
      <p className="mt-1 text-[11px] text-ink-700">
        {providerConfigured
          ? `Queue a capture from the actions panel (${providerLabel}).`
          : "Screenshot capture is not configured. Set SCREENSHOT_PROVIDER to enable previews."}
      </p>
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="mt-2 inline-block text-xs text-signal-600 underline"
      >
        Open the site in a new tab →
      </a>
    </div>
  );
}
