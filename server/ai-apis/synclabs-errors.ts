/**
 * Sync Labs Errors API — /v2/errors
 * ──────────────────────────────────
 * Provides machine-readable error code resolution and retry classification.
 *
 * The /v2/errors endpoint returns a full catalog of { code, message, suggestion }
 * objects. It is unauthenticated — no API key required.
 *
 * Usage:
 *   - When a generation job fails, read its `errorCode` field
 *   - Call classifySyncLabsError(errorCode) to determine whether to retry
 *   - Call resolveSyncLabsError(errorCode) for the human-readable suggestion
 *
 * API reference: https://sync.so/docs/developer-guides/error-handling
 */

import axios from "axios";

const SYNCLABS_ERRORS_URL = "https://api.sync.so/v2/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SyncLabsErrorEntry {
  code: string;
  message: string;
  suggestion: string;
}

/**
 * Retry classification for a failed generation:
 *   - "retry"       — transient error, safe to retry after backoff
 *   - "retry_later" — infrastructure overload, retry after longer delay
 *   - "no_retry"    — permanent failure (bad input, plan limit), fix before retrying
 *   - "escalate"    — internal SyncLabs error, contact support
 */
export type SyncLabsRetryAction = "retry" | "retry_later" | "no_retry" | "escalate";

export interface SyncLabsErrorClassification {
  errorCode: string;
  retryAction: SyncLabsRetryAction;
  retryDelayMs: number;
  message: string;
  suggestion: string;
}

// ─── Error catalog cache ──────────────────────────────────────────────────────

let _errorCatalog: Map<string, SyncLabsErrorEntry> | null = null;
let _catalogFetchedAt = 0;
const CATALOG_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch the full SyncLabs error catalog from /v2/errors.
 * Results are cached for 1 hour. The endpoint requires no authentication.
 */
export async function getSyncLabsErrorCatalog(): Promise<Map<string, SyncLabsErrorEntry>> {
  const now = Date.now();
  if (_errorCatalog && now - _catalogFetchedAt < CATALOG_TTL_MS) {
    return _errorCatalog;
  }

  try {
    const resp = await axios.get(SYNCLABS_ERRORS_URL, { timeout: 10_000 });
    const entries: SyncLabsErrorEntry[] = Array.isArray(resp.data) ? resp.data : resp.data?.errors ?? [];
    _errorCatalog = new Map(entries.map((e) => [e.code, e]));
    _catalogFetchedAt = now;
    console.log(`[SyncLabsErrors] Loaded ${_errorCatalog.size} error codes from catalog`);
  } catch (err: any) {
    console.warn(`[SyncLabsErrors] Could not fetch error catalog: ${String(err?.message ?? err).slice(0, 200)} — using built-in fallback`);
    _errorCatalog = new Map(BUILTIN_ERROR_CATALOG.map((e) => [e.code, e]));
    _catalogFetchedAt = now;
  }

  return _errorCatalog!;
}

// ─── Retry classification rules ───────────────────────────────────────────────

/**
 * Classify a SyncLabs errorCode into a retry action and recommended delay.
 *
 * Classification logic:
 *   - Infrastructure errors (timeout, pipeline_failed, infra_*) → retry after backoff
 *   - Resource exhaustion / service unavailable → retry_later (longer delay)
 *   - Input validation errors → no_retry (fix the input first)
 *   - Plan/billing errors → no_retry (upgrade plan)
 *   - Internal auth / unhandled → escalate
 */
export async function classifySyncLabsError(
  errorCode: string | undefined | null
): Promise<SyncLabsErrorClassification> {
  const catalog = await getSyncLabsErrorCatalog();
  const entry = errorCode ? catalog.get(errorCode) : undefined;

  const message = entry?.message ?? "Unknown error";
  const suggestion = entry?.suggestion ?? "Check the SyncLabs status page and retry.";

  if (!errorCode) {
    return { errorCode: "unknown", retryAction: "retry", retryDelayMs: 10_000, message, suggestion };
  }

  // ── Transient infrastructure errors — safe to retry ──────────────────────
  if (
    errorCode === "generation_timeout" ||
    errorCode === "generation_pipeline_failed" ||
    errorCode === "generation_database_error" ||
    errorCode === "generation_infra_storage_error"
  ) {
    return { errorCode, retryAction: "retry", retryDelayMs: 15_000, message, suggestion };
  }

  // ── Resource exhaustion — retry after longer delay ────────────────────────
  if (
    errorCode === "generation_infra_resource_exhausted" ||
    errorCode === "generation_infra_service_unavailable"
  ) {
    return { errorCode, retryAction: "retry_later", retryDelayMs: 60_000, message, suggestion };
  }

  // ── Internal auth / unhandled — escalate ─────────────────────────────────
  if (
    errorCode === "generation_internal_auth" ||
    errorCode === "generation_unhandled_error"
  ) {
    return { errorCode, retryAction: "escalate", retryDelayMs: 0, message, suggestion };
  }

  // ── Input validation errors — do not retry without fixing input ───────────
  if (
    errorCode.startsWith("generation_input_") ||
    errorCode === "generation_unsupported_model" ||
    errorCode === "generation_media_metadata_missing" ||
    errorCode === "generation_audio_length_exceeded" ||
    errorCode === "generation_text_length_exceeded" ||
    errorCode === "generation_audio_missing" ||
    errorCode === "generation_video_missing" ||
    errorCode === "generation_input_validation_failed" ||
    errorCode === "generation_input_audio_invalid" ||
    errorCode === "generation_plan_duration_exceeded"
  ) {
    return { errorCode, retryAction: "no_retry", retryDelayMs: 0, message, suggestion };
  }

  // ── Plan / billing errors — do not retry ─────────────────────────────────
  if (
    errorCode === "batch_plan_required" ||
    errorCode === "batch_concurrency_limit_reached" ||
    errorCode === "concurrency_limit_reached" ||
    errorCode === "rate_limit_exceeded"
  ) {
    return { errorCode, retryAction: "retry_later", retryDelayMs: 30_000, message, suggestion };
  }

  // ── Default: retry with standard backoff ─────────────────────────────────
  return { errorCode, retryAction: "retry", retryDelayMs: 10_000, message, suggestion };
}

/**
 * Resolve a SyncLabs errorCode to its human-readable message and suggestion.
 * Returns a fallback message if the code is not in the catalog.
 */
export async function resolveSyncLabsError(
  errorCode: string | undefined | null
): Promise<{ message: string; suggestion: string }> {
  const catalog = await getSyncLabsErrorCatalog();
  const entry = errorCode ? catalog.get(errorCode) : undefined;
  return {
    message: entry?.message ?? `Unknown error code: ${errorCode ?? "(none)"}`,
    suggestion: entry?.suggestion ?? "Check the SyncLabs status page at https://status.sync.so and retry.",
  };
}

/**
 * Format a SyncLabs error for logging.
 * Includes the error code, message, suggestion, and retry action.
 */
export async function formatSyncLabsError(
  errorCode: string | undefined | null,
  jobId?: string
): Promise<string> {
  const classification = await classifySyncLabsError(errorCode);
  const jobPart = jobId ? ` (job: ${jobId})` : "";
  return (
    `[SyncLabs${jobPart}] errorCode=${classification.errorCode} ` +
    `action=${classification.retryAction} ` +
    `message="${classification.message}" ` +
    `suggestion="${classification.suggestion}"`
  );
}

// ─── Built-in fallback catalog ────────────────────────────────────────────────
// Used when the /v2/errors endpoint is unreachable. Matches the documented codes.

const BUILTIN_ERROR_CATALOG: SyncLabsErrorEntry[] = [
  { code: "generation_unsupported_model", message: "The requested model is not supported for this operation.", suggestion: "Check the model documentation and update your request to use a supported model." },
  { code: "generation_media_metadata_missing", message: "Required media metadata is missing from the request.", suggestion: "Ensure your media file includes duration (audio) and duration + frame_rate (video) metadata." },
  { code: "generation_audio_length_exceeded", message: "The provided audio exceeds the maximum allowed length.", suggestion: "Trim or split your audio so each generation is under 300 seconds (5 minutes)." },
  { code: "generation_text_length_exceeded", message: "Text must be less than 5000 characters in one generation.", suggestion: "Reduce the text input to 5,000 characters or fewer, or split into multiple requests." },
  { code: "generation_audio_missing", message: "No audio file was provided in the request.", suggestion: "Include the audio file in your request payload." },
  { code: "generation_video_missing", message: "No video file was provided in the request.", suggestion: "Include the video file in your request payload." },
  { code: "generation_input_validation_failed", message: "Failed to validate input.", suggestion: "Review your input data to ensure it meets all API requirements." },
  { code: "generation_input_audio_invalid", message: "The provided audio file has invalid metadata.", suggestion: "Re-encode your audio with FFmpeg: ffmpeg -i input.wav -c:a pcm_s16le output.wav" },
  { code: "generation_input_asset_type_mismatch", message: "An asset's actual type doesn't match the input slot.", suggestion: "Make sure each input's type matches the asset you're passing." },
  { code: "generation_input_too_many_visual", message: "The request contains more than one visual input.", suggestion: "Send exactly one video or image input." },
  { code: "generation_plan_duration_exceeded", message: "The output duration exceeds your plan's per-generation limit.", suggestion: "Upgrade your plan or use cut_off sync_mode to shorten output." },
  { code: "generation_timeout", message: "The generation process exceeded the maximum allowed time.", suggestion: "Retry after a short delay. Try submitting during off-peak hours." },
  { code: "generation_pipeline_failed", message: "An error occurred in the generation pipeline.", suggestion: "Try resubmitting the request. Some pipeline errors are temporary." },
  { code: "generation_database_error", message: "An error occurred while accessing the database.", suggestion: "Try again after a short wait. Database errors can be temporary." },
  { code: "generation_internal_auth", message: "Authentication failed for internal generation service.", suggestion: "Contact SyncLabs support — this is an internal error." },
  { code: "generation_unhandled_error", message: "An unexpected error occurred during the generation process.", suggestion: "Try again. If persistent, contact SyncLabs support with your request details." },
  { code: "generation_infra_storage_error", message: "An error occurred while accessing the storage on infra layer.", suggestion: "Retry after a short delay. Storage errors are often temporary." },
  { code: "generation_infra_resource_exhausted", message: "The infra resources are exhausted.", suggestion: "Wait a few minutes and retry. Consider submitting during off-peak hours." },
  { code: "generation_infra_service_unavailable", message: "The infra service is unavailable.", suggestion: "Check https://status.sync.so for outages. Retry after a short delay." },
  { code: "concurrency_limit_reached", message: "You have too many generations in progress.", suggestion: "Wait for in-flight generations to finish, or upgrade your plan." },
  { code: "rate_limit_exceeded", message: "Your per-key request rate was exceeded.", suggestion: "Slow your request rate and implement exponential backoff." },
];
