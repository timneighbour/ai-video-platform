import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { deleteShowcaseItem, listShowcaseItems, upsertShowcaseItem } from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

export const showcaseRouter = router({
  /**
   * Public: list all active showcase items ordered by sortOrder.
   * Used by the homepage gallery.
   */
  list: publicProcedure.query(async () => {
    return await listShowcaseItems();
  }),

  /**
   * Admin only: create or update a showcase item.
   * Pass `id` to update an existing item; omit to create a new one.
   */
  upsert: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        category: z.string().min(1).max(64),
        title: z.string().min(1).max(255),
        description: z.string().min(1),
        posterUrl: z.string().url(),
        videoUrl: z.string().url().nullable().optional(),
        sortOrder: z.number().int().default(0),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      await upsertShowcaseItem({
        ...input,
        videoUrl: input.videoUrl ?? undefined,
      });
      return { success: true };
    }),

  /**
   * Admin only: delete a showcase item by ID.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      await deleteShowcaseItem(input.id);
      return { success: true };
    }),
});
