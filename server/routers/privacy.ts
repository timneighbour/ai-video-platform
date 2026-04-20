import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { wizPerformerConsents, dataRequests, users } from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

export const privacyRouter = router({
  /**
   * Log WizPerformer biometric consent (GDPR Art. 9).
   * All four checkboxes must be true before the client calls this.
   */
  logPerformerConsent: protectedProcedure
    .input(
      z.object({
        characterId: z.number().optional(),
        consentHasRight: z.literal(true),
        consentAgeVerified: z.literal(true),
        consentAiProcessing: z.literal(true),
        consentPrivacyPolicy: z.literal(true),
        policyVersion: z.string().default("2026-04-21"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const ipAddress =
        (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        ctx.req.socket?.remoteAddress ||
        null;
      const userAgent = (ctx.req.headers["user-agent"] as string) || null;

      if (!db) throw new Error("Database unavailable");
      const [result] = await db.insert(wizPerformerConsents).values({
        userId: ctx.user.id,
        characterId: input.characterId ?? null,
        policyVersion: input.policyVersion,
        ipAddress,
        userAgent,
        consentHasRight: input.consentHasRight,
        consentAgeVerified: input.consentAgeVerified,
        consentAiProcessing: input.consentAiProcessing,
        consentPrivacyPolicy: input.consentPrivacyPolicy,
      });
      return { success: true, consentId: (result as any).insertId };
    }),

  /**
   * Withdraw a previously given WizPerformer consent.
   */
  withdrawPerformerConsent: protectedProcedure
    .input(z.object({ consentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db
        .update(wizPerformerConsents)
        .set({ withdrawnAt: new Date() })
        .where(
          and(
            eq(wizPerformerConsents.id, input.consentId),
            eq(wizPerformerConsents.userId, ctx.user.id),
            isNull(wizPerformerConsents.withdrawnAt)
          )
        );
      return { success: true };
    }),

  /**
   * Request account deletion (GDPR Art. 17 — right to erasure).
   * Creates a pending request and notifies the owner.
   */
  requestAccountDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const [result] = await db.insert(dataRequests).values({
      userId: ctx.user.id,
      type: "deletion",
      status: "pending",
    });
    await notifyOwner({
      title: "Account Deletion Request",
      content: `User ${ctx.user.name || ctx.user.email || ctx.user.id} (ID: ${ctx.user.id}) has requested account deletion. Request ID: ${(result as any).insertId}`,
    });
    return { success: true, requestId: (result as any).insertId };
  }),

  /**
   * Request a data export (GDPR Art. 20 — right to data portability).
   */
  requestDataExport: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");
    const [result] = await db.insert(dataRequests).values({
      userId: ctx.user.id,
      type: "export",
      status: "pending",
    });
    await notifyOwner({
      title: "Data Export Request",
      content: `User ${ctx.user.name || ctx.user.email || ctx.user.id} (ID: ${ctx.user.id}) has requested a data export. Request ID: ${(result as any).insertId}`,
    });
    return { success: true, requestId: (result as any).insertId };
  }),

  /**
   * Get the user's active data requests.
   */
  getMyDataRequests: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const requests = await db
      .select()
      .from(dataRequests)
      .where(eq(dataRequests.userId, ctx.user.id))
      .orderBy(dataRequests.requestedAt);
    return requests;
  }),
});
