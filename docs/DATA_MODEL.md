# Data model

The schema lives in `packages/db/prisma/schema.prisma`, which carries inline
comments on the non-obvious decisions. This document explains the shape.

## Tenancy

Every table that can hold operator data carries `workspaceId`. There is no
global data except `Workspace` itself. Application code scopes every query by
the workspace resolved from the session, and `assertProspectInWorkspace()`
checks any id that arrived from a browser before it is used.

A prospect id from another workspace produces "not found", not "forbidden" —
the two are deliberately indistinguishable so a response cannot be used to
probe for ids elsewhere.

Unique indexes are scoped per workspace, so two workspaces can legitimately
track the same business without colliding. `packages/db/src/__tests__/tenancy.test.ts`
asserts both halves of this.

## Core entities

| Model                                              | Purpose                                                   |
| -------------------------------------------------- | --------------------------------------------------------- |
| `Workspace` / `Membership`                         | The tenant, and who belongs to it (Clerk user ids)        |
| `Prospect`                                         | The canonical business opportunity record                 |
| `ProspectIdentity`                                 | Strong identifiers used for deduplication                 |
| `BusinessLocation` / `BusinessContact` / `Website` | Structured business facts                                 |
| `DiscoveryRun` / `DiscoveryResult`                 | A search and its reviewable results                       |
| `ProspectSource`                                   | Which provider or import contributed, and its raw payload |
| `ProspectSignal`                                   | One observed fact. Evidence, never points                 |
| `ScoreSnapshot` / `ScoreComponent`                 | A score and the rules that produced it                    |
| `PipelineStageHistory` / `ActivityEvent`           | What happened, and when                                   |
| `DuplicateCandidate`                               | A weak-evidence duplicate suggestion for a human          |
| `ExternalReference`                                | An AuditWorkspace or Demo Factory handoff and its status  |
| `Job`                                              | The worker queue                                          |
| `ProviderUsage`                                    | Enough accounting to explain an API bill                  |

## Signals versus scores

This separation is load-bearing.

A **signal** is a fact: "no viewport meta tag", "4.9 stars", "footer credits
Bright Pixel Studio". It has a source, a confidence, an evidence string and a
timestamp. It carries no points.

A **score component** is an interpretation: "Mobile readiness, 8 of 8 points,
because there is no responsive viewport tag". It names the signal types that
justified it.

Because signals are stored separately, re-running the scoring model over
existing data does not need re-enrichment, and changing the model does not
rewrite history — a new `ScoreSnapshot` is created, and the old one remains.

## Deduplication

Two tiers, on purpose.

**Strong identifiers** collapse automatically. `ProspectIdentity` holds
`(workspaceId, kind, namespace, value)` under a unique index, so the write is
the duplicate check:

| Kind                | Value                                                       |
| ------------------- | ----------------------------------------------------------- |
| `PROVIDER_PLACE_ID` | The provider's stable id, namespaced by provider            |
| `ROOT_DOMAIN`       | eTLD+1, lowercased, `www.` stripped                         |
| `PHONE_E164`        | E.164, and only when the digits are unambiguous             |
| `ADDRESS_HASH`      | Hash of the normalized address — **street number required** |

Anything that cannot be normalized confidently is simply omitted. A wrong
identity merges two unrelated businesses, which is worse than a duplicate.

Two guards exist because they were needed:

- Shared platform domains (`wixsite.com`, `squarespace.com`, `business.site`…)
  are excluded. Both sites using Squarespace is not the same business.
- An address needs a street number. `"Redlands, CA"` is a place, not an
  address — without this check, every business in a town entered without a
  street shared one identity and merged into a single record. This was a real
  bug, caught in browser QA; `packages/core/src/__tests__/dedupe.test.ts` has
  the regression tests.

**Weak evidence** never merges. Name and locality similarity produces a
`DuplicateCandidate` for a human to resolve: merge, keep separate, or dismiss.
Two "Summit HVAC" businesses in two known different cities score 0.2, not 0.85.

A merge preserves provenance: sources, signals, notes, contacts, locations,
websites, identities and activity move to the surviving record, and the merged
record is archived rather than deleted.

## Pipeline

`DISCOVERED → RESEARCHING → QUALIFIED → AUDIT_REQUESTED → AUDITED →
DEMO_READY → OUTREACH → ENGAGED → WON → LOST → ARCHIVED`

Eleven stages, not twenty-five. Every change writes a `PipelineStageHistory`
row with the reason and the operator.

After `WON`, LeadEngine stops. The client relationship belongs elsewhere in the
Novenworks platform; LeadEngine keeps the history so the origin of a client is
never lost.
