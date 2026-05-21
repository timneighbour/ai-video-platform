import { getDb } from "./db";
import { musicVideoScenes } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";

async function main() {
  const db = (await getDb())!;
  const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 660001));
  const sorted = scenes.sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));
  
  // For performance scenes, compare raw vs lip sync
  for (const sceneIdx of [3, 5, 7, 9]) {
    const s = sorted.find(sc => sc.sceneIndex === sceneIdx)!;
    console.log(`\n=== Scene ${sceneIdx} ===`);
    console.log("  videoUrl:", s.videoUrl);
    console.log("  lipSyncVideoUrl:", s.lipSyncVideoUrl);
    
    if (s.videoUrl && s.lipSyncVideoUrl) {
      // Download both and compare
      try {
        execSync(`curl -sL "${s.videoUrl}" -o /tmp/lscheck/raw-${sceneIdx}.mp4 --max-time 30`, { timeout: 35000 });
        const rawSize = execSync(`stat -c%s /tmp/lscheck/raw-${sceneIdx}.mp4`).toString().trim();
        const lsSize = execSync(`stat -c%s /tmp/lscheck/scene${sceneIdx === 7 ? '7' : sceneIdx === 9 ? '9' : 'x'}-ls.mp4 2>/dev/null || echo 0`).toString().trim();
        
        // Download lip sync
        execSync(`curl -sL "${s.lipSyncVideoUrl}" -o /tmp/lscheck/ls-${sceneIdx}.mp4 --max-time 30`, { timeout: 35000 });
        const lsActualSize = execSync(`stat -c%s /tmp/lscheck/ls-${sceneIdx}.mp4`).toString().trim();
        
        console.log(`  Raw size: ${rawSize} bytes`);
        console.log(`  LipSync size: ${lsActualSize} bytes`);
        
        // Compare md5
        const rawMd5 = execSync(`md5sum /tmp/lscheck/raw-${sceneIdx}.mp4`).toString().split(" ")[0];
        const lsMd5 = execSync(`md5sum /tmp/lscheck/ls-${sceneIdx}.mp4`).toString().split(" ")[0];
        console.log(`  Raw md5: ${rawMd5}`);
        console.log(`  LS md5: ${lsMd5}`);
        console.log(`  SAME FILE? ${rawMd5 === lsMd5 ? "YES ❌ SYNCLABS DID NOTHING" : "NO ✅ Files are different"}`);
        
        // Check video properties
        const rawInfo = execSync(`/usr/bin/ffmpeg -i /tmp/lscheck/raw-${sceneIdx}.mp4 2>&1 || true`).toString();
        const lsInfo = execSync(`/usr/bin/ffmpeg -i /tmp/lscheck/ls-${sceneIdx}.mp4 2>&1 || true`).toString();
        const rawDim = rawInfo.match(/(\d{3,4})x(\d{3,4})/);
        const lsDim = lsInfo.match(/(\d{3,4})x(\d{3,4})/);
        const rawFps = rawInfo.match(/([\d.]+)\s*fps/);
        const lsFps = lsInfo.match(/([\d.]+)\s*fps/);
        console.log(`  Raw: ${rawDim?.[0]} @ ${rawFps?.[1]}fps`);
        console.log(`  LS:  ${lsDim?.[0]} @ ${lsFps?.[1]}fps`);
      } catch (e: any) {
        console.log(`  Error: ${e.message}`);
      }
    }
  }
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
