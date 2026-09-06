"use client";

import { useState, useTransition } from "react";
import { ActionMessage } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { requestAudit, requestDemoProject, type ActionState } from "@/server/actions";

/**
 * Integration status, told honestly.
 *
 * When AuditWorkspace is not configured, the button records an internal
 * request and the panel says so in plain words. Nothing ever renders a
 * successful audit that did not happen.
 */

interface RefSummary {
  status: string;
  externalId: string | null;
  externalUrl: string | null;
  externalStatus?: string | null;
  lastError: string | null;
  createdAt: Date;
  summary?: Record<string, unknown> | null;
}

const STATUS_TONE: Record<string, "good" | "warn" | "bad" | "neutral"> = {
  ACKNOWLEDGED: "good",
  SENT: "good",
  PENDING_HANDOFF: "warn",
  FAILED: "bad",
};

export function IntegrationsSection({
  prospectId,
  qualification,
  auditConfigured,
  demoConfigured,
  auditRef,
  demoRef,
}: {
  prospectId: string;
  qualification: string;
  auditConfigured: boolean;
  demoConfigured: boolean;
  auditRef: RefSummary | null;
  demoRef: RefSummary | null;
}) {
  const [result, setResult] = useState<ActionState | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<ActionState>) =>
    startTransition(async () => setResult(await fn()));

  return (
    <div className="space-y-4">
      <Panel
        title={
          <span className="flex items-center gap-2">
            AuditWorkspace
            {auditConfigured ? (
              <Badge tone="good" glyph="●">
                connected
              </Badge>
            ) : (
              <Badge tone="warn" glyph="▲">
                not configured
              </Badge>
            )}
          </span>
        }
      >
        <p className="text-xs leading-relaxed text-ink-700">
          LeadEngine performs shallow qualification only. The deep investigation — crawl,
          performance, accessibility, conversion — belongs to AuditWorkspace, which forms its own
          verdict. LeadEngine&apos;s score travels with the handoff as context, never as a finding.
        </p>

        {!auditConfigured ? (
          <p className="mt-2 rounded border border-warn-500/40 bg-warn-100 px-2.5 py-2 text-[11px] text-warn-700">
            <span aria-hidden="true" className="mr-1 font-mono">
              ▲
            </span>
            <code className="font-mono">AUDIT_WORKSPACE_API_URL</code> and{" "}
            <code className="font-mono">AUDIT_WORKSPACE_API_TOKEN</code> are not set. Requesting an
            audit records it here and it will be sent once the integration is configured.
          </p>
        ) : null}

        {auditRef ? (
          <dl className="mt-3 space-y-2 border-t border-paper-200 pt-3 text-xs">
            <Row label="Status">
              <Badge tone={STATUS_TONE[auditRef.status] ?? "neutral"}>
                {auditRef.status.toLowerCase().replace(/_/g, " ")}
              </Badge>
              {auditRef.externalStatus ? (
                <span className="ml-2 text-ink-700">{auditRef.externalStatus}</span>
              ) : null}
            </Row>
            <Row label="Audit reference">
              {auditRef.externalUrl ? (
                <a
                  href={auditRef.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-signal-600 underline"
                >
                  {auditRef.externalId} — open in AuditWorkspace →
                </a>
              ) : (
                <span className="text-ink-700">
                  {auditRef.externalId ?? "Not issued — nothing has been sent yet."}
                </span>
              )}
            </Row>
            <Row label="Requested">
              <time dateTime={auditRef.createdAt.toISOString()}>
                {auditRef.createdAt.toLocaleString()}
              </time>
            </Row>
            {auditRef.lastError ? (
              <Row label="Last error">
                <span className="text-bad-700">{auditRef.lastError}</span>
              </Row>
            ) : null}
          </dl>
        ) : null}

        <div className="mt-3">
          <Button
            variant={qualification === "QUALIFIED" && !auditRef ? "primary" : "secondary"}
            size="sm"
            disabled={pending}
            onClick={() => run(() => requestAudit(prospectId))}
          >
            {auditRef ? "Request another audit" : "Run audit"}
          </Button>
          {qualification !== "QUALIFIED" ? (
            <p className="mt-1.5 text-[11px] text-ink-500">
              Usually you would qualify a prospect before spending an audit on it.
            </p>
          ) : null}
        </div>
      </Panel>

      <Panel
        title={
          <span className="flex items-center gap-2">
            Demo Factory
            {demoConfigured ? (
              <Badge tone="good" glyph="●">
                connected
              </Badge>
            ) : (
              <Badge tone="warn" glyph="▲">
                not configured
              </Badge>
            )}
          </span>
        }
      >
        <p className="text-xs leading-relaxed text-ink-700">
          Demo Factory builds the alternative site. LeadEngine only hands over business identity,
          the current website and the audit reference.
        </p>

        {demoRef ? (
          <dl className="mt-3 space-y-2 border-t border-paper-200 pt-3 text-xs">
            <Row label="Status">
              <Badge tone={STATUS_TONE[demoRef.status] ?? "neutral"}>
                {demoRef.status.toLowerCase().replace(/_/g, " ")}
              </Badge>
            </Row>
            <Row label="Project">
              {demoRef.externalUrl ? (
                <a
                  href={demoRef.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-signal-600 underline"
                >
                  {demoRef.externalId} →
                </a>
              ) : (
                <span className="text-ink-700">
                  {demoRef.externalId ?? "Not issued — nothing has been sent yet."}
                </span>
              )}
            </Row>
            {demoRef.lastError ? (
              <Row label="Last error">
                <span className="text-bad-700">{demoRef.lastError}</span>
              </Row>
            ) : null}
          </dl>
        ) : null}

        <div className="mt-3">
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => requestDemoProject(prospectId))}
          >
            {demoRef ? "Request another project" : "Create demo project"}
          </Button>
        </div>
      </Panel>

      {result ? <ActionMessage state={result} /> : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <dt className="w-32 shrink-0 text-[11px] uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-ink-900">{children}</dd>
    </div>
  );
}
