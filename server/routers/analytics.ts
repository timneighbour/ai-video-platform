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
});
