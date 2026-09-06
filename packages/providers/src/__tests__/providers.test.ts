import { describe, expect, it } from "vitest";
import {
  DemoDiscoveryProvider,
  type DiscoveryProviderError,
  GoogleDiscoveryProvider,
  NoopScreenshotProvider,
  UrlboxScreenshotProvider,
  createDiscoveryProvider,
  createScreenshotProvider,
  discoveryProviderDegraded,
  discoverySearchInputSchema,
  mapGooglePlace,
} from "../index";

const search = (overrides: Record<string, unknown> = {}) =>
  discoverySearchInputSchema.parse({
    category: "plumber",
    locationText: "Redlands, CA",
    ...overrides,
  });

describe("demo provider", () => {
  it("returns fictional businesses and says so", async () => {
    const result = await new DemoDiscoveryProvider().search(search());
    expect(result.isFixture).toBe(true);
    expect(result.businesses.length).toBeGreaterThan(0);
    expect(result.businesses[0]!.name).toContain("Cedar Peak");
    // Fixture domains use the reserved .example TLD so none can resolve.
    for (const business of result.businesses) {
      if (business.websiteUrl) expect(business.websiteUrl).toContain(".example");
    }
  });

  it("charges nothing and reports zero provider requests", async () => {
    const result = await new DemoDiscoveryProvider().search(search());
    expect(result.usage.requestCount).toBe(0);
    expect(result.usage.reportedCostUsd).toBeUndefined();
  });

  it("applies rating, review and website filters", async () => {
    const provider = new DemoDiscoveryProvider();
    const highRated = await provider.search(search({ minRating: 4.8 }));
    expect(highRated.businesses.every((b) => (b.rating ?? 0) >= 4.8)).toBe(true);

    const noSite = await provider.search(
      search({ category: "electrician", websiteFilter: "without" }),
    );
    expect(noSite.businesses.every((b) => !b.websiteUrl)).toBe(true);

    const busy = await provider.search(search({ minReviews: 200 }));
    expect(busy.businesses.every((b) => (b.reviewCount ?? 0) >= 200)).toBe(true);
  });

  it("honours maxResults", async () => {
    const result = await new DemoDiscoveryProvider().search(
      search({ locationText: "Redlands, CA", maxResults: 1 }),
    );
    expect(result.businesses).toHaveLength(1);
  });

  it("requires a category and a location", () => {
    expect(() => search({ category: "" })).toThrow();
    expect(() => search({ locationText: "" })).toThrow();
  });

  it("looks up a single fixture by id", async () => {
    const provider = new DemoDiscoveryProvider();
    expect((await provider.getDetails("demo-cedar-peak-plumbing"))?.name).toBe(
      "Cedar Peak Plumbing",
    );
    expect(await provider.getDetails("does-not-exist")).toBeNull();
  });
});

describe("google provider", () => {
  it("reports itself unconfigured without a key and refuses to run", async () => {
    const provider = new GoogleDiscoveryProvider({ apiKey: undefined });
    expect(provider.isConfigured()).toBe(false);
    await expect(provider.search(search())).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("maps a Places API (New) place onto the shared shape", () => {
    const business = mapGooglePlace({
      id: "ChIJexample",
      displayName: { text: "Cedar Peak Plumbing" },
      formattedAddress: "418 W State St, Redlands, CA 92373, USA",
      addressComponents: [
        { longText: "Redlands", shortText: "Redlands", types: ["locality"] },
        { longText: "California", shortText: "CA", types: ["administrative_area_level_1"] },
        { longText: "92373", shortText: "92373", types: ["postal_code"] },
      ],
      location: { latitude: 34.0556, longitude: -117.1825 },
      rating: 4.9,
      userRatingCount: 384,
      websiteUri: "https://cedarpeak.example",
      nationalPhoneNumber: "(909) 555-0142",
      primaryTypeDisplayName: { text: "Plumber" },
      types: ["plumber", "point_of_interest"],
      businessStatus: "OPERATIONAL",
    });

    expect(business).toMatchObject({
      externalId: "ChIJexample",
      name: "Cedar Peak Plumbing",
      category: "Plumber",
      city: "Redlands",
      region: "CA",
      postalCode: "92373",
      rating: 4.9,
      reviewCount: 384,
      websiteUrl: "https://cedarpeak.example",
      phone: "(909) 555-0142",
      businessStatus: "OPERATIONAL",
    });
  });

  it("falls back to the machine type when no display name is supplied", () => {
    expect(mapGooglePlace({ types: ["garage_door_supplier"] }).category).toBe(
      "garage door supplier",
    );
  });

  it("survives a sparse payload without inventing values", () => {
    const business = mapGooglePlace({ id: "x", displayName: { text: "Nameless" } });
    expect(business.rating).toBeNull();
    expect(business.reviewCount).toBeNull();
    expect(business.websiteUrl).toBeNull();
    expect(business.city).toBeNull();
  });

  it("classifies provider failures rather than surfacing raw HTTP", async () => {
    const cases: Array<[number, string, string]> = [
      [429, "", "RATE_LIMITED"],
      [403, "quota exceeded", "QUOTA_EXCEEDED"],
      [403, "bad key", "PROVIDER_ERROR"],
      [503, "", "PROVIDER_UNAVAILABLE"],
      [400, "", "PROVIDER_ERROR"],
    ];
    for (const [status, body, expected] of cases) {
      const provider = new GoogleDiscoveryProvider({
        apiKey: "test-key",
        fetchImpl: async () => new Response(body, { status }),
      });
      await expect(provider.search(search()), `${status} ${body}`).rejects.toMatchObject({
        code: expected,
      });
    }
  });

  it("records usage even when the call fails", async () => {
    const provider = new GoogleDiscoveryProvider({
      apiKey: "test-key",
      fetchImpl: async () => new Response("", { status: 500 }),
    });
    await provider
      .search(search())
      .catch((error: DiscoveryProviderError & { usage?: { success: boolean } }) => {
        expect(error.usage?.success).toBe(false);
      });
  });

  it("parses a successful search response", async () => {
    const provider = new GoogleDiscoveryProvider({
      apiKey: "test-key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            places: [
              {
                id: "a",
                displayName: { text: "With site" },
                websiteUri: "https://a.example",
                userRatingCount: 50,
              },
              { id: "b", displayName: { text: "No site" }, userRatingCount: 5 },
            ],
          }),
          { status: 200 },
        ),
    });

    const all = await provider.search(search());
    expect(all.isFixture).toBe(false);
    expect(all.businesses).toHaveLength(2);
    expect(all.usage.success).toBe(true);

    // Filters Places API cannot express are applied client-side.
    const withSite = await provider.search(search({ websiteFilter: "with" }));
    expect(withSite.businesses.map((b) => b.name)).toEqual(["With site"]);

    const busy = await provider.search(search({ minReviews: 10 }));
    expect(busy.businesses.map((b) => b.name)).toEqual(["With site"]);
  });
});

describe("provider selection degrades honestly", () => {
  it("uses the demo provider by default", () => {
    expect(createDiscoveryProvider({}).id).toBe("demo");
  });

  it("falls back to demo when google is selected without a key, and flags it", () => {
    const env = { BUSINESS_DISCOVERY_PROVIDER: "google" };
    const provider = createDiscoveryProvider(env);
    expect(provider.id).toBe("demo");
    // The important part: nothing downstream can mistake this for real data.
    expect(provider.returnsRealData).toBe(false);
    expect(discoveryProviderDegraded(env)).toBe(true);
  });

  it("uses google when a key is present", () => {
    const env = { BUSINESS_DISCOVERY_PROVIDER: "google", GOOGLE_MAPS_API_KEY: "k" };
    expect(createDiscoveryProvider(env).returnsRealData).toBe(true);
    expect(discoveryProviderDegraded(env)).toBe(false);
  });
});

describe("screenshot providers", () => {
  it("defaults to disabled and refuses rather than faking a capture", async () => {
    const provider = createScreenshotProvider({});
    expect(provider).toBeInstanceOf(NoopScreenshotProvider);
    expect(provider.isConfigured()).toBe(false);
    await expect(
      provider.capture({ url: "https://x.example", width: 1440, height: 900 }),
    ).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("falls back to disabled when a provider is selected without credentials", () => {
    expect(createScreenshotProvider({ SCREENSHOT_PROVIDER: "urlbox" }).id).toBe("none");
    expect(createScreenshotProvider({ SCREENSHOT_PROVIDER: "snapsave" }).id).toBe("none");
    expect(
      createScreenshotProvider({ SCREENSHOT_PROVIDER: "snapsave", SNAPSAVE_API_URL: "https://x" })
        .id,
    ).toBe("none");
  });

  it("builds a urlbox url when configured", async () => {
    const provider = new UrlboxScreenshotProvider("key", "secret");
    expect(provider.isConfigured()).toBe(true);
    const capture = await provider.capture({ url: "https://x.example", width: 1440, height: 900 });
    expect(capture.url).toContain("api.urlbox.io");
    expect(capture.url).toContain("key");
    // The secret itself must never appear in the generated URL.
    expect(capture.url).not.toContain("secret");
  });
});
