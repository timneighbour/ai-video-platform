import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { savedCharacters } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

export const characterLibraryRouter = router({
  /** List all saved characters for the current user, with optional search */
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      animStyle: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const userId = ctx.user.id;
      const conditions = [eq(savedCharacters.userId, userId)];

      if (input?.animStyle) {
        conditions.push(eq(savedCharacters.animStyle, input.animStyle));
      }

      const rows = await db
        .select()
        .from(savedCharacters)
        .where(and(...conditions))
        .orderBy(desc(savedCharacters.updatedAt));

      if (input?.search) {
        const q = input.search.toLowerCase();
        return rows.filter((r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q) ||
          (r.tags ?? "").toLowerCase().includes(q)
        );
      }

      return rows;
    }),

  /** Get a single saved character by ID (must belong to current user) */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const [row] = await db
        .select()
        .from(savedCharacters)
        .where(and(
          eq(savedCharacters.id, input.id),
          eq(savedCharacters.userId, ctx.user.id)
        ))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Character not found" });
      return row;
    }),

  /** Save a new character to the library */
  save: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      gender: z.enum(["male", "female", "neutral"]).default("neutral"),
      animStyle: z.string().optional(),
      photoUrl: z.string().url().optional(),
      previewUrl: z.string().url().optional(),
      tags: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [result] = await db.insert(savedCharacters).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description ?? null,
        gender: input.gender,
        animStyle: input.animStyle ?? null,
        photoUrl: input.photoUrl ?? null,
        previewUrl: input.previewUrl ?? null,
        tags: input.tags ?? null,
        useCount: 0,
      });

      const insertId = (result as { insertId: number }).insertId;
      const [saved] = await db
        .select()
        .from(savedCharacters)
        .where(eq(savedCharacters.id, insertId))
        .limit(1);

      return saved;
    }),

  /** Update an existing character */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      gender: z.enum(["male", "female", "neutral"]).optional(),
      animStyle: z.string().optional(),
      photoUrl: z.string().url().optional(),
      previewUrl: z.string().url().optional(),
      tags: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const { id, ...fields } = input;

      const [existing] = await db
        .select({ id: savedCharacters.id })
        .from(savedCharacters)
        .where(and(eq(savedCharacters.id, id), eq(savedCharacters.userId, ctx.user.id)))
        .limit(1);

      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Character not found" });

      const updateData: Record<string, unknown> = {};
      if (fields.name !== undefined) updateData.name = fields.name;
      if (fields.description !== undefined) updateData.description = fields.description;
      if (fields.gender !== undefined) updateData.gender = fields.gender;
      if (fields.animStyle !== undefined) updateData.animStyle = fields.animStyle;
      if (fields.photoUrl !== undefined) updateData.photoUrl = fields.photoUrl;
      if (fields.previewUrl !== undefined) updateData.previewUrl = fields.previewUrl;
      if (fields.tags !== undefined) updateData.tags = fields.tags;

      await db.update(savedCharacters).set(updateData).where(eq(savedCharacters.id, id));

      const [updated] = await db
        .select()
        .from(savedCharacters)
        .where(eq(savedCharacters.id, id))
        .limit(1);

      return updated;
    }),

  /** Delete a character from the library */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [existing] = await db
        .select({ id: savedCharacters.id })
        .from(savedCharacters)
        .where(and(eq(savedCharacters.id, input.id), eq(savedCharacters.userId, ctx.user.id)))
        .limit(1);

      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Character not found" });

      await db.delete(savedCharacters).where(eq(savedCharacters.id, input.id));
      return { success: true };
    }),

  /** Increment use count when a character is added to a project */
  incrementUseCount: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [existing] = await db
        .select({ id: savedCharacters.id, useCount: savedCharacters.useCount })
        .from(savedCharacters)
        .where(and(eq(savedCharacters.id, input.id), eq(savedCharacters.userId, ctx.user.id)))
        .limit(1);

      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Character not found" });

      await db
        .update(savedCharacters)
        .set({ useCount: existing.useCount + 1 })
        .where(eq(savedCharacters.id, input.id));

      return { success: true };
    }),
});
