import { describe, expect, it } from "vitest";
import { checkUrl, isBlockedAddress, resolvePublicAddress } from "../url-safety";
import { fetchWebsite } from "../website/fetch";

describe("isBlockedAddress", () => {
  const blocked = [
    "127.0.0.1",
    "127.1.2.3",
    "0.0.0.0",
    "10.0.0.1",
    "10.255.255.254",
    "172.16.0.1",
    "172.31.255.254",
    "192.168.0.1",
    "192.168.255.254",
    "169.254.169.254", // cloud metadata
    "169.254.0.1",
    "100.64.0.1", // CGNAT
    "192.0.2.1",
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "::ffff:127.0.0.1",
    "::ffff:169.254.169.254",
    "::ffff:10.0.0.1",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "ff02::1",
    "2001:db8::1",
    "64:ff9b::1",
  ];

  for (const ip of blocked) {
    it(`blocks ${ip}`, () => {
      expect(isBlockedAddress(ip)).toBe(true);
    });
  }

  const allowed = ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"];
  for (const ip of allowed) {
    it(`allows public ${ip}`, () => {
      expect(isBlockedAddress(ip)).toBe(false);
    });
  }

  it("fails closed on things that are not addresses", () => {
    expect(isBlockedAddress("not-an-ip")).toBe(true);
    expect(isBlockedAddress("")).toBe(true);
  });
});

describe("checkUrl", () => {
  it("accepts ordinary public https URLs", () => {
    const result = checkUrl("https://cedarpeak.example/about");
    expect(result.ok).toBe(true);
  });

  it("rejects non-http schemes", () => {
    for (const url of [
      "file:///etc/passwd",
      "ftp://x.example",
      "data:text/html,<h1>x",
      "gopher://x.example",
    ]) {
      const result = checkUrl(url);
      expect(result.ok, url).toBe(false);
      if (!result.ok) expect(result.reason).toBe("BLOCKED_SCHEME");
    }
  });

  it("rejects javascript: as an invalid or blocked scheme", () => {
    const result = checkUrl("javascript:alert(1)");
    expect(result.ok).toBe(false);
  });

  it("rejects loopback and internal hostnames before any DNS lookup", () => {
    for (const url of [
      "http://localhost/",
      "http://localhost:3000/",
      "http://ip6-localhost/",
      "http://metadata.google.internal/",
      "http://db.internal/",
      "http://printer.local/",
      "http://intranet.corp/",
    ]) {
      const result = checkUrl(url);
      expect(result.ok, url).toBe(false);
    }
  });

  it("rejects literal private addresses", () => {
    for (const url of [
      "http://127.0.0.1/",
      "http://10.0.0.5/",
      "http://192.168.1.1/",
      "http://172.16.4.4/",
      "http://169.254.169.254/latest/meta-data/",
      "http://[::1]/",
      "http://[fd00::1]/",
    ]) {
      const result = checkUrl(url);
      expect(result.ok, url).toBe(false);
      // 169.254.169.254 is also on the hostname denylist (defense in depth),
      // so either block reason is correct — what matters is that it is blocked.
      if (!result.ok) expect(["BLOCKED_ADDRESS", "BLOCKED_HOST"]).toContain(result.reason);
    }
  });

  it("rejects non-web ports so the fetcher cannot be used as a port scanner", () => {
    const result = checkUrl("http://example.com:22/");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("BLOCKED_PORT");
  });

  it("rejects URLs carrying credentials", () => {
    const result = checkUrl("https://user:pass@example.com/");
    expect(result.ok).toBe(false);
  });

  it("rejects bare hostnames with no dot", () => {
    const result = checkUrl("http://intranet/");
    expect(result.ok).toBe(false);
  });
});

describe("resolvePublicAddress", () => {
  it("rejects a hostname that resolves into a private range", async () => {
    // localhost resolves to 127.0.0.1 / ::1 on every platform we run on.
    const result = await resolvePublicAddress("localhost");
    expect(result.ok).toBe(false);
  });

  it("passes literal public addresses straight through", async () => {
    const result = await resolvePublicAddress("8.8.8.8");
    expect(result.ok).toBe(true);
  });
});

describe("fetchWebsite SSRF refusal", () => {
  it("refuses private and non-http targets without opening a socket", async () => {
    for (const url of [
      "http://127.0.0.1:8080/",
      "http://169.254.169.254/latest/meta-data/",
      "file:///etc/passwd",
      "http://localhost/",
      "http://10.1.2.3/",
    ]) {
      const result = await fetchWebsite(url);
      expect(result.ok, url).toBe(false);
      if (!result.ok) {
        expect(["BLOCKED_ADDRESS", "BLOCKED_HOST", "BLOCKED_SCHEME", "BLOCKED_PORT"]).toContain(
          result.reason,
        );
      }
    }
  });
});
