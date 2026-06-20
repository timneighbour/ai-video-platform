/**
 * selfHeal.ts — Wiz AI Self-Healing Retry Utilities
 *
 * Provides automatic retry with exponential backoff for all critical
 * pipeline operations. Any function wrapped with withSelfHeal() will
 * automatically retry on transient failures before surfacing an error.
 *
 * Usage:
 *   const result = await withSelfHeal(() => generateStoryboard(...), {
 *     maxAttempts: 3,
 *     label: "generateStoryboard",
 *   });
 */

export interface SelfHealOptions {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts?: number;
  /** Base delay in ms between retries (doubles each attempt). Default: 2000 */
  baseDelayMs?: number;
  /** Max delay cap in ms. Default: 15000 */
  maxDelayMs?: number;
  /** Human-readable label for logging. Default: "operation" */
  label?: string;
  /** Optional predicate — if it returns false, the error is NOT retried. */
  isRetryable?: (err: unknown) => boolean;
  /** Optional callback invoked before each retry attempt. */
  onRetry?: (attempt: number, err: unknown) => void;
}

/** Patterns that indicate a transient / retryable error */
const TRANSIENT_PATTERNS = [
  /rate.?limit/i,
  /too.?many.?requests/i,
  /503/,
  /502/,
  /504/,
  /service.?unavailable/i,
  /bad.?gateway/i,
  /temporarily.?unavailable/i,
  /timeout/i,
  /ECONNRESET/,
  /ECONNREFUSED/,
  /ETIMEDOUT/,
  /socket.?hang.?up/i,
  /network.?error/i,
  /usage.?exhausted/i,
  /quota.?exceeded/i,
  /precondition.?failed/i,
  /internal.?server.?error/i,
  /500/,
];

/** Returns true if the error looks like a transient/retryable failure */
export function isTransientError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message + (err.stack ?? "")
      : typeof err === "string"
      ? err
      : JSON.stringify(err);
  return TRANSIENT_PATTERNS.some((p) => p.test(msg));
}

/**
 * Wraps an async function with automatic retry + exponential backoff.
 * Non-retryable errors (e.g. FORBIDDEN, NOT_FOUND, validation) are
 * re-thrown immediately without retrying.
 */
export async function withSelfHeal<T>(
  fn: () => Promise<T>,
  options: SelfHealOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 2000,
    maxDelayMs = 15000,
    label = "operation",
    isRetryable = isTransientError,
    onRetry,
  } = options;

  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      if (attempt > 1) {
        console.log(`[SelfHeal] ${label} succeeded on attempt ${attempt}/${maxAttempts}`);
      }
      return result;
    } catch (err) {
      lastErr = err;

      // Check if this is a non-retryable error (auth, validation, not-found, etc.)
      const tRPCCode = (err as any)?.data?.code ?? (err as any)?.code;
      const isNonRetryable =
        tRPCCode === "FORBIDDEN" ||
        tRPCCode === "UNAUTHORIZED" ||
        tRPCCode === "NOT_FOUND" ||
        tRPCCode === "BAD_REQUEST" ||
        tRPCCode === "PARSE_ERROR";

      if (isNonRetryable || !isRetryable(err)) {
        console.warn(`[SelfHeal] ${label} failed with non-retryable error on attempt ${attempt}: ${(err as any)?.message}`);
        throw err;
      }

      if (attempt === maxAttempts) {
        console.error(`[SelfHeal] ${label} exhausted all ${maxAttempts} attempts. Last error: ${(err as any)?.message}`);
        break;
      }

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      console.warn(`[SelfHeal] ${label} failed on attempt ${attempt}/${maxAttempts} — retrying in ${delay}ms. Error: ${(err as any)?.message}`);

      if (onRetry) onRetry(attempt, err);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastErr;
}

/**
 * Validates that a value is a non-empty array.
 * If not, throws an error that will trigger a retry.
 */
export function assertNonEmptyArray<T>(value: unknown, label: string): T[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`[SelfHeal] ${label} returned empty or non-array result — will retry`);
  }
  return value as T[];
}
