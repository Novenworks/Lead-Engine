/**
 * Domain vocabulary shared by the web app, the worker and the providers.
 *
 * These are plain string unions rather than Prisma enums on purpose: the
 * scoring engine, the URL guard and the HTML extractor are pure functions that
 * must be testable without a database. The names are kept identical to the
 * Prisma enums so values round-trip without translation.
 */

export const SIGNAL_TYPES = [
  "BUSINESS_CATEGORY",
  "GOOGLE_RATING",
  "GOOGLE_REVIEW_COUNT",
  "BUSINESS_CLOSED",
  "PHONE_PRESENT",
  "PUBLIC_EMAIL_PRESENT",
  "WEBSITE_PRESENT",
  "WEBSITE_REACHABLE",
  "WEBSITE_FETCH_FAILED",
  "HTTPS_PRESENT",
  "TITLE_PRESENT",
  "META_DESCRIPTION_PRESENT",
  "VIEWPORT_META_PRESENT",
  "CONTACT_LINK_PRESENT",
  "BOOKING_LINK_PRESENT",
  "PHONE_LINK_PRESENT",
  "SOCIAL_LINK_PRESENT",
  "CMS_HINT",
  "AGENCY_CREDIT_DETECTED",
  "DOMAIN_REDIRECT",
  "IN_TARGET_GEOGRAPHY",
  "RENDER_REQUIRED",
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const SIGNAL_SOURCES = [
  "GOOGLE_PLACES",
  "DEMO_PROVIDER",
  "WEBSITE_FETCH",
  "MANUAL",
  "CSV_IMPORT",
] as const;
export type SignalSource = (typeof SIGNAL_SOURCES)[number];

export type Confidence = "LOW" | "MEDIUM" | "HIGH";

export type Qualification = "REVIEW" | "QUALIFIED" | "DISQUALIFIED";

export const PIPELINE_STAGES = [
  "DISCOVERED",
  "RESEARCHING",
  "QUALIFIED",
  "AUDIT_REQUESTED",
  "AUDITED",
  "DEMO_READY",
  "OUTREACH",
  "ENGAGED",
  "WON",
  "LOST",
  "ARCHIVED",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const DISQUALIFICATION_REASONS = [
  "AGENCY_MANAGED",
  "OUT_OF_AREA",
  "WRONG_CATEGORY",
  "BUSINESS_CLOSED",
  "DUPLICATE",
  "NO_RELEVANT_OPPORTUNITY",
  "NOT_REACHABLE",
  "TOO_SMALL",
  "OTHER",
] as const;
export type DisqualificationReason = (typeof DISQUALIFICATION_REASONS)[number];

export type ScoreDimension =
  | "BUSINESS_FIT"
  | "BUSINESS_STRENGTH"
  | "WEBSITE_OPPORTUNITY"
  | "REACHABILITY"
  | "DISQUALIFIER";

export type IdentityKind =
  | "PROVIDER_PLACE_ID"
  | "ROOT_DOMAIN"
  | "PHONE_E164"
  | "ADDRESS_HASH";

/** A single observed fact, as produced by a provider or the website fetcher. */
export interface SignalInput {
  type: SignalType;
  source: SignalSource;
  confidence?: Confidence;
  value?: string | null;
  numericValue?: number | null;
  booleanValue?: boolean | null;
  evidence?: string | null;
  sourceReference?: string | null;
}
