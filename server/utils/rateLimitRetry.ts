/**
 * Utility for handling 429 rate-limit errors with exponential backoff.
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
}

/**
 * Wraps an async function with exponential backoff retry logic.
 * Handles HTTP 429 (Too Many Requests) by respecting Retry-After headers
 * and backing off exponentially.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 4,
    initialDelayMs = 2000,
    maxDelayMs = 30000,
    backoffFactor = 2,
  } = options;

  let lastError: unknown;
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      const axiosErr = error as {
        response?: { status?: number; headers?: Record<string, string>; data?: unknown };
        message?: string;
      };

      const status = axiosErr?.response?.status;

      // Only retry on 429 or 503 (service unavailable / overloaded)
      if (status !== 429 && status !== 503) {
        throw error;
      }

      if (attempt === maxAttempts) break;

      // Respect Retry-After header if present
      const retryAfter = axiosErr?.response?.headers?.["retry-after"];
      let waitMs = delayMs;

      if (retryAfter) {
        const retryAfterSecs = parseInt(retryAfter, 10);
        if (!isNaN(retryAfterSecs)) {
          waitMs = Math.min(retryAfterSecs * 1000, maxDelayMs);
        }
      }

      console.warn(
        `[RateLimit] HTTP ${status} on attempt ${attempt}/${maxAttempts}. Retrying in ${waitMs}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, waitMs));

      // Exponential backoff for next attempt
      delayMs = Math.min(delayMs * backoffFactor, maxDelayMs);
    }
  }

  throw lastError;
}
