/**
 * pipelineOps.ts — Phase 2 Operational Visibility Router
 *
 * Admin-only tRPC procedures for the operational visibility dashboard:
 *   - Validation run history (Golden Benchmark results)
 *   - Render attempt audit trail (per-job export records)
 *   - Export failure summary (recent failures with error codes)
 *   - Pipeline health summary (combined snapshot)
 */

import { z } from "zod";
import { desc, eq, and, gte, sql } from "drizzle-orm";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { validationRuns, renderAttempts, musicVideoJobs } from "../../drizzle/schema";

export const pipelineOpsRouter = router({
  /**
   * Get the last N Golden Validation runs.
   * Used by the validation history panel on the ops dashboard.
   */
  getValidationRuns: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select()
        .from(validationRuns)
        .orderBy(desc(validationRuns.runAt))
        .limit(input.limit);
    }),

  /**
   * Get render attempts for a specific job (audit trail).
   */
  getRenderAttempts: adminProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select()
        .from(renderAttempts)
        .where(eq(renderAttempts.jobId, input.jobId))
        .orderBy(desc(renderAttempts.assembledAt));
    }),

  /**
   * Get recent export failures (last 7 days).
   * Used by the export failure reporting panel.
   */
  getExportFailures: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return db.select({
        id: renderAttempts.id,
        jobId: renderAttempts.jobId,
        attemptNumber: renderAttempts.attemptNumber,
        validationStatus: renderAttempts.validationStatus,
        validationError: renderAttempts.validationError,
        validationErrorCode: renderAttempts.validationErrorCode,
        fileSizeBytes: renderAttempts.fileSizeBytes,
        durationSeconds: renderAttempts.durationSeconds,
        sha256: renderAttempts.sha256,
        attemptedAt: renderAttempts.assembledAt,
        finalVideoUrl: renderAttempts.finalVideoUrl,
      })
        .from(renderAttempts)
        .where(
          and(
            eq(renderAttempts.validationStatus, "failed"),
            gte(renderAttempts.assembledAt, sevenDaysAgo),
          )
        )
        .orderBy(desc(renderAttempts.assembledAt))
        .limit(input.limit);
    }),

  /**
   * Pipeline health summary — single snapshot for the ops dashboard header.
   * Returns counts of jobs in each status, recent validation pass rate,
   * and the last validation run result.
   */
  getPipelineHealth: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    const [jobStatusCounts, recentValidations, recentAttempts] = await Promise.all([
      // Job status breakdown (last 7 days)
      db.execute(sql`
        SELECT status, COUNT(*) as cnt
        FROM music_video_jobs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY status
      `),
      // Last 10 validation runs
      db.select()
        .from(validationRuns)
        .orderBy(desc(validationRuns.runAt))
        .limit(10),
      // Last 50 render attempts (for pass/fail rate)
      db.select({
        validationStatus: renderAttempts.validationStatus,
        attemptedAt: renderAttempts.assembledAt,
      })
        .from(renderAttempts)
        .orderBy(desc(renderAttempts.assembledAt))
        .limit(50),
    ]);

    // Compute job status map
    const statusMap: Record<string, number> = {};
    for (const row of (jobStatusCounts as any[])) {
      const r = Array.isArray(row) ? row[0] : row;
      statusMap[r.status] = Number(r.cnt);
    }

    // Compute validation pass rate
    const totalValidations = recentValidations.length;
    const passedValidations = recentValidations.filter((v) => v.status === "passed").length;
    const validationPassRate = totalValidations > 0
      ? Math.round((passedValidations / totalValidations) * 100)
      : null;

    // Compute export validation pass rate
    const totalAttempts = recentAttempts.length;
    const passedAttempts = recentAttempts.filter((a) => a.validationStatus === "passed").length;
    const exportPassRate = totalAttempts > 0
      ? Math.round((passedAttempts / totalAttempts) * 100)
      : null;

    const lastValidation = recentValidations[0] ?? null;

    return {
      jobStatusCounts: statusMap,
      validationPassRate,
      exportPassRate,
      lastValidation,
      totalValidationRuns: totalValidations,
      totalRenderAttempts: totalAttempts,
    };
  }),

  /**
   * Get all render attempts across all jobs (paginated, for the audit table).
   */
  getAllRenderAttempts: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      statusFilter: z.enum(["all", "passed", "failed", "skipped"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { attempts: [], total: 0 };

      const whereClause = input.statusFilter === "all"
        ? undefined
        : eq(renderAttempts.validationStatus, input.statusFilter);

      const [attempts, countResult] = await Promise.all([
        db.select()
          .from(renderAttempts)
          .where(whereClause)
        .orderBy(desc(renderAttempts.assembledAt))
        .limit(input.limit)
        .offset(input.offset),
        db.select({ count: sql<number>`COUNT(*)` })
          .from(renderAttempts)
          .where(whereClause),
      ]);

      return {
        attempts,
        total: Number(countResult[0]?.count ?? 0),
      };
    }),
});
