/**
 * Server-side script to resume job 390001 by directly submitting scene 480046
 * to the Atlas Cloud provider and then polling until complete.
 */
import mysql from 'mysql2/promise';
import axios from 'axios';

const DATABASE_URL = process.env.DATABASE_URL;
const ATLAS_CLOUD_API_KEY = process.env.ATLAS_CLOUD_API_KEY;
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;

if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const conn = await mysql.createConnection(DATABASE_URL);

console.log('=== Resuming Job 390001 ===\n');

// Get scene 480046 details
const [sceneRows] = await conn.execute(
  'SELECT id, sceneIndex, mvSceneStatus, prompt, duration, taskId, previewImageUrl FROM musicVideoScenes WHERE id = 480046'
);
const scene = sceneRows[0];
console.log('Scene 480046:', {
  id: scene.id,
  index: scene.sceneIndex,
  status: scene.mvSceneStatus,
  duration: scene.duration,
  hasPreviewImage: !!scene.previewImageUrl,
});

// Step 1: Submit to Atlas Cloud using correct endpoint
const ATLAS_BASE = 'https://api.atlascloud.ai/api/v1';
const ATLAS_MODEL = 'bytedance/seedance-2.0/text-to-video';

console.log('\nSubmitting to Atlas Cloud...');
console.log(`Endpoint: ${ATLAS_BASE}/model/generateVideo`);
console.log(`Model: ${ATLAS_MODEL}`);

let taskId = null;
let provider = null;

try {
  const atlasResponse = await axios.post(
    `${ATLAS_BASE}/model/generateVideo`,
    {
      model: ATLAS_MODEL,
      prompt: scene.prompt,
      duration: scene.duration ?? 8,
      resolution: '720p',
    },
    {
      headers: {
        Authorization: `Bearer ${ATLAS_CLOUD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );
  
  const data = atlasResponse.data;
  console.log('Atlas Cloud response:', JSON.stringify(data, null, 2));
  taskId = data?.data?.id;
  provider = 'atlas_cloud';
  console.log(`\n✅ Submitted to Atlas Cloud. Task ID: ${taskId}`);
} catch (atlasErr) {
  const status = atlasErr.response?.status;
  const detail = JSON.stringify(atlasErr.response?.data ?? atlasErr.message);
  console.error(`Atlas Cloud failed (${status}): ${detail}`);
  
  // Fallback to WaveSpeed
  console.log('\nFalling back to WaveSpeed...');
  const WAVESPEED_BASE = 'https://api.wavespeed.ai/api/v3';
  const WS_MODEL = 'bytedance/seedance-2.0/text-to-video';
  
  try {
    const wsResponse = await axios.post(
      `${WAVESPEED_BASE}/${WS_MODEL}`,
      {
        prompt: scene.prompt,
        aspect_ratio: '16:9',
        duration: scene.duration ?? 8,
        resolution: '720p',
        enable_web_search: false,
        reference_images: [],
        reference_videos: [],
        reference_audios: [],
      },
      {
        headers: {
          Authorization: `Bearer ${WAVESPEED_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    
    const wsData = wsResponse.data;
    console.log('WaveSpeed response:', JSON.stringify(wsData, null, 2));
    taskId = wsData?.data?.id;
    provider = 'wavespeed';
    console.log(`\n✅ Submitted to WaveSpeed. Task ID: ${taskId}`);
  } catch (wsErr) {
    const wsStatus = wsErr.response?.status;
    const wsDetail = JSON.stringify(wsErr.response?.data ?? wsErr.message);
    console.error(`WaveSpeed also failed (${wsStatus}): ${wsDetail}`);
    await conn.end();
    process.exit(1);
  }
}

if (!taskId) {
  console.error('No task ID returned from any provider');
  await conn.end();
  process.exit(1);
}

// Step 2: Update scene to 'generating' with the task ID
// Prefix the task ID with provider prefix so pollSceneStatus knows which provider to poll
const prefixedTaskId = provider === 'wavespeed' ? `ws_${taskId}` : `ac_${taskId}`;
await conn.execute(
  "UPDATE musicVideoScenes SET mvSceneStatus = 'generating', taskId = ?, errorMessage = NULL, updatedAt = NOW() WHERE id = 480046",
  [prefixedTaskId]
);
console.log(`\nUpdated scene 480046 → generating (taskId: ${prefixedTaskId})`);

await conn.end();

console.log(`
=== Done ===
Scene 480046 is now generating via ${provider}.
Task ID: ${prefixedTaskId}

The render will complete when the user opens the WizVideo page for job 390001
and the pollProgress procedure polls this scene.

Alternatively, the auto-submit logic in pollProgress will pick it up on next poll.
`);
