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
 *
 * MAX RETRY POLICY (added 2026-06-17):
 * Each time the worker picks up a job it increments assemblyAttempts. After 5 failed
 * attempts the job is permanently failed and credits are refunded automatically.
 */
import { assembleMusicVideo } from "./music-video-service";
import { getDb } from "./db";
import { musicVideoJobs, musicVideoScenes, renderJobs, users } from "../drizzle/schema";
import { and, eq, isNull, lt, desc } from "drizzle-orm";
import { refundCredits } from "./credit-service";
import { notifyOwner } from "./_core/notification";

const WORKER_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
// NEW: Use a 2-minute threshold so the worker picks up freshly-queued jobs quickly.
// The heartbeat now only sets status='assembling' and never calls assembleMusicVideo directly.
// The worker is the ONLY thing that calls assembleMusicVideo — this means assembly always
// runs outside any HTTP request lifecycle and is never killed by Cloud Run's 180s timeout.
const STUCK_THRESHOLD_MINUTES = 2; // Pick up jobs assembling for >2 min without finalVideoUrl

/** Maximum number of assembly attempts before permanently failing the job and refunding credits */
const MAX_ASSEMBLY_ATTEMPTS = 5;

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
        userId: musicVideoJobs.userId,
        title: musicVideoJobs.title,
        creditCost: musicVideoJobs.creditCost,
        updatedAt: musicVideoJobs.updatedAt,
        assemblyStartedAt: musicVideoJobs.assemblyStartedAt,
        assemblyAttempts: musicVideoJobs.assemblyAttempts,
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

      // ── MAX RETRY GUARD ────────────────────────────────────────────────────────
      // If this job has already been attempted MAX_ASSEMBLY_ATTEMPTS times, permanently
      // fail it and refund the user's credits rather than retrying indefinitely.
      const currentAttempts = job.assemblyAttempts ?? 0;
      if (currentAttempts >= MAX_ASSEMBLY_ATTEMPTS) {
        console.error(`[AssemblyWorker] Job ${job.id} has exhausted ${MAX_ASSEMBLY_ATTEMPTS} assembly attempts — permanently failing and refunding credits`);
        const db2 = await getDb();
        if (db2) {
          // Mark job as permanently failed
          await db2.update(musicVideoJobs)
            .set({
              status: "failed",
              errorMessage: `Your video could not be assembled after ${MAX_ASSEMBLY_ATTEMPTS} attempts due to a technical issue. Your credits have been refunded — please try again or contact support.`,
              updatedAt: new Date(),
            })
            .where(eq(musicVideoJobs.id, job.id));

          // Refund credits
          if ((job.creditCost ?? 0) > 0) {
            try {
              await refundCredits(
                job.userId,
                job.creditCost,
                `Refund: assembly exhausted ${MAX_ASSEMBLY_ATTEMPTS} attempts — job #${job.id}`,
                job.id
              );
              console.log(`[AssemblyWorker] Refunded ${job.creditCost} credits to user ${job.userId} for job ${job.id}`);
            } catch (refundErr) {
              console.error(`[AssemblyWorker] CRITICAL: Failed to refund credits for job ${job.id}:`, refundErr);
            }
          }

          // Notify owner
          await notifyOwner({
            title: `❌ Assembly Permanently Failed — Job ${job.id}`,
            content: `Job ${job.id} ("${job.title ?? 'untitled'}") failed assembly ${MAX_ASSEMBLY_ATTEMPTS} times and has been permanently failed.\n\nCredits refunded: ${job.creditCost}\nUser ID: ${job.userId}`,
          }).catch(() => {});

          // Send failure email to user
          try {
            const [user] = await db2.select({ name: users.name, email: users.email })
              .from(users).where(eq(users.id, job.userId));
            if (user?.email) {
              const { emailAssemblyFailed } = await import("./email");
              await emailAssemblyFailed({
                name: user.name || "there",
                email: user.email,
                jobId: String(job.id),
                title: job.title || "your music video",
                errorMessage: `Assembly failed after ${MAX_ASSEMBLY_ATTEMPTS} attempts. Your credits have been refunded.`,
              }).catch(() => {});
            }
          } catch (emailErr) {
            console.error(`[AssemblyWorker] Failed to send failure email for job ${job.id}:`, emailErr);
          }
        }
        continue;
      }
      // ── END MAX RETRY GUARD ────────────────────────────────────────────────────

      inFlightAssemblies.add(job.id);

      // ── LIP SYNC GUARD (3-stage pipeline, 2026-05-28) ──────────────────────────────────
      // Compositing removed. Assembly gate is now based on lipSyncStatus only.
      // Performance scenes: lipSyncStatus must be 'done' (InfiniteTalk output = final clip).
      // Cinematic scenes: lipSyncStatus is 'done' immediately (no lip sync needed).
      const allScenes = await db
        .select({ lipSyncStatus: musicVideoScenes.lipSyncStatus, sceneType: musicVideoScenes.sceneType, lipSync: musicVideoScenes.lipSync })
        .from(musicVideoScenes)
        .where(eq(musicVideoScenes.jobId, job.id));

      const lipSyncIncomplete = allScenes.filter((s) => {
        const isPerformance = s.sceneType === "performance" || (s.lipSync ?? false);
        if (isPerformance) {
          // Performance scenes: ONLY 'done' is acceptable — lipSyncVideoUrl IS the final clip
          return s.lipSyncStatus !== "done";
        } else {
          // Cinematic scenes: lipSyncStatus should be 'done' (set immediately after Seedance)
          return s.lipSyncStatus === "processing";
        }
      });

      if (lipSyncIncomplete.length > 0) {
        // MAX-RESET GUARD: increment assemblyAttempts on every lip-sync-guard reset.
        // Without this, a job whose scenes are permanently stuck in lip sync will loop
        // forever (assembling → rendering → assembling → ...) because assemblyAttempts
        // is only incremented when assembly actually fires. By counting resets here too,
        // the existing MAX_ASSEMBLY_ATTEMPTS=5 hard-fail will eventually catch it.
        const resetAttempts = (job.assemblyAttempts ?? 0) + 1;
        if (resetAttempts >= MAX_ASSEMBLY_ATTEMPTS) {
          console.error(
            `[AssemblyWorker] Job ${job.id} has been reset to 'rendering' ${resetAttempts} times ` +
            `due to incomplete lip sync — permanently failing and refunding credits`
          );
          await db.update(musicVideoJobs)
            .set({
              status: "failed",
              assemblyAttempts: resetAttempts,
              errorMessage: `Your video could not complete lip sync after ${MAX_ASSEMBLY_ATTEMPTS} attempts. Your credits have been refunded — please try again or contact support.`,
              updatedAt: new Date(),
            })
            .where(eq(musicVideoJobs.id, job.id));
          if ((job.creditCost ?? 0) > 0) {
            try {
              await refundCredits(
                job.userId,
                job.creditCost,
                `Refund: lip sync loop exhausted ${MAX_ASSEMBLY_ATTEMPTS} resets — job #${job.id}`,
                job.id
              );
            } catch (refundErr) {
              console.error(`[AssemblyWorker] CRITICAL: Failed to refund credits for job ${job.id}:`, refundErr);
            }
          }
          await notifyOwner({
            title: `❌ Lip Sync Loop Hard-Failed — Job ${job.id}`,
            content: `Job ${job.id} ("${job.title ?? 'untitled'}") was reset from assembling→rendering ${MAX_ASSEMBLY_ATTEMPTS} times due to stuck lip sync and has been permanently failed.\n\nCredits refunded: ${job.creditCost}\nUser ID: ${job.userId}\nStuck scenes: ${lipSyncIncomplete.length}`,
          }).catch(() => {});
          inFlightAssemblies.delete(job.id);
          continue;
        }
        console.log(
          `[AssemblyWorker] Job ${job.id} has ${lipSyncIncomplete.length} scene(s) not lip-sync-ready — ` +
          `resetting to 'rendering' so heartbeat can complete lip sync first (reset ${resetAttempts}/${MAX_ASSEMBLY_ATTEMPTS})`
        );
        await db
          .update(musicVideoJobs)
          .set({ status: "rendering", assemblyAttempts: resetAttempts, updatedAt: new Date() })
          .where(eq(musicVideoJobs.id, job.id));
        inFlightAssemblies.delete(job.id);
        continue;
      }
      // ── END LIP SYNC GUARD ──────────────────────────────────────────────────

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

      // Increment attempt counter before firing
      const nextAttempt = currentAttempts + 1;
      await db.update(musicVideoJobs)
        .set({ assemblyAttempts: nextAttempt, updatedAt: new Date() })
        .where(eq(musicVideoJobs.id, job.id));

      console.log(`[AssemblyWorker] Re-triggering assembly for job ${job.id} (tier: ${audioTier}, age: ${ageMin}min, attempt: ${nextAttempt}/${MAX_ASSEMBLY_ATTEMPTS})`);

      // Fire-and-forget — don't await so we can process multiple jobs concurrently
      // Capture userId for failure notification before fire-and-forget
      const jobIdForNotify = job.id;
      assembleMusicVideo(job.id, audioTier)
        .then(() => {
          console.log(`[AssemblyWorker] ✅ Job ${jobIdForNotify} assembled successfully`);
        })
        .catch(async (err) => {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[AssemblyWorker] ❌ Job ${jobIdForNotify} assembly failed (attempt ${nextAttempt}/${MAX_ASSEMBLY_ATTEMPTS}):`, errMsg);
          // Reset updatedAt to a past time so the next worker interval can retry
          const db2 = await getDb();
          if (db2) {
            // ISS-008: Send failure notification email to the user
            try {
              const [failedJob] = await db2.select({ userId: musicVideoJobs.userId, title: musicVideoJobs.title })
                .from(musicVideoJobs).where(eq(musicVideoJobs.id, jobIdForNotify));
              if (failedJob) {
                const [user] = await db2.select({ name: users.name, email: users.email })
                  .from(users).where(eq(users.id, failedJob.userId));
                if (user?.email) {
                  const { emailAssemblyFailed } = await import("./email");
                  await emailAssemblyFailed({
                    name: user.name || "there",
                    email: user.email,
                    jobId: String(jobIdForNotify),
                    title: failedJob.title || "your music video",
                    errorMessage: errMsg,
                  }).catch(() => {});
                }
              }
            } catch (notifyErr) {
              console.error(`[AssemblyWorker] Failed to send failure notification for job ${jobIdForNotify}:`, notifyErr);
            }
            db2.update(musicVideoJobs)
              .set({ updatedAt: new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000) })
              .where(eq(musicVideoJobs.id, jobIdForNotify))
              .catch(() => {});
          }
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

  console.log(`[AssemblyWorker] Started — checking every ${WORKER_INTERVAL_MS / 60000} min for assembling jobs (pickup threshold: ${STUCK_THRESHOLD_MINUTES} min, max attempts: ${MAX_ASSEMBLY_ATTEMPTS}). Worker is the SOLE caller of assembleMusicVideo.`);
}
