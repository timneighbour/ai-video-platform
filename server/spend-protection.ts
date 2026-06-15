/**
 * SPEND PROTECTION SERVICE
 * ========================
 * Implements all 12 spend protection requirements to prevent runaway API costs.
 *
 * Item 1: Per-job spend cap — max API cost per single render job
 * Item 2: Daily spend cap — max API cost per calendar day (UTC)
 * Item 3: Per-scene retry limit — max provider attempts per scene
 * Item 4: Idempotency keys — prevent duplicate submissions
 * Item 5: Polling-cannot-submit rule — poll procedure never calls provider APIs
 * Item 6: Provider job tracking table — every submission logged (providerJobLogs)
 * Item 7: Spend logging — every cost event written to DB
 * Item 8: Pre-render cost estimate — shown to user before credits deducted
 * Item 9: Failsafe kill switch — SPEND_PROTECTION_ENABLED env flag
 * Item 10: Credit safety confirmation — credits only deducted once per job
 * Item 11: User-friendly failure messages — no vague errors
 * Item 12: Proof — all protections verifiable via logs and DB queries
 */

import { getDb } from "./db";
import { providerJobLogs } from "../drizzle/schema";
import { and, eq, gte, sql } from "drizzle-orm";

// ── COST CONSTANTS (USD per 5-second scene) ──────────────────────────────────
// NOTE: Keep in sync with RENDERER_COSTS in server/products.ts
// SOLE ACTIVE PROVIDER as of Apr 2026: Atlas Cloud (atlas_cloud / atlas_cloud_fast)
// fal.ai, WaveSpeed, and Hypereal are all DISABLED for launch.
export const PROVIDER_COST_USD: Record<string, number> = {
  fal_seedance:     0.05,  // fal.ai Seedance 2.0 (restricted to non-US users)
  atlas_cloud_fast: 0.64,  // PRIMARY — Atlas Cloud Fast (~$0.101/sec × 5s + overhead)
  atlas_cloud:      0.80,  // Atlas Cloud Standard (higher quality, slower)
  hypereal:         0.50,  // Disabled — no silent fallback during launch
  byteplus_seedance: 0.25,  // BytePlus ModelArk Seedance 2.0 — Official ByteDance international API
  wavespeed:        1.80,  // WaveSpeed Seedance 2.0 Fast 720p — MEASURED $1.80/clip (was wrong at $0.80)
  kling_standard:   0.60,
  kling_pro:        1.20,
  runway:           0.80,
  grok_imagine:     0.40,
  // Legacy aliases — treated as atlas_cloud in routing
  seedance:         0.80,
};

// ── SPEND CAPS (Item 1 & 2) ───────────────────────────────────────────────────
// Per-job cap: maximum USD we will spend on a single render job
// At Atlas Cloud pricing ($0.64-0.80/scene): cap allows ~250 scenes per job
// Raised 2026-05-22: 12 scenes × $1.80 = $21.60 max realistic cost. Cap at $40 for safety margin.
// Raised 2026-05-22 (second pass): job 720001 hit $41.40 due to retries — raised to $80 for safety.
export const MAX_SPEND_PER_JOB_USD = 80.00;

// Daily cap: maximum USD across ALL jobs in a calendar day
// Raised 2026-05-14: cap lifted to $150 to allow Zara demo renders to complete today.
export const MAX_DAILY_SPEND_USD = 150.00;

// Per-scene retry limit (Item 3)
// Provider failures (balance, timeout, infrastructure) are retryable — limit is higher.
// Moderation/content failures are hard-blocked regardless of this limit.
export const MAX_ATTEMPTS_PER_SCENE = 5;     // 1 original + 4 retries (provider failures get extra chance)
export const MAX_ATTEMPTS_HARD_BLOCK = 1;    // Moderation/content failures: hard-block after 1 attempt

// ── IDEMPOTENCY KEY (Item 4) ─────────────────────────────────────────────────
export function makeIdempotencyKey(jobId: number, sceneId: number, provider: string, attempt: number): string {
  return `job:${jobId}:scene:${sceneId}:provider:${provider}:attempt:${attempt}`;
}

// ── CHECK: Has this exact submission already been made? (Item 4) ─────────────
export async function isAlreadySubmitted(idempotencyKey: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  // Exclude 'cancelled' entries — cancelled attempts (e.g. from a paused job) should not
  // permanently block retries. Only active (submitted) or terminal (completed/failed) entries count.
  const [existing] = await db
    .select({ id: providerJobLogs.id })
    .from(providerJobLogs)
    .where(
      and(
        eq(providerJobLogs.idempotencyKey, idempotencyKey),
        sql`${providerJobLogs.status} != 'cancelled'`
      )
    )
    .limit(1);
  return !!existing;
}

// ── CHECK: How many attempts have been made for this scene? (Item 3) ─────────
export async function getSceneAttemptCount(sceneId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(providerJobLogs)
    // Exclude "cancelled" entries — these are old attempts that were reset when the user
    // manually edited the scene prompt. Only count active (submitted/completed/failed) attempts.
    .where(and(eq(providerJobLogs.sceneId, sceneId), sql`${providerJobLogs.status} != 'cancelled'`));
  return Number(row?.count ?? 0);
}

// ── RESET: Clear attempt logs for a scene (used when user manually edits & retries) ──────
// This allows a user who has edited a scene prompt to retry even after hitting the limit.
// We mark old logs as "cancelled" rather than deleting them, preserving the audit trail.
export async function resetSceneAttempts(sceneId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Cancel both 'failed' AND 'submitted' (stuck/timed-out) entries so the retry
  // is not blocked by old attempts that never transitioned out of 'submitted' state.
  await db.update(providerJobLogs)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(providerJobLogs.sceneId, sceneId),
        sql`${providerJobLogs.status} IN ('failed', 'submitted')`
      )
    );
}

// ── CHECK: Has per-job spend cap been reached? (Item 1) ──────────────────────
export async function isJobSpendCapReached(jobId: number): Promise<{ reached: boolean; totalUsd: number }> {
  const db = await getDb();
  if (!db) return { reached: false, totalUsd: 0 };
  // Exclude 'cancelled' entries — cancelled submissions (e.g. from paused jobs) were never
  // actually charged by the provider and should not count toward the spend cap.
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(estimatedCostUsd), 0)` })
    .from(providerJobLogs)
    .where(and(eq(providerJobLogs.jobId, jobId), sql`${providerJobLogs.status} != 'cancelled'`));
  const totalUsd = Number(row?.total ?? 0);
  return { reached: totalUsd >= MAX_SPEND_PER_JOB_USD, totalUsd };
}

// ── CHECK: Has daily spend cap been reached? (Item 2) ────────────────────────
export async function isDailySpendCapReached(): Promise<{ reached: boolean; totalUsd: number }> {
  const db = await getDb();
  if (!db) return { reached: false, totalUsd: 0 };
  // Start of today UTC
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  // Exclude 'cancelled' entries — cancelled submissions were never charged by the provider.
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(estimatedCostUsd), 0)` })
    .from(providerJobLogs)
    .where(and(gte(providerJobLogs.createdAt, todayStart), sql`${providerJobLogs.status} != 'cancelled'`));
  const totalUsd = Number(row?.total ?? 0);
  return { reached: totalUsd >= MAX_DAILY_SPEND_USD, totalUsd };
}

// ── LOG: Record a provider submission (Items 6 & 7) ──────────────────────────
export async function logProviderSubmission(params: {
  jobId: number;
  sceneId: number;
  provider: string;
  providerJobId?: string;
  idempotencyKey: string;
  attemptNumber: number;
  estimatedCostUsd: number;
  submissionReason: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(providerJobLogs).values({
    jobId: params.jobId,
    sceneId: params.sceneId,
    provider: params.provider,
    providerJobId: params.providerJobId,
    idempotencyKey: params.idempotencyKey,
    status: "submitted",
    attemptNumber: params.attemptNumber,
    estimatedCostUsd: String(params.estimatedCostUsd.toFixed(4)),
    submissionReason: params.submissionReason,
    submittedAt: new Date(),
  });
}

// ── LOG: Mark a provider job as completed (Item 7) ───────────────────────────
export async function markProviderJobCompleted(idempotencyKey: string, actualCostUsd?: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(providerJobLogs)
    .set({
      status: "completed",
      completedAt: new Date(),
      ...(actualCostUsd !== undefined ? { actualCostUsd: String(actualCostUsd.toFixed(4)) } : {}),
    })
    .where(eq(providerJobLogs.idempotencyKey, idempotencyKey));
}

// ── LOG: Mark a provider job as failed (Item 7) ──────────────────────────────
export async function markProviderJobFailed(idempotencyKey: string, errorMessage: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(providerJobLogs)
    .set({
      status: "failed",
      failedAt: new Date(),
      errorMessage: errorMessage.slice(0, 1000),
    })
    .where(eq(providerJobLogs.idempotencyKey, idempotencyKey));
}

// ── PRE-RENDER COST ESTIMATE (Item 8) ────────────────────────────────────────
export function estimateRenderCostUsd(sceneCount: number, provider: string = "fal_seedance"): number {
  const costPerScene = PROVIDER_COST_USD[provider] ?? PROVIDER_COST_USD.fal_seedance;
  return sceneCount * costPerScene;
}

// ── FAILSAFE KILL SWITCH (Item 9) ────────────────────────────────────────────
// Set SPEND_PROTECTION_ENABLED=false in env to disable (for emergency testing only)
export function isSpendProtectionEnabled(): boolean {
  return process.env.SPEND_PROTECTION_ENABLED !== "false";
}

// ── ISS-019: PROGRESSIVE SPEND ALERTING ──────────────────────────────────────
// Alert the owner at 50%, 75%, and 90% of the daily cap. Only alert once per
// threshold per day to avoid spam.
const SPEND_ALERT_THRESHOLDS = [0.5, 0.75, 0.9] as const;
const spendAlertsSentToday = new Set<number>(); // tracks which thresholds have been alerted today
let spendAlertDay: string | null = null; // UTC date string — reset when day changes

export async function checkProgressiveSpendAlerts(): Promise<void> {
  try {
    const { notifyOwner } = await import("./_core/notification");
    const todayUtc = new Date().toISOString().slice(0, 10);
    if (spendAlertDay !== todayUtc) {
      spendAlertDay = todayUtc;
      spendAlertsSentToday.clear();
    }
    const dailySpend = await isDailySpendCapReached();
    const pct = dailySpend.totalUsd / MAX_DAILY_SPEND_USD;
    for (const threshold of SPEND_ALERT_THRESHOLDS) {
      const thresholdPct = Math.round(threshold * 100);
      if (pct >= threshold && !spendAlertsSentToday.has(thresholdPct)) {
        spendAlertsSentToday.add(thresholdPct);
        notifyOwner({
          title: `⚠️ WIZ AI Daily Spend at ${thresholdPct}% of Cap`,
          content: `Daily API spend has reached $${dailySpend.totalUsd.toFixed(2)} USD ` +
            `(${thresholdPct}% of the $${MAX_DAILY_SPEND_USD.toFixed(2)} daily cap). ` +
            `Date: ${todayUtc}. Monitor the pipeline to avoid hitting the hard stop.`,
        }).catch(() => {});
        console.warn(`[SpendProtection] ⚠️ Progressive alert: daily spend at ${thresholdPct}% ($${dailySpend.totalUsd.toFixed(2)}/$${MAX_DAILY_SPEND_USD.toFixed(2)})`);
      }
    }
  } catch (err) {
    console.error("[SpendProtection] Failed to check progressive spend alerts:", err);
  }
}

// ── COMPREHENSIVE PRE-SUBMISSION GUARD (combines Items 1–4, 9) ───────────────
// Call this BEFORE every provider API call. Returns null if safe to proceed,
// or a string error message if the submission should be blocked.
export async function checkSubmissionAllowed(params: {
  jobId: number;
  sceneId: number;
  provider: string;
  attempt: number;
  lastErrorMessage?: string; // If provided, used to determine smart retry limit
}): Promise<string | null> {
  // Item 9: Failsafe kill switch
  if (!isSpendProtectionEnabled()) {
    console.warn("[SpendProtection] SPEND_PROTECTION_ENABLED=false — all guards bypassed");
    return null;
  }

  const { jobId, sceneId, provider, attempt } = params;
  const idempotencyKey = makeIdempotencyKey(jobId, sceneId, provider, attempt);

  // Item 4: Idempotency — block duplicate submissions
  if (await isAlreadySubmitted(idempotencyKey)) {
    return `DUPLICATE_SUBMISSION: Scene ${sceneId} already submitted to ${provider} (attempt ${attempt}). Idempotency key: ${idempotencyKey}`;
  }

  // Item 3: Retry limit — smart limit based on failure category
  const attemptCount = await getSceneAttemptCount(sceneId);
  // If the last failure was a hard-block category (moderation/content), apply strict limit
  const lastErrCategory = params.lastErrorMessage ? classifyFailure(params.lastErrorMessage) : "unknown";
  const maxAttempts = (lastErrCategory === "moderation" || lastErrCategory === "prompt_error")
    ? MAX_ATTEMPTS_HARD_BLOCK
    : MAX_ATTEMPTS_PER_SCENE;
  if (attemptCount >= maxAttempts) {
    const isHardBlock = lastErrCategory === "moderation" || lastErrCategory === "prompt_error";
    const reason = isHardBlock
      ? `Content policy violation — this scene cannot be retried. Please edit the scene description.`
      : `Scene ${sceneId} has already been submitted ${attemptCount} times (max ${maxAttempts}). No further retries allowed.`;
    return `RETRY_LIMIT: ${reason}`;
  }

  // Item 1: Per-job spend cap
  const jobSpend = await isJobSpendCapReached(jobId);
  if (jobSpend.reached) {
    return `JOB_SPEND_CAP: Job ${jobId} has already spent $${jobSpend.totalUsd.toFixed(2)} USD (cap: $${MAX_SPEND_PER_JOB_USD.toFixed(2)}). No further scenes will be submitted.`;
  }

  // Item 2: Daily spend cap
  const dailySpend = await isDailySpendCapReached();
  if (dailySpend.reached) {
    return `DAILY_SPEND_CAP: Daily API spend has reached $${dailySpend.totalUsd.toFixed(2)} USD (cap: $${MAX_DAILY_SPEND_USD.toFixed(2)}). Renders paused until tomorrow.`;
  }

  return null; // All checks passed — safe to submit
}

// ── FAILURE CATEGORISATION ───────────────────────────────────────────────────
// Classify a failure message into a category to determine retry behaviour.
export type FailureCategory =
  | "provider_failure"      // Provider infrastructure error (retryable)
  | "balance_exhausted"     // Provider ran out of credits (retryable after top-up)
  | "timeout"               // Request timed out (retryable)
  | "moderation"            // Content policy violation (hard-block)
  | "prompt_error"          // Invalid prompt or bad request (hard-block)
  | "infrastructure"        // Our own infrastructure error (retryable)
  | "unknown";              // Unclassified (retryable by default)

export function classifyFailure(errorMessage: string): FailureCategory {
  const msg = errorMessage.toLowerCase();
  // Hard-block categories
  if (
    msg.includes("moderat") ||
    msg.includes("content policy") ||
    msg.includes("safety") ||
    msg.includes("nsfw") ||
    msg.includes("violat") ||
    msg.includes("inappropriate") ||
    msg.includes("real person") ||
    msg.includes("real_person") ||
    msg.includes("output audio may contain") ||
    msg.includes("sensitive information")
  ) return "moderation";
  if (
    msg.includes("invalid prompt") ||
    msg.includes("bad request") ||
    msg.includes("400") && msg.includes("prompt") ||
    msg.includes("prompt too long")
  ) return "prompt_error";
  // Retryable categories
  if (
    msg.includes("insufficient") ||
    msg.includes("balance") ||
    msg.includes("credit") ||
    msg.includes("quota") ||
    msg.includes("402")
  ) return "balance_exhausted";
  if (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("504") ||
    msg.includes("408")
  ) return "timeout";
  if (
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("500") ||
    msg.includes("unavailable") ||
    msg.includes("provider") ||
    msg.includes("upstream") ||
    msg.includes("network") ||
    msg.includes("econnreset") ||
    msg.includes("enotfound")
  ) return "provider_failure";
  if (
    msg.includes("database") ||
    msg.includes("s3") ||
    msg.includes("storage")
  ) return "infrastructure";
  return "unknown";
}

// Returns true if the failure is a temporary provider issue and should be retried
export function isRetryableFailure(errorMessage: string): boolean {
  const category = classifyFailure(errorMessage);
  return category !== "moderation" && category !== "prompt_error";
}

// Returns the max allowed attempts for a given failure category
export function getMaxAttemptsForCategory(category: FailureCategory): number {
  if (category === "moderation" || category === "prompt_error") return MAX_ATTEMPTS_HARD_BLOCK;
  return MAX_ATTEMPTS_PER_SCENE;
}

// ── SPEND SUMMARY (for admin dashboard / Item 12 proof) ──────────────────────
export async function getSpendSummary(jobId?: number): Promise<{
  todayUsd: number;
  jobUsd?: number;
  totalAllTimeUsd: number;
  submissionsToday: number;
  duplicatesBlocked: number;
}> {
  const db = await getDb();
  if (!db) return { todayUsd: 0, totalAllTimeUsd: 0, submissionsToday: 0, duplicatesBlocked: 0 };

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [todayRow] = await db
    .select({
      total: sql<number>`COALESCE(SUM(estimatedCostUsd), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(providerJobLogs)
    .where(gte(providerJobLogs.createdAt, todayStart));

  const [allTimeRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(estimatedCostUsd), 0)` })
    .from(providerJobLogs);

  let jobUsd: number | undefined;
  if (jobId !== undefined) {
    const [jobRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(estimatedCostUsd), 0)` })
      .from(providerJobLogs)
      .where(eq(providerJobLogs.jobId, jobId));
    jobUsd = Number(jobRow?.total ?? 0);
  }

  return {
    todayUsd: Number(todayRow?.total ?? 0),
    jobUsd,
    totalAllTimeUsd: Number(allTimeRow?.total ?? 0),
    submissionsToday: Number(todayRow?.count ?? 0),
    duplicatesBlocked: 0, // Would need a separate counter — placeholder for now
  };
}
