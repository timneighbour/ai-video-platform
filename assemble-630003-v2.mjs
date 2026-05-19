/**
 * Manual assembly for Job 630003 — with audio sync fix
 * Trims audio to start at firstScene.startTime/1000 seconds
 * Uses hedraVideoUrl for Scene 0 (Performance Mode)
 */
import mysql from 'mysql2/promise';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
require('dotenv').config();

const JOB_ID = 630003;
const FFMPEG_BIN = 'ffmpeg';

// S3 upload via Forge API (matches server/storage.ts exactly)
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

  // Get job
  const [jobs] = await conn.execute('SELECT * FROM musicVideoJobs WHERE id=?', [JOB_ID]);
  const job = jobs[0];
  if (!job) throw new Error(`Job ${JOB_ID} not found`);
  console.log(`[Assembly] Job ${JOB_ID} | audioUrl: ${job.audioUrl?.slice(0,60)}...`);

  // Get completed scenes
  const [scenes] = await conn.execute(
    'SELECT * FROM musicVideoScenes WHERE jobId=? AND mvSceneStatus="completed" ORDER BY sceneIndex',
    [JOB_ID]
  );
  console.log(`[Assembly] ${scenes.length} completed scenes`);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `wizvid-job-${JOB_ID}-v2-`));
  console.log(`[Assembly] tmpDir: ${tmpDir}`);

  try {
    // Download scene clips
    const sceneFiles = [];
    for (const scene of scenes) {
      const clipUrl = scene.hedraVideoUrl ?? scene.lipSyncVideoUrl ?? scene.videoUrl;
      if (!clipUrl) { console.warn(`Scene ${scene.sceneIndex}: no clip URL, skipping`); continue; }

      const sceneFile = path.join(tmpDir, `scene-${String(scene.sceneIndex).padStart(3,'0')}.mp4`);
      console.log(`[Assembly] Downloading scene ${scene.sceneIndex} clip (${scene.hedraVideoUrl ? 'HEDRA' : scene.lipSyncVideoUrl ? 'LIPSYNC' : 'RAW'})...`);
      const resp = await fetch(clipUrl);
      if (!resp.ok) throw new Error(`Failed to download scene ${scene.sceneIndex}: ${resp.status}`);
      fs.writeFileSync(sceneFile, Buffer.from(await resp.arrayBuffer()));
      sceneFiles.push(sceneFile);
      console.log(`[Assembly] Scene ${scene.sceneIndex}: ${(fs.statSync(sceneFile).size/1024).toFixed(0)}KB`);
    }

    if (sceneFiles.length === 0) throw new Error('No scene files to assemble');

    // Download full audio
    const audioRaw = path.join(tmpDir, 'audio-raw.mp3');
    console.log(`[Assembly] Downloading audio...`);
    const audioResp = await fetch(job.audioUrl);
    if (!audioResp.ok) throw new Error(`Failed to download audio: ${audioResp.status}`);
    fs.writeFileSync(audioRaw, Buffer.from(await audioResp.arrayBuffer()));
    console.log(`[Assembly] Audio: ${(fs.statSync(audioRaw).size/1024).toFixed(0)}KB`);

    // ── AUDIO SYNC FIX ────────────────────────────────────────────────────────
    // Trim audio to start at firstScene.startTime/1000 seconds
    // This aligns the audio with the Hedra lip sync (which was trained on that segment)
    const firstScene = scenes[0];
    const audioStartSec = firstScene ? Math.floor(firstScene.startTime / 1000) : 0;
    const audioFile = path.join(tmpDir, 'audio.mp3');

    if (audioStartSec > 0) {
      console.log(`[Assembly] AUDIO SYNC FIX: trimming audio from ${audioStartSec}s (scene startTime=${firstScene.startTime}ms)`);
      execSync(`${FFMPEG_BIN} -y -i "${audioRaw}" -ss ${audioStartSec} -acodec copy "${audioFile}"`, { stdio: 'pipe' });
      console.log(`[Assembly] Audio trimmed to start at ${audioStartSec}s ✓`);
    } else {
      console.log(`[Assembly] First scene starts at 0s — no audio trim needed`);
      fs.copyFileSync(audioRaw, audioFile);
    }

    // Normalize all clips to same resolution/fps/codec
    // CRITICAL: use -vsync cfr to force constant frame rate (fixes VFR from Hedra)
    // CRITICAL: use -t <duration> to enforce exact scene duration
    const normalizedFiles = [];
    for (let i = 0; i < sceneFiles.length; i++) {
      const scene = scenes[i];
      const exactDurSec = scene ? scene.duration / 1000 : null;
      const normFile = path.join(tmpDir, `norm-${String(i).padStart(3,'0')}.mp4`);
      const durFlag = exactDurSec ? `-t ${exactDurSec}` : '';
      execSync(
        `${FFMPEG_BIN} -y -i "${sceneFiles[i]}" ${durFlag} -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24" -vsync cfr -r 24 -c:v libx264 -preset fast -crf 23 -an "${normFile}"`,
        { stdio: 'pipe' }
      );
      normalizedFiles.push(normFile);
      console.log(`[Assembly] Normalized scene ${i} (dur=${exactDurSec}s, CFR): ${(fs.statSync(normFile).size/1024).toFixed(0)}KB`);
    }

    // Concatenate
    const concatList = path.join(tmpDir, 'concat.txt');
    fs.writeFileSync(concatList, normalizedFiles.map(f => `file '${f}'`).join('\n'));
    const concatVideo = path.join(tmpDir, 'concat.mp4');
    execSync(`${FFMPEG_BIN} -y -f concat -safe 0 -i "${concatList}" -c copy "${concatVideo}"`, { stdio: 'pipe' });
    console.log(`[Assembly] Concatenated: ${(fs.statSync(concatVideo).size/1024).toFixed(0)}KB`);

    // Mix audio
    const finalVideo = path.join(tmpDir, 'final.mp4');
    execSync(
      `${FFMPEG_BIN} -y -i "${concatVideo}" -i "${audioFile}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest "${finalVideo}"`,
      { stdio: 'pipe' }
    );
    console.log(`[Assembly] Final video: ${(fs.statSync(finalVideo).size/1024).toFixed(0)}KB`);

    // Upload to S3
    const finalKey = `music-video-final/job-${JOB_ID}-v2-${Date.now()}.mp4`;
    console.log(`[Assembly] Uploading to S3...`);
    const finalBuffer = fs.readFileSync(finalVideo);
    const { url: finalVideoUrl } = await storagePut(finalKey, finalBuffer, 'video/mp4');
    console.log(`[Assembly] Uploaded: ${finalVideoUrl}`);

    // Update DB
    await conn.execute(
      'UPDATE musicVideoJobs SET status="completed", finalVideoUrl=?, updatedAt=NOW() WHERE id=?',
      [finalVideoUrl, JOB_ID]
    );
    console.log(`[Assembly] Job ${JOB_ID} marked completed ✓`);
    console.log(`\n✅ FINAL VIDEO URL:\n${finalVideoUrl}\n`);

  } finally {
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
    await conn.end();
  }
}

run().catch(err => {
  console.error('[Assembly] FAILED:', err);
  process.exit(1);
});
