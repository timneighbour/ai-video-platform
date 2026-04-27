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

    // Step 4: Concatenate clips using ffmpeg
    const concatListPath = path.join(tmpDir, "concat.txt");
    const concatContent = clipPaths.map(p => `file '${p}'`).join("\n");
    fs.writeFileSync(concatListPath, concatContent);

    const outputPath = path.join(tmpDir, "final.mp4");
    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${outputPath}"`
    );

    console.log(`[KidsVideoRender] Job ${jobId}: concatenated ${clipPaths.length} clips`);

    // Step 5: Upload final video to S3
    const videoBuffer = fs.readFileSync(outputPath);
    const fileKey = `kids-video/${jobId}/final-${Date.now()}.mp4`;
    const { url: finalVideoUrl } = await storagePut(fileKey, videoBuffer, "video/mp4");

    console.log(`[KidsVideoRender] Job ${jobId}: uploaded final video to S3: ${finalVideoUrl}`);

    // Step 6: Update job as completed
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
