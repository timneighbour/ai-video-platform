import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, subscriptions, credits, creditTransactions, projects, apiKeys, showcaseItems } from "../drizzle/schema";
import type { InsertSubscription, InsertProject, InsertApiKey, InsertShowcaseItem } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Subscription queries
 */
export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(subscriptions).values(data);
}

export async function updateSubscription(id: number, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subscriptions).set(data).where(eq(subscriptions.id, id));
}

/**
 * Credit queries
 */
export async function getUserCredits(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(credits).where(eq(credits.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserCredits(userId: number, initialBalance: number = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(credits).values({
    userId,
    balance: initialBalance,
    totalEarned: initialBalance,
    totalSpent: 0,
  });
}

export async function addCredits(userId: number, amount: number, type: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const userCredits = await getUserCredits(userId);
  if (!userCredits) {
    await createUserCredits(userId, amount);
  } else {
    await db
      .update(credits)
      .set({
        balance: userCredits.balance + amount,
        totalEarned: userCredits.totalEarned + amount,
      })
      .where(eq(credits.userId, userId));
  }
  
  await db.insert(creditTransactions).values({
    userId,
    amount,
    type: type as any,
    description,
  });
}

export async function deductCredits(userId: number, amount: number, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const userCredits = await getUserCredits(userId);
  if (!userCredits || userCredits.balance < amount) {
    throw new Error("Insufficient credits");
  }
  
  await db
    .update(credits)
    .set({
      balance: userCredits.balance - amount,
      totalSpent: userCredits.totalSpent + amount,
    })
    .where(eq(credits.userId, userId));
  
  await db.insert(creditTransactions).values({
    userId,
    amount: -amount,
    type: "usage",
    description,
  });
}

/**
 * Project queries
 */
export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projects).where(eq(projects.userId, userId));
}

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values(data);
  return result;
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(data).where(eq(projects.id, id));
}

/**
 * API Key queries
 */
export async function getUserApiKeys(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
}

export async function createApiKey(data: InsertApiKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(apiKeys).values(data);
}

export async function deleteApiKey(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
}

/**
 * Showcase Item queries
 */
export async function listShowcaseItems() {
  const db = await getDb();
  if (!db) return [];
  const { asc } = await import("drizzle-orm");
  return await db
    .select()
    .from(showcaseItems)
    .where(eq(showcaseItems.isActive, true))
    .orderBy(asc(showcaseItems.sortOrder));
}

export async function upsertShowcaseItem(data: InsertShowcaseItem & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.id) {
    await db.update(showcaseItems).set(data).where(eq(showcaseItems.id, data.id));
  } else {
    await db.insert(showcaseItems).values(data);
  }
}

export async function deleteShowcaseItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(showcaseItems).where(eq(showcaseItems.id, id));
}
