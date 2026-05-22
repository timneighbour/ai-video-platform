/**
 * sceneDispatchHeartbeat — Heartbeat handler (§4a Project-level Heartbeat)
 *
 * Runs every 60 seconds via Manus platform cron.
 *
 * PURPOSE: Dispatch all pending scenes for active rendering jobs — completely
 * independent of whether any browser tab is open. This is the server-side
 * backbone of the render pipeline.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CANONICAL 5-STAGE WIZ AI COMPOSITING PIPELINE (LOCKED 2026-05-22)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * STAGE 1 — CINEMATIC WORLD (Seedance)
 *   Generate Air Studios / Lyndhurst Hall environment.
 *   Cinematic scenes: no character face visible.
 *   Performance scenes: placeholder clip (background reference only).
 *
 * STAGE 2 — PERFORMANCE PLATE (InfiniteTalk)
 *   Generate Zara's facial performance (lip sync + emotional articulation).
 *   Input: tight head-and-shoulders crop of Portrait B (auto-cropped by face-crop-service).
 *   Audio: isolated Demucs vocal stem (HARD GUARD — never full mix).
 *   Output: raw performance plate (grey background — this is correct).
 *
 * STAGE 3 — MATTE EXTRACTION (ffmpeg chromakey)
 *   Remove grey background from InfiniteTalk output.
 *   Handled inline during Stage 4 compositing (no separate file produced).
 *
 * STAGE 4 — CINEMATIC COMPOSITING (ffmpeg overlay)
 *   Composite Zara performance matte onto Seedance concert hall background.
 *   Output: compositeVideoUrl — Zara singing inside Air Studios (1280x720).
 *   This is the final performance scene clip used in assembly.
 *
 * STAGE 5 — FINAL AUDIO RESTORATION (assembly worker)
 *   Assembly uses original mastered full mix (never vocal stem).
 *   Handled by assemblyWorker.ts (not here).
 *
 * SCENE TYPE ROUTING:
 *   performance (lipSync=true):  All 5 stages.
 *   cinematic (lipSync=false):   Stage 1 only. compositeStatus=skipped.
 *
 * ASSEMBLY GATE:
 *   All performance scenes must have compositeStatus=done (or error).
 *   All cinematic scenes must have compositeStatus=skipped.
 *   Only then does the heartbeat queue the job for assembly.
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
import { submitWaveSpeedInfiniteTalk, pollWaveSpeedInfiniteTalk } from "../ai-apis/wavespeed";
// SyncLabs import retained for legacy polling of in-flight jobs only — NOT used for new submissions
import { pollSyncLabsLipSync } from "../ai-apis/synclabs-lipsync";
import { getProbeDecision } from "../pre-render-validator";
import { getVocalStemForCharacter } from "../vocal-isolation-service";
import { getCroppedPortraitForInfiniteTalk } from "../face-crop-service";
import { compositeCinematicScene, compositeCinematicSceneFallback } from "../cinematic-composite-service";
// AudioTier import removed — assembly is now handled exclusively by assemblyWorker.ts

const SCENE_STUCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes — reaper handles beyond this
const SYNC_LABS_STUCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes max for legacy Sync Labs jobs
const INFINITETALK_STUCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes max for InfiniteTalk
const COMPOSITE_STUCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes max for compositing
const MAX_COMPOSITE_ATTEMPTS = 3; // Max compositing retries before marking error

export async function sceneDispatchHeartbeatHandler(req: Request, res: Response) {
  const startedAt = Date.now();

  // Authenticate via Manus cron session
  // DEV BYPASS: allow local dev calls with X-Dev-Bypass header
  const isDevBypass = process.env.NODE_ENV === 'development' && req.headers['x-dev-bypass'] === 'scene-dispatch-2026';
  if (!isDevBypass) {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) {
        return res.status(403).json({ error: "cron-only endpoint" });
      }
    } catch {
      return res.status(403).json({ error: "authentication failed" });
    }
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
        vocalsStatus: musicVideoJobs.vocalsStatus,
        updatedAt: musicVideoJobs.updatedAt,
        songBpm: musicVideoJobs.songBpm,
        probeSceneId: musicVideoJobs.probeSceneId,
        probePassed: musicVideoJobs.probePassed,
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
        compositeStarted: 0,
        compositeCompleted: 0,
        assembled: 0,
        durationMs: Date.now() - startedAt,
      });
    }

    // ── JOB SERIALISATION GUARD ────────────────────────────────────────────────
    // Only ONE job may dispatch new scenes at a time to prevent concurrent jobs
    // from competing for provider credits (WaveSpeed, Fal.ai, etc.).
    // The job with the LOWEST id (oldest) gets the dispatch slot.
    // All other jobs still poll for completions and run assembly — they just
    // cannot submit NEW scene tasks until the active job finishes.
    const sortedJobs = [...activeJobs].sort((a, b) => a.id - b.id);
    const dispatchSlotJobId = sortedJobs[0].id;
    if (activeJobs.length > 1) {
      console.log(`[SceneDispatch] SERIALISATION: ${activeJobs.length} active jobs — only job ${dispatchSlotJobId} may dispatch new scenes this tick. Others will poll only.`);
    }

    let totalDispatched = 0;
    let totalPolled = 0;
    let totalLipSyncSubmitted = 0;
    let totalLipSyncPolled = 0;
    let totalCompositeStarted = 0;
    let totalCompositeCompleted = 0;
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
        // SERIALISATION: if this job does not hold the dispatch slot, suppress new dispatches.
        // It will still poll generating scenes and trigger assembly.
        const holdsDispatchSlot = job.id === dispatchSlotJobId;
        const pendingScenes = holdsDispatchSlot
          ? scenes.filter((s) => s.status === "pending" && !s.taskId)
          : []; // Non-priority jobs: poll only, no new dispatches
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
                compositeStatus: "pending",
                compositeVideoUrl: null,
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
        //   + WaveSpeed InfiniteTalk lip sync for performance scenes (sceneType='performance')
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

            // Mark cinematic scenes as compositeStatus=skipped immediately
            // (they don't need compositing — Seedance clip is used directly)
            const isPerformanceScene = scene.sceneType === "performance";
            const initialCompositeStatus = isPerformanceScene ? "pending" : "skipped";

            await db
              .update(musicVideoScenes)
              .set({ status: "generating", taskId, compositeStatus: initialCompositeStatus as any, updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));

            if (pendingProbeSceneId === scene.id) {
              await db.update(musicVideoJobs)
                .set({ probePassed: false, probeSceneId: scene.id, updatedAt: new Date() })
                .where(eq(musicVideoJobs.id, job.id));
              console.log(`[SceneDispatch] Job ${job.id} PROBE MODE — marked scene ${scene.id} in progress after taskId persisted`);
            }

            console.log(`[SceneDispatch] Scene ${scene.id} dispatched → taskId: ${taskId}, compositeStatus: ${initialCompositeStatus}`);
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

              // ── LIP SYNC PROVIDER: WaveSpeed InfiniteTalk (LOCKED — canonical engine) ──
              // DECISION (2026-05-22): InfiniteTalk is the ONLY approved lip sync engine.
              // It takes a character portrait + isolated vocal stem and generates a
              // believable performance video directly. No SyncLabs, no Hedra, no fallback.
              //
              // AUDIO CONTRACT (non-negotiable):
              //   A. Lip-sync DRIVER = isolated Demucs vocal stem (this section)
              //   B. Final playback  = original mastered full mix (assembly only)
              // These two are NEVER interchangeable.
              //
              // HARD GUARD: If vocalsStatus='done' (isolated stem exists), the system
              // MUST use the isolated stem. Full-mix fallback is a production failure.

              const isPerformanceScene = scene.sceneType === "performance";
              const needsLipSync = (isPerformanceScene || (scene.lipSync ?? false)) && job.audioUrl && scene.startTime !== null && scene.startTime !== undefined;

              if (needsLipSync) {
                // Mark scene completed with raw clip, then submit InfiniteTalk
                // (InfiniteTalk generates a new performance video from portrait + audio;
                //  the raw Seedance clip is stored as videoUrl for cinematic reference)
                try {
                  const rawStartTime = scene.startTime ?? 0;
                  const startTimeSec = rawStartTime > 300 ? rawStartTime / 1000 : rawStartTime;
                  console.log(`[SceneDispatch] Scene ${scene.id} clip ready — submitting to InfiniteTalk (startTime=${startTimeSec}s, raw=${scene.startTime})`);

                  // HARD GUARD: isolated vocals MUST be used when available
                  const characterName = (scene as any).characterName ?? undefined;
                  const isolatedVocalsUrl = await getVocalStemForCharacter(job.id, characterName);

                  if (!isolatedVocalsUrl && job.vocalsStatus === "done") {
                    // vocalsStatus=done but stem lookup failed — this is a data integrity error
                    throw new Error(`[HARD GUARD] Scene ${scene.id}: vocalsStatus=done but no stem found for character '${characterName ?? 'lead'}' — refusing full-mix fallback`);
                  }

                  if (!isolatedVocalsUrl) {
                    // No vocals isolated yet — defer lip sync, mark raw clip complete
                    await db.update(musicVideoScenes)
                      .set({ status: "completed", videoUrl: pollResult.videoUrl, lipSyncStatus: "pending", updatedAt: new Date() })
                      .where(eq(musicVideoScenes.id, scene.id));
                    console.log(`[SceneDispatch] Scene ${scene.id}: no vocal stem yet — raw clip saved, lip sync deferred`);
                  } else {
                    // Cut the scene's time window from the isolated vocals stem
                    const sceneAudioUrl = await extractSceneAudioClip(
                      isolatedVocalsUrl,
                      startTimeSec,
                      scene.duration ?? 5,
                      scene.id
                    );
                    console.log(`[SceneDispatch] Scene ${scene.id}: isolated vocals stem cut ✓ (character: ${characterName ?? 'lead'}, window: ${startTimeSec}–${startTimeSec + (scene.duration ?? 5)}s)`);

                    // ── STAGE 2 FIX: Auto face-crop Portrait B before InfiniteTalk ──
                    // Get the character portrait for InfiniteTalk (polling scope — look up from videoCharacters)
                    let heroImageUrl: string | null = (scene as any).heroImageUrl ?? job.characterImageUrl ?? null;
                    try {
                      const { videoCharacters: vcPoll } = await import("../../drizzle/schema");
                      const { eq: eqPoll } = await import("drizzle-orm");
                      const pollChars = await db.select().from(vcPoll).where(eqPoll(vcPoll.jobId, job.id));
                      const bestPollChar = pollChars.find(c => c.masterPortraitUrl) ?? pollChars[0];
                      if (bestPollChar?.masterPortraitUrl) heroImageUrl = bestPollChar.masterPortraitUrl;
                    } catch { /* non-fatal — use fallback */ }
                    if (!heroImageUrl) {
                      throw new Error(`Scene ${scene.id}: no heroImageUrl or characterImageUrl for InfiniteTalk`);
                    }

                    // STAGE 2 FIX: Auto-crop portrait to head-and-shoulders
                    // This prevents the "head cut off" problem where InfiniteTalk
                    // animates a full-body fashion photo and the face is at the top
                    // of the frame, getting cropped out when normalised to 16:9.
                    let croppedPortraitUrl: string = heroImageUrl;
                    try {
                      croppedPortraitUrl = await getCroppedPortraitForInfiniteTalk(heroImageUrl, scene.id);
                      console.log(`[SceneDispatch] Scene ${scene.id}: portrait auto-cropped to head-and-shoulders ✓`);
                    } catch (cropErr: any) {
                      console.warn(`[SceneDispatch] Scene ${scene.id}: face-crop failed (${String(cropErr?.message ?? cropErr).slice(0, 100)}), using original portrait`);
                      croppedPortraitUrl = heroImageUrl; // fallback to original
                    }

                    // Submit to WaveSpeed InfiniteTalk with cropped portrait
                    const itTaskId = await submitWaveSpeedInfiniteTalk({
                      image: croppedPortraitUrl,
                      audio: sceneAudioUrl,
                      prompt: scene.prompt ?? "Singer performing at a vintage microphone in a warm concert hall, cinematic lighting, emotional performance",
                      duration: scene.duration ?? 5,
                      resolution: "720p",
                    });

                    // Mark scene completed (raw Seedance clip) + lip sync processing (InfiniteTalk)
                    await db.update(musicVideoScenes)
                      .set({
                        status: "completed",
                        videoUrl: pollResult.videoUrl,
                        lipSyncStatus: "processing",
                        lipSyncTaskId: itTaskId,
                        updatedAt: new Date(),
                      })
                      .where(eq(musicVideoScenes.id, scene.id));
                    console.log(`[SceneDispatch] Scene ${scene.id} → InfiniteTalk task ${itTaskId} submitted ✓`);
                    totalLipSyncSubmitted++;
                    syncLabsSubmittedThisTick++; // reuse counter for rate limiting
                  }
                } catch (itSubmitErr: any) {
                  // InfiniteTalk submission failed — mark error, do NOT silently fall back
                  console.error(`[SceneDispatch] Scene ${scene.id} InfiniteTalk submission FAILED: ${String(itSubmitErr?.message ?? itSubmitErr).slice(0, 300)}`);
                  await db.update(musicVideoScenes)
                    .set({
                      status: "completed",
                      videoUrl: pollResult.videoUrl,
                      lipSyncStatus: "error",
                      updatedAt: new Date(),
                    })
                    .where(eq(musicVideoScenes.id, scene.id));
                }
              } else { // needsLipSync is false — cinematic scene
                // No lip sync needed — mark as completed with raw clip
                // compositeStatus=skipped for cinematic scenes (Seedance clip used directly in assembly)
                await db.update(musicVideoScenes)
                  .set({
                    status: "completed",
                    videoUrl: pollResult.videoUrl,
                    lipSyncStatus: "done", // no lip sync needed, treat as done
                    compositeStatus: "skipped", // cinematic scene — no compositing needed
                    updatedAt: new Date(),
                  })
                  .where(eq(musicVideoScenes.id, scene.id));
                console.log(`[SceneDispatch] Scene ${scene.id} completed (cinematic, no lip sync, compositeStatus=skipped) ✓`);
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
                  lipSyncVideoUrl: null,
                  compositeStatus: "pending",
                  compositeVideoUrl: null,
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
          // RETRY: scenes that completed Seedance but InfiniteTalk submission was deferred
          for (const scene of lipSyncPendingScenes) {
            if (syncLabsSubmittedThisTick >= SYNC_LABS_MAX_PER_TICK) break;
            const isPerformanceScene = scene.sceneType === "performance";
            const needsLipSync = (isPerformanceScene || (scene.lipSync ?? false)) && job.audioUrl && scene.startTime !== null && scene.startTime !== undefined;
            if (!needsLipSync || !scene.videoUrl) continue;
            try {
              const retryRawStartTime = scene.startTime ?? 0;
              const startTimeSec = retryRawStartTime > 300 ? retryRawStartTime / 1000 : retryRawStartTime;
              const retryCharacterName = (scene as any).characterName ?? undefined;
              const retryIsolatedVocalsUrl = await getVocalStemForCharacter(job.id, retryCharacterName);

              if (!retryIsolatedVocalsUrl) {
                console.log(`[SceneDispatch] Scene ${scene.id} RETRY: no vocal stem yet — deferring`);
                continue;
              }

              const sceneAudioUrl = await extractSceneAudioClip(
                retryIsolatedVocalsUrl,
                startTimeSec,
                scene.duration ?? 5,
                scene.id
              );
              console.log(`[SceneDispatch] Scene ${scene.id} RETRY: isolated vocals stem cut ✓`);

              // For RETRY: look up character portrait from videoCharacters table
              let retryHeroImageUrl: string | null = (scene as any).heroImageUrl ?? job.characterImageUrl ?? null;
              try {
                const { videoCharacters: vcTable } = await import("../../drizzle/schema");
                const { eq: eqVc } = await import("drizzle-orm");
                const chars = await db.select().from(vcTable).where(eqVc(vcTable.jobId, job.id));
                const bestRetryChar = chars.find(c => c.masterPortraitUrl) ?? chars[0];
                if (bestRetryChar?.masterPortraitUrl) retryHeroImageUrl = bestRetryChar.masterPortraitUrl;
              } catch { /* non-fatal — use fallback */ }
              const heroImageUrl = retryHeroImageUrl;
              if (!heroImageUrl) throw new Error(`Scene ${scene.id} RETRY: no heroImageUrl for InfiniteTalk`);

              // STAGE 2 FIX: Auto-crop portrait for retry submissions too
              let retryCroppedPortraitUrl: string = heroImageUrl;
              try {
                retryCroppedPortraitUrl = await getCroppedPortraitForInfiniteTalk(heroImageUrl, `${scene.id}-retry`);
                console.log(`[SceneDispatch] Scene ${scene.id} RETRY: portrait auto-cropped ✓`);
              } catch (cropErr: any) {
                console.warn(`[SceneDispatch] Scene ${scene.id} RETRY: face-crop failed, using original`);
              }

              const itTaskId = await submitWaveSpeedInfiniteTalk({
                image: retryCroppedPortraitUrl,
                audio: sceneAudioUrl,
                prompt: scene.prompt ?? "Singer performing at a vintage microphone in a warm concert hall, cinematic lighting, emotional performance",
                duration: scene.duration ?? 5,
                resolution: "720p",
              });
              await db.update(musicVideoScenes)
                .set({ lipSyncStatus: "processing", lipSyncTaskId: itTaskId, updatedAt: new Date() })
                .where(eq(musicVideoScenes.id, scene.id));
              console.log(`[SceneDispatch] Scene ${scene.id} RETRY → InfiniteTalk task ${itTaskId} submitted ✓`);
              syncLabsSubmittedThisTick++;
              totalLipSyncSubmitted++;
            } catch (retryErr: any) {
              console.error(`[SceneDispatch] Scene ${scene.id} RETRY InfiniteTalk failed: ${String(retryErr?.message ?? retryErr).slice(0, 200)}`);
              await db.update(musicVideoScenes)
                .set({ lipSyncStatus: "error", updatedAt: new Date() })
                .where(eq(musicVideoScenes.id, scene.id));
            }
          }
        }

        // ── 5. Poll WaveSpeed InfiniteTalk lip sync jobs ──────────────────────
        const lipSyncProcessingScenes = scenes.filter(
          (s) => s.status === "completed" && s.lipSyncStatus === "processing" && s.lipSyncTaskId
        );

        if (lipSyncProcessingScenes.length > 0) {
          for (const scene of lipSyncProcessingScenes) {
            try {
              const sceneAge = Date.now() - new Date(scene.updatedAt).getTime();

              if (sceneAge > INFINITETALK_STUCK_TIMEOUT_MS) {
                console.warn(`[SceneDispatch] Scene ${scene.id} InfiniteTalk job stuck for ${Math.round(sceneAge / 60000)}min — marking as error`);
                await db.update(musicVideoScenes)
                  .set({ lipSyncStatus: "error", updatedAt: new Date() })
                  .where(eq(musicVideoScenes.id, scene.id));
                continue;
              }

              const pollResult = await pollWaveSpeedInfiniteTalk(scene.lipSyncTaskId!);

              if (pollResult.status === "completed" && pollResult.videoUrl) {
                // Download and re-upload to S3 for permanent storage
                const { storagePut } = await import("../storage");
                const resp = await fetch(pollResult.videoUrl);
                const buf = Buffer.from(await resp.arrayBuffer());
                const key = `music-video-scenes/${scene.id}-infinitetalk-${Date.now()}.mp4`;
                const { url } = await storagePut(key, buf, "video/mp4");

                await db.update(musicVideoScenes)
                  .set({
                    lipSyncStatus: "done",
                    lipSyncVideoUrl: url,
                    lipSyncVideoKey: key,
                    // STAGE 4: Mark compositeStatus=pending so compositing can start
                    // (compositing will pick this up in the next section)
                    compositeStatus: "pending",
                    updatedAt: new Date(),
                  })
                  .where(eq(musicVideoScenes.id, scene.id));
                console.log(`[SceneDispatch] Scene ${scene.id} InfiniteTalk lip sync DONE ✓ → compositeStatus=pending`);
                totalLipSyncPolled++;

                // ── PROBE: if this is the probe scene, set probeVideoUrl (lip-synced version) ──
                try {
                  const [currentJob] = await db.select({ probeSceneId: musicVideoJobs.probeSceneId, probePassed: musicVideoJobs.probePassed })
                    .from(musicVideoJobs).where(eq(musicVideoJobs.id, job.id));
                  if (currentJob?.probeSceneId === scene.id && (currentJob?.probePassed === false || (currentJob?.probePassed as any) === 0)) {
                    await db.update(musicVideoJobs)
                      .set({ probeVideoUrl: url, updatedAt: new Date() })
                      .where(eq(musicVideoJobs.id, job.id));
                    console.log(`[SceneDispatch] Job ${job.id} PROBE INFINITETALK COMPLETE — lip-synced video ready for owner review: ${url.slice(0, 60)}...`);
                  }
                } catch { /* non-fatal */ }

              } else if (pollResult.status === "failed") {
                console.error(`[SceneDispatch] Scene ${scene.id} InfiniteTalk job ${scene.lipSyncTaskId} FAILED`);
                await db.update(musicVideoScenes)
                  .set({ lipSyncStatus: "error", updatedAt: new Date() })
                  .where(eq(musicVideoScenes.id, scene.id));
              } else {
                console.log(`[SceneDispatch] Scene ${scene.id} InfiniteTalk status: ${pollResult.status} — polling next tick`);
              }
            } catch (pollItErr: any) {
              console.error(`[SceneDispatch] InfiniteTalk poll error for scene ${scene.id}: ${String(pollItErr?.message ?? pollItErr).slice(0, 200)}`);
            }
          }
        }

        // ── 5b. STAGE 4: Run cinematic compositing for scenes where lipSync=done ──
        // Re-fetch scenes to get the latest lipSyncStatus after polling above
        const freshScenesForComposite = await db
          .select()
          .from(musicVideoScenes)
          .where(eq(musicVideoScenes.jobId, job.id));

        const compositePendingScenes = freshScenesForComposite.filter(
          (s) => s.status === "completed" &&
                 s.lipSyncStatus === "done" &&
                 s.lipSyncVideoUrl &&
                 s.videoUrl && // Seedance background clip
                 (s.compositeStatus === "pending" || s.compositeStatus === "error") &&
                 (s.compositeAttempts ?? 0) < MAX_COMPOSITE_ATTEMPTS
        );

        if (compositePendingScenes.length > 0) {
          console.log(`[SceneDispatch] Job ${job.id}: ${compositePendingScenes.length} scene(s) ready for compositing`);
        }

        for (const scene of compositePendingScenes) {
          try {
            // Mark as processing to prevent concurrent compositing attempts
            await db.update(musicVideoScenes)
              .set({
                compositeStatus: "processing",
                compositeAttempts: (scene.compositeAttempts ?? 0) + 1,
                updatedAt: new Date(),
              })
              .where(eq(musicVideoScenes.id, scene.id));

            console.log(`[SceneDispatch] Scene ${scene.id} STAGE 4: starting cinematic compositing (attempt ${(scene.compositeAttempts ?? 0) + 1})`);
            totalCompositeStarted++;

            // Run compositing asynchronously (don't await — it takes ~60s)
            // The next heartbeat tick will pick up the result
            compositeCinematicScene(
              scene.lipSyncVideoUrl!,
              scene.videoUrl!,
              scene.id,
              scene.duration ?? 5
            ).then(async (compositeUrl) => {
              try {
                const db2 = await getDb();
                if (!db2) return;
                const key = compositeUrl.includes("cloudfront") ? compositeUrl.split("/").pop()! : `music-video-scenes/${scene.id}-composite.mp4`;
                await db2.update(musicVideoScenes)
                  .set({
                    compositeStatus: "done",
                    compositeVideoUrl: compositeUrl,
                    compositeVideoKey: key,
                    updatedAt: new Date(),
                  })
                  .where(eq(musicVideoScenes.id, scene.id));
                console.log(`[SceneDispatch] Scene ${scene.id} STAGE 4 COMPLETE ✓ → ${compositeUrl.slice(0, 60)}...`);
              } catch (dbErr) {
                console.error(`[SceneDispatch] Scene ${scene.id} STAGE 4: DB update failed after compositing:`, dbErr);
              }
            }).catch(async (compositeErr: any) => {
              console.error(`[SceneDispatch] Scene ${scene.id} STAGE 4 FAILED: ${String(compositeErr?.message ?? compositeErr).slice(0, 300)}`);
              // Try fallback compositing (no chromakey — picture-in-picture)
              try {
                console.log(`[SceneDispatch] Scene ${scene.id} STAGE 4: trying fallback compositing...`);
                const fallbackUrl = await compositeCinematicSceneFallback(
                  scene.lipSyncVideoUrl!,
                  scene.videoUrl!,
                  scene.id,
                  scene.duration ?? 5
                );
                const db2 = await getDb();
                if (!db2) return;
                await db2.update(musicVideoScenes)
                  .set({
                    compositeStatus: "done",
                    compositeVideoUrl: fallbackUrl,
                    updatedAt: new Date(),
                  })
                  .where(eq(musicVideoScenes.id, scene.id));
                console.log(`[SceneDispatch] Scene ${scene.id} STAGE 4 FALLBACK COMPLETE ✓`);
              } catch (fallbackErr: any) {
                console.error(`[SceneDispatch] Scene ${scene.id} STAGE 4 FALLBACK ALSO FAILED: ${String(fallbackErr?.message ?? fallbackErr).slice(0, 200)}`);
                try {
                  const db2 = await getDb();
                  if (!db2) return;
                  await db2.update(musicVideoScenes)
                    .set({ compositeStatus: "error", updatedAt: new Date() })
                    .where(eq(musicVideoScenes.id, scene.id));
                } catch { /* ignore */ }
              }
            });

          } catch (compositeStartErr: any) {
            console.error(`[SceneDispatch] Scene ${scene.id} STAGE 4 start failed: ${String(compositeStartErr?.message ?? compositeStartErr).slice(0, 200)}`);
            await db.update(musicVideoScenes)
              .set({ compositeStatus: "error", updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, scene.id));
          }
        }

        // Count completed composites this tick
        totalCompositeCompleted += freshScenesForComposite.filter(s => s.compositeStatus === "done").length;

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

        // ── COMPOSITING READINESS CHECK ────────────────────────────────────────
        // Assembly can only run when ALL scenes have compositeStatus=done OR skipped.
        // Performance scenes: compositeStatus must be 'done' (or 'error' as fallback)
        // Cinematic scenes: compositeStatus must be 'skipped'
        const nowCompositeReady = nowCompleted.filter(
          (s) => s.compositeStatus === "done" || s.compositeStatus === "skipped" || s.compositeStatus === "error"
        );
        const nowCompositeProcessing = nowCompleted.filter(
          (s) => s.compositeStatus === "processing" || (s.compositeStatus === "pending" && s.lipSyncStatus === "done")
        );

        // Update completedScenes count on the job
        if (nowCompleted.length !== job.completedScenes) {
          await db
            .update(musicVideoJobs)
            .set({ completedScenes: nowCompleted.length, updatedAt: new Date() })
            .where(eq(musicVideoJobs.id, job.id));
        }

        // ── 6b. Composite stuck-scene reaper ────────────────────────────────────────
        // Any scene that has been in compositeStatus='processing' for longer than
        // COMPOSITE_STUCK_TIMEOUT_MS (10 min) is reset to 'error' so the dispatch
        // loop can retry it (up to compositeAttempts < 3).
        // This prevents scenes from being permanently stuck after a server restart
        // or a silent composite failure.
        const stuckCompositeScenes = nowCompleted.filter(
          (s) =>
            s.compositeStatus === "processing" &&
            Date.now() - new Date(s.updatedAt).getTime() > COMPOSITE_STUCK_TIMEOUT_MS
        );
        if (stuckCompositeScenes.length > 0) {
          console.warn(
            `[SceneDispatch] Job ${job.id} — ${stuckCompositeScenes.length} composite scene(s) stuck >10min. Resetting to error for retry.`
          );
          for (const stuck of stuckCompositeScenes) {
            await db
              .update(musicVideoScenes)
              .set({ compositeStatus: "error" as any, updatedAt: new Date() })
              .where(eq(musicVideoScenes.id, stuck.id));
          }
          // Refresh nowCompositeProcessing after reaping
          nowCompositeProcessing.splice(
            0,
            nowCompositeProcessing.length,
            ...nowCompositeProcessing.filter((s) => !stuckCompositeScenes.find((st) => st.id === s.id))
          );
        }

        // ── 7. Trigger assembly when all scenes are done AND all compositing is ready ──
        // ASSEMBLY GATE (5-stage pipeline):
        //   1. No pending or generating scenes
        //   2. No lip sync jobs still processing
        //   3. No compositing jobs still processing
        //   4. All completed scenes have compositeStatus=done|skipped|error
        const allVideosDone = nowPending.length === 0 && nowGenerating.length === 0;
        const allLipSyncReady = nowLipSyncProcessing.length === 0;
        const allCompositeReady = nowCompositeProcessing.length === 0;
        const hasCompletedScenes = nowCompleted.length > 0;

        if (allVideosDone && allLipSyncReady && allCompositeReady && hasCompletedScenes) {
          // ARCHITECTURE NOTE (2026-05-19):
          // The heartbeat ONLY sets status='assembling'. It does NOT call assembleMusicVideo.
          // The assemblyWorker (server/assemblyWorker.ts) is the sole caller of assembleMusicVideo.
          // This ensures assembly always runs outside the HTTP request lifecycle and is never
          // killed by Cloud Run's 180-second request timeout.
          // The assemblyWorker polls every 2 minutes and picks up newly-queued jobs within 2 min.
          const compositeCount = nowCompositeReady.filter(s => s.compositeStatus === "done").length;
          const skippedCount = nowCompositeReady.filter(s => s.compositeStatus === "skipped").length;
          console.log(
            `[SceneDispatch] Job ${job.id} — all scenes done + compositing ready (${compositeCount} composited, ${skippedCount} skipped). Queuing for assembly.`
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
        } else if (allVideosDone && allLipSyncReady && !allCompositeReady) {
          console.log(`[SceneDispatch] Job ${job.id} — all clips done, waiting for ${nowCompositeProcessing.length} compositing job(s) to complete...`);
        } else if (allVideosDone && !allLipSyncReady) {
          console.log(`[SceneDispatch] Job ${job.id} — all clips done, waiting for ${nowLipSyncProcessing.length} InfiniteTalk job(s) to complete...`);
        }

        // ── 8. Never mark job as failed — if all scenes are stuck, reset them ──
        if (allVideosDone && allLipSyncReady && allCompositeReady && nowCompleted.length === 0 && nowFailed.length > 0) {
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
              compositeStatus: "pending",
              compositeVideoUrl: null,
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
      compositeStarted: totalCompositeStarted,
      compositeCompleted: totalCompositeCompleted,
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
