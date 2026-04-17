/**
 * Music Generation Router (WizSound)
 * Smart provider routing:
 *   - ElevenLabs Sound Effects: ≤30s, exact duration, cinematic/ambient
 *   - ElevenLabs Music: 30s–5min, prompt-guided duration, full composition
 *   - Suno: full creative songs with vocals, any length (trimmed to target)
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
import {
  generateSoundEffect,
  generateMusic,
  chooseElevenLabsProvider,
} from "../ai-apis/elevenlabs";

// ─── Types ────────────────────────────────────────────────────────────────────

type GenerationMode = "score" | "song" | "suno";
type Provider = "suno" | "elevenlabs_sfx" | "elevenlabs_music";

/**
 * Determine which provider to use based on mode and duration.
 * - score: ElevenLabs (SFX for ≤30s, Music for >30s)
 * - song: ElevenLabs Music (full composition with vocals)
 * - suno: Always Suno
 */
function resolveProvider(mode: GenerationMode, durationSeconds?: number): Provider {
  if (mode === "suno") return "suno";
  if (mode === "song") return "elevenlabs_music";
  // mode === "score"
  if (durationSeconds && durationSeconds <= 30) return "elevenlabs_sfx";
  return "elevenlabs_music";
}

export const sunoRouter = router({
  /**
   * Submit a music generation task.
   * Routes to ElevenLabs or Suno based on generationMode and targetDuration.
   */
  generate: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(400),
        lyrics: z.string().max(3000).optional(),
        style: z.string().max(200).optional(),
        title: z.string().max(80).optional(),
        instrumental: z.boolean().default(false),
        model: z.enum(["V3_5", "V4"]).default("V4"),
        origin: z.string().url().optional(),
        /** Target duration in seconds (5–600). */
        targetDuration: z.number().int().min(5).max(600).optional(),
        /**
         * Generation mode:
         *   score  = ElevenLabs (best for background/cinematic, near-exact duration)
         *   song   = ElevenLabs Music (full composition with vocals)
         *   suno   = Suno (creative songs with lyrics, trimmed to target)
         */
        generationMode: z.enum(["score", "song", "suno"]).default("suno"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const provider = resolveProvider(input.generationMode, input.targetDuration);

      // ── ElevenLabs Sound Effects (≤30s, exact duration) ─────────────────────
      if (provider === "elevenlabs_sfx") {
        const durationSec = input.targetDuration ?? 10;
        console.log(`[WizSound] ElevenLabs SFX — ${durationSec}s: "${input.prompt.substring(0, 80)}"`);

        let result;
        try {
          result = await generateSoundEffect({
            prompt: input.prompt,
            durationSeconds: durationSec,
            promptInfluence: 0.3,
            userId: ctx.user.id,
          });
        } catch (err: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `ElevenLabs Sound Effects failed: ${err.message}`,
          });
        }

        const track = {
          audioUrl: result.audioUrl,
          imageUrl: "",
          title: input.title ?? input.prompt.substring(0, 60),
          tags: input.style ?? "",
          duration: result.durationSeconds,
          trimmedDuration: result.durationSeconds, // exact — no trim needed
          provider: "elevenlabs_sfx",
        };

        const [inserted] = await db.insert(sunoMusicTasks).values({
          userId: ctx.user.id,
          taskId: `elevenlabs-sfx-${Date.now()}`,
          title: input.title ?? null,
          prompt: input.prompt,
          style: input.style ?? null,
          instrumental: true,
          targetDuration: durationSec,
          provider: "elevenlabs_sfx",
          generationMode: "score",
          status: "complete",
          tracks: JSON.stringify([track]),
          updatedAt: new Date(),
        });

        return { id: (inserted as any).insertId as number, taskId: `elevenlabs-sfx-${Date.now()}` };
      }

      // ── ElevenLabs Music (30s–5min, full composition) ────────────────────────
      if (provider === "elevenlabs_music") {
        console.log(`[WizSound] ElevenLabs Music — ${input.targetDuration ?? "?"}s: "${input.prompt.substring(0, 80)}"`);

        // Insert as "pending" immediately so frontend can start polling
        const [inserted] = await db.insert(sunoMusicTasks).values({
          userId: ctx.user.id,
          taskId: `elevenlabs-music-${Date.now()}`,
          title: input.title ?? null,
          prompt: input.prompt,
          style: input.style ?? null,
          instrumental: input.instrumental,
          targetDuration: input.targetDuration ?? null,
          provider: "elevenlabs_music",
          generationMode: input.generationMode,
          status: "processing",
          updatedAt: new Date(),
        });
        const taskDbId = (inserted as any).insertId as number;

        // Run generation in background (non-blocking)
        generateMusic({
          prompt: input.prompt,
          durationSeconds: input.targetDuration,
          userId: ctx.user.id,
        })
          .then(async (result) => {
            const track = {
              audioUrl: result.audioUrl,
              imageUrl: "",
              title: input.title ?? input.prompt.substring(0, 60),
              tags: input.style ?? "",
              duration: result.durationSeconds,
              trimmedDuration: result.durationSeconds,
              provider: "elevenlabs_music",
            };
            const dbConn = await getDb();
            if (dbConn) {
              await dbConn
                .update(sunoMusicTasks)
                .set({
                  status: "complete",
                  tracks: JSON.stringify([track]),
                  updatedAt: new Date(),
                })
                .where(eq(sunoMusicTasks.id, taskDbId));
              console.log(`[WizSound] ElevenLabs Music task ${taskDbId} complete — ${result.durationSeconds}s`);
            }
          })
          .catch(async (err) => {
            console.error(`[WizSound] ElevenLabs Music task ${taskDbId} failed:`, err.message);
            const dbConn = await getDb();
            if (dbConn) {
              await dbConn
                .update(sunoMusicTasks)
                .set({
                  status: "failed",
                  errorMessage: err.message,
                  updatedAt: new Date(),
                })
                .where(eq(sunoMusicTasks.id, taskDbId));
            }
          });

        return { id: taskDbId, taskId: `elevenlabs-music-${taskDbId}` };
      }

      // ── Suno (full creative songs, trimmed to target) ─────────────────────────
      const isCustomMode = !!(input.style && input.title);
      if (isCustomMode && !input.instrumental && (!input.lyrics || input.lyrics.trim().length < 20)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please enter at least a few lines of lyrics before generating in custom mode.",
        });
      }

      let suno: ReturnType<typeof initSuno>;
      try {
        suno = initSuno();
      } catch {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Suno API key not configured. Please add SUNO_API_KEY in Settings → Secrets.",
        });
      }

      const callBackUrl = input.origin
        ? `${input.origin}/api/suno/callback`
        : `${process.env.VITE_FRONTEND_FORGE_API_URL ?? "https://api.manus.im"}/api/suno/callback`;

      // Inject duration hint into the prompt
      let enrichedPrompt = input.prompt;
      if (input.targetDuration) {
        const mins = Math.floor(input.targetDuration / 60);
        const secs = input.targetDuration % 60;
        const durationLabel = mins > 0
          ? `${mins} minute${mins > 1 ? "s" : ""}${secs > 0 ? ` ${secs} second` : ""}`
          : `${secs} second`;
        if (input.targetDuration <= 15) {
          enrichedPrompt = `[${durationLabel} stinger/sting, very short, no verse structure] ${input.prompt}`;
        } else if (input.targetDuration <= 60) {
          enrichedPrompt = `[${durationLabel} short clip, no full song structure] ${input.prompt}`;
        } else {
          enrichedPrompt = `[${durationLabel} track] ${input.prompt}`;
        }
      }

      const externalTaskId = await suno.generate({
        prompt: enrichedPrompt,
        lyrics: input.lyrics,
        style: input.style,
        title: input.title,
        instrumental: input.instrumental,
        model: input.model,
        callBackUrl,
      });

      const [inserted] = await db.insert(sunoMusicTasks).values({
        userId: ctx.user.id,
        taskId: externalTaskId,
        title: input.title ?? null,
        prompt: input.prompt,
        style: input.style ?? null,
        instrumental: input.instrumental,
        targetDuration: input.targetDuration ?? null,
        provider: "suno",
        generationMode: "suno",
        status: "pending",
        updatedAt: new Date(),
      });

      return { id: (inserted as any).insertId as number, taskId: externalTaskId };
    }),

  /**
   * Poll the status of a music generation task.
   * For ElevenLabs tasks: reads from DB (generation runs in background).
   * For Suno tasks: polls external API and updates DB.
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

      // ── ElevenLabs tasks: read from DB (background worker updates it) ────────
      if (task.provider === "elevenlabs_sfx" || task.provider === "elevenlabs_music") {
        const cachedTracks = task.tracks ? JSON.parse(task.tracks) : [];
        return {
          id: task.id,
          status: task.status,
          tracks: cachedTracks,
          errorMessage: task.errorMessage,
          targetDuration: task.targetDuration,
          provider: task.provider,
        };
      }

      // ── Suno tasks: check DB cache first, then poll external API ─────────────
      if (task.status === "complete" || task.status === "failed") {
        const cachedTracks: SunoTrack[] = task.tracks ? JSON.parse(task.tracks) : [];
        const tracksWithAudio = cachedTracks.filter((t: any) => t.audioUrl && t.audioUrl.length > 0);
        const allTrimmed = tracksWithAudio.length > 0 && tracksWithAudio.every((t: any) => t.trimmedDuration != null);
        const isCurrentlyTrimming = cachedTracks.some((t: any) => t.trimming === true);
        const anyRetryableFailed = cachedTracks.some((t: any) => t.trimFailed === true && t.audioUrl && t.audioUrl.length > 0);

        const needsEnqueue =
          task.status === "complete" &&
          task.targetDuration &&
          tracksWithAudio.length > 0 &&
          !allTrimmed &&
          !anyRetryableFailed &&
          !isCurrentlyTrimming;

        if (needsEnqueue) {
          const trimmingTracks = cachedTracks.map((t: SunoTrack) => ({
            ...t,
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
            provider: task.provider,
          };
        }

        if (isCurrentlyTrimming) {
          return {
            id: task.id,
            status: "trimming" as any,
            tracks: cachedTracks,
            errorMessage: task.errorMessage,
            targetDuration: task.targetDuration,
            provider: task.provider,
          };
        }

        const playableTracks = cachedTracks.filter((t: any) => t.audioUrl && t.audioUrl.length > 0);
        return {
          id: task.id,
          status: task.status,
          tracks: playableTracks,
          errorMessage: task.errorMessage,
          targetDuration: task.targetDuration,
          provider: task.provider,
        };
      }

      // Poll Suno external API
      let suno: ReturnType<typeof initSuno>;
      try {
        suno = initSuno();
      } catch {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Suno API key not configured" });
      }

      const result = await suno.getTaskStatus(task.taskId);

      let finalTracks = result.tracks ?? [];
      if (result.status === "complete" && task.targetDuration && finalTracks.length > 0) {
        finalTracks = finalTracks.map((t: SunoTrack) => ({
          ...t,
          trimming: true,
          originalUrl: t.audioUrl,
        }));
      }

      const hasTrimming = finalTracks.some((t: any) => t.trimming === true);
      await db
        .update(sunoMusicTasks)
        .set({
          status: result.status,
          tracks: finalTracks.length > 0 ? JSON.stringify(finalTracks) : null,
          updatedAt: new Date(),
        })
        .where(eq(sunoMusicTasks.id, task.id));

      if (hasTrimming) enqueueTrim(task.id);

      return {
        id: task.id,
        status: hasTrimming ? ("trimming" as any) : result.status,
        tracks: finalTracks,
        errorMessage: result.errorMessage,
        targetDuration: task.targetDuration,
        provider: task.provider,
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
      provider: t.provider,
      generationMode: t.generationMode,
      tracks: t.tracks ? JSON.parse(t.tracks) : [],
      createdAt: t.createdAt,
    }));
  }),

  /**
   * Generate draft lyrics using the LLM.
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
