"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./ui/button";
import type { ActionState } from "@/server/actions";

/**
 * A thin wrapper over `useActionState` so every form in the app reports
 * success and failure the same way, in text, next to the control that caused
 * it. No toast that disappears before it is read.
 */
export function ActionForm({
  action,
  children,
  className,
  onSuccess,
  id,
}: {
  action: (prev: ActionState | null, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  /** Called once after a successful submission, e.g. to close a dialog. */
  onSuccess?: () => void;
  id?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const router = useRouter();

  useEffect(() => {
    if (!state?.ok) return;
    onSuccess?.();
    if (state.redirectTo) router.push(state.redirectTo);
    else router.refresh();
    // `state` is a fresh object per submission, so this runs once per result.
  }, [state, router, onSuccess]);

  return (
    <form id={id} action={formAction} className={className}>
      {children}
      {state ? <ActionMessage state={state} /> : null}
    </form>
  );
}

export function ActionMessage({ state }: { state: ActionState }) {
  return (
    <p
      role="status"
      className={`mt-2 flex items-start gap-1.5 rounded border px-2 py-1.5 text-xs ${
        state.ok
          ? "border-good-500/30 bg-good-100 text-good-700"
          : "border-bad-500/30 bg-bad-100 text-bad-700"
      }`}
    >
      <span aria-hidden="true" className="font-mono leading-4">
        {state.ok ? "✓" : "✕"}
      </span>
      {state.message}
    </p>
  );
}

/** Submit button that disables and relabels itself while the action runs. */
export function SubmitButton({
  children,
  pendingLabel = "Working…",
  ...rest
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...rest}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
