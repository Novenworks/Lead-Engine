import { createHmac } from "node:crypto";
import {
  ScreenshotProviderError,
  type ScreenshotProvider,
  type ScreenshotReferenceResult,
  type ScreenshotRequest,
} from "./types";

/**
 * The default. Honest about doing nothing: the UI shows "preview not
 * configured" rather than a broken image.
 */
export class NoopScreenshotProvider implements ScreenshotProvider {
  readonly id = "none";
  readonly label = "Disabled";

  isConfigured(): boolean {
    return false;
  }

  async capture(): Promise<ScreenshotReferenceResult> {
    throw new ScreenshotProviderError(
      "NOT_CONFIGURED",
      "No screenshot provider is configured. Set SCREENSHOT_PROVIDER to enable previews.",
    );
  }
}

/**
 * Urlbox renders on their side and serves the image from a signed URL, so
 * there is nothing to fetch or store here.
 */
export class UrlboxScreenshotProvider implements ScreenshotProvider {
  readonly id = "urlbox";
  readonly label = "Urlbox";

  constructor(
    private readonly apiKey: string | undefined,
    private readonly apiSecret: string | undefined,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async capture(request: ScreenshotRequest): Promise<ScreenshotReferenceResult> {
    if (!this.apiKey) {
      throw new ScreenshotProviderError("NOT_CONFIGURED", "URLBOX_API_KEY is not set.");
    }

    const params = new URLSearchParams({
      url: request.url,
      width: String(request.width),
      height: String(request.height),
      format: "png",
      thumb_width: String(Math.min(request.width, 1200)),
      full_page: request.fullPage ? "true" : "false",
      block_ads: "true",
    });
    const query = params.toString();

    // Urlbox signs the query with the secret when one is configured; without
    // a secret the unsigned endpoint is used.
    const path = this.apiSecret
      ? `${this.apiKey}/${createHmac("sha256", this.apiSecret).update(query).digest("hex")}/png?${query}`
      : `${this.apiKey}/png?${query}`;

    return {
      provider: this.id,
      url: `https://api.urlbox.io/v1/${path}`,
      storageKey: null,
      width: request.width,
      height: request.height,
    };
  }
}

/**
 * Placeholder adapter for the future Novenworks SnapSave service. It only
 * activates when both the URL and the token are configured; there is no
 * fallback that fakes a capture.
 */
export class SnapSaveScreenshotProvider implements ScreenshotProvider {
  readonly id = "snapsave";
  readonly label = "SnapSave";

  constructor(
    private readonly apiUrl: string | undefined,
    private readonly apiToken: string | undefined,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiUrl && this.apiToken);
  }

  async capture(request: ScreenshotRequest): Promise<ScreenshotReferenceResult> {
    if (!this.isConfigured()) {
      throw new ScreenshotProviderError(
        "NOT_CONFIGURED",
        "SNAPSAVE_API_URL and SNAPSAVE_API_TOKEN must both be set.",
      );
    }

    const response = await this.fetchImpl(`${this.apiUrl!.replace(/\/$/, "")}/v1/captures`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({
        url: request.url,
        viewport: { width: request.width, height: request.height },
        fullPage: request.fullPage ?? false,
      }),
    });

    if (!response.ok) {
      throw new ScreenshotProviderError(
        response.status >= 500 ? "PROVIDER_UNAVAILABLE" : "PROVIDER_ERROR",
        `SnapSave returned HTTP ${response.status}.`,
      );
    }

    const body = (await response.json()) as { url?: string; storageKey?: string };
    return {
      provider: this.id,
      url: body.url ?? null,
      storageKey: body.storageKey ?? null,
      width: request.width,
      height: request.height,
    };
  }
}
