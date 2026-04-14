import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  listCreators,
  getCreatorById,
  submitCreatorFeatureRequest,
  setCreatorStatus,
  incrementCreatorViews,
} from "../db";

const creatorTypeEnum = z.enum([
  "music_artist",
  "youtuber",
  "animator",
  "kids_creator",
  "content_creator",
]);

export const creatorRouter = router({
  /** Public: list approved creators, optionally filtered */
  list: publicProcedure
    .input(
      z.object({
        type: creatorTypeEnum.optional(),
        featured: z.boolean().optional(),
        trending: z.boolean().optional(),
        limit: z.number().min(1).max(100).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await listCreators(input ?? {});
    }),

  /** Public: get a single creator by id and increment view count */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const creator = await getCreatorById(input.id);
      if (!creator) throw new TRPCError({ code: "NOT_FOUND" });
      // fire-and-forget view increment
      incrementCreatorViews(input.id).catch(() => {});
      return creator;
    }),

  /** Protected: submit a feature request */
  submitFeatureRequest: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        creatorType: creatorTypeEnum,
        bio: z.string().max(500).optional(),
        videoUrl: z.string().url().optional(),
        thumbnailUrl: z.string().url().optional(),
        youtubeUrl: z.string().url().optional(),
        instagramUrl: z.string().url().optional(),
        tiktokUrl: z.string().url().optional(),
        websiteUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = await submitCreatorFeatureRequest({
        ...input,
        userId: ctx.user.id,
        status: "pending",
      });
      return { id };
    }),

  /** Admin: approve or reject a creator submission */
  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["approved", "rejected"]),
        isFeatured: z.boolean().optional(),
        isTrending: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await setCreatorStatus(input.id, input.status, {
        isFeatured: input.isFeatured,
        isTrending: input.isTrending,
      });
      return { ok: true };
    }),
});
