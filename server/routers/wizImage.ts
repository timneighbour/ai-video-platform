/**
 * WizImage — AI Image Creator powered by Grok Imagine (Aurora model)
 * Procedures: generateImage, getHistory, deleteImage
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { wizImages } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { generateGrokImage, type GrokImageSize } from "../ai-apis/grok-imagine";
import { storagePut } from "../storage";
import { getUserCredits, deductCredits } from "../db";

const CREDITS_PER_IMAGE = 2; // 2 credits per image generation

const STYLE_PROMPTS: Record<string, string> = {
  photorealistic: "photorealistic, ultra-detailed, 8K resolution, professional photography",
  cinematic: "cinematic, dramatic lighting, film grain, anamorphic lens, movie still",
  anime: "anime style, vibrant colors, clean lines, Studio Ghibli aesthetic",
  "oil-painting": "oil painting, textured brushstrokes, classical art, gallery quality",
  "digital-art": "digital art, concept art, detailed illustration, trending on ArtStation",
  minimalist: "minimalist, clean design, simple composition, elegant",
  surreal: "surrealist, dreamlike, Salvador Dali inspired, impossible geometry",
  watercolor: "watercolor painting, soft washes, delicate details, artistic",
};

export const wizImageRouter = router({
  generateImage: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(3).max(5000),
        style: z.string().optional(),
        aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("1:1"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Check credits
      const creditsRecord = await getUserCredits(ctx.user.id);
      const creditBalance = creditsRecord?.balance ?? 0;
      if (creditBalance < CREDITS_PER_IMAGE) {
        throw new Error(`Insufficient credits. Need ${CREDITS_PER_IMAGE}, have ${creditBalance}.`);
      }

      // Build the enhanced prompt with style
      const styleAddition = input.style && STYLE_PROMPTS[input.style]
        ? `, ${STYLE_PROMPTS[input.style]}`
        : "";
      const enhancedPrompt = `${input.prompt}${styleAddition}`;

      // Map aspect ratio to Grok size format
      const sizeMap: Record<string, string> = {
        "1:1": "1024x1024",
        "16:9": "1792x1024",
        "9:16": "1024x1792",
        "4:3": "1365x1024",
        "3:4": "1024x1365",
      };
      const size = (sizeMap[input.aspectRatio] ?? "1024x1024") as GrokImageSize;

      // Generate image via Grok Imagine
      const results = await generateGrokImage({
        prompt: enhancedPrompt,
        size,
        n: 1,
      });

      const result = results[0];
      if (!result?.url) throw new Error("Grok Imagine returned no image URL");

      // Download and re-upload to S3 for permanent storage
      const response = await fetch(result.url);
      if (!response.ok) throw new Error(`Failed to download generated image: HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());

      const key = `wiz-images/${ctx.user.id}-${Date.now()}.png`;
      const { url: permanentUrl } = await storagePut(key, buffer, "image/png");

      // Deduct credits
      await deductCredits(ctx.user.id, CREDITS_PER_IMAGE, "WizImage generation");

      // Save to DB
      const [inserted] = await db.insert(wizImages).values({
        userId: ctx.user.id,
        prompt: input.prompt,
        style: input.style ?? null,
        aspectRatio: input.aspectRatio,
        imageUrl: permanentUrl,
        imageKey: key,
        revisedPrompt: result.revisedPrompt ?? null,
      });

      const newId = (inserted as any).insertId as number ?? 0;

      return {
        id: newId,
        imageUrl: permanentUrl,
        revisedPrompt: result.revisedPrompt ?? null,
        creditsUsed: CREDITS_PER_IMAGE,
      };
    }),

  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(24) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const images = await db
        .select()
        .from(wizImages)
        .where(eq(wizImages.userId, ctx.user.id))
        .orderBy(desc(wizImages.createdAt))
        .limit(input.limit);

      return images;
    }),

  deleteImage: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db
        .delete(wizImages)
        .where(eq(wizImages.id, input.id));

      return { success: true };
    }),
});
