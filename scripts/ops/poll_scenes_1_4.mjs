#!/usr/bin/env node
// Poll HeyGen tasks for Scenes 1 and 4 and update DB if complete

import axios from 'axios';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_BASE = 'https://api.heygen.com';

const tasks = [
  { sceneId: 900026, sceneIndex: 1, lipsyncId: 'dd4d193d8e9043458908cd2bd3ea5b84' },
  { sceneId: 900029, sceneIndex: 4, lipsyncId: '21c1eb0580aa42b8b0c34b27956d4ef8' },
];

async function pollHeyGenTask(lipsyncId) {
  const response = await axios.get(
    `${HEYGEN_API_BASE}/v3/lipsyncs/${lipsyncId}`,
    {
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    }
  );
  const data = response.data;
  console.log(`[HeyGen] Raw response for ${lipsyncId}:`, JSON.stringify(data, null, 2));
  return data;
}

async function main() {
  if (!HEYGEN_API_KEY) {
    console.error('HEYGEN_API_KEY not set');
    process.exit(1);
  }

  for (const task of tasks) {
    console.log(`\n=== Polling Scene ${task.sceneIndex} (sceneId=${task.sceneId}) ===`);
    console.log(`HeyGen lipsync ID: ${task.lipsyncId}`);
    
    try {
      const data = await pollHeyGenTask(task.lipsyncId);
      const status = data?.data?.status ?? data?.status ?? 'unknown';
      const videoUrl = data?.data?.video_url ?? data?.video_url ?? null;
      const failureMessage = data?.data?.failure_message ?? data?.failure_message ?? null;
      
      console.log(`Status: ${status}`);
      if (videoUrl) console.log(`Video URL: ${videoUrl}`);
      if (failureMessage) console.log(`Failure: ${failureMessage}`);
    } catch (err) {
      console.error(`Error polling ${task.lipsyncId}:`, err.message);
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', JSON.stringify(err.response.data, null, 2));
      }
    }
  }
}

main().catch(console.error);
