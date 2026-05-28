/**
 * Queue Lock Helpers
 * ==================
 * Prevents double-dispatch when multiple heartbeat ticks overlap.
 *
 * Two mechanisms:
 *
 * 1. SKIP LOCKED (row-level)
 *    SELECT ... FOR UPDATE SKIP LOCKED atomically claims a batch of pending scenes.
 *    Any concurrent heartbeat tick that tries to claim the same rows will skip them
 *    rather than blocking. This is the primary guard against duplicate provider submissions.
 *
 * 2. Advisory Locks (job-level)
 *    MySQL GET_LOCK / RELEASE_LOCK provides a named mutex per job.
 *    Used when processing a job's assembly gate to prevent two workers from
 *    simultaneously triggering assembly for the same job.
 *
 * Usage:
 *   // Claim up to 5 pending scenes atomically
 *   const claimed = await claimPendingScenes(db, jobId, 5);
 *
 *   // Acquire job-level advisory lock before assembly
 *   const lock = await acquireJobLock(db, jobId, 10);
 *   if (!lock.acquired) return; // Another worker has this job
 *   try { ... } finally { await releaseJobLock(db, jobId); }
 */

import { sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClaimedScene {
  id: number;
  jobId: number;
  status: string;
  taskId: string | null;
  lipSyncStatus: string | null;
  lipSyncTaskId: string | null;
}

export interface AdvisoryLockResult {
  acquired: boolean;
  lockName: string;
}

// ─── SKIP LOCKED — Scene Claiming ─────────────────────────────────────────────

/**
 * Atomically claim up to `limit` pending scenes for a job using SELECT FOR UPDATE SKIP LOCKED.
 *
 * This prevents two concurrent heartbeat ticks from dispatching the same scene to the provider.
 * The lock is held for the duration of the calling transaction — callers must update the scene
 * status (e.g., to "generating") before the transaction commits to keep the lock meaningful.
 *
 * Note: SKIP LOCKED requires an explicit transaction. This function returns the claimed scene IDs;
 * the caller is responsible for updating their status within the same transaction.
 *
 * @param db - Drizzle DB instance (must support raw SQL via db.execute)
 * @param jobId - The job to claim scenes for
 * @param limit - Maximum number of scenes to claim (default: 3)
 * @returns Array of claimed scene IDs
 */
export async function claimPendingScenes(
  db: any,
  jobId: number,
  limit = 3
): Promise<number[]> {
  try {
    // SELECT FOR UPDATE SKIP LOCKED atomically claims rows without blocking
    // Scenes in status='pending' that have no active taskId are eligible
    const result = await db.execute(
      sql`
        SELECT id FROM musicVideoScenes
        WHERE jobId = ${jobId}
          AND status = 'pending'
          AND taskId IS NULL
        ORDER BY sceneOrder ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `
    );

    // Drizzle mysql2 returns [rows, fields] — extract rows
    const rows = Array.isArray(result) ? result[0] : result?.rows ?? [];
    return (rows as any[]).map((r: any) => Number(r.id));
  } catch (err: any) {
    // SKIP LOCKED is not supported in all MySQL versions — fall back gracefully
    if (err.message?.includes("SKIP LOCKED") || err.code === "ER_PARSE_ERROR") {
      console.warn("[QueueLock] SKIP LOCKED not supported — falling back to unguarded query");
      return [];
    }
    throw err;
  }
}

/**
 * Atomically claim up to `limit` pending lip-sync scenes for a job.
 * Same pattern as claimPendingScenes but targets lipSyncStatus='pending'.
 */
export async function claimPendingLipSyncScenes(
  db: any,
  jobId: number,
  limit = 3
): Promise<number[]> {
  try {
    const result = await db.execute(
      sql`
        SELECT id FROM musicVideoScenes
        WHERE jobId = ${jobId}
          AND lipSyncStatus = 'pending'
          AND lipSyncTaskId IS NULL
          AND status = 'completed'
        ORDER BY sceneOrder ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `
    );

    const rows = Array.isArray(result) ? result[0] : result?.rows ?? [];
    return (rows as any[]).map((r: any) => Number(r.id));
  } catch (err: any) {
    if (err.message?.includes("SKIP LOCKED") || err.code === "ER_PARSE_ERROR") {
      console.warn("[QueueLock] SKIP LOCKED not supported for lip-sync — falling back");
      return [];
    }
    throw err;
  }
}

// ─── Advisory Locks — Job-Level Mutex ─────────────────────────────────────────

/**
 * Acquire a MySQL advisory lock for a specific job.
 * Used to prevent two workers from simultaneously triggering assembly for the same job.
 *
 * MySQL GET_LOCK(name, timeout):
 *   - Returns 1 if the lock was acquired
 *   - Returns 0 if the timeout expired (another worker holds the lock)
 *   - Returns NULL on error
 *
 * @param db - Drizzle DB instance
 * @param jobId - Job ID to lock
 * @param timeoutSeconds - How long to wait for the lock (default: 5s)
 * @returns { acquired: boolean, lockName: string }
 */
export async function acquireJobLock(
  db: any,
  jobId: number,
  timeoutSeconds = 5
): Promise<AdvisoryLockResult> {
  const lockName = `wiz_job_assembly_${jobId}`;
  try {
    const result = await db.execute(
      sql`SELECT GET_LOCK(${lockName}, ${timeoutSeconds}) AS acquired`
    );
    const rows = Array.isArray(result) ? result[0] : result?.rows ?? [];
    const acquired = Number((rows as any[])[0]?.acquired) === 1;
    return { acquired, lockName };
  } catch (err: any) {
    console.warn(`[QueueLock] Advisory lock acquisition failed for job ${jobId}: ${err.message}`);
    return { acquired: false, lockName };
  }
}

/**
 * Release a MySQL advisory lock for a specific job.
 * MUST be called after acquireJobLock, even if processing fails.
 *
 * @param db - Drizzle DB instance
 * @param jobId - Job ID to unlock
 */
export async function releaseJobLock(db: any, jobId: number): Promise<void> {
  const lockName = `wiz_job_assembly_${jobId}`;
  try {
    await db.execute(sql`SELECT RELEASE_LOCK(${lockName})`);
  } catch (err: any) {
    console.warn(`[QueueLock] Advisory lock release failed for job ${jobId}: ${err.message}`);
  }
}

/**
 * Check if a job-level advisory lock is currently held by any connection.
 * Returns true if the lock is free (no holder), false if it is held.
 *
 * @param db - Drizzle DB instance
 * @param jobId - Job ID to check
 */
export async function isJobLockFree(db: any, jobId: number): Promise<boolean> {
  const lockName = `wiz_job_assembly_${jobId}`;
  try {
    const result = await db.execute(
      sql`SELECT IS_FREE_LOCK(${lockName}) AS free`
    );
    const rows = Array.isArray(result) ? result[0] : result?.rows ?? [];
    return Number((rows as any[])[0]?.free) === 1;
  } catch {
    return true; // Assume free on error
  }
}
