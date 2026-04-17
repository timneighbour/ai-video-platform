/**
 * WizShorts — Short-Form Video Creator (YouTube Shorts / TikTok / Reels)
 * Powered by Grok Imagine video generation (9:16 vertical, 15-60s)
 *
 * Workflow:
 * 1. createJob — user submits topic, platform, duration, style
 * 2. generateScenes — LLM breaks topic into scenes with prompts + captions
 * 3. startRender — submits all scenes to Grok Imagine video API
 * 4. pollProgress — polls each scene until complete, then assembles final video
 * 5. getJob — returns job status + final video URL
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserCredits, deductCredits } from "../db";
import { wizShortsJobs, wizShortsScenes } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { submitGrokVideo, pollGrokVideo } from "../ai-apis/grok-imagine";
import { storagePut } from "../storage";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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

      // Check credits
      const creditsRecord = await getUserCredits(ctx.user.id);
      const creditBalance = creditsRecord?.balance ?? 0;
      if (creditBalance < creditCost) {
        throw new Error(`Insufficient credits. Need ${creditCost}, have ${creditBalance}.`);
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

          console.log(`[WizShorts] Scene ${scene.sceneIndex} submitted → Grok requestId=${requestId}`);
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
      if (job.status === "complete" || job.status === "failed") return { status: job.status, videoUrl: job.videoUrl };

      const scenes = await db
        .select()
        .from(wizShortsScenes)
        .where(eq(wizShortsScenes.jobId, input.jobId));

      // Poll generating scenes
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

            console.log(`[WizShorts] Scene ${scene.sceneIndex} completed → S3`);
          } else if (result.status === "failed" || result.status === "expired") {
            await db
              .update(wizShortsScenes)
              .set({ status: "failed", errorMessage: `Grok ${result.status}`, updatedAt: new Date() })
              .where(eq(wizShortsScenes.id, scene.id));
          }
        } catch (err: any) {
          console.warn(`[WizShorts] Scene ${scene.sceneIndex} poll error:`, err?.message);
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

      // All scenes done — assemble the final video
      if (completedScenes.length === 0) {
        await db
          .update(wizShortsJobs)
          .set({ status: "failed", errorMessage: "All scenes failed to render", updatedAt: new Date() })
          .where(eq(wizShortsJobs.id, input.jobId));
        return { status: "failed" as const, videoUrl: null };
      }

      await db
        .update(wizShortsJobs)
        .set({ status: "assembling", updatedAt: new Date() })
        .where(eq(wizShortsJobs.id, input.jobId));

      try {
        const videoUrl = await assembleShorts(input.jobId, completedScenes, job.musicUrl ?? undefined);

        // Deduct credits
        await deductCredits(ctx.user.id, job.creditCost, "WizShorts video generation");

        await db
          .update(wizShortsJobs)
          .set({ status: "complete", videoUrl, updatedAt: new Date() })
          .where(eq(wizShortsJobs.id, input.jobId));

        return { status: "complete" as const, videoUrl, completedScenes: completedScenes.length, totalScenes };
      } catch (assembleErr: any) {
        await db
          .update(wizShortsJobs)
          .set({ status: "failed", errorMessage: String(assembleErr?.message ?? assembleErr), updatedAt: new Date() })
          .where(eq(wizShortsJobs.id, input.jobId));
        return { status: "failed" as const, videoUrl: null };
      }
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
        .orderBy(wizShortsJobs.createdAt)
        .limit(input.limit);

      return jobs.reverse();
    }),
});

// ─── Assembly ────────────────────────────────────────────────────────────────

async function assembleShorts(
  jobId: number,
  scenes: Array<{ sceneIndex: number; videoUrl: string | null; caption: string | null }>,
  musicUrl?: string
): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `wizshorts-${jobId}-`));

  try {
    // Sort scenes by index
    const sorted = [...scenes].sort((a, b) => a.sceneIndex - b.sceneIndex);

    // Download all scene videos
    const sceneFiles: string[] = [];
    for (const scene of sorted) {
      if (!scene.videoUrl) continue;
      const sceneFile = path.join(tmpDir, `scene-${String(scene.sceneIndex).padStart(3, "0")}.mp4`);
      const resp = await fetch(scene.videoUrl);
      const buf = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(sceneFile, buf);
      sceneFiles.push(sceneFile);
    }

    if (sceneFiles.length === 0) throw new Error("No scene files to assemble");

    // Concatenate scenes
    const concatFile = path.join(tmpDir, "concat.txt");
    fs.writeFileSync(concatFile, sceneFiles.map((f) => `file '${f}'`).join("\n"));

    const concatenated = path.join(tmpDir, "concatenated.mp4");
    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c:v libx264 -preset fast -crf 22 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" "${concatenated}"`,
      { timeout: 300000 }
    );

    let finalVideo = concatenated;

    // Mix in music if provided
    if (musicUrl) {
      try {
        const audioFile = path.join(tmpDir, "music.mp3");
        const audioResp = await fetch(musicUrl);
        const audioBuf = Buffer.from(await audioResp.arrayBuffer());
        fs.writeFileSync(audioFile, audioBuf);

        const withAudio = path.join(tmpDir, "with-audio.mp4");
        await execAsync(
          `ffmpeg -y -i "${concatenated}" -i "${audioFile}" -c:v copy -c:a aac -shortest -map 0:v:0 -map 1:a:0 "${withAudio}"`,
          { timeout: 120000 }
        );
        finalVideo = withAudio;
      } catch (audioErr) {
        console.warn("[WizShorts] Music mixing failed, using video without audio:", audioErr);
      }
    }

    // Upload to S3
    const videoBuffer = fs.readFileSync(finalVideo);
    const key = `wiz-shorts/${jobId}/final-${Date.now()}.mp4`;
    const { url } = await storagePut(key, videoBuffer, "video/mp4");

    return url;
  } finally {
    // Cleanup temp dir
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}
