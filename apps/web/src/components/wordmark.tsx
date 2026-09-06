/**
 * TEMPORARY BRAND MARK.
 *
 * The permanent LeadEngine logo has not been approved. This is deliberately a
 * text wordmark plus one small geometric app mark, isolated in this single
 * component so replacing it later is a one-file change. Do not inline this
 * mark anywhere else.
 */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <AppMark />
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight text-white">LeadEngine</span>
        {compact ? null : (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-shell-400">
            by Novenworks
          </span>
        )}
      </span>
    </span>
  );
}

/** Placeholder app mark: a radar sweep, standing in for the approved logo. */
export function AppMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="LeadEngine"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="10" fill="none" stroke="#3a4756" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="#3a4756" strokeWidth="1.5" />
      <path d="M12 12 L20.5 8" stroke="#b6e02f" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16.5" cy="7.5" r="2.2" fill="#b6e02f" />
    </svg>
  );
}
