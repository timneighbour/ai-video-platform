import { pollHeyGenLipSyncV3 } from "./server/ai-apis/heygen-lipsync";
import { storagePut } from "./server/storage";
import mysql from "mysql2/promise";

const tasks = [
  { scene: 1, sceneId: 900026, id: "a074f6223a81454ca7fb06f63b0e5bdf" },
  { scene: 2, sceneId: 900027, id: "f957887f1a034cb4a442ec5f407a7068" },
  { scene: 3, sceneId: 900028, id: "918abe675bff4d1685034fc688b0b484" },
  { scene: 4, sceneId: 900029, id: "9138963e26e94816b7ea962d5e1f392c" },
  { scene: 5, sceneId: 900030, id: "c1097635ae0a44a19ca8be77e9400bc2" },
  { scene: 6, sceneId: 900031, id: "57f1e8926ea44f17ad9ed7eed4eb16fc" },
  { scene: 8, sceneId: 900033, id: "e2523ebba53e45a581bac0fa226b9e38" },
];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  for (const t of tasks) {
    try {
      const result = await pollHeyGenLipSyncV3(t.id);
      console.log(`Scene ${t.scene}: status=${result.status} ${result.error || ""}`);
      
      if (result.status === "completed" && result.videoUrl) {
        // Download and re-upload to S3
        console.log(`  Downloading video for scene ${t.scene}...`);
        const resp = await fetch(result.videoUrl);
        const buf = Buffer.from(await resp.arrayBuffer());
        const key = `music-video-scenes/${t.sceneId}-heygen-${Date.now()}.mp4`;
        const { url } = await storagePut(key, buf, "video/mp4");
        
        await conn.execute(
          "UPDATE musicVideoScenes SET lipSyncStatus='done', lipSyncVideoUrl=?, updatedAt=NOW() WHERE id=?",
          [url, t.sceneId]
        );
        console.log(`  ✅ Scene ${t.scene} stored: ${url.slice(0, 80)}...`);
      } else if (result.status === "failed") {
        console.log(`  ❌ Scene ${t.scene} FAILED: ${result.error}`);
        // Reset to pending for retry
        await conn.execute(
          "UPDATE musicVideoScenes SET lipSyncStatus='pending', lipSyncTaskId=NULL, updatedAt=NOW() WHERE id=?",
          [t.sceneId]
        );
        console.log(`  Reset scene ${t.scene} to pending for retry`);
      }
    } catch (e: any) {
      console.log(`Scene ${t.scene}: ERROR ${e.message}`);
    }
  }
  
  await conn.end();
  console.log("Done.");
}
main();
