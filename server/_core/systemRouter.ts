import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getDb, resetDb } from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  /** Returns current DB connection status (admin only). */
  dbStatus: adminProcedure
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) return { connected: false, message: "No database instance" };
        // Lightweight ping
        await db.execute("SELECT 1");
        return { connected: true, message: "Connected" };
      } catch (err: any) {
        return { connected: false, message: err?.message ?? "Unknown error" };
      }
    }),

  /** Force-resets the DB connection pool (admin only). */
  reconnectDb: adminProcedure
    .mutation(async () => {
      try {
        resetDb();
        const db = await getDb();
        if (!db) return { success: false, message: "Failed to create DB instance" };
        await db.execute("SELECT 1");
        return { success: true, message: "Database reconnected successfully" };
      } catch (err: any) {
        return { success: false, message: err?.message ?? "Reconnect failed" };
      }
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
