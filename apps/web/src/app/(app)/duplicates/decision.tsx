"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Select } from "@/components/ui/field";
import { resolveDuplicate } from "@/server/actions";

/**
 * Merge, keep separate, or dismiss. A merge asks which record survives, and
 * both records' provenance is preserved either way.
 */
export function DuplicateDecision({
  candidateId,
  optionA,
  optionB,
}: {
  candidateId: string;
  optionA: { id: string; name: string };
  optionB: { id: string; name: string };
}) {
  return (
    <div className="mt-3 border-t border-paper-200 pt-3">
      <ActionForm action={resolveDuplicate} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="candidateId" value={candidateId} />

        <Field label="Decision" htmlFor={`action-${candidateId}`} className="w-48">
          <Select id={`action-${candidateId}`} name="action" defaultValue="MERGE">
            <option value="MERGE">Merge into one record</option>
            <option value="KEEP_SEPARATE">Two separate businesses</option>
            <option value="DISMISS">Dismiss suggestion</option>
          </Select>
        </Field>

        <Field
          label="Keep (when merging)"
          htmlFor={`keep-${candidateId}`}
          className="w-64"
          hint="The other record is archived, not deleted."
        >
          <Select id={`keep-${candidateId}`} name="keepId" defaultValue={optionA.id}>
            <option value={optionA.id}>{optionA.name}</option>
            <option value={optionB.id}>{optionB.name}</option>
          </Select>
        </Field>

        <SubmitButton size="sm" pendingLabel="Resolving…">
          Resolve
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
