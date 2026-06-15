/**
 * Re-run Hedra for Scene 0 of Job 630003 with stronger singing parameters.
 * - Extracts hero frame from the WaveSpeed video
 * - Runs Demucs vocal isolation on the 24-30s segment
 * - Submits to Hedra Character 3 with high motion_intensity and explicit singing prompt
 * - Saves hedraVideoUrl, heroImageUrl, sceneAudioUrl to DB
 */
import mysql from 'mysql2/promise';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
require('dotenv').config();

const SCENE_ID = 630003; // scene id (same as job id in this case — it's the first scene)
const JOB_ID = 630003;
const HEDRA_BASE_URL = 'https://api.hedra.com/web-app/public';
const HEDRA_CHARACTER_3_MODEL_ID = 'd1dd37a3-e39a-4854-a298-6510289f9cf2';

function getHedraKey() {
  const k = process.env.HEDRA_API_KEY;
  if (!k) throw new Error('HEDRA_API_KEY not set');
  return k;
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

async function storagePut(relKey, buffer, contentType) {
  const baseUrl = (process.env.BUILT_IN_FORGE_API_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  if (!baseUrl || !apiKey) throw new Error('Forge API not configured');
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage upload failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return { url: data.url, key: normalizedKey };
}

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Get scene 0 details
  const [scenes] = await conn.execute(
    'SELECT * FROM musicVideoScenes WHERE jobId=? ORDER BY sceneIndex LIMIT 1',
    [JOB_ID]
  );
  const scene = scenes[0];
  if (!scene) throw new Error('Scene 0 not found');
  console.log(`[HedraRerun] Scene ${scene.id} | startTime=${scene.startTime}ms | videoUrl=${scene.videoUrl?.slice(-50)}`);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `hedra-rerun-${scene.id}-`));
  const videoTmp = path.join(tmpDir, 'wavespeed.mp4');
  const frameTmp = path.join(tmpDir, 'hero-frame.jpg');
  const audioTmp = path.join(tmpDir, 'audio-full.mp3');
  const trimmedTmp = path.join(tmpDir, 'audio-trimmed.mp3');
  const vocalsTmp = path.join(tmpDir, 'vocals.mp3');

  try {
    // Mark as processing
    await conn.execute(
      'UPDATE musicVideoScenes SET hedraStatus="processing", updatedAt=NOW() WHERE id=?',
      [scene.id]
    );

    // 1. Download WaveSpeed video
    console.log('[HedraRerun] Downloading WaveSpeed video...');
    const videoRes = await fetch(scene.videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`);
    fs.writeFileSync(videoTmp, Buffer.from(await videoRes.arrayBuffer()));
    console.log(`[HedraRerun] Video: ${(fs.statSync(videoTmp).size/1024).toFixed(0)}KB`);

    // 2. Extract hero frame at 1.5s (better singing pose than 1s)
    console.log('[HedraRerun] Extracting hero frame at 1.5s...');
    execSync(`ffmpeg -y -i "${videoTmp}" -ss 1.5 -vframes 1 -q:v 1 "${frameTmp}"`, { stdio: 'pipe' });
    console.log(`[HedraRerun] Frame: ${(fs.statSync(frameTmp).size/1024).toFixed(0)}KB`);

    // 3. Get job audio
    const [jobs] = await conn.execute('SELECT audioUrl FROM musicVideoJobs WHERE id=?', [JOB_ID]);
    const job = jobs[0];
    if (!job?.audioUrl) throw new Error('No audioUrl on job');

    console.log('[HedraRerun] Downloading full audio...');
    const audioRes = await fetch(job.audioUrl);
    if (!audioRes.ok) throw new Error(`Failed to download audio: ${audioRes.status}`);
    fs.writeFileSync(audioTmp, Buffer.from(await audioRes.arrayBuffer()));

    // 4. Trim to scene window (24s–30s = 6s)
    const startSec = scene.startTime / 1000;
    const durSec = scene.duration / 1000;
    console.log(`[HedraRerun] Trimming audio to ${startSec}s–${startSec + durSec}s...`);
    execSync(
      `ffmpeg -y -i "${audioTmp}" -ss ${startSec} -t ${durSec} -ar 44100 -ac 1 "${trimmedTmp}"`,
      { stdio: 'pipe' }
    );

    // 5. Demucs vocal isolation
    console.log('[HedraRerun] Running Demucs vocal isolation...');
    const demucsDir = path.join(tmpDir, 'demucs-out');
    fs.mkdirSync(demucsDir, { recursive: true });
    let vocalsReady = false;
    try {
      execSync(
        `python3 -m demucs --two-stems=vocals --mp3 --out "${demucsDir}" "${trimmedTmp}"`,
        { stdio: 'pipe', timeout: 120000 }
      );
      const modelDir = fs.readdirSync(demucsDir)[0];
      const songDir = fs.readdirSync(path.join(demucsDir, modelDir))[0];
      const vocalsPath = path.join(demucsDir, modelDir, songDir, 'vocals.mp3');
      if (fs.existsSync(vocalsPath)) {
        fs.copyFileSync(vocalsPath, vocalsTmp);
        vocalsReady = true;
        console.log('[HedraRerun] Demucs vocals isolated ✓');
      }
    } catch (e) {
      console.warn('[HedraRerun] Demucs failed, using trimmed audio:', e.message);
    }
    if (!vocalsReady) {
      fs.copyFileSync(trimmedTmp, vocalsTmp);
      console.log('[HedraRerun] Using trimmed audio (no Demucs)');
    }

    // 6. Upload frame + vocals to S3
    console.log('[HedraRerun] Uploading frame and vocals to S3...');
    const [{ url: frameUrl }, { url: vocalsUrl }] = await Promise.all([
      storagePut(`music-video-scenes/hero-frame-${scene.id}-${Date.now()}.jpg`, fs.readFileSync(frameTmp), 'image/jpeg'),
      storagePut(`music-video-scenes/scene-vocals-${scene.id}-${Date.now()}.mp3`, fs.readFileSync(vocalsTmp), 'audio/mpeg'),
    ]);
    console.log('[HedraRerun] Frame URL:', frameUrl.slice(-50));
    console.log('[HedraRerun] Vocals URL:', vocalsUrl.slice(-50));

    // Save sceneAudioUrl and heroImageUrl immediately
    await conn.execute(
      'UPDATE musicVideoScenes SET sceneAudioUrl=?, heroImageUrl=?, updatedAt=NOW() WHERE id=?',
      [vocalsUrl, frameUrl, scene.id]
    );
    console.log('[HedraRerun] sceneAudioUrl + heroImageUrl saved to DB ✓');

    // 7. Download to temp for Hedra upload (Hedra needs local files via curl)
    const frameTmpLocal = path.join(tmpDir, 'hedra-frame.jpg');
    const vocalsTmpLocal = path.join(tmpDir, 'hedra-vocals.mp3');
    fs.copyFileSync(frameTmp, frameTmpLocal);
    fs.copyFileSync(vocalsTmp, vocalsTmpLocal);

    // 8. Create Hedra asset records
    console.log('[HedraRerun] Creating Hedra asset records...');
    const [audioAsset, imageAsset] = await Promise.all([
      hedraPost('/assets', { name: `vocals-scene${scene.id}-${Date.now()}.mp3`, type: 'audio' }),
      hedraPost('/assets', { name: `frame-scene${scene.id}-${Date.now()}.jpg`, type: 'image' }),
    ]);
    console.log(`[HedraRerun] Assets: audio=${audioAsset.id} image=${imageAsset.id}`);

    // 9. Upload files to Hedra
    uploadWithCurl(audioAsset.id, vocalsTmpLocal);
    uploadWithCurl(imageAsset.id, frameTmpLocal);

    // 10. Submit generation with STRONG singing parameters
    console.log('[HedraRerun] Submitting to Hedra Character 3 with high motion intensity...');
    const gen = await hedraPost('/generations', {
      type: 'video',
      ai_model_id: HEDRA_CHARACTER_3_MODEL_ID,
      start_keyframe_id: imageAsset.id,
      audio_id: audioAsset.id,
      generated_video_inputs: {
        text_prompt: 'Singer performing with exaggerated singing expression, wide open mouth on vowels, visible teeth, strong jaw movement, phoneme-accurate lip sync, high energy vocal performance, mouth clearly moving to every word',
        aspect_ratio: '9:16',
        resolution: '720p',
        motion_intensity: 'high',
      },
    });
    console.log(`[HedraRerun] Generation submitted: ${gen.id} (ETA: ${gen.eta_sec ?? '?'}s)`);

    // 11. Poll for completion
    const key = getHedraKey();
    const deadline = Date.now() + 8 * 60 * 1000;
    let outputUrl = null;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 8000));
      const res = await fetch(`${HEDRA_BASE_URL}/generations`, { headers: { 'X-API-Key': key } });
      const data = await res.json();
      const g = data.data?.find(x => x.id === gen.id);
      if (!g) { console.log('[HedraRerun] Generation not found in list yet...'); continue; }
      const pct = g.progress !== undefined ? `${Math.round(g.progress * 100)}%` : 'N/A';
      console.log(`[HedraRerun] ${gen.id} — status: ${g.status} progress: ${pct} eta: ${g.eta_sec ?? '?'}s`);
      if (g.status === 'complete') {
        outputUrl = g?.asset?.asset?.download_url;
        if (!outputUrl) throw new Error('Complete but no download_url');
        break;
      }
      if (g.status === 'failed' || g.status === 'error') {
        throw new Error(`Hedra generation failed: ${g.error_message ?? g.error ?? 'unknown'}`);
      }
    }
    if (!outputUrl) throw new Error('Hedra timed out after 8 minutes');
    console.log(`[HedraRerun] COMPLETE — output: ${outputUrl.slice(0, 80)}...`);

    // 12. Download Hedra output and upload to S3
    console.log('[HedraRerun] Downloading Hedra output...');
    const hedraRes = await fetch(outputUrl);
    if (!hedraRes.ok) throw new Error(`Failed to download Hedra output: ${hedraRes.status}`);
    const hedraBuffer = Buffer.from(await hedraRes.arrayBuffer());
    const hedraKey = `music-video-scenes/hedra-${scene.id}-rerun-${Date.now()}.mp4`;
    const { url: hedraVideoUrl } = await storagePut(hedraKey, hedraBuffer, 'video/mp4');
    console.log(`[HedraRerun] Saved to S3: ${hedraVideoUrl}`);

    // 13. Update DB
    await conn.execute(
      'UPDATE musicVideoScenes SET hedraVideoUrl=?, hedraGenerationId=?, hedraStatus="done", updatedAt=NOW() WHERE id=?',
      [hedraVideoUrl, gen.id, scene.id]
    );
    console.log(`[HedraRerun] DB updated ✓`);
    console.log(`\n✅ NEW HEDRA VIDEO URL:\n${hedraVideoUrl}\n`);

  } catch (err) {
    console.error('[HedraRerun] FAILED:', err);
    await conn.execute(
      'UPDATE musicVideoScenes SET hedraStatus="error", updatedAt=NOW() WHERE id=?',
      [scene.id]
    ).catch(() => {});
    throw err;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
    await conn.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
