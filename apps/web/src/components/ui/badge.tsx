import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Tone = "neutral" | "good" | "warn" | "bad" | "volt" | "signal";

const TONES: Record<Tone, string> = {
  neutral: "bg-paper-200 text-ink-700 border-paper-300",
  good: "bg-good-100 text-good-700 border-good-500/30",
  warn: "bg-warn-100 text-warn-700 border-warn-500/30",
  bad: "bg-bad-100 text-bad-700 border-bad-500/30",
  volt: "bg-volt-100 text-volt-700 border-volt-500/40",
  signal: "bg-signal-100 text-signal-800 border-signal-400/30",
};

/**
 * Status chip. `glyph` is required for status meanings so the badge never
 * relies on colour alone to carry information.
 */
export function Badge({
  tone = "neutral",
  glyph,
  children,
  className,
  title,
}: {
  tone?: Tone;
  glyph?: string;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium leading-4",
        TONES[tone],
        className,
      )}
    >
      {glyph ? (
        <span aria-hidden="true" className="font-mono leading-none">
          {glyph}
        </span>
      ) : null}
      {children}
    </span>
  );
}
