import { isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns";

/**
 * SSRF guard for the shallow website enrichment fetcher.
 *
 * Threat model: a prospect's website URL is operator- or provider-supplied, so
 * it must be treated as attacker-controlled. The guard has three layers:
 *
 *  1. Scheme/shape validation before anything is resolved.
 *  2. Every DNS answer is checked against the reserved-range blocklist.
 *  3. The address that passed the check is the address we connect to, via a
 *     custom `lookup`. There is no second resolution, so a DNS rebind cannot
 *     swap in a private address between the check and the connection.
 *
 * Redirects are followed manually so each hop repeats all three layers.
 */

export type UrlRejectionReason =
  | "INVALID_URL"
  | "BLOCKED_SCHEME"
  | "BLOCKED_HOST"
  | "BLOCKED_PORT"
  | "BLOCKED_ADDRESS"
  | "DNS_FAILURE";

export interface UrlCheckFailure {
  ok: false;
  reason: UrlRejectionReason;
  detail: string;
}

export interface UrlCheckSuccess {
  ok: true;
  url: URL;
}

export type UrlCheckResult = UrlCheckSuccess | UrlCheckFailure;

/** Hostnames that must never be resolved, regardless of what DNS would say. */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata",
  "metadata.google.internal",
  "instance-data",
  "169.254.169.254",
]);

/** Suffixes reserved for private/internal naming (RFC 6761, RFC 8375). */
const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".corp",
  ".home",
  ".lan",
  ".home.arpa",
];

/**
 * Only the standard web ports. Allowing arbitrary ports turns the fetcher into
 * an internal port scanner even when every address is public.
 */
const ALLOWED_PORTS = new Set(["", "80", "443", "8080", "8443"]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value >>> 0;
}

/** [network, prefix length] pairs that must never be contacted. */
const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // RFC1918
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, includes 169.254.169.254 metadata
  ["172.16.0.0", 12], // RFC1918
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay anycast
  ["192.168.0.0", 16], // RFC1918
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + 255.255.255.255 broadcast
];

function isBlockedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return true; // unparseable: fail closed
  for (const [network, bits] of BLOCKED_V4) {
    const net = ipv4ToInt(network);
    if (net === null) continue;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((value & mask) >>> 0 === (net & mask) >>> 0) return true;
  }
  return false;
}

/** Expand an IPv6 address to its 8 numeric groups, or null if malformed. */
function ipv6Groups(ip: string): number[] | null {
  let address = ip;
  const zone = address.indexOf("%");
  if (zone !== -1) address = address.slice(0, zone);

  // An IPv4-mapped/compatible tail (::ffff:1.2.3.4) becomes two groups.
  const v4Match = address.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4Match?.[1]) {
    const v4 = ipv4ToInt(v4Match[1]);
    if (v4 === null) return null;
    const hi = (v4 >>> 16).toString(16);
    const lo = (v4 & 0xffff).toString(16);
    address = `${address.slice(0, v4Match.index)}${hi}:${lo}`;
  }

  const halves = address.split("::");
  if (halves.length > 2) return null;
  const head = (halves[0] ?? "").split(":").filter((p) => p.length > 0);
  const tail = halves.length === 2 ? (halves[1] ?? "").split(":").filter((p) => p.length > 0) : [];

  const groups: number[] =
    halves.length === 2
      ? [...head, ...Array(Math.max(0, 8 - head.length - tail.length)).fill("0"), ...tail].map(
          (g) => parseInt(g, 16),
        )
      : head.map((g) => parseInt(g, 16));

  if (groups.length !== 8 || groups.some((g) => Number.isNaN(g) || g < 0 || g > 0xffff))
    return null;
  return groups;
}

function isBlockedIpv6(ip: string): boolean {
  const groups = ipv6Groups(ip);
  if (groups === null) return true; // fail closed

  const [g0, g1] = groups as [number, number, ...number[]];

  // Unspecified (::) and loopback (::1).
  if (groups.every((g, i) => (i === 7 ? g === 0 || g === 1 : g === 0))) return true;

  // Anything in ::/80 embeds an IPv4 address in the last two groups — both the
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d) forms. Judge
  // it by the embedded address, which also covers ::2 style shorthands.
  if (groups.slice(0, 5).every((g) => g === 0)) {
    const v4 = `${groups[6]! >>> 8}.${groups[6]! & 0xff}.${groups[7]! >>> 8}.${groups[7]! & 0xff}`;
    return isBlockedIpv4(v4);
  }

  if (g0 === 0x0064 && g1 === 0xff9b) return true; // NAT64 well-known prefix
  if (g0 === 0x0100 && g1 === 0x0000) return true; // discard-only 100::/64
  if (g0 === 0x2001 && g1 === 0x0db8) return true; // documentation
  if ((g0 & 0xfe00) === 0xfc00) return true; // unique local fc00::/7
  if ((g0 & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((g0 & 0xff00) === 0xff00) return true; // multicast ff00::/8

  return false;
}

/** True when this literal address is in a reserved, private or local range. */
export function isBlockedAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return true; // not an IP at all: fail closed
}

/**
 * Scheme, host-shape and port validation. Does not touch the network, so it is
 * safe to call from the web app to give the operator immediate feedback.
 */
export function checkUrl(input: string): UrlCheckResult {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "INVALID_URL", detail: "Not a valid absolute URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      reason: "BLOCKED_SCHEME",
      detail: `Only http and https are allowed (got ${url.protocol.replace(":", "")}).`,
    };
  }

  if (url.username || url.password) {
    return { ok: false, reason: "INVALID_URL", detail: "URLs with credentials are not allowed." };
  }

  if (!ALLOWED_PORTS.has(url.port)) {
    return { ok: false, reason: "BLOCKED_PORT", detail: `Port ${url.port} is not allowed.` };
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host.length === 0) {
    return { ok: false, reason: "INVALID_URL", detail: "Missing hostname." };
  }
  if (BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, reason: "BLOCKED_HOST", detail: `Hostname ${host} is not allowed.` };
  }
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return {
      ok: false,
      reason: "BLOCKED_HOST",
      detail: `Internal hostname ${host} is not allowed.`,
    };
  }

  // Bracketed IPv6 literals arrive as "[::1]" in href but "::1" in hostname.
  const literal = host.startsWith("[") ? host.slice(1, -1) : host;
  if (isIP(literal) !== 0) {
    if (isBlockedAddress(literal)) {
      return {
        ok: false,
        reason: "BLOCKED_ADDRESS",
        detail: `${literal} is in a reserved or private range.`,
      };
    }
    return { ok: true, url };
  }

  // A hostname with no dot cannot be a public domain.
  if (!host.includes(".")) {
    return { ok: false, reason: "BLOCKED_HOST", detail: `${host} is not a public hostname.` };
  }

  return { ok: true, url };
}

export interface ResolvedHost {
  address: string;
  family: 4 | 6;
}

/**
 * Resolve a hostname and reject unless *every* answer is a public address.
 * Rejecting on any bad answer (rather than filtering to the good ones) stops a
 * host from mixing a public and a private record to slip past the check.
 */
export async function resolvePublicAddress(
  hostname: string,
): Promise<{ ok: true; addresses: ResolvedHost[] } | UrlCheckFailure> {
  const literal = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;
  if (isIP(literal) !== 0) {
    if (isBlockedAddress(literal)) {
      return {
        ok: false,
        reason: "BLOCKED_ADDRESS",
        detail: `${literal} is in a reserved or private range.`,
      };
    }
    return { ok: true, addresses: [{ address: literal, family: isIP(literal) === 4 ? 4 : 6 }] };
  }

  const answers = await new Promise<ResolvedHost[] | Error>((resolve) => {
    dnsLookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
      if (err) return resolve(err);
      resolve(
        (addresses ?? []).map((a) => ({ address: a.address, family: a.family === 4 ? 4 : 6 })),
      );
    });
  });

  if (answers instanceof Error) {
    return { ok: false, reason: "DNS_FAILURE", detail: answers.message };
  }
  if (answers.length === 0) {
    return { ok: false, reason: "DNS_FAILURE", detail: `${hostname} did not resolve.` };
  }

  for (const answer of answers) {
    if (isBlockedAddress(answer.address)) {
      return {
        ok: false,
        reason: "BLOCKED_ADDRESS",
        detail: `${hostname} resolves to ${answer.address}, a reserved or private address.`,
      };
    }
  }

  return { ok: true, addresses: answers };
}
