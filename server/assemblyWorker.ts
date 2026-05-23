/**
 * Assembly Worker — Background job that runs ALL music-video assemblies.
 *
 * Architecture (updated 2026-05-19):
 * The heartbeat (sceneDispatchHeartbeat.ts) now ONLY sets status='assembling' when all
 * scenes are done. It does NOT call assembleMusicVideo directly. This worker is the SOLE
 * caller of assembleMusicVideo, which means assembly always runs outside any HTTP request
 * lifecycle and is never killed by Cloud Run's 180-second request timeout.
 *
 * Threshold: 2 minutes — the worker picks up newly-queued jobs within 2 minutes of the
 * heartbeat setting status='assembling'. This replaces the old 16-minute orphan-reaper
 * approach with a proactive first-run model.
 *
 * CRITICAL: Do NOT bump updatedAt on pickup. The music-video-service uses assemblyStartedAt
 * (not updatedAt) to determine if the job is too old to attempt lip sync.
 *
 * Start this worker once at server startup from server/_core/index.ts.
 */
import { assembleMusicVideo } from "./music-video-service";
import { getDb } from "./db";
import { musicVideoJobs, musicVideoScenes, renderJobs } from "../drizzle/schema";
import { and, eq, isNull, lt, desc } from "drizzle-orm";

const WORKER_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
// NEW: Use a 2-minute threshold so the worker picks up freshly-queued jobs quickly.
// The heartbeat now only sets status='assembling' and never calls assembleMusicVideo directly.
// The worker is the ONLY thing that calls assembleMusicVideo — this means assembly always
// runs outside any HTTP request lifecycle and is never killed by Cloud Run's 180s timeout.
const STUCK_THRESHOLD_MINUTES = 2; // Pick up jobs assembling for >2 min without finalVideoUrl

// Track in-flight assemblies to avoid double-triggering
const inFlightAssemblies = new Set<number>();

export async function processOrphanedAssemblyJobs(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const stuckThreshold = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000);

  try {
    // Find jobs in "assembling" with no finalVideoUrl for >2 minutes (newly queued or orphaned).
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

      // ── COMPOSITE GUARD ─────────────────────────────────────────────────────
      // PREMIUM POLICY (2026-05-23): Performance scenes MUST have compositeStatus='done'.
      // 'error', 'pending', or 'processing' are not acceptable for performance scenes.
      // Cinematic scenes are expected to be 'skipped'.
      const allScenes = await db
        .select({ compositeStatus: musicVideoScenes.compositeStatus, sceneType: musicVideoScenes.sceneType, lipSync: musicVideoScenes.lipSync })
        .from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, job.id));

      const compositeIncomplete = allScenes.filter((s) => {
        const isPerformance = s.sceneType === "performance" || (s.lipSync ?? false);
        if (isPerformance) {
          // Performance scenes: ONLY 'done' is acceptable — no grey backgrounds, no substitutes
          return s.compositeStatus !== "done";
        } else {
          // Cinematic scenes: only block on pending/processing (skipped is fine)
          return s.compositeStatus === "pending" || s.compositeStatus === "processing";
        }
      });

      if (compositeIncomplete.length > 0) {
        console.log(
          `[AssemblyWorker] Job ${job.id} has ${compositeIncomplete.length} scene(s) not composite-ready — ` +
          `resetting to 'rendering' so heartbeat can complete compositing first`
        );
        await db
          .update(musicVideoJobs)
          .set({ status: "rendering", updatedAt: new Date() })
          .where(eq(musicVideoJobs.id, job.id));
        inFlightAssemblies.delete(job.id);
        continue;
      }
      // ── END COMPOSITE GUARD ─────────────────────────────────────────────────

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

  console.log(`[AssemblyWorker] Started — checking every ${WORKER_INTERVAL_MS / 60000} min for assembling jobs (pickup threshold: ${STUCK_THRESHOLD_MINUTES} min). Worker is the SOLE caller of assembleMusicVideo.`);
}
