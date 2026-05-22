/**
 * Submit WaveSpeed InfiniteTalk for scene 720021 (index 8, performance, startTime=48s)
 * Using confirmed working approach from probe:
 * - CloudFront audio URL (correct content-type)
 * - Fal.ai portrait URL (publicly accessible)
 */
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

config();

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
const DB_URL = process.env.DATABASE_URL;

// Confirmed working portrait URL from probe (Fal.ai public URL)
const PORTRAIT_URL = 'https://v3b.fal.media/files/b/0a9ae50e/4dzRWGbNCECdlgJt-Zuyq_6c402f6ca2f74b32b59d80cffa03eeb7.jpg';

// Confirmed Demucs vocal stem (CloudFront, correct content-type)
const VOCAL_STEM_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/micetSvcmTnoavVM.mp3';

const START_TIME = 48; // seconds
const DURATION = 6;

async function main() {
  // Step 1: Cut the 48-54s vocal window
  mkdirSync('/tmp/it-720021', { recursive: true });
  const audioClipPath = '/tmp/it-720021/vocals-48-54s.mp3';
  
  console.log('Cutting vocal window 48-54s from Demucs stem...');
  execSync(`curl -sL "${VOCAL_STEM_URL}" -o /tmp/it-720021/full-stem.mp3`);
  execSync(`ffmpeg -y -i /tmp/it-720021/full-stem.mp3 -ss ${START_TIME} -t ${DURATION} -c:a libmp3lame -q:a 2 "${audioClipPath}"`);
  
  // Verify the clip
  const probe = execSync(`ffprobe -v quiet -print_format json -show_format "${audioClipPath}"`).toString();
  const fmt = JSON.parse(probe).format;
  console.log(`Audio clip: ${fmt.duration}s, ${fmt.size} bytes`);
  
  // Step 2: Upload to S3 via Forge multipart form upload to get CloudFront URL
  console.log('Uploading vocal clip to S3...');
  
  const conn = await mysql.createConnection(DB_URL);
  
  const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
  const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
  
  // Read the audio file
  const { readFileSync } = await import('fs');
  const audioBuffer = readFileSync(audioClipPath);
  
  // Upload via Forge storage API using multipart form (same as storagePut in storage.ts)
  const relKey = `music-video-scene-audio/720021-vocals-48-54s-${Date.now()}.mp3`;
  const baseUrl = FORGE_API_URL.replace(/\/+$/, '');
  const uploadUrl = new URL('v1/storage/upload', baseUrl + '/');
  uploadUrl.searchParams.set('path', relKey);
  
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  formData.append('file', blob, '720021-vocals-48-54s.mp3');
  
  const uploadResp = await fetch(uploadUrl.toString(), {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${FORGE_API_KEY}` },
    body: formData,
  });
  
  if (!uploadResp.ok) {
    const err = await uploadResp.text();
    throw new Error(`Upload failed (${uploadResp.status}): ${err}`);
  }
  
  const { url: audioUrl } = await uploadResp.json();
  console.log('Audio uploaded to:', audioUrl);
  
  // Verify the URL is accessible with correct content-type
  const headResp = await fetch(audioUrl, { method: 'HEAD' });
  console.log('Audio URL content-type:', headResp.headers.get('content-type'));
  
  // Step 3: Submit to WaveSpeed InfiniteTalk
  console.log('Submitting to WaveSpeed InfiniteTalk...');
  const payload = {
    image: PORTRAIT_URL,
    audio: audioUrl,
    prompt: "Singer performing at a vintage microphone in a warm concert hall, cinematic lighting, emotional performance, Air Studios aesthetic",
    duration: DURATION,
    resolution: "720p",
  };
  
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  const submitResp = await fetch('https://api.wavespeed.ai/api/v3/wavespeed-ai/infinitetalk', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  const submitData = await submitResp.json();
  console.log('Submit response:', JSON.stringify(submitData, null, 2));
  
  if (!submitResp.ok || !submitData?.data?.id) {
    throw new Error(`InfiniteTalk submit failed: ${JSON.stringify(submitData)}`);
  }
  
  const taskId = submitData.data.id;
  console.log('InfiniteTalk task ID:', taskId);
  
  // Step 4: Update DB with the real task ID
  await conn.execute(
    `UPDATE musicVideoScenes SET lipSyncTaskId=?, lipSyncStatus='processing', updatedAt=NOW() WHERE id=720021`,
    [taskId]
  );
  console.log('DB updated with real InfiniteTalk task ID');
  
  await conn.end();
  
  // Step 5: Poll until complete
  console.log('Polling for completion...');
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 30000));
    
    const pollResp = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${taskId}/outputs`, {
      headers: { 'Authorization': `Bearer ${WAVESPEED_API_KEY}` },
    });
    const pollData = await pollResp.json();
    const status = pollData?.data?.status;
    console.log(`Poll ${i+1}: status=${status}`);
    
    if (status === 'completed') {
      const outputs = pollData?.data?.outputs ?? [];
      const videoUrl = outputs[0] ?? pollData?.data?.video_url;
      console.log('OUTPUT VIDEO URL:', videoUrl);
      
      // Update DB with the lip sync video URL
      const conn2 = await mysql.createConnection(DB_URL);
      await conn2.execute(
        `UPDATE musicVideoScenes SET lipSyncVideoUrl=?, lipSyncStatus='done', updatedAt=NOW() WHERE id=720021`,
        [videoUrl]
      );
      console.log('DB updated with lipSyncVideoUrl');
      await conn2.end();
      break;
    } else if (status === 'failed') {
      console.error('InfiniteTalk FAILED:', JSON.stringify(pollData));
      break;
    }
  }
}

main().catch(console.error);
