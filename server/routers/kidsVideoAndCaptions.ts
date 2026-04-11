/**
 * Kids Video Mode & Lyrics/Captions tRPC Router
 * Exposes core features for music and kids video creation
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { musicVideoJobs, musicVideoScenes } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  validateKidsVideoContent,
  autoCorrectKidsVideoContent,
  enhanceKidsVideoPrompt,
  generateKidsStoryboardStructure,
  checkKidsVideoSafety,
  KIDS_EDUCATIONAL_THEMES,
  KIDS_VIDEO_VISUAL_RULES
} from "../kids-video-safety";
import {
  extractLyricsFromTranscription,
  parseLyricsFromSRT,
  parseLyricsFromVTT,
  validateLyricsTimings,
  generateSRTSubtitles,
  generateVTTSubtitles,
  getCaptionAtTime,
  getNextCaption,
  adjustLyricsTiming,
  splitLyricLine,
  mergeLyricLines,
  generateCaptionCSS,
  validateCaptionConfig
} from "../lyrics-captions-service";
import { storagePut } from "../storage";

export const kidsVideoAndCaptionsRouter = router({
  // ─── Kids Video Mode ──────────────────────────────────────────────────

  /**
   * Enable Kids Video Mode for a music video job
   */
  enableKidsMode: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        targetAge: z.string().optional(), // e.g., "3-5", "5-8", "8-12"
        educationalTheme: z.string().optional(),
        enableSingalong: z.boolean().default(true),
        friendlyIntensity: z.enum(["soft", "moderate", "vibrant"]).default("vibrant")
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      // Update job with Kids Video Mode settings
      await db.update(musicVideoJobs)
        .set({
          isKidsVideo: true,
          kidsTargetAge: input.targetAge,
          kidsEducationalTheme: input.educationalTheme,
          kidsEnableSingalong: input.enableSingalong,
          kidsFriendlyIntensity: input.friendlyIntensity,
          updatedAt: new Date()
        })
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[KidsVideo] Enabled Kids Video Mode for job ${input.jobId}: age=${input.targetAge}, theme=${input.educationalTheme}`);

      return { success: true, message: "Kids Video Mode enabled" };
    }),

  /**
   * Validate content for Kids Video Mode safety
   */
  validateKidsContent: protectedProcedure
    .input(
      z.object({
        content: z.string(),
        strict: z.boolean().default(true)
      })
    )
    .query(async ({ input }) => {
      const validation = validateKidsVideoContent(input.content, input.strict ? "strict" : "permissive");
      const safety = checkKidsVideoSafety(input.content, input.strict);

      return {
        isValid: validation.isValid,
        violations: validation.violations,
        suggestions: validation.suggestions,
        safety,
        autoCorrection: autoCorrectKidsVideoContent(input.content)
      };
    }),

  /**
   * Get Kids Video Mode templates
   */
  getKidsTemplates: protectedProcedure.query(async () => {
    return {
      educationalThemes: KIDS_EDUCATIONAL_THEMES,
      visualStyles: KIDS_VIDEO_VISUAL_RULES,
      templates: [
        { id: "singalong_adventure", name: "Singalong Adventure", description: "Music video with dancing and adventure" },
        { id: "bedtime_story", name: "Bedtime Story", description: "Calming story before sleep" },
        { id: "learning_song", name: "Learning Song", description: "Educational content with music" },
        { id: "animal_adventure", name: "Animal Adventure", description: "Explore animals and nature" },
        { id: "magical_journey", name: "Magical Journey", description: "Fantasy adventure with magic" },
        { id: "counting_song", name: "Counting Song", description: "Learn numbers through music" },
        { id: "friendship_story", name: "Friendship Story", description: "Stories about friendship and kindness" },
        { id: "movement_and_dance", name: "Movement & Dance", description: "Physical activity and dance" }
      ]
    };
  }),

  /**
   * Generate Kids Video Mode storyboard structure
   */
  generateKidsStoryboard: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        template: z.string(),
        audioDurationSeconds: z.number()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const storyboardStructure = generateKidsStoryboardStructure(input.template, input.audioDurationSeconds);

      console.log(`[KidsVideo] Generated storyboard structure for job ${input.jobId}: ${storyboardStructure.length} scenes`);

      return { success: true, scenes: storyboardStructure };
    }),

  // ─── Lyrics & Captions ────────────────────────────────────────────────

  /**
   * Extract lyrics from job transcription
   */
  extractLyrics: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (!job.transcription) throw new TRPCError({ code: "BAD_REQUEST", message: "No transcription available" });

      const extractedLyrics = extractLyricsFromTranscription(job.transcription, job.audioDuration);

      // Save extracted lyrics to job
      await db.update(musicVideoJobs)
        .set({
          lyrics: JSON.stringify(extractedLyrics),
          lyricsStatus: "extracted",
          updatedAt: new Date()
        })
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[Lyrics] Extracted ${extractedLyrics.length} lyric lines from job ${input.jobId}`);

      return { success: true, lyrics: extractedLyrics };
    }),

  /**
   * Update lyrics for a job
   */
  updateLyrics: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        lyrics: z.array(
          z.object({
            line: z.string(),
            startTime: z.number(),
            endTime: z.number()
          })
        )
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      // Validate lyrics timing
      const validation = validateLyricsTimings(input.lyrics);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Lyrics validation failed: ${validation.errors.join(", ")}`
        });
      }

      // Save updated lyrics
      await db.update(musicVideoJobs)
        .set({
          lyrics: JSON.stringify(input.lyrics),
          lyricsStatus: "edited",
          updatedAt: new Date()
        })
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[Lyrics] Updated ${input.lyrics.length} lyric lines for job ${input.jobId}`);

      return { success: true, lyrics: input.lyrics, warnings: validation.warnings };
    }),

  /**
   * Approve lyrics before render
   */
  approveLyrics: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (!job.lyrics) throw new TRPCError({ code: "BAD_REQUEST", message: "No lyrics to approve" });

      await db.update(musicVideoJobs)
        .set({
          lyricsStatus: "approved",
          lyricsApproved: true,
          updatedAt: new Date()
        })
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[Lyrics] Approved lyrics for job ${input.jobId}`);

      return { success: true, message: "Lyrics approved" };
    }),

  /**
   * Update caption configuration
   */
  updateCaptionConfig: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        config: z.object({
          enabled: z.boolean(),
          style: z.enum(["bottom", "top", "custom"]),
          background: z.enum(["none", "soft_shadow", "solid_box"]),
          fontSize: z.number().min(12).max(72),
          fontStyle: z.enum(["sans-serif", "serif", "monospace"]),
          textColour: z.string(),
          highlightColour: z.string(),
          karaokeMode: z.boolean(),
          safeArea: z.enum(["bottom_center", "top_center", "custom"])
        })
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      // Validate caption config
      const validation = validateCaptionConfig(input.config);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Caption config validation failed: ${validation.errors.join(", ")}`
        });
      }

      // Update job with caption config
      await db.update(musicVideoJobs)
        .set({
          captionsEnabled: input.config.enabled,
          captionStyle: input.config.style,
          captionBackground: input.config.background,
          captionFontSize: input.config.fontSize,
          captionFontStyle: input.config.fontStyle,
          captionTextColour: input.config.textColour,
          captionHighlightColour: input.config.highlightColour,
          captionKaraokeMode: input.config.karaokeMode,
          captionSafeArea: input.config.safeArea,
          updatedAt: new Date()
        })
        .where(eq(musicVideoJobs.id, input.jobId));

      console.log(`[Captions] Updated caption config for job ${input.jobId}`);

      return { success: true, config: input.config };
    }),

  /**
   * Export lyrics as subtitle file
   */
  exportSubtitles: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        format: z.enum(["srt", "vtt"])
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (!job.lyrics) throw new TRPCError({ code: "BAD_REQUEST", message: "No lyrics to export" });

      const lyrics = JSON.parse(job.lyrics);
      const subtitleContent = input.format === "srt" ? generateSRTSubtitles(lyrics) : generateVTTSubtitles(lyrics);

      // Upload subtitle file to S3
      const ext = input.format === "srt" ? "srt" : "vtt";
      const subtitleKey = `subtitles/${ctx.user.id}-job-${input.jobId}.${ext}`;
      const { url: subtitleUrl } = await storagePut(subtitleKey, subtitleContent, `text/${ext}`);

      console.log(`[Captions] Exported ${input.format.toUpperCase()} subtitles for job ${input.jobId}: ${subtitleUrl}`);

      return { success: true, subtitleUrl, format: input.format };
    }),

  /**
   * Get caption CSS for rendering
   */
  getCaptionCSS: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const config = {
        enabled: job.captionsEnabled,
        style: (job.captionStyle as any) || "bottom",
        background: (job.captionBackground as any) || "soft_shadow",
        fontSize: job.captionFontSize || 24,
        fontStyle: (job.captionFontStyle as any) || "sans-serif",
        textColour: job.captionTextColour || "#FFFFFF",
        highlightColour: job.captionHighlightColour || "#FFD700",
        karaokeMode: job.captionKaraokeMode || false,
        safeArea: (job.captionSafeArea as any) || "bottom_center"
      };

      const css = generateCaptionCSS(config);

      return { success: true, css, config };
    })
});
