import Link from "next/link";
import { prisma } from "@leadengine/db";
import { requireWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/app-shell";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

/** Meaningful operator and system actions. Not a click log. */
export default async function ActivityPage() {
  const { workspaceId } = await requireWorkspace();

  const [events, usage] = await Promise.all([
    prisma.activityEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 120,
      include: { prospect: { select: { id: true, name: true } } },
    }),
    prisma.providerUsage.groupBy({
      by: ["provider", "operation", "success"],
      where: { workspaceId },
      _sum: { requestCount: true, resultCount: true, reportedCostUsd: true },
      _count: { _all: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Activity"
        subtitle="What happened, and what it cost. Provider usage is tracked so API spend is explainable."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {events.length === 0 ? (
            <EmptyState
              title="No activity yet"
              body="Activity appears as you discover, qualify and hand off prospects."
            />
          ) : (
            <Panel bodyClassName="p-0">
              <ol className="divide-y divide-paper-200">
                {events.map((event) => (
                  <li key={event.id} className="flex flex-wrap gap-x-3 gap-y-1 px-4 py-2.5 text-xs">
                    <time
                      dateTime={event.createdAt.toISOString()}
                      className="tabular w-36 shrink-0 text-ink-500"
                    >
                      {event.createdAt.toLocaleString()}
                    </time>
                    <span className="min-w-0 flex-1">
                      <span className="block text-ink-900">{event.summary}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{event.type.toLowerCase().replace(/_/g, " ")}</Badge>
                        {event.prospect ? (
                          <Link
                            href={`/prospects/${event.prospect.id}`}
                            className="text-signal-600 underline"
                          >
                            {event.prospect.name}
                          </Link>
                        ) : null}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </div>

        <Panel title="Provider usage" className="h-fit">
          {usage.length === 0 ? (
            <p className="text-xs text-ink-500">No provider calls recorded yet.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <caption className="sr-only">API calls by provider and operation</caption>
              <thead>
                <tr className="border-b border-paper-200 text-[11px] uppercase tracking-wide text-ink-500">
                  <th scope="col" className="py-1.5 pr-2 font-medium">
                    Provider
                  </th>
                  <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                    Calls
                  </th>
                  <th scope="col" className="py-1.5 text-right font-medium">
                    Results
                  </th>
                </tr>
              </thead>
              <tbody>
                {usage.map((row) => (
                  <tr
                    key={`${row.provider}-${row.operation}-${row.success}`}
                    className="border-b border-paper-200"
                  >
                    <th scope="row" className="py-1.5 pr-2 font-normal">
                      {row.provider}
                      <span className="block text-[11px] text-ink-500">
                        {row.operation}
                        {row.success ? "" : " · failed"}
                      </span>
                    </th>
                    <td className="tabular py-1.5 pr-2 text-right">{row._sum.requestCount ?? 0}</td>
                    <td className="tabular py-1.5 text-right">{row._sum.resultCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
            Cost is shown only when a provider reports it. LeadEngine never estimates spend.
          </p>
        </Panel>
      </div>
    </>
  );
}
