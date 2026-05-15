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

// No cap on concurrent dispatches — dispatch ALL pending scenes immediately.
// WaveSpeed and Atlas Cloud handle their own queuing; we should submit everything
// so all scenes render in parallel rather than in sequential batches.
const MAX_CONCURRENT_DISPATCHES = 50; // effectively unlimited for any realistic job size
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

        // ── 2. Auto-recover failed scenes back to pending ──────────────────────
        // Failed scenes are NEVER left as failed — reset them to pending so they
        // get dispatched again on the next tick.
        const failedScenes = scenes.filter((s) => s.status === "failed");
        if (failedScenes.length > 0) {
          console.log(`[SceneDispatch] Job ${job.id} — resetting ${failedScenes.length} failed scene(s) back to pending for retry`);
          for (const fs of failedScenes) {
            await db.update(musicVideoScenes)
              .set({ status: "pending", taskId: null, errorMessage: null, updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, fs.id));
          }
          // Re-fetch scenes after reset so pending list is accurate
          const refreshed = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, job.id));
          pendingScenes.push(...refreshed.filter(s => failedScenes.some(f => f.id === s.id)));
        }

        // ── 3. Dispatch ALL pending scenes immediately (parallel submission) ────
        const toDispatch = pendingScenes; // dispatch every pending scene, no cap
        for (const scene of toDispatch) {
          try {
            console.log(
              `[SceneDispatch] Dispatching scene ${scene.id} (index ${scene.sceneIndex}) for job ${job.id} — provider: ${job.fallbackProvider ?? "atlas_cloud"}`
            );

            // ── CHARACTER LOCK™: Resolve per-scene portrait URL + description anchor ────────
            // Priority: masterPortraitUrl > previewImageUrl > job.characterImageUrl
            // Also resolves lockedDescription for text-based identity anchoring in the prompt.
            let resolvedCharacterUrl: string | undefined = job.characterImageUrl ?? undefined;
            let resolvedCharacterDescription: string | undefined = undefined;
            let resolvedCharacterName: string | undefined = undefined;
            try {
              const { videoCharacters } = await import("../../drizzle/schema");
              const { eq: eqChar } = await import("drizzle-orm");
              const jobChars = await db.select().from(videoCharacters).where(eqChar(videoCharacters.jobId, job.id));
              if (jobChars.length > 0) {
                let assignments: string[] = [];
                try { if (scene.characterAssignments) assignments = JSON.parse(scene.characterAssignments); } catch {}
                let matchedChar = assignments.length > 0
                  ? jobChars.find(c => assignments.some(a => a.toLowerCase() === c.name.toLowerCase()))
                  : null;
                const bestChar = matchedChar ?? jobChars.find(c => c.masterPortraitUrl) ?? jobChars.find(c => c.previewImageUrl) ?? jobChars[0];
                if (bestChar) {
                  resolvedCharacterUrl = bestChar.masterPortraitUrl ?? bestChar.previewImageUrl ?? resolvedCharacterUrl;
                  resolvedCharacterDescription = bestChar.lockedDescription?.trim() ?? undefined;
                  resolvedCharacterName = bestChar.name ?? undefined;
                }
              }
            } catch (charErr) {
              console.warn(`[SceneDispatch] Character portrait resolution failed for scene ${scene.id}:`, charErr);
            }

            // ── TEXT ANCHOR: Prepend character identity to prompt for AI-described characters ──
            // When masterPortraitUrl was previously NULL (AI character, no photos), the image
            // reference alone was insufficient — WaveSpeed drifted to different faces each scene.
            // Adding the character's locked description as a text prefix reinforces identity.
            let scenePrompt = scene.prompt ?? "";
            if (resolvedCharacterDescription && resolvedCharacterName) {
              const charAnchor = `${resolvedCharacterName}: ${resolvedCharacterDescription.slice(0, 150)}. `;
              const MAX_TOTAL = 480;
              const remainingChars = MAX_TOTAL - charAnchor.length;
              const trimmedScene = scenePrompt.length > remainingChars
                ? scenePrompt.slice(0, remainingChars).replace(/[,;.\s]+$/, "") + "."
                : scenePrompt;
              scenePrompt = charAnchor + trimmedScene;
              console.log(`[SceneDispatch] Scene ${scene.id} TEXT ANCHOR injected for ${resolvedCharacterName} (${charAnchor.length} chars)`);
            }

            if (resolvedCharacterUrl) {
              console.log(`[SceneDispatch] Scene ${scene.id} CHARACTER LOCK™ active: ${resolvedCharacterUrl.slice(0, 80)}...`);
            } else {
              console.warn(`[SceneDispatch] Scene ${scene.id} WARNING: no character portrait — rendering text-only (Character Lock™ not enforced)`);
            }

            const taskId = await startSceneRender(
              scene.id,
              scenePrompt, // ── TEXT ANCHOR: character description prepended for AI characters
              scene.duration ?? 5,
              scene.lipSync ?? true,
              (scene.lipSyncStyle ?? "natural") as "natural" | "expressive" | "subtle" | "dramatic" | "anime",
              "atlas_cloud_fast" as any, // ── PRIMARY: Atlas Cloud Fast ($0.64/scene, watermark-free text-to-video)
              undefined as any, // model arg not used by Atlas Cloud
              scene.previewImageUrl ?? undefined,
              (job.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1",
              job.id,
              resolvedCharacterUrl, // ── CHARACTER LOCK™: per-scene portrait
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
            // Log the error to the database so it's visible for debugging
            try {
              const { sql } = await import('drizzle-orm');
              const safeMsg = `Dispatch failed for scene ${scene.id} (index ${scene.sceneIndex}): ${errMsg}`;
              await db.execute(
                sql`INSERT INTO debugLogs (userId, jobId, sceneId, debugCategory, debugSeverity, debugJobType, message, createdAt) VALUES (${job.userId}, ${job.id}, ${scene.id}, 'dispatch_error', 'error', 'music_video', ${safeMsg}, NOW())`
              );
            } catch { /* ignore logging errors */ }
            // Keep scene as pending — it will be retried on the next heartbeat tick.
            // Never mark as failed here.
          }
        }

        // ── 4. Poll generating scenes for completion ───────────────────────────
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
              // Reset to pending — never leave as failed. Will be re-dispatched next tick.
              await db
                .update(musicVideoScenes)
                .set({
                  status: "pending",
                  taskId: null,
                  errorMessage: null,
                  updatedAt: new Date(),
                })
                .where(eq(musicVideoScenes.id, scene.id));
              console.warn(`[SceneDispatch] Scene ${scene.id} provider returned failed — reset to pending for retry`);
            }
            // "processing" — do nothing, poll again next tick
          } catch (pollErr: any) {
            // Non-fatal — log and continue
            console.error(`[SceneDispatch] Poll error for scene ${scene.id}: ${String(pollErr?.message ?? pollErr).slice(0, 200)}`);
          }
        }

        // ── 5. Re-check completion after polling ───────────────────────────────
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

        // ── 6. Trigger assembly when all scenes are done ───────────────────────
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
            assembleMusicVideo(job.id, "standard" as AudioTier)
              .then(async (finalUrl: string) => {
                // Safety net: if assembleMusicVideo returned a URL but somehow
                // didn't update the DB status, ensure it's marked completed now.
                if (finalUrl) {
                  const [currentJob] = await db.select({ status: musicVideoJobs.status })
                    .from(musicVideoJobs)
                    .where(eq(musicVideoJobs.id, job.id));
                  if (currentJob && currentJob.status !== "completed") {
                    console.warn(`[SceneDispatch] Assembly returned URL but status was '${currentJob.status}' — force-setting to completed.`);
                    await db.update(musicVideoJobs)
                      .set({ status: "completed", updatedAt: new Date() })
                      .where(eq(musicVideoJobs.id, job.id));
                  }
                }
              })
              .catch(async (assemblyErr: any) => {
                console.error(`[SceneDispatch] Assembly failed for job ${job.id}:`, assemblyErr);
                // Reset to rendering so the heartbeat re-triggers assembly on next tick
                // Never leave a job stuck in 'assembling' indefinitely
                try {
                  await db.update(musicVideoJobs)
                    .set({ status: "rendering", errorMessage: "Assembly error — retrying...", updatedAt: new Date() })
                    .where(and(eq(musicVideoJobs.id, job.id), eq(musicVideoJobs.status, "assembling")));
                } catch (resetErr) {
                  console.error(`[SceneDispatch] Failed to reset job ${job.id} after assembly error:`, resetErr);
                }
              });

            totalAssembled++;
          } catch (assemblyTriggerErr: any) {
            console.error(`[SceneDispatch] Failed to trigger assembly for job ${job.id}:`, assemblyTriggerErr);
          }
        }

        // ── 7. Never mark job as failed — if all scenes are stuck, reset them ──
        // The system will keep retrying indefinitely. No job ever enters 'failed' state
        // due to provider downtime.
        if (allDone && nowCompleted.length === 0 && nowFailed.length > 0) {
          console.warn(
            `[SceneDispatch] Job ${job.id} — all scenes in failed state. Resetting all to pending for retry.`
          );
          await db
            .update(musicVideoScenes)
            .set({ status: "pending", taskId: null, errorMessage: null, updatedAt: new Date() })
            .where(eq(musicVideoScenes.jobId, job.id));
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
