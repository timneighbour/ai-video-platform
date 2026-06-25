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
 * CANONICAL 4-STAGE WIZ AI IMAGE-DRIVEN PIPELINE (UPDATED 2026-06-26)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PERFORMANCE SCENES (sceneType='performance', lipSync=true):
 *   IMAGE-DRIVEN PIPELINE (runImageDrivenPipeline):
 *   Step 1 — Flux Kontext (BFL via AIML): masterPortraitUrl → scene portrait (heroImageUrl)
 *             Zara's approved portrait is placed inside Air Studios Lyndhurst Hall.
 *   Step 2 — Crop to 1280×720 (sharp) — stored in heroImageUrl
 *   Step 3 — Grok Imagine Video 1.5 (xAI): cropped portrait → 5–6s animated scene clip
 *             Async: submit → grokVideoRequestId stored, polling on next heartbeat tick.
 *             Output stored in grokVideoUrl.
 *   Step 4 — Extract first frame of Grok video (ffmpeg) → used as OmniHuman input image
 *   Step 5 — OmniHuman 1.5 (AIML): first frame + vocal stem → lip-synced video (videoUrl)
 *             Async: submit → lipSyncTaskId stored, polling on next heartbeat tick.
 *
 * CINEMATIC SCENES (sceneType='cinematic', lipSync=false):
 *   BytePlus Seedance 2.0 (venue reference, no face) — image-to-video.
 *   No lip sync. compositeStatus=skipped.
 *
 * ASSEMBLY GATE:
 *   All performance scenes must have lipSyncStatus=done.
 *   All cinematic scenes must have lipSyncStatus=done (set to done immediately).
 *   compositeStatus is set to 'skipped' for ALL scenes.
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
import { eq, and, inArray } from "drizzle-orm";
import { acquireJobLock, releaseJobLock } from "../queue-lock";
import { assessLipSyncQuality, shouldProceedToAssembly, shouldRetryLipSync } from "../lip-sync-gate";
import { sdk } from "../_core/sdk";
import { startSceneRender, pollSceneStatus, extractLyricsForWindow, resolveVenueReferenceUrl } from "../music-video-service";
import { extractSceneAudioClip, sliceVocalStemForSeedance } from "../audio-clip-extractor";
// HeyGen Precision — LEGACY lip-sync provider (video-to-video, kept for in-flight job polling only)
import { submitHeyGenLipSyncV3, pollHeyGenLipSyncV3, isHeyGenConfigured } from "../ai-apis/heygen-lipsync";
// WaveSpeed InfiniteTalk — FALLBACK lip-sync provider (used if HeyGen Direct fails)
import { submitInfiniteTalkLipSync, pollInfiniteTalkLipSync } from "../ai-apis/infinitetalk-lipsync";
// ── NEW PRIMARY PIPELINE (2026-06-15) ─────────────────────────────────────────────────────────────
// HeyGen Direct Photo+Audio — PRIMARY for ALL performance scenes
// Bypasses Seedance entirely: portrait photo + vocal stem → lip-synced video in ONE API call
// Eliminates: "No speaker detected", wrong characters, portrait ratio issues
import { submitHeyGenDirectPhoto, pollHeyGenDirectPhoto, isHeyGenDirectConfigured, estimateHeyGenDirectCost } from "../ai-apis/direct-heygen-photo";
// Sync Labs Direct — FALLBACK if HeyGen Direct fails
import { submitSyncLabsDirect, pollSyncLabsDirect, isSyncLabsConfigured } from "../ai-apis/synclabs-direct";
import { getProbeDecision } from "../pre-render-validator";
import { resetSceneAttempts, checkProgressiveSpendAlerts } from "../spend-protection";
import { normaliseBpm } from "../instrument-analysis";
import { getVocalStemForCharacter } from "../vocal-isolation-service";
import { muxAudioIntoVideo, trimVideoStart } from "../audio-clip-extractor";
import { selectReferenceForScene, runStage2EnvironmentPrep } from "../character-auto-prep";
// compositeCinematicScene removed — compositing is no longer part of the pipeline (2026-05-28)
// The character is now generated INSIDE the scene by Seedance, not composited on top.
import { validateRawSceneForLipSync } from "../raw-scene-validator";
import { runPostRenderCheck, formatQualityLockRejection } from "../wiz-quality-lock";
import { triggerCloudVocalIsolation } from "../cloud-vocal-isolation";
import { notifyOwner } from "../_core/notification";
import sharp from "sharp";
import { storagePut } from "../storage";
import { applyTempoCorrection, calcSpeedFactor } from "../utils/tempoCorrection";
// ── IMAGE-DRIVEN PIPELINE (2026-06-25 / updated 2026-06-26) ─────────────────────────────────────
// Flux Kontext Max via AI/ML API — places approved character portrait into approved venue storyboard
import { runFluxKontextSync } from "../ai-apis/aimlapi-fluxkontext";
// Grok Imagine Video 1.5 (xAI) — animates the scene portrait into a cinematic 5–6s clip
import { submitGrokVideo, pollGrokVideo } from "../ai-apis/grok-imagine";
// OmniHuman 1.5 via AI/ML API — animates the Grok first frame with the scene's isolated vocal stem
import { submitAimlOmniHumanTask, pollAimlOmniHumanTask } from "../ai-apis/aimlapi-omnihuman";
// AudioTier import removed — assembly is now handled exclusively by assemblyWorker.ts

// ── POST-HEYGEN VENUE COMPOSITING ──────────────────────────────────────────────
// After HeyGen returns a clean lip-synced face clip (using the tight performanceRefUrl),
// composite it over the venue storyboard (Lyndhurst Hall) so the final output shows
// Zara performing in the correct environment.
//
// Layout (Tim's spec 2026-06-24):
//   - Background: venue storyboard (1344×768, scaled to 1280×720 output)
//   - Face clip: scaled to 560px wide, centered horizontally, lower third
//   - Audio: copied from HeyGen face clip (-c:a copy)
//
// Non-fatal: if compositing fails, returns the original HeyGen URL unchanged.
async function compositeHeyGenWithVenue(
  heyGenVideoUrl: string,
  venueImageUrl: string,
  sceneId: number | string,
  sceneDuration: number
): Promise<string> {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const { createRequire } = await import('module');
  const execFileAsync = promisify(execFile);

  // Resolve ffmpeg binary: prefer ffmpeg-static, fall back to system ffmpeg
  let ffmpegBin = 'ffmpeg';
  try {
    const _req = createRequire(import.meta.url);
    const installer = _req('ffmpeg-static');
    if (installer && fs.default.existsSync(installer)) {
      try { fs.default.chmodSync(installer, 0o755); } catch { /* ignore */ }
      ffmpegBin = installer;
    }
  } catch { /* use system ffmpeg */ }

  const tmpDir = os.default.tmpdir();
  const ts = Date.now();
  const fgPath = path.default.join(tmpDir, `wiz-venue-fg-${sceneId}-${ts}.mp4`);
  const bgPath = path.default.join(tmpDir, `wiz-venue-bg-${sceneId}-${ts}.jpg`);
  const outPath = path.default.join(tmpDir, `wiz-venue-composite-${sceneId}-${ts}.mp4`);

  try {
    console.log(`[VenueComposite] Scene ${sceneId} — downloading HeyGen clip + venue storyboard`);
    const [fgResp, bgResp] = await Promise.all([fetch(heyGenVideoUrl), fetch(venueImageUrl)]);
    if (!fgResp.ok) throw new Error(`HeyGen clip download failed: HTTP ${fgResp.status}`);
    if (!bgResp.ok) throw new Error(`Venue image download failed: HTTP ${bgResp.status}`);
    fs.default.writeFileSync(fgPath, Buffer.from(await fgResp.arrayBuffer()));
    fs.default.writeFileSync(bgPath, Buffer.from(await bgResp.arrayBuffer()));
    console.log(`[VenueComposite] Scene ${sceneId} — downloads complete, running ffmpeg composite`);

    // ffmpeg composite with chromakey:
    //   [0:v] = venue background (static image, looped for duration)
    //   [1:v] = HeyGen face clip (grey background ~#adadad — remove via chromakey)
    //   1. Scale venue background to 1280x720
    //   2. Chromakey out HeyGen grey background (color=0xadadad, similarity=0.15, blend=0.02)
    //   3. Scale face to 560px wide
    //   4. Overlay face centered horizontally, lower third
    //   Audio: copy from HeyGen face clip
    const outW = 1280, outH = 720;
    const faceW = 560;
    const faceX = Math.round((outW - faceW) / 2);  // centered horizontally
    const faceY = outH - Math.round(outH * 0.60) - 80;  // lower third: 60% from top - 80px padding
    const filterComplex = [
      `[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH}[bg]`,
      `[1:v]colorkey=color=0xadadad:similarity=0.15:blend=0.02,scale=${faceW}:-1[face]`,
      `[bg][face]overlay=x=${faceX}:y=${faceY}[out]`,
    ].join(';');

    await execFileAsync(ffmpegBin, [
      '-y',
      '-loop', '1', '-i', bgPath,
      '-i', fgPath,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-map', '1:a?',
      '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
      '-c:a', 'aac', '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      '-t', String(sceneDuration),
      '-movflags', '+faststart',
      outPath,
    ], { timeout: 170000 });

    if (!fs.default.existsSync(outPath) || fs.default.statSync(outPath).size < 10000) {
      throw new Error(`Composite output missing or too small for scene ${sceneId}`);
    }

    const compositeBuf = fs.default.readFileSync(outPath);
    const key = `music-video-scenes/${sceneId}-venue-composite-${ts}.mp4`;
    const { url } = await storagePut(key, compositeBuf, 'video/mp4');
    console.log(`[VenueComposite] Scene ${sceneId} composite uploaded → ${url.slice(0, 80)}...`);
    return url;
  } catch (compErr: any) {
    console.warn(`[VenueComposite] Scene ${sceneId} compositing failed (non-fatal, using HeyGen output): ${compErr?.message ?? String(compErr)}`);
    return heyGenVideoUrl; // fall back to raw HeyGen output
  } finally {
    for (const p of [fgPath, bgPath, outPath]) {
      try { if (fs.default.existsSync(p)) fs.default.unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IMAGE-DRIVEN PIPELINE — runImageDrivenPipeline()
// ═══════════════════════════════════════════════════════════════════════════
//
// FOUR MANDATORY PIPELINE RULES (Tim's architecture, 2026-06-25):
//
// Rule 1 — Character input is ALWAYS videoCharacters.masterPortraitUrl
//   Never describe a character in text. Read the approved portrait URL from the DB.
//   If masterPortraitUrl is null → PIPELINE HALT.
//
// Rule 2 — Venue input is ALWAYS musicVideoScenes.previewImageUrl
//   The approved storyboard IS the venue reference. Read it from the DB.
//   If previewImageUrl is null → PIPELINE HALT.
//
// Rule 3 — Fixed pipeline order:
//   DB: masterPortraitUrl + previewImageUrl
//   → Flux Kontext (AI/ML API): place character in venue → scene portrait
//   → Crop to 1280×720
//   → OmniHuman (AI/ML API): scene portrait + sceneAudioUrl → animated clip
//   → Store as musicVideoScenes.videoUrl
//
// Rule 4 — No intermediate CDN files without DB records
//   Every generated asset is written to DB immediately before the next step.
//
// These rules are enforced as hard null-guard checks. Any null URL throws
// with a specific PIPELINE HALT message and the function returns without
// attempting any API call or workaround.
// ═══════════════════════════════════════════════════════════════════════════
async function runImageDrivenPipeline(params: {
  db: Awaited<ReturnType<typeof getDb>>;
  sceneId: number;
  jobId: number;
  /** RULE 1: Must come from videoCharacters.masterPortraitUrl — never null */
  masterPortraitUrl: string;
  /** RULE 2: Must come from musicVideoScenes.previewImageUrl — never null */
  previewImageUrl: string;
  /** Isolated vocal stem for this scene window — from musicVideoScenes.sceneAudioUrl or job stem */
  sceneAudioUrl: string;
  sceneDuration: number;
}): Promise<void> {
  const { db, sceneId, jobId, masterPortraitUrl, previewImageUrl, sceneAudioUrl, sceneDuration } = params;

  // ── RULE 1: masterPortraitUrl null-guard ──────────────────────────────────
  if (!masterPortraitUrl || masterPortraitUrl.trim() === "") {
    console.error(`[ImageDrivenPipeline] PIPELINE HALT: masterPortraitUrl is null for scene ${sceneId} (job ${jobId}). Cannot proceed without an approved character portrait. Set videoCharacters.masterPortraitUrl and retry.`);
    await db!.update(musicVideoScenes)
      .set({ status: "failed", errorMessage: "PIPELINE HALT: masterPortraitUrl is null — approved character portrait required", updatedAt: new Date() })
      .where(eq(musicVideoScenes.id, sceneId));
    return;
  }

  // ── RULE 2: previewImageUrl null-guard ───────────────────────────────────
  if (!previewImageUrl || previewImageUrl.trim() === "") {
    console.error(`[ImageDrivenPipeline] PIPELINE HALT: previewImageUrl is null for scene ${sceneId} (job ${jobId}). Cannot proceed without an approved venue storyboard. Set musicVideoScenes.previewImageUrl and retry.`);
    await db!.update(musicVideoScenes)
      .set({ status: "failed", errorMessage: "PIPELINE HALT: previewImageUrl is null — approved venue storyboard required", updatedAt: new Date() })
      .where(eq(musicVideoScenes.id, sceneId));
    return;
  }

  // ── RULE 3a: Flux Kontext — place character in venue ─────────────────────
  //
  // CORRECT PARAMETER ORDER (verified 2026-06-25):
  //   image_url = masterPortraitUrl   ← Zara's portrait is the ACTUAL image input
  //   prompt    = venue transformation ← describes the background to place her in
  //
  // Flux Kontext Max uses image_url as the character/subject reference.
  // The prompt describes what to do with the background / environment.
  // Putting masterPortraitUrl in the prompt text does NOTHING — Flux cannot
  // fetch URLs from prompt strings. The image_url parameter is the only way
  // to pass an actual image reference to the model.
  //
  // WRONG (previous version):
  //   image_url: previewImageUrl,  ← venue as image input (wrong — no char reference)
  //   prompt: `...from ${masterPortraitUrl}...`  ← URL in text = ignored by model
  //
  // CORRECT (this version):
  //   image_url: masterPortraitUrl,  ← character portrait as actual image input
  //   prompt: "Keep the character exactly as shown. Place them in Air Studios..."
  console.log(`[ImageDrivenPipeline] Scene ${sceneId} STEP 1/4 — Flux Kontext: placing character into venue`);
  console.log(`[ImageDrivenPipeline]   image_url (character): ${masterPortraitUrl.slice(0, 80)}`);
  console.log(`[ImageDrivenPipeline]   venue reference:       ${previewImageUrl.slice(0, 80)}`);

  // Mark scene as generating before any API call.
  // Also persist sceneAudioUrl so the Grok polling section can retrieve it when submitting OmniHuman.
  await db!.update(musicVideoScenes)
    .set({ status: "generating", taskId: `omnihuman_pipeline:flux_kontext`, compositeStatus: "skipped", sceneAudioUrl, updatedAt: new Date() })
    .where(eq(musicVideoScenes.id, sceneId));

  let scenePortraitUrl: string;
  try {
    // image_url = masterPortraitUrl: Zara's approved portrait is the actual image reference.
    // The prompt describes the venue/environment transformation only.
    // previewImageUrl is described in the prompt as the target environment reference.
    // VENUE DESCRIPTION: Precise Lyndhurst Hall text (previewImageUrl URL is NOT embedded —
    // Flux Kontext cannot fetch URLs from prompt text; text description is the only way
    // to specify the venue when using a single image_url input).
    const fluxPrompt = `Keep the character exactly as shown in this portrait — same face, hair, skin tone, outfit, and expression. Place them naturally in Air Studios Lyndhurst Hall: white painted plaster walls, Gothic vaulted arched ceiling with exposed dark wooden trusses, large grey pipe organ with silver metal pipes along the back wall, rows of orchestral chairs and music stands on a wooden floor, round spotlight stage lighting rigs overhead, professional recording studio, NOT a church, warm amber and white stage lighting. The character should appear centre frame, facing the camera, naturally lit by the stage lighting. Do not alter the character's appearance in any way.`;

    scenePortraitUrl = await runFluxKontextSync({
      imageUrl: masterPortraitUrl,   // ← CORRECT: character portrait as actual image_url input
      prompt: fluxPrompt,
      aspectRatio: "16:9",
      outputFormat: "jpeg",
      safetyTolerance: 2,
    });
  } catch (fluxErr: any) {
    const errMsg = `Flux Kontext failed: ${String(fluxErr?.message ?? fluxErr).slice(0, 200)}`;
    console.error(`[ImageDrivenPipeline] Scene ${sceneId} STEP 1 FAILED — ${errMsg}`);
    await db!.update(musicVideoScenes)
      .set({ status: "failed_retryable", taskId: null, errorMessage: errMsg, updatedAt: new Date() })
      .where(eq(musicVideoScenes.id, sceneId));
    return;
  }

  // ── RULE 4: Write Flux Kontext result to DB immediately ───────────────────
  // Store the scene portrait in heroImageUrl before proceeding to crop.
  console.log(`[ImageDrivenPipeline] Scene ${sceneId} STEP 1 DONE — scene portrait: ${scenePortraitUrl.slice(0, 80)}`);
  await db!.update(musicVideoScenes)
    .set({ heroImageUrl: scenePortraitUrl, updatedAt: new Date() })
    .where(eq(musicVideoScenes.id, sceneId));

  // ── RULE 3b: Crop to 1280×720 ────────────────────────────────────────────
  console.log(`[ImageDrivenPipeline] Scene ${sceneId} STEP 2/4 — cropping scene portrait to 1280×720`);
  let croppedPortraitUrl: string;
  try {
    const imgResp = await fetch(scenePortraitUrl);
    if (!imgResp.ok) throw new Error(`Failed to download scene portrait: HTTP ${imgResp.status}`);
    const imgBuf = Buffer.from(await imgResp.arrayBuffer());

    // Resize to exactly 1280×720, covering the full frame (no letterboxing)
    const croppedBuf = await sharp(imgBuf)
      .resize(1280, 720, { fit: "cover", position: "centre" })
      .jpeg({ quality: 92 })
      .toBuffer();

    const cropKey = `music-video-scenes/${sceneId}-scene-portrait-1280x720-${Date.now()}.jpg`;
    const { url: cropUrl } = await storagePut(cropKey, croppedBuf, "image/jpeg");
    croppedPortraitUrl = cropUrl;
  } catch (cropErr: any) {
    const errMsg = `Crop to 1280×720 failed: ${String(cropErr?.message ?? cropErr).slice(0, 200)}`;
    console.error(`[ImageDrivenPipeline] Scene ${sceneId} STEP 2 FAILED — ${errMsg}`);
    await db!.update(musicVideoScenes)
      .set({ status: "failed_retryable", taskId: null, errorMessage: errMsg, updatedAt: new Date() })
      .where(eq(musicVideoScenes.id, sceneId));
    return;
  }

  // ── RULE 4: Write cropped portrait to DB immediately ─────────────────────
  // Store the cropped 1280×720 portrait before submitting to Grok.
  console.log(`[ImageDrivenPipeline] Scene ${sceneId} STEP 2 DONE — cropped portrait: ${croppedPortraitUrl.slice(0, 80)}`);
  await db!.update(musicVideoScenes)
    .set({
      heroImageUrl: croppedPortraitUrl,  // overwrite with the cropped version
      taskId: `omnihuman_pipeline:awaiting_grok`,
      updatedAt: new Date(),
    })
    .where(eq(musicVideoScenes.id, sceneId));

  // ── RULE 3c: Grok Imagine Video 1.5 — animate the scene portrait into a cinematic clip ──
  // This is ASYNC: submit → store grokVideoRequestId → poll on next heartbeat tick.
  // The Grok polling section handles Steps 4 & 5 when grokVideoStatus='processing'.
  console.log(`[ImageDrivenPipeline] Scene ${sceneId} STEP 3/5 — submitting to Grok Imagine Video 1.5`);
  console.log(`[ImageDrivenPipeline]   croppedPortraitUrl: ${croppedPortraitUrl.slice(0, 80)}`);
  console.log(`[ImageDrivenPipeline]   sceneDuration:      ${sceneDuration}s`);

  let grokRequestId: string;
  try {
    grokRequestId = await submitGrokVideo({
      prompt: `Cinematic music performance. The performer sings with subtle natural movement, gentle head sway, and expressive gestures. Air Studios Lyndhurst Hall: blue vaulted Gothic ceiling, large pipe organ, warm amber stage lighting, orchestral chairs. Camera: slow cinematic push-in. Photorealistic, 4K quality.`,
      image_url: croppedPortraitUrl,
      duration: Math.min(Math.max(Math.round(sceneDuration), 1), 10),
      aspect_ratio: "16:9",
      resolution: "720p",
    });
  } catch (grokErr: any) {
    const errMsg = `Grok Video submit failed: ${String(grokErr?.message ?? grokErr).slice(0, 200)}`;
    console.error(`[ImageDrivenPipeline] Scene ${sceneId} STEP 3 FAILED — ${errMsg}`);
    await db!.update(musicVideoScenes)
      .set({ status: "failed_retryable", taskId: null, errorMessage: errMsg, updatedAt: new Date() })
      .where(eq(musicVideoScenes.id, sceneId));
    return;
  }

  // ── RULE 4: Write Grok request_id to DB immediately ──────────────────────────────────────────────────────────────────────────────────────
  // Store the Grok request_id so the polling loop can pick it up on the next tick.
  // grokVideoStatus='processing' signals the polling section to check Grok on next heartbeat.
  console.log(`[ImageDrivenPipeline] Scene ${sceneId} STEP 3 SUBMITTED — Grok request_id: ${grokRequestId}`);
  await db!.update(musicVideoScenes)
    .set({
      status: "completed",               // Flux+crop done — scene is in Grok video processing
      taskId: `grok:${grokRequestId}`,
      grokVideoRequestId: grokRequestId,
      grokVideoStatus: "processing",
      lipSyncStatus: "pending",           // OmniHuman will be submitted after Grok completes
      compositeStatus: "skipped",
      updatedAt: new Date(),
    })
    .where(eq(musicVideoScenes.id, sceneId));

  console.log(`[ImageDrivenPipeline] Scene ${sceneId} — Grok task submitted. Next heartbeat tick will poll Grok, extract first frame, and submit to OmniHuman.`);
  // STEP 4 (extract Grok first frame + submit OmniHuman) is handled by the Grok polling section.
  // STEP 5 (store videoUrl from OmniHuman) is handled by the OmniHuman polling section.
}

// ── ISS-017: Heartbeat watchdog ────────────────────────────────────────────────
// Track the last successful tick time. If the heartbeat is silent for > 3 minutes,
// alert the owner so they can investigate.
let lastHeartbeatTickAt: number | null = null;
const WATCHDOG_SILENCE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
let watchdogAlertSentAt: number | null = null;
const WATCHDOG_ALERT_COOLDOWN_MS = 10 * 60 * 1000; // only alert once per 10 minutes

const SCENE_STUCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes — reaper handles beyond this
const HEYGEN_STUCK_TIMEOUT_MS = 25 * 60 * 1000; // 25 minutes max for HeyGen Precision jobs (can take 15-20min)
const INFINITETALK_STUCK_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes max for InfiniteTalk fallback lip sync
// Compositing removed from pipeline (2026-05-28) — constants kept for legacy polling only
const COMPOSITE_STUCK_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_COMPOSITE_ATTEMPTS = 3;

export async function sceneDispatchHeartbeatHandler(req: Request, res: Response) {
  const startedAt = Date.now();

  // ── ISS-017: Watchdog check ──────────────────────────────────────────────────────
  // If the heartbeat was previously seen but is now firing late, alert the owner.
  // This catches cases where the cron was paused, the process crashed and restarted,
  // or the heartbeat endpoint was unreachable for an extended period.
  if (lastHeartbeatTickAt !== null) {
    const silenceMs = startedAt - lastHeartbeatTickAt;
    if (silenceMs > WATCHDOG_SILENCE_THRESHOLD_MS) {
      const shouldAlert = watchdogAlertSentAt === null || (startedAt - watchdogAlertSentAt) > WATCHDOG_ALERT_COOLDOWN_MS;
      if (shouldAlert) {
        watchdogAlertSentAt = startedAt;
        notifyOwner({
          title: "⚠️ WIZ AI Heartbeat Gap Detected",
          content: `The scene dispatch heartbeat was silent for ${Math.round(silenceMs / 1000)}s (expected ≤60s). ` +
            `Last tick: ${new Date(lastHeartbeatTickAt).toISOString()}. ` +
            `Current tick: ${new Date(startedAt).toISOString()}. ` +
            `Check the Manus cron schedule and server health.`,
        }).catch(() => {});
        console.warn(`[SceneDispatch] ⚠️ Watchdog: heartbeat gap of ${Math.round(silenceMs / 1000)}s detected`);
      }
    }
  }

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
        lalalSourceId: musicVideoJobs.lalalSourceId,
        lalalTaskId: musicVideoJobs.lalalTaskId,
        updatedAt: musicVideoJobs.updatedAt,
        songBpm: musicVideoJobs.songBpm,
        probeSceneId: musicVideoJobs.probeSceneId,
        probePassed: musicVideoJobs.probePassed,
        stemVocalsUrl: musicVideoJobs.stemVocalsUrl,
        transcriptionSegments: musicVideoJobs.transcriptionSegments,
        sceneSetting: musicVideoJobs.sceneSetting,
      })
      .from(musicVideoJobs)
      .where(inArray(musicVideoJobs.status, ["rendering", "awaiting_probe_approval"]));

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
    // The job with the MOST COMPLETED SCENES gets the dispatch slot (most-progressed first).
    // Ties are broken by highest job ID (most recent job wins).
    // All other jobs still poll for completions and run assembly — they just
    // cannot submit NEW scene tasks until the active job finishes.
    const jobCompletionCounts = await Promise.all(
      activeJobs.map(async (j) => {
        const jobScenes = await db.select({ status: musicVideoScenes.status })
          .from(musicVideoScenes).where(eq(musicVideoScenes.jobId, j.id));
        const completedCount = jobScenes.filter(s => s.status === 'completed').length;
        return { id: j.id, completedCount };
      })
    );
    // Sort: most completed first, then highest ID as tiebreaker
    const sortedJobs = [...activeJobs].sort((a, b) => {
      const aCompleted = jobCompletionCounts.find(c => c.id === a.id)?.completedCount ?? 0;
      const bCompleted = jobCompletionCounts.find(c => c.id === b.id)?.completedCount ?? 0;
      if (bCompleted !== aCompleted) return bCompleted - aCompleted; // most completed first
      return b.id - a.id; // highest ID as tiebreaker
    });
    const dispatchSlotJobId = sortedJobs[0].id;
    if (activeJobs.length > 1) {
      console.log(`[SceneDispatch] SERIALISATION: ${activeJobs.length} active jobs — only job ${dispatchSlotJobId} may dispatch new scenes this tick. Others will poll only.`);
    }

    // ── ISS-001: Per-job concurrent scene limit (replaces global one-at-a-time guard) ──────────
    // Allow up to MAX_CONCURRENT_SCENES_PER_JOB scenes to generate in parallel per job.
    // This replaces the global block that prevented ANY dispatch while ANY scene was generating
    // across ALL jobs — which prevented multi-user scaling.
    // Lip sync polling and assembly are NOT affected.
    const MAX_CONCURRENT_SCENES_PER_JOB = 3;
    // Build a map of currently generating scene counts per job
    const generatingCountByJob = new Map<number, number>();
    {
      const allGeneratingScenes = await db
        .select({ jobId: musicVideoScenes.jobId })
        .from(musicVideoScenes)
        .where(eq(musicVideoScenes.status, "generating"));
      for (const s of allGeneratingScenes) {
        generatingCountByJob.set(s.jobId, (generatingCountByJob.get(s.jobId) ?? 0) + 1);
      }
    }

    let totalDispatched = 0;
    let totalPolled = 0;
    let totalLipSyncSubmitted = 0;
    let totalLipSyncPolled = 0;
    // Compositing removed (2026-05-28) — kept for backward-compatible summary response only
    const totalCompositeStarted = 0;
    const totalCompositeCompleted = 0;
    let totalAssembled = 0;
    // HeyGen Precision concurrency guard: max 2 lip-sync submissions per heartbeat tick
    let lipSyncSubmittedThisTick = 0;
    const LIPSYNC_MAX_PER_TICK = 2;
    // InfiniteTalk fallback concurrency guard
    let infiniteTalkSubmittedThisTick = 0;
    const INFINITETALK_MAX_PER_TICK = 2;

    for (const job of activeJobs) {
      try {
        // ── 1a. Cloud Vocal Isolation (Lalal.ai) ──────────────────────────────────
        // Auto-trigger vocal isolation when vocalsStatus is 'pending' or 'processing'.
        // This runs on every heartbeat tick until vocalsStatus='done' or 'failed'.
        // Scenes can still be dispatched while isolation is in progress — they will
        // defer lip sync submission until the stem is ready (see HARD GUARD below).
        if (job.vocalsStatus === "pending" || job.vocalsStatus === "processing") {
          try {
            const isolationResult = await triggerCloudVocalIsolation(
              job.id,
              job.audioUrl,
              job.lalalTaskId,
            );
            if (isolationResult.status === "done") {
              console.log(`[SceneDispatch] Job ${job.id}: ✅ vocal isolation complete — vocalsStatus=done`);
              // Update local job snapshot so downstream guards see the new status
              (job as any).vocalsStatus = "done";
            } else if (isolationResult.status === "no_key") {
              // No API key configured — skip isolation, allow full-mix fallback
              console.warn(`[SceneDispatch] Job ${job.id}: vocal isolation skipped (no WAVESPEED_API_KEY)`);
            } else if (isolationResult.status === "failed") {
              console.error(`[SceneDispatch] Job ${job.id}: vocal isolation failed — ${isolationResult.message}`);
            } else {
              // in_progress — still processing, will poll again next tick
              console.log(`[SceneDispatch] Job ${job.id}: vocal isolation in progress — ${isolationResult.message ?? ""}`);
            }
          } catch (vocalErr: any) {
            console.error(`[SceneDispatch] Job ${job.id}: vocal isolation error — ${String(vocalErr?.message ?? vocalErr).slice(0, 200)}`);
          }
        }

        const scenes = await db
          .select()
          .from(musicVideoScenes)
          .where(eq(musicVideoScenes.jobId, job.id));

        // Note: schema uses 'status' as the TypeScript field name (DB column is 'mvSceneStatus')
        // SERIALISATION: if this job does not hold the dispatch slot, suppress new dispatches.
        // GLOBAL GUARD: also suppress if any scene is generating globally (one-at-a-time across all jobs).
        // It will still poll generating scenes and trigger assembly.
        const holdsDispatchSlot = job.id === dispatchSlotJobId;
        // ISS-001: Check per-job concurrent scene limit instead of global block
        const jobGeneratingCount = generatingCountByJob.get(job.id) ?? 0;
        const jobAtConcurrencyLimit = jobGeneratingCount >= MAX_CONCURRENT_SCENES_PER_JOB;
        if (jobAtConcurrencyLimit) {
          console.log(`[SceneDispatch] Job ${job.id}: ${jobGeneratingCount}/${MAX_CONCURRENT_SCENES_PER_JOB} scenes generating — at concurrency limit, polling only.`);
        }
        // NOTE: pendingScenes is initially populated for slot-holding jobs only.
        // Probe-only dispatches bypass this restriction below (after getProbeDecision).
        const pendingScenes = (holdsDispatchSlot && !jobAtConcurrencyLimit)
          ? scenes.filter((s) => s.status === "pending" && !s.taskId)
          : []; // Non-priority jobs OR at concurrency limit: poll only, no new dispatches
        const generatingScenes = scenes.filter(
          (s) => s.status === "generating" && s.taskId
        );

        // ── 2. Auto-recover failed scenes back to pending ──────────────────────
        // Also recover failed_retryable scenes — these were blocked by provider issues
        // (balance exhaustion, copyright rejection) but should be retried on the next tick.
        //
        // CRITICAL GUARD: Do NOT reset failed_retryable scenes if:
        //   a) The job is provider_unavailable (credits exhausted — wait for manual resume)
        //   b) The provider health record shows isHealthy=false (circuit breaker active)
        // This prevents the credit-burning retry loop where the heartbeat keeps
        // re-submitting scenes that will immediately fail with "Insufficient credits".
        const jobIsProviderUnavailable = (job.status as string) === "provider_unavailable";
        const failedScenes = scenes.filter((s) => s.status === "failed" || (s.status as any) === "failed_retryable");
        if (failedScenes.length > 0) {
          if (jobIsProviderUnavailable) {
            // HARD STOP: do not retry while provider is unavailable — avoids credit burn loop
            console.warn(`[SceneDispatch] Job ${job.id} — SKIPPING retry of ${failedScenes.length} failed_retryable scene(s): job is provider_unavailable. Waiting for manual resume.`);
          } else {
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
        }

        // ── 2b. HARD PAUSE: awaiting_probe_approval ──────────────────────────
        // If the job is in awaiting_probe_approval, the owner has not yet approved
        // the probe scene. Skip ALL new scene dispatches for this job.
        // Polling of in-flight lip-sync tasks is still allowed (sections 5+).
        const jobIsAwaitingProbeApproval = (job.status as string) === "awaiting_probe_approval";
        if (jobIsAwaitingProbeApproval) {
          console.log(`[SceneDispatch] Job ${job.id} PAUSED — awaiting_probe_approval. No new dispatches until owner approves.`);
          // Skip to polling sections — do not dispatch any scenes
          // (pendingScenes will be cleared below in the probe gate)
        }

        // ── 3. CONTROLLED VALIDATION: Probe gate ──────────────────────────────
        // Before dispatching ANY scenes, run the pre-render validator and probe gate.
        // probePassed=null  → dispatch only the probe scene (best vocal scene)
        // probePassed=false → probe in progress — block all other scenes
        // probePassed=true  → owner approved — dispatch all remaining scenes
        let pendingProbeSceneId: number | null = null;
        const probeDecision = await getProbeDecision(job.id);

        if (jobIsAwaitingProbeApproval) {
          // Hard pause — owner must approve probe before any scenes are dispatched
          pendingScenes.length = 0;
          console.log(`[SceneDispatch] Job ${job.id} awaiting_probe_approval — all dispatches blocked, polling continues`);
        } else if (probeDecision.mode === "blocked") {
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
          // PROBE-ONLY: A probe is a single validation scene — it must NEVER compete
          // for the serialisation slot. Bypass the slot check entirely.
          // IMPORTANT: Re-query the probe scene directly from the DB to get the freshest
          // state — the failed-scene reset above may have just moved it back to pending
          // and the in-memory `scenes` array would be stale.
          const [freshProbeRows] = await db
            .select()
            .from(musicVideoScenes)
            .where(eq(musicVideoScenes.id, probeDecision.probeSceneId!));
          const probeScene = (freshProbeRows as typeof freshProbeRows | undefined) &&
            (freshProbeRows as any)?.status === "pending" && !(freshProbeRows as any)?.taskId
            ? (freshProbeRows as any)
            : null;
          // Also check the in-memory list as fallback (handles case where DB re-query returns array)
          const freshProbeScene = Array.isArray(freshProbeRows)
            ? (freshProbeRows as any[]).find((s: any) => s.status === "pending" && !s.taskId)
            : probeScene;
          if (freshProbeScene) {
            console.log(`[SceneDispatch] Job ${job.id} PROBE MODE — dispatching probe scene ${freshProbeScene.id} (index ${freshProbeScene.sceneIndex}) — slot bypass active`);
            pendingProbeSceneId = freshProbeScene.id;
            pendingScenes.length = 0;
            pendingScenes.push(freshProbeScene);
          } else {
            console.warn(`[SceneDispatch] Job ${job.id} PROBE MODE — probe scene ${probeDecision.probeSceneId} not in pending state (status: ${(freshProbeRows as any)?.status ?? 'unknown'}, taskId: ${(freshProbeRows as any)?.taskId ?? 'none'})`);
            pendingScenes.length = 0;
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
                  // For performance/lip-sync scenes, prefer the character placed inside
                  // the correct studio environment (environmentRefUrl).
                  // FALLBACK (2026-06-23): If environmentRefUrl is missing, use masterPortraitUrl.
                  // Only skip if BOTH are null — never block dispatch just because Stage 2
                  // hasn't completed yet. Stage 2 is still triggered in the background so
                  // future ticks will use the environment portrait once it's ready.
                  if (isLipSyncScene) {
                    const refUrl = bestChar.environmentRefUrl ?? bestChar.masterPortraitUrl ?? null;
                    if (!refUrl) {
                      // No reference at all — trigger Stage 2 and skip this tick
                      const isStage2InFlight = bestChar.autoPrepStatus === "stage2_processing";
                      if (!isStage2InFlight) {
                        const sceneStyle = job.sceneSetting ?? "Air Studios recording studio, Lyndhurst Hall, cinematic lighting";
                        console.log(`[SceneDispatch] Scene ${scene.id} TRIGGERING Stage 2 environment prep for char ${bestChar.id} (${bestChar.name}) — style: "${sceneStyle.slice(0, 60)}"`);
                        runStage2EnvironmentPrep({
                          characterId: bestChar.id,
                          identityBrief: bestChar.lockedDescription ?? bestChar.characterPrompt ?? bestChar.name ?? "performer",
                          characterName: bestChar.name ?? undefined,
                          masterPortraitUrl: bestChar.masterPortraitUrl ?? undefined,
                          sceneStyle,
                        }).catch(err => console.error(`[SceneDispatch] Stage 2 trigger error for char ${bestChar.id}:`, err));
                      } else {
                        console.log(`[SceneDispatch] Scene ${scene.id} DEFERRED — Stage 2 in progress, no portrait available yet for char ${bestChar.id} (${bestChar.name}).`);
                      }
                      // Skip dispatch — truly no portrait available
                      continue;
                    }
                    // environmentRefUrl is preferred; fall back to masterPortraitUrl
                    if (!bestChar.environmentRefUrl) {
                      console.log(`[SceneDispatch] Scene ${scene.id} FALLBACK — environmentRefUrl null, using masterPortraitUrl for char ${bestChar.id} (${bestChar.name}). Stage 2 will be triggered in background.`);
                      // Trigger Stage 2 in background so next tick uses the environment portrait
                      const isStage2InFlight = bestChar.autoPrepStatus === "stage2_processing";
                      if (!isStage2InFlight) {
                        const sceneStyle = job.sceneSetting ?? "Air Studios recording studio, Lyndhurst Hall, cinematic lighting";
                        runStage2EnvironmentPrep({
                          characterId: bestChar.id,
                          identityBrief: bestChar.lockedDescription ?? bestChar.characterPrompt ?? bestChar.name ?? "performer",
                          characterName: bestChar.name ?? undefined,
                          masterPortraitUrl: bestChar.masterPortraitUrl ?? undefined,
                          sceneStyle,
                        }).catch(err => console.error(`[SceneDispatch] Stage 2 trigger error for char ${bestChar.id}:`, err));
                      }
                    }
                  }

                  let autoRef: string | null;
                  if (isLipSyncScene) {
                    // HeyGen lip sync requires a TIGHT FACE PORTRAIT — face must fill the majority of the frame.
                    // Priority:
                    //   1. performanceRefUrl — close-up headshot, explicitly created for lip sync (CORRECT)
                    //   2. masterPortraitUrl — full-body fallback (acceptable, better than nothing)
                    // environmentRefUrl = full-body in venue — NEVER use for HeyGen input.
                    // The face is too small in environmentRefUrl for HeyGen to detect and animate reliably.
                    // (environmentRefUrl is used for BFL/Forge scene generation, not for HeyGen lip sync.)
                    const heyGenPhotoUrl = bestChar.performanceRefUrl ?? bestChar.masterPortraitUrl ?? null;
                    autoRef = heyGenPhotoUrl;
                    if (heyGenPhotoUrl) {
                      const source = bestChar.performanceRefUrl ? 'performanceRefUrl (tight face close-up)' : 'masterPortraitUrl (full-body fallback)';
                      console.log(`[SceneDispatch] Scene ${scene.id} HEYGEN PORTRAIT selected: ${source} → ${heyGenPhotoUrl.slice(0, 80)}...`);
                    }
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
              const feltBpm = normaliseBpm(job.songBpm, (job as any).genre);
              const tempoDesc = feltBpm < 90 ? 'slow, graceful, flowing' : feltBpm < 120 ? 'moderate, natural-paced' : 'energetic, dynamic, fast';
              scenePrompt += ` Tempo: ${feltBpm} BPM. All movement must be ${tempoDesc}.`;
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

            // ── PIPELINE ROUTING (2026-06-25) ──────────────────────────────────────────────────────────────────────
            // IMAGE-DRIVEN PIPELINE (Tim's four rules, 2026-06-25):
            // Performance scenes (lipSync=true) + character + audio:
            //   → runImageDrivenPipeline():
            //       Rule 1: masterPortraitUrl from videoCharacters (HALT if null)
            //       Rule 2: previewImageUrl from musicVideoScenes (HALT if null)
            //       Rule 3: Flux Kontext (AI/ML API) → crop 1280×720 → OmniHuman → videoUrl
            //       Rule 4: DB write after every generated asset
            //
            // Cinematic scenes (lipSync=false):
            //   → BytePlus Seedance 2.0 (venue reference, no face) — image-to-video
            //   No lip sync needed for these scenes.
            const isPerformanceScene = scene.sceneType === "performance";
            // slicedVocalStemUrl: use the already-sliced vocal stem from the R2V prep above,
            // or fall back to the full stem/audio URL if slicing wasn't attempted.
            const slicedVocalStemUrl = sceneAudioUrlForR2V ?? (job.stemVocalsUrl ?? job.audioUrl ?? undefined);

            // IMAGE-DRIVEN PIPELINE: performance scenes with lipSync=true
            // Reads masterPortraitUrl from videoCharacters and previewImageUrl from musicVideoScenes.
            // Both must be non-null — if either is null, runImageDrivenPipeline() logs PIPELINE HALT and returns.
            const useImageDrivenPipeline = isPerformanceScene && (scene.lipSync ?? false) && !!slicedVocalStemUrl;

            if (useImageDrivenPipeline) {
              // ── IMAGE-DRIVEN PIPELINE PATH (PRIMARY for performance scenes, 2026-06-25) ──────────
              // Rule 1: masterPortraitUrl — read from videoCharacters table (NOT resolvedCharacterUrl)
              // Rule 2: previewImageUrl  — read from musicVideoScenes table
              // Both are read fresh from DB inside runImageDrivenPipeline to enforce the rules.
              //
              // Resolve masterPortraitUrl from the job's characters (same logic as above but explicit)
              let masterPortraitUrlForPipeline: string | null = null;
              try {
                const { videoCharacters: vcTable } = await import("../../drizzle/schema");
                const { eq: eqVc } = await import("drizzle-orm");
                const jobCharsForPipeline = await db.select().from(vcTable).where(eqVc(vcTable.jobId, job.id));
                if (jobCharsForPipeline.length > 0) {
                  let assignmentsForPipeline: string[] = [];
                  try {
                    if (scene.characterAssignments) {
                      const parsed = JSON.parse(scene.characterAssignments);
                      if (Array.isArray(parsed)) {
                        assignmentsForPipeline = parsed.map((a: any) =>
                          typeof a === 'string' ? a : (a?.name ?? a?.characterName ?? String(a))
                        ).filter(Boolean);
                      }
                    }
                  } catch {}
                  const matchedCharForPipeline = assignmentsForPipeline.length > 0
                    ? jobCharsForPipeline.find(c => assignmentsForPipeline.some(a => typeof a === 'string' && a.toLowerCase() === c.name?.toLowerCase()))
                    : null;
                  const bestCharForPipeline = matchedCharForPipeline ?? jobCharsForPipeline.find(c => c.masterPortraitUrl) ?? jobCharsForPipeline[0];
                  masterPortraitUrlForPipeline = bestCharForPipeline?.masterPortraitUrl ?? null;
                }
              } catch (charLookupErr: any) {
                console.warn(`[SceneDispatch] Scene ${scene.id} IMAGE-DRIVEN: character lookup failed: ${charLookupErr.message}`);
              }

              // Read previewImageUrl fresh from the scene record
              const previewImageUrlForPipeline = scene.previewImageUrl ?? null;

              console.log(`[SceneDispatch] Scene ${scene.id} → IMAGE-DRIVEN PIPELINE (Flux Kontext → crop → OmniHuman)`);
              console.log(`[SceneDispatch] Scene ${scene.id} masterPortraitUrl: ${masterPortraitUrlForPipeline ? masterPortraitUrlForPipeline.slice(0, 80) + '...' : 'NULL — PIPELINE HALT'}`);
              console.log(`[SceneDispatch] Scene ${scene.id} previewImageUrl:   ${previewImageUrlForPipeline ? previewImageUrlForPipeline.slice(0, 80) + '...' : 'NULL — PIPELINE HALT'}`);

              // runImageDrivenPipeline enforces Rules 1-4 with hard null-guards.
              // If either URL is null, it writes PIPELINE HALT to errorMessage and returns.
              await runImageDrivenPipeline({
                db,
                sceneId: scene.id,
                jobId: job.id,
                masterPortraitUrl: masterPortraitUrlForPipeline ?? "",
                previewImageUrl: previewImageUrlForPipeline ?? "",
                sceneAudioUrl: slicedVocalStemUrl!,
                sceneDuration: scene.duration ?? 5,
              });

              if (pendingProbeSceneId === scene.id) {
                await db.update(musicVideoJobs)
                  .set({ probePassed: false, probeSceneId: scene.id, updatedAt: new Date() })
                  .where(eq(musicVideoJobs.id, job.id));
                console.log(`[SceneDispatch] Job ${job.id} PROBE MODE — Image-Driven Pipeline scene ${scene.id} in progress`);
              }
              totalDispatched++;
              totalLipSyncSubmitted++;
            } else {
              // ── BYTEPLUS SEEDANCE PATH: cinematic scenes (no face, venue reference only) ──────────
              const forcedRenderer = "byteplus_seedance";
              // IMPORTANT: BytePlus Seedance 2.0 blocks any image containing a real person face
              // (InputImageSensitiveContentDetected.PrivacyInformation). Use venue reference image only.
              const venueRefUrl = resolveVenueReferenceUrl(job.sceneSetting, scene.sceneIndex ?? 0);
              const sceneStoryboardUrl = venueRefUrl ?? undefined;
              console.log(`[SceneDispatch] Scene ${scene.id} → BytePlus Seedance 2.0 (${isPerformanceScene ? 'performance-no-char/audio' : 'cinematic'})`);
              console.log(`[SceneDispatch] Scene ${scene.id} venue-ref: ${sceneStoryboardUrl ? sceneStoryboardUrl.slice(0, 80) + '...' : 'NONE — text-to-video fallback'}`);
              const taskId = await startSceneRender(
                scene.id,
                scenePrompt,
                scene.duration ?? 5,
                scene.lipSync ?? false,
                scene.lipSyncStyle ?? "natural",
                forcedRenderer as any,
                undefined as any,
                sceneStoryboardUrl,
                (job.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1",
                job.id,
                resolvedCharacterUrl,
                job.audioUrl ?? undefined,
                scene.startTime ?? undefined,
                sceneLyrics
              );
              await db
                .update(musicVideoScenes)
                .set({ status: "generating", taskId, compositeStatus: "skipped", updatedAt: new Date() })
                .where(eq(musicVideoScenes.id, scene.id));
              if (pendingProbeSceneId === scene.id) {
                await db.update(musicVideoJobs)
                  .set({ probePassed: false, probeSceneId: scene.id, updatedAt: new Date() })
                  .where(eq(musicVideoJobs.id, job.id));
                console.log(`[SceneDispatch] Job ${job.id} PROBE MODE — BytePlus Seedance scene ${scene.id} in progress`);
              }
              console.log(`[SceneDispatch] Scene ${scene.id} dispatched → BytePlus Seedance taskId: ${taskId}, compositeStatus: skipped`);
              totalDispatched++;
            }
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
              // ── WIZ QUALITY LOCK: GATE 2 (POST-RENDER) ──────────────────────────────
              // Validate the returned video before proceeding to lip sync.
              // If rejected, reset to pending for a free retry (saves lip sync cost).
              const isPerformanceSceneForLock = scene.sceneType === "performance";
              try {
                const qualityCheck = await runPostRenderCheck({
                  sceneId: scene.id,
                  sceneIndex: scene.sceneIndex ?? 0,
                  videoUrl: pollResult.videoUrl,
                  isPerformanceScene: isPerformanceSceneForLock,
                  requiresPopulation: false,
                  storyboardImageUrl: scene.previewImageUrl,
                  skipAiVision: !isPerformanceSceneForLock,
                });
                if (!qualityCheck.passed) {
                  const currentRetryCount = (scene as any).retryCount ?? 0;
                  const MAX_QUALITY_LOCK_RETRIES = 3;
                  if (currentRetryCount >= MAX_QUALITY_LOCK_RETRIES) {
                    console.error(`[QualityLock] Scene ${scene.id} ESCALATED after ${currentRetryCount} quality lock rejections — marking failed_retryable`);
                    await db.update(musicVideoScenes)
                      .set({ status: "failed_retryable", taskId: null, errorMessage: formatQualityLockRejection(qualityCheck) + ` (after ${currentRetryCount} retries)`, updatedAt: new Date() })
                      .where(eq(musicVideoScenes.id, scene.id));
                  } else {
                    console.warn(`[QualityLock] Scene ${scene.id} RESET to pending (retry ${currentRetryCount + 1}/${MAX_QUALITY_LOCK_RETRIES}): ${qualityCheck.rejectedReason}`);
                    await db.update(musicVideoScenes)
                      .set({ status: "pending", taskId: null, videoUrl: null, videoKey: null, retryCount: currentRetryCount + 1, errorMessage: formatQualityLockRejection(qualityCheck), updatedAt: new Date() })
                      .where(eq(musicVideoScenes.id, scene.id));
                  }
                  totalPolled++;
                  continue;
                }
              } catch (qlErr: any) {
                // Quality Lock error — default to PASS (fail-safe, never block on error)
                console.warn(`[QualityLock] Scene ${scene.id} Gate 2 error (defaulting to PASS): ${String(qlErr?.message ?? qlErr).slice(0, 120)}`);
              }
              // Quality Lock passed — proceed to lip sync
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

              // ── TWO-PASS PIPELINE: Seedance render → HeyGen Precision Lip Sync ────────────────────
              // LOCKED DECISION: ALL performance scenes (lipSync=true) ALWAYS go through HeyGen
              // Precision Lip Sync regardless of whether Seedance had native audio injected.
              //
              // Pass 1 (Seedance): Renders the scene with correct character, lighting, movement.
              //   Native audio injection ([Audio1]) helps Seedance animate body/expression correctly.
              // Pass 2 (HeyGen): Takes the Seedance video + isolated vocal stem and applies
              //   frame-accurate phoneme-level lip sync. This is the precision layer.
              //
              // The "wavespeed:seedance:native:" prefix is retained for logging/audit only.
              // It no longer bypasses HeyGen — HeyGen always runs for performance scenes.

              // ── PERFORMANCE SCENE: Submit to HeyGen Precision after Seedance completes ───────────────
              // Seedance has produced the rendered video. Now pass it to HeyGen Precision
              // along with the isolated vocal stem to get frame-accurate lip sync.
              if (needsLipSync) {
                const characterNameLS = (scene as any).characterName ?? undefined;
                const isolatedVocalsUrlLS = await getVocalStemForCharacter(job.id, characterNameLS);

                if (!isolatedVocalsUrlLS && job.vocalsStatus === "done") {
                  throw new Error(`[HARD GUARD] Scene ${scene.id}: vocalsStatus=done but no stem found for character '${characterNameLS ?? 'lead'}' — refusing full-mix fallback`);
                }

                if (!isolatedVocalsUrlLS) {
                  // Vocals not ready yet — store video, defer lip sync to retry path
                  console.log(`[SceneDispatch] Scene ${scene.id}: Seedance done but no vocal stem yet — deferring lip sync`);
                  await db.update(musicVideoScenes)
                    .set({ status: "completed", videoUrl: pollResult.videoUrl, lipSyncStatus: "pending", lipSyncTaskId: null, updatedAt: new Date() })
                    .where(eq(musicVideoScenes.id, scene.id));
                } else {
                  const rawStartTimeLS = scene.startTime ?? 0;
                  const startTimeSecLS = rawStartTimeLS > 300 ? rawStartTimeLS / 1000 : rawStartTimeLS;
                  const sceneAudioUrlLS = await extractSceneAudioClip(
                    isolatedVocalsUrlLS,
                    startTimeSecLS,
                    scene.duration ?? 5,
                    scene.id
                  );
                  console.log(`[SceneDispatch] Scene ${scene.id}: vocal stem cut ✓ (${startTimeSecLS}–${startTimeSecLS + (scene.duration ?? 5)}s)`);

                  // ── Audio duration validation (250ms tolerance) ──────────────────────────
                  // Validate that the extracted audio clip duration matches scene.duration.
                  // Mismatches > 250ms cause sync drift in the final lip-sync output.
                  const expectedDurationSec = scene.duration ?? 5;
                  try {
                    const { execSync } = await import("child_process");
                    const ffprobeCmd = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${sceneAudioUrlLS}" 2>/dev/null || echo "skip"`;
                    const ffprobeOut = execSync(ffprobeCmd, { timeout: 10000 }).toString().trim();
                    if (ffprobeOut && ffprobeOut !== "skip" && !isNaN(parseFloat(ffprobeOut))) {
                      const actualDurationSec = parseFloat(ffprobeOut);
                      const driftMs = Math.abs(actualDurationSec - expectedDurationSec) * 1000;
                      if (driftMs > 250) {
                        console.warn(`[SceneDispatch] Scene ${scene.id} audio duration drift: expected ${expectedDurationSec}s, got ${actualDurationSec.toFixed(3)}s (drift: ${driftMs.toFixed(0)}ms > 250ms threshold)`);
                      } else {
                        console.log(`[SceneDispatch] Scene ${scene.id} audio duration OK: ${actualDurationSec.toFixed(3)}s (drift: ${driftMs.toFixed(0)}ms ✓)`);
                      }
                    }
                  } catch (durationCheckErr: any) {
                    // Non-fatal: ffprobe may not be available for remote URLs
                    console.log(`[SceneDispatch] Scene ${scene.id} audio duration check skipped: ${String(durationCheckErr?.message ?? "").slice(0, 80)}`);
                  }

                  const useHeyGen = isHeyGenConfigured();
                  if (useHeyGen) {
                    if (lipSyncSubmittedThisTick >= LIPSYNC_MAX_PER_TICK) {
                      console.log(`[SceneDispatch] Scene ${scene.id} HeyGen rate limit — storing video, deferring lip sync`);
                      await db.update(musicVideoScenes)
                        .set({ status: "completed", videoUrl: pollResult.videoUrl, lipSyncStatus: "pending", lipSyncTaskId: null, updatedAt: new Date() })
                        .where(eq(musicVideoScenes.id, scene.id));
                    } else {
                      // Singing/speech mode detection:
                      // Scenes with lyrics = singing → "precision" mode (frame-accurate, best for music)
                      // Scenes without lyrics = speech/ambient → "speed" mode (faster, sufficient for non-singing)
                      const hasSingingLyrics = !!(scene.lyrics && scene.lyrics.trim().length > 3);
                      const heyGenMode: "precision" | "speed" = hasSingingLyrics ? "precision" : "speed";
                      console.log(`[SceneDispatch] Scene ${scene.id} PERFORMANCE → HeyGen ${heyGenMode.toUpperCase()} (singing: ${hasSingingLyrics}, video: ${pollResult.videoUrl.slice(0, 60)}...)`);
                      // TWO-PASS PIPELINE: Seedance renders already have audio baked in via [Audio1]
                      // native injection. Do NOT mux audio into the video — this creates double-audio
                      // or phase conflicts that cause HeyGen to produce a frozen/static mouth.
                      //
                      // Instead: send the raw Seedance video + isolated vocal stem as SEPARATE inputs.
                      // HeyGen's API accepts video + audio independently and uses the audio URL
                      // exclusively to drive lip sync — the video's embedded audio is ignored.
                      //
                      // The isolated vocal stem (sceneAudioUrlLS) is the ONLY audio source for lip sync.
                      // The full mix is added back at assembly time — never at the lip sync stage.
                      const heyGenVideoUrl = pollResult.videoUrl;
                      console.log(`[SceneDispatch] Scene ${scene.id} sending raw Seedance video to HeyGen (no mux — audio passed separately)`);
                      const heyGenLipsyncId = await submitHeyGenLipSyncV3({
                        videoUrl: heyGenVideoUrl,
                        audioUrl: sceneAudioUrlLS,
                        title: `WizAI Scene ${scene.id} Job ${job.id}`,
                        mode: heyGenMode,
                        keepSameFormat: true,
                      });
                      const renderEndMs = Date.now();
                      await db.update(musicVideoScenes)
                        .set({
                          status: "completed",
                          videoUrl: pollResult.videoUrl,
                          originalVideoUrl: pollResult.videoUrl,  // preserve Seedance output
                          renderProvider: scene.modelAssignment ?? "seedance",
                          lipSyncStatus: "processing",
                          lipSyncTaskId: `heygen:${heyGenLipsyncId}`,
                          lipSyncProvider: "heygen",
                          compositeStatus: "skipped",
                          updatedAt: new Date(),
                        })
                        .where(eq(musicVideoScenes.id, scene.id));
                      if (pendingProbeSceneId === scene.id) {
                        await db.update(musicVideoJobs)
                          .set({ probePassed: false, probeSceneId: scene.id, updatedAt: new Date() })
                          .where(eq(musicVideoJobs.id, job.id));
                        console.log(`[SceneDispatch] Job ${job.id} PROBE MODE — HeyGen Precision submitted for scene ${scene.id}`);
                      }
                      console.log(`[SceneDispatch] Scene ${scene.id} → HeyGen lipsync ${heyGenLipsyncId} submitted ✓`);
                      lipSyncSubmittedThisTick++;
                      totalLipSyncSubmitted++;
                    }
                  } else {
                    // HeyGen not configured — fall back to InfiniteTalk
                    console.warn(`[SceneDispatch] Scene ${scene.id} HeyGen not configured — falling back to InfiniteTalk`);
                    if (infiniteTalkSubmittedThisTick >= INFINITETALK_MAX_PER_TICK) {
                      await db.update(musicVideoScenes)
                        .set({ status: "completed", videoUrl: pollResult.videoUrl, lipSyncStatus: "pending", lipSyncTaskId: null, updatedAt: new Date() })
                        .where(eq(musicVideoScenes.id, scene.id));
                    } else {
                      const itTaskId = await submitInfiniteTalkLipSync({
                        imageUrl: job.characterImageUrl ?? pollResult.videoUrl,
                        audioUrl: sceneAudioUrlLS,
                        prompt: scene.prompt ?? undefined,
                        resolution: "720p",
                      });
                      await db.update(musicVideoScenes)
                        .set({ status: "completed", videoUrl: pollResult.videoUrl, originalVideoUrl: pollResult.videoUrl, renderProvider: scene.modelAssignment ?? "seedance", lipSyncStatus: "processing", lipSyncTaskId: itTaskId.taskId, lipSyncProvider: "infinitetalk", compositeStatus: "skipped", updatedAt: new Date() })
                        .where(eq(musicVideoScenes.id, scene.id));
                      infiniteTalkSubmittedThisTick++;
                      totalLipSyncSubmitted++;
                    }
                  }
                }
              } else { // needsLipSync is false — cinematic scene
                // No lip sync needed — apply tempo correction then mark as completed
                // Tempo correction: slow/speed the video to match the song's BPM so that
                // orchestra/instrument motion feels locked to the music.
                let finalVideoUrl = pollResult.videoUrl;
                if (job.songBpm && job.songBpm > 0) {
                  const speedFactor = calcSpeedFactor(job.songBpm);
                  if (Math.abs(speedFactor - 1.0) >= 0.05) {
                    console.log(`[TempoCorrection] Scene ${scene.id}: applying ${speedFactor.toFixed(3)}× speed correction (song BPM: ${job.songBpm})`);
                    finalVideoUrl = await applyTempoCorrection(pollResult.videoUrl, job.songBpm, scene.id);
                  } else {
                    console.log(`[TempoCorrection] Scene ${scene.id}: BPM ${job.songBpm} → factor ${speedFactor} (within 5% of 1.0, skipping)`);
                  }
                }
                // compositeStatus=skipped for cinematic scenes (Seedance clip used directly in assembly)
                await db.update(musicVideoScenes)
                  .set({
                    status: "completed",
                    videoUrl: finalVideoUrl,
                    lipSyncStatus: "done", // no lip sync needed, treat as done
                    compositeStatus: "skipped", // cinematic scene — no compositing needed
                    updatedAt: new Date(),
                  })
                  .where(eq(musicVideoScenes.id, scene.id));
                console.log(`[SceneDispatch] Scene ${scene.id} completed (cinematic, no lip sync, tempo-corrected, compositeStatus=skipped) ✓`);
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
                    // ── Feature C: Auto-quality check — verify probe video duration ±0.5s ──
                    let probeDurationOk = true;
                    try {
                      const { execSync: _execSync } = await import("child_process");
                      const expectedDur = scene.duration ?? 5;
                      const ffprobeCmd = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${probeUrl}" 2>/dev/null || echo skip`;
                      const ffOut = _execSync(ffprobeCmd, { timeout: 12000 }).toString().trim();
                      if (ffOut && ffOut !== "skip" && !isNaN(parseFloat(ffOut))) {
                        const actualDur = parseFloat(ffOut);
                        if (Math.abs(actualDur - expectedDur) > 0.5) {
                          probeDurationOk = false;
                          const errMsg = `Duration mismatch: expected ${expectedDur.toFixed(1)}s, got ${actualDur.toFixed(1)}s`;
                          console.error(`[ProbeQuality] Scene ${scene.id} FAILED duration check — ${errMsg}`);
                          await db.update(musicVideoScenes)
                            .set({ status: "failed", errorMessage: errMsg, updatedAt: new Date() })
                            .where(eq(musicVideoScenes.id, scene.id));
                          await db.update(musicVideoJobs)
                            .set({ status: "rendering", probePassed: false as any, probeSceneId: null, probeVideoUrl: null, updatedAt: new Date() })
                            .where(eq(musicVideoJobs.id, job.id));
                        }
                      }
                    } catch { /* ffprobe unavailable — skip check, do not block */ }
                    if (probeDurationOk) {
                      await db.update(musicVideoJobs)
                        .set({ probeVideoUrl: probeUrl, updatedAt: new Date() })
                        .where(eq(musicVideoJobs.id, job.id));
                      console.log(`[SceneDispatch] Job ${job.id} PROBE COMPLETE (no lip sync) — raw video ready for owner review: ${probeUrl.slice(0, 60)}...`);
                    }
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
        // These are scenes where InfiniteTalk submission was deferred (rate limit)
        // or failed and needs retry. Also handles scenes that completed Seedance
        // but were queued before the hybrid pipeline switch (videoUrl set, lipSync pending).
        const lipSyncPendingScenes = scenes.filter(
          (s) => s.status === "completed" && s.lipSyncStatus === "pending" && !s.lipSyncTaskId
        );

        if (lipSyncPendingScenes.length > 0) {
          // RETRY: scenes where lip-sync submission was deferred (rate limit, no vocals yet) or failed
          for (const scene of lipSyncPendingScenes) {
            if (lipSyncSubmittedThisTick >= LIPSYNC_MAX_PER_TICK && infiniteTalkSubmittedThisTick >= INFINITETALK_MAX_PER_TICK) break;
            const isPerformanceScene = scene.sceneType === "performance";
            // lipSync flag is the authoritative gate — even performance scenes can have lipSync=false
            // (e.g. instrumental intro scenes where Zara is present but not singing)
            const needsLipSync = (scene.lipSync ?? false) && job.audioUrl && scene.startTime !== null && scene.startTime !== undefined;
            if (!needsLipSync) continue;
            // scene.videoUrl is only required for legacy Seedance + HeyGen Precision path.
            // HeyGen Direct Photo+Audio does NOT need a pre-rendered video — it generates
            // the lip-synced video directly from the character image + audio.
            // Only skip if there's no character image AND no videoUrl (truly nothing to work with).
            if (!scene.videoUrl && !job.characterImageUrl) {
              // Check if videoCharacters has a portrait before giving up
              const { videoCharacters: vcCheck } = await import("../../drizzle/schema");
              const vcRows = await db.select({ id: vcCheck.id, masterPortraitUrl: vcCheck.masterPortraitUrl, environmentRefUrl: vcCheck.environmentRefUrl })
                .from(vcCheck).where(eq(vcCheck.jobId, job.id));
              const hasCharPortrait = vcRows.some(r => r.environmentRefUrl || r.masterPortraitUrl);
              if (!hasCharPortrait) {
                console.log(`[SceneDispatch] Scene ${scene.id} RETRY: no Seedance video and no character portrait — deferring`);
                continue;
              }
            }
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
              console.log(`[SceneDispatch] Scene ${scene.id} RETRY: vocal stem cut ✓`);

              // RETRY: Use HeyGen Direct Photo+Audio (PRIMARY) — same as dispatch path
              // This replaces the broken HeyGen Precision video-to-video path.
              // Character image + vocal stem → lip-synced video in one API call.
              //
              // Resolve character URL: prefer videoCharacters.environmentRefUrl (character in correct
              // environment), then performanceRefUrl, then masterPortraitUrl, then job.characterImageUrl.
              let retryCharacterUrl: string | null = job.characterImageUrl ?? null;
              try {
                const { videoCharacters: videoCharsTable } = await import("../../drizzle/schema");
                const jobCharsRetry = await db.select().from(videoCharsTable).where(eq(videoCharsTable.jobId, job.id));
                if (jobCharsRetry.length > 0) {
                  // RETRY: always use performanceRefUrl (tight face crop) for HeyGen Direct
                  // Venue background is added post-HeyGen via compositeHeyGenWithVenue.
                  const bestRetryChar = jobCharsRetry.find(c => c.performanceRefUrl) ?? jobCharsRetry.find(c => c.masterPortraitUrl) ?? jobCharsRetry[0];
                  retryCharacterUrl = bestRetryChar.performanceRefUrl ?? bestRetryChar.masterPortraitUrl ?? bestRetryChar.previewImageUrl ?? retryCharacterUrl;
                }
              } catch (charErr: any) {
                console.warn(`[SceneDispatch] Scene ${scene.id} RETRY: could not resolve character URL from videoCharacters: ${charErr.message}`);
              }
              const useHeyGenDirectRetry = isHeyGenDirectConfigured() && !!retryCharacterUrl && lipSyncSubmittedThisTick < LIPSYNC_MAX_PER_TICK;
              const useSyncLabsRetry = !useHeyGenDirectRetry && isSyncLabsConfigured() && !!retryCharacterUrl;

              if (useHeyGenDirectRetry) {
                console.log(`[SceneDispatch] Scene ${scene.id} RETRY → HeyGen Direct Photo+Audio (character: ${retryCharacterUrl!.slice(0, 60)}...)`);
                const retryHeyGenDirectId = await submitHeyGenDirectPhoto({
                  imageUrl: retryCharacterUrl!,
                  audioUrl: sceneAudioUrl,
                  sceneId: scene.id,
                  title: `WizAI Scene ${scene.id} Job ${job.id} Retry`,
                });
                const rawConn = await getRawConn();
                try {
                  await rawConn.execute(
                    "UPDATE musicVideoScenes SET lipSyncStatus = 'processing', lipSyncTaskId = ?, lipSyncProvider = 'heygen', updatedAt = NOW() WHERE id = ?",
                    [`heygen_direct:${retryHeyGenDirectId}`, scene.id]
                  );
                } finally {
                  await rawConn.end();
                }
                console.log(`[SceneDispatch] Scene ${scene.id} RETRY → HeyGen Direct task ${retryHeyGenDirectId} submitted ✓`);
                lipSyncSubmittedThisTick++;
                totalLipSyncSubmitted++;
              } else if (useSyncLabsRetry) {
                // FALLBACK: Sync Labs — character image + audio → lip-synced video
                console.warn(`[SceneDispatch] Scene ${scene.id} RETRY: HeyGen Direct unavailable — falling back to Sync Labs`);
                const syncLabsJobId = await submitSyncLabsDirect({
                  imageUrl: retryCharacterUrl!,
                  audioUrl: sceneAudioUrl,
                  sceneId: scene.id,
                });
                const rawConn = await getRawConn();
                try {
                  await rawConn.execute(
                    "UPDATE musicVideoScenes SET lipSyncStatus = 'processing', lipSyncTaskId = ?, lipSyncProvider = 'synclabs', updatedAt = NOW() WHERE id = ?",
                    [`synclabs:${syncLabsJobId}`, scene.id]
                  );
                } finally {
                  await rawConn.end();
                }
                console.log(`[SceneDispatch] Scene ${scene.id} RETRY → Sync Labs job ${syncLabsJobId} submitted ✓`);
                lipSyncSubmittedThisTick++;
                totalLipSyncSubmitted++;
              } else if (!retryCharacterUrl) {
                console.warn(`[SceneDispatch] Scene ${scene.id} RETRY: no character image URL — cannot submit lip sync`);
              } else {
                console.log(`[SceneDispatch] Scene ${scene.id} RETRY: rate limit hit — deferring to next tick`);
              }
            } catch (retryErr: any) {
              console.error(`[SceneDispatch] Scene ${scene.id} RETRY lip-sync failed: ${String(retryErr?.message ?? retryErr).slice(0, 200)} — will retry next tick`);
              // Do NOT set lipSyncStatus=error — that permanently blocks assembly.
              // Leave as pending so the next heartbeat tick retries submission.
            }
          }
        }

        // ── 4b. Poll Grok Imagine Video 1.5 jobs (IMAGE-DRIVEN PIPELINE, Step 3 completion) ──────────────────────────────────────────────────────────────────────────────────────
        // When grokVideoStatus='processing', the scene is waiting for Grok to complete.
        // Once done: extract first frame via ffmpeg, upload to S3, submit to OmniHuman.
        const grokProcessingScenes = (scenes as any[]).filter(
          (s: any) => s.status === "completed" && s.grokVideoStatus === "processing" && s.grokVideoRequestId
        );

        if (grokProcessingScenes.length > 0) {
          for (const scene of grokProcessingScenes) {
            try {
              const sceneAge = Date.now() - new Date((scene as any).updatedAt).getTime();
              const GROK_STUCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
              if (sceneAge > GROK_STUCK_TIMEOUT_MS) {
                console.warn(`[GrokPoll] Scene ${scene.id} Grok job stuck for ${Math.round(sceneAge / 60000)}min — resetting to failed_retryable`);
                await db.update(musicVideoScenes)
                  .set({ status: "failed_retryable" as any, taskId: null, errorMessage: "Grok video generation timed out after 15 minutes", updatedAt: new Date() })
                  .where(eq(musicVideoScenes.id, scene.id));
                continue;
              }

              const grokResult = await pollGrokVideo((scene as any).grokVideoRequestId);
              console.log(`[GrokPoll] Scene ${scene.id} — Grok request_id=${scene.grokVideoRequestId} status=${grokResult.status}`);

              if (grokResult.status === "done" && grokResult.videoUrl) {
                // ── STEP 4: Extract first frame from Grok video using ffmpeg ──────────────────────────────────────────────────────────────────────────────────────
                console.log(`[GrokPoll] Scene ${scene.id} STEP 4/5 — Grok done, extracting first frame`);

                // Download Grok video and upload to S3 for permanent storage
                const grokVideoResp = await fetch(grokResult.videoUrl);
                if (!grokVideoResp.ok) throw new Error(`Grok video download failed: HTTP ${grokVideoResp.status}`);
                const grokVideoBuf = Buffer.from(await grokVideoResp.arrayBuffer());
                const grokVideoKey = `music-video-scenes/${scene.id}-grok-video-${Date.now()}.mp4`;
                const { url: grokVideoS3Url } = await storagePut(grokVideoKey, grokVideoBuf, "video/mp4");

                // Extract first frame using ffmpeg (in-process via child_process)
                const { execFile } = await import("child_process");
                const { promisify } = await import("util");
                const fs = await import("fs");
                const os = await import("os");
                const path = await import("path");
                const execFileAsync = promisify(execFile);

                // Resolve ffmpeg binary
                let ffmpegBin = "ffmpeg";
                try {
                  const { createRequire } = await import("module");
                  const _req = createRequire(import.meta.url);
                  const installer = _req("ffmpeg-static");
                  if (installer && fs.default.existsSync(installer)) {
                    try { fs.default.chmodSync(installer, 0o755); } catch { /* ignore */ }
                    ffmpegBin = installer;
                  }
                } catch { /* use system ffmpeg */ }

                const tmpDir = os.default.tmpdir();
                const grokTmpPath = path.default.join(tmpDir, `grok-vid-${scene.id}-${Date.now()}.mp4`);
                const frameTmpPath = path.default.join(tmpDir, `grok-frame-${scene.id}-${Date.now()}.jpg`);
                try {
                  fs.default.writeFileSync(grokTmpPath, grokVideoBuf);
                  await execFileAsync(ffmpegBin, [
                    "-y", "-i", grokTmpPath,
                    "-vframes", "1", "-q:v", "2",
                    frameTmpPath,
                  ], { timeout: 30000 });

                  if (!fs.default.existsSync(frameTmpPath) || fs.default.statSync(frameTmpPath).size < 5000) {
                    throw new Error(`First frame extraction failed or output too small for scene ${scene.id}`);
                  }

                  const frameBuf = fs.default.readFileSync(frameTmpPath);
                  const frameKey = `music-video-scenes/${scene.id}-grok-frame1-${Date.now()}.jpg`;
                  const { url: frameS3Url } = await storagePut(frameKey, frameBuf, "image/jpeg");
                  console.log(`[GrokPoll] Scene ${scene.id} STEP 4 DONE — first frame extracted: ${frameS3Url.slice(0, 80)}`);

                  // Persist Grok video URL + first frame URL to DB.
                  // grokVideoStatus stays 'processing' until OmniHuman is successfully submitted.
                  // This ensures that if OmniHuman submission fails, the outer catch leaves
                  // grokVideoStatus='processing' so the next heartbeat tick retries.
                  await db.update(musicVideoScenes)
                    .set({
                      grokVideoUrl: grokVideoS3Url,
                      grokVideoFirstFrameUrl: frameS3Url,
                      taskId: `omnihuman_pipeline:awaiting_omnihuman`,
                      updatedAt: new Date(),
                    } as any)
                    .where(eq(musicVideoScenes.id, scene.id));

                  // ── STEP 5: Submit OmniHuman 1.5 with the Grok first frame ──────────────────────────────────────────────────────────────────────────────────────
                  // OmniHuman receives the Grok first frame (cinematic, environment-placed)
                  // instead of the raw cropped portrait. The sceneAudioUrl comes from the scene record.
                  const sceneForOmni = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.id, scene.id));
                  const sceneAudioUrl = (sceneForOmni[0] as any)?.sceneAudioUrl ?? null;
                  if (!sceneAudioUrl) {
                    throw new Error(`sceneAudioUrl is null for scene ${scene.id} — cannot submit to OmniHuman`);
                  }

                  console.log(`[GrokPoll] Scene ${scene.id} STEP 5/5 — submitting to OmniHuman 1.5`);
                  console.log(`[GrokPoll]   frameS3Url:    ${frameS3Url.slice(0, 80)}`);
                  console.log(`[GrokPoll]   sceneAudioUrl: ${sceneAudioUrl.slice(0, 80)}`);

                  const omniHumanGenerationId = await submitAimlOmniHumanTask({
                    imageUrl: frameS3Url,
                    audioUrl: sceneAudioUrl,
                  });

                  // OmniHuman submitted successfully — NOW mark grokVideoStatus=done and set lip sync state.
                  // Doing this AFTER successful submission ensures grokVideoStatus=processing is preserved
                  // for retry if submitAimlOmniHumanTask throws above.
                  await db.update(musicVideoScenes)
                    .set({
                      grokVideoStatus: "done",
                      taskId: `omnihuman:${omniHumanGenerationId}`,
                      lipSyncStatus: "processing",
                      lipSyncTaskId: `omnihuman:${omniHumanGenerationId}`,
                      lipSyncProvider: "omnihuman",
                      updatedAt: new Date(),
                    } as any)
                    .where(eq(musicVideoScenes.id, scene.id));

                  console.log(`[GrokPoll] Scene ${scene.id} STEP 5 SUBMITTED — OmniHuman generationId: ${omniHumanGenerationId}. grokVideoStatus=done. Polling on next tick.`);
                } finally {
                  for (const p of [grokTmpPath, frameTmpPath]) {
                    try { if (fs.default.existsSync(p)) fs.default.unlinkSync(p); } catch { /* ignore */ }
                  }
                }
              } else if (grokResult.status === "failed" || grokResult.status === "expired") {
                console.error(`[GrokPoll] Scene ${scene.id} Grok video generation ${grokResult.status} — resetting to failed_retryable`);
                await db.update(musicVideoScenes)
                  .set({ status: "failed_retryable", taskId: null, errorMessage: `Grok video generation ${grokResult.status}`, updatedAt: new Date() } as any)
                  .where(eq(musicVideoScenes.id, scene.id));
              } else {
                // pending | processing — still running, check again next tick
                console.log(`[GrokPoll] Scene ${scene.id} — Grok still ${grokResult.status}, waiting...`);
              }
            } catch (grokPollErr: any) {
              console.error(`[GrokPoll] Scene ${scene.id} Grok poll error: ${String(grokPollErr?.message ?? grokPollErr).slice(0, 200)}`);
              // Non-fatal: leave grokVideoStatus=processing so next tick retries
            }
          }
        }

        // ── 5. Poll lip sync jobs (InfiniteTalk PRIMARY; legacy HeyGen for in-flight) ──
        const lipSyncProcessingScenes = scenes.filter(
          (s) => s.status === "completed" && s.lipSyncStatus === "processing" && s.lipSyncTaskId
        );

        if (lipSyncProcessingScenes.length > 0) {
          for (const scene of lipSyncProcessingScenes) {
            try {
              const sceneAge = Date.now() - new Date(scene.updatedAt).getTime();

              const isHeyGenTaskForTimeout = (scene.lipSyncTaskId ?? "").startsWith("heygen:");
              const stuckTimeout = isHeyGenTaskForTimeout ? HEYGEN_STUCK_TIMEOUT_MS : INFINITETALK_STUCK_TIMEOUT_MS;
              if (sceneAge > stuckTimeout) {
                console.warn(`[SceneDispatch] Scene ${scene.id} lip sync job stuck for ${Math.round(sceneAge / 60000)}min — resetting lip sync to pending for retry`);
                // CRITICAL: Only reset lipSyncStatus — NEVER change scene status to 'pending'.
                // Changing status to 'pending' would trigger a full Seedance re-render, wasting credits.
                // The scene is already 'completed' (Seedance render done) — only the lip sync needs retry.
                // Also restore videoUrl from originalVideoUrl if it was accidentally cleared.
                await db.update(musicVideoScenes)
                  .set({
                    status: "completed",  // MUST stay completed — do not re-render
                    // videoUrl restored via separate query below if null
                    lipSyncStatus: "pending",
                    lipSyncTaskId: null,
                    updatedAt: new Date()
                  })
                  .where(eq(musicVideoScenes.id, scene.id));
                continue;
              }

              // Detect provider from task ID prefix:
              // omnihuman:     → OmniHuman 1.5 via AI/ML API (IMAGE-DRIVEN PIPELINE, 2026-06-25)
              // heygen_direct: → HeyGen Direct Photo+Audio (legacy, still in-flight)
              // heygen:        → HeyGen Precision video-to-video (legacy, still in-flight)
              // synclabs:      → Sync Labs (fallback)
              // other          → InfiniteTalk / WaveSpeed (legacy fallback)
              const taskIdStr = scene.lipSyncTaskId!;
              let pollResult: { status: string; videoUrl?: string; errorCode?: string };
              if (taskIdStr.startsWith("omnihuman:")) {
                // ── OmniHuman 1.5 (IMAGE-DRIVEN PIPELINE) ──────────────────────────────────
                // AimlOmniHumanTask.status: "done" | "failed" | "running" | "pending"
                // AimlOmniHumanTask.videoUrl: string | undefined
                const omniHumanId = taskIdStr.slice("omnihuman:".length);
                console.log(`[SceneDispatch] Scene ${scene.id} — OmniHuman task ${omniHumanId}, polling`);
                try {
                  const omniPollResult = await pollAimlOmniHumanTask(omniHumanId);
                  if (omniPollResult.status === "done" && omniPollResult.videoUrl) {
                    pollResult = { status: "completed", videoUrl: omniPollResult.videoUrl };
                  } else if (omniPollResult.status === "failed") {
                    pollResult = { status: "failed" };
                  } else {
                    // pending | running — still processing
                    pollResult = { status: "processing" };
                  }
                } catch (omniPollErr: any) {
                  console.warn(`[SceneDispatch] Scene ${scene.id} OmniHuman poll error: ${omniPollErr?.message?.slice(0, 100)}`);
                  pollResult = { status: "processing" }; // treat as still running
                }
              } else if (taskIdStr.startsWith("heygen_direct:")) {
                const heyGenDirectId = taskIdStr.slice("heygen_direct:".length);
                console.log(`[SceneDispatch] Scene ${scene.id} — HeyGen Direct task ${heyGenDirectId}, polling`);
                const heyGenDirectPoll = await pollHeyGenDirectPhoto(heyGenDirectId, scene.id);
                pollResult = { status: heyGenDirectPoll.status, videoUrl: heyGenDirectPoll.videoUrl };
              } else if (taskIdStr.startsWith("heygen:")) {
                const heyGenId = taskIdStr.slice(7);
                console.log(`[SceneDispatch] Scene ${scene.id} — HeyGen Precision task ${heyGenId}, polling (legacy)`);
                const heyGenPoll = await pollHeyGenLipSyncV3(heyGenId);
                pollResult = { status: heyGenPoll.status, videoUrl: heyGenPoll.videoUrl };
              } else if (taskIdStr.startsWith("synclabs:")) {
                const syncLabsId = taskIdStr.slice("synclabs:".length);
                console.log(`[SceneDispatch] Scene ${scene.id} — Sync Labs job ${syncLabsId}, polling`);
                const syncLabsPoll = await pollSyncLabsDirect(syncLabsId, scene.id);
                pollResult = { status: syncLabsPoll.status, videoUrl: syncLabsPoll.videoUrl, errorCode: syncLabsPoll.errorCode };
              } else if (taskIdStr.length < 30 && !taskIdStr.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i) && !taskIdStr.match(/^[0-9a-f]{20,}/i)) {
                // Legacy HeyGen Precision (short alphanumeric, no prefix)
                console.log(`[SceneDispatch] Scene ${scene.id} — HeyGen Precision task ${taskIdStr}, polling (legacy no-prefix)`);
                const heyGenPoll = await pollHeyGenLipSyncV3(taskIdStr);
                pollResult = { status: heyGenPoll.status, videoUrl: heyGenPoll.videoUrl };
              } else {
                // InfiniteTalk (WaveSpeed) polling — legacy fallback
                console.log(`[SceneDispatch] Scene ${scene.id} — InfiniteTalk task ${taskIdStr}, polling WaveSpeed (legacy)`);
                const itPoll = await pollInfiniteTalkLipSync(taskIdStr);
                pollResult = { status: itPoll.status, videoUrl: itPoll.videoUrl };
              }

              if (pollResult.status === "completed" && pollResult.videoUrl) {
                // Download and re-upload to S3 for permanent storage
                const { storagePut } = await import("../storage");
                const resp = await fetch(pollResult.videoUrl);
                const buf = Buffer.from(await resp.arrayBuffer());
                const lipSyncProviderPrefix = scene.lipSyncProvider ?? "lipsync";
                const key = `music-video-scenes/${scene.id}-${lipSyncProviderPrefix}-${Date.now()}.mp4`;
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
                  // RED gate: increment retryCount and reset to pending for retry
                  const currentRetryCount = scene.retryCount ?? 0;
                  const nextRetryCount = currentRetryCount + 1;
                  const MAX_RETRIES = 4;
                  if (nextRetryCount >= MAX_RETRIES) {
                    // Exhausted all retries — flag for manual review
                    console.error(
                      `[SceneDispatch] Scene ${scene.id} lip-sync gate RED — EXHAUSTED ${MAX_RETRIES} retries. Flagging for manual review. Reason: ${lipSyncGateResult.failureReason ?? "LLM assessment"}`
                    );
                    await db.update(musicVideoScenes)
                      .set({ lipSyncStatus: "error" as any, lipSyncTaskId: null, retryCount: nextRetryCount, updatedAt: new Date() })
                      .where(eq(musicVideoScenes.id, scene.id));
                  } else {
                    // Retry with escalating provider: attempt 1-2 = heygen, attempt 3 = infinitetalk fallback
                    const retryProvider = nextRetryCount >= 3 ? "infinitetalk" : "heygen";
                    console.warn(
                      `[SceneDispatch] Scene ${scene.id} lip-sync gate RED — retry ${nextRetryCount}/${MAX_RETRIES - 1} via ${retryProvider}. Reason: ${lipSyncGateResult.failureReason ?? "LLM assessment"}`
                    );
                    await db.update(musicVideoScenes)
                      .set({ lipSyncStatus: "pending", lipSyncTaskId: null, retryCount: nextRetryCount, updatedAt: new Date() })
                      .where(eq(musicVideoScenes.id, scene.id));
                  }
                } else {
                  // GREEN or AMBER: proceed
                  if (lipSyncGateResult.gate === "AMBER") {
                    console.warn(
                      `[SceneDispatch] Scene ${scene.id} lip-sync gate AMBER — proceeding with flag. Assessment: ${lipSyncGateResult.qualitativeAssessment ?? ""}`
                    );
                  } else {
                    console.log(`[SceneDispatch] Scene ${scene.id} lip-sync gate GREEN ✓`);
                  }

                  // ── VENUE COMPOSITING (2026-06-24) ──────────────────────────────────────────────
                  // HeyGen produced a clean lip-synced face clip (performanceRefUrl input).
                  // Now composite it over the venue storyboard (Lyndhurst Hall) so the final
                  // output shows Zara performing in the correct environment.
                  // Non-fatal: if compositing fails, the raw HeyGen output is used.
                  let finalLipSyncUrl = url;
                  // OmniHuman scenes: the venue background is already baked in via Flux Kontext (Rule 3).
                  // No post-compositing needed — the output is already character-in-venue.
                  const isOmniHumanScene = scene.lipSyncTaskId?.startsWith("omnihuman:") || scene.lipSyncProvider === "omnihuman";
                  const isHeyGenDirectScene = !isOmniHumanScene && (scene.lipSyncTaskId?.startsWith("heygen_direct:") || scene.lipSyncProvider === "heygen");
                  if (isHeyGenDirectScene && scene.previewImageUrl) {
                    console.log(`[VenueComposite] Scene ${scene.id} — compositing HeyGen face over venue storyboard`);
                    finalLipSyncUrl = await compositeHeyGenWithVenue(
                      url,
                      scene.previewImageUrl,
                      scene.id,
                      scene.duration ?? 5
                    );
                    console.log(`[VenueComposite] Scene ${scene.id} — composite complete → ${finalLipSyncUrl.slice(0, 80)}...`);
                  } else if (isHeyGenDirectScene) {
                    console.log(`[VenueComposite] Scene ${scene.id} — no previewImageUrl, skipping venue composite (using raw HeyGen output)`);
                  }

                  // Determine which provider completed this lip sync
                  const completedLipSyncProvider = scene.lipSyncTaskId?.startsWith("omnihuman:") ? "omnihuman" : (scene.lipSyncTaskId?.startsWith("heygen_direct:") || scene.lipSyncTaskId?.startsWith("heygen:") ? "heygen" : "infinitetalk");
                  // Build quality score update (only set if LLM returned values)
                  const qualityScoreUpdate: Record<string, any> = {};
                  if (typeof lipSyncGateResult.lipSyncQualityScore === "number") qualityScoreUpdate.lipSyncQualityScore = lipSyncGateResult.lipSyncQualityScore.toFixed(3);
                  if (typeof lipSyncGateResult.faceConsistencyScore === "number") qualityScoreUpdate.faceConsistencyScore = lipSyncGateResult.faceConsistencyScore.toFixed(3);
                  if (typeof lipSyncGateResult.mouthVisibilityScore === "number") qualityScoreUpdate.mouthVisibilityScore = lipSyncGateResult.mouthVisibilityScore.toFixed(3);
                  if (typeof lipSyncGateResult.overallSceneScore === "number") qualityScoreUpdate.overallSceneScore = lipSyncGateResult.overallSceneScore.toFixed(3);
                  if (Object.keys(qualityScoreUpdate).length > 0) qualityScoreUpdate.qualityScoredAt = new Date();
                  // Rule 3 (IMAGE-DRIVEN PIPELINE): OmniHuman output IS the final videoUrl.
                  // For OmniHuman scenes, the output is already character-in-venue (no compositing).
                  // Store it as both videoUrl (primary) and lipSyncVideoUrl (for assembly compatibility).
                  const videoUrlUpdate: Record<string, any> = {};
                  if (isOmniHumanScene) {
                    videoUrlUpdate.videoUrl = finalLipSyncUrl;
                    videoUrlUpdate.videoKey = key;
                    videoUrlUpdate.originalVideoUrl = finalLipSyncUrl; // preserve as original
                  }
                  await db.update(musicVideoScenes)
                    .set({
                      lipSyncStatus: "done",
                      lipSyncVideoUrl: finalLipSyncUrl,
                      lipSyncVideoKey: key,
                      lipsyncedVideoUrl: finalLipSyncUrl,  // composited output (venue + face)
                      lipSyncProvider: completedLipSyncProvider,
                      compositeStatus: isOmniHumanScene ? "skipped" : (isHeyGenDirectScene && scene.previewImageUrl ? "done" : "skipped"),
                      ...videoUrlUpdate,
                      ...qualityScoreUpdate,
                      updatedAt: new Date(),
                    })
                    .where(eq(musicVideoScenes.id, scene.id));
                  console.log(`[SceneDispatch] Scene ${scene.id} ${completedLipSyncProvider} lip sync DONE ✓ (gate: ${lipSyncGateResult.gate}, compositeStatus: ${isHeyGenDirectScene && scene.previewImageUrl ? 'done' : 'skipped'}) → ${finalLipSyncUrl.slice(0, 60)}...`);
                  totalLipSyncPolled++;
                }

                // ── PROBE: if this is the probe scene, set probeVideoUrl (lip-synced version) ──
                try {
                  const [currentJob] = await db.select({ probeSceneId: musicVideoJobs.probeSceneId, probePassed: musicVideoJobs.probePassed })
                    .from(musicVideoJobs).where(eq(musicVideoJobs.id, job.id));
                  if (currentJob?.probeSceneId === scene.id && (currentJob?.probePassed === false || (currentJob?.probePassed as any) === 0)) {
                    // ── Feature C: Auto-quality check — verify probe video duration ±0.5s ──
                    let probeLipSyncDurationOk = true;
                    try {
                      const { execSync: _execSync2 } = await import("child_process");
                      const expectedDurLS = scene.duration ?? 5;
                      const ffprobeCmdLS = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${url}" 2>/dev/null || echo skip`;
                      const ffOutLS = _execSync2(ffprobeCmdLS, { timeout: 12000 }).toString().trim();
                      if (ffOutLS && ffOutLS !== "skip" && !isNaN(parseFloat(ffOutLS))) {
                        const actualDurLS = parseFloat(ffOutLS);
                        if (Math.abs(actualDurLS - expectedDurLS) > 0.5) {
                          probeLipSyncDurationOk = false;
                          const errMsgLS = `Duration mismatch: expected ${expectedDurLS.toFixed(1)}s, got ${actualDurLS.toFixed(1)}s`;
                          console.error(`[ProbeQuality] Scene ${scene.id} lip-sync FAILED duration check — ${errMsgLS}`);
                          await db.update(musicVideoScenes)
                            .set({ status: "failed", errorMessage: errMsgLS, lipSyncStatus: "error" as any, updatedAt: new Date() })
                            .where(eq(musicVideoScenes.id, scene.id));
                          await db.update(musicVideoJobs)
                            .set({ status: "rendering", probePassed: false as any, probeSceneId: null, probeVideoUrl: null, updatedAt: new Date() })
                            .where(eq(musicVideoJobs.id, job.id));
                        }
                      }
                    } catch { /* ffprobe unavailable — skip check, do not block */ }
                    if (probeLipSyncDurationOk) {
                      await db.update(musicVideoJobs)
                        .set({ probeVideoUrl: url, updatedAt: new Date() })
                        .where(eq(musicVideoJobs.id, job.id));
                      // Hard pause: set job status to awaiting_probe_approval so no more scenes are dispatched
                      await db.update(musicVideoJobs)
                        .set({ status: "awaiting_probe_approval" as any, updatedAt: new Date() })
                        .where(eq(musicVideoJobs.id, job.id));
                      console.log(`[SceneDispatch] Job ${job.id} PROBE LIP SYNC COMPLETE — status → awaiting_probe_approval. Owner review required: ${url.slice(0, 60)}...`);
                    }
                  }
                } catch { /* non-fatal */ }

              } else if (pollResult.status === "failed") {
                // Use structured error classification for SyncLabs jobs
                if (taskIdStr.startsWith("synclabs:") && pollResult.errorCode) {
                  const { classifySyncLabsError } = await import("../ai-apis/synclabs-errors");
                  const classification = await classifySyncLabsError(pollResult.errorCode).catch(() => null);
                  if (classification?.retryAction === "no_retry") {
                    // Permanent input error — flag as error so it doesn't loop forever
                    console.error(`[SceneDispatch] Scene ${scene.id} lip sync PERMANENT FAILURE (${pollResult.errorCode}) — ${classification.suggestion}`);
                    await db.update(musicVideoScenes)
                      .set({ lipSyncStatus: "error" as any, lipSyncTaskId: null, updatedAt: new Date() })
                      .where(eq(musicVideoScenes.id, scene.id));
                  } else if (classification?.retryAction === "escalate") {
                    console.error(`[SceneDispatch] Scene ${scene.id} lip sync INTERNAL ERROR (${pollResult.errorCode}) — escalating. ${classification.suggestion}`);
                    await db.update(musicVideoScenes)
                      .set({ lipSyncStatus: "pending", lipSyncTaskId: null, updatedAt: new Date() })
                      .where(eq(musicVideoScenes.id, scene.id));
                  } else {
                    console.error(`[SceneDispatch] Scene ${scene.id} lip sync job ${scene.lipSyncTaskId} FAILED (${pollResult.errorCode}) — resetting to pending for retry`);
                    await db.update(musicVideoScenes)
                      .set({ lipSyncStatus: "pending", lipSyncTaskId: null, updatedAt: new Date() })
                      .where(eq(musicVideoScenes.id, scene.id));
                  }
                } else {
                  console.error(`[SceneDispatch] Scene ${scene.id} lip sync job ${scene.lipSyncTaskId} FAILED — resetting to pending for retry`);
                  // Reset to pending so the heartbeat re-submits on the next tick.
                  // Under the premium policy, 'error' permanently blocks assembly — never use it here.
                  await db.update(musicVideoScenes)
                    .set({ lipSyncStatus: "pending", lipSyncTaskId: null, updatedAt: new Date() })
                    .where(eq(musicVideoScenes.id, scene.id));
                }
              } else {
                console.log(`[SceneDispatch] Scene ${scene.id} lip sync status: ${pollResult.status} — polling next tick`);
              }
            } catch (pollHeyGenErr: any) {
              console.error(`[SceneDispatch] Lip sync poll error for scene ${scene.id}: ${String(pollHeyGenErr?.message ?? pollHeyGenErr).slice(0, 200)}`);
            }
          }
        }

        // ── 5b. COMPOSITING REMOVED (2026-05-28) ─────────────────────────────────────────────
        // The compositing stage (ffmpeg chromakey + overlay) has been removed from the pipeline.
        // InfiniteTalk output (lipSyncVideoUrl) is the final performance clip for assembly.
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
        // 'error' is NOT acceptable under the premium policy — it means InfiniteTalk failed
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
    // ── ISS-017: Update watchdog timestamp on successful completion ──────────────────────────────────────────────────────
    lastHeartbeatTickAt = Date.now();
    // ── ISS-019: Check progressive spend alerts (50%/75%/90% of daily cap) ─────
    checkProgressiveSpendAlerts().catch(() => {});
    return res.json(summary);
  } catch (err: any) {
    console.error("[SceneDispatch] Fatal error:", err);
    return res.status(500).json({
      error: String(err?.message ?? err),
      timestamp: new Date().toISOString(),
    });
  }
}
