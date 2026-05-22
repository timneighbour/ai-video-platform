/**
 * Generate storyboard images for job 720001 v4
 * Uses native Node.js FormData (correct approach matching storagePut in storage.ts)
 * Saves to the public generated/ path
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const JOB_ID = 720001;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function generateAndSaveImage(prompt) {
  const baseUrl = FORGE_API_URL.endsWith('/') ? FORGE_API_URL : `${FORGE_API_URL}/`;
  
  // Step 1: Generate image via Forge ImageService
  const genUrl = new URL('images.v1.ImageService/GenerateImage', baseUrl).toString();
  const genResp = await fetch(genUrl, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'connect-protocol-version': '1',
      'authorization': `Bearer ${FORGE_API_KEY}`,
    },
    body: JSON.stringify({ prompt, original_images: [] }),
  });

  const genText = await genResp.text();
  if (!genResp.ok) throw new Error(`Image gen failed (${genResp.status}): ${genText.slice(0, 200)}`);
  
  const genResult = JSON.parse(genText);
  const base64Data = genResult.image.b64Json;
  const mimeType = genResult.image.mimeType || 'image/png';
  const buffer = Buffer.from(base64Data, 'base64');

  // Step 2: Upload to S3 via storage proxy using FormData (same as storagePut helper)
  const key = `generated/${Date.now()}.png`;
  const uploadUrl = new URL('v1/storage/upload', baseUrl);
  uploadUrl.searchParams.set('path', key);

  const blob = new Blob([buffer], { type: mimeType });
  const form = new FormData();
  form.append('file', blob, 'storyboard.png');

  const uploadResp = await fetch(uploadUrl.toString(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${FORGE_API_KEY}` },
    body: form,
  });

  if (!uploadResp.ok) {
    const msg = await uploadResp.text();
    throw new Error(`Storage upload failed (${uploadResp.status}): ${msg.slice(0, 200)}`);
  }

  const uploadResult = await uploadResp.json();
  const url = uploadResult.url;

  // Step 3: Verify URL is publicly accessible
  const checkResp = await fetch(url, { method: 'HEAD' });
  if (!checkResp.ok) throw new Error(`URL not accessible (${checkResp.status}): ${url}`);

  return url;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const [scenes] = await conn.execute(
      'SELECT id, sceneIndex, sceneType, prompt FROM musicVideoScenes WHERE jobId = ? ORDER BY sceneIndex',
      [JOB_ID]
    );

    console.log(`Generating ${scenes.length} storyboard images...`);

    for (const scene of scenes) {
      console.log(`\nScene ${scene.sceneIndex} (${scene.sceneType})...`);

      let success = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const imageUrl = await generateAndSaveImage(scene.prompt);
          await conn.execute(
            'UPDATE musicVideoScenes SET previewImageUrl = ?, updatedAt = NOW() WHERE id = ?',
            [imageUrl, scene.id]
          );
          console.log(`  ✓ ${imageUrl.slice(-50)}`);
          success = true;
          break;
        } catch (err) {
          console.log(`  Attempt ${attempt}/3 failed: ${err.message.slice(0, 120)}`);
          if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
        }
      }

      if (!success) console.log(`  ✗ FAILED`);
      await new Promise(r => setTimeout(r, 1500));
    }

    const [count] = await conn.execute(
      "SELECT SUM(previewImageUrl IS NOT NULL AND previewImageUrl NOT LIKE '%storyboards-v2%') as done, COUNT(*) as total FROM musicVideoScenes WHERE jobId = ?",
      [JOB_ID]
    );
    console.log(`\nComplete: ${count[0].done}/${count[0].total} storyboard images ready`);

  } finally {
    await conn.end();
  }
}

main().catch(console.error);
