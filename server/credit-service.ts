/**
 * Credit Management Service
 * Handles credit balance, transactions, and deductions
 */

import { getDb } from "./db";
import { credits, creditTransactions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Get user's current credit balance
 */
export async function getUserCredits(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const userCredits = await db
    .select()
    .from(credits)
    .where(eq(credits.userId, userId))
    .limit(1);

  if (!userCredits.length) {
    // Initialize credits for new user — grant 100 free welcome credits
    const WELCOME_CREDITS = 100;
    await db.insert(credits).values({
      userId: userId,
      balance: WELCOME_CREDITS,
      totalEarned: WELCOME_CREDITS,
      totalSpent: 0,
    });
    // Log welcome grant transaction
    await db.insert(creditTransactions).values({
      userId: userId,
      amount: WELCOME_CREDITS,
      type: "subscription_grant",
      description: "Welcome credits — create your first video free",
      createdAt: new Date(),
    });
    return WELCOME_CREDITS;
  }

  return userCredits[0].balance;
}

/**
 * Add credits to user account (from subscription or purchase)
 */
export async function addCredits(
  userId: number,
  amount: number,
  type: "subscription_grant" | "purchase",
  description: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get or create user credits record
  const userCredits = await db
    .select()
    .from(credits)
    .where(eq(credits.userId, userId))
    .limit(1);

  if (!userCredits.length) {
    await db.insert(credits).values({
      userId: userId,
      balance: amount,
      totalEarned: amount,
      totalSpent: 0,
    });
  } else {
    // Update balance
    await db
      .update(credits)
      .set({
        balance: userCredits[0].balance + amount,
        totalEarned: userCredits[0].totalEarned + amount,
        updatedAt: new Date(),
      })
      .where(eq(credits.userId, userId));
  }

  // Log transaction
  await db.insert(creditTransactions).values({
    userId: userId,
    amount: amount,
    type: type,
    description: description,
    createdAt: new Date(),
  });
}

/**
 * Deduct credits from user account (for video generation)
 * Returns true if successful, false if insufficient credits
 */
export async function deductCredits(
  userId: number,
  amount: number,
  description: string,
  projectId?: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get current balance
  const userCredits = await db
    .select()
    .from(credits)
    .where(eq(credits.userId, userId))
    .limit(1);

  if (!userCredits.length) {
    throw new Error("User credits not found");
  }

  const currentBalance = userCredits[0].balance;

  // Check if user has enough credits
  if (currentBalance < amount) {
    return false; // Insufficient credits
  }

  // Deduct credits
  await db
    .update(credits)
    .set({
      balance: currentBalance - amount,
      totalSpent: userCredits[0].totalSpent + amount,
      updatedAt: new Date(),
    })
    .where(eq(credits.userId, userId));

  // Log transaction
  await db.insert(creditTransactions).values({
    userId: userId,
    amount: -amount,
    type: "usage",
    description: description,
    projectId: projectId,
    createdAt: new Date(),
  });

  return true;
}

/**
 * Refund credits to user (if generation fails)
 */
export async function refundCredits(
  userId: number,
  amount: number,
  description: string,
  projectId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const userCredits = await db
    .select()
    .from(credits)
    .where(eq(credits.userId, userId))
    .limit(1);

  if (!userCredits.length) {
    throw new Error("User credits not found");
  }

  // Add credits back
  await db
    .update(credits)
    .set({
      balance: userCredits[0].balance + amount,
      updatedAt: new Date(),
    })
    .where(eq(credits.userId, userId));

  // Log refund transaction
  await db.insert(creditTransactions).values({
    userId: userId,
    amount: amount,
    type: "refund",
    description: description,
    projectId: projectId,
    createdAt: new Date(),
  });
}

/**
 * Reset monthly subscription credits (called on subscription_cycle renewal).
 * Sets monthlyCredits to the plan allowance (discarding unused monthly credits).
 * Top-up credits are preserved in topupCredits and are never reset.
 * The total balance is recalculated as monthlyCredits + topupCredits.
 */
export async function resetMonthlyCredits(
  userId: number,
  planCredits: number,
  planName: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const userCredits = await db
    .select()
    .from(credits)
    .where(eq(credits.userId, userId))
    .limit(1);

  const topupCredits = userCredits.length ? (userCredits[0].topupCredits ?? 0) : 0;
  const newBalance = planCredits + topupCredits;

  if (!userCredits.length) {
    await db.insert(credits).values({
      userId,
      balance: newBalance,
      monthlyCredits: planCredits,
      topupCredits: 0,
      totalEarned: planCredits,
      totalSpent: 0,
    });
  } else {
    await db
      .update(credits)
      .set({
        balance: newBalance,
        monthlyCredits: planCredits,
        totalEarned: userCredits[0].totalEarned + planCredits,
        updatedAt: new Date(),
      })
      .where(eq(credits.userId, userId));
  }

  await db.insert(creditTransactions).values({
    userId,
    amount: planCredits,
    type: "subscription_grant",
    description: `Monthly reset — ${planName} plan (${planCredits} credits)`,
    createdAt: new Date(),
  });
}

/**
 * Get user's credit transaction history
 */
export async function getCreditHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(creditTransactions.createdAt)
    .limit(limit);
}
