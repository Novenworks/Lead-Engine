"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input, Select } from "@/components/ui/field";
import { runDiscoverySearch } from "@/server/actions";

/**
 * The market query. Example: Plumbers, Redlands CA, 30 miles.
 * Filters that the provider cannot express server-side are applied after the
 * call, which is why they are grouped separately.
 */
export function DiscoverySearchForm({ realData }: { realData: boolean }) {
  return (
    <ActionForm action={runDiscoverySearch} className="space-y-3">
      <Field label="Category or keyword" htmlFor="category">
        <Input
          id="category"
          name="category"
          required
          maxLength={120}
          placeholder="Plumber"
          defaultValue=""
          autoComplete="off"
        />
      </Field>

      <Field label="Location" htmlFor="locationText" hint="City and state, or a county.">
        <Input
          id="locationText"
          name="locationText"
          required
          maxLength={160}
          placeholder="Redlands, CA"
          autoComplete="off"
        />
      </Field>

      <Field label="Radius" htmlFor="radiusMeters">
        <Select id="radiusMeters" name="radiusMeters" defaultValue="">
          <option value="">No radius (use the location text)</option>
          <option value="8047">5 miles</option>
          <option value="16093">10 miles</option>
          <option value="32187">20 miles</option>
          <option value="48280">30 miles</option>
          <option value="80467">50 miles</option>
        </Select>
      </Field>

      <fieldset className="space-y-3 rounded border border-paper-200 bg-paper-50 p-2.5">
        <legend className="px-1 text-[11px] font-medium uppercase tracking-wide text-ink-500">
          Optional filters
        </legend>

        <Field label="Minimum rating" htmlFor="minRating">
          <Select id="minRating" name="minRating" defaultValue="">
            <option value="">Any rating</option>
            <option value="3.5">3.5+</option>
            <option value="4">4.0+</option>
            <option value="4.5">4.5+</option>
          </Select>
        </Field>

        <Field label="Minimum reviews" htmlFor="minReviews">
          <Input id="minReviews" name="minReviews" type="number" min={0} max={10000} placeholder="0" />
        </Field>

        <Field label="Website" htmlFor="websiteFilter">
          <Select id="websiteFilter" name="websiteFilter" defaultValue="any">
            <option value="any">With or without</option>
            <option value="with">Has a website</option>
            <option value="without">No website</option>
          </Select>
        </Field>

        <Field
          label="Max results"
          htmlFor="maxResults"
          hint="Discovery costs money per call. Keep it tight."
        >
          <Select id="maxResults" name="maxResults" defaultValue="20">
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="40">40</option>
          </Select>
        </Field>
      </fieldset>

      <SubmitButton variant="primary" className="w-full" pendingLabel="Searching…">
        Search market
      </SubmitButton>

      {!realData ? (
        <p className="text-[11px] leading-relaxed text-ink-500">
          The demo provider returns fictional businesses so the workflow is usable without a Google
          key. Set <code className="font-mono">BUSINESS_DISCOVERY_PROVIDER=google</code> and{" "}
          <code className="font-mono">GOOGLE_MAPS_API_KEY</code> for real data.
        </p>
      ) : null}
    </ActionForm>
  );
}
