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
 * CANONICAL 3-STAGE WIZ AI DIRECT-GENERATION PIPELINE (LOCKED 2026-05-28)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * STAGE 1 — CINEMATIC WORLD WITH CHARACTER INSIDE (Seedance)
 *   Generate the scene with the character ALREADY INSIDE the environment.
 *   Performance scenes: Zara generated inside Air Studios / Lyndhurst Hall.
 *   Cinematic scenes: pure environment shots (no character).
 *   NO grey backgrounds. NO compositing. The character IS the scene.
 *
 * STAGE 1b — RAW SCENE VALIDATION GATE (new 2026-05-28)
 *   Before submitting to HeyGen, visually validate the raw Seedance clip.
 *   If the clip shows a grey background or no real environment → reset to pending.
 *   If the clip looks like a real music video shot → proceed to Stage 2.
 *   This gate prevents wasting HeyGen API cost on bad Seedance outputs.
 *
 * STAGE 2 — LIP-SYNC CORRECTION PASS (HeyGen Precision v3 — PRIMARY, locked 2026-06-02)
 *   Improve lip sync on the already-coherent Seedance performance clip.
 *   Input: Seedance scene video URL + isolated Demucs vocal stem URL.
 *   Output: lip-synced performance video (lipSyncVideoUrl).
 *   This is the FINAL performance scene clip used in assembly.
 *   Video-in / video-out architecture — NO portrait compositing, NO chromakey.
 *   WaveSpeed InfiniteTalk retained for legacy polling of in-flight jobs ONLY.
 *
 * STAGE 3 — FINAL AUDIO RESTORATION (assembly worker)
 *   Assembly uses original mastered full mix (never vocal stem).
 *   Handled by assemblyWorker.ts (not here).
 *
 * SCENE TYPE ROUTING:
 *   performance (lipSync=true):  Stages 1 + 1b + 2. compositeStatus=skipped.
 *   cinematic (lipSync=false):   Stage 1 only. compositeStatus=skipped.
 *
 * ASSEMBLY GATE:
 *   All performance scenes must have lipSyncStatus=done.
 *   All cinematic scenes must have lipSyncStatus=done (set to done immediately).
 *   compositeStatus is set to 'skipped' for ALL scenes — compositing is removed.
 *   Only then does the heartbeat queue the job for assembly.
 *
 * Route: POST /api/scheduled/sceneDispatchHeartbeat
 * Auth:  Manus platform cron header (x-manus-cron-task-uid)
 */

import type { Request, Response } from "express";
import { getDb, getRawConn } from "../db";
import {
  musicVideoScenes,
  musicVideoJobs,
  users,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { acquireJobLock, releaseJobLock } from "../queue-lock";
import { assessLipSyncQuality, shouldProceedToAssembly, shouldRetryLipSync } from "../lip-sync-gate";
import { sdk } from "../_core/sdk";
import { startSceneRender, pollSceneStatus, extractLyricsForWindow } from "../music-video-service";
import { extractSceneAudioClip, sliceVocalStemForSeedance } from "../audio-clip-extractor";
// WaveSpeed InfiniteTalk import removed — all in-flight jobs have completed or been reset.
// pollWaveSpeedInfiniteTalk is no longer called; HeyGen Precision v3 is the sole lip-sync provider.
// SyncLabs — retained for legacy polling of in-flight jobs ONLY. NOT used for new submissions.
import { pollSyncLabsLipSync } from "../ai-apis/synclabs-lipsync";
// HeyGen Precision v3 — PRIMARY lip-sync provider (video-in / video-out, locked 2026-06-02)
import { submitHeyGenLipSyncV3, pollHeyGenLipSyncV3 } from "../ai-apis/heygen-lipsync";
import { getProbeDecision } from "../pre-render-validator";
import { resetSceneAttempts } from "../spend-protection";
import { getVocalStemForCharacter } from "../vocal-isolation-service";
import { selectReferenceForScene, runStage2EnvironmentPrep } from "../character-auto-prep";
// compositeCinematicScene removed — compositing is no longer part of the pipeline (2026-05-28)
// The character is now generated INSIDE the scene by Seedance, not composited on top.
import { validateRawSceneForLipSync } from "../raw-scene-validator";
// AudioTier import removed — assembly is now handled exclusively by assemblyWorker.ts

const SCENE_STUCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes — reaper handles beyond this
const SYNC_LABS_STUCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes max for legacy Sync Labs jobs
const HEYGEN_STUCK_TIMEOUT_MS = 12 * 60 * 1000; // 12 minutes max for HeyGen Precision v3
const INFINITETALK_STUCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes max — legacy InfiniteTalk polling only
// Compositing removed from pipeline (2026-05-28) — constants kept for legacy polling only
const COMPOSITE_STUCK_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_COMPOSITE_ATTEMPTS = 3;

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
        stemVocalsUrl: musicVideoJobs.stemVocalsUrl,
        transcriptionSegments: musicVideoJobs.transcriptionSegments,
        sceneSetting: musicVideoJobs.sceneSetting,
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
    // Compositing removed (2026-05-28) — kept for backward-compatible summary response only
    const totalCompositeStarted = 0;
    const totalCompositeCompleted = 0;
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
        // Also recover failed_retryable scenes — these were blocked by provider issues
        // (balance exhaustion, copyright rejection) but should be retried on the next tick.
        const failedScenes = scenes.filter((s) => s.status === "failed" || (s.status as any) === "failed_retryable");
        if (failedScenes.length > 0) {
          console.log(`[SceneDispatch] Job ${job.id} — resetting ${failedScenes.length} failed/failed_retryable scene(s) back to pending for retry`);
          for (const fs of failedScenes) {
            // CRITICAL: Cancel providerJobLogs entries so idempotency check doesn't block re-dispatch
            await resetSceneAttempts(fs.id);
            await db.update(musicVideoScenes)
              .set({
                status: "pending",
                taskId: null,
                errorMessage: null,
                lipSyncStatus: "pending",
                lipSyncTaskId: null,
                lipSyncVideoUrl: null,
                compositeStatus: "skipped", // compositing removed
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
        } else if (probeDecision.mode === "one_at_a_time") {
          // One-at-a-time mode: dispatch only the single next scene identified by the probe gate.
          // All other pending scenes are held until Tim approves the completed scene.
          const nextScene = pendingScenes.find(s => s.id === probeDecision.nextSceneId);
          if (nextScene) {
            console.log(`[SceneDispatch] Job ${job.id} ONE-AT-A-TIME MODE — dispatching only scene ${nextScene.id} (index ${nextScene.sceneIndex}). Awaiting approval before next.`);
            pendingScenes.length = 0;
            pendingScenes.push(nextScene);
          } else {
            console.warn(`[SceneDispatch] Job ${job.id} ONE-AT-A-TIME MODE — next scene ${probeDecision.nextSceneId} not found in pending list. Holding all dispatches.`);
            pendingScenes.length = 0;
          }
        } else {
          // full_render — all scenes approved, dispatch remaining (assembly phase)
          console.log(`[SceneDispatch] Job ${job.id} FULL RENDER MODE — all scenes approved, dispatching ${pendingScenes.length} remaining scene(s)`);
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
                try {
                  if (scene.characterAssignments) {
                    const parsed = JSON.parse(scene.characterAssignments);
                    // Handle both string[] and object[] (e.g. [{name: 'Zara'}] or ['Zara'])
                    if (Array.isArray(parsed)) {
                      assignments = parsed.map((a: any) =>
                        typeof a === 'string' ? a : (a?.name ?? a?.characterName ?? String(a))
                      ).filter(Boolean);
                    }
                  }
                } catch {}
                let matchedChar = assignments.length > 0
                  ? jobChars.find(c => assignments.some(a => typeof a === 'string' && a.toLowerCase() === c.name?.toLowerCase()))
                  : null;
                const bestChar = matchedChar ?? jobChars.find(c => c.masterPortraitUrl) ?? jobChars.find(c => c.previewImageUrl) ?? jobChars[0];
                if (bestChar) {
                  // ── Auto-Prep Reference Selection ──────────────────────────────────────
                  // Priority for performance/lip-sync scenes:
                  //   1. environmentRefUrl  — character placed in the correct environment (Air Studios)
                  //                           This is the IDEAL reference for r2v: correct env + correct face
                  //   2. performanceRefUrl  — head-and-shoulders, optimised for lip-sync
                  //   3. masterPortraitUrl  — fallback if auto-prep hasn't completed yet
                  //
                  // For cinematic/wide scenes, use cinematicRefUrl or mediumShotRefUrl.
                  const isLipSyncScene = (scene.lipSync ?? false) && scene.sceneType === "performance";

                  // ── ENVIRONMENT PORTRAIT GATE ─────────────────────────────────────────
                  // For performance/lip-sync scenes, the character MUST be placed inside
                  // the correct studio environment (e.g. Air Studios) before dispatch.
                  // If environmentRefUrl is missing:
                  //   a) If Stage 2 is already processing → defer this scene (try next tick)
                  //   b) If Stage 2 hasn't started → trigger it now, defer this scene
                  // This prevents grey/plain backgrounds from reaching Seedance.
                  if (isLipSyncScene && !bestChar.environmentRefUrl) {
                    const isStage2InFlight = bestChar.autoPrepStatus === "stage2_processing";
                    if (isStage2InFlight) {
                      console.log(`[SceneDispatch] Scene ${scene.id} DEFERRED — Stage 2 environment prep in progress for char ${bestChar.id} (${bestChar.name}). Will retry next tick.`);
                    } else {
                      // Trigger Stage 2 asynchronously — do NOT await (non-blocking)
                      const sceneStyle = job.sceneSetting ?? "Air Studios recording studio, Lyndhurst Hall, cinematic lighting";
                      console.log(`[SceneDispatch] Scene ${scene.id} TRIGGERING Stage 2 environment prep for char ${bestChar.id} (${bestChar.name}) — style: "${sceneStyle.slice(0, 60)}"`);
                      runStage2EnvironmentPrep({
                        characterId: bestChar.id,
                        identityBrief: bestChar.lockedDescription ?? bestChar.characterPrompt ?? bestChar.name ?? "performer",
                        characterName: bestChar.name ?? undefined,
                        masterPortraitUrl: bestChar.masterPortraitUrl ?? undefined,
                        sceneStyle,
                      }).catch(err => console.error(`[SceneDispatch] Stage 2 trigger error for char ${bestChar.id}:`, err));
                      console.log(`[SceneDispatch] Scene ${scene.id} DEFERRED — Stage 2 environment prep triggered. Will retry next tick.`);
                    }
                    // Skip dispatch for this scene — environment portrait not ready
                    continue;
                  }

                  let autoRef: string | null;
                  if (isLipSyncScene && bestChar.environmentRefUrl) {
                    // BEST: character already placed in the correct environment
                    autoRef = bestChar.environmentRefUrl;
                    console.log(`[SceneDispatch] Scene ${scene.id} ENVIRONMENT REF selected for r2v lip sync: ${autoRef.slice(0, 80)}...`);
                  } else {
                    autoRef = selectReferenceForScene(bestChar, scene.sceneType ?? "cinematic");
                  }
                  resolvedCharacterUrl = autoRef ?? bestChar.masterPortraitUrl ?? bestChar.previewImageUrl ?? resolvedCharacterUrl;
                  resolvedCharacterDescription = bestChar.lockedDescription?.trim() ?? undefined;
                  resolvedCharacterName = bestChar.name ?? undefined;
                  // ── AGE LOCK: inject character constraints into description to prevent ageing ─────────
                  // characterPrompt is the locked identity (e.g. "young woman, early 20s, ...").
                  // Prepend it to the resolved description so every scene generation call
                  // gets the age anchor, overriding any scene-level character description.
                  if (bestChar.characterPrompt && !resolvedCharacterDescription?.includes(bestChar.characterPrompt.slice(0, 30))) {
                    resolvedCharacterDescription = bestChar.characterPrompt + (resolvedCharacterDescription ? `. ${resolvedCharacterDescription}` : "");
                  }
                  if (autoRef && autoRef !== bestChar.masterPortraitUrl) {
                    console.log(`[SceneDispatch] Scene ${scene.id} using auto-prep ref (${scene.sceneType ?? 'cinematic'}): ${autoRef.slice(0, 80)}...`);
                  }
                }
              }
            } catch (charErr) {
              console.warn(`[SceneDispatch] Character portrait resolution failed for scene ${scene.id}:`, charErr);
            }

            // ── TEXT ANCHOR: Prepend character identity to prompt ──────────────
            // NEW ARCHITECTURE: Performance scenes now use Seedance r2v (reference-to-video)
            // with the character's environmentRefUrl as @Image1 and the vocal stem clip as @Audio1.
            // The character description IS included in the prompt (as age/appearance anchor),
            // but the @Image1/@Audio1 syntax is handled inside startSceneRenderFalSeedance.
            // The scene prompt here provides the camera/environment direction.
            const isPerformanceSceneDispatch = scene.sceneType === "performance";
            const willUseR2V = isPerformanceSceneDispatch && (scene.lipSync ?? false) && !!job.audioUrl && scene.startTime !== null && scene.startTime !== undefined;
            let scenePrompt = scene.prompt ?? "";
            if (resolvedCharacterDescription && resolvedCharacterName) {
              // Inject character description as a constraint block for ALL scene types.
              // For r2v scenes, this supplements the @Image1 reference (Seedance uses both).
              // Keep it concise to stay within the 480-char prompt limit.
              const charAnchor = `${resolvedCharacterName}: ${resolvedCharacterDescription.slice(0, 120)}. `;
              const MAX_TOTAL = 480;
              const remainingChars = MAX_TOTAL - charAnchor.length;
              const trimmedScene = scenePrompt.length > remainingChars
                ? scenePrompt.slice(0, remainingChars).replace(/[,;.\s]+$/, "") + "."
                : scenePrompt;
              scenePrompt = charAnchor + trimmedScene;
              console.log(`[SceneDispatch] Scene ${scene.id} TEXT ANCHOR injected for ${resolvedCharacterName} (${willUseR2V ? 'r2v mode' : 'standard mode'})`);
            }
            if (willUseR2V) {
              console.log(`[SceneDispatch] Scene ${scene.id} PERFORMANCE SCENE — r2v mode: environmentRefUrl + vocal stem + lyrics → native lip sync`);
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

            // ── PER-SCENE VOCAL STEM SLICING ──────────────────────────────────
            // For r2v (reference-to-video) performance scenes, slice the isolated vocal
            // stem to the exact scene window BEFORE dispatching to Seedance.
            // This gives Seedance only the singing voice for this scene's time window,
            // not the full track — enabling phoneme-accurate lip sync.
            //
            // Priority: stemVocalsUrl (Demucs-isolated vocals) > audioUrl (full mix)
            // The sliced WAV is uploaded to S3 and passed as audio_url to Seedance r2v.
            let sceneAudioUrlForR2V: string | undefined = undefined;
            if (willUseR2V && scene.startTime !== null && scene.startTime !== undefined) {
              const stemSource = job.stemVocalsUrl ?? job.audioUrl;
              if (stemSource) {
                try {
                  console.log(`[SceneDispatch] Scene ${scene.id} VOCAL STEM SLICE: start=${scene.startTime}s dur=${scene.duration ?? 5}s source=${job.stemVocalsUrl ? 'stemVocalsUrl' : 'audioUrl (fallback)'}`);
                  sceneAudioUrlForR2V = await sliceVocalStemForSeedance(
                    stemSource,
                    scene.startTime,
                    scene.duration ?? 5,
                    scene.id
                  );
                  console.log(`[SceneDispatch] Scene ${scene.id} VOCAL STEM SLICE complete → ${sceneAudioUrlForR2V.slice(0, 80)}...`);
                } catch (sliceErr: any) {
                  // Non-fatal: fall back to passing the full track URL
                  // Seedance will still work, just with less precise lip sync
                  console.warn(`[SceneDispatch] Scene ${scene.id} vocal stem slice FAILED (falling back to full track): ${sliceErr.message}`);
                  sceneAudioUrlForR2V = job.audioUrl ?? undefined;
                }
              }
            }

            // ── PER-SCENE LYRICS RESOLUTION ───────────────────────────────────
            // Priority 1: scene.lyrics (set by storyboard generator or user edit)
            // Priority 2: extract from job.transcriptionSegments (Whisper timestamps)
            //             using the scene's time window (startTime → startTime + duration)
            // Priority 3: no lyrics (r2v will still work, just without phoneme anchoring)
            let sceneLyrics: string | undefined = undefined;
            if (scene.lyrics && scene.lyrics.trim().length > 0) {
              sceneLyrics = scene.lyrics.trim();
              console.log(`[SceneDispatch] Scene ${scene.id} LYRICS from scene.lyrics: "${sceneLyrics.slice(0, 60)}..."`);
            } else if (job.transcriptionSegments && scene.startTime !== null && scene.startTime !== undefined) {
              try {
                const segments: Array<{ start: number; end: number; text: string }> = JSON.parse(job.transcriptionSegments);
                const windowEnd = (scene.startTime ?? 0) + (scene.duration ?? 5);
                const extracted = extractLyricsForWindow(segments, scene.startTime ?? 0, windowEnd);
                if (extracted.length > 0) {
                  sceneLyrics = extracted;
                  console.log(`[SceneDispatch] Scene ${scene.id} LYRICS extracted from transcriptionSegments: "${sceneLyrics.slice(0, 60)}..."`);
                }
              } catch (lyricsErr) {
                // Non-fatal: proceed without lyrics
                console.warn(`[SceneDispatch] Scene ${scene.id} lyrics extraction from transcriptionSegments failed (non-fatal):`, lyricsErr);
              }
            }
            if (!sceneLyrics) {
              console.log(`[SceneDispatch] Scene ${scene.id} no lyrics available — r2v will use audio-only lip sync`);
            }

            // ── STRATEGY DISPATCH ─────────────────────────────────────────────
            // Pass scene.lipSync, sceneAudioUrlForR2V (sliced vocal stem), and scene.startTime
            // so startSceneRender can select the correct strategy:
            //   Strategy 1: lipSync=true + audioUrl + startTime → reference-to-video (r2v)
            //     audioUrl is now the pre-sliced vocal stem WAV for this scene window
            //   Strategy 2: lipSync=false or no audio → image-to-video
            //   Strategy 3: no character image → text-to-video
            // ── PROVIDER OVERRIDE: respect job.fallbackProvider ───────────────
            // If the job has fallbackProvider='wavespeed', force WaveSpeed routing.
            // This survives Cloud Run cold starts (in-memory circuit breaker resets).
            // PRIMARY: fal.ai Seedance 2.0 — no content filters, no venue/copyright restrictions
            // FALLBACK: wavespeed (DB-level override when job.fallbackProvider='wavespeed')
            const forcedRenderer = job.fallbackProvider === "wavespeed" ? "wavespeed" : "fal_seedance";
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
              // ✅ For r2v: use the pre-sliced vocal stem WAV for this scene window
              // ✅ For i2v/t2v: pass full audioUrl (not used by Seedance in those modes)
              sceneAudioUrlForR2V ?? job.audioUrl ?? undefined,
              scene.startTime ?? undefined,   // ✅ scene start time in seconds (already correct unit)
              sceneLyrics                     // ✅ per-scene lyrics for phoneme-accurate lip sync
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

            // Mark scene as failed_retryable with error metadata
            try {
              await db.update(musicVideoScenes)
                .set({
                  status: 'failed_retryable' as any,
                  providerErrorCode: isBalanceError ? 'PROVIDER_BALANCE_EXHAUSTED' : 'DISPATCH_ERROR',
                  providerErrorAt: new Date(),
                  errorMessage: errMsg.slice(0, 200),
                  updatedAt: new Date(),
                })
                .where(eq(musicVideoScenes.id, scene.id));
            } catch { /* ignore db update errors */ }

            if (isBalanceError) {
              console.error(`[SceneDispatch] ⚠️ PROVIDER BALANCE EXHAUSTED — Job ${job.id} scene ${scene.id} marked failed_retryable.`);
              try {
                const { notifyAtlasExhausted } = await import('../provider-health');
                await notifyAtlasExhausted();
              } catch { /* non-fatal */ }

              // Mark job as provider_unavailable and notify subscriber
              try {
                await db.update(musicVideoJobs)
                  .set({ status: 'provider_unavailable' as any, updatedAt: new Date() })
                  .where(eq(musicVideoJobs.id, job.id));

                // Notify subscriber — fetch user details for the email
                const userRows = await db.select().from(users).where(eq(users.id, job.userId)).limit(1).catch(() => []);
                const userRow = userRows[0] ?? null;
                if (userRow?.email) {
                  const { emailProviderUnavailable } = await import('../email');
                  await emailProviderUnavailable({
                    name: userRow.name || 'there',
                    email: userRow.email,
                    jobId: String(job.id),
                    jobTitle: job.title || undefined,
                  }).catch(() => { /* non-fatal */ });
                }
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

              // ── SEEDANCE NATIVE LIP SYNC DETECTION ──────────────────────────────────
              // When Seedance 2.0 was dispatched with reference_audios (native lip sync),
              // the video already has lip sync baked in. Skip HeyGen/raw-validator entirely.
              // Detect by checking if the taskId uses the seedance prefix (dispatched via WaveSpeed r2v path).
              const taskIdStr = scene.taskId ?? "";
              const isSeedanceNative = taskIdStr.startsWith("wavespeed:seedance:") && isPerformanceScene;
              if (isSeedanceNative && needsLipSync) {
                // Seedance native lip sync — video already has lip sync baked in
                // Mark as completed + lip sync done, skip HeyGen and raw validator
                await db.update(musicVideoScenes)
                  .set({
                    status: "completed",
                    videoUrl: pollResult.videoUrl,
                    lipSyncStatus: "done",
                    lipSyncVideoUrl: pollResult.videoUrl, // same video — lip sync is native
                    compositeStatus: "skipped",
                    updatedAt: new Date(),
                  })
                  .where(eq(musicVideoScenes.id, scene.id));
                console.log(`[SceneDispatch] Scene ${scene.id} completed (Seedance native lip sync, compositeStatus=skipped) ✓`);
                totalPolled++;
                continue;
              }

              if (needsLipSync) {
                // Mark scene completed with raw clip, then submit InfiniteTalk
                // (InfiniteTalk generates a new performance video from portrait + audio;
                //  the raw Seedance clip is stored as videoUrl for cinematic reference)
                try {
                  const rawStartTime = scene.startTime ?? 0;
                  const startTimeSec = rawStartTime > 300 ? rawStartTime / 1000 : rawStartTime;
                  console.log(`[SceneDispatch] Scene ${scene.id} clip ready — submitting to HeyGen Precision v3 (startTime=${startTimeSec}s, raw=${scene.startTime})`);

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

                    // ── STAGE 1b: RAW SCENE VALIDATION GATE ──────────────────────────────
                    // Before submitting to HeyGen, validate the raw Seedance clip.
                    // Checks: real background, face presence, population, framing, environment.
                    // If any check fails, reset to pending for re-generation.
                    // This prevents wasting HeyGen API cost on bad Seedance outputs.
                    const scenePromptLower = (scene.prompt ?? "").toLowerCase();
                    const requiresPopulation = (
                      scenePromptLower.includes("orchestra") ||
                      scenePromptLower.includes("audience") ||
                      scenePromptLower.includes("session musician") ||
                      scenePromptLower.includes("musicians") ||
                      scenePromptLower.includes("lyndhurst hall") ||
                      scenePromptLower.includes("air studios") ||
                      scenePromptLower.includes("concert hall")
                    );
                    const rawValidation = await validateRawSceneForLipSync(
                      pollResult.videoUrl,
                      scene.id,
                      scene.sceneIndex ?? 0,
                      requiresPopulation
                    );
                    if (!rawValidation.passed) {
                      console.warn(`[SceneDispatch] Scene ${scene.id} FAILED raw validation [${rawValidation.failureCategory ?? "unknown"}] — resetting to pending for re-generation. Reason: ${rawValidation.reason}`);
                      await db.update(musicVideoScenes)
                        .set({
                          status: "pending",
                          taskId: null,
                          errorMessage: `Raw scene validation failed: ${rawValidation.reason}`,
                          lipSyncStatus: "pending",
                          compositeStatus: "skipped",
                          updatedAt: new Date(),
                        })
                        .where(eq(musicVideoScenes.id, scene.id));
                      continue; // Skip HeyGen submission for this scene
                    }
                    console.log(`[SceneDispatch] Scene ${scene.id} PASSED raw validation (${rawValidation.confidence} confidence) — proceeding to HeyGen Precision v3`);

                    // ── STAGE 2: HeyGen Precision v3 lip-sync (video-in / video-out) ──
                    // Architecture: Seedance scene video + isolated vocal stem → HeyGen → lip-synced video
                    // No portrait required. No chromakey. HeyGen output IS the final performance clip.
                    const heyGenTaskId = await submitHeyGenLipSyncV3({
                      videoUrl: pollResult.videoUrl,   // Seedance scene video (character already inside)
                      audioUrl: sceneAudioUrl,          // Demucs-isolated vocal stem (scene window)
                      title: `scene-${scene.id}-job-${job.id}`,
                      mode: "precision",
                      keepSameFormat: true,
                      disableMusicTrack: false,         // Seedance clip has no separate audio track
                    });

                    // Mark scene completed (raw Seedance clip) + lip sync processing (HeyGen)
                    await db.update(musicVideoScenes)
                      .set({
                        status: "completed",
                        videoUrl: pollResult.videoUrl,
                        lipSyncStatus: "processing",
                        lipSyncTaskId: heyGenTaskId,
                        updatedAt: new Date(),
                      })
                      .where(eq(musicVideoScenes.id, scene.id));
                    console.log(`[SceneDispatch] Scene ${scene.id} → HeyGen Precision v3 task ${heyGenTaskId} submitted ✓`);
                    totalLipSyncSubmitted++;
                    syncLabsSubmittedThisTick++; // reuse counter for rate limiting
                  }
                } catch (heyGenSubmitErr: any) {
                  // HeyGen submission failed — reset lipSyncStatus to pending for retry.
                  // Under the premium policy, 'error' blocks assembly permanently — never use it here.
                  console.error(`[SceneDispatch] Scene ${scene.id} HeyGen Precision v3 submission FAILED: ${String(heyGenSubmitErr?.message ?? heyGenSubmitErr).slice(0, 300)}`);
                  await db.update(musicVideoScenes)
                    .set({
                      status: "completed",
                      videoUrl: pollResult.videoUrl,
                      lipSyncStatus: "pending",
                      lipSyncTaskId: null,
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
              const failError = (pollResult as any).error ?? "";
              const isCopyrightRejection = failError.includes("PROVIDER_REJECTED:copyright_restriction");
              const isContentPolicyRejection = failError.includes("PROVIDER_REJECTED:content_policy");

              if (isCopyrightRejection) {
                // ── Copyright rejection: sanitise the prompt and retry once ──────────
                // Import sanitiser lazily to avoid circular deps at module load time
                const { sanitisePromptForProvider, findVenueReferences } = await import("../prompt-sanitiser");
                const originalPrompt = scene.prompt ?? "";
                const sanitisedPrompt = sanitisePromptForProvider(originalPrompt);
                const venueRefs = findVenueReferences(originalPrompt);
                const retryCount = ((scene as any).providerRetryCount ?? 0) as number;

                if (retryCount < 1 && sanitisedPrompt !== originalPrompt) {
                  // First copyright rejection — retry with sanitised prompt
                  console.warn(`[SceneDispatch] Scene ${scene.id} PROVIDER_REJECTED:copyright_restriction — venue refs found: [${venueRefs.join(", ")}] — retrying with sanitised prompt`);
                  await db.update(musicVideoScenes)
                    .set({
                      status: "pending",
                      taskId: null,
                      prompt: sanitisedPrompt,
                      errorMessage: `provider_rejected_copyright:auto_retry_with_sanitised_prompt:venues=[${venueRefs.join(",")}]`,
                      lipSyncStatus: "pending",
                      lipSyncTaskId: null,
                      lipSyncVideoUrl: null,
                      compositeStatus: "skipped",
                      compositeVideoUrl: null,
                      updatedAt: new Date(),
                    })
                    .where(eq(musicVideoScenes.id, scene.id));
                } else {
                  // Already retried with sanitised prompt or prompt was already clean — escalate to fallback provider
                  console.error(`[SceneDispatch] Scene ${scene.id} PROVIDER_REJECTED:copyright_restriction — sanitised prompt still rejected or no venue refs found — marking failed_retryable for fallback provider`);
                  await db.update(musicVideoScenes)
                    .set({
                      status: "failed_retryable" as any,
                      taskId: null,
                      errorMessage: `provider_rejected_copyright:sanitised_prompt_also_rejected:${failError.slice(0, 200)}`,
                      updatedAt: new Date(),
                    })
                    .where(eq(musicVideoScenes.id, scene.id));
                }
              } else if (isContentPolicyRejection) {
                // Content policy (real person, audio sensitivity) — reset to pending
                console.warn(`[SceneDispatch] Scene ${scene.id} PROVIDER_REJECTED:content_policy — reset to pending`);
                await db.update(musicVideoScenes)
                  .set({
                    status: "pending",
                    taskId: null,
                    errorMessage: `provider_rejected_content_policy:${failError.slice(0, 200)}`,
                    lipSyncStatus: "pending",
                    lipSyncTaskId: null,
                    lipSyncVideoUrl: null,
                    compositeStatus: "skipped",
                    compositeVideoUrl: null,
                    updatedAt: new Date(),
                  })
                  .where(eq(musicVideoScenes.id, scene.id));
              } else {
                // Generic failure — reset to pending for retry
                await db.update(musicVideoScenes)
                  .set({
                    status: "pending",
                    taskId: null,
                    errorMessage: failError.slice(0, 300) || null,
                    lipSyncStatus: "pending",
                    lipSyncTaskId: null,
                    lipSyncVideoUrl: null,
                    compositeStatus: "skipped",
                    compositeVideoUrl: null,
                    updatedAt: new Date(),
                  })
                  .where(eq(musicVideoScenes.id, scene.id));
                console.warn(`[SceneDispatch] Scene ${scene.id} provider returned failed — reset to pending for retry`);
              }
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

              // RETRY: HeyGen Precision v3 — video-in / video-out (no portrait needed)
              if (!scene.videoUrl) throw new Error(`Scene ${scene.id} RETRY: no videoUrl for HeyGen`);

              // ── AUDIO MUX: Seedance i2v renders have no audio track.
              // HeyGen Precision v3 requires an audio track in the input video.
              // Mux the scene audio clip into the video before submitting.
              let heyGenInputVideoUrl = scene.videoUrl;
              try {
                const { muxAudioIntoVideo } = await import("../video-audio-muxer");
                heyGenInputVideoUrl = await muxAudioIntoVideo({
                  videoUrl: scene.videoUrl,
                  audioUrl: sceneAudioUrl,
                  sceneId: scene.id,
                });
                console.log(`[SceneDispatch] Scene ${scene.id} RETRY: audio muxed into video ✓`);
              } catch (muxErr: any) {
                console.warn(`[SceneDispatch] Scene ${scene.id} RETRY: audio mux failed (${String(muxErr?.message ?? muxErr).slice(0, 100)}) — using original video`);
              }

              const retryHeyGenTaskId = await submitHeyGenLipSyncV3({
                videoUrl: heyGenInputVideoUrl, // Muxed video (character + audio track)
                audioUrl: sceneAudioUrl,       // Demucs-isolated vocal stem (scene window)
                title: `scene-${scene.id}-job-${job.id}-retry`,
                mode: "precision",
                keepSameFormat: true,
                disableMusicTrack: false,
              });
              // Use raw SQL to guarantee the lipSyncTaskId is persisted.
              // Drizzle ORM updates have been observed to silently fail for this column.
              {
                const rawConn = await getRawConn();
                try {
                  await rawConn.execute(
                    "UPDATE musicVideoScenes SET lipSyncStatus = 'processing', lipSyncTaskId = ?, updatedAt = NOW() WHERE id = ?",
                    [retryHeyGenTaskId, scene.id]
                  );
                } finally {
                  await rawConn.end();
                }
              }
              console.log(`[SceneDispatch] Scene ${scene.id} RETRY → HeyGen Precision v3 task ${retryHeyGenTaskId} submitted ✓`);
              syncLabsSubmittedThisTick++;
              totalLipSyncSubmitted++;
            } catch (retryErr: any) {
              console.error(`[SceneDispatch] Scene ${scene.id} RETRY HeyGen Precision v3 failed: ${String(retryErr?.message ?? retryErr).slice(0, 200)} — will retry next tick`);
              // Do NOT set lipSyncStatus=error — that permanently blocks assembly.
              // Leave as pending so the next heartbeat tick retries submission.
            }
          }
        }

        // ── 5. Poll HeyGen Precision v3 lip sync jobs ────────────────────────
        const lipSyncProcessingScenes = scenes.filter(
          (s) => s.status === "completed" && s.lipSyncStatus === "processing" && s.lipSyncTaskId
        );

        if (lipSyncProcessingScenes.length > 0) {
          for (const scene of lipSyncProcessingScenes) {
            try {
              const sceneAge = Date.now() - new Date(scene.updatedAt).getTime();

              if (sceneAge > HEYGEN_STUCK_TIMEOUT_MS) {
                console.warn(`[SceneDispatch] Scene ${scene.id} HeyGen Precision v3 job stuck for ${Math.round(sceneAge / 60000)}min — resetting to pending for retry`);
                // Reset to pending so the heartbeat re-submits on the next tick.
                // Under the premium policy, 'error' blocks assembly permanently — never use it here.
                await db.update(musicVideoScenes)
                  .set({ lipSyncStatus: "pending", lipSyncTaskId: null, updatedAt: new Date() })
                  .where(eq(musicVideoScenes.id, scene.id));
                continue;
              }

              const pollResult = await pollHeyGenLipSyncV3(scene.lipSyncTaskId!);

              if (pollResult.status === "completed" && pollResult.videoUrl) {
                // Download and re-upload to S3 for permanent storage
                const { storagePut } = await import("../storage");
                const resp = await fetch(pollResult.videoUrl);
                const buf = Buffer.from(await resp.arrayBuffer());
                const key = `music-video-scenes/${scene.id}-heygen-v3-${Date.now()}.mp4`;
                const { url } = await storagePut(key, buf, "video/mp4");

                // ── LSE-D / LSE-C lip-sync gate ──────────────────────────────────────────────────
                // Assess lip-sync quality before marking as done.
                // GREEN/AMBER → proceed to assembly (AMBER is flagged in audit log)
                // RED → reset to pending for retry
                let lipSyncGateResult;
                try {
                  lipSyncGateResult = await assessLipSyncQuality({
                    videoUrl: url,
                    sceneId: scene.id,
                    jobId: job.id,
                    scenePrompt: scene.prompt ?? undefined,
                  });
                } catch (gateErr: any) {
                  console.warn(`[SceneDispatch] Scene ${scene.id} lip-sync gate error (fail open): ${gateErr.message}`);
                  lipSyncGateResult = { gate: "AMBER" as const, usedSyncNetMetrics: false, confidence: 0.2 };
                }

                if (shouldRetryLipSync(lipSyncGateResult)) {
                  // RED gate: reset to pending for retry
                  console.warn(
                    `[SceneDispatch] Scene ${scene.id} lip-sync gate RED — retrying. Reason: ${lipSyncGateResult.failureReason ?? "LLM assessment"}`
                  );
                  await db.update(musicVideoScenes)
                    .set({ lipSyncStatus: "pending", lipSyncTaskId: null, updatedAt: new Date() })
                    .where(eq(musicVideoScenes.id, scene.id));
                } else {
                  // GREEN or AMBER: proceed
                  if (lipSyncGateResult.gate === "AMBER") {
                    console.warn(
                      `[SceneDispatch] Scene ${scene.id} lip-sync gate AMBER — proceeding with flag. Assessment: ${lipSyncGateResult.qualitativeAssessment ?? ""}`
                    );
                  } else {
                    console.log(`[SceneDispatch] Scene ${scene.id} lip-sync gate GREEN ✓`);
                  }

                  await db.update(musicVideoScenes)
                    .set({
                      lipSyncStatus: "done",
                      lipSyncVideoUrl: url,
                      lipSyncVideoKey: key,
                      // Compositing removed (2026-05-28) — lipSyncVideoUrl IS the final clip
                      compositeStatus: "skipped",
                      updatedAt: new Date(),
                    })
                    .where(eq(musicVideoScenes.id, scene.id));
                  console.log(`[SceneDispatch] Scene ${scene.id} HeyGen Precision v3 lip sync DONE ✓ (gate: ${lipSyncGateResult.gate}) → compositeStatus=skipped`);
                  totalLipSyncPolled++;
                }

                // ── PROBE: if this is the probe scene, set probeVideoUrl (lip-synced version) ──
                try {
                  const [currentJob] = await db.select({ probeSceneId: musicVideoJobs.probeSceneId, probePassed: musicVideoJobs.probePassed })
                    .from(musicVideoJobs).where(eq(musicVideoJobs.id, job.id));
                  if (currentJob?.probeSceneId === scene.id && (currentJob?.probePassed === false || (currentJob?.probePassed as any) === 0)) {
                    await db.update(musicVideoJobs)
                      .set({ probeVideoUrl: url, updatedAt: new Date() })
                      .where(eq(musicVideoJobs.id, job.id));
                    console.log(`[SceneDispatch] Job ${job.id} PROBE HEYGEN COMPLETE — lip-synced video ready for owner review: ${url.slice(0, 60)}...`);
                  }
                } catch { /* non-fatal */ }

              } else if (pollResult.status === "failed") {
                console.error(`[SceneDispatch] Scene ${scene.id} HeyGen Precision v3 job ${scene.lipSyncTaskId} FAILED — resetting to pending for retry`);
                // Reset to pending so the heartbeat re-submits on the next tick.
                // Under the premium policy, 'error' permanently blocks assembly — never use it here.
                await db.update(musicVideoScenes)
                  .set({ lipSyncStatus: "pending", lipSyncTaskId: null, updatedAt: new Date() })
                  .where(eq(musicVideoScenes.id, scene.id));
              } else {
                console.log(`[SceneDispatch] Scene ${scene.id} HeyGen Precision v3 status: ${pollResult.status} — polling next tick`);
              }
            } catch (pollHeyGenErr: any) {
              console.error(`[SceneDispatch] HeyGen Precision v3 poll error for scene ${scene.id}: ${String(pollHeyGenErr?.message ?? pollHeyGenErr).slice(0, 200)}`);
            }
          }
        }

        // ── 5b. COMPOSITING REMOVED (2026-05-28) ─────────────────────────────────────────────
        // The compositing stage (ffmpeg chromakey + overlay) has been removed from the pipeline.
        // Zara is now generated INSIDE the scene by Seedance — no cutout, no grey background.
        // HeyGen Precision v3 output (lipSyncVideoUrl) is the final performance clip for assembly.
        // compositeStatus is set to 'skipped' for ALL scenes.

        // ── 6. Re-check completion after polling ───────────────────────────────
        const freshScenes = await db
          .select()
          .from(musicVideoScenes)
          .where(eq(musicVideoScenes.jobId, job.id));

        const nowCompleted = freshScenes.filter((s) => s.status === "completed");
        const nowFailed = freshScenes.filter((s) => s.status === "failed");
        // A scene is "pending" if status=pending AND no taskId (not yet dispatched to Seedance).
        // Scenes with a taskId are in 'generating' state (Seedance is running) — never treat them as pending.
        const nowPending = freshScenes.filter(
          (s) => s.status === "pending" && !s.taskId
        );
        const nowGenerating = freshScenes.filter((s) => s.status === "generating");

        // Lip sync readiness: a scene is "lip sync ready" ONLY if lipSyncStatus='done'.
        // 'error' is NOT acceptable under the premium policy — it means HeyGen Precision v3 failed
        // and the scene has no lip-synced clip. The pipeline retries until 'done'.
        // nowLipSyncReady and nowLipSyncProcessing are now handled by nowCompositeReady/nowCompositeProcessing
        // (which are based on lipSyncStatus in the 3-stage pipeline)
        const nowLipSyncProcessing = nowCompleted.filter(
          (s) => s.lipSyncStatus === "processing"
        );

        // ── ASSEMBLY READINESS CHECK (3-stage pipeline, 2026-05-28) ──────────────────────────
        // Compositing removed. Assembly gate is now based on lipSyncStatus only.
        // Performance scenes: lipSyncStatus must be 'done' (HeyGen Precision v3 output = final clip).
        // Cinematic scenes: lipSyncStatus is set to 'done' immediately (no lip sync needed).
        // compositeStatus is 'skipped' for ALL scenes.
        const nowCompositeReady = nowCompleted.filter((s) => s.lipSyncStatus === "done");
        // nowCompositeProcessing: scenes still waiting for lip sync (blocks assembly)
        const nowCompositeProcessing = nowCompleted.filter(
          (s) => s.lipSyncStatus === "processing" || (s.lipSyncStatus === "pending" && !s.lipSyncTaskId)
        );

        // Update completedScenes count on the job
        if (nowCompleted.length !== job.completedScenes) {
          await db
            .update(musicVideoJobs)
            .set({ completedScenes: nowCompleted.length, updatedAt: new Date() })
            .where(eq(musicVideoJobs.id, job.id));
        }

        // ── 6b. Composite reaper REMOVED (2026-05-28) ──────────────────────────────────────
        // Compositing is no longer part of the pipeline.
        // compositeStatus is 'skipped' for all scenes — no reaper needed.

        // ── 7. Trigger assembly when all scenes are done AND all compositing is ready ──
        // ASSEMBLY GATE (5-stage pipeline):
        //   1. No pending or generating scenes
        //   2. No lip sync jobs still processing
        //   3. No compositing jobs still processing
        //   4. All completed scenes have lipSyncStatus=done (compositing removed)
        const allVideosDone = nowPending.length === 0 && nowGenerating.length === 0;
        // allLipSyncReady removed — assembly gate now uses allCompositeReady (lipSyncStatus-based)
        const allCompositeReady = nowCompositeProcessing.length === 0;
        const hasCompletedScenes = nowCompleted.length > 0;

        if (allVideosDone && allCompositeReady && hasCompletedScenes) {
          // ARCHITECTURE NOTE (2026-05-19):
          // The heartbeat ONLY sets status='assembling'. It does NOT call assembleMusicVideo.
          // The assemblyWorker (server/assemblyWorker.ts) is the sole caller of assembleMusicVideo.
          // This ensures assembly always runs outside the HTTP request lifecycle and is never
          // killed by Cloud Run's 180-second request timeout.
          // The assemblyWorker polls every 2 minutes and picks up newly-queued jobs within 2 min.
          //
          // Advisory lock guard (2026-05-28):
          // Prevents two concurrent heartbeat ticks from both triggering assembly for the same job.
          // GET_LOCK acquires a named mutex; if another tick holds it, we skip this cycle.
          const assemblyLock = await acquireJobLock(db, job.id, 3);
          if (!assemblyLock.acquired) {
            console.log(`[SceneDispatch] Job ${job.id} — assembly lock held by another worker, skipping this tick`);
          } else {
            console.log(
              `[SceneDispatch] Job ${job.id} — all scenes done + lip sync ready (${nowCompositeReady.length} scenes). Queuing for assembly.`
            );
            try {
              await db
                .update(musicVideoJobs)
                .set({ status: "assembling", assemblyStartedAt: new Date(), updatedAt: new Date() })
                .where(eq(musicVideoJobs.id, job.id));
              totalAssembled++;
            } catch (assemblyTriggerErr: any) {
              console.error(`[SceneDispatch] Failed to queue job ${job.id} for assembly:`, assemblyTriggerErr);
            } finally {
              await releaseJobLock(db, job.id);
            }
          }
        } else if (allVideosDone && !allCompositeReady) {
          console.log(`[SceneDispatch] Job ${job.id} — all clips done, waiting for ${nowCompositeProcessing.length} lip sync job(s) to complete...`);
        }

        // ── 8. Never mark job as failed — if all scenes are stuck, reset them ──
        // Exception: if job is provider_unavailable, do NOT reset — wait for credits
        if (allVideosDone && allCompositeReady && nowCompleted.length === 0 && nowFailed.length > 0) {
          const freshJobRows = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, job.id)).limit(1).catch(() => []);
          const freshJob = freshJobRows[0] ?? null;
          if (freshJob?.status === 'provider_unavailable') {
            console.warn(`[SceneDispatch] Job ${job.id} — provider_unavailable, NOT resetting scenes. Waiting for credits.`);
          } else {
            console.warn(`[SceneDispatch] Job ${job.id} — all scenes in failed state. Resetting all to pending for retry.`);
            await db
              .update(musicVideoScenes)
              .set({
                status: "pending",
                taskId: null,
                errorMessage: null,
                providerErrorCode: null,
                providerErrorAt: null,
                lipSyncStatus: "pending",
                lipSyncTaskId: null,
                lipSyncVideoUrl: null,
                compositeStatus: "skipped", // compositing removed — always skipped
                compositeVideoUrl: null,
                updatedAt: new Date(),
              })
              .where(eq(musicVideoScenes.jobId, job.id));
          }
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
      compositeStarted: totalCompositeStarted, // always 0 — compositing removed
      compositeCompleted: totalCompositeCompleted, // always 0 — compositing removed
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
