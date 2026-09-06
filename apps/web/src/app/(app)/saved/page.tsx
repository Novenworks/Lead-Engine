import Link from "next/link";
import { prisma } from "@leadengine/db";
import { requireWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/app-shell";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { DeleteSavedSearch } from "./delete";

export const dynamic = "force-dynamic";

/** Saved discovery parameters and saved prospect filters. Not a BI tool. */
export default async function SavedPage() {
  const { workspaceId } = await requireWorkspace();

  const saved = await prisma.savedSearch.findMany({
    where: { workspaceId, NOT: { name: { startsWith: "__" } } },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Saved searches"
        subtitle="Reusable prospect filters. Save one from the Prospects screen after setting up a view you want back."
      />

      {saved.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          body='Set up filters on Prospects — for example "high-review plumbers with weak websites" — then click "Save this view".'
          action={
            <Link
              href="/prospects"
              className="inline-flex h-9 items-center rounded-md border border-paper-300 bg-white px-3.5 text-sm"
            >
              Go to Prospects
            </Link>
          }
        />
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-paper-200">
            {saved.map((entry) => {
              const query = new URLSearchParams(entry.params as Record<string, string>).toString();
              return (
                <li key={entry.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/prospects?${query}`}
                      className="font-medium text-ink-900 underline decoration-paper-300 underline-offset-2"
                    >
                      {entry.name}
                    </Link>
                    <p className="mt-0.5 break-all font-mono text-[11px] text-ink-500">
                      {query || "no filters"}
                    </p>
                  </div>
                  <Badge tone="neutral">{entry.kind.toLowerCase().replace(/_/g, " ")}</Badge>
                  <DeleteSavedSearch id={entry.id} name={entry.name} />
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </>
  );
}
