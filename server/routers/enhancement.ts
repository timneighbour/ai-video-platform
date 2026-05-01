/**
 * tRPC Router for AI Video Enhancement Studio
 * Handles video upload, analysis, music generation, and export
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { enhancementJobs } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { storagePut, storageGet } from "../storage";
import {
  analyzeVideo,
  getMusicPlacementRecommendations,
} from "../video-analysis-engine";
import {
  generateMusicForVideo,
  pollSunoMusicStatus,
} from "../enhancement-music-service";
import {
  generateEditingInstructions,
  estimateCreditCost,
} from "../auto-editing-engine";
import { deductCredits } from "../credit-service";
import { TRPCError } from "@trpc/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { applyWizSound } from "../wizsound";
const execAsync = promisify(exec);

export const enhancementRouter = router({
  /**
   * Create a new enhancement job
   * Accepts video file upload and user preferences
   */
  createJob: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        videoUrl: z.string().url(),
        videoKey: z.string(),
        videoDuration: z.number().positive().max(180), // Max 3 minutes
        videoSize: z.number().positive(),
        style: z.enum([
          "cinematic",
          "calm",
          "energetic",
          "emotional",
          "documentary",
          "upbeat",
          "dramatic",
          "ambient",
        ]),
        musicEnabled: z.boolean().default(true),
        captionsEnabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      try {
        // Create job record
        const [result] = await db.insert(enhancementJobs).values({
          userId: ctx.user.id,
          title: input.title,
          inputVideoUrl: input.videoUrl,
          inputVideoKey: input.videoKey,
          inputVideoDuration: input.videoDuration,
          inputVideoSize: input.videoSize,
          style: input.style,
          musicEnabled: input.musicEnabled,
          captionsEnabled: input.captionsEnabled,
          status: "analyzing",
          analysisStatus: "pending",
          musicGenerationStatus: "pending",
          renderStatus: "pending",
          creditCost: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const jobId = (result as any).insertId as number;

        // Start analysis asynchronously
        analyzeVideoAsync(
          jobId,
          input.videoUrl,
          input.videoDuration,
          input.style
        ).catch((err) => console.error("[Enhancement] Analysis failed:", err));

        return {
          jobId,
          status: "analyzing",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create job",
        });
      }
    }),

  /**
   * Get job details and status
   */
  getJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [job] = await db.select().from(enhancementJobs)
        .where(and(
          eq(enhancementJobs.id, input.jobId),
          eq(enhancementJobs.userId, ctx.user.id)
        ));

      if (!job)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });

      return job;
    }),

  /**
   * List all jobs for current user
   */
  listJobs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    const jobs = await db.select().from(enhancementJobs)
      .where(eq(enhancementJobs.userId, ctx.user.id))
      .orderBy(desc(enhancementJobs.createdAt))
      .limit(50);

    return jobs;
  }),

  /**
   * Start rendering the enhanced video
   */
  startRender: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      try {
        // Get job
        const [job] = await db.select().from(enhancementJobs)
          .where(and(
            eq(enhancementJobs.id, input.jobId),
            eq(enhancementJobs.userId, ctx.user.id)
          ));
        if (!job)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Job not found",
          });

        if (job.status !== "completed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Job must be completed before rendering",
          });
        }

        // Deduct credits
        const creditCost = job.creditCost || 1;
        await deductCredits(
          ctx.user.id,
          creditCost,
          `Enhancement render: ${job.title}`,
          input.jobId
        );

        // Update job status
        await db
          .update(enhancementJobs)
          .set({
            status: "rendering",
            renderStatus: "processing",
            updatedAt: new Date(),
          })
          .where(eq(enhancementJobs.id, input.jobId));

        // Start rendering asynchronously
        renderVideoAsync(input.jobId).catch((err) =>
          console.error("[Enhancement] Render failed:", err)
        );

        return {
          jobId: input.jobId,
          status: "rendering",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to start render",
        });
      }
    }),

  /**
   * Download rendered video
   */
  downloadVideo: protectedProcedure
    .input(
      z.object({
        jobId: z.number(),
        format: z.enum(["16x9", "9x16"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [job] = await db.select().from(enhancementJobs)
        .where(and(
          eq(enhancementJobs.id, input.jobId),
          eq(enhancementJobs.userId, ctx.user.id)
        ));

      if (!job)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });

      if (job.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Video not ready for download",
        });
      }

      const url =
        input.format === "16x9" ? job.outputUrl16x9 : job.outputUrl9x16;

      if (!url)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Video URL not available",
        });

      return { url };
    }),

  /**
   * Get music placement recommendations
   */
  getMusicPlacements: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [job] = await db.select().from(enhancementJobs)
        .where(and(
          eq(enhancementJobs.id, input.jobId),
          eq(enhancementJobs.userId, ctx.user.id)
        ));

      if (!job)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });

      if (!job.analysisData) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Video analysis not complete",
        });
      }

      const analysis = JSON.parse(job.analysisData);
      const placements = getMusicPlacementRecommendations(analysis);

      return placements;
    }),
});

/**
 * Async function to analyze video
 */
async function analyzeVideoAsync(
  jobId: number,
  videoUrl: string,
  duration: number,
  style: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Analyze video
    const analysis = await analyzeVideo(videoUrl, duration, style);

    // Generate editing instructions
    const editingInstructions = generateEditingInstructions(
      analysis,
      style,
      true,
      true
    );

    // Generate music
    const musicResult = await generateMusicForVideo({
      mood: analysis.detectedMood,
      duration,
      style,
      intensity: "medium",
    });

    // Update job with analysis results
    await db
      .update(enhancementJobs)
      .set({
        analysisStatus: "completed",
        analysisData: JSON.stringify(analysis),
        speechSegments: JSON.stringify(analysis.speechSegments),
        sceneSegments: JSON.stringify(analysis.sceneSegments),
        detectedMood: analysis.detectedMood,
        musicGenerationStatus:
          musicResult.status === "failed" ? "failed" : "processing",
        sunoTaskId: musicResult.sunoTaskId,
        status:
          musicResult.status === "failed" ? "failed" : "generating",
        updatedAt: new Date(),
      })
      .where(eq(enhancementJobs.id, jobId));
  } catch (error) {
    console.error("[Enhancement] Analysis error:", error);
    await db
      .update(enhancementJobs)
      .set({
        analysisStatus: "failed",
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "Unknown error",
        updatedAt: new Date(),
      })
      .where(eq(enhancementJobs.id, jobId));
  }
}

/**
 * Async function to render video
 */
async function renderVideoAsync(jobId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `enhancement-${jobId}-`));
  try {
    // Get job
    const [job] = await db.select().from(enhancementJobs)
      .where(eq(enhancementJobs.id, jobId));

    if (!job) return;

    // Mark as processing
    await db.update(enhancementJobs)
      .set({ renderStatus: "processing", updatedAt: new Date() })
      .where(eq(enhancementJobs.id, jobId));

    // ── Step 1: Download the original input video ─────────────────────────────
    const videoPath = path.join(tmpDir, "input.mp4");
    const videoResp = await fetch(job.inputVideoUrl);
    if (!videoResp.ok) throw new Error(`Failed to download input video: ${videoResp.status}`);
    fs.writeFileSync(videoPath, Buffer.from(await videoResp.arrayBuffer()));

    // ── Step 2: Prepare audio track ───────────────────────────────────────────
    // Use AI-generated music if available, otherwise use original video audio
    let finalVideoPath: string;

    if (job.musicUrl && job.musicEnabled) {
      // Download generated music and apply WizSound™ enhancement
      const audioRawPath = path.join(tmpDir, "music-raw.mp3");
      const audioEnhPath = path.join(tmpDir, "music-enhanced.mp3");
      const musicResp = await fetch(job.musicUrl);
      if (!musicResp.ok) throw new Error(`Failed to download music: ${musicResp.status}`);
      fs.writeFileSync(audioRawPath, Buffer.from(await musicResp.arrayBuffer()));

      // Apply WizSound™ enhancement (standard tier for base render)
      await applyWizSound(audioRawPath, audioEnhPath, "standard");

      // ── Step 3: Mix video with AI music using ffmpeg ──────────────────────────
      // Get video duration
      const videoInfo = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
        { timeout: 30000 }
      );
      const videoDuration = parseFloat(videoInfo.stdout.trim()) || job.inputVideoDuration;

      const audioInfo = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioEnhPath}"`,
        { timeout: 30000 }
      );
      const audioDuration = parseFloat(audioInfo.stdout.trim()) || videoDuration;

      const mixedPath = path.join(tmpDir, "output-16x9.mp4");
      const renderDuration = Math.min(videoDuration, audioDuration);

      // Mix: replace original audio with AI-generated music, trim to shortest
      await execAsync(
        `ffmpeg -y -i "${videoPath}" -i "${audioEnhPath}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -t ${renderDuration} "${mixedPath}"`,
        { timeout: 600000 }
      );
      finalVideoPath = mixedPath;
    } else {
      // No music — just re-encode the original video to ensure clean output
      const reEncodedPath = path.join(tmpDir, "output-16x9.mp4");
      await execAsync(
        `ffmpeg -y -i "${videoPath}" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k "${reEncodedPath}"`,
        { timeout: 600000 }
      );
      finalVideoPath = reEncodedPath;
    }

    // ── Step 4: Upload 16:9 output to S3 ─────────────────────────────────────
    const outputKey16x9 = `${job.userId}/enhancement/${jobId}/output_16x9_${Date.now()}.mp4`;
    const outputBuffer = fs.readFileSync(finalVideoPath);
    const { url: outputUrl16x9 } = await storagePut(outputKey16x9, outputBuffer, "video/mp4");

    // ── Step 5: Generate 9:16 vertical crop (optional, best-effort) ──────────
    let outputUrl9x16: string | null = null;
    let outputKey9x16: string | null = null;
    try {
      const verticalPath = path.join(tmpDir, "output-9x16.mp4");
      await execAsync(
        `ffmpeg -y -i "${finalVideoPath}" -vf "crop=ih*9/16:ih,scale=1080:1920" -c:v libx264 -preset fast -crf 22 -c:a copy "${verticalPath}"`,
        { timeout: 300000 }
      );
      const vertKey = `${job.userId}/enhancement/${jobId}/output_9x16_${Date.now()}.mp4`;
      const vertBuf = fs.readFileSync(verticalPath);
      const { url: vertUrl } = await storagePut(vertKey, vertBuf, "video/mp4");
      outputUrl9x16 = vertUrl;
      outputKey9x16 = vertKey;
    } catch (vertErr) {
      console.warn(`[Enhancement] 9:16 crop failed for job ${jobId} (non-fatal):`, vertErr);
    }

    // ── Step 6: Update job as completed ──────────────────────────────────────
    await db
      .update(enhancementJobs)
      .set({
        renderStatus: "completed",
        status: "completed",
        outputUrl16x9,
        outputKey16x9,
        outputUrl9x16: outputUrl9x16 ?? undefined,
        outputKey9x16: outputKey9x16 ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(enhancementJobs.id, jobId));

    console.log(`[Enhancement] Render complete for job ${jobId}: ${outputUrl16x9}`);
  } catch (error) {
    console.error("[Enhancement] Render error:", error);
    const db2 = await getDb();
    if (db2) {
      await db2
        .update(enhancementJobs)
        .set({
          renderStatus: "failed",
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          updatedAt: new Date(),
        })
        .where(eq(enhancementJobs.id, jobId));
    }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}
