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
import { generateImage } from "../_core/imageGeneration";
import { generateFluxProPortrait } from "../ai-apis/aimlapi-fluxpro";
import { storagePut } from "../storage";

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
      const description = char.lockedDescription?.trim() ?? "";
      const characterLabel = `${char.name}${char.role ? `, ${char.role}` : ""}`;
      const characterPromptForBatch = description.length > 20
        ? `${characterLabel}. ${description}`
        : characterLabel;
      // Use Flux Pro 1.1 Ultra — photorealistic 8K head+shoulders portrait
      console.log(`[batchRegen] Generating portrait for ${item.characterName} via Flux Pro 1.1 Ultra`);
      const aimlUrl = await generateFluxProPortrait({
        characterPrompt: characterPromptForBatch,
        referenceImageUrl: primaryPhoto.photoUrl,
        aspectRatio: "1:1",
        outputFormat: "jpeg",
      });
      // Download from AI/ML CDN and re-upload to our S3 for persistence
      const imgResp = await fetch(aimlUrl, { signal: AbortSignal.timeout(60_000) });
      if (!imgResp.ok) throw new Error(`Portrait download failed: ${imgResp.status}`);
      const imgBuf = Buffer.from(await imgResp.arrayBuffer());
      const s3Key = `character-portraits/${char.userId}/${char.id}/portrait-${Date.now()}.jpg`;
      const { url: newImageUrl } = await storagePut(s3Key, imgBuf, "image/jpeg");
      console.log(`[batchRegen] Flux Pro success for ${item.characterName}: ${newImageUrl}`);
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
      // mimeType is only needed for the Forge fallback path
      const mimeType = primaryPhoto.photoUrl.match(/\.png(\?|$)/i)
        ? "image/png"
        : primaryPhoto.photoUrl.match(/\.webp(\?|$)/i)
        ? "image/webp"
        : "image/jpeg";
      const masterSeed = Math.floor(Math.random() * 2147483647);
      const description = char.lockedDescription?.trim() ?? "";
      const characterLabel = `${char.name}${char.role ? `, ${char.role}` : ""}`;
      // Build a head+shoulders portrait prompt for Flux Pro 1.1 Ultra.
      // Head+shoulders framing is optimal for OmniHuman animation — face clearly visible.
      // The Flux Pro client automatically appends HEAD_SHOULDERS_FRAMING and PHOTOREALISTIC_PORTRAIT_SUFFIX.
      const characterPrompt =
        description.length > 20
          ? `${characterLabel}. ${description}. Same person as reference image, identical face, same hair colour and style, same identity, no variation`
          : `${characterLabel}. Same person as reference image, identical face, same hair colour and style, same identity, no variation`;
      // Use Flux Pro 1.1 Ultra — photorealistic 8K head+shoulders portrait
      // Head+shoulders framing is optimal for OmniHuman animation (face clearly visible)
      const engineUsed = "flux-pro-1.1-ultra";
      console.log(`[masterPortrait] Generating for ${char.name} via Flux Pro 1.1 Ultra (seed: ${masterSeed})`);
      let masterPortraitUrl: string;
      try {
        const aimlUrl = await generateFluxProPortrait({
          characterPrompt,
          referenceImageUrl: primaryPhoto.photoUrl,
          aspectRatio: "1:1",
          outputFormat: "jpeg",
        });
        // Download from AI/ML CDN and re-upload to our S3 for persistence
        const imgResp = await fetch(aimlUrl, { signal: AbortSignal.timeout(60_000) });
        if (!imgResp.ok) throw new Error(`Portrait download failed: ${imgResp.status}`);
        const imgBuf = Buffer.from(await imgResp.arrayBuffer());
        const s3Key = `character-portraits/${char.userId}/${char.id}/master-${masterSeed}.jpg`;
        const { url: s3Url } = await storagePut(s3Key, imgBuf, "image/jpeg");
        masterPortraitUrl = s3Url;
        console.log(`[masterPortrait] Flux Pro success for ${char.name}: ${masterPortraitUrl}`);
      } catch (fluxErr) {
        // Fallback to Forge if Flux Pro fails
        console.warn(`[masterPortrait] Flux Pro failed for ${char.name}, falling back to Forge:`, fluxErr instanceof Error ? fluxErr.message : fluxErr);
        const forgeResult = await generateImage({
          prompt: characterPrompt,
          originalImages: [{ url: primaryPhoto.photoUrl, mimeType }],
        });
        if (!forgeResult.url) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to generate master portrait for ${char.name}. Please try again.`,
          });
        }
        masterPortraitUrl = forgeResult.url;
        console.log(`[masterPortrait] Forge fallback success for ${char.name}: ${masterPortraitUrl}`);
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
