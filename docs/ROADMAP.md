# Roadmap

Ordered by what most increases qualified prospects per hour of operator time.

## Shipped in V1

Discovery with a provider boundary and a reviewable result queue · two-tier
deduplication · SSRF-hardened shallow enrichment · agency-credit detection ·
deterministic explainable scoring · qualification with structured reasons and
operator override · an eleven-stage pipeline with history · notes, tags, saved
views · server-side search and filtering · the Opportunity Matrix · the Signal
Stack · AuditWorkspace and Demo Factory boundaries · a Postgres job worker ·
provider usage accounting · fixture mode.

## Next — small, and directly useful

**Verify the Google adapter against the live API.** The highest-value item on
this list: everything else assumes real discovery data. Needs a key and one
real search.

**CSV import.** Deferred from V1 rather than shipped half-working. Should reuse
the existing write path (so dedupe applies unchanged) with a validate → preview
→ commit flow and per-row errors. `ImportBatch` already exists.

**Bulk actions on the prospect list.** Multi-select then enrich, rescore,
change stage or disqualify. The single-prospect paths are done; this is
plumbing over them.

**Audit status sync.** `getAuditStatus` exists on the client but nothing polls
it. A worker job to refresh linked audits would keep the prospect page current
without opening AuditWorkspace.

**Contact-attempt log.** Not a CRM — just "called 12 March, left voicemail" as
a first-class record rather than a free-text note, so follow-up is queryable.

## Later — worth it once volume justifies it

**Map view.** Real value for territory work, but only once discovery runs
return enough businesses for geography to be the hard question. Needs a
browser-side Maps key; List and Matrix must keep working without it.

**Screenshots in production.** The provider boundary is done. Turn on once
SnapSave exists, or Urlbox if sooner.

**A second discovery provider.** The interface is the point; a second adapter
proves it and reduces single-vendor risk.

**Scheduled re-enrichment.** Websites change. Re-inspecting qualified prospects
on a cadence would catch a competitor rebuilding a site — but only worth it
once there is a meaningful tracked set.

**Per-workspace scoring experiments.** Snapshots already record their model
version, so comparing two models over the same prospects is possible. Not worth
building until the current model has been used in anger.

## Explicitly out of scope

Not "later" — **not this product**:

- Inbound lead capture forms; a general CRM; billing or Stripe
- Email marketing, cold-email sequences, deliverability, SMS, dialers, AI SDR
- Full website audit, Lighthouse, axe, deep crawling, CRO analysis
  → **AuditWorkspace**
- Site building → **Demo Factory** · Screenshot infrastructure → **SnapSave**
- Client portals, project management, the client operating system → **PortelOS**
- ML lead scoring, a data warehouse, Elasticsearch, Kafka, microservices

## Standing constraints

- **No LLM requirement.** The score stays deterministic and explainable. If
  optional intelligence is ever added, it goes behind a provider boundary and
  the deterministic path keeps working without it.
- **LeadEngine stays shallow.** Anything that starts to look like a crawler, an
  audit or a page inventory belongs in AuditWorkspace.
- **The repository stays public and clean.** No keys, no real prospect data.
