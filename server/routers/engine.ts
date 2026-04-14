/**
 * WizVid Core Engine Router
 * ─────────────────────────
 * 1. Render job status polling
 * 2. Character lock enforcement
 * 3. Scene prompt constraint engine
 * 4. AI Prompt Enhance
 * 5. Auto-save + resume
 * 6. Debug logging
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  upsertAutoSave,
  getAutoSave,
  deleteAutoSave,
  writeDebugLog,
  getRecentDebugLogs,
  getRenderJob,
  updateRenderJob,
} from "../db";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. RENDER STATUS POLLING
// ═══════════════════════════════════════════════════════════════════════════════

const renderStatusProcedures = {
  /**
   * Poll a render job's current status.
   * Frontend calls this every 3-5 seconds after initiating a render.
   */
  pollRenderStatus: protectedProcedure
    .input(z.object({ renderJobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const job = await getRenderJob(input.renderJobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Render job not found" });
      if (job.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return {
        id: job.id,
        renderStatus: job.renderStatus,
        quality: job.quality,
        audioTier: job.audioTier,
        downloadUrl: job.downloadUrl,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      };
    }),

  /**
   * Admin: manually update render job status (for testing / manual intervention).
   */
  updateRenderStatus: protectedProcedure
    .input(
      z.object({
        renderJobId: z.number().int(),
        status: z.enum(["queued", "processing", "completed", "failed"]),
        downloadUrl: z.string().url().optional(),
        errorMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await updateRenderJob(input.renderJobId, {
        renderStatus: input.status,
        downloadUrl: input.downloadUrl ?? null,
        errorMessage: input.errorMessage ?? null,
      } as any);
      // Log the manual status change
      await writeDebugLog({
        userId: ctx.user.id,
        category: "general",
        severity: "info",
        jobId: input.renderJobId,
        message: `Admin manually set render status to ${input.status}`,
        contextJson: JSON.stringify(input),
      });
      return { success: true };
    }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CHARACTER LOCK SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a character constraint block that gets injected into every scene prompt.
 * This ensures face, outfit, style, and seed remain locked across all scenes.
 */
function buildCharacterConstraintBlock(character: {
  name: string;
  lockedDescription?: string | null;
  characterPrompt?: string | null;
  lockedOutfit?: string | null;
  lockedProps?: string | null;
  lockedRules?: string | null;
  characterDefaultState?: string | null;
  characterConstraints?: string | null;
}): string {
  const lines: string[] = [];
  lines.push(`[CHARACTER LOCK: ${character.name}]`);

  if (character.characterPrompt) {
    lines.push(`IDENTITY: ${character.characterPrompt}`);
  }
  if (character.lockedDescription) {
    lines.push(`APPEARANCE: ${character.lockedDescription}`);
  }

  // Parse JSON fields safely
  const parseJson = (s: string | null | undefined) => {
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
  };

  const outfit = parseJson(character.lockedOutfit);
  if (outfit) {
    const parts = Object.entries(outfit).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
    if (parts.length) lines.push(`OUTFIT (LOCKED — DO NOT CHANGE): ${parts.join(", ")}`);
  }

  const props = parseJson(character.lockedProps);
  if (props) {
    const parts = Object.entries(props).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
    if (parts.length) lines.push(`PROPS (LOCKED): ${parts.join(", ")}`);
  }

  const rules = parseJson(character.lockedRules);
  if (rules && Array.isArray(rules)) {
    lines.push(`RULES: ${rules.join(" | ")}`);
  }

  if (character.characterDefaultState) {
    lines.push(`DEFAULT STATE: ${character.characterDefaultState}`);
  }
  if (character.characterConstraints) {
    lines.push(`HARD CONSTRAINTS: ${character.characterConstraints}`);
  }

  lines.push("[END CHARACTER LOCK]");
  return lines.join("\n");
}

const characterLockProcedures = {
  /**
   * Get the full character constraint block for a job's characters.
   * Used by scene generation to inject locked character descriptions.
   */
  getCharacterConstraints: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { videoCharacters } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return { characters: [], constraintBlock: "" };

      const chars = await db
        .select()
        .from(videoCharacters)
        .where(eq(videoCharacters.jobId, input.jobId));

      const blocks = chars
        .filter((c) => c.isLocked)
        .map((c) => buildCharacterConstraintBlock(c));

      return {
        characters: chars.map((c) => ({
          id: c.id,
          name: c.name,
          isLocked: c.isLocked,
          lockedSeed: c.lockedSeed,
          masterSeed: c.masterSeed,
          characterPrompt: c.characterPrompt,
          lockedDescription: c.lockedDescription,
          masterPortraitUrl: c.masterPortraitUrl,
          rolePriority: c.rolePriority,
        })),
        constraintBlock: blocks.join("\n\n"),
      };
    }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. SCENE PROMPT CONSTRAINT ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Enforce subject/environment/style consistency across scenes.
 * Takes the user's original prompt + locked constraints and produces
 * a constrained prompt that prevents drift.
 */
function buildConstrainedScenePrompt(params: {
  sceneDescription: string;
  characterConstraintBlock: string;
  lockedStyle?: { descriptor?: string; lighting?: string; colourPalette?: string; cameraAngle?: string; mood?: string; rawPromptSuffix?: string } | null;
  globalSubject?: string; // e.g. "black miniature schnauzer"
  globalEnvironment?: string; // e.g. "neon city background"
}): string {
  const parts: string[] = [];

  // 1. Style lock
  if (params.lockedStyle) {
    const s = params.lockedStyle;
    const styleParts = [
      s.descriptor && `Style: ${s.descriptor}`,
      s.lighting && `Lighting: ${s.lighting}`,
      s.colourPalette && `Palette: ${s.colourPalette}`,
      s.cameraAngle && `Camera: ${s.cameraAngle}`,
      s.mood && `Mood: ${s.mood}`,
    ].filter(Boolean);
    if (styleParts.length) {
      parts.push(`[STYLE LOCK — DO NOT DEVIATE]\n${styleParts.join("\n")}\n[END STYLE LOCK]`);
    }
  }

  // 2. Character constraints
  if (params.characterConstraintBlock) {
    parts.push(params.characterConstraintBlock);
  }

  // 3. Global subject enforcement
  if (params.globalSubject) {
    parts.push(`[SUBJECT LOCK] The main subject is ALWAYS: ${params.globalSubject}. Do NOT change breed, colour, species, or any identifying feature. [END SUBJECT LOCK]`);
  }

  // 4. Global environment
  if (params.globalEnvironment) {
    parts.push(`[ENVIRONMENT LOCK] Setting: ${params.globalEnvironment}. Maintain this environment across all scenes unless explicitly overridden. [END ENVIRONMENT LOCK]`);
  }

  // 5. Scene description (user's actual content)
  parts.push(params.sceneDescription);

  // 6. Style suffix
  if (params.lockedStyle?.rawPromptSuffix) {
    parts.push(params.lockedStyle.rawPromptSuffix);
  }

  return parts.join("\n\n");
}

const promptConstraintProcedures = {
  /**
   * Build a constrained prompt for a scene, enforcing all locks.
   */
  buildConstrainedPrompt: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        sceneDescription: z.string(),
        globalSubject: z.string().optional(),
        globalEnvironment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { videoCharacters, musicVideoJobs } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Get locked characters
      const chars = await db.select().from(videoCharacters).where(eq(videoCharacters.jobId, input.jobId));
      const constraintBlock = chars
        .filter((c) => c.isLocked)
        .map((c) => buildCharacterConstraintBlock(c))
        .join("\n\n");

      // Get locked style from job
      const jobs = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, input.jobId)).limit(1);
      let lockedStyle = null;
      if (jobs[0]?.lockedStyle) {
        try { lockedStyle = JSON.parse(jobs[0].lockedStyle); } catch { /* ignore */ }
      }

      const constrainedPrompt = buildConstrainedScenePrompt({
        sceneDescription: input.sceneDescription,
        characterConstraintBlock: constraintBlock,
        lockedStyle,
        globalSubject: input.globalSubject,
        globalEnvironment: input.globalEnvironment,
      });

      // Log the prompt for debugging
      await writeDebugLog({
        userId: ctx.user.id,
        category: "general",
        severity: "info",
        jobId: input.jobId,
        jobType: "music_video",
        message: "Built constrained scene prompt",
        contextJson: JSON.stringify({
          original: input.sceneDescription,
          constrained: constrainedPrompt,
          characterCount: chars.filter((c) => c.isLocked).length,
          hasStyleLock: !!lockedStyle,
        }),
      });

      return { constrainedPrompt };
    }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. AI PROMPT ENHANCE
// ═══════════════════════════════════════════════════════════════════════════════

const promptEnhanceProcedures = {
  /**
   * "Enhance Prompt" — takes a vague user prompt and expands it into a detailed,
   * constrained prompt via LLM. Ensures better outputs, less randomness, higher quality.
   */
  enhancePrompt: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(3).max(2000),
        toolType: z.enum(["text_to_video", "music_video", "kids_video"]),
        style: z.string().optional(),
        characterNames: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { invokeLLM } = await import("../_core/llm");

      const systemPrompt = `You are WizVid's prompt enhancement engine. Your job is to take a short, vague video prompt and expand it into a detailed, cinematic scene description that will produce consistent, high-quality AI video output.

RULES:
1. PRESERVE the user's original intent — do not change the subject, setting, or mood
2. ADD specific visual details: lighting, camera angle, colour palette, textures, atmosphere
3. ADD character consistency cues: describe clothing, hair, features in detail
4. ADD cinematic quality markers: "cinematic lighting", "shallow depth of field", "professional grade"
5. KEEP the enhanced prompt under 300 words
6. If character names are provided, describe each character consistently
7. Match the style if provided (e.g. Pixar 3D, anime, cinematic)
8. Use present tense, active voice
9. Do NOT add text overlays, watermarks, or UI elements to the description
10. Return ONLY the enhanced prompt text, nothing else`;

      const userMessage = `Original prompt: "${input.prompt}"
Tool: ${input.toolType}
${input.style ? `Style: ${input.style}` : ""}
${input.characterNames?.length ? `Characters: ${input.characterNames.join(", ")}` : ""}

Enhance this prompt for AI video generation:`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content;
        const enhanced = (typeof rawContent === "string" ? rawContent.trim() : input.prompt) || input.prompt;

        // Log the enhancement for debugging
        await writeDebugLog({
          userId: ctx.user.id,
          category: "general",
          severity: "info",
          message: "Prompt enhanced via LLM",
          jobType: input.toolType,
          contextJson: JSON.stringify({
            original: input.prompt,
            enhanced,
            style: input.style,
            characters: input.characterNames,
          }),
        });

        return { original: input.prompt, enhanced };
      } catch (err) {
        console.error("[PromptEnhance] LLM call failed:", err);
        await writeDebugLog({
          userId: ctx.user.id,
          category: "api_error",
          severity: "error",
          message: "Prompt enhance LLM call failed",
          jobType: input.toolType,
          contextJson: JSON.stringify({ error: String(err), prompt: input.prompt }),
        });
        // Graceful fallback — return original prompt
        return { original: input.prompt, enhanced: input.prompt };
      }
    }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. AUTO-SAVE + RESUME
// ═══════════════════════════════════════════════════════════════════════════════

const autoSaveProcedures = {
  /** Save the current working state (called every 5 seconds by frontend). */
  saveAutoSave: protectedProcedure
    .input(
      z.object({
        toolType: z.enum(["text_to_video", "music_video", "kids_video", "wizpilot"]),
        stateJson: z.string().max(500000), // ~500KB max
        title: z.string().max(255).optional(),
        sourceJobId: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await upsertAutoSave(
        ctx.user.id,
        input.toolType,
        input.stateJson,
        input.title,
        input.sourceJobId
      );
      return { success: true };
    }),

  /** Get the latest auto-save for a tool (called on page load). */
  getAutoSave: protectedProcedure
    .input(z.object({ toolType: z.enum(["text_to_video", "music_video", "kids_video", "wizpilot"]) }))
    .query(async ({ ctx, input }) => {
      const save = await getAutoSave(ctx.user.id, input.toolType);
      if (!save) return null;
      return {
        id: save.id,
        toolType: save.toolType,
        stateJson: save.stateJson,
        title: save.title,
        sourceJobId: save.sourceJobId,
        updatedAt: save.updatedAt,
      };
    }),

  /** Delete an auto-save (e.g. after successful render or user dismisses). */
  clearAutoSave: protectedProcedure
    .input(z.object({ toolType: z.enum(["text_to_video", "music_video", "kids_video", "wizpilot"]) }))
    .mutation(async ({ ctx, input }) => {
      await deleteAutoSave(ctx.user.id, input.toolType);
      return { success: true };
    }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. DEBUG LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

const debugLogProcedures = {
  /** Write a debug log entry (called by other server procedures or frontend). */
  logEvent: protectedProcedure
    .input(
      z.object({
        category: z.enum([
          "render_failure",
          "character_drift",
          "prompt_mismatch",
          "api_error",
          "face_validation_fail",
          "auto_save_error",
          "general",
        ]),
        severity: z.enum(["info", "warning", "error", "critical"]),
        message: z.string().max(2000),
        jobId: z.number().int().optional(),
        sceneId: z.number().int().optional(),
        jobType: z.string().max(64).optional(),
        contextJson: z.string().max(100000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await writeDebugLog({
        userId: ctx.user.id,
        category: input.category,
        severity: input.severity,
        message: input.message,
        jobId: input.jobId,
        sceneId: input.sceneId,
        jobType: input.jobType,
        contextJson: input.contextJson,
      });
      return { success: true };
    }),

  /** Admin: get recent debug logs. */
  getDebugLogs: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).default(100) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getRecentDebugLogs(input.limit);
    }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

export const engineRouter = router({
  ...renderStatusProcedures,
  ...characterLockProcedures,
  ...promptConstraintProcedures,
  ...promptEnhanceProcedures,
  ...autoSaveProcedures,
  ...debugLogProcedures,
});
