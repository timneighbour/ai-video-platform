/**
 * Batch Regeneration + Master Portrait Router
 *
 * Extracted from musicVideo.ts to keep the main router within the TypeScript
 * LSP type-inference limit. Mounted at trpc.musicVideo.* via router merge.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  videoCharacters,
  videoCharacterPhotos,
  musicVideoJobs,
} from "../../drizzle/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { fal } from "@fal-ai/client";
if (process.env.FAL_AI_API_KEY) {
  fal.config({ credentials: process.env.FAL_AI_API_KEY });
}
import { generateFaceConsistentImage } from "../_core/fluxPuLID";

// ─── Batch Regeneration State Machine ────────────────────────────────────────
type BatchItemStatus = "pending" | "processing" | "done" | "failed" | "cancelled";
interface BatchItem {
  characterId: number;
  characterName: string;
  characterRole?: string;
  jobId: number;
  jobTitle: string;
  currentPreviewUrl?: string;
  newPreviewUrl?: string;
  status: BatchItemStatus;
  error?: string;
}
interface BatchState {
  batchId: string;
  userId: number;
  status: "running" | "completed" | "cancelled";
  items: BatchItem[];
  startedAt: Date;
  completedAt?: Date;
}
/** In-memory store: one active batch per user at a time. */
const batchJobs = new Map<number, BatchState>();

/**
 * Runs all pending items in the batch sequentially.
 * Mutates the BatchState in-place so polling can observe progress.
 */
async function runBatchRegeneration(
  state: BatchState,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    state.status = "completed";
    return;
  }
  for (const item of state.items) {
    if (state.status === "cancelled") break;
    if (item.status !== "pending") continue;
    item.status = "processing";
    console.log(
      `[batchRegen] Processing character ${item.characterId} (${item.characterName}) for user ${userId}`
    );
    try {
      const [char] = await db
        .select()
        .from(videoCharacters)
        .where(
          and(
            eq(videoCharacters.id, item.characterId),
            eq(videoCharacters.userId, userId)
          )
        );
      if (!char) throw new Error("Character not found");
      const photos = await db
        .select()
        .from(videoCharacterPhotos)
        .where(eq(videoCharacterPhotos.characterId, item.characterId))
        .orderBy(desc(videoCharacterPhotos.isPrimary));
      if (photos.length === 0) throw new Error("No photos found for character");
      const primaryPhoto = photos.find((p) => p.isPrimary) ?? photos[0];
      const photoResponse = await fetch(primaryPhoto.photoUrl);
      if (!photoResponse.ok)
        throw new Error(`Photo fetch failed: ${photoResponse.status}`);
      const photoBuffer = Buffer.from(await photoResponse.arrayBuffer());
      const mimeType = primaryPhoto.photoUrl.match(/\.png(\?|$)/i)
        ? "image/png"
        : primaryPhoto.photoUrl.match(/\.webp(\?|$)/i)
        ? "image/webp"
        : "image/jpeg";
      const base64DataUrl = `data:${mimeType};base64,${photoBuffer.toString("base64")}`;
      const description = char.lockedDescription?.trim() ?? "";
      const characterLabel = `${char.name}${char.role ? `, ${char.role}` : ""}`;
      const previewPrompt =
        description.length > 20
          ? `Close-up portrait photo of ${characterLabel}, head and shoulders, face clearly visible, looking directly at camera. ${description}. Neutral expression, soft studio lighting, photorealistic, high detail, 8K.`
          : `Close-up portrait photo of ${characterLabel}, head and shoulders, face clearly visible, looking directly at camera, neutral expression, soft studio lighting, photorealistic, high detail, 8K.`;
      // V2 settings: max identity weight, lower CFG
      let newImageUrl: string;
      try {
        if (process.env.FAL_AI_API_KEY)
          fal.config({ credentials: process.env.FAL_AI_API_KEY });
        const instantIdResult = (await fal.subscribe("fal-ai/instantid", {
          input: {
            face_image_url: base64DataUrl,
            prompt: previewPrompt,
            style: "Headshot",
            negative_prompt:
              "different face, new person, altered identity, nsfw, lowres, bad anatomy, extra limbs, blurry, low quality, cartoon, anime, illustration, full body, wide shot, deformed, ugly, disfigured",
            num_inference_steps: 40,
            guidance_scale: 3.0,
            ip_adapter_scale: 1.0,
            identity_controlnet_conditioning_scale: 1.0,
            enhance_face_region: true,
            enable_lcm: false,
          },
        })) as { data: { image: { url: string } } };
        newImageUrl = instantIdResult.data.image.url;
        console.log(
          `[batchRegen] InstantID success for ${item.characterName}: ${newImageUrl}`
        );
      } catch (instantIdErr) {
        console.warn(
          `[batchRegen] InstantID failed for ${item.characterName}, falling back to Flux PuLID:`,
          instantIdErr instanceof Error ? instantIdErr.message : instantIdErr
        );
        const pulidResult = await generateFaceConsistentImage({
          prompt: previewPrompt,
          referenceImageUrl: base64DataUrl,
          idWeight: 1.8,
          guidanceScale: 2.5,
          imageSize: "portrait_4_3",
          negativePrompt:
            "different face, new person, altered identity, distorted face, extra limbs, blurry, low quality, cartoon, anime, illustration, full body, wide shot",
        });
        newImageUrl = pulidResult.url;
        console.log(
          `[batchRegen] Flux PuLID fallback success for ${item.characterName}`
        );
      }
      await db
        .update(videoCharacters)
        .set({
          previewImageUrl: newImageUrl,
          previewApproved: false,
          updatedAt: new Date(),
        })
        .where(eq(videoCharacters.id, item.characterId));
      item.newPreviewUrl = newImageUrl;
      item.status = "done";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[batchRegen] Failed for character ${item.characterId} (${item.characterName}):`,
        msg
      );
      item.status = "failed";
      item.error = msg;
    }
  }
  state.status = "completed";
  state.completedAt = new Date();
  console.log(
    `[batchRegen] Batch ${state.batchId} completed for user ${userId}`
  );
}

// ─── Router ──────────────────────────────────────────────────────────────────
export const batchRegenRouter = router({
  // ── Batch Regeneration ────────────────────────────────────────────────────
  startBatchRegeneration: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int().optional(),
        characterIds: z.array(z.number().int()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const existing = batchJobs.get(ctx.user.id);
      if (existing && existing.status === "running") {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "A batch regeneration is already running for your account.",
        });
      }
      const baseQuery = db
        .select({
          charId: videoCharacters.id,
          charName: videoCharacters.name,
          charRole: videoCharacters.role,
          jobId: videoCharacters.jobId,
          jobTitle: musicVideoJobs.title,
          currentPreview: videoCharacters.previewImageUrl,
        })
        .from(videoCharacters)
        .innerJoin(
          musicVideoJobs,
          eq(musicVideoJobs.id, videoCharacters.jobId)
        )
        .innerJoin(
          videoCharacterPhotos,
          and(
            eq(videoCharacterPhotos.characterId, videoCharacters.id),
            eq(videoCharacterPhotos.isPrimary, true)
          )
        )
        .where(
          and(
            eq(videoCharacters.userId, ctx.user.id),
            input.jobId
              ? eq(videoCharacters.jobId, input.jobId)
              : undefined,
            input.characterIds?.length
              ? inArray(videoCharacters.id, input.characterIds)
              : undefined
          )
        );
      const rows = await baseQuery;
      if (rows.length === 0) {
        return {
          batchId: null,
          total: 0,
          message: "No photo-mode characters found to regenerate.",
        };
      }
      const seen = new Set<number>();
      const uniqueRows = rows.filter((r) => {
        if (seen.has(r.charId)) return false;
        seen.add(r.charId);
        return true;
      });
      const batchId = `batch-${ctx.user.id}-${Date.now()}`;
      const items: BatchItem[] = uniqueRows.map((r) => ({
        characterId: r.charId,
        characterName: r.charName,
        characterRole: r.charRole ?? undefined,
        jobId: r.jobId,
        jobTitle: r.jobTitle,
        currentPreviewUrl: r.currentPreview ?? undefined,
        newPreviewUrl: undefined,
        status: "pending" as const,
        error: undefined,
      }));
      const batchState: BatchState = {
        batchId,
        userId: ctx.user.id,
        status: "running",
        items,
        startedAt: new Date(),
        completedAt: undefined,
      };
      batchJobs.set(ctx.user.id, batchState);
      runBatchRegeneration(batchState, ctx.user.id).catch((err) => {
        console.error("[batchRegen] Unhandled error:", err);
        batchState.status = "completed";
      });
      return {
        batchId,
        total: items.length,
        message: `Started regenerating ${items.length} character(s).`,
      };
    }),

  getBatchRegenerationStatus: protectedProcedure.query(async ({ ctx }) => {
    const state = batchJobs.get(ctx.user.id);
    if (!state) return null;
    const total = state.items.length;
    const completed = state.items.filter((i) => i.status === "done").length;
    const failed = state.items.filter((i) => i.status === "failed").length;
    const inProgress = state.items.filter(
      (i) => i.status === "processing"
    ).length;
    const pending = state.items.filter((i) => i.status === "pending").length;
    return {
      batchId: state.batchId,
      status: state.status,
      total,
      completed,
      failed,
      inProgress,
      pending,
      startedAt: state.startedAt,
      completedAt: state.completedAt ?? null,
      items: state.items.map((i) => ({
        characterId: i.characterId,
        characterName: i.characterName,
        characterRole: i.characterRole ?? null,
        jobId: i.jobId,
        jobTitle: i.jobTitle,
        currentPreviewUrl: i.currentPreviewUrl ?? null,
        newPreviewUrl: i.newPreviewUrl ?? null,
        status: i.status,
        error: i.error ?? null,
      })),
    };
  }),

  cancelBatchRegeneration: protectedProcedure.mutation(async ({ ctx }) => {
    const state = batchJobs.get(ctx.user.id);
    if (!state || state.status !== "running") {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No running batch to cancel.",
      });
    }
    state.status = "cancelled";
    for (const item of state.items) {
      if (item.status === "pending") item.status = "cancelled" as BatchItemStatus;
    }
    return { cancelled: true };
  }),

  retryFailedBatchItems: protectedProcedure.mutation(async ({ ctx }) => {
    const state = batchJobs.get(ctx.user.id);
    if (!state)
      throw new TRPCError({ code: "NOT_FOUND", message: "No batch found." });
    if (state.status === "running")
      throw new TRPCError({
        code: "CONFLICT",
        message: "Batch is still running.",
      });
    const failedItems = state.items.filter(
      (i) => i.status === "failed" || i.status === "cancelled"
    );
    if (failedItems.length === 0) return { retried: 0 };
    for (const item of failedItems) {
      item.status = "pending";
      item.error = undefined;
      item.newPreviewUrl = undefined;
    }
    state.status = "running";
    state.completedAt = undefined;
    runBatchRegeneration(state, ctx.user.id).catch((err) => {
      console.error("[batchRegen] Retry unhandled error:", err);
      state.status = "completed";
    });
    return { retried: failedItems.length };
  }),

  // ── Master Portrait Generation ────────────────────────────────────────────
  generateMasterPortrait: protectedProcedure
    .input(
      z.object({
        characterId: z.number().int(),
        jobId: z.number().int(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const [char] = await db
        .select()
        .from(videoCharacters)
        .where(
          and(
            eq(videoCharacters.id, input.characterId),
            eq(videoCharacters.jobId, input.jobId),
            eq(videoCharacters.userId, ctx.user.id)
          )
        );
      if (!char)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Character not found",
        });
      const photos = await db
        .select()
        .from(videoCharacterPhotos)
        .where(eq(videoCharacterPhotos.characterId, input.characterId))
        .orderBy(desc(videoCharacterPhotos.isPrimary));
      if (photos.length === 0)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No photos uploaded for this character",
        });
      const primaryPhoto = photos.find((p) => p.isPrimary) ?? photos[0];
      const photoResponse = await fetch(primaryPhoto.photoUrl);
      if (!photoResponse.ok)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch reference photo: ${photoResponse.status}`,
        });
      const photoBuffer = Buffer.from(await photoResponse.arrayBuffer());
      const mimeType = primaryPhoto.photoUrl.match(/\.png(\?|$)/i)
        ? "image/png"
        : primaryPhoto.photoUrl.match(/\.webp(\?|$)/i)
        ? "image/webp"
        : "image/jpeg";
      const base64DataUrl = `data:${mimeType};base64,${photoBuffer.toString("base64")}`;
      const masterSeed = Math.floor(Math.random() * 2147483647);
      const description = char.lockedDescription?.trim() ?? "";
      const characterLabel = `${char.name}${char.role ? `, ${char.role}` : ""}`;
      const characterPrompt =
        description.length > 20
          ? `Portrait of ${characterLabel}. ${description}. Same person as reference image, identical face, same hair, same identity, no variation. Clean studio lighting, front-facing, photorealistic, high detail.`
          : `Portrait of ${characterLabel}. Same person as reference image, identical face, same hair, same identity, no variation. Clean studio lighting, front-facing, photorealistic, high detail.`;
      let masterPortraitUrl: string;
      let engineUsed = "instantid";
      if (process.env.FAL_AI_API_KEY)
        fal.config({ credentials: process.env.FAL_AI_API_KEY });
      try {
        console.log(
          `[masterPortrait] Generating for ${char.name} via InstantID (seed: ${masterSeed})`
        );
        const result = (await fal.subscribe("fal-ai/instantid", {
          input: {
            face_image_url: base64DataUrl,
            prompt: characterPrompt,
            style: "Headshot",
            negative_prompt:
              "different face, new person, altered identity, nsfw, lowres, bad anatomy, extra limbs, blurry, low quality, cartoon, anime, illustration, full body, wide shot, deformed, ugly, disfigured, text, watermark",
            num_inference_steps: 40,
            guidance_scale: 3.0,
            ip_adapter_scale: 1.0,
            identity_controlnet_conditioning_scale: 1.0,
            enhance_face_region: true,
            enable_lcm: false,
            seed: masterSeed,
          },
        })) as { data: { image: { url: string } } };
        masterPortraitUrl = result.data.image.url;
        console.log(
          `[masterPortrait] InstantID success for ${char.name}: ${masterPortraitUrl}`
        );
      } catch (instantIdErr) {
        console.warn(
          `[masterPortrait] InstantID failed for ${char.name}, falling back to Flux PuLID:`,
          instantIdErr instanceof Error ? instantIdErr.message : instantIdErr
        );
        engineUsed = "flux-pulid";
        try {
          const pulidResult = await generateFaceConsistentImage({
            prompt: characterPrompt,
            referenceImageUrl: base64DataUrl,
            idWeight: 1.8,
            guidanceScale: 2.5,
            imageSize: "portrait_4_3",
            negativePrompt:
              "different face, new person, altered identity, distorted face, extra limbs, blurry, low quality, cartoon, anime, illustration, full body, wide shot, text, watermark",
            seed: masterSeed,
          });
          masterPortraitUrl = pulidResult.url;
          console.log(
            `[masterPortrait] Flux PuLID success for ${char.name}: ${masterPortraitUrl}`
          );
        } catch (pulidErr) {
          console.error(
            `[masterPortrait] Both engines failed for ${char.name}:`,
            pulidErr instanceof Error ? pulidErr.message : pulidErr
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to generate master portrait for ${char.name}. Please try again.`,
          });
        }
      }
      await db
        .update(videoCharacters)
        .set({
          masterPortraitUrl,
          masterSeed,
          characterPrompt,
          masterPortraitGeneratedAt: new Date(),
          previewImageUrl: masterPortraitUrl,
          previewApproved: false,
          updatedAt: new Date(),
        })
        .where(eq(videoCharacters.id, input.characterId));
      console.log(
        `[masterPortrait] Stored for ${char.name} (engine: ${engineUsed}, seed: ${masterSeed})`
      );
      return {
        masterPortraitUrl,
        masterSeed,
        characterPrompt,
        engineUsed,
        characterId: input.characterId,
      };
    }),

  getMasterPortraitStatus: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      const [job] = await db
        .select()
        .from(musicVideoJobs)
        .where(
          and(
            eq(musicVideoJobs.id, input.jobId),
            eq(musicVideoJobs.userId, ctx.user.id)
          )
        );
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      const chars = await db
        .select()
        .from(videoCharacters)
        .where(
          and(
            eq(videoCharacters.jobId, input.jobId),
            eq(videoCharacters.userId, ctx.user.id)
          )
        );
      const photos = await db
        .select()
        .from(videoCharacterPhotos)
        .where(eq(videoCharacterPhotos.jobId, input.jobId));
      return chars.map((c) => ({
        characterId: c.id,
        name: c.name,
        role: c.role,
        hasPhoto: photos.some((p) => p.characterId === c.id),
        hasMasterPortrait: !!c.masterPortraitUrl,
        masterPortraitUrl: c.masterPortraitUrl ?? null,
        masterPortraitGeneratedAt: c.masterPortraitGeneratedAt ?? null,
        masterSeed: c.masterSeed ?? null,
        characterPrompt: c.characterPrompt ?? null,
      }));
    }),
});
