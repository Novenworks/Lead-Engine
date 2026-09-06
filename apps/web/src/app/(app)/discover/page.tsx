import Link from "next/link";
import { prisma } from "@leadengine/db";
import { createDiscoveryProvider } from "@leadengine/providers";
import { requireWorkspace } from "@/lib/workspace";
import { providerEnv } from "@/lib/env";
import { PageHeader } from "@/components/app-shell";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { DiscoverySearchForm } from "./search-form";
import { DiscoveryResults } from "./results";

export const dynamic = "force-dynamic";

/**
 * Discover: the core workspace.
 *
 * Search a market, review what came back, decide what to track. Results land
 * in a review queue rather than straight into the prospect table — a provider
 * returning 200 businesses is not 200 prospects.
 */
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspaceId } = await requireWorkspace();
  const params = await searchParams;
  const runId = typeof params.run === "string" ? params.run : undefined;

  const provider = createDiscoveryProvider(providerEnv());

  const [runs, activeRun] = await Promise.all([
    prisma.discoveryRun.findMany({
      where: { workspaceId },
      orderBy: { startedAt: "desc" },
      take: 8,
      select: {
        id: true,
        category: true,
        locationText: true,
        status: true,
        resultCount: true,
        newCount: true,
        startedAt: true,
        provider: true,
        errorCode: true,
        errorMessage: true,
      },
    }),
    runId
      ? prisma.discoveryRun.findFirst({
          where: { id: runId, workspaceId },
          include: {
            results: {
              orderBy: [{ reviewCount: "desc" }, { name: "asc" }],
              take: 100,
            },
          },
        })
      : null,
  ]);

  // Default to the most recent run so the page is never empty after a search.
  const latestId = runs[0]?.id;
  const shown =
    activeRun ??
    (latestId && !runId
      ? await prisma.discoveryRun.findFirst({
          where: { id: latestId, workspaceId },
          include: { results: { orderBy: [{ reviewCount: "desc" }, { name: "asc" }], take: 100 } },
        })
      : null);

  return (
    <>
      <PageHeader
        title="Discover"
        subtitle={`Search a market, then decide what is worth tracking. Provider: ${provider.label}.`}
      />

      <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel title="Market search">
            <DiscoverySearchForm realData={provider.returnsRealData} />
          </Panel>

          <Panel title="Recent runs">
            {runs.length === 0 ? (
              <p className="text-xs text-ink-500">No searches yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {runs.map((run) => (
                  <li key={run.id}>
                    <Link
                      href={`/discover?run=${run.id}`}
                      aria-current={run.id === shown?.id ? "true" : undefined}
                      className={`block rounded border px-2.5 py-2 text-xs transition-colors ${
                        run.id === shown?.id
                          ? "border-signal-400 bg-signal-100"
                          : "border-paper-200 hover:bg-paper-50"
                      }`}
                    >
                      <span className="block font-medium text-ink-900">
                        {run.category} · {run.locationText}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-ink-500">
                        <time dateTime={run.startedAt.toISOString()}>
                          {run.startedAt.toLocaleDateString()}
                        </time>
                        {run.status === "FAILED" ? (
                          <Badge tone="bad" glyph="✕">
                            {run.errorCode ?? "failed"}
                          </Badge>
                        ) : (
                          <Badge tone="neutral">
                            {run.resultCount} results · {run.newCount} new
                          </Badge>
                        )}
                        {run.provider !== "google" ? <Badge tone="warn">demo</Badge> : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="min-w-0">
          {!shown ? (
            <EmptyState
              title="No searches yet"
              body="Run a market search to see local businesses. Nothing is added to your prospect list until you decide."
            />
          ) : shown.status === "FAILED" ? (
            <EmptyState
              tone="bad"
              title={`Search failed — ${shown.errorCode ?? "unknown error"}`}
              body={
                shown.errorMessage ??
                "The provider did not return results. The run is recorded so you can see what happened."
              }
            />
          ) : shown.results.length === 0 ? (
            <EmptyState
              title="No results for that search"
              body={`"${shown.category}" in "${shown.locationText}" returned nothing. Try a broader category, a nearby city, or a larger radius.`}
            />
          ) : (
            <DiscoveryResults
              runLabel={`${shown.category} · ${shown.locationText}`}
              isFixture={shown.provider !== "google"}
              results={shown.results.map((result) => ({
                id: result.id,
                name: result.name,
                category: result.category,
                city: result.city,
                region: result.region,
                phone: result.phone,
                websiteUrl: result.websiteUrl,
                rating: result.rating,
                reviewCount: result.reviewCount,
                businessStatus: result.businessStatus,
                decision: result.decision,
                prospectId: result.prospectId,
              }))}
            />
          )}
        </div>
      </div>
    </>
  );
}
