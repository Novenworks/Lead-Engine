import {
  DiscoveryProviderError,
  type BusinessDiscoveryProvider,
  type DiscoveryBusiness,
  type DiscoverySearchInput,
  type DiscoverySearchResult,
} from "./types";

/**
 * Google Places adapter, written against the Places API (New) v1 REST surface
 * and the Geocoding API.
 *
 * Endpoints used:
 *   POST https://places.googleapis.com/v1/places:searchText
 *   GET  https://places.googleapis.com/v1/places/{PLACE_ID}
 *   GET  https://maps.googleapis.com/maps/api/geocode/json
 *
 * Places API (New) requires an explicit `X-Goog-FieldMask`; a request without
 * one is rejected, and a wide one is billed at a higher tier. The masks below
 * request exactly the fields LeadEngine stores.
 *
 * NOTE ON VERIFICATION: this adapter has not been exercised against the live
 * Google API — no key was available during the build and developers.google.com
 * is unreachable from the build environment. The response mapping is covered
 * by fixture tests only. Treat the first real run as a smoke test.
 */

const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.businessStatus",
  "nextPageToken",
].join(",");

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "location",
  "rating",
  "userRatingCount",
  "websiteUri",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "primaryTypeDisplayName",
  "types",
  "businessStatus",
].join(",");

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  businessStatus?: string;
}

function component(place: GooglePlace, type: string): string | null {
  const match = place.addressComponents?.find((c) => c.types?.includes(type));
  return match?.shortText ?? match?.longText ?? null;
}

function toBusiness(place: GooglePlace): DiscoveryBusiness {
  return {
    externalId: place.id ?? null,
    name: place.displayName?.text ?? "(unnamed)",
    category:
      place.primaryTypeDisplayName?.text ??
      // Fall back to the machine type, humanized: "plumber" from "plumber".
      (place.types?.[0] ? place.types[0].replace(/_/g, " ") : null),
    formattedAddress: place.formattedAddress ?? null,
    city: component(place, "locality") ?? component(place, "postal_town"),
    region: component(place, "administrative_area_level_1"),
    postalCode: component(place, "postal_code"),
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
    websiteUrl: place.websiteUri ?? null,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
    businessStatus: place.businessStatus ?? null,
    raw: place,
  };
}

/** Exposed so fixture tests can exercise the mapping without a network call. */
export function mapGooglePlace(place: unknown): DiscoveryBusiness {
  return toBusiness(place as GooglePlace);
}

function classifyHttpError(status: number, body: string): DiscoveryProviderError {
  if (status === 429) {
    return new DiscoveryProviderError("RATE_LIMITED", "Google rate-limited the request.", body);
  }
  if (status === 403) {
    // Google returns 403 both for a bad key and for an exhausted quota.
    const code = /quota/i.test(body) ? "QUOTA_EXCEEDED" : "PROVIDER_ERROR";
    return new DiscoveryProviderError(code, `Google rejected the request (HTTP 403).`, body);
  }
  if (status >= 500) {
    return new DiscoveryProviderError(
      "PROVIDER_UNAVAILABLE",
      `Google returned HTTP ${status}.`,
      body,
    );
  }
  return new DiscoveryProviderError("PROVIDER_ERROR", `Google returned HTTP ${status}.`, body);
}

export interface GoogleProviderOptions {
  apiKey: string | undefined;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class GoogleDiscoveryProvider implements BusinessDiscoveryProvider {
  readonly id = "google";
  readonly label = "Google Places";
  readonly returnsRealData = true;

  private readonly apiKey: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: GoogleProviderOptions) {
    this.apiKey = options.apiKey?.trim() || undefined;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private requireKey(): string {
    if (!this.apiKey) {
      throw new DiscoveryProviderError(
        "NOT_CONFIGURED",
        "GOOGLE_MAPS_API_KEY is not set, so the Google provider cannot run.",
      );
    }
    return this.apiKey;
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new DiscoveryProviderError(
          "PROVIDER_UNAVAILABLE",
          `Google did not respond within ${this.timeoutMs}ms.`,
          error,
        );
      }
      throw new DiscoveryProviderError("PROVIDER_UNAVAILABLE", "Could not reach Google.", error);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Geocode the operator's typed location so we can bias the search. */
  private async geocode(
    locationText: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    const key = this.requireKey();
    const url = `${GEOCODE_URL}?address=${encodeURIComponent(locationText)}&key=${encodeURIComponent(key)}`;
    const response = await this.request(url, { method: "GET" });
    const body = await response.text();

    if (!response.ok) throw classifyHttpError(response.status, body);

    const parsed = JSON.parse(body) as {
      status?: string;
      results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
    };

    if (parsed.status === "ZERO_RESULTS" || (parsed.results ?? []).length === 0) {
      throw new DiscoveryProviderError(
        "INVALID_LOCATION",
        `Google could not find a location matching "${locationText}".`,
      );
    }
    if (parsed.status === "OVER_QUERY_LIMIT") {
      throw new DiscoveryProviderError("QUOTA_EXCEEDED", "Geocoding quota exceeded.");
    }
    if (parsed.status !== "OK") {
      throw new DiscoveryProviderError(
        "PROVIDER_ERROR",
        `Geocoding failed with status ${parsed.status}.`,
      );
    }

    const location = parsed.results?.[0]?.geometry?.location;
    if (location?.lat === undefined || location.lng === undefined) return null;
    return { latitude: location.lat, longitude: location.lng };
  }

  async search(input: DiscoverySearchInput): Promise<DiscoverySearchResult> {
    const key = this.requireKey();
    const startedAt = Date.now();
    let requestCount = 0;

    try {
      // Only geocode when a radius was requested; otherwise the text query
      // carries the geography and we save a billable call.
      let center: { latitude: number; longitude: number } | null = null;
      if (input.radiusMeters) {
        requestCount++;
        center = await this.geocode(input.locationText);
      }

      const body: Record<string, unknown> = {
        textQuery: `${input.category} in ${input.locationText}`,
        maxResultCount: Math.min(input.maxResults, 20),
        languageCode: "en",
        regionCode: "US",
      };
      if (input.minRating !== undefined) body.minRating = input.minRating;
      if (center && input.radiusMeters) {
        body.locationBias = {
          circle: { center, radius: input.radiusMeters },
        };
      }

      requestCount++;
      const response = await this.request(PLACES_SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": SEARCH_FIELD_MASK,
        },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      if (!response.ok) throw classifyHttpError(response.status, text);

      const parsed = JSON.parse(text) as { places?: GooglePlace[] };
      let businesses = (parsed.places ?? []).map(toBusiness);

      // Filters Places API (New) does not express server-side.
      if (input.minReviews !== undefined) {
        businesses = businesses.filter((b) => (b.reviewCount ?? 0) >= input.minReviews!);
      }
      if (input.websiteFilter === "with") businesses = businesses.filter((b) => Boolean(b.websiteUrl));
      if (input.websiteFilter === "without") businesses = businesses.filter((b) => !b.websiteUrl);

      return {
        businesses: businesses.slice(0, input.maxResults),
        isFixture: false,
        usage: {
          provider: this.id,
          operation: "searchText",
          requestCount,
          resultCount: businesses.length,
          durationMs: Date.now() - startedAt,
          success: true,
        },
      };
    } catch (error) {
      const code = error instanceof DiscoveryProviderError ? error.code : "PROVIDER_ERROR";
      // Usage is recorded for failures too — a burst of failed calls is still
      // a burst of billable calls.
      const failure: DiscoverySearchResult["usage"] = {
        provider: this.id,
        operation: "searchText",
        requestCount,
        resultCount: 0,
        durationMs: Date.now() - startedAt,
        success: false,
        errorCode: code,
      };
      if (error instanceof DiscoveryProviderError) {
        (error as DiscoveryProviderError & { usage?: unknown }).usage = failure;
        throw error;
      }
      const wrapped = new DiscoveryProviderError("PROVIDER_ERROR", String(error), error);
      (wrapped as DiscoveryProviderError & { usage?: unknown }).usage = failure;
      throw wrapped;
    }
  }

  async getDetails(externalId: string): Promise<DiscoveryBusiness | null> {
    const key = this.requireKey();
    const response = await this.request(
      `${PLACES_DETAILS_URL}/${encodeURIComponent(externalId)}`,
      {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": DETAILS_FIELD_MASK,
        },
      },
    );

    const text = await response.text();
    if (response.status === 404) return null;
    if (!response.ok) throw classifyHttpError(response.status, text);

    return toBusiness(JSON.parse(text) as GooglePlace);
  }
}
