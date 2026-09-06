import http from "node:http";
import https from "node:https";
import {
  checkUrl,
  resolvePublicAddress,
  type ResolvedHost,
  type UrlCheckFailure,
  type UrlRejectionReason,
} from "../url-safety";

/**
 * The shallow homepage fetcher.
 *
 * Deliberately small: one page, no JavaScript execution, no crawling. Anything
 * that needs a browser is AuditWorkspace's job — see docs/ARCHITECTURE.md.
 */

export interface FetchLimits {
  /** Whole-request budget including all redirects. */
  totalTimeoutMs: number;
  /** Per-hop socket idle timeout. */
  hopTimeoutMs: number;
  maxRedirects: number;
  maxBytes: number;
}

export const DEFAULT_FETCH_LIMITS: FetchLimits = {
  totalTimeoutMs: 15_000,
  hopTimeoutMs: 8_000,
  maxRedirects: 5,
  maxBytes: 2 * 1024 * 1024,
};

export const LEADENGINE_USER_AGENT =
  "LeadEngineBot/1.0 (+https://novenworks.com/leadengine; shallow prospect qualification)";

export type FetchFailureReason =
  | UrlRejectionReason
  | "TIMEOUT"
  | "TOO_LARGE"
  | "UNSUPPORTED_CONTENT_TYPE"
  | "TOO_MANY_REDIRECTS"
  | "HTTP_ERROR"
  | "NETWORK_ERROR";

export interface FetchSuccess {
  ok: true;
  finalUrl: string;
  status: number;
  html: string;
  contentType: string;
  usesHttps: boolean;
  redirected: boolean;
  redirectChain: string[];
  responseMs: number;
  /** True when the body was cut off at maxBytes; extraction still runs. */
  truncated: boolean;
}

export interface FetchFailure {
  ok: false;
  reason: FetchFailureReason;
  detail: string;
  status?: number;
  finalUrl?: string;
  redirectChain: string[];
}

export type FetchResult = FetchSuccess | FetchFailure;

const HTML_CONTENT_TYPES = ["text/html", "application/xhtml+xml", "text/plain"];

interface HopOutcome {
  kind: "body" | "redirect" | "failure";
  status?: number;
  location?: string;
  contentType?: string;
  body?: Buffer;
  truncated?: boolean;
  failure?: { reason: FetchFailureReason; detail: string };
}

function requestOnce(
  url: URL,
  pinnedAddress: string,
  pinnedFamily: 4 | 6,
  limits: FetchLimits,
  deadline: number,
): Promise<HopOutcome> {
  return new Promise((resolve) => {
    const transport = url.protocol === "https:" ? https : http;
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      resolve({ kind: "failure", failure: { reason: "TIMEOUT", detail: "Budget exhausted." } });
      return;
    }

    let settled = false;
    const finish = (outcome: HopOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const request = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: "GET",
        // Pin the connection to the address we already validated. Node calls
        // this instead of resolving again, so a DNS rebind between the check
        // and the connect has nothing to swap.
        lookup: (_hostname, _options, callback) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (callback as any)(null, pinnedAddress, pinnedFamily);
        },
        // Server certificates are still validated against the original
        // hostname; pinning only changes which address we dial.
        servername: url.protocol === "https:" ? url.hostname : undefined,
        headers: {
          host: url.host,
          "user-agent": LEADENGINE_USER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          // Refuse compressed bodies outright: with no decompression there is
          // no decompression bomb, and the byte cap below is the real size.
          "accept-encoding": "identity",
          "accept-language": "en-US,en;q=0.9",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const contentType = String(response.headers["content-type"] ?? "").toLowerCase();
        const location = response.headers.location;

        if (status >= 300 && status < 400 && location) {
          response.destroy();
          finish({ kind: "redirect", status, location: String(location) });
          return;
        }

        if (status >= 400) {
          response.destroy();
          finish({
            kind: "failure",
            status,
            failure: { reason: "HTTP_ERROR", detail: `Server returned HTTP ${status}.` },
          });
          return;
        }

        const mime = contentType.split(";")[0]?.trim() ?? "";
        if (mime && !HTML_CONTENT_TYPES.includes(mime)) {
          response.destroy();
          finish({
            kind: "failure",
            status,
            failure: {
              reason: "UNSUPPORTED_CONTENT_TYPE",
              detail: `Expected HTML, got ${mime}.`,
            },
          });
          return;
        }

        // Trust the declared length only as an early exit; the running total
        // below is what actually enforces the cap.
        const declared = Number(response.headers["content-length"] ?? 0);
        if (declared > limits.maxBytes) {
          response.destroy();
          finish({
            kind: "failure",
            status,
            failure: {
              reason: "TOO_LARGE",
              detail: `Content-Length ${declared} exceeds ${limits.maxBytes} bytes.`,
            },
          });
          return;
        }

        const chunks: Buffer[] = [];
        let received = 0;
        let truncated = false;

        response.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > limits.maxBytes) {
            truncated = true;
            const keep = chunk.length - (received - limits.maxBytes);
            if (keep > 0) chunks.push(chunk.subarray(0, keep));
            response.destroy();
            finish({
              kind: "body",
              status,
              contentType,
              body: Buffer.concat(chunks),
              truncated,
            });
            return;
          }
          chunks.push(chunk);
        });

        response.on("end", () => {
          finish({ kind: "body", status, contentType, body: Buffer.concat(chunks), truncated });
        });

        response.on("error", (err: Error) => {
          finish({ kind: "failure", failure: { reason: "NETWORK_ERROR", detail: err.message } });
        });
      },
    );

    request.setTimeout(Math.min(limits.hopTimeoutMs, remaining), () => {
      request.destroy();
      finish({
        kind: "failure",
        failure: { reason: "TIMEOUT", detail: "The site did not respond in time." },
      });
    });

    request.on("error", (err: Error) => {
      finish({ kind: "failure", failure: { reason: "NETWORK_ERROR", detail: err.message } });
    });

    request.end();
  });
}

/**
 * Validate one hop: scheme/host/port, then every address the host resolves to.
 * Returns the single address the caller must connect to.
 *
 * This runs for the initial URL *and* for every redirect target, which is what
 * stops an open redirect from walking us into a private network.
 */
export async function guardFetchTarget(
  rawUrl: string,
): Promise<{ ok: true; url: URL; address: ResolvedHost } | UrlCheckFailure> {
  const check = checkUrl(rawUrl);
  if (!check.ok) return check;

  const resolved = await resolvePublicAddress(check.url.hostname);
  if (!resolved.ok) return resolved;

  return { ok: true, url: check.url, address: resolved.addresses[0]! };
}

export type FetchTargetGuard = typeof guardFetchTarget;

/**
 * Fetch a homepage safely. Every hop is re-validated: scheme, host, port, and
 * every resolved address. A redirect to a private address fails the whole
 * fetch rather than silently stopping at the previous hop.
 *
 * `guard` exists so tests can prove the loop re-validates each hop; production
 * always uses the default.
 */
export async function fetchWebsite(
  rawUrl: string,
  limits: FetchLimits = DEFAULT_FETCH_LIMITS,
  guard: FetchTargetGuard = guardFetchTarget,
): Promise<FetchResult> {
  const startedAt = Date.now();
  const deadline = startedAt + limits.totalTimeoutMs;
  const redirectChain: string[] = [];

  let current = rawUrl;

  for (let hop = 0; hop <= limits.maxRedirects; hop++) {
    const guarded = await guard(current);
    if (!guarded.ok) {
      return { ok: false, reason: guarded.reason, detail: guarded.detail, redirectChain };
    }
    const check = { url: guarded.url };
    const target = guarded.address;

    const outcome = await requestOnce(check.url, target.address, target.family, limits, deadline);

    if (outcome.kind === "failure") {
      return {
        ok: false,
        reason: outcome.failure?.reason ?? "NETWORK_ERROR",
        detail: outcome.failure?.detail ?? "Request failed.",
        status: outcome.status,
        finalUrl: check.url.toString(),
        redirectChain,
      };
    }

    if (outcome.kind === "redirect") {
      let next: URL;
      try {
        next = new URL(outcome.location!, check.url);
      } catch {
        return {
          ok: false,
          reason: "INVALID_URL",
          detail: `Redirect target ${outcome.location} is not a valid URL.`,
          redirectChain,
        };
      }
      redirectChain.push(next.toString());
      current = next.toString();
      continue;
    }

    return {
      ok: true,
      finalUrl: check.url.toString(),
      status: outcome.status ?? 200,
      html: (outcome.body ?? Buffer.alloc(0)).toString("utf8"),
      contentType: outcome.contentType ?? "",
      usesHttps: check.url.protocol === "https:",
      redirected: redirectChain.length > 0,
      redirectChain,
      responseMs: Date.now() - startedAt,
      truncated: outcome.truncated ?? false,
    };
  }

  return {
    ok: false,
    reason: "TOO_MANY_REDIRECTS",
    detail: `Stopped after ${limits.maxRedirects} redirects.`,
    redirectChain,
  };
}
