/**
 * WizAdora™ — Internal API Foundation (Phase 1)
 * ─────────────────────────────────────────────
 * Private internal API layer powering WIZ AI video generation.
 * NOT publicly exposed. No public developer portal.
 * No paid provider calls without explicit approval.
 *
 * Provider: Atlas Cloud ONLY.
 * fal.ai: DISABLED.
 * WaveSpeed: DISABLED.
 * No silent fallback to any other provider.
 */

import crypto from "crypto";
import { getDb } from "../db";
import {
  wizadoraApiKeys,
  wizadoraJobs,
  wizadoraProviderLogs,
  wizadoraIdempotencyKeys,
  wizadoraSpendCaps,
  wizadoraWebhookLogs,
  credits,
  creditTransactions,
} from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

// ─── ALLOWED PROVIDERS ───────────────────────────────────────────────────────
/** The only permitted provider. fal.ai and WaveSpeed are explicitly blocked. */
export const ALLOWED_PROVIDERS = ["atlas_cloud"] as const;
export type AllowedProvider = (typeof ALLOWED_PROVIDERS)[number];

const BLOCKED_PROVIDERS = ["fal_ai", "fal.ai", "wavespeed", "hypereal"] as const;

export function assertProviderAllowed(provider: string): void {
  const lower = provider.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  if ((BLOCKED_PROVIDERS as readonly string[]).includes(lower)) {
    throw new WizadoraError(
      "PROVIDER_BLOCKED",
      `Provider '${provider}' is disabled. Only atlas_cloud is permitted.`
    );
  }
  if (!(ALLOWED_PROVIDERS as readonly string[]).includes(lower)) {
    throw new WizadoraError(
      "PROVIDER_NOT_ALLOWED",
      `Provider '${provider}' is not in the allowed provider list.`
    );
  }
}

// ─── ALLOWED STYLE PRESETS ───────────────────────────────────────────────────
/** Safe generic style labels only. No protected brand/style names. */
export const ALLOWED_STYLES = [
  "cinematic",
  "photorealistic",
  "polished_3d_animation",
  "japanese_anime_inspired",
  "storybook_watercolour",
  "clay_animation",
  "retro_cartoon",
  "commercial",
  "documentary",
  "abstract",
  "vintage",
] as const;
export type AllowedStyle = (typeof ALLOWED_STYLES)[number];

// ─── ERROR CLASS ─────────────────────────────────────────────────────────────
export class WizadoraError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "WizadoraError";
  }
}

// ─── API KEY AUTHENTICATION ───────────────────────────────────────────────────
/**
 * Hash a raw API key for storage/lookup.
 * We never store the raw key — only a SHA-256 hash.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Generate a new internal test API key.
 * Format: wiz_test_sk_<32 random hex chars>
 */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(16).toString("hex");
  const raw = `wiz_test_sk_${random}`;
  const hash = hashApiKey(raw);
  const prefix = raw.slice(0, 16); // wiz_test_sk_xxxx
  return { raw, hash, prefix };
}

/**
 * Authenticate a Bearer token API key.
 * Returns the key record if valid and active.
 * Throws WizadoraError if invalid, revoked, or expired.
 */
export async function authenticateApiKey(rawKey: string) {
  const isTestKey = rawKey.startsWith("wiz_test_sk_");
  const isLiveKey = rawKey.startsWith("wiz_live_sk_");
  if (!rawKey || (!isTestKey && !isLiveKey)) {
    throw new WizadoraError("INVALID_API_KEY_FORMAT", "Invalid API key format.", 401);
  }

  const db = await getDb();
  if (!db) throw new WizadoraError("DB_UNAVAILABLE", "Database unavailable.", 503);

  const hash = hashApiKey(rawKey);
  const [key] = await db
    .select()
    .from(wizadoraApiKeys)
    .where(eq(wizadoraApiKeys.keyHash, hash))
    .limit(1);

  if (!key) throw new WizadoraError("API_KEY_NOT_FOUND", "API key not found.", 401);
  if (!key.isActive) throw new WizadoraError("API_KEY_REVOKED", "API key has been revoked.", 401);
  if (key.revokedAt) throw new WizadoraError("API_KEY_REVOKED", "API key has been revoked.", 401);
  if (key.expiresAt && key.expiresAt < new Date()) {
    throw new WizadoraError("API_KEY_EXPIRED", "API key has expired.", 401);
  }

  // Update last used timestamp (fire and forget)
  db.update(wizadoraApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(wizadoraApiKeys.id, key.id))
    .catch(() => {});

  return key;
}

// ─── CONTENT MODERATION ──────────────────────────────────────────────────────
/**
 * Moderation hook — blocks prohibited content before any provider submission.
 * Pattern-based. No external API call. Synchronous.
 */
const MODERATION_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(nude|naked|sex|porn|explicit|nsfw|erotic|xxx|adult.content)\b/i, reason: "adult_sexual_content" },
  { pattern: /\b(child|minor|kid|underage|teen|juvenile).{0,20}(nude|naked|sex|explicit|erotic)\b/i, reason: "csam" },
  { pattern: /\b(deepfake|face.swap|identity.clone|impersonat).{0,30}(without.consent|non.consensual)\b/i, reason: "non_consensual_deepfake" },
  { pattern: /\b(terrorist|terrorism|isis|al.qaeda|jihad|bomb.making|attack.plan)\b/i, reason: "terrorist_content" },
  { pattern: /\b(murder|kill|execute|torture|graphic.violence|gore)\b/i, reason: "graphic_violence" },
  { pattern: /\b(hate|racist|antisemit|islamophob|white.supremac|nazi|neo.nazi)\b/i, reason: "hateful_content" },
  { pattern: /\b(doxx|doxing|personal.address|home.address|stalk)\b/i, reason: "doxxing_harassment" },
  { pattern: /\b(fraud|scam|phishing|fake.invoice|money.laundering)\b/i, reason: "fraud_scam" },
  { pattern: /\b(pixar|disney|marvel|studio.ghibli|dreamworks|nintendo|pokemon|mickey.mouse|frozen|elsa|anna)\b/i, reason: "protected_brand_style" },
];

export interface ModerationResult {
  blocked: boolean;
  reason?: string;
}

export function moderatePrompt(prompt: string, negativePrompt?: string): ModerationResult {
  const combined = `${prompt} ${negativePrompt ?? ""}`;
  for (const { pattern, reason } of MODERATION_PATTERNS) {
    if (pattern.test(combined)) {
      return { blocked: true, reason };
    }
  }
  return { blocked: false };
}

// ─── IDEMPOTENCY ─────────────────────────────────────────────────────────────
/**
 * Hash a request body for idempotency comparison.
 */
export function hashRequest(body: object): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex");
}

/**
 * Check idempotency key. Returns existing job ID if duplicate, null if new.
 * Throws if same key is used with a different request body.
 */
export async function checkIdempotency(
  idempotencyKey: string,
  userId: number,
  requestHash: string
): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new WizadoraError("DB_UNAVAILABLE", "Database unavailable.", 503);

  const [existing] = await db
    .select()
    .from(wizadoraIdempotencyKeys)
    .where(
      and(
        eq(wizadoraIdempotencyKeys.idempotencyKey, idempotencyKey),
        eq(wizadoraIdempotencyKeys.userId, userId)
      )
    )
    .limit(1);

  if (!existing) return null;

  // Same key, different body = conflict
  if (existing.requestHash !== requestHash) {
    throw new WizadoraError(
      "IDEMPOTENCY_CONFLICT",
      "Idempotency key already used with a different request body.",
      409
    );
  }

  return existing.jobId;
}

/**
 * Store an idempotency key after job creation.
 * TTL: 24 hours.
 */
export async function storeIdempotencyKey(
  idempotencyKey: string,
  userId: number,
  jobId: string,
  requestHash: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(wizadoraIdempotencyKeys).values({
    idempotencyKey,
    userId,
    jobId,
    requestHash,
    expiresAt,
  });
}

// ─── SPEND CAPS ──────────────────────────────────────────────────────────────
export interface SpendCapCheckResult {
  allowed: boolean;
  reason?: string;
  caps?: {
    perJobCapGbp: number;
    dailyCapGbp: number;
    monthlyCapGbp: number;
    accountCapGbp: number;
    dailySpentGbp: number;
    monthlySpentGbp: number;
    totalSpentGbp: number;
  };
}

/**
 * Check all spend caps before any provider submission.
 * Hard stop — returns { allowed: false } if any cap is exceeded.
 * No provider call is made if this returns false.
 */
export async function checkSpendCaps(
  userId: number,
  estimatedCostGbp: number
): Promise<SpendCapCheckResult> {
  const db = await getDb();
  if (!db) throw new WizadoraError("DB_UNAVAILABLE", "Database unavailable.", 503);

  // Get or create spend cap record for user
  let [cap] = await db
    .select()
    .from(wizadoraSpendCaps)
    .where(eq(wizadoraSpendCaps.userId, userId))
    .limit(1);

  if (!cap) {
    await db.insert(wizadoraSpendCaps).values({ userId });
    [cap] = await db
      .select()
      .from(wizadoraSpendCaps)
      .where(eq(wizadoraSpendCaps.userId, userId))
      .limit(1);
  }

  const perJobCap = Number(cap.perJobCapGbp);
  const dailyCap = Number(cap.dailyCapGbp);
  const monthlyCap = Number(cap.monthlyCapGbp);
  const accountCap = Number(cap.accountCapGbp);
  const dailySpent = Number(cap.dailySpentGbp);
  const monthlySpent = Number(cap.monthlySpentGbp);
  const totalSpent = Number(cap.totalSpentGbp);

  const caps = {
    perJobCapGbp: perJobCap,
    dailyCapGbp: dailyCap,
    monthlyCapGbp: monthlyCap,
    accountCapGbp: accountCap,
    dailySpentGbp: dailySpent,
    monthlySpentGbp: monthlySpent,
    totalSpentGbp: totalSpent,
  };

  if (estimatedCostGbp > perJobCap) {
    return {
      allowed: false,
      reason: `Estimated cost £${estimatedCostGbp.toFixed(4)} exceeds per-job cap of £${perJobCap.toFixed(4)}.`,
      caps,
    };
  }
  if (dailySpent + estimatedCostGbp > dailyCap) {
    return {
      allowed: false,
      reason: `Daily spend cap of £${dailyCap.toFixed(2)} would be exceeded.`,
      caps,
    };
  }
  if (monthlySpent + estimatedCostGbp > monthlyCap) {
    return {
      allowed: false,
      reason: `Monthly spend cap of £${monthlyCap.toFixed(2)} would be exceeded.`,
      caps,
    };
  }
  if (totalSpent + estimatedCostGbp > accountCap) {
    return {
      allowed: false,
      reason: `Account spend cap of £${accountCap.toFixed(2)} would be exceeded.`,
      caps,
    };
  }

  return { allowed: true, caps };
}

/**
 * Record actual spend after a job completes.
 */
export async function recordSpend(userId: number, actualCostGbp: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(wizadoraSpendCaps)
    .set({
      dailySpentGbp: sql`daily_spent_gbp + ${actualCostGbp}`,
      monthlySpentGbp: sql`monthly_spent_gbp + ${actualCostGbp}`,
      totalSpentGbp: sql`total_spent_gbp + ${actualCostGbp}`,
    })
    .where(eq(wizadoraSpendCaps.userId, userId));
}

// ─── CREDIT LIFECYCLE ────────────────────────────────────────────────────────
/**
 * Reserve credits when a job is accepted (before provider submission).
 * Throws if insufficient balance.
 */
export async function reserveCredits(userId: number, amount: number, jobId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new WizadoraError("DB_UNAVAILABLE", "Database unavailable.", 503);

  const [creditRow] = await db
    .select()
    .from(credits)
    .where(eq(credits.userId, userId))
    .limit(1);

  if (!creditRow || creditRow.balance < amount) {
    throw new WizadoraError(
      "INSUFFICIENT_CREDITS",
      `Insufficient Build Credits. Required: ${amount}, available: ${creditRow?.balance ?? 0}.`,
      402
    );
  }

  // Deduct from balance (reserved)
  await db
    .update(credits)
    .set({
      balance: sql`balance - ${amount}`,
      totalSpent: sql`totalSpent + ${amount}`,
    })
    .where(eq(credits.userId, userId));

  // Log the reservation
  await db.insert(creditTransactions).values({
    userId,
    amount: -amount,
    type: "deduction",
    description: `WizAdora credit reservation for job ${jobId}`,
    relatedTransactionId: jobId,
  });
}

/**
 * Charge credits on successful job completion.
 * Credits were already deducted at reservation time — this updates the job record.
 */
export async function chargeCredits(jobId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(wizadoraJobs)
    .set({ creditsCharged: sql`credits_reserved` })
    .where(eq(wizadoraJobs.id, jobId));
}

/**
 * Refund reserved credits if a job fails or is cancelled before processing.
 */
export async function refundCredits(userId: number, amount: number, jobId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(credits)
    .set({
      balance: sql`balance + ${amount}`,
      totalSpent: sql`totalSpent - ${amount}`,
    })
    .where(eq(credits.userId, userId));

  await db.insert(creditTransactions).values({
    userId,
    amount,
    type: "refund",
    description: `WizAdora credit refund for failed/cancelled job ${jobId}`,
    relatedTransactionId: jobId,
  });

  // Update job record
  await db
    .update(wizadoraJobs)
    .set({ creditsCharged: 0, creditsReserved: 0 })
    .where(eq(wizadoraJobs.id, jobId));
}

// ─── PROVIDER JOB LOGGING ────────────────────────────────────────────────────
/**
 * Log every provider submission attempt.
 * Called BEFORE the provider call (status: submitted).
 * Updated AFTER the call with result status.
 */
export async function logProviderSubmission(params: {
  jobId: string;
  provider: string;
  providerJobId?: string;
  requestPayloadHash: string;
  idempotencyKey?: string;
  estimatedCost?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [result] = await db.insert(wizadoraProviderLogs).values({
    jobId: params.jobId,
    provider: params.provider,
    providerJobId: params.providerJobId,
    requestPayloadHash: params.requestPayloadHash,
    idempotencyKey: params.idempotencyKey,
    estimatedCost: params.estimatedCost?.toString(),
    status: "submitted",
  });

  return (result as any).insertId ?? 0;
}

export async function updateProviderLog(
  logId: number,
  update: {
    status: "completed" | "failed" | "cancelled";
    providerJobId?: string;
    actualCost?: number;
    errorCode?: string;
    errorMessage?: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  await db
    .update(wizadoraProviderLogs)
    .set({
      status: update.status,
      providerJobId: update.providerJobId,
      actualCost: update.actualCost?.toString(),
      errorCode: update.errorCode,
      errorMessage: update.errorMessage,
      completedAt: update.status === "completed" ? now : undefined,
      failedAt: update.status === "failed" ? now : undefined,
    })
    .where(eq(wizadoraProviderLogs.id, logId));
}

// ─── WEBHOOK HELPERS ─────────────────────────────────────────────────────────
const WEBHOOK_SECRET =
  process.env.WIZADORA_WEBHOOK_SECRET ?? crypto.randomBytes(32).toString("hex");

/**
 * Generate HMAC-SHA256 webhook signature.
 * Header: X-WizAdora-Signature: t=<timestamp>,v1=<hmac>
 */
export function generateWebhookSignature(payload: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${payload}`;
  const hmac = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v1=${hmac}`;
}

/**
 * Verify an incoming webhook signature (replay protection: 5-minute window).
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  tolerance: number = 300
): boolean {
  const parts = Object.fromEntries(signature.split(",").map((p) => p.split("=")));
  const timestamp = parseInt(parts["t"] ?? "0", 10);
  const receivedHmac = parts["v1"];

  if (!timestamp || !receivedHmac) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expectedHmac = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(signedPayload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedHmac, "hex"),
      Buffer.from(expectedHmac, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Log a webhook delivery attempt.
 */
export async function logWebhookDelivery(params: {
  jobId: string;
  eventType: string;
  endpointUrl?: string;
  payloadHash: string;
  signature: string;
  status: "pending" | "delivered" | "failed" | "skipped";
  responseCode?: number;
  errorMessage?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(wizadoraWebhookLogs).values({
    jobId: params.jobId,
    eventType: params.eventType,
    endpointUrl: params.endpointUrl,
    payloadHash: params.payloadHash,
    signature: params.signature,
    deliveryStatus: params.status,
    attemptCount: 1,
    lastAttemptAt: new Date(),
    responseCode: params.responseCode,
    errorMessage: params.errorMessage,
    deliveredAt: params.status === "delivered" ? new Date() : undefined,
  });
}

// ─── POLLING GUARD ───────────────────────────────────────────────────────────
/**
 * POLLING SAFETY GUARD
 * Polling functions must ONLY check job status — never submit a new generation.
 * This exported constant is used in tests to prove the constraint.
 */
export const POLLING_CAN_SUBMIT = false as const;

/**
 * Poll job status from DB only. Does NOT call any provider API.
 * This is the only polling function in WizAdora.
 */
export async function pollJobStatus(jobId: string, userId: number) {
  const db = await getDb();
  if (!db) throw new WizadoraError("DB_UNAVAILABLE", "Database unavailable.", 503);

  const [job] = await db
    .select()
    .from(wizadoraJobs)
    .where(and(eq(wizadoraJobs.id, jobId), eq(wizadoraJobs.userId, userId)))
    .limit(1);

  if (!job) throw new WizadoraError("JOB_NOT_FOUND", "Job not found.", 404);
  return job;
}
