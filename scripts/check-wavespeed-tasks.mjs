import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const WAVESPEED_KEY = process.env.WAVESPEED_API_KEY;

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [scenes] = await conn.execute(
  "SELECT id, sceneIndex, mvSceneStatus as status, taskId FROM musicVideoScenes WHERE jobId=720001 AND mvSceneStatus='generating' ORDER BY sceneIndex"
);

console.log('Generating scenes:', scenes.length);

for (const scene of scenes) {
  console.log(`\nScene idx ${scene.sceneIndex} (id=${scene.id}) taskId=${scene.taskId}`);
  
  if (!scene.taskId) {
    console.log('  NO TASK ID - needs re-submission');
    continue;
  }
  
  // Poll WaveSpeed for this task
  try {
    const resp = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${scene.taskId}/result`, {
      headers: { Authorization: `Bearer ${WAVESPEED_KEY}` }
    });
    const text = await resp.text();
    if (resp.ok) {
      const data = JSON.parse(text);
      const status = data.data?.status || data.status;
      const outputs = data.data?.outputs;
      console.log(`  WaveSpeed status: ${status}`);
      if (outputs && outputs.length > 0) {
        console.log(`  Output URL: ${outputs[0].slice(0, 80)}`);
      }
    } else {
      console.log(`  WaveSpeed HTTP ${resp.status}: ${text.slice(0, 150)}`);
    }
  } catch (err) {
    console.log(`  Poll error: ${err.message}`);
  }
}

await conn.end();
