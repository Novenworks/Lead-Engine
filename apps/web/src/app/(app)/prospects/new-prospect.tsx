"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { createProspect } from "@/server/actions";

/**
 * Manual entry. Same write path as discovery, so the same dedupe rules apply —
 * typing in a business we already track opens the existing record instead of
 * creating a second one.
 */
export function NewProspectButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Add prospect
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a prospect"
        description="Only the business name is required. Everything else improves the score."
        footer={
          <>
            <Button type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton form="new-prospect-form" variant="primary" pendingLabel="Creating…">
              Create prospect
            </SubmitButton>
          </>
        }
      >
        <ActionForm id="new-prospect-form" action={createProspect} className="space-y-3">
          <Field label="Business name" htmlFor="name">
            <Input id="name" name="name" required maxLength={160} autoFocus />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Website" htmlFor="websiteUrl" hint="cedarpeak.com is fine.">
              <Input id="websiteUrl" name="websiteUrl" maxLength={300} inputMode="url" />
            </Field>
            <Field label="Category" htmlFor="category">
              <Input id="category" name="category" maxLength={80} placeholder="Plumber" />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" maxLength={40} inputMode="tel" />
            </Field>
            <Field label="Business email" htmlFor="email">
              <Input id="email" name="email" maxLength={160} inputMode="email" />
            </Field>
          </div>

          <Field label="Street address" htmlFor="line1">
            <Input id="line1" name="line1" maxLength={160} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="City" htmlFor="city">
              <Input id="city" name="city" maxLength={80} />
            </Field>
            <Field label="State" htmlFor="region">
              <Input id="region" name="region" maxLength={40} placeholder="CA" />
            </Field>
            <Field label="Postal code" htmlFor="postalCode">
              <Input id="postalCode" name="postalCode" maxLength={20} />
            </Field>
          </div>

          <Field label="Note" htmlFor="note" hint="Optional context for the first note.">
            <Textarea id="note" name="note" maxLength={2000} />
          </Field>
        </ActionForm>
      </Modal>
    </>
  );
}
