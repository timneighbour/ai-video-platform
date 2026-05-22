/**
 * Generate 16:9 storyboard images for job 720001 using Fal.ai Flux
 * Uses fal-image-gen with aspectRatio="16:9" to get 1344x768 images
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const JOB_ID = 720001;
const FAL_API_KEY = process.env.FAL_AI_API_KEY;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!FAL_API_KEY) throw new Error('FAL_AI_API_KEY not set');

async function generateFalImage(prompt) {
  // Use fal.ai Flux Pro with landscape_16_9 size
  const resp = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size: 'landscape_16_9',  // 1344x768 - 16:9
      num_images: 1,
      safety_tolerance: '5',
      output_format: 'jpeg',
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Fal image gen failed (${resp.status}): ${text.slice(0, 200)}`);
  }
  const data = await resp.json();
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) throw new Error('No image URL in response: ' + JSON.stringify(data).slice(0, 200));
  return imageUrl;
}

async function uploadToStorage(imageUrl) {
  // Download the image
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error(`Failed to download image: ${imgResp.status}`);
  const buffer = Buffer.from(await imgResp.arrayBuffer());
  
  // Upload to S3 via Forge storage
  const baseUrl = FORGE_API_URL.endsWith('/') ? FORGE_API_URL : `${FORGE_API_URL}/`;
  const key = `generated/${Date.now()}.jpg`;
  const uploadUrl = new URL('v1/storage/upload', baseUrl);
  uploadUrl.searchParams.set('path', key);
  
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  const form = new FormData();
  form.append('file', blob, 'storyboard.jpg');
  
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
  return uploadResult.url || uploadResult.key || key;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get all scenes for job 720001
  const [scenes] = await conn.execute(
    'SELECT id, sceneIndex, sceneType, prompt FROM musicVideoScenes WHERE jobId=? ORDER BY sceneIndex',
    [JOB_ID]
  );
  
  console.log(`Generating ${scenes.length} storyboard images at 16:9 (1344x768)...`);
  
  for (const scene of scenes) {
    const type = scene.sceneType === 'performance' ? 'performance' : 'cinematic';
    console.log(`Scene ${scene.sceneIndex} (${type})...`);
    
    try {
      // Generate 16:9 image
      const falUrl = await generateFalImage(scene.prompt);
      
      // Upload to our storage
      const storedUrl = await uploadToStorage(falUrl);
      
      // Update DB
      await conn.execute(
        'UPDATE musicVideoScenes SET previewImageUrl=? WHERE id=?',
        [storedUrl, scene.id]
      );
      
      console.log(`  ✓ ${storedUrl.slice(-50)}`);
    } catch (err) {
      console.error(`  ✗ Scene ${scene.sceneIndex}: ${err.message}`);
    }
    
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }
  
  await conn.end();
  console.log('Done!');
}

main().catch(console.error);
