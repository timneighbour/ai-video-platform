import { z } from "zod";
import axios from "axios";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getDb, resetDb } from "../db";
import { runAtlasHealthCheck, runDailyAtlasMonitor } from "../atlas-monitor";

// ── Low-balance thresholds ────────────────────────────────────────────────────
const ATLAS_WARN_USD = 10;   // warn when Atlas Cloud balance < $10
const ATLAS_CRIT_USD = 5;    // critical when < $5
const WAVESPEED_WARN_USD = 20; // warn when WaveSpeed balance < $20
const WAVESPEED_CRIT_USD = 5;  // critical when < $5

// ── Atlas Cloud balance check ─────────────────────────────────────────────────
// Atlas Cloud has no public balance endpoint. We infer status from a lightweight
// probe: if the API returns 402 the account is exhausted; 200 means it has credit.
async function getAtlasBalance(): Promise<{
  available: boolean;
  balanceUsd: number | null;
  status: "ok" | "warning" | "critical" | "unknown";
  error?: string;
}> {
  const key = process.env.ATLAS_CLOUD_API_KEY;
  if (!key) return { available: false, balanceUsd: null, status: "unknown", error: "ATLAS_CLOUD_API_KEY not set" };
  try {
    const resp = await axios.post(
      "https://api.atlascloud.ai/api/v1/model/generateVideo",
      {
        model: "bytedance/seedance-2.0/text-to-video",
        prompt: "balance-probe",
        duration: 4,
        resolution: "720p",
      },
      {
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        timeout: 12_000,
        validateStatus: () => true,
      }
    );
    if (resp.status === 402) {
      return { available: false, balanceUsd: 0, status: "critical", error: "Insufficient balance (402)" };
    }
    if (resp.status === 401 || resp.status === 403) {
      return { available: false, balanceUsd: null, status: "unknown", error: `Auth error (${resp.status})` };
    }
    // 200/400 with a prediction ID or "not found" means the API accepted the key — balance > 0
    return { available: true, balanceUsd: null, status: "ok" };
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (msg.includes("402") || msg.includes("insufficient")) {
      return { available: false, balanceUsd: 0, status: "critical", error: "Insufficient balance" };
    }
    return { available: false, balanceUsd: null, status: "unknown", error: msg.slice(0, 120) };
  }
}

// ── WaveSpeed balance check ───────────────────────────────────────────────────
async function getWaveSpeedBalance(): Promise<{
  available: boolean;
  balanceUsd: number | null;
  status: "ok" | "warning" | "critical" | "unknown";
  error?: string;
}> {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) return { available: false, balanceUsd: null, status: "unknown", error: "WAVESPEED_API_KEY not set" };
  try {
    const resp = await axios.get("https://api.wavespeed.ai/api/v2/balance", {
      headers: { Authorization: `Bearer ${key}` },
      timeout: 10_000,
      validateStatus: () => true,
    });
    if (resp.status === 200 && resp.data?.code === 200) {
      const bal = Number(resp.data?.data?.balance ?? 0);
      const status: "ok" | "warning" | "critical" =
        bal < WAVESPEED_CRIT_USD ? "critical" :
        bal < WAVESPEED_WARN_USD ? "warning" : "ok";
      return { available: bal > 0, balanceUsd: bal, status };
    }
    return { available: false, balanceUsd: null, status: "unknown", error: `HTTP ${resp.status}` };
  } catch (err: any) {
    return { available: false, balanceUsd: null, status: "unknown", error: String(err?.message ?? err).slice(0, 120) };
  }
}

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  /** Returns current DB connection status (admin only). */
  dbStatus: adminProcedure
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) return { connected: false, message: "No database instance" };
        // Lightweight ping
        await db.execute("SELECT 1");
        return { connected: true, message: "Connected" };
      } catch (err: any) {
        return { connected: false, message: err?.message ?? "Unknown error" };
      }
    }),

  /** Force-resets the DB connection pool (admin only). */
  reconnectDb: adminProcedure
    .mutation(async () => {
      try {
        resetDb();
        const db = await getDb();
        if (!db) return { success: false, message: "Failed to create DB instance" };
        await db.execute("SELECT 1");
        return { success: true, message: "Database reconnected successfully" };
      } catch (err: any) {
        return { success: false, message: err?.message ?? "Reconnect failed" };
      }
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /** Run Atlas Cloud health check immediately and return the report (admin only). */
  atlasHealthCheck: adminProcedure
    .query(async () => {
      const report = await runAtlasHealthCheck();
      return report;
    }),

  /** Run Atlas Cloud health check and send the owner notification immediately (admin only). */
  atlasHealthCheckAndNotify: adminProcedure
    .mutation(async () => {
      await runDailyAtlasMonitor();
      return { success: true };
    }),

  /**
   * Returns live provider credit balances for the admin low-balance banner.
   * Checks Atlas Cloud (via probe) and WaveSpeed (via /balance API).
   * Admin only — never expose API key status to regular users.
   */
  getProviderBalances: adminProcedure
    .query(async () => {
      const [atlas, wavespeed] = await Promise.all([
        getAtlasBalance(),
        getWaveSpeedBalance(),
      ]);
      return {
        atlas: {
          ...atlas,
          warnThresholdUsd: ATLAS_WARN_USD,
          critThresholdUsd: ATLAS_CRIT_USD,
          topUpUrl: "https://www.atlascloud.ai",
          costPerScene: 0.64,
        },
        wavespeed: {
          ...wavespeed,
          warnThresholdUsd: WAVESPEED_WARN_USD,
          critThresholdUsd: WAVESPEED_CRIT_USD,
          topUpUrl: "https://wavespeed.ai",
          costPerScene: 1.80,
        },
        checkedAt: new Date().toISOString(),
      };
    }),

  /**
   * MVSEP Diagnostic — submits a short audio clip to MVSEP and polls for a result.
   * Confirms the API key is live and the service is reachable before a real job hits it.
   * Admin only.
   */
  testMvsep: adminProcedure
    .mutation(async () => {
      const startMs = Date.now();
      const apiToken = process.env.MVSEP_API_KEY;
      if (!apiToken) {
        return { ok: false, status: "error" as const, message: "MVSEP_API_KEY not configured", elapsedMs: 0, hash: null };
      }
      // Use a short publicly accessible MP3 for the probe
      const probeAudioUrl = "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3";
      try {
        const { submitMvsepVocalIsolation, pollMvsepVocalIsolation } = await import("../ai-apis/mvsep-vocal-isolation");
        // Step 1: Submit the job
        const { jobId: hash } = await submitMvsepVocalIsolation(probeAudioUrl);
        // Step 2: Poll up to 30s (6 × 5s intervals) — just confirm the job was accepted
        let lastStatus: string = "waiting";
        for (let i = 0; i < 6; i++) {
          await new Promise(r => setTimeout(r, 5000));
          const poll = await pollMvsepVocalIsolation(hash);
          lastStatus = poll.status;
          if (poll.status === "done" || poll.status === "error") break;
        }
        const elapsedMs = Date.now() - startMs;
        if (lastStatus === "done") {
          return { ok: true, status: "done" as const, hash, message: "MVSEP API key is live — job completed successfully", elapsedMs };
        } else if (lastStatus === "error") {
          return { ok: false, status: "error" as const, hash, message: "MVSEP job failed during processing", elapsedMs };
        } else {
          // Still processing after 30s — but the submit succeeded, so the key is valid
          return { ok: true, status: "processing" as const, hash, message: `MVSEP API key is live — job accepted (still processing after ${Math.round(elapsedMs / 1000)}s)`, elapsedMs };
        }
      } catch (err: any) {
        return { ok: false, status: "error" as const, hash: null, message: err.message ?? "Unknown error", elapsedMs: Date.now() - startMs };
      }
    }),
});
