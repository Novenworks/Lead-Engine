"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { saveSearch } from "@/server/actions";

/** Saves the current filter query string under a name. */
export function SaveViewForm({ currentQuery }: { currentQuery: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Save this view
      </Button>
    );
  }

  return (
    <ActionForm action={saveSearch} onSuccess={() => setOpen(false)} className="flex items-end gap-2">
      <input type="hidden" name="kind" value="PROSPECT_VIEW" />
      <input type="hidden" name="params" value={currentQuery} />
      <label htmlFor="saved-view-name" className="sr-only">
        Saved view name
      </label>
      <Input
        id="saved-view-name"
        name="name"
        required
        maxLength={60}
        placeholder="High-review plumbers, weak sites"
        className="w-64"
        autoFocus
      />
      <SubmitButton variant="primary" size="sm" pendingLabel="Saving…">
        Save
      </SubmitButton>
      <Button size="sm" type="button" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </ActionForm>
  );
}
