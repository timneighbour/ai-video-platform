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
import Stripe from "stripe";

const CREDIT_COSTS: Record<string, number> = {
  "5s": 50,
  "10s": 100,
  "15s": 150,
  "30s": 300,
  "60s": 600,
};

const STYLE_PROMPTS: Record<string, string> = {
  pixar3d: "Pixar 3D animation style, vibrant colours, expressive characters, high-quality 3D render, warm lighting",
  disney: "Disney animation style, magical, fluid motion, classic Disney character design, rich colours",
  anime: "Japanese anime style, expressive eyes, vibrant colours, clean line art, fun character design",
  cartoon: "Classic cartoon style, bold outlines, bright primary colours, exaggerated expressions, playful",
  storybook: "Children's storybook illustration style, watercolour, soft textures, fairy-tale aesthetic, whimsical",
  claymation: "Claymation stop-motion style, textured clay look, rounded shapes, playful and tactile",
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
        storyPrompt: z.string().min(10).max(1000),
        animationStyle: z.enum(["pixar3d", "disney", "anime", "cartoon", "storybook", "claymation"]).default("pixar3d"),
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

Return JSON: { "scenes": [{ "sceneIndex": 0, "sceneLabel": "Scene 1: ...", "description": "...", "imagePrompt": "..." }] }`,
            },
            {
              role: "user",
              content: `Story idea: "${job.storyPrompt}"
Animation style: ${job.animationStyle}${characterContext}

Create 4-6 storyboard scenes. Every imagePrompt MUST include the full character description to ensure visual consistency.`,
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
        animationStyle: z.enum(["pixar3d", "disney", "anime", "cartoon", "storybook", "claymation"]).default("pixar3d"),
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
                name: `Kids Animation Render — ${job.videoLength} ${job.animationStyle} animation`,
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
        storyPrompt: z.string().min(10).max(1000).optional(),
        animationStyle: z.enum(["pixar3d", "disney", "anime", "cartoon", "storybook", "claymation"]).optional(),
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
});
