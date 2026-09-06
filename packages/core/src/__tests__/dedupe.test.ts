import { describe, expect, it } from "vitest";
import {
  DUPLICATE_SUGGESTION_THRESHOLD,
  buildIdentities,
  identifyingIdentities,
  isSharedHostDomain,
  weakDuplicateMatch,
} from "../dedupe";

describe("buildIdentities", () => {
  it("derives every strong identifier it can", () => {
    const identities = buildIdentities({
      provider: "google",
      externalId: "ChIJabc123",
      websiteUrl: "https://www.cedarpeak.com/home",
      phone: "(909) 555-0142",
      address: { line1: "418 W State St", city: "Redlands", region: "CA", postalCode: "92373" },
    });
    const kinds = identities.map((i) => i.kind);
    expect(kinds).toEqual(
      expect.arrayContaining(["PROVIDER_PLACE_ID", "ROOT_DOMAIN", "PHONE_E164", "ADDRESS_HASH"]),
    );
    expect(identities.find((i) => i.kind === "ROOT_DOMAIN")?.value).toBe("cedarpeak.com");
    expect(identities.find((i) => i.kind === "PHONE_E164")?.value).toBe("+19095550142");
  });

  it("namespaces provider ids so two providers cannot collide", () => {
    const google = buildIdentities({ provider: "google", externalId: "abc" });
    const other = buildIdentities({ provider: "yelp", externalId: "abc" });
    expect(google[0]!.namespace).toBe("google");
    expect(other[0]!.namespace).toBe("yelp");
  });

  it("omits identifiers it cannot normalize with confidence", () => {
    const identities = buildIdentities({ phone: "555-0142", websiteUrl: "not a url" });
    expect(identities).toEqual([]);
  });

  it("does not treat a city-only address as identifying", () => {
    const identities = buildIdentities({ address: { city: "Redlands", region: "CA" } });
    expect(identities.find((i) => i.kind === "ADDRESS_HASH")).toBeUndefined();
  });

  it("agrees on the same address written two ways", () => {
    const a = buildIdentities({ address: { line1: "1290 East Cooley Drive", city: "Colton", region: "CA" } });
    const b = buildIdentities({ address: { line1: "1290 E Cooley Dr", city: "Colton", region: "CA" } });
    expect(a[0]!.value).toBe(b[0]!.value);
  });
});

describe("shared host domains", () => {
  it("does not let a platform domain act as an identity", () => {
    expect(isSharedHostDomain("wixsite.com")).toBe(true);
    expect(isSharedHostDomain("cedarpeak.com")).toBe(false);

    const identities = buildIdentities({ websiteUrl: "https://cedarpeak.wixsite.com/home" });
    expect(identifyingIdentities(identities)).toEqual([]);
  });
});

describe("weakDuplicateMatch", () => {
  it("suggests a duplicate for the same name in the same city", () => {
    const result = weakDuplicateMatch(
      { name: "Summit HVAC & Air", city: "Colton", region: "CA" },
      { name: "Summit HVAC and Air Inc.", city: "Colton", region: "CA" },
    );
    expect(result.confidence).toBeGreaterThanOrEqual(DUPLICATE_SUGGESTION_THRESHOLD);
    expect(result.reasons).toContain("same_city");
  });

  it("does not suggest a duplicate for the same name in different cities", () => {
    const result = weakDuplicateMatch(
      { name: "Summit HVAC", city: "Colton", region: "CA" },
      { name: "Summit HVAC", city: "Fresno", region: "CA" },
    );
    expect(result.confidence).toBeLessThan(DUPLICATE_SUGGESTION_THRESHOLD);
  });

  it("ignores unrelated businesses entirely", () => {
    const result = weakDuplicateMatch(
      { name: "Cedar Peak Plumbing", city: "Redlands" },
      { name: "Juniper Skin Studio", city: "Redlands" },
    );
    expect(result.confidence).toBe(0);
    expect(result.reasons).toEqual([]);
  });
});
