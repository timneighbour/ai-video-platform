/**
 * Generate storyboard images for job 720001 v3
 * Saves to the public generated/ path (not storyboards-v2/ which is 403)
 * Uses the Forge ImageService API directly and saves via storagePut helper pattern
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const https = require('https');
dotenv.config();

const JOB_ID = 720001;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function generateAndSaveImage(prompt) {
  const baseUrl = FORGE_API_URL.endsWith('/') ? FORGE_API_URL : `${FORGE_API_URL}/`;
  const fullUrl = `${baseUrl}images.v1.ImageService/GenerateImage`;

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'connect-protocol-version': '1',
      'authorization': `Bearer ${FORGE_API_KEY}`,
    },
    body: JSON.stringify({
      prompt,
      original_images: [],
    }),
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`Image generation failed (${response.status}): ${rawText.slice(0, 300)}`);
  }

  let result;
  try {
    result = JSON.parse(rawText);
  } catch {
    throw new Error(`Invalid JSON: ${rawText.slice(0, 200)}`);
  }

  const base64Data = result.image.b64Json;
  const mimeType = result.image.mimeType || 'image/png';
  const buffer = Buffer.from(base64Data, 'base64');

  // Upload to the public generated/ path (same as imageGeneration.ts helper)
  const timestamp = Date.now();
  const storageKey = `generated/${timestamp}.png`;
  const uploadUrl = `${baseUrl}v1/storage/upload?path=${encodeURIComponent('ALJHDNsuNA7bExFuoQZUsx/' + storageKey)}`;

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
      'Authorization': `Bearer ${FORGE_API_KEY}`,
    },
    body: buffer,
  });

  const uploadText = await uploadResponse.text();
  let uploadResult;
  try {
    uploadResult = JSON.parse(uploadText);
  } catch {
    uploadResult = {};
  }

  // The URL returned by the storage API
  const url = uploadResult.url || `https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/${storageKey}`;
  
  // Verify it's accessible
  const checkResp = await fetch(url, { method: 'HEAD' });
  if (!checkResp.ok) {
    throw new Error(`Generated image URL returned ${checkResp.status}: ${url}`);
  }
  
  return url;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // Clear old 403 storyboard URLs and regenerate
    const [scenes] = await conn.execute(
      'SELECT id, sceneIndex, sceneType, prompt FROM musicVideoScenes WHERE jobId = ? ORDER BY sceneIndex',
      [JOB_ID]
    );

    console.log(`Regenerating ${scenes.length} storyboard images to public generated/ path...`);

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
          console.log(`  Attempt ${attempt}/3: ${err.message.slice(0, 120)}`);
          if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
        }
      }

      if (!success) console.log(`  ✗ FAILED - skipping`);
      await new Promise(r => setTimeout(r, 1500));
    }

    const [count] = await conn.execute(
      'SELECT COUNT(*) as total, SUM(previewImageUrl IS NOT NULL) as done FROM musicVideoScenes WHERE jobId = ?',
      [JOB_ID]
    );
    console.log(`\nDone: ${count[0].done}/${count[0].total} storyboard images ready`);

  } finally {
    await conn.end();
  }
}

main().catch(console.error);
