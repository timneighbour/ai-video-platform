/**
 * WizScore Router
 * Video → AI Analysis → Suno Prompt → Synced Soundtrack
 *
 * Flow:
 * 1. User uploads video → storagePut → create wizScoreJob (status: analyzing)
 * 2. analyzeVideo: invokeLLM with video URL → extract mood/pacing/energy/duration/genre → build Suno prompt
 * 3. generateScore: call suno.generate with prompt + targetDuration → sunoTaskId
 * 4. pollScore: proxy to suno.status → when complete, return audioUrl
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { wizScoreJobs } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { initSuno } from "../ai-apis/suno";

export const wizScoreRouter = router({
  /**
   * Create a new WizScore job after the client has uploaded the video to S3.
   * Accepts the S3 key and public URL returned by the upload endpoint.
   */
  create: protectedProcedure
    .input(
      z.object({
        videoKey: z.string().min(1),
        videoUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [result] = await db.insert(wizScoreJobs).values({
        userId: ctx.user.id,
        videoKey: input.videoKey,
        videoUrl: input.videoUrl,
        status: "analyzing",
      });

      return { id: (result as any).insertId as number };
    }),

  /**
   * Analyse the video using the LLM (multimodal) and generate a Suno prompt.
   * Updates the job with analysis JSON and sunoPrompt.
   */
  analyze: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [job] = await db
        .select()
        .from(wizScoreJobs)
        .where(and(eq(wizScoreJobs.id, input.jobId), eq(wizScoreJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional film composer and music supervisor. Analyse the provided video and return a JSON object with these fields:
{
  "mood": "string — overall emotional tone (e.g. 'epic', 'melancholic', 'upbeat', 'tense', 'romantic')",
  "pacing": "string — edit pace ('slow', 'medium', 'fast', 'variable')",
  "energy": "string — energy level ('low', 'medium', 'high', 'building')",
  "genre": "string — best-fit music genre (e.g. 'orchestral', 'electronic', 'indie pop', 'jazz', 'hip-hop')",
  "videoDurationSeconds": number,
  "sunoPrompt": "string — a 50-100 word Suno music generation prompt that captures the video's mood, pacing, and energy. Be specific about instrumentation, tempo, and feel.",
  "sunoStyle": "string — 2-4 genre/style tags for Suno separated by commas (e.g. 'cinematic orchestral, epic, emotional')"
}
Return ONLY valid JSON, no markdown, no explanation.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyse this video and return the JSON object as instructed:",
                },
                {
                  type: "file_url",
                  file_url: {
                    url: job.videoUrl,
                    mime_type: "video/mp4",
                  },
                },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "video_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  mood: { type: "string" },
                  pacing: { type: "string" },
                  energy: { type: "string" },
                  genre: { type: "string" },
                  videoDurationSeconds: { type: "number" },
                  sunoPrompt: { type: "string" },
                  sunoStyle: { type: "string" },
                },
                required: ["mood", "pacing", "energy", "genre", "videoDurationSeconds", "sunoPrompt", "sunoStyle"],
                additionalProperties: false,
              },
            },
          },
        });

        const raw = response.choices?.[0]?.message?.content ?? "";
        const analysis = typeof raw === "string" ? JSON.parse(raw) : raw;

        await db
          .update(wizScoreJobs)
          .set({
            analysis: JSON.stringify(analysis),
            sunoPrompt: analysis.sunoPrompt,
            videoDuration: Math.round(analysis.videoDurationSeconds ?? 0),
            status: "generating",
            updatedAt: new Date(),
          })
          .where(eq(wizScoreJobs.id, input.jobId));

        return {
          analysis,
          sunoPrompt: analysis.sunoPrompt,
          sunoStyle: analysis.sunoStyle,
          videoDuration: Math.round(analysis.videoDurationSeconds ?? 0),
        };
      } catch (err: any) {
        await db
          .update(wizScoreJobs)
          .set({ status: "failed", errorMessage: err.message, updatedAt: new Date() })
          .where(eq(wizScoreJobs.id, input.jobId));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Analysis failed: ${err.message}` });
      }
    }),

  /**
   * Kick off Suno music generation using the analysed prompt.
   * Returns the suno task ID so the client can poll.
   */
  generateScore: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        sunoPrompt: z.string().min(10),
        sunoStyle: z.string().optional(),
        videoDuration: z.number().int().min(5).max(300),
        origin: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [job] = await db
        .select()
        .from(wizScoreJobs)
        .where(and(eq(wizScoreJobs.id, input.jobId), eq(wizScoreJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      try {
        const callBackUrl = input.origin ? `${input.origin}/api/suno/callback` : undefined;
        const suno = initSuno();
        const externalTaskId = await suno.generate({
          prompt: input.sunoPrompt,
          style: input.sunoStyle,
          instrumental: true,
          model: "V4",
          callBackUrl,
        });

        // Insert a suno_music_tasks row
        const [sunoResult] = await db.insert(
          (await import("../../drizzle/schema")).sunoMusicTasks
        ).values({
          userId: ctx.user.id,
          taskId: externalTaskId,
          prompt: input.sunoPrompt,
          style: input.sunoStyle ?? null,
          instrumental: true,
          targetDuration: input.videoDuration,
          status: "pending",
        });

        const sunoTaskId = (sunoResult as any).insertId as number;

        await db
          .update(wizScoreJobs)
          .set({ sunoTaskId, status: "generating", updatedAt: new Date() })
          .where(eq(wizScoreJobs.id, input.jobId));

        return { sunoTaskId };
      } catch (err: any) {
        await db
          .update(wizScoreJobs)
          .set({ status: "failed", errorMessage: err.message, updatedAt: new Date() })
          .where(eq(wizScoreJobs.id, input.jobId));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Score generation failed: ${err.message}` });
      }
    }),

  /**
   * Get the current status of a WizScore job.
   */
  status: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [job] = await db
        .select()
        .from(wizScoreJobs)
        .where(and(eq(wizScoreJobs.id, input.jobId), eq(wizScoreJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      return {
        id: job.id,
        status: job.status,
        videoUrl: job.videoUrl,
        videoDuration: job.videoDuration,
        analysis: job.analysis ? JSON.parse(job.analysis) : null,
        sunoPrompt: job.sunoPrompt,
        sunoTaskId: job.sunoTaskId,
        audioUrl: job.audioUrl,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
      };
    }),

  /**
   * Mark a WizScore job as complete with the final audio URL.
   */
  complete: protectedProcedure
    .input(z.object({ jobId: z.number().int(), audioUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db
        .update(wizScoreJobs)
        .set({ audioUrl: input.audioUrl, status: "complete", updatedAt: new Date() })
        .where(and(eq(wizScoreJobs.id, input.jobId), eq(wizScoreJobs.userId, ctx.user.id)));

      return { success: true };
    }),

  /**
   * List the user's WizScore job history.
   */
  history: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const jobs = await db
      .select()
      .from(wizScoreJobs)
      .where(eq(wizScoreJobs.userId, ctx.user.id))
      .orderBy(desc(wizScoreJobs.createdAt))
      .limit(20);

    return jobs.map((j) => ({
      id: j.id,
      status: j.status,
      videoUrl: j.videoUrl,
      videoDuration: j.videoDuration,
      analysis: j.analysis ? JSON.parse(j.analysis) : null,
      sunoPrompt: j.sunoPrompt,
      audioUrl: j.audioUrl,
      createdAt: j.createdAt,
    }));
  }),
});
