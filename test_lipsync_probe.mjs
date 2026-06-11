/**
 * Focused lip sync probe test
 * - Uses Zara's new close-up portrait (face fills frame)
 * - Uses the vocal stem audio clipped to scene 3 (18-24s)
 * - Submits to WaveSpeed InfiniteTalk
 * - Polls until complete and logs the output URL
 */
import { createConnection } from 'mysql2/promise';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const ZARA_CLOSEUP_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/zara_closeup_lipsync-WDFeLxuMWBF4Bykbd4yruG.png';
const VOCALS_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/vocal-stems/1020003-vocals-wavespeed.mp3';
const SCENE_START = 18;  // seconds
const SCENE_DURATION = 6; // seconds
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!WAVESPEED_API_KEY) {
  console.error('WAVESPEED_API_KEY not set');
  process.exit(1);
}

// ── Step 1: Clip the vocal audio to 18-24s ───────────────────────────────────
console.log('Step 1: Clipping vocal audio to scene 3 (18-24s)...');
const clippedAudioPath = '/tmp/probe_scene3_vocals.mp3';
execSync(`ffmpeg -y -i "${VOCALS_URL}" -ss ${SCENE_START} -t ${SCENE_DURATION} -c:a libmp3lame -q:a 2 "${clippedAudioPath}" 2>/dev/null`);
console.log(`  Clipped audio saved: ${clippedAudioPath}`);
const audioStats = fs.statSync(clippedAudioPath);
console.log(`  File size: ${audioStats.size} bytes`);

// ── Step 2: Upload clipped audio to Forge storage ────────────────────────────
console.log('Step 2: Uploading clipped audio to storage...');
const audioBuffer = fs.readFileSync(clippedAudioPath);
const formData = new FormData();
const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
formData.append('file', blob, 'probe_scene3_vocals.mp3');

const forgeBase = FORGE_URL.replace(/\/+$/, '') + '/';
const uploadUrl = new URL('v1/storage/upload', forgeBase);
uploadUrl.searchParams.set('path', 'probe/scene3_vocals.mp3');
const uploadResp = await fetch(uploadUrl.toString(), {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${FORGE_KEY}` },
  body: formData,
});
const uploadData = await uploadResp.json();
if (!uploadData.url) {
  console.error('Upload failed:', JSON.stringify(uploadData));
  process.exit(1);
}
const clippedAudioUrl = uploadData.url;
console.log(`  Uploaded audio URL: ${clippedAudioUrl}`);

// ── Step 3: Submit to WaveSpeed InfiniteTalk ─────────────────────────────────
console.log('Step 3: Submitting to WaveSpeed InfiniteTalk...');
const submitResp = await fetch('https://api.wavespeed.ai/api/v3/wavespeed-ai/infinitetalk', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    image: ZARA_CLOSEUP_URL,
    audio: clippedAudioUrl,
    resolution: '720p',
  }),
});
const submitData = await submitResp.json();
console.log('  Submit response:', JSON.stringify(submitData));

const taskId = submitData?.data?.id;
if (!taskId) {
  console.error('No task ID returned:', JSON.stringify(submitData));
  process.exit(1);
}
console.log(`  Task ID: ${taskId}`);

// ── Step 4: Poll until complete ───────────────────────────────────────────────
console.log('Step 4: Polling for completion...');
const maxWait = 10 * 60 * 1000; // 10 minutes
const interval = 10_000;
const deadline = Date.now() + maxWait;

while (Date.now() < deadline) {
  await new Promise(r => setTimeout(r, interval));
  
  const pollResp = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`, {
    headers: { 'Authorization': `Bearer ${WAVESPEED_API_KEY}` },
  });
  const pollData = await pollResp.json();
  const status = pollData?.data?.status;
  console.log(`  Status: ${status} (${new Date().toISOString()})`);
  
  if (status === 'completed') {
    const outputs = pollData?.data?.outputs;
    const videoUrl = Array.isArray(outputs) ? outputs[0] : outputs?.video ?? outputs;
    console.log('\n✅ LIP SYNC COMPLETE!');
    console.log(`  Output video URL: ${videoUrl}`);
    fs.writeFileSync('/tmp/probe_result.json', JSON.stringify({ taskId, videoUrl, status: 'completed' }, null, 2));
    console.log('  Result saved to /tmp/probe_result.json');
    process.exit(0);
  }
  
  if (status === 'failed') {
    console.error('\n❌ LIP SYNC FAILED:', JSON.stringify(pollData?.data));
    process.exit(1);
  }
}

console.error('Timed out after 10 minutes');
process.exit(1);
