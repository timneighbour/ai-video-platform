/**
 * Notifications router
 * Provides tRPC procedures for in-app notification management.
 */
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { inAppNotifications } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

export const notificationsRouter = router({
  /** Fetch the 20 most recent notifications for the current user */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select()
      .from(inAppNotifications)
      .where(eq(inAppNotifications.userId, ctx.user.id))
      .orderBy(desc(inAppNotifications.createdAt))
      .limit(20);
    return rows;
  }),

  /** Count unread notifications for the current user */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return 0;
    const rows = await db
      .select({ id: inAppNotifications.id })
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.userId, ctx.user.id),
          eq(inAppNotifications.isRead, false)
        )
      );
    return rows.length;
  }),

  /** Mark a single notification as read */
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return;
      await db
        .update(inAppNotifications)
        .set({ isRead: true })
        .where(
          and(
            eq(inAppNotifications.id, input.id),
            eq(inAppNotifications.userId, ctx.user.id)
          )
        );
    }),

  /** Mark all notifications as read for the current user */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return;
    await db
      .update(inAppNotifications)
      .set({ isRead: true })
      .where(eq(inAppNotifications.userId, ctx.user.id));
  }),
});
