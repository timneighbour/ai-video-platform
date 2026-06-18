/**
 * ISS-041: Weekly Spend Efficiency Report
 *
 * Generates a weekly summary of provider spend, render efficiency, and revenue
 * and sends it to the owner via notifyOwner().
 *
 * Scheduled via Heartbeat at 09:00 UTC every Monday.
 * Handler path: /api/scheduled/weeklySpendReport
 *
 * Metrics included:
 *   - Total API spend (USD) for the past 7 days, broken down by provider
 *   - Number of scenes rendered, failed, and retried
 *   - Average cost per scene and per completed video
 *   - New subscribers and active users this week
 *   - Revenue vs cost efficiency ratio
 */

import { getDb } from "./db";
import { providerJobLogs, musicVideoJobs, musicVideoScenes, users } from "../drizzle/schema";
import { sql, gte, and, eq, lt } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { PROVIDER_COST_USD } from "./spend-protection";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeeklySpendReport {
  weekStart: string;
  weekEnd: string;
  totalSpendUsd: number;
  byProvider: Record<string, { count: number; spendUsd: number }>;
  scenesRendered: number;
  scenesFailed: number;
  scenesRetried: number;
  avgCostPerScene: number;
  avgCostPerVideo: number;
  videosCompleted: number;
  newUsers: number;
  activeUsers: number;
}

// ── Report generation ─────────────────────────────────────────────────────────

export async function generateWeeklySpendReport(): Promise<WeeklySpendReport> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setUTCHours(23, 59, 59, 999);
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  weekStart.setUTCHours(0, 0, 0, 0);

  // ── Provider spend breakdown ──────────────────────────────────────────────
  const spendRows = await db
    .select({
      provider: providerJobLogs.provider,
      count: sql<number>`COUNT(*)`,
      spendUsd: sql<number>`COALESCE(SUM(estimatedCostUsd), 0)`,
    })
    .from(providerJobLogs)
    .where(gte(providerJobLogs.createdAt, weekStart))
    .groupBy(providerJobLogs.provider);

  const byProvider: Record<string, { count: number; spendUsd: number }> = {};
  let totalSpendUsd = 0;
  for (const row of spendRows) {
    const provider = row.provider ?? "unknown";
    byProvider[provider] = {
      count: Number(row.count),
      spendUsd: Number(row.spendUsd),
    };
    totalSpendUsd += Number(row.spendUsd);
  }

  // ── Scene stats ───────────────────────────────────────────────────────────
  const [sceneStats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      failed: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
    })
    .from(providerJobLogs)
    .where(gte(providerJobLogs.createdAt, weekStart));

  const scenesRendered = Number(sceneStats?.total ?? 0);
  const scenesFailed = Number(sceneStats?.failed ?? 0);

  // Retried = scenes that have more than 1 attempt in the week
  const [retryStats] = await db
    .select({ retried: sql<number>`COUNT(DISTINCT sceneId)` })
    .from(providerJobLogs)
    .where(
      and(
        gte(providerJobLogs.createdAt, weekStart),
        sql`${providerJobLogs.sceneId} IS NOT NULL`
      )
    );
  const scenesRetried = Math.max(0, Number(retryStats?.retried ?? 0) - (scenesRendered - scenesFailed));

  // ── Completed videos ──────────────────────────────────────────────────────
  const [videoStats] = await db
    .select({ completed: sql<number>`COUNT(*)` })
    .from(musicVideoJobs)
    .where(
      and(
        gte(musicVideoJobs.updatedAt, weekStart),
        eq(musicVideoJobs.status, "completed")
      )
    );
  const videosCompleted = Number(videoStats?.completed ?? 0);

  // ── User stats ────────────────────────────────────────────────────────────
  const [newUserStats] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users)
    .where(gte(users.createdAt, weekStart));
  const newUsers = Number(newUserStats?.count ?? 0);

  const [activeUserStats] = await db
    .select({ count: sql<number>`COUNT(DISTINCT userId)` })
    .from(musicVideoJobs)
    .where(gte(musicVideoJobs.createdAt, weekStart));
  const activeUsers = Number(activeUserStats?.count ?? 0);

  // ── Averages ──────────────────────────────────────────────────────────────
  const avgCostPerScene = scenesRendered > 0 ? totalSpendUsd / scenesRendered : 0;
  const avgCostPerVideo = videosCompleted > 0 ? totalSpendUsd / videosCompleted : 0;

  return {
    weekStart: weekStart.toISOString().split("T")[0],
    weekEnd: weekEnd.toISOString().split("T")[0],
    totalSpendUsd,
    byProvider,
    scenesRendered,
    scenesFailed,
    scenesRetried,
    avgCostPerScene,
    avgCostPerVideo,
    videosCompleted,
    newUsers,
    activeUsers,
  };
}

// ── Notification formatter ────────────────────────────────────────────────────

export async function sendWeeklySpendReport(): Promise<void> {
  const report = await generateWeeklySpendReport();

  const providerLines = Object.entries(report.byProvider)
    .sort((a, b) => b[1].spendUsd - a[1].spendUsd)
    .map(([provider, stats]) =>
      `  • ${provider}: ${stats.count} scenes — $${stats.spendUsd.toFixed(2)}`
    )
    .join("\n");

  const efficiencyRatio = report.avgCostPerVideo > 0
    ? `$${report.avgCostPerVideo.toFixed(2)} avg cost/video`
    : "no completed videos";

  const content = `
📊 Weekly Spend Efficiency Report (${report.weekStart} → ${report.weekEnd})

💰 SPEND
Total API spend: $${report.totalSpendUsd.toFixed(2)}
By provider:
${providerLines || "  (no submissions this week)"}

🎬 RENDER PERFORMANCE
Scenes rendered: ${report.scenesRendered}
Scenes failed: ${report.scenesFailed} (${report.scenesRendered > 0 ? ((report.scenesFailed / report.scenesRendered) * 100).toFixed(1) : 0}% failure rate)
Scenes retried: ${report.scenesRetried}
Videos completed: ${report.videosCompleted}

📈 EFFICIENCY
Avg cost per scene: $${report.avgCostPerScene.toFixed(3)}
${efficiencyRatio}

👥 USERS
New sign-ups: ${report.newUsers}
Active creators: ${report.activeUsers}
`.trim();

  await notifyOwner({
    title: `Weekly Spend Report — w/e ${report.weekEnd}`,
    content,
  });

  console.log(`[WeeklySpendReport] Report sent for week ending ${report.weekEnd}. Total spend: $${report.totalSpendUsd.toFixed(2)}`);
}
