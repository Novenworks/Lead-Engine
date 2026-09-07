"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Wordmark } from "./wordmark";

/**
 * The application shell: a dark instrument frame around a light worksheet.
 *
 * Navigation is deliberately short. Everything a V1 prospecting run needs and
 * nothing that belongs to a CRM.
 */

const NAV = [
  { href: "/discover", label: "Discover", glyph: "◎", hint: "Search a market" },
  { href: "/prospects", label: "Prospects", glyph: "▤", hint: "Everything tracked" },
  { href: "/pipeline", label: "Pipeline", glyph: "⇥", hint: "Stage by stage" },
  { href: "/saved", label: "Saved Searches", glyph: "★", hint: "Reusable filters" },
  { href: "/activity", label: "Activity", glyph: "≡", hint: "What happened" },
  { href: "/settings", label: "Settings", glyph: "⚙", hint: "Scoring and integrations" },
] as const;

export function AppShell({
  children,
  workspaceName,
  operatorLabel,
  banner,
}: {
  children: ReactNode;
  workspaceName: string;
  operatorLabel: string;
  banner?: ReactNode;
}) {
  const currentPath = usePathname() ?? "";
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Desktop rail */}
      <nav
        aria-label="Primary"
        className="hidden shrink-0 flex-col bg-shell-950 text-shell-300 lg:flex lg:w-56"
      >
        <div className="border-b border-shell-800 px-4 py-4">
          <Wordmark />
          <p className="mt-2 truncate text-[11px] text-shell-400" title={workspaceName}>
            {workspaceName}
          </p>
        </div>
        <ul className="flex flex-1 flex-col gap-0.5 p-2">
          {NAV.map((item) => {
            const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-shell-800 text-white font-medium"
                      : "text-shell-300 hover:bg-shell-900 hover:text-white",
                  )}
                >
                  <span aria-hidden="true" className="w-4 text-center text-shell-400">
                    {item.glyph}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-shell-800 px-4 py-3 text-[11px] text-shell-400">
          <p className="truncate text-shell-300">{operatorLabel}</p>
          <p className="mt-0.5">LeadEngine V1</p>
        </div>
      </nav>

      {/* Mobile bar */}
      <header className="flex items-center justify-between gap-3 bg-shell-950 px-4 py-3 lg:hidden">
        <Wordmark compact />
        <span className="truncate text-[11px] text-shell-400">{workspaceName}</span>
      </header>
      <nav aria-label="Primary" className="overflow-x-auto bg-shell-900 lg:hidden">
        <ul className="flex min-w-max gap-1 px-2 py-2">
          {NAV.map((item) => {
            const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap",
                    active ? "bg-shell-700 text-white font-medium" : "text-shell-300",
                  )}
                >
                  <span aria-hidden="true">{item.glyph}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <main className="min-w-0 flex-1 bg-paper-100">
        {banner}
        <div className="mx-auto w-full max-w-[1600px] px-4 py-5 lg:px-6 lg:py-6">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink-900">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
