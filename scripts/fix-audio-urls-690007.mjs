import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check current job 690007 audio URLs
const [jobs] = await conn.execute(
  "SELECT id, audioUrl, audioKey, vocalsUrl, vocalsKey FROM musicVideoJobs WHERE id=690007"
);
const job = jobs[0];
console.log('Current job 690007 audio URLs:');
console.log('  audioUrl:', job.audioUrl);
console.log('  audioKey:', job.audioKey);
console.log('  vocalsUrl:', job.vocalsUrl);
console.log('  vocalsKey:', job.vocalsKey);

// Check if the CDN URLs work
async function checkUrl(url) {
  if (!url) return 'null';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return `HTTP ${res.status}`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

console.log('\nChecking URL accessibility:');
console.log('  audioUrl:', await checkUrl(job.audioUrl));
console.log('  vocalsUrl:', await checkUrl(job.vocalsUrl));

// The CDN URL for the showcase audio
const cdnAudioUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-fullmix_bf2a7b2a.mp3';
const cdnVocalsUrl = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/zara-vocal-stem_demucs.mp3';

console.log('\nChecking CDN URLs:');
console.log('  CDN audio:', await checkUrl(cdnAudioUrl));
console.log('  CDN vocals:', await checkUrl(cdnVocalsUrl));

// Also check the GOLDEN_AUDIO_URL format to understand what CDN prefix is used
console.log('\nGOLDEN_AUDIO_URL:', process.env.GOLDEN_AUDIO_URL);

// Try to find the correct CDN URL from the environment
const cdnBase = process.env.VITE_CDN_URL || 'https://d2xsxph8kpxj0f.cloudfront.net';
console.log('CDN base:', cdnBase);

// Update the job with CDN URLs if the S3 direct URLs are 404
if (job.audioUrl && job.audioUrl.includes('manus-storage.s3')) {
  const s3Key = job.audioKey || job.audioUrl.split('.amazonaws.com/')[1];
  const newCdnUrl = `${cdnBase}/${s3Key}`;
  console.log('\nWould update audioUrl to CDN:', newCdnUrl);
  console.log('  CDN audio check:', await checkUrl(newCdnUrl));
}

if (job.vocalsUrl && job.vocalsUrl.includes('manus-storage.s3')) {
  const s3Key = job.vocalsKey || job.vocalsUrl.split('.amazonaws.com/')[1];
  const newCdnUrl = `${cdnBase}/${s3Key}`;
  console.log('\nWould update vocalsUrl to CDN:', newCdnUrl);
  console.log('  CDN vocals check:', await checkUrl(newCdnUrl));
}

await conn.end();
