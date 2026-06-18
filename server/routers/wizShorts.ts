/**
 * WizShorts — Short-Form Video Creator (YouTube Shorts / TikTok / Reels)
 * Powered by Grok Imagine video generation (9:16 vertical, 15-60s)
 *
 * Workflow:
 * 1. createJob      — user submits topic, platform, duration, style
 * 2. generateScenes — LLM breaks topic into scenes with prompts + captions
 * 3. startRender    — submits all scenes to Grok Imagine video API
 * 4. pollProgress   — polls each scene until complete; returns "scenes_ready"
 *                     when all scenes are done (does NOT assemble)
 * 5. assembleJob    — triggered by frontend when pollProgress returns
 *                     "scenes_ready"; runs assembly in a detached background
 *                     path so it never blocks an HTTP request
 * 6. getJob         — frontend polls this for final status + videoUrl
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserCredits, deductCredits } from "../db";
import { wizShortsJobs, wizShortsScenes } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { submitGrokVideo, pollGrokVideo } from "../ai-apis/grok-imagine";
import { storagePut } from "../storage";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import logger from "../logger";

const execAsync = promisify(exec);

const CREDITS_PER_SCENE = 5; // 5 credits per scene (Grok video at $0.07/s × 5s)
const SCENE_DURATION_SECONDS = 5; // Each scene is 5 seconds

function calculateSceneCount(targetDuration: number): number {
  return Math.max(3, Math.min(12, Math.ceil(targetDuration / SCENE_DURATION_SECONDS)));
}

const VISUAL_STYLE_PROMPTS: Record<string, string> = {
  cinematic: "cinematic, dramatic lighting, film grain, professional cinematography, 4K",
  anime: "anime style, vibrant colors, dynamic composition, Studio Ghibli aesthetic",
  realistic: "photorealistic, ultra-detailed, natural lighting, documentary style",
  cartoon: "cartoon style, bold colors, clean lines, animated, fun and energetic",
  "neon-noir": "neon noir, cyberpunk aesthetic, rain-slicked streets, dramatic shadows",
  minimalist: "minimalist, clean composition, soft colors, elegant and modern",
};

export const wizShortsRouter = router({
  createJob: protectedProcedure
    .input(
      z.object({
        topic: z.string().min(5).max(500),
        platform: z.enum(["youtube_shorts", "tiktok", "reels"]).default("youtube_shorts"),
        targetDuration: z.number().min(15).max(60).default(30),
        visualStyle: z.string().optional(),
        musicUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const sceneCount = calculateSceneCount(input.targetDuration);
      const creditCost = sceneCount * CREDITS_PER_SCENE;

      // Check credits — throw FORBIDDEN so the client can show a Top Up prompt
      const creditsRecord = await getUserCredits(ctx.user.id);
      const creditBalance = creditsRecord?.balance ?? 0;
      if (creditBalance < creditCost) {
        const shortfall = creditCost - creditBalance;
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `INSUFFICIENT_CREDITS:${creditCost}:${creditBalance}:${shortfall}`,
        });
      }

      const [result] = await db.insert(wizShortsJobs).values({
        userId: ctx.user.id,
        topic: input.topic,
        platform: input.platform,
        targetDuration: input.targetDuration,
        visualStyle: input.visualStyle ?? null,
        musicUrl: input.musicUrl ?? null,
        sceneCount,
        creditCost,
        status: "pending",
      });

      const jobId = (result as any).insertId as number;
      return { jobId, sceneCount, creditCost };
    }),

  generateScenes: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [job] = await db
        .select()
        .from(wizShortsJobs)
        .where(and(eq(wizShortsJobs.id, input.jobId), eq(wizShortsJobs.userId, ctx.user.id)));

      if (!job) throw new Error("Job not found");
      if (job.status !== "pending") throw new Error("Job already processing");

      await db
        .update(wizShortsJobs)
        .set({ status: "generating_scenes", updatedAt: new Date() })
        .where(eq(wizShortsJobs.id, input.jobId));

      const sceneCount = job.sceneCount ?? calculateSceneCount(job.targetDuration);
      const styleHint = job.visualStyle && VISUAL_STYLE_PROMPTS[job.visualStyle]
        ? `\nVisual style: ${VISUAL_STYLE_PROMPTS[job.visualStyle]}`
        : "";
      const platformHint =
        job.platform === "youtube_shorts" ? "YouTube Shorts (9:16 vertical)"
        : job.platform === "tiktok" ? "TikTok (9:16 vertical)"
        : "Instagram Reels (9:16 vertical)";

      const llmResponse = await invokeLLM({
        messages: [
          {
            role: "system" as const,
            content: `You are a short-form video script writer. Generate exactly ${sceneCount} scenes for a ${job.targetDuration}-second ${platformHint} video.${styleHint}\n\nEach scene should be ${SCENE_DURATION_SECONDS} seconds long.\n\nReturn ONLY valid JSON in this exact format:\n{\n  "scenes": [\n    {\n      "index": 0,\n      "prompt": "Detailed visual description for AI video generation (50-150 words). Describe the scene visually, not narratively. Include: subject, action, environment, lighting, camera angle. Format: 9:16 vertical video.",\n      "caption": "Short on-screen text (max 8 words) or null"\n    }\n  ]\n}`,
          },
          {
            role: "user" as const,
            content: `Create ${sceneCount} scenes for this short video:\n\n${job.topic}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "scenes_output",
            strict: true,
            schema: {
              type: "object",
              properties: {
                scenes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "integer" },
                      prompt: { type: "string" },
                      caption: { type: ["string", "null"] },
                    },
                    required: ["index", "prompt", "caption"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["scenes"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = llmResponse?.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") throw new Error("LLM returned no content");
      const parsed = JSON.parse(content) as { scenes: Array<{ index: number; prompt: string; caption: string | null }> };

      // Insert scenes into DB
      for (const scene of parsed.scenes) {
        await db.insert(wizShortsScenes).values({
          jobId: input.jobId,
          sceneIndex: scene.index,
          prompt: scene.prompt,
          duration: SCENE_DURATION_SECONDS,
          caption: scene.caption ?? null,
          status: "pending",
        });
      }

      return { scenes: parsed.scenes };
    }),

  startRender: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [job] = await db
        .select()
        .from(wizShortsJobs)
        .where(and(eq(wizShortsJobs.id, input.jobId), eq(wizShortsJobs.userId, ctx.user.id)));

      if (!job) throw new Error("Job not found");

      const scenes = await db
        .select()
        .from(wizShortsScenes)
        .where(eq(wizShortsScenes.jobId, input.jobId));

      if (scenes.length === 0) throw new Error("No scenes found — run generateScenes first");

      await db
        .update(wizShortsJobs)
        .set({ status: "rendering", updatedAt: new Date() })
        .where(eq(wizShortsJobs.id, input.jobId));

      const styleAddition = job.visualStyle && VISUAL_STYLE_PROMPTS[job.visualStyle]
        ? `, ${VISUAL_STYLE_PROMPTS[job.visualStyle]}`
        : "";

      // Submit all scenes to Grok Imagine in parallel
      const submitPromises = scenes.map(async (scene) => {
        try {
          const fullPrompt = `${scene.prompt}${styleAddition}. Vertical 9:16 format.`;
          const requestId = await submitGrokVideo({
            prompt: fullPrompt,
            duration: scene.duration,
            aspect_ratio: "9:16",
            resolution: "720p",
          });

          await db
            .update(wizShortsScenes)
            .set({ taskId: `grok:${requestId}`, status: "generating", updatedAt: new Date() })
            .where(eq(wizShortsScenes.id, scene.id));

          logger.info({ sceneIndex: scene.sceneIndex, requestId }, "[WizShorts] Scene submitted → Grok");
        } catch (err: any) {
          console.error(`[WizShorts] Scene ${scene.sceneIndex} submit failed:`, err?.message);
          await db
            .update(wizShortsScenes)
            .set({ status: "failed", errorMessage: String(err?.message ?? err), updatedAt: new Date() })
            .where(eq(wizShortsScenes.id, scene.id));
        }
      });

      await Promise.all(submitPromises);

      return { submitted: scenes.length };
    }),

  /**
   * pollProgress — polls each generating scene for completion.
   * Returns one of:
   *   { status: "rendering", completedScenes, totalScenes }   — still in progress
   *   { status: "scenes_ready", completedScenes, totalScenes } — all scenes done, assembly not yet started
   *   { status: "assembling" }                                 — assembly running in background
   *   { status: "complete", videoUrl }                         — final video ready
   *   { status: "failed" }                                     — terminal failure
   *
   * IMPORTANT: This procedure never runs assembly itself. Assembly is triggered
   * by the frontend calling assembleJob after receiving "scenes_ready".
   */
  pollProgress: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [job] = await db
        .select()
        .from(wizShortsJobs)
        .where(and(eq(wizShortsJobs.id, input.jobId), eq(wizShortsJobs.userId, ctx.user.id)));

      if (!job) throw new Error("Job not found");

      // Terminal states — return immediately
      if (job.status === "complete") return { status: "complete" as const, videoUrl: job.videoUrl };
      if (job.status === "failed") return { status: "failed" as const, videoUrl: null };
      if (job.status === "assembling") return { status: "assembling" as const, videoUrl: null };

      const scenes = await db
        .select()
        .from(wizShortsScenes)
        .where(eq(wizShortsScenes.jobId, input.jobId));

      // Poll each scene that is still generating
      for (const scene of scenes) {
        if (scene.status !== "generating" || !scene.taskId) continue;

        const grokId = scene.taskId.startsWith("grok:") ? scene.taskId.slice(5) : scene.taskId;
        try {
          const result = await pollGrokVideo(grokId);

          if (result.status === "done" && result.videoUrl) {
            // Download and save to S3
            const response = await fetch(result.videoUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const buffer = Buffer.from(await response.arrayBuffer());

            const key = `wiz-shorts/${input.jobId}/scene-${scene.sceneIndex}-${Date.now()}.mp4`;
            const { url } = await storagePut(key, buffer, "video/mp4");

            await db
              .update(wizShortsScenes)
              .set({ status: "completed", videoUrl: url, videoKey: key, updatedAt: new Date() })
              .where(eq(wizShortsScenes.id, scene.id));

            logger.info({ sceneIndex: scene.sceneIndex }, "[WizShorts] Scene completed → S3");
          } else if (result.status === "failed" || result.status === "expired") {
            await db
              .update(wizShortsScenes)
              .set({ status: "failed", errorMessage: `Grok ${result.status}`, updatedAt: new Date() })
              .where(eq(wizShortsScenes.id, scene.id));
          }
        } catch (err: any) {
          logger.warn({ sceneIndex: scene.sceneIndex, err: err?.message }, "[WizShorts] Scene poll error");
        }
      }

      // Re-fetch scenes to check completion
      const updatedScenes = await db
        .select()
        .from(wizShortsScenes)
        .where(eq(wizShortsScenes.jobId, input.jobId));

      const allDone = updatedScenes.every((s) => s.status === "completed" || s.status === "failed");
      const completedScenes = updatedScenes.filter((s) => s.status === "completed");
      const totalScenes = updatedScenes.length;

      if (!allDone) {
        return {
          status: "rendering" as const,
          completedScenes: completedScenes.length,
          totalScenes,
          videoUrl: null,
        };
      }

      // All scenes done — signal the frontend to call assembleJob
      if (completedScenes.length === 0) {
        await db
          .update(wizShortsJobs)
          .set({ status: "failed", errorMessage: "All scenes failed to render", updatedAt: new Date() })
          .where(eq(wizShortsJobs.id, input.jobId));
        return { status: "failed" as const, videoUrl: null };
      }

      return {
        status: "scenes_ready" as const,
        completedScenes: completedScenes.length,
        totalScenes,
        videoUrl: null,
      };
    }),

  /**
   * assembleJob — decoupled assembly mutation.
   * Called by the frontend once pollProgress returns "scenes_ready".
   * Sets job status to "assembling" and fires the assembly in a detached
   * background path (setImmediate + .catch) so the HTTP response returns
   * immediately. The frontend then polls getJob for the final URL.
   */
  assembleJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [job] = await db
        .select()
        .from(wizShortsJobs)
        .where(and(eq(wizShortsJobs.id, input.jobId), eq(wizShortsJobs.userId, ctx.user.id)));

      if (!job) throw new Error("Job not found");

      // Idempotent — if already assembling or complete, return current status
      if (job.status === "complete") return { status: "complete" as const, videoUrl: job.videoUrl };
      if (job.status === "assembling") return { status: "assembling" as const };
      if (job.status === "failed") return { status: "failed" as const };

      const completedScenes = await db
        .select()
        .from(wizShortsScenes)
        .where(eq(wizShortsScenes.jobId, input.jobId));

      const readyScenes = completedScenes.filter((s) => s.status === "completed");
      if (readyScenes.length === 0) throw new Error("No completed scenes to assemble");

      // Mark job as assembling immediately so the frontend can show the right state
      await db
        .update(wizShortsJobs)
        .set({ status: "assembling", updatedAt: new Date() })
        .where(eq(wizShortsJobs.id, input.jobId));

      // Fire assembly in a detached background path — does NOT block the response
      const userId = ctx.user.id;
      const creditCost = job.creditCost;
      const musicUrl = job.musicUrl ?? undefined;

      setImmediate(() => {
        runAssembly(input.jobId, readyScenes, musicUrl, userId, creditCost).catch((err) => {
          console.error(`[WizShorts] Background assembly error for job ${input.jobId}:`, err?.message ?? err);
        });
      });

      // Return immediately — frontend polls getJob for completion
      return { status: "assembling" as const };
    }),

  getJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [job] = await db
        .select()
        .from(wizShortsJobs)
        .where(and(eq(wizShortsJobs.id, input.jobId), eq(wizShortsJobs.userId, ctx.user.id)));

      if (!job) throw new Error("Job not found");

      const scenes = await db
        .select()
        .from(wizShortsScenes)
        .where(eq(wizShortsScenes.jobId, input.jobId));

      return { job, scenes };
    }),

  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const jobs = await db
        .select()
        .from(wizShortsJobs)
        .where(eq(wizShortsJobs.userId, ctx.user.id))
        .orderBy(desc(wizShortsJobs.createdAt))
        .limit(input.limit);

      return jobs;
    }),
});

// ─── Background Assembly ──────────────────────────────────────────────────────
// Runs entirely outside the HTTP request lifecycle. Called via setImmediate
// from assembleJob so the response returns before any ffmpeg work begins.

async function runAssembly(
  jobId: number,
  scenes: Array<{ sceneIndex: number; videoUrl: string | null; caption: string | null }>,
  musicUrl: string | undefined,
  userId: number,
  creditCost: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error(`[WizShorts] runAssembly: DB unavailable for job ${jobId}`);
    return;
  }

  try {
    const videoUrl = await assembleShorts(jobId, scenes, musicUrl);

    // Deduct credits on successful assembly
    await deductCredits(userId, creditCost, "WizShorts video generation");

    await db
      .update(wizShortsJobs)
      .set({ status: "complete", videoUrl, updatedAt: new Date() })
      .where(eq(wizShortsJobs.id, jobId));

    logger.info({ jobId, videoUrl }, "[WizShorts] Job assembly complete");
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    console.error(`[WizShorts] Job ${jobId} assembly failed:`, msg);
    await db
      .update(wizShortsJobs)
      .set({ status: "failed", errorMessage: msg, updatedAt: new Date() })
      .where(eq(wizShortsJobs.id, jobId));
  }
}

// ─── ffmpeg Assembly ──────────────────────────────────────────────────────────
// Uses -c copy (stream copy) for the concat step — no re-encode, <5s for
// typical 6-scene shorts. Re-encode is only applied if music mixing is needed
// and the audio codec requires it.

async function assembleShorts(
  jobId: number,
  scenes: Array<{ sceneIndex: number; videoUrl: string | null; caption: string | null }>,
  musicUrl?: string
): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `wizshorts-${jobId}-`));

  try {
    // Sort scenes by index
    const sorted = [...scenes].sort((a, b) => a.sceneIndex - b.sceneIndex);

    // Download all scene videos to temp dir
    const sceneFiles: string[] = [];
    for (const scene of sorted) {
      if (!scene.videoUrl) continue;
      const sceneFile = path.join(tmpDir, `scene-${String(scene.sceneIndex).padStart(3, "0")}.mp4`);
      const resp = await fetch(scene.videoUrl);
      if (!resp.ok) {
        logger.warn({ sceneIndex: scene.sceneIndex, status: resp.status }, "[WizShorts] Scene download failed");
        continue;
      }
      const buf = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(sceneFile, buf);
      sceneFiles.push(sceneFile);
    }

    if (sceneFiles.length === 0) throw new Error("No scene files downloaded for assembly");

    // Write concat list
    const concatFile = path.join(tmpDir, "concat.txt");
    fs.writeFileSync(concatFile, sceneFiles.map((f) => `file '${f}'`).join("\n"));

    const concatenated = path.join(tmpDir, "concatenated.mp4");

    // -c copy: stream copy — no re-encode, fast and lossless
    // If scenes have mismatched codecs this will fail; fallback to libx264 below
    let concatOk = false;
    try {
      await execAsync(
        `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c copy "${concatenated}"`,
        { timeout: 120000 }
      );
      concatOk = true;
      logger.info({ jobId }, "[WizShorts] concat (stream copy) succeeded");
    } catch (copyErr: any) {
      logger.warn({ jobId, err: copyErr?.message }, "[WizShorts] stream copy failed, falling back to libx264");
    }

    // Fallback: re-encode with libx264 if stream copy failed (codec mismatch)
    if (!concatOk) {
      await execAsync(
        `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c:v libx264 -preset fast -crf 22 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "${concatenated}"`,
        { timeout: 300000 }
      );
      logger.info({ jobId }, "[WizShorts] concat (libx264 fallback) succeeded");
    }

    let finalVideo = concatenated;

    // Mix in music if provided — audio mixing always requires re-encode of audio track
    if (musicUrl) {
      try {
        const audioFile = path.join(tmpDir, "music.mp3");
        const audioResp = await fetch(musicUrl);
        if (!audioResp.ok) throw new Error(`Music download HTTP ${audioResp.status}`);
        const audioBuf = Buffer.from(await audioResp.arrayBuffer());
        fs.writeFileSync(audioFile, audioBuf);

        const withAudio = path.join(tmpDir, "with-audio.mp4");
        // -c:v copy keeps video stream untouched; only audio is re-encoded
        await execAsync(
          `ffmpeg -y -i "${concatenated}" -i "${audioFile}" -c:v copy -c:a aac -shortest -map 0:v:0 -map 1:a:0 "${withAudio}"`,
          { timeout: 120000 }
        );
        finalVideo = withAudio;
        logger.info({ jobId }, "[WizShorts] music mixed successfully");
      } catch (audioErr: any) {
        logger.warn({ jobId, err: audioErr?.message }, "[WizShorts] music mixing failed, using video without audio");
      }
    }

    // Upload final video to S3
    const videoBuffer = fs.readFileSync(finalVideo);
    const key = `wiz-shorts/${jobId}/final-${Date.now()}.mp4`;
    const { url } = await storagePut(key, videoBuffer, "video/mp4");

    return url;
  } finally {
    // Always clean up temp dir
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}
