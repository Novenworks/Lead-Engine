"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";
import { Panel } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/field";
import { addNote } from "@/server/actions";

export function NotesSection({
  prospectId,
  notes,
}: {
  prospectId: string;
  notes: Array<{ id: string; body: string; createdAt: Date }>;
}) {
  return (
    <Panel title={`Notes (${notes.length})`}>
      <ActionForm action={addNote} className="mb-3">
        <input type="hidden" name="prospectId" value={prospectId} />
        <label htmlFor="note-body" className="sr-only">
          Add a note
        </label>
        <Textarea
          id="note-body"
          name="body"
          rows={2}
          maxLength={4000}
          placeholder="What did you learn about this business?"
        />
        <div className="mt-2 flex justify-end">
          <SubmitButton size="sm" pendingLabel="Saving…">
            Add note
          </SubmitButton>
        </div>
      </ActionForm>

      {notes.length === 0 ? (
        <p className="text-xs text-ink-500">No notes yet.</p>
      ) : (
        <ol className="divide-y divide-paper-200 border-t border-paper-200">
          {notes.map((note) => (
            <li key={note.id} className="py-2.5">
              <p className="whitespace-pre-wrap text-xs text-ink-900">{note.body}</p>
              <time
                dateTime={note.createdAt.toISOString()}
                className="mt-1 block text-[11px] text-ink-500"
              >
                {note.createdAt.toLocaleString()}
              </time>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
