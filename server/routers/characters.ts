/**
 * Video Characters tRPC Router
 * Manages up to 8 named characters per music video job,
 * each with multiple reference photos and optional lip sync.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { videoCharacters, videoCharacterPhotos, musicVideoJobs } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { storagePut } from "../storage";
import { getCharacterDefaults } from "../../shared/characterDefaults";

const photoInputSchema = z.object({
  photoBase64: z.string(),
  photoMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  isPrimary: z.boolean().optional().default(false),
});

const lockedOutfitSchema = z.object({
  jacket: z.string().optional(),
  shirt: z.string().optional(),
  trousers: z.string().optional(),
  shoes: z.string().optional(),
  accessories: z.string().optional(),
}).passthrough().optional();

const lockedPropsSchema = z.object({
  instrument: z.string().optional(),
  mic: z.string().optional(),
  other: z.string().optional(),
}).passthrough().optional();

const lockedRulesSchema = z.object({
  role: z.string(),
  mustHave: z.array(z.string()).optional(),
  allowedProps: z.array(z.string()).optional(),
  forbidden: z.array(z.string()).optional(),
}).optional();

const characterInputSchema = z.object({
  slotIndex: z.number().int().min(0).max(7),
  name: z.string().min(1).max(255).default("Character"),
  role: z.string().max(255).optional(),
  enableLipSync: z.boolean().optional().default(false),
  photos: z.array(photoInputSchema).max(10),
  // AI-generated character fields
  mode: z.enum(["photo", "ai_generated"]).optional().default("photo"),
  aiGeneratedImageUrl: z.string().url().optional(),
  aiGeneratedBrief: z.string().max(2000).optional(),
  lockedDescription: z.string().max(2000).optional(),
  isLocked: z.boolean().optional().default(false),
  // Visual details: outfit, instrument, position, props (overrides scene assumptions)
  visualDetails: z.string().max(1000).optional(),
  // ─── Unified Character Pipeline Fields ───────────────────────────────
  lockedOutfit: lockedOutfitSchema,
  lockedProps: lockedPropsSchema,
  lockedRole: z.string().max(500).optional(),
  lockedRules: lockedRulesSchema,
  lockedPosition: z.string().max(500).optional(),
  isRealPerson: z.boolean().optional().default(false),
  // MuseTalk face video
  faceVideoUrl: z.string().url().optional(),
  // Body build hint — injected into portrait prompts so AI matches the user's physique
  bodyBuild: z.enum(["slim", "lean", "average", "athletic", "stocky", "muscular"]).optional().default("average"),
});

export const charactersRouter = router({
  // Save (upsert) all characters for a job — replaces existing characters for the job
  saveCharacters: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      characters: z.array(characterInputSchema).max(8),
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
        // ─── Auto-apply canonical defaults for known band members ─────────
        // If the character matches Tim/Greg/Monica by name and no explicit
        // lockedRules were provided by the frontend, seed with canonical defaults.
        const defaults = getCharacterDefaults(charInput.name);
        const resolvedOutfit = charInput.lockedOutfit
          ? JSON.stringify(charInput.lockedOutfit)
          : defaults ? JSON.stringify(defaults.lockedOutfit) : null;
        const resolvedProps = charInput.lockedProps
          ? JSON.stringify(charInput.lockedProps)
          : defaults ? JSON.stringify(defaults.lockedProps) : null;
        const resolvedRole = charInput.lockedRole ?? charInput.role ?? (defaults?.lockedRole ?? null);
        const resolvedRules = charInput.lockedRules
          ? JSON.stringify(charInput.lockedRules)
          : defaults ? JSON.stringify(defaults.lockedRules) : null;
        const resolvedVisualDetails = charInput.visualDetails
          ? charInput.visualDetails
          : defaults ? JSON.stringify(defaults.characterVisualDetails) : null;
        const resolvedDefaultState = defaults?.characterDefaultState ?? null;
        const resolvedConstraints = defaults?.characterConstraints ?? null;

        if (defaults) {
          console.log(`[saveCharacters] Auto-applying canonical defaults for known band member: ${charInput.name}`);
        }

        const [result] = await db.insert(videoCharacters).values({
          jobId: input.jobId,
          userId: ctx.user.id,
          name: charInput.name,
          role: charInput.role ?? (defaults?.lockedRole ?? null),
          enableLipSync: charInput.enableLipSync,
          slotIndex: charInput.slotIndex,
          previewImageUrl: charInput.aiGeneratedImageUrl ?? null,
          lockedDescription: charInput.lockedDescription ?? charInput.aiGeneratedBrief ?? null,
          isLocked: charInput.isLocked ?? false,
          characterVisualDetails: resolvedVisualDetails,
          characterDefaultState: resolvedDefaultState,
          characterConstraints: resolvedConstraints,
          // ─── Unified Character Pipeline Fields ───────────────────────────
          lockedOutfit: resolvedOutfit,
          lockedProps: resolvedProps,
          lockedRole: resolvedRole,
          lockedRules: resolvedRules,
          normalisedAt: defaults ? new Date() : null,
          characterMode: charInput.mode ?? "photo",
          isRealPerson: charInput.isRealPerson ?? (charInput.photos.length > 0),
          faceVideoUrl: charInput.faceVideoUrl ?? null,
          bodyBuild: charInput.bodyBuild ?? "average",
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
      // Also fetch the character's name, role, and user-entered style text to merge into the description
      const { invokeLLM } = await import("../_core/llm");

      const charName = char.name ?? "Character";
      const charRole = char.role ?? "";
      const charStyleText = char.lockedDescription ?? ""; // user-entered style/appearance notes

      const response = await invokeLLM({
        messages: [
          {
            role: "system" as const,
            content: `You are a forensic visual analyst creating FROZEN CHARACTER IDENTITY BRIEFS for AI video generation.
These briefs are injected verbatim into every scene prompt to guarantee 100% visual consistency across all scenes.

CRITICAL RULES:
- Start with: "${charName}${charRole ? `, ${charRole}` : ""}: "
- Describe ONLY what is visually observable. Do NOT guess or infer.
- Be hyper-specific: exact hair colour (e.g. "dark chestnut brown", NOT just "brown"), exact eye colour, exact skin tone (e.g. "fair with warm undertones", "deep ebony", "medium golden brown").
- Include: gender, apparent age range, ethnicity/skin tone, hair (exact colour, length, texture, style), eyes (exact colour and shape), face shape, jawline, any distinctive features (beard, stubble, glasses, tattoos, scars, piercings), build.
- Include clothing/costume from the user's style notes if provided.
- Include the character's instrument and how they play it.
- End with: "CONSISTENCY RULE: This character's appearance MUST NOT change between scenes."
- Output: 120-150 words. Single dense paragraph. No bullet points. No headers.`,
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
                text: `Create a FROZEN CHARACTER IDENTITY BRIEF for ${charName}${charRole ? `, ${charRole}` : ""}.
${charStyleText ? `User's style notes: "${charStyleText}"\n` : ""}Analyse the photo forensically. Include: exact hair colour/texture/style, precise skin tone, eye colour and shape, face structure, jawline, beard/stubble if present, build, clothing, instrument and playing style.
This description will be copied verbatim into every AI video scene prompt — it must be specific enough to reproduce this exact person every single time.`,
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

  // Normalise a character: auto-populate lockedOutfit, lockedProps, lockedRole, lockedRules from LLM analysis
  // This runs for BOTH photo-uploaded and AI-generated characters (unified pipeline)
  normaliseCharacter: protectedProcedure
    .input(z.object({
      characterId: z.number().int(),
      // Optional overrides — if provided, skip LLM and use these directly
      lockedOutfit: lockedOutfitSchema,
      lockedProps: lockedPropsSchema,
      lockedRole: z.string().max(500).optional(),
      lockedRules: lockedRulesSchema,
      lockedPosition: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [char] = await db.select().from(videoCharacters)
        .where(and(eq(videoCharacters.id, input.characterId), eq(videoCharacters.userId, ctx.user.id)));
      if (!char) throw new TRPCError({ code: "NOT_FOUND" });

      // If overrides provided, use them directly
      if (input.lockedOutfit || input.lockedProps || input.lockedRules) {
        await db.update(videoCharacters)
          .set({
            lockedOutfit: input.lockedOutfit ? JSON.stringify(input.lockedOutfit) : char.lockedOutfit,
            lockedProps: input.lockedProps ? JSON.stringify(input.lockedProps) : char.lockedProps,
            lockedRole: input.lockedRole ?? char.lockedRole,
            lockedRules: input.lockedRules ? JSON.stringify(input.lockedRules) : char.lockedRules,
            normalisedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(videoCharacters.id, input.characterId));
        return { success: true, method: "manual" };
      }

      // Otherwise, use LLM to extract structured data from the locked description
      if (!char.lockedDescription) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Character must have a locked description before normalisation" });
      }

      const { invokeLLM } = await import("../_core/llm");
      const response = await invokeLLM({
        messages: [
          {
            role: "system" as const,
            content: `You are a character data extractor. Given a character description, extract structured outfit, props, role, position, and rules data. Return JSON only.`,
          },
          {
            role: "user" as const,
            content: `Extract structured data from this character description:

Name: ${char.name}
Role: ${char.role || "musician"}
Description: ${char.lockedDescription}
Visual Details: ${char.characterVisualDetails || "none"}

Return JSON with this exact structure:
{
  "lockedOutfit": { "jacket": "...", "shirt": "...", "trousers": "...", "shoes": "...", "accessories": "..." },
  "lockedProps": { "instrument": "...", "mic": "...", "other": "..." },
  "lockedRole": "...",
  "lockedPosition": "...",
  "lockedRules": {
    "role": "...",
    "mustHave": ["..."],
    "allowedProps": ["..."],
    "forbidden": ["..."]
  }
}

For forbidden items, include clothing that would conflict with their outfit (e.g. if they wear a leather jacket, forbid "t-shirt only without jacket").`,
          },
        ],
        response_format: {
          type: "json_schema" as const,
          json_schema: {
            name: "character_normalisation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                lockedOutfit: {
                  type: "object",
                  properties: {
                    jacket: { type: "string" },
                    shirt: { type: "string" },
                    trousers: { type: "string" },
                    shoes: { type: "string" },
                    accessories: { type: "string" },
                  },
                  required: ["jacket", "shirt", "trousers", "shoes", "accessories"],
                  additionalProperties: false,
                },
                lockedProps: {
                  type: "object",
                  properties: {
                    instrument: { type: "string" },
                    mic: { type: "string" },
                    other: { type: "string" },
                  },
                  required: ["instrument", "mic", "other"],
                  additionalProperties: false,
                },
                lockedRole: { type: "string" },
                lockedPosition: { type: "string" },
                lockedRules: {
                  type: "object",
                  properties: {
                    role: { type: "string" },
                    mustHave: { type: "array", items: { type: "string" } },
                    allowedProps: { type: "array", items: { type: "string" } },
                    forbidden: { type: "array", items: { type: "string" } },
                  },
                  required: ["role", "mustHave", "allowedProps", "forbidden"],
                  additionalProperties: false,
                },
              },
              required: ["lockedOutfit", "lockedProps", "lockedRole", "lockedPosition", "lockedRules"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? (rawContent as any[]).map((c: any) => c.text || "").join("") : null;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned empty response" });

      let parsed;
      try { parsed = JSON.parse(content); } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned invalid JSON" });
      }

      await db.update(videoCharacters)
        .set({
          lockedOutfit: JSON.stringify(parsed.lockedOutfit),
          lockedProps: JSON.stringify(parsed.lockedProps),
          lockedRole: parsed.lockedRole,
          lockedRules: JSON.stringify(parsed.lockedRules),
          normalisedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(videoCharacters.id, input.characterId));

      return { success: true, method: "llm", data: parsed };
    }),

  /**
   * listLockedCharacters — returns all locked characters for the current user.
   * Used by WizShorts (and other studios) to let the user pick a character
   * to lock into a job. Only returns characters that are isLocked=true.
   */
  listLockedCharacters: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const chars = await db
        .select({
          id: videoCharacters.id,
          name: videoCharacters.name,
          role: videoCharacters.role,
          lockedDescription: videoCharacters.lockedDescription,
          masterPortraitUrl: videoCharacters.masterPortraitUrl,
          previewImageUrl: videoCharacters.previewImageUrl,
          characterPrompt: videoCharacters.characterPrompt,
          isLocked: videoCharacters.isLocked,
          lockedAt: videoCharacters.lockedAt,
        })
        .from(videoCharacters)
        .where(and(eq(videoCharacters.userId, ctx.user.id), eq(videoCharacters.isLocked, true)))
        .orderBy(desc(videoCharacters.lockedAt));

      return chars;
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
