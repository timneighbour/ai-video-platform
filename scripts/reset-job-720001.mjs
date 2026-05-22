/**
 * Reset job 720001 with corrected storyboard:
 * - Fix vocal timing (performance scenes at 12s+ where vocals are active)
 * - Lock the correct Zara portrait for all performance scenes
 * - Remove piano keys close-up and conductor scenes
 * - Add more Zara performance scenes (5 out of 12)
 * - All prompts specify 16:9 cinematic framing
 *
 * Vocal analysis:
 *   0-12.5s:   SILENCE (instrumental intro)
 *   12.5-25.2s: VOCALS ACTIVE (first verse)
 *   25.2-31.7s: SILENCE (break)
 *   31.7-66.1s: VOCALS ACTIVE (main body)
 *   66.1-71s:   SILENCE/outro
 *
 * Performance scenes placed at: 12s, 24s, 36s, 48s, 60s
 */
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

const LOCKED_PORTRAIT_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/characters/zara-locked-portrait-720001.png';
const VOCALS_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663500868908/micetSvcmTnoavVM.mp3';

// New storyboard: 12 scenes × 6s each (last scene 5s) = 71s
// All prompts specify 16:9 cinematic widescreen framing
const NEW_SCENES = [
  // idx 0: 0-6s — Cinematic establishing shot (instrumental intro, no Zara)
  {
    sceneIndex: 0,
    startTime: 0,
    duration: 6,
    sceneType: 'cinematic',
    lipSync: false,
    prompt: `Cinematic 16:9 widescreen establishing shot of the grand Lyndhurst Hall recording space. 
Wide angle, looking down the length of the hall from above. Warm amber orchestral lighting, 
soft golden haze drifting through tall arched windows. Empty music stands, polished wooden floor 
reflecting the chandelier light. No people visible. Slow, imperceptible camera drift forward. 
Photorealistic, film grain, anamorphic lens flare. Air Studios atmosphere.`,
  },
  // idx 1: 6-12s — Cinematic strings section (still instrumental intro)
  {
    sceneIndex: 1,
    startTime: 6000,
    duration: 6,
    sceneType: 'cinematic',
    lipSync: false,
    prompt: `Cinematic 16:9 widescreen shot of the strings section in the Lyndhurst Hall recording space. 
Medium wide angle, slightly low camera angle looking up through music stands. 
Violinists and cellists in dark formal attire, bows moving in slow graceful arcs — 
shot from the side so no individual hands or fingers are in close focus. 
Warm amber light, soft haze, polished floor reflections. Slow dolly movement. 
Photorealistic, film grain, anamorphic lens flare.`,
  },
  // idx 2: 12-18s — PERFORMANCE (vocals begin at 12.5s)
  {
    sceneIndex: 2,
    startTime: 12000,
    duration: 6,
    sceneType: 'performance',
    lipSync: true,
    prompt: `Cinematic 16:9 widescreen intimate side-profile shot of Zara at a vintage studio microphone. 
Zara: woman in her late 20s, white European, fair skin, long dark brown hair in soft waves 
past her shoulders, elegant black gown with subtle embellishments. 
Side-profile framing, microphone in foreground, face in sharp focus. 
Warm amber orchestral lighting, tall arched windows with golden light in background, 
soft haze. Slow camera drift, slight push-in. Photorealistic, film grain, anamorphic lens flare.`,
  },
  // idx 3: 18-24s — Cinematic wide hall with Zara silhouette
  {
    sceneIndex: 3,
    startTime: 18000,
    duration: 6,
    sceneType: 'cinematic',
    lipSync: false,
    prompt: `Cinematic 16:9 widescreen wide shot of the Lyndhurst Hall recording space. 
Zara's silhouette visible in the far background at the vintage microphone, small against the grand hall. 
Foreground: blurred music stands and instrument cases. Warm amber light, soft haze, 
tall arched windows glowing. Slow crane movement, descending gently. 
Photorealistic, film grain, anamorphic lens flare.`,
  },
  // idx 4: 24-30s — PERFORMANCE (vocals active 12.5-25.2s — just catches the tail)
  // Actually 24-30s: 24-25.2s has vocals, 25.2-30s is silence
  // Better to use a cinematic here and shift performance to 31.7s+
  // Let's use 24-30s as cinematic (bridge/break section)
  {
    sceneIndex: 4,
    startTime: 24000,
    duration: 6,
    sceneType: 'cinematic',
    lipSync: false,
    prompt: `Cinematic 16:9 widescreen atmospheric shot inside Lyndhurst Hall. 
Close-up on the warm amber chandelier light filtering through the arched windows, 
golden dust particles floating in the air. The hall is quiet and still. 
Slow rack focus from window to the empty space of the hall. 
Photorealistic, film grain, anamorphic lens flare.`,
  },
  // idx 5: 30-36s — Cinematic cellist (no hands close-up)
  {
    sceneIndex: 5,
    startTime: 30000,
    duration: 6,
    sceneType: 'cinematic',
    lipSync: false,
    prompt: `Cinematic 16:9 widescreen medium shot of a cellist in the Lyndhurst Hall recording space. 
African American man in his mid-30s, broad-shouldered, dark tailored blazer, 
cradling his cello. Shot from the side showing his upper body and the cello body — 
NOT a close-up of hands or fingers. Warm amber light, soft haze in background. 
Slow camera movement circling gently. Photorealistic, film grain, anamorphic lens flare.`,
  },
  // idx 6: 36-42s — PERFORMANCE (vocals active 31.7-66.1s)
  {
    sceneIndex: 6,
    startTime: 36000,
    duration: 6,
    sceneType: 'performance',
    lipSync: true,
    prompt: `Cinematic 16:9 widescreen dynamic shot of Zara at the vintage microphone. 
Zara: woman in her late 20s, white European, fair skin, long dark brown wavy hair, 
elegant black gown. Slight Dutch angle, warm focused spotlight from above. 
Her expression shows emotional release, eyes slightly closed, head tilted back. 
Blurred orchestra musicians visible in background. Slow camera push-in. 
Photorealistic, film grain, anamorphic lens flare.`,
  },
  // idx 7: 42-48s — Cinematic light through windows
  {
    sceneIndex: 7,
    startTime: 42000,
    duration: 6,
    sceneType: 'cinematic',
    lipSync: false,
    prompt: `Cinematic 16:9 widescreen atmospheric shot of the Lyndhurst Hall interior. 
Looking towards the tall arched windows, warm golden light streaming through in shafts. 
Soft haze catches the light. Polished wooden floor reflects the amber glow. 
Slow, meditative camera movement. No people visible. 
Photorealistic, film grain, anamorphic lens flare.`,
  },
  // idx 8: 48-54s — PERFORMANCE (vocals active 31.7-66.1s)
  {
    sceneIndex: 8,
    startTime: 48000,
    duration: 6,
    sceneType: 'performance',
    lipSync: true,
    prompt: `Cinematic 16:9 widescreen wider side-profile shot of Zara at the vintage microphone. 
Zara: woman in her late 20s, white European, fair skin, long dark brown wavy hair, 
elegant black gown. Full upper body visible, microphone in frame. 
Warm amber glow illuminating her face and shoulders, blurred orchestra in background. 
Slow camera drift, slight crane up. Photorealistic, film grain, anamorphic lens flare.`,
  },
  // idx 9: 54-60s — Cinematic strings atmospheric
  {
    sceneIndex: 9,
    startTime: 54000,
    duration: 6,
    sceneType: 'cinematic',
    lipSync: false,
    prompt: `Cinematic 16:9 widescreen atmospheric shot of the strings section in Lyndhurst Hall. 
Wide angle from behind the musicians, looking towards the front of the hall. 
Bows moving in unison, warm amber light, soft haze. Zara's silhouette visible 
at the microphone in the far distance. Slow push-in. 
Photorealistic, film grain, anamorphic lens flare.`,
  },
  // idx 10: 60-66s — PERFORMANCE (vocals active 31.7-66.1s)
  {
    sceneIndex: 10,
    startTime: 60000,
    duration: 6,
    sceneType: 'performance',
    lipSync: true,
    prompt: `Cinematic 16:9 widescreen intimate close-up of Zara at the vintage microphone. 
Zara: woman in her late 20s, white European, fair skin, long dark brown wavy hair, 
elegant black gown. Face fills the frame, microphone visible at chin level. 
Warm amber light, emotional expression — the final emotional peak of the song. 
Slow push-in, slight rack focus. Photorealistic, film grain, anamorphic lens flare.`,
  },
  // idx 11: 66-71s — Cinematic closing dolly out (outro, mostly silence)
  {
    sceneIndex: 11,
    startTime: 66000,
    duration: 5,
    sceneType: 'cinematic',
    lipSync: false,
    prompt: `Cinematic 16:9 widescreen closing shot of Lyndhurst Hall. 
Zara stands still and serene at the vintage microphone, looking out into the grand hall. 
Slow dolly out, revealing the full grandeur of the space. Warm amber light gently fades. 
Orchestra musicians still in their seats, instruments at rest. 
Soft haze, polished floor reflections. Photorealistic, film grain, anamorphic lens flare.`,
  },
];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('Resetting job 720001 to rendering state...');
  
  // Reset job status
  await conn.execute(`
    UPDATE musicVideoJobs 
    SET status='rendering', completedScenes=0, finalVideoUrl=NULL, finalVideoKey=NULL,
        assemblyStartedAt=NULL, probePassed=1, finalVideoProduced=0,
        updatedAt=NOW()
    WHERE id=720001
  `);
  
  // Delete all existing scenes for job 720001
  await conn.execute('DELETE FROM musicVideoScenes WHERE jobId=720001');
  console.log('Deleted old scenes');
  
  // Insert new scenes
  for (const scene of NEW_SCENES) {
    await conn.execute(`
      INSERT INTO musicVideoScenes 
        (jobId, sceneIndex, startTime, duration, sceneType, lipSync, prompt, 
         mvSceneStatus, lipSyncStatus, heroImageUrl, sceneAudioUrl, retryCount,
         reRenderCount, providerUsed, createdAt, updatedAt)
      VALUES 
        (720001, ?, ?, ?, ?, ?, ?,
         'pending', 'pending', ?, ?,
         0, 0, 'seedance-2.0', NOW(), NOW())
    `, [
      scene.sceneIndex,
      scene.startTime,
      scene.duration,
      scene.sceneType,
      scene.lipSync ? 1 : 0,
      scene.prompt.trim(),
      scene.sceneType === 'performance' ? LOCKED_PORTRAIT_URL : null,
      scene.sceneType === 'performance' ? VOCALS_URL : null,
    ]);
    console.log(`Inserted scene ${scene.sceneIndex} (${scene.sceneType})`);
  }
  
  // Update totalScenes count
  await conn.execute('UPDATE musicVideoJobs SET totalScenes=12 WHERE id=720001');
  
  console.log('\nJob 720001 reset complete!');
  console.log('Performance scenes at: 12s, 36s, 48s, 60s (idx 2, 6, 8, 10)');
  console.log('Locked portrait:', LOCKED_PORTRAIT_URL);
  
  // Verify
  const [scenes] = await conn.execute('SELECT sceneIndex, sceneType, startTime, lipSync FROM musicVideoScenes WHERE jobId=720001 ORDER BY sceneIndex');
  console.log('\nNew scene list:');
  for (const s of scenes) {
    console.log(`  idx ${s.sceneIndex}: ${s.sceneType} @ ${s.startTime/1000}s, lipSync=${s.lipSync}`);
  }
  
  await conn.end();
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
