"use client";

import type { ScoringConfig } from "@leadengine/core";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input, Textarea } from "@/components/ui/field";
import { updateScoringSettings } from "@/server/actions";

export function ScoringSettingsForm({ config }: { config: ScoringConfig }) {
  return (
    <ActionForm action={updateScoringSettings} className="space-y-4">
      <Field
        label="Target categories"
        htmlFor="targetCategories"
        hint="One per line. Matched as case-insensitive substrings, so 'plumb' matches 'Plumber' and 'Plumbing contractor'."
      >
        <Textarea
          id="targetCategories"
          name="targetCategories"
          rows={6}
          defaultValue={config.targetCategories.join("\n")}
        />
      </Field>

      <Field
        label="Excluded categories"
        htmlFor="excludedCategories"
        hint="Hard disqualifier. Businesses in these categories are never worth the time."
      >
        <Textarea
          id="excludedCategories"
          name="excludedCategories"
          rows={4}
          defaultValue={config.excludedCategories.join("\n")}
        />
      </Field>

      <Field
        label="Target regions"
        htmlFor="targetRegions"
        hint="Leave empty to ignore geography entirely — no points and no disqualification."
      >
        <Textarea
          id="targetRegions"
          name="targetRegions"
          rows={2}
          defaultValue={config.targetRegions.join("\n")}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Qualify at or above"
          htmlFor="qualifyThreshold"
          hint="Score that suggests QUALIFIED."
        >
          <Input
            id="qualifyThreshold"
            name="qualifyThreshold"
            type="number"
            min={0}
            max={100}
            required
            defaultValue={config.qualifyThreshold}
          />
        </Field>
        <Field label="Review floor" htmlFor="reviewFloor" hint="Below this, suggest DISQUALIFIED.">
          <Input
            id="reviewFloor"
            name="reviewFloor"
            type="number"
            min={0}
            max={100}
            required
            defaultValue={config.reviewFloor}
          />
        </Field>
        <Field
          label="Min reviews for rating"
          htmlFor="minReviewsForRating"
          hint="Ratings below this review count carry no weight."
        >
          <Input
            id="minReviewsForRating"
            name="minReviewsForRating"
            type="number"
            min={0}
            required
            defaultValue={config.minReviewsForRating}
          />
        </Field>
        <Field
          label="Min strength to qualify"
          htmlFor="minBusinessStrengthToQualify"
          hint="Of 20. Stops a tiny business with a bad site from qualifying on website opportunity alone. 0 disables it."
        >
          <Input
            id="minBusinessStrengthToQualify"
            name="minBusinessStrengthToQualify"
            type="number"
            min={0}
            max={20}
            required
            defaultValue={config.minBusinessStrengthToQualify}
          />
        </Field>
      </div>

      <div className="rounded border border-paper-200 bg-paper-50 p-3">
        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            name="agencyCreditDisqualifies"
            defaultChecked={config.agencyCreditDisqualifies}
            className="mt-0.5 size-3.5 accent-volt-500"
          />
          <span>
            <span className="font-medium text-ink-900">
              A visible agency credit disqualifies the prospect
            </span>
            <span className="mt-0.5 block text-ink-700">
              Another agency already owns the relationship. Turn this off to treat credits as a
              warning instead. Low-confidence matches never disqualify either way, and an operator
              can always override a false positive on the prospect.
            </span>
          </span>
        </label>
      </div>

      <SubmitButton variant="primary" pendingLabel="Saving and rescoring…">
        Save and rescore
      </SubmitButton>
    </ActionForm>
  );
}
