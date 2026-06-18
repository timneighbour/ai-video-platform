import { eq, and, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql2 from "mysql2/promise";
import { InsertUser, users, subscriptions, credits, creditTransactions, projects, apiKeys, showcaseItems, musicVideoJobs, enhancementJobs, renderJobs, renderBundles, subscriptionRenderAllowances, blogPosts, creators } from "../drizzle/schema";
import type { InsertSubscription, InsertProject, InsertApiKey, InsertShowcaseItem, InsertRenderJob, InsertRenderBundle, RenderJob, InsertBlogPost, BlogPost, Creator, InsertCreator } from "../drizzle/schema";
import { ENV } from './_core/env';

// ISS-025: Use a mysql2 connection pool so concurrent heartbeat ticks and
// API requests don't queue behind a single connection.
let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql2.Pool | null = null;

/** Lazily create the drizzle instance backed by a connection pool. */
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = mysql2.createPool({
        uri: process.env.DATABASE_URL,
        connectionLimit: 10,
        waitForConnections: true,
        queueLimit: 0,
      });
      _db = drizzle(_pool as any);
    } catch (error) {
      console.warn("[Database] Failed to create pool:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

/**
 * Reset the cached DB instance so the next getDb() call re-creates it.
 * Call this when a stale connection error is detected (e.g. ECONNRESET,
 * ETIMEDOUT, or "Failed query" after a long idle period).
 */
export function resetDb() {
  if (_pool) {
    _pool.end().catch(() => {});
    _pool = null;
  }
  _db = null;
}

/**
 * Get a raw mysql2 connection for operations that need guaranteed writes.
 * Caller is responsible for calling conn.end() after use.
 */
export async function getRawConn() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  return mysql2.createConnection(process.env.DATABASE_URL);
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
 * Map DB subscription plan name to products.ts SubscriptionPlan key.
 * The DB uses 'business' for the top tier; products.ts uses 'creator_plus'.
 */
export function mapDbPlanToProductPlan(
  dbPlan: string | null | undefined
): "free" | "starter" | "creator" | "studio" {
  if (!dbPlan) return "free";
  // New plan keys
  if (dbPlan === "studio") return "studio";
  if (dbPlan === "creator") return "creator";
  // Legacy keys mapped forward
  if (dbPlan === "business" || dbPlan === "creator_plus") return "studio";
  if (dbPlan === "pro") return "creator";
  if (dbPlan === "starter") return "starter";
  return "free";
}

/**
 * Count how many music video jobs the user has created this calendar month.
 * Used to enforce plan-based monthly video limits.
 */
export async function countVideosThisMonth(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const rows = await db
    .select({ id: musicVideoJobs.id })
    .from(musicVideoJobs)
    .where(and(eq(musicVideoJobs.userId, userId), gte(musicVideoJobs.createdAt, startOfMonth)));
  return rows.length;
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
  // ISS-006: Use raw connection + explicit transaction to prevent concurrent race conditions.
  // SELECT FOR UPDATE locks the credits row so two concurrent addCredits calls cannot both
  // read the same stale balance and produce an incorrect result.
  const conn = await getRawConn();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      "SELECT id, balance, totalEarned FROM credits WHERE userId = ? FOR UPDATE",
      [userId]
    ) as any;
    if (!rows || rows.length === 0) {
      // First-time credit creation inside the transaction
      await conn.execute(
        "INSERT INTO credits (userId, balance, totalEarned, totalSpent) VALUES (?, ?, ?, 0)",
        [userId, amount, amount]
      );
    } else {
      const row = rows[0];
      await conn.execute(
        "UPDATE credits SET balance = ?, totalEarned = ? WHERE userId = ?",
        [row.balance + amount, row.totalEarned + amount, userId]
      );
    }
    await conn.execute(
      "INSERT INTO creditTransactions (userId, amount, type, description) VALUES (?, ?, ?, ?)",
      [userId, amount, type, description ?? null]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.end();
  }
}

export async function deductCredits(userId: number, amount: number, description?: string) {
  // ISS-006: Use raw connection + explicit transaction to prevent concurrent race conditions.
  // SELECT FOR UPDATE locks the credits row so two concurrent render requests cannot both
  // read the same balance and both succeed when only one has enough credits.
  const conn = await getRawConn();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      "SELECT id, balance, totalSpent FROM credits WHERE userId = ? FOR UPDATE",
      [userId]
    ) as any;
    if (!rows || rows.length === 0 || rows[0].balance < amount) {
      await conn.rollback();
      throw new Error("Insufficient credits");
    }
    const row = rows[0];
    await conn.execute(
      "UPDATE credits SET balance = ?, totalSpent = ? WHERE userId = ?",
      [row.balance - amount, row.totalSpent + amount, userId]
    );
    await conn.execute(
      "INSERT INTO creditTransactions (userId, amount, type, description) VALUES (?, ?, 'usage', ?)",
      [userId, -amount, description ?? null]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.end();
  }
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

// ── Render Job Helpers ──────────────────────────────────────────────────────

/**
 * Get the render allowance for a user's current subscription period.
 * Returns null if no active subscription or no allowance record.
 */
export async function getRenderAllowance(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const rows = await db
    .select()
    .from(subscriptionRenderAllowances)
    .where(
      and(
        eq(subscriptionRenderAllowances.userId, userId),
        gte(subscriptionRenderAllowances.periodEnd, now)
      )
    )
    .limit(1);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get remaining render bundle credits for a user (sum of all active bundles).
 */
export async function getRenderBundleRemaining(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select()
    .from(renderBundles)
    .where(and(eq(renderBundles.userId, userId)));
  return rows.reduce((sum, b) => sum + b.remaining, 0);
}

/**
 * Create a new render job record.
 */
export async function createRenderJob(data: InsertRenderJob): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(renderJobs).values(data);
  return (result[0] as any).insertId as number;
}

/**
 * Update a render job by ID.
 */
export async function updateRenderJob(id: number, data: Partial<RenderJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(renderJobs).set(data as any).where(eq(renderJobs.id, id));
}

/**
 * Get a render job by ID.
 */
export async function getRenderJob(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(renderJobs).where(eq(renderJobs.id, id)).limit(1);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get all render jobs for a user.
 */
export async function getUserRenderJobs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(renderJobs).where(eq(renderJobs.userId, userId));
}

/**
 * Consume one subscription render (increment used count).
 * Returns true if successful, false if no allowance available.
 */
export async function consumeSubscriptionRender(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const allowance = await getRenderAllowance(userId);
  if (!allowance || allowance.used >= allowance.totalAllowed) return false;
  await db
    .update(subscriptionRenderAllowances)
    .set({ used: allowance.used + 1 })
    .where(eq(subscriptionRenderAllowances.id, allowance.id));
  return true;
}

/**
 * Consume one render from a bundle (uses oldest bundle first).
 * Returns true if successful, false if no bundles available.
 */
export async function consumeBundleRender(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const bundles = await db
    .select()
    .from(renderBundles)
    .where(and(eq(renderBundles.userId, userId)));
  const active = bundles.filter((b) => b.remaining > 0).sort((a, b) => a.id - b.id);
  if (active.length === 0) return false;
  const bundle = active[0];
  await db
    .update(renderBundles)
    .set({ remaining: bundle.remaining - 1 })
    .where(eq(renderBundles.id, bundle.id));
  return true;
}

/**
 * Create a render bundle record after successful purchase.
 */
export async function createRenderBundle(data: InsertRenderBundle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(renderBundles).values(data);
}

/**
 * Provision a subscription render allowance for a new billing period.
 * Called from Stripe webhook when subscription is created/renewed.
 */
export async function provisionSubscriptionRenderAllowance(
  userId: number,
  subscriptionId: number,
  totalAllowed: number,
  periodStart: Date,
  periodEnd: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(subscriptionRenderAllowances).values({
    userId,
    subscriptionId,
    totalAllowed,
    used: 0,
    periodStart,
    periodEnd,
  });
}

/**
 * Returns the number of renders a subscription plan includes per month.
 */
export function getRendersForPlan(plan: string): number {
  switch (plan) {
    case "starter": return 5;
    case "creator": return 15;
    case "studio": return 40;
    default: return 0;
  }
}

// ── Blog helpers ──────────────────────────────────────────────────────────────

/** Generate a URL-safe slug from a title */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 200);
}

/** List published blog posts (newest first) */
export async function listPublishedBlogPosts() {
  const db = await getDb();
  if (!db) return [];
  const { desc } = await import("drizzle-orm");
  return db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt));
}

/** List all blog posts for admin (newest first) */
export async function listAllBlogPosts() {
  const db = await getDb();
  if (!db) return [];
  const { desc } = await import("drizzle-orm");
  return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
}

/** Get a single post by slug */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
  return rows[0] ?? null;
}

/** Get a single post by id */
export async function getBlogPostById(id: number): Promise<BlogPost | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Create a new blog post */
export async function createBlogPost(data: InsertBlogPost): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(blogPosts).values(data);
  return (result[0] as any).insertId as number;
}

/** Update a blog post */
export async function updateBlogPost(id: number, data: Partial<InsertBlogPost>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(blogPosts).set(data).where(eq(blogPosts.id, id));
}

/** Delete a blog post */
export async function deleteBlogPost(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
}

// ── Creator Network Helpers ───────────────────────────────────────────────────

/** List approved creators, optionally filtered by type */
export async function listCreators(opts?: {
  type?: Creator["creatorType"];
  featured?: boolean;
  trending?: boolean;
  limit?: number;
}): Promise<Creator[]> {
  const db = await getDb();
  if (!db) return [];
  const { and: _and, eq: _eq, desc } = await import("drizzle-orm");
  const conditions = [_eq(creators.status, "approved")];
  if (opts?.type) conditions.push(_eq(creators.creatorType, opts.type));
  if (opts?.featured) conditions.push(_eq(creators.isFeatured, true));
  if (opts?.trending) conditions.push(_eq(creators.isTrending, true));
  return await db
    .select()
    .from(creators)
    .where(_and(...conditions))
    .orderBy(desc(creators.viewCount))
    .limit(opts?.limit ?? 50);
}

/** Get a single creator by id */
export async function getCreatorById(id: number): Promise<Creator | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const { eq: _eq } = await import("drizzle-orm");
  const rows = await db.select().from(creators).where(_eq(creators.id, id)).limit(1);
  return rows[0];
}

/** Submit a feature request (creates a pending creator record) */
export async function submitCreatorFeatureRequest(data: InsertCreator): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(creators).values({ ...data, status: "pending" });
  return (result[0] as any).insertId as number;
}

/** Admin: approve or reject a creator */
export async function setCreatorStatus(
  id: number,
  status: "approved" | "rejected",
  opts?: { isFeatured?: boolean; isTrending?: boolean }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const { eq: _eq } = await import("drizzle-orm");
  await db
    .update(creators)
    .set({ status, ...(opts ?? {}) })
    .where(_eq(creators.id, id));
}

/** Increment view count for a creator */
export async function incrementCreatorViews(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { eq: _eq, sql: _sql } = await import("drizzle-orm");
  await db
    .update(creators)
    .set({ viewCount: _sql`${creators.viewCount} + 1` })
    .where(_eq(creators.id, id));
}
