/**
 * Admin Email Router
 *
 * Provides admin-only procedures for:
 *  1. Exporting all subscribers as CSV (for Zoho CRM import)
 *  2. Sending a broadcast email to all users via Resend
 *  3. Listing past broadcasts
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, subscriptions, broadcastEmails } from "../../drizzle/schema";
import { desc, eq, isNotNull } from "drizzle-orm";
import { emailBroadcastSingle } from "../email";

// Admin guard — reuse pattern from blog router
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const adminEmailRouter = router({
  /**
   * Returns all users with email addresses as a structured list.
   * The frontend converts this to a CSV download.
   */
  listSubscribers: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .where(isNotNull(users.email))
      .orderBy(desc(users.createdAt));

    // Enrich with active plan
    const subs = await db
      .select({ userId: subscriptions.userId, plan: subscriptions.plan, status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    const planMap = new Map(subs.map((s) => [s.userId, s.plan]));

    return rows.map((u) => ({
      id: u.id,
      name: u.name ?? "",
      email: u.email ?? "",
      plan: planMap.get(u.id) ?? "free",
      role: u.role,
      joinedAt: u.createdAt,
      lastSignedIn: u.lastSignedIn,
    }));
  }),

  /**
   * Send a broadcast email to all users with email addresses.
   * Supports {{name}} personalisation token in bodyHtml.
   */
  sendBroadcast: adminProcedure
    .input(
      z.object({
        subject: z.string().min(1, "Subject is required").max(500),
        bodyHtml: z.string().min(1, "Body is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Fetch all users with emails
      const recipients = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(isNotNull(users.email));

      const validRecipients = recipients.filter((r) => r.email && r.email.includes("@"));

      if (validRecipients.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No users with email addresses found" });
      }

      // Send in batches of 10 to avoid rate limiting
      const BATCH_SIZE = 10;
      let sent = 0;
      for (let i = 0; i < validRecipients.length; i += BATCH_SIZE) {
        const batch = validRecipients.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map((r) =>
            emailBroadcastSingle(r.email!, r.name ?? "there", input.subject, input.bodyHtml)
          )
        );
        sent += batch.length;
        // Small delay between batches to respect Resend rate limits
        if (i + BATCH_SIZE < validRecipients.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      // Log the broadcast
      const db2 = await getDb();
      if (db2) await db2.insert(broadcastEmails).values({
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        recipientCount: sent,
        sentBy: ctx.user.id,
      });

      return { success: true, recipientCount: sent };
    }),

  /**
   * List past broadcasts (most recent first).
   */
  listBroadcasts: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        id: broadcastEmails.id,
        subject: broadcastEmails.subject,
        recipientCount: broadcastEmails.recipientCount,
        sentAt: broadcastEmails.sentAt,
        sentBy: broadcastEmails.sentBy,
      })
      .from(broadcastEmails)
      .orderBy(desc(broadcastEmails.sentAt))
      .limit(50);
    return rows;
  }),
});
