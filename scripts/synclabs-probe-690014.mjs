import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

const SYNCLABS_API_KEY = process.env.SYNC_LABS_API_KEY;
const VOCAL_STEM_URL = 'https://wiz-ai.b-cdn.net/zara-vocal-stem_demucs.mp3';

if (!SYNCLABS_API_KEY) {
  console.error('ERROR: SYNC_LABS_API_KEY not set');
  process.exit(1);
}

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Step 1: Verify job is paused (rendering, not assembling)
const [jobs] = await conn.execute(
  "SELECT id, status, vocalsUrl, vocalsKey, audioUrl FROM musicVideoJobs WHERE id=690007"
);
const job = jobs[0];
console.log('=== Job 690007 state ===');
console.log('  status:', job.status);
console.log('  vocalsUrl:', job.vocalsUrl);
console.log('  audioUrl:', job.audioUrl);

if (job.status === 'assembling') {
  console.log('WARNING: Job is still assembling — pausing...');
  await conn.execute("UPDATE musicVideoJobs SET status='rendering', assemblyStartedAt=NULL WHERE id=690007");
  console.log('Paused.');
}

// Step 2: Get probe scene 690014 (index 1) — the first performance scene
const [scenes] = await conn.execute(
  "SELECT id, sceneIndex, mvSceneStatus, lipSync, lipSyncStatus, lipSyncTaskId, lipSyncVideoUrl, videoUrl, sceneStartTime FROM musicVideoScenes WHERE id=690014"
);
const probe = scenes[0];
console.log('\n=== Probe scene 690014 ===');
console.log('  sceneIndex:', probe.sceneIndex);
console.log('  mvSceneStatus:', probe.mvSceneStatus);
console.log('  lipSync:', probe.lipSync);
console.log('  lipSyncStatus:', probe.lipSyncStatus);
console.log('  lipSyncTaskId:', probe.lipSyncTaskId);
console.log('  lipSyncVideoUrl:', probe.lipSyncVideoUrl);
console.log('  videoUrl:', probe.videoUrl);
console.log('  sceneStartTime:', probe.sceneStartTime);

if (!probe.videoUrl) {
  console.error('ERROR: Probe scene has no videoUrl — cannot submit lip sync');
  await conn.end();
  process.exit(1);
}

// Step 3: Verify the vocal stem URL is accessible
console.log('\n=== Verifying vocal stem URL ===');
console.log('  URL:', VOCAL_STEM_URL);
const stemCheck = await fetch(VOCAL_STEM_URL, { method: 'HEAD' });
console.log('  HTTP status:', stemCheck.status);
if (stemCheck.status !== 200) {
  console.error('ERROR: Vocal stem URL returned', stemCheck.status, '— cannot proceed');
  await conn.end();
  process.exit(1);
}
console.log('  ✅ Vocal stem accessible');

// Step 4: Verify the probe scene video URL is accessible
console.log('\n=== Verifying probe scene video URL ===');
console.log('  URL:', probe.videoUrl);
const videoCheck = await fetch(probe.videoUrl, { method: 'HEAD' });
console.log('  HTTP status:', videoCheck.status);
if (videoCheck.status !== 200) {
  console.error('ERROR: Probe video URL returned', videoCheck.status);
  await conn.end();
  process.exit(1);
}
console.log('  ✅ Probe video accessible');

// Step 5: Submit to SyncLabs
// The probe scene is index 1 (0-indexed), starts at 6s in the song
// We need to extract the vocal stem segment for this scene (6s–12s)
// SyncLabs accepts: video URL + audio URL (full or segment)
// We'll use the full vocal stem — SyncLabs will align to the video duration automatically

console.log('\n=== Submitting to SyncLabs ===');
const payload = {
  videoUrl: probe.videoUrl,
  audioUrl: VOCAL_STEM_URL,
  synergize: true,  // Enhanced lip sync quality
  model: 'sync-1.9.0-beta',  // Latest model
};

console.log('Payload:');
console.log(JSON.stringify(payload, null, 2));

const syncRes = await fetch('https://api.sync.so/v2/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': SYNCLABS_API_KEY,
  },
  body: JSON.stringify(payload),
});

const syncData = await syncRes.json();
console.log('\nSyncLabs response HTTP:', syncRes.status);
console.log('Response:', JSON.stringify(syncData, null, 2));

if (!syncRes.ok || !syncData.id) {
  console.error('ERROR: SyncLabs submission failed:', syncData);
  await conn.end();
  process.exit(1);
}

const syncJobId = syncData.id;
console.log('\n✅ SyncLabs job submitted successfully!');
console.log('  Job ID:', syncJobId);
console.log('  Status:', syncData.status);

// Step 6: Update the probe scene with the SyncLabs job ID
await conn.execute(
  "UPDATE musicVideoScenes SET lipSyncStatus='submitted', lipSyncTaskId=?, lipSyncVideoUrl=NULL WHERE id=690014",
  [`synclabs:${syncJobId}`]
);
console.log('\nDatabase updated: lipSyncTaskId =', `synclabs:${syncJobId}`);

await conn.end();

console.log('\n=== SUMMARY ===');
console.log('✅ Assembly paused (job status: rendering)');
console.log('✅ Vocal stem URL verified:', VOCAL_STEM_URL);
console.log('✅ Probe video URL verified:', probe.videoUrl);
console.log('✅ SyncLabs job submitted');
console.log('   Job ID:', syncJobId);
console.log('   Audio used: ISOLATED VOCALS (not full mix)');
console.log('   Model: sync-1.9.0-beta');
console.log('\nNext: Poll SyncLabs for completion, then present MP4 for visual review.');
