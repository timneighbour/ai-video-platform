/**
 * generate-storyboard-images.mjs
 * Generates storyboard preview images for all scenes in Job 660001
 * using the Forge ImageService API, uploads via Forge v1/storage/upload.
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const JOB_ID = 660001;

function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

async function generateImage(prompt) {
  const baseUrl = ensureTrailingSlash(FORGE_API_URL);
  const fullUrl = new URL('images.v1.ImageService/GenerateImage', baseUrl).toString();
  
  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'connect-protocol-version': '1',
      'authorization': `Bearer ${FORGE_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: `Cinematic still frame, 16:9 widescreen, photorealistic, warm amber studio lighting, Air Studios recording hall atmosphere. ${prompt}`,
      original_images: [],
    }),
  });
  
  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`Image gen failed: ${response.status} ${rawText.slice(0, 200)}`);
  }
  
  const result = JSON.parse(rawText);
  return {
    b64: result.image.b64Json,
    mimeType: result.image.mimeType || 'image/png',
  };
}

async function uploadToStorage(b64Data, mimeType, relKey) {
  const baseUrl = ensureTrailingSlash(FORGE_API_URL);
  const uploadUrl = new URL('v1/storage/upload', baseUrl);
  uploadUrl.searchParams.set('path', relKey);
  
  const buffer = Buffer.from(b64Data, 'base64');
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const filename = relKey.split('/').pop() || `image.${ext}`;
  
  // Build multipart/form-data manually
  const boundary = `----WebKitFormBoundary${Date.now()}`;
  const CRLF = '\r\n';
  
  const header = Buffer.from(
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}` +
    `Content-Type: ${mimeType}${CRLF}${CRLF}`
  );
  const footer = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
  const body = Buffer.concat([header, buffer, footer]);
  
  const response = await fetch(uploadUrl.toString(), {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${FORGE_API_KEY}`,
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': body.length.toString(),
    },
    body,
  });
  
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Storage upload failed: ${response.status} ${responseText.slice(0, 200)}`);
  }
  
  const result = JSON.parse(responseText);
  return result.url;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const [scenes] = await conn.query(
    'SELECT id, sceneIndex, prompt FROM musicVideoScenes WHERE jobId = ? AND (previewImageUrl IS NULL OR previewImageUrl = "") ORDER BY sceneIndex',
    [JOB_ID]
  );
  
  if (scenes.length === 0) {
    console.log('All scenes already have storyboard images!');
    await conn.end();
    return;
  }
  
  console.log(`Generating storyboard images for ${scenes.length} scenes...`);
  
  let successCount = 0;
  
  for (const scene of scenes) {
    try {
      console.log(`  [${scene.sceneIndex}] Generating image for scene ${scene.id}...`);
      const { b64, mimeType } = await generateImage(scene.prompt ?? 'Recording studio scene');
      
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const relKey = `music-video-storyboard/${JOB_ID}-scene-${scene.id}-${Date.now()}.${ext}`;
      
      console.log(`  [${scene.sceneIndex}] Uploading to storage (key: ${relKey})...`);
      const imageUrl = await uploadToStorage(b64, mimeType, relKey);
      
      if (!imageUrl) {
        throw new Error('No URL returned from storage upload');
      }
      
      // Update DB
      await conn.query(
        'UPDATE musicVideoScenes SET previewImageUrl = ?, updatedAt = NOW() WHERE id = ?',
        [imageUrl, scene.id]
      );
      console.log(`  [${scene.sceneIndex}] ✓ ${imageUrl.slice(0, 80)}...`);
      successCount++;
      
      // Small delay between requests
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  [${scene.sceneIndex}] Error: ${err.message}`);
      // Try saving the image locally as fallback
      try {
        const { b64, mimeType } = await generateImage(scene.prompt ?? 'Recording studio scene');
        const ext = mimeType.includes('png') ? 'png' : 'jpg';
        const tmpPath = `/tmp/storyboard-${scene.id}.${ext}`;
        fs.writeFileSync(tmpPath, Buffer.from(b64, 'base64'));
        console.log(`  [${scene.sceneIndex}] Saved locally to ${tmpPath} — will upload separately`);
      } catch {}
    }
  }
  
  // Verify
  const [updated] = await conn.query(
    'SELECT COUNT(*) as cnt FROM musicVideoScenes WHERE jobId = ? AND previewImageUrl IS NOT NULL AND previewImageUrl != ""',
    [JOB_ID]
  );
  console.log(`\nDone! ${updated[0].cnt}/${scenes.length + successCount} scenes now have storyboard images.`);
  
  await conn.end();
}

main().catch(console.error);
