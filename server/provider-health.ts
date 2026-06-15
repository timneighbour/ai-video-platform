/**
 * Provider Health Check Service
 *
 * Checks the availability and billing status of all video generation providers
 * before allowing a user to spend credits or start a build.
 *
 * Status codes:
 *   available            - Provider is reachable and has credits
 *   insufficient_credits - Provider is reachable but has no billing/credits
 *   invalid_key          - API key is missing or rejected (401)
 *   forbidden            - Key valid but no model access or account locked (403)
 *   endpoint_not_found   - Endpoint URL or model path is wrong (404)
 *   temporarily_unavailable - Network error, timeout, or 5xx
 */

import axios from "axios";

export type ProviderStatus =
  | "available"
  | "insufficient_credits"
  | "invalid_key"
  | "forbidden"
  | "endpoint_not_found"
  | "temporarily_unavailable";

export interface ProviderHealthResult {
  provider: string;
  status: ProviderStatus;
  latencyMs?: number;
  detail?: string;
}

export interface HealthCheckSummary {
  anyAvailable: boolean;
  providers: ProviderHealthResult[];
  checkedAt: Date;
}

// ── WaveSpeed ──────────────────────────────────────────────────────────────────
// Uses the balance endpoint — returns { code: 200, data: { balance: N } }
async function checkWaveSpeed(): Promise<ProviderHealthResult> {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) {
    return { provider: "WaveSpeed", status: "invalid_key", detail: "WAVESPEED_API_KEY not set" };
  }
  const t0 = Date.now();
  try {
    const r = await axios.get("https://api.wavespeed.ai/api/v3/balance", {
      headers: { Authorization: `Bearer ${key}` },
      timeout: 10000,
      validateStatus: () => true,
    });
    const latencyMs = Date.now() - t0;
    if (r.status === 200 && r.data?.code === 200) {
      const inner = r.data?.data ?? r.data;
      const balance = typeof inner?.balance === "number" ? inner.balance : null;
      if (balance !== null && balance <= 0) {
        return { provider: "WaveSpeed", status: "insufficient_credits", latencyMs, detail: `Balance: $${balance}` };
      }
      return { provider: "WaveSpeed", status: "available", latencyMs, detail: `Balance: $${balance ?? "unknown"}` };
    }
    if (r.status === 401) return { provider: "WaveSpeed", status: "invalid_key", latencyMs, detail: `HTTP ${r.status}` };
    if (r.status === 402) return { provider: "WaveSpeed", status: "insufficient_credits", latencyMs, detail: "Payment required" };
    if (r.status === 403) return { provider: "WaveSpeed", status: "forbidden", latencyMs, detail: `HTTP ${r.status}` };
    if (r.status === 404) return { provider: "WaveSpeed", status: "endpoint_not_found", latencyMs, detail: `HTTP ${r.status}` };
    return { provider: "WaveSpeed", status: "temporarily_unavailable", latencyMs, detail: `HTTP ${r.status}` };
  } catch (e: any) {
    return { provider: "WaveSpeed", status: "temporarily_unavailable", latencyMs: Date.now() - t0, detail: e.message };
  }
}

// ── Hypereal / Seedance ────────────────────────────────────────────────────────
// Endpoint: POST https://api.hypereal.cloud/v1/videos/generate
// 402 = insufficient credits, 401 = invalid key
async function checkHypereal(): Promise<ProviderHealthResult> {
  const key = process.env.HYPEREAL_API_KEY;
  if (!key) {
    return { provider: "Hypereal", status: "invalid_key", detail: "HYPEREAL_API_KEY not set" };
  }
  const t0 = Date.now();
  try {
    const r = await axios.post(
      "https://api.hypereal.cloud/v1/videos/generate",
      { model: "seedance-2-0-t2v", prompt: "health check", duration: 5 },
      {
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        timeout: 10000,
        validateStatus: () => true,
      }
    );
    const latencyMs = Date.now() - t0;
    if (r.status === 200 || r.status === 201 || r.status === 202) {
      return { provider: "Hypereal", status: "available", latencyMs };
    }
    if (r.status === 401) return { provider: "Hypereal", status: "invalid_key", latencyMs, detail: `HTTP ${r.status}` };
    if (r.status === 402) {
      const msg = r.data?.error?.message ?? "Insufficient credits";
      return { provider: "Hypereal", status: "insufficient_credits", latencyMs, detail: msg };
    }
    if (r.status === 403) return { provider: "Hypereal", status: "forbidden", latencyMs, detail: r.data?.error?.message ?? `HTTP ${r.status}` };
    if (r.status === 404) return { provider: "Hypereal", status: "endpoint_not_found", latencyMs, detail: `HTTP ${r.status}` };
    return { provider: "Hypereal", status: "temporarily_unavailable", latencyMs, detail: `HTTP ${r.status}` };
  } catch (e: any) {
    return { provider: "Hypereal", status: "temporarily_unavailable", latencyMs: Date.now() - t0, detail: e.message };
  }
}

// ── Atlas Cloud ────────────────────────────────────────────────────────────────
// Endpoint: POST https://api.atlascloud.ai/api/v1/model/generateVideo
// 402 = insufficient balance
async function checkAtlasCloud(): Promise<ProviderHealthResult> {
  const key = process.env.ATLAS_CLOUD_API_KEY;
  if (!key) {
    return { provider: "Atlas Cloud", status: "invalid_key", detail: "ATLAS_CLOUD_API_KEY not set" };
  }
  const t0 = Date.now();
  try {
    const r = await axios.post(
      "https://api.atlascloud.ai/api/v1/model/generateVideo",
      { model: "bytedance/seedance-2.0/text-to-video", prompt: "health check", duration: 5, resolution: "720p" },
      {
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        timeout: 10000,
        validateStatus: () => true,
      }
    );
    const latencyMs = Date.now() - t0;
    if (r.status === 200 || r.status === 201 || r.status === 202) {
      return { provider: "Atlas Cloud", status: "available", latencyMs };
    }
    if (r.status === 401) return { provider: "Atlas Cloud", status: "invalid_key", latencyMs, detail: `HTTP ${r.status}` };
    if (r.status === 402) return { provider: "Atlas Cloud", status: "insufficient_credits", latencyMs, detail: r.data?.msg ?? "Insufficient balance" };
    if (r.status === 403) return { provider: "Atlas Cloud", status: "forbidden", latencyMs, detail: `HTTP ${r.status}` };
    if (r.status === 404) return { provider: "Atlas Cloud", status: "endpoint_not_found", latencyMs, detail: `HTTP ${r.status}` };
    return { provider: "Atlas Cloud", status: "temporarily_unavailable", latencyMs, detail: `HTTP ${r.status}` };
  } catch (e: any) {
    return { provider: "Atlas Cloud", status: "temporarily_unavailable", latencyMs: Date.now() - t0, detail: e.message };
  }
}

// ── fal.ai Seedance ────────────────────────────────────────────────────────────
// Endpoint: POST https://fal.run/fal-ai/bytedance/seedance-2.0/text-to-video
// 403 = account locked / exhausted balance
async function checkFalAi(): Promise<ProviderHealthResult> {
  const key = process.env.FAL_AI_API_KEY;
  if (!key) {
    return { provider: "fal.ai", status: "invalid_key", detail: "FAL_AI_API_KEY not set" };
  }
  const t0 = Date.now();
  try {
    const r = await axios.post(
      "https://fal.run/fal-ai/bytedance/seedance-2.0/text-to-video",
      { prompt: "health check", aspect_ratio: "16:9", duration: "5", resolution: "720p" },
      {
        headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
        timeout: 10000,
        validateStatus: () => true,
      }
    );
    const latencyMs = Date.now() - t0;
    if (r.status === 200 || r.status === 201 || r.status === 202) {
      return { provider: "fal.ai", status: "available", latencyMs };
    }
    if (r.status === 401) return { provider: "fal.ai", status: "invalid_key", latencyMs, detail: `HTTP ${r.status}` };
    if (r.status === 402) return { provider: "fal.ai", status: "insufficient_credits", latencyMs, detail: "Payment required" };
    if (r.status === 403) {
      const detail = r.data?.detail ?? "Account locked or no model access";
      // Distinguish between "exhausted balance" (insufficient_credits) and other 403s
      if (typeof detail === "string" && detail.toLowerCase().includes("balance")) {
        return { provider: "fal.ai", status: "insufficient_credits", latencyMs, detail };
      }
      return { provider: "fal.ai", status: "forbidden", latencyMs, detail };
    }
    if (r.status === 404) return { provider: "fal.ai", status: "endpoint_not_found", latencyMs, detail: `HTTP ${r.status}` };
    return { provider: "fal.ai", status: "temporarily_unavailable", latencyMs, detail: `HTTP ${r.status}` };
  } catch (e: any) {
    return { provider: "fal.ai", status: "temporarily_unavailable", latencyMs: Date.now() - t0, detail: e.message };
  }
}

/**
 * Run health checks on all providers in parallel.
 * Returns a summary with anyAvailable flag for quick gating.
 */
export async function checkAllProviders(): Promise<HealthCheckSummary> {
  const results = await Promise.allSettled([
    checkWaveSpeed(),
    checkHypereal(),
    checkAtlasCloud(),
    checkFalAi(),
  ]);

  const providers: ProviderHealthResult[] = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const names = ["WaveSpeed", "Hypereal", "Atlas Cloud", "fal.ai"];
    return { provider: names[i], status: "temporarily_unavailable" as ProviderStatus, detail: String((r as any).reason) };
  });

  const anyAvailable = providers.some((p) => p.status === "available");

  return { anyAvailable, providers, checkedAt: new Date() };
}

/**
 * Quick check: is at least one provider available?
 * Used as a gate before deducting credits.
 * Fast path: checks Atlas Cloud first (primary), then WaveSpeed (failover).
 */
export async function isAnyProviderAvailable(): Promise<boolean> {
  // Fast path: check Atlas Cloud (primary) first
  const atlas = await checkAtlasCloud();
  if (atlas.status === "available") return true;
  // Atlas Cloud exhausted or unavailable — check WaveSpeed (automatic failover)
  const ws = await checkWaveSpeed();
  if (ws.status === "available") return true;
  // Last resort: check remaining providers
  const [hypereal, fal] = await Promise.all([checkHypereal(), checkFalAi()]);
  return [hypereal, fal].some((p) => p.status === "available");
}

/**
 * Get the best available provider name for logging/alerting purposes.
 * Returns null if no provider is available.
 */
export async function getBestAvailableProvider(): Promise<string | null> {
  const atlas = await checkAtlasCloud();
  if (atlas.status === "available") return "Atlas Cloud";
  const ws = await checkWaveSpeed();
  if (ws.status === "available") return "WaveSpeed (failover)";
  const [hypereal, fal] = await Promise.all([checkHypereal(), checkFalAi()]);
  const fallback = [hypereal, fal].find((p) => p.status === "available");
  return fallback?.provider ?? null;
}

/**
 * Notify the owner when Atlas Cloud balance is exhausted and WaveSpeed failover is active.
 * Called from music-video-service when Atlas returns a balance error.
 * Debounced — only fires once per hour to avoid notification spam.
 */
let _lastAtlasExhaustionAlert = 0;
export async function notifyAtlasExhausted(): Promise<void> {
  const now = Date.now();
  if (now - _lastAtlasExhaustionAlert < 60 * 60 * 1000) return; // 1-hour debounce
  _lastAtlasExhaustionAlert = now;
  try {
    const { notifyOwner } = await import("./_core/notification");
    await notifyOwner({
      title: "🚨 Video provider credits exhausted — renders are PAUSED",
      content: `Both Atlas Cloud AND WaveSpeed have run out of credits. Music video renders are currently paused and will resume automatically once credits are topped up.\n\n**Action required:**\n- Top up Atlas Cloud at https://www.atlascloud.ai (primary, $0.64/scene)\n- OR top up WaveSpeed at https://wavespeed.ai (fallback, $1.80/scene)\n\nScenes will retry automatically within 2 minutes of top-up — no manual intervention needed.`,
    });
    console.warn("[ProviderHealth] Owner notified: Atlas Cloud exhausted, WaveSpeed failover active.");
  } catch (e) {
    console.error("[ProviderHealth] Failed to send Atlas exhaustion notification:", e);
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// RENDER COST PROTECTION — Provider Reliability Tracking & Spend Guards
// ═══════════════════════════════════════════════════════════════════════════════

import { getDb } from "./db";
import { providerHealth, providerSpendEvents, musicVideoJobs } from "../drizzle/schema";
import { eq, desc, sql as drizzleSql } from "drizzle-orm";
import type { ProviderHealth as ProviderHealthRow } from "../drizzle/schema";

// Provider cost constants (USD per scene)
export const PROVIDER_COST_PER_SCENE_USD: Record<string, number> = {
  "atlas-cloud": 0.08,
  "wavespeed":   0.06,
  "kling":       0.14,
  "runway":      0.10,
  "heygen":      0.05,
};

const CONSECUTIVE_FAILURE_LIMIT = 3;
const FAILURE_RATE_LIMIT = 0.40;
const RECOVERY_COOLDOWN_MS = 30 * 60 * 1000;

const FALLBACK_CHAIN: Record<string, string[]> = {
  "atlas-cloud": ["wavespeed", "kling"],
  "wavespeed":   ["kling", "atlas-cloud"],
  "kling":       ["wavespeed", "atlas-cloud"],
  "runway":      ["wavespeed", "kling"],
  "heygen":      ["wavespeed"],
};

export async function recordProviderOutcome(params: {
  jobId: number;
  sceneId?: number;
  provider: string;
  status: "success" | "failure" | "timeout" | "probe_success" | "probe_failure";
  renderTimeMs?: number;
  errorMessage?: string;
  isProbe?: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const costUsd = PROVIDER_COST_PER_SCENE_USD[params.provider] ?? 0.08;
  const isFailure = ["failure", "timeout", "probe_failure"].includes(params.status);
  await db.insert(providerSpendEvents).values({
    jobId: params.jobId,
    sceneId: params.sceneId ?? null,
    provider: params.provider,
    costUsd: costUsd.toFixed(4),
    status: params.status,
    renderTimeMs: params.renderTimeMs ?? null,
    isProbe: params.isProbe ?? false,
    errorMessage: params.errorMessage ?? null,
  });
  const existing = await db.select().from(providerHealth)
    .where(eq(providerHealth.provider, params.provider)).limit(1);
  if (existing.length === 0) {
    await db.insert(providerHealth).values({
      provider: params.provider,
      successCount: isFailure ? 0 : 1,
      failureCount: isFailure ? 1 : 0,
      consecutiveFailures: isFailure ? 1 : 0,
      totalSpendUsd: costUsd.toFixed(4),
      wastedSpendUsd: isFailure ? costUsd.toFixed(4) : "0",
      avgRenderTimeMs: params.renderTimeMs ?? 0,
      isHealthy: true,
      mode: "full",
      lastFailureAt: isFailure ? new Date() : null,
      lastSuccessAt: isFailure ? null : new Date(),
    });
    return;
  }

  // ISS-007: Optimistic locking — retry up to 3 times if a concurrent write
  // changes the version between our SELECT and UPDATE.
  let record = existing[0];
  const MAX_CAS_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_CAS_RETRIES; attempt++) {
    if (attempt > 0) {
      // Re-read the latest record before retrying
      const refetch = await db.select().from(providerHealth)
        .where(eq(providerHealth.provider, params.provider)).limit(1);
      if (refetch.length === 0) break;
      record = refetch[0];
    }
    const newSuccessCount = isFailure ? record.successCount : record.successCount + 1;
    const newFailureCount = isFailure ? record.failureCount + 1 : record.failureCount;
    const newConsecutiveFailures = isFailure ? record.consecutiveFailures + 1 : 0;
    const newTotalSpend = parseFloat(record.totalSpendUsd as string) + costUsd;
    const newWastedSpend = parseFloat(record.wastedSpendUsd as string) + (isFailure ? costUsd : 0);
    const totalAttempts = newSuccessCount + newFailureCount;
    const newAvg = params.renderTimeMs
      ? Math.round((record.avgRenderTimeMs * (totalAttempts - 1) + params.renderTimeMs) / totalAttempts)
      : record.avgRenderTimeMs;
    const recentFailureRate = totalAttempts >= 5 ? newFailureCount / Math.min(totalAttempts, 20) : 0;
    const shouldMarkUnhealthy =
      newConsecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT ||
      (totalAttempts >= 10 && recentFailureRate >= FAILURE_RATE_LIMIT);
    const wasHealthy = record.isHealthy;
    const nowHealthy = !shouldMarkUnhealthy;
    const currentVersion = (record as any).version ?? 0;

    // CAS update: only succeeds if version hasn't changed since we read it
    const updateResult = await db.update(providerHealth).set({
      successCount: newSuccessCount,
      failureCount: newFailureCount,
      consecutiveFailures: newConsecutiveFailures,
      totalSpendUsd: newTotalSpend.toFixed(4),
      wastedSpendUsd: newWastedSpend.toFixed(4),
      avgRenderTimeMs: newAvg,
      isHealthy: nowHealthy,
      lastFailureAt: isFailure ? new Date() : record.lastFailureAt,
      lastSuccessAt: isFailure ? record.lastSuccessAt : new Date(),
      version: currentVersion + 1,
    }).where(
      // Only update if version matches what we read (optimistic lock)
      drizzleSql`${providerHealth.provider} = ${params.provider} AND ${providerHealth.version} = ${currentVersion}`
    );

    const affectedRows = (updateResult as any)?.[0]?.affectedRows ?? (updateResult as any)?.rowsAffected ?? 1;
    if (affectedRows === 0) {
      // Another concurrent write won — retry
      console.warn(`[ProviderHealth] CAS conflict on ${params.provider} (attempt ${attempt + 1}/${MAX_CAS_RETRIES}) — retrying`);
      continue;
    }

    if (wasHealthy && !nowHealthy) {
      const reason = newConsecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT
        ? `${newConsecutiveFailures} consecutive failures`
        : `${Math.round(recentFailureRate * 100)}% failure rate`;
      console.error(`[ProviderHealth] Provider "${params.provider}" marked UNHEALTHY: ${reason}`);
      try {
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: `Provider Unhealthy: ${params.provider}`,
          content: `Provider **${params.provider}** has been automatically marked as unhealthy.\n\n**Reason:** ${reason}\n**Wasted spend:** $${newWastedSpend.toFixed(2)}\n\nScenes will be routed to fallback providers. Visit /admin/provider-health to review.`,
        });
      } catch (e) { console.error("[ProviderHealth] Failed to send admin alert:", e); }
    }
    break; // success
  }
}

export async function checkProviderRecovery(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const unhealthy = await db.select().from(providerHealth).where(eq(providerHealth.isHealthy, false));
  for (const p of unhealthy) {
    if (!p.lastFailureAt) continue;
    const msSince = Date.now() - new Date(p.lastFailureAt).getTime();
    if (msSince >= RECOVERY_COOLDOWN_MS) {
      await db.update(providerHealth).set({ isHealthy: true, consecutiveFailures: 0 })
        .where(eq(providerHealth.provider, p.provider));
      console.log(`[ProviderHealth] Provider "${p.provider}" auto-recovered`);
    }
  }
}

export async function getBestProvider(
  preferredProvider: string,
  sceneCount: number
): Promise<{ provider: string; blocked: boolean; reason?: string }> {
  await checkProviderRecovery();
  const db = await getDb();
  if (!db) return { provider: preferredProvider, blocked: false };
  const allHealth = await db.select().from(providerHealth);
  const healthMap = Object.fromEntries(allHealth.map((h: any) => [h.provider, h]));
  const preferred = healthMap[preferredProvider];

  if (preferred) {
    const isDisabled = preferred.mode === "disabled";
    const isUnhealthy = !preferred.isHealthy;
    if (!isDisabled && !isUnhealthy) {
      return { provider: preferredProvider, blocked: false };
    }
    console.log(`[ProviderHealth] ${preferredProvider} unavailable (mode=${preferred.mode}, healthy=${preferred.isHealthy})`);
  }

  const fallbacks = FALLBACK_CHAIN[preferredProvider] ?? ["wavespeed", "kling"];
  for (const fb of fallbacks) {
    const fh = healthMap[fb];
    if (fh?.isHealthy && fh.mode !== "disabled") {
      console.log(`[ProviderHealth] Routed to fallback: ${fb}`);
      return { provider: fb, blocked: false };
    }
  }
  return { provider: preferredProvider, blocked: true, reason: "All providers are currently unhealthy." };
}

export async function checkJobSpendLimit(jobId: number): Promise<{
  exceeded: boolean; currentSpend: number; limit: number;
}> {
  const db = await getDb();
  if (!db) return { exceeded: false, currentSpend: 0, limit: 25 };
  const job = await db.select({
    providerSpendUsd: musicVideoJobs.providerSpendUsd,
    maxSpendLimitUsd: musicVideoJobs.maxSpendLimitUsd,
  }).from(musicVideoJobs).where(eq(musicVideoJobs.id, jobId)).limit(1);
  if (!job.length) return { exceeded: false, currentSpend: 0, limit: 25 };
  const currentSpend = parseFloat((job[0].providerSpendUsd ?? "0") as string);
  const limit = parseFloat((job[0].maxSpendLimitUsd ?? "25.00") as string);
  return { exceeded: currentSpend >= limit, currentSpend, limit };
}
export async function updateJobSpend(jobId: number, provider: string, isFailure: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const costUsd = PROVIDER_COST_PER_SCENE_USD[provider] ?? 0.08;
  await db.update(musicVideoJobs).set({
    providerSpendUsd: drizzleSql`COALESCE(provider_spend_usd, 0) + ${costUsd}`,
    wastedSpendUsd: isFailure ? drizzleSql`COALESCE(wasted_spend_usd, 0) + ${costUsd}` : drizzleSql`COALESCE(wasted_spend_usd, 0)`,
  }).where(eq(musicVideoJobs.id, jobId));
}
export async function getProviderHealthSummary() {
  const db = await getDb();
  if (!db) return [];
  const health = await db.select().from(providerHealth).orderBy(desc(providerHealth.updatedAt));
  return health.map((h: any) => {
    const total = h.successCount + h.failureCount;
    const successRate = total > 0 ? Math.round((h.successCount / total) * 100) : 100;
    const failureRate = total > 0 ? Math.round((h.failureCount / total) * 100) : 0;
    const costPerSuccess = h.successCount > 0
      ? (parseFloat(h.totalSpendUsd as string) / h.successCount).toFixed(4) : "0";
    const costPerFailure = h.failureCount > 0
      ? (parseFloat(h.wastedSpendUsd as string) / h.failureCount).toFixed(4) : "0";
    return {
      provider: h.provider, isHealthy: h.isHealthy, mode: h.mode,
      successCount: h.successCount, failureCount: h.failureCount,
      consecutiveFailures: h.consecutiveFailures, successRate, failureRate,
      avgRenderTimeSec: Math.round(h.avgRenderTimeMs / 1000),
      totalSpendUsd: parseFloat(h.totalSpendUsd as string).toFixed(2),
      wastedSpendUsd: parseFloat(h.wastedSpendUsd as string).toFixed(2),
      costPerSuccessUsd: costPerSuccess, costPerFailureUsd: costPerFailure,
      lastFailureAt: h.lastFailureAt, lastSuccessAt: h.lastSuccessAt, updatedAt: h.updatedAt,
    };
  });
}

export async function getRecentSpendEvents(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(providerSpendEvents)
    .orderBy(desc(providerSpendEvents.createdAt)).limit(limit);
}
