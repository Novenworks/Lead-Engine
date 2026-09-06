import { describe, expect, it } from "vitest";
import {
  addressHash,
  normalizeAddress,
  normalizeBusinessName,
  normalizeEmail,
  normalizePhone,
  normalizeWebsiteUrl,
  rootDomain,
} from "../normalize";

describe("normalizeBusinessName", () => {
  it("collapses legal suffixes, punctuation and case", () => {
    expect(normalizeBusinessName("Cedar Peak Plumbing, LLC")).toBe("cedar peak plumbing");
    expect(normalizeBusinessName("  CEDAR   PEAK Plumbing ")).toBe("cedar peak plumbing");
    expect(normalizeBusinessName("Cedar Peak Plumbing Inc.")).toBe("cedar peak plumbing");
  });

  it("treats & and 'and' as the same token", () => {
    expect(normalizeBusinessName("Summit HVAC & Air")).toBe(
      normalizeBusinessName("Summit HVAC and Air"),
    );
  });

  it("strips accents", () => {
    expect(normalizeBusinessName("Café Ürban")).toBe("cafe urban");
  });

  it("never normalizes a name away entirely", () => {
    expect(normalizeBusinessName("The Co")).toBe("the co");
  });
});

describe("rootDomain", () => {
  it("returns eTLD+1 without www", () => {
    expect(rootDomain("www.cedarpeak.com")).toBe("cedarpeak.com");
    expect(rootDomain("shop.cedarpeak.com")).toBe("cedarpeak.com");
    expect(rootDomain("CedarPeak.COM.")).toBe("cedarpeak.com");
  });

  it("handles multi-label public suffixes", () => {
    expect(rootDomain("shop.example.co.uk")).toBe("example.co.uk");
  });
});

describe("normalizeWebsiteUrl", () => {
  it("adds a scheme when the operator omits one", () => {
    expect(normalizeWebsiteUrl("cedarpeak.com")?.url).toBe("https://cedarpeak.com/");
    expect(normalizeWebsiteUrl("cedarpeak.com")?.rootDomain).toBe("cedarpeak.com");
  });

  it("rejects non-http schemes and hostnames without a dot", () => {
    expect(normalizeWebsiteUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeWebsiteUrl("ftp://files.example.com")).toBeNull();
    expect(normalizeWebsiteUrl("localhost")).toBeNull();
    expect(normalizeWebsiteUrl("")).toBeNull();
    expect(normalizeWebsiteUrl(null)).toBeNull();
  });

  it("records whether the URL is https", () => {
    expect(normalizeWebsiteUrl("http://cedarpeak.com")?.usesHttps).toBe(false);
    expect(normalizeWebsiteUrl("https://cedarpeak.com")?.usesHttps).toBe(true);
  });
});

describe("normalizePhone", () => {
  it("normalizes NANP numbers to E.164", () => {
    expect(normalizePhone("(909) 555-0142")).toBe("+19095550142");
    expect(normalizePhone("909.555.0142")).toBe("+19095550142");
    expect(normalizePhone("1-909-555-0142")).toBe("+19095550142");
  });

  it("keeps already-international numbers", () => {
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("refuses to guess when the digit count is not plausible", () => {
    expect(normalizePhone("555-0142")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
  });
});

describe("normalizeAddress", () => {
  it("folds street abbreviations so the same address agrees", () => {
    const a = normalizeAddress({
      line1: "1290 East Cooley Drive",
      city: "Colton",
      region: "CA",
      postalCode: "92324",
    });
    const b = normalizeAddress({
      line1: "1290 E Cooley Dr",
      city: "Colton",
      region: "CA",
      postalCode: "92324",
    });
    expect(a).toBe(b);
    expect(addressHash(a!)).toBe(addressHash(b!));
  });

  it("returns null when there is nothing to normalize", () => {
    expect(normalizeAddress({})).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("lowercases valid addresses and rejects malformed ones", () => {
    expect(normalizeEmail("  Hello@Example.COM ")).toBe("hello@example.com");
    expect(normalizeEmail("not-an-email")).toBeNull();
  });
});
