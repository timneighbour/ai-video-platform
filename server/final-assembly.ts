import mysql from "mysql2/promise";
import { storagePut } from './storage';
import { execSync } from 'child_process';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';

const WORK = '/tmp/final-assembly';
mkdirSync(WORK, { recursive: true });

async function main() {
const conn = await mysql.createConnection(process.env.DATABASE_URL!);

// Get cinematic scene URLs from job 660001
const [cinematicRows] = await conn.execute(
  `SELECT sceneIndex, videoUrl FROM musicVideoScenes WHERE jobId = 660001 AND sceneType = 'cinematic' ORDER BY sceneIndex`
) as any[];

console.log('Cinematic scenes from job 660001:');
for (const s of cinematicRows) {
  console.log(`  Scene ${s.sceneIndex}: ${s.videoUrl}`);
}

// Get the full mix audio URL from job 660001
const [jobRows] = await conn.execute(
  `SELECT audioUrl FROM musicVideoJobs WHERE id = 660001`
) as any[];
const audioUrl = jobRows[0].audioUrl;
console.log(`\nFull mix audio: ${audioUrl}`);
await conn.end();

// Performance scene lip sync URLs from the canonical pipeline
const perfLipSyncUrls: Record<number, string> = {
  0: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/1/music-video/630002/lipsync-630001-1779173997099.mp4', // canonical S0
  2: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-canonical/lipsync-s2-1779295807907.mp4',
  4: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-canonical/lipsync-s4-1779296196177.mp4',
  6: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-canonical/lipsync-s6-1779296447894.mp4',
  8: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-canonical/lipsync-s8-1779296937943.mp4',
};

// Build scene order: alternating performance (0,2,4,6,8) and cinematic (1,3,5,7,9,10)
interface SceneEntry { type: string; idx: number; url: string; }
const sceneOrder: SceneEntry[] = [];

for (let i = 0; i <= 10; i++) {
  if (i % 2 === 0 && i <= 8) {
    sceneOrder.push({ type: 'performance', idx: i, url: perfLipSyncUrls[i] });
  } else {
    const cinScene = (cinematicRows as any[]).find((s: any) => s.sceneIndex === i);
    if (cinScene) {
      sceneOrder.push({ type: 'cinematic', idx: i, url: cinScene.videoUrl });
    } else {
      console.log(`  WARNING: No cinematic scene for index ${i}`);
    }
  }
}

console.log(`\nScene order (${sceneOrder.length} scenes):`);
for (const s of sceneOrder) {
  console.log(`  ${s.idx} (${s.type}): ${s.url?.substring(0, 80)}...`);
}

// Download all clips
console.log('\nDownloading clips...');
for (const s of sceneOrder) {
  const outPath = `${WORK}/clip-${s.idx}.mp4`;
  if (!existsSync(outPath) || readFileSync(outPath).length < 1000) {
    try {
      execSync(`curl -sL "${s.url}" -o "${outPath}"`, { timeout: 30000 });
      const size = readFileSync(outPath).length;
      console.log(`  clip-${s.idx}.mp4: ${(size/1024).toFixed(0)}K`);
      if (size < 1000) {
        console.log(`  WARNING: clip-${s.idx} is too small (${size} bytes) - may be an error`);
      }
    } catch (e: any) {
      console.log(`  ERROR downloading clip-${s.idx}: ${e?.message ?? e}`);
    }
  }
}

// Download audio
const audioPath = `${WORK}/fullmix.mp3`;
if (!existsSync(audioPath) || readFileSync(audioPath).length < 1000) {
  execSync(`curl -sL "${audioUrl}" -o "${audioPath}"`, { timeout: 30000 });
}
console.log(`  Audio: ${(readFileSync(audioPath).length/1024).toFixed(0)}K`);

// Normalize all clips to 1280x720, 24fps
// Performance clips are 960x960 — centre-crop to 1280x720 (crop top/bottom)
// Cinematic clips are already 1280x720
console.log('\nNormalizing clips to 1280x720 24fps...');
for (const s of sceneOrder) {
  const inPath = `${WORK}/clip-${s.idx}.mp4`;
  const outPath = `${WORK}/norm-${s.idx}.mp4`;
  
  // Check input resolution
  let width, height;
  try {
    const probe = execSync(`ffprobe -v quiet -print_format json -show_streams "${inPath}"`).toString();
    const streams = JSON.parse(probe).streams;
    const video = streams.find((s: any) => s.codec_type === 'video');
    width = video.width;
    height = video.height;
  } catch (e: any) {
    console.log(`  ERROR probing clip-${s.idx}: ${e?.message ?? e}`);
    continue;
  }
  
  let filter;
  if (width === height) {
    // Square: scale to height 720, then centre-crop width to 1280
    // Actually 960x960 -> scale to 1280x1280 then crop to 1280x720
    filter = `scale=1280:1280:force_original_aspect_ratio=increase,crop=1280:720`;
  } else if (width === 1280 && height === 720) {
    filter = `fps=24`;
  } else {
    filter = `scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2`;
  }
  
  try {
    execSync(`ffmpeg -y -i "${inPath}" -vf "${filter},fps=24" -c:v libx264 -preset fast -crf 18 -an "${outPath}" 2>/dev/null`, { timeout: 30000 });
    const size = readFileSync(outPath).length;
    console.log(`  norm-${s.idx}.mp4: ${(size/1024).toFixed(0)}K (${width}x${height} -> 1280x720)`);
  } catch (e: any) {
    console.log(`  ERROR normalizing clip-${s.idx}: ${e?.message ?? e}`);
  }
}

// Create concat list
const concatList = sceneOrder.map(s => `file 'norm-${s.idx}.mp4'`).join('\n');
writeFileSync(`${WORK}/concat.txt`, concatList);
console.log(`\nConcat list:\n${concatList}`);

// Concatenate all clips
console.log('\nConcatenating...');
execSync(`cd "${WORK}" && ffmpeg -y -f concat -safe 0 -i concat.txt -c:v libx264 -preset fast -crf 18 -an "${WORK}/video-only.mp4" 2>/dev/null`, { timeout: 60000 });

// Get video duration
const probeFinal = execSync(`ffprobe -v quiet -print_format json -show_format "${WORK}/video-only.mp4"`).toString();
const videoDuration = parseFloat(JSON.parse(probeFinal).format.duration);
console.log(`Video duration: ${videoDuration.toFixed(2)}s`);

// Overlay full mix audio, trim to video length
console.log('Adding audio...');
execSync(`ffmpeg -y -i "${WORK}/video-only.mp4" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest "${WORK}/final.mp4" 2>/dev/null`, { timeout: 60000 });

const finalSize = readFileSync(`${WORK}/final.mp4`).length;
console.log(`Final video: ${(finalSize/1024/1024).toFixed(1)}MB`);

// Upload to S3
const timestamp = Date.now();
const { url } = await storagePut(
  `music-videos/final-canonical-${timestamp}.mp4`,
  readFileSync(`${WORK}/final.mp4`),
  'video/mp4'
);
console.log(`\n✅ FINAL VIDEO: ${url}`);

process.exit(0);
}
main().catch(e => { console.error('FATAL:', e); process.exit(1); });
