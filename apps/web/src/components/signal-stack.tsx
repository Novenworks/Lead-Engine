import { Badge } from "./ui/badge";

/**
 * The Signal Stack.
 *
 * The score is worthless unless the operator can see why. Every component is
 * shown with its points, its cap, the reason in plain language, and the raw
 * signals that produced it — so a wrong score can be argued with specifically
 * rather than distrusted generally.
 */

export interface StackComponent {
  dimension: string;
  key: string;
  label: string;
  points: number;
  maxPoints: number;
  reason: string;
  signalTypes: string[];
}

export interface StackSignal {
  type: string;
  value: string | null;
  booleanValue: boolean | null;
  confidence: string;
  evidence: string | null;
  source: string;
  observedAt: Date;
}

const DIMENSION_LABELS: Record<string, string> = {
  BUSINESS_FIT: "Business fit",
  BUSINESS_STRENGTH: "Business strength",
  WEBSITE_OPPORTUNITY: "Website opportunity",
  REACHABILITY: "Reachability",
  DISQUALIFIER: "Disqualifiers",
};

const DIMENSION_ORDER = [
  "BUSINESS_FIT",
  "BUSINESS_STRENGTH",
  "WEBSITE_OPPORTUNITY",
  "REACHABILITY",
  "DISQUALIFIER",
];

const SOURCE_LABELS: Record<string, string> = {
  GOOGLE_PLACES: "Google Places",
  DEMO_PROVIDER: "Demo provider",
  WEBSITE_FETCH: "Website",
  MANUAL: "Operator",
  CSV_IMPORT: "CSV import",
};

export function SignalStack({
  total,
  components,
  signals,
  disqualifiers,
  modelVersion,
  scoredAt,
}: {
  total: number;
  components: StackComponent[];
  signals: StackSignal[];
  disqualifiers: string[];
  modelVersion: string;
  scoredAt: Date;
}) {
  const signalsByType = new Map(signals.map((signal) => [signal.type, signal]));

  const grouped = DIMENSION_ORDER.map((dimension) => ({
    dimension,
    label: DIMENSION_LABELS[dimension] ?? dimension,
    items: components.filter((component) => component.dimension === dimension),
  })).filter((group) => group.items.length > 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-paper-200 pb-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink-500">Opportunity score</p>
          <p className="tabular text-4xl font-semibold leading-none text-ink-900">
            {total}
            <span className="text-lg font-normal text-ink-500">/100</span>
          </p>
        </div>
        <p className="text-[11px] text-ink-500">
          Model {modelVersion} · scored{" "}
          <time dateTime={scoredAt.toISOString()}>{scoredAt.toLocaleString()}</time>
        </p>
      </div>

      {disqualifiers.length > 0 ? (
        <div className="mt-3 rounded border border-bad-500/40 bg-bad-100 px-3 py-2">
          <p className="text-xs font-semibold text-bad-700">
            <span aria-hidden="true" className="font-mono">
              ■
            </span>{" "}
            Disqualified by {disqualifiers.length} rule{disqualifiers.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {disqualifiers.map((reason) => (
              <li key={reason}>
                <Badge tone="bad" glyph="✕">
                  {reason.toLowerCase().replace(/_/g, " ")}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-500">
        Why this scored
      </h3>

      <div className="mt-2 space-y-4">
        {grouped.map((group) => {
          const earned = group.items.reduce((sum, item) => sum + item.points, 0);
          const available = group.items.reduce((sum, item) => sum + item.maxPoints, 0);
          return (
            <section key={group.dimension}>
              <div className="flex items-baseline justify-between border-b border-paper-200 pb-1">
                <h4 className="text-xs font-semibold text-ink-900">{group.label}</h4>
                {available > 0 ? (
                  <p className="tabular text-xs text-ink-700">
                    {earned} / {available}
                  </p>
                ) : null}
              </div>

              <ul className="divide-y divide-paper-200">
                {group.items.map((item) => {
                  const evidence = item.signalTypes
                    .map((type) => signalsByType.get(type))
                    .filter((signal): signal is StackSignal => Boolean(signal));

                  return (
                    <li key={item.key} className="py-2">
                      <div className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 w-8 shrink-0 text-right font-mono text-xs ${
                            item.points > 0 ? "text-volt-700" : "text-ink-500"
                          }`}
                        >
                          {item.maxPoints === 0 ? "·" : `+${item.points}`}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-ink-900">
                            {item.label}
                            {item.maxPoints > 0 ? (
                              <span className="tabular ml-1.5 font-normal text-ink-500">
                                {item.points} of {item.maxPoints} points
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-ink-700">
                            {item.reason}
                          </p>

                          {evidence.length > 0 ? (
                            <ul className="mt-1.5 space-y-1">
                              {evidence.map((signal) => (
                                <li
                                  key={signal.type}
                                  className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded border border-paper-200 bg-paper-50 px-2 py-1"
                                >
                                  <code className="font-mono text-[10px] text-ink-500">
                                    {signal.type}
                                  </code>
                                  <span className="text-[11px] text-ink-700">
                                    {signal.evidence ??
                                      signal.value ??
                                      (signal.booleanValue === true
                                        ? "present"
                                        : signal.booleanValue === false
                                          ? "absent"
                                          : "—")}
                                  </span>
                                  <span className="ml-auto text-[10px] text-ink-500">
                                    {SOURCE_LABELS[signal.source] ?? signal.source} ·{" "}
                                    {signal.confidence.toLowerCase()} confidence
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
