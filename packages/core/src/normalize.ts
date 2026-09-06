import { createHash } from "node:crypto";

/**
 * Deterministic normalization used for deduplication and matching.
 *
 * Everything here is intentionally boring: no fuzzy libraries, no ML. Two
 * records only collapse when a normalizer produces a byte-identical string.
 */

/** Legal-form and marketing suffixes that carry no identity information. */
const NAME_NOISE = new Set([
  "llc",
  "l.l.c",
  "inc",
  "incorporated",
  "co",
  "corp",
  "corporation",
  "ltd",
  "limited",
  "lp",
  "llp",
  "pc",
  "pa",
  "pllc",
  "the",
  "and",
]);

/**
 * Lowercase, strip accents/punctuation, drop legal suffixes and collapse
 * whitespace. "Cedar Peak Plumbing, LLC" and "cedar peak plumbing" agree.
 */
export function normalizeBusinessName(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const kept = base.split(" ").filter((token) => token.length > 0 && !NAME_NOISE.has(token));
  // Never normalize a name down to nothing — fall back to the cleaned string.
  return (kept.length > 0 ? kept.join(" ") : base).trim();
}

/**
 * Multi-label public suffixes we care about. A full PSL is overkill for US
 * local businesses and would add a dependency that needs updating; anything
 * not listed falls back to the last two labels.
 */
const MULTI_LABEL_SUFFIXES = [
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
  "com.mx",
  "com.br",
  "co.jp",
  "co.in",
  "com.sg",
];

/** eTLD+1, lowercased, `www.` and trailing dot removed. */
export function rootDomain(hostname: string): string {
  const host = hostname
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^www\./, "");
  const labels = host.split(".").filter(Boolean);
  if (labels.length <= 2) return labels.join(".");

  const lastTwo = labels.slice(-2).join(".");
  if (MULTI_LABEL_SUFFIXES.includes(lastTwo) && labels.length >= 3) {
    return labels.slice(-3).join(".");
  }
  return lastTwo;
}

export interface NormalizedUrl {
  /** Absolute URL with a scheme, suitable for storing and fetching. */
  url: string;
  hostname: string;
  rootDomain: string;
  usesHttps: boolean;
}

/**
 * Turn operator-typed input ("cedarpeak.com", "HTTP://Cedar Peak.com/ ") into a
 * canonical URL, or null when it is not a usable http(s) address.
 */
export function normalizeWebsiteUrl(input: string | null | undefined): NormalizedUrl | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname.includes(".")) return null;
  // Reject anything with whitespace smuggled into the host.
  if (/\s/.test(parsed.hostname)) return null;

  parsed.hash = "";
  const hostname = parsed.hostname.toLowerCase();
  return {
    url: parsed.toString(),
    hostname,
    rootDomain: rootDomain(hostname),
    usesHttps: parsed.protocol === "https:",
  };
}

/**
 * North-American phone numbers to E.164. Returns null rather than guessing for
 * anything that is not a recognizable NANP or already-international number —
 * a wrong normalization would merge two different businesses.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (raw.length === 0) return null;

  const hadPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return null;

  if (hadPlus) {
    // Already international: keep as-is if it is a plausible E.164 length.
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export interface AddressParts {
  line1?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

const STREET_ABBREVIATIONS: Record<string, string> = {
  street: "st",
  avenue: "ave",
  boulevard: "blvd",
  road: "rd",
  drive: "dr",
  lane: "ln",
  court: "ct",
  place: "pl",
  suite: "ste",
  highway: "hwy",
  parkway: "pkwy",
  north: "n",
  south: "s",
  east: "e",
  west: "w",
};

/** Lowercased, abbreviation-folded, whitespace-collapsed postal address. */
export function normalizeAddress(parts: AddressParts): string | null {
  const pieces = [parts.line1, parts.city, parts.region, parts.postalCode, parts.country]
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0);
  if (pieces.length === 0) return null;

  const tokens = pieces
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => STREET_ABBREVIATIONS[token] ?? token);

  const normalized = tokens.join(" ").trim();
  return normalized.length > 0 ? normalized : null;
}

/** Stable short hash of a normalized address, used as an identity value. */
export function addressHash(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

/** Lowercased, trimmed email, or null when it is not shaped like an address. */
export function normalizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value;
}
