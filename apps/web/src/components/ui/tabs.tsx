"use client";

import { useId, useRef, useState, type ReactNode } from "react";

/**
 * Tabs with the full ARIA tab pattern: roving tabindex, arrow/Home/End keys,
 * and panels wired by id. Hand-rolled rather than pulled from a component
 * library because the behaviour is small and the dependency is not.
 */
export interface TabDefinition {
  id: string;
  label: string;
  /** Optional count shown after the label, e.g. the number of signals. */
  count?: number;
  content: ReactNode;
}

export function Tabs({ tabs, initial }: { tabs: TabDefinition[]; initial?: string }) {
  const base = useId();
  const [active, setActive] = useState(initial ?? tabs[0]?.id ?? "");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusTab = (id: string) => {
    setActive(id);
    refs.current[id]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    const target = tabs[next];
    if (target) focusTab(target.id);
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Prospect sections"
        className="flex gap-1 overflow-x-auto border-b border-paper-300"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                refs.current[tab.id] = node;
              }}
              role="tab"
              type="button"
              id={`${base}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                selected
                  ? "border-volt-400 text-ink-900"
                  : "border-transparent text-ink-500 hover:text-ink-900"
              }`}
            >
              {tab.label}
              {tab.count !== undefined ? (
                <span className="tabular ml-1.5 rounded bg-paper-200 px-1 py-0.5 text-[10px] text-ink-700">
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className="pt-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
