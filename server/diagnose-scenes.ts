import { getDb } from "./db";
import { musicVideoScenes } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";

async function main() {
  const db = (await getDb())!;
  const scenes = await db.select({
    sceneIndex: musicVideoScenes.sceneIndex,
    videoUrl: musicVideoScenes.videoUrl,
    lipSyncVideoUrl: musicVideoScenes.lipSyncVideoUrl,
    lipSyncStatus: musicVideoScenes.lipSyncStatus,
  }).from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 660001));

  for (const s of scenes.sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0))) {
    const url = s.lipSyncVideoUrl || s.videoUrl || "NONE";
    const source = s.lipSyncVideoUrl ? "LIPSYNC" : "RAW";
    
    // Check video dimensions
    let dims = "unknown";
    try {
      const info = execSync(`/usr/bin/ffmpeg -i "${url}" 2>&1 || true`, { timeout: 15000 }).toString();
      const match = info.match(/(\d{3,4})x(\d{3,4})/);
      if (match) dims = `${match[1]}x${match[2]}`;
    } catch {}
    
    console.log(`Scene ${s.sceneIndex}: ${source} | ${dims} | lipSync=${s.lipSyncStatus} | ${url.slice(0, 90)}`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
