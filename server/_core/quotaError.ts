/**
 * Quota / usage-exhausted error detection and handling.
 *
 * The Manus built-in Forge API returns HTTP 412 with a body like:
 *   {"code":9,"message":"your account has hit a usage exhausted"}
 *
 * This helper detects that pattern (and similar ones) and converts them
 * into a user-friendly TRPCError with code "TOO_MANY_REQUESTS".
 */
import { TRPCError } from "@trpc/server";

/** Patterns that indicate quota/usage exhaustion */
const QUOTA_PATTERNS = [
  /usage exhausted/i,
  /quota exceeded/i,
  /rate limit/i,
  /too many requests/i,
  /precondition failed/i,
  /412/,
];

/**
 * Returns true if the error message looks like a quota/usage exhaustion error.
 */
export function isQuotaError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : JSON.stringify(err);
  return QUOTA_PATTERNS.some((p) => p.test(msg));
}

/**
 * The user-facing message shown when quota is exhausted.
 */
export const QUOTA_EXHAUSTED_MESSAGE =
  "The AI service is temporarily unavailable due to high demand. Please wait a few minutes and try again. Your progress has been saved.";

/**
 * Wraps an async function. If it throws a quota error, re-throws as a
 * TRPCError with code TOO_MANY_REQUESTS and a friendly message.
 */
export async function withQuotaGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isQuotaError(err)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: QUOTA_EXHAUSTED_MESSAGE,
        cause: err,
      });
    }
    throw err;
  }
}
