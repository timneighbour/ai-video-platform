/**
 * sceneDispatchHeartbeat — Heartbeat handler (§4a Project-level Heartbeat)
 *
 * Runs every 60 seconds via Manus platform cron.
 *
 * PURPOSE: Dispatch all pending scenes for active rendering jobs — completely
 * independent of whether any browser tab is open. This is the server-side
 * backbone of the render pipeline.
 *
 * PIPELINE — Strategy 1 (reference-to-video, primary for locked-character music videos):
 *   1. Atlas Cloud reference-to-video → character-consistent clip with audio-driven lip sync
 *      - reference_images: Zara's masterPortraitUrl (Character Lock™)
 *      - reference_audios: exact 6s vocal segment for this scene
 *      - Seedance 2.0 drives mouth movement from audio phonemes
 *   2. Assembly → stitch all clips + original full music track
 *
 * PIPELINE — Strategy 2 (image-to-video, for non-lip-sync scenes):
 *   1. Atlas Cloud image-to-video → silent scene clip with character portrait
 *   2. Assembly → stitch all clips + original full music track
 *
 * PIPELINE — Sync Labs (optional post-processing enhancement):
 *   - Available as fallback or premium enhancement layer
 *   - Applied after reference-to-video if additional lip sync quality is needed
 *
 * STRATEGY ROUTING (per scene):
 *   scene.lipSync=true + job.audioUrl + scene.startTime → Strategy 1 (reference-to-video)
 *   scene.lipSync=false OR no audio                    → Strategy 2 (image-to-video)
 *   no character portrait                              → Strategy 3 (text-to-video fallback)
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
import { startSceneRender, pollSceneStatus } from "../music-video-service";
import { extractSceneAudioClip } from "../audio-clip-extractor";
import { submitSyncLabsLipSync, pollSyncLabsLipSync } from "../ai-apis/synclabs-lipsync";
import { getProbeDecision } from "../pre-render-validator";
import { getVocalStemForCharacter } from "../vocal-isolation-service";
// AudioTier import removed — assembly is now handled exclusively by assemblyWorker.ts

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
    // IMPORTANT: Only process jobs with status='rendering'.
    // Jobs with status='paused', 'cancelled', 'completed', 'failed', 'draft',
    // or 'storyboard_ready' must NEVER be dispatched here.
    // This is a hard guard — do not relax this filter.
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
        songBpm: musicVideoJobs.songBpm,
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
    // SyncLabs concurrency guard: max 2 submissions per heartbeat tick to avoid 429 rate limit errors
    let syncLabsSubmittedThisTick = 0;
    const SYNC_LABS_MAX_PER_TICK = 2;

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

        // ── 3. CONTROLLED VALIDATION: Probe gate ──────────────────────────────
        // Before dispatching ANY scenes, run the pre-render validator and probe gate.
        // probePassed=null  → dispatch only the probe scene (best vocal scene)
        // probePassed=false → probe in progress — block all other scenes
        // probePassed=true  → owner approved — dispatch all remaining scenes
        let pendingProbeSceneId: number | null = null;
        const probeDecision = await getProbeDecision(job.id);

        if (probeDecision.mode === "blocked") {
          console.log(`[SceneDispatch] Job ${job.id} BLOCKED by probe gate: ${probeDecision.reason}`);
          // Log validation failures for visibility
          const failedChecks = probeDecision.validationResult.checks.filter(c => !c.passed);
          if (failedChecks.length > 0) {
            console.warn(`[SceneDispatch] Job ${job.id} failed checks: ${failedChecks.map(c => c.name).join(", ")}`);
          }
          // CRITICAL: Clear pendingScenes so no scenes are dispatched while probe gate is blocking
          pendingScenes.length = 0;
          // Still continue polling and Sync Labs — only block new dispatches
        } else if (probeDecision.mode === "probe_only") {
          // Only dispatch the probe scene — filter pendingScenes to just the probe
          const probeScene = pendingScenes.find(s => s.id === probeDecision.probeSceneId);
          if (probeScene) {
            console.log(`[SceneDispatch] Job ${job.id} PROBE MODE — dispatching only scene ${probeScene.id} (index ${probeScene.sceneIndex}) for QA validation`);
            // Defer marking the probe as in progress until after provider dispatch
            // succeeds and a taskId has been written. This prevents a transient
            // provider/API failure from leaving the job locked in probePassed=false
            // with no actual provider task to poll.
            pendingProbeSceneId = probeScene.id;
            // Replace pendingScenes with just the probe scene for dispatch loop below
            pendingScenes.length = 0;
            pendingScenes.push(probeScene);
          } else {
            console.warn(`[SceneDispatch] Job ${job.id} PROBE MODE — probe scene ${probeDecision.probeSceneId} not found in pending scenes`);
            pendingScenes.length = 0; // Block all dispatches
          }
        } else {
          // full_render — dispatch all pending scenes normally
          console.log(`[SceneDispatch] Job ${job.id} FULL RENDER MODE — probe approved, dispatching ${pendingScenes.length} pending scene(s)`);
        }

        // ── 4. Dispatch pending scenes (filtered by probe gate above) ──────────
        // STRATEGY ROUTING:
        //   image-to-video (storyboard image as starting frame, generate_audio:false)
        //   + Sync Labs lip sync for vocal scenes (lipSync=true)
        for (const scene of pendingScenes) {
          try {
            const willUseLipSync = (scene.lipSync ?? false) && !!job.audioUrl && scene.startTime !== null && scene.startTime !== undefined;
            console.log(
              `[SceneDispatch] Dispatching scene ${scene.id} (index ${scene.sceneIndex}) for job ${job.id} — strategy: ${willUseLipSync ? 'REFERENCE-TO-VIDEO (lip sync)' : 'IMAGE-TO-VIDEO'}`
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

            // ── BPM INJECTION: append tempo guidance to every render prompt ────────
            if (job.songBpm) {
              const tempoDesc = job.songBpm < 90 ? 'slow, graceful, flowing' : job.songBpm < 120 ? 'moderate, natural-paced' : 'energetic, dynamic, fast';
              scenePrompt += ` Tempo: ${job.songBpm} BPM. All movement must be ${tempoDesc}.`;
            }

            // ── STRATEGY DISPATCH ─────────────────────────────────────────────
            // Pass scene.lipSync, job.audioUrl, and scene.startTime so startSceneRender
            // can select the correct strategy:
            //   Strategy 1: lipSync=true + audioUrl + startTime → reference-to-video
            //   Strategy 2: lipSync=false or no audio → image-to-video
            //   Strategy 3: no character image → text-to-video
            // ── PROVIDER OVERRIDE: respect job.fallbackProvider ───────────────
            // If the job has fallbackProvider='wavespeed', force WaveSpeed routing.
            // This survives Cloud Run cold starts (in-memory circuit breaker resets).
            const forcedRenderer = job.fallbackProvider === "wavespeed" ? "wavespeed" : "atlas_cloud_fast";
            console.log(`[SceneDispatch] Scene ${scene.id} renderer: ${forcedRenderer} (fallbackProvider=${job.fallbackProvider ?? 'none'})`);
            const taskId = await startSceneRender(
              scene.id,
              scenePrompt,
              scene.duration ?? 5,
              scene.lipSync ?? false,         // ✅ per-scene lip sync flag (Strategy 1 trigger)
              scene.lipSyncStyle ?? "natural",
              forcedRenderer as any,
              undefined as any,
              scene.previewImageUrl ?? undefined,
              (job.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1",
              job.id,
              resolvedCharacterUrl,
              job.audioUrl ?? undefined,      // ✅ full music track URL (no /1000 division needed)
              scene.startTime ?? undefined    // ✅ scene start time in seconds (already correct unit)
            );

            await db
              .update(musicVideoScenes)
              .set({ status: "generating", taskId, updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));

            if (pendingProbeSceneId === scene.id) {
              await db.update(musicVideoJobs)
                .set({ probePassed: false, probeSceneId: scene.id, updatedAt: new Date() })
                .where(eq(musicVideoJobs.id, job.id));
              console.log(`[SceneDispatch] Job ${job.id} PROBE MODE — marked scene ${scene.id} in progress after taskId persisted`);
            }

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
              // Scene clip is ready.

              // ── LIP SYNC PROVIDER: SyncLabs sync-3 (primary) ──
              // DECISION (2026-05-19): Hedra Character 3 does NOT produce convincing lip sync.
              // SyncLabs sync-3 is the production lip sync provider for ALL scene types
              // (both Performance Mode and Cinematic). SyncLabs preserves original character
              // appearance and produces visible mouth movement synced to isolated vocals.
              // Hedra code remains available but is NOT auto-triggered.

              // Check if we need Sync Labs lip sync (for ALL scenes with vocals)
              // Performance Mode scenes ALWAYS get lip sync (they are close-up singing shots)
              // Cinematic scenes use the per-scene lipSync flag from vocal-aware assignment
              const isPerformanceScene = scene.sceneType === "performance";
              const needsLipSync = (isPerformanceScene || (scene.lipSync ?? false)) && job.audioUrl && scene.startTime !== null && scene.startTime !== undefined;

              if (needsLipSync) {
                // Rate-limit SyncLabs submissions: max 2 per heartbeat tick
                if (syncLabsSubmittedThisTick >= SYNC_LABS_MAX_PER_TICK) {
                  // Mark scene completed with raw clip for now; lip sync will be submitted next tick
                  await db.update(musicVideoScenes)
                    .set({ status: "completed", videoUrl: pollResult.videoUrl, lipSyncStatus: "pending", updatedAt: new Date() })
                    .where(eq(musicVideoScenes.id, scene.id));
                  console.log(`[SceneDispatch] Scene ${scene.id} clip ready — SyncLabs rate limit reached (${syncLabsSubmittedThisTick}/${SYNC_LABS_MAX_PER_TICK}), will submit next tick`);
                } else {
                // Submit to Sync Labs
                // AUDIO STRATEGY (2026-05-19):
                //   - SyncLabs receives ISOLATED VOCALS for best lip sync accuracy
                //   - If sceneAudioUrl exists (pre-isolated Demucs vocals), use that
                //   - Otherwise fall back to extractSceneAudioClip (full mix segment)
                //   - Final assembly always uses the ORIGINAL FULL MIX audio track (job.audioUrl)
                try {
                  // scene.startTime is stored in seconds for current music-video rows.
                  // Guard legacy millisecond rows by converting only implausibly large values.
                  const rawStartTime = scene.startTime ?? 0;
                  const startTimeSec = rawStartTime > 300 ? rawStartTime / 1000 : rawStartTime;
                  console.log(`[SceneDispatch] Scene ${scene.id} clip ready — submitting to Sync Labs for lip sync (startTime=${startTimeSec}s, raw=${scene.startTime})`);
                  // VOCAL ISOLATION STRATEGY (2026-05-19):
                  //   1. Look up the character's assigned vocal stem from musicVideoVocalStems
                  //   2. Cut the exact scene segment from that isolated stem
                  //   3. Fall back to full mix segment ONLY if no stem is available
                  //   Final assembly ALWAYS uses original full mix (job.audioUrl) — SyncLabs audio is stripped
                  let sceneAudioUrl: string;
                  const characterName = (scene as any).characterName ?? undefined;
                  const isolatedVocalsUrl = await getVocalStemForCharacter(job.id, characterName);
                  if (isolatedVocalsUrl) {
                    // Cut the scene's time window from the isolated vocals stem
                    sceneAudioUrl = await extractSceneAudioClip(
                      isolatedVocalsUrl,
                      startTimeSec,
                      scene.duration ?? 5,
                      scene.id
                    );
                    console.log(`[SceneDispatch] Scene ${scene.id}: using isolated vocals stem for SyncLabs ✓ (character: ${characterName ?? 'lead'})`);
                  } else if ((scene as any).sceneAudioUrl) {
                    sceneAudioUrl = (scene as any).sceneAudioUrl;
                    console.log(`[SceneDispatch] Scene ${scene.id}: using pre-set sceneAudioUrl for SyncLabs`);
                  } else {
                    sceneAudioUrl = await extractSceneAudioClip(
                      job.audioUrl!,
                      startTimeSec,
                      scene.duration ?? 5,
                      scene.id
                    );
                    console.warn(`[SceneDispatch] Scene ${scene.id}: ⚠ no isolated vocals — falling back to full mix segment`);
                  }
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
                  syncLabsSubmittedThisTick++;
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
                } // end else (syncLabsSubmittedThisTick < SYNC_LABS_MAX_PER_TICK)
              } else { // needsLipSync is false
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

              // ── PROBE: store probeVideoUrl on job when probe scene completes ──
              try {
                const [currentJob] = await db.select({ probeSceneId: musicVideoJobs.probeSceneId, probePassed: musicVideoJobs.probePassed })
                  .from(musicVideoJobs).where(eq(musicVideoJobs.id, job.id));
                if (currentJob?.probeSceneId === scene.id && (currentJob?.probePassed === false || (currentJob?.probePassed as any) === 0)) {
                  // Only set probeVideoUrl here if this scene does NOT need lip sync.
                  // For lip sync scenes, the lip sync poller below will set probeVideoUrl
                  // to the lip-synced version (with correct audio) — don't overwrite it with the raw clip.
                  const needsLipSyncForProbe = (scene.lipSync ?? false) && !!job.audioUrl;
                  if (!needsLipSyncForProbe) {
                    const probeUrl = pollResult.videoUrl;
                    await db.update(musicVideoJobs)
                      .set({ probeVideoUrl: probeUrl, updatedAt: new Date() })
                      .where(eq(musicVideoJobs.id, job.id));
                    console.log(`[SceneDispatch] Job ${job.id} PROBE COMPLETE (no lip sync) — raw video ready for owner review: ${probeUrl.slice(0, 60)}...`);
                  } else {
                    console.log(`[SceneDispatch] Job ${job.id} probe scene ${scene.id} clip ready — waiting for lip sync before setting probeVideoUrl`);
                  }
                }
              } catch { /* non-fatal */ }
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

        // ── 4b. Re-submit completed scenes whose lip sync is still pending ─────
        // These are scenes that completed WaveSpeed generation but SyncLabs submission
        // was deferred (rate limit) or failed and needs retry.
        const lipSyncPendingScenes = scenes.filter(
          (s) => s.status === "completed" && s.lipSyncStatus === "pending" && !s.lipSyncTaskId
        );

        if (lipSyncPendingScenes.length > 0) {
          const { isSyncLabsConfigured: isSyncLabsConfiguredForRetry, submitSyncLabsLipSync: submitSyncLabsForRetry } = await import("../ai-apis/synclabs-lipsync");
          if (isSyncLabsConfiguredForRetry()) {
            for (const scene of lipSyncPendingScenes) {
              if (syncLabsSubmittedThisTick >= SYNC_LABS_MAX_PER_TICK) break;
              const isPerformanceScene = scene.sceneType === "performance";
              const needsLipSync = (isPerformanceScene || (scene.lipSync ?? false)) && job.audioUrl && scene.startTime !== null && scene.startTime !== undefined;
              if (!needsLipSync || !scene.videoUrl) continue;
              try {
                const retryRawStartTime = scene.startTime ?? 0;
                const startTimeSec = retryRawStartTime > 300 ? retryRawStartTime / 1000 : retryRawStartTime;
                console.log(`[SceneDispatch] Scene ${scene.id} RETRY lip sync submission (startTime=${startTimeSec}s, raw=${scene.startTime})`);
                let sceneAudioUrl: string;
                const retryCharacterName = (scene as any).characterName ?? undefined;
                const retryIsolatedVocalsUrl = await getVocalStemForCharacter(job.id, retryCharacterName);
                if (retryIsolatedVocalsUrl) {
                  const { extractSceneAudioClip: extractForRetry } = await import("../audio-clip-extractor");
                  sceneAudioUrl = await extractForRetry(
                    retryIsolatedVocalsUrl,
                    startTimeSec,
                    scene.duration ?? 5,
                    scene.id
                  );
                  console.log(`[SceneDispatch] Scene ${scene.id} RETRY: using isolated vocals stem ✓`);
                } else if ((scene as any).sceneAudioUrl) {
                  sceneAudioUrl = (scene as any).sceneAudioUrl;
                } else {
                  const { extractSceneAudioClip: extractForRetry } = await import("../audio-clip-extractor");
                  sceneAudioUrl = await extractForRetry(
                    job.audioUrl!,
                    startTimeSec,
                    scene.duration ?? 5,
                    scene.id
                  );
                  console.warn(`[SceneDispatch] Scene ${scene.id} RETRY: ⚠ no isolated vocals — falling back to full mix`);
                }
                const syncJobId = await submitSyncLabsForRetry({
                  videoUrl: scene.videoUrl,
                  audioUrl: sceneAudioUrl,
                  syncMode: "cut_off",
                  outputFileName: `wizsync-scene-${scene.id}-retry-${Date.now()}`,
                  temperature: 1.0,
                  occlusionDetection: true,
                });
                await db.update(musicVideoScenes)
                  .set({ lipSyncStatus: "processing", lipSyncTaskId: syncJobId, updatedAt: new Date() })
                  .where(eq(musicVideoScenes.id, scene.id));
                console.log(`[SceneDispatch] Scene ${scene.id} RETRY → Sync Labs job ${syncJobId} submitted ✓`);
                syncLabsSubmittedThisTick++;
                totalLipSyncSubmitted++;
              } catch (retryErr: any) {
                console.error(`[SceneDispatch] Scene ${scene.id} RETRY lip sync failed: ${String(retryErr?.message ?? retryErr).slice(0, 200)}`);
                await db.update(musicVideoScenes)
                  .set({ lipSyncStatus: "error", updatedAt: new Date() })
                  .where(eq(musicVideoScenes.id, scene.id));
              }
            }
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

                    // ── PROBE: if this is the probe scene, set probeVideoUrl (lip-synced version) ──
                    try {
                      const [currentJob] = await db.select({ probeSceneId: musicVideoJobs.probeSceneId, probePassed: musicVideoJobs.probePassed })
                        .from(musicVideoJobs).where(eq(musicVideoJobs.id, job.id));
                      if (currentJob?.probeSceneId === scene.id && (currentJob?.probePassed === false || (currentJob?.probePassed as any) === 0)) {
                        await db.update(musicVideoJobs)
                          .set({ probeVideoUrl: url, updatedAt: new Date() })
                          .where(eq(musicVideoJobs.id, job.id));
                        console.log(`[SceneDispatch] Job ${job.id} PROBE LIP SYNC COMPLETE — lip-synced video ready for owner review: ${url.slice(0, 60)}...`);
                      }
                    } catch { /* non-fatal */ }
                  }
                  if (!outputUrl) {
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
          // ARCHITECTURE NOTE (2026-05-19):
          // The heartbeat ONLY sets status='assembling'. It does NOT call assembleMusicVideo.
          // The assemblyWorker (server/assemblyWorker.ts) is the sole caller of assembleMusicVideo.
          // This ensures assembly always runs outside the HTTP request lifecycle and is never
          // killed by Cloud Run's 180-second request timeout.
          // The assemblyWorker polls every 2 minutes and picks up newly-queued jobs within 2 min.
          console.log(
            `[SceneDispatch] Job ${job.id} — all scenes done + lip sync ready (${nowLipSyncReady.length} ready). Queuing for assembly (assemblyWorker will pick up within 2 min).`
          );
          try {
            await db
              .update(musicVideoJobs)
              .set({ status: "assembling", assemblyStartedAt: new Date(), updatedAt: new Date() })
              .where(eq(musicVideoJobs.id, job.id));
            totalAssembled++;
          } catch (assemblyTriggerErr: any) {
            console.error(`[SceneDispatch] Failed to queue job ${job.id} for assembly:`, assemblyTriggerErr);
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
