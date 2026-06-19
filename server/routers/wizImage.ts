/**
 * WizImage — AI Image Creator powered by GPT-Image-2 (OpenAI)
 * Primary: gpt-image-2 | Fallback: Grok Imagine | Final fallback: Forge
 *
 * Procedures:
 *   generateImage   — text-to-image
 *   editImage       — image editing / inpainting
 *   getHistory      — paginated gallery
 *   deleteImage     — remove from gallery + S3
 *   getSettings     — credit costs & quality tiers
 *   getDailyUsage   — rate-limit info for current user
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { wizImages, imageGenerationLogs, imageGenSettings } from "../../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { generateGptImage, editGptImage, b64ToBuffer, type GptImageQuality, type GptImageSize } from "../ai-apis/gpt-image";
import { generateGrokImage } from "../ai-apis/grok-imagine";
import { generateImage as generateForgeImage } from "../_core/imageGeneration";
import { storagePut } from "../storage";
import { getUserCredits, deductCredits } from "../db";

// ─── Credit costs per quality tier ──────────────────────────────────────────
const DEFAULT_CREDIT_COSTS = {
  low: 1,
  medium: 4,
  high: 12,
  edit_low: 5,
  edit_medium: 10,
  edit_high: 20,
};

// ─── Style presets ───────────────────────────────────────────────────────────
const STYLE_PROMPTS: Record<string, string> = {
  photorealistic: "photorealistic, ultra-detailed, 8K resolution, professional photography, natural lighting",
  cinematic: "cinematic, dramatic lighting, film grain, anamorphic lens, movie still, shallow depth of field",
  anime: "anime style, vibrant colors, clean lines, Studio Ghibli aesthetic, expressive characters",
  "oil-painting": "oil painting, textured brushstrokes, classical art, gallery quality, rich colors",
  "digital-art": "digital art, concept art, highly detailed illustration, trending on ArtStation",
  minimalist: "minimalist, clean design, simple composition, elegant, white space",
  surreal: "surrealist, dreamlike, Salvador Dali inspired, impossible geometry, vivid colors",
  watercolor: "watercolor painting, soft washes, delicate details, artistic, translucent layers",
  "3d-render": "3D render, octane render, physically based rendering, studio lighting, hyperrealistic",
  "vintage-photo": "vintage photograph, film grain, faded colors, 1970s aesthetic, nostalgic",
  "neon-noir": "neon noir, cyberpunk aesthetic, rain-slicked streets, neon lights, dark atmosphere",
  "fantasy-art": "fantasy art, epic scene, magical atmosphere, detailed environment, concept art",
};

// ─── Size map ────────────────────────────────────────────────────────────────
const ASPECT_TO_SIZE: Record<string, GptImageSize> = {
  "1:1": "1024x1024",
  "16:9": "1536x1024",
  "9:16": "1024x1536",
  "4:3": "1536x1024",   // closest available
  "3:4": "1024x1536",   // closest available
};

// ─── Helper: get credit cost ─────────────────────────────────────────────────
async function getCreditCost(
  mode: "generate" | "edit",
  quality: GptImageQuality,
  db: Awaited<ReturnType<typeof getDb>>
): Promise<number> {
  try {
    if (db) {
      const [settings] = await db.select().from(imageGenSettings).where(eq(imageGenSettings.id, 1)).limit(1);
      if (settings?.creditCosts) {
        const costs = JSON.parse(settings.creditCosts);
        const key = mode === "edit" ? `edit_${quality}` : quality;
        if (typeof costs[key] === "number") return costs[key];
      }
    }
  } catch {}
  const key = mode === "edit" ? `edit_${quality}` as keyof typeof DEFAULT_CREDIT_COSTS : quality as keyof typeof DEFAULT_CREDIT_COSTS;
  return DEFAULT_CREDIT_COSTS[key] ?? 4;
}

// ─── Helper: generate with provider cascade ──────────────────────────────────
async function generateWithFallback(
  prompt: string,
  quality: GptImageQuality,
  size: GptImageSize
): Promise<{ b64Json: string; provider: string; revisedPrompt?: string }> {
  // 1. Try GPT-Image-2
  try {
    const results = await generateGptImage({ prompt, quality, size, n: 1 });
    if (results[0]?.b64Json) {
      return { b64Json: results[0].b64Json, provider: "openai", revisedPrompt: results[0].revisedPrompt };
    }
  } catch (e: any) {
    console.warn("[WizImage] GPT-Image-2 failed, trying Grok:", e?.message ?? e);
  }

  // 2. Try Grok Imagine
  try {
    const grokSize = size === "1024x1024" ? "1024x1024" : size === "1024x1536" ? "1024x1792" : "1792x1024";
    const results = await generateGrokImage({ prompt, size: grokSize as any, n: 1 });
    const grokUrl = results[0]?.url;
    if (grokUrl) {
      const resp = await fetch(grokUrl);
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        return { b64Json: buf.toString("base64"), provider: "grok" };
      }
    }
  } catch (e: any) {
    console.warn("[WizImage] Grok fallback failed, trying Forge:", e?.message ?? e);
  }

  // 3. Try built-in Forge
  const { url: forgeUrl } = await generateForgeImage({ prompt });
  const resp = await fetch(forgeUrl);
  if (!resp.ok) throw new Error("All image providers failed");
  const buf = Buffer.from(await resp.arrayBuffer());
  return { b64Json: buf.toString("base64"), provider: "forge" };
}

// ─── Router ──────────────────────────────────────────────────────────────────
export const wizImageRouter = router({

  // ── Generate image ─────────────────────────────────────────────────────────
  generateImage: protectedProcedure
    .input(z.object({
      prompt: z.string().min(3).max(4000),
      style: z.string().optional(),
      aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("1:1"),
      quality: z.enum(["low", "medium", "high"]).default("medium"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const quality = input.quality as GptImageQuality;
      const size = ASPECT_TO_SIZE[input.aspectRatio] ?? "1024x1024";
      const creditCost = await getCreditCost("generate", quality, db);

      // Check credits
      const creditsRecord = await getUserCredits(ctx.user.id);
      const balance = creditsRecord?.balance ?? 0;
      if (balance < creditCost) {
        throw new Error(`Insufficient credits. Need ${creditCost}, have ${balance}.`);
      }

      // Build enhanced prompt
      const styleAddition = input.style && STYLE_PROMPTS[input.style]
        ? `, ${STYLE_PROMPTS[input.style]}` : "";
      const enhancedPrompt = `${input.prompt}${styleAddition}`;

      // Create log entry
      const [logInsert] = await db.insert(imageGenerationLogs).values({
        userId: ctx.user.id,
        provider: "openai",
        model: "gpt-image-2",
        mode: "generate",
        prompt: input.prompt,
        promptLength: input.prompt.length,
        stylePreset: input.style ?? null,
        size,
        quality,
        creditsCharged: creditCost,
        status: "pending",
      });
      const logId = (logInsert as any).insertId as number;

      const startMs = Date.now();
      let provider = "openai";
      let revisedPrompt: string | undefined;

      try {
        // Generate
        const result = await generateWithFallback(enhancedPrompt, quality, size);
        provider = result.provider;
        revisedPrompt = result.revisedPrompt;

        // Upload to S3
        const imgBuffer = b64ToBuffer(result.b64Json);
        const key = `wiz-images/${ctx.user.id}-${Date.now()}.png`;
        const { url: permanentUrl } = await storagePut(key, imgBuffer, "image/png");

        // Deduct credits
        await deductCredits(ctx.user.id, creditCost, `WizImage ${quality} generation`);

        // Save to wizImages gallery
        const [inserted] = await db.insert(wizImages).values({
          userId: ctx.user.id,
          prompt: input.prompt,
          style: input.style ?? null,
          aspectRatio: input.aspectRatio,
          imageUrl: permanentUrl,
          imageKey: key,
          revisedPrompt: revisedPrompt ?? null,
          provider,
          model: "gpt-image-2",
          mode: "generate",
          quality,
          size,
          creditsUsed: creditCost,
          status: "completed",
          logId,
        });
        const newId = (inserted as any).insertId as number ?? 0;

        // Update log
        await db.update(imageGenerationLogs).set({
          status: "completed",
          provider,
          imageUrl: permanentUrl,
          storagePath: key,
          durationMs: Date.now() - startMs,
          completedAt: new Date(),
        }).where(eq(imageGenerationLogs.id, logId));

        return {
          id: newId,
          imageUrl: permanentUrl,
          revisedPrompt: revisedPrompt ?? null,
          creditsUsed: creditCost,
          provider,
          quality,
          size,
        };
      } catch (err: any) {
        // Refund credits on failure
        await db.update(imageGenerationLogs).set({
          status: "failed",
          errorMessage: err?.message ?? "Unknown error",
          durationMs: Date.now() - startMs,
          completedAt: new Date(),
          creditsRefunded: creditCost,
        }).where(eq(imageGenerationLogs.id, logId));
        throw new Error(`Image generation failed: ${err?.message ?? "Unknown error"}`);
      }
    }),

  // ── Edit image ─────────────────────────────────────────────────────────────
  editImage: protectedProcedure
    .input(z.object({
      prompt: z.string().min(3).max(4000),
      /** S3 URL of the source image to edit */
      sourceImageUrl: z.string().url(),
      aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("1:1"),
      quality: z.enum(["low", "medium", "high"]).default("medium"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const quality = input.quality as GptImageQuality;
      const size = ASPECT_TO_SIZE[input.aspectRatio] ?? "1024x1024";
      const creditCost = await getCreditCost("edit", quality, db);

      // Check credits
      const creditsRecord = await getUserCredits(ctx.user.id);
      const balance = creditsRecord?.balance ?? 0;
      if (balance < creditCost) {
        throw new Error(`Insufficient credits. Need ${creditCost}, have ${balance}.`);
      }

      // Download source image
      const sourceResp = await fetch(input.sourceImageUrl);
      if (!sourceResp.ok) throw new Error("Failed to download source image");
      const sourceBuffer = Buffer.from(await sourceResp.arrayBuffer());

      // Create log entry
      const [logInsert] = await db.insert(imageGenerationLogs).values({
        userId: ctx.user.id,
        provider: "openai",
        model: "gpt-image-2",
        mode: "edit",
        prompt: input.prompt,
        promptLength: input.prompt.length,
        size,
        quality,
        creditsCharged: creditCost,
        status: "pending",
      });
      const logId = (logInsert as any).insertId as number;

      const startMs = Date.now();

      try {
        // Edit via GPT-Image-2
        const results = await editGptImage({
          prompt: input.prompt,
          imageBuffer: sourceBuffer,
          quality,
          size,
          n: 1,
        });

        if (!results[0]?.b64Json) throw new Error("GPT-Image-2 edit returned no image");

        const imgBuffer = b64ToBuffer(results[0].b64Json);
        const key = `wiz-images/${ctx.user.id}-edit-${Date.now()}.png`;
        const { url: permanentUrl } = await storagePut(key, imgBuffer, "image/png");

        await deductCredits(ctx.user.id, creditCost, `WizImage ${quality} edit`);

        const [inserted] = await db.insert(wizImages).values({
          userId: ctx.user.id,
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
          imageUrl: permanentUrl,
          imageKey: key,
          revisedPrompt: results[0].revisedPrompt ?? null,
          provider: "openai",
          model: "gpt-image-2",
          mode: "edit",
          quality,
          size,
          creditsUsed: creditCost,
          status: "completed",
          logId,
        });
        const newId = (inserted as any).insertId as number ?? 0;

        await db.update(imageGenerationLogs).set({
          status: "completed",
          imageUrl: permanentUrl,
          storagePath: key,
          durationMs: Date.now() - startMs,
          completedAt: new Date(),
        }).where(eq(imageGenerationLogs.id, logId));

        return {
          id: newId,
          imageUrl: permanentUrl,
          revisedPrompt: results[0].revisedPrompt ?? null,
          creditsUsed: creditCost,
          quality,
          size,
        };
      } catch (err: any) {
        await db.update(imageGenerationLogs).set({
          status: "failed",
          errorMessage: err?.message ?? "Unknown error",
          durationMs: Date.now() - startMs,
          completedAt: new Date(),
          creditsRefunded: creditCost,
        }).where(eq(imageGenerationLogs.id, logId));
        throw new Error(`Image edit failed: ${err?.message ?? "Unknown error"}`);
      }
    }),

  // ── Gallery ────────────────────────────────────────────────────────────────
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(24),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { images: [], total: 0 };

      const images = await db
        .select()
        .from(wizImages)
        .where(eq(wizImages.userId, ctx.user.id))
        .orderBy(desc(wizImages.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(wizImages)
        .where(eq(wizImages.userId, ctx.user.id));

      return { images, total: Number(count) };
    }),

  // ── Delete ─────────────────────────────────────────────────────────────────
  deleteImage: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db
        .delete(wizImages)
        .where(and(eq(wizImages.id, input.id), eq(wizImages.userId, ctx.user.id)));

      return { success: true };
    }),

  // ── Settings (credit costs, quality tiers) ─────────────────────────────────
  getSettings: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { creditCosts: DEFAULT_CREDIT_COSTS, styles: Object.keys(STYLE_PROMPTS) };

    try {
      const [settings] = await db.select().from(imageGenSettings).where(eq(imageGenSettings.id, 1)).limit(1);
      const creditCosts = settings?.creditCosts ? JSON.parse(settings.creditCosts) : DEFAULT_CREDIT_COSTS;
      return { creditCosts, styles: Object.keys(STYLE_PROMPTS), enabled: settings?.enabled ?? true };
    } catch {
      return { creditCosts: DEFAULT_CREDIT_COSTS, styles: Object.keys(STYLE_PROMPTS), enabled: true };
    }
  }),

  // ── Daily usage ────────────────────────────────────────────────────────────
  getDailyUsage: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { count: 0, limit: 999 };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(imageGenerationLogs)
      .where(and(
        eq(imageGenerationLogs.userId, ctx.user.id),
        gte(imageGenerationLogs.createdAt, todayStart),
        eq(imageGenerationLogs.status, "completed")
      ));

    return { count: Number(count), limit: 999 };
  }),
});
