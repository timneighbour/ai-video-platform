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
import { desc, eq, and, gte, sql, like, or } from "drizzle-orm";
import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { validationRuns, renderAttempts, musicVideoJobs, musicVideoScenes, users } from "../../drizzle/schema";
import { musicVideoVocalStems } from "../../drizzle/schema";

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

  /**
   * Manually inject a pre-prepared Demucs vocal stem into a job.
   * Used for showcase/benchmark renders where Demucs was run in the sandbox
   * and the stem was uploaded to CDN before the job was created.
   *
   * This inserts a row into musicVideoVocalStems so the pipeline picks it up
   * automatically during SyncLabs dispatch.
   */
  /**
   * Real-time compositing pipeline status for the Management UI progress bar.
   * Returns per-job, per-scene, per-stage status for all active rendering jobs.
   * Designed to be polled every 10 seconds.
   */
  getPipelineStatus: adminProcedure
    .input(z.object({
      jobId: z.number().int().optional(), // if omitted, returns all active rendering jobs
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { jobs: [] };

      // Fetch active jobs (rendering or assembling)
      const jobsQuery = db.select({
        id: musicVideoJobs.id,
        title: musicVideoJobs.title,
        status: musicVideoJobs.status,
        totalScenes: musicVideoJobs.totalScenes,
        completedScenes: musicVideoJobs.completedScenes,
        finalVideoUrl: musicVideoJobs.finalVideoUrl,
        updatedAt: musicVideoJobs.updatedAt,
        probePassed: musicVideoJobs.probePassed,
      }).from(musicVideoJobs);

      const allJobs = input.jobId
        ? await jobsQuery.where(eq(musicVideoJobs.id, input.jobId))
        : await jobsQuery.where(
            sql`${musicVideoJobs.status} IN ('rendering', 'assembling', 'completed')`
          ).orderBy(desc(musicVideoJobs.updatedAt)).limit(10);

      const result = await Promise.all(allJobs.map(async (job) => {
        const scenes = await db.select({
          id: musicVideoScenes.id,
          sceneIndex: musicVideoScenes.sceneIndex,
          sceneType: musicVideoScenes.sceneType,
          status: musicVideoScenes.status,
          lipSyncStatus: musicVideoScenes.lipSyncStatus,
          lipSyncTaskId: musicVideoScenes.lipSyncTaskId,
          lipSyncVideoUrl: musicVideoScenes.lipSyncVideoUrl,
          compositeStatus: musicVideoScenes.compositeStatus,
          compositeVideoUrl: musicVideoScenes.compositeVideoUrl,
          compositeAttempts: musicVideoScenes.compositeAttempts,
          videoUrl: musicVideoScenes.videoUrl,
          updatedAt: musicVideoScenes.updatedAt,
        }).from(musicVideoScenes)
          .where(eq(musicVideoScenes.jobId, job.id))
          .orderBy(musicVideoScenes.sceneIndex);

        // Compute aggregate stage counts
        const totalScenes = scenes.length;
        const stage1Done = scenes.filter(s => s.status === 'completed' || s.status === 'generating').length;
        const stage2Done = scenes.filter(s => s.lipSyncStatus === 'done').length;
        const stage2Pending = scenes.filter(s => s.lipSyncStatus === 'processing').length;
        const stage3_4Done = scenes.filter(s =>
          s.compositeStatus === 'done' || s.compositeStatus === 'skipped'
        ).length;
        const stage3_4Pending = scenes.filter(s => s.compositeStatus === 'processing').length;
        const stage3_4Error = scenes.filter(s => s.compositeStatus === 'error').length;
        const assemblyDone = job.status === 'completed' && !!job.finalVideoUrl;

        // Overall pipeline progress (0-100)
        const stageWeights = [0.2, 0.25, 0.25, 0.25, 0.05]; // S1, S2, S3/4, S5, done
        const s1Progress = totalScenes > 0 ? (stage1Done / totalScenes) * stageWeights[0] : 0;
        const s2Progress = totalScenes > 0 ? (stage2Done / totalScenes) * stageWeights[1] : 0;
        const s34Progress = totalScenes > 0 ? (stage3_4Done / totalScenes) * stageWeights[2] : 0;
        const s5Progress = assemblyDone ? stageWeights[3] + stageWeights[4] : (job.status === 'assembling' ? stageWeights[3] * 0.5 : 0);
        const overallProgress = Math.round((s1Progress + s2Progress + s34Progress + s5Progress) * 100);

        return {
          job: {
            id: job.id,
            title: job.title,
            status: job.status,
            totalScenes,
            finalVideoUrl: job.finalVideoUrl,
            updatedAt: job.updatedAt,
            probePassed: job.probePassed,
            overallProgress,
          },
          stages: {
            stage1: { label: 'Cinematic World (Seedance)', done: stage1Done, total: totalScenes, status: stage1Done === totalScenes ? 'done' : 'processing' },
            stage2: { label: 'Performance Plate (InfiniteTalk)', done: stage2Done, pending: stage2Pending, total: totalScenes, status: stage2Done === totalScenes ? 'done' : stage2Pending > 0 ? 'processing' : 'waiting' },
            stage3_4: { label: 'Matte + Composite (ffmpeg)', done: stage3_4Done, pending: stage3_4Pending, error: stage3_4Error, total: totalScenes, status: stage3_4Done === totalScenes ? 'done' : stage3_4Pending > 0 ? 'processing' : stage3_4Error > 0 ? 'error' : 'waiting' },
            stage5: { label: 'Final Audio Restoration', status: assemblyDone ? 'done' : job.status === 'assembling' ? 'processing' : 'waiting' },
          },
          scenes: scenes.map(s => ({
            id: s.id,
            sceneIndex: s.sceneIndex,
            sceneType: s.sceneType,
            stage1: s.status,
            stage2: s.lipSyncStatus ?? 'n/a',
            stage3_4: s.compositeStatus ?? 'pending',
            compositeAttempts: s.compositeAttempts ?? 0,
            hasLipSyncVideo: !!s.lipSyncVideoUrl,
            hasCompositeVideo: !!s.compositeVideoUrl,
            hasRawVideo: !!s.videoUrl,
            updatedAt: s.updatedAt,
          })),
        };
      }));

      return { jobs: result };
    }),

  /**
   * Admin: list all music video jobs across all users (paginated, searchable).
   */
  adminListJobs: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      search: z.string().optional(),
      statusFilter: z.string().optional(), // e.g. 'rendering', 'completed', 'failed'
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { jobs: [], total: 0 };

      const whereConditions = [];
      if (input.statusFilter && input.statusFilter !== 'all') {
        whereConditions.push(eq(musicVideoJobs.status, input.statusFilter as any));
      }
      if (input.search) {
        whereConditions.push(
          or(
            like(musicVideoJobs.title, `%${input.search}%`),
            like(users.name, `%${input.search}%`),
            like(users.email, `%${input.search}%`),
          )
        );
      }
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [jobs, countResult] = await Promise.all([
        db.select({
          id: musicVideoJobs.id,
          title: musicVideoJobs.title,
          status: musicVideoJobs.status,
          totalScenes: musicVideoJobs.totalScenes,
          completedScenes: musicVideoJobs.completedScenes,
          creditCost: musicVideoJobs.creditCost,
          audioDuration: musicVideoJobs.audioDuration,
          aspectRatio: musicVideoJobs.aspectRatio,
          genre: musicVideoJobs.genre,
          fallbackProvider: musicVideoJobs.fallbackProvider,
          vocalsStatus: musicVideoJobs.vocalsStatus,
          finalVideoUrl: musicVideoJobs.finalVideoUrl,
          thumbnailUrl: musicVideoJobs.thumbnailUrl,
          createdAt: musicVideoJobs.createdAt,
          updatedAt: musicVideoJobs.updatedAt,
          userId: musicVideoJobs.userId,
          userName: users.name,
          userEmail: users.email,
        })
          .from(musicVideoJobs)
          .leftJoin(users, eq(musicVideoJobs.userId, users.id))
          .where(whereClause)
          .orderBy(desc(musicVideoJobs.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: sql<number>`COUNT(*)` })
          .from(musicVideoJobs)
          .leftJoin(users, eq(musicVideoJobs.userId, users.id))
          .where(whereClause),
      ]);

      return {
        jobs,
        total: Number(countResult[0]?.count ?? 0),
      };
    }),

  /**
   * Admin: get full detail for a single job including all scenes.
   */
  adminGetJobDetail: adminProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [job] = await db.select({
        id: musicVideoJobs.id,
        title: musicVideoJobs.title,
        status: musicVideoJobs.status,
        totalScenes: musicVideoJobs.totalScenes,
        completedScenes: musicVideoJobs.completedScenes,
        creditCost: musicVideoJobs.creditCost,
        audioDuration: musicVideoJobs.audioDuration,
        aspectRatio: musicVideoJobs.aspectRatio,
        genre: musicVideoJobs.genre,
        mood: musicVideoJobs.mood,
        themePrompt: musicVideoJobs.themePrompt,
        fallbackProvider: musicVideoJobs.fallbackProvider,
        vocalsStatus: musicVideoJobs.vocalsStatus,
        stemVocalsUrl: musicVideoJobs.stemVocalsUrl,
        audioUrl: musicVideoJobs.audioUrl,
        finalVideoUrl: musicVideoJobs.finalVideoUrl,
        thumbnailUrl: musicVideoJobs.thumbnailUrl,
        probePassed: musicVideoJobs.probePassed,
        createdAt: musicVideoJobs.createdAt,
        updatedAt: musicVideoJobs.updatedAt,
        userId: musicVideoJobs.userId,
        userName: users.name,
        userEmail: users.email,
      })
        .from(musicVideoJobs)
        .leftJoin(users, eq(musicVideoJobs.userId, users.id))
        .where(eq(musicVideoJobs.id, input.jobId));

      if (!job) throw new Error("Job not found");

      const scenes = await db.select({
        id: musicVideoScenes.id,
        sceneIndex: musicVideoScenes.sceneIndex,
        status: musicVideoScenes.status,
        sceneType: musicVideoScenes.sceneType,
        lipSync: musicVideoScenes.lipSync,
        lipSyncStatus: musicVideoScenes.lipSyncStatus,
        lipSyncTaskId: musicVideoScenes.lipSyncTaskId,
        lipSyncVideoUrl: musicVideoScenes.lipSyncVideoUrl,
        compositeStatus: musicVideoScenes.compositeStatus,
        compositeVideoUrl: musicVideoScenes.compositeVideoUrl,
        compositeAttempts: musicVideoScenes.compositeAttempts,
        videoUrl: musicVideoScenes.videoUrl,
        previewImageUrl: musicVideoScenes.previewImageUrl,
        prompt: musicVideoScenes.prompt,
        lyrics: musicVideoScenes.lyrics,
        startTime: musicVideoScenes.startTime,
        duration: musicVideoScenes.duration,
        renderProvider: musicVideoScenes.renderProvider,
        lipSyncProvider: musicVideoScenes.lipSyncProvider,
        renderDurationMs: musicVideoScenes.renderDurationMs,
        lipSyncDurationMs: musicVideoScenes.lipSyncDurationMs,
        overallSceneScore: musicVideoScenes.overallSceneScore,
        errorMessage: musicVideoScenes.errorMessage,
        retryCount: musicVideoScenes.retryCount,
        updatedAt: musicVideoScenes.updatedAt,
      })
        .from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, input.jobId))
        .orderBy(musicVideoScenes.sceneIndex);

      return { job, scenes };
    }),

  /**
   * Admin: reset a scene to pending so it re-renders.
   */
  adminResetScene: adminProcedure
    .input(z.object({ sceneId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(musicVideoScenes)
        .set({
          status: "pending",
          videoUrl: null,
          lipSyncStatus: "pending",
          lipSyncVideoUrl: null,
          lipSyncTaskId: null,
          compositeStatus: "pending",
          compositeVideoUrl: null,
          errorMessage: null,
          retryCount: 0,
        } as any)
        .where(eq(musicVideoScenes.id, input.sceneId));
      return { success: true, sceneId: input.sceneId };
    }),

  /**
   * Admin: reset a job status to allow re-rendering.
   */
  adminResetJob: adminProcedure
    .input(z.object({
      jobId: z.number().int(),
      clearFallbackProvider: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const updates: Record<string, any> = { status: "rendering" };
      if (input.clearFallbackProvider) updates.fallbackProvider = null;
      await db.update(musicVideoJobs)
        .set(updates)
        .where(eq(musicVideoJobs.id, input.jobId));
      return { success: true, jobId: input.jobId };
    }),

  triggerGoldenValidation: adminProcedure
    .mutation(async () => {
      // Fire-and-forget: start the golden validation in background
      const { runGoldenValidation } = await import("../golden-validation");
      runGoldenValidation().catch((err) => {
        console.error("[GoldenValidation] Manual trigger failed:", err);
      });
      return { triggered: true, message: "Golden validation started. Check the runs table for progress." };
    }),

  injectVocalStem: adminProcedure
    .input(z.object({
      jobId: z.number().int(),
      stemUrl: z.string().url(),
      stemKey: z.string().min(1),
      characterName: z.string().optional(),
      voiceGender: z.enum(["male", "female", "unknown"]).default("unknown"),
      voiceLabel: z.string().default("Lead Vocal"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Remove any existing stems for this job first (clean slate)
      await db.delete(musicVideoVocalStems)
        .where(eq(musicVideoVocalStems.jobId, input.jobId));

      // Insert the new stem as the lead vocal
      await db.insert(musicVideoVocalStems).values({
        jobId: input.jobId,
        stemIndex: 0,
        stemUrl: input.stemUrl,
        stemKey: input.stemKey,
        characterName: input.characterName ?? null,
        voiceGender: input.voiceGender,
        voiceLabel: input.voiceLabel,
        isLeadVocal: true,
        diarisationStatus: "done",
      });

      // Update the job vocals_status to 'done'
      await db.update(musicVideoJobs)
        .set({ vocalsStatus: "done" } as any)
        .where(eq(musicVideoJobs.id, input.jobId));

      return { success: true, jobId: input.jobId, stemUrl: input.stemUrl };
    }),
});
