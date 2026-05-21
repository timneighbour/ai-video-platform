import mysql from "mysql2/promise";
import { storagePut } from "./storage";
import { execSync } from "child_process";
import { mkdirSync, writeFileSync, readFileSync } from "fs";

const WORK = "/tmp/final-assembly-v3";
mkdirSync(WORK, { recursive: true });

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);

  // Get ALL scenes from job 660001
  const [allRows] = (await conn.execute(
    "SELECT sceneIndex, sceneType, videoUrl FROM musicVideoScenes WHERE jobId = 660001 ORDER BY sceneIndex"
  )) as any[];

  // Get audio URL
  const [jobRows] = (await conn.execute(
    "SELECT audioUrl FROM musicVideoJobs WHERE id = 660001"
  )) as any[];
  const audioUrl = jobRows[0].audioUrl;
  await conn.end();

  console.log("Job 660001 scene structure:");
  for (const r of allRows) {
    console.log(`  S${r.sceneIndex} (${r.sceneType}): ${(r.videoUrl || "").substring(0, 70)}...`);
  }
  console.log(`Audio: ${audioUrl}\n`);

  // Scene mapping:
  // Cinematic (even): 0, 2, 4, 6, 8, 10 — use videoUrl from DB
  // Performance (odd): 1, 3, 5, 7, 9 — use our new lip sync clips
  //
  // Our canonical pipeline produced lip sync clips for scenes at positions 2,4,6,8
  // (which were the performance scenes in OUR numbering where perf=even)
  // But in the ACTUAL DB, performance scenes are at ODD indices: 1, 3, 5, 7, 9
  //
  // Mapping our canonical lip sync clips to the correct DB positions:
  // canonical S0 (from job 630002) -> DB scene 1 (first performance)
  // canonical lipsync-s2 -> DB scene 3 (second performance)
  // canonical lipsync-s4 -> DB scene 5 (third performance)
  // canonical lipsync-s6 -> DB scene 7 (fourth performance)
  // canonical lipsync-s8 -> DB scene 9 (fifth performance)

  const perfLipSyncUrls: Record<number, string> = {
    1: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/1/music-video/630002/lipsync-630001-1779173997099.mp4",
    3: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-canonical/lipsync-s2-1779295807907.mp4",
    5: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-canonical/lipsync-s4-1779296196177.mp4",
    7: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-canonical/lipsync-s6-1779296447894.mp4",
    9: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-canonical/lipsync-s8-1779296937943.mp4",
  };

  // Build final scene order
  interface SceneEntry {
    idx: number;
    type: string;
    url: string;
  }
  const sceneOrder: SceneEntry[] = [];

  for (const row of allRows) {
    if (row.sceneType === "performance") {
      // Use our lip sync clip
      const lsUrl = perfLipSyncUrls[row.sceneIndex];
      if (lsUrl) {
        sceneOrder.push({ idx: row.sceneIndex, type: "performance", url: lsUrl });
      } else {
        console.log(`  WARNING: No lip sync clip for performance scene ${row.sceneIndex}, using raw`);
        sceneOrder.push({ idx: row.sceneIndex, type: "performance", url: row.videoUrl });
      }
    } else {
      // Cinematic — use the DB URL directly
      sceneOrder.push({ idx: row.sceneIndex, type: "cinematic", url: row.videoUrl });
    }
  }

  console.log(`\nFinal scene order (${sceneOrder.length} scenes):`);
  for (const s of sceneOrder) {
    console.log(`  S${s.idx} (${s.type}): ${s.url.substring(0, 80)}...`);
  }

  // Download all clips
  console.log("\nDownloading clips...");
  let hasErrors = false;
  for (const s of sceneOrder) {
    const outPath = `${WORK}/clip-${s.idx}.mp4`;
    try {
      execSync(`curl -sL "${s.url}" -o "${outPath}"`, { timeout: 60000 });
      const size = readFileSync(outPath).length;
      if (size < 1000) {
        console.log(`  clip-${s.idx}.mp4: ${size} bytes ⚠️ TOO SMALL — URL may be expired`);
        hasErrors = true;
      } else {
        console.log(`  clip-${s.idx}.mp4: ${(size / 1024).toFixed(0)}K ✓`);
      }
    } catch (e: any) {
      console.log(`  ERROR clip-${s.idx}: ${e.message}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.log("\n⚠️ Some clips failed to download. Checking which ones...");
    // Try to continue with what we have
  }

  // Download audio
  const audioPath = `${WORK}/fullmix.mp3`;
  execSync(`curl -sL "${audioUrl}" -o "${audioPath}"`, { timeout: 60000 });
  console.log(`  Audio: ${(readFileSync(audioPath).length / 1024).toFixed(0)}K ✓`);

  // Normalize all clips to 1280x720, 24fps
  console.log("\nNormalizing clips...");
  const validNorms: number[] = [];
  for (const s of sceneOrder) {
    const inPath = `${WORK}/clip-${s.idx}.mp4`;
    const outPath = `${WORK}/norm-${s.idx}.mp4`;

    const inSize = readFileSync(inPath).length;
    if (inSize < 1000) {
      console.log(`  Skipping clip-${s.idx} (too small)`);
      continue;
    }

    let width: number, height: number;
    try {
      const probe = execSync(`ffprobe -v quiet -print_format json -show_streams "${inPath}"`).toString();
      const streams = JSON.parse(probe).streams;
      const video = streams.find((st: any) => st.codec_type === "video");
      width = video.width;
      height = video.height;
    } catch (e: any) {
      console.log(`  ERROR probing clip-${s.idx}: ${e.message}`);
      continue;
    }

    let filter: string;
    if (width === height) {
      // Square (960x960): scale up and centre-crop to fill 1280x720
      filter = "scale=1280:-1,crop=1280:720";
    } else if (Math.abs(width - 1280) < 20 && Math.abs(height - 720) < 20) {
      filter = "scale=1280:720";
    } else {
      filter = "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2";
    }

    try {
      execSync(
        `ffmpeg -y -i "${inPath}" -vf "${filter},fps=24" -c:v libx264 -preset fast -crf 18 -an "${outPath}" 2>/dev/null`,
        { timeout: 60000 }
      );
      const size = readFileSync(outPath).length;
      console.log(`  norm-${s.idx}.mp4: ${(size / 1024).toFixed(0)}K (${width}x${height} -> 1280x720) ✓`);
      validNorms.push(s.idx);
    } catch (e: any) {
      console.log(`  ERROR normalizing clip-${s.idx}: ${e.message}`);
    }
  }

  if (validNorms.length < sceneOrder.length) {
    console.log(`\n⚠️ Only ${validNorms.length}/${sceneOrder.length} clips normalized. Proceeding with available clips.`);
  }

  // Create concat list (only valid clips)
  const concatList = validNorms.map((idx) => `file 'norm-${idx}.mp4'`).join("\n");
  writeFileSync(`${WORK}/concat.txt`, concatList);
  console.log(`\nConcat list (${validNorms.length} clips):\n${concatList}`);

  // Concatenate
  console.log("\nConcatenating...");
  execSync(
    `cd "${WORK}" && ffmpeg -y -f concat -safe 0 -i concat.txt -c:v libx264 -preset fast -crf 18 -an "${WORK}/video-only.mp4" 2>/dev/null`,
    { timeout: 120000 }
  );

  // Get duration
  const probeFinal = execSync(`ffprobe -v quiet -print_format json -show_format "${WORK}/video-only.mp4"`).toString();
  const videoDuration = parseFloat(JSON.parse(probeFinal).format.duration);
  console.log(`Video duration: ${videoDuration.toFixed(2)}s`);

  // Add audio
  console.log("Adding full mix audio...");
  execSync(
    `ffmpeg -y -i "${WORK}/video-only.mp4" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest "${WORK}/final.mp4" 2>/dev/null`,
    { timeout: 120000 }
  );

  const finalSize = readFileSync(`${WORK}/final.mp4`).length;
  console.log(`Final video: ${(finalSize / 1024 / 1024).toFixed(1)}MB`);

  // Upload
  const timestamp = Date.now();
  const { url } = await storagePut(
    `music-videos/final-canonical-v3-${timestamp}.mp4`,
    readFileSync(`${WORK}/final.mp4`),
    "video/mp4"
  );
  console.log(`\n✅ FINAL VIDEO: ${url}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
