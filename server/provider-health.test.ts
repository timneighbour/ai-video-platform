/**
 * provider-health.test.ts
 *
 * Verifies the Render Cost Protection Sprint:
 *  1. getBestProvider dispatches to atlas-cloud (full mode) for any job size
 *  2. getBestProvider dispatches to atlas-cloud (full mode) for small jobs too
 *  3. getBestProvider blocks when all providers are unhealthy
 *  4. checkJobSpendLimit returns exceeded=true when spend >= limit
 *  5. recordProviderOutcome increments success/failure counts in the DB
 *  6. recordProviderOutcome marks provider unhealthy after 5 consecutive failures
 *
 * Note: probe-only mode was removed. Atlas Cloud now always dispatches when healthy.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { providerHealth, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  getBestProvider,
  checkJobSpendLimit,
  recordProviderOutcome,
} from "./provider-health";

// ── helpers ──────────────────────────────────────────────────────────────────

async function resetProviderHealth(provider: string, overrides: Partial<typeof providerHealth.$inferInsert> = {}) {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  await db.delete(providerHealth).where(eq(providerHealth.provider, provider));
  await db.insert(providerHealth).values({
    provider,
    successCount: 0,
    failureCount: 0,
    consecutiveFailures: 0,
    totalSpendUsd: "0",
    wastedSpendUsd: "0",
    avgRenderTimeMs: 0,
    isHealthy: true,
    mode: "full",
    ...overrides,
  });
}

async function seedTestJob(overrides: Partial<typeof musicVideoJobs.$inferInsert> = {}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  const [result] = await db.insert(musicVideoJobs).values({
    userId: 1,
    title: "Test Job",
    audioUrl: "https://example.com/test-audio.mp3",
    audioKey: "test/audio.mp3",
    audioDuration: 180,
    themePrompt: "Test theme prompt for provider health test",
    status: "rendering",
    creditCost: 10,
    providerSpendUsd: "0.00",
    maxSpendLimitUsd: "5.00",
    wastedSpendUsd: "0.00",
    completedSceneCount: 0,
    failedSceneCount: 0,
    ...overrides,
  } as any);
  return (result as any).insertId as number;
}

async function cleanupTestJob(jobId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(musicVideoJobs).where(eq(musicVideoJobs.id, jobId));
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("Provider Health — Render Cost Protection", () => {

  beforeAll(async () => {
    // Seed clean provider health rows for the test providers
    await resetProviderHealth("atlas-cloud", { mode: "full", isHealthy: true });
    await resetProviderHealth("wavespeed", { mode: "full", isHealthy: true });
    await resetProviderHealth("kling",     { mode: "full", isHealthy: true });
  });

  // ── 1. Routing: atlas-cloud full mode → dispatches for large jobs ──
  it("dispatches to atlas-cloud (full mode) for large jobs with >3 scenes", async () => {
    const result = await getBestProvider("atlas-cloud", 10);
    expect(result.blocked).toBe(false);
    expect(result.provider).toBe("atlas-cloud");
  });

  // ── 2. Routing: atlas-cloud full mode → dispatches for small jobs too ──
  it("dispatches to atlas-cloud (full mode) for small jobs with ≤3 scenes", async () => {
    const result = await getBestProvider("atlas-cloud", 2);
    expect(result.blocked).toBe(false);
    expect(result.provider).toBe("atlas-cloud");
  });

  // ── 3. Routing: all unhealthy → blocked ──
  it("blocks when all providers are unhealthy", async () => {
    // Temporarily mark ALL providers unhealthy (including atlas-cloud)
    const db = await getDb();
    if (!db) throw new Error("No DB");
    await db.update(providerHealth).set({ isHealthy: false }).where(eq(providerHealth.provider, "atlas-cloud"));
    await db.update(providerHealth).set({ isHealthy: false }).where(eq(providerHealth.provider, "wavespeed"));
    await db.update(providerHealth).set({ isHealthy: false }).where(eq(providerHealth.provider, "kling"));

    const result = await getBestProvider("atlas-cloud", 10);
    expect(result.blocked).toBe(true);

    // Restore
    await db.update(providerHealth).set({ isHealthy: true }).where(eq(providerHealth.provider, "atlas-cloud"));
    await db.update(providerHealth).set({ isHealthy: true }).where(eq(providerHealth.provider, "wavespeed"));
    await db.update(providerHealth).set({ isHealthy: true }).where(eq(providerHealth.provider, "kling"));
  });

  // ── 4. Spend guard: exceeded when spend >= limit ──
  it("returns exceeded=true when job spend reaches the hard cap", async () => {
    const jobId = await seedTestJob({ providerSpendUsd: "5.00", maxSpendLimitUsd: "5.00" });
    try {
      const result = await checkJobSpendLimit(jobId);
      expect(result.exceeded).toBe(true);
      expect(result.currentSpend).toBeGreaterThanOrEqual(5);
    } finally {
      await cleanupTestJob(jobId);
    }
  });

  // ── 5. Spend guard: not exceeded when under limit ──
  it("returns exceeded=false when job spend is below the hard cap", async () => {
    const jobId = await seedTestJob({ providerSpendUsd: "1.50", maxSpendLimitUsd: "5.00" });
    try {
      const result = await checkJobSpendLimit(jobId);
      expect(result.exceeded).toBe(false);
      expect(result.currentSpend).toBeLessThan(5);
    } finally {
      await cleanupTestJob(jobId);
    }
  });

  // ── 6. Outcome recording: success increments successCount ──
  it("increments successCount on successful outcome", async () => {
    const db = await getDb();
    if (!db) throw new Error("No DB");
    await resetProviderHealth("wavespeed", { mode: "full", isHealthy: true, successCount: 0 });

    const jobId = await seedTestJob();
    try {
      await recordProviderOutcome({
        jobId,
        sceneId: 9999,
        provider: "wavespeed",
        status: "success",
        renderTimeMs: 12000,
      });

      const [row] = await db.select().from(providerHealth).where(eq(providerHealth.provider, "wavespeed"));
      expect(row.successCount).toBe(1);
      expect(row.consecutiveFailures).toBe(0);
      expect(row.isHealthy).toBe(true);
    } finally {
      await cleanupTestJob(jobId);
    }
  });

  // ── 7. Outcome recording: consecutive failures → marks unhealthy at threshold ──
  it("marks provider unhealthy after 5 consecutive failures", async () => {
    const db = await getDb();
    if (!db) throw new Error("No DB");
    // Start with 4 consecutive failures already recorded
    await resetProviderHealth("kling", {
      mode: "full",
      isHealthy: true,
      consecutiveFailures: 4,
      failureCount: 4,
    });

    const jobId = await seedTestJob();
    try {
      // 5th failure should trigger unhealthy
      await recordProviderOutcome({
        jobId,
        sceneId: 9998,
        provider: "kling",
        status: "failure",
        errorMessage: "Test failure",
      });

      const [row] = await db.select().from(providerHealth).where(eq(providerHealth.provider, "kling"));
      expect(row.consecutiveFailures).toBeGreaterThanOrEqual(5);
      expect(row.isHealthy).toBe(false);
    } finally {
      await cleanupTestJob(jobId);
      // Restore kling to healthy
      await resetProviderHealth("kling", { mode: "full", isHealthy: true });
    }
  });

  afterAll(async () => {
    // Restore all test providers to clean healthy state
    await resetProviderHealth("atlas-cloud", { mode: "full", isHealthy: true });
    await resetProviderHealth("wavespeed",   { mode: "full", isHealthy: true });
    await resetProviderHealth("kling",       { mode: "full", isHealthy: true });
  });
});
