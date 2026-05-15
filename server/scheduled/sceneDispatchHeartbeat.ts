/**
 * sceneDispatchHeartbeat — Heartbeat handler (§4a Project-level Heartbeat)
 *
 * Runs every 60 seconds via Manus platform cron.
 *
 * PURPOSE: Dispatch all pending scenes for active rendering jobs — completely
 * independent of whether any browser tab is open. This is the server-side
 * backbone of the render pipeline.
 *
 * PIPELINE (per scene with lip sync enabled):
 *   1. Atlas Cloud image-to-video  → silent scene clip (consistent character)
 *   2. Sync Labs sync-3             → per-scene lip sync using exact vocal segment
 *   3. Assembly                     → stitch lip-synced clips + original music track
 *
 * WHY THIS APPROACH:
 *   - Seedance 2.0 reference-to-video generates its own random audio/characters.
 *   - Sync Labs sync-3 is purpose-built for lip sync and produces frame-accurate
 *     mouth movement from audio phonemes.
 *   - Image-to-video gives consistent character appearance without audio interference.
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
import { extractSceneAudioClip } from "../audio-clip-extractor";
import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "../ai-apis/synclabs-lipsync";
import type { AudioTier } from "../wizsound";

const SCENE_STUCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes — reaper handles beyond this
const SYNC_LABS_STUCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes max for Sync Labs

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
        lipSyncSubmitted: 0,
        lipSyncPolled: 0,
        assembled: 0,
        durationMs: Date.now() - startedAt,
      });
    }

    let totalDispatched = 0;
    let totalPolled = 0;
    let totalLipSyncSubmitted = 0;
    let totalLipSyncPolled = 0;
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

        // ── 2. Auto-recover failed scenes back to pending ──────────────────────
        const failedScenes = scenes.filter((s) => s.status === "failed");
        if (failedScenes.length > 0) {
          console.log(`[SceneDispatch] Job ${job.id} — resetting ${failedScenes.length} failed scene(s) back to pending for retry`);
          for (const fs of failedScenes) {
            await db.update(musicVideoScenes)
              .set({
                status: "pending",
                taskId: null,
                errorMessage: null,
                lipSyncStatus: "pending",
                lipSyncTaskId: null,
                lipSyncVideoUrl: null,
                updatedAt: new Date(),
              })
              .where(eq(musicVideoScenes.id, fs.id));
          }
          // Re-fetch scenes after reset so pending list is accurate
          const refreshed = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, job.id));
          pendingScenes.push(...refreshed.filter(s => failedScenes.some(f => f.id === s.id)));
        }

        // ── 3. Dispatch ALL pending scenes (image-to-video, NO audio) ──────────
        // IMPORTANT: We use image-to-video only. Audio/lip sync is handled
        // separately by Sync Labs AFTER the scene clip is generated.
        // This avoids Seedance 2.0 generating random audio/characters.
        for (const scene of pendingScenes) {
          try {
            console.log(
              `[SceneDispatch] Dispatching scene ${scene.id} (index ${scene.sceneIndex}) for job ${job.id} — image-to-video (no audio)`
            );

            // ── CHARACTER LOCK™: Resolve per-scene portrait URL ────────────────
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

            // ── TEXT ANCHOR: Prepend character identity to prompt ──────────────
            let scenePrompt = scene.prompt ?? "";
            if (resolvedCharacterDescription && resolvedCharacterName) {
              const charAnchor = `${resolvedCharacterName}: ${resolvedCharacterDescription.slice(0, 150)}. `;
              const MAX_TOTAL = 480;
              const remainingChars = MAX_TOTAL - charAnchor.length;
              const trimmedScene = scenePrompt.length > remainingChars
                ? scenePrompt.slice(0, remainingChars).replace(/[,;.\s]+$/, "") + "."
                : scenePrompt;
              scenePrompt = charAnchor + trimmedScene;
              console.log(`[SceneDispatch] Scene ${scene.id} TEXT ANCHOR injected for ${resolvedCharacterName}`);
            }

            if (resolvedCharacterUrl) {
              console.log(`[SceneDispatch] Scene ${scene.id} CHARACTER LOCK™ active: ${resolvedCharacterUrl.slice(0, 80)}...`);
            } else {
              console.warn(`[SceneDispatch] Scene ${scene.id} WARNING: no character portrait — rendering text-only`);
            }

            // Dispatch image-to-video ONLY — pass null for audioUrl and sceneStartTime
            // so startSceneRender uses Strategy 2 (image-to-video, no audio).
            // Lip sync is applied separately by Sync Labs after the clip is ready.
            const taskId = await startSceneRender(
              scene.id,
              scenePrompt,
              scene.duration ?? 5,
              false,                          // lipSync=false — no audio in this step
              "natural",
              "atlas_cloud_fast" as any,
              undefined as any,
              scene.previewImageUrl ?? undefined,
              (job.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1",
              job.id,
              resolvedCharacterUrl,
              undefined,                      // audioUrl=undefined — image-to-video only
              undefined                       // sceneStartTime=undefined
            );

            await db
              .update(musicVideoScenes)
              .set({ status: "generating", taskId, updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));

            console.log(`[SceneDispatch] Scene ${scene.id} dispatched → taskId: ${taskId}`);
            totalDispatched++;
          } catch (dispatchErr: any) {
            const errMsg = String(dispatchErr?.message ?? dispatchErr).slice(0, 300);
            console.error(`[SceneDispatch] Failed to dispatch scene ${scene.id}: ${errMsg}`);

            const isBalanceError = errMsg.toLowerCase().includes('insufficient') ||
              errMsg.toLowerCase().includes('balance') ||
              errMsg.toLowerCase().includes('402');
            if (isBalanceError) {
              console.error(`[SceneDispatch] ⚠️ PROVIDER BALANCE EXHAUSTED — Job ${job.id} scenes will retry when credits are topped up.`);
              try {
                const { notifyAtlasExhausted } = await import('../provider-health');
                await notifyAtlasExhausted();
              } catch { /* non-fatal */ }
            }

            try {
              const { sql } = await import('drizzle-orm');
              const safeMsg = `Dispatch failed for scene ${scene.id} (index ${scene.sceneIndex}): ${errMsg}`;
              await db.execute(
                sql`INSERT INTO debugLogs (userId, jobId, sceneId, debugCategory, debugSeverity, debugJobType, message, createdAt) VALUES (${job.userId}, ${job.id}, ${scene.id}, 'api_error', 'error', 'music_video', ${safeMsg}, NOW())`
              );
            } catch { /* ignore logging errors */ }
          }
        }

        // ── 4. Poll generating scenes for completion ───────────────────────────
        for (const scene of generatingScenes) {
          try {
            const sceneAge = Date.now() - new Date(scene.updatedAt).getTime();
            if (sceneAge < 10_000) continue; // Wait at least 10s before first poll
            if (sceneAge > SCENE_STUCK_TIMEOUT_MS) {
              console.warn(`[SceneDispatch] Scene ${scene.id} stuck for ${Math.round(sceneAge / 60000)}min — skipping, reaper will handle`);
              continue;
            }

            const pollResult = await pollSceneStatus(scene.id, scene.taskId!);

            if (pollResult?.status === "completed" && pollResult.videoUrl) {
              // Scene clip is ready. Now check if we need Sync Labs lip sync.
              const needsLipSync = (scene.lipSync ?? false) && job.audioUrl && scene.startTime !== null && scene.startTime !== undefined;

              if (needsLipSync) {
                // Submit to Sync Labs immediately — don't wait for next tick
                try {
                  console.log(`[SceneDispatch] Scene ${scene.id} clip ready — submitting to Sync Labs for lip sync (startTime=${scene.startTime}s)`);
                  const sceneAudioUrl = await extractSceneAudioClip(
                    job.audioUrl!,
                    scene.startTime!,
                    scene.duration ?? 5,
                    scene.id
                  );
                  const syncJobId = await submitSyncLabsLipSync({
                    videoUrl: pollResult.videoUrl,
                    audioUrl: sceneAudioUrl,
                    syncMode: "cut_off",
                    outputFileName: `wizsync-scene-${scene.id}-${Date.now()}`,
                    temperature: 1.0,
                    occlusionDetection: true,
                  });
                  // Mark scene as completed (raw clip) but lip sync as processing
                  await db.update(musicVideoScenes)
                    .set({
                      status: "completed",
                      videoUrl: pollResult.videoUrl,
                      lipSyncStatus: "processing",
                      lipSyncTaskId: syncJobId,
                      updatedAt: new Date(),
                    })
                    .where(eq(musicVideoScenes.id, scene.id));
                  console.log(`[SceneDispatch] Scene ${scene.id} → Sync Labs job ${syncJobId} submitted ✓`);
                  totalLipSyncSubmitted++;
                } catch (syncSubmitErr: any) {
                  // If Sync Labs submission fails, still mark scene completed with raw clip
                  // Assembly will use the raw clip (no lip sync) rather than blocking forever
                  console.error(`[SceneDispatch] Scene ${scene.id} Sync Labs submission failed: ${String(syncSubmitErr?.message ?? syncSubmitErr).slice(0, 200)}`);
                  await db.update(musicVideoScenes)
                    .set({
                      status: "completed",
                      videoUrl: pollResult.videoUrl,
                      lipSyncStatus: "error",
                      updatedAt: new Date(),
                    })
                    .where(eq(musicVideoScenes.id, scene.id));
                }
              } else {
                // No lip sync needed — mark as completed with raw clip
                await db.update(musicVideoScenes)
                  .set({
                    status: "completed",
                    videoUrl: pollResult.videoUrl,
                    lipSyncStatus: "done", // no lip sync needed, treat as done
                    updatedAt: new Date(),
                  })
                  .where(eq(musicVideoScenes.id, scene.id));
                console.log(`[SceneDispatch] Scene ${scene.id} completed (no lip sync needed) ✓`);
              }
              totalPolled++;
            } else if (pollResult?.status === "failed") {
              await db.update(musicVideoScenes)
                .set({
                  status: "pending",
                  taskId: null,
                  errorMessage: null,
                  lipSyncStatus: "pending",
                  lipSyncTaskId: null,
                  updatedAt: new Date(),
                })
                .where(eq(musicVideoScenes.id, scene.id));
              console.warn(`[SceneDispatch] Scene ${scene.id} provider returned failed — reset to pending for retry`);
            }
            // "processing" — do nothing, poll again next tick
          } catch (pollErr: any) {
            console.error(`[SceneDispatch] Poll error for scene ${scene.id}: ${String(pollErr?.message ?? pollErr).slice(0, 200)}`);
          }
        }

        // ── 5. Poll Sync Labs lip sync jobs ────────────────────────────────────
        const lipSyncProcessingScenes = scenes.filter(
          (s) => s.status === "completed" && s.lipSyncStatus === "processing" && s.lipSyncTaskId
        );

        if (lipSyncProcessingScenes.length > 0) {
          const { isSyncLabsConfigured } = await import("../ai-apis/synclabs-lipsync");
          if (!isSyncLabsConfigured()) {
            // Sync Labs not configured — mark all as error so assembly can proceed
            for (const scene of lipSyncProcessingScenes) {
              await db.update(musicVideoScenes)
                .set({ lipSyncStatus: "error", updatedAt: new Date() })
                .where(eq(musicVideoScenes.id, scene.id));
            }
          } else {
            const { SyncClient } = await import("@sync.so/sdk");
            const sync = new SyncClient({ apiKey: process.env.SYNC_LABS_API_KEY! });

            for (const scene of lipSyncProcessingScenes) {
              try {
                const sceneAge = Date.now() - new Date(scene.updatedAt).getTime();

                // If stuck too long, mark as error and use raw clip for assembly
                if (sceneAge > SYNC_LABS_STUCK_TIMEOUT_MS) {
                  console.warn(`[SceneDispatch] Scene ${scene.id} Sync Labs job stuck for ${Math.round(sceneAge / 60000)}min — marking as error, will use raw clip`);
                  await db.update(musicVideoScenes)
                    .set({ lipSyncStatus: "error", updatedAt: new Date() })
                    .where(eq(musicVideoScenes.id, scene.id));
                  continue;
                }

                const generation = await sync.generations.get(scene.lipSyncTaskId!);

                if (generation.status === "COMPLETED") {
                  // The SDK returns outputUrl on the generation object
                  const outputUrl = (generation as any).outputUrl ?? (generation as any).output_url;
                  if (outputUrl) {
                    // Download and re-upload to S3 for permanent storage
                    const { storagePut } = await import("../storage");
                    const resp = await fetch(outputUrl);
                    const buf = Buffer.from(await resp.arrayBuffer());
                    const key = `music-video-scenes/${scene.id}-synclabs-${Date.now()}.mp4`;
                    const { url } = await storagePut(key, buf, "video/mp4");

                    await db.update(musicVideoScenes)
                      .set({
                        lipSyncStatus: "done",
                        lipSyncVideoUrl: url,
                        lipSyncVideoKey: key,
                        updatedAt: new Date(),
                      })
                      .where(eq(musicVideoScenes.id, scene.id));
                    console.log(`[SceneDispatch] Scene ${scene.id} Sync Labs lip sync DONE ✓ → ${url.slice(0, 60)}...`);
                    totalLipSyncPolled++;
                  } else {
                    // Completed but no URL — treat as error
                    console.error(`[SceneDispatch] Scene ${scene.id} Sync Labs COMPLETED but no outputUrl — using raw clip`);
                    await db.update(musicVideoScenes)
                      .set({ lipSyncStatus: "error", updatedAt: new Date() })
                      .where(eq(musicVideoScenes.id, scene.id));
                  }
                } else if (generation.status === "FAILED" || generation.status === "REJECTED") {
                  console.error(`[SceneDispatch] Scene ${scene.id} Sync Labs job ${scene.lipSyncTaskId} ${generation.status} — using raw clip for assembly`);
                  await db.update(musicVideoScenes)
                    .set({ lipSyncStatus: "error", updatedAt: new Date() })
                    .where(eq(musicVideoScenes.id, scene.id));
                } else {
                  console.log(`[SceneDispatch] Scene ${scene.id} Sync Labs status: ${generation.status} — polling next tick`);
                }
              } catch (pollSyncErr: any) {
                console.error(`[SceneDispatch] Sync Labs poll error for scene ${scene.id}: ${String(pollSyncErr?.message ?? pollSyncErr).slice(0, 200)}`);
              }
            }
          }
        }

        // ── 6. Re-check completion after polling ───────────────────────────────
        const freshScenes = await db
          .select()
          .from(musicVideoScenes)
          .where(eq(musicVideoScenes.jobId, job.id));

        const nowCompleted = freshScenes.filter((s) => s.status === "completed");
        const nowFailed = freshScenes.filter((s) => s.status === "failed");
        const nowPending = freshScenes.filter((s) => s.status === "pending" && !s.taskId);
        const nowGenerating = freshScenes.filter((s) => s.status === "generating");

        // Lip sync readiness: a scene is "lip sync ready" if:
        //   - lipSync is false (no lip sync needed) → lipSyncStatus = 'done'
        //   - lipSync is true AND lipSyncStatus is 'done' OR 'error' (error = use raw clip)
        const nowLipSyncReady = nowCompleted.filter(
          (s) => s.lipSyncStatus === "done" || s.lipSyncStatus === "error"
        );
        const nowLipSyncProcessing = nowCompleted.filter(
          (s) => s.lipSyncStatus === "processing"
        );

        // Update completedScenes count on the job
        if (nowCompleted.length !== job.completedScenes) {
          await db
            .update(musicVideoJobs)
            .set({ completedScenes: nowCompleted.length, updatedAt: new Date() })
            .where(eq(musicVideoJobs.id, job.id));
        }

        // ── 7. Trigger assembly when all scenes are done AND all lip sync is ready ──
        const allVideosDone = nowPending.length === 0 && nowGenerating.length === 0;
        const allLipSyncReady = nowLipSyncProcessing.length === 0;
        const hasCompletedScenes = nowCompleted.length > 0;

        if (allVideosDone && allLipSyncReady && hasCompletedScenes) {
          console.log(
            `[SceneDispatch] Job ${job.id} — all scenes done + lip sync ready (${nowLipSyncReady.length} ready). Triggering assembly.`
          );
          try {
            await db
              .update(musicVideoJobs)
              .set({ status: "assembling", updatedAt: new Date() })
              .where(eq(musicVideoJobs.id, job.id));

            // Fire assembly asynchronously — don't block the heartbeat response
            assembleMusicVideo(job.id, "standard" as AudioTier)
              .then(async (finalUrl: string) => {
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
        } else if (allVideosDone && !allLipSyncReady) {
          console.log(`[SceneDispatch] Job ${job.id} — all clips done, waiting for ${nowLipSyncProcessing.length} Sync Labs job(s) to complete...`);
        }

        // ── 8. Never mark job as failed — if all scenes are stuck, reset them ──
        if (allVideosDone && allLipSyncReady && nowCompleted.length === 0 && nowFailed.length > 0) {
          console.warn(`[SceneDispatch] Job ${job.id} — all scenes in failed state. Resetting all to pending for retry.`);
          await db
            .update(musicVideoScenes)
            .set({
              status: "pending",
              taskId: null,
              errorMessage: null,
              lipSyncStatus: "pending",
              lipSyncTaskId: null,
              lipSyncVideoUrl: null,
              updatedAt: new Date(),
            })
            .where(eq(musicVideoScenes.jobId, job.id));
        }
      } catch (jobErr: any) {
        console.error(`[SceneDispatch] Error processing job ${job.id}:`, String(jobErr?.message ?? jobErr).slice(0, 300));
      }
    }

    const summary = {
      ok: true,
      activeJobs: activeJobs.length,
      dispatched: totalDispatched,
      polled: totalPolled,
      lipSyncSubmitted: totalLipSyncSubmitted,
      lipSyncPolled: totalLipSyncPolled,
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
