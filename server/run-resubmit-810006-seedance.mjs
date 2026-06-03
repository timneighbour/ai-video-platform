/**
 * Resubmit scene 810006 to WaveSpeed Seedance 2.0 with:
 * - Zara's Air Studios environment portrait as the reference image
 * - Exact vocal clip (t=11.84s-18.16s) as reference_audios for native lip sync
 * - BPM=152 in the prompt
 * - [Audio1] reference in the prompt for Seedance to sync to
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const WAVESPEED_KEY = process.env.WAVESPEED_API_KEY;
const CDN_BASE = process.env.VITE_CDN_URL || 'https://wiz-ai.b-cdn.net';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get scene 810006 and Zara's character
const [scenes] = await conn.execute('SELECT * FROM musicVideoScenes WHERE id=810006');
const scene = scenes[0];
const [chars] = await conn.execute('SELECT * FROM videoCharacters WHERE jobId=930003 LIMIT 1');
const char = chars[0];

console.log('Scene status:', scene.mvSceneStatus);
console.log('Env ref URL:', char.environmentRefUrl?.slice(0, 80));

// The vocal clip URL (uploaded to CDN)
const vocalClipUrl = `${CDN_BASE}/manus-storage/botw-scene2-vocals_8e0fd363.mp3`;
console.log('Vocal clip URL:', vocalClipUrl);

// Verify the vocal clip is accessible
const testResp = await fetch(vocalClipUrl, { method: 'HEAD' });
console.log('Vocal clip HTTP status:', testResp.status);

// Build the Seedance prompt with [Audio1] reference and BPM
const scenePrompt = `[Audio1] Zara, a young Black British female vocalist with long black hair, singing passionately at 152 BPM inside Air Studios Lyndhurst Hall — a grand orchestral recording studio with warm wood-panelled walls, vaulted ceilings, dramatic overhead lighting, and a full orchestra visible in the background. Close-up to medium shot, Zara faces the camera directly, lips moving in perfect sync with the vocals "walls are leaning in tonight, a ghost of what I used to". Dynamic camera movement, cinematic depth of field, emotional performance, strings and cellos moving in time with the 152 BPM beat. No microphone. No grey background. Full cinematic environment.`;

console.log('\nPrompt:', scenePrompt.slice(0, 200));

// Reset scene to pending and clear old task
await conn.execute(`
  UPDATE musicVideoScenes 
  SET mvSceneStatus='pending', taskId=NULL, videoUrl=NULL, 
      lipSyncStatus='pending', lipSyncTaskId=NULL,
      updatedAt=NOW()
  WHERE id=810006
`);

// Cancel old WaveSpeed task (best effort)
const oldTaskId = '3374b33513d14a59bb746578d52aeb20';
try {
  await fetch(`https://api.wavespeed.ai/api/v3/predictions/${oldTaskId}/cancel`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${WAVESPEED_KEY}` }
  });
  console.log('Cancelled old WaveSpeed task:', oldTaskId);
} catch (e) {
  console.log('Could not cancel old task (may have already completed)');
}

// Submit to WaveSpeed Seedance 2.0 with reference_audios
const payload = {
  prompt: scenePrompt,
  image: char.environmentRefUrl,
  reference_audios: [vocalClipUrl],
  duration: 7,
  resolution: '720p',
  aspect_ratio: '16:9',
  generate_audio: false  // We'll overlay the full mix in assembly; Seedance just needs to lip sync
};

console.log('\nSubmitting to WaveSpeed Seedance 2.0 with reference_audios...');
const resp = await fetch('https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/image-to-video', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${WAVESPEED_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

const result = await resp.json();
console.log('Response status:', resp.status);
console.log('Task ID:', result.data?.id);
console.log('Status:', result.data?.status);

if (result.data?.id) {
  const taskId = `wavespeed:i2v:${result.data.id}`;
  // Persist task ID and set scene to generating
  await conn.execute(`
    UPDATE musicVideoScenes 
    SET mvSceneStatus='generating', taskId=?, updatedAt=NOW()
    WHERE id=810006
  `, [taskId]);
  console.log('\nScene 810006 updated with taskId:', taskId);
  console.log('Poll URL:', result.data.urls?.get);
} else {
  console.error('Failed to submit:', JSON.stringify(result));
}

await conn.end();
