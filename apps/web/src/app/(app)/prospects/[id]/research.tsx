import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";

/**
 * Research organizes the public business facts we already hold. It does not
 * launch an autonomous research agent and never gathers personal data — only
 * business contact details a business publishes about itself.
 */
export function ResearchSection({
  contacts,
  locations,
  websites,
  sources,
  signals,
}: {
  contacts: Array<{ id: string; kind: string; value: string; source: string }>;
  locations: Array<{
    id: string;
    formatted: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
  }>;
  websites: Array<{
    id: string;
    url: string;
    rootDomain: string;
    title: string | null;
    metaDescription: string | null;
    status: string;
  }>;
  sources: Array<{ id: string; provider: string; externalId: string | null; firstSeenAt: Date }>;
  signals: Array<{
    type: string;
    value: string | null;
    evidence: string | null;
    sourceReference: string | null;
  }>;
}) {
  const socials = signals.filter((s) => s.type === "SOCIAL_LINK_PRESENT" && s.evidence);
  const platform = signals.find((s) => s.type === "CMS_HINT");
  const agency = signals.find((s) => s.type === "AGENCY_CREDIT_DETECTED");

  return (
    <div className="space-y-4">
      <Panel title="Contact details">
        {contacts.length === 0 ? (
          <p className="text-xs text-ink-500">No public contact details found yet.</p>
        ) : (
          <ul className="divide-y divide-paper-200">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex flex-wrap items-baseline gap-2 py-2 text-xs">
                <Badge tone="neutral">{contact.kind.toLowerCase()}</Badge>
                <span className="text-ink-900">{contact.value}</span>
                <span className="ml-auto text-[11px] text-ink-500">via {contact.source}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Locations">
        {locations.length === 0 ? (
          <p className="text-xs text-ink-500">No address on file.</p>
        ) : (
          <ul className="divide-y divide-paper-200">
            {locations.map((location) => (
              <li key={location.id} className="py-2 text-xs">
                <p className="text-ink-900">
                  {location.formatted ??
                    [location.city, location.region, location.postalCode]
                      .filter(Boolean)
                      .join(", ")}
                </p>
                {location.latitude !== null && location.longitude !== null ? (
                  <p className="tabular mt-0.5 text-[11px] text-ink-500">
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Web presence">
        <ul className="divide-y divide-paper-200">
          {websites.map((website) => (
            <li key={website.id} className="py-2 text-xs">
              <a
                href={website.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="break-all font-medium text-signal-600 underline"
              >
                {website.url}
              </a>
              <p className="mt-0.5 text-ink-700">{website.title ?? "No page title"}</p>
              {website.metaDescription ? (
                <p className="mt-0.5 text-ink-500">{website.metaDescription}</p>
              ) : null}
              <Badge tone="neutral" className="mt-1">
                {website.status.toLowerCase().replace(/_/g, " ")}
              </Badge>
            </li>
          ))}
          {websites.length === 0 ? (
            <li className="py-2 text-xs text-ink-500">No website on file.</li>
          ) : null}
        </ul>

        {socials.length > 0 ? (
          <div className="mt-3 border-t border-paper-200 pt-3">
            <p className="text-[11px] uppercase tracking-wide text-ink-500">Social profiles</p>
            <p className="mt-1 break-all text-xs text-ink-700">{socials[0]?.evidence}</p>
          </div>
        ) : null}

        {platform ? (
          <p className="mt-3 border-t border-paper-200 pt-3 text-xs text-ink-700">
            Platform fingerprint: <strong>{platform.value}</strong>. A platform is not a defect — it
            carries no score on its own.
          </p>
        ) : null}

        {agency ? (
          <div className="mt-3 rounded border border-bad-500/40 bg-bad-100 px-2.5 py-2">
            <p className="text-xs font-semibold text-bad-700">Agency credit found</p>
            <p className="mt-0.5 text-[11px] text-bad-700">{agency.evidence}</p>
            {agency.sourceReference ? (
              <a
                href={agency.sourceReference}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-1 inline-block break-all text-[11px] underline"
              >
                {agency.sourceReference}
              </a>
            ) : null}
            <p className="mt-1 text-[11px] text-bad-700">
              Detection is a heuristic. If this is wrong, override the qualification and record why.
            </p>
          </div>
        ) : null}
      </Panel>

      <Panel title="Provenance">
        <ul className="divide-y divide-paper-200">
          {sources.map((source) => (
            <li key={source.id} className="flex flex-wrap items-baseline gap-2 py-2 text-xs">
              <Badge tone="signal">{source.provider}</Badge>
              <code className="font-mono text-[11px] text-ink-500">{source.externalId || "—"}</code>
              <time
                dateTime={source.firstSeenAt.toISOString()}
                className="ml-auto text-[11px] text-ink-500"
              >
                first seen {source.firstSeenAt.toLocaleDateString()}
              </time>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
