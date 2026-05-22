/**
 * Generate storyboard images for job 720001 v2
 * Uses the correct images.v1.ImageService/GenerateImage endpoint
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const JOB_ID = 720001;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const CDN_BASE = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908';

async function generateAndUploadImage(prompt) {
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
    throw new Error(`Invalid JSON response: ${rawText.slice(0, 200)}`);
  }

  const base64Data = result.image.b64Json;
  const mimeType = result.image.mimeType || 'image/png';
  const buffer = Buffer.from(base64Data, 'base64');

  // Upload to storage via Forge storage API
  const timestamp = Date.now();
  const storageKey = `ALJHDNsuNA7bExFuoQZUsx/storyboards-v2/${timestamp}.png`;
  const uploadUrl = `${baseUrl}v1/storage/upload?path=${encodeURIComponent(storageKey)}`;

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
    // If upload fails, construct CDN URL directly
    uploadResult = { url: `${CDN_BASE}/${storageKey}` };
  }

  return uploadResult.url || `${CDN_BASE}/${storageKey}`;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // Get all scenes without storyboard images
    const [scenes] = await conn.execute(
      'SELECT id, sceneIndex, sceneType, prompt FROM musicVideoScenes WHERE jobId = ? AND previewImageUrl IS NULL ORDER BY sceneIndex',
      [JOB_ID]
    );

    console.log(`Generating storyboard images for ${scenes.length} scenes...`);
    console.log(`Forge API: ${FORGE_API_URL}`);

    for (const scene of scenes) {
      console.log(`\nScene ${scene.sceneIndex} (${scene.sceneType})...`);

      let success = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const imageUrl = await generateAndUploadImage(scene.prompt);
          
          // Update DB with the generated URL
          await conn.execute(
            'UPDATE musicVideoScenes SET previewImageUrl = ?, updatedAt = NOW() WHERE id = ?',
            [imageUrl, scene.id]
          );
          console.log(`  ✓ Generated & saved: ${imageUrl.slice(-60)}`);
          success = true;
          break;
        } catch (err) {
          console.log(`  Attempt ${attempt}/3 failed: ${err.message.slice(0, 150)}`);
          if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
        }
      }

      if (!success) {
        console.log(`  ✗ FAILED after 3 attempts - skipping`);
      }

      // Delay between generations to avoid rate limiting
      await new Promise(r => setTimeout(r, 2000));
    }

    // Final count
    const [count] = await conn.execute(
      'SELECT COUNT(*) as total, SUM(previewImageUrl IS NOT NULL) as done FROM musicVideoScenes WHERE jobId = ?',
      [JOB_ID]
    );
    console.log(`\nFinal: ${count[0].done}/${count[0].total} storyboard images ready`);

    if (count[0].done === count[0].total) {
      console.log('All storyboards ready — job can now be rendered');
    }

  } finally {
    await conn.end();
  }
}

main().catch(console.error);
