#!/usr/bin/env node
// Check audio levels at scene 1 (6-12s) and scene 4 (24-30s) time windows
// Also check what vocalsUrl vs audioUrl contains

import { createConnection } from 'mysql2/promise';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const dbUrl = process.env.DATABASE_URL;
const url = new URL(dbUrl);
const sslParam = url.searchParams.get('ssl');
let ssl = undefined;
if (sslParam) {
  try { ssl = JSON.parse(sslParam); } catch { ssl = { rejectUnauthorized: true }; }
}

const conn = await createConnection({
  host: url.hostname, port: parseInt(url.port || '3306'),
  user: url.username, password: url.password,
  database: url.pathname.slice(1), ssl,
});

const [jobRows] = await conn.query(
  'SELECT audioUrl, stemVocalsUrl, vocalsUrl, vocalsStatus FROM musicVideoJobs WHERE id=1020003'
);
await conn.end();

const job = jobRows[0];
console.log('vocalsUrl:', job.vocalsUrl);
console.log('stemVocalsUrl:', job.stemVocalsUrl);
console.log('audioUrl:', job.audioUrl);

// Download vocalsUrl to check audio levels
const vocalsUrl = job.vocalsUrl;
const audioUrl = job.audioUrl;

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function checkAudioLevel(filePath, startSec, durationSec, label) {
  try {
    // Use ffmpeg to get volume stats for the time window
    const cmd = `ffmpeg -i "${filePath}" -ss ${startSec} -t ${durationSec} -af "volumedetect" -f null /dev/null 2>&1 | grep -E "mean_volume|max_volume|n_samples"`;
    const output = execSync(cmd, { timeout: 30000 }).toString();
    console.log(`\n[${label}] Audio levels (${startSec}s - ${startSec + durationSec}s):`);
    console.log(output || '(no output)');
  } catch (err) {
    console.log(`\n[${label}] ffmpeg error:`, err.message.slice(0, 200));
  }
}

const tmpDir = '/tmp/audio_check';
fs.mkdirSync(tmpDir, { recursive: true });

if (vocalsUrl) {
  console.log('\nDownloading vocalsUrl...');
  const vocalsFile = path.join(tmpDir, 'vocals.mp3');
  await downloadFile(vocalsUrl, vocalsFile);
  console.log('Downloaded:', vocalsFile);
  
  // Check scene 1 (6-12s)
  checkAudioLevel(vocalsFile, 6, 6, 'Scene 1 vocals');
  // Check scene 4 (24-30s)
  checkAudioLevel(vocalsFile, 24, 6, 'Scene 4 vocals');
  // Check scene 2 (12-18s) for comparison (known working)
  checkAudioLevel(vocalsFile, 12, 6, 'Scene 2 vocals (known working)');
}

if (audioUrl) {
  console.log('\nDownloading audioUrl (full mix)...');
  const audioFile = path.join(tmpDir, 'audio.mp3');
  await downloadFile(audioUrl, audioFile);
  console.log('Downloaded:', audioFile);
  
  // Check scene 1 (6-12s)
  checkAudioLevel(audioFile, 6, 6, 'Scene 1 full mix');
  // Check scene 4 (24-30s)
  checkAudioLevel(audioFile, 24, 6, 'Scene 4 full mix');
}

console.log('\nDone.');
