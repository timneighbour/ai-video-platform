/**
 * Unified Library Router
 *
 * Aggregates all studio outputs for the current user into a single list:
 *   - WizAudio songs (unlocked tracks from song_downloads)
 *   - Music Videos (completed musicVideoJobs)
 *   - WizAnimate (completed kidsVideoJobs)
 *   - WizImages (completed wizImages)
 *   - WizShorts (completed wizShortsJobs)
 *   - WizScore (completed wizScoreJobs)
 *
 * Each item has a normalised shape so the UI can render a single card grid.
 * Download URLs are S3 public URLs (no signing needed — bucket is public).
 * Song tracks use the redownloadSong procedure for server-side unlock verification.
 */

import { TRPCError } from "@trpc/server";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import {
  musicVideoJobs,
  kidsVideoJobs,
  wizImages,
  wizShortsJobs,
  wizScoreJobs,
  sunoMusicTasks,
  songDownloads,
} from "../../drizzle/schema";

// ─── Normalised Library Item ──────────────────────────────────────────────────

export type LibraryItemType =
  | "song"
  | "music_video"
  | "animation"
  | "image"
  | "short"
  | "score";

export interface LibraryItem {
  /** Unique key for React rendering */
  key: string;
  type: LibraryItemType;
  /** Human-readable studio label */
  studio: string;
  /** Title or prompt snippet */
  title: string;
  /** Thumbnail URL (may be null for audio-only items) */
  thumbnailUrl: string | null;
  /** Direct download URL — null for songs (use redownloadSong procedure) */
  downloadUrl: string | null;
  /** For songs: taskId + trackIndex needed to call redownloadSong */
  songMeta?: { taskId: number; trackIndex: number };
  /** ISO timestamp */
  createdAt: Date;
  /** Status — only "completed" items are included */
  status: string;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const libraryRouter = router({
  /**
   * Return all completed outputs across every studio for the current user.
   * Results are sorted newest-first.
   */
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(100),
      })
    )
    .query(async ({ ctx, input }): Promise<LibraryItem[]> => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userId = ctx.user.id;
      const items: LibraryItem[] = [];

      // ── 1. Unlocked songs (song_downloads → sunoMusicTasks) ──────────────
      const downloads = await db
        .select()
        .from(songDownloads)
        .where(eq(songDownloads.userId, userId))
        .orderBy(desc(songDownloads.createdAt))
        .limit(input.limit);

      if (downloads.length > 0) {
        const taskIds = Array.from(new Set(downloads.map((d) => d.taskId)));
        const tasks = await db
          .select()
          .from(sunoMusicTasks)
          .where(inArray(sunoMusicTasks.id, taskIds));

        const taskMap = new Map(tasks.map((t) => [t.id, t]));

        for (const dl of downloads) {
          const task = taskMap.get(dl.taskId);
          if (!task) continue;

          // Parse tracks to get thumbnail (imageUrl inside tracks JSON)
          let thumbnailUrl: string | null = null;
          try {
            const rawTracks: any[] = task.tracks ? JSON.parse(task.tracks) : [];
            const track = rawTracks[dl.trackIndex];
            thumbnailUrl = track?.imageUrl ?? null;
          } catch {
            // ignore parse errors
          }

          items.push({
            key: `song-${dl.taskId}-${dl.trackIndex}`,
            type: "song",
            studio: "WizAudio",
            title: task.title || task.prompt?.slice(0, 60) || "Untitled Song",
            thumbnailUrl,
            downloadUrl: null, // use redownloadSong procedure
            songMeta: { taskId: dl.taskId, trackIndex: dl.trackIndex },
            createdAt: dl.createdAt,
            status: "completed",
          });
        }
      }

      // ── 2. Music Videos ───────────────────────────────────────────────────
      const mvJobs = await db
        .select({
          id: musicVideoJobs.id,
          title: musicVideoJobs.title,
          finalVideoUrl: musicVideoJobs.finalVideoUrl,
          thumbnailUrl: musicVideoJobs.thumbnailUrl,
          status: musicVideoJobs.status,
          createdAt: musicVideoJobs.createdAt,
        })
        .from(musicVideoJobs)
        .where(eq(musicVideoJobs.userId, userId))
        .orderBy(desc(musicVideoJobs.createdAt))
        .limit(input.limit);

      for (const j of mvJobs) {
        if (!j.finalVideoUrl) continue; // only show completed
        items.push({
          key: `mv-${j.id}`,
          type: "music_video",
          studio: "WizCreate",
          title: j.title || `Music Video #${j.id}`,
          thumbnailUrl: j.thumbnailUrl ?? null,
          downloadUrl: j.finalVideoUrl,
          createdAt: j.createdAt,
          status: j.status ?? "completed",
        });
      }

      // ── 3. WizAnimate (kids videos) ───────────────────────────────────────
      const kidsJobs = await db
        .select({
          id: kidsVideoJobs.id,
          videoUrl: kidsVideoJobs.videoUrl,
          renderStatus: kidsVideoJobs.renderStatus,
          createdAt: kidsVideoJobs.createdAt,
        })
        .from(kidsVideoJobs)
        .where(eq(kidsVideoJobs.userId, userId))
        .orderBy(desc(kidsVideoJobs.createdAt))
        .limit(input.limit);

      for (const j of kidsJobs) {
        if (!j.videoUrl || j.renderStatus !== "completed") continue;
        items.push({
          key: `kids-${j.id}`,
          type: "animation",
          studio: "WizAnimate",
          title: `Animation #${j.id}`,
          thumbnailUrl: null,
          downloadUrl: j.videoUrl,
          createdAt: j.createdAt,
          status: "completed",
        });
      }

      // ── 4. WizImages ──────────────────────────────────────────────────────
      const images = await db
        .select({
          id: wizImages.id,
          prompt: wizImages.prompt,
          imageUrl: wizImages.imageUrl,
          status: wizImages.status,
          createdAt: wizImages.createdAt,
        })
        .from(wizImages)
        .where(eq(wizImages.userId, userId))
        .orderBy(desc(wizImages.createdAt))
        .limit(input.limit);

      for (const img of images) {
        if (!img.imageUrl || img.status !== "completed") continue;
        items.push({
          key: `img-${img.id}`,
          type: "image",
          studio: "WizImages",
          title: img.prompt?.slice(0, 60) || `Image #${img.id}`,
          thumbnailUrl: img.imageUrl,
          downloadUrl: img.imageUrl,
          createdAt: img.createdAt,
          status: "completed",
        });
      }

      // ── 5. WizShorts ──────────────────────────────────────────────────────
      const shorts = await db
        .select({
          id: wizShortsJobs.id,
          topic: wizShortsJobs.topic,
          videoUrl: wizShortsJobs.videoUrl,
          status: wizShortsJobs.status,
          createdAt: wizShortsJobs.createdAt,
        })
        .from(wizShortsJobs)
        .where(eq(wizShortsJobs.userId, userId))
        .orderBy(desc(wizShortsJobs.createdAt))
        .limit(input.limit);

      for (const s of shorts) {
        if (!s.videoUrl || s.status !== "complete") continue;
        items.push({
          key: `short-${s.id}`,
          type: "short",
          studio: "WizShorts",
          title: s.topic?.slice(0, 60) || `Short #${s.id}`,
          thumbnailUrl: null,
          downloadUrl: s.videoUrl,
          createdAt: s.createdAt,
          status: "completed",
        });
      }

      // ── 6. WizScore ───────────────────────────────────────────────────────
      const scores = await db
        .select({
          id: wizScoreJobs.id,
          videoUrl: wizScoreJobs.videoUrl,
          audioUrl: wizScoreJobs.audioUrl,
          status: wizScoreJobs.status,
          createdAt: wizScoreJobs.createdAt,
        })
        .from(wizScoreJobs)
        .where(eq(wizScoreJobs.userId, userId))
        .orderBy(desc(wizScoreJobs.createdAt))
        .limit(input.limit);

      for (const sc of scores) {
        if (!sc.audioUrl || sc.status !== "complete") continue;
        items.push({
          key: `score-${sc.id}`,
          type: "score",
          studio: "WizScore",
          title: `WizScore #${sc.id}`,
          thumbnailUrl: null,
          downloadUrl: sc.audioUrl,
          createdAt: sc.createdAt,
          status: "completed",
        });
      }

      // ── Sort all items newest-first ───────────────────────────────────────
      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return items.slice(0, input.limit);
    }),
});
