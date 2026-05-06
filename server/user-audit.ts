/**
 * User Audit Script — run with: npx tsx server/user-audit.ts
 * Queries all user categories for the re-engagement campaign
 */
import { getDb } from "./db";
import { users, subscriptions, credits, topupPurchases, musicVideoJobs, projects } from "../drizzle/schema";
import { eq, sql, count, isNotNull, and, lte, gte, notInArray } from "drizzle-orm";

async function runAudit() {
  const db = await getDb();
  if (!db) { console.error("DB not available"); process.exit(1); }

  // 1. Total registered users
  const [{ total }] = await db.select({ total: count() }).from(users);
  console.log(`\nTotal registered users: ${total}`);

  // 2. Users by role
  const byRole = await db.select({ role: users.role, count: count() }).from(users).groupBy(users.role);
  console.log("By role:", byRole);

  // 3. Active subscribers
  const [{ activeSubs }] = await db.select({ activeSubs: count() }).from(subscriptions).where(eq(subscriptions.status, "active"));
  console.log(`Active subscribers: ${activeSubs}`);

  // 4. Canceled subscribers
  const [{ canceledSubs }] = await db.select({ canceledSubs: count() }).from(subscriptions).where(eq(subscriptions.status, "canceled"));
  console.log(`Canceled subscribers: ${canceledSubs}`);

  // 5. Users who started at least one music video job
  const jobUsers = await db.selectDistinct({ userId: musicVideoJobs.userId }).from(musicVideoJobs);
  console.log(`Users who started a music video job: ${jobUsers.length}`);

  // 6. Users who made a credit top-up
  const [{ topupUsers }] = await db.select({ topupUsers: sql<number>`COUNT(DISTINCT userId)` }).from(topupPurchases);
  console.log(`Users who made a credit top-up: ${topupUsers}`);

  // 7. Subscription plan breakdown
  const subBreakdown = await db
    .select({ plan: subscriptions.plan, status: subscriptions.status, count: count() })
    .from(subscriptions)
    .groupBy(subscriptions.plan, subscriptions.status)
    .orderBy(sql`count(*) DESC`);
  console.log("\nSubscription breakdown:");
  subBreakdown.forEach(r => console.log(`  ${r.plan} / ${r.status}: ${r.count}`));

  // 8. All users with email for campaign
  const allUsers = await db.execute(sql`
    SELECT 
      u.id, u.name, u.email, u.createdAt,
      COALESCE((SELECT COUNT(*) FROM musicVideoJobs WHERE userId = u.id), 0) as jobCount,
      COALESCE((SELECT COUNT(*) FROM topupPurchases WHERE userId = u.id), 0) as purchaseCount,
      (SELECT status FROM subscriptions WHERE userId = u.id ORDER BY createdAt DESC LIMIT 1) as subStatus,
      (SELECT plan FROM subscriptions WHERE userId = u.id ORDER BY createdAt DESC LIMIT 1) as subPlan,
      COALESCE((SELECT balance FROM credits WHERE userId = u.id), 0) as creditBalance
    FROM users u
    WHERE u.email IS NOT NULL AND u.email != ''
    ORDER BY u.createdAt DESC
  `);

  console.log("\n=== ALL USERS FOR CAMPAIGN ===");
  const rows = (allUsers as unknown as any[][])[0] as any[];
  console.log(JSON.stringify(rows, null, 2));

  // Segment counts
  const paid = rows.filter((r: any) => r.purchaseCount > 0 || r.subStatus === "active");
  const rendered = rows.filter((r: any) => r.jobCount > 0);
  const neverRendered = rows.filter((r: any) => r.jobCount === 0);
  const canceled = rows.filter((r: any) => r.subStatus === "canceled");
  const trialOnly = rows.filter((r: any) => r.purchaseCount === 0 && !r.subStatus && r.jobCount === 0);

  console.log("\n=== SEGMENT SUMMARY ===");
  console.log(`Total with email: ${rows.length}`);
  console.log(`Paid (top-up or active sub): ${paid.length}`);
  console.log(`Rendered at least once: ${rendered.length}`);
  console.log(`Never rendered: ${neverRendered.length}`);
  console.log(`Canceled subscribers: ${canceled.length}`);
  console.log(`Trial only (no render, no purchase): ${trialOnly.length}`);

  process.exit(0);
}

runAudit().catch(e => { console.error(e); process.exit(1); });
