/**
 * Atlas Cloud Daily Health Monitor
 *
 * Checks:
 *  1. Atlas Cloud API connectivity (submit a minimal probe job)
 *  2. Recent job success rate from providerJobLogs (last 24h)
 *  3. Estimated spend in last 24h
 *  4. Any jobs stuck in "submitted" state for >30 minutes
 *
 * Sends a daily digest notification to the owner via notifyOwner().
 * Called by the scheduled cron job in server/index.ts.
 */

import axios from "axios";
import { getDb } from "./db";
import { providerJobLogs } from "../drizzle/schema";
import { and, gte, eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

const ATLAS_BASE = "https://api.atlascloud.ai/api/v1";
const ATLAS_MODEL = "bytedance/seedance-2.0/text-to-video";

function getApiKey(): string {
  const key = process.env.ATLAS_CLOUD_API_KEY;
  if (!key) throw new Error("ATLAS_CLOUD_API_KEY is not set");
  return key;
}

export interface AtlasHealthReport {
  apiReachable: boolean;
  apiError?: string;
  last24hTotal: number;
  last24hCompleted: number;
  last24hFailed: number;
  last24hSuccessRate: number;
  last24hEstimatedCostUsd: number;
  stuckJobs: number;
  status: "healthy" | "warning" | "critical";
  summary: string;
}

/**
 * Run a lightweight connectivity probe against Atlas Cloud.
 * Submits a minimal 4-second job and immediately cancels/ignores it —
 * we only care whether the API accepts the request (200 OK).
 */
async function probeAtlasApi(): Promise<{ reachable: boolean; error?: string }> {
  try {
    const response = await axios.post(
      `${ATLAS_BASE}/model/generateVideo`,
      {
        model: ATLAS_MODEL,
        prompt: "A calm ocean wave at sunrise, wide shot, natural light",
        duration: 4,
        resolution: "720p",
      },
      {
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          "Content-Type": "application/json",
        },
        timeout: 20_000,
      }
    );

    const predictionId = response.data?.data?.id;
    if (predictionId) {
      return { reachable: true };
    }
    return { reachable: false, error: "No prediction ID in response" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // 402 = insufficient balance — API is reachable but account needs top-up
    if (msg.includes("402") || msg.includes("insufficient balance")) {
      return { reachable: false, error: "INSUFFICIENT BALANCE — top up Atlas Cloud immediately" };
    }
    return { reachable: false, error: msg.slice(0, 200) };
  }
}

/**
 * Query providerJobLogs for Atlas Cloud stats over the last 24 hours.
 */
async function getAtlasStats(): Promise<{
  total: number;
  completed: number;
  failed: number;
  estimatedCostUsd: number;
  stuckJobs: number;
}> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stuckThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago

  const db = await getDb();
  if (!db) return { total: 0, completed: 0, failed: 0, estimatedCostUsd: 0, stuckJobs: 0 };
  const rows = await db
    .select({
      status: providerJobLogs.status,
      estimatedCostUsd: providerJobLogs.estimatedCostUsd,
      submittedAt: providerJobLogs.submittedAt,
    })
    .from(providerJobLogs)
    .where(
      and(
        eq(providerJobLogs.provider, "atlas_cloud"),
        gte(providerJobLogs.submittedAt, since)
      )
    );

  let completed = 0;
  let failed = 0;
  let estimatedCostUsd = 0;
  let stuckJobs = 0;

  for (const row of rows) {
    if (row.status === "completed") completed++;
    if (row.status === "failed") failed++;
    if (row.estimatedCostUsd) {
      estimatedCostUsd += parseFloat(row.estimatedCostUsd as string);
    }
    // Stuck = still "submitted" and submitted more than 30 min ago
    if (row.status === "submitted" && row.submittedAt < stuckThreshold) {
      stuckJobs++;
    }
  }

  return {
    total: rows.length,
    completed,
    failed,
    estimatedCostUsd,
    stuckJobs,
  };
}

/**
 * Run the full health check and return a structured report.
 */
export async function runAtlasHealthCheck(): Promise<AtlasHealthReport> {
  const [probe, stats] = await Promise.all([
    probeAtlasApi(),
    getAtlasStats(),
  ]);

  const successRate =
    stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 100; // No jobs = no failures

  // Determine overall status
  let status: "healthy" | "warning" | "critical" = "healthy";

  if (!probe.reachable) {
    status = "critical";
  } else if (stats.stuckJobs > 0 || successRate < 70) {
    status = "warning";
  } else if (successRate < 85) {
    status = "warning";
  }

  const statusEmoji = status === "healthy" ? "✅" : status === "warning" ? "⚠️" : "🚨";

  const summary = [
    `${statusEmoji} Atlas Cloud — ${status.toUpperCase()}`,
    ``,
    `📡 API Connectivity: ${probe.reachable ? "✅ Reachable" : `❌ UNREACHABLE — ${probe.error}`}`,
    ``,
    `📊 Last 24 Hours:`,
    `  • Total jobs: ${stats.total}`,
    `  • Completed: ${stats.completed}`,
    `  • Failed: ${stats.failed}`,
    `  • Success rate: ${successRate}%`,
    `  • Estimated spend: $${stats.estimatedCostUsd.toFixed(2)} USD`,
    stats.stuckJobs > 0
      ? `  • ⚠️ Stuck jobs (>30min): ${stats.stuckJobs}`
      : `  • Stuck jobs: None`,
    ``,
    status === "critical"
      ? `🚨 ACTION REQUIRED: ${probe.error || "Atlas Cloud is unreachable. Check balance and API key."}`
      : status === "warning"
      ? `⚠️ ATTENTION: ${stats.stuckJobs > 0 ? `${stats.stuckJobs} job(s) stuck — may need manual retry.` : `Success rate ${successRate}% is below 85% threshold.`}`
      : `All systems nominal. No action required.`,
  ].join("\n");

  return {
    apiReachable: probe.reachable,
    apiError: probe.error,
    last24hTotal: stats.total,
    last24hCompleted: stats.completed,
    last24hFailed: stats.failed,
    last24hSuccessRate: successRate,
    last24hEstimatedCostUsd: stats.estimatedCostUsd,
    stuckJobs: stats.stuckJobs,
    status,
    summary,
  };
}

/**
 * Run the health check and send the result to the owner via notifyOwner.
 * Called by the daily cron job.
 */
export async function runDailyAtlasMonitor(): Promise<void> {
  console.log("[AtlasMonitor] Running daily health check...");

  try {
    const report = await runAtlasHealthCheck();

    const title =
      report.status === "healthy"
        ? "✅ WIZ AI — Atlas Cloud Daily Report: All Good"
        : report.status === "warning"
        ? "⚠️ WIZ AI — Atlas Cloud Daily Report: Attention Needed"
        : "🚨 WIZ AI — Atlas Cloud CRITICAL: Action Required";

    await notifyOwner({ title, content: report.summary });

    console.log(`[AtlasMonitor] Report sent. Status: ${report.status}`);
    console.log(`[AtlasMonitor] ${report.summary}`);
  } catch (err) {
    console.error("[AtlasMonitor] Failed to run health check:", err);
    // Try to send a failure notification
    try {
      await notifyOwner({
        title: "🚨 WIZ AI — Atlas Cloud Monitor Failed",
        content: `The daily Atlas Cloud health check failed to run.\n\nError: ${err instanceof Error ? err.message : String(err)}\n\nPlease check the server logs and Atlas Cloud dashboard manually.`,
      });
    } catch {
      console.error("[AtlasMonitor] Could not send failure notification");
    }
  }
}

/**
 * Start the daily Atlas Cloud health monitor cron job.
 * Runs at 08:00 UTC every day.
 * Call this once at server startup from server/_core/index.ts.
 */
export function startAtlasMonitor(): void {
  // Use node-cron: "0 8 * * *" = every day at 08:00 UTC
  import("node-cron").then((cron) => {
    cron.default.schedule("0 8 * * *", () => {
      runDailyAtlasMonitor();
    });
    console.log("[AtlasMonitor] Daily health check scheduled at 08:00 UTC");
  }).catch((err) => {
    console.error("[AtlasMonitor] Failed to schedule cron job:", err);
  });
}
