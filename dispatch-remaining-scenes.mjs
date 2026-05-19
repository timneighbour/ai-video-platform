/**
 * Manually dispatch scenes 9 and 10 for Job 660001 via WaveSpeed
 * Run: node dispatch-remaining-scenes.mjs
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get Job 660001 details
const [[job]] = await conn.query(
  "SELECT id, userId, audioUrl, characterImageUrl, aspectRatio, fallbackProvider FROM musicVideoJobs WHERE id = 660001"
);
console.log('Job:', job.id, 'provider:', job.fallbackProvider);

// Get pending scenes
const [pendingScenes] = await conn.query(
  "SELECT id, sceneIndex, prompt, duration, lipSync, startTime, previewImageUrl, sceneType FROM musicVideoScenes WHERE jobId = 660001 AND mvSceneStatus = 'pending' ORDER BY sceneIndex"
);
console.log(`Found ${pendingScenes.length} pending scenes:`, pendingScenes.map(s => s.sceneIndex));

if (pendingScenes.length === 0) {
  console.log('No pending scenes to dispatch.');
  await conn.end();
  process.exit(0);
}

// Get Zara's character portrait
const [[char]] = await conn.query(
  "SELECT masterPortraitUrl, previewImageUrl FROM videoCharacters WHERE jobId = 660001 LIMIT 1"
);
const characterUrl = char?.masterPortraitUrl ?? char?.previewImageUrl ?? job.characterImageUrl;
console.log('Character URL:', characterUrl?.slice(0, 80));

// Call WaveSpeed API directly
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
if (!WAVESPEED_API_KEY) {
  console.error('WAVESPEED_API_KEY not set');
  await conn.end();
  process.exit(1);
}

for (const scene of pendingScenes) {
  console.log(`\nDispatching scene ${scene.sceneIndex} (id=${scene.id})...`);
  
  // Build prompt with character anchor
  let prompt = scene.prompt ?? '';
  
  try {
    // Submit to WaveSpeed Seedance image-to-video
    const payload = {
      prompt: prompt.slice(0, 480),
      image: characterUrl,
      duration: scene.duration ?? 5,
      aspect_ratio: job.aspectRatio ?? '16:9',
      resolution: '720p',
    };
    
    console.log('  Prompt:', payload.prompt.slice(0, 100), '...');
    
    const resp = await fetch('https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0-fast/image-to-video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const result = await resp.json();
    console.log('  WaveSpeed response:', resp.status, JSON.stringify(result).slice(0, 200));
    
    if (resp.ok && result?.data?.id) {
      const taskId = result.data.id;
      await conn.query(
        "UPDATE musicVideoScenes SET mvSceneStatus = 'generating', taskId = ?, updatedAt = NOW() WHERE id = ?",
        [taskId, scene.id]
      );
      console.log(`  ✓ Scene ${scene.sceneIndex} dispatched → taskId: ${taskId}`);
    } else {
      console.error(`  ✗ Scene ${scene.sceneIndex} dispatch failed:`, result);
    }
  } catch (err) {
    console.error(`  ✗ Scene ${scene.sceneIndex} error:`, err.message);
  }
}

await conn.end();
console.log('\nDone.');
