"use client";

import { useState, useTransition } from "react";
import { PIPELINE_STAGES, DISQUALIFICATION_REASONS } from "@leadengine/core/vocab";
import { ActionForm, ActionMessage, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import {
  captureScreenshot,
  clearQualificationOverride,
  enrichProspect,
  markForOutreach,
  requestAudit,
  requestDemoProject,
  rescore,
  setQualification,
  setStage,
  type ActionState,
} from "@/server/actions";

/**
 * The decision rail.
 *
 * Exactly one filled primary action is offered at a time, chosen from the
 * prospect's current state. The rest stay as secondary controls so the
 * operator is never asked "what now?" — and never presented with five equally
 * loud options.
 */
export function ProspectActions(props: {
  prospectId: string;
  name: string;
  qualification: string;
  pipelineStage: string;
  overridden: boolean;
  hasWebsite: boolean;
  enrichmentStatus: string | null;
  score: number | null;
  businessStrength: number | null;
  websiteOpportunity: number | null;
  businessFit: number | null;
  reachability: number | null;
  suggested: string | null;
  auditConfigured: boolean;
  demoConfigured: boolean;
  hasAudit: boolean;
  hasDemo: boolean;
  nextAction: string | null;
  screenshotConfigured: boolean;
}) {
  const [result, setResult] = useState<ActionState | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<ActionState>) => {
    startTransition(async () => {
      setResult(await fn());
    });
  };

  const notEnriched =
    props.hasWebsite &&
    (props.enrichmentStatus === "NOT_ATTEMPTED" || props.enrichmentStatus === null);

  /** The single next thing worth doing, given where this prospect stands. */
  const primary: { label: string; onClick: () => void; hint: string } = notEnriched
    ? {
        label: "Inspect website",
        hint: "Shallow signals are missing, so the score is incomplete.",
        onClick: () => run(() => enrichProspect(props.prospectId)),
      }
    : props.qualification !== "QUALIFIED"
      ? {
          label: "Qualify this prospect",
          hint: "Decide whether this is worth Novenworks' time.",
          onClick: () => {
            document.getElementById("qualification-form")?.scrollIntoView({ block: "center" });
            (document.getElementById("qualification") as HTMLSelectElement | null)?.focus();
          },
        }
      : !props.hasAudit
        ? {
            label: "Run audit",
            hint: "Hand this prospect to AuditWorkspace for the deep investigation.",
            onClick: () => run(() => requestAudit(props.prospectId)),
          }
        : !props.hasDemo
          ? {
              label: "Create demo project",
              hint: "Send the audited prospect to Demo Factory.",
              onClick: () => run(() => requestDemoProject(props.prospectId)),
            }
          : {
              label: "Set next action",
              hint: "Mark this prospect ready for outreach.",
              onClick: () => {
                document.getElementById("outreach-form")?.scrollIntoView({ block: "center" });
                (document.getElementById("nextAction") as HTMLInputElement | null)?.focus();
              },
            };

  return (
    <div className="space-y-4">
      <Panel title="Opportunity">
        <p className="tabular text-4xl font-semibold leading-none text-ink-900">
          {props.score ?? "—"}
          <span className="text-lg font-normal text-ink-500">/100</span>
        </p>

        <dl className="mt-3 space-y-1.5 text-xs">
          <Dim label="Business fit" value={props.businessFit} max={25} />
          <Dim label="Business strength" value={props.businessStrength} max={20} />
          <Dim label="Website opportunity" value={props.websiteOpportunity} max={40} />
          <Dim label="Reachability" value={props.reachability} max={15} />
        </dl>

        {props.suggested && props.suggested !== props.qualification ? (
          <p className="mt-3 rounded border border-signal-400/40 bg-signal-100 px-2 py-1.5 text-[11px] text-signal-800">
            The engine suggests <strong>{props.suggested.toLowerCase()}</strong>; the operator set{" "}
            <strong>{props.qualification.toLowerCase()}</strong>.
          </p>
        ) : null}

        <div className="mt-3 space-y-2">
          <Button
            variant="primary"
            className="w-full"
            onClick={primary.onClick}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Working…" : primary.label}
          </Button>
          <p className="text-[11px] leading-relaxed text-ink-500">{primary.hint}</p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-paper-200 pt-3">
          <Button size="sm" onClick={() => run(() => rescore(props.prospectId))} disabled={pending}>
            Rescore
          </Button>
          {props.hasWebsite ? (
            <Button
              size="sm"
              onClick={() => run(() => enrichProspect(props.prospectId))}
              disabled={pending}
            >
              Re-inspect site
            </Button>
          ) : null}
          {props.hasWebsite && props.screenshotConfigured ? (
            <Button
              size="sm"
              onClick={() => run(() => captureScreenshot(props.prospectId))}
              disabled={pending}
            >
              Capture screenshot
            </Button>
          ) : null}
          {props.overridden ? (
            <Button
              size="sm"
              onClick={() => run(() => clearQualificationOverride(props.prospectId))}
              disabled={pending}
            >
              Clear override
            </Button>
          ) : null}
        </div>

        {result ? <ActionMessage state={result} /> : null}
      </Panel>

      <Panel title="Qualification">
        <ActionForm id="qualification-form" action={setQualification} className="space-y-3">
          <input type="hidden" name="prospectId" value={props.prospectId} />

          <Field label="Outcome" htmlFor="qualification">
            <Select id="qualification" name="qualification" defaultValue={props.qualification}>
              <option value="QUALIFIED">Qualified — worth our time</option>
              <option value="REVIEW">Needs review</option>
              <option value="DISQUALIFIED">Disqualified</option>
            </Select>
          </Field>

          <Field
            label="Reason (required when disqualifying)"
            htmlFor="reason"
            hint="Structured reasons make the rejected pile reviewable later."
          >
            <Select id="reason" name="reason" defaultValue="">
              <option value="">—</option>
              {DISQUALIFICATION_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason.toLowerCase().replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Note" htmlFor="note">
            <Textarea id="note" name="note" maxLength={600} rows={2} />
          </Field>

          <SubmitButton className="w-full" pendingLabel="Saving…">
            Save qualification
          </SubmitButton>
        </ActionForm>
      </Panel>

      <Panel title="Pipeline">
        <ActionForm action={setStage} className="space-y-3">
          <input type="hidden" name="prospectId" value={props.prospectId} />
          <Field label="Stage" htmlFor="stage">
            <Select id="stage" name="stage" defaultValue={props.pipelineStage}>
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage.toLowerCase().replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Why" htmlFor="stage-reason">
            <Input id="stage-reason" name="reason" maxLength={400} />
          </Field>
          <SubmitButton className="w-full" size="sm" pendingLabel="Moving…">
            Move stage
          </SubmitButton>
        </ActionForm>
      </Panel>

      <Panel
        title={
          <span className="flex items-center gap-2">
            Outreach
            {props.nextAction ? <Badge tone="signal">next action set</Badge> : null}
          </span>
        }
      >
        <p className="mb-2 text-[11px] leading-relaxed text-ink-500">
          LeadEngine records intent only. Sequences and sending belong to the outreach system.
        </p>
        <ActionForm id="outreach-form" action={markForOutreach} className="space-y-3">
          <input type="hidden" name="prospectId" value={props.prospectId} />
          <Field label="Next action" htmlFor="nextAction">
            <Input
              id="nextAction"
              name="nextAction"
              maxLength={200}
              defaultValue={props.nextAction ?? ""}
              placeholder="Call the owner about the missing quote form"
            />
          </Field>
          <Field label="When" htmlFor="nextActionDate">
            <Input id="nextActionDate" name="nextActionDate" type="date" />
          </Field>
          <SubmitButton className="w-full" size="sm" pendingLabel="Saving…">
            Mark ready for outreach
          </SubmitButton>
        </ActionForm>
      </Panel>
    </div>
  );
}

function Dim({ label, value, max }: { label: string; value: number | null; max: number }) {
  const pct = value === null ? 0 : Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <dt className="text-ink-700">{label}</dt>
        <dd className="tabular text-ink-900">
          {value ?? "—"}/{max}
        </dd>
      </div>
      <div className="mt-0.5 h-1.5 rounded-full bg-paper-200">
        <div className="h-1.5 rounded-full bg-volt-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
