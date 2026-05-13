/**
 * sceneDispatchHeartbeat — Heartbeat handler (§4a Project-level Heartbeat)
 *
 * Runs every 60 seconds via Manus platform cron.
 *
 * PURPOSE: Dispatch all pending scenes for active rendering jobs — completely
 * independent of whether any browser tab is open. This is the server-side
 * backbone of the render pipeline. Without this, scenes only get dispatched
 * when a user has the render page open (frontend polling).
 *
 * WHAT IT DOES:
 * 1. Finds all musicVideoJobs in 'rendering' status
 * 2. For each job, finds scenes in 'pending' state with no taskId
 * 3. Dispatches them to the appropriate provider (Atlas Cloud or WaveSpeed)
 * 4. Updates scene status to 'generating' with the returned taskId
 * 5. Polls scenes already in 'generating' to check for completion
 * 6. When all scenes complete, triggers assembly
 *
 * Route: POST /api/scheduled/sceneDispatchHeartbeat
 * Auth:  Manus platform cron header (x-manus-cron-task-uid)
 */

import type { Request, Response } from "express";
import { getDb } from "../db";
import {
  musicVideoScenes,
  musicVideoJobs,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sdk } from "../_core/sdk";
import { startSceneRender, pollSceneStatus, assembleMusicVideo } from "../music-video-service";
import type { AudioTier } from "../wizsound";

const MAX_CONCURRENT_DISPATCHES = 4; // Max scenes to dispatch per heartbeat tick
const SCENE_STUCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes — reaper handles beyond this

export async function sceneDispatchHeartbeatHandler(req: Request, res: Response) {
  const startedAt = Date.now();

  // Authenticate via Manus cron session
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }
  } catch {
    return res.status(403).json({ error: "authentication failed" });
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    // ── 1. Find all jobs actively rendering ───────────────────────────────────
        const activeJobs = await db
      .select({
        id: musicVideoJobs.id,
        userId: musicVideoJobs.userId,
        title: musicVideoJobs.title,
        status: musicVideoJobs.status,
        totalScenes: musicVideoJobs.totalScenes,
        completedScenes: musicVideoJobs.completedScenes,
        fallbackProvider: musicVideoJobs.fallbackProvider,
        aspectRatio: musicVideoJobs.aspectRatio,
        audioUrl: musicVideoJobs.audioUrl,
        characterImageUrl: musicVideoJobs.characterImageUrl,
        updatedAt: musicVideoJobs.updatedAt,
      })
      .from(musicVideoJobs)
      .where(eq(musicVideoJobs.status, "rendering"));

    if (activeJobs.length === 0) {
      return res.json({
        ok: true,
        activeJobs: 0,
        dispatched: 0,
        polled: 0,
        assembled: 0,
        durationMs: Date.now() - startedAt,
      });
    }

    let totalDispatched = 0;
    let totalPolled = 0;
    let totalAssembled = 0;

    for (const job of activeJobs) {
      try {
        const scenes = await db
          .select()
          .from(musicVideoScenes)
          .where(eq(musicVideoScenes.jobId, job.id));

        // Note: schema uses 'status' as the TypeScript field name (DB column is 'mvSceneStatus')
        const pendingScenes = scenes.filter(
          (s) => s.status === "pending" && !s.taskId
        );
        const generatingScenes = scenes.filter(
          (s) => s.status === "generating" && s.taskId
        );
        const completedScenes = scenes.filter((s) => s.status === "completed");

        // ── 2. Dispatch pending scenes ─────────────────────────────────────────
        const toDispatch = pendingScenes.slice(0, MAX_CONCURRENT_DISPATCHES);
        for (const scene of toDispatch) {
          try {
            console.log(
              `[SceneDispatch] Dispatching scene ${scene.id} (index ${scene.sceneIndex}) for job ${job.id} — provider: ${job.fallbackProvider ?? "atlas_cloud"}`
            );

            const taskId = await startSceneRender(
              scene.id,
              scene.prompt ?? "",
              scene.duration ?? 5,
              scene.lipSync ?? true,
              (scene.lipSyncStyle ?? "natural") as "natural" | "expressive" | "subtle" | "dramatic" | "anime",
              "atlas_cloud" as any,
              (scene.modelAssignment === "hailuo-minimax"
                ? "bytedance/seedance-2.0-fast/text-to-video"
                : "bytedance/seedance-2.0/text-to-video") as any,
              scene.previewImageUrl ?? undefined,
              (job.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1",
              job.id,
              job.characterImageUrl ?? undefined,
              job.audioUrl ?? undefined,
              scene.startTime ? scene.startTime / 1000 : undefined // convert ms to seconds
            );

            await db
              .update(musicVideoScenes)
              .set({ status: "generating", taskId, updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));

            console.log(
              `[SceneDispatch] Scene ${scene.id} dispatched → taskId: ${taskId}`
            );
            totalDispatched++;
          } catch (dispatchErr: any) {
            const errMsg = String(dispatchErr?.message ?? dispatchErr).slice(0, 300);
            console.error(`[SceneDispatch] Failed to dispatch scene ${scene.id}: ${errMsg}`);
            // Don't mark as failed yet — let the reaper handle persistent failures
          }
        }

        // ── 3. Poll generating scenes for completion ───────────────────────────
        for (const scene of generatingScenes) {
          try {
            // Skip scenes that are too fresh (avoid hammering the API)
            const sceneAge = Date.now() - new Date(scene.updatedAt).getTime();
            if (sceneAge < 10_000) continue; // Wait at least 10s before first poll

            // Skip scenes stuck beyond our threshold — reaper handles those
            if (sceneAge > SCENE_STUCK_TIMEOUT_MS) {
              console.warn(
                `[SceneDispatch] Scene ${scene.id} stuck for ${Math.round(sceneAge / 60000)}min — skipping, reaper will handle`
              );
              continue;
            }

            const pollResult = await pollSceneStatus(scene.id, scene.taskId!);

            if (pollResult?.status === "completed" && pollResult.videoUrl) {
              await db
                .update(musicVideoScenes)
                .set({
                  status: "completed",
                  videoUrl: pollResult.videoUrl,
                  updatedAt: new Date(),
                })
                .where(eq(musicVideoScenes.id, scene.id));
              console.log(`[SceneDispatch] Scene ${scene.id} completed ✓`);
              totalPolled++;
            } else if (pollResult?.status === "failed") {
              await db
                .update(musicVideoScenes)
                .set({
                  status: "failed",
                  errorMessage: "Provider returned failed status — will be retried automatically",
                  updatedAt: new Date(),
                })
                .where(eq(musicVideoScenes.id, scene.id));
              console.warn(`[SceneDispatch] Scene ${scene.id} failed`);
            }
            // "processing" — do nothing, poll again next tick
          } catch (pollErr: any) {
            // Non-fatal — log and continue
            console.error(`[SceneDispatch] Poll error for scene ${scene.id}: ${String(pollErr?.message ?? pollErr).slice(0, 200)}`);
          }
        }

        // ── 4. Re-check completion after polling ───────────────────────────────
        const freshScenes = await db
          .select()
          .from(musicVideoScenes)
          .where(eq(musicVideoScenes.jobId, job.id));

        const nowCompleted = freshScenes.filter((s) => s.status === "completed");
        const nowFailed = freshScenes.filter((s) => s.status === "failed");
        const nowPending = freshScenes.filter((s) => s.status === "pending" && !s.taskId);
        const nowGenerating = freshScenes.filter((s) => s.status === "generating");

        // Update completedScenes count on the job
        if (nowCompleted.length !== job.completedScenes) {
          await db
            .update(musicVideoJobs)
            .set({ completedScenes: nowCompleted.length, updatedAt: new Date() })
            .where(eq(musicVideoJobs.id, job.id));
        }

        // ── 5. Trigger assembly when all scenes are done ───────────────────────
        const allDone = nowPending.length === 0 && nowGenerating.length === 0;
        const hasCompletedScenes = nowCompleted.length > 0;

        if (allDone && hasCompletedScenes) {
          console.log(
            `[SceneDispatch] Job ${job.id} — all scenes done (${nowCompleted.length} completed, ${nowFailed.length} failed). Triggering assembly.`
          );
          try {
            await db
              .update(musicVideoJobs)
              .set({ status: "assembling", updatedAt: new Date() })
              .where(eq(musicVideoJobs.id, job.id));

            // Fire assembly asynchronously — don't block the heartbeat response
            assembleMusicVideo(job.id, "standard" as AudioTier).catch((assemblyErr: any) => {
              console.error(`[SceneDispatch] Assembly failed for job ${job.id}:`, assemblyErr);
            });

            totalAssembled++;
          } catch (assemblyTriggerErr: any) {
            console.error(`[SceneDispatch] Failed to trigger assembly for job ${job.id}:`, assemblyTriggerErr);
          }
        }

        // ── 6. Handle all-failed case ──────────────────────────────────────────
        if (allDone && nowCompleted.length === 0 && nowFailed.length > 0) {
          console.error(
            `[SceneDispatch] Job ${job.id} — ALL ${nowFailed.length} scenes failed. Marking job failed.`
          );
          await db
            .update(musicVideoJobs)
            .set({
              status: "failed",
              errorMessage: "All scenes failed to generate. Your credits have been refunded — please try again.",
              updatedAt: new Date(),
            })
            .where(eq(musicVideoJobs.id, job.id));
        }
      } catch (jobErr: any) {
        console.error(`[SceneDispatch] Error processing job ${job.id}:`, String(jobErr?.message ?? jobErr).slice(0, 300));
        // Continue to next job — don't let one job failure block others
      }
    }

    const summary = {
      ok: true,
      activeJobs: activeJobs.length,
      dispatched: totalDispatched,
      polled: totalPolled,
      assembled: totalAssembled,
      durationMs: Date.now() - startedAt,
    };

    console.log(`[SceneDispatch] Heartbeat complete:`, summary);
    return res.json(summary);
  } catch (err: any) {
    console.error("[SceneDispatch] Fatal error:", err);
    return res.status(500).json({
      error: String(err?.message ?? err),
      timestamp: new Date().toISOString(),
    });
  }
}
