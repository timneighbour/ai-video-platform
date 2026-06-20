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
import { validateCharacterPhoto } from "../character-photo-validator";
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
  // Short appearance description (used to regenerate the visual brief when outfit changes)
  description: z.string().max(500).optional(),
  // Force regeneration of the AI Visual Brief even if outfit hasn't changed
  forceRegenerateBrief: z.boolean().optional().default(false),
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
        const resolvedRules = (() => {
          // Start with defaults or user-provided lockedRules
          let base: Record<string, unknown> = {};
          if (defaults?.lockedRules) {
            try { base = { ...(typeof defaults.lockedRules === 'object' ? defaults.lockedRules as unknown as Record<string, unknown> : JSON.parse(defaults.lockedRules as string)) }; } catch { /* ignore */ }
          }
          if (charInput.lockedRules) {
            // User-provided rules override defaults
            base = { ...base, ...charInput.lockedRules };
          }
          // Merge lockedPosition into rules.position so preview-core.ts can read it
          if (charInput.lockedPosition?.trim()) {
            base.position = charInput.lockedPosition.trim();
          }
          return Object.keys(base).length > 0 ? JSON.stringify(base) : null;
        })();
        // Store characterVisualDetails as structured JSON so preview-core.ts can read .outfit
        // Extract outfit from lockedOutfit.jacket (the field the frontend uses) for the structured store
        const outfitFromLocked = charInput.lockedOutfit?.jacket?.trim() || null;
        const resolvedVisualDetails = (() => {
          // Start with defaults if available
          let base: Record<string, string> = defaults?.characterVisualDetails ? { ...defaults.characterVisualDetails } : {};
          // If the frontend sent a free-text visualDetails string, try to parse it as JSON first
          if (charInput.visualDetails) {
            try {
              const parsed = JSON.parse(charInput.visualDetails);
              if (parsed && typeof parsed === "object") base = { ...base, ...parsed };
            } catch {
              // Free-text string — store as outfit field
              base.outfit = charInput.visualDetails;
            }
          }
          // If the user explicitly set a lockedOutfit, use that as the outfit (highest priority)
          if (outfitFromLocked) base.outfit = outfitFromLocked;
          // Also merge lockedProps.instrument into characterVisualDetails.instrument
          if (charInput.lockedProps?.instrument?.trim()) {
            base.instrument = charInput.lockedProps.instrument.trim();
          }
          // Merge lockedPosition into characterVisualDetails.position as well
          if (charInput.lockedPosition?.trim()) {
            base.position = charInput.lockedPosition.trim();
          }
          return Object.keys(base).length > 0 ? JSON.stringify(base) : null;
        })();
        const resolvedDefaultState = defaults?.characterDefaultState ?? null;
        const resolvedConstraints = defaults?.characterConstraints ?? null;

        if (defaults) {
          console.log(`[saveCharacters] Auto-applying canonical defaults for known band member: ${charInput.name}`);
        }

        // AI-generated characters already have an approved image from CharacterManager —
        // auto-approve them so the user doesn't need to click "Approve Look" again.
        const isAiGenerated = charInput.mode === "ai_generated" && !!charInput.aiGeneratedImageUrl;

        // ─── Auto-regenerate AI Visual Brief when outfit/appearance fields change ───
        // If the user has changed the outfit, body build, or appearance description,
        // regenerate the lockedDescription from the new fields so image generation
        // uses the correct outfit (e.g. "black dress" not the old "silver crop top").
        let finalLockedDescription = charInput.lockedDescription ?? charInput.aiGeneratedBrief ?? null;
        const hasOutfitChange = outfitFromLocked && finalLockedDescription &&
          !finalLockedDescription.toLowerCase().includes(outfitFromLocked.toLowerCase().split(/[,\s]+/)[0]);
        const hasAppearanceInput = charInput.description?.trim() || outfitFromLocked;
        if (hasAppearanceInput && (hasOutfitChange || charInput.forceRegenerateBrief)) {
          try {
            const { invokeLLM } = await import("../_core/llm");
            const bodyBuildPhrases: Record<string, string> = {
              slim: "very slim, narrow frame, lean physique, slender build",
              lean: "lean, toned physique, low body fat, athletic leanness",
              average: "average build, typical physique",
              athletic: "athletic build, fit and muscular, well-defined physique",
              stocky: "stocky build, broad frame, heavier-set physique",
              muscular: "very muscular, large frame, powerfully built physique",
            };
            const bodyBuildPhrase = bodyBuildPhrases[charInput.bodyBuild ?? "average"] ?? bodyBuildPhrases.average;
            const outfitDesc = outfitFromLocked || (charInput.lockedOutfit ? Object.values(charInput.lockedOutfit).filter(Boolean).join(", ") : null);
            const appearanceDesc = charInput.description?.trim() || finalLockedDescription || "";
            const briefResponse = await invokeLLM({
              messages: [
                {
                  role: "system" as const,
                  content: `You are a character designer writing precise visual briefs for AI video generation.
Expand the character description into a detailed 80-120 word visual brief for a FULL-BODY STANDING SHOT.
Style: Realistic (photorealistic, real human, cinematic photography style, natural skin texture).
Body build: ${bodyBuildPhrase}. The brief MUST reflect this body build accurately.
CRITICAL RULES — ALL MUST BE FOLLOWED:
- The brief MUST describe a FULL-BODY STANDING FIGURE visible from head to toe.
- MUST explicitly mention: legs, knees, calves, ankles, feet, and footwear.
- MUST describe the EXACT outfit provided — do not invent a different outfit.
- MUST include the phrase "full-length standing figure" or "full body from head to feet".
- Be hyper-specific: exact colours, clothing details, hair style, body type, age, expression.
- NEVER describe only the face, head, or upper body. ALWAYS include the complete lower body.
- Output: A single dense paragraph. No bullet points. No preamble.`,
                },
                {
                  role: "user" as const,
                  content: `Character name: ${charInput.name}${charInput.role ? `. Role: ${charInput.role}` : ""}.
Body build: ${bodyBuildPhrase}.
Appearance: ${appearanceDesc}${outfitDesc ? `\nOutfit (MUST use exactly): ${outfitDesc}` : ""}${charInput.lockedProps?.instrument ? `\nInstrument/Props: ${charInput.lockedProps.instrument}` : ""}.
Write the full visual brief now.`,
                },
              ],
            });
            const newBrief = (briefResponse.choices[0]?.message?.content as string | undefined)?.trim();
            if (newBrief && newBrief.length > 20) {
              finalLockedDescription = newBrief;
              console.log(`[saveCharacters] Regenerated visual brief for ${charInput.name} with new outfit: ${outfitDesc}`);
            }
          } catch (e) {
            console.warn(`[saveCharacters] Brief regeneration failed for ${charInput.name}, using existing brief:`, e);
          }
        }

        const [result] = await db.insert(videoCharacters).values({
          jobId: input.jobId,
          userId: ctx.user.id,
          name: charInput.name,
          role: charInput.role ?? (defaults?.lockedRole ?? null),
          enableLipSync: charInput.enableLipSync,
          slotIndex: charInput.slotIndex,
          previewImageUrl: charInput.aiGeneratedImageUrl ?? null,
          // CRITICAL: masterPortraitUrl must be set for AI-generated characters so Character Lock™ works.
          // Without this, WaveSpeed has no face reference and generates a random person instead.
          masterPortraitUrl: isAiGenerated ? (charInput.aiGeneratedImageUrl ?? null) : null,
          previewApproved: isAiGenerated ? true : false, // AI chars are pre-approved
          lockedDescription: finalLockedDescription,
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

        // ── Phase 1.4 / AI Character Identity Reference ────────────────────────
        // For AI-generated characters, download the generated portrait and store
        // it as referencePhotoBase64 so the identity gate has a reference to
        // compare against — same protection as real-photo uploads.
        if (isAiGenerated && charInput.aiGeneratedImageUrl) {
          try {
            const imgRes = await fetch(charInput.aiGeneratedImageUrl);
            if (imgRes.ok) {
              const buf = Buffer.from(await imgRes.arrayBuffer());
              const mime = charInput.aiGeneratedImageUrl.match(/\.png(\?|$)/i)
                ? "image/png"
                : charInput.aiGeneratedImageUrl.match(/\.webp(\?|$)/i)
                ? "image/webp"
                : "image/jpeg";
              const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
              await db.update(videoCharacters)
                .set({ referencePhotoBase64: dataUrl, updatedAt: new Date() })
                .where(eq(videoCharacters.id, characterId));
              console.log(`[saveCharacters] AI character ${charInput.name}: referencePhotoBase64 saved (${buf.length} bytes)`);
            }
          } catch (err) {
            console.warn(`[saveCharacters] Could not cache referencePhotoBase64 for AI character ${charInput.name}:`, err);
          }
        }

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
      /** Optional: client-side image dimensions for resolution pre-check */
      widthPx: z.number().int().optional(),
      heightPx: z.number().int().optional(),
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

      // ── Phase 1.4: Character Photo Validation Gate ─────────────────────────
      // Validate AFTER upload so we have a public URL for the LLM vision call.
      // If validation fails, reject with a clear subscriber-facing message.
      const validation = await validateCharacterPhoto(photoUrl, input.widthPx, input.heightPx);
      if (!validation.passed) {
        // Clean up the uploaded file — no point keeping a rejected photo
        try {
          const { storageDel } = await import("../storage") as any;
          if (typeof storageDel === "function") await storageDel(photoKey);
        } catch { /* storage delete is best-effort */ }
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.message,
        });
      }

      const [result] = await db.insert(videoCharacterPhotos).values({
        characterId: input.characterId,
        jobId: char.jobId,
        userId: ctx.user.id,
        photoUrl,
        photoKey,
        isPrimary: input.isPrimary || existingPhotos.length === 0,
      });

      return { id: (result as any).insertId, photoUrl, validation };
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
