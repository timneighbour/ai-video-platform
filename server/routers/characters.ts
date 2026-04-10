/**
 * Video Characters tRPC Router
 * Manages up to 4 named characters per music video job,
 * each with multiple reference photos and optional lip sync.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { videoCharacters, videoCharacterPhotos, musicVideoJobs } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "../storage";

const photoInputSchema = z.object({
  photoBase64: z.string(),
  photoMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  isPrimary: z.boolean().optional().default(false),
});

const characterInputSchema = z.object({
  slotIndex: z.number().int().min(0).max(3),
  name: z.string().min(1).max(255).default("Character"),
  role: z.string().max(255).optional(),
  enableLipSync: z.boolean().optional().default(false),
  photos: z.array(photoInputSchema).max(10),
});

export const charactersRouter = router({
  // Save (upsert) all characters for a job — replaces existing characters for the job
  saveCharacters: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      characters: z.array(characterInputSchema).max(4),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify job ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      // Delete existing characters and photos for this job
      const existingChars = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.jobId, input.jobId), eq(videoCharacters.userId, ctx.user.id)));
      for (const char of existingChars) {
        await db.delete(videoCharacterPhotos).where(eq(videoCharacterPhotos.characterId, char.id));
      }
      await db.delete(videoCharacters)
        .where(and(eq(videoCharacters.jobId, input.jobId), eq(videoCharacters.userId, ctx.user.id)));

      // Insert new characters and their photos
      const savedCharacters = [];
      for (const charInput of input.characters) {
        const [result] = await db.insert(videoCharacters).values({
          jobId: input.jobId,
          userId: ctx.user.id,
          name: charInput.name,
          role: charInput.role ?? null,
          enableLipSync: charInput.enableLipSync,
          slotIndex: charInput.slotIndex,
        });
        const characterId = (result as any).insertId as number;

        // Upload and save photos
        for (let i = 0; i < charInput.photos.length; i++) {
          const photo = charInput.photos[i];
          const imgBuffer = Buffer.from(photo.photoBase64, "base64");
          const ext = photo.photoMimeType.split("/")[1];
          const photoKey = `video-characters/${ctx.user.id}-${input.jobId}-${charInput.slotIndex}-${Date.now()}-${i}.${ext}`;
          const { url: photoUrl } = await storagePut(photoKey, imgBuffer, photo.photoMimeType);

          await db.insert(videoCharacterPhotos).values({
            characterId,
            jobId: input.jobId,
            userId: ctx.user.id,
            photoUrl,
            photoKey,
            isPrimary: photo.isPrimary || i === 0, // First photo is primary by default
          });
        }

        // Find the primary photo URL to return (for auto-analysis)
        const savedPhotos = await db.select().from(videoCharacterPhotos)
          .where(eq(videoCharacterPhotos.characterId, characterId));
        const primaryPhotoUrl = savedPhotos.find(p => p.isPrimary)?.photoUrl ?? savedPhotos[0]?.photoUrl ?? null;

        savedCharacters.push({ id: characterId, slotIndex: charInput.slotIndex, name: charInput.name, primaryPhotoUrl });
      }

      return { success: true, characters: savedCharacters };
    }),

  // Get all characters (with photos) for a job
  getCharacters: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify job ownership
      const [job] = await db.select().from(musicVideoJobs)
        .where(and(eq(musicVideoJobs.id, input.jobId), eq(musicVideoJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const chars = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.jobId, input.jobId), eq(videoCharacters.userId, ctx.user.id)));

      const result = [];
      for (const char of chars) {
        const photos = await db.select().from(videoCharacterPhotos)
          .where(eq(videoCharacterPhotos.characterId, char.id));
        result.push({ ...char, photos });
      }

      result.sort((a, b) => a.slotIndex - b.slotIndex);
      return result;
    }),

  // Add a single photo to an existing character
  addPhoto: protectedProcedure
    .input(z.object({
      characterId: z.number().int(),
      photoBase64: z.string(),
      photoMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      isPrimary: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify ownership
      const [char] = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.id, input.characterId), eq(videoCharacters.userId, ctx.user.id)));
      if (!char) throw new TRPCError({ code: "NOT_FOUND" });

      // Check photo count limit
      const existingPhotos = await db.select().from(videoCharacterPhotos)
        .where(eq(videoCharacterPhotos.characterId, input.characterId));
      if (existingPhotos.length >= 10) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum 10 photos per character" });
      }

      const imgBuffer = Buffer.from(input.photoBase64, "base64");
      const ext = input.photoMimeType.split("/")[1];
      const photoKey = `video-characters/${ctx.user.id}-${char.jobId}-${char.slotIndex}-${Date.now()}.${ext}`;
      const { url: photoUrl } = await storagePut(photoKey, imgBuffer, input.photoMimeType);

      const [result] = await db.insert(videoCharacterPhotos).values({
        characterId: input.characterId,
        jobId: char.jobId,
        userId: ctx.user.id,
        photoUrl,
        photoKey,
        isPrimary: input.isPrimary || existingPhotos.length === 0,
      });

      return { id: (result as any).insertId, photoUrl };
    }),

  // Delete a single photo
  deletePhoto: protectedProcedure
    .input(z.object({ photoId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [photo] = await db.select().from(videoCharacterPhotos)
        .where(and(eq(videoCharacterPhotos.id, input.photoId), eq(videoCharacterPhotos.userId, ctx.user.id)));
      if (!photo) throw new TRPCError({ code: "NOT_FOUND" });

      await db.delete(videoCharacterPhotos).where(eq(videoCharacterPhotos.id, input.photoId));
      return { success: true };
    }),

  // Analyse an uploaded character photo using vision LLM and return a precise appearance description
  // This auto-populates the locked description so users don't need to type it manually
  analysePhoto: protectedProcedure
    .input(z.object({
      characterId: z.number().int(),
      photoUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify ownership
      const [char] = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.id, input.characterId), eq(videoCharacters.userId, ctx.user.id)));
      if (!char) throw new TRPCError({ code: "NOT_FOUND" });

      // Use vision LLM to extract precise physical appearance from the photo
      const { invokeLLM } = await import("../_core/llm");
      const response = await invokeLLM({
        messages: [
          {
            role: "system" as const,
            content: `You are a forensic visual analyst writing character appearance briefs for AI video generation.
Your ONLY job is to describe exactly what you see in the photo with maximum precision.
This description will be used word-for-word in AI video prompts to reproduce this exact person in every scene.
Rules:
- Describe ONLY what is visually observable. Do NOT guess, infer, or add context.
- Be hyper-specific: exact hair colour (not just "brown" — say "dark chestnut brown"), exact eye colour, exact skin tone (use descriptors like "warm olive", "deep ebony", "fair porcelain", "medium golden brown").
- Include: gender presentation, apparent age range (e.g. "mid-30s"), ethnicity/skin tone, hair (exact colour, length, texture, style — e.g. "shoulder-length wavy auburn hair with subtle highlights"), eyes (exact colour and shape), face shape (oval, square, round, heart, etc.), build impression (slim, athletic, stocky, etc.), and ANY distinctive features (beard stubble, glasses, tattoos, scars, piercings, prominent jawline, high cheekbones, etc.).
- Also describe visible clothing/outfit in detail as it helps the AI maintain consistency.
- Output: A single dense paragraph of 80-120 words. No bullet points. No headers. Just the paragraph.
- CRITICAL: Be so specific that someone who has never seen this person could pick them out of a crowd from your description alone.`,
          },
          {
            role: "user" as const,
            content: [
              {
                type: "image_url" as const,
                image_url: { url: input.photoUrl, detail: "high" as const },
              },
              {
                type: "text" as const,
                text: `Analyse this photo and write a precise 80-120 word character appearance brief for AI video generation. 
Be forensically specific about every visual detail — hair colour/texture/style, exact skin tone, eye colour and shape, face structure, build, clothing, and any distinctive features. 
This description must be accurate enough to reproduce this exact person consistently across multiple AI-generated video scenes.`,
              },
            ],
          },
        ],
      });

      const description = response.choices[0]?.message?.content;
      if (!description || typeof description !== "string" || description.trim().length < 20) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not analyse photo — please try again or type a description manually" });
      }

      return { description: description.trim() };
    }),

  // Lock a character's visual brief — enforces appearance consistency across all scenes
  lockCharacter: protectedProcedure
    .input(z.object({
      characterId: z.number().int(),
      lockedDescription: z.string().min(10).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [char] = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.id, input.characterId), eq(videoCharacters.userId, ctx.user.id)));
      if (!char) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(videoCharacters)
        .set({
          lockedDescription: input.lockedDescription,
          isLocked: true,
          lockedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(videoCharacters.id, input.characterId));

      return { success: true, isLocked: true };
    }),

  // Unlock a character's visual brief — allows editing again
  unlockCharacter: protectedProcedure
    .input(z.object({ characterId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [char] = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.id, input.characterId), eq(videoCharacters.userId, ctx.user.id)));
      if (!char) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(videoCharacters)
        .set({
          isLocked: false,
          lockedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(videoCharacters.id, input.characterId));

      return { success: true, isLocked: false };
    }),

  // Delete a character and all its photos
  deleteCharacter: protectedProcedure
    .input(z.object({ characterId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [char] = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.id, input.characterId), eq(videoCharacters.userId, ctx.user.id)));
      if (!char) throw new TRPCError({ code: "NOT_FOUND" });

      await db.delete(videoCharacterPhotos).where(eq(videoCharacterPhotos.characterId, input.characterId));
      await db.delete(videoCharacters).where(eq(videoCharacters.id, input.characterId));
      return { success: true };
    }),
});
