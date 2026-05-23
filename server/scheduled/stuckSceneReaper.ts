/**
 * stuckSceneReaper — Heartbeat handler (§4a Project-level Heartbeat)
 *
 * Runs every 5 minutes via Manus platform cron.
 * Finds scenes that have been stuck in "generating" state for longer than
 * STUCK_THRESHOLD_MS, force-fails them, cancels their open providerJobLogs,
 * and optionally auto-retries scenes that still have attempts remaining.
 *
 * This is the "foolproof" safety net against Atlas Cloud / provider webhook
 * failures where a scene is accepted by the provider but never completes.
 *
 * Route: POST /api/scheduled/stuckSceneReaper
 * Auth:  Manus platform cron header (x-manus-cron-task-uid)
 */

import type { Request, Response } from "express";
import { getDb } from "../db";
import {
  musicVideoScenes,
  musicVideoJobs,
  providerJobLogs,
  sceneActionLogs,
} from "../../drizzle/schema";
import { eq, and, lte, inArray, sql } from "drizzle-orm";
import { resetSceneAttempts } from "../spend-protection";
// NOTE: startSceneRender is intentionally NOT called here.
// The reaper only resets scenes to 'pending'. The sceneDispatchHeartbeat is the
// sole dispatcher — it handles probe gate, CHARACTER LOCK™, performance scene routing,
// BPM injection, and provider selection. Calling startSceneRender here would bypass
// all of that and re-introduce bugs (e.g. character description as Seedance prompt).
import { sdk } from "../_core/sdk";

/** Scenes stuck longer than this are considered timed-out. */
const STUCK_THRESHOLD_MS = 8 * 60 * 1000; // 8 minutes (reduced from 15 for faster auto-recovery)

/**
 * Scenes with fewer than this many prior attempts will be auto-retried
 * immediately after being force-failed. Scenes at or above this limit
 * are left as failed so the user can inspect and retry manually.
 */
const AUTO_RETRY_MAX_ATTEMPTS = 3;

/** System user ID used when logging reaper-initiated retries. */
const REAPER_SYSTEM_USER_ID = -99;

export async function stuckSceneReaperHandler(req: Request, res: Response) {
  const startedAt = Date.now();

  // Authenticate via Manus cron session — platform sends a cron_ prefixed openId
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }
    taskUid = user.taskUid;
  } catch {
    return res.status(403).json({ error: "cron-only endpoint" });
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);

    // ── 1. Find all scenes stuck in "generating" beyond the threshold ─────────
    const stuckScenes = await db
      .select({
        id: musicVideoScenes.id,
        jobId: musicVideoScenes.jobId,
        sceneIndex: musicVideoScenes.sceneIndex,
        prompt: musicVideoScenes.prompt,
        duration: musicVideoScenes.duration,
        lipSync: musicVideoScenes.lipSync,
        lipSyncStyle: musicVideoScenes.lipSyncStyle,
        modelAssignment: musicVideoScenes.modelAssignment,
        previewImageUrl: musicVideoScenes.previewImageUrl,
        errorMessage: musicVideoScenes.errorMessage,
        updatedAt: musicVideoScenes.updatedAt,
      })
      .from(musicVideoScenes)
      .where(
        and(
          eq(musicVideoScenes.status, "generating"),
          lte(musicVideoScenes.updatedAt, cutoff)
        )
      );

    if (stuckScenes.length === 0) {
      return res.json({
        ok: true,
        reaped: 0,
        autoRetried: 0,
        durationMs: Date.now() - startedAt,
        message: "No stuck scenes found",
      });
    }

    console.log(
      `[StuckSceneReaper] ${new Date().toISOString()} Found ${stuckScenes.length} stuck scene(s) — threshold: ${STUCK_THRESHOLD_MS / 60000}min`
    );

    const sceneIds = stuckScenes.map((s) => s.id);

    // ── 2. Force-fail all stuck scenes ────────────────────────────────────────
    await db
      .update(musicVideoScenes)
      .set({
        status: "failed",
        errorMessage:
          "Automatic timeout recovery: scene did not complete within the expected window. Retrying automatically.",
        updatedAt: new Date(),
      })
      .where(inArray(musicVideoScenes.id, sceneIds));

    // ── 3. Cancel all open providerJobLogs for these scenes ───────────────────
    await db
      .update(providerJobLogs)
      .set({ status: "cancelled", failedAt: new Date() })
      .where(
        and(
          inArray(providerJobLogs.sceneId, sceneIds),
          inArray(providerJobLogs.status, ["submitted"])
        )
      );

    // ── 4. Reset attempt counters so auto-retry isn't blocked ─────────────────
    await Promise.all(sceneIds.map((id) => resetSceneAttempts(id)));

    // ── 5. Fetch job metadata for logging and provider routing ───────────────────────────
    const uniqueJobIds = Array.from(new Set(stuckScenes.map((s) => s.jobId)));
    const jobs = await db
      .select({
        id: musicVideoJobs.id,
        title: musicVideoJobs.title,
        userId: musicVideoJobs.userId,
        atlasFailureCount: musicVideoJobs.atlasFailureCount,
        fallbackProvider: musicVideoJobs.fallbackProvider,
        aspectRatio: musicVideoJobs.aspectRatio,
      })
      .from(musicVideoJobs)
      .where(inArray(musicVideoJobs.id, uniqueJobIds));
    const jobMap = new Map(jobs.map((j) => [j.id, j]));

    // Auto-escalate jobs that have hit the Atlas failure threshold
    const ATLAS_JOB_FAILURE_THRESHOLD = 2;
    for (const job of jobs) {
      if ((job.atlasFailureCount ?? 0) >= ATLAS_JOB_FAILURE_THRESHOLD && job.fallbackProvider !== "wavespeed") {
        await db
          .update(musicVideoJobs)
          .set({ fallbackProvider: "wavespeed", updatedAt: new Date() })
          .where(eq(musicVideoJobs.id, job.id));
        job.fallbackProvider = "wavespeed"; // update local reference
        console.warn(`[StuckSceneReaper] Job ${job.id} auto-escalated to WaveSpeed (atlasFailureCount=${job.atlasFailureCount})`);
      }
    } // ── 6. Log each reaped scene to sceneActionLogs ───────────────────────────
    for (const scene of stuckScenes) {
      const job = jobMap.get(scene.jobId);
      await db
        .insert(sceneActionLogs)
        .values({
          userId: job?.userId ?? REAPER_SYSTEM_USER_ID,
          jobId: scene.jobId,
          sceneId: scene.id,
          action: "retry",
          sceneIndex: scene.sceneIndex ?? 0,
          jobTitle: job?.title ?? null,
          errorMessageBefore: "Auto-timeout: scene stuck in generating state",
        })
        .catch(() => {/* non-fatal */});
    }

    // ── 7. Count prior attempts to decide auto-retry eligibility ─────────────
    // We use the providerJobLogs count (now all cancelled) as the attempt proxy.
    // Scenes with 0–2 prior attempts get auto-retried; 3+ are left for manual retry.
    const attemptCounts = await db
      .select({
        sceneId: providerJobLogs.sceneId,
        total: sql<number>`count(*)`,
      })
      .from(providerJobLogs)
      .where(inArray(providerJobLogs.sceneId, sceneIds))
      .groupBy(providerJobLogs.sceneId) as Array<{ sceneId: number; total: number }>;

    const attemptMap = new Map(attemptCounts.map((r) => [r.sceneId, r.total]));

    const autoRetryScenes = stuckScenes.filter(
      (s) => (attemptMap.get(s.id) ?? 0) < AUTO_RETRY_MAX_ATTEMPTS
    );
    const manualRetryScenes = stuckScenes.filter(
      (s) => (attemptMap.get(s.id) ?? 0) >= AUTO_RETRY_MAX_ATTEMPTS
    );

    // "Manual-retry" scenes have exceeded the normal auto-retry limit.
    // Instead of leaving them as hard failures (which causes "Build Failed" for users),
    // we force-escalate their job to WaveSpeed and add them back to the auto-retry pool.
    // This ensures users NEVER see a permanent build failure from provider congestion.
    if (manualRetryScenes.length > 0) {
      const manualJobIds = Array.from(new Set(manualRetryScenes.map((s) => s.jobId)));
      for (const jid of manualJobIds) {
        const job = jobMap.get(jid);
        if (job && job.fallbackProvider !== "wavespeed") {
          await db
            .update(musicVideoJobs)
            .set({ fallbackProvider: "wavespeed", updatedAt: new Date() })
            .where(eq(musicVideoJobs.id, jid));
          if (job) job.fallbackProvider = "wavespeed";
          console.warn(`[StuckSceneReaper] Job ${jid} force-escalated to WaveSpeed (manual-retry threshold reached)`);
        }
      }
      // Clear the attempt history so these scenes can be auto-retried via WaveSpeed
      await Promise.all(manualRetryScenes.map((s) => resetSceneAttempts(s.id)));
      // Move them into the auto-retry pool
      autoRetryScenes.push(...manualRetryScenes);
    }

    // ── 8. Reset eligible scenes to pending ──────────────────────────────────
    // ARCHITECTURE: The reaper ONLY resets scenes to 'pending'. It does NOT call
    // startSceneRender directly. The sceneDispatchHeartbeat is the sole dispatcher
    // and handles all routing (probe gate, CHARACTER LOCK™, performance scene routing,
    // BPM injection, provider selection). The heartbeat will pick up these pending
    // scenes on its next tick (within 2 minutes).
    let autoRetried = 0;
    for (const scene of autoRetryScenes) {
      try {
        // Full pipeline reset — clear ALL state fields so the heartbeat starts clean.
        // This prevents stale lipSyncStatus/compositeStatus from confusing the pipeline.
        await db
          .update(musicVideoScenes)
          .set({
            status: "pending",
            taskId: null,
            videoUrl: null,
            errorMessage: null,
            lipSyncStatus: "pending",
            lipSyncTaskId: null,
            lipSyncVideoUrl: null,
            compositeStatus: "pending",
            compositeVideoUrl: null,
            updatedAt: new Date(),
          })
          .where(eq(musicVideoScenes.id, scene.id));

        // Ensure the parent job is still in rendering state
        const job = jobMap.get(scene.jobId);
        if (job) {
          await db
            .update(musicVideoJobs)
            .set({ status: "rendering", updatedAt: new Date() })
            .where(
              and(
                eq(musicVideoJobs.id, scene.jobId),
                eq(musicVideoJobs.status, "failed")
              )
            );
        }

        console.log(
          `[StuckSceneReaper] Scene ${scene.id} (job ${scene.jobId}) reset to pending — heartbeat will dispatch on next tick`
        );
        autoRetried++;
      } catch (err) {
        console.error(`[StuckSceneReaper] Failed to reset scene ${scene.id} to pending:`, err);
      }
    }

    const summary = {
      ok: true,
      reaped: stuckScenes.length,
      autoRetried,
      manualRetryRequired: manualRetryScenes.length,
      sceneIds,
      durationMs: Date.now() - startedAt,
    };

    console.log(`[StuckSceneReaper] Done:`, summary);
    return res.json(summary);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[StuckSceneReaper] Unhandled error:", err);
    return res.status(500).json({
      error,
      stack,
      context: { taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
