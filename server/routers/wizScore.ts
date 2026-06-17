/**
 * WizScore Router
 * Video → User Description → AI Suno Prompt → Synced Soundtrack
 *
 * Flow:
 * 1. User uploads video → storagePut → create wizScoreJob (status: analyzing)
 * 2. analyze: user supplies mood/pacing/energy/genre → LLM crafts Suno prompt
 *    (NOTE: Manus LLM is text-only; video file_url inputs are not supported.
 *     The UI form collects the analysis fields from the user instead.)
 * 3. generateScore: call suno.generate with prompt + targetDuration → sunoTaskId
 * 4. pollScore: proxy to suno.status → when complete, return audioUrl
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { wizScoreJobs, sunoMusicTasks } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { initSuno } from "../ai-apis/suno";
import { getUserCredits, deductCredits, getUserSubscription, mapDbPlanToProductPlan } from "../db";

const CREDITS_PER_SCORE = 5;

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
   * Analyse the video using user-supplied description fields.
   * The Manus LLM is text-only and cannot accept video/mp4 inputs, so we
   * accept mood/pacing/energy/genre from the UI form and use the LLM to
   * craft the Suno prompt from those fields instead.
   */
  analyze: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        // User-supplied analysis from the UI form
        mood: z.string().min(1).max(100),
        pacing: z.enum(["slow", "medium", "fast", "variable"]),
        energy: z.enum(["low", "medium", "high", "building"]),
        genre: z.string().min(1).max(100),
        videoDurationSeconds: z.number().int().min(1).max(600),
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
        // Use LLM to craft the Suno prompt from user-supplied analysis fields
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional film composer. Based on the video analysis provided, create a Suno music generation prompt and style tags. Return ONLY valid JSON: {"sunoPrompt": "...", "sunoStyle": "..."}`,
            },
            {
              role: "user",
              content: `Video analysis:
- Mood: ${input.mood}
- Pacing: ${input.pacing}
- Energy: ${input.energy}
- Genre: ${input.genre}
- Duration: ${input.videoDurationSeconds}s
Generate a Suno music prompt (50-100 words) and style tags (2-4 comma-separated tags).`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "suno_prompt_output",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  sunoPrompt: { type: "string" },
                  sunoStyle: { type: "string" },
                },
                required: ["sunoPrompt", "sunoStyle"],
                additionalProperties: false,
              },
            },
          },
        });

        const raw = response.choices?.[0]?.message?.content ?? "";
        const result = typeof raw === "string" ? JSON.parse(raw) : raw;

        const analysis = {
          mood: input.mood,
          pacing: input.pacing,
          energy: input.energy,
          genre: input.genre,
          videoDurationSeconds: input.videoDurationSeconds,
          sunoStyle: result.sunoStyle,
        };

        await db
          .update(wizScoreJobs)
          .set({
            analysis: JSON.stringify(analysis),
            sunoPrompt: result.sunoPrompt,
            videoDuration: input.videoDurationSeconds,
            status: "generating",
            updatedAt: new Date(),
          })
          .where(eq(wizScoreJobs.id, input.jobId));

        return {
          analysis,
          sunoPrompt: result.sunoPrompt,
          sunoStyle: result.sunoStyle,
          videoDuration: input.videoDurationSeconds,
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

      // Plan gate — WizScore is Studio-only
      const sub = await getUserSubscription(ctx.user.id);
      const plan = mapDbPlanToProductPlan(sub?.plan ?? "free");
      if (plan !== "studio") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "PLAN_REQUIRED:studio:WizScore™ is available on the Studio plan. Upgrade to access AI soundtrack generation.",
        });
      }

      // Credit check before generation
      const creditsRecord = await getUserCredits(ctx.user.id);
      const creditBalance = creditsRecord?.balance ?? 0;
      if (creditBalance < CREDITS_PER_SCORE) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `INSUFFICIENT_CREDITS:${CREDITS_PER_SCORE}:${creditBalance}:${CREDITS_PER_SCORE - creditBalance}`,
        });
      }

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

        // Deduct credits after successful Suno call
        await deductCredits(ctx.user.id, CREDITS_PER_SCORE, "WizScore generation");

        // Insert a suno_music_tasks row (static import — no dynamic import per-call)
        const [sunoResult] = await db.insert(sunoMusicTasks).values({
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
