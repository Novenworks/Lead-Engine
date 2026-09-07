"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { decideDiscoveryResults } from "@/server/actions";

/**
 * The discovery review queue.
 *
 * The operator's job on this screen is triage, so every row shows the four
 * things that decide it — reputation, website, location, and whether we
 * already track it — without a click.
 */

export interface ResultRow {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  region: string | null;
  phone: string | null;
  websiteUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  businessStatus: string | null;
  decision: string;
  prospectId: string | null;
}

export function DiscoveryResults({
  results,
  runLabel,
  isFixture,
}: {
  results: ResultRow[];
  runLabel: string;
  isFixture: boolean;
}) {
  const pending = results.filter((r) => r.decision === "PENDING");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = pending.length > 0 && selected.size === pending.length;

  return (
    <Panel
      title={
        <span className="flex flex-wrap items-center gap-2">
          {runLabel}
          <Badge tone="neutral">{results.length} results</Badge>
          {isFixture ? (
            <Badge tone="warn" glyph="▲">
              demo data — fictional
            </Badge>
          ) : null}
        </span>
      }
      bodyClassName="p-0"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-paper-200 bg-paper-50 px-4 py-2">
        <label className="flex items-center gap-1.5 text-xs text-ink-700">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() =>
              setSelected(allSelected ? new Set() : new Set(pending.map((r) => r.id)))
            }
            disabled={pending.length === 0}
            className="size-3.5 accent-volt-500"
          />
          Select all pending ({pending.length})
        </label>

        <span aria-live="polite" className="text-xs text-ink-500">
          {selected.size} selected
        </span>

        <div className="ml-auto flex gap-2">
          <ActionForm action={decideDiscoveryResults} className="contents">
            {[...selected].map((id) => (
              <input key={id} type="hidden" name="resultIds" value={id} />
            ))}
            <input type="hidden" name="decision" value="ADDED" />
            <SubmitButton
              variant="primary"
              size="sm"
              disabled={selected.size === 0}
              pendingLabel="Adding…"
            >
              Add {selected.size > 0 ? selected.size : ""} to prospects
            </SubmitButton>
          </ActionForm>

          <ActionForm action={decideDiscoveryResults} className="contents">
            {[...selected].map((id) => (
              <input key={id} type="hidden" name="resultIds" value={id} />
            ))}
            <input type="hidden" name="decision" value="REJECTED" />
            <SubmitButton size="sm" disabled={selected.size === 0} pendingLabel="Rejecting…">
              Reject
            </SubmitButton>
          </ActionForm>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-xs">
          <caption className="sr-only">Discovery results awaiting a decision</caption>
          <thead>
            <tr className="border-b border-paper-200 text-[11px] uppercase tracking-wide text-ink-500">
              <th scope="col" className="w-8 px-4 py-2">
                <span className="sr-only">Select</span>
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Business
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Location
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Reputation
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Website
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => {
              const isPending = result.decision === "PENDING";
              return (
                <tr
                  key={result.id}
                  className={`border-b border-paper-200 align-top ${
                    isPending ? "" : "bg-paper-50 text-ink-500"
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(result.id)}
                      onChange={() => toggle(result.id)}
                      disabled={!isPending}
                      aria-label={`Select ${result.name}`}
                      className="size-3.5 accent-volt-500"
                    />
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="block font-medium text-ink-900">{result.name}</span>
                    <span className="text-ink-500">{result.category ?? "—"}</span>
                    {result.phone ? (
                      <span className="tabular mt-0.5 block text-ink-500">{result.phone}</span>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-3 text-ink-700">
                    {[result.city, result.region].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="tabular py-2.5 pr-3 text-right text-ink-700">
                    {result.rating !== null ? (
                      <>
                        <span className="font-medium text-ink-900">
                          {result.rating.toFixed(1)}★
                        </span>
                        <span className="block text-ink-500">
                          {result.reviewCount ?? 0} reviews
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    {result.websiteUrl ? (
                      <a
                        href={result.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="break-all text-signal-600 underline"
                      >
                        {result.websiteUrl.replace(/^https?:\/\/(www\.)?/, "").slice(0, 34)}
                      </a>
                    ) : (
                      <Badge tone="volt" glyph="◆">
                        no website
                      </Badge>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    {result.businessStatus && result.businessStatus !== "OPERATIONAL" ? (
                      <Badge tone="bad" glyph="✕">
                        {result.businessStatus.toLowerCase().replace(/_/g, " ")}
                      </Badge>
                    ) : result.decision === "ALREADY_TRACKED" && result.prospectId ? (
                      <Link
                        href={`/prospects/${result.prospectId}`}
                        className="text-signal-600 underline"
                      >
                        already tracked →
                      </Link>
                    ) : result.decision === "ADDED" && result.prospectId ? (
                      <Link
                        href={`/prospects/${result.prospectId}`}
                        className="text-signal-600 underline"
                      >
                        added →
                      </Link>
                    ) : result.decision === "REJECTED" ? (
                      <Badge tone="neutral" glyph="○">
                        rejected
                      </Badge>
                    ) : (
                      <Badge tone="neutral">pending</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
