/**
 * Generate storyboard images for all 12 scenes of Job 930003.
 * Each scene gets a Flux Pro image using its scene prompt + character reference.
 * Results are saved to the DB (previewImageUrl).
 */
import mysql from 'mysql2/promise';
import { fal } from '@fal-ai/client';
import { config } from 'dotenv';
config();

const FAL_KEY = process.env.FAL_AI_API_KEY;
if (!FAL_KEY) throw new Error('FAL_AI_API_KEY not set');
fal.config({ credentials: FAL_KEY });

const ZARA_CHARACTER_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/characters/zara-portrait-b-v2.jpg';

// Scene data from DB
const scenes = [
  { id: 810004, idx: 0, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London — grand concert hall interior, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full orchestra in background, cinematic establishing shot, no people in foreground, photorealistic, 8K, film grain, anamorphic lens' },
  { id: 810005, idx: 1, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London — grand concert hall interior, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full orchestra in background, cinematic establishing shot, no people in foreground, photorealistic, 8K, film grain, anamorphic lens' },
  { id: 810006, idx: 2, type: 'performance', prompt: 'Zara — woman late 20s, white European, fair skin, dark brown hair, expressive hazel eyes, elegant black gown — extreme close-up portrait, face fills 80% of frame, Air Studios Lyndhurst Hall warm amber lighting behind her, orchestra blurred in background, she sings with eyes closed, photorealistic, cinematic, 8K' },
  { id: 810007, idx: 3, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London — grand concert hall interior, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full orchestra in background, cinematic establishing shot, no people in foreground, photorealistic, 8K, film grain, anamorphic lens' },
  { id: 810008, idx: 4, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London — grand concert hall interior, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full orchestra in background, cinematic establishing shot, no people in foreground, photorealistic, 8K, film grain, anamorphic lens' },
  { id: 810009, idx: 5, type: 'performance', prompt: 'Zara — woman late 20s, white European, fair skin, dark brown hair in soft waves, expressive hazel eyes, elegant black gown — medium close-up from shoulders up, face clearly visible, Air Studios Lyndhurst Hall warm amber lighting, orchestra blurred in background, she sings with full voice, photorealistic, cinematic, 8K' },
  { id: 810010, idx: 6, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London — grand concert hall interior, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full orchestra in background, cinematic establishing shot, no people in foreground, photorealistic, 8K, film grain, anamorphic lens' },
  { id: 810011, idx: 7, type: 'performance', prompt: 'Zara — woman late 20s, white European, fair skin, dark brown hair, expressive hazel eyes, elegant black gown — close-up portrait from chest up, face fills frame, Air Studios Lyndhurst Hall warm amber lighting, orchestra blurred in background, she sings with emotional intensity, photorealistic, cinematic, 8K' },
  { id: 810012, idx: 8, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London — grand concert hall interior, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full orchestra in background, cinematic establishing shot, no people in foreground, photorealistic, 8K, film grain, anamorphic lens' },
  { id: 810013, idx: 9, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London — grand concert hall interior, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full orchestra in background, cinematic establishing shot, no people in foreground, photorealistic, 8K, film grain, anamorphic lens' },
  { id: 810014, idx: 10, type: 'performance', prompt: 'Zara — woman late 20s, white European, fair skin, dark brown hair, expressive hazel eyes, elegant black gown — extreme close-up, face fills entire frame, emotional climax expression, Air Studios Lyndhurst Hall warm amber lighting, orchestra blurred in background, photorealistic, cinematic, 8K' },
  { id: 810015, idx: 11, type: 'cinematic', prompt: 'Air Studios Lyndhurst Hall London — grand concert hall interior, warm amber stage lighting, ornate vaulted ceiling with chandeliers, tall arched windows, polished hardwood floor, full orchestra in background, cinematic establishing shot, no people in foreground, photorealistic, 8K, film grain, anamorphic lens' },
];

const conn = await mysql.createConnection(process.env.DATABASE_URL);

async function generateImage(scene) {
  const isPerformance = scene.type === 'performance';
  const models = ['fal-ai/flux-pro/v1.1', 'fal-ai/flux/dev'];
  
  for (const modelId of models) {
    try {
      const input = {
        prompt: scene.prompt,
        image_size: 'landscape_16_9',
        num_inference_steps: modelId.includes('pro') ? 28 : 35,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: false,
      };
      
      // For performance scenes, add character reference image
      if (isPerformance && modelId === 'fal-ai/flux-pro/v1.1') {
        input.image_url = ZARA_CHARACTER_URL;
        input.image_prompt_strength = 0.35; // Moderate influence — enough for likeness, not too much
      }
      
      console.log(`[Scene ${scene.idx}] Generating with ${modelId}${isPerformance ? ' + Zara ref' : ''}...`);
      const result = await fal.subscribe(modelId, { input, logs: false });
      const url = result?.data?.images?.[0]?.url;
      if (url) {
        console.log(`[Scene ${scene.idx}] ✅ Generated: ${url.slice(0, 80)}...`);
        return url;
      }
    } catch (err) {
      console.warn(`[Scene ${scene.idx}] ${modelId} failed: ${err?.message?.slice(0, 80)}`);
    }
  }
  throw new Error(`All models failed for scene ${scene.idx}`);
}

// Process scenes sequentially to avoid rate limits
const results = [];
for (const scene of scenes) {
  try {
    const url = await generateImage(scene);
    await conn.execute(
      'UPDATE musicVideoScenes SET previewImageUrl = ? WHERE id = ?',
      [url, scene.id]
    );
    console.log(`[Scene ${scene.idx}] ✅ Saved to DB`);
    results.push({ id: scene.id, idx: scene.idx, url, success: true });
  } catch (err) {
    console.error(`[Scene ${scene.idx}] ❌ FAILED: ${err.message}`);
    results.push({ id: scene.id, idx: scene.idx, error: err.message, success: false });
  }
  // Small delay between generations
  await new Promise(r => setTimeout(r, 1000));
}

await conn.end();

console.log('\n=== STORYBOARD GENERATION COMPLETE ===');
const succeeded = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;
console.log(`Success: ${succeeded}/12, Failed: ${failed}/12`);
results.forEach(r => {
  if (r.success) console.log(`  Scene ${r.idx} (${r.id}): ✅`);
  else console.log(`  Scene ${r.idx} (${r.id}): ❌ ${r.error}`);
});
