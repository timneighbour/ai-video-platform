/**
 * D-ID lip sync test for Scene 0 of Job 630003
 * Uses the /talks endpoint with the hero image + isolated vocals
 * D-ID key is already a base64-encoded "email:key" string — use as Basic auth directly
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
require('dotenv').config();

const JOB_ID = 630003;
const DID_BASE = 'https://api.d-id.com';

function getAuth() {
  const key = process.env.DID_API_KEY;
  if (!key) throw new Error('DID_API_KEY not set');
  // Key is already base64-encoded "email:secret" — use directly as Basic auth value
  return `Basic ${key}`;
}

async function didGet(endpoint) {
  const res = await fetch(`${DID_BASE}${endpoint}`, {
    headers: { Authorization: getAuth(), 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`D-ID GET ${endpoint} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function didPost(endpoint, body) {
  const res = await fetch(`${DID_BASE}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: getAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`D-ID POST ${endpoint} failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
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

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Get scene 0 details
  const [scenes] = await conn.execute(
    'SELECT * FROM musicVideoScenes WHERE jobId=? ORDER BY sceneIndex LIMIT 1',
    [JOB_ID]
  );
  const scene = scenes[0];
  if (!scene) throw new Error('Scene 0 not found');
  console.log(`[D-ID] Scene ${scene.id} | heroImageUrl: ${scene.heroImageUrl?.slice(-50) || 'null'} | sceneAudioUrl: ${scene.sceneAudioUrl?.slice(-50) || 'null'}`);

  // Use the saved heroImageUrl and sceneAudioUrl from the Hedra rerun
  const heroImageUrl = scene.heroImageUrl;
  const sceneAudioUrl = scene.sceneAudioUrl;

  if (!heroImageUrl) throw new Error('No heroImageUrl saved — run the Hedra rerun script first to populate it');
  if (!sceneAudioUrl) throw new Error('No sceneAudioUrl saved — run the Hedra rerun script first to populate it');

  // D-ID /talks endpoint — uses source_url (image) + audio_url
  // driver_url: "bank://lively" gives the most expressive talking head
  console.log('[D-ID] Submitting talk generation...');
  const talk = await didPost('/talks', {
    source_url: heroImageUrl,
    script: {
      type: 'audio',
      audio_url: sceneAudioUrl,
    },
    config: {
      stitch: true,          // blend the talking head back into the original image
      result_format: 'mp4',
      fluent: true,          // smoother transitions
      pad_audio: 0.0,
    },
    driver_url: 'bank://lively',  // most expressive driver
  });

  console.log(`[D-ID] Talk created: ${talk.id} | status: ${talk.status}`);

  // Poll for completion
  const deadline = Date.now() + 5 * 60 * 1000;
  let resultUrl = null;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000));
    const status = await didGet(`/talks/${talk.id}`);
    console.log(`[D-ID] ${talk.id} — status: ${status.status}${status.status === 'created' ? '' : ` | ${JSON.stringify(status).slice(0,100)}`}`);
    if (status.status === 'done') {
      resultUrl = status.result_url;
      break;
    }
    if (status.status === 'error' || status.status === 'rejected') {
      throw new Error(`D-ID failed: ${status.error?.description || status.error?.kind || JSON.stringify(status)}`);
    }
  }
  if (!resultUrl) throw new Error('D-ID timed out after 5 minutes');
  console.log(`[D-ID] COMPLETE — result: ${resultUrl.slice(0, 80)}...`);

  // Download and upload to S3
  console.log('[D-ID] Downloading result...');
  const dlRes = await fetch(resultUrl);
  if (!dlRes.ok) throw new Error(`Download failed: ${dlRes.status}`);
  const buf = Buffer.from(await dlRes.arrayBuffer());
  console.log(`[D-ID] Downloaded: ${(buf.length/1024).toFixed(0)}KB`);

  const s3Key = `music-video-scenes/did-${scene.id}-${Date.now()}.mp4`;
  const didVideoUrl = await storagePut(s3Key, buf, 'video/mp4');
  console.log(`[D-ID] Saved to S3: ${didVideoUrl}`);

  // Save to DB as didVideoUrl (we'll add this column if needed, or reuse hedraVideoUrl for now)
  // For now, save as hedraVideoUrl so assembly picks it up immediately
  await conn.execute(
    'UPDATE musicVideoScenes SET hedraVideoUrl=?, hedraStatus="done", updatedAt=NOW() WHERE id=?',
    [didVideoUrl, scene.id]
  );
  console.log(`[D-ID] DB updated — hedraVideoUrl set to D-ID output ✓`);
  await conn.end();

  console.log(`\n✅ D-ID RAW CLIP URL:\n${didVideoUrl}\n`);
  console.log(`Talk ID: ${talk.id}`);
}

run().catch(err => { console.error('[D-ID] FAILED:', err); process.exit(1); });
