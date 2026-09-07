/**
 * Screenshot provider boundary.
 *
 * LeadEngine only wants a picture of the prospect's homepage next to the
 * signals. It is not a screenshot product — SnapSave will own that. Keeping
 * this behind an interface means swapping providers is a config change.
 */

export interface ScreenshotRequest {
  url: string;
  width: number;
  height: number;
  fullPage?: boolean;
}

export interface ScreenshotReferenceResult {
  provider: string;
  /** Directly renderable URL, when the provider serves one. */
  url: string | null;
  /** Object key when the bytes were stored in R2 instead. */
  storageKey: string | null;
  width: number;
  height: number;
}

export type ScreenshotErrorCode = "NOT_CONFIGURED" | "PROVIDER_ERROR" | "PROVIDER_UNAVAILABLE";

export class ScreenshotProviderError extends Error {
  constructor(
    readonly code: ScreenshotErrorCode,
    message: string,
    readonly reason?: unknown,
  ) {
    super(message);
    this.name = "ScreenshotProviderError";
  }
}

export interface ScreenshotProvider {
  readonly id: string;
  readonly label: string;
  isConfigured(): boolean;
  capture(request: ScreenshotRequest): Promise<ScreenshotReferenceResult>;
}
