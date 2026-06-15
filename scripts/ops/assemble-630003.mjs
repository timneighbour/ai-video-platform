/**
 * Self-contained assembly script for Job 630003
 * Downloads clips, stitches with ffmpeg, uploads via Forge storage proxy, updates DB
 */
import { execSync, spawnSync } from 'child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createConnection } from 'mysql2/promise';

// Env vars are injected by the webdev runtime

const JOB_ID = 630003;
const WORK_DIR = '/tmp/assembly-630003';
const AUDIO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3';
const CLIPS = [
  'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/hedra-630003-1779174982667.mp4',
  'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/630004-1779201570616.mp4',
];

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, '');
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

console.log('[Assembly] FORGE_URL:', FORGE_URL ? FORGE_URL.slice(0, 50) : 'MISSING');
console.log('[Assembly] FORGE_KEY:', FORGE_KEY ? 'SET' : 'MISSING');

function downloadFile(url, dest) {
  console.log('[Assembly] Downloading', url.slice(0, 80), '...');
  const result = spawnSync('curl', ['-L', '--max-time', '120', '-o', dest, url], { timeout: 130000, encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Download failed: ' + (result.stderr || result.stdout));
  const stat = spawnSync('stat', ['-c', '%s', dest], { encoding: 'utf8' });
  console.log('[Assembly] Downloaded', dest, 'size:', stat.stdout.trim(), 'bytes');
}

async function uploadToForge(filePath, relKey, contentType) {
  const fileBuffer = readFileSync(filePath);
  const uploadUrl = new URL('v1/storage/upload', FORGE_URL + '/');
  uploadUrl.searchParams.set('path', relKey);

  // Build multipart form
  const boundary = '----FormBoundary' + Date.now();
  const filename = relKey.split('/').pop();
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, fileBuffer, footer]);

  console.log('[Assembly] Uploading', filePath, 'to', relKey, '...');
  const response = await fetch(uploadUrl.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FORGE_KEY}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }
  const result = await response.json();
  console.log('[Assembly] Upload result:', JSON.stringify(result).slice(0, 200));
  return result.url;
}

async function main() {
  if (!existsSync(WORK_DIR)) mkdirSync(WORK_DIR, { recursive: true });

  // Download clips
  const clipPaths = [];
  for (let i = 0; i < CLIPS.length; i++) {
    const dest = join(WORK_DIR, `clip${i}.mp4`);
    downloadFile(CLIPS[i], dest);
    clipPaths.push(dest);
  }

  // Download audio
  const audioPath = join(WORK_DIR, 'audio.mp3');
  downloadFile(AUDIO_URL, audioPath);

  // Normalize clips to uniform H.264 720p
  console.log('[Assembly] Normalizing clips...');
  const normPaths = [];
  for (let i = 0; i < clipPaths.length; i++) {
    const norm = join(WORK_DIR, `norm${i}.mp4`);
    const cmd = `ffmpeg -y -i "${clipPaths[i]}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" -c:v libx264 -preset fast -crf 23 -an -r 24 "${norm}" 2>&1`;
    console.log('[Assembly] Normalizing clip', i, '...');
    try {
      execSync(cmd, { timeout: 120000 });
    } catch (e) {
      console.error('[Assembly] Normalize error:', e.stdout?.toString().slice(-500));
      throw e;
    }
    console.log('[Assembly] Normalized clip', i);
    normPaths.push(norm);
  }

  // Create concat list
  const concatList = join(WORK_DIR, 'concat.txt');
  writeFileSync(concatList, normPaths.map(p => `file '${p}'`).join('\n'));

  // Concatenate clips
  const concatPath = join(WORK_DIR, 'concat.mp4');
  console.log('[Assembly] Concatenating', normPaths.length, 'clips...');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${concatPath}" 2>&1`, { timeout: 120000 });
  console.log('[Assembly] Concatenated');

  // Mix audio
  const outputPath = join(WORK_DIR, 'final.mp4');
  console.log('[Assembly] Mixing audio...');
  execSync(`ffmpeg -y -i "${concatPath}" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}" 2>&1`, { timeout: 120000 });
  console.log('[Assembly] Audio mixed');

  // Upload to Forge storage
  const fileKey = `music-video-final/job-${JOB_ID}-${Date.now()}.mp4`;
  const finalVideoUrl = await uploadToForge(outputPath, fileKey, 'video/mp4');
  console.log('[Assembly] Final video URL:', finalVideoUrl);

  // Update DB
  const conn = await createConnection(DATABASE_URL);
  await conn.execute(
    "UPDATE musicVideoJobs SET status = 'completed', finalVideoUrl = ?, finalVideoKey = ?, updatedAt = NOW() WHERE id = ?",
    [finalVideoUrl, fileKey, JOB_ID]
  );
  console.log('[Assembly] DB updated — Job', JOB_ID, 'status=completed');
  await conn.end();

  console.log('[Assembly] ✅ DONE! Final video:', finalVideoUrl);
}

main().catch(err => {
  console.error('[Assembly] FATAL:', err.message);
  process.exit(1);
});
