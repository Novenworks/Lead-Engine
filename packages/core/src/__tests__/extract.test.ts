import { describe, expect, it } from "vitest";
import { extractObservations, observationsToSignals } from "../website/extract";
import { detectAgencyCredit } from "../website/agency";
import type { FetchSuccess } from "../website/fetch";

function page(html: string, finalUrl = "https://cedarpeak.example/"): FetchSuccess {
  return {
    ok: true,
    finalUrl,
    status: 200,
    html,
    contentType: "text/html",
    usesHttps: finalUrl.startsWith("https:"),
    redirected: false,
    redirectChain: [],
    responseMs: 120,
    truncated: false,
  };
}

const GOOD_SITE = `<!doctype html>
<html><head>
  <title>Cedar Peak Plumbing — Redlands, CA</title>
  <meta name="description" content="Emergency plumbing in Redlands.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head><body>
  <a href="tel:+19095550142">Call (909) 555-0142</a>
  <a href="/contact">Get a free estimate</a>
  <a href="https://calendly.com/cedarpeak">Book online</a>
  <a href="https://facebook.com/cedarpeak">Facebook</a>
  <a href="mailto:office@cedarpeak.example">Email us</a>
  <p>Serving the Inland Empire since 1998.</p>
  <footer><p>&copy; 2026 Cedar Peak Plumbing</p></footer>
</body></html>`;

const WEAK_SITE = `<!doctype html>
<html><head><title></title></head><body>
  <h1>Ironwood Roofing</h1>
  <p>Call us at 909-555-0165 during business hours.</p>
</body></html>`;

describe("extractObservations", () => {
  it("reads metadata, CTAs and contacts from a well-built page", () => {
    const obs = extractObservations(page(GOOD_SITE));
    expect(obs.title).toBe("Cedar Peak Plumbing — Redlands, CA");
    expect(obs.metaDescription).toBe("Emergency plumbing in Redlands.");
    expect(obs.hasViewportMeta).toBe(true);
    expect(obs.hasPhoneLink).toBe(true);
    expect(obs.hasContactLink).toBe(true);
    expect(obs.hasBookingLink).toBe(true);
    expect(obs.socialLinks.some((l) => l.includes("facebook.com"))).toBe(true);
    expect(obs.emails).toContain("office@cedarpeak.example");
    expect(obs.agencyCredit).toBeNull();
  });

  it("records absence explicitly on a weak page", () => {
    const obs = extractObservations(page(WEAK_SITE));
    expect(obs.title).toBeNull();
    expect(obs.metaDescription).toBeNull();
    expect(obs.hasViewportMeta).toBe(false);
    expect(obs.hasPhoneLink).toBe(false);
    expect(obs.hasContactLink).toBe(false);
    expect(obs.hasBookingLink).toBe(false);
  });

  it("fingerprints common platforms", () => {
    const wp = extractObservations(
      page(`<html><body><link href="/wp-content/themes/x/a.css"></body></html>`),
    );
    expect(wp.cmsHint).toBe("WordPress");
    const shopify = extractObservations(
      page(`<html><body><script src="https://cdn.shopify.com/s/x.js"></script></body></html>`),
    );
    expect(shopify.cmsHint).toBe("Shopify");
  });

  it("flags pages that need a browser to render", () => {
    const spa = extractObservations(
      page(`<html><body><div id="root"></div><script>var __NEXT_DATA__={}</script></body></html>`),
    );
    expect(spa.renderRequired).toBe(true);
  });
});

describe("agency credit detection", () => {
  it("detects a linked agency credit with high confidence", () => {
    const html = `<html><body><footer>
      <p>&copy; 2026 Summit HVAC. Website by <a href="https://brightpixelstudio.example">Bright Pixel Studio</a></p>
    </footer></body></html>`;
    const obs = extractObservations(page(html, "https://summithvac.example/"));
    expect(obs.agencyCredit).not.toBeNull();
    expect(obs.agencyCredit?.confidence).toBe("HIGH");
    expect(obs.agencyCredit?.linkDomain).toBe("brightpixelstudio.example");
  });

  it("detects an unlinked credit with medium confidence", () => {
    const result = detectAgencyCredit({
      text: "© 2026 Summit HVAC. Designed by Bright Pixel Studio",
      links: [],
      siteRootDomain: "summithvac.example",
    });
    expect(result?.confidence).toBe("MEDIUM");
  });

  it("ignores platform badges like Powered by WordPress", () => {
    for (const text of [
      "Powered by WordPress",
      "Proudly powered by Shopify",
      "Powered by Squarespace",
      "Powered by Wix.com",
      "Powered by Housecall Pro",
    ]) {
      expect(detectAgencyCredit({ text, links: [], siteRootDomain: "x.example" }), text).toBeNull();
    }
  });

  it("ignores a credit that names the business itself", () => {
    const result = detectAgencyCredit({
      text: "Website by the Cedarpeak team",
      links: [],
      siteRootDomain: "cedarpeak.example",
    });
    expect(result).toBeNull();
  });

  it("treats a non-platform 'powered by' as low confidence only", () => {
    const result = detectAgencyCredit({
      text: "Powered by Redlands Marketing Group",
      links: [],
      siteRootDomain: "x.example",
    });
    expect(result?.confidence).toBe("LOW");
  });
});

describe("observationsToSignals", () => {
  it("always emits boolean signals so 'checked and absent' differs from 'never checked'", () => {
    const fetched = page(WEAK_SITE);
    const signals = observationsToSignals(
      fetched,
      extractObservations(fetched),
      "https://cedarpeak.example/",
    );
    const byType = new Map(signals.map((s) => [s.type, s]));

    expect(byType.get("WEBSITE_REACHABLE")?.booleanValue).toBe(true);
    expect(byType.get("TITLE_PRESENT")?.booleanValue).toBe(false);
    expect(byType.get("VIEWPORT_META_PRESENT")?.booleanValue).toBe(false);
    expect(byType.get("CONTACT_LINK_PRESENT")?.booleanValue).toBe(false);
    // Evidence is human-readable, not a raw dump.
    expect(byType.get("VIEWPORT_META_PRESENT")?.evidence).toContain("viewport");
  });

  it("emits DOMAIN_REDIRECT when the final domain differs from the original", () => {
    const fetched = page(GOOD_SITE, "https://newcedarpeak.example/");
    const signals = observationsToSignals(
      fetched,
      extractObservations(fetched),
      "https://cedarpeak.example/",
    );
    const redirect = signals.find((s) => s.type === "DOMAIN_REDIRECT");
    expect(redirect?.value).toBe("newcedarpeak.example");
  });
});
