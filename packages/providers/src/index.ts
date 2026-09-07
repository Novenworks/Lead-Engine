import { DemoDiscoveryProvider } from "./discovery/demo";
import { GoogleDiscoveryProvider } from "./discovery/google";
import type { BusinessDiscoveryProvider } from "./discovery/types";
import {
  NoopScreenshotProvider,
  SnapSaveScreenshotProvider,
  UrlboxScreenshotProvider,
} from "./screenshot/providers";
import type { ScreenshotProvider } from "./screenshot/types";

export * from "./discovery/types";
export * from "./discovery/demo";
export * from "./discovery/google";
export * from "./screenshot/types";
export * from "./screenshot/providers";

export interface ProviderEnv {
  BUSINESS_DISCOVERY_PROVIDER?: string | undefined;
  GOOGLE_MAPS_API_KEY?: string | undefined;
  SCREENSHOT_PROVIDER?: string | undefined;
  URLBOX_API_KEY?: string | undefined;
  URLBOX_API_SECRET?: string | undefined;
  SNAPSAVE_API_URL?: string | undefined;
  SNAPSAVE_API_TOKEN?: string | undefined;
}

/**
 * Resolve the configured discovery provider.
 *
 * If Google is selected but has no key, we fall back to the demo provider
 * rather than breaking the app — but the returned provider reports
 * `returnsRealData: false`, so the UI labels the results as fixtures. We never
 * present demo data as Google data.
 */
export function createDiscoveryProvider(env: ProviderEnv): BusinessDiscoveryProvider {
  const requested = (env.BUSINESS_DISCOVERY_PROVIDER ?? "demo").trim().toLowerCase();

  if (requested === "google") {
    const google = new GoogleDiscoveryProvider({ apiKey: env.GOOGLE_MAPS_API_KEY });
    if (google.isConfigured()) return google;
    return new DemoDiscoveryProvider();
  }

  return new DemoDiscoveryProvider();
}

/** True when the operator asked for Google but the key is missing. */
export function discoveryProviderDegraded(env: ProviderEnv): boolean {
  const requested = (env.BUSINESS_DISCOVERY_PROVIDER ?? "demo").trim().toLowerCase();
  return requested === "google" && !env.GOOGLE_MAPS_API_KEY?.trim();
}

export function createScreenshotProvider(env: ProviderEnv): ScreenshotProvider {
  const requested = (env.SCREENSHOT_PROVIDER ?? "none").trim().toLowerCase();

  if (requested === "urlbox") {
    const provider = new UrlboxScreenshotProvider(env.URLBOX_API_KEY, env.URLBOX_API_SECRET);
    return provider.isConfigured() ? provider : new NoopScreenshotProvider();
  }
  if (requested === "snapsave") {
    const provider = new SnapSaveScreenshotProvider(env.SNAPSAVE_API_URL, env.SNAPSAVE_API_TOKEN);
    return provider.isConfigured() ? provider : new NoopScreenshotProvider();
  }
  return new NoopScreenshotProvider();
}
