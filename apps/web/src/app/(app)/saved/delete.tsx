"use client";

import { useState, useTransition } from "react";
import { ActionMessage } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { deleteSavedSearch, type ActionState } from "@/server/actions";

export function DeleteSavedSearch({ id, name }: { id: string; name: string }) {
  const [result, setResult] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();

  return (
    <span className="flex items-center gap-2">
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        aria-label={`Delete saved search ${name}`}
        onClick={() => start(async () => setResult(await deleteSavedSearch(id)))}
      >
        Delete
      </Button>
      {result && !result.ok ? <ActionMessage state={result} /> : null}
    </span>
  );
}
