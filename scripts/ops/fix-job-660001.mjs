/**
 * Fix Job 660001 — Air Studios Re-render
 * 
 * Changes:
 * 1. Restore correct Zara character description (white female, long black hair, green eyes)
 * 2. Update character portrait URL to the correct one
 * 3. Revise storyboard prompts:
 *    - Remove pianist's hands/fingers shots
 *    - Replace with Zara-focused shots in Air Studios environment
 *    - Any musician scenes: tempo-matched to 76 BPM (slow, sustained bowing)
 *    - No orchestra unless Zara is clearly the focus
 * 4. Reset all scenes to pending for re-render
 * 5. Reset job to rendering status
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config({ path: '/home/ubuntu/ai-video-platform/.env' });
import mysql from 'mysql2/promise';

const JOB_ID = 660001;

// The CORRECT Zara description — from Job 540026 (approved gold standard)
const ZARA_LOCKED_DESCRIPTION = `Zara: A photorealistic, cinematic close-up of a young woman in her late 20s with a very slim, slender build. She has long, straight black hair cascading down her back, striking green eyes, and a subtly alluring, confident expression. She wears a fitted black lace-up corset top. Natural skin texture, cinematic lighting.`;

// Short anchor for prompt injection (max 150 chars)
const ZARA_ANCHOR = `Zara: slim white woman, long straight black hair, green eyes, black corset top, confident singer.`;

// Air Studios environment description
const AIR_STUDIOS_ENV = `Inside a grand recording studio hall inspired by Air Studios Lindhurst Hall. Massive high-ceilinged room, warm amber and golden lighting, polished hardwood floors, large arched windows with soft natural light filtering in. Intimate, cinematic atmosphere.`;

// Tempo guidance for any musician scenes (76 BPM = slow ballad)
// Beat interval ~0.79s — very slow, sustained movements
const TEMPO_GUIDANCE = `slow sustained bow strokes matching a 76 BPM ballad, arms barely moving, long deliberate strokes, emotionally still, gentle and measured`;

// New storyboard — 11 scenes, all focused on Zara in Air Studios
// Scenes alternate: performance (Zara singing close-up) and cinematic (Zara in the studio environment)
// NO pianist hands, NO fast orchestra, minimal background musicians only as blurred atmosphere
const NEW_SCENE_PROMPTS = [
  // Scene 0: Establishing — Zara enters the studio
  {
    sceneIndex: 0,
    sceneType: 'cinematic',
    lipSync: false,
    prompt: `${ZARA_ANCHOR} Wide cinematic establishing shot. ${AIR_STUDIOS_ENV} Zara stands at a vintage microphone in the centre of the hall, her back slightly to camera, looking up at the high ceiling. The room is vast and beautiful around her. Camera slowly pushes in. Cinematic, emotional, 16:9.`,
  },
  // Scene 1: Performance — first close-up of Zara singing
  {
    sceneIndex: 1,
    sceneType: 'performance',
    lipSync: true,
    prompt: `${ZARA_ANCHOR} Close-up performance shot. ${AIR_STUDIOS_ENV} Zara at a vintage microphone, face lit by warm golden studio light, eyes closed, singing with deep emotion. Her long black hair frames her face. Camera gently orbits her. Cinematic, intimate, 16:9.`,
  },
  // Scene 2: Cinematic — Zara from the side, studio in background
  {
    sceneIndex: 2,
    sceneType: 'cinematic',
    lipSync: false,
    prompt: `${ZARA_ANCHOR} Cinematic side-angle shot. ${AIR_STUDIOS_ENV} Zara stands at the microphone in profile, her long black hair cascading down. Behind her, out of focus, the warm glow of the studio hall. Camera slowly tracks around her. Moody, cinematic, 16:9.`,
  },
  // Scene 3: Performance — medium close-up, eyes open
  {
    sceneIndex: 3,
    sceneType: 'performance',
    lipSync: true,
    prompt: `${ZARA_ANCHOR} Medium close-up performance shot. ${AIR_STUDIOS_ENV} Zara at the microphone, eyes open and luminous, singing with controlled emotion. Warm amber light catches her green eyes. Her expression is vulnerable and powerful. Camera holds steady. Cinematic, 16:9.`,
  },
  // Scene 4: Cinematic — wide shot, Zara small in the grand hall
  {
    sceneIndex: 4,
    sceneType: 'cinematic',
    lipSync: false,
    prompt: `${ZARA_ANCHOR} Wide dramatic shot. ${AIR_STUDIOS_ENV} Zara is a small figure at the microphone in the centre of the vast hall. The grandeur of the space dwarfs her. Shafts of golden light fall from high windows. Camera slowly cranes up. Epic, cinematic, 16:9.`,
  },
  // Scene 5: Performance — tight close-up, emotional peak
  {
    sceneIndex: 5,
    sceneType: 'performance',
    lipSync: true,
    prompt: `${ZARA_ANCHOR} Tight close-up performance shot. ${AIR_STUDIOS_ENV} Extreme close-up of Zara's face at the microphone. Her green eyes are glistening, raw emotion visible. Warm studio light. Her lips move with the words. Camera barely moves. Intimate, powerful, cinematic, 16:9.`,
  },
  // Scene 6: Cinematic — Zara from behind, facing the studio
  {
    sceneIndex: 6,
    sceneType: 'cinematic',
    lipSync: false,
    prompt: `${ZARA_ANCHOR} Cinematic rear shot. ${AIR_STUDIOS_ENV} Zara stands at the microphone facing away from camera, her long black hair down her back. The beautiful studio hall stretches before her. Soft golden light. Camera slowly moves around to reveal her profile. Cinematic, 16:9.`,
  },
  // Scene 7: Performance — medium shot, full presence
  {
    sceneIndex: 7,
    sceneType: 'performance',
    lipSync: true,
    prompt: `${ZARA_ANCHOR} Medium performance shot. ${AIR_STUDIOS_ENV} Zara at the microphone, upper body visible, singing with full presence. Her black corset top and long black hair are lit beautifully by warm amber studio lights. Emotional, confident. Camera gently circles. Cinematic, 16:9.`,
  },
  // Scene 8: Cinematic — atmospheric, studio with Zara
  {
    sceneIndex: 8,
    sceneType: 'cinematic',
    lipSync: false,
    prompt: `${ZARA_ANCHOR} Atmospheric wide shot. ${AIR_STUDIOS_ENV} Zara at the microphone, the studio bathed in warm golden light. In the far background, very softly out of focus, the silhouettes of a few string players with ${TEMPO_GUIDANCE}. Zara is the clear focus. Cinematic, 16:9.`,
  },
  // Scene 9: Performance — climactic close-up
  {
    sceneIndex: 9,
    sceneType: 'performance',
    lipSync: true,
    prompt: `${ZARA_ANCHOR} Climactic close-up performance shot. ${AIR_STUDIOS_ENV} Zara at the microphone, the most emotional moment of the song. Her face is lit dramatically, green eyes blazing. Her expression shifts from vulnerability to power. Camera holds close. Cinematic, 16:9.`,
  },
  // Scene 10: Cinematic — final wide, Zara and the studio
  {
    sceneIndex: 10,
    sceneType: 'cinematic',
    lipSync: false,
    prompt: `${ZARA_ANCHOR} Final wide cinematic shot. ${AIR_STUDIOS_ENV} Zara stands at the microphone as the song ends, her head slightly bowed, long black hair falling forward. The vast studio hall glows warmly around her. Camera slowly pulls back. Emotional, final, cinematic, 16:9.`,
  },
];

(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log(`\n=== FIXING JOB ${JOB_ID} ===\n`);
  
  // 1. Update character description
  console.log('1. Updating character description...');
  const [charResult] = await conn.execute(
    `UPDATE videoCharacters SET lockedDescription = ?, updatedAt = NOW() WHERE jobId = ?`,
    [ZARA_LOCKED_DESCRIPTION, JOB_ID]
  );
  console.log(`   Updated ${charResult.affectedRows} character row(s)`);
  
  // 2. Update job characterImageUrl to the correct portrait (from Job 540026)
  // The portrait URL is the same — it was already set correctly
  // But update the job's character description reference
  console.log('2. Verifying job character image URL...');
  const [jobCheck] = await conn.execute(
    `SELECT characterImageUrl FROM musicVideoJobs WHERE id = ?`,
    [JOB_ID]
  );
  console.log(`   Current characterImageUrl: ${jobCheck[0]?.characterImageUrl?.slice(-60)}`);
  
  // 3. Update each scene's prompt and type
  console.log('3. Updating scene prompts...');
  for (const scene of NEW_SCENE_PROMPTS) {
    const [result] = await conn.execute(
      `UPDATE musicVideoScenes 
       SET prompt = ?, sceneType = ?, lipSync = ?, 
           mvSceneStatus = 'pending', taskId = NULL, videoUrl = NULL, videoKey = NULL,
           lipSyncStatus = 'pending', lipSyncTaskId = NULL, lipSyncVideoUrl = NULL, lipSyncVideoKey = NULL,
           sceneAudioUrl = NULL, sceneAudioKey = NULL,
           errorMessage = NULL, retryCount = 0,
           updatedAt = NOW()
       WHERE jobId = ? AND sceneIndex = ?`,
      [scene.prompt, scene.sceneType, scene.lipSync ? 1 : 0, JOB_ID, scene.sceneIndex]
    );
    console.log(`   Scene ${scene.sceneIndex} (${scene.sceneType}, lipSync=${scene.lipSync}): ${result.affectedRows} row(s) updated`);
  }
  
  // 4. Reset job to rendering status
  console.log('4. Resetting job to rendering status...');
  const [jobResult] = await conn.execute(
    `UPDATE musicVideoJobs 
     SET status = 'rendering', completedScenes = 0, finalVideoUrl = NULL, finalVideoKey = NULL,
         probeVideoUrl = NULL, probePassed = NULL, probeSceneId = NULL,
         errorMessage = NULL, updatedAt = NOW()
     WHERE id = ?`,
    [JOB_ID]
  );
  console.log(`   Job reset: ${jobResult.affectedRows} row(s) updated`);
  
  // 5. Verify
  console.log('\n5. Verification...');
  const [scenes] = await conn.execute(
    `SELECT sceneIndex, sceneType, lipSync, mvSceneStatus, LEFT(prompt, 80) as promptPreview 
     FROM musicVideoScenes WHERE jobId = ? ORDER BY sceneIndex`,
    [JOB_ID]
  );
  for (const s of scenes) {
    console.log(`   Scene ${s.sceneIndex}: ${s.sceneType} | lipSync=${s.lipSync} | status=${s.mvSceneStatus} | "${s.promptPreview}..."`);
  }
  
  const [charVerify] = await conn.execute(
    `SELECT name, LEFT(lockedDescription, 100) as descPreview FROM videoCharacters WHERE jobId = ?`,
    [JOB_ID]
  );
  console.log(`\n   Character: ${charVerify[0]?.name}`);
  console.log(`   Desc: ${charVerify[0]?.descPreview}...`);
  
  await conn.end();
  
  console.log(`\n✅ Job ${JOB_ID} fixed and reset to rendering.`);
  console.log('The heartbeat will pick it up and start dispatching scenes.');
  console.log('\nKey changes made:');
  console.log('  - Zara: white female, long straight black hair, green eyes, black corset');
  console.log('  - All 11 scene prompts revised (Zara-focused, Air Studios environment)');
  console.log('  - No pianist hands/fingers');
  console.log('  - Musician scenes: 76 BPM slow sustained bowing only');
  console.log('  - All scenes reset to pending for fresh render');
  
  process.exit(0);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
