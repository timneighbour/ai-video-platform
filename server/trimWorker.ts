/**
 * trimWorker.ts
 * Persistent background worker for audio trimming.
 * Runs independently of tRPC requests — polls the DB for tasks needing trim
 * and processes them one at a time.
 */

import { getDb } from "./db";
import { sunoMusicTasks } from "../drizzle/schema";
import { eq, and, isNotNull, desc, sql } from "drizzle-orm";
import { trimAudioToLength } from "./audioTrim";
import type { SunoTrack } from "./ai-apis/suno";

let workerRunning = false;
let workerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Process one batch of tasks that need trimming.
 */
async function processTrimQueue() {
  if (workerRunning) return; // prevent concurrent runs
  workerRunning = true;

  try {
    const db = await getDb();
    if (!db) return;

    // Find tasks that are complete, have a targetDuration, and haven't been trimmed yet
    // Use a raw SQL condition to find tasks where tracks JSON contains trimming:true
    const tasks = await db
      .select()
      .from(sunoMusicTasks)
      .where(
        and(
          eq(sunoMusicTasks.status, "complete"),
          isNotNull(sunoMusicTasks.targetDuration),
          isNotNull(sunoMusicTasks.tracks)
        )
      )
      .orderBy(desc(sunoMusicTasks.id))
      .limit(20);

    for (const task of tasks) {
      if (!task.tracks || !task.targetDuration) continue;

      let tracks: SunoTrack[] = [];
      try {
        tracks = JSON.parse(task.tracks);
      } catch {
        continue;
      }

      // Check if any track needs trimming (has trimming:true flag)
      const needsTrim = tracks.some((t: any) => t.trimming === true);
      if (!needsTrim) continue;

      console.log(`[TrimWorker] Processing task ${task.id} — trimming ${tracks.length} tracks to ${task.targetDuration}s`);

      try {
        const trimmedTracks = await Promise.all(
          tracks.map(async (track: any) => {
            if (!track.trimming || !track.audioUrl) return track;

            // Use originalUrl if available (in case we're retrying)
            const sourceUrl = track.originalUrl ?? track.audioUrl;

            console.log(`[TrimWorker] Trimming "${track.title}" from ${sourceUrl.substring(0, 60)}...`);
            const trimmedUrl = await trimAudioToLength(sourceUrl, task.targetDuration!, task.userId);
            console.log(`[TrimWorker] Done: ${trimmedUrl.substring(0, 60)}...`);

            return {
              ...track,
              audioUrl: trimmedUrl,
              originalUrl: sourceUrl,
              trimmedDuration: task.targetDuration,
              trimming: false,
              trimFailed: false,
            };
          })
        );

        await db
          .update(sunoMusicTasks)
          .set({ tracks: JSON.stringify(trimmedTracks), updatedAt: new Date() })
          .where(eq(sunoMusicTasks.id, task.id));

        console.log(`[TrimWorker] Task ${task.id} trimmed and saved ✅`);
      } catch (err: any) {
        console.error(`[TrimWorker] Failed to trim task ${task.id}:`, err?.message ?? err);
        // Mark as failed so we don't retry endlessly
        const failedTracks = tracks.map((t: any) => ({ ...t, trimming: false, trimFailed: true }));
        await db
          .update(sunoMusicTasks)
          .set({ tracks: JSON.stringify(failedTracks), updatedAt: new Date() })
          .where(eq(sunoMusicTasks.id, task.id));
      }
    }
  } catch (err: any) {
    console.error("[TrimWorker] Error in processTrimQueue:", err?.message ?? err);
  } finally {
    workerRunning = false;
  }
}

/**
 * Start the background trim worker.
 * Polls every 10 seconds for tasks needing trimming.
 */
export function startTrimWorker() {
  if (workerInterval) return; // already started

  console.log("[TrimWorker] Starting background audio trim worker (10s interval)");
  workerInterval = setInterval(processTrimQueue, 10_000);

  // Also run immediately on startup
  processTrimQueue().catch(console.error);
}

/**
 * Enqueue a task for trimming immediately.
 * Call this right after a task completes to trigger trim ASAP.
 */
export function enqueueTrim(taskId: number) {
  console.log(`[TrimWorker] Enqueued trim for task ${taskId}`);
  // The worker will pick it up on its next cycle (within 10s)
  // Also trigger immediately
  setImmediate(() => processTrimQueue().catch(console.error));
}
