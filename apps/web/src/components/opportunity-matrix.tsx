"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "./ui/badge";

/**
 * The Opportunity Matrix.
 *
 * Business Strength on X, Website Opportunity on Y, both straight from the
 * score components — no decorative data. The top-right quadrant is the region
 * Novenworks actually wants: an established business whose website is visibly
 * behind.
 *
 * Accessibility: the plot is one focusable point per prospect with a full
 * aria-label, the quadrant is announced in text, and the same data is rendered
 * as a real table that replaces the plot below 640px.
 */

export interface MatrixPoint {
  id: string;
  name: string;
  primaryCategory: string | null;
  city: string | null;
  opportunityScore: number | null;
  businessStrengthScore: number | null;
  websiteOpportunityScore: number | null;
  reviewCount: number | null;
  rating: number | null;
  pipelineStage: string;
  qualification: string;
  agencyManaged: boolean;
}

const MAX_STRENGTH = 20;
const MAX_OPPORTUNITY = 40;
/** Top-right quadrant boundaries, in raw dimension points. */
const STRONG_BUSINESS = 12;
const HIGH_OPPORTUNITY = 20;

const PLOT = { width: 720, height: 440, padLeft: 54, padRight: 18, padTop: 18, padBottom: 46 };
/**
 * Points are plotted inside this inset rather than on the plot edges, so a
 * prospect at 0 or at the maximum is drawn whole instead of half-clipped by
 * the frame. The grid and the quadrant still use the full plot area.
 */
const INSET = 14;

/** Qualification decides the glyph, so status never depends on colour alone. */
function glyphFor(point: MatrixPoint): { glyph: string; label: string } {
  if (point.agencyManaged) return { glyph: "✕", label: "agency-managed" };
  if (point.qualification === "QUALIFIED") return { glyph: "●", label: "qualified" };
  if (point.qualification === "DISQUALIFIED") return { glyph: "○", label: "disqualified" };
  return { glyph: "◆", label: "needs review" };
}

function colorFor(point: MatrixPoint): string {
  if (point.agencyManaged) return "#b45248";
  if (point.qualification === "QUALIFIED") return "#23955a";
  if (point.qualification === "DISQUALIFIED") return "#8c8c8c";
  return "#14788a";
}

function quadrantOf(point: MatrixPoint): string {
  const strength = point.businessStrengthScore ?? 0;
  const opportunity = point.websiteOpportunityScore ?? 0;
  if (strength >= STRONG_BUSINESS && opportunity >= HIGH_OPPORTUNITY) return "Prime target";
  if (strength >= STRONG_BUSINESS) return "Strong business, capable site";
  if (opportunity >= HIGH_OPPORTUNITY) return "Weak site, unproven business";
  return "Low priority";
}

export function OpportunityMatrix({ points }: { points: MatrixPoint[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = points.find((p) => p.id === selectedId) ?? null;

  const plotted = useMemo(() => {
    const innerWidth = PLOT.width - PLOT.padLeft - PLOT.padRight - INSET * 2;
    const innerHeight = PLOT.height - PLOT.padTop - PLOT.padBottom - INSET * 2;
    // Jitter identical coordinates apart deterministically so stacked points
    // stay individually clickable without moving between renders.
    const seen = new Map<string, number>();
    return points.map((point) => {
      const strength = point.businessStrengthScore ?? 0;
      const opportunity = point.websiteOpportunityScore ?? 0;
      const key = `${strength}:${opportunity}`;
      const index = seen.get(key) ?? 0;
      seen.set(key, index + 1);
      const angle = index * 2.4;
      const spread = index === 0 ? 0 : 4 + index * 1.5;

      return {
        point,
        x: PLOT.padLeft + INSET + (strength / MAX_STRENGTH) * innerWidth + Math.cos(angle) * spread,
        y:
          PLOT.padTop +
          INSET +
          innerHeight -
          (opportunity / MAX_OPPORTUNITY) * innerHeight +
          Math.sin(angle) * spread,
        r: 5 + Math.round(((point.opportunityScore ?? 0) / 100) * 4),
      };
    });
  }, [points]);

  const primeCount = points.filter((p) => quadrantOf(p) === "Prime target").length;

  if (points.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-paper-300 bg-paper-50 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-ink-900">Nothing plotted yet</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-ink-700">
          The matrix plots scored prospects. Add prospects and run website enrichment, and they will
          appear here.
        </p>
      </div>
    );
  }

  const targetX =
    PLOT.padLeft + (STRONG_BUSINESS / MAX_STRENGTH) * (PLOT.width - PLOT.padLeft - PLOT.padRight);
  const targetY = PLOT.padTop;
  const targetH =
    (PLOT.height - PLOT.padTop - PLOT.padBottom) * (1 - HIGH_OPPORTUNITY / MAX_OPPORTUNITY);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        {/* Plot: hidden below 640px, where the table below takes over. */}
        <div className="hidden sm:block">
          <svg
            viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
            className="h-auto w-full"
            role="group"
            aria-label={`Opportunity matrix: ${points.length} scored prospects, ${primeCount} in the prime target region`}
          >
            <rect
              x={PLOT.padLeft}
              y={PLOT.padTop}
              width={PLOT.width - PLOT.padLeft - PLOT.padRight}
              height={PLOT.height - PLOT.padTop - PLOT.padBottom}
              fill="#fbfaf7"
              stroke="#e9e6de"
            />

            {/* Prime target region — a quiet tint plus a label, not a spotlight. */}
            <rect
              x={targetX}
              y={targetY}
              width={PLOT.width - PLOT.padRight - targetX}
              height={targetH}
              fill="#b6e02f"
              fillOpacity="0.13"
              stroke="#93b81f"
              strokeDasharray="4 3"
            />
            <text
              x={PLOT.width - PLOT.padRight - 8}
              y={PLOT.padTop + 16}
              textAnchor="end"
              className="fill-volt-700"
              fontSize="11"
              fontWeight="600"
            >
              Prime targets
            </text>

            {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
              const innerW = PLOT.width - PLOT.padLeft - PLOT.padRight;
              const innerH = PLOT.height - PLOT.padTop - PLOT.padBottom;
              return (
                <g key={tick}>
                  <line
                    x1={PLOT.padLeft + tick * innerW}
                    y1={PLOT.padTop}
                    x2={PLOT.padLeft + tick * innerW}
                    y2={PLOT.padTop + innerH}
                    stroke="#e9e6de"
                  />
                  <line
                    x1={PLOT.padLeft}
                    y1={PLOT.padTop + tick * innerH}
                    x2={PLOT.padLeft + innerW}
                    y2={PLOT.padTop + tick * innerH}
                    stroke="#e9e6de"
                  />
                </g>
              );
            })}

            <text
              x={PLOT.padLeft + (PLOT.width - PLOT.padLeft - PLOT.padRight) / 2}
              y={PLOT.height - 12}
              textAnchor="middle"
              fontSize="11"
              className="fill-ink-700"
              fontWeight="600"
            >
              Business strength →
            </text>
            <text
              x={-(PLOT.padTop + (PLOT.height - PLOT.padTop - PLOT.padBottom) / 2)}
              y={16}
              transform="rotate(-90)"
              textAnchor="middle"
              fontSize="11"
              className="fill-ink-700"
              fontWeight="600"
            >
              Website opportunity →
            </text>
            <text x={PLOT.padLeft} y={PLOT.height - 28} fontSize="10" className="fill-ink-500">
              weak
            </text>
            <text
              x={PLOT.width - PLOT.padRight}
              y={PLOT.height - 28}
              textAnchor="end"
              fontSize="10"
              className="fill-ink-500"
            >
              established
            </text>

            {plotted.map(({ point, x, y, r }) => {
              const isSelected = point.id === selectedId;
              const { glyph, label } = glyphFor(point);
              return (
                <g key={point.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? r + 4 : r}
                    fill={colorFor(point)}
                    fillOpacity={isSelected ? 0.95 : 0.75}
                    stroke={isSelected ? "#171a1d" : "#ffffff"}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  <text
                    x={x}
                    y={y + 3}
                    textAnchor="middle"
                    fontSize="8"
                    fill="#ffffff"
                    aria-hidden="true"
                    pointerEvents="none"
                  >
                    {glyph}
                  </text>
                  {/* The interactive target sits on top and carries the label. */}
                  <circle
                    cx={x}
                    cy={y}
                    r={Math.max(r + 6, 11)}
                    fill="transparent"
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    aria-label={`${point.name}. ${label}. Opportunity score ${point.opportunityScore ?? "not scored"}. Business strength ${point.businessStrengthScore ?? 0} of ${MAX_STRENGTH}. Website opportunity ${point.websiteOpportunityScore ?? 0} of ${MAX_OPPORTUNITY}. ${quadrantOf(point)}.`}
                    className="cursor-pointer outline-offset-2"
                    onClick={() => setSelectedId(point.id === selectedId ? null : point.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(point.id === selectedId ? null : point.id);
                      }
                    }}
                  />
                </g>
              );
            })}
          </svg>

          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-700">
            <li>
              <span aria-hidden="true" className="font-mono">
                ●
              </span>{" "}
              qualified
            </li>
            <li>
              <span aria-hidden="true" className="font-mono">
                ◆
              </span>{" "}
              needs review
            </li>
            <li>
              <span aria-hidden="true" className="font-mono">
                ○
              </span>{" "}
              disqualified
            </li>
            <li>
              <span aria-hidden="true" className="font-mono">
                ✕
              </span>{" "}
              agency-managed
            </li>
            <li>Larger dot = higher total score</li>
          </ul>
        </div>

        {/* The same data as a table. Always in the DOM for assistive tech; the
            only presentation below 640px, where a scatter plot is unusable. */}
        <div className="sm:sr-only">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">
              Opportunity matrix data: business strength and website opportunity per prospect
            </caption>
            <thead>
              <tr className="border-b border-paper-300 text-[11px] uppercase tracking-wide text-ink-500">
                <th scope="col" className="py-1.5 pr-2 font-medium">
                  Business
                </th>
                <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                  Strength
                </th>
                <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                  Opportunity
                </th>
                <th scope="col" className="py-1.5 font-medium">
                  Region
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.id} className="border-b border-paper-200">
                  <th scope="row" className="py-1.5 pr-2 font-normal">
                    <Link href={`/prospects/${point.id}`} className="text-signal-600 underline">
                      {point.name}
                    </Link>
                  </th>
                  <td className="tabular py-1.5 pr-2 text-right">
                    {point.businessStrengthScore ?? 0}/{MAX_STRENGTH}
                  </td>
                  <td className="tabular py-1.5 pr-2 text-right">
                    {point.websiteOpportunityScore ?? 0}/{MAX_OPPORTUNITY}
                  </td>
                  <td className="py-1.5">{quadrantOf(point)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signal rail preview for the selected point. */}
      <aside
        aria-label="Selected prospect"
        className="hidden rounded-panel border border-paper-300 bg-white p-4 sm:block"
      >
        {selected ? (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink-500">Selected</p>
            <h3 className="mt-0.5 text-sm font-semibold text-ink-900">{selected.name}</h3>
            <p className="mt-0.5 text-xs text-ink-500">
              {[selected.primaryCategory, selected.city].filter(Boolean).join(" · ") || "—"}
            </p>

            <p className="tabular mt-3 text-3xl font-semibold text-ink-900">
              {selected.opportunityScore ?? "—"}
              <span className="text-base font-normal text-ink-500">/100</span>
            </p>

            <dl className="mt-3 space-y-1.5 text-xs">
              <MiniBar
                label="Business strength"
                value={selected.businessStrengthScore ?? 0}
                max={MAX_STRENGTH}
              />
              <MiniBar
                label="Website opportunity"
                value={selected.websiteOpportunityScore ?? 0}
                max={MAX_OPPORTUNITY}
              />
            </dl>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge
                tone={
                  selected.qualification === "QUALIFIED"
                    ? "good"
                    : selected.qualification === "DISQUALIFIED"
                      ? "bad"
                      : "warn"
                }
                glyph={glyphFor(selected).glyph}
              >
                {selected.qualification.toLowerCase()}
              </Badge>
              <Badge tone="neutral">
                {selected.pipelineStage.toLowerCase().replace(/_/g, " ")}
              </Badge>
              {selected.reviewCount !== null ? (
                <Badge tone="signal">
                  {selected.rating?.toFixed(1) ?? "—"}★ · {selected.reviewCount}
                </Badge>
              ) : null}
            </div>

            <p className="mt-3 rounded border border-paper-200 bg-paper-50 px-2 py-1.5 text-[11px] text-ink-700">
              {quadrantOf(selected)}
            </p>

            <Link
              href={`/prospects/${selected.id}`}
              className={cn(
                "mt-3 inline-flex h-8 w-full items-center justify-center rounded-md",
                "border border-paper-300 bg-white text-xs font-medium text-ink-900 hover:bg-paper-50",
              )}
            >
              Open prospect →
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink-500">Signal rail</p>
            <p className="mt-2 text-xs text-ink-700">
              Select a point to see its score breakdown. {primeCount} of {points.length} scored
              prospects sit in the prime target region.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <dt className="text-ink-700">{label}</dt>
        <dd className="tabular text-ink-900">
          {value}/{max}
        </dd>
      </div>
      <div className="mt-0.5 h-1.5 rounded-full bg-paper-200">
        <div
          className="h-1.5 rounded-full bg-volt-400"
          style={{ width: `${pct}%` }}
          role="presentation"
        />
      </div>
    </div>
  );
}
