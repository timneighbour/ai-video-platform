/**
 * Utility for handling 429 / 503 rate-limit errors with exponential backoff + jitter.
 *
 * Strategy:
 *  1. Respect Retry-After header when present (Kling AI, Suno, etc.)
 *  2. Fall back to exponential backoff with ±20% jitter to spread retries
 *  3. Only retry on 429 (Too Many Requests) and 503 (Service Unavailable)
 *  4. Log every retry with timestamp, attempt number, and wait duration
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
}

function jitter(ms: number, pct = 0.2): number {
  // ±pct of ms
  return ms + (Math.random() * 2 - 1) * ms * pct;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 4,
    initialDelayMs = 3000,
    maxDelayMs = 60000,
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
        response?: {
          status?: number;
          headers?: Record<string, string>;
          data?: unknown;
        };
        message?: string;
      };

      const status = axiosErr?.response?.status;

      // Only retry on 429 (rate limited) or 503 (overloaded)
      if (status !== 429 && status !== 503) {
        throw error;
      }

      if (attempt === maxAttempts) break;

      // Respect Retry-After header if present
      const retryAfterHeader = axiosErr?.response?.headers?.["retry-after"];
      let waitMs: number;

      if (retryAfterHeader) {
        const retryAfterSecs = parseInt(retryAfterHeader, 10);
        waitMs = !isNaN(retryAfterSecs)
          ? Math.min(retryAfterSecs * 1000, maxDelayMs)
          : jitter(delayMs);
      } else {
        waitMs = jitter(delayMs);
      }

      waitMs = Math.min(waitMs, maxDelayMs);

      console.warn(
        `[RateLimit] ${new Date().toISOString()} HTTP ${status} on attempt ${attempt}/${maxAttempts}. ` +
        `Retry-After header: ${retryAfterHeader ?? "none"}. Waiting ${Math.round(waitMs)}ms before retry...`
      );

      await new Promise((resolve) => setTimeout(resolve, waitMs));

      // Exponential backoff for next attempt
      delayMs = Math.min(delayMs * backoffFactor, maxDelayMs);
    }
  }

  throw lastError;
}
