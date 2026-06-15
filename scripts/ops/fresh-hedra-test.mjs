/**
 * Fresh Hedra lip sync test with a proper AI-generated portrait
 * 1. Generate high-quality close-up portrait via Forge image API
 * 2. Use first 6s of the job audio (Demucs isolated vocals)
 * 3. Submit to Hedra Character 3 with motion_intensity=high + singing prompt
 * 4. Save raw clip to S3
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
require('dotenv').config();

// Use the existing job's audio
const AUDIO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-audio/1-1778788890320.mp3';
// Already-isolated vocals from previous Demucs run (skip Demucs)
const SCENE_AUDIO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/scene-vocals-630003-1779205884483.mp3';
// Scene window: 24s–30s (same as Scene 0)
const AUDIO_START_SEC = 24;
const AUDIO_DUR_SEC = 6;

const HEDRA_BASE_URL = 'https://api.hedra.com/web-app/public';
const HEDRA_CHARACTER_3_MODEL_ID = 'd1dd37a3-e39a-4854-a298-6510289f9cf2';

function getHedraKey() {
  const k = process.env.HEDRA_API_KEY;
  if (!k) throw new Error('HEDRA_API_KEY not set');
  return k;
}

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

async function generatePortrait() {
  const baseUrl = (process.env.BUILT_IN_FORGE_API_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const fullUrl = new URL('images.v1.ImageService/GenerateImage', baseUrl + '/').toString();

  console.log('[Portrait] Generating high-quality close-up portrait...');
  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'connect-protocol-version': '1',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: 'Ultra-realistic close-up portrait photograph of a beautiful young Black female pop singer, face filling 85% of the frame, looking directly into camera, mouth slightly open ready to sing, warm golden studio lighting, sharp focus on lips and eyes, clean neutral background, professional headshot, photorealistic, high detail',
      original_images: [],
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Image generation failed (${res.status}): ${text.slice(0, 200)}`);
  const result = JSON.parse(text);
  const buffer = Buffer.from(result.image.b64Json, 'base64');
  console.log(`[Portrait] Generated: ${(buffer.length / 1024).toFixed(0)}KB (${result.image.mimeType})`);
  return { buffer, mimeType: result.image.mimeType };
}

function uploadWithCurl(assetId, filePath) {
  const key = getHedraKey();
  const result = execSync(
    `curl -s -X POST '${HEDRA_BASE_URL}/assets/${assetId}/upload' -H 'X-API-Key: ${key}' -F 'file=@${filePath}'`,
    { encoding: 'utf8' }
  );
  const parsed = JSON.parse(result);
  if (!parsed.id) throw new Error(`Hedra upload failed for asset ${assetId}: ${result}`);
  console.log(`[Hedra] Uploaded asset ${assetId} ✓`);
}

async function hedraPost(endpoint, body) {
  const res = await fetch(`${HEDRA_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': getHedraKey() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Hedra POST ${endpoint} failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

async function run() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fresh-hedra-test-'));
  console.log(`[Test] tmpDir: ${tmpDir}`);

  try {
    // 1. Generate portrait
    const { buffer: portraitBuf, mimeType } = await generatePortrait();
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const portraitFile = path.join(tmpDir, `portrait.${ext}`);
    fs.writeFileSync(portraitFile, portraitBuf);

    // Upload portrait to S3 for reference
    const portraitUrl = await storagePut(`test-portraits/fresh-test-${Date.now()}.${ext}`, portraitBuf, mimeType);
    console.log(`[Portrait] S3 URL: ${portraitUrl}`);

    // 2. Download already-isolated vocals (skip Demucs — already done in previous run)
    const vocalsFile = path.join(tmpDir, 'vocals.mp3');
    console.log('[Audio] Downloading pre-isolated vocals...');
    const vocalsRes = await fetch(SCENE_AUDIO_URL);
    if (!vocalsRes.ok) throw new Error(`Vocals download failed: ${vocalsRes.status}`);
    fs.writeFileSync(vocalsFile, Buffer.from(await vocalsRes.arrayBuffer()));
    console.log(`[Audio] Vocals: ${(fs.statSync(vocalsFile).size/1024).toFixed(0)}KB`);

    // 4. Create Hedra assets
    console.log('[Hedra] Creating asset records...');
    const [audioAsset, imageAsset] = await Promise.all([
      hedraPost('/assets', { name: `vocals-fresh-${Date.now()}.mp3`, type: 'audio' }),
      hedraPost('/assets', { name: `portrait-fresh-${Date.now()}.${ext}`, type: 'image' }),
    ]);
    console.log(`[Hedra] Assets: audio=${audioAsset.id} image=${imageAsset.id}`);

    // 5. Upload to Hedra
    uploadWithCurl(audioAsset.id, vocalsFile);
    uploadWithCurl(imageAsset.id, portraitFile);

    // 6. Submit with MAXIMUM singing parameters
    console.log('[Hedra] Submitting with maximum singing parameters...');
    const gen = await hedraPost('/generations', {
      type: 'video',
      ai_model_id: HEDRA_CHARACTER_3_MODEL_ID,
      start_keyframe_id: imageAsset.id,
      audio_id: audioAsset.id,
      generated_video_inputs: {
        text_prompt: 'exaggerated high-energy singing performance, wide open mouth on every vowel, visible teeth, strong jaw drops, clear phoneme shapes for every word, emotional pop singer, dynamic lip sync that matches powerful vocals, mouth opening and closing dramatically with each lyric',
        aspect_ratio: '9:16',
        resolution: '720p',
        motion_intensity: 'high',
      },
    });
    console.log(`[Hedra] Generation submitted: ${gen.id} (ETA: ${gen.eta_sec ?? '?'}s)`);

    // 7. Poll
    const key = getHedraKey();
    const deadline = Date.now() + 8 * 60 * 1000;
    let outputUrl = null;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 8000));
      const res = await fetch(`${HEDRA_BASE_URL}/generations`, { headers: { 'X-API-Key': key } });
      const data = await res.json();
      const g = data.data?.find(x => x.id === gen.id);
      if (!g) { console.log('[Hedra] Not in list yet...'); continue; }
      const pct = g.progress !== undefined ? `${Math.round(g.progress * 100)}%` : 'N/A';
      console.log(`[Hedra] ${gen.id} — status: ${g.status} progress: ${pct} eta: ${g.eta_sec ?? '?'}s`);
      if (g.status === 'complete') {
        outputUrl = g?.asset?.asset?.download_url;
        if (!outputUrl) throw new Error('Complete but no download_url');
        break;
      }
      if (g.status === 'failed' || g.status === 'error') {
        throw new Error(`Hedra failed: ${g.error_message ?? g.error ?? 'unknown'}`);
      }
    }
    if (!outputUrl) throw new Error('Hedra timed out');

    // 8. Download and save to S3 immediately
    console.log('[Hedra] Downloading output...');
    const dlRes = await fetch(outputUrl);
    if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`);
    const hedraBuffer = Buffer.from(await dlRes.arrayBuffer());
    console.log(`[Hedra] Downloaded: ${(hedraBuffer.length/1024).toFixed(0)}KB`);

    const hedraKey = `test-lipsync/hedra-fresh-test-${Date.now()}.mp4`;
    const hedraUrl = await storagePut(hedraKey, hedraBuffer, 'video/mp4');
    console.log(`\n✅ PORTRAIT URL:\n${portraitUrl}\n`);
    console.log(`✅ RAW HEDRA CLIP URL:\n${hedraUrl}\n`);
    console.log(`Generation ID: ${gen.id}`);

  } finally {
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  }
}

run().catch(err => { console.error('[Test] FAILED:', err); process.exit(1); });
