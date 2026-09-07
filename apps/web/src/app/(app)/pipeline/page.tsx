import Link from "next/link";
import { PIPELINE_STAGES } from "@leadengine/core";
import { prisma } from "@leadengine/db";
import { requireWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/panel";

export const dynamic = "force-dynamic";

/**
 * Pipeline: a restrained view of where every prospect stands.
 *
 * Deliberately not a drag-and-drop Kanban. Stage changes happen on the
 * prospect, where the reason gets recorded alongside them.
 */
export default async function PipelinePage() {
  const { workspaceId } = await requireWorkspace();

  const [grouped, recent] = await Promise.all([
    prisma.prospect.groupBy({
      by: ["pipelineStage"],
      where: { workspaceId },
      _count: { _all: true },
      _avg: { opportunityScore: true },
    }),
    prisma.prospect.findMany({
      where: { workspaceId, archivedAt: null },
      orderBy: [{ opportunityScore: { sort: "desc", nulls: "last" } }],
      take: 200,
      select: {
        id: true,
        name: true,
        pipelineStage: true,
        opportunityScore: true,
        primaryCategory: true,
        city: true,
        qualification: true,
        nextAction: true,
      },
    }),
  ]);

  const counts = new Map(grouped.map((g) => [g.pipelineStage, g._count._all]));
  const averages = new Map(grouped.map((g) => [g.pipelineStage, g._avg.opportunityScore]));
  const total = recent.length;

  if (total === 0) {
    return (
      <>
        <PageHeader title="Pipeline" />
        <EmptyState
          title="Nothing in the pipeline yet"
          body="Prospects enter the pipeline when you add them from Discover or by hand."
          action={
            <Link
              href="/discover"
              className="inline-flex h-9 items-center rounded-md border border-volt-500 bg-volt-400 px-3.5 text-sm font-semibold text-ink-900"
            >
              Go to Discover
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle="Where each prospect stands. Stage changes are made on the prospect so the reason is recorded."
      />

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3">
          {PIPELINE_STAGES.map((stage) => {
            const items = recent.filter((p) => p.pipelineStage === stage);
            const count = counts.get(stage) ?? 0;
            const average = averages.get(stage);
            return (
              <section
                key={stage}
                aria-label={stage.toLowerCase().replace(/_/g, " ")}
                className="flex w-64 shrink-0 flex-col rounded-panel border border-paper-300 bg-white"
              >
                <header className="border-b border-paper-200 px-3 py-2">
                  <h2 className="text-xs font-semibold text-ink-900">
                    {stage.toLowerCase().replace(/_/g, " ")}
                  </h2>
                  <p className="tabular mt-0.5 text-[11px] text-ink-500">
                    {count} prospect{count === 1 ? "" : "s"}
                    {average !== null && average !== undefined
                      ? ` · avg ${Math.round(average)}/100`
                      : ""}
                  </p>
                </header>
                <ul className="flex-1 space-y-1.5 p-2">
                  {items.length === 0 ? (
                    <li className="px-1 py-2 text-[11px] text-ink-500">Empty</li>
                  ) : (
                    items.slice(0, 25).map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/prospects/${item.id}`}
                          className="block rounded border border-paper-200 px-2 py-1.5 text-xs hover:bg-paper-50"
                        >
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-medium text-ink-900">{item.name}</span>
                            <span className="tabular shrink-0 text-ink-700">
                              {item.opportunityScore ?? "—"}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-ink-500">
                            {[item.primaryCategory, item.city].filter(Boolean).join(" · ") || "—"}
                          </span>
                          {item.nextAction ? (
                            <Badge tone="signal" className="mt-1">
                              {item.nextAction.slice(0, 30)}
                            </Badge>
                          ) : null}
                        </Link>
                      </li>
                    ))
                  )}
                  {items.length > 25 ? (
                    <li className="px-1 text-[11px] text-ink-500">
                      + {items.length - 25} more —{" "}
                      <Link
                        href={`/prospects?stage=${stage}`}
                        className="text-signal-600 underline"
                      >
                        see all
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
