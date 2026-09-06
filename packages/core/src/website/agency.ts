import { rootDomain } from "../normalize";

/**
 * Visible website-agency credit detection.
 *
 * This is a heuristic, and the product treats it as one: a hit is recorded as
 * a signal with an evidence snippet and a confidence, and the operator can
 * override it. We never claim perfect detection.
 *
 * The rule that matters commercially: if another agency visibly built and
 * maintains the site, it is a poor Novenworks target.
 */

export interface AgencyCreditMatch {
  /** The matched sentence, trimmed for display. */
  text: string;
  /** Href of the credit link, when the credit is linked. */
  linkUrl: string | null;
  /** Root domain of the credit link, when present. */
  linkDomain: string | null;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  /** Which phrase matched, for debugging and tests. */
  pattern: string;
}

/**
 * "Powered by <platform>" is a CMS/host badge, not an agency relationship.
 * These are the ones that would otherwise dominate the results.
 */
const PLATFORM_CREDITS = [
  "wordpress",
  "shopify",
  "squarespace",
  "wix",
  "webflow",
  "weebly",
  "godaddy",
  "duda",
  "hubspot",
  "google",
  "stripe",
  "woocommerce",
  "elementor",
  "divi",
  "bootstrap",
  "cloudflare",
  "vercel",
  "netlify",
  "yelp",
  "square",
  "clover",
  "housecall pro",
  "servicetitan",
  "jobber",
  "vagaro",
  "mindbody",
  "booksy",
  "openai",
  "shopware",
  "magento",
  "joomla",
  "drupal",
  "ghost",
  "blogger",
];

/**
 * Ordered by how strongly the phrase implies a build relationship. The capture
 * group is the credited party.
 */
const CREDIT_PATTERNS: ReadonlyArray<{ label: string; regex: RegExp; weight: "strong" | "weak" }> = [
  { label: "website by", regex: /\bwebsite\s+(?:by|built by|created by)\s+([^.|·•\n]{2,60})/i, weight: "strong" },
  { label: "web design by", regex: /\bweb(?:site)?\s+design(?:ed)?\s+by\s+([^.|·•\n]{2,60})/i, weight: "strong" },
  { label: "designed by", regex: /\bdesigned\s+(?:and\s+\w+\s+)?by\s+([^.|·•\n]{2,60})/i, weight: "strong" },
  { label: "developed by", regex: /\b(?:developed|built|created)\s+by\s+([^.|·•\n]{2,60})/i, weight: "strong" },
  { label: "site by", regex: /\bsite\s+by\s+([^.|·•\n]{2,60})/i, weight: "strong" },
  { label: "marketing by", regex: /\b(?:marketing|seo)\s+by\s+([^.|·•\n]{2,60})/i, weight: "weak" },
  { label: "powered by", regex: /\bpowered\s+by\s+([^.|·•\n]{2,60})/i, weight: "weak" },
];

function looksLikePlatform(credited: string): boolean {
  const value = credited.toLowerCase();
  return PLATFORM_CREDITS.some((platform) => value.includes(platform));
}

export interface AgencyDetectionInput {
  /** Visible text of the page, ideally footer-weighted. */
  text: string;
  /** Links found near the credit text: [href, anchor text]. */
  links: ReadonlyArray<{ href: string; text: string }>;
  /** Root domain of the site being inspected, so self-credits are ignored. */
  siteRootDomain: string | null;
}

/**
 * Returns the strongest agency credit found, or null.
 *
 * Confidence rules:
 *  - HIGH   strong phrase AND an outbound link to a different domain
 *  - MEDIUM strong phrase, text only
 *  - LOW    weak phrase ("powered by", "marketing by") that is not a known platform
 */
export function detectAgencyCredit(input: AgencyDetectionInput): AgencyCreditMatch | null {
  const haystack = input.text.replace(/\s+/g, " ").trim();
  if (haystack.length === 0) return null;

  for (const { label, regex, weight } of CREDIT_PATTERNS) {
    const match = haystack.match(regex);
    if (!match?.[1]) continue;

    const credited = match[1].trim().replace(/[,;:]+$/, "");
    if (credited.length < 2) continue;
    if (looksLikePlatform(credited)) continue;

    // "Website by the team at Cedar Peak" crediting the business itself.
    const creditedNormalized = credited.toLowerCase();
    if (input.siteRootDomain && creditedNormalized.includes(input.siteRootDomain.split(".")[0]!)) {
      continue;
    }

    // Look for an outbound link whose anchor text matches the credited party.
    const linked = input.links.find((link) => {
      const anchor = link.text.trim().toLowerCase();
      if (anchor.length < 2) return false;
      if (!creditedNormalized.includes(anchor) && !anchor.includes(creditedNormalized)) return false;
      try {
        const host = new URL(link.href).hostname;
        const domain = rootDomain(host);
        return domain.length > 0 && domain !== input.siteRootDomain;
      } catch {
        return false;
      }
    });

    let confidence: AgencyCreditMatch["confidence"];
    if (weight === "weak") {
      confidence = linked ? "MEDIUM" : "LOW";
    } else {
      confidence = linked ? "HIGH" : "MEDIUM";
    }

    const index = haystack.toLowerCase().indexOf(match[0].toLowerCase());
    const snippet = haystack.slice(Math.max(0, index - 40), index + match[0].length + 40).trim();

    let linkDomain: string | null = null;
    if (linked) {
      try {
        linkDomain = rootDomain(new URL(linked.href).hostname);
      } catch {
        linkDomain = null;
      }
    }

    return {
      text: snippet.length >= match[0].length ? snippet : match[0].trim(),
      linkUrl: linked?.href ?? null,
      linkDomain,
      confidence,
      pattern: label,
    };
  }

  return null;
}
