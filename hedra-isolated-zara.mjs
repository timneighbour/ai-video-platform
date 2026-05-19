import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
const fs = require('fs');

const HEDRA_API_KEY = process.env.HEDRA_API_KEY;

async function storagePut(relKey, buffer, contentType) {
  const baseUrl = (process.env.BUILT_IN_FORGE_API_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const uploadUrl = new URL('v1/storage/upload', baseUrl + '/');
  uploadUrl.searchParams.set('path', relKey);
  const blob = new Blob([buffer], { type: contentType });
  const formData = new FormData();
  formData.append('file', blob, relKey.split('/').pop());
  const res = await fetch(uploadUrl.toString(), { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: formData });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return (await res.json()).url;
}

(async () => {
  const HEDRA_BASE = 'https://api.hedra.com/web-app/public';
  const { execSync } = await import('child_process');

  // Step 1: Create audio asset and upload
  console.log('[1/5] Creating audio asset...');
  const audioAssetRes = await fetch(`${HEDRA_BASE}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': HEDRA_API_KEY },
    body: JSON.stringify({ name: 'isolated-vocals-36-42.mp3', type: 'audio' }),
  });
  if (!audioAssetRes.ok) throw new Error(`Audio asset: ${audioAssetRes.status} ${await audioAssetRes.text()}`);
  const audioAsset = await audioAssetRes.json();
  console.log('  Audio asset ID:', audioAsset.id);

  // Upload audio via curl (fetch multipart fails with Hedra)
  console.log('[2/5] Uploading audio file...');
  execSync(`curl -s -X POST '${HEDRA_BASE}/assets/${audioAsset.id}/upload' -H 'X-API-Key: ${HEDRA_API_KEY}' -F 'file=@/tmp/isolated-vocals-36-42.mp3'`);

  // Step 2: Create image asset and upload
  console.log('[3/5] Creating image asset...');
  const imgAssetRes = await fetch(`${HEDRA_BASE}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': HEDRA_API_KEY },
    body: JSON.stringify({ name: 'zara-closeup.jpg', type: 'image' }),
  });
  if (!imgAssetRes.ok) throw new Error(`Image asset: ${imgAssetRes.status} ${await imgAssetRes.text()}`);
  const imgAsset = await imgAssetRes.json();
  console.log('  Image asset ID:', imgAsset.id);

  execSync(`curl -s -X POST '${HEDRA_BASE}/assets/${imgAsset.id}/upload' -H 'X-API-Key: ${HEDRA_API_KEY}' -F 'file=@/tmp/hedra-debug/zara-closeup.jpg'`);
  console.log('  Files uploaded ✓');

  // Step 3: Submit generation
  console.log('[4/5] Submitting generation (Character 3, motion=high)...');
  const genRes = await fetch(`${HEDRA_BASE}/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': HEDRA_API_KEY },
    body: JSON.stringify({
      type: 'video',
      ai_model_id: 'd1dd37a3-e39a-4854-a298-6510289f9cf2',
      start_keyframe_id: imgAsset.id,
      audio_id: audioAsset.id,
      generated_video_inputs: {
        text_prompt: 'exaggerated high-energy singing performance, wide open mouth on every vowel, visible teeth, strong jaw drops, clear phoneme shapes for every word, emotional pop singer, dynamic lip sync that matches powerful vocals',
        aspect_ratio: '1:1',
        resolution: '720p',
      },
    }),
  });
  if (!genRes.ok) throw new Error(`Generate: ${genRes.status} ${await genRes.text()}`);
  const genData = await genRes.json();
  console.log('  Generation ID:', genData.id, 'ETA:', genData.eta_sec, 's');

  // Step 4: Poll via list endpoint (GET /generations/{id} returns 404)
  console.log('[5/5] Polling...');
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 10000));
    const pollRes = await fetch(`${HEDRA_BASE}/generations`, {
      headers: { 'X-API-Key': HEDRA_API_KEY },
    });
    const pollData = await pollRes.json();
    const gen = pollData.data.find(g => g.id === genData.id);
    if (!gen) { process.stdout.write('? '); continue; }
    const pct = Math.round((gen.progress || 0) * 100);
    process.stdout.write(`${gen.status}(${pct}%) `);

    if (gen.status === 'complete') {
      const videoUrl = gen?.asset?.asset?.download_url;
      console.log('\n  COMPLETE! Video:', videoUrl);
      if (!videoUrl) { console.log('  Full response:', JSON.stringify(gen)); return; }
      
      const dlRes = await fetch(videoUrl);
      if (!dlRes.ok) { console.log(`  Download failed: ${dlRes.status} (JWT expired). Gen ID: ${genData.id}`); return; }
      const buf = Buffer.from(await dlRes.arrayBuffer());
      console.log(`  Downloaded: ${(buf.length/1024).toFixed(0)}KB`);
      
      const s3Url = await storagePut(`test-lipsync/hedra-isolated-zara-${Date.now()}.mp4`, buf, 'video/mp4');
      console.log(`  ✅ S3: ${s3Url}`);
      return;
    }
    if (gen.status === 'failed') throw new Error('Generation failed');
  }
  console.log('\n  TIMED OUT. Gen ID:', genData.id);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
