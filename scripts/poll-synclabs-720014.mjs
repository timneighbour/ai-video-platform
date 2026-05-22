import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

const SYNCLABS_API_KEY = process.env.SYNC_LABS_API_KEY;
const SYNCLABS_TASK_ID = 'f5652ea5-571c-45bd-a6fb-5e54cd2c949e';

if (!SYNCLABS_API_KEY) {
  console.error('ERROR: SYNC_LABS_API_KEY not set');
  process.exit(1);
}

console.log('=== Polling SyncLabs task', SYNCLABS_TASK_ID, '===');

// Poll the SyncLabs v2 status endpoint
const res = await fetch(`https://api.sync.so/v2/generate/${SYNCLABS_TASK_ID}`, {
  method: 'GET',
  headers: {
    'x-api-key': SYNCLABS_API_KEY,
  },
});

console.log('HTTP status:', res.status);
const data = await res.json();
console.log('Full response:');
console.log(JSON.stringify(data, null, 2));

// Extract key fields
console.log('\n=== Key Fields ===');
console.log('  id:', data.id);
console.log('  status:', data.status);
console.log('  outputUrl:', data.outputUrl || data.output_url || data.videoUrl || data.video_url || 'NOT FOUND');
console.log('  audioUrl (input):', data.audioUrl || data.audio_url || data.input?.audioUrl || 'NOT FOUND');
console.log('  videoUrl (input):', data.videoUrl || data.video_url || data.input?.videoUrl || 'NOT FOUND');
console.log('  createdAt:', data.createdAt || data.created_at);
console.log('  completedAt:', data.completedAt || data.completed_at);
console.log('  error:', data.error || data.errorMessage || 'none');

// If completed, update the database
if (data.status === 'completed' || data.status === 'COMPLETED') {
  const outputUrl = data.outputUrl || data.output_url || data.videoUrl;
  if (outputUrl) {
    console.log('\n✅ SyncLabs COMPLETED! Output URL:', outputUrl);
    
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    await conn.execute(
      "UPDATE musicVideoScenes SET lipSyncStatus='completed', lipSyncVideoUrl=? WHERE id=720014",
      [outputUrl]
    );
    await conn.execute(
      "UPDATE musicVideoJobs SET probeVideoUrl=? WHERE id=720001",
      [outputUrl]
    );
    console.log('Database updated with lip sync output URL.');
    await conn.end();
  }
} else if (data.status === 'failed' || data.status === 'FAILED') {
  console.log('\n❌ SyncLabs FAILED:', data.error || data.errorMessage);
} else {
  console.log('\n⏳ Still processing. Status:', data.status);
}
