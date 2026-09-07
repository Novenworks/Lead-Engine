"use client";

import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { ProspectFilters as Filters } from "@/server/queries";
import { PIPELINE_STAGES } from "@leadengine/core/vocab";

/**
 * Filters are a plain GET form, so the URL is the state. That makes any view
 * shareable, bookmarkable and savable without extra machinery.
 */
export function ProspectFilters({
  filters,
  categories,
  view,
}: {
  filters: Filters;
  categories: string[];
  view: string;
}) {
  return (
    <form method="get" action="/prospects" className="space-y-3">
      {view === "matrix" ? <input type="hidden" name="view" value="matrix" /> : null}

      <Field label="Search" htmlFor="q" hint="Name, domain, category, city or notes.">
        <Input id="q" name="q" defaultValue={filters.q ?? ""} placeholder="cedar peak" />
      </Field>

      <Field label="Qualification" htmlFor="qualification">
        <Select id="qualification" name="qualification" defaultValue={filters.qualification ?? ""}>
          <option value="">Any</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="REVIEW">Needs review</option>
          <option value="DISQUALIFIED">Disqualified</option>
        </Select>
      </Field>

      <Field label="Pipeline stage" htmlFor="stage">
        <Select id="stage" name="stage" defaultValue={filters.stage ?? ""}>
          <option value="">Any stage</option>
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage.toLowerCase().replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Category" htmlFor="category">
        <Select id="category" name="category" defaultValue={filters.category ?? ""}>
          <option value="">Any category</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="City" htmlFor="city">
        <Input id="city" name="city" defaultValue={filters.city ?? ""} placeholder="Redlands" />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Min score" htmlFor="minScore">
          <Input
            id="minScore"
            name="minScore"
            type="number"
            min={0}
            max={100}
            defaultValue={filters.minScore ?? ""}
          />
        </Field>
        <Field label="Min reviews" htmlFor="minReviews">
          <Input
            id="minReviews"
            name="minReviews"
            type="number"
            min={0}
            defaultValue={filters.minReviews ?? ""}
          />
        </Field>
      </div>

      <Field label="Website" htmlFor="website">
        <Select id="website" name="website" defaultValue={filters.website}>
          <option value="any">Any</option>
          <option value="with">Has a website</option>
          <option value="without">No website</option>
        </Select>
      </Field>

      <Field label="Agency credit" htmlFor="agency">
        <Select id="agency" name="agency" defaultValue={filters.agency}>
          <option value="any">Any</option>
          <option value="clear">No agency credit</option>
          <option value="flagged">Agency-managed</option>
        </Select>
      </Field>

      <Field label="Sort by" htmlFor="sort">
        <Select id="sort" name="sort" defaultValue={filters.sort}>
          <option value="score">Opportunity score</option>
          <option value="opportunity">Website opportunity</option>
          <option value="strength">Business strength</option>
          <option value="reviews">Review count</option>
          <option value="activity">Last activity</option>
          <option value="name">Name</option>
        </Select>
      </Field>

      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" size="sm" className="flex-1">
          Apply
        </Button>
        <a
          href="/prospects"
          className="inline-flex h-8 items-center rounded-md border border-paper-300 bg-white px-2.5 text-xs text-ink-700 hover:bg-paper-50"
        >
          Clear
        </a>
      </div>
    </form>
  );
}
