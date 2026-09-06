# The Opportunity Score

A number between 0 and 100 answering one question: **is this business worth
Novenworks' time?**

It is a rules engine, not a model. Every point is attributable to a named rule
with a plain-language reason and the signals that justified it, because the
whole value of the number is that an operator can disagree with it
_specifically_ rather than distrust it _generally_.

Implementation: `packages/core/src/scoring/engine.ts` (pure) and
`packages/core/src/scoring/config.ts` (every threshold). Current model version:
**1.0.0**.

## Dimensions

| Dimension           | Max | Asks                                            |
| ------------------- | --- | ----------------------------------------------- |
| Business fit        | 25  | Is this the kind of business we want?           |
| Business strength   | 20  | Is it established enough to be worth targeting? |
| Website opportunity | 40  | Is there visible room to improve the website?   |
| Reachability        | 15  | Can we actually contact them?                   |

They sum to 100 by construction.

### Business fit (25)

- **Target category** (20): on the target list → 20; a local business not on
  the list → 8; no category recorded → 5 (unknown, not bad); on the excluded
  list → 0 **and a hard disqualifier**.
- **Target geography** (5): inside a target region → 5; region unknown → 2;
  outside → 0 **and a hard disqualifier**. With no target regions configured,
  geography scores a flat 5 and never disqualifies.

### Business strength (20)

- **Review volume** (12): tiered — 200+ → 12, 75+ → 10, 25+ → 7, 10+ → 4,
  1+ → 2. No data → 0, described as unknown.
- **Reputation** (8): only counts once there are at least 10 reviews. Below
  that, a flat 2 with the reason "too few to read anything into". At 10+:
  4.5★ → 8, 4.0★ → 6, 3.5★ → 3, below → 1 (a weak reputation is a harder sale).

### Website opportunity (40)

Mutually exclusive top-level cases first:

- **No website at all** → 30. A real opportunity, but capped below "broken
  site" because a business with no web presence is often also not a buyer.
- **Not inspected yet** → 0, with "run enrichment before trusting this score".
  Unknown never scores the same as bad.
- **Site does not load** → 34. A broken or parked domain is the strongest
  opening there is.

Otherwise, deficiencies compound:

| Rule             | Max | Fires when                                                                           |
| ---------------- | --- | ------------------------------------------------------------------------------------ |
| HTTPS            | 8   | Served over plain HTTP                                                               |
| Mobile readiness | 8   | No responsive viewport tag                                                           |
| Conversion path  | 12  | No contact CTA **and** no booking link (4 if only one is missing, 2 if only booking) |
| Click to call    | 4   | No `tel:` link                                                                       |
| Page metadata    | 6   | No `<title>` (4) and/or no meta description (2)                                      |
| Domain redirect  | 4   | The domain redirects to a different domain                                           |

When nothing fires, a "Site looks competent" component is emitted at 0 points
saying so explicitly.

### Reachability (15)

Public phone 7, public business email 5, a website contact or booking path 3.
No phone, no email and no website at all is a hard disqualifier.

## Hard disqualifiers

These set the verdict directly; they are never a silent subtraction.

`AGENCY_MANAGED` · `OUT_OF_AREA` · `WRONG_CATEGORY` · `BUSINESS_CLOSED` ·
`NOT_REACHABLE` · `NO_RELEVANT_OPPORTUNITY` (total below the review floor)

## The verdict

1. Any hard disqualifier → **DISQUALIFIED**.
2. Total below the review floor (default 30) → **DISQUALIFIED**.
3. Total at or above the qualify threshold (default 70) **and** business
   strength at or above the gate → **QUALIFIED**.
4. Otherwise → **REVIEW**.

### The business-strength gate

A business needs at least 8 of 20 Business Strength before the engine will
suggest QUALIFIED.

This exists because the additive model had a real failure mode, found while
reviewing seeded fixtures: _Ironwood Roofing_ — 3.9★ from 7 reviews, with a
genuinely terrible website — scored 74 and qualified. Its website opportunity
was real, but a business with no proven customer base usually cannot buy.

The gate caps the **verdict**, not the score. Ironwood still scores 74 and its
website opportunity still reads 38/40; it lands in REVIEW with a visible
component explaining why. Set `minBusinessStrengthToQualify` to 0 to disable.

## Rules the model follows deliberately

- **Unknown is not bad.** A missing category, an unread website and an
  un-enriched prospect all score as unknown and say so.
- **No single weak signal moves the score much.** A missing meta description is
  worth 2 points, not 40.
- **A CMS is not a defect.** WordPress carries zero points. It is recorded as a
  fingerprint because it is useful context, not because it is a problem.
- **A low review count is not a disqualifier.** It reduces Business Strength,
  which is a different claim.
- **Deficiencies must compound.** One problem is 8 points; four problems are 32. That ratio is the point.
- **An old copyright year proves nothing** and is not collected.

## Operator override

An operator can always set the qualification themselves. When their choice
differs from the engine's, the prospect is flagged `qualificationOverridden`,
an activity event records who chose what and why, and **later rescoring leaves
the verdict alone**. A human decision is never quietly reversed by a re-run.
"Clear override" hands the prospect back to the engine.

## Changing the model

Thresholds, category lists, target regions and the agency-credit policy are
editable in Settings and stored per workspace. Saving rescores the workspace.
Each `ScoreSnapshot` records the `modelVersion` that produced it, so a change
is visible rather than retroactive.
