import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

const SYNC_LABS_API_KEY = process.env.SYNC_LABS_API_KEY;
// WaveSpeed Zara video (6s)
const VIDEO_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/BSCcqDEXikOAACIK.mp4';
// 36-42s segment (louder, likely has singing)
const AUDIO_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/iXmMoYxAedYmMLvG.mp3';

async function storagePut(relKey, buffer, contentType) {
  const baseUrl = (process.env.BUILT_IN_FORGE_API_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const uploadUrl = new URL('v1/storage/upload', baseUrl + '/');
  uploadUrl.searchParams.set('path', relKey);
  const blob = new Blob([buffer], { type: contentType });
  const formData = new FormData();
  formData.append('file', blob, relKey.split('/').pop());
  const res = await fetch(uploadUrl.toString(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return (await res.json()).url;
}

(async () => {
  console.log('[SyncLabs] Submitting: Zara video + audio from 36-42s (vocal-heavy section)');
  const submitRes = await fetch('https://api.sync.so/v2/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': SYNC_LABS_API_KEY },
    body: JSON.stringify({
      input: [
        { type: 'video', url: VIDEO_URL },
        { type: 'audio', url: AUDIO_URL },
      ],
      model: 'sync-3',
      options: { sync_mode: 'cut_off', temperature: 1.0, occlusion_detection_enabled: true },
      outputFileName: `synclabs-vocal-36s-${Date.now()}`,
    }),
  });
  if (!submitRes.ok) throw new Error(`Submit: ${submitRes.status} ${await submitRes.text()}`);
  const job = await submitRes.json();
  console.log(`Job: ${job.id}`);

  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000));
    const r = await fetch(`https://api.sync.so/v2/generate/${job.id}`, { headers: { 'x-api-key': SYNC_LABS_API_KEY } });
    const s = await r.json();
    process.stdout.write(`${s.status} `);
    if (s.status === 'COMPLETED') {
      const outputUrl = s.outputUrl || s.output_url;
      console.log(`\nDone! Downloading...`);
      const dlRes = await fetch(outputUrl);
      const buf = Buffer.from(await dlRes.arrayBuffer());
      console.log(`${(buf.length/1024).toFixed(0)}KB`);
      const url = await storagePut(`test-lipsync/synclabs-vocal36s-${Date.now()}.mp4`, buf, 'video/mp4');
      console.log(`\n✅ ${url}`);
      return;
    }
    if (s.status === 'FAILED' || s.status === 'REJECTED') throw new Error(`${s.status}: ${s.error}`);
  }
})().catch(e => { console.error(`FAILED: ${e.message}`); process.exit(1); });
