/**
 * Suno Music Router
 * Handles AI music generation via sunoapi.org.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sunoMusicTasks } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { initSuno } from "../ai-apis/suno";

export const sunoRouter = router({
  /**
   * Submit a music generation task.
   * Returns the DB task ID for polling.
   */
  generate: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(400),
        style: z.string().max(200).optional(),
        title: z.string().max(80).optional(),
        instrumental: z.boolean().default(false),
        model: z.enum(["V3_5", "V4"]).default("V4"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      let suno: ReturnType<typeof initSuno>;
      try {
        suno = initSuno();
      } catch {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Suno API key not configured. Please add SUNO_API_KEY in Settings → Secrets.",
        });
      }

      // Submit to Suno API
      const externalTaskId = await suno.generate({
        prompt: input.prompt,
        style: input.style,
        title: input.title,
        instrumental: input.instrumental,
        model: input.model,
      });

      // Save to DB
      const [inserted] = await db.insert(sunoMusicTasks).values({
        userId: ctx.user.id,
        taskId: externalTaskId,
        title: input.title ?? null,
        prompt: input.prompt,
        style: input.style ?? null,
        instrumental: input.instrumental,
        status: "pending",
        updatedAt: new Date(),
      });

      return { id: (inserted as any).insertId as number, taskId: externalTaskId };
    }),

  /**
   * Poll the status of a music generation task.
   * Updates DB and returns current status + tracks.
   */
  getStatus: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [task] = await db
        .select()
        .from(sunoMusicTasks)
        .where(and(eq(sunoMusicTasks.id, input.id), eq(sunoMusicTasks.userId, ctx.user.id)));

      if (!task) throw new TRPCError({ code: "NOT_FOUND" });

      // If already complete/failed, return cached result
      if (task.status === "complete" || task.status === "failed") {
        return {
          id: task.id,
          status: task.status,
          tracks: task.tracks ? JSON.parse(task.tracks) : [],
          errorMessage: task.errorMessage,
        };
      }

      // Poll external API
      let suno: ReturnType<typeof initSuno>;
      try {
        suno = initSuno();
      } catch {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Suno API key not configured" });
      }

      const result = await suno.getTaskStatus(task.taskId);

      // Update DB
      await db
        .update(sunoMusicTasks)
        .set({
          status: result.status,
          tracks: result.tracks ? JSON.stringify(result.tracks) : null,
          updatedAt: new Date(),
        })
        .where(eq(sunoMusicTasks.id, task.id));

      return {
        id: task.id,
        status: result.status,
        tracks: result.tracks ?? [],
        errorMessage: result.errorMessage,
      };
    }),

  /**
   * Get the user's music generation history (last 20).
   */
  history: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const tasks = await db
      .select()
      .from(sunoMusicTasks)
      .where(eq(sunoMusicTasks.userId, ctx.user.id))
      .orderBy(desc(sunoMusicTasks.createdAt))
      .limit(20);

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      prompt: t.prompt,
      style: t.style,
      instrumental: t.instrumental,
      status: t.status,
      tracks: t.tracks ? JSON.parse(t.tracks) : [],
      createdAt: t.createdAt,
    }));
  }),

  /**
   * Public endpoint: get featured/demo tracks for the landing page.
   * Returns completed tasks from the owner account (userId = 1).
   */
  featuredTracks: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const tasks = await db
      .select()
      .from(sunoMusicTasks)
      .where(and(eq(sunoMusicTasks.status, "complete"), eq(sunoMusicTasks.userId, 1)))
      .orderBy(desc(sunoMusicTasks.createdAt))
      .limit(6);

    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      style: t.style,
      tracks: t.tracks ? JSON.parse(t.tracks) : [],
    }));
  }),
});
