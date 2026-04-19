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
export const PROVIDER_COST_USD: Record<string, number> = {
  fal_seedance:  0.05,   // fal.ai Seedance 2.0 — cheapest, primary
  atlas_cloud:   0.30,   // Atlas Cloud Seedance
  hypereal:      0.50,   // Hypereal Seedance
  wavespeed:     3.50,   // WaveSpeed Seedance 2.0 — most expensive, last resort
  kling_standard: 0.60,
  kling_pro:     1.20,
  runway:        0.80,
  grok_imagine:  0.40,
};

// ── SPEND CAPS (Item 1 & 2) ───────────────────────────────────────────────────
// Per-job cap: maximum USD we will spend on a single render job
export const MAX_SPEND_PER_JOB_USD = 5.00;   // ~100 scenes at fal.ai pricing, or ~1 scene at WaveSpeed

// Daily cap: maximum USD across ALL jobs in a calendar day
export const MAX_DAILY_SPEND_USD = 20.00;

// Per-scene retry limit (Item 3)
export const MAX_ATTEMPTS_PER_SCENE = 2;     // 1 original + 1 retry maximum

// ── IDEMPOTENCY KEY (Item 4) ─────────────────────────────────────────────────
export function makeIdempotencyKey(jobId: number, sceneId: number, provider: string, attempt: number): string {
  return `job:${jobId}:scene:${sceneId}:provider:${provider}:attempt:${attempt}`;
}

// ── CHECK: Has this exact submission already been made? (Item 4) ─────────────
export async function isAlreadySubmitted(idempotencyKey: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [existing] = await db
    .select({ id: providerJobLogs.id })
    .from(providerJobLogs)
    .where(eq(providerJobLogs.idempotencyKey, idempotencyKey))
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
    .where(eq(providerJobLogs.sceneId, sceneId));
  return Number(row?.count ?? 0);
}

// ── CHECK: Has per-job spend cap been reached? (Item 1) ──────────────────────
export async function isJobSpendCapReached(jobId: number): Promise<{ reached: boolean; totalUsd: number }> {
  const db = await getDb();
  if (!db) return { reached: false, totalUsd: 0 };
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(estimatedCostUsd), 0)` })
    .from(providerJobLogs)
    .where(eq(providerJobLogs.jobId, jobId));
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
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(estimatedCostUsd), 0)` })
    .from(providerJobLogs)
    .where(gte(providerJobLogs.createdAt, todayStart));
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

// ── COMPREHENSIVE PRE-SUBMISSION GUARD (combines Items 1–4, 9) ───────────────
// Call this BEFORE every provider API call. Returns null if safe to proceed,
// or a string error message if the submission should be blocked.
export async function checkSubmissionAllowed(params: {
  jobId: number;
  sceneId: number;
  provider: string;
  attempt: number;
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

  // Item 3: Retry limit — block if too many attempts
  const attemptCount = await getSceneAttemptCount(sceneId);
  if (attemptCount >= MAX_ATTEMPTS_PER_SCENE) {
    return `RETRY_LIMIT: Scene ${sceneId} has already been submitted ${attemptCount} times (max ${MAX_ATTEMPTS_PER_SCENE}). No further retries allowed.`;
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
