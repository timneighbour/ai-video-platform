/**
 * Poll an existing HeyGen lipsync job and download the result to S3.
 */
import axios from "axios";
import { storagePut } from "../server/storage";
import { pollHeyGenLipSyncV3 } from "../server/ai-apis/heygen-lipsync";

const LIPSYNC_ID = "ba61f7ddcf3c45dabe09327c0bac8efe";
const SCENE_ID = 1140064;

async function main() {
  console.log("Polling HeyGen job:", LIPSYNC_ID);

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    const job = await pollHeyGenLipSyncV3(LIPSYNC_ID);
    console.log(`[${i + 1}] status: ${job.status} | videoUrl: ${job.videoUrl?.slice(0, 80) ?? "—"}`);

    if (job.status === "completed" && job.videoUrl) {
      console.log("\n✅ HeyGen completed. Downloading...");
      const videoResp = await axios.get(job.videoUrl, { responseType: "arraybuffer", timeout: 120000 });
      const videoBuf = Buffer.from(videoResp.data);
      const { url: s3Url } = await storagePut(
        `music-video-scenes/${SCENE_ID}-heygen-lipsync-probe-${Date.now()}.mp4`,
        videoBuf,
        "video/mp4"
      );
      console.log("\n✅ S3 URL:", s3Url);

      // Update DB
      const mysql2 = await import("mysql2/promise");
      const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
      await conn.execute(
        `UPDATE musicVideoScenes SET lipSyncVideoUrl = ?, lipSyncProvider = 'heygen', status = 'lipsync_complete', updatedAt = NOW() WHERE id = ?`,
        [s3Url, SCENE_ID]
      );
      await conn.end();
      console.log("✅ DB updated: lipSyncVideoUrl written to scene", SCENE_ID);
      return;
    }

    if (job.status === "failed") {
      throw new Error(`HeyGen job failed: ${job.failureMessage}`);
    }
  }

  throw new Error("Timed out after 10 minutes");
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
