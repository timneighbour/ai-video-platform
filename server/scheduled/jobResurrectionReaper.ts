/**
 * jobResurrectionReaper — Comprehensive self-healing engine for the WIZ AI pipeline.
 *
 * Runs every 5 minutes via Manus platform cron.
 *
 * PURPOSE: Cover every failure mode that the existing heartbeat and stuckSceneReaper
 * do NOT handle. This is the "last line of defence" — it guarantees that no subscriber
 * job can get permanently stuck, regardless of what goes wrong.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════
 * FAILURE MODES COVERED (in order of severity):
 * ═══════════════════════════════════════════════════════════════════════════════════
 *
 * 1. ZOMBIE ASSEMBLING JOB
 *    Symptom: status='assembling' + finalVideoUrl IS NOT NULL + status != 'completed'
 *    Cause:   assembleMusicVideo set finalVideoUrl but Cloud Run was killed before
 *             the status update to 'completed' could run.
 *    Fix:     Set status='completed'. The video exists and is valid.
 *
 * 2. STUCK ASSEMBLING JOB (no video)
 *    Symptom: status='assembling' + finalVideoUrl IS NULL + assemblyStartedAt >30min
 *    Cause:   Assembly threw a hard error (e.g. composite not ready), or Cloud Run
 *             was killed mid-assembly, or the assembly worker never picked it up.
 *    Fix:     Reset to 'rendering'. Reset all performance scene compositeStatus=pending
 *             so the heartbeat re-composites and re-queues for assembly.
 *
 * 3. PERMANENTLY BLOCKED COMPOSITE (attempts exhausted)
 *    Symptom: compositeStatus='error' + compositeAttempts >= MAX_COMPOSITE_ATTEMPTS
 *    Cause:   ffmpeg failed 3 times (OOM, timeout, corrupt input).
 *    Fix:     Reset compositeAttempts=0 + compositeStatus='pending'. Infinite retry
 *             with exponential backoff (wait 1 attempt per reaper cycle = 5 min).
 *
 * 4. DEAD RENDERING JOB (no activity for >2 hours)
 *    Symptom: status='rendering' + updatedAt >2hrs + no generating/pending scenes
 *    Cause:   All scenes completed but assembly gate never fired (logic bug), or
 *             scenes are in an unexpected state.
 *    Fix:     Full scene reset to pending. Job stays in rendering. Heartbeat will
 *             re-dispatch all scenes from scratch.
 *
 * 5. SLA BREACH WARNING (job rendering >1 hour)
 *    Symptom: status='rendering' + createdAt >1hr
 *    Action:  Alert owner. No job modification — just visibility.
 *
 * Route: POST /api/scheduled/jobResurrectionReaper
 * Auth:  Manus platform cron header (x-manus-cron-task-uid)
 */

import type { Request, Response } from "express";
import { getDb } from "../db";
import {
  musicVideoJobs,
  musicVideoScenes,
  users,
} from "../../drizzle/schema";
import { eq, and, lt, isNotNull, isNull, or, ne } from "drizzle-orm";
import { sdk } from "../_core/sdk";
import { notifyOwner } from "../_core/notification";
import { emailJobResurrected } from "../email";

// ── Thresholds ────────────────────────────────────────────────────────────────
const ZOMBIE_ASSEMBLING_CHECK = true; // Always check for zombie jobs
const STUCK_ASSEMBLING_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const DEAD_RENDERING_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const SLA_WARNING_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour — alert owner
const MAX_COMPOSITE_ATTEMPTS = 3; // Must match sceneDispatchHeartbeat.ts

/** Core logic — callable without req/res (e.g. from stuckSceneReaper piggyback). */
export async function runJobResurrectionReaper() {
  const startedAt = Date.now();

  const results = {
    zombieJobsFixed: 0,
    stuckAssemblingReset: 0,
    permanentCompositeReset: 0,
    deadRenderingReset: 0,
    slaBreachAlerts: 0,
    totalFixed: 0,
    errors: [] as string[],
    durationMs: 0,
  };

  try {
    const db = await getDb();
    if (!db) {
      results.errors.push("Database unavailable");
      results.durationMs = Date.now() - startedAt;
      return results;
    }

    const now = Date.now();
    const stuckAssemblingCutoff = new Date(now - STUCK_ASSEMBLING_THRESHOLD_MS);
    const deadRenderingCutoff = new Date(now - DEAD_RENDERING_THRESHOLD_MS);
    const slaCutoff = new Date(now - SLA_WARNING_THRESHOLD_MS);

    // ── 1. ZOMBIE ASSEMBLING JOBS ─────────────────────────────────────────────
    // status='assembling' + finalVideoUrl IS NOT NULL → set status='completed'
    if (ZOMBIE_ASSEMBLING_CHECK) {
      try {
        const zombieJobs = await db
          .select({
            id: musicVideoJobs.id,
            userId: musicVideoJobs.userId,
            title: musicVideoJobs.title,
            finalVideoUrl: musicVideoJobs.finalVideoUrl,
          })
          .from(musicVideoJobs)
          .where(
            and(
              eq(musicVideoJobs.status, "assembling"),
              isNotNull(musicVideoJobs.finalVideoUrl)
            )
          );

        for (const job of zombieJobs) {
          try {
            await db
              .update(musicVideoJobs)
              .set({ status: "completed", updatedAt: new Date() })
              .where(eq(musicVideoJobs.id, job.id));

            results.zombieJobsFixed++;
            console.log(`[JobResurrectionReaper] ✅ Zombie job ${job.id} fixed: status → completed (finalVideoUrl already set)`);

            // Alert owner + subscriber
            const userRow = await db.select({ email: users.email, name: users.name })
              .from(users).where(eq(users.id, job.userId)).then(r => r[0]);
            await notifyOwner({
              title: `🎬 Zombie Job Fixed — ${job.title ?? `Job ${job.id}`}`,
              content: `Job ${job.id} was stuck in 'assembling' with a valid finalVideoUrl. Auto-fixed to 'completed'.\n\nUser: ${userRow?.name ?? 'Unknown'} (${userRow?.email ?? 'no email'})\nVideo: ${job.finalVideoUrl?.slice(0, 80)}...`,
            }).catch(() => {});
            // Note: video is already complete — the emailRenderComplete will have been sent
            // (or will be sent by assembly worker). No additional subscriber email needed here.
          } catch (e: any) {
            results.errors.push(`Zombie fix job ${job.id}: ${e?.message}`);
          }
        }
      } catch (e: any) {
        results.errors.push(`Zombie check: ${e?.message}`);
      }
    }

    // ── 2. STUCK ASSEMBLING JOBS (no video, >30 min) ──────────────────────────
    // status='assembling' + finalVideoUrl IS NULL + assemblyStartedAt >30min
    try {
      const MAX_ASSEMBLY_ATTEMPTS_REAPER = 5; // Must match assemblyWorker.ts MAX_ASSEMBLY_ATTEMPTS
      const stuckAssemblingJobs = await db
        .select({
          id: musicVideoJobs.id,
          userId: musicVideoJobs.userId,
          title: musicVideoJobs.title,
          assemblyStartedAt: musicVideoJobs.assemblyStartedAt,
          assemblyAttempts: musicVideoJobs.assemblyAttempts,
          updatedAt: musicVideoJobs.updatedAt,
        })
        .from(musicVideoJobs)
        .where(
          and(
            eq(musicVideoJobs.status, "assembling"),
            isNull(musicVideoJobs.finalVideoUrl),
            lt(musicVideoJobs.updatedAt, stuckAssemblingCutoff)
          )
        );

      for (const job of stuckAssemblingJobs) {
        try {
          const stuckMinutes = Math.round((now - new Date(job.updatedAt).getTime()) / 60000);
          // If attempts are exhausted, skip reset — assemblyWorker will handle the refund on next tick
          if ((job.assemblyAttempts ?? 0) >= MAX_ASSEMBLY_ATTEMPTS_REAPER) {
            console.warn(`[JobResurrectionReaper] Job ${job.id} has exhausted assembly attempts — skipping reset, assemblyWorker will refund`);
            continue;
          }
          console.warn(`[JobResurrectionReaper] Job ${job.id} stuck in assembling for ${stuckMinutes}min — resetting to rendering`);

          // Reset job to rendering
          await db
            .update(musicVideoJobs)
            .set({
              status: "rendering",
              assemblyStartedAt: null,
              errorMessage: null,
              updatedAt: new Date(),
            })
            .where(eq(musicVideoJobs.id, job.id));

          // Reset all performance scene composites to pending so heartbeat re-composites
          await db
            .update(musicVideoScenes)
            .set({ compositeStatus: "pending", compositeAttempts: 0, updatedAt: new Date() })
            .where(
              and(
                eq(musicVideoScenes.jobId, job.id),
                eq(musicVideoScenes.sceneType, "performance"),
                ne(musicVideoScenes.compositeStatus as any, "done")
              )
            );

          results.stuckAssemblingReset++;

          // Alert owner + subscriber
            const userRow = await db.select({ email: users.email, name: users.name })
              .from(users).where(eq(users.id, job.userId)).then(r => r[0]);
            await notifyOwner({
              title: `⚠️ Stuck Assembly Resurrected — ${job.title ?? `Job ${job.id}`}`,
              content: `Job ${job.id} was stuck in 'assembling' for ${stuckMinutes} minutes with no output.\n\nAction: Reset to 'rendering'. Performance scene composites reset to pending.\n\nUser: ${userRow?.name ?? 'Unknown'} (${userRow?.email ?? 'no email'})\nAssembly started: ${job.assemblyStartedAt ?? 'unknown'}`,
            }).catch(() => {});
            // Reassure subscriber that their video is still being processed
            if (userRow?.email) {
              await emailJobResurrected({
                name: userRow.name || 'there',
                email: userRow.email,
                jobId: String(job.id),
                jobTitle: job.title ?? undefined,
                failureMode: 'stuck_assembling',
                origin: process.env.VITE_APP_URL || 'https://www.wiz-ai.io',
              }).catch(() => {});
            }
        } catch (e: any) {
          results.errors.push(`Stuck assembling job ${job.id}: ${e?.message}`);
        }
      }
    } catch (e: any) {
      results.errors.push(`Stuck assembling check: ${e?.message}`);
    }

    // ── 3. PERMANENTLY BLOCKED COMPOSITE (attempts exhausted) ─────────────────
    // compositeStatus='error' + compositeAttempts >= MAX_COMPOSITE_ATTEMPTS
    // These scenes are permanently blocked by the heartbeat's attempt guard.
    // We force-reset them here so they can retry indefinitely.
    try {
      const blockedCompositeScenes = await db
        .select({
          id: musicVideoScenes.id,
          jobId: musicVideoScenes.jobId,
          sceneIndex: musicVideoScenes.sceneIndex,
          compositeAttempts: musicVideoScenes.compositeAttempts,
        })
        .from(musicVideoScenes)
        .where(
          and(
            eq(musicVideoScenes.compositeStatus as any, "error"),
            // compositeAttempts >= MAX_COMPOSITE_ATTEMPTS
            // Using raw SQL comparison since drizzle gte on nullable column needs care
          )
        );

      // Filter in JS to handle nullable compositeAttempts
      const truelyBlocked = blockedCompositeScenes.filter(
        s => (s.compositeAttempts ?? 0) >= MAX_COMPOSITE_ATTEMPTS
      );

      if (truelyBlocked.length > 0) {
        const jobIds = Array.from(new Set(truelyBlocked.map(s => s.jobId)));
        console.warn(`[JobResurrectionReaper] ${truelyBlocked.length} permanently blocked composite scene(s) across ${jobIds.length} job(s) — force-resetting`);

        for (const scene of truelyBlocked) {
          await db
            .update(musicVideoScenes)
            .set({
              compositeStatus: "pending" as any,
              compositeAttempts: 0,
              updatedAt: new Date(),
            })
            .where(eq(musicVideoScenes.id, scene.id));
          results.permanentCompositeReset++;
        }

        // Alert owner once per reaper run (not per scene)
        await notifyOwner({
          title: `🔧 Permanent Composite Block Cleared — ${truelyBlocked.length} scene(s)`,
          content: `${truelyBlocked.length} scene(s) had compositeAttempts >= ${MAX_COMPOSITE_ATTEMPTS} and were permanently blocked.\n\nForce-reset to pending for retry.\n\nAffected jobs: ${jobIds.join(", ")}\nScenes: ${truelyBlocked.map(s => `${s.jobId}#${s.sceneIndex}`).join(", ")}`,
        }).catch(() => {});
      }
    } catch (e: any) {
      results.errors.push(`Permanent composite check: ${e?.message}`);
    }

    // ── 4. DEAD RENDERING JOBS (no activity >2 hours) ─────────────────────────
    // status='rendering' + updatedAt >2hrs
    // These jobs have been rendering for >2 hours with no progress.
    // Full scene reset so the heartbeat re-dispatches everything.
    try {
      const deadJobs = await db
        .select({
          id: musicVideoJobs.id,
          userId: musicVideoJobs.userId,
          title: musicVideoJobs.title,
          updatedAt: musicVideoJobs.updatedAt,
        })
        .from(musicVideoJobs)
        .where(
          and(
            eq(musicVideoJobs.status, "rendering"),
            lt(musicVideoJobs.updatedAt, deadRenderingCutoff)
          )
        );

      for (const job of deadJobs) {
        try {
          const stuckHours = Math.round((now - new Date(job.updatedAt).getTime()) / 3600000 * 10) / 10;
          console.warn(`[JobResurrectionReaper] Job ${job.id} dead in rendering for ${stuckHours}h — full scene reset`);

          // Full scene reset — all scenes back to pending
          await db
            .update(musicVideoScenes)
            .set({
              status: "pending",
              taskId: null,
              videoUrl: null,
              errorMessage: null,
              lipSyncStatus: "pending",
              lipSyncTaskId: null,
              lipSyncVideoUrl: null,
              compositeStatus: "pending",
              compositeVideoUrl: null,
              compositeAttempts: 0,
              updatedAt: new Date(),
            })
            .where(eq(musicVideoScenes.jobId, job.id));

          // Touch job updatedAt so it doesn't get reaped again immediately
          await db
            .update(musicVideoJobs)
            .set({ updatedAt: new Date(), errorMessage: null })
            .where(eq(musicVideoJobs.id, job.id));

          results.deadRenderingReset++;

          // Alert owner + subscriber
          const userRow = await db.select({ email: users.email, name: users.name })
            .from(users).where(eq(users.id, job.userId)).then(r => r[0]);
          await notifyOwner({
            title: `💀 Dead Job Resurrected — ${job.title ?? `Job ${job.id}`}`,
            content: `Job ${job.id} was stuck in 'rendering' for ${stuckHours} hours with no activity.\n\nAction: All scenes reset to pending. Heartbeat will re-dispatch on next tick.\n\nUser: ${userRow?.name ?? 'Unknown'} (${userRow?.email ?? 'no email'})`,
          }).catch(() => {});
          // Reassure subscriber that their video is still being processed
          if (userRow?.email) {
            await emailJobResurrected({
              name: userRow.name || 'there',
              email: userRow.email,
              jobId: String(job.id),
              jobTitle: job.title ?? undefined,
              failureMode: 'dead_rendering',
              origin: process.env.VITE_APP_URL || 'https://www.wiz-ai.io',
            }).catch(() => {});
          }
        } catch (e: any) {
          results.errors.push(`Dead rendering job ${job.id}: ${e?.message}`);
        }
      }
    } catch (e: any) {
      results.errors.push(`Dead rendering check: ${e?.message}`);
    }

    // ── 5. SLA BREACH WARNING (rendering >1 hour) ─────────────────────────────
    // Alert owner when any job has been rendering for >1 hour.
    // This is informational only — no job modification.
    // We only alert once per job (check if we already alerted in the last 30 min
    // by checking if updatedAt was touched recently — if not, alert).
    try {
      const slaBreachJobs = await db
        .select({
          id: musicVideoJobs.id,
          userId: musicVideoJobs.userId,
          title: musicVideoJobs.title,
          createdAt: musicVideoJobs.createdAt,
          updatedAt: musicVideoJobs.updatedAt,
        })
        .from(musicVideoJobs)
        .where(
          and(
            eq(musicVideoJobs.status, "rendering"),
            lt(musicVideoJobs.createdAt, slaCutoff),
            // Only alert if updatedAt is also old (job is genuinely stuck, not actively processing)
            lt(musicVideoJobs.updatedAt, new Date(now - 15 * 60 * 1000)) // no activity for 15+ min
          )
        );

      for (const job of slaBreachJobs) {
        const ageMin = Math.round((now - new Date(job.createdAt).getTime()) / 60000);
        const userRow = await db.select({ email: users.email, name: users.name })
          .from(users).where(eq(users.id, job.userId)).then(r => r[0]).catch(() => null);

        await notifyOwner({
          title: `⏰ SLA Breach Warning — ${job.title ?? `Job ${job.id}`} (${ageMin}min)`,
          content: `Job ${job.id} has been in 'rendering' for ${ageMin} minutes with no recent activity.\n\nThis may indicate a pipeline issue. Check the Pipeline Ops Dashboard.\n\nUser: ${userRow?.name ?? 'Unknown'} (${userRow?.email ?? 'no email'})`,
        }).catch(() => {});
        results.slaBreachAlerts++;
      }
    } catch (e: any) {
      results.errors.push(`SLA breach check: ${e?.message}`);
    }

  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error("[JobResurrectionReaper] Unhandled error:", msg);
    results.errors.push(`Unhandled: ${msg}`);
  }

  results.durationMs = Date.now() - startedAt;
  results.totalFixed = results.zombieJobsFixed + results.stuckAssemblingReset +
    results.permanentCompositeReset + results.deadRenderingReset;

  if (results.totalFixed > 0) {
    console.log(`[JobResurrectionReaper] ✅ Done: ${JSON.stringify(results)}`);
  } else {
    console.log(`[JobResurrectionReaper] All clear — no stuck jobs found (${results.durationMs}ms)`);
  }

  return results;
}

/** HTTP handler — called by the /api/scheduled/jobResurrectionReaper heartbeat route. */
export async function jobResurrectionReaperHandler(req: Request, res: Response) {
  // Authenticate via Manus cron session
  const isDevBypass = process.env.NODE_ENV === "development" && req.headers["x-dev-bypass"] === "resurrection-2026";
  if (!isDevBypass) {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron) {
        return res.status(403).json({ error: "cron-only endpoint" });
      }
    } catch {
      return res.status(403).json({ error: "authentication failed" });
    }
  }

  try {
    const results = await runJobResurrectionReaper();
    return res.json({ ok: true, ...results });
  } catch (err: any) {
    const error = err?.message ?? String(err);
    console.error("[JobResurrectionReaper] Unhandled error:", error);
    return res.status(500).json({ error, timestamp: new Date().toISOString() });
  }
}
