/**
 * SyncLabs sync-3 lip sync test for Scene 0 of Job 630003
 * Input: WaveSpeed video (Zara character) + isolated Demucs vocals
 * Model: sync-3 (best-in-class for music videos)
 * Temperature: 1.0 (maximum expressiveness)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

// Scene 0 WaveSpeed video (Zara character, rooftop golden hour) — public CDN URL for SyncLabs
const VIDEO_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/BSCcqDEXikOAACIK.mp4';
// Pre-isolated Demucs vocals (24s-30s segment) — public CDN URL for SyncLabs
const AUDIO_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/TLfVDBSCAUzuDJaY.mp3';

const SYNC_LABS_API_KEY = process.env.SYNC_LABS_API_KEY;
if (!SYNC_LABS_API_KEY) throw new Error('SYNC_LABS_API_KEY not set');

async function storagePut(relKey, buffer, contentType) {
  const baseUrl = (process.env.BUILT_IN_FORGE_API_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const normalizedKey = relKey.replace(/^\/+/, '');
  const uploadUrl = new URL('v1/storage/upload', baseUrl + '/');
  uploadUrl.searchParams.set('path', normalizedKey);
  const blob = new Blob([buffer], { type: contentType });
  const formData = new FormData();
  formData.append('file', blob, normalizedKey.split('/').pop() || 'file');
  const res = await fetch(uploadUrl.toString(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`Storage upload failed: ${res.status} ${await res.text()}`);
  return (await res.json()).url;
}

(async () => {
  console.log('[SyncLabs] Submitting lip sync job...');
  console.log('  Video:', VIDEO_URL.slice(-50));
  console.log('  Audio:', AUDIO_URL.slice(-50));

  // Submit job
  const submitRes = await fetch('https://api.sync.so/v2/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': SYNC_LABS_API_KEY,
    },
    body: JSON.stringify({
      input: [
        { type: 'video', url: VIDEO_URL },
        { type: 'audio', url: AUDIO_URL },
      ],
      model: 'sync-3',
      options: {
        sync_mode: 'cut_off',
        temperature: 1.0,
        occlusion_detection_enabled: true,
      },
      outputFileName: `synclabs-test-630003-${Date.now()}`,
    }),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Submit failed (${submitRes.status}): ${err}`);
  }

  const job = await submitRes.json();
  console.log(`[SyncLabs] Job submitted: ${job.id}`);

  // Poll for completion
  const deadline = Date.now() + 10 * 60 * 1000;
  let outputUrl = null;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000));

    const pollRes = await fetch(`https://api.sync.so/v2/generate/${job.id}`, {
      headers: { 'x-api-key': SYNC_LABS_API_KEY },
    });
    const status = await pollRes.json();
    console.log(`[SyncLabs] Status: ${status.status}`);

    if (status.status === 'COMPLETED') {
      outputUrl = status.outputUrl || status.output_url;
      if (!outputUrl) throw new Error('Completed but no outputUrl');
      break;
    }
    if (status.status === 'FAILED' || status.status === 'REJECTED') {
      throw new Error(`SyncLabs job ${status.status}: ${JSON.stringify(status)}`);
    }
  }

  if (!outputUrl) throw new Error('Timed out');
  console.log(`[SyncLabs] Completed! Output URL: ${outputUrl.slice(0, 80)}...`);

  // Download and save to S3
  const dlRes = await fetch(outputUrl);
  if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`);
  const buf = Buffer.from(await dlRes.arrayBuffer());
  console.log(`[SyncLabs] Downloaded: ${(buf.length/1024).toFixed(0)}KB`);

  const s3Url = await storagePut(`test-lipsync/synclabs-630003-${Date.now()}.mp4`, buf, 'video/mp4');
  console.log(`\n✅ SYNCLABS LIP SYNC CLIP:\n${s3Url}`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
