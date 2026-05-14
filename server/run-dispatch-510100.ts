/**
 * run-dispatch-510100.ts
 * Manually dispatches pending scenes for job 510100 that the heartbeat missed.
 * Run: npx tsx server/run-dispatch-510100.ts
 */

import "dotenv/config";
import { getDb } from "./db";
import { musicVideoJobs, videoCharacters, musicVideoScenes } from "../drizzle/schema";
import { startSceneRender } from "./music-video-service";
import { eq, and, isNull } from "drizzle-orm";

const JOB_ID = 510100;

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Get job
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, JOB_ID));
  if (!job) throw new Error(`Job ${JOB_ID} not found`);
  console.log(`[Dispatch] Job ${JOB_ID}: ${job.title} — status: ${job.status}`);

  // Get Zara's masterPortraitUrl
  const chars = await db.select().from(videoCharacters).where(eq(videoCharacters.jobId, JOB_ID));
  const zara = chars[0];
  const portraitUrl = zara?.masterPortraitUrl ?? zara?.previewImageUrl ?? undefined;
  console.log(`[Dispatch] Character Lock™ portrait: ${portraitUrl ? portraitUrl.slice(0, 80) + "..." : "NOT SET ❌"}`);

  // Get pending scenes
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, JOB_ID));
  const pending = scenes.filter(s => s.status === "pending" && !s.taskId);
  const generating = scenes.filter(s => s.status === "generating");
  const completed = scenes.filter(s => s.status === "completed");

  console.log(`[Dispatch] Scenes: ${completed.length} completed, ${generating.length} generating, ${pending.length} pending`);

  if (pending.length === 0) {
    console.log(`[Dispatch] No pending scenes — nothing to dispatch.`);
    process.exit(0);
  }

  // Dispatch each pending scene
  for (const scene of pending) {
    try {
      // Build text anchor
      let scenePrompt = scene.prompt ?? "";
      if (zara?.lockedDescription && zara?.name) {
        const anchor = `${zara.name}: ${zara.lockedDescription.slice(0, 150)}. `;
        const MAX = 480;
        const remaining = MAX - anchor.length;
        const trimmed = scenePrompt.length > remaining
          ? scenePrompt.slice(0, remaining).replace(/[,;.\s]+$/, "") + "."
          : scenePrompt;
        scenePrompt = anchor + trimmed;
      }

      const taskId = await startSceneRender(
        scene.id,
        scenePrompt,
        scene.duration ?? 5,
        scene.lipSync ?? true,
        (scene.lipSyncStyle ?? "natural") as "natural" | "expressive" | "subtle" | "dramatic" | "anime",
        "wavespeed" as any,
        (scene.modelAssignment === "hailuo-minimax"
          ? "bytedance/seedance-2.0-fast/text-to-video"
          : "bytedance/seedance-2.0/text-to-video") as any,
        scene.previewImageUrl ?? undefined,
        (job.aspectRatio ?? "16:9") as "16:9" | "9:16" | "1:1",
        job.id,
        portraitUrl,
        job.audioUrl ?? undefined,
        scene.startTime ? scene.startTime / 1000 : undefined
      );

      await db.update(musicVideoScenes)
        .set({ status: "generating", taskId, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, scene.id));

      console.log(`[Dispatch] Scene ${scene.sceneIndex} dispatched → taskId: ${taskId}`);
    } catch (err: any) {
      console.error(`[Dispatch] Scene ${scene.sceneIndex} FAILED: ${err.message}`);
    }
  }

  console.log(`\n✅ Dispatch complete — ${pending.length} scenes submitted.`);
  process.exit(0);
}

main().catch(err => {
  console.error("[Dispatch] FAILED:", err);
  process.exit(1);
});
