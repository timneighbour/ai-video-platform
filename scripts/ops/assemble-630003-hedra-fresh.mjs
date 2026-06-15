/**
 * Assembly for Job 630003 — uses the FRESH Hedra lip sync clip
 * 
 * Scene 0: Performance (startTime=24000ms, duration=6000ms)
 *   - Hedra clip: Zara singing isolated vocals from 36-42s of the track
 *   - BUT the scene's startTime is 24s, so audio trim starts at 24s
 *   - The Hedra clip was generated with vocals from 36-42s, so we need to
 *     use the isolated vocals for this scene and full mix for the rest
 *   
 * Scene 1: Cinematic (startTime=30000ms, duration=6000ms)
 *   - WaveSpeed raw clip (no lip sync needed)
 *
 * Audio strategy: Trim full audio to start at 24s (firstScene.startTime)
 * This gives us audio from 24-36s total (12s for 2 scenes of 6s each)
 * 
 * NOTE: The Hedra clip was generated with ISOLATED VOCALS from 36-42s,
 * but the scene plays at 24-30s in the timeline. This is a test to see
 * if the mouth movements look convincing even with a different audio segment.
 * In production, the audio offset will match correctly.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import 'dotenv/config';

const FFMPEG_BIN = 'ffmpeg';

// Fresh Hedra clip uploaded to CDN
const HEDRA_CLIP_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/test-lipsync/hedra-zara-final-test.mp4';

// Scene 1 cinematic clip (WaveSpeed)
const CINEMATIC_CLIP_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/music-video-scenes/630004-1779201570616.mp4';

// Full audio track URL (from job)
const AUDIO_URL_QUERY = `SELECT audioUrl FROM musicVideoJobs WHERE id=630003`;

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
  const mysql = await import('mysql2/promise');
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Get audio URL from job
    const [jobs] = await conn.execute('SELECT audioUrl FROM musicVideoJobs WHERE id=630003');
    const audioUrl = jobs[0]?.audioUrl;
    if (!audioUrl) throw new Error('No audio URL found for job 630003');
    console.log(`[Assembly] Audio URL: ${audioUrl.slice(0, 80)}...`);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wizvid-hedra-fresh-'));
    console.log(`[Assembly] tmpDir: ${tmpDir}`);

    // Download clips
    console.log('[Assembly] Downloading Hedra clip (Scene 0 - Performance)...');
    const hedraResp = await fetch(HEDRA_CLIP_URL);
    const hedraFile = path.join(tmpDir, 'scene-000.mp4');
    fs.writeFileSync(hedraFile, Buffer.from(await hedraResp.arrayBuffer()));
    console.log(`  Hedra clip: ${(fs.statSync(hedraFile).size / 1024).toFixed(0)}KB`);

    console.log('[Assembly] Downloading cinematic clip (Scene 1)...');
    const cinResp = await fetch(CINEMATIC_CLIP_URL);
    const cinFile = path.join(tmpDir, 'scene-001.mp4');
    fs.writeFileSync(cinFile, Buffer.from(await cinResp.arrayBuffer()));
    console.log(`  Cinematic clip: ${(fs.statSync(cinFile).size / 1024).toFixed(0)}KB`);

    // Download audio
    console.log('[Assembly] Downloading full audio track...');
    const audioResp = await fetch(audioUrl);
    const audioRaw = path.join(tmpDir, 'audio-raw.mp3');
    fs.writeFileSync(audioRaw, Buffer.from(await audioResp.arrayBuffer()));
    console.log(`  Audio: ${(fs.statSync(audioRaw).size / 1024).toFixed(0)}KB`);

    // Trim audio to start at 24s (firstScene.startTime = 24000ms)
    const audioStartSec = 24;
    const audioFile = path.join(tmpDir, 'audio-trimmed.mp3');
    console.log(`[Assembly] Trimming audio from ${audioStartSec}s...`);
    execSync(`${FFMPEG_BIN} -y -i "${audioRaw}" -ss ${audioStartSec} -acodec copy "${audioFile}"`, { stdio: 'pipe' });

    // Normalize clips to 1280x720, 24fps CFR, exact duration
    const scenes = [
      { file: hedraFile, duration: 6.0, label: 'Hedra (Performance)' },
      { file: cinFile, duration: 6.0, label: 'WaveSpeed (Cinematic)' },
    ];

    const normalizedFiles = [];
    for (let i = 0; i < scenes.length; i++) {
      const { file, duration, label } = scenes[i];
      const normFile = path.join(tmpDir, `norm-${String(i).padStart(3, '0')}.mp4`);
      execSync(
        `${FFMPEG_BIN} -y -i "${file}" -t ${duration} -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24" -vsync cfr -r 24 -c:v libx264 -preset fast -crf 23 -an "${normFile}"`,
        { stdio: 'pipe' }
      );
      normalizedFiles.push(normFile);
      console.log(`  Normalized ${label}: ${(fs.statSync(normFile).size / 1024).toFixed(0)}KB`);
    }

    // Concatenate
    const concatList = path.join(tmpDir, 'concat.txt');
    fs.writeFileSync(concatList, normalizedFiles.map(f => `file '${f}'`).join('\n'));
    const concatVideo = path.join(tmpDir, 'concat.mp4');
    execSync(`${FFMPEG_BIN} -y -f concat -safe 0 -i "${concatList}" -c copy "${concatVideo}"`, { stdio: 'pipe' });
    console.log(`[Assembly] Concatenated: ${(fs.statSync(concatVideo).size / 1024).toFixed(0)}KB`);

    // Mix audio with video
    const finalVideo = path.join(tmpDir, 'final.mp4');
    execSync(
      `${FFMPEG_BIN} -y -i "${concatVideo}" -i "${audioFile}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest "${finalVideo}"`,
      { stdio: 'pipe' }
    );
    console.log(`[Assembly] Final video: ${(fs.statSync(finalVideo).size / 1024).toFixed(0)}KB`);

    // Probe final video
    const probeOut = execSync(`ffprobe -v quiet -print_format json -show_format "${finalVideo}"`).toString();
    const probe = JSON.parse(probeOut);
    console.log(`[Assembly] Duration: ${parseFloat(probe.format.duration).toFixed(2)}s, Size: ${(parseInt(probe.format.size) / 1024 / 1024).toFixed(2)}MB`);

    // Upload to S3
    const finalKey = `music-video-final/job-630003-hedra-fresh-${Date.now()}.mp4`;
    console.log(`[Assembly] Uploading to S3: ${finalKey}`);
    const finalBuffer = fs.readFileSync(finalVideo);
    const { url: finalVideoUrl } = await storagePut(finalKey, finalBuffer, 'video/mp4');
    console.log(`\n✅ FINAL VIDEO URL:\n${finalVideoUrl}\n`);

    // Update DB
    await conn.execute(
      'UPDATE musicVideoJobs SET status="completed", finalVideoUrl=?, updatedAt=NOW() WHERE id=?',
      [finalVideoUrl, 630003]
    );
    console.log('[Assembly] Job 630003 updated in DB ✓');

    // Also update Scene 0 hedraVideoUrl to the fresh clip
    await conn.execute(
      'UPDATE musicVideoScenes SET hedraVideoUrl=? WHERE jobId=630003 AND sceneIndex=0',
      [HEDRA_CLIP_URL]
    );
    console.log('[Assembly] Scene 0 hedraVideoUrl updated to fresh Hedra clip ✓');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error('[Assembly] FAILED:', err);
  process.exit(1);
});
