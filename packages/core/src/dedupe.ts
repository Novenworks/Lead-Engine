import {
  addressHash,
  normalizeAddress,
  normalizeBusinessName,
  normalizePhone,
  normalizeWebsiteUrl,
  type AddressParts,
} from "./normalize";
import type { IdentityKind } from "./types";

/**
 * Deduplication.
 *
 * Two tiers, on purpose:
 *
 *  STRONG — a shared provider place id, root domain, phone or address hash.
 *           These are enforced by a unique index, so the write itself is the
 *           duplicate check. Matches here collapse automatically.
 *
 *  WEAK   — name and locality similarity. These become DuplicateCandidate rows
 *           for a human to resolve. They are never merged automatically: two
 *           "Summit HVAC" businesses in different cities are usually two
 *           businesses.
 */

export interface IdentityValue {
  kind: IdentityKind;
  namespace: string;
  value: string;
}

export interface IdentityInput {
  provider?: string | null;
  externalId?: string | null;
  websiteUrl?: string | null;
  phone?: string | null;
  address?: AddressParts | null;
}

/**
 * Derive every strong identifier we can from a business record. Anything that
 * cannot be normalized confidently is simply omitted — a wrong identity would
 * merge two unrelated businesses, which is worse than a duplicate.
 */
export function buildIdentities(input: IdentityInput): IdentityValue[] {
  const identities: IdentityValue[] = [];

  if (input.provider && input.externalId) {
    identities.push({
      kind: "PROVIDER_PLACE_ID",
      namespace: input.provider.toLowerCase(),
      value: input.externalId,
    });
  }

  const website = normalizeWebsiteUrl(input.websiteUrl);
  if (website && website.rootDomain.length > 0) {
    identities.push({ kind: "ROOT_DOMAIN", namespace: "", value: website.rootDomain });
  }

  const phone = normalizePhone(input.phone);
  if (phone) {
    identities.push({ kind: "PHONE_E164", namespace: "", value: phone });
  }

  if (input.address) {
    const normalized = normalizeAddress(input.address);
    // A city-only "address" is not identifying; require a street line.
    if (normalized && (input.address.line1 ?? "").trim().length > 0) {
      identities.push({ kind: "ADDRESS_HASH", namespace: "", value: addressHash(normalized) });
    }
  }

  return identities;
}

/**
 * Root domains that many small businesses share — a shared value here means
 * "both use Squarespace", not "same business".
 */
const SHARED_HOST_DOMAINS = new Set([
  "wixsite.com",
  "squarespace.com",
  "godaddysites.com",
  "business.site",
  "wordpress.com",
  "weebly.com",
  "blogspot.com",
  "myshopify.com",
  "facebook.com",
  "instagram.com",
  "linktr.ee",
  "google.com",
  "sites.google.com",
  "yelp.com",
]);

/** True when a root domain is too generic to identify one business. */
export function isSharedHostDomain(domain: string): boolean {
  return SHARED_HOST_DOMAINS.has(domain.toLowerCase());
}

/** Strong identities, minus values that are shared infrastructure. */
export function identifyingIdentities(identities: IdentityValue[]): IdentityValue[] {
  return identities.filter(
    (identity) => !(identity.kind === "ROOT_DOMAIN" && isSharedHostDomain(identity.value)),
  );
}

export interface WeakMatchCandidate {
  name: string;
  city?: string | null;
  region?: string | null;
}

export interface WeakMatchResult {
  /** 0..1. Values below 0.5 are not worth showing to an operator. */
  confidence: number;
  reasons: string[];
}

/** Jaccard overlap of the normalized name tokens. */
function tokenOverlap(a: string, b: string): number {
  const setA = new Set(a.split(" ").filter(Boolean));
  const setB = new Set(b.split(" ").filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared++;
  return shared / (setA.size + setB.size - shared);
}

export const DUPLICATE_SUGGESTION_THRESHOLD = 0.5;

/**
 * Score how likely two records are the same business using weak evidence.
 * Only ever produces a suggestion; never a merge.
 */
export function weakDuplicateMatch(a: WeakMatchCandidate, b: WeakMatchCandidate): WeakMatchResult {
  const nameA = normalizeBusinessName(a.name);
  const nameB = normalizeBusinessName(b.name);
  if (nameA.length === 0 || nameB.length === 0) return { confidence: 0, reasons: [] };

  const reasons: string[] = [];
  const exactName = nameA === nameB;
  const overlap = exactName ? 1 : tokenOverlap(nameA, nameB);

  if (exactName) reasons.push("identical_normalized_name");
  else if (overlap >= 0.6) reasons.push("similar_name");
  else return { confidence: 0, reasons: [] };

  const bothCitiesKnown = Boolean(a.city?.trim() && b.city?.trim());
  const sameCity =
    bothCitiesKnown && a.city!.trim().toLowerCase() === b.city!.trim().toLowerCase();
  const differentCity = bothCitiesKnown && !sameCity;
  const sameRegion =
    Boolean(a.region && b.region) && a.region!.trim().toLowerCase() === b.region!.trim().toLowerCase();

  if (sameCity) reasons.push("same_city");
  else if (differentCity) reasons.push("different_city");
  else if (sameRegion) reasons.push("same_region");

  // Two businesses with the same name in two known, different cities are
  // almost always two businesses — a shared region does not change that.
  if (differentCity) {
    return { confidence: exactName ? 0.2 : 0.1, reasons };
  }

  let confidence: number;
  if (exactName && sameCity) confidence = 0.85;
  else if (exactName && sameRegion) confidence = 0.6;
  else if (exactName) confidence = 0.45;
  else if (sameCity) confidence = 0.55;
  else if (sameRegion) confidence = 0.35;
  else confidence = 0.25;

  return { confidence, reasons };
}
