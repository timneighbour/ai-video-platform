/**
 * WizAdora Circuit Breaker
 * ========================
 * Implements a per-provider circuit breaker with three states:
 *
 *   CLOSED   → Normal operation. Requests pass through.
 *   OPEN     → Provider is degraded. Requests are rejected immediately.
 *              After RECOVERY_WINDOW_MS, transitions to HALF_OPEN.
 *   HALF_OPEN → One probe request is allowed through. If it succeeds,
 *              transitions back to CLOSED. If it fails, back to OPEN.
 *
 * Configuration (per provider):
 *   FAILURE_THRESHOLD  — consecutive failures before opening
 *   RECOVERY_WINDOW_MS — time to wait before attempting recovery
 *   SUCCESS_THRESHOLD  — consecutive successes in HALF_OPEN before closing
 *
 * Usage:
 *   const cb = getCircuitBreaker("atlas_cloud");
 *   if (!cb.canRequest()) throw new Error("Provider circuit open");
 *   try {
 *     const result = await callProvider();
 *     cb.recordSuccess();
 *     return result;
 *   } catch (err) {
 *     cb.recordFailure();
 *     throw err;
 *   }
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  failureThreshold: number;   // consecutive failures before opening
  recoveryWindowMs: number;   // ms before attempting recovery from OPEN
  successThreshold: number;   // consecutive successes in HALF_OPEN before closing
}

export interface CircuitBreakerStatus {
  provider: string;
  state: CircuitState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureAt: Date | null;
  lastSuccessAt: Date | null;
  openedAt: Date | null;
  totalFailures: number;
  totalSuccesses: number;
  nextRetryAt: Date | null;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  recoveryWindowMs: 3 * 60 * 1000, // 3 minutes
  successThreshold: 2,
};

// Provider-specific overrides
// Recovery windows are kept short (90s) so providers recover quickly after
// brief outages. The sceneDispatchHeartbeat retries pending scenes every 60s,
// so a 90s window means at most 2 missed ticks before a provider is re-tried.
const PROVIDER_CONFIGS: Record<string, Partial<CircuitBreakerConfig>> = {
  atlas_cloud: { failureThreshold: 3, recoveryWindowMs: 90 * 1000 },       // 90s
  atlas_cloud_fast: { failureThreshold: 3, recoveryWindowMs: 90 * 1000 },  // 90s
  wavespeed: { failureThreshold: 3, recoveryWindowMs: 90 * 1000 },          // 90s
  fal_seedance: { failureThreshold: 3, recoveryWindowMs: 90 * 1000 },       // 90s
  kling_standard: { failureThreshold: 3, recoveryWindowMs: 2 * 60 * 1000 }, // 2min
  kling_pro: { failureThreshold: 3, recoveryWindowMs: 2 * 60 * 1000 },      // 2min
  runway: { failureThreshold: 3, recoveryWindowMs: 2 * 60 * 1000 },         // 2min
  hypereal: { failureThreshold: 3, recoveryWindowMs: 2 * 60 * 1000 },       // 2min
};

class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private lastFailureAt: Date | null = null;
  private lastSuccessAt: Date | null = null;
  private openedAt: Date | null = null;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private config: CircuitBreakerConfig;

  constructor(
    private readonly provider: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Returns true if a request should be allowed through.
   * CLOSED → always true
   * OPEN   → false unless recovery window has elapsed (then transitions to HALF_OPEN)
   * HALF_OPEN → true (probe request)
   */
  canRequest(): boolean {
    if (this.state === "CLOSED") return true;

    if (this.state === "OPEN") {
      const now = Date.now();
      const openedAt = this.openedAt?.getTime() ?? 0;
      if (now - openedAt >= this.config.recoveryWindowMs) {
        console.log(`[CircuitBreaker] ${this.provider}: OPEN → HALF_OPEN (recovery window elapsed)`);
        this.state = "HALF_OPEN";
        this.consecutiveSuccesses = 0;
        return true; // allow probe
      }
      return false;
    }

    // HALF_OPEN — allow one probe
    return true;
  }

  recordSuccess(): void {
    this.lastSuccessAt = new Date();
    this.totalSuccesses++;
    this.consecutiveFailures = 0;

    if (this.state === "HALF_OPEN") {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        console.log(`[CircuitBreaker] ${this.provider}: HALF_OPEN → CLOSED (recovered)`);
        this.state = "CLOSED";
        this.openedAt = null;
        this.consecutiveSuccesses = 0;
      }
    }
  }

  recordFailure(): void {
    this.lastFailureAt = new Date();
    this.totalFailures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;

    if (this.state === "HALF_OPEN") {
      console.log(`[CircuitBreaker] ${this.provider}: HALF_OPEN → OPEN (probe failed)`);
      this.state = "OPEN";
      this.openedAt = new Date();
      return;
    }

    if (
      this.state === "CLOSED" &&
      this.consecutiveFailures >= this.config.failureThreshold
    ) {
      console.log(
        `[CircuitBreaker] ${this.provider}: CLOSED → OPEN (${this.consecutiveFailures} consecutive failures)`
      );
      this.state = "OPEN";
      this.openedAt = new Date();
    }
  }

  getStatus(): CircuitBreakerStatus {
    const nextRetryAt =
      this.state === "OPEN" && this.openedAt
        ? new Date(this.openedAt.getTime() + this.config.recoveryWindowMs)
        : null;

    return {
      provider: this.provider,
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      openedAt: this.openedAt,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      nextRetryAt,
    };
  }

  /** Force-reset to CLOSED (admin use only) */
  reset(): void {
    this.state = "CLOSED";
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.openedAt = null;
    console.log(`[CircuitBreaker] ${this.provider}: manually reset to CLOSED`);
  }
}

// ── Singleton registry ────────────────────────────────────────────────────────
const registry = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(provider: string): CircuitBreaker {
  if (!registry.has(provider)) {
    const config = PROVIDER_CONFIGS[provider] ?? {};
    registry.set(provider, new CircuitBreaker(provider, config));
  }
  return registry.get(provider)!;
}

export function getAllCircuitBreakerStatuses(): CircuitBreakerStatus[] {
  return Array.from(registry.values()).map((cb) => cb.getStatus());
}

export function resetCircuitBreaker(provider: string): void {
  registry.get(provider)?.reset();
}

/**
 * Convenience wrapper: runs fn() with circuit breaker protection.
 * Throws if circuit is OPEN. Records success/failure automatically.
 */
export async function withCircuitBreaker<T>(
  provider: string,
  fn: () => Promise<T>
): Promise<T> {
  const cb = getCircuitBreaker(provider);
  if (!cb.canRequest()) {
    const status = cb.getStatus();
    throw new Error(
      `[CircuitBreaker] ${provider} is OPEN — next retry at ${status.nextRetryAt?.toISOString() ?? "unknown"}`
    );
  }
  try {
    const result = await fn();
    cb.recordSuccess();
    return result;
  } catch (err) {
    cb.recordFailure();
    throw err;
  }
}
