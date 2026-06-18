import { getDb } from "./db";
import { musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";

const FFMPEG = "/usr/bin/ffmpeg";
const WORK = "/tmp/vocals-check";

async function main() {
  if (!existsSync(WORK)) mkdirSync(WORK, { recursive: true });
  const db = (await getDb())!;
  const [job] = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 660001));
  
  console.log("audioUrl:", job.audioUrl);
  console.log("vocalsUrl:", job.vocalsUrl);
  console.log("Same?", job.vocalsUrl === job.audioUrl);
  
  if (!job.vocalsUrl) {
    console.log("❌ NO VOCALS URL IN DB — this is the problem!");
    return;
  }
  
  // Download and inspect the vocals file
  console.log("\nDownloading vocals file...");
  execSync(`curl -sL "${job.vocalsUrl}" -o "${WORK}/vocals.mp3"`, { timeout: 30000 });
  
  const info = execSync(`${FFMPEG} -i "${WORK}/vocals.mp3" 2>&1 || true`, { timeout: 10000 }).toString();
  const dur = info.match(/Duration:\s*([\d:\.]+)/);
  console.log("Vocals duration:", dur ? dur[1] : "unknown");
  
  // Check volume at each performance scene timestamp
  for (const [sceneIdx, startSec] of [[1, 6], [3, 18], [5, 30], [7, 42], [9, 54]]) {
    execSync(`${FFMPEG} -y -i "${WORK}/vocals.mp3" -ss ${startSec} -t 6 -c:a libmp3lame "${WORK}/seg-${sceneIdx}.mp3" 2>/dev/null`, { timeout: 10000 });
    const vc = execSync(`${FFMPEG} -i "${WORK}/seg-${sceneIdx}.mp3" -af volumedetect -f null /dev/null 2>&1 || true`).toString();
    const mm = vc.match(/mean_volume:\s*([-\d.]+)/);
    const vol = mm ? parseFloat(mm[1]) : -99;
    console.log(`  Scene ${sceneIdx} (${startSec}-${startSec+6}s): ${vol} dB ${vol > -40 ? "✅ has vocals" : "❌ SILENT"}`);
  }
  
  // Also check full mix for comparison
  console.log("\nDownloading full mix for comparison...");
  execSync(`curl -sL "${job.audioUrl}" -o "${WORK}/fullmix.mp3"`, { timeout: 30000 });
  for (const [sceneIdx, startSec] of [[1, 6], [3, 18], [5, 30], [7, 42], [9, 54]]) {
    execSync(`${FFMPEG} -y -i "${WORK}/fullmix.mp3" -ss ${startSec} -t 6 -c:a libmp3lame "${WORK}/mix-${sceneIdx}.mp3" 2>/dev/null`, { timeout: 10000 });
    const vc = execSync(`${FFMPEG} -i "${WORK}/mix-${sceneIdx}.mp3" -af volumedetect -f null /dev/null 2>&1 || true`).toString();
    const mm = vc.match(/mean_volume:\s*([-\d.]+)/);
    const vol = mm ? parseFloat(mm[1]) : -99;
    console.log(`  Full mix scene ${sceneIdx} (${startSec}-${startSec+6}s): ${vol} dB`);
  }
}

main().catch(err => { console.error("FATAL:", err); process.exit(1); });
