/**
 * WizAdora Queue Health Monitor
 * ==============================
 * Provides real-time visibility into the render queue state and detects
 * provider spirals (repeated failures across multiple jobs in a rolling window).
 *
 * Exposes:
 *   getQueueHealth()        → full health snapshot
 *   detectProviderSpirals() → identifies providers with high failure rates
 *   isProviderDegraded()    → quick check for routing decisions
 *
 * Provider spiral detection:
 *   A provider is considered "spiralling" if it has failed ≥ SPIRAL_THRESHOLD
 *   times in the last SPIRAL_WINDOW_MS. When a spiral is detected, the provider
 *   is automatically marked as degraded in the circuit breaker.
 */

import { getDb } from "./db";
import { musicVideoScenes, musicVideoJobs, providerJobLogs } from "../drizzle/schema";
import { and, eq, gte, count, or } from "drizzle-orm";
import { getCircuitBreaker, getAllCircuitBreakerStatuses } from "./circuit-breaker";

/** Rolling window for spiral detection (last 30 minutes) */
const SPIRAL_WINDOW_MS = 30 * 60 * 1000;

/** Number of failures in the window before a provider is considered spiralling */
const SPIRAL_THRESHOLD = 5;

/** Scenes stuck in "generating" for longer than this are considered stale */
const STALE_SCENE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export interface ProviderSpiralStatus {
  provider: string;
  failuresInWindow: number;
  windowMinutes: number;
  isSpiralling: boolean;
  circuitState: string;
}

export interface QueueHealthSnapshot {
  timestamp: Date;
  totalActiveJobs: number;
  totalPendingScenes: number;
  totalGeneratingScenes: number;
  totalStaleScenes: number;       // generating > STALE_SCENE_THRESHOLD_MS
  totalFailedScenes: number;
  totalCompletedScenes: number;
  providerSpirals: ProviderSpiralStatus[];
  circuitBreakers: ReturnType<typeof getAllCircuitBreakerStatuses>;
  overallHealth: "healthy" | "degraded" | "critical";
  warnings: string[];
}

/**
 * Detect providers that are spiralling (too many failures in rolling window).
 * Automatically opens the circuit breaker for spiralling providers.
 */
export async function detectProviderSpirals(): Promise<ProviderSpiralStatus[]> {
  const db = await getDb();
  if (!db) return [];
  const windowStart = new Date(Date.now() - SPIRAL_WINDOW_MS);

  // Count failures per provider in the rolling window
  const rows = await db
    .select({
      provider: providerJobLogs.provider,
      failureCount: count(providerJobLogs.id),
    })
    .from(providerJobLogs)
    .where(
      and(
        eq(providerJobLogs.status, "failed"),
        gte(providerJobLogs.createdAt, windowStart)
      )
    )
    .groupBy(providerJobLogs.provider);

  const results: ProviderSpiralStatus[] = rows.map((row) => {
    const isSpiralling = row.failureCount >= SPIRAL_THRESHOLD;
    const cb = getCircuitBreaker(row.provider);
    const cbStatus = cb.getStatus();

    // If spiralling and circuit is still closed, force-record failures to open it
    if (isSpiralling && cbStatus.state === "CLOSED") {
      console.warn(
        `[QueueHealth] Provider spiral detected: ${row.provider} — ${row.failureCount} failures in ${SPIRAL_WINDOW_MS / 60000} min window. Opening circuit breaker.`
      );
      // Record enough failures to trip the breaker
      for (let i = 0; i < 3; i++) cb.recordFailure();
    }

    return {
      provider: row.provider,
      failuresInWindow: row.failureCount,
      windowMinutes: SPIRAL_WINDOW_MS / 60000,
      isSpiralling,
      circuitState: cb.getStatus().state,
    };
  });

  return results;
}

/**
 * Returns true if a provider is currently degraded (circuit OPEN or spiralling).
 * Used by the renderer router to skip degraded providers.
 */
export function isProviderDegraded(provider: string): boolean {
  const cb = getCircuitBreaker(provider);
  return cb.getStatus().state === "OPEN";
}

/**
 * Full queue health snapshot — used by admin dashboard and heartbeat monitor.
 */
export async function getQueueHealth(): Promise<QueueHealthSnapshot> {
  const db = await getDb();
  if (!db) {
    return {
      timestamp: new Date(),
      totalActiveJobs: 0,
      totalPendingScenes: 0,
      totalGeneratingScenes: 0,
      totalStaleScenes: 0,
      totalFailedScenes: 0,
      totalCompletedScenes: 0,
      providerSpirals: [],
      circuitBreakers: getAllCircuitBreakerStatuses(),
      overallHealth: "healthy",
      warnings: ["Database unavailable"],
    };
  }
  const now = Date.now();
  const staleThreshold = new Date(now - STALE_SCENE_THRESHOLD_MS);

  // Count scenes by status across all active jobs
  const sceneStats = await db
    .select({
      status: musicVideoScenes.status,
      count: count(musicVideoScenes.id),
    })
    .from(musicVideoScenes)
    .groupBy(musicVideoScenes.status);

  const statusMap: Record<string, number> = {};
  for (const row of sceneStats) {
    statusMap[row.status] = row.count;
  }

  // Get stale scenes by checking updatedAt
  const generatingScenes = await db
    .select({
      id: musicVideoScenes.id,
      updatedAt: musicVideoScenes.updatedAt,
    })
    .from(musicVideoScenes)
    .where(eq(musicVideoScenes.status, "generating"));

  const staleSceneCount = generatingScenes.filter(
    (s) => s.updatedAt !== null && now - Number(s.updatedAt) > STALE_SCENE_THRESHOLD_MS
  ).length;

  // Count active jobs (rendering or assembling)
  const activeJobRows = await db
    .select({ count: count(musicVideoJobs.id) })
    .from(musicVideoJobs)
    .where(
      or(
        eq(musicVideoJobs.status, "rendering"),
        eq(musicVideoJobs.status, "assembling")
      )
    );

  const totalActiveJobs = activeJobRows[0]?.count ?? 0;

  // Detect provider spirals
  const providerSpirals = await detectProviderSpirals();
  const circuitBreakers = getAllCircuitBreakerStatuses();

  // Build warnings
  const warnings: string[] = [];
  if (staleSceneCount > 0) {
    warnings.push(`${staleSceneCount} scene(s) stuck in generating state for >${STALE_SCENE_THRESHOLD_MS / 60000} minutes`);
  }
  const spiralling = providerSpirals.filter((p) => p.isSpiralling);
  if (spiralling.length > 0) {
    warnings.push(`Provider spiral detected: ${spiralling.map((p) => p.provider).join(", ")}`);
  }
  const openCircuits = circuitBreakers.filter((cb) => cb.state === "OPEN");
  if (openCircuits.length > 0) {
    warnings.push(`Circuit breakers OPEN: ${openCircuits.map((cb) => cb.provider).join(", ")}`);
  }
  const failedScenes = statusMap["failed"] ?? 0;
  if (failedScenes > 10) {
    warnings.push(`High failed scene count: ${failedScenes}`);
  }

  // Overall health
  let overallHealth: "healthy" | "degraded" | "critical" = "healthy";
  if (warnings.length > 0) overallHealth = "degraded";
  if (spiralling.length > 0 || openCircuits.length > 0 || staleSceneCount > 3) {
    overallHealth = "critical";
  }

  return {
    timestamp: new Date(),
    totalActiveJobs,
    totalPendingScenes: statusMap["pending"] ?? 0,
    totalGeneratingScenes: statusMap["generating"] ?? 0,
    totalStaleScenes: staleSceneCount,
    totalFailedScenes: failedScenes,
    totalCompletedScenes: statusMap["completed"] ?? 0,
    providerSpirals,
    circuitBreakers,
    overallHealth,
    warnings,
  };
}
