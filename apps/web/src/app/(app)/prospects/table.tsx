import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import type { ProspectRow } from "@/server/queries";

/**
 * The operator-grade prospect list.
 *
 * Dense but readable: one row per business, the numbers that drive a decision
 * right-aligned and tabular, and a horizontal scroll container so the page
 * itself never scrolls sideways on a phone.
 */

const STAGE_LABEL = (stage: string) => stage.toLowerCase().replace(/_/g, " ");

function QualificationBadge({ value }: { value: string }) {
  if (value === "QUALIFIED")
    return (
      <Badge tone="good" glyph="●">
        qualified
      </Badge>
    );
  if (value === "DISQUALIFIED")
    return (
      <Badge tone="bad" glyph="○">
        disqualified
      </Badge>
    );
  return (
    <Badge tone="warn" glyph="◆">
      review
    </Badge>
  );
}

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-ink-500">not scored</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="tabular font-semibold text-ink-900">{value}</span>
      <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-paper-200">
        <span
          className="block h-1.5 rounded-full bg-volt-400"
          style={{ width: `${Math.max(2, value)}%` }}
        />
      </span>
    </span>
  );
}

export function ProspectTable({
  rows,
  total,
  page,
  pageCount,
  query,
}: {
  rows: ProspectRow[];
  total: number;
  page: number;
  pageCount: number;
  query: string;
}) {
  const pageHref = (target: number) => {
    const params = new URLSearchParams(query);
    params.set("page", String(target));
    return `/prospects?${params.toString()}`;
  };

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          {total} prospect{total === 1 ? "" : "s"}
          <span className="text-xs font-normal text-ink-500">
            page {page} of {pageCount}
          </span>
        </span>
      }
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[54rem] text-left text-xs">
          <caption className="sr-only">Tracked prospects with scores and pipeline stage</caption>
          <thead>
            <tr className="border-b border-paper-200 text-[11px] uppercase tracking-wide text-ink-500">
              <th scope="col" className="py-2 pl-4 pr-3 font-medium">
                Business
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Location
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Score
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Strength
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Opportunity
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Reviews
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Stage
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Next action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-paper-200 align-top hover:bg-paper-50">
                <th scope="row" className="py-2.5 pl-4 pr-3 font-normal">
                  <Link
                    href={`/prospects/${row.id}`}
                    className="font-medium text-ink-900 underline decoration-paper-300 underline-offset-2 hover:decoration-signal-600"
                  >
                    {row.name}
                  </Link>
                  <span className="block text-ink-500">{row.primaryCategory ?? "—"}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1">
                    {row.websiteDomain ? (
                      <span className="text-signal-600">{row.websiteDomain}</span>
                    ) : (
                      <Badge tone="volt" glyph="◆">
                        no website
                      </Badge>
                    )}
                    {row.agencyManaged ? (
                      <Badge tone="bad" glyph="✕">
                        agency
                      </Badge>
                    ) : null}
                  </span>
                </th>
                <td className="py-2.5 pr-3 text-ink-700">
                  {[row.city, row.region].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="py-2.5 pr-3">
                  <ScoreCell value={row.opportunityScore} />
                  <span className="mt-1 block">
                    <QualificationBadge value={row.qualification} />
                  </span>
                </td>
                <td className="tabular py-2.5 pr-3 text-right text-ink-700">
                  {row.businessStrengthScore ?? "—"}
                  <span className="text-ink-500">/20</span>
                </td>
                <td className="tabular py-2.5 pr-3 text-right text-ink-700">
                  {row.websiteOpportunityScore ?? "—"}
                  <span className="text-ink-500">/40</span>
                </td>
                <td className="tabular py-2.5 pr-3 text-right text-ink-700">
                  {row.reviewCount !== null ? (
                    <>
                      {row.reviewCount}
                      <span className="block text-ink-500">{row.rating?.toFixed(1) ?? "—"}★</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2.5 pr-3">
                  <Badge tone="neutral">{STAGE_LABEL(row.pipelineStage)}</Badge>
                </td>
                <td className="py-2.5 pr-4 text-ink-700">
                  {row.nextAction ?? <span className="text-ink-500">—</span>}
                  <span className="mt-0.5 block text-[11px] text-ink-500">
                    <time dateTime={row.lastActivityAt.toISOString()}>
                      {row.lastActivityAt.toLocaleDateString()}
                    </time>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between gap-3 border-t border-paper-200 px-4 py-2.5 text-xs"
        >
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-signal-600 underline">
              ← Previous
            </Link>
          ) : (
            <span className="text-ink-500">← Previous</span>
          )}
          <span className="text-ink-500">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={pageHref(page + 1)} className="text-signal-600 underline">
              Next →
            </Link>
          ) : (
            <span className="text-ink-500">Next →</span>
          )}
        </nav>
      ) : null}
    </Panel>
  );
}
