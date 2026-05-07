/**
 * Kids Animation Creator tRPC Router
 * Standalone feature: story → character lock → free storyboard → paid render
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { kidsVideoJobs } from "../../drizzle/schema";
import type { KidsStoryboardFrame } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import { storagePut } from "../storage";
import { analyseContent } from "../content-analyser";
import { transcribeAudio } from "../_core/voiceTranscription";
import Stripe from "stripe";

const CREDIT_COSTS: Record<string, number> = {
  "5s": 50,
  "10s": 100,
  "15s": 150,
  "30s": 300,
  "60s": 600,
};

// Safe display labels for Stripe receipts (never expose internal enum values)
const ANIMATION_STYLE_LABELS: Record<string, string> = {
  pixar3d: "Stylised 3D",
  disney: "Magical Cinematic",
  anime: "Japanese Anime-Inspired",
  cartoon: "Classic Cartoon",
  storybook: "Storybook",
  claymation: "Clay Animation",
  ghibli: "Classic Fairytale Animation",
  pixar_movie: "Premium 3D Animation",
  manga: "Graphic Novel",
  retro80s: "Retro Cartoon",
  watercolor: "Storybook Watercolour",
};

const STYLE_PROMPTS: Record<string, string> = {
  pixar3d: "Pixar 3D animation style, vibrant colours, expressive characters, high-quality 3D render, warm lighting",
  disney: "Disney animation style, magical, fluid motion, classic Disney character design, rich colours",
  anime: "Japanese anime style, expressive eyes, vibrant colours, clean line art, fun character design",
  cartoon: "Classic cartoon style, bold outlines, bright primary colours, exaggerated expressions, playful",
  storybook: "Children's storybook illustration style, watercolour, soft textures, fairy-tale aesthetic, whimsical",
  claymation: "Claymation stop-motion style, textured clay look, rounded shapes, playful and tactile",
  ghibli: "Studio Ghibli painterly hand-drawn style, lush natural backgrounds, soft warm palette, whimsical magical realism",
  pixar_movie: "Photorealistic Pixar movie quality 3D animation, subsurface scattering, cinematic lighting, expressive characters",
  manga: "Black and white manga comic art style, bold ink lines, screen tone shading, expressive panel composition",
  retro80s: "Retro 1980s neon synthwave cartoon style, bold neon colours, geometric shapes, vintage Saturday morning cartoon",
  watercolor: "Soft watercolour illustration style, gentle washes of colour, painterly textures, dreamy fairy-tale atmosphere",
};

// Character lock schema
const characterLockSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  species: z.string().max(100).optional(), // e.g. "miniature schnauzer", "human", "cat"
  colour: z.string().max(200).optional(), // e.g. "solid black fur, no grey patches"
  features: z.string().max(300).optional(), // e.g. "bushy eyebrows, floppy ears"
  outfit: z.string().max(300).optional(), // e.g. "red cape, yellow boots"
  photoUrl: z.string().url().optional(), // uploaded reference photo URL
  lockedPrompt: z.string().max(500).optional(), // compiled lock prompt for image gen
});

export type CharacterLock = z.infer<typeof characterLockSchema>;

/**
 * Build a strict character lock prompt from character data
 * This is injected into every scene image prompt to enforce consistency
 */
function buildCharacterLockPrompt(chars: CharacterLock[]): string {
  if (!chars.length) return "";
  return chars.map((c) => {
    const parts: string[] = [`Character "${c.name}"`];
    if (c.species) parts.push(`species: ${c.species}`);
    if (c.colour) parts.push(`colour: ${c.colour}`);
    if (c.features) parts.push(`features: ${c.features}`);
    if (c.outfit) parts.push(`outfit: ${c.outfit}`);
    parts.push("MUST appear IDENTICAL in every scene — no variation");
    return parts.join(", ");
  }).join("; ");
}

export const kidsVideoRouter = router({
  /**
   * Create a new kids animation job (draft)
   */
  createJob: protectedProcedure
    .input(
      z.object({
        storyPrompt: z.string().min(10).max(5000),
        animationStyle: z.enum(["pixar3d", "disney", "anime", "cartoon", "storybook", "claymation", "ghibli", "pixar_movie", "manga", "retro80s", "watercolor"]).default("pixar3d"),
        videoLength: z.enum(["5s", "10s", "15s", "30s", "60s"]).default("15s"),
        screenFormat: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
        referenceImageUrls: z.array(z.string().url()).optional(),
        characterLockData: z.array(characterLockSchema).optional(),
        audioBase64: z.string().optional(), // base64-encoded audio file
        audioMimeType: z.enum(["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      let audioUrl: string | undefined;
      let audioKey: string | undefined;

      // Upload audio to S3 if provided
      if (input.audioBase64 && input.audioMimeType) {
        const audioBuffer = Buffer.from(input.audioBase64, "base64");
        const ext = input.audioMimeType === "audio/wav" ? "wav" : input.audioMimeType === "audio/mp4" ? "m4a" : "mp3";
        const key = `kids-audio/${ctx.user.id}-${Date.now()}.${ext}`;
        const result = await storagePut(key, audioBuffer, input.audioMimeType);
        audioUrl = result.url;
        audioKey = result.key;
      }

      const [job] = await db.insert(kidsVideoJobs).values({
        userId: ctx.user.id,
        storyPrompt: input.storyPrompt,
        animationStyle: input.animationStyle,
        videoLength: input.videoLength,
        screenFormat: input.screenFormat,
        referenceImageUrls: input.referenceImageUrls ? JSON.stringify(input.referenceImageUrls) : null,
        characterLockData: input.characterLockData ? JSON.stringify(input.characterLockData) : null,
        audioUrl: audioUrl ?? null,
        audioKey: audioKey ?? null,
        audioMimeType: input.audioMimeType ?? null,
        storyboardStatus: "pending",
        renderStatus: "not_started",
        creditsCharged: 0,
        paymentStatus: "free",
      }).$returningId();

      return { jobId: job.id };
    }),

  /**
   * Generate a free storyboard for a kids animation job
   * Uses LLM to break story into scenes, then generates preview images
   * Character lock prompts are injected into every scene image prompt
   */
  generateStoryboard: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(kidsVideoJobs)
        .where(and(eq(kidsVideoJobs.id, input.jobId), eq(kidsVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      if (job.storyboardStatus === "generating") {
        throw new TRPCError({ code: "CONFLICT", message: "Storyboard already generating" });
      }

      // Parse character lock data
      const characterLocks: CharacterLock[] = job.characterLockData
        ? (JSON.parse(job.characterLockData) as CharacterLock[])
        : [];
      const characterLockPrompt = buildCharacterLockPrompt(characterLocks);

      // Mark as generating
      await db.update(kidsVideoJobs)
        .set({ storyboardStatus: "generating" })
        .where(eq(kidsVideoJobs.id, input.jobId));

      try {
        // Step 1: Use LLM to break story into 4-6 scenes with character consistency
        const characterContext = characterLocks.length > 0
          ? `\nCharacters that MUST appear consistently:\n${characterLocks.map(c =>
              `- ${c.name}: ${[c.species, c.colour, c.features, c.outfit].filter(Boolean).join(", ")}`
            ).join("\n")}`
          : "";

        // Run content analysis to deeply understand the story before generating scenes
        let storyAnalysis: Awaited<ReturnType<typeof analyseContent>> | null = null;
        try {
          storyAnalysis = await analyseContent({
            lyrics: job.storyPrompt ?? "",
            themePrompt: job.storyPrompt ?? "",
            title: (job.storyPrompt ?? "Kids Animation").slice(0, 60),
            appType: "wizanimate",
          });
          console.log(`[KidsVideo] Story analysis: theme="${storyAnalysis.theme}", mood="${storyAnalysis.overallMood}"`);
        } catch (err: any) {
          console.warn(`[KidsVideo] Story analysis failed (non-fatal):`, err?.message);
        }

        const storyAnalysisBlock = storyAnalysis ? `

STORY UNDERSTANDING (use this to drive every scene):
- Theme: ${storyAnalysis.theme}
- Narrative: ${storyAnalysis.narrative}
- Emotional Arc: ${storyAnalysis.emotionalArc}
- Key Visual Imagery: ${storyAnalysis.keyImagery.join(", ")}
- Overall Mood: ${storyAnalysis.overallMood}
- Setting: ${storyAnalysis.settingContext}
- Colour Palette: ${storyAnalysis.dominantColours.join(", ")}

SCENE TYPE RULES:
- Opening scene: establish the world, introduce characters, build wonder
- Middle scenes: develop the story, show the emotional journey
- Climax scene: peak moment of the story, most visually dramatic
- Resolution scene: happy ending, characters at peace, warm and joyful` : "";

        const sceneBreakdown = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a children's animation director. Break a story idea into 4-6 vivid, visual scenes for an animated storyboard.
Each scene must be:
- Child-friendly and safe (no violence, no scary elements)
- Visually distinct and interesting
- Consistent with the EXACT same characters throughout — same colours, same features, same outfits
- Described in rich visual detail for image generation
- The imagePrompt must include explicit character descriptions to enforce consistency
- MANDATORY: Each scene must visually reflect the story's theme, emotional arc, and key imagery${storyAnalysisBlock}

Return JSON: { "scenes": [{ "sceneIndex": 0, "sceneLabel": "Scene 1: ...", "description": "...", "imagePrompt": "..." }] }`,
            },
            {
              role: "user",
              content: `Story idea: "${job.storyPrompt}"
Animation style: ${job.animationStyle}${characterContext}

Create 4-6 storyboard scenes. Every imagePrompt MUST include the full character description to ensure visual consistency. Every scene MUST reflect the story's emotional arc and key imagery.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "storyboard_scenes",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  scenes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sceneIndex: { type: "integer" },
                        sceneLabel: { type: "string" },
                        description: { type: "string" },
                        imagePrompt: { type: "string" },
                      },
                      required: ["sceneIndex", "sceneLabel", "description", "imagePrompt"],
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

        const content = sceneBreakdown.choices[0].message.content;
        const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        const scenes = parsed.scenes as Array<{
          sceneIndex: number;
          sceneLabel: string;
          description: string;
          imagePrompt: string;
        }>;

        const stylePrompt = STYLE_PROMPTS[job.animationStyle] || STYLE_PROMPTS.pixar3d;

        // Step 2: Generate preview images for each scene (in parallel)
        // Character lock prompt is appended to every image prompt for strict consistency
        const framePromises = scenes.map(async (scene) => {
          try {
            const lockSuffix = characterLockPrompt
              ? `, CHARACTER CONSISTENCY RULES: ${characterLockPrompt}`
              : "";
            const fullPrompt = `${stylePrompt}, children's animated scene, ${scene.imagePrompt}${lockSuffix}, kid-friendly, colourful, safe for children, no violence, no scary elements`;
            const { url } = await generateImage({ prompt: fullPrompt });
            return {
              sceneIndex: scene.sceneIndex,
              sceneLabel: scene.sceneLabel,
              imageUrl: url,
              description: scene.description,
            } as KidsStoryboardFrame;
          } catch {
            return {
              sceneIndex: scene.sceneIndex,
              sceneLabel: scene.sceneLabel,
              imageUrl: "",
              description: scene.description,
            } as KidsStoryboardFrame;
          }
        });

        const frames = await Promise.all(framePromises);

        // Step 3: Save storyboard to DB
        await db.update(kidsVideoJobs)
          .set({
            storyboardStatus: "ready",
            storyboardFrames: JSON.stringify(frames),
            storyboardGeneratedAt: new Date(),
          })
          .where(eq(kidsVideoJobs.id, input.jobId));

        return { frames, status: "ready" };
      } catch (err) {
        await db.update(kidsVideoJobs)
          .set({ storyboardStatus: "failed", errorMessage: String(err) })
          .where(eq(kidsVideoJobs.id, input.jobId));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Storyboard generation failed" });
      }
    }),

  /**
   * Regenerate a single storyboard scene
   */
  regenerateScene: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      sceneIndex: z.number().int(),
      customPrompt: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(kidsVideoJobs)
        .where(and(eq(kidsVideoJobs.id, input.jobId), eq(kidsVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      const frames: KidsStoryboardFrame[] = job.storyboardFrames
        ? (JSON.parse(job.storyboardFrames) as KidsStoryboardFrame[])
        : [];

      const frame = frames.find(f => f.sceneIndex === input.sceneIndex);
      if (!frame) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });

      const characterLocks: CharacterLock[] = job.characterLockData
        ? (JSON.parse(job.characterLockData) as CharacterLock[])
        : [];
      const characterLockPrompt = buildCharacterLockPrompt(characterLocks);
      const stylePrompt = STYLE_PROMPTS[job.animationStyle] || STYLE_PROMPTS.pixar3d;
      const scenePrompt = input.customPrompt || frame.description;
      const lockSuffix = characterLockPrompt
        ? `, CHARACTER CONSISTENCY RULES: ${characterLockPrompt}`
        : "";
      const fullPrompt = `${stylePrompt}, children's animated scene, ${scenePrompt}${lockSuffix}, kid-friendly, colourful, safe for children`;

      const { url } = await generateImage({ prompt: fullPrompt });

      // Update the frame in the array
      const updatedFrames = frames.map(f =>
        f.sceneIndex === input.sceneIndex ? { ...f, imageUrl: url, description: scenePrompt } : f
      );

      await db.update(kidsVideoJobs)
        .set({ storyboardFrames: JSON.stringify(updatedFrames) })
        .where(eq(kidsVideoJobs.id, input.jobId));

      return { imageUrl: url, sceneIndex: input.sceneIndex };
    }),

  /**
   * Generate an AI character preview image
   */
  generateCharacter: protectedProcedure
    .input(
      z.object({
        characterPrompt: z.string().min(5).max(500),
        animationStyle: z.enum(["pixar3d", "disney", "anime", "cartoon", "storybook", "claymation", "ghibli", "pixar_movie", "manga", "retro80s", "watercolor"]).default("pixar3d"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const stylePrompt = STYLE_PROMPTS[input.animationStyle] || STYLE_PROMPTS.pixar3d;
      const fullPrompt = `${stylePrompt}, character design sheet, ${input.characterPrompt}, kid-friendly animated character, full body portrait, clean white background, children's animation style, safe for children, highly detailed`;

      const { url } = await generateImage({ prompt: fullPrompt });
      return { imageUrl: url };
    }),

  /**
   * Upload a character reference photo to S3
   */
  uploadCharacterPhoto: protectedProcedure
    .input(z.object({
      photoBase64: z.string(),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      characterName: z.string().max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.photoBase64, "base64");
      const ext = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
      const key = `kids-chars/${ctx.user.id}-${Date.now()}-${input.characterName.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { photoUrl: url };
    }),

  /**
   * Get a kids animation job by ID
   */
  getJob: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(kidsVideoJobs)
        .where(and(eq(kidsVideoJobs.id, input.jobId), eq(kidsVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      return {
        ...job,
        storyboardFrames: job.storyboardFrames
          ? (JSON.parse(job.storyboardFrames) as KidsStoryboardFrame[])
          : [],
        referenceImageUrls: job.referenceImageUrls
          ? (JSON.parse(job.referenceImageUrls) as string[])
          : [],
        characterLockData: job.characterLockData
          ? (JSON.parse(job.characterLockData) as CharacterLock[])
          : [],
      };
    }),

  /**
   * List all kids animation jobs for the current user
   */
  listJobs: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const jobs = await db.select().from(kidsVideoJobs)
        .where(eq(kidsVideoJobs.userId, ctx.user.id))
        .orderBy(desc(kidsVideoJobs.createdAt))
        .limit(50);

      return jobs.map((job) => ({
        ...job,
        storyboardFrames: job.storyboardFrames
          ? (JSON.parse(job.storyboardFrames) as KidsStoryboardFrame[])
          : [],
      }));
    }),

  /**
   * Create a Stripe checkout session for the paid render
   */
  createRenderCheckout: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(kidsVideoJobs)
        .where(and(eq(kidsVideoJobs.id, input.jobId), eq(kidsVideoJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      if (job.storyboardStatus !== "ready") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Storyboard must be ready before rendering" });
      }

      const creditCost = CREDIT_COSTS[job.videoLength] ?? 150;
      const priceInPence = Math.max(50, creditCost);

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "gbp",
              product_data: {
                name: `Kids Animation Render — ${job.videoLength} ${ANIMATION_STYLE_LABELS[job.animationStyle] ?? job.animationStyle} animation`,
                description: `Animated kids video: "${job.storyPrompt.slice(0, 80)}..."`,
              },
              unit_amount: priceInPence,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        allow_promotion_codes: true,
        customer_email: ctx.user.email ?? undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          kids_video_job_id: input.jobId.toString(),
          customer_email: ctx.user.email ?? "",
          customer_name: ctx.user.name ?? "",
          job_type: "kids_video",
        },
        success_url: `${input.origin}/kids-video?jobId=${input.jobId}&payment=success`,
        cancel_url: `${input.origin}/kids-video?jobId=${input.jobId}&payment=cancelled`,
      });

      // Save session ID
      await db.update(kidsVideoJobs)
        .set({ stripeSessionId: session.id, paymentStatus: "pending" })
        .where(eq(kidsVideoJobs.id, input.jobId));

      return { checkoutUrl: session.url };
    }),

  /**
   * Update job settings (for regeneration with new settings)
   */
  updateJob: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        storyPrompt: z.string().min(10).max(5000).optional(),
        animationStyle: z.enum(["pixar3d", "disney", "anime", "cartoon", "storybook", "claymation", "ghibli", "pixar_movie", "manga", "retro80s", "watercolor"]).optional(),
        videoLength: z.enum(["5s", "10s", "15s", "30s", "60s"]).optional(),
        screenFormat: z.enum(["16:9", "9:16", "1:1"]).optional(),
        referenceImageUrls: z.array(z.string()).optional(),
        characterLockData: z.array(characterLockSchema).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { jobId, ...updates } = input;
      const updateData: Record<string, unknown> = {};

      if (updates.storyPrompt !== undefined) {
        updateData.storyPrompt = updates.storyPrompt;
        updateData.storyboardStatus = "pending";
        updateData.storyboardFrames = null;
      }
      if (updates.animationStyle !== undefined) updateData.animationStyle = updates.animationStyle;
      if (updates.videoLength !== undefined) updateData.videoLength = updates.videoLength;
      if (updates.screenFormat !== undefined) updateData.screenFormat = updates.screenFormat;
      if (updates.referenceImageUrls !== undefined) {
        updateData.referenceImageUrls = JSON.stringify(updates.referenceImageUrls);
      }
      if (updates.characterLockData !== undefined) {
        updateData.characterLockData = JSON.stringify(updates.characterLockData);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.update(kidsVideoJobs)
        .set(updateData as any)
        .where(and(eq(kidsVideoJobs.id, jobId), eq(kidsVideoJobs.userId, ctx.user.id)));

      return { success: true };
    }),

  // Add a new blank scene to a Kids Video storyboard
  addScene: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      afterSceneIndex: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(kidsVideoJobs)
        .where(and(eq(kidsVideoJobs.id, input.jobId), eq(kidsVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.renderStatus === "processing") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot add scenes while rendering" });
      }
      const frames: KidsStoryboardFrame[] = [];
      if (job.storyboardFrames) {
        try { frames.push(...JSON.parse(job.storyboardFrames)); } catch { /* ignore */ }
      }
      const insertAt = input.afterSceneIndex !== undefined
        ? input.afterSceneIndex + 1
        : frames.length;
      const newFrame: KidsStoryboardFrame = {
        sceneIndex: insertAt,
        sceneLabel: `Scene ${insertAt + 1}`,
        imageUrl: "",
        description: "Describe this scene...",
      };
      frames.splice(insertAt, 0, newFrame);
      frames.forEach((f, i) => { f.sceneIndex = i; f.sceneLabel = `Scene ${i + 1}`; });
      await db.update(kidsVideoJobs)
        .set({ storyboardFrames: JSON.stringify(frames) })
        .where(eq(kidsVideoJobs.id, input.jobId));
      return { success: true, frames, totalScenes: frames.length };
    }),

  // Delete a scene from a Kids Video storyboard
  deleteScene: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      sceneIndex: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(kidsVideoJobs)
        .where(and(eq(kidsVideoJobs.id, input.jobId), eq(kidsVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.renderStatus === "processing") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete scenes while rendering" });
      }
      const frames: KidsStoryboardFrame[] = [];
      if (job.storyboardFrames) {
        try { frames.push(...JSON.parse(job.storyboardFrames)); } catch { /* ignore */ }
      }
      if (frames.length <= 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete the only scene" });
      }
      const filtered = frames.filter(f => f.sceneIndex !== input.sceneIndex);
      filtered.forEach((f, i) => { f.sceneIndex = i; f.sceneLabel = `Scene ${i + 1}`; });
      await db.update(kidsVideoJobs)
        .set({ storyboardFrames: JSON.stringify(filtered) })
        .where(eq(kidsVideoJobs.id, input.jobId));
      return { success: true, frames: filtered, totalScenes: filtered.length };
    }),

  /**
   * Upload audio file (base64) to S3 and return a permanent CDN URL
   */
  uploadAudio: protectedProcedure
    .input(z.object({
      audioBase64: z.string(),
      audioMimeType: z.enum(["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/webm"]),
      fileName: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const audioBuffer = Buffer.from(input.audioBase64, "base64");
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Audio file exceeds 16 MB limit" });
      }
      const extMap: Record<string, string> = {
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/mp4": "m4a",
        "audio/ogg": "ogg",
        "audio/webm": "webm",
      };
      const ext = extMap[input.audioMimeType] ?? "mp3";
      const key = `kids-audio/${ctx.user.id}-${Date.now()}.${ext}`;
      const result = await storagePut(key, audioBuffer, input.audioMimeType);
      return { audioUrl: result.url, audioKey: result.key };
    }),

  /**
   * Generate a styled character preview image
   * Takes a reference photo URL + animation style + description
   * Returns an AI-generated preview of the character in that style
   */
  generateCharacterPreview: protectedProcedure
    .input(z.object({
      characterName: z.string().max(100),
      description: z.string().max(1000),
      gender: z.enum(["male", "female", "neutral"]),
      animationStyle: z.string().max(100),
      photoUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input }) => {
      const styleDescriptions: Record<string, string> = {
        "2dcartoon":   "2D cartoon animation style, flat bold outlines, vibrant saturated colours",
        "ghibli":      "Studio Ghibli hand-drawn animation style, soft watercolour backgrounds, expressive eyes",
        "pixar3d":     "Pixar 3D CGI animation style, subsurface scattering skin, cinematic lighting",
        "anime":       "Japanese anime style, large expressive eyes, clean line art, dynamic shading",
        "stopmotion":  "stop-motion clay puppet animation style, tactile textures, warm studio lighting",
        "claymation":  "claymation style, soft clay textures, warm colours, handcrafted feel",
        "motiongfx":   "motion graphics style, geometric shapes, bold typography, clean vector art",
        "whiteboard":  "whiteboard animation style, black marker line art on white background",
        "retro80s":    "retro 1980s neon animation style, synthwave colours, pixel-art influences",
        "watercolour": "watercolour illustration style, soft washes, painterly textures, dreamy atmosphere",
        "lowpoly":     "low-poly 3D art style, geometric facets, pastel colour palette",
        "comicbook":   "comic book illustration style, bold ink outlines, halftone shading, dynamic poses",
        "pixar_movie": "Pixar movie quality 3D CGI, photorealistic skin, cinematic lighting, expressive face",
        "disney":      "Disney animation style, magical, fluid motion, classic Disney character design",
        "storybook":   "children's storybook illustration, watercolour, soft textures, fairy-tale aesthetic",
        "manga":       "black and white manga comic art, bold ink lines, screen tone shading",
        "watercolor":  "soft watercolour illustration, gentle colour washes, painterly textures",
        "cartoon":     "classic cartoon style, bold outlines, bright primary colours, exaggerated expressions",
      };
      const styleDesc = styleDescriptions[input.animationStyle] ?? `${input.animationStyle} animation style`;
      const genderHint = input.gender === "male" ? "male" : input.gender === "female" ? "female" : "character";
      const refHint = input.photoUrl
        ? `Based on the reference image, render the same ${genderHint} character`
        : `Create a ${genderHint} character`;
      const prompt = `${refHint} named "${input.characterName}" in ${styleDesc}. Character description: ${input.description}. Full body character portrait, centred on a neutral background, high quality, consistent character design, no text, no watermarks. The character MUST exactly match the description — same colours, same clothing, same accessories, same markings.`;
      const originalImages = input.photoUrl
        ? [{ url: input.photoUrl, mimeType: "image/jpeg" as const }]
        : undefined;
      const { url } = await generateImage({ prompt, originalImages });
      return { previewUrl: url };
    }),

  /**
   * Preview storyboard — generates scene descriptions from brief + lyrics without creating a job.
   * Used in the storyboard preview step so users can review/edit before rendering.
   */
  previewStoryboard: protectedProcedure
    .input(z.object({
      brief: z.string().min(10).max(5000),
      lyrics: z.string().max(5000).optional(),
      animStyle: z.string().max(100).optional(),
      sceneCount: z.number().int().min(1).max(30).optional(),
      audioDuration: z.number().min(0).optional(),
      leadCharacterName: z.string().max(100).optional(),
      characters: z.array(z.object({
        name: z.string().max(100),
        description: z.string().max(500),
        isLead: z.boolean().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("../_core/llm");
      const sceneCount = input.sceneCount ?? (input.audioDuration ? Math.min(25, Math.max(4, Math.round(input.audioDuration / 8))) : 8);
      const charContext = input.characters?.length
        ? `\nCharacters:\n${input.characters.map(c => `- ${c.name}${c.isLead ? " (LEAD VOCALIST)" : ""}: ${c.description}`).join("\n")}`
        : "";
      const leadContext = input.leadCharacterName ? `\nLead vocalist/singer: ${input.leadCharacterName}` : "";
      const lyricsContext = input.lyrics ? `\nLyrics/narration:\n${input.lyrics.slice(0, 2000)}` : "";

      const systemPrompt = `You are a professional animation director and storyboard artist. 
Break the given story brief into exactly ${sceneCount} vivid, visual scenes for an animated storyboard.
Each scene must have a clear visual description (what is seen on screen), a scene label, and a short lyric/narration cue.
Maintain character consistency and narrative arc throughout all scenes.
Return ONLY valid JSON — no markdown, no explanation.`;

      const userPrompt = `Story brief: ${input.brief}${charContext}${leadContext}${lyricsContext}\n\nCreate exactly ${sceneCount} storyboard scenes.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "storyboard_preview",
            strict: true,
            schema: {
              type: "object",
              properties: {
                scenes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      sceneIndex: { type: "integer" },
                      sceneLabel: { type: "string" },
                      description: { type: "string" },
                      lyricCue: { type: "string" },
                      mood: { type: "string" },
                    },
                    required: ["sceneIndex", "sceneLabel", "description", "lyricCue", "mood"],
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

      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : null;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned no content" });
      const parsed = JSON.parse(content) as { scenes: Array<{ sceneIndex: number; sceneLabel: string; description: string; lyricCue: string; mood: string }> };
      return { scenes: parsed.scenes };
    }),

  /**
   * Save a storyboard to the database so users can reload it later.
   */
  saveStoryboard: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      brief: z.string().min(1).max(5000),
      lyrics: z.string().max(5000).optional(),
      animStyle: z.string().max(100).optional(),
      sceneCount: z.number().int().min(1).max(30),
      scenes: z.string(), // JSON string
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const { savedStoryboards } = await import("../../drizzle/schema");
      const [result] = await db.insert(savedStoryboards).values({
        userId: ctx.user.id,
        title: input.title,
        brief: input.brief,
        lyrics: input.lyrics ?? null,
        animStyle: input.animStyle ?? null,
        sceneCount: input.sceneCount,
        scenes: input.scenes,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { id: (result as { insertId: number }).insertId };
    }),

  /**
   * List all saved storyboards for the current user.
   */
  listStoryboards: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await requireDb();
      const { savedStoryboards } = await import("../../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      const rows = await db.select().from(savedStoryboards)
        .where(eq(savedStoryboards.userId, ctx.user.id))
        .orderBy(desc(savedStoryboards.createdAt))
        .limit(50);
      return rows;
    }),

  /**
   * Delete a saved storyboard.
   */
  deleteStoryboard: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const { savedStoryboards } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      await db.delete(savedStoryboards)
        .where(and(eq(savedStoryboards.id, input.id), eq(savedStoryboards.userId, ctx.user.id)));
      return { ok: true };
    }),

  /**
   * Transcribe audio from a CDN URL using Whisper
   * Returns full text (lyrics/narration) and timestamped segments
   */
  transcribeAudio: protectedProcedure
    .input(z.object({
      audioUrl: z.string().url(),
      language: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: input.language,
        prompt: "Song lyrics or narration",
      });
      if ("error" in result) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
      }
      return {
        text: result.text,
        language: result.language,
        segments: result.segments ?? [],
      };
    }),
});
