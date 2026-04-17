/**
 * Suno Music Router
 * Handles AI music generation via sunoapi.org.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sunoMusicTasks } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { initSuno, SunoTrack } from "../ai-apis/suno";
import { invokeLLM } from "../_core/llm";
import { enqueueTrim } from "../trimWorker";
export const sunoRouter = router({
  /**
   * Submit a music generation task.
   * Returns the DB task ID for polling.
   */
  generate: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(400),
        /**
         * Actual song lyrics for custom mode (style + title must also be set).
         * In custom mode Suno uses this as the lyric body — must be at least 20 chars.
         */
        lyrics: z.string().max(3000).optional(),
        style: z.string().max(200).optional(),
        title: z.string().max(80).optional(),
        instrumental: z.boolean().default(false),
        model: z.enum(["V3_5", "V4"]).default("V4"),
        /** Frontend must pass window.location.origin so we can build the callback URL */
        origin: z.string().url().optional(),
        /** Target duration in seconds (5–600). Track will be trimmed/faded to this length after generation. */
        targetDuration: z.number().int().min(5).max(600).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate: custom mode requires lyrics to be non-empty
      const isCustomMode = !!(input.style && input.title);
      if (isCustomMode && !input.instrumental && (!input.lyrics || input.lyrics.trim().length < 20)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please enter at least a few lines of lyrics before generating in custom mode. You can use the \"Generate Lyrics\" button to create a draft.",
        });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      let suno: ReturnType<typeof initSuno>;
      try {
        suno = initSuno();
      } catch {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Suno API key not configured. Please add SUNO_API_KEY in Settings → Secrets.",
        });
      }

      // Build callback URL from origin (required by Suno API)
      const callBackUrl = input.origin
        ? `${input.origin}/api/suno/callback`
        : `${process.env.VITE_FRONTEND_FORGE_API_URL ?? "https://api.manus.im"}/api/suno/callback`;

      // Submit to Suno API
      const externalTaskId = await suno.generate({
        prompt: input.prompt,
        lyrics: input.lyrics,
        style: input.style,
        title: input.title,
        instrumental: input.instrumental,
        model: input.model,
        callBackUrl,
      });

      // Save to DB
      const [inserted] = await db.insert(sunoMusicTasks).values({
        userId: ctx.user.id,
        taskId: externalTaskId,
        title: input.title ?? null,
        prompt: input.prompt,
        style: input.style ?? null,
        instrumental: input.instrumental,
        targetDuration: input.targetDuration ?? null,
        status: "pending",
        updatedAt: new Date(),
      });

      return { id: (inserted as any).insertId as number, taskId: externalTaskId };
    }),

  /**
   * Poll the status of a music generation task.
   * Updates DB and returns current status + tracks.
   */
  getStatus: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [task] = await db
        .select()
        .from(sunoMusicTasks)
        .where(and(eq(sunoMusicTasks.id, input.id), eq(sunoMusicTasks.userId, ctx.user.id)));

      if (!task) throw new TRPCError({ code: "NOT_FOUND" });

      // If already complete/failed, return cached result
      if (task.status === "complete" || task.status === "failed") {
        const cachedTracks: SunoTrack[] = task.tracks ? JSON.parse(task.tracks) : [];

        // Check if tracks are still being trimmed by the background worker
        // A task is fully trimmed when ALL tracks with valid audio have trimmedDuration set
        // (tracks with empty audioUrl from Suno are excluded from the check)
        const tracksWithAudio = cachedTracks.filter((t: any) => t.audioUrl && t.audioUrl.length > 0);
        const allTrimmed = tracksWithAudio.length > 0 && tracksWithAudio.every((t: any) => t.trimmedDuration != null);
        const isCurrentlyTrimming = cachedTracks.some((t: any) => t.trimming === true);
        // Only consider a track truly failed if it has a valid audioUrl but trim failed
        const anyRetryableFailed = cachedTracks.some((t: any) => t.trimFailed === true && t.audioUrl && t.audioUrl.length > 0);

        // Check if trim is needed but hasn't been enqueued yet
        // (some tracks have no trimmedDuration and no trimFailed flag)
        const needsEnqueue =
          task.status === "complete" &&
          task.targetDuration &&
          tracksWithAudio.length > 0 &&
          !allTrimmed &&
          !anyRetryableFailed &&
          !isCurrentlyTrimming;

        if (needsEnqueue) {
          // Mark tracks as trimming and enqueue with the worker
          console.log(`[WizSound] Task ${task.id} needs trim — marking and enqueuing...`);
          const trimmingTracks = cachedTracks.map((t: SunoTrack) => ({
            ...t,
            // Only mark tracks that haven't been trimmed yet
            trimming: !(t as any).trimmedDuration,
            originalUrl: (t as any).originalUrl ?? t.audioUrl,
          }));
          await db
            .update(sunoMusicTasks)
            .set({ tracks: JSON.stringify(trimmingTracks), updatedAt: new Date() })
            .where(eq(sunoMusicTasks.id, task.id));
          enqueueTrim(task.id);
          return {
            id: task.id,
            status: "trimming" as any,
            tracks: trimmingTracks,
            errorMessage: task.errorMessage,
            targetDuration: task.targetDuration,
          };
        }

        if (isCurrentlyTrimming) {
          // Worker is still processing — return trimming status so frontend keeps polling
          // NOTE: Do NOT call enqueueTrim here — it causes infinite re-enqueue loops
          return {
            id: task.id,
            status: "trimming" as any,
            tracks: cachedTracks,
            errorMessage: task.errorMessage,
            targetDuration: task.targetDuration,
          };
        }

        // Only return tracks that have a valid audio URL (filter out Suno API failures)
        const playableTracks = cachedTracks.filter((t: any) => t.audioUrl && t.audioUrl.length > 0);
        return {
          id: task.id,
          status: task.status,
          tracks: playableTracks,
          errorMessage: task.errorMessage,
          targetDuration: task.targetDuration,
        };
      }

      // Poll external API
      let suno: ReturnType<typeof initSuno>;
      try {
        suno = initSuno();
      } catch {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Suno API key not configured" });
      }

      const result = await suno.getTaskStatus(task.taskId);

      // If complete and targetDuration is set, mark tracks for background trimming
      let finalTracks = result.tracks ?? [];
      if (result.status === "complete" && task.targetDuration && finalTracks.length > 0) {
        // Mark tracks as needing trim — the background worker will handle the actual trim
        finalTracks = finalTracks.map((t: SunoTrack) => ({
          ...t,
          trimming: true,
          originalUrl: t.audioUrl,
        }));
        console.log(`[WizSound] Task ${task.id} complete — marking ${finalTracks.length} tracks for background trim to ${task.targetDuration}s`);
      }

      // Update DB
      const hasTrimming = finalTracks.some((t: any) => t.trimming === true);
      await db
        .update(sunoMusicTasks)
        .set({
          status: result.status,
          tracks: finalTracks.length > 0 ? JSON.stringify(finalTracks) : null,
          updatedAt: new Date(),
        })
        .where(eq(sunoMusicTasks.id, task.id));

      // Enqueue background trim if needed
      if (hasTrimming) {
        enqueueTrim(task.id);
      }

      return {
        id: task.id,
        status: hasTrimming ? ("trimming" as any) : result.status,
        tracks: finalTracks,
        errorMessage: result.errorMessage,
        targetDuration: task.targetDuration,
      };
    }),

  /**
   * Get the user's music generation history (last 20).
   */
  history: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const tasks = await db
      .select()
      .from(sunoMusicTasks)
      .where(eq(sunoMusicTasks.userId, ctx.user.id))
      .orderBy(desc(sunoMusicTasks.createdAt))
      .limit(20);

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      prompt: t.prompt,
      style: t.style,
      instrumental: t.instrumental,
      status: t.status,
      targetDuration: t.targetDuration,
      tracks: t.tracks ? JSON.parse(t.tracks) : [],
      createdAt: t.createdAt,
    }));
  }),

  /**
   * Generate draft lyrics using the LLM.
   * Returns a draft that the user can edit before generating the song.
   */
  generateLyrics: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(400),
        genre: z.string().optional(),
        mood: z.string().optional(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const context = [
        input.title ? `Song title: "${input.title}"` : null,
        input.genre ? `Genre: ${input.genre}` : null,
        input.mood ? `Mood: ${input.mood}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const systemPrompt = `You are a professional songwriter. Write complete, singable song lyrics based on the user's description.

Rules:
- Structure: [Verse 1], [Pre-Chorus] (optional), [Chorus], [Verse 2], [Bridge] (optional), [Chorus], [Outro] (optional)
- Each section label must be on its own line in square brackets, e.g. [Verse 1]
- 3–5 lines per verse, 2–4 lines per chorus
- Rhyme scheme: ABAB or AABB preferred
- Keep language natural and singable — avoid tongue-twisters
- Do NOT include explanations, just the lyrics
- Total length: 150–400 words`;

      const userMessage = `Write song lyrics for:\n${input.prompt}${context ? `\n\nAdditional context:\n${context}` : ""}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });

      const rawContent = response.choices?.[0]?.message?.content ?? "";
      const lyrics = typeof rawContent === "string" ? rawContent : "";
      if (!lyrics.trim()) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate lyrics. Please try again." });
      }

      return { lyrics: lyrics.trim() };
    }),

  /**
   * Public endpoint: get featured/demo tracks for the landing page.
   * Returns completed tasks from the owner account (userId = 1).
   */
  featuredTracks: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const tasks = await db
      .select()
      .from(sunoMusicTasks)
      .where(and(eq(sunoMusicTasks.status, "complete"), eq(sunoMusicTasks.userId, 1)))
      .orderBy(desc(sunoMusicTasks.createdAt))
      .limit(6);

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      style: t.style,
      tracks: t.tracks ? JSON.parse(t.tracks) : [],
    }));
  }),
});
