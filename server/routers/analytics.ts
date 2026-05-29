/**
 * Analytics Router — ingestion + aggregated query procedures
 *
 * Public procedures (no auth required):
 *   analytics.trackPageView   — record a page view
 *   analytics.trackEvent      — record a custom event
 *   analytics.upsertSession   — create or update a visitor session
 *
 * Admin-only procedures:
 *   analytics.getOverview     — KPI summary (visitors, sessions, pageviews, bounce rate)
 *   analytics.getPageStats    — per-page breakdown
 *   analytics.getTopEvents    — top events by count
 *   analytics.getDeviceBreakdown — device / browser / OS breakdown
 *   analytics.getTrafficSources  — referrer / UTM breakdown
 *   analytics.getTimeSeriesVisitors — daily visitor counts for chart
 *   analytics.getConversionFunnel — funnel: visit → signup → render → purchase
 *   analytics.getRecentSessions   — live feed of recent sessions
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  analyticsSessions,
  analyticsPageViews,
  analyticsEvents,
  users,
  subscriptions,
  renderJobs,
  musicVideoJobs,
  musicVideoScenes,
  providerHealth,
  providerSpendEvents,
} from "../../drizzle/schema";
import { eq, desc, sql, and, gte, lte, count, avg } from "drizzle-orm";

// ── helpers ──────────────────────────────────────────────────────────────────

function adminOnly(ctx: { user: { role: string } | null }) {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── router ───────────────────────────────────────────────────────────────────

export const analyticsRouter = router({
  /* ── Ingestion ─────────────────────────────────────────────────────── */

  upsertSession: publicProcedure
    .input(z.object({
      sessionId: z.string().max(36),
      visitorId: z.string().max(64),
      userId: z.number().optional(),
      entryPage: z.string().max(512).optional(),
      referrer: z.string().max(1024).optional(),
      utmSource: z.string().max(255).optional(),
      utmMedium: z.string().max(255).optional(),
      utmCampaign: z.string().max(255).optional(),
      device: z.enum(["desktop", "mobile", "tablet"]).optional(),
      browser: z.string().max(64).optional(),
      os: z.string().max(64).optional(),
      screenWidth: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: false };
      try {
        await db.insert(analyticsSessions).values({
          id: input.sessionId,
          visitorId: input.visitorId,
          userId: input.userId ?? null,
          entryPage: input.entryPage ?? null,
          referrer: input.referrer ?? null,
          utmSource: input.utmSource ?? null,
          utmMedium: input.utmMedium ?? null,
          utmCampaign: input.utmCampaign ?? null,
          device: input.device ?? null,
          browser: input.browser ?? null,
          os: input.os ?? null,
          screenWidth: input.screenWidth ?? null,
          startedAt: new Date(),
          lastSeenAt: new Date(),
        }).onDuplicateKeyUpdate({
          set: {
            lastSeenAt: new Date(),
            userId: input.userId ?? null,
          },
        });
      } catch {}
      return { ok: true };
    }),

  trackPageView: publicProcedure
    .input(z.object({
      sessionId: z.string().max(36),
      visitorId: z.string().max(64),
      userId: z.number().optional(),
      path: z.string().max(512),
      title: z.string().max(512).optional(),
      referrer: z.string().max(1024).optional(),
      timeOnPage: z.number().optional(),
      scrollDepth: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: false };
      try {
        await db.insert(analyticsPageViews).values({
          sessionId: input.sessionId,
          visitorId: input.visitorId,
          userId: input.userId ?? null,
          path: input.path,
          title: input.title ?? null,
          referrer: input.referrer ?? null,
          timeOnPage: input.timeOnPage ?? 0,
          scrollDepth: input.scrollDepth ?? 0,
          createdAt: new Date(),
        });
        // Update session page count + last seen
        await db.update(analyticsSessions)
          .set({
            lastSeenAt: new Date(),
            pageCount: sql`pageCount + 1`,
            exitPage: input.path,
            bounced: false,
          })
          .where(eq(analyticsSessions.id, input.sessionId));
      } catch {}
      return { ok: true };
    }),

  trackEvent: publicProcedure
    .input(z.object({
      sessionId: z.string().max(36),
      visitorId: z.string().max(64),
      userId: z.number().optional(),
      event: z.string().max(128),
      category: z.string().max(64).optional(),
      label: z.string().max(255).optional(),
      value: z.string().max(255).optional(),
      path: z.string().max(512).optional(),
      meta: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: false };
      try {
        await db.insert(analyticsEvents).values({
          sessionId: input.sessionId,
          visitorId: input.visitorId,
          userId: input.userId ?? null,
          event: input.event,
          category: input.category ?? null,
          label: input.label ?? null,
          value: input.value ?? null,
          path: input.path ?? null,
          meta: input.meta ?? null,
          createdAt: new Date(),
        });
        // Mark session as converted if it's a purchase/render event
        if (["render_started", "purchase_completed", "subscription_started"].includes(input.event)) {
          await db.update(analyticsSessions)
            .set({ converted: true })
            .where(eq(analyticsSessions.id, input.sessionId));
        }
      } catch {}
      return { ok: true };
    }),

  /* ── Admin Queries ─────────────────────────────────────────────────── */

  getOverview: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      adminOnly(ctx);
      const db = await getDb();
      if (!db) return null;
      const since = daysAgo(input.days);
      const prevSince = daysAgo(input.days * 2);

      const [sessions, prevSessions] = await Promise.all([
        db.select({ count: count() }).from(analyticsSessions)
          .where(gte(analyticsSessions.startedAt, since)),
        db.select({ count: count() }).from(analyticsSessions)
          .where(and(gte(analyticsSessions.startedAt, prevSince), lte(analyticsSessions.startedAt, since))),
      ]);

      const [pageViews, prevPageViews] = await Promise.all([
        db.select({ count: count() }).from(analyticsPageViews)
          .where(gte(analyticsPageViews.createdAt, since)),
        db.select({ count: count() }).from(analyticsPageViews)
          .where(and(gte(analyticsPageViews.createdAt, prevSince), lte(analyticsPageViews.createdAt, since))),
      ]);

      // Unique visitors (distinct visitorId)
      const [visitors, prevVisitors] = await Promise.all([
        db.select({ count: sql<number>`COUNT(DISTINCT visitorId)` }).from(analyticsSessions)
          .where(gte(analyticsSessions.startedAt, since)),
        db.select({ count: sql<number>`COUNT(DISTINCT visitorId)` }).from(analyticsSessions)
          .where(and(gte(analyticsSessions.startedAt, prevSince), lte(analyticsSessions.startedAt, since))),
      ]);

      // Bounce rate
      const [bounced, total] = await Promise.all([
        db.select({ count: count() }).from(analyticsSessions)
          .where(and(gte(analyticsSessions.startedAt, since), eq(analyticsSessions.bounced, true))),
        db.select({ count: count() }).from(analyticsSessions)
          .where(gte(analyticsSessions.startedAt, since)),
      ]);

      // Conversion rate
      const [converted] = await db.select({ count: count() }).from(analyticsSessions)
        .where(and(gte(analyticsSessions.startedAt, since), eq(analyticsSessions.converted, true)));

      // Avg session duration
      const [avgDur] = await db.select({ avg: avg(analyticsSessions.duration) }).from(analyticsSessions)
        .where(gte(analyticsSessions.startedAt, since));

      // New users in period
      const [newUsers] = await db.select({ count: count() }).from(users)
        .where(gte(users.createdAt, since));

      const totalSessions = sessions[0]?.count ?? 0;
      const totalVisitors = Number(visitors[0]?.count ?? 0);
      const totalPageViews = pageViews[0]?.count ?? 0;
      const bouncedCount = bounced[0]?.count ?? 0;
      const convertedCount = converted?.count ?? 0;

      const pctChange = (curr: number, prev: number) =>
        prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

      return {
        visitors: { value: totalVisitors, change: pctChange(totalVisitors, Number(prevVisitors[0]?.count ?? 0)) },
        sessions: { value: totalSessions, change: pctChange(totalSessions, prevSessions[0]?.count ?? 0) },
        pageViews: { value: totalPageViews, change: pctChange(totalPageViews, prevPageViews[0]?.count ?? 0) },
        bounceRate: { value: totalSessions > 0 ? Math.round((bouncedCount / totalSessions) * 100) : 0 },
        conversionRate: { value: totalSessions > 0 ? Math.round((convertedCount / totalSessions) * 100) : 0 },
        avgSessionDuration: { value: Math.round(Number(avgDur?.avg ?? 0)) },
        newUsers: { value: newUsers?.count ?? 0 },
      };
    }),

  getTimeSeriesVisitors: protectedProcedure
    .input(z.object({ days: z.number().min(7).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      adminOnly(ctx);
      const db = await getDb();
      if (!db) return [];
      const since = daysAgo(input.days);
      const rows = await db.select({
        date: sql<string>`DATE(startedAt)`,
        visitors: sql<number>`COUNT(DISTINCT visitorId)`,
        sessions: sql<number>`COUNT(*)`,
        pageViews: sql<number>`SUM(pageCount)`,
      })
        .from(analyticsSessions)
        .where(gte(analyticsSessions.startedAt, since))
        .groupBy(sql`DATE(startedAt)`)
        .orderBy(sql`DATE(startedAt)`);
      return rows;
    }),

  getPageStats: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30), limit: z.number().max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      adminOnly(ctx);
      const db = await getDb();
      if (!db) return [];
      const since = daysAgo(input.days);
      const rows = await db.select({
        path: analyticsPageViews.path,
        views: sql<number>`COUNT(*)`,
        uniqueVisitors: sql<number>`COUNT(DISTINCT visitorId)`,
        avgTimeOnPage: sql<number>`AVG(timeOnPage)`,
        avgScrollDepth: sql<number>`AVG(scrollDepth)`,
      })
        .from(analyticsPageViews)
        .where(gte(analyticsPageViews.createdAt, since))
        .groupBy(analyticsPageViews.path)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(input.limit);
      return rows;
    }),

  getTopEvents: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30), limit: z.number().max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      adminOnly(ctx);
      const db = await getDb();
      if (!db) return [];
      const since = daysAgo(input.days);
      const rows = await db.select({
        event: analyticsEvents.event,
        category: analyticsEvents.category,
        count: sql<number>`COUNT(*)`,
        uniqueUsers: sql<number>`COUNT(DISTINCT visitorId)`,
      })
        .from(analyticsEvents)
        .where(gte(analyticsEvents.createdAt, since))
        .groupBy(analyticsEvents.event, analyticsEvents.category)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(input.limit);
      return rows;
    }),

  getDeviceBreakdown: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      adminOnly(ctx);
      const db = await getDb();
      if (!db) return { devices: [], browsers: [], os: [] };
      const since = daysAgo(input.days);
      const [devices, browsers, os] = await Promise.all([
        db.select({ device: analyticsSessions.device, count: sql<number>`COUNT(*)` })
          .from(analyticsSessions).where(gte(analyticsSessions.startedAt, since))
          .groupBy(analyticsSessions.device).orderBy(desc(sql`COUNT(*)`)),
        db.select({ browser: analyticsSessions.browser, count: sql<number>`COUNT(*)` })
          .from(analyticsSessions).where(gte(analyticsSessions.startedAt, since))
          .groupBy(analyticsSessions.browser).orderBy(desc(sql`COUNT(*)`)).limit(8),
        db.select({ os: analyticsSessions.os, count: sql<number>`COUNT(*)` })
          .from(analyticsSessions).where(gte(analyticsSessions.startedAt, since))
          .groupBy(analyticsSessions.os).orderBy(desc(sql`COUNT(*)`)).limit(8),
      ]);
      return { devices, browsers, os };
    }),

  getTrafficSources: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      adminOnly(ctx);
      const db = await getDb();
      if (!db) return [];
      const since = daysAgo(input.days);
      const rows = await db.select({
        source: sql<string>`COALESCE(utmSource, CASE WHEN referrer IS NULL OR referrer = '' THEN 'direct' WHEN referrer LIKE '%google%' THEN 'google' WHEN referrer LIKE '%facebook%' THEN 'facebook' WHEN referrer LIKE '%twitter%' OR referrer LIKE '%t.co%' THEN 'twitter' WHEN referrer LIKE '%instagram%' THEN 'instagram' WHEN referrer LIKE '%youtube%' THEN 'youtube' ELSE 'referral' END)`,
        sessions: sql<number>`COUNT(*)`,
        visitors: sql<number>`COUNT(DISTINCT visitorId)`,
        conversions: sql<number>`SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END)`,
      })
        .from(analyticsSessions)
        .where(gte(analyticsSessions.startedAt, since))
        .groupBy(sql`COALESCE(utmSource, CASE WHEN referrer IS NULL OR referrer = '' THEN 'direct' WHEN referrer LIKE '%google%' THEN 'google' WHEN referrer LIKE '%facebook%' THEN 'facebook' WHEN referrer LIKE '%twitter%' OR referrer LIKE '%t.co%' THEN 'twitter' WHEN referrer LIKE '%instagram%' THEN 'instagram' WHEN referrer LIKE '%youtube%' THEN 'youtube' ELSE 'referral' END)`)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10);
      return rows;
    }),

  getConversionFunnel: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      adminOnly(ctx);
      const db = await getDb();
      if (!db) return [];
      const since = daysAgo(input.days);
      const [totalVisitors, signups, renders, purchases] = await Promise.all([
        db.select({ count: sql<number>`COUNT(DISTINCT visitorId)` }).from(analyticsSessions)
          .where(gte(analyticsSessions.startedAt, since)),
        db.select({ count: count() }).from(users)
          .where(gte(users.createdAt, since)),
        db.select({ count: count() }).from(renderJobs)
          .where(gte(renderJobs.createdAt, since)),
        db.select({ count: count() }).from(subscriptions)
          .where(gte(subscriptions.createdAt, since)),
      ]);
      const v = Number(totalVisitors[0]?.count ?? 0);
      const s = signups[0]?.count ?? 0;
      const r = renders[0]?.count ?? 0;
      const p = purchases[0]?.count ?? 0;
      return [
        { stage: "Visitors", count: v, pct: 100 },
        { stage: "Sign-ups", count: s, pct: v > 0 ? Math.round((s / v) * 100) : 0 },
        { stage: "Renders", count: r, pct: v > 0 ? Math.round((r / v) * 100) : 0 },
        { stage: "Purchases", count: p, pct: v > 0 ? Math.round((p / v) * 100) : 0 },
      ];
    }),

  getRecentSessions: protectedProcedure
    .input(z.object({ limit: z.number().max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      adminOnly(ctx);
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({
        id: analyticsSessions.id,
        visitorId: analyticsSessions.visitorId,
        entryPage: analyticsSessions.entryPage,
        device: analyticsSessions.device,
        browser: analyticsSessions.browser,
        country: analyticsSessions.country,
        pageCount: analyticsSessions.pageCount,
        duration: analyticsSessions.duration,
        bounced: analyticsSessions.bounced,
        converted: analyticsSessions.converted,
        startedAt: analyticsSessions.startedAt,
        lastSeenAt: analyticsSessions.lastSeenAt,
      })
        .from(analyticsSessions)
        .orderBy(desc(analyticsSessions.lastSeenAt))
        .limit(input.limit);
      return rows;
    }),

  getLaunchReadiness: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      adminOnly(ctx);
      const db = await getDb();
      if (!db) return null;
      const since = daysAgo(input.days);

      // ── Render Quality Metrics ──────────────────────────────────────────────
      const [sceneStats] = await db.select({
        totalScenes: count(musicVideoScenes.id),
        completedScenes: sql<number>`SUM(CASE WHEN ${musicVideoScenes.status} = 'completed' THEN 1 ELSE 0 END)`,
        failedScenes: sql<number>`SUM(CASE WHEN ${musicVideoScenes.status} = 'failed' THEN 1 ELSE 0 END)`,
        quarantinedScenes: sql<number>`SUM(CASE WHEN ${musicVideoScenes.retryCount} >= 5 AND ${musicVideoScenes.status} = 'failed' THEN 1 ELSE 0 END)`,
        avgRetryCount: avg(musicVideoScenes.retryCount),
        totalRetries: sql<number>`SUM(${musicVideoScenes.retryCount})`,
        lipSyncDone: sql<number>`SUM(CASE WHEN ${musicVideoScenes.lipSyncStatus} = 'done' THEN 1 ELSE 0 END)`,
        lipSyncError: sql<number>`SUM(CASE WHEN ${musicVideoScenes.lipSyncStatus} = 'error' THEN 1 ELSE 0 END)`,
        lipSyncTotal: sql<number>`SUM(CASE WHEN ${musicVideoScenes.sceneType} = 'performance' THEN 1 ELSE 0 END)`,
        hedraSuccess: sql<number>`SUM(CASE WHEN ${musicVideoScenes.hedraStatus} = 'done' THEN 1 ELSE 0 END)`,
        hedraTotal: sql<number>`SUM(CASE WHEN ${musicVideoScenes.hedraStatus} != 'pending' THEN 1 ELSE 0 END)`,
      }).from(musicVideoScenes)
        .where(gte(musicVideoScenes.createdAt, since));

      // ── Job Completion Metrics ──────────────────────────────────────────────
      const [jobStats] = await db.select({
        totalJobs: count(musicVideoJobs.id),
        completedJobs: sql<number>`SUM(CASE WHEN ${musicVideoJobs.status} = 'done' THEN 1 ELSE 0 END)`,
        failedJobs: sql<number>`SUM(CASE WHEN ${musicVideoJobs.status} = 'error' THEN 1 ELSE 0 END)`,
        renderingJobs: sql<number>`SUM(CASE WHEN ${musicVideoJobs.status} = 'rendering' THEN 1 ELSE 0 END)`,
        downloadedJobs: sql<number>`SUM(CASE WHEN ${musicVideoJobs.downloadedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
        totalProviderSpend: sql<number>`SUM(CAST(${musicVideoJobs.providerSpendUsd} AS DECIMAL(10,4)))`,
        totalWastedSpend: sql<number>`SUM(CAST(${musicVideoJobs.wastedSpendUsd} AS DECIMAL(10,4)))`,
      }).from(musicVideoJobs)
        .where(gte(musicVideoJobs.createdAt, since));

      // ── Provider Health ─────────────────────────────────────────────────────
      const providers = await db.select({
        provider: providerHealth.provider,
        successCount: providerHealth.successCount,
        failureCount: providerHealth.failureCount,
        consecutiveFailures: providerHealth.consecutiveFailures,
        totalSpendUsd: providerHealth.totalSpendUsd,
        wastedSpendUsd: providerHealth.wastedSpendUsd,
        avgRenderTimeMs: providerHealth.avgRenderTimeMs,
        isHealthy: providerHealth.isHealthy,
        mode: providerHealth.mode,
        lastSuccessAt: providerHealth.lastSuccessAt,
        lastFailureAt: providerHealth.lastFailureAt,
      }).from(providerHealth);

      // ── Conversion Funnel ───────────────────────────────────────────────────
      const [funnelStats] = await db.select({
        totalVisitors: sql<number>`COUNT(DISTINCT ${analyticsSessions.visitorId})`,
        totalSignups: sql<number>`COUNT(DISTINCT ${analyticsSessions.userId})`,
        converted: sql<number>`SUM(CASE WHEN ${analyticsSessions.converted} = 1 THEN 1 ELSE 0 END)`,
      }).from(analyticsSessions)
        .where(gte(analyticsSessions.startedAt, since));

      const [subStats] = await db.select({
        totalPaid: count(subscriptions.id),
      }).from(subscriptions)
        .where(and(
          eq(subscriptions.status, "active"),
          gte(subscriptions.createdAt, since)
        ));

      // ── Spend Events (recent 7 days for trend) ──────────────────────────────
      const recentSpend = await db.select({
        provider: providerSpendEvents.provider,
        status: providerSpendEvents.status,
        count: count(providerSpendEvents.id),
        totalCost: sql<number>`SUM(CAST(${providerSpendEvents.costUsd} AS DECIMAL(10,4)))`,
        avgRenderTimeMs: avg(providerSpendEvents.renderTimeMs),
      }).from(providerSpendEvents)
        .where(gte(providerSpendEvents.createdAt, daysAgo(7)))
        .groupBy(providerSpendEvents.provider, providerSpendEvents.status);

      // ── Compute derived metrics ─────────────────────────────────────────────
      const totalScenes = Number(sceneStats.totalScenes) || 0;
      const completedScenes = Number(sceneStats.completedScenes) || 0;
      const failedScenes = Number(sceneStats.failedScenes) || 0;
      const lipSyncDone = Number(sceneStats.lipSyncDone) || 0;
      const lipSyncTotal = Number(sceneStats.lipSyncTotal) || 0;
      const hedraSuccess = Number(sceneStats.hedraSuccess) || 0;
      const hedraTotal = Number(sceneStats.hedraTotal) || 0;
      const totalJobs = Number(jobStats.totalJobs) || 0;
      const completedJobs = Number(jobStats.completedJobs) || 0;
      const downloadedJobs = Number(jobStats.downloadedJobs) || 0;
      const totalSpend = Number(jobStats.totalProviderSpend) || 0;
      const wastedSpend = Number(jobStats.totalWastedSpend) || 0;
      const totalVisitors = Number(funnelStats.totalVisitors) || 0;
      const totalSignups = Number(funnelStats.totalSignups) || 0;
      const totalPaid = Number(subStats.totalPaid) || 0;

      const renderSuccessRate = totalScenes > 0 ? (completedScenes / totalScenes) * 100 : null;
      const lipSyncPassRate = lipSyncTotal > 0 ? (lipSyncDone / lipSyncTotal) * 100 : null;
      const hedraPassRate = hedraTotal > 0 ? (hedraSuccess / hedraTotal) * 100 : null;
      const jobCompletionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : null;
      const downloadRate = completedJobs > 0 ? (downloadedJobs / completedJobs) * 100 : null;
      const wasteRate = totalSpend > 0 ? (wastedSpend / totalSpend) * 100 : null;
      const visitorToSignup = totalVisitors > 0 ? (totalSignups / totalVisitors) * 100 : null;
      const signupToPaid = totalSignups > 0 ? (totalPaid / totalSignups) * 100 : null;
      const visitorToPaid = totalVisitors > 0 ? (totalPaid / totalVisitors) * 100 : null;

      // ── Launch Readiness Score (0–100) ──────────────────────────────────────
      // Weighted composite: render quality (40%) + conversion (35%) + cost efficiency (25%)
      const renderScore = renderSuccessRate !== null ? Math.min(renderSuccessRate, 100) : 50;
      const lipScore = lipSyncPassRate !== null ? Math.min(lipSyncPassRate, 100) : 50;
      const qualityScore = (renderScore * 0.6 + lipScore * 0.4);
      const conversionScore = visitorToPaid !== null ? Math.min(visitorToPaid * 50, 100) : 0; // 2% v2p = 100
      const efficiencyScore = wasteRate !== null ? Math.max(0, 100 - wasteRate) : 75;
      const launchReadinessScore = Math.round(
        qualityScore * 0.40 + conversionScore * 0.35 + efficiencyScore * 0.25
      );

      return {
        period: { days: input.days, since },
        quality: {
          renderSuccessRate,
          lipSyncPassRate,
          hedraPassRate,
          jobCompletionRate,
          downloadRate,
          avgRetryCount: Number(sceneStats.avgRetryCount) || 0,
          quarantinedScenes: Number(sceneStats.quarantinedScenes) || 0,
          totalScenes,
          completedScenes,
          failedScenes,
          totalJobs,
          completedJobs,
          downloadedJobs,
        },
        spend: {
          totalSpendUsd: totalSpend,
          wastedSpendUsd: wastedSpend,
          wasteRate,
          avgCostPerJob: totalJobs > 0 ? totalSpend / totalJobs : 0,
          avgCostPerScene: totalScenes > 0 ? totalSpend / totalScenes : 0,
        },
        conversion: {
          totalVisitors,
          totalSignups,
          totalPaid,
          visitorToSignup,
          signupToPaid,
          visitorToPaid,
        },
        providers,
        recentSpend,
        launchReadinessScore,
        scoreBreakdown: {
          qualityScore: Math.round(qualityScore),
          conversionScore: Math.round(conversionScore),
          efficiencyScore: Math.round(efficiencyScore),
        },
      };
    }),
});
