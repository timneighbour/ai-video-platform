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
import { getDb, getUserSubscription, deductCredits } from "../db";
import { sunoMusicTasks, songDownloads, users } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { initSuno, SunoTrack } from "../ai-apis/suno";
import { storagePut } from "../storage";
import { transcribeAudio } from "../_core/voiceTranscription";
import { invokeLLM } from "../_core/llm";
import { enqueueTrim } from "../trimWorker";
import {
  generateSoundEffect,
  generateMusic,
  chooseElevenLabsProvider,
} from "../ai-apis/elevenlabs";
import { signStreamToken, signDownloadToken } from "../_core/audioProxy";
import Stripe from "stripe";

// ─── Constants ────────────────────────────────────────────────────────────────
/** Non-subscribers get this many free song generations before being blocked. */
const FREE_PREVIEW_QUOTA = 3;
/** Credits deducted from a subscriber's balance when they download a song. */
const SONG_DOWNLOAD_CREDIT_COST = 2;

// ─── Types ────────────────────────────────────────────────────────────────────

type GenerationMode = "score" | "song" | "suno" | "cover" | "extend";
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

      // ── Song preview quota gate (non-subscribers only) ────────────────────────
      // Only applies to song/suno modes (not score/sfx — those are background music).
      // Subscribers bypass this entirely.
      if (provider === "suno" || provider === "elevenlabs_music") {
        const sub = await getUserSubscription(ctx.user.id);
        const isSubscriber = sub && (sub.status === "active" || sub.status === "past_due");
        if (!isSubscriber) {
          const previewsUsed = ctx.user.songPreviewsUsed ?? 0;
          if (previewsUsed >= FREE_PREVIEW_QUOTA) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `You've used your ${FREE_PREVIEW_QUOTA} free song previews. Subscribe to a plan to generate more songs.`,
            });
          }
          // Increment the preview counter before generation
          await db
            .update(users)
            .set({ songPreviewsUsed: previewsUsed + 1 })
            .where(eq(users.id, ctx.user.id));
        }
      }

      // ── ElevenLabs Sound Effects (≤30s, exact duration) ─────────────────────
      if (provider === "elevenlabs_sfx") {
        const durationSec = input.targetDuration ?? 10;

        // Build enriched prompt: combine the user's description with genre/mood/style context
        // so ElevenLabs SFX has the full picture of what to generate.
        // We build a natural-language sentence rather than just appending tags,
        // which the SFX model responds to much better.
        const sfxParts: string[] = [input.prompt.trim()];
        if (input.style) {
          // e.g. "Classical, Epic, Instrumental only" → append as descriptive context
          sfxParts.push(`Style: ${input.style}.`);
        }
        // Explicitly reinforce instrumental when no vocals are wanted
        if (input.instrumental || (input.style?.toLowerCase().includes("instrumental") ?? false)) {
          sfxParts.push("No vocals. Instrumental only.");
        }
        const sfxEnrichedPrompt = sfxParts.join(" ");

        console.log(`[WizSound] ElevenLabs SFX — ${durationSec}s\n  prompt (${sfxEnrichedPrompt.length} chars): "${sfxEnrichedPrompt.substring(0, 300)}"`);

        let result;
        try {
          result = await generateSoundEffect({
            prompt: sfxEnrichedPrompt,
            durationSeconds: durationSec,
            // 0.85 = high prompt adherence — model follows the description closely
            // rather than taking creative liberties (0.3 was too loose)
            promptInfluence: 0.85,
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
        // Build enriched prompt with genre, mood, vocal style context
        const contextParts: string[] = [];
        if (input.style) contextParts.push(input.style);
        const enrichedPromptForEleven = contextParts.length > 0
          ? `${input.prompt} [${contextParts.join(", ")}]`
          : input.prompt;
        const isInstrumentalForEleven = input.instrumental ||
          input.generationMode === "score" ||
          (input.style?.toLowerCase().includes("instrumental") ?? false);

        console.log(
          `[WizSound] ElevenLabs Music — ${input.targetDuration ?? "?"}s\n` +
          `  make_instrumental: ${isInstrumentalForEleven}\n` +
          `  enriched prompt (${enrichedPromptForEleven.length} chars): "${enrichedPromptForEleven.substring(0, 300)}"`
        );

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
        generateMusic({
          prompt: enrichedPromptForEleven,
          durationSeconds: input.targetDuration,
          makeInstrumental: isInstrumentalForEleven,
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
      // Custom mode requires BOTH style AND lyrics (or instrumental flag).
      // If the user only provided a prompt description (no lyrics), fall back to
      // Suno's non-custom mode by omitting style/title so the model generates freely.
      const hasLyrics = !!(input.lyrics && input.lyrics.trim().length >= 20);
      const isCustomMode = !!(input.style && input.title) && (hasLyrics || input.instrumental);
      if (!!(input.style && input.title) && !input.instrumental && !hasLyrics) {
        // Silently downgrade to non-custom mode — use the prompt as the description
        // and let Suno handle lyrics generation automatically.
        Object.assign(input, { style: undefined, title: input.title });
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
        // Sign stream tokens for song-mode tracks (not score/sfx — those are background music)
        const isSignable = task.provider === "elevenlabs_music";
        const signedTracks = isSignable
          ? await Promise.all(
              cachedTracks.map(async (t: any, i: number) => {
                if (!t.audioUrl) return t;
                const token = await signStreamToken({
                  audioUrl: t.audioUrl,
                  userId: ctx.user.id,
                  taskId: task.id,
                  trackIndex: i,
                });
                return { ...t, audioUrl: `/api/audio/stream/${token}` };
              })
            )
          : cachedTracks;
        return {
          id: task.id,
          status: task.status,
          tracks: signedTracks,
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
          // Sign stream tokens before returning trimming tracks to the client
          const signedTrimmingTracks = await Promise.all(
            trimmingTracks.map(async (t: any, i: number) => {
              const { originalUrl: _o, ...rest } = t;
              if (!rest.audioUrl || rest.audioUrl.startsWith("/api/audio/")) return rest;
              const token = await signStreamToken({
                audioUrl: rest.audioUrl,
                userId: ctx.user.id,
                taskId: task.id,
                trackIndex: i,
              });
              return { ...rest, audioUrl: `/api/audio/stream/${token}` };
            })
          );
          return {
            id: task.id,
            status: "trimming" as any,
            tracks: signedTrimmingTracks,
            errorMessage: task.errorMessage,
            targetDuration: task.targetDuration,
            provider: task.provider,
          };
        }

        if (isCurrentlyTrimming) {
          // Sign stream tokens for already-trimming tracks before returning
          const signedCachedTracks = await Promise.all(
            cachedTracks.map(async (t: any, i: number) => {
              const { originalUrl: _o, ...rest } = t;
              if (!rest.audioUrl || rest.audioUrl.startsWith("/api/audio/")) return rest;
              const token = await signStreamToken({
                audioUrl: rest.audioUrl,
                userId: ctx.user.id,
                taskId: task.id,
                trackIndex: i,
              });
              return { ...rest, audioUrl: `/api/audio/stream/${token}` };
            })
          );
          return {
            id: task.id,
            status: "trimming" as any,
            tracks: signedCachedTracks,
            errorMessage: task.errorMessage,
            targetDuration: task.targetDuration,
            provider: task.provider,
          };
        }

        const playableTracks = cachedTracks.filter((t: any) => t.audioUrl && t.audioUrl.length > 0);
        // Sign stream tokens for Suno tracks
        const signedPlayableTracks = await Promise.all(
          playableTracks.map(async (t: any, i: number) => {
            if (!t.audioUrl || t.audioUrl.startsWith("/api/audio/")) return t;
            const token = await signStreamToken({
              audioUrl: t.audioUrl,
              userId: ctx.user.id,
              taskId: task.id,
              trackIndex: i,
            });
            return { ...t, audioUrl: `/api/audio/stream/${token}` };
          })
        );
        return {
          id: task.id,
          status: task.status,
          tracks: signedPlayableTracks,
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

      // Sign stream tokens for freshly-polled Suno tracks; strip originalUrl from client response
      const signedFinalTracks = await Promise.all(
        finalTracks.map(async (t: any, i: number) => {
          const { originalUrl: _o, ...rest } = t;
          if (!rest.audioUrl || rest.audioUrl.startsWith("/api/audio/")) return rest;
          const token = await signStreamToken({
            audioUrl: rest.audioUrl,
            userId: ctx.user.id,
            taskId: task.id,
            trackIndex: i,
          });
          return { ...rest, audioUrl: `/api/audio/stream/${token}` };
        })
      );

      return {
        id: task.id,
        status: hasTrimming ? ("trimming" as any) : result.status,
        tracks: signedFinalTracks,
        errorMessage: result.errorMessage,
        targetDuration: task.targetDuration,
        provider: task.provider,
      };
    }),

  /**
   * Download a song track.
   * - If already unlocked (songDownloads row exists): free re-download.
   * - Subscriber: deduct 2 credits and unlock permanently.
   * - Non-subscriber with STRIPE_SONG_DOWNLOAD_PRICE_ID set: return Stripe checkout URL.
   * - Non-subscriber without price ID: return requiresPayment=true with no URL (coming soon).
   */
  downloadSong: protectedProcedure
    .input(
      z.object({
        taskId: z.number().int().positive(),
        trackIndex: z.number().int().min(0).max(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify task ownership and fetch the raw audio URL
      const [task] = await db
        .select()
        .from(sunoMusicTasks)
        .where(and(eq(sunoMusicTasks.id, input.taskId), eq(sunoMusicTasks.userId, ctx.user.id)))
        .limit(1);

      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      if (task.status !== "complete") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Track is not ready yet" });
      }

      const tracks: any[] = task.tracks ? JSON.parse(task.tracks) : [];
      const track = tracks[input.trackIndex];
      if (!track?.audioUrl) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Track audio not available" });
      }

      // Resolve raw URL: strip proxy wrapper if already signed (re-download scenario)
      // The stored audioUrl may be a raw provider URL or already a signed stream path.
      // We always store raw URLs in the DB; the signing happens at serve time.
      const rawAudioUrl: string = track.originalUrl ?? track.audioUrl;

      // ── Check for existing unlock (free re-download) ──────────────────────────
      const [existingUnlock] = await db
        .select()
        .from(songDownloads)
        .where(
          and(
            eq(songDownloads.userId, ctx.user.id),
            eq(songDownloads.taskId, input.taskId),
            eq(songDownloads.trackIndex, input.trackIndex)
          )
        )
        .limit(1);

      if (existingUnlock) {
        // Already paid — issue a fresh 15-minute download token
        const token = await signDownloadToken({
          audioUrl: rawAudioUrl,
          userId: ctx.user.id,
          taskId: input.taskId,
          trackIndex: input.trackIndex,
          title: track.title ?? task.title ?? "track",
        });
        return { downloadUrl: `/api/audio/download/${token}`, alreadyUnlocked: true };
      }

      // ── Subscriber path: deduct 2 credits ────────────────────────────────────
      const sub = await getUserSubscription(ctx.user.id);
      const isSubscriber = sub && (sub.status === "active" || sub.status === "past_due");

      if (isSubscriber) {
        try {
          await deductCredits(
            ctx.user.id,
            SONG_DOWNLOAD_CREDIT_COST,
            `Song download — WizAudio (task ${input.taskId}, track ${input.trackIndex})`
          );
        } catch (err: any) {
          if (err.message === "Insufficient credits") {
            throw new TRPCError({
              code: "PAYMENT_REQUIRED",
              message: "Not enough credits to download this song. Top up your credits to continue.",
            });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
        }

        // Record permanent unlock
        await db.insert(songDownloads).values({
          userId: ctx.user.id,
          taskId: input.taskId,
          trackIndex: input.trackIndex,
          creditsCharged: SONG_DOWNLOAD_CREDIT_COST,
        });

        const token = await signDownloadToken({
          audioUrl: rawAudioUrl,
          userId: ctx.user.id,
          taskId: input.taskId,
          trackIndex: input.trackIndex,
          title: track.title ?? task.title ?? "track",
        });
        return { downloadUrl: `/api/audio/download/${token}`, alreadyUnlocked: false };
      }

      // ── Non-subscriber path: Stripe £3.99 one-off checkout ───────────────────
      const priceId = process.env.STRIPE_SONG_DOWNLOAD_PRICE_ID;
      if (!priceId) {
        // Price not yet configured in Stripe dashboard
        return {
          requiresPayment: true,
          checkoutUrl: null,
          message: "Song download coming soon — subscribe to a plan to download now.",
        };
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
      // Build success URL — CheckoutSuccess page will detect type=song_download
      // and show the correct post-purchase message.
      const origin = process.env.VITE_FRONTEND_FORGE_API_URL
        ? new URL(process.env.VITE_FRONTEND_FORGE_API_URL).origin
        : "https://wiz-ai.io";

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: ctx.user.email || undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          type: "song_download",
          user_id: ctx.user.id.toString(),
          task_id: input.taskId.toString(),
          track_index: input.trackIndex.toString(),
          customer_name: ctx.user.name || "",
          customer_email: ctx.user.email || "",
        },
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/checkout/success?type=song_download&taskId=${input.taskId}&trackIndex=${input.trackIndex}`,
        cancel_url: `${origin}/studio/audio`,
        allow_promotion_codes: true,
      });

      return { requiresPayment: true, checkoutUrl: session.url };
    }),

  /**
   * Returns the current user's song preview quota status.
   * Used by WizAudioPlayer and MusicCreator to show the correct gate UI.
   */
  previewQuota: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getUserSubscription(ctx.user.id);
    const isSubscriber = !!(sub && (sub.status === "active" || sub.status === "past_due"));
    const previewsUsed = ctx.user.songPreviewsUsed ?? 0;
    return {
      isSubscriber,
      previewsUsed,
      quota: FREE_PREVIEW_QUOTA,
      remaining: Math.max(0, FREE_PREVIEW_QUOTA - previewsUsed),
      downloadCreditCost: SONG_DOWNLOAD_CREDIT_COST,
    };
  }),

  /**
   * Re-download a previously unlocked song track from the history page.
   * Always verifies the unlock server-side; never reconstructs a URL client-side.
   * Returns a fresh 15-minute signed download token if the user owns an unlock record.
   * Throws FORBIDDEN if the track has not been unlocked by this user.
   */
  redownloadSong: protectedProcedure
    .input(
      z.object({
        taskId: z.number().int().positive(),
        trackIndex: z.number().int().min(0).max(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 1. Verify task ownership
      const [task] = await db
        .select()
        .from(sunoMusicTasks)
        .where(and(eq(sunoMusicTasks.id, input.taskId), eq(sunoMusicTasks.userId, ctx.user.id)))
        .limit(1);

      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

      // 2. Verify the unlock record exists for this user + track
      const [unlock] = await db
        .select()
        .from(songDownloads)
        .where(
          and(
            eq(songDownloads.userId, ctx.user.id),
            eq(songDownloads.taskId, input.taskId),
            eq(songDownloads.trackIndex, input.trackIndex)
          )
        )
        .limit(1);

      if (!unlock) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This track has not been unlocked. Please download it from the player first.",
        });
      }

      // 3. Resolve the raw audio URL from DB (never from client)
      const tracks: any[] = task.tracks ? JSON.parse(task.tracks) : [];
      const track = tracks[input.trackIndex];
      if (!track?.audioUrl) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Track audio not available" });
      }
      const rawAudioUrl: string = track.originalUrl ?? track.audioUrl;

      // 4. Issue a fresh 15-minute signed download token — never return the raw URL
      const token = await signDownloadToken({
        audioUrl: rawAudioUrl,
        userId: ctx.user.id,
        taskId: input.taskId,
        trackIndex: input.trackIndex,
        title: track.title ?? task.title ?? "track",
      });

      return { downloadUrl: `/api/audio/download/${token}` };
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

    return tasks.map((t) => {
      // Strip raw provider URLs from history — audioUrl is replaced with a
      // signed /api/audio/stream/:token by getStatus when the user replays.
      // History only needs metadata; the player calls getStatus for playback.
      const rawTracks: any[] = t.tracks ? JSON.parse(t.tracks) : [];
      const safeTracks = rawTracks.map(({ audioUrl: _a, originalUrl: _o, ...rest }: any) => rest);
      return {
        id: t.id,
        title: t.title,
        prompt: t.prompt,
        style: t.style,
        instrumental: t.instrumental,
        status: t.status,
        targetDuration: t.targetDuration,
        provider: t.provider,
        generationMode: t.generationMode,
        tracks: safeTracks,
        createdAt: t.createdAt,
      };
    });
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
   * Delete a music generation task (and its tracks) owned by the current user.
   */
  deleteTask: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify ownership before deleting
      const [task] = await db
        .select({ id: sunoMusicTasks.id })
        .from(sunoMusicTasks)
        .where(and(eq(sunoMusicTasks.id, input.id), eq(sunoMusicTasks.userId, ctx.user.id)))
        .limit(1);

      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

      await db
        .delete(sunoMusicTasks)
        .where(and(eq(sunoMusicTasks.id, input.id), eq(sunoMusicTasks.userId, ctx.user.id)));

      return { success: true };
    }),

  /**
   * Upload a user's audio track to S3 and return the public URL.
   * The URL is then passed to generateCover or generateExtend.
   */
  uploadTrackForCover: protectedProcedure
    .input(
      z.object({
        bytes: z.array(z.number()),
        mimeType: z.string(),
        filename: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.bytes);
      const ext = input.filename.split(".").pop() || "mp3";
      const key = `wizsound-uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url, key };
    }),

  /**
   * Generate a cover/transformation of an uploaded track.
   * The user's track is preserved as the melodic base; the style is transformed.
   */
  generateCover: protectedProcedure
    .input(
      z.object({
        /** Public S3 URL of the user's uploaded track */
        uploadedTrackUrl: z.string().url(),
        /** Style description (non-custom) or exact lyrics (custom) */
        prompt: z.string().min(1).max(400).optional(),
        /** Music style/genre (custom mode) */
        style: z.string().max(200).optional(),
        /** Track title (custom mode) */
        title: z.string().max(80).optional(),
        instrumental: z.boolean().default(false),
        /** 0.0-1.0: how strongly to apply the new style (default 0.7) */
        styleWeight: z.number().min(0).max(1).default(0.7),
        /** 0.0-1.0: how much to preserve the original audio (default 0.5) */
        audioWeight: z.number().min(0).max(1).default(0.5),
        model: z.enum(["V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5"]).default("V4_5"),
        origin: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const suno = initSuno();
      const customMode = !!(input.style && input.title);
      const callBackUrl = input.origin
        ? `${input.origin}/api/suno/callback`
        : `${process.env.VITE_FRONTEND_FORGE_API_URL ?? "https://api.manus.im"}/api/suno/callback`;

      const sunoTaskId = await suno.uploadCover({
        uploadUrl: input.uploadedTrackUrl,
        customMode,
        instrumental: input.instrumental,
        model: input.model,
        prompt: input.prompt,
        style: input.style,
        title: input.title,
        styleWeight: input.styleWeight,
        audioWeight: input.audioWeight,
        callBackUrl,
      });

      const [task] = await db
        .insert(sunoMusicTasks)
        .values({
          userId: ctx.user.id,
          taskId: sunoTaskId,
          title: input.title ?? "Cover Track",
          prompt: input.prompt ?? "",
          style: input.style ?? "",
          instrumental: input.instrumental,
          status: "pending",
          provider: "suno",
          generationMode: "cover",
          uploadedTrackUrl: input.uploadedTrackUrl,
        })
        .$returningId();

      return { id: task.id, status: "pending" as const };
    }),

  /**
   * Extend an uploaded track with AI continuation.
   */
  generateExtend: protectedProcedure
    .input(
      z.object({
        /** Public S3 URL of the user's uploaded track */
        uploadedTrackUrl: z.string().url(),
        prompt: z.string().min(1).max(400).optional(),
        style: z.string().max(200).optional(),
        title: z.string().max(80).optional(),
        instrumental: z.boolean().default(false),
        model: z.enum(["V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5"]).default("V4_5"),
        origin: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const suno = initSuno();
      const customMode = !!(input.style && input.title);
      const callBackUrl = input.origin
        ? `${input.origin}/api/suno/callback`
        : `${process.env.VITE_FRONTEND_FORGE_API_URL ?? "https://api.manus.im"}/api/suno/callback`;

      const sunoTaskId = await suno.uploadExtend({
        uploadUrl: input.uploadedTrackUrl,
        customMode,
        instrumental: input.instrumental,
        model: input.model,
        prompt: input.prompt,
        style: input.style,
        title: input.title,
        callBackUrl,
      });

      const [task] = await db
        .insert(sunoMusicTasks)
        .values({
          userId: ctx.user.id,
          taskId: sunoTaskId,
          title: input.title ?? "Extended Track",
          prompt: input.prompt ?? "",
          style: input.style ?? "",
          instrumental: input.instrumental,
          status: "pending",
          provider: "suno",
          generationMode: "extend",
          uploadedTrackUrl: input.uploadedTrackUrl,
        })
        .$returningId();

      return { id: task.id, status: "pending" as const };
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
  /**
   * Transcribe an uploaded audio track to extract lyrics/text.
   * Called automatically after a user uploads a track in WizAudio.
   */
  transcribeTrack: protectedProcedure
    .input(
      z.object({
        /** Public URL of the uploaded audio file */
        audioUrl: z.string().url(),
        /** Optional language hint */
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: input.language,
        prompt: "Music lyrics and vocals",
      });
      if ("error" in result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Transcription failed",
        });
      }
      return {
        text: result.text ?? "",
        language: result.language ?? "en",
        segments: result.segments ?? [],
      };
    }),
});
