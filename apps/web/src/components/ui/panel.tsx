import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-panel border border-paper-300 bg-white shadow-[0_1px_2px_rgb(23_26_29/0.04)]",
        className,
      )}
    >
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-paper-200 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Honest empty/error state: says what happened and what to do next. */
export function EmptyState({
  title,
  body,
  action,
  tone = "neutral",
}: {
  title: string;
  body: string;
  action?: ReactNode;
  tone?: "neutral" | "warn" | "bad";
}) {
  const border =
    tone === "warn"
      ? "border-warn-500/40 bg-warn-100"
      : tone === "bad"
        ? "border-bad-500/40 bg-bad-100"
        : "border-paper-300 bg-paper-50";
  return (
    <div className={cn("rounded-panel border border-dashed px-4 py-8 text-center", border)}>
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-ink-700">{body}</p>
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}
