/**
 * Generate 16:9 storyboard images for all 12 new scenes of job 720001.
 * Uses the Forge ImageService API (same as generateImage helper).
 * Saves the URLs back to the musicVideoScenes table.
 */
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, '');
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DB_URL = process.env.DATABASE_URL;

// Locked Zara portrait for performance scene storyboards
const LOCKED_PORTRAIT_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/characters/zara-locked-portrait-720001.png';

// Storyboard prompts optimized for 16:9 image generation
// These are shorter, image-generation-friendly versions of the scene prompts
const STORYBOARD_PROMPTS = [
  // idx 0: Cinematic establishing shot
  `Cinematic 16:9 widescreen establishing shot, grand orchestral recording hall, Lyndhurst Hall style, 
warm amber light, tall arched windows, soft golden haze, empty music stands, polished wooden floor 
reflecting chandelier light, no people, photorealistic, film grain, anamorphic lens flare`,

  // idx 1: Strings section
  `Cinematic 16:9 widescreen, strings section in grand recording hall, violinists and cellists 
in dark formal attire, bows in motion, side angle showing upper bodies not hands, warm amber 
orchestral lighting, soft haze, polished floor, photorealistic, film grain`,

  // idx 2: Performance - Zara side profile (uses portrait reference)
  `Cinematic 16:9 widescreen, intimate side-profile portrait of elegant female singer at vintage 
studio microphone, long dark brown wavy hair, elegant black gown, warm amber orchestral lighting, 
tall arched windows with golden light, Air Studios recording hall, photorealistic, film grain`,

  // idx 3: Wide hall with Zara silhouette
  `Cinematic 16:9 widescreen, wide shot of grand orchestral recording hall, female singer silhouette 
in far background at vintage microphone, blurred music stands in foreground, warm amber light, 
tall arched windows, soft haze, photorealistic, film grain, anamorphic lens flare`,

  // idx 4: Atmospheric light through windows
  `Cinematic 16:9 widescreen, atmospheric interior of grand recording hall, warm golden light 
streaming through tall arched windows in shafts, soft haze, golden dust particles floating, 
polished wooden floor reflecting amber glow, no people, photorealistic, film grain`,

  // idx 5: Cellist upper body
  `Cinematic 16:9 widescreen, medium shot of cellist in grand recording hall, African American man 
in dark tailored blazer, cradling cello, upper body shot not hands close-up, warm amber light, 
soft haze, photorealistic, film grain, anamorphic lens flare`,

  // idx 6: Performance - Zara Dutch angle
  `Cinematic 16:9 widescreen, dynamic Dutch angle shot of elegant female singer at vintage 
microphone, long dark brown wavy hair, black gown, warm focused spotlight from above, 
emotional expression eyes slightly closed, blurred orchestra in background, photorealistic, film grain`,

  // idx 7: Light through arched windows
  `Cinematic 16:9 widescreen, Lyndhurst Hall interior, looking towards tall arched windows, 
warm golden light streaming through, soft haze, polished wooden floor reflections, 
slow meditative atmosphere, no people, photorealistic, film grain, anamorphic lens flare`,

  // idx 8: Performance - Zara wider shot
  `Cinematic 16:9 widescreen, wider side-profile shot of elegant female singer at vintage 
microphone, long dark brown wavy hair, elegant black gown, full upper body visible, 
warm amber glow, blurred orchestra in background, Air Studios hall, photorealistic, film grain`,

  // idx 9: Strings atmospheric from behind
  `Cinematic 16:9 widescreen, atmospheric shot of strings section from behind, wide angle 
looking towards front of hall, bows moving in unison, warm amber light, soft haze, 
female singer silhouette visible in far distance at microphone, photorealistic, film grain`,

  // idx 10: Performance - Zara intimate close-up
  `Cinematic 16:9 widescreen, intimate close-up of elegant female singer at vintage microphone, 
long dark brown wavy hair, black gown, face fills frame, microphone at chin level, 
warm amber light, emotional final peak expression, photorealistic, film grain`,

  // idx 11: Closing dolly out
  `Cinematic 16:9 widescreen, closing shot of Lyndhurst Hall, elegant female singer standing 
serene at vintage microphone in grand hall, slow dolly out revealing full grandeur, 
warm amber light fading, orchestra musicians at rest, soft haze, photorealistic, film grain`,
];

async function generateStoryboardImage(prompt, portraitUrl = null) {
  const baseUrl = FORGE_API_URL.endsWith('/') ? FORGE_API_URL : `${FORGE_API_URL}/`;
  const fullUrl = new URL('images.v1.ImageService/GenerateImage', baseUrl).toString();
  
  const body = {
    prompt,
    original_images: portraitUrl ? [{ url: portraitUrl, mimeType: 'image/png' }] : [],
  };
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'connect-protocol-version': '1',
        'authorization': `Bearer ${FORGE_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    
    const text = await res.text();
    
    if (res.status === 503 || res.status === 502) {
      if (attempt < 3) {
        console.warn(`  Attempt ${attempt} failed (${res.status}), retrying...`);
        await new Promise(r => setTimeout(r, attempt * 5000));
        continue;
      }
      throw new Error(`Image generation failed after 3 attempts: ${res.status}`);
    }
    
    if (!res.ok) {
      throw new Error(`Image generation failed: ${res.status} ${text.slice(0, 200)}`);
    }
    
    const result = JSON.parse(text);
    const buffer = Buffer.from(result.image.b64Json, 'base64');
    
    // Upload to S3
    const key = `generated/${Date.now()}.png`;
    const uploadUrl = new URL(`${FORGE_API_URL}/v1/storage/upload`);
    uploadUrl.searchParams.set('path', key);
    
    const blob = new Blob([buffer], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', blob, 'storyboard.png');
    
    const uploadRes = await fetch(uploadUrl.toString(), {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${FORGE_API_KEY}` },
      body: formData,
    });
    
    const uploadData = await uploadRes.json();
    return uploadData.url;
  }
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  
  // Get all scenes for job 720001 ordered by sceneIndex
  const [scenes] = await conn.execute(
    'SELECT id, sceneIndex, sceneType FROM musicVideoScenes WHERE jobId=720001 ORDER BY sceneIndex'
  );
  
  console.log(`Generating storyboard images for ${scenes.length} scenes...`);
  
  for (const scene of scenes) {
    const idx = scene.sceneIndex;
    const prompt = STORYBOARD_PROMPTS[idx];
    const isPerformance = scene.sceneType === 'performance';
    
    console.log(`\nScene ${idx} (${scene.sceneType}):`);
    console.log(`  Prompt: ${prompt.slice(0, 80)}...`);
    
    try {
      // For performance scenes, use the locked portrait as reference
      const portraitRef = isPerformance ? LOCKED_PORTRAIT_URL : null;
      const imageUrl = await generateStoryboardImage(prompt, portraitRef);
      
      // Save to DB
      await conn.execute(
        'UPDATE musicVideoScenes SET previewImageUrl=?, updatedAt=NOW() WHERE id=?',
        [imageUrl, scene.id]
      );
      
      console.log(`  ✓ Generated: ${imageUrl.slice(-50)}`);
    } catch (err) {
      console.error(`  ✗ FAILED: ${err.message}`);
      // Don't stop — continue with other scenes
    }
    
    // Small delay between generations to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Verify all scenes now have storyboard images
  const [updated] = await conn.execute(
    'SELECT COUNT(*) as total, SUM(previewImageUrl IS NOT NULL) as withImage FROM musicVideoScenes WHERE jobId=720001'
  );
  console.log(`\nDone! ${updated[0].withImage}/${updated[0].total} scenes have storyboard images`);
  
  await conn.end();
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
