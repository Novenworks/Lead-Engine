import Link from "next/link";
import { prisma } from "@leadengine/db";
import { requireWorkspace } from "@/lib/workspace";
import { listProspects, matrixPoints, parseProspectFilters, workspaceCounts } from "@/server/queries";
import { PageHeader } from "@/components/app-shell";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { OpportunityMatrix } from "@/components/opportunity-matrix";
import { ProspectFilters } from "./filters";
import { NewProspectButton } from "./new-prospect";
import { SaveViewForm } from "./save-view";
import { ProspectTable } from "./table";

export const dynamic = "force-dynamic";

function flatten(params: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.length > 0) out[key] = value;
    else if (Array.isArray(value) && value[0]) out[key] = value[0];
  }
  return out;
}

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspaceId } = await requireWorkspace();
  const raw = flatten(await searchParams);
  const view = raw.view === "matrix" ? "matrix" : "list";
  const filters = parseProspectFilters(raw);

  const [result, counts, categories, savedViews] = await Promise.all([
    listProspects(workspaceId, filters),
    workspaceCounts(workspaceId),
    prisma.prospect.findMany({
      where: { workspaceId, archivedAt: null, primaryCategory: { not: null } },
      distinct: ["primaryCategory"],
      select: { primaryCategory: true },
      take: 40,
      orderBy: { primaryCategory: "asc" },
    }),
    prisma.savedSearch.findMany({
      where: { workspaceId, kind: "PROSPECT_VIEW", NOT: { name: { startsWith: "__" } } },
      orderBy: { name: "asc" },
      take: 20,
    }),
  ]);

  const points = view === "matrix" ? await matrixPoints(workspaceId, filters) : [];

  // Preserve the current filters when switching views.
  const queryString = new URLSearchParams(
    Object.entries(raw).filter(([key]) => key !== "view") as [string, string][],
  ).toString();

  return (
    <>
      <PageHeader
        title="Prospects"
        subtitle={`${counts.total} tracked · ${counts.qualified} qualified · ${counts.review} needing review`}
        actions={
          <>
            {counts.openDuplicates > 0 ? (
              <Link
                href="/duplicates"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-warn-500/40 bg-warn-100 px-3 text-xs font-medium text-warn-700"
              >
                <span aria-hidden="true">▲</span>
                {counts.openDuplicates} possible duplicate
                {counts.openDuplicates === 1 ? "" : "s"}
              </Link>
            ) : null}
            <NewProspectButton />
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <nav aria-label="View" className="flex rounded-md border border-paper-300 bg-white p-0.5">
          <ViewTab href={`/prospects?${queryString}`} active={view === "list"} label="List" />
          <ViewTab
            href={`/prospects?${queryString}${queryString ? "&" : ""}view=matrix`}
            active={view === "matrix"}
            label="Matrix"
          />
        </nav>

        {savedViews.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-ink-500">Saved</span>
            {savedViews.map((saved) => (
              <Link
                key={saved.id}
                href={`/prospects?${new URLSearchParams(saved.params as Record<string, string>).toString()}`}
                className="rounded border border-paper-300 bg-white px-2 py-1 text-[11px] text-ink-700 hover:bg-paper-50"
              >
                {saved.name}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="ml-auto">
          <SaveViewForm currentQuery={queryString} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
        {/* Prospects come first in the DOM so a phone shows data before ten
            filter fields, and so assistive tech reaches the list first. On
            desktop the filter rail is moved back to the left column. */}
        <div className="order-1 min-w-0 xl:order-2">
          {counts.total === 0 ? (
            <EmptyState
              title="No prospects yet"
              body="Run a market search in Discover, or add a business by hand. LeadEngine only tracks what you decide to track."
              action={
                <Link
                  href="/discover"
                  className="inline-flex h-9 items-center rounded-md border border-volt-500 bg-volt-400 px-3.5 text-sm font-semibold text-ink-900"
                >
                  Go to Discover
                </Link>
              }
            />
          ) : result.total === 0 ? (
            <EmptyState
              title="No prospects match these filters"
              body="Loosen a filter or clear them all. Nothing has been deleted — the filters just do not match anything right now."
              action={
                <Link
                  href="/prospects"
                  className="inline-flex h-9 items-center rounded-md border border-paper-300 bg-white px-3.5 text-sm"
                >
                  Clear filters
                </Link>
              }
            />
          ) : view === "matrix" ? (
            <Panel
              title={
                <span className="flex items-center gap-2">
                  Opportunity matrix
                  <Badge tone="neutral">{points.length} scored</Badge>
                </span>
              }
            >
              {points.length === 0 ? (
                <EmptyState
                  title="Nothing scored yet"
                  body="The matrix plots score components, so prospects appear once they have been scored. Enrich a website to fill in the opportunity axis."
                />
              ) : (
                <OpportunityMatrix points={points} />
              )}
            </Panel>
          ) : (
            <ProspectTable
              rows={result.rows}
              total={result.total}
              page={result.page}
              pageCount={result.pageCount}
              query={queryString}
            />
          )}
        </div>

        <Panel title="Filters" className="order-2 h-fit xl:order-1">
          <ProspectFilters
            filters={filters}
            view={view}
            categories={categories
              .map((c) => c.primaryCategory)
              .filter((c): c is string => Boolean(c))}
          />
        </Panel>
      </div>
    </>
  );
}

function ViewTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded px-3 py-1 text-xs font-medium ${
        active ? "bg-shell-900 text-white" : "text-ink-700 hover:bg-paper-100"
      }`}
    >
      {label}
    </Link>
  );
}
