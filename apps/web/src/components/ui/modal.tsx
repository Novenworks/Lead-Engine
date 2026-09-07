"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./button";

/**
 * Modal built on the native <dialog> element.
 *
 * `showModal()` gives us focus trapping, Escape-to-close, inert background and
 * the top layer for free — all things a hand-rolled div modal gets wrong.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
      onClose={onClose}
      onCancel={onClose}
      className="m-auto"
    >
      <div className="rounded-panel border border-paper-300 bg-white shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-paper-200 px-4 py-3">
          <div>
            <h2 id="modal-title" className="text-sm font-semibold text-ink-900">
              {title}
            </h2>
            {description ? (
              <p id="modal-description" className="mt-0.5 text-xs text-ink-500">
                {description}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            ✕
          </Button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <footer className="flex justify-end gap-2 border-t border-paper-200 px-4 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
