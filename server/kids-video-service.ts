/**
 * Kids Video Rendering Service
 *
 * Handles the paid render pipeline for kids animations:
 * 1. Animates each storyboard frame using Seedance image-to-video (fal.ai)
 * 2. Assembles all scene clips into a final video using ffmpeg
 * 3. Mixes in optional audio track if provided
 * 4. Uploads final video to S3 and updates the job record
 * 5. Sends customer email notification on completion
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getDb } from "./db";
import { kidsVideoJobs } from "../drizzle/schema";
import type { KidsStoryboardFrame } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";
import { initFalAI } from "./ai-apis/falai";
import { submitWaveSpeedVideo, pollWaveSpeedVideo } from "./ai-apis/wavespeed";

const execAsync = promisify(exec);

// Duration per scene in seconds (5s per storyboard frame)
const SCENE_DURATION = 5;
// Max poll attempts (5 min total at 10s intervals)
const MAX_POLL_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 10_000;
// Stagger between scene submissions to avoid rate limits
const SCENE_STAGGER_MS = 2_000;

/**
 * Map animation style to a cinematic video prompt suffix
 */
function styleToVideoPrompt(style: string): string {
  const map: Record<string, string> = {
    pixar3d: "Pixar 3D animation style, vibrant colours, expressive characters, smooth fluid motion, warm cinematic lighting",
    disney: "Disney animation style, magical fluid motion, classic Disney character design, rich colours, cinematic",
    anime: "Japanese anime style, expressive eyes, vibrant colours, clean animation, smooth character motion",
    cartoon: "Classic cartoon style, bold outlines, bright primary colours, exaggerated expressions, smooth animation",
    storybook: "Children's storybook illustration style, watercolour, soft textures, gentle camera movement, fairy-tale",
    claymation: "Claymation stop-motion style, textured clay look, rounded shapes, playful tactile motion",
  };
  return map[style] || map.pixar3d;
}

/**
 * Map video length to aspect ratio
 */
function screenFormatToAspectRatio(format: string): "16:9" | "9:16" | "1:1" {
  if (format === "9:16") return "9:16";
  if (format === "1:1") return "1:1";
  return "16:9";
}

/**
 * Submit a single scene for image-to-video generation using fal.ai Seedance.
 * Falls back to WaveSpeed text-to-video if image URL is missing.
 */
async function submitSceneRender(
  frame: KidsStoryboardFrame,
  style: string,
  aspectRatio: "16:9" | "9:16" | "1:1"
): Promise<{ taskId: string; provider: "falai" | "wavespeed" }> {
  const stylePrompt = styleToVideoPrompt(style);
  const motionPrompt = `${stylePrompt}, ${frame.description}, smooth gentle motion, kid-friendly, colourful, safe for children, no violence, no scary elements, cinematic camera movement`;

  // Prefer image-to-video if we have a storyboard frame image
  if (frame.imageUrl) {
    try {
      const falClient = initFalAI();
      const requestId = await falClient.seedanceImageToVideoSubmit({
        prompt: motionPrompt,
        image_url: frame.imageUrl,
        duration: 5,
        aspect_ratio: aspectRatio,
      });
      console.log(`[KidsVideo] Scene ${frame.sceneIndex} submitted to fal.ai i2v: ${requestId}`);
      return { taskId: `falai:${requestId}`, provider: "falai" };
    } catch (err) {
      console.warn(`[KidsVideo] fal.ai i2v failed for scene ${frame.sceneIndex}, falling back to WaveSpeed:`, err);
    }
  }

  // Fallback: WaveSpeed text-to-video with reference image
  const wsTaskId = await submitWaveSpeedVideo(
    {
      prompt: motionPrompt,
      aspect_ratio: aspectRatio,
      duration: 5,
      resolution: "720p",
      reference_images: frame.imageUrl ? [frame.imageUrl] : [],
    },
    "bytedance/seedance-2.0/text-to-video"
  );
  console.log(`[KidsVideo] Scene ${frame.sceneIndex} submitted to WaveSpeed: ${wsTaskId}`);
  return { taskId: `wavespeed:${wsTaskId}`, provider: "wavespeed" };
}

/**
 * Poll a scene render until it completes or fails.
 * Returns the video URL on success.
 */
async function pollSceneRender(
  taskId: string,
  sceneIndex: number
): Promise<string> {
  const isFalAI = taskId.startsWith("falai:");
  const isWaveSpeed = taskId.startsWith("wavespeed:");
  const rawId = taskId.replace(/^(falai:|wavespeed:)/, "");

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    try {
      if (isFalAI) {
        const falClient = initFalAI();
        const result = await falClient.seedanceStatus(
          rawId,
          "bytedance/seedance/v1.5/pro/image-to-video"
        );
        if (result.status === "completed" && result.video_url) {
          console.log(`[KidsVideo] Scene ${sceneIndex} completed (fal.ai): ${result.video_url}`);
          return result.video_url;
        }
        if (result.status === "failed") {
          throw new Error(`Scene ${sceneIndex} render failed on fal.ai`);
        }
      } else if (isWaveSpeed) {
        const result = await pollWaveSpeedVideo(rawId);
        if (result.status === "completed" && result.video_url) {
          console.log(`[KidsVideo] Scene ${sceneIndex} completed (WaveSpeed): ${result.video_url}`);
          return result.video_url;
        }
        if (result.status === "failed") {
          throw new Error(`Scene ${sceneIndex} render failed on WaveSpeed: ${result.error}`);
        }
      }
    } catch (pollErr) {
      if (attempt >= MAX_POLL_ATTEMPTS - 1) throw pollErr;
      console.warn(`[KidsVideo] Scene ${sceneIndex} poll attempt ${attempt + 1} error:`, pollErr);
    }
  }

  throw new Error(`Scene ${sceneIndex} timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
}

/**
 * Download a video from a URL to a local temp file.
 */
async function downloadVideo(url: string, destPath: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download video: ${resp.status} ${url}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

/**
 * Main kids video rendering pipeline.
 * Called after payment is confirmed.
 *
 * @param jobId - The kidsVideoJobs.id to render
 */
export async function renderKidsVideo(jobId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [job] = await db.select().from(kidsVideoJobs).where(eq(kidsVideoJobs.id, jobId));
  if (!job) throw new Error(`Kids video job ${jobId} not found`);

  // Guard: only render if payment is confirmed and storyboard is ready
  if (job.paymentStatus !== "paid") {
    throw new Error(`Job ${jobId} payment not confirmed (status: ${job.paymentStatus})`);
  }
  if (job.storyboardStatus !== "ready" || !job.storyboardFrames) {
    throw new Error(`Job ${jobId} storyboard not ready`);
  }
  // Guard: don't re-render if already completed
  if (job.renderStatus === "completed") {
    console.log(`[KidsVideo] Job ${jobId} already completed, skipping render`);
    return;
  }

  const frames: KidsStoryboardFrame[] = JSON.parse(job.storyboardFrames);
  if (!frames.length) throw new Error(`Job ${jobId} has no storyboard frames`);

  const aspectRatio = screenFormatToAspectRatio(job.screenFormat);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `kids-video-${jobId}-`));

  // Helper: update progress in DB
  const dbConn = db!;
  async function updateProgress(stage: string, progress: number, message: string) {
    await dbConn.update(kidsVideoJobs)
      .set({ renderStage: stage, renderProgress: progress, renderMessage: message, updatedAt: new Date() })
      .where(eq(kidsVideoJobs.id, jobId))
      .catch(() => {});
    console.log(`[KidsVideo] Job ${jobId} [${stage}] ${progress}%: ${message}`);
  }

  try {
    // Mark as processing with initial stage
    await dbConn.update(kidsVideoJobs)
      .set({ renderStatus: "processing", renderStage: "preparing_scenes", renderProgress: 5, renderMessage: "Preparing your scenes…", updatedAt: new Date() })
      .where(eq(kidsVideoJobs.id, jobId));

    console.log(`[KidsVideo] Job ${jobId}: starting render of ${frames.length} scenes`);

    await updateProgress("preparing_scenes", 10, `Preparing ${frames.length} scenes for animation…`);

    // ── Step 1: Submit all scenes for rendering (staggered) ──────────────────
    const taskIds: Array<{ taskId: string; frame: KidsStoryboardFrame }> = [];
    for (let i = 0; i < frames.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, SCENE_STAGGER_MS));
      const frame = frames[i];
      const { taskId } = await submitSceneRender(frame, job.animationStyle, aspectRatio);
      taskIds.push({ taskId, frame });
      const submitProgress = 10 + Math.round((i + 1) / frames.length * 10);
      await updateProgress("rendering_visuals", submitProgress, `Submitted scene ${i + 1} of ${frames.length} for rendering…`);
    }

    await updateProgress("rendering_visuals", 25, `Rendering ${frames.length} animation scenes — this takes a few minutes…`);

    // ── Step 2: Poll all scenes until complete ────────────────────────────────
    const sceneVideoUrls: string[] = [];
    for (let idx = 0; idx < taskIds.length; idx++) {
      const { taskId, frame } = taskIds[idx];
      const videoUrl = await pollSceneRender(taskId, frame.sceneIndex);
      sceneVideoUrls.push(videoUrl);
      const pollProgress = 25 + Math.round((idx + 1) / taskIds.length * 40); // 25→65
      await updateProgress("rendering_visuals", pollProgress, `Scene ${idx + 1} of ${taskIds.length} complete — ${taskIds.length - idx - 1} remaining…`);
    }

    console.log(`[KidsVideo] Job ${jobId}: all ${sceneVideoUrls.length} scenes rendered, assembling...`);
    await updateProgress("syncing_audio", 68, "All scenes rendered — assembling your video…");

    // ── Step 3: Download all scene clips ──────────────────────────────────────
    const sceneFiles: string[] = [];
    for (let i = 0; i < sceneVideoUrls.length; i++) {
      const sceneFile = path.join(tmpDir, `scene_${String(i).padStart(3, "0")}.mp4`);
      await downloadVideo(sceneVideoUrls[i], sceneFile);
      sceneFiles.push(sceneFile);
    }

    await updateProgress("syncing_audio", 75, "Combining scenes into final video…");

    // ── Step 4: Concatenate scenes ────────────────────────────────────────────
    const concatFile = path.join(tmpDir, "concat.txt");
    fs.writeFileSync(concatFile, sceneFiles.map((f) => `file '${f}'`).join("\n"));

    const concatenatedVideo = path.join(tmpDir, "concatenated.mp4");
    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c:v libx264 -preset fast -crf 22 "${concatenatedVideo}"`,
      { timeout: 600_000 }
    );

    // ── Step 5: Mix in audio if provided ──────────────────────────────────────
    const finalVideo = path.join(tmpDir, "final.mp4");

    if (job.audioUrl) {
      await updateProgress("syncing_audio", 82, "Syncing your audio track…");
      // Download audio
      const audioFile = path.join(tmpDir, "audio.mp3");
      const audioResp = await fetch(job.audioUrl);
      const audioBuf = Buffer.from(await audioResp.arrayBuffer());
      fs.writeFileSync(audioFile, audioBuf);

      // Get durations
      const videoInfo = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${concatenatedVideo}"`,
        { timeout: 30_000 }
      );
      const videoDuration = parseFloat(videoInfo.stdout.trim()) || 0;

      const audioInfo = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFile}"`,
        { timeout: 30_000 }
      );
      const audioDuration = parseFloat(audioInfo.stdout.trim()) || 0;

      if (videoDuration > 0 && audioDuration > 0 && videoDuration < audioDuration) {
        // Loop video to cover full audio
        const loopedVideo = path.join(tmpDir, "looped.mp4");
        await execAsync(
          `ffmpeg -y -stream_loop -1 -i "${concatenatedVideo}" -t ${audioDuration} -c:v libx264 -preset fast -crf 22 "${loopedVideo}"`,
          { timeout: 600_000 }
        );
        await execAsync(
          `ffmpeg -y -i "${loopedVideo}" -i "${audioFile}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -shortest "${finalVideo}"`,
          { timeout: 600_000 }
        );
      } else {
        await execAsync(
          `ffmpeg -y -i "${concatenatedVideo}" -i "${audioFile}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -shortest "${finalVideo}"`,
          { timeout: 600_000 }
        );
      }
    } else {
      // No audio — just copy the concatenated video
      fs.copyFileSync(concatenatedVideo, finalVideo);
    }

    await updateProgress("finalising", 90, "Finalising your video…");

    // ── Step 6: Upload to S3 ──────────────────────────────────────────────────
    const finalBuffer = fs.readFileSync(finalVideo);
    const finalKey = `kids-videos/job-${jobId}-final-${Date.now()}.mp4`;
    const { url: finalUrl } = await storagePut(finalKey, finalBuffer, "video/mp4");

    await updateProgress("finalising", 97, "Almost done — saving your video…");

    // ── Step 7: Update job record ─────────────────────────────────────────────
    await dbConn.update(kidsVideoJobs)
      .set({
        renderStatus: "completed",
        renderStage: "complete",
        renderProgress: 100,
        renderMessage: "Your animation is ready!",
        videoUrl: finalUrl,
        videoKey: finalKey,
        updatedAt: new Date(),
      })
      .where(eq(kidsVideoJobs.id, jobId));

    console.log(`[KidsVideo] Job ${jobId} completed: ${finalUrl}`);

    // ── Step 8: Send customer + owner notifications ───────────────────────────
    try {
      const { users } = await import("../drizzle/schema");
      const { eq: eqUser } = await import("drizzle-orm");
      const [user] = await dbConn.select({ name: users.name, email: users.email })
        .from(users)
        .where(eqUser(users.id, job.userId));

      if (user) {
        const { emailKidsVideoComplete, emailRenderComplete } = await import("./email");

        // Send to customer
        if (user.email) {
          await emailKidsVideoComplete({
            name: user.name || "there",
            email: user.email,
            jobId: String(jobId),
            videoUrl: finalUrl,
            style: job.animationStyle,
            videoLength: job.videoLength,
          }).catch((err: unknown) => console.error("[Email] Customer email failed:", err));
        }

        // Notify owner
        await emailRenderComplete({
          name: user.name || "Unknown",
          email: user.email || "",
          jobId: String(jobId),
          quality: `${job.animationStyle} ${job.videoLength}`,
        }).catch((err: unknown) => console.error("[Email] Owner email failed:", err));
      }
    } catch (emailErr) {
      console.error("[KidsVideo] Email notification failed (non-fatal):", emailErr);
    }

  } catch (err) {
    console.error(`[KidsVideo] Job ${jobId} render failed:`, err);

    // Mark as failed
    await dbConn.update(kidsVideoJobs)
      .set({
        renderStatus: "failed",
        renderStage: "failed",
        renderMessage: "Render failed — please try again or contact support",
        errorMessage: String(err),
        updatedAt: new Date(),
      })
      .where(eq(kidsVideoJobs.id, jobId))
      .catch(() => {});

    throw err;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}
