import { z } from "zod";

/**
 * Scoring configuration.
 *
 * Every threshold an operator might reasonably want to change lives here, not
 * inside a React component and not inside the rules. Settings screens edit
 * this object; the engine only reads it.
 */

export const SCORING_MODEL_VERSION = "1.0.0";

/** Maximum points per dimension. They sum to 100 by construction. */
export const DIMENSION_MAX = {
  BUSINESS_FIT: 25,
  BUSINESS_STRENGTH: 20,
  WEBSITE_OPPORTUNITY: 40,
  REACHABILITY: 15,
} as const;

export const scoringConfigSchema = z.object({
  /**
   * Categories Novenworks actively wants. Matched case-insensitively against
   * the prospect's primary and secondary categories, as substrings, so
   * "plumber" matches "Plumber" and "Emergency Plumber".
   */
  targetCategories: z.array(z.string()).default([
    "plumber",
    "plumbing",
    "hvac",
    "heating",
    "air conditioning",
    "electrician",
    "roofing",
    "landscaping",
    "lawn care",
    "pest control",
    "med spa",
    "medspa",
    "dental",
    "dentist",
    "chiropractor",
    "physical therapy",
    "veterinar",
    "auto repair",
    "garage door",
    "pool service",
    "flooring",
    "remodel",
    "general contractor",
    "salon",
    "barber",
    "law firm",
    "attorney",
    "accounting",
    "insurance agency",
    "real estate",
  ]),

  /**
   * Categories that look local but are a poor fit — franchises with corporate
   * marketing, or businesses that do not buy websites.
   */
  excludedCategories: z.array(z.string()).default([
    "gas station",
    "atm",
    "post office",
    "public school",
    "government office",
    "city hall",
    "police",
    "fire station",
    "library",
    "bank branch",
    "supermarket",
    "convenience store",
  ]),

  /**
   * Regions Novenworks sells into. Empty means "no geographic preference", in
   * which case geography never scores or disqualifies.
   */
  targetRegions: z.array(z.string()).default(["CA", "California"]),

  /** Total at or above which the engine suggests QUALIFIED. */
  qualifyThreshold: z.number().int().min(0).max(100).default(70),
  /** Total below which the engine suggests DISQUALIFIED even with no hard blocker. */
  reviewFloor: z.number().int().min(0).max(100).default(30),

  /**
   * A visible agency credit disqualifies by default — someone else already has
   * the relationship. Operators can turn this into a warning instead.
   */
  agencyCreditDisqualifies: z.boolean().default(true),
  /**
   * Minimum detection confidence that counts as a real agency credit.
   * LOW-confidence matches ("powered by ...") never disqualify.
   */
  agencyCreditMinConfidence: z.enum(["MEDIUM", "HIGH"]).default("MEDIUM"),

  /** Review-count tiers for Business Strength, highest first. */
  reviewTiers: z
    .array(z.object({ min: z.number().int(), points: z.number().int(), label: z.string() }))
    .default([
      { min: 200, points: 12, label: "Very well established locally" },
      { min: 75, points: 10, label: "Well established locally" },
      { min: 25, points: 7, label: "Established local presence" },
      { min: 10, points: 4, label: "Some local presence" },
      { min: 1, points: 2, label: "Minimal review history" },
    ]),

  /**
   * Ratings only carry weight once there are enough reviews to mean anything.
   * Below this, rating scores a flat neutral value.
   */
  minReviewsForRating: z.number().int().default(10),
});

export type ScoringConfig = z.infer<typeof scoringConfigSchema>;

export const DEFAULT_SCORING_CONFIG: ScoringConfig = scoringConfigSchema.parse({});
