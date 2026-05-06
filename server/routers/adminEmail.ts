/**
 * Admin Email Router
 *
 * Provides admin-only procedures for:
 *  1. Exporting all subscribers as CSV (for Zoho CRM import)
 *  2. Sending a broadcast email to all users via Resend
 *  3. Listing past broadcasts
 *  4. Founding Creator campaign — grant 100 bonus credits + send re-engagement email
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  users,
  subscriptions,
  broadcastEmails,
  musicVideoJobs,
  kidsVideoJobs,
  wizShortsJobs,
} from "../../drizzle/schema";
import { desc, eq, isNotNull, and, ne } from "drizzle-orm";
import { emailBroadcastSingle } from "../email";
import { addCredits } from "../credit-service";
import { generateUnsubscribeToken } from "./unsubscribe";

// Admin guard
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// ── Founding Creator email template ─────────────────────────────────────────
function foundingCreatorEmailHtml(name: string): string {
  const firstName = name.split(" ")[0] || "Creator";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>WIZ AI — You've been given 100 free credits</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#e8e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding:0 0 32px 0;text-align:center;">
            <div style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:12px 28px;border-radius:8px;">
              <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:2px;">WIZ AI</span>
            </div>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1030,#0f1a2e);border-radius:16px;padding:48px 40px;text-align:center;border:1px solid #2a2050;">
            <div style="font-size:40px;margin-bottom:16px;">🎬</div>
            <h1 style="margin:0 0 12px 0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.3;">
              ${firstName}, we've upgraded everything.
            </h1>
            <p style="margin:0 0 24px 0;font-size:16px;color:#a0a0c0;line-height:1.6;">
              And we've added <strong style="color:#ffd700;">100 free credits</strong> to your account as a thank-you for being an early supporter.
            </p>
            <a href="https://wiz-ai.io" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
              Start Creating Now →
            </a>
          </td>
        </tr>

        <!-- Credits badge -->
        <tr>
          <td style="padding:24px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#1a1a2e;border:1px solid #ffd70033;border-radius:12px;padding:20px 24px;text-align:center;">
                  <div style="font-size:32px;font-weight:900;color:#ffd700;margin-bottom:4px;">+100 Credits</div>
                  <div style="font-size:13px;color:#8080a0;">Added to your account · No expiry · Use on any tool</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- What's new -->
        <tr>
          <td style="padding:0 0 24px 0;">
            <h2 style="margin:0 0 16px 0;font-size:18px;font-weight:700;color:#ffffff;">What's new since you signed up:</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${[
                ["🎵", "WizVideo Director", "Full AI music video studio — upload your track, generate cinematic scenes"],
                ["⚡", "WizShorts", "60-second vertical videos for Reels, TikTok, and Shorts"],
                ["🎨", "WizAnimate", "AI character animation — bring illustrated worlds to life"],
                ["🎬", "WizPilot", "Text-to-video from a script — no audio needed"],
                ["🖼️", "WizImage", "AI image generation with style control"],
                ["💳", "Credit packs live", "Top up instantly — Spark (50cr), Boost (150cr), Creator (350cr) and more"],
                ["📱", "Mobile improved", "Better experience on phones and tablets"],
              ].map(([icon, title, desc]) => `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #1e1e3a;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:36px;font-size:20px;vertical-align:top;padding-top:2px;">${icon}</td>
                      <td>
                        <div style="font-size:14px;font-weight:700;color:#e0e0f0;">${title}</div>
                        <div style="font-size:13px;color:#7070a0;margin-top:2px;">${desc}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`).join("")}
            </table>
          </td>
        </tr>

        <!-- Founding Creator badge -->
        <tr>
          <td style="padding:0 0 24px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:linear-gradient(135deg,#2d1a4a,#1a2a4a);border:1px solid #7c3aed44;border-radius:12px;padding:20px 24px;">
                  <div style="font-size:13px;font-weight:700;color:#a78bfa;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">✦ Founding Creator Status</div>
                  <div style="font-size:14px;color:#c0c0e0;line-height:1.5;">
                    You're one of the first creators on WIZ AI. Your feedback shaped the platform. As a founding member, you'll always have early access to new tools and features before anyone else.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="text-align:center;padding:0 0 32px 0;">
            <a href="https://wiz-ai.io" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:18px 48px;border-radius:8px;font-size:17px;font-weight:700;letter-spacing:0.5px;">
              Go to WIZ AI →
            </a>
            <div style="margin-top:12px;font-size:12px;color:#505070;">
              Your 100 bonus credits are already in your account.
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #1e1e3a;padding:24px 0 0 0;text-align:center;">
            <p style="margin:0 0 8px 0;font-size:13px;color:#505070;">
              WIZ AI · <a href="https://wiz-ai.io" style="color:#7c3aed;text-decoration:none;">wiz-ai.io</a>
            </p>
            <p style="margin:0;font-size:12px;color:#404060;">
              You're receiving this because you signed up at wiz-ai.io.<br/>
              Questions? Reply to this email or contact <a href="mailto:support@wiz-ai.io" style="color:#7c3aed;text-decoration:none;">support@wiz-ai.io</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const adminEmailRouter = router({
  /**
   * Returns all users with email addresses as a structured list.
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
        isFoundingCreator: users.isFoundingCreator,
      })
      .from(users)
      .where(isNotNull(users.email))
      .orderBy(desc(users.createdAt));

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
      isFoundingCreator: u.isFoundingCreator,
    }));
  }),

  /**
   * Send a broadcast email to all users with email addresses.
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

      const recipients = await db
        .select({ id: users.id, name: users.name, email: users.email, marketingOptOut: users.marketingOptOut })
        .from(users)
        .where(isNotNull(users.email));

      const validRecipients = recipients.filter((r) => r.email && r.email.includes("@") && !r.marketingOptOut);

      if (validRecipients.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No users with email addresses found" });
      }

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
        if (i + BATCH_SIZE < validRecipients.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      await db.insert(broadcastEmails).values({
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        recipientCount: sent,
        sentBy: ctx.user.id,
      });

      return { success: true, recipientCount: sent };
    }),

  /**
   * Get Founding Creator campaign stats (dry run preview).
   */
  getFoundingCreatorStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        isFoundingCreator: users.isFoundingCreator,
        foundingCreatorGrantedAt: users.foundingCreatorGrantedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(isNotNull(users.email), ne(users.role, "admin")));

    const musicJobUsers = await db.selectDistinct({ userId: musicVideoJobs.userId }).from(musicVideoJobs);
    const kidsJobUsers = await db.selectDistinct({ userId: kidsVideoJobs.userId }).from(kidsVideoJobs);
    const shortsJobUsers = await db.selectDistinct({ userId: wizShortsJobs.userId }).from(wizShortsJobs);
    const renderedUserIds = new Set([
      ...musicJobUsers.map((j) => j.userId),
      ...kidsJobUsers.map((j) => j.userId),
      ...shortsJobUsers.map((j) => j.userId),
    ]);

    const eligible = allUsers.filter((u) => !renderedUserIds.has(u.id));
    const alreadyGranted = eligible.filter((u) => u.isFoundingCreator);
    const notYetGranted = eligible.filter((u) => !u.isFoundingCreator);

    return {
      totalUsers: allUsers.length,
      eligibleCount: eligible.length,
      alreadyGrantedCount: alreadyGranted.length,
      toSendCount: notYetGranted.length,
      users: eligible.map((u) => ({
        id: u.id,
        name: u.name ?? "Creator",
        email: u.email!,
        alreadyGranted: u.isFoundingCreator,
        grantedAt: u.foundingCreatorGrantedAt,
        joinedAt: u.createdAt,
      })),
    };
  }),

  /**
   * Send the Founding Creator re-engagement campaign.
   * Grants 100 bonus credits + sends personalised email to all eligible users.
   * Idempotent — skips users who already received the grant.
   */
  sendFoundingCreatorCampaign: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const allUsers = await db
      .select({ id: users.id, name: users.name, email: users.email, isFoundingCreator: users.isFoundingCreator })
      .from(users)
      .where(and(isNotNull(users.email), ne(users.role, "admin")));

    const musicJobUsers = await db.selectDistinct({ userId: musicVideoJobs.userId }).from(musicVideoJobs);
    const kidsJobUsers = await db.selectDistinct({ userId: kidsVideoJobs.userId }).from(kidsVideoJobs);
    const shortsJobUsers = await db.selectDistinct({ userId: wizShortsJobs.userId }).from(wizShortsJobs);
    const renderedUserIds = new Set([
      ...musicJobUsers.map((j) => j.userId),
      ...kidsJobUsers.map((j) => j.userId),
      ...shortsJobUsers.map((j) => j.userId),
    ]);

    // Only target users who haven't rendered and haven't been granted yet
    const targets = allUsers.filter((u) => !renderedUserIds.has(u.id) && !u.isFoundingCreator);

    if (targets.length === 0) {
      return { success: true, sent: 0, credited: 0, message: "No new eligible users — all have already been contacted" };
    }

    let sent = 0;
    let credited = 0;

    for (const u of targets) {
      const name = u.name ?? "Creator";
      const email = u.email!;

      // 1. Grant 100 bonus credits
      try {
        await addCredits(u.id, 100, "subscription_grant", "Founding Creator bonus — 100 free credits");
        credited++;
      } catch (e) {
        console.error(`[FoundingCreator] Failed to grant credits to user ${u.id}:`, e);
      }

      // 2. Mark as Founding Creator
      await db.update(users).set({
        isFoundingCreator: true,
        foundingCreatorGrantedAt: new Date(),
      }).where(eq(users.id, u.id));

      // 3. Send personalised email
      const firstName = name.split(" ")[0];
      const subject = `${firstName}, you've been given 100 free credits — WIZ AI is back`;
      const unsubToken = generateUnsubscribeToken(email);
      try {
        await emailBroadcastSingle(email, name, subject, foundingCreatorEmailHtml(name), unsubToken);
        sent++;
      } catch (e) {
        console.error(`[FoundingCreator] Failed to send email to ${email}:`, e);
      }

      await new Promise((r) => setTimeout(r, 150));
    }

    // Log the broadcast
    await db.insert(broadcastEmails).values({
      subject: "Founding Creator Campaign — 100 bonus credits",
      bodyHtml: foundingCreatorEmailHtml("{{name}}"),
      recipientCount: sent,
      sentBy: ctx.user.id,
    });

    return { success: true, sent, credited, message: `Sent to ${sent} users, granted credits to ${credited}` };
  }),

  /**
   * Get the Founding Creator email preview HTML.
   */
  getFoundingCreatorEmailPreview: adminProcedure.query(() => {
    return { html: foundingCreatorEmailHtml("Alex Johnson") };
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
