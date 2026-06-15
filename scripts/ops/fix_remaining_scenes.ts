import { pollHeyGenLipSyncV3, submitHeyGenLipSyncV3 } from "./server/ai-apis/heygen-lipsync";
import { storagePut } from "./server/storage";
import { muxAudioIntoVideo, extractSceneAudioClip } from "./server/audio-clip-extractor";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  // Check scenes 7 and 10 (still running)
  const runningTasks = [
    { scene: 7, sceneId: 900032, id: "d0f2dc276a9b448ba0506413bb190380" },
    { scene: 10, sceneId: 900035, id: "599de694c42c4b4289c385dc24fa2851" },
  ];

  for (const t of runningTasks) {
    const result = await pollHeyGenLipSyncV3(t.id);
    console.log(`Scene ${t.scene}: ${result.status} ${result.videoUrl ? "✅ VIDEO_READY" : ""} ${result.error || ""}`);
    if (result.status === "completed" && result.videoUrl) {
      const resp = await fetch(result.videoUrl);
      const buf = Buffer.from(await resp.arrayBuffer());
      const key = `music-video-scenes/${t.sceneId}-heygen-${Date.now()}.mp4`;
      const { url } = await storagePut(key, buf, "video/mp4");
      await conn.execute(
        "UPDATE musicVideoScenes SET lipSyncStatus='done', lipSyncVideoUrl=?, updatedAt=NOW() WHERE id=?",
        [url, t.sceneId]
      );
      console.log(`  ✅ Scene ${t.scene} stored`);
    }
  }

  // Re-submit scenes 1 and 4 (task IDs not found in HeyGen)
  const failedScenes = [
    { scene: 1, sceneId: 900026 },
    { scene: 4, sceneId: 900029 },
  ];

  // Get job audio info
  const [jobRows] = await conn.execute(
    "SELECT audioUrl, stemVocalsUrl, vocalsUrl FROM musicVideoJobs WHERE id=1020003"
  ) as any;
  const job = jobRows[0];
  const audioUrl = job.stemVocalsUrl || job.vocalsUrl || job.audioUrl;
  console.log("Audio URL:", audioUrl?.slice(0, 80));

  for (const t of failedScenes) {
    // Get scene details
    const [sceneRows] = await conn.execute(
      "SELECT videoUrl, startTime, duration FROM musicVideoScenes WHERE id=?",
      [t.sceneId]
    ) as any;
    const scene = sceneRows[0];
    console.log(`\nScene ${t.scene}: videoUrl=${scene.videoUrl?.slice(0, 60)}, start=${scene.startTime}, dur=${scene.duration}`);

    if (!scene.videoUrl) {
      console.log(`  ❌ Scene ${t.scene} has no video URL — skipping`);
      continue;
    }

    // Extract audio clip for this scene
    console.log(`  Extracting audio clip...`);
    const audioClip = await extractSceneAudioClip(audioUrl, scene.startTime, scene.duration, t.sceneId);
    console.log(`  Audio clip: ${audioClip?.slice(0, 80)}`);

    // Mux audio into video
    console.log(`  Muxing audio into video...`);
    const muxedVideoUrl = await muxAudioIntoVideo(scene.videoUrl, audioClip!, t.sceneId);
    console.log(`  Muxed: ${muxedVideoUrl?.slice(0, 80)}`);

    // Submit to HeyGen
    console.log(`  Submitting to HeyGen...`);
    const result = await submitHeyGenLipSyncV3({
      videoUrl: muxedVideoUrl!,
      audioUrl: audioClip!,
      title: `WizAI Scene ${t.sceneId} Job 1020003 Retry2`,
    });
    console.log(`  HeyGen task: ${result.taskId}`);

    // Store task ID
    await conn.execute(
      "UPDATE musicVideoScenes SET lipSyncStatus='processing', lipSyncTaskId=?, updatedAt=NOW() WHERE id=?",
      [`heygen:${result.taskId}`, t.sceneId]
    );
    console.log(`  ✅ Scene ${t.scene} re-submitted: heygen:${result.taskId}`);
  }

  await conn.end();
  console.log("\nDone.");
}
main().catch(e => console.error("FATAL:", e.message));
