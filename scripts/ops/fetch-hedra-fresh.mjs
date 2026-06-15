/**
 * Re-fetch fresh Hedra download URL for generation d1fbd3c2-d022-4291-871d-29bd8cc42b2d
 * and save to S3, then update DB for Scene 0 of Job 630003
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
require('dotenv').config();

const GENERATION_ID = 'd1fbd3c2-d022-4291-871d-29bd8cc42b2d';
const SCENE_ID = 630003;
const HEDRA_BASE_URL = 'https://api.hedra.com/web-app/public';

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

async function run() {
  const key = process.env.HEDRA_API_KEY;
  if (!key) throw new Error('HEDRA_API_KEY not set');

  // Poll for fresh URL
  console.log(`[FetchHedra] Polling generation ${GENERATION_ID}...`);
  const res = await fetch(`${HEDRA_BASE_URL}/generations`, {
    headers: { 'X-API-Key': key },
  });
  const data = await res.json();
  const gen = data.data?.find(x => x.id === GENERATION_ID);
  if (!gen) throw new Error(`Generation ${GENERATION_ID} not found`);
  console.log(`[FetchHedra] Status: ${gen.status} | progress: ${gen.progress}`);

  const downloadUrl = gen?.asset?.asset?.download_url;
  if (!downloadUrl) throw new Error(`No download_url on generation: ${JSON.stringify(gen?.asset)}`);
  console.log(`[FetchHedra] Fresh URL: ${downloadUrl.slice(0, 80)}...`);

  // Download
  console.log('[FetchHedra] Downloading...');
  const tmpFile = path.join(os.tmpdir(), `hedra-${GENERATION_ID}.mp4`);
  const dlRes = await fetch(downloadUrl);
  if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`);
  const buf = Buffer.from(await dlRes.arrayBuffer());
  fs.writeFileSync(tmpFile, buf);
  console.log(`[FetchHedra] Downloaded: ${(buf.length/1024).toFixed(0)}KB`);

  // Upload to S3
  const s3Key = `music-video-scenes/hedra-${SCENE_ID}-rerun2-${Date.now()}.mp4`;
  console.log('[FetchHedra] Uploading to S3...');
  const hedraVideoUrl = await storagePut(s3Key, buf, 'video/mp4');
  console.log(`[FetchHedra] S3 URL: ${hedraVideoUrl}`);

  // Update DB
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  await conn.execute(
    'UPDATE musicVideoScenes SET hedraVideoUrl=?, hedraGenerationId=?, hedraStatus="done", updatedAt=NOW() WHERE id=?',
    [hedraVideoUrl, GENERATION_ID, SCENE_ID]
  );
  console.log(`[FetchHedra] DB updated for scene ${SCENE_ID} ✓`);
  await conn.end();

  console.log(`\n✅ NEW HEDRA VIDEO URL:\n${hedraVideoUrl}\n`);
  fs.unlinkSync(tmpFile);
}

run().catch(err => { console.error('[FetchHedra] FAILED:', err); process.exit(1); });
