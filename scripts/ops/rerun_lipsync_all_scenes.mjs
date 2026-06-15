/**
 * Re-run lip sync for all scenes in job 1020003
 * 
 * Uses Zara's new close-up portrait (face fills frame) instead of the
 * full-body fashion shot that was causing zero lip movement.
 * 
 * Strategy:
 * - Scenes with lyrics (vocal scenes): submit to InfiniteTalk with close-up portrait + clipped vocal audio
 * - Scenes without lyrics (instrumental/cinematic): mark done with original videoUrl
 * - After all scenes are done: trigger assembly
 */
import { createConnection } from 'mysql2/promise';
import { execSync } from 'child_process';
import fs from 'fs';

const ZARA_CLOSEUP_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/zara_closeup_lipsync-WDFeLxuMWBF4Bykbd4yruG.png';
const VOCALS_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/vocal-stems/1020003-vocals-wavespeed.mp3';
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DB_URL = process.env.DATABASE_URL;

if (!WAVESPEED_API_KEY || !FORGE_URL || !FORGE_KEY || !DB_URL) {
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

// ── Get all scenes ─────────────────────────────────────────────────────────────
const [scenes] = await conn.query(
  `SELECT id, sceneIndex, startTime, duration, lyrics, videoUrl, lipSync 
   FROM musicVideoScenes 
   WHERE jobId = 1020003 
   ORDER BY sceneIndex`
);

console.log(`Found ${scenes.length} scenes for job 1020003`);
scenes.forEach(s => console.log(`  Scene ${s.sceneIndex}: start=${s.startTime}s, duration=${s.duration}s, lyrics="${s.lyrics?.slice(0,40) || 'none'}", lipSync=${s.lipSync}`));

// ── Reset all scenes to pending lip sync ──────────────────────────────────────
console.log('\nResetting all scenes lip sync status...');
await conn.query(
  `UPDATE musicVideoScenes 
   SET lipSyncStatus = 'pending', lipSyncTaskId = NULL, lipSyncProvider = NULL, lipSyncVideoUrl = NULL
   WHERE jobId = 1020003`
);
// Also reset job status so assembly won't trigger prematurely
await conn.query(
  `UPDATE musicVideoJobs SET status = 'rendering', finalVideoUrl = NULL, finalVideoKey = NULL WHERE id = 1020003`
);
console.log('Reset complete.');

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

// ── Process each scene ────────────────────────────────────────────────────────
const LIPSYNC_DELAY_MS = 2000; // 2s between submissions to avoid rate limiting

for (const scene of scenes) {
  const hasLyrics = scene.lyrics && scene.lyrics.trim().length > 3;
  
  if (!hasLyrics || !scene.lipSync) {
    // No vocals / lip sync disabled — mark done with original video
    console.log(`\nScene ${scene.sceneIndex}: No lyrics/lipSync disabled — marking done with original video`);
    await conn.query(
      `UPDATE musicVideoScenes 
       SET lipSyncStatus = 'done', lipSyncVideoUrl = videoUrl, updatedAt = NOW()
       WHERE id = ?`,
      [scene.id]
    );
    continue;
  }
  
  // Check if original video exists
  if (!scene.videoUrl) {
    console.log(`\nScene ${scene.sceneIndex}: No videoUrl — skipping`);
    continue;
  }
  
  console.log(`\nScene ${scene.sceneIndex} (${scene.startTime}–${scene.startTime + scene.duration}s): "${scene.lyrics?.slice(0,50)}"`);
  
  try {
    // Clip vocal audio to scene window
    const clipPath = `/tmp/scene${scene.sceneIndex}_vocals.mp3`;
    execSync(`ffmpeg -y -i "${VOCALS_URL}" -ss ${scene.startTime} -t ${scene.duration} -c:a libmp3lame -q:a 2 "${clipPath}" 2>/dev/null`);
    const audioBuffer = fs.readFileSync(clipPath);
    console.log(`  Clipped audio: ${audioBuffer.length} bytes`);
    
    // Upload clipped audio
    const audioUrl = await uploadAudio(audioBuffer, `scene${scene.sceneIndex}_vocals.mp3`);
    console.log(`  Audio URL: ${audioUrl.slice(0, 80)}...`);
    
    // Submit to InfiniteTalk
    const submitResp = await fetch('https://api.wavespeed.ai/api/v3/wavespeed-ai/infinitetalk', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: ZARA_CLOSEUP_URL,
        audio: audioUrl,
        resolution: '720p',
      }),
    });
    const submitData = await submitResp.json();
    const taskId = submitData?.data?.id;
    
    if (!taskId) {
      console.error(`  ❌ Submit failed: ${JSON.stringify(submitData)}`);
      continue;
    }
    
    console.log(`  ✅ Submitted → task ${taskId}`);
    
    // Update DB
    await conn.query(
      `UPDATE musicVideoScenes 
       SET lipSyncStatus = 'processing', lipSyncTaskId = ?, lipSyncProvider = 'infinitetalk', updatedAt = NOW()
       WHERE id = ?`,
      [taskId, scene.id]
    );
    
    // Small delay between submissions
    await new Promise(r => setTimeout(r, LIPSYNC_DELAY_MS));
    
  } catch (err) {
    console.error(`  ❌ Error processing scene ${scene.sceneIndex}: ${err.message}`);
  }
}

console.log('\n\nAll scenes submitted. Summary:');
const [summary] = await conn.query(
  `SELECT sceneIndex, lipSyncStatus, lipSyncTaskId, lipSyncProvider 
   FROM musicVideoScenes WHERE jobId = 1020003 ORDER BY sceneIndex`
);
summary.forEach(s => console.log(`  Scene ${s.sceneIndex}: ${s.lipSyncStatus} | ${s.lipSyncProvider || 'none'} | ${s.lipSyncTaskId?.slice(0,20) || 'none'}`));

await conn.end();
console.log('\nDone. The heartbeat will poll InfiniteTalk tasks and trigger assembly when all complete.');
