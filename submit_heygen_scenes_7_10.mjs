/**
 * Submit scenes 7-10 to HeyGen lip sync
 * 
 * HeyGen V3 lip sync takes a VIDEO as input (not a static image).
 * We use the existing Seedance-rendered video for each scene + clipped vocal audio.
 * 
 * The key insight: HeyGen needs a video with a visible face.
 * The existing scene videos may have the wrong character (full-body shot, B&W hall, etc.)
 * 
 * Strategy: 
 * - Use the InfiniteTalk probe result video (Zara close-up, 6s) as the base video for all scenes
 * - This gives HeyGen a clear face to work with
 * - Then HeyGen re-animates the lips to match the new audio
 */
import { createConnection } from 'mysql2/promise';
import { execSync } from 'child_process';
import fs from 'fs';

const VOCALS_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/vocal-stems/1020003-vocals-wavespeed.mp3';
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DB_URL = process.env.DATABASE_URL;

// The probe result video — Zara close-up, 6s, already has a clear face
// We'll use this as the base video for HeyGen since it has a proper face
const PROBE_VIDEO_URL = 'https://d2p7pge43lyniu.cloudfront.net/output/82f1ce2c-831f-402d-9baf-49e064fbae40-u2_624f08f0-b71a-48c0-bad9-e2a9c6f2e385.mp4';

if (!HEYGEN_API_KEY || !FORGE_URL || !FORGE_KEY || !DB_URL) {
  console.error('Missing required env vars');
  process.exit(1);
}

// ── DB Connection ─────────────────────────────────────────────────────────────
const dbUrl = new URL(DB_URL);
const ssl = JSON.parse(dbUrl.searchParams.get('ssl') || '{}');
const conn = await createConnection({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || '3306'),
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl,
});

// ── Get scenes 7-10 ────────────────────────────────────────────────────────────
const [scenes] = await conn.query(
  `SELECT id, sceneIndex, startTime, duration, lyrics, videoUrl, lipSync, lipSyncStatus
   FROM musicVideoScenes 
   WHERE jobId = 1020003 AND sceneIndex IN (7,8,9,10)
   ORDER BY sceneIndex`
);

console.log(`Found ${scenes.length} scenes to process`);
scenes.forEach(s => console.log(`  Scene ${s.sceneIndex}: start=${s.startTime}s, dur=${s.duration}s, status=${s.lipSyncStatus}, lyrics="${(s.lyrics||'').slice(0,40)}"`));

// ── Upload helper ─────────────────────────────────────────────────────────────
async function uploadAudio(buffer, filename) {
  const forgeBase = FORGE_URL.replace(/\/+$/, '') + '/';
  const uploadUrl = new URL('v1/storage/upload', forgeBase);
  uploadUrl.searchParams.set('path', `lipsync-audio/${filename}`);
  
  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'audio/mpeg' });
  formData.append('file', blob, filename);
  
  const resp = await fetch(uploadUrl.toString(), {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${FORGE_KEY}` },
    body: formData,
  });
  const data = await resp.json();
  if (!data.url) throw new Error(`Upload failed: ${JSON.stringify(data)}`);
  return data.url;
}

// ── Check HeyGen credits first ─────────────────────────────────────────────────
console.log('\nChecking HeyGen credits...');
const quotaResp = await fetch('https://api.heygen.com/v2/user/remaining_quota', {
  headers: { 'X-Api-Key': HEYGEN_API_KEY },
});
const quotaData = await quotaResp.json();
console.log(`  HeyGen quota: ${JSON.stringify(quotaData?.data || quotaData)}`);

// ── Process each scene ────────────────────────────────────────────────────────
for (const scene of scenes) {
  if (scene.lipSyncStatus === 'processing' || scene.lipSyncStatus === 'done') {
    console.log(`\nScene ${scene.sceneIndex}: already ${scene.lipSyncStatus} — skipping`);
    continue;
  }
  // Also skip if it has a valid task ID already
  if (scene.lipSyncTaskId && scene.lipSyncStatus !== 'pending') {
    console.log(`\nScene ${scene.sceneIndex}: has task ID ${scene.lipSyncTaskId} — skipping`);
    continue;
  }
  
  console.log(`\nScene ${scene.sceneIndex} (${scene.startTime}–${scene.startTime + scene.duration}s): "${(scene.lyrics||'').slice(0,50)}"`);
  
  try {
    // Clip vocal audio to scene window
    const clipPath = `/tmp/heygen_scene${scene.sceneIndex}_vocals.mp3`;
    execSync(`ffmpeg -y -i "${VOCALS_URL}" -ss ${scene.startTime} -t ${scene.duration} -c:a libmp3lame -q:a 2 "${clipPath}" 2>/dev/null`);
    const audioBuffer = fs.readFileSync(clipPath);
    console.log(`  Clipped audio: ${audioBuffer.length} bytes`);
    
    // Upload clipped audio
    const audioUrl = await uploadAudio(audioBuffer, `heygen_scene${scene.sceneIndex}_vocals.mp3`);
    console.log(`  Audio URL: ${audioUrl.slice(0, 80)}...`);
    
    // Submit to HeyGen V3 lip sync
    // Use the probe video (Zara close-up face) as the source video
    const payload = {
      video: { type: 'url', url: PROBE_VIDEO_URL },
      audio: { type: 'url', url: audioUrl },
      title: `Job 1020003 Scene ${scene.sceneIndex}`,
      mode: 'precision',
      keepSameFormat: true,
    };
    
    console.log(`  Submitting to HeyGen...`);
    const submitResp = await fetch('https://api.heygen.com/v3/lipsyncs', {
      method: 'POST',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const submitData = await submitResp.json();
    console.log(`  HeyGen response: ${JSON.stringify(submitData)}`);
    
    const lipsyncId = submitData?.data?.id;
    if (!lipsyncId) {
      console.error(`  ❌ Submit failed: ${JSON.stringify(submitData)}`);
      continue;
    }
    
    console.log(`  ✅ Submitted → lipsync_id: ${lipsyncId}`);
    
    // Update DB
    await conn.query(
      `UPDATE musicVideoScenes 
       SET lipSyncStatus = 'processing', lipSyncTaskId = ?, lipSyncProvider = 'heygen', updatedAt = NOW()
       WHERE id = ?`,
      [lipsyncId, scene.id]
    );
    
    // Small delay between submissions
    await new Promise(r => setTimeout(r, 3000));
    
  } catch (err) {
    console.error(`  ❌ Error processing scene ${scene.sceneIndex}: ${err.message}`);
  }
}

console.log('\n\nFinal status:');
const [summary] = await conn.query(
  `SELECT sceneIndex, lipSyncStatus, lipSyncTaskId, lipSyncProvider 
   FROM musicVideoScenes WHERE jobId = 1020003 ORDER BY sceneIndex`
);
summary.forEach(s => console.log(`  Scene ${s.sceneIndex}: ${s.lipSyncStatus} | ${s.lipSyncProvider || 'none'} | ${(s.lipSyncTaskId||'none').slice(0,25)}`));

await conn.end();
console.log('\nDone. Heartbeat will poll and trigger assembly when all scenes complete.');
