/**
 * Final assembly — canonical pipeline v2
 * All lip sync clips confirmed complete. Just download, normalize, concat, add audio, upload.
 */

import * as fs from "fs";
import { execSync } from "child_process";
import { storagePut } from "./storage";

const WORK = "/tmp/canonical-v2";
const DIR = `${WORK}/assemble2`;
fs.mkdirSync(DIR, { recursive: true });

const log = (msg: string) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(`${WORK}/assemble2.log`, line + "\n");
};

const FULL_MIX = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3";

// Complete scene map — 11 scenes (0–10)
// Even indices = performance (lip-synced), odd = cinematic (raw)
// Note: scene 0 is performance (canonical S0), scene 1 is cinematic, etc.
const SCENE_MAP: Record<number, { url: string; dur: number }> = {
  0: { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/lipsync-630001-1779173997099.mp4", dur: 6 },
  1: { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/1/music-video/660001/scene-0-16x9-1779244504125.mp4", dur: 6 },
  2: { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-canonical/lipsync-s2-1779295807907.mp4", dur: 6 },
  3: { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660003-1779235931604.mp4", dur: 6 },
  4: { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-canonical/lipsync-s4-1779296196177.mp4", dur: 6 },
  5: { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/1/music-video/660001/scene-4-16x9-1779244517785.mp4", dur: 6 },
  6: { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-canonical/lipsync-s6-1779296447894.mp4", dur: 6 },
  7: { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/1/music-video/660001/scene-6-16x9-1779244535307.mp4", dur: 6 },
  8: { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-canonical/lipsync-s8-1779296937943.mp4", dur: 6 },
  9: { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660009-1779235756466.mp4", dur: 6 },
  10: { url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/660011-1779235757413.mp4", dur: 11 },
};

async function download(url: string, dest: string): Promise<void> {
  execSync(`curl -sL "${url}" -o "${dest}"`, { timeout: 120000 });
  const stat = fs.statSync(dest);
  if (stat.size < 1000) {
    const content = fs.readFileSync(dest, "utf8");
    if (content.includes("AccessDenied") || content.includes("Error")) {
      throw new Error(`Download failed for ${url}: ${content.slice(0, 200)}`);
    }
  }
}

async function main() {
  log("=== Final Assembly v2 ===");

  // Download full mix
  log("Downloading full mix...");
  const mixPath = `${WORK}/full-mix.mp3`;
  if (!fs.existsSync(mixPath)) {
    await download(FULL_MIX, mixPath);
  }
  log("Full mix ready");

  // Download all clips
  for (let i = 0; i <= 10; i++) {
    const { url, dur } = SCENE_MAP[i];
    const dest = `${DIR}/clip-${i}.mp4`;
    log(`Downloading scene ${i} (${dur}s)...`);
    await download(url, dest);
    const size = fs.statSync(dest).size;
    log(`  Scene ${i}: ${(size / 1024 / 1024).toFixed(1)}MB`);
  }

  // Normalize all clips to 1280x720 24fps
  log("Normalizing clips...");
  for (let i = 0; i <= 10; i++) {
    const { dur } = SCENE_MAP[i];
    const result = execSync(
      `ffmpeg -y -i "${DIR}/clip-${i}.mp4" ` +
      `-vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" ` +
      `-r 24 -t ${dur} -an -c:v libx264 -preset fast -crf 20 "${DIR}/norm-${i}.mp4" 2>&1 || true`
    ).toString();
    if (!fs.existsSync(`${DIR}/norm-${i}.mp4`) || fs.statSync(`${DIR}/norm-${i}.mp4`).size < 1000) {
      throw new Error(`Normalization failed for scene ${i}: ${result.slice(0, 300)}`);
    }
    log(`  Normalized scene ${i}`);
  }

  // Concat
  log("Concatenating...");
  const concatTxt = `${DIR}/concat.txt`;
  fs.writeFileSync(concatTxt, Array.from({ length: 11 }, (_, i) => `file '${DIR}/norm-${i}.mp4'`).join("\n"));
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatTxt}" -c copy "${DIR}/concat.mp4" 2>&1`);
  const concatDur = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${DIR}/concat.mp4"`).toString().trim();
  log(`Concat done: ${concatDur}s`);

  // Add full mix audio
  log("Adding full mix audio...");
  execSync(
    `ffmpeg -y -i "${DIR}/concat.mp4" -i "${mixPath}" ` +
    `-map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "${DIR}/final.mp4" 2>&1`
  );
  const finalSize = fs.statSync(`${DIR}/final.mp4`).size;
  log(`Final video: ${(finalSize / 1024 / 1024).toFixed(1)}MB`);

  // Upload to S3
  log("Uploading final video...");
  const finalBuf = fs.readFileSync(`${DIR}/final.mp4`);
  const { url } = await storagePut(
    `music-videos/canonical-v2-final-${Date.now()}.mp4`,
    finalBuf,
    "video/mp4"
  );
  log(`✅ FINAL VIDEO: ${url}`);
  console.log(`\n✅ FINAL VIDEO URL:\n${url}\n`);
}

main().catch(e => {
  log(`FATAL: ${e.message}`);
  console.error(e.message);
  process.exit(1);
});
