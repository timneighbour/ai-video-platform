import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, 'ai-video-platform/.env') });

const key = process.env.WAVESPEED_API_KEY;
console.log('Checking WaveSpeed credits...');

// Test with a minimal request
const testResp = await fetch('https://api.wavespeed.ai/api/v3/bytedance/seedance-2.0/image-to-video', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png',
    prompt: 'test',
    aspect_ratio: '16:9',
    duration: 5
  })
});
const testData = await testResp.json();
console.log('WaveSpeed response code:', testData.code, '| message:', testData.message?.substring(0, 80));

const hasCredits = !(testData.code === 400 && testData.message && testData.message.includes('Insufficient'));
console.log('Credits available:', hasCredits);

if (hasCredits) {
  const conn = await createConnection(process.env.DATABASE_URL);
  await conn.execute("UPDATE providerHealth SET isHealthy=1, consecutiveFailures=0, updatedAt=NOW() WHERE provider='wavespeed'");
  console.log('WaveSpeed marked healthy');
  await conn.execute("UPDATE musicVideoScenes SET mvSceneStatus='pending', taskId=NULL, errorMessage=NULL, retryCount=0, updatedAt=NOW() WHERE id=990015");
  console.log('Scene 990015 reset to pending');
  await conn.execute("UPDATE musicVideoJobs SET status='rendering', probePassed=NULL, probeSceneId=NULL, probeVideoUrl=NULL, updatedAt=NOW() WHERE id=1080001");
  console.log('Job 1080001 resumed to rendering');
  await conn.end();
  console.log('Done. Heartbeat will pick up scene 990015 within the next few minutes.');
} else {
  console.log('ERROR: WaveSpeed still has no credits. Top-up may not have processed yet.');
}
