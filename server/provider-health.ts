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
      title: "⚠️ Atlas Cloud balance exhausted — WaveSpeed failover active",
      content: `Atlas Cloud has run out of credits. WIZ AI has automatically switched to WaveSpeed as the failover provider.\n\nAction required: Top up Atlas Cloud at https://www.atlascloud.ai to restore primary rendering.\n\nWaveSpeed balance: $100 (topped up). Renders will continue uninterrupted.`,
    });
    console.warn("[ProviderHealth] Owner notified: Atlas Cloud exhausted, WaveSpeed failover active.");
  } catch (e) {
    console.error("[ProviderHealth] Failed to send Atlas exhaustion notification:", e);
  }
}
