/**
 * Admin Credits Router
 * Allows Tim (admin) to search users, view credit balances, adjust credits,
 * and view full transaction history per user.
 */
import { z } from "zod";
import { adminProcedure, router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users, credits, creditTransactions, creditDisputes } from "../../drizzle/schema";
import { eq, like, or, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "../_core/notification";

export const adminCreditsRouter = router({
  /**
   * Search users by name or email for the admin credit panel.
   */
  searchUsers: adminProcedure
    .input(z.object({
      query: z.string().min(1).max(100),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const q = `%${input.query}%`;
      const matchedUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
        })
        .from(users)
        .where(or(like(users.name, q), like(users.email, q)))
        .limit(input.limit);

      // Fetch credit balances for matched users
      const userIds = matchedUsers.map(u => u.id);
      const balances = userIds.length > 0
        ? await db.select().from(credits).where(
            userIds.length === 1
              ? eq(credits.userId, userIds[0])
              : or(...userIds.map(id => eq(credits.userId, id)))
          )
        : [];

      const balanceMap = Object.fromEntries(balances.map(b => [b.userId, b]));

      return matchedUsers.map(u => ({
        ...u,
        creditBalance: balanceMap[u.id]?.balance ?? 0,
        totalEarned: balanceMap[u.id]?.totalEarned ?? 0,
        totalSpent: balanceMap[u.id]?.totalSpent ?? 0,
      }));
    }),

  /**
   * Get a single user's credit summary and recent transaction history.
   */
  getUserCredits: adminProcedure
    .input(z.object({
      userId: z.number().int().positive(),
      historyLimit: z.number().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [userRow] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!userRow) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const [creditRow] = await db.select().from(credits).where(eq(credits.userId, input.userId)).limit(1);

      const history = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, input.userId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(input.historyLimit);

      return {
        user: {
          id: userRow.id,
          name: userRow.name,
          email: userRow.email,
          role: userRow.role,
          createdAt: userRow.createdAt,
          lastSignedIn: userRow.lastSignedIn,
        },
        credits: {
          balance: creditRow?.balance ?? 0,
          totalEarned: creditRow?.totalEarned ?? 0,
          totalSpent: creditRow?.totalSpent ?? 0,
        },
        history,
      };
    }),

  /**
   * Adjust a user's credit balance (add or deduct) with a mandatory reason.
   * Positive amount = add credits. Negative amount = deduct credits.
   */
  adjustCredits: adminProcedure
    .input(z.object({
      userId: z.number().int().positive(),
      amount: z.number().int().refine(n => n !== 0, "Amount cannot be zero"),
      reason: z.string().min(3).max(255),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [userRow] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!userRow) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const [creditRow] = await db.select().from(credits).where(eq(credits.userId, input.userId)).limit(1);
      const currentBalance = creditRow?.balance ?? 0;
      const newBalance = currentBalance + input.amount;

      if (newBalance < 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot deduct ${Math.abs(input.amount)} credits — user only has ${currentBalance}. New balance would be ${newBalance}.`,
        });
      }

      const isGrant = input.amount > 0;
      const txType = isGrant ? "subscription_grant" : "usage";
      const description = `[Admin: ${ctx.user.name ?? ctx.user.id}] ${input.reason}`;

      if (!creditRow) {
        // Create credits record if it doesn't exist
        await db.insert(credits).values({
          userId: input.userId,
          balance: newBalance,
          totalEarned: isGrant ? input.amount : 0,
          totalSpent: isGrant ? 0 : Math.abs(input.amount),
        });
      } else {
        await db.update(credits).set({
          balance: newBalance,
          totalEarned: isGrant ? creditRow.totalEarned + input.amount : creditRow.totalEarned,
          totalSpent: isGrant ? creditRow.totalSpent : creditRow.totalSpent + Math.abs(input.amount),
          updatedAt: new Date(),
        }).where(eq(credits.userId, input.userId));
      }

      await db.insert(creditTransactions).values({
        userId: input.userId,
        amount: input.amount,
        type: txType,
        description,
        createdAt: new Date(),
      });

      return {
        success: true,
        previousBalance: currentBalance,
        newBalance,
        adjustment: input.amount,
        userName: userRow.name ?? userRow.email ?? `User #${input.userId}`,
      };
    }),

  // ─── User: Submit a dispute ───────────────────────────────────────────────
  submitDispute: protectedProcedure
    .input(z.object({
      jobId: z.number().int().optional(),
      jobType: z.enum(["music_video", "short", "lipsync", "image", "other"]).default("music_video"),
      creditsCharged: z.number().int().min(0),
      creditsRequested: z.number().int().min(0).optional(),
      reason: z.string().min(10).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (input.jobId) {
        const [existing] = await db.select().from(creditDisputes)
          .where(and(
            eq(creditDisputes.userId, ctx.user.id),
            eq(creditDisputes.jobId, input.jobId),
            eq(creditDisputes.status, "pending")
          ));
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "You already have an open dispute for this video." });
      }

      await db.insert(creditDisputes).values({
        userId: ctx.user.id,
        jobId: input.jobId ?? null,
        jobType: input.jobType,
        creditsCharged: input.creditsCharged,
        creditsRequested: input.creditsRequested ?? null,
        reason: input.reason,
        status: "pending",
        creditsRefunded: 0,
      });

      await notifyOwner({
        title: `New Credit Dispute — ${ctx.user.name ?? ctx.user.email}`,
        content: `User ${ctx.user.name ?? ctx.user.email} raised a dispute for ${input.creditsCharged} credits.\nReason: ${input.reason.slice(0, 200)}`,
      }).catch(() => {});

      return { success: true };
    }),

  // ─── Admin: List disputes ─────────────────────────────────────────────────
  listDisputes: adminProcedure
    .input(z.object({
      status: z.enum(["pending", "approved", "partial", "rejected", "all"]).default("pending"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db
        .select({ dispute: creditDisputes, userName: users.name, userEmail: users.email })
        .from(creditDisputes)
        .leftJoin(users, eq(users.id, creditDisputes.userId))
        .where(input.status === "all" ? undefined : eq(creditDisputes.status, input.status))
        .orderBy(desc(creditDisputes.createdAt))
        .limit(100);
      return rows;
    }),

  // ─── Admin: Resolve a dispute ─────────────────────────────────────────────
  resolveDispute: adminProcedure
    .input(z.object({
      disputeId: z.number().int(),
      resolution: z.enum(["approved", "partial", "rejected"]),
      creditsToRefund: z.number().int().min(0).max(10000),
      adminNote: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [dispute] = await db.select().from(creditDisputes).where(eq(creditDisputes.id, input.disputeId));
      if (!dispute) throw new TRPCError({ code: "NOT_FOUND", message: "Dispute not found" });
      if (dispute.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Dispute already resolved" });

      if (input.creditsToRefund > 0) {
        const [creditRow] = await db.select().from(credits).where(eq(credits.userId, dispute.userId));
        if (creditRow) {
          await db.update(credits).set({
            balance: creditRow.balance + input.creditsToRefund,
            totalEarned: creditRow.totalEarned + input.creditsToRefund,
            updatedAt: new Date(),
          }).where(eq(credits.userId, dispute.userId));
        }
        await db.insert(creditTransactions).values({
          userId: dispute.userId,
          amount: input.creditsToRefund,
          type: "subscription_grant",
          description: `Dispute #${dispute.id} resolved (${input.resolution}) by admin: ${input.adminNote ?? "no note"}`,
          createdAt: new Date(),
        });
      }

      await db.update(creditDisputes).set({
        status: input.resolution,
        creditsRefunded: input.creditsToRefund,
        adminNote: input.adminNote ?? null,
        resolvedBy: ctx.user.id,
        resolvedAt: new Date(),
      }).where(eq(creditDisputes.id, input.disputeId));

      return { success: true };
    }),
});
