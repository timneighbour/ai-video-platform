/**
 * WizAdora™ Admin tRPC Router
 * ─────────────────────────────
 * Admin-only monitoring procedures for the WizAdora internal API.
 * Accessible only to users with role='admin'.
 * NOT linked from any public page.
 *
 * Procedures:
 *   wizadora.admin.jobs.list         — Paginated job list with filters
 *   wizadora.admin.jobs.get          — Single job detail + provider logs
 *   wizadora.admin.providerLogs.list — Provider submission log
 *   wizadora.admin.spendCaps.list    — All user spend caps
 *   wizadora.admin.spendCaps.update  — Update a user's spend caps
 *   wizadora.admin.webhookLogs.list  — Webhook delivery log
 *   wizadora.admin.apiKeys.list      — List all API keys
 *   wizadora.admin.apiKeys.create    — Create a new API key
 *   wizadora.admin.apiKeys.revoke    — Revoke an API key
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  wizadoraJobs,
  wizadoraProviderLogs,
  wizadoraSpendCaps,
  wizadoraWebhookLogs,
  wizadoraApiKeys,
} from "../../drizzle/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";
import { generateApiKey, hashApiKey } from "../wizadora/core";

// ─── Admin guard middleware ───────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
  }
  return next({ ctx });
});

// ─── ROUTER ───────────────────────────────────────────────────────────────────
export const wizadoraAdminRouter = router({
  // ── Jobs ──────────────────────────────────────────────────────────────────
  jobs: router({
    list: adminProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(25),
          offset: z.number().min(0).default(0),
          status: z
            .enum(["queued", "processing", "completed", "failed", "cancelled"])
            .optional(),
          userId: z.number().optional(),
          search: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });

        const conditions = [];
        if (input.status) conditions.push(eq(wizadoraJobs.status, input.status));
        if (input.userId) conditions.push(eq(wizadoraJobs.userId, input.userId));
        if (input.search) conditions.push(like(wizadoraJobs.prompt, `%${input.search}%`));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const jobs = await db
          .select()
          .from(wizadoraJobs)
          .where(whereClause)
          .orderBy(desc(wizadoraJobs.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        const [countResult] = await db.execute(
          sql`SELECT COUNT(*) as total FROM wizadora_jobs ${
            conditions.length > 0 ? sql`WHERE ${and(...conditions)}` : sql``
          }`
        ) as any;

        const countRow = Array.isArray(countResult) ? countResult[0] : countResult;

        return {
          jobs,
          total: Number(countRow?.total ?? 0),
          limit: input.limit,
          offset: input.offset,
        };
      }),

    get: adminProcedure
      .input(z.object({ jobId: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });

        const [job] = await db
          .select()
          .from(wizadoraJobs)
          .where(eq(wizadoraJobs.id, input.jobId))
          .limit(1);

        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });

        const providerLogs = await db
          .select()
          .from(wizadoraProviderLogs)
          .where(eq(wizadoraProviderLogs.jobId, input.jobId))
          .orderBy(desc(wizadoraProviderLogs.submittedAt));

        const webhookLogs = await db
          .select()
          .from(wizadoraWebhookLogs)
          .where(eq(wizadoraWebhookLogs.jobId, input.jobId))
          .orderBy(desc(wizadoraWebhookLogs.createdAt));

        return { job, providerLogs, webhookLogs };
      }),

    stats: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });

      const [stats] = await db.execute(
        sql`SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(credits_reserved) as totalCreditsReserved,
          SUM(credits_charged) as totalCreditsCharged,
          SUM(CAST(actual_cost AS DECIMAL(10,4))) as totalActualCostGbp
        FROM wizadora_jobs`
      ) as any;

      const row = Array.isArray(stats) ? stats[0] : stats;
      return {
        total: Number(row?.total ?? 0),
        queued: Number(row?.queued ?? 0),
        processing: Number(row?.processing ?? 0),
        completed: Number(row?.completed ?? 0),
        failed: Number(row?.failed ?? 0),
        cancelled: Number(row?.cancelled ?? 0),
        totalCreditsReserved: Number(row?.totalCreditsReserved ?? 0),
        totalCreditsCharged: Number(row?.totalCreditsCharged ?? 0),
        totalActualCostGbp: Number(row?.totalActualCostGbp ?? 0),
      };
    }),
  }),

  // ── Provider Logs ─────────────────────────────────────────────────────────
  providerLogs: router({
    list: adminProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(25),
          offset: z.number().min(0).default(0),
          status: z
            .enum(["submitted", "completed", "failed", "cancelled"])
            .optional(),
          provider: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });

        const conditions = [];
        if (input.status) conditions.push(eq(wizadoraProviderLogs.status, input.status));
        if (input.provider) conditions.push(eq(wizadoraProviderLogs.provider, input.provider));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const logs = await db
          .select()
          .from(wizadoraProviderLogs)
          .where(whereClause)
          .orderBy(desc(wizadoraProviderLogs.submittedAt))
          .limit(input.limit)
          .offset(input.offset);

        return { logs, limit: input.limit, offset: input.offset };
      }),
  }),

  // ── Spend Caps ────────────────────────────────────────────────────────────
  spendCaps: router({
    list: adminProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(25),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });

        const caps = await db
          .select()
          .from(wizadoraSpendCaps)
          .orderBy(desc(wizadoraSpendCaps.updatedAt))
          .limit(input.limit)
          .offset(input.offset);

        return { caps, limit: input.limit, offset: input.offset };
      }),

    update: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          perJobCapGbp: z.number().min(0).max(100).optional(),
          dailyCapGbp: z.number().min(0).max(1000).optional(),
          monthlyCapGbp: z.number().min(0).max(10000).optional(),
          accountCapGbp: z.number().min(0).max(100000).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });

        const updates: Record<string, string> = {};
        if (input.perJobCapGbp !== undefined) updates.perJobCapGbp = input.perJobCapGbp.toString();
        if (input.dailyCapGbp !== undefined) updates.dailyCapGbp = input.dailyCapGbp.toString();
        if (input.monthlyCapGbp !== undefined) updates.monthlyCapGbp = input.monthlyCapGbp.toString();
        if (input.accountCapGbp !== undefined) updates.accountCapGbp = input.accountCapGbp.toString();

        if (Object.keys(updates).length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No updates provided." });
        }

        await db
          .update(wizadoraSpendCaps)
          .set(updates)
          .where(eq(wizadoraSpendCaps.userId, input.userId));

        return { success: true };
      }),

    resetDaily: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });

        await db
          .update(wizadoraSpendCaps)
          .set({ dailySpentGbp: "0.00", dailyResetAt: new Date() })
          .where(eq(wizadoraSpendCaps.userId, input.userId));

        return { success: true };
      }),
  }),

  // ── Webhook Logs ──────────────────────────────────────────────────────────
  webhookLogs: router({
    list: adminProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(25),
          offset: z.number().min(0).default(0),
          status: z
            .enum(["pending", "delivered", "failed", "skipped"])
            .optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });

        const conditions = [];
        if (input.status) conditions.push(eq(wizadoraWebhookLogs.deliveryStatus, input.status));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const logs = await db
          .select()
          .from(wizadoraWebhookLogs)
          .where(whereClause)
          .orderBy(desc(wizadoraWebhookLogs.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return { logs, limit: input.limit, offset: input.offset };
      }),
  }),

  // ── API Keys ──────────────────────────────────────────────────────────────
  apiKeys: router({
    list: adminProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });

      const keys = await db
        .select({
          id: wizadoraApiKeys.id,
          keyPrefix: wizadoraApiKeys.keyPrefix,
          label: wizadoraApiKeys.label,
          ownerId: wizadoraApiKeys.ownerId,
          isActive: wizadoraApiKeys.isActive,
          isAdmin: wizadoraApiKeys.isAdmin,
          lastUsedAt: wizadoraApiKeys.lastUsedAt,
          expiresAt: wizadoraApiKeys.expiresAt,
          createdAt: wizadoraApiKeys.createdAt,
          revokedAt: wizadoraApiKeys.revokedAt,
        })
        .from(wizadoraApiKeys)
        .orderBy(desc(wizadoraApiKeys.createdAt));

      return { keys };
    }),

    create: adminProcedure
      .input(
        z.object({
          label: z.string().min(1).max(100),
          isAdmin: z.boolean().default(false),
          expiresInDays: z.number().min(1).max(365).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });

        const { raw, hash, prefix } = generateApiKey();
        const expiresAt = input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
          : null;

        await db.insert(wizadoraApiKeys).values({
          keyHash: hash,
          keyPrefix: prefix,
          label: input.label,
          ownerId: ctx.user.id,
          isActive: true,
          isAdmin: input.isAdmin,
          expiresAt: expiresAt ?? undefined,
        });

        // Return the raw key ONCE — it cannot be retrieved again
        return {
          rawKey: raw,
          prefix,
          label: input.label,
          isAdmin: input.isAdmin,
          expiresAt,
          warning: "Store this key securely. It will not be shown again.",
        };
      }),

    revoke: adminProcedure
      .input(z.object({ keyId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });

        await db
          .update(wizadoraApiKeys)
          .set({ isActive: false, revokedAt: new Date() })
          .where(eq(wizadoraApiKeys.id, input.keyId));

        return { success: true };
      }),
  }),
});
