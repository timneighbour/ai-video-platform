/**
 * WizAnimate Render Service
 * Animates each storyboard frame using Seedance 1.5 Pro image-to-video,
 * then concatenates the clips into a final video and uploads to S3.
 *
 * This service is called asynchronously after a successful Stripe payment.
 * It does NOT block the webhook response.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { getDb } from "./db";
import { kidsVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { initFalAI } from "./ai-apis/falai";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

const execAsync = promisify(exec);

// Duration per scene clip in seconds (5s is the minimum for Seedance)
const SCENE_CLIP_DURATION = 5;

// How long to wait between polls (ms)
const POLL_INTERVAL_MS = 8_000;

// Maximum total wait per scene (10 minutes)
const MAX_WAIT_PER_SCENE_MS = 600_000;

interface StoryboardFrame {
  sceneIndex: number;
  sceneLabel: string;
  imageUrl: string;
  description: string;
}

/**
 * Trigger the full WizAnimate render pipeline for a paid job.
 * Called fire-and-forget from the Stripe webhook.
 */
export async function triggerKidsVideoRender(jobId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error(`[KidsVideoRender] DB unavailable for job ${jobId}`);
    return;
  }

  // Mark as processing
  await db.update(kidsVideoJobs)
    .set({ renderStatus: "processing", updatedAt: new Date() })
    .where(eq(kidsVideoJobs.id, jobId));

  try {
    // Load job
    const [job] = await db.select().from(kidsVideoJobs).where(eq(kidsVideoJobs.id, jobId));
    if (!job) throw new Error(`Job ${jobId} not found`);

    const frames: StoryboardFrame[] = job.storyboardFrames
      ? (JSON.parse(job.storyboardFrames) as StoryboardFrame[])
      : [];

    if (!frames.length) throw new Error("No storyboard frames to render");

    // Filter out frames with no image
    const renderableFrames = frames.filter(f => f.imageUrl && f.imageUrl.length > 0);
    if (!renderableFrames.length) throw new Error("No frames have preview images");

    const aspectRatio = (["16:9", "9:16", "1:1"].includes(job.screenFormat)
      ? job.screenFormat
      : "16:9") as "16:9" | "9:16" | "1:1";

    const fal = initFalAI();

    console.log(`[KidsVideoRender] Job ${jobId}: animating ${renderableFrames.length} frames`);

    // Step 1: Submit all frames to Seedance in parallel
    const submissions = await Promise.all(
      renderableFrames.map(async (frame) => {
        const prompt = `${frame.description}, smooth cinematic animation, kids animation style, fluid motion`;
        const requestId = await fal.seedanceImageToVideoSubmit({
          prompt,
          image_url: frame.imageUrl,
          duration: SCENE_CLIP_DURATION,
          aspect_ratio: aspectRatio,
        });
        console.log(`[KidsVideoRender] Job ${jobId} scene ${frame.sceneIndex}: submitted requestId=${requestId}`);
        return { frame, requestId };
      })
    );

    // Step 2: Poll each submission until complete
    const sceneVideoUrls: string[] = [];
    for (const { frame, requestId } of submissions) {
      const startMs = Date.now();
      let videoUrl: string | undefined;

      while (Date.now() - startMs < MAX_WAIT_PER_SCENE_MS) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        const result = await fal.seedanceStatus(requestId, "bytedance/seedance/v1.5/pro/image-to-video");
        if (result.status === "completed" && result.video_url) {
          videoUrl = result.video_url;
          console.log(`[KidsVideoRender] Job ${jobId} scene ${frame.sceneIndex}: completed`);
          break;
        }
        if (result.status === "failed") {
          throw new Error(`Scene ${frame.sceneIndex} render failed`);
        }
        console.log(`[KidsVideoRender] Job ${jobId} scene ${frame.sceneIndex}: status=${result.status}`);
      }

      if (!videoUrl) throw new Error(`Scene ${frame.sceneIndex} timed out after ${MAX_WAIT_PER_SCENE_MS / 1000}s`);
      sceneVideoUrls.push(videoUrl);
    }

    // Step 3: Download all scene clips to a temp directory
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `wiz-animate-${jobId}-`));
    const clipPaths: string[] = [];

    for (let i = 0; i < sceneVideoUrls.length; i++) {
      const clipPath = path.join(tmpDir, `scene-${i}.mp4`);
      const response = await fetch(sceneVideoUrls[i]);
      if (!response.ok) throw new Error(`Failed to download scene ${i} clip`);
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(clipPath, buffer);
      clipPaths.push(clipPath);
      console.log(`[KidsVideoRender] Job ${jobId}: downloaded scene ${i} clip (${buffer.length} bytes)`);
    }

    // Step 4: Normalize all clips to uniform format (strip audio, enforce CFR)
    const normalizedPaths: string[] = [];
    for (let i = 0; i < clipPaths.length; i++) {
      const normPath = path.join(tmpDir, `norm-${i}.mp4`);
      await execAsync(
        `ffmpeg -y -i "${clipPaths[i]}" -an -c:v libx264 -preset fast -crf 22 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=24" -vsync cfr -r 24 -pix_fmt yuv420p "${normPath}"`
      );
      normalizedPaths.push(normPath);
    }

    // Step 5: Concatenate normalized clips
    const concatListPath = path.join(tmpDir, "concat.txt");
    const concatContent = normalizedPaths.map(p => `file '${p}'`).join("\n");
    fs.writeFileSync(concatListPath, concatContent);

    const concatenatedPath = path.join(tmpDir, "concatenated.mp4");
    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:v copy "${concatenatedPath}"`
    );
    console.log(`[KidsVideoRender] Job ${jobId}: concatenated ${clipPaths.length} clips`);

    // Step 6: Lip sync pipeline (if enabled and audio is available)
    // DEFINITIVE RULE: Isolated vocals → SyncLabs sync-3 → strip SyncLabs audio → overlay original full mix
    let finalVideoPath = concatenatedPath;

    if (job.enableLipSync && job.audioUrl) {
      console.log(`[KidsVideoRender] Job ${jobId}: lip sync ENABLED — applying isolated vocals pipeline`);

      try {
        // Get isolated vocals (Demucs separation)
        let vocalsAudioUrl = job.vocalsUrl;
        if (!vocalsAudioUrl) {
          // Run Demucs separation on the fly
          const { getVocalStemForCharacter } = await import("./vocal-isolation-service");
          const vocalsResult = await getVocalStemForCharacter(jobId, job.audioUrl, "kids_video");
          if (vocalsResult?.vocalsUrl) {
            vocalsAudioUrl = vocalsResult.vocalsUrl;
            // Save for future use
            await db.update(kidsVideoJobs)
              .set({ vocalsUrl: vocalsResult.vocalsUrl, vocalsKey: vocalsResult.vocalsKey ?? null, updatedAt: new Date() })
              .where(eq(kidsVideoJobs.id, jobId));
          }
        }

        if (vocalsAudioUrl) {
          // Upload concatenated video to S3 for SyncLabs
          const preSyncBuf = fs.readFileSync(concatenatedPath);
          const preSyncKey = `kids-video/${jobId}/pre-synclabs-${Date.now()}.mp4`;
          const { url: preSyncUrl } = await storagePut(preSyncKey, preSyncBuf, "video/mp4");

          // Submit to SyncLabs sync-3 with ISOLATED VOCALS ONLY
          const { submitSyncLabsLipSync, pollSyncLabsLipSync, isSyncLabsConfigured } = await import("./ai-apis/synclabs-lipsync");
          if (isSyncLabsConfigured()) {
            const syncJobId = await submitSyncLabsLipSync({
              videoUrl: preSyncUrl,
              audioUrl: vocalsAudioUrl, // ISOLATED VOCALS — never full mix
              syncMode: "cut_off",
              outputFileName: `wiz-animate-${jobId}-lipsync`,
              temperature: 1.0,
              occlusionDetection: true,
            });
            console.log(`[KidsVideoRender] Job ${jobId}: SyncLabs job ${syncJobId} submitted with isolated vocals`);

            // Poll until complete (12 min timeout)
            const outputUrl = await pollSyncLabsLipSync(syncJobId, 12 * 60 * 1000);

            // Download lip-synced video (this has SyncLabs audio — we will strip it)
            const syncResp = await fetch(outputUrl);
            const syncBuf = Buffer.from(await syncResp.arrayBuffer());
            const syncPath = path.join(tmpDir, "lipsync-output.mp4");
            fs.writeFileSync(syncPath, syncBuf);

            // Strip SyncLabs audio and use this as the video source
            const lipSyncSilent = path.join(tmpDir, "lipsync-silent.mp4");
            await execAsync(`ffmpeg -y -i "${syncPath}" -an -c:v copy "${lipSyncSilent}"`);
            finalVideoPath = lipSyncSilent;
            console.log(`[KidsVideoRender] Job ${jobId}: lip sync complete, SyncLabs audio stripped`);
          } else {
            console.warn(`[KidsVideoRender] Job ${jobId}: SyncLabs not configured — skipping lip sync`);
          }
        } else {
          console.warn(`[KidsVideoRender] Job ${jobId}: no isolated vocals available — skipping lip sync`);
        }
      } catch (lipSyncErr: any) {
        // Lip sync failure must NEVER block delivery
        console.warn(`[KidsVideoRender] Job ${jobId}: lip sync failed (${lipSyncErr?.message}) — delivering without lip sync`);
      }
    }

    // Step 7: Overlay original full mix audio on the final video
    const outputPath = path.join(tmpDir, "final.mp4");
    if (job.audioUrl) {
      // Download original audio
      const audioPath = path.join(tmpDir, "audio.mp3");
      const audioResp = await fetch(job.audioUrl);
      const audioBuf = Buffer.from(await audioResp.arrayBuffer());
      fs.writeFileSync(audioPath, audioBuf);

      // Get video duration to trim audio
      const durationResult = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalVideoPath}"`
      ).catch(() => ({ stdout: "" }));
      const videoDur = parseFloat(durationResult.stdout.trim()) || clipPaths.length * SCENE_CLIP_DURATION;

      // Mux: video (lip-synced or raw) + original full mix audio
      await execAsync(
        `ffmpeg -y -i "${finalVideoPath}" -i "${audioPath}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -t ${videoDur} "${outputPath}"`
      );
      console.log(`[KidsVideoRender] Job ${jobId}: original full mix audio overlaid on final video`);
    } else {
      // No audio — just copy the video as-is
      fs.copyFileSync(finalVideoPath, outputPath);
    }

    // Step 8: Upload final video to S3
    const videoBuffer = fs.readFileSync(outputPath);
    const fileKey = `kids-video/${jobId}/final-${Date.now()}.mp4`;
    const { url: finalVideoUrl } = await storagePut(fileKey, videoBuffer, "video/mp4");

    console.log(`[KidsVideoRender] Job ${jobId}: uploaded final video to S3: ${finalVideoUrl}`);

    // Step 9: Update job as completed
    await db.update(kidsVideoJobs)
      .set({
        renderStatus: "completed",
        videoUrl: finalVideoUrl,
        videoKey: fileKey,
        updatedAt: new Date(),
      })
      .where(eq(kidsVideoJobs.id, jobId));

    // Notify owner
    await notifyOwner({
      title: "WizAnimate Render Complete",
      content: `Job #${jobId} completed successfully. ${renderableFrames.length} scenes rendered. Video: ${finalVideoUrl}`,
    }).catch(() => {});

    // Cleanup temp files
    fs.rmSync(tmpDir, { recursive: true, force: true });

    console.log(`[KidsVideoRender] Job ${jobId}: DONE`);
  } catch (err) {
    console.error(`[KidsVideoRender] Job ${jobId} FAILED:`, err);
    await db.update(kidsVideoJobs)
      .set({
        renderStatus: "failed",
        errorMessage: String(err),
        updatedAt: new Date(),
      })
      .where(eq(kidsVideoJobs.id, jobId));

    await notifyOwner({
      title: "WizAnimate Render Failed",
      content: `Job #${jobId} failed: ${String(err)}`,
    }).catch(() => {});
  }
}
