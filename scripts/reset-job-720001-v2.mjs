/**
 * Reset job 720001 scenes - Version 2
 * - Portrait B locked: https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/generated/1778788874216.png
 * - Recording session feel (live session, no headphones)
 * - 360° dynamic camera movement throughout
 * - 16:9 cinematic widescreen on EVERY scene
 * - Vocals aligned: silent 0-12.5s, active 12.5-25s, silent 25-32s, active 32-71s
 * - No piano keys close-up, no conductor
 * - 4 Zara performance scenes (idx 2, 6, 8, 10) + 8 cinematic scenes
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const LOCKED_PORTRAIT_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/generated/1778788874216.png';
const JOB_ID = 720001;

// 12 scenes × 6s = 71s total (last scene 5s)
// Vocal windows: active at 12.5s, silent 25-32s, active from 32s
const scenes = [
  {
    sceneIndex: 0,
    sceneType: 'cinematic',
    startTime: 0,
    duration: 6,
    prompt: `Cinematic 16:9 widescreen establishing shot of a grand orchestral recording hall — inspired by Air Studios Lyndhurst Hall. 
Camera starts high above looking down the full length of the hall, then slowly cranes down in a sweeping arc. 
Warm amber chandelier light, golden haze drifting through tall arched windows. 
A vintage Neumann U47 studio microphone on a stand is visible in the centre of the hall, lit by a single warm spotlight. 
Empty music stands arranged in a semicircle. Polished wooden floor reflects the chandelier glow. 
No people visible yet. Photorealistic, film grain, anamorphic lens flare, cinematic depth of field.`,
  },
  {
    sceneIndex: 1,
    sceneType: 'cinematic',
    startTime: 6000,
    duration: 6,
    prompt: `Cinematic 16:9 widescreen shot of the strings section in a grand orchestral recording hall. 
Camera orbits slowly around the musicians from behind, revealing the full scale of the hall ahead. 
Violinists and cellists in dark formal attire, bows moving in slow graceful arcs — wide angle so no individual hands are in close focus. 
Warm amber light, soft golden haze. The vintage studio microphone stand is visible in the far background. 
Dynamic 180° orbital camera movement. Photorealistic, film grain, anamorphic lens flare.`,
  },
  {
    sceneIndex: 2,
    sceneType: 'performance',
    startTime: 12000,
    duration: 6,
    prompt: `Cinematic 16:9 widescreen performance shot of Zara singing live at a vintage Neumann U47 studio microphone. 
Zara: woman in her late 20s, long straight jet-black hair falling past her shoulders, dark eyes, olive skin, 
wearing a black strapless top. She is facing the camera directly, singing with emotional intensity. 
Warm golden chandelier light illuminates her face. The grand orchestral hall stretches behind her, 
blurred orchestra musicians visible in the background. 
Camera starts at chest level and slowly pushes in toward her face — recording session feel, live take. 
Photorealistic, film grain, anamorphic lens flare, cinematic depth of field.`,
    heroImageUrl: LOCKED_PORTRAIT_URL,
  },
  {
    sceneIndex: 3,
    sceneType: 'cinematic',
    startTime: 18000,
    duration: 6,
    prompt: `Cinematic 16:9 widescreen wide shot of the full Lyndhurst Hall recording space. 
Camera performs a slow 270° orbit around the centre of the hall, revealing the full grandeur of the space. 
Zara's silhouette is visible at the vintage microphone in the centre, small against the grand hall. 
Blurred music stands and instrument cases in the foreground. Warm amber light, soft haze, 
tall arched windows glowing. Polished floor reflects the chandelier. 
Photorealistic, film grain, anamorphic lens flare.`,
  },
  {
    sceneIndex: 4,
    sceneType: 'cinematic',
    startTime: 24000,
    duration: 6,
    prompt: `Cinematic 16:9 widescreen atmospheric shot inside the grand recording hall. 
Camera slowly tracks along the row of arched windows, warm golden light streaming through in shafts. 
Golden dust particles float in the air, caught in the light beams. 
The hall is alive with soft ambient movement — haze drifting, light shifting. 
Slow lateral tracking movement, then a gentle rack focus to the empty hall space. 
No people visible. Photorealistic, film grain, anamorphic lens flare.`,
  },
  {
    sceneIndex: 5,
    sceneType: 'cinematic',
    startTime: 30000,
    duration: 6,
    prompt: `Cinematic 16:9 widescreen medium shot of the cellist section in the grand recording hall. 
Camera circles slowly around the cellists from the side, then pushes in toward one cellist — 
African American man in his mid-30s, dark tailored blazer, cradling his cello. 
Shot from the side showing upper body and cello body — NOT a close-up of hands or fingers. 
Warm amber light, soft haze. Camera movement is fluid and continuous, never static. 
Photorealistic, film grain, anamorphic lens flare.`,
  },
  {
    sceneIndex: 6,
    sceneType: 'performance',
    startTime: 36000,
    duration: 6,
    prompt: `Cinematic 16:9 widescreen dynamic performance shot of Zara singing live at the vintage studio microphone. 
Zara: woman in her late 20s, long straight jet-black hair, dark eyes, olive skin, black strapless top. 
Camera starts wide showing Zara and the full hall behind her, then slowly orbits 90° around her 
while pushing in — creating a dramatic 360° recording session feel. 
Warm focused spotlight from above, emotional expression — eyes slightly open, head tilted slightly. 
Blurred orchestra musicians visible in background. Photorealistic, film grain, anamorphic lens flare.`,
    heroImageUrl: LOCKED_PORTRAIT_URL,
  },
  {
    sceneIndex: 7,
    sceneType: 'cinematic',
    startTime: 42000,
    duration: 6,
    prompt: `Cinematic 16:9 widescreen atmospheric shot of the Lyndhurst Hall interior. 
Camera starts at floor level looking up toward the tall arched windows, warm golden light streaming through. 
Slowly cranes up revealing the full height of the hall — chandeliers, ornate ceiling, warm amber glow. 
Soft haze catches the light shafts. Polished wooden floor reflects the amber glow below. 
Slow, meditative upward crane movement. No people visible. 
Photorealistic, film grain, anamorphic lens flare.`,
  },
  {
    sceneIndex: 8,
    sceneType: 'performance',
    startTime: 48000,
    duration: 6,
    prompt: `Cinematic 16:9 widescreen wider performance shot of Zara at the vintage studio microphone. 
Zara: woman in her late 20s, long straight jet-black hair, dark eyes, olive skin, black strapless top. 
Full upper body visible, microphone in frame at chest level. 
Camera performs a slow 180° arc around Zara — starting from her left side, sweeping behind her, 
revealing the full orchestra in the background, then coming around to face her directly. 
Warm amber glow, recording session atmosphere. Photorealistic, film grain, anamorphic lens flare.`,
    heroImageUrl: LOCKED_PORTRAIT_URL,
  },
  {
    sceneIndex: 9,
    sceneType: 'cinematic',
    startTime: 54000,
    duration: 6,
    prompt: `Cinematic 16:9 widescreen atmospheric shot of the full strings section from behind. 
Camera pushes slowly through the orchestra from the back, weaving between music stands, 
moving toward the front of the hall where Zara's silhouette is visible at the microphone in the far distance. 
Bows moving in unison, warm amber light, soft haze. 
Slow, immersive push through the orchestra. Photorealistic, film grain, anamorphic lens flare.`,
  },
  {
    sceneIndex: 10,
    sceneType: 'performance',
    startTime: 60000,
    duration: 6,
    prompt: `Cinematic 16:9 widescreen intimate close-up performance shot of Zara at the vintage studio microphone. 
Zara: woman in her late 20s, long straight jet-black hair, dark eyes, olive skin, black strapless top. 
Face fills most of the frame, microphone visible at chin level. 
Camera starts slightly wide then slowly pushes in to an extreme close-up of her face — 
the final emotional peak of the song. Warm amber light, slight rack focus. 
Recording session feel — raw, intimate, powerful. Photorealistic, film grain, anamorphic lens flare.`,
    heroImageUrl: LOCKED_PORTRAIT_URL,
  },
  {
    sceneIndex: 11,
    sceneType: 'cinematic',
    startTime: 66000,
    duration: 5,
    prompt: `Cinematic 16:9 widescreen closing shot of Lyndhurst Hall. 
Zara stands still and serene at the vintage studio microphone, looking out into the grand hall. 
Camera performs a slow dolly out, revealing the full grandeur of the space — 
the orchestra, the chandeliers, the arched windows, the polished floor. 
Warm amber light gently fades. Orchestra musicians still in their seats, instruments at rest. 
Soft haze, polished floor reflections. The hall breathes. 
Photorealistic, film grain, anamorphic lens flare.`,
  },
];

async function resetScenes() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Delete existing scenes for this job
    const [del] = await conn.execute('DELETE FROM musicVideoScenes WHERE jobId = ?', [JOB_ID]);
    console.log(`Deleted ${del.affectedRows} existing scenes`);
    
    // Update the character portrait to Portrait B
    await conn.execute(
      'UPDATE videoCharacters SET masterPortraitUrl = ?, previewImageUrl = ? WHERE jobId = ? AND LOWER(name) LIKE ?',
      [LOCKED_PORTRAIT_URL, LOCKED_PORTRAIT_URL, JOB_ID, '%zara%']
    );
    console.log('Updated Zara character portrait to Portrait B');
    
    // Insert new scenes
    for (const scene of scenes) {
      await conn.execute(
        `INSERT INTO musicVideoScenes 
          (jobId, sceneIndex, sceneType, startTime, duration, prompt, heroImageUrl, mvSceneStatus, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
        [
          JOB_ID,
          scene.sceneIndex,
          scene.sceneType,
          scene.startTime,
          scene.duration,
          scene.prompt,
          scene.heroImageUrl || null,
        ]
      );
      console.log(`  ✓ Scene ${scene.sceneIndex} (${scene.sceneType}) inserted`);
    }
    
    // Reset job status to 'storyboard_ready' so heartbeat will pick it up
    await conn.execute(
      "UPDATE musicVideoJobs SET status = 'storyboard_ready', finalVideoUrl = NULL, updatedAt = NOW() WHERE id = ?",
      [JOB_ID]
    );
    console.log('\nJob 720001 reset to storyboard_ready');
    console.log('Portrait B locked:', LOCKED_PORTRAIT_URL);
    console.log('Total scenes:', scenes.length);
    console.log('Performance scenes:', scenes.filter(s => s.sceneType === 'performance').length);
    console.log('Cinematic scenes:', scenes.filter(s => s.sceneType === 'cinematic').length);
    
  } finally {
    await conn.end();
  }
}

resetScenes().catch(console.error);
