/**
 * Provider Health Admin Router
 * Exposes provider reliability stats, spend tracking, and management controls.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { providerHealth, providerSpendEvents, musicVideoJobs } from "../../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { getProviderHealthSummary, getRecentSpendEvents } from "../provider-health";
import { getQueueHealth } from "../queue-health";
import { getAllCircuitBreakerStatuses, resetCircuitBreaker } from "../circuit-breaker";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const providerHealthRouter = router({
  // Get full provider reliability dashboard data
  getSummary: adminProcedure.query(async () => {
    return getProviderHealthSummary();
  }),

  // Get recent spend events (last 100)
  getSpendEvents: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).default(100) }))
    .query(async ({ input }) => {
      return getRecentSpendEvents(input.limit);
    }),

  // Get per-job cost analytics
  getJobCostAnalytics: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const jobs = await db.select({
        id: musicVideoJobs.id,
        title: musicVideoJobs.title,
        status: musicVideoJobs.status,
        totalScenes: musicVideoJobs.totalScenes,
        completedScenes: musicVideoJobs.completedScenes,
        providerSpendUsd: musicVideoJobs.providerSpendUsd,
        wastedSpendUsd: musicVideoJobs.wastedSpendUsd,
        creditCost: musicVideoJobs.creditCost,
        createdAt: musicVideoJobs.createdAt,
        finalVideoUrl: musicVideoJobs.finalVideoUrl,
      })
        .from(musicVideoJobs)
        .orderBy(desc(musicVideoJobs.createdAt))
        .limit(input.limit);

      return jobs.map((j) => {
        const spend = parseFloat((j.providerSpendUsd ?? "0") as string);
        const wasted = parseFloat((j.wastedSpendUsd ?? "0") as string);
        const hasOutput = !!j.finalVideoUrl;
        return {
          ...j,
          providerSpendUsd: spend.toFixed(2),
          wastedSpendUsd: wasted.toFixed(2),
          hasOutput,
          costPerVideo: hasOutput ? spend.toFixed(2) : null,
          wastedPct: spend > 0 ? Math.round((wasted / spend) * 100) : 0,
        };
      });
    }),

  // Get aggregate spend stats
  getSpendStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [stats] = await db.select({
      totalSpend: sql<string>`SUM(CAST(provider_spend_usd AS DECIMAL(10,4)))`,
      totalWasted: sql<string>`SUM(CAST(wasted_spend_usd AS DECIMAL(10,4)))`,
      completedJobs: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
      failedJobs: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
      totalJobs: sql<number>`COUNT(*)`,
    }).from(musicVideoJobs);

    const totalSpend = parseFloat(stats?.totalSpend ?? "0");
    const totalWasted = parseFloat(stats?.totalWasted ?? "0");
    const completedJobs = Number(stats?.completedJobs ?? 0);
    const failedJobs = Number(stats?.failedJobs ?? 0);
    const totalJobs = Number(stats?.totalJobs ?? 0);

    return {
      totalSpendUsd: totalSpend.toFixed(2),
      totalWastedUsd: totalWasted.toFixed(2),
      effectiveSpendUsd: (totalSpend - totalWasted).toFixed(2),
      completedJobs,
      failedJobs,
      totalJobs,
      successRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
      avgCostPerCompletedVideo: completedJobs > 0 ? (totalSpend / completedJobs).toFixed(2) : "0",
      wastedPct: totalSpend > 0 ? Math.round((totalWasted / totalSpend) * 100) : 0,
    };
  }),

  // Update provider mode (full / probe-only / disabled)
  setProviderMode: adminProcedure
    .input(z.object({
      provider: z.string(),
      mode: z.enum(["full", "probe-only", "disabled"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(providerHealth)
        .set({ mode: input.mode, updatedAt: new Date() })
        .where(eq(providerHealth.provider, input.provider));
      return { success: true };
    }),

  // Reset provider health (clear failure counts, mark healthy)
  resetProviderHealth: adminProcedure
    .input(z.object({ provider: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(providerHealth)
        .set({ isHealthy: true, consecutiveFailures: 0, updatedAt: new Date() })
        .where(eq(providerHealth.provider, input.provider));
      return { success: true };
    }),

  // Get jobs currently stalled in provider_unavailable state
  getProviderUnavailableJobs: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { users } = await import("../../drizzle/schema");
    const stalledJobs = await db
      .select({
        id: musicVideoJobs.id,
        title: musicVideoJobs.title,
        userId: musicVideoJobs.userId,
        createdAt: musicVideoJobs.createdAt,
        updatedAt: musicVideoJobs.updatedAt,
        totalScenes: musicVideoJobs.totalScenes,
        completedScenes: musicVideoJobs.completedScenes,
        userName: users.name,
        userEmail: users.email,
      })
      .from(musicVideoJobs)
      .leftJoin(users, eq(users.id, musicVideoJobs.userId))
      .where(eq(musicVideoJobs.status, 'provider_unavailable' as any))
      .orderBy(desc(musicVideoJobs.updatedAt))
      .limit(50);
    return stalledJobs;
  }),

  // Resume a provider_unavailable job by resetting it to rendering
  resumeProviderUnavailableJob: adminProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(musicVideoJobs)
        .set({ status: 'rendering' as any, updatedAt: new Date() })
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.status, 'provider_unavailable' as any)));
      return { success: true };
    }),

  // ── WizAdora Phase 1: Queue Health Monitor ─────────────────────────────────
  // Returns full queue health snapshot including circuit breaker states,
  // provider spirals, stale scenes, and overall health assessment.
  getQueueHealth: adminProcedure.query(async () => {
    return getQueueHealth();
  }),

  // Get circuit breaker statuses for all providers
  getCircuitBreakers: adminProcedure.query(() => {
    return getAllCircuitBreakerStatuses();
  }),

  // Manually reset a circuit breaker (admin override)
  resetCircuitBreaker: adminProcedure
    .input(z.object({ provider: z.string() }))
    .mutation(({ input }) => {
      resetCircuitBreaker(input.provider);
      return { success: true, provider: input.provider };
    }),
});
