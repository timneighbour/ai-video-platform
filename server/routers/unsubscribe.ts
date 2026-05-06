import { z } from "zod";
import { createHmac } from "crypto";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, or } from "drizzle-orm";

/** Generate a signed unsubscribe token for a user email. */
export function generateUnsubscribeToken(email: string): string {
  const secret = process.env.JWT_SECRET ?? "wiz-ai-unsubscribe-secret";
  const hmac = createHmac("sha256", secret);
  hmac.update(email.toLowerCase().trim());
  return Buffer.from(hmac.digest()).toString("base64url");
}

/** Verify an unsubscribe token matches the given email. */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = generateUnsubscribeToken(email);
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

export const unsubscribeRouter = router({
  /**
   * Opt out of marketing emails.
   * Accepts either a signed token (preferred) or a raw email (fallback).
   * Returns success regardless — no enumeration risk.
   */
  optOut: publicProcedure
    .input(
      z.object({
        email: z.string().email().optional(),
        token: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: true };

      // Resolve the email from token or direct input
      let targetEmail: string | null = null;

      if (input.email) {
        // If token provided, verify it matches the email
        if (input.token) {
          if (!verifyUnsubscribeToken(input.email, input.token)) {
            // Invalid token — still return success to avoid enumeration
            return { success: true };
          }
        }
        targetEmail = input.email.toLowerCase().trim();
      }

      if (!targetEmail) return { success: true };

      try {
        await db
          .update(users)
          .set({
            marketingOptOut: true,
            marketingOptOutAt: new Date(),
          })
          .where(eq(users.email, targetEmail));
      } catch {
        // Silently fail — never reveal DB errors to unsubscribe endpoint
      }

      return { success: true };
    }),

  /**
   * Check if an email is opted out (for admin use only).
   */
  checkStatus: publicProcedure
    .input(z.object({ email: z.string().email(), token: z.string() }))
    .query(async ({ input }) => {
      if (!verifyUnsubscribeToken(input.email, input.token)) {
        return { optedOut: false };
      }
      const db = await getDb();
      if (!db) return { optedOut: false };
      const [user] = await db
        .select({ marketingOptOut: users.marketingOptOut })
        .from(users)
        .where(eq(users.email, input.email.toLowerCase().trim()))
        .limit(1);
      return { optedOut: user?.marketingOptOut ?? false };
    }),
});
