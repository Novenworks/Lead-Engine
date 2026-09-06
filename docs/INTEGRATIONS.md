# Integrations

Every external dependency sits behind an interface, and every one of them
degrades honestly: when a service is not configured or not reachable, the UI
says so. LeadEngine never renders a success that did not happen.

## Business discovery

```ts
interface BusinessDiscoveryProvider {
  id: string;
  label: string;
  returnsRealData: boolean; // false ⇒ the UI must label results as fixtures
  isConfigured(): boolean;
  search(input: DiscoverySearchInput): Promise<DiscoverySearchResult>;
  getDetails?(externalId: string): Promise<DiscoveryBusiness | null>;
}
```

Selected by `BUSINESS_DISCOVERY_PROVIDER`.

**`demo`** (default) returns invented businesses on `.example` domains. It
exists so LeadEngine is fully usable and demonstrable without any credentials.
Results carry `isFixture: true` and every screen showing them says
"demo data — fictional".

**`google`** targets the Places API (New) v1:

```
POST https://places.googleapis.com/v1/places:searchText
GET  https://places.googleapis.com/v1/places/{PLACE_ID}
GET  https://maps.googleapis.com/maps/api/geocode/json
```

with `X-Goog-Api-Key` and an explicit `X-Goog-FieldMask` requesting exactly the
fields LeadEngine stores — a wide mask is billed at a higher tier. Geocoding is
only called when the operator asked for a radius, so a search without one costs
one billable call instead of two.

> **Unverified.** No API key was available during the build and Google's docs
> were unreachable from the build environment. The request shapes and response
> mapping are covered by fixture tests only. Treat the first live search as a
> smoke test.

If `google` is selected but `GOOGLE_MAPS_API_KEY` is missing, LeadEngine falls
back to the demo provider and reports the degradation in the app banner and in
Settings. It does not present fixtures as Google data.

Provider errors are classified rather than leaked: `NOT_CONFIGURED`,
`INVALID_LOCATION`, `RATE_LIMITED`, `QUOTA_EXCEEDED`, `PROVIDER_UNAVAILABLE`,
`PROVIDER_ERROR`. Each maps to a specific message. Failed runs are recorded
with their error, and `ProviderUsage` counts failed calls too — a burst of
failures is still a burst of billable calls.

## AuditWorkspace

The boundary that matters most. LeadEngine finds the opportunity;
AuditWorkspace proves it.

```ts
interface AuditWorkspaceClient {
  configured: boolean;
  createAudit(input: AuditHandoff): Promise<AuditReference>;
  getAuditStatus(externalId: string): Promise<AuditStatus>;
}
```

Two rules the code enforces:

1. **No shared database.** HTTP only.
2. **LeadEngine's score is never sent as a finding.** It travels under
   `leadEngineAssessment`, explicitly namespaced, alongside the shallow signals
   as evidence. AuditWorkspace forms its own verdict.

The payload carries the LeadEngine prospect and workspace ids, business
identity, website, location, public contacts, discovery provenance, the score
with its four dimensions and model version, the shallow signals with their
confidence and evidence, and the agency-credit signal if any.

**When unconfigured** (`AUDIT_WORKSPACE_API_URL` / `AUDIT_WORKSPACE_API_TOKEN`
not both set), pressing _Run audit_ creates an `ExternalReference` in
`PENDING_HANDOFF` with the assembled payload stored, records the activity, and
tells the operator plainly that the integration is not configured and the
request will be sent once it is. The worker's `INTEGRATION_HANDOFF` job replays
stored payloads once credentials appear.

**Transport failures** map to `UNAUTHORIZED`, `UNAVAILABLE`, `REJECTED` or
`PROTOCOL_ERROR`. A 2xx response with no audit id is a `PROTOCOL_ERROR`, not a
success.

> The endpoint paths (`/v1/audits`) and response shape are LeadEngine's
> proposal. Both services need to agree on them.

## Demo Factory

```ts
interface DemoFactoryClient {
  configured: boolean;
  createProject(input: DemoFactoryHandoff): Promise<DemoFactoryReference>;
}
```

Prepared, not overbuilt. The payload is business identity, the current website,
and the AuditWorkspace reference when one exists. No site-building logic lives
in LeadEngine. Same unconfigured behaviour as above.

## Screenshots

```ts
interface ScreenshotProvider {
  isConfigured(): boolean;
  capture(request: ScreenshotRequest): Promise<ScreenshotReferenceResult>;
}
```

`SCREENSHOT_PROVIDER` is `none` (default), `urlbox`, or `snapsave`. Previews
are never required for qualification — when disabled, the prospect page says
"No preview captured" and offers a link to open the site.

SnapSave will eventually own this capability; the adapter is a placeholder that
activates only when both its URL and token are set.

## Outreach — deliberately out of scope

LeadEngine records intent: ready for outreach, a next action, a date, an
activity event. It has no sequences, no sending, no deliverability, no
warm-up, no SMS, no AI email generation. A future outreach system takes over
from the `OUTREACH` stage.
