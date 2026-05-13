/**
 * Assembly Worker — Background job that picks up orphaned "assembling" jobs.
 *
 * Problem: When the server restarts mid-assembly (e.g. during a deploy or crash),
 * jobs get stuck in "assembling" status permanently because assembly is only triggered
 * via pollProgress (which requires the user to be on the page).
 *
 * Solution: This worker runs every 2 minutes and re-triggers assembly for any job
 * that has been in "assembling" status for more than 16 minutes without a finalVideoUrl.
 *
 * WHY 16 MINUTES:
 * - Sync Labs sync-3 has an 8-minute hard timeout in assembleMusicVideo.
 * - assembleMusicVideo also skips lip sync if assemblyStartedAt is >15 minutes ago.
 * - So by the time this worker fires (16 min), the assembly will skip lip sync and
 *   deliver the cinematic version immediately — no more infinite loops.
 *
 * CRITICAL: Do NOT bump updatedAt on pickup. The music-video-service uses assemblyStartedAt
 * (not updatedAt) to determine if the job is too old to attempt lip sync. Bumping updatedAt
 * was causing the old 3-minute threshold to never trigger — the worker kept the job "fresh"
 * indefinitely, preventing any recovery.
 *
 * Start this worker once at server startup from server/_core/index.ts.
 */
import { assembleMusicVideo } from "./music-video-service";
import { getDb } from "./db";
import { musicVideoJobs, renderJobs } from "../drizzle/schema";
import { and, eq, isNull, lt, desc } from "drizzle-orm";

const WORKER_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const STUCK_THRESHOLD_MINUTES = 16; // Jobs assembling for >16 min without finalVideoUrl
// 16 min > 15 min assembly age limit in music-video-service.ts, so by the time
// the worker re-triggers, the assembly will skip lip sync and deliver immediately.

// Track in-flight assemblies to avoid double-triggering
const inFlightAssemblies = new Set<number>();

async function processOrphanedAssemblyJobs(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const stuckThreshold = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000);

  try {
    // Find jobs stuck in "assembling" with no finalVideoUrl for >16 minutes
    // We check updatedAt — but we no longer bump it on pickup, so it reflects
    // the last genuine update from the assembly process itself.
    const stuckJobs = await db
      .select({
        id: musicVideoJobs.id,
        updatedAt: musicVideoJobs.updatedAt,
        assemblyStartedAt: musicVideoJobs.assemblyStartedAt,
      })
      .from(musicVideoJobs)
      .where(
        and(
          eq(musicVideoJobs.status, "assembling"),
          isNull(musicVideoJobs.finalVideoUrl),
          lt(musicVideoJobs.updatedAt, stuckThreshold)
        )
      )
      .limit(3); // Process at most 3 at a time to avoid overloading

    if (stuckJobs.length === 0) return;

    console.log(`[AssemblyWorker] Found ${stuckJobs.length} orphaned assembling job(s): ${stuckJobs.map((j: { id: number }) => j.id).join(", ")}`);

    for (const job of stuckJobs) {
      if (inFlightAssemblies.has(job.id)) {
        console.log(`[AssemblyWorker] Job ${job.id} already in-flight, skipping`);
        continue;
      }

      inFlightAssemblies.add(job.id);

      // Look up audioTier from the most recent renderJob for this musicVideoJob
      const [latestRenderJob] = await db
        .select({ audioTier: renderJobs.audioTier })
        .from(renderJobs)
        .where(
          and(
            eq(renderJobs.sourceJobId, job.id),
            eq(renderJobs.sourceJobType, "music_video")
          )
        )
        .orderBy(desc(renderJobs.createdAt))
        .limit(1);
      const audioTier = (latestRenderJob?.audioTier ?? "standard") as "standard" | "enhanced" | "cinematic";

      const ageMin = job.assemblyStartedAt
        ? Math.round((Date.now() - new Date(job.assemblyStartedAt).getTime()) / 60000)
        : "unknown";
      console.log(`[AssemblyWorker] Re-triggering assembly for job ${job.id} (tier: ${audioTier}, age: ${ageMin}min)`);

      // Fire-and-forget — don't await so we can process multiple jobs concurrently
      assembleMusicVideo(job.id, audioTier)
        .then(() => {
          console.log(`[AssemblyWorker] ✅ Job ${job.id} assembled successfully`);
        })
        .catch((err) => {
          console.error(`[AssemblyWorker] ❌ Job ${job.id} assembly failed:`, err instanceof Error ? err.message : String(err));
          // Reset updatedAt to a past time so the next worker interval can retry
          getDb().then(db2 => {
            if (!db2) return;
            db2.update(musicVideoJobs)
              .set({ updatedAt: new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000) })
              .where(eq(musicVideoJobs.id, job.id))
              .catch(() => {});
          });
        })
        .finally(() => {
          inFlightAssemblies.delete(job.id);
        });
    }
  } catch (err) {
    console.error("[AssemblyWorker] Error querying orphaned jobs:", err instanceof Error ? err.message : String(err));
  }
}

/**
 * Start the assembly worker background interval.
 * Call this once at server startup from server/_core/index.ts.
 */
export function startAssemblyWorker(): void {
  // Run immediately on startup to catch any jobs orphaned during the last restart
  setTimeout(() => {
    processOrphanedAssemblyJobs().catch(err => {
      console.error("[AssemblyWorker] Initial run failed:", err);
    });
  }, 30_000); // Wait 30s after startup before first run

  // Then run every 2 minutes
  setInterval(() => {
    processOrphanedAssemblyJobs().catch(err => {
      console.error("[AssemblyWorker] Interval run failed:", err);
    });
  }, WORKER_INTERVAL_MS);

  console.log(`[AssemblyWorker] Started — checking every ${WORKER_INTERVAL_MS / 60000} min for orphaned assembly jobs (threshold: ${STUCK_THRESHOLD_MINUTES} min)`);
}
