import { parse, type HTMLElement } from "node-html-parser";
import { detectAgencyCredit, type AgencyCreditMatch } from "./agency";
import { normalizeEmail, rootDomain } from "../normalize";
import type { SignalInput } from "../types";
import type { FetchSuccess } from "./fetch";

/**
 * Shallow homepage signal extraction.
 *
 * Scope discipline: only facts that are cheap, obvious and decision-relevant
 * for *whether to bother auditing*. No Lighthouse, no axe, no page inventory,
 * no CRO analysis — that is AuditWorkspace's job.
 */

export interface WebsiteObservations {
  title: string | null;
  metaDescription: string | null;
  hasViewportMeta: boolean;
  hasContactLink: boolean;
  hasBookingLink: boolean;
  hasPhoneLink: boolean;
  phoneNumbers: string[];
  emails: string[];
  socialLinks: string[];
  cmsHint: string | null;
  agencyCredit: AgencyCreditMatch | null;
  /** Body text is nearly empty, so the useful content needs a real browser. */
  renderRequired: boolean;
  visibleTextLength: number;
}

const CONTACT_HINTS = [
  "contact",
  "get a quote",
  "get quote",
  "request a quote",
  "free estimate",
  "get estimate",
  "request estimate",
  "quote",
  "estimate",
  "consultation",
];

const BOOKING_HINTS = [
  "book now",
  "book online",
  "book appointment",
  "schedule",
  "appointment",
  "reserve",
  "calendly.com",
  "acuityscheduling.com",
  "squareup.com/appointments",
  "setmore.com",
  "vagaro.com",
  "booksy.com",
  "mindbodyonline.com",
  "housecallpro.com",
  "getjobber.com",
];

const SOCIAL_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "tiktok.com",
  "yelp.com",
  "nextdoor.com",
  "pinterest.com",
];

/** Ordered so the most specific fingerprint wins. */
const CMS_FINGERPRINTS: ReadonlyArray<{ name: string; test: (html: string) => boolean }> = [
  { name: "Shopify", test: (h) => h.includes("cdn.shopify.com") || h.includes("Shopify.theme") },
  { name: "Wix", test: (h) => h.includes("static.parastorage.com") || h.includes("wix.com") },
  { name: "Squarespace", test: (h) => h.includes("squarespace.com") || h.includes("static1.squarespace") },
  { name: "Webflow", test: (h) => h.includes("webflow.com") || h.includes("data-wf-page") },
  { name: "Duda", test: (h) => h.includes("dudamobile.com") || h.includes("dudaone") },
  { name: "GoDaddy Website Builder", test: (h) => h.includes("img1.wsimg.com") },
  { name: "Weebly", test: (h) => h.includes("weebly.com") || h.includes("editmysite.com") },
  { name: "WordPress", test: (h) => h.includes("/wp-content/") || h.includes("/wp-json") },
  { name: "Drupal", test: (h) => h.includes("/sites/default/files") || h.includes("Drupal.settings") },
  { name: "Joomla", test: (h) => h.includes("/media/jui/") || h.includes("joomla") },
  { name: "HubSpot CMS", test: (h) => h.includes("hs-scripts.com") || h.includes("hubspot.net") },
];

function absolute(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function visibleText(root: HTMLElement): string {
  for (const el of root.querySelectorAll("script, style, noscript, template, svg")) {
    el.remove();
  }
  return root.textContent.replace(/\s+/g, " ").trim();
}

/** Parse a fetched homepage into structured observations. */
export function extractObservations(result: FetchSuccess): WebsiteObservations {
  const html = result.html;
  const doc = parse(html, { comment: false });
  const siteDomain = (() => {
    try {
      return rootDomain(new URL(result.finalUrl).hostname);
    } catch {
      return null;
    }
  })();

  const title = doc.querySelector("title")?.textContent?.trim() || null;

  const metaDescription =
    doc
      .querySelectorAll("meta")
      .find((m) => (m.getAttribute("name") ?? "").toLowerCase() === "description")
      ?.getAttribute("content")
      ?.trim() || null;

  const hasViewportMeta = doc
    .querySelectorAll("meta")
    .some((m) => (m.getAttribute("name") ?? "").toLowerCase() === "viewport");

  const anchors = doc.querySelectorAll("a").map((a) => ({
    href: a.getAttribute("href") ?? "",
    text: a.textContent.replace(/\s+/g, " ").trim(),
  }));

  const phoneNumbers: string[] = [];
  const emails: string[] = [];
  const socialLinks: string[] = [];
  let hasContactLink = false;
  let hasBookingLink = false;
  let hasPhoneLink = false;

  for (const anchor of anchors) {
    const href = anchor.href.trim();
    const hrefLower = href.toLowerCase();
    const label = `${anchor.text} ${href}`.toLowerCase();

    if (hrefLower.startsWith("tel:")) {
      hasPhoneLink = true;
      const value = href.slice(4).trim();
      if (value && !phoneNumbers.includes(value)) phoneNumbers.push(value);
      continue;
    }
    if (hrefLower.startsWith("mailto:")) {
      const value = normalizeEmail(href.slice(7).split("?")[0] ?? "");
      if (value && !emails.includes(value)) emails.push(value);
      continue;
    }
    if (hrefLower.startsWith("javascript:") || hrefLower.startsWith("data:")) continue;

    if (BOOKING_HINTS.some((hint) => label.includes(hint))) hasBookingLink = true;
    else if (CONTACT_HINTS.some((hint) => label.includes(hint))) hasContactLink = true;

    const social = SOCIAL_DOMAINS.find((domain) => hrefLower.includes(domain));
    if (social) {
      const abs = absolute(href, result.finalUrl);
      if (abs && !socialLinks.includes(abs)) socialLinks.push(abs);
    }
  }

  // Emails that appear as plain text rather than mailto: links.
  for (const match of html.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
    const value = normalizeEmail(match[0]);
    // Skip asset filenames and tracking pixels that happen to match.
    if (!value || value.includes("sentry") || /\.(png|jpg|jpeg|gif|svg|webp)$/.test(value)) continue;
    if (!emails.includes(value)) emails.push(value);
    if (emails.length >= 5) break;
  }

  const generator =
    doc
      .querySelectorAll("meta")
      .find((m) => (m.getAttribute("name") ?? "").toLowerCase() === "generator")
      ?.getAttribute("content")
      ?.trim() ?? null;

  const cmsHint =
    CMS_FINGERPRINTS.find((fp) => fp.test(html))?.name ??
    (generator && generator.length < 60 ? generator : null);

  // Agency credits live in the footer. Fall back to the whole page when the
  // markup has no recognizable footer.
  const footer = doc.querySelector("footer") ?? doc.querySelector("#footer") ?? doc.querySelector(".footer");
  const footerLinks = (footer ?? doc).querySelectorAll("a").map((a) => ({
    href: absolute(a.getAttribute("href") ?? "", result.finalUrl) ?? "",
    text: a.textContent.replace(/\s+/g, " ").trim(),
  }));
  const footerText = footer ? visibleText(footer.clone() as HTMLElement) : "";

  const bodyText = visibleText(parse(html, { comment: false }));
  const agencyCredit =
    detectAgencyCredit({
      text: footerText || bodyText.slice(-4000),
      links: footerLinks.filter((l) => l.href.length > 0),
      siteRootDomain: siteDomain,
    }) ??
    // Some templates put the credit in a trailing div rather than <footer>.
    (footerText
      ? detectAgencyCredit({
          text: bodyText.slice(-4000),
          links: footerLinks.filter((l) => l.href.length > 0),
          siteRootDomain: siteDomain,
        })
      : null);

  const renderRequired =
    bodyText.length < 200 &&
    (html.includes("__NEXT_DATA__") ||
      html.includes("id=\"root\"") ||
      html.includes("id=\"app\"") ||
      html.includes("ng-app"));

  return {
    title,
    metaDescription,
    hasViewportMeta,
    hasContactLink,
    hasBookingLink,
    hasPhoneLink,
    phoneNumbers,
    emails,
    socialLinks,
    cmsHint,
    agencyCredit,
    renderRequired,
    visibleTextLength: bodyText.length,
  };
}

/**
 * Turn observations into the signal rows the scoring engine reads.
 * Booleans are always emitted — an explicit "no contact CTA" is evidence, and
 * omitting it would be indistinguishable from "never checked".
 */
export function observationsToSignals(
  result: FetchSuccess,
  obs: WebsiteObservations,
  originalUrl: string,
): SignalInput[] {
  const ref = result.finalUrl;
  const signals: SignalInput[] = [
    {
      type: "WEBSITE_REACHABLE",
      source: "WEBSITE_FETCH",
      booleanValue: true,
      confidence: "HIGH",
      evidence: `HTTP ${result.status} in ${result.responseMs}ms`,
      sourceReference: ref,
    },
    {
      type: "HTTPS_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: result.usesHttps,
      confidence: "HIGH",
      evidence: result.usesHttps ? "Served over HTTPS" : "Final URL is plain HTTP",
      sourceReference: ref,
    },
    {
      type: "TITLE_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: Boolean(obs.title),
      value: obs.title,
      confidence: "HIGH",
      evidence: obs.title ? `<title>${obs.title}</title>` : "No <title> element",
      sourceReference: ref,
    },
    {
      type: "META_DESCRIPTION_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: Boolean(obs.metaDescription),
      value: obs.metaDescription,
      confidence: "HIGH",
      evidence: obs.metaDescription
        ? `meta description present (${obs.metaDescription.length} chars)`
        : "No meta description",
      sourceReference: ref,
    },
    {
      type: "VIEWPORT_META_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: obs.hasViewportMeta,
      confidence: "HIGH",
      evidence: obs.hasViewportMeta
        ? "Responsive viewport meta tag present"
        : "No viewport meta tag — likely not built for mobile",
      sourceReference: ref,
    },
    {
      type: "CONTACT_LINK_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: obs.hasContactLink,
      confidence: "MEDIUM",
      evidence: obs.hasContactLink
        ? "Contact or quote link found on the homepage"
        : "No obvious contact or quote link on the homepage",
      sourceReference: ref,
    },
    {
      type: "BOOKING_LINK_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: obs.hasBookingLink,
      confidence: "MEDIUM",
      evidence: obs.hasBookingLink
        ? "Booking or scheduling link found"
        : "No booking or scheduling link found",
      sourceReference: ref,
    },
    {
      type: "PHONE_LINK_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: obs.hasPhoneLink,
      confidence: "HIGH",
      evidence: obs.hasPhoneLink
        ? `tel: link present (${obs.phoneNumbers[0] ?? "unknown"})`
        : "No click-to-call link",
      sourceReference: ref,
    },
    {
      type: "SOCIAL_LINK_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: obs.socialLinks.length > 0,
      value: String(obs.socialLinks.length),
      confidence: "HIGH",
      evidence:
        obs.socialLinks.length > 0
          ? obs.socialLinks.slice(0, 3).join(", ")
          : "No social profile links found",
      sourceReference: ref,
    },
  ];

  if (obs.emails.length > 0) {
    signals.push({
      type: "PUBLIC_EMAIL_PRESENT",
      source: "WEBSITE_FETCH",
      booleanValue: true,
      value: obs.emails[0]!,
      confidence: "HIGH",
      evidence: `Public email on the website: ${obs.emails[0]}`,
      sourceReference: ref,
    });
  }

  if (obs.cmsHint) {
    signals.push({
      type: "CMS_HINT",
      source: "WEBSITE_FETCH",
      value: obs.cmsHint,
      confidence: "MEDIUM",
      evidence: `Platform fingerprint: ${obs.cmsHint}`,
      sourceReference: ref,
    });
  }

  if (obs.agencyCredit) {
    signals.push({
      type: "AGENCY_CREDIT_DETECTED",
      source: "WEBSITE_FETCH",
      booleanValue: true,
      value: obs.agencyCredit.linkDomain ?? obs.agencyCredit.text.slice(0, 120),
      confidence: obs.agencyCredit.confidence,
      evidence: obs.agencyCredit.text.slice(0, 300),
      sourceReference: obs.agencyCredit.linkUrl ?? ref,
    });
  }

  if (obs.renderRequired) {
    signals.push({
      type: "RENDER_REQUIRED",
      source: "WEBSITE_FETCH",
      booleanValue: true,
      confidence: "MEDIUM",
      evidence: "Homepage renders client-side; shallow inspection is limited.",
      sourceReference: ref,
    });
  }

  const originalDomain = (() => {
    try {
      return rootDomain(new URL(originalUrl).hostname);
    } catch {
      return null;
    }
  })();
  const finalDomain = (() => {
    try {
      return rootDomain(new URL(result.finalUrl).hostname);
    } catch {
      return null;
    }
  })();
  if (originalDomain && finalDomain && originalDomain !== finalDomain) {
    signals.push({
      type: "DOMAIN_REDIRECT",
      source: "WEBSITE_FETCH",
      booleanValue: true,
      value: finalDomain,
      confidence: "HIGH",
      evidence: `${originalDomain} redirects to ${finalDomain}`,
      sourceReference: ref,
    });
  }

  return signals;
}
