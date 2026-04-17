/**
 * trimWorker.ts
 * Persistent background worker for audio trimming.
 * Runs independently of tRPC requests — polls the DB for tasks needing trim
 * and processes them one at a time.
 *
 * KEY DESIGN DECISIONS:
 * - Tracks are trimmed SEQUENTIALLY (not in parallel) to avoid race conditions
 *   where concurrent DB writes overwrite each other's results.
 * - A task is considered "done" when ALL tracks have trimmedDuration set.
 * - The worker skips tasks where all tracks are already trimmed.
 */

import { getDb } from "./db";
import { sunoMusicTasks } from "../drizzle/schema";
import { eq, and, isNotNull, desc } from "drizzle-orm";
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

    // Find tasks that are complete, have a targetDuration, and have tracks stored
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

      // Skip if ALL tracks are already trimmed (have trimmedDuration set)
      const allTrimmed = tracks.every((t: any) => t.trimmedDuration != null);
      if (allTrimmed) continue;

      // Skip if no tracks need trimming (no trimming:true flag and no missing trimmedDuration)
      const needsTrim = tracks.some(
        (t: any) => t.trimming === true || (t.audioUrl && !t.trimmedDuration && !t.trimFailed)
      );
      if (!needsTrim) continue;

      console.log(`[TrimWorker] Processing task ${task.id} — trimming ${tracks.length} tracks to ${task.targetDuration}s`);

      try {
        // Process tracks SEQUENTIALLY to avoid concurrent DB write race conditions
        const trimmedTracks: any[] = [];
        for (const track of tracks as any[]) {
          // Skip tracks that are already trimmed
          if (track.trimmedDuration != null) {
            trimmedTracks.push(track);
            continue;
          }

          // Skip tracks with no audio URL
          if (!track.audioUrl && !track.originalUrl) {
            console.warn(`[TrimWorker] Track "${track.title}" has no audioUrl — skipping`);
            trimmedTracks.push({ ...track, trimming: false, trimFailed: true });
            continue;
          }

          // Use originalUrl if available (in case we're retrying after a failed trim)
          const sourceUrl = track.originalUrl ?? track.audioUrl;

          console.log(`[TrimWorker] Trimming "${track.title}" from ${sourceUrl.substring(0, 60)}...`);
          try {
            const trimmedUrl = await trimAudioToLength(sourceUrl, task.targetDuration!, task.userId);
            console.log(`[TrimWorker] Done: ${trimmedUrl.substring(0, 60)}...`);
            trimmedTracks.push({
              ...track,
              audioUrl: trimmedUrl,
              originalUrl: sourceUrl,
              trimmedDuration: task.targetDuration,
              trimming: false,
              trimFailed: false,
            });
          } catch (trackErr: any) {
            console.error(`[TrimWorker] Failed to trim track "${track.title}":`, trackErr?.message ?? trackErr);
            trimmedTracks.push({ ...track, trimming: false, trimFailed: true });
          }
        }

        await db
          .update(sunoMusicTasks)
          .set({ tracks: JSON.stringify(trimmedTracks), updatedAt: new Date() })
          .where(eq(sunoMusicTasks.id, task.id));

        console.log(`[TrimWorker] Task ${task.id} trimmed and saved ✅`);
      } catch (err: any) {
        console.error(`[TrimWorker] Failed to trim task ${task.id}:`, err?.message ?? err);
        // Mark all as failed so we don't retry endlessly
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
  // Trigger immediately
  setImmediate(() => processTrimQueue().catch(console.error));
}
