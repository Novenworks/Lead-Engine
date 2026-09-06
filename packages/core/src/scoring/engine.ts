import type {
  Confidence,
  DisqualificationReason,
  Qualification,
  ScoreDimension,
  SignalInput,
  SignalType,
} from "../types";
import {
  DEFAULT_SCORING_CONFIG,
  DIMENSION_MAX,
  SCORING_MODEL_VERSION,
  type ScoringConfig,
} from "./config";

/**
 * The Opportunity Score.
 *
 * Rules, not a model. Every point is attributable to a named rule with a
 * plain-language reason and the signals that justified it, because the whole
 * value of this number is that an operator can disagree with it specifically.
 *
 * Design rules enforced here (see docs/SCORING.md):
 *  - No single weak signal moves the score much. Deficiencies compound.
 *  - "We didn't check" never scores the same as "we checked and it's bad".
 *  - Hard disqualifiers are separate from points; they never just subtract.
 */

export interface ScoringFacts {
  primaryCategory: string | null;
  secondaryCategories: string[];
  region: string | null;
  /** Provider-reported permanent closure. */
  businessClosed: boolean;

  rating: number | null;
  reviewCount: number | null;

  hasWebsite: boolean;
  /** null when enrichment has not run yet — distinct from false. */
  websiteReachable: boolean | null;
  usesHttps: boolean | null;
  hasTitle: boolean | null;
  hasMetaDescription: boolean | null;
  hasViewportMeta: boolean | null;
  hasContactLink: boolean | null;
  hasBookingLink: boolean | null;
  hasPhoneLink: boolean | null;
  domainRedirects: boolean;
  /** Homepage renders client-side, so shallow checks are unreliable. */
  renderRequired: boolean;

  hasPublicPhone: boolean;
  hasPublicEmail: boolean;

  agencyCredit: { confidence: Confidence; evidence: string | null } | null;
}

export interface ScoreComponentResult {
  dimension: ScoreDimension;
  key: string;
  label: string;
  points: number;
  maxPoints: number;
  reason: string;
  signalTypes: SignalType[];
  sortOrder: number;
}

export interface ScoreResult {
  total: number;
  businessFitScore: number;
  businessStrengthScore: number;
  websiteOpportunityScore: number;
  reachabilityScore: number;
  components: ScoreComponentResult[];
  disqualifiers: DisqualificationReason[];
  suggestedQualification: Qualification;
  modelVersion: string;
}

const CONFIDENCE_RANK: Record<Confidence, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function matchesAny(haystacks: Array<string | null>, needles: string[]): string | null {
  for (const haystack of haystacks) {
    if (!haystack) continue;
    const value = haystack.toLowerCase();
    for (const needle of needles) {
      if (value.includes(needle.toLowerCase())) return needle;
    }
  }
  return null;
}

/**
 * Build scoring facts from stored signals plus the prospect's own columns.
 * Kept separate from the engine so both the worker and tests can construct
 * facts without a database.
 */
export function factsFromSignals(
  signals: ReadonlyArray<
    Pick<
      SignalInput,
      "type" | "booleanValue" | "numericValue" | "value" | "confidence" | "evidence"
    >
  >,
  base: {
    primaryCategory?: string | null;
    secondaryCategories?: string[];
    region?: string | null;
    hasWebsite?: boolean;
    hasPublicPhone?: boolean;
    hasPublicEmail?: boolean;
  } = {},
): ScoringFacts {
  const byType = new Map<SignalType, (typeof signals)[number]>();
  for (const signal of signals) byType.set(signal.type, signal);

  const bool = (type: SignalType): boolean | null => {
    const signal = byType.get(type);
    if (!signal) return null;
    return signal.booleanValue ?? null;
  };

  const agency = byType.get("AGENCY_CREDIT_DETECTED");

  return {
    primaryCategory: base.primaryCategory ?? byType.get("BUSINESS_CATEGORY")?.value ?? null,
    secondaryCategories: base.secondaryCategories ?? [],
    region: base.region ?? null,
    businessClosed: bool("BUSINESS_CLOSED") === true,
    rating: byType.get("GOOGLE_RATING")?.numericValue ?? null,
    reviewCount: byType.get("GOOGLE_REVIEW_COUNT")?.numericValue ?? null,
    hasWebsite: base.hasWebsite ?? bool("WEBSITE_PRESENT") === true,
    websiteReachable: bool("WEBSITE_FETCH_FAILED") === true ? false : bool("WEBSITE_REACHABLE"),
    usesHttps: bool("HTTPS_PRESENT"),
    hasTitle: bool("TITLE_PRESENT"),
    hasMetaDescription: bool("META_DESCRIPTION_PRESENT"),
    hasViewportMeta: bool("VIEWPORT_META_PRESENT"),
    hasContactLink: bool("CONTACT_LINK_PRESENT"),
    hasBookingLink: bool("BOOKING_LINK_PRESENT"),
    hasPhoneLink: bool("PHONE_LINK_PRESENT"),
    domainRedirects: bool("DOMAIN_REDIRECT") === true,
    renderRequired: bool("RENDER_REQUIRED") === true,
    hasPublicPhone: base.hasPublicPhone ?? bool("PHONE_PRESENT") === true,
    hasPublicEmail: base.hasPublicEmail ?? bool("PUBLIC_EMAIL_PRESENT") === true,
    agencyCredit: agency
      ? { confidence: agency.confidence ?? "MEDIUM", evidence: agency.evidence ?? null }
      : null,
  };
}

// --- Dimension: Business Fit ------------------------------------------------

function scoreBusinessFit(
  facts: ScoringFacts,
  config: ScoringConfig,
  push: (c: ScoreComponentResult) => void,
): { score: number; disqualifiers: DisqualificationReason[] } {
  const disqualifiers: DisqualificationReason[] = [];
  const categories = [facts.primaryCategory, ...facts.secondaryCategories];

  const excluded = matchesAny(categories, config.excludedCategories);
  const target = matchesAny(categories, config.targetCategories);

  let categoryPoints: number;
  let categoryReason: string;
  if (excluded) {
    categoryPoints = 0;
    categoryReason = `"${facts.primaryCategory ?? "unknown"}" is on the excluded-category list (${excluded}).`;
    disqualifiers.push("WRONG_CATEGORY");
  } else if (target) {
    categoryPoints = 20;
    categoryReason = `Matches target category "${target}".`;
  } else if (facts.primaryCategory) {
    categoryPoints = 8;
    categoryReason = `"${facts.primaryCategory}" is a local business but not on the target list.`;
  } else {
    categoryPoints = 5;
    categoryReason = "No category recorded yet — scored as unknown, not as a bad fit.";
  }

  push({
    dimension: "BUSINESS_FIT",
    key: "target_category",
    label: "Target category",
    points: categoryPoints,
    maxPoints: 20,
    reason: categoryReason,
    signalTypes: ["BUSINESS_CATEGORY"],
    sortOrder: 10,
  });

  let geoPoints = 0;
  let geoReason: string;
  if (config.targetRegions.length === 0) {
    geoPoints = 5;
    geoReason = "No target regions configured, so geography does not affect fit.";
  } else if (!facts.region) {
    geoPoints = 2;
    geoReason = "No region recorded — cannot confirm the business is in the target area.";
  } else if (matchesAny([facts.region], config.targetRegions)) {
    geoPoints = 5;
    geoReason = `${facts.region} is inside the target service area.`;
  } else {
    geoPoints = 0;
    geoReason = `${facts.region} is outside the configured target regions.`;
    disqualifiers.push("OUT_OF_AREA");
  }

  push({
    dimension: "BUSINESS_FIT",
    key: "target_geography",
    label: "Target geography",
    points: geoPoints,
    maxPoints: 5,
    reason: geoReason,
    signalTypes: ["IN_TARGET_GEOGRAPHY"],
    sortOrder: 20,
  });

  return { score: clamp(categoryPoints + geoPoints, 0, DIMENSION_MAX.BUSINESS_FIT), disqualifiers };
}

// --- Dimension: Business Strength -------------------------------------------

function scoreBusinessStrength(
  facts: ScoringFacts,
  config: ScoringConfig,
  push: (c: ScoreComponentResult) => void,
): { score: number; disqualifiers: DisqualificationReason[] } {
  const disqualifiers: DisqualificationReason[] = [];
  const reviews = facts.reviewCount ?? 0;

  const tier = config.reviewTiers
    .slice()
    .sort((a, b) => b.min - a.min)
    .find((t) => reviews >= t.min);

  const reviewPoints = tier?.points ?? 0;
  push({
    dimension: "BUSINESS_STRENGTH",
    key: "review_volume",
    label: "Review volume",
    points: reviewPoints,
    maxPoints: 12,
    reason:
      facts.reviewCount === null
        ? "No review data yet. Scored as unknown — a low review count on its own is not a reason to skip a business."
        : `${reviews} review${reviews === 1 ? "" : "s"}. ${tier?.label ?? "No review history found."}`,
    signalTypes: ["GOOGLE_REVIEW_COUNT"],
    sortOrder: 30,
  });

  let ratingPoints: number;
  let ratingReason: string;
  if (facts.rating === null) {
    ratingPoints = 2;
    ratingReason = "No rating data yet.";
  } else if (reviews < config.minReviewsForRating) {
    ratingPoints = 2;
    ratingReason = `${facts.rating.toFixed(1)} stars from only ${reviews} reviews — too few to read anything into.`;
  } else if (facts.rating >= 4.5) {
    ratingPoints = 8;
    ratingReason = `${facts.rating.toFixed(1)} stars across ${reviews} reviews — strong local reputation.`;
  } else if (facts.rating >= 4.0) {
    ratingPoints = 6;
    ratingReason = `${facts.rating.toFixed(1)} stars across ${reviews} reviews — solid reputation.`;
  } else if (facts.rating >= 3.5) {
    ratingPoints = 3;
    ratingReason = `${facts.rating.toFixed(1)} stars — mixed reputation.`;
  } else {
    ratingPoints = 1;
    ratingReason = `${facts.rating.toFixed(1)} stars — a weak reputation makes this a harder sale.`;
  }

  push({
    dimension: "BUSINESS_STRENGTH",
    key: "reputation",
    label: "Reputation",
    points: ratingPoints,
    maxPoints: 8,
    reason: ratingReason,
    signalTypes: ["GOOGLE_RATING", "GOOGLE_REVIEW_COUNT"],
    sortOrder: 40,
  });

  if (facts.businessClosed) {
    disqualifiers.push("BUSINESS_CLOSED");
  }

  return {
    score: clamp(reviewPoints + ratingPoints, 0, DIMENSION_MAX.BUSINESS_STRENGTH),
    disqualifiers,
  };
}

// --- Dimension: Website Opportunity -----------------------------------------

function scoreWebsiteOpportunity(
  facts: ScoringFacts,
  push: (c: ScoreComponentResult) => void,
): number {
  // No website at all: a real opportunity, but capped below "broken site"
  // because a business with no web presence is often also not a buyer.
  if (!facts.hasWebsite) {
    push({
      dimension: "WEBSITE_OPPORTUNITY",
      key: "no_website",
      label: "No website found",
      points: 30,
      maxPoints: 40,
      reason: "No website on file. The whole web presence is the opportunity.",
      signalTypes: ["WEBSITE_PRESENT"],
      sortOrder: 50,
    });
    return 30;
  }

  if (facts.websiteReachable === null) {
    push({
      dimension: "WEBSITE_OPPORTUNITY",
      key: "not_enriched",
      label: "Website not inspected yet",
      points: 0,
      maxPoints: 40,
      reason: "Shallow website enrichment has not run. Run it before trusting this score.",
      signalTypes: ["WEBSITE_REACHABLE"],
      sortOrder: 50,
    });
    return 0;
  }

  if (facts.websiteReachable === false) {
    push({
      dimension: "WEBSITE_OPPORTUNITY",
      key: "website_unreachable",
      label: "Website does not load",
      points: 34,
      maxPoints: 40,
      reason: "The site failed to load. A broken or parked domain is the strongest opening we get.",
      signalTypes: ["WEBSITE_FETCH_FAILED", "WEBSITE_REACHABLE"],
      sortOrder: 50,
    });
    return 34;
  }

  let total = 0;
  const add = (
    key: string,
    label: string,
    points: number,
    maxPoints: number,
    reason: string,
    signalTypes: SignalType[],
    sortOrder: number,
  ) => {
    total += points;
    push({
      dimension: "WEBSITE_OPPORTUNITY",
      key,
      label,
      points,
      maxPoints,
      reason,
      signalTypes,
      sortOrder,
    });
  };

  add(
    "https",
    "HTTPS",
    facts.usesHttps === false ? 8 : 0,
    8,
    facts.usesHttps === false
      ? "Served over plain HTTP. Browsers mark it as not secure, and it is an easy, credible thing to fix."
      : "Served over HTTPS.",
    ["HTTPS_PRESENT"],
    51,
  );

  add(
    "mobile_viewport",
    "Mobile readiness",
    facts.hasViewportMeta === false ? 8 : 0,
    8,
    facts.hasViewportMeta === false
      ? "No responsive viewport tag — the site was very likely never built for phones."
      : "Responsive viewport tag present, so the site is at least mobile-aware.",
    ["VIEWPORT_META_PRESENT"],
    52,
  );

  // Conversion path: the combination is what matters, not either alone.
  const noContact = facts.hasContactLink === false;
  const noBooking = facts.hasBookingLink === false;
  let conversionPoints = 0;
  let conversionReason: string;
  if (noContact && noBooking) {
    conversionPoints = 12;
    conversionReason =
      "No quote/contact CTA and no booking link on the homepage. A visitor who wants to buy has nowhere obvious to go.";
  } else if (noContact) {
    conversionPoints = 4;
    conversionReason = "No obvious quote or contact CTA, though a booking link exists.";
  } else if (noBooking) {
    conversionPoints = 2;
    conversionReason = "Contact CTA present but no online booking.";
  } else {
    conversionPoints = 0;
    conversionReason = "Both a contact CTA and a booking path are present.";
  }
  add(
    "conversion_path",
    "Conversion path",
    conversionPoints,
    12,
    conversionReason,
    ["CONTACT_LINK_PRESENT", "BOOKING_LINK_PRESENT"],
    53,
  );

  add(
    "click_to_call",
    "Click to call",
    facts.hasPhoneLink === false ? 4 : 0,
    4,
    facts.hasPhoneLink === false
      ? "No tel: link. Mobile visitors cannot tap to call."
      : "Click-to-call link present.",
    ["PHONE_LINK_PRESENT"],
    54,
  );

  // Metadata is worth a little. It is never the story on its own — a missing
  // meta description is a nudge, not a 40-point opportunity.
  const metaPoints =
    (facts.hasTitle === false ? 4 : 0) + (facts.hasMetaDescription === false ? 2 : 0);
  add(
    "page_metadata",
    "Page metadata",
    metaPoints,
    6,
    metaPoints === 0
      ? "Title and meta description are present."
      : [
          facts.hasTitle === false ? "no <title>" : null,
          facts.hasMetaDescription === false ? "no meta description" : null,
        ]
          .filter(Boolean)
          .join(", ") + " — minor on its own, worth mentioning alongside the rest.",
    ["TITLE_PRESENT", "META_DESCRIPTION_PRESENT"],
    55,
  );

  if (facts.domainRedirects) {
    add(
      "domain_redirect",
      "Domain redirect",
      4,
      4,
      "The domain redirects somewhere else — often a stale domain or a platform landing page.",
      ["DOMAIN_REDIRECT"],
      56,
    );
  }

  if (facts.renderRequired) {
    push({
      dimension: "WEBSITE_OPPORTUNITY",
      key: "render_limited",
      label: "Shallow inspection limited",
      points: 0,
      maxPoints: 0,
      reason:
        "The homepage renders client-side, so the checks above may understate what the site actually has. Run an audit before drawing conclusions.",
      signalTypes: ["RENDER_REQUIRED"],
      sortOrder: 57,
    });
  }

  if (total === 0) {
    push({
      dimension: "WEBSITE_OPPORTUNITY",
      key: "competent_site",
      label: "Site looks competent",
      points: 0,
      maxPoints: 40,
      reason:
        "None of the shallow checks found a problem. There may still be an opportunity, but it is not visible from here.",
      signalTypes: [],
      sortOrder: 58,
    });
  }

  return clamp(total, 0, DIMENSION_MAX.WEBSITE_OPPORTUNITY);
}

// --- Dimension: Reachability ------------------------------------------------

function scoreReachability(
  facts: ScoringFacts,
  push: (c: ScoreComponentResult) => void,
): { score: number; disqualifiers: DisqualificationReason[] } {
  const disqualifiers: DisqualificationReason[] = [];

  const phonePoints = facts.hasPublicPhone ? 7 : 0;
  push({
    dimension: "REACHABILITY",
    key: "public_phone",
    label: "Public phone",
    points: phonePoints,
    maxPoints: 7,
    reason: facts.hasPublicPhone
      ? "A public business phone number is on file."
      : "No public phone number found.",
    signalTypes: ["PHONE_PRESENT"],
    sortOrder: 60,
  });

  const emailPoints = facts.hasPublicEmail ? 5 : 0;
  push({
    dimension: "REACHABILITY",
    key: "public_email",
    label: "Public email",
    points: emailPoints,
    maxPoints: 5,
    reason: facts.hasPublicEmail
      ? "A public business email address is on file."
      : "No public business email found.",
    signalTypes: ["PUBLIC_EMAIL_PRESENT"],
    sortOrder: 61,
  });

  const webFormPoints = facts.hasContactLink === true || facts.hasBookingLink === true ? 3 : 0;
  push({
    dimension: "REACHABILITY",
    key: "web_contact_path",
    label: "Website contact path",
    points: webFormPoints,
    maxPoints: 3,
    reason:
      webFormPoints > 0
        ? "The website offers a contact or booking path."
        : "No contact or booking path on the website.",
    signalTypes: ["CONTACT_LINK_PRESENT", "BOOKING_LINK_PRESENT"],
    sortOrder: 62,
  });

  const score = clamp(phonePoints + emailPoints + webFormPoints, 0, DIMENSION_MAX.REACHABILITY);
  if (!facts.hasPublicPhone && !facts.hasPublicEmail && !facts.hasWebsite) {
    disqualifiers.push("NOT_REACHABLE");
  }
  return { score, disqualifiers };
}

// --- Engine -----------------------------------------------------------------

/**
 * Score a prospect. Pure: same facts and config always give the same result.
 */
export function scoreProspect(
  facts: ScoringFacts,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): ScoreResult {
  const components: ScoreComponentResult[] = [];
  const push = (c: ScoreComponentResult) => components.push(c);

  const fit = scoreBusinessFit(facts, config, push);
  const strength = scoreBusinessStrength(facts, config, push);
  const websiteOpportunityScore = scoreWebsiteOpportunity(facts, push);
  const reach = scoreReachability(facts, push);

  const disqualifiers = [...fit.disqualifiers, ...strength.disqualifiers, ...reach.disqualifiers];

  // Agency credit: a separate, visible verdict rather than a silent penalty.
  if (facts.agencyCredit) {
    const meetsBar =
      CONFIDENCE_RANK[facts.agencyCredit.confidence] >=
      CONFIDENCE_RANK[config.agencyCreditMinConfidence];
    const blocks = config.agencyCreditDisqualifies && meetsBar;
    if (blocks) disqualifiers.push("AGENCY_MANAGED");

    push({
      dimension: "DISQUALIFIER",
      key: "agency_credit",
      label: "Agency credit",
      points: 0,
      maxPoints: 0,
      reason: blocks
        ? `Visible agency credit (${facts.agencyCredit.confidence.toLowerCase()} confidence): ${facts.agencyCredit.evidence ?? "credit found in the footer"}. Another agency already owns this relationship.`
        : `Possible agency credit (${facts.agencyCredit.confidence.toLowerCase()} confidence): ${facts.agencyCredit.evidence ?? "credit text found"}. Not treated as disqualifying under the current settings.`,
      signalTypes: ["AGENCY_CREDIT_DETECTED"],
      sortOrder: 90,
    });
  } else {
    push({
      dimension: "DISQUALIFIER",
      key: "agency_credit",
      label: "Agency credit",
      points: 0,
      maxPoints: 0,
      reason: "No visible agency or developer credit found on the site.",
      signalTypes: ["AGENCY_CREDIT_DETECTED"],
      sortOrder: 90,
    });
  }

  const total = clamp(fit.score + strength.score + websiteOpportunityScore + reach.score, 0, 100);

  // A weak business with a terrible website can otherwise clear the threshold
  // on website opportunity alone. Opportunity is only worth what the business
  // is worth, so hold those in REVIEW rather than qualifying them.
  const understrength =
    config.minBusinessStrengthToQualify > 0 && strength.score < config.minBusinessStrengthToQualify;

  if (understrength) {
    push({
      dimension: "DISQUALIFIER",
      key: "business_strength_gate",
      label: "Not enough business evidence",
      points: 0,
      maxPoints: 0,
      reason: `Business strength is ${strength.score} of ${DIMENSION_MAX.BUSINESS_STRENGTH}, below the ${config.minBusinessStrengthToQualify} needed to qualify. The website opportunity may be real, but there is not yet evidence this business is established enough to be worth the effort. Held for review rather than qualified.`,
      signalTypes: ["GOOGLE_REVIEW_COUNT", "GOOGLE_RATING"],
      sortOrder: 91,
    });
  }

  const unique = [...new Set(disqualifiers)];
  let suggestedQualification: Qualification;
  if (unique.length > 0) {
    suggestedQualification = "DISQUALIFIED";
  } else if (total < config.reviewFloor) {
    suggestedQualification = "DISQUALIFIED";
    unique.push("NO_RELEVANT_OPPORTUNITY");
  } else if (total >= config.qualifyThreshold && !understrength) {
    suggestedQualification = "QUALIFIED";
  } else {
    suggestedQualification = "REVIEW";
  }

  components.sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    total,
    businessFitScore: fit.score,
    businessStrengthScore: strength.score,
    websiteOpportunityScore,
    reachabilityScore: reach.score,
    components,
    disqualifiers: unique,
    suggestedQualification,
    modelVersion: SCORING_MODEL_VERSION,
  };
}
