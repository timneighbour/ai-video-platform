/**
 * useSelfHealingMutation.ts — Wiz AI Frontend Self-Healing Hook
 *
 * Wraps any async function with automatic retry + exponential backoff.
 * Shows a "Retrying automatically..." toast on transient failures so the
 * user knows the system is working it out for them.
 *
 * Usage:
 *   const { execute, isLoading, error } = useSelfHealingMutation(
 *     (input) => trpc.musicVideo.generateStoryboard.mutateAsync(input),
 *     { maxAttempts: 3, label: "Storyboard generation" }
 *   );
 *   await execute({ jobId });
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface SelfHealOptions {
  /** Maximum attempts (including first). Default: 3 */
  maxAttempts?: number;
  /** Base delay in ms between retries. Default: 2000 */
  baseDelayMs?: number;
  /** Max delay cap in ms. Default: 12000 */
  maxDelayMs?: number;
  /** Human-readable label shown in retry toasts. Default: "operation" */
  label?: string;
  /** Optional predicate — return false to skip retry for this error. */
  isRetryable?: (err: unknown) => boolean;
}

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
  /network.?error/i,
  /usage.?exhausted/i,
  /quota/i,
  /500/,
  /internal.?server/i,
  /ECONNRESET/,
  /fetch.?failed/i,
  /load.?failed/i,
];

function isTransientError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : JSON.stringify(err);
  // tRPC non-retryable codes
  const code = (err as any)?.data?.code ?? (err as any)?.code;
  if (
    code === "FORBIDDEN" ||
    code === "UNAUTHORIZED" ||
    code === "NOT_FOUND" ||
    code === "BAD_REQUEST" ||
    code === "PARSE_ERROR"
  ) {
    return false;
  }
  return TRANSIENT_PATTERNS.some((p) => p.test(msg));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function useSelfHealingMutation<TInput, TOutput>(
  fn: (input: TInput) => Promise<TOutput>,
  options: SelfHealOptions = {}
) {
  const {
    maxAttempts = 3,
    baseDelayMs = 2000,
    maxDelayMs = 12000,
    label = "operation",
    isRetryable = isTransientError,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (input: TInput): Promise<TOutput> => {
      setIsLoading(true);
      setError(null);
      let lastErr: unknown;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await fn(input);
          setIsLoading(false);
          return result;
        } catch (err) {
          lastErr = err;

          if (attempt === maxAttempts || !isRetryable(err)) {
            // Exhausted retries or non-retryable error
            const finalErr =
              err instanceof Error ? err : new Error(String(err));
            setError(finalErr);
            setIsLoading(false);
            throw finalErr;
          }

          const delay = Math.min(
            baseDelayMs * Math.pow(2, attempt - 1),
            maxDelayMs
          );
          const toastId = `self-heal-${label}-${attempt}`;
          toast.loading(
            `${label} — retrying automatically (${attempt}/${maxAttempts - 1})…`,
            {
              id: toastId,
              description: "A transient error occurred. The system is recovering.",
            }
          );
          await sleep(delay);
          toast.dismiss(toastId);
        }
      }

      const finalErr =
        lastErr instanceof Error ? lastErr : new Error(String(lastErr));
      setError(finalErr);
      setIsLoading(false);
      throw finalErr;
    },
    [fn, maxAttempts, baseDelayMs, maxDelayMs, label, isRetryable]
  );

  return { execute, isLoading, error };
}
