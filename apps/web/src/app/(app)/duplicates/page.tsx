import Link from "next/link";
import { prisma } from "@leadengine/db";
import { requireWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/app-shell";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { DuplicateDecision } from "./decision";

export const dynamic = "force-dynamic";

/**
 * Possible duplicates.
 *
 * Only weak-evidence pairs reach this screen. Strong identifier matches are
 * collapsed at write time and never need a human.
 */
export default async function DuplicatesPage() {
  const { workspaceId } = await requireWorkspace();

  const candidates = await prisma.duplicateCandidate.findMany({
    where: { workspaceId, status: "OPEN" },
    orderBy: { confidence: "desc" },
    take: 50,
    include: {
      prospectA: {
        select: { id: true, name: true, city: true, region: true, primaryCategory: true, reviewCount: true, opportunityScore: true, createdAt: true },
      },
      prospectB: {
        select: { id: true, name: true, city: true, region: true, primaryCategory: true, reviewCount: true, opportunityScore: true, createdAt: true },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Possible duplicates"
        subtitle="Weak-evidence matches only. Nothing here has been merged — you decide."
      />

      {candidates.length === 0 ? (
        <EmptyState
          title="No open duplicate suggestions"
          body="Businesses that share a place id, domain, phone number or street address are merged automatically at write time. Only ambiguous name matches appear here."
        />
      ) : (
        <div className="space-y-3">
          {candidates.map((candidate) => (
            <Panel
              key={candidate.id}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  Possible duplicate
                  <Badge tone={candidate.confidence >= 0.8 ? "warn" : "neutral"}>
                    {Math.round(candidate.confidence * 100)}% confidence
                  </Badge>
                  {candidate.reasons.map((reason) => (
                    <Badge key={reason} tone="signal">
                      {reason.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </span>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {[candidate.prospectA, candidate.prospectB].map((prospect) => (
                  <div key={prospect.id} className="rounded border border-paper-200 p-3">
                    <Link
                      href={`/prospects/${prospect.id}`}
                      className="text-sm font-medium text-ink-900 underline decoration-paper-300 underline-offset-2"
                    >
                      {prospect.name}
                    </Link>
                    <dl className="mt-2 space-y-1 text-xs text-ink-700">
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-500">Category</dt>
                        <dd>{prospect.primaryCategory ?? "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-500">Location</dt>
                        <dd>{[prospect.city, prospect.region].filter(Boolean).join(", ") || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-500">Reviews</dt>
                        <dd className="tabular">{prospect.reviewCount ?? "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-500">Score</dt>
                        <dd className="tabular">{prospect.opportunityScore ?? "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-500">Added</dt>
                        <dd>{prospect.createdAt.toLocaleDateString()}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>

              <DuplicateDecision
                candidateId={candidate.id}
                optionA={{ id: candidate.prospectA.id, name: candidate.prospectA.name }}
                optionB={{ id: candidate.prospectB.id, name: candidate.prospectB.name }}
              />
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
