import { z } from "zod";

/**
 * The discovery provider boundary.
 *
 * LeadEngine must never be welded to one data vendor. Everything above this
 * interface works in terms of `DiscoveryBusiness`; nothing above it sees a
 * Google payload.
 */

export const discoverySearchInputSchema = z.object({
  /** Business category or free-text keyword, e.g. "plumber". */
  category: z.string().min(1).max(120),
  /** Human-typed geography, e.g. "Redlands, CA" or "San Bernardino County". */
  locationText: z.string().min(1).max(160),
  /** Search radius in meters, when the provider supports it. */
  radiusMeters: z.number().int().min(500).max(80_000).optional(),
  minRating: z.number().min(0).max(5).optional(),
  minReviews: z.number().int().min(0).optional(),
  websiteFilter: z.enum(["any", "with", "without"]).default("any"),
  maxResults: z.number().int().min(1).max(60).default(20),
});

export type DiscoverySearchInput = z.infer<typeof discoverySearchInputSchema>;

/** One business as returned by a provider, already normalized in shape. */
export interface DiscoveryBusiness {
  /** Provider-stable id. Used as a strong dedupe identifier. */
  externalId: string | null;
  name: string;
  category: string | null;
  formattedAddress: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  websiteUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  /** Provider-reported status, e.g. "OPERATIONAL" or "CLOSED_PERMANENTLY". */
  businessStatus: string | null;
  /** The raw provider payload, stored on ProspectSource for provenance. */
  raw: unknown;
}

export interface DiscoverySearchResult {
  businesses: DiscoveryBusiness[];
  /** True when results are fictional fixtures rather than real business data. */
  isFixture: boolean;
  usage: {
    provider: string;
    operation: string;
    requestCount: number;
    resultCount: number;
    durationMs: number;
    success: boolean;
    errorCode?: string;
    /** Only set when the provider itself reports a cost. Never estimated. */
    reportedCostUsd?: number;
  };
}

export type DiscoveryErrorCode =
  | "NOT_CONFIGURED"
  | "INVALID_LOCATION"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_ERROR";

export class DiscoveryProviderError extends Error {
  constructor(
    readonly code: DiscoveryErrorCode,
    message: string,
    readonly reason?: unknown,
  ) {
    super(message);
    this.name = "DiscoveryProviderError";
  }
}

export interface BusinessDiscoveryProvider {
  readonly id: string;
  readonly label: string;
  /** False when results are fictional and the UI must label them as demo data. */
  readonly returnsRealData: boolean;
  /** Whether the provider is usable right now (credentials present, etc.). */
  isConfigured(): boolean;
  search(input: DiscoverySearchInput): Promise<DiscoverySearchResult>;
  /** Optional richer lookup for a single business. */
  getDetails?(externalId: string): Promise<DiscoveryBusiness | null>;
}
