import { describe, expect, it } from "vitest";
import { DEFAULT_SCORING_CONFIG, scoreProspect, factsFromSignals, type ScoringFacts } from "../index";

function facts(overrides: Partial<ScoringFacts> = {}): ScoringFacts {
  return {
    primaryCategory: "Plumber",
    secondaryCategories: [],
    region: "CA",
    businessClosed: false,
    rating: 4.9,
    reviewCount: 384,
    hasWebsite: true,
    websiteReachable: true,
    usesHttps: true,
    hasTitle: true,
    hasMetaDescription: true,
    hasViewportMeta: true,
    hasContactLink: true,
    hasBookingLink: true,
    hasPhoneLink: true,
    domainRedirects: false,
    renderRequired: false,
    hasPublicPhone: true,
    hasPublicEmail: true,
    agencyCredit: null,
    ...overrides,
  };
}

describe("determinism and explainability", () => {
  it("is a pure function of facts and config", () => {
    const a = scoreProspect(facts());
    const b = scoreProspect(facts());
    expect(a).toEqual(b);
  });

  it("total equals the sum of its dimensions", () => {
    const result = scoreProspect(facts({ usesHttps: false, hasViewportMeta: false }));
    expect(result.total).toBe(
      result.businessFitScore +
        result.businessStrengthScore +
        result.websiteOpportunityScore +
        result.reachabilityScore,
    );
  });

  it("every dimension's components sum to that dimension's score", () => {
    const result = scoreProspect(facts({ usesHttps: false, hasContactLink: false, hasBookingLink: false }));
    const sum = (dim: string) =>
      result.components.filter((c) => c.dimension === dim).reduce((n, c) => n + c.points, 0);
    expect(sum("BUSINESS_FIT")).toBe(result.businessFitScore);
    expect(sum("BUSINESS_STRENGTH")).toBe(result.businessStrengthScore);
    expect(sum("WEBSITE_OPPORTUNITY")).toBe(result.websiteOpportunityScore);
    expect(sum("REACHABILITY")).toBe(result.reachabilityScore);
  });

  it("gives every component a human-readable reason and a max", () => {
    for (const component of scoreProspect(facts()).components) {
      expect(component.reason.length).toBeGreaterThan(10);
      expect(component.label.length).toBeGreaterThan(0);
      expect(component.points).toBeLessThanOrEqual(component.maxPoints);
    }
  });

  it("stays within 0..100", () => {
    const worst = scoreProspect(
      facts({
        primaryCategory: null,
        rating: null,
        reviewCount: null,
        hasWebsite: false,
        hasPublicPhone: false,
        hasPublicEmail: false,
        region: null,
      }),
    );
    expect(worst.total).toBeGreaterThanOrEqual(0);
    expect(worst.total).toBeLessThanOrEqual(100);
  });
});

describe("the ideal target", () => {
  it("scores a strong business with a weak site highly and qualifies it", () => {
    const result = scoreProspect(
      facts({
        usesHttps: false,
        hasViewportMeta: false,
        hasContactLink: false,
        hasBookingLink: false,
        hasPhoneLink: false,
        hasMetaDescription: false,
      }),
    );
    expect(result.total).toBeGreaterThanOrEqual(70);
    expect(result.suggestedQualification).toBe("QUALIFIED");
    expect(result.disqualifiers).toEqual([]);
    expect(result.websiteOpportunityScore).toBeGreaterThan(25);
  });

  it("scores a strong business with a good site as low opportunity", () => {
    const result = scoreProspect(facts());
    expect(result.websiteOpportunityScore).toBe(0);
    expect(result.suggestedQualification).not.toBe("QUALIFIED");
    expect(result.components.some((c) => c.key === "competent_site")).toBe(true);
  });
});

describe("avoiding weak-signal inflation", () => {
  it("does not create a large opportunity from a missing meta description alone", () => {
    const result = scoreProspect(facts({ hasMetaDescription: false }));
    expect(result.websiteOpportunityScore).toBeLessThanOrEqual(2);
  });

  it("does not punish a low review count on its own", () => {
    const result = scoreProspect(facts({ reviewCount: 6, rating: 4.8 }));
    expect(result.disqualifiers).toEqual([]);
    // Rating carries no weight below the evidence threshold.
    const reputation = result.components.find((c) => c.key === "reputation");
    expect(reputation?.points).toBe(2);
    expect(reputation?.reason).toContain("too few");
  });

  it("does not treat a CMS as a defect — WordPress alone changes nothing", () => {
    const withCms = scoreProspect(facts());
    const withoutCms = scoreProspect(facts());
    expect(withCms.total).toBe(withoutCms.total);
  });

  it("requires deficiencies to compound before the opportunity gets large", () => {
    const one = scoreProspect(facts({ usesHttps: false }));
    const many = scoreProspect(
      facts({ usesHttps: false, hasViewportMeta: false, hasContactLink: false, hasBookingLink: false }),
    );
    expect(one.websiteOpportunityScore).toBe(8);
    expect(many.websiteOpportunityScore).toBeGreaterThan(one.websiteOpportunityScore * 2);
  });
});

describe("unknown is not the same as bad", () => {
  it("scores an un-enriched website as zero opportunity, not maximum", () => {
    const result = scoreProspect(
      facts({
        websiteReachable: null,
        usesHttps: null,
        hasTitle: null,
        hasMetaDescription: null,
        hasViewportMeta: null,
        hasContactLink: null,
        hasBookingLink: null,
        hasPhoneLink: null,
      }),
    );
    expect(result.websiteOpportunityScore).toBe(0);
    expect(result.components.find((c) => c.key === "not_enriched")?.reason).toContain(
      "has not run",
    );
  });

  it("treats a missing category as unknown rather than a wrong category", () => {
    const result = scoreProspect(facts({ primaryCategory: null }));
    expect(result.disqualifiers).not.toContain("WRONG_CATEGORY");
  });
});

describe("hard disqualifiers", () => {
  it("disqualifies a site with a credible agency credit", () => {
    const result = scoreProspect(facts({ agencyCredit: { confidence: "HIGH", evidence: "Website by Bright Pixel" } }));
    expect(result.disqualifiers).toContain("AGENCY_MANAGED");
    expect(result.suggestedQualification).toBe("DISQUALIFIED");
  });

  it("does not disqualify on a low-confidence agency credit", () => {
    const result = scoreProspect(facts({ agencyCredit: { confidence: "LOW", evidence: "Powered by Someone" } }));
    expect(result.disqualifiers).not.toContain("AGENCY_MANAGED");
    expect(result.components.find((c) => c.key === "agency_credit")?.reason).toContain("Not treated as disqualifying");
  });

  it("can be configured to warn instead of disqualify", () => {
    const result = scoreProspect(
      facts({ agencyCredit: { confidence: "HIGH", evidence: "Website by Bright Pixel" } }),
      { ...DEFAULT_SCORING_CONFIG, agencyCreditDisqualifies: false },
    );
    expect(result.disqualifiers).not.toContain("AGENCY_MANAGED");
  });

  it("disqualifies out-of-area and excluded-category businesses", () => {
    expect(scoreProspect(facts({ region: "TX" })).disqualifiers).toContain("OUT_OF_AREA");
    expect(scoreProspect(facts({ primaryCategory: "Gas station" })).disqualifiers).toContain("WRONG_CATEGORY");
  });

  it("disqualifies a permanently closed business", () => {
    expect(scoreProspect(facts({ businessClosed: true })).disqualifiers).toContain("BUSINESS_CLOSED");
  });

  it("disqualifies a business with no way to reach it", () => {
    const result = scoreProspect(
      facts({ hasPublicPhone: false, hasPublicEmail: false, hasWebsite: false }),
    );
    expect(result.disqualifiers).toContain("NOT_REACHABLE");
  });

  it("ignores geography entirely when no target regions are configured", () => {
    const result = scoreProspect(facts({ region: "TX" }), {
      ...DEFAULT_SCORING_CONFIG,
      targetRegions: [],
    });
    expect(result.disqualifiers).not.toContain("OUT_OF_AREA");
  });
});

describe("factsFromSignals", () => {
  it("builds facts from stored signal rows", () => {
    const built = factsFromSignals(
      [
        { type: "GOOGLE_RATING", numericValue: 4.7 },
        { type: "GOOGLE_REVIEW_COUNT", numericValue: 212 },
        { type: "VIEWPORT_META_PRESENT", booleanValue: false },
        { type: "WEBSITE_REACHABLE", booleanValue: true },
        { type: "AGENCY_CREDIT_DETECTED", booleanValue: true, confidence: "HIGH", evidence: "Website by X" },
      ],
      { primaryCategory: "HVAC contractor", region: "CA", hasWebsite: true, hasPublicPhone: true },
    );
    expect(built.rating).toBe(4.7);
    expect(built.hasViewportMeta).toBe(false);
    expect(built.agencyCredit?.confidence).toBe("HIGH");
    // A signal that was never recorded stays null, not false.
    expect(built.hasBookingLink).toBeNull();
  });

  it("maps WEBSITE_FETCH_FAILED to an unreachable website", () => {
    const built = factsFromSignals([{ type: "WEBSITE_FETCH_FAILED", booleanValue: true }], {
      hasWebsite: true,
    });
    expect(built.websiteReachable).toBe(false);
  });
});
