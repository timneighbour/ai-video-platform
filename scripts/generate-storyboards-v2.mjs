/**
 * Generate storyboard images for all 12 scenes of Job 930003.
 * Uses the built-in Forge image generation API (no external credits needed).
 */
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
config();

const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const S3_BASE = process.env.VITE_CDN_URL || '';

if (!FORGE_URL) throw new Error('BUILT_IN_FORGE_API_URL not set');
if (!FORGE_KEY) throw new Error('BUILT_IN_FORGE_API_KEY not set');

// S3 upload helper using the project's storage endpoint
async function uploadToS3(buffer, key, mimeType) {
  // Use the forge storage proxy — correct path is v1/storage/upload?path=<key>
  const baseUrl = FORGE_URL.endsWith('/') ? FORGE_URL : FORGE_URL + '/';
  const uploadUrl = new URL('v1/storage/upload', baseUrl);
  uploadUrl.searchParams.set('path', key);
  
  const blob = new Blob([buffer], { type: mimeType });
  const form = new FormData();
  form.append('file', blob, key.split('/').pop() || 'image.png');
  
  const resp = await fetch(uploadUrl.toString(), {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${FORGE_KEY}`,
    },
    body: form,
  });
  
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`S3 upload failed ${resp.status}: ${txt.slice(0, 100)}`);
  }
  const result = await resp.json();
  return result.url;
}

async function generateImage(prompt) {
  const baseUrl = FORGE_URL.endsWith('/') ? FORGE_URL : FORGE_URL + '/';
  const fullUrl = new URL('images.v1.ImageService/GenerateImage', baseUrl).toString();
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    const resp = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'connect-protocol-version': '1',
        'authorization': `Bearer ${FORGE_KEY}`,
      },
      body: JSON.stringify({ prompt, original_images: [] }),
    });
    
    const rawText = await resp.text().catch(() => '');
    
    if (resp.status === 503 || resp.status === 502) {
      const delay = attempt * 5000;
      console.warn(`  Attempt ${attempt}/3: ${resp.status}, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    
    if (!resp.ok) {
      throw new Error(`Image generation failed ${resp.status}: ${rawText.slice(0, 200)}`);
    }
    
    let result;
    try {
      result = JSON.parse(rawText);
    } catch {
      throw new Error(`Invalid JSON response: ${rawText.slice(0, 200)}`);
    }
    
    const b64 = result?.image?.b64Json;
    if (!b64) throw new Error(`No image data in response: ${rawText.slice(0, 200)}`);
    
    const buffer = Buffer.from(b64, 'base64');
    const mimeType = result.image.mimeType || 'image/png';
    
    // Upload to S3 via storage helper
    const key = `music-video-storyboard/930003-scene-${Date.now()}.png`;
    
    // Try forge storage first, fall back to storagePut via HTTP
    try {
      const url = await uploadToS3(buffer, key, mimeType);
      return url;
    } catch (uploadErr) {
      console.warn(`  S3 upload via forge failed: ${uploadErr.message}`);
      // Return as data URL as last resort - we'll handle this
      throw uploadErr;
    }
  }
  throw new Error('All attempts failed');
}

// Scene prompts for Job 930003
const scenes = [
  { id: 810004, idx: 0, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London interior, grand concert hall, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full symphony orchestra visible in background, empty conductor podium in foreground, cinematic wide shot, photorealistic, 8K, film grain, anamorphic lens flare' },
  { id: 810005, idx: 1, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London interior, grand concert hall, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full symphony orchestra visible in background, empty conductor podium in foreground, cinematic wide shot, photorealistic, 8K, film grain, anamorphic lens flare' },
  { id: 810006, idx: 2, type: 'performance', prompt: 'Beautiful woman late 20s, white European, fair skin, dark brown hair, expressive hazel eyes, elegant black gown, extreme close-up portrait, face fills 80% of frame, Air Studios Lyndhurst Hall warm amber lighting behind her, orchestra blurred in background bokeh, she sings with eyes closed, emotional expression, photorealistic, cinematic, 8K, shallow depth of field' },
  { id: 810007, idx: 3, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London interior, grand concert hall, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full symphony orchestra visible in background, empty conductor podium in foreground, cinematic wide shot, photorealistic, 8K, film grain, anamorphic lens flare' },
  { id: 810008, idx: 4, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London interior, grand concert hall, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full symphony orchestra visible in background, empty conductor podium in foreground, cinematic wide shot, photorealistic, 8K, film grain, anamorphic lens flare' },
  { id: 810009, idx: 5, type: 'performance', prompt: 'Beautiful woman late 20s, white European, fair skin, dark brown hair in soft waves, expressive hazel eyes, elegant black gown, medium close-up from shoulders up, face clearly visible and large in frame, Air Studios Lyndhurst Hall warm amber lighting, orchestra blurred in background bokeh, she sings with full voice, photorealistic, cinematic, 8K, shallow depth of field' },
  { id: 810010, idx: 6, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London interior, grand concert hall, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full symphony orchestra visible in background, empty conductor podium in foreground, cinematic wide shot, photorealistic, 8K, film grain, anamorphic lens flare' },
  { id: 810011, idx: 7, type: 'performance', prompt: 'Beautiful woman late 20s, white European, fair skin, dark brown hair, expressive hazel eyes, elegant black gown, close-up portrait from chest up, face fills frame, Air Studios Lyndhurst Hall warm amber lighting, orchestra blurred in background bokeh, she sings with emotional intensity, photorealistic, cinematic, 8K, shallow depth of field' },
  { id: 810012, idx: 8, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London interior, grand concert hall, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full symphony orchestra visible in background, empty conductor podium in foreground, cinematic wide shot, photorealistic, 8K, film grain, anamorphic lens flare' },
  { id: 810013, idx: 9, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London interior, grand concert hall, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full symphony orchestra visible in background, empty conductor podium in foreground, cinematic wide shot, photorealistic, 8K, film grain, anamorphic lens flare' },
  { id: 810014, idx: 10, type: 'performance', prompt: 'Beautiful woman late 20s, white European, fair skin, dark brown hair, expressive hazel eyes, elegant black gown, extreme close-up portrait, face fills entire frame, emotional climax expression, Air Studios Lyndhurst Hall warm amber lighting, orchestra blurred in background bokeh, photorealistic, cinematic, 8K, shallow depth of field' },
  { id: 810015, idx: 11, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London interior, grand concert hall, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full symphony orchestra visible in background, empty conductor podium in foreground, cinematic wide shot, photorealistic, 8K, film grain, anamorphic lens flare' },
];

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const results = [];

for (const scene of scenes) {
  console.log(`\n[Scene ${scene.idx}/${scenes.length - 1}] Generating ${scene.type} storyboard image...`);
  try {
    const url = await generateImage(scene.prompt);
    await conn.execute(
      'UPDATE musicVideoScenes SET previewImageUrl = ? WHERE id = ?',
      [url, scene.id]
    );
    console.log(`[Scene ${scene.idx}] ✅ Saved: ${url.slice(0, 80)}...`);
    results.push({ id: scene.id, idx: scene.idx, url, success: true });
  } catch (err) {
    console.error(`[Scene ${scene.idx}] ❌ FAILED: ${err.message}`);
    results.push({ id: scene.id, idx: scene.idx, error: err.message, success: false });
  }
  // Delay between requests to avoid rate limiting
  await new Promise(r => setTimeout(r, 2000));
}

await conn.end();

const succeeded = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;
console.log(`\n=== COMPLETE: ${succeeded}/12 succeeded, ${failed}/12 failed ===`);
writeFileSync('/tmp/storyboard_results.json', JSON.stringify(results, null, 2));
console.log('Results saved to /tmp/storyboard_results.json');
