import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DEFAULT_FETCH_LIMITS,
  fetchWebsite,
  guardFetchTarget,
  type FetchTargetGuard,
} from "../website/fetch";

/**
 * These tests run a real HTTP server on loopback. The production guard refuses
 * loopback, so the first hop is permitted by a test guard; every *subsequent*
 * hop goes through the real guard. That is exactly the property under test:
 * the loop re-validates redirect targets.
 */
let server: http.Server;
let base: string;

const routes: Record<string, (res: http.ServerResponse) => void> = {
  "/ok": (res) => {
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<html><head><title>Fixture</title></head><body>hello</body></html>");
  },
  "/redirect-to-metadata": (res) => {
    res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/" });
    res.end();
  },
  "/redirect-to-private": (res) => {
    res.writeHead(301, { location: "http://10.0.0.7/admin" });
    res.end();
  },
  "/redirect-to-file": (res) => {
    res.writeHead(302, { location: "file:///etc/passwd" });
    res.end();
  },
  "/redirect-loop": (res) => {
    res.writeHead(302, { location: "/redirect-loop" });
    res.end();
  },
  "/huge": (res) => {
    res.writeHead(200, { "content-type": "text/html" });
    // 6 MB, well past the 2 MB cap.
    res.end("<html><body>" + "A".repeat(6 * 1024 * 1024) + "</body></html>");
  },
  "/pdf": (res) => {
    res.writeHead(200, { "content-type": "application/pdf" });
    res.end("%PDF-1.4");
  },
  "/boom": (res) => {
    res.writeHead(500, { "content-type": "text/html" });
    res.end("<html><body>error</body></html>");
  },
};

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0]!;
    const handler = routes[path];
    if (handler) return handler(res);
    res.writeHead(404, { "content-type": "text/html" });
    res.end("<html><body>not found</body></html>");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

/** Permits only the very first URL (our loopback fixture); everything else uses the real guard. */
function firstHopGuard(firstUrl: string): FetchTargetGuard {
  let used = false;
  return async (rawUrl) => {
    if (!used && rawUrl === firstUrl) {
      used = true;
      const url = new URL(rawUrl);
      return { ok: true, url, address: { address: "127.0.0.1", family: 4 } };
    }
    return guardFetchTarget(rawUrl);
  };
}

describe("redirect SSRF re-validation", () => {
  it("blocks a redirect to the cloud metadata endpoint", async () => {
    const url = `${base}/redirect-to-metadata`;
    const result = await fetchWebsite(url, DEFAULT_FETCH_LIMITS, firstHopGuard(url));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["BLOCKED_ADDRESS", "BLOCKED_HOST"]).toContain(result.reason);
      expect(result.redirectChain).toEqual(["http://169.254.169.254/latest/meta-data/"]);
    }
  });

  it("blocks a redirect into RFC1918 space", async () => {
    const url = `${base}/redirect-to-private`;
    const result = await fetchWebsite(url, DEFAULT_FETCH_LIMITS, firstHopGuard(url));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("BLOCKED_ADDRESS");
  });

  it("blocks a redirect to a file: URL", async () => {
    const url = `${base}/redirect-to-file`;
    const result = await fetchWebsite(url, DEFAULT_FETCH_LIMITS, firstHopGuard(url));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("BLOCKED_SCHEME");
  });
});

describe("fetch limits", () => {
  it("fetches a normal page", async () => {
    const url = `${base}/ok`;
    const result = await fetchWebsite(url, DEFAULT_FETCH_LIMITS, firstHopGuard(url));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe(200);
      expect(result.html).toContain("Fixture");
      expect(result.truncated).toBe(false);
    }
  });

  it("caps an oversized body instead of buffering it all", async () => {
    const url = `${base}/huge`;
    const result = await fetchWebsite(url, DEFAULT_FETCH_LIMITS, firstHopGuard(url));
    // Either rejected up-front on Content-Length or truncated at the cap —
    // both are acceptable; what matters is we never hold 6 MB.
    if (result.ok) {
      expect(result.truncated).toBe(true);
      expect(result.html.length).toBeLessThanOrEqual(DEFAULT_FETCH_LIMITS.maxBytes);
    } else {
      expect(result.reason).toBe("TOO_LARGE");
    }
  });

  it("rejects non-HTML content types", async () => {
    const url = `${base}/pdf`;
    const result = await fetchWebsite(url, DEFAULT_FETCH_LIMITS, firstHopGuard(url));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("UNSUPPORTED_CONTENT_TYPE");
  });

  it("reports HTTP errors rather than treating them as content", async () => {
    const url = `${base}/boom`;
    const result = await fetchWebsite(url, DEFAULT_FETCH_LIMITS, firstHopGuard(url));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("HTTP_ERROR");
      expect(result.status).toBe(500);
    }
  });

  it("stops a redirect loop at the configured limit", async () => {
    const url = `${base}/redirect-loop`;
    // Permit every loopback hop so the loop limit is what stops us.
    const guard: FetchTargetGuard = async (rawUrl) => ({
      ok: true,
      url: new URL(rawUrl),
      address: { address: "127.0.0.1", family: 4 },
    });
    const result = await fetchWebsite(url, { ...DEFAULT_FETCH_LIMITS, maxRedirects: 3 }, guard);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("TOO_MANY_REDIRECTS");
  });
});
