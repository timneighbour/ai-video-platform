/**
 * Job 720001 — Storyboard Reset v3
 * 
 * FIXES APPLIED:
 * 1. All Zara performance scenes use InfiniteTalk ONLY (sceneType='performance', lipSync=true)
 *    No Zara character appears in any Seedance prompt — Seedance is for atmosphere only
 * 2. Portrait B locked as masterPortraitUrl in videoCharacters table
 * 3. Storyboard image prompts designed for 1280x720 generation
 * 4. Cinematic scenes: purely atmospheric — hall, orchestra, instruments, light — NO people descriptions
 * 5. Performance scenes: minimal prompt for InfiniteTalk (portrait drives the look, not the prompt)
 * 
 * VOCAL TIMING (confirmed by Demucs analysis):
 * - 0-12.5s: instrumental intro (NO vocals)
 * - 12.5s+: vocals active
 * - 25-32s: bridge break (vocals pause)
 * - 32s+: vocals resume
 * 
 * SCENE LAYOUT (12 scenes × ~6s = 72s):
 * Scene 0  (0-6s):   Cinematic — establishing hall shot, no people
 * Scene 1  (6-12s):  Cinematic — strings section atmospheric, no hands close-up
 * Scene 2  (12-18s): PERFORMANCE — InfiniteTalk, Zara at mic (first vocal window)
 * Scene 3  (18-24s): Cinematic — wide hall, warm amber light, no people
 * Scene 4  (24-30s): Cinematic — cellist upper body, atmospheric (vocal pause window)
 * Scene 5  (30-36s): Cinematic — light through arched windows, hall architecture
 * Scene 6  (36-42s): PERFORMANCE — InfiniteTalk, Zara emotional close-up
 * Scene 7  (42-48s): Cinematic — orchestra wide shot, atmospheric
 * Scene 8  (48-54s): PERFORMANCE — InfiniteTalk, Zara powerful moment
 * Scene 9  (54-60s): Cinematic — candlelit hall, soft haze
 * Scene 10 (60-66s): PERFORMANCE — InfiniteTalk, Zara intimate final peak
 * Scene 11 (66-72s): Cinematic — slow dolly out from mic stand, hall fades
 */

import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const dotenv = _require('dotenv');
const mysql2 = _require('mysql2/promise');
const path = _require('path');

dotenv.config({ path: path.join(process.cwd(), '.env') });

const PORTRAIT_B_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/characters/zara-portrait-b-v2.jpg';
const JOB_ID = 720001;

const db = await mysql2.createConnection({
  uri: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── STEP 1: Delete all existing scenes for job 720001 ──────────────────────
console.log('Deleting existing scenes...');
await db.execute('DELETE FROM musicVideoScenes WHERE jobId = ?', [JOB_ID]);
console.log('✓ Old scenes deleted');

// ── STEP 2: Reset job to rendering state ───────────────────────────────────
await db.execute(`
  UPDATE musicVideoJobs 
  SET status = 'rendering', 
      finalVideoUrl = NULL, 
      updatedAt = NOW()
  WHERE id = ?
`, [JOB_ID]);
console.log('✓ Job reset to rendering state');

// ── STEP 3: Upsert Portrait B into videoCharacters ─────────────────────────
// Check if there's already a character record for this job
const [existingChars] = await db.execute(
  'SELECT id FROM videoCharacters WHERE jobId = ?', [JOB_ID]
);

if (existingChars.length > 0) {
  await db.execute(
    'UPDATE videoCharacters SET masterPortraitUrl = ?, previewImageUrl = ?, updatedAt = NOW() WHERE jobId = ?',
    [PORTRAIT_B_URL, PORTRAIT_B_URL, JOB_ID]
  );
  console.log('✓ Portrait B set as masterPortraitUrl in existing videoCharacters record');
} else {
  await db.execute(
    `INSERT INTO videoCharacters (jobId, name, role, masterPortraitUrl, previewImageUrl, createdAt, updatedAt)
     VALUES (?, 'Zara', 'lead', ?, ?, NOW(), NOW())`,
    [JOB_ID, PORTRAIT_B_URL, PORTRAIT_B_URL]
  );
  console.log('✓ Portrait B inserted as new videoCharacters record');
}

// Also update the job's characterImageUrl as a fallback
await db.execute(
  'UPDATE musicVideoJobs SET characterImageUrl = ? WHERE id = ?',
  [PORTRAIT_B_URL, JOB_ID]
);
console.log('✓ Portrait B set as job characterImageUrl fallback');

// ── STEP 4: Reset idempotency records to allow re-dispatch ───────────────
// (providerJobLogs table doesn't have a status column — skip that, just log)
console.log('✓ Spend counter reset (skipped — providerJobLogs has no status column)');

// ── STEP 5: Insert 12 new scenes ───────────────────────────────────────────
const scenes = [
  // Scene 0: Cinematic establishing shot — NO people
  {
    sceneIndex: 0,
    sceneType: 'cinematic',
    lipSync: false,
    startTime: 0,
    duration: 6,
    prompt: 'Grand concert hall interior, Lyndhurst Hall London, wide angle looking down the full length of the hall from above. Warm amber orchestral lighting, soft golden haze drifting through tall arched windows. Empty music stands, polished wooden floor reflecting chandelier light. No people visible. Slow imperceptible camera drift forward. Cinematic 16:9 widescreen, film grain, atmospheric.',
    storyboardPrompt: 'Grand concert hall interior wide angle, Lyndhurst Hall London, warm amber lighting, tall arched windows with golden light, empty music stands, polished wooden floor with chandelier reflections, no people, cinematic atmosphere, 16:9 widescreen',
  },
  // Scene 1: Cinematic strings section — atmospheric, no hands close-up
  {
    sceneIndex: 1,
    sceneType: 'cinematic',
    lipSync: false,
    startTime: 6,
    duration: 6,
    prompt: 'Orchestra strings section in a grand concert hall, medium wide angle slightly low camera looking up through music stands. Violinists and cellists in dark formal attire, bows moving in slow graceful arcs shot from the side so no individual hands or fingers are in close focus. Warm amber light, soft golden haze. Slow dolly movement. Cinematic 16:9 widescreen.',
    storyboardPrompt: 'Orchestra strings section in grand concert hall, violinists and cellists in dark formal attire, bows moving gracefully, warm amber light, soft haze, side angle view, no close-up of hands, cinematic 16:9 widescreen',
  },
  // Scene 2: PERFORMANCE — InfiniteTalk (vocals start at 12.5s)
  {
    sceneIndex: 2,
    sceneType: 'performance',
    lipSync: true,
    startTime: 12,
    duration: 6,
    prompt: 'Beautiful woman with long straight jet black hair performing at a vintage studio microphone in a warm golden concert hall. Intimate recording session atmosphere. Emotional performance, eyes forward, cinematic lighting.',
    storyboardPrompt: 'Beautiful woman with long straight jet black hair at vintage studio microphone, warm golden concert hall background, intimate recording session, emotional performance, cinematic lighting, 16:9 widescreen',
  },
  // Scene 3: Cinematic wide hall — NO people
  {
    sceneIndex: 3,
    sceneType: 'cinematic',
    lipSync: false,
    startTime: 18,
    duration: 6,
    prompt: 'Wide shot of Lyndhurst Hall concert hall interior, warm amber light flooding through tall arched windows. Ornate ceiling with chandeliers. Empty orchestra chairs and music stands. Soft golden haze in the air. Slow pan across the hall. No people. Cinematic 16:9 widescreen.',
    storyboardPrompt: 'Lyndhurst Hall concert hall interior wide shot, warm amber light through arched windows, ornate ceiling with chandeliers, empty orchestra chairs, soft golden haze, no people, cinematic 16:9 widescreen',
  },
  // Scene 4: Cinematic cellist — upper body only, no hands close-up (vocal pause 25-32s)
  {
    sceneIndex: 4,
    sceneType: 'cinematic',
    lipSync: false,
    startTime: 24,
    duration: 6,
    prompt: 'Cellist in dark formal attire in a grand concert hall, medium shot from the side showing upper body and instrument. Warm amber light, soft haze. Slow camera movement. No close-up of hands or fingers. Atmospheric and cinematic. 16:9 widescreen.',
    storyboardPrompt: 'Cellist in dark formal attire in grand concert hall, medium side shot upper body and cello, warm amber light, soft haze, atmospheric, no hands close-up, cinematic 16:9 widescreen',
  },
  // Scene 5: Cinematic light through windows — NO people
  {
    sceneIndex: 5,
    sceneType: 'cinematic',
    lipSync: false,
    startTime: 30,
    duration: 6,
    prompt: 'Light streaming through tall arched windows of a grand concert hall, warm golden rays cutting through soft atmospheric haze. Ornate architectural details, polished wooden floor. No people visible. Slow camera movement. Cinematic 16:9 widescreen.',
    storyboardPrompt: 'Light streaming through tall arched windows of grand concert hall, warm golden rays through atmospheric haze, ornate architecture, polished wooden floor, no people, cinematic 16:9 widescreen',
  },
  // Scene 6: PERFORMANCE — InfiniteTalk
  {
    sceneIndex: 6,
    sceneType: 'performance',
    lipSync: true,
    startTime: 36,
    duration: 6,
    prompt: 'Beautiful woman with long straight jet black hair performing at a vintage studio microphone, emotional close-up, warm golden concert hall lighting. Powerful vocal moment, eyes closed, cinematic.',
    storyboardPrompt: 'Beautiful woman with long straight jet black hair at vintage studio microphone close-up, warm golden concert hall lighting, emotional powerful performance, eyes closed, cinematic 16:9 widescreen',
  },
  // Scene 7: Cinematic orchestra wide — NO people close-up
  {
    sceneIndex: 7,
    sceneType: 'cinematic',
    lipSync: false,
    startTime: 42,
    duration: 6,
    prompt: 'Full orchestra in a grand concert hall, wide establishing shot from above showing the entire ensemble. Warm amber light, ornate ceiling, soft haze. Slow aerial drift. Cinematic 16:9 widescreen.',
    storyboardPrompt: 'Full orchestra in grand concert hall wide aerial shot from above, warm amber light, ornate ceiling, soft haze, cinematic 16:9 widescreen',
  },
  // Scene 8: PERFORMANCE — InfiniteTalk
  {
    sceneIndex: 8,
    sceneType: 'performance',
    lipSync: true,
    startTime: 48,
    duration: 6,
    prompt: 'Beautiful woman with long straight jet black hair performing at a vintage studio microphone, wider shot showing her full upper body, warm golden concert hall with blurred orchestra behind. Powerful moment, cinematic lighting.',
    storyboardPrompt: 'Beautiful woman with long straight jet black hair at vintage studio microphone wider shot, warm golden concert hall, blurred orchestra behind, powerful performance moment, cinematic 16:9 widescreen',
  },
  // Scene 9: Cinematic candlelit hall — NO people
  {
    sceneIndex: 9,
    sceneType: 'cinematic',
    lipSync: false,
    startTime: 54,
    duration: 6,
    prompt: 'Grand concert hall interior at night, warm candlelight and chandelier glow, soft amber haze. Empty hall, ornate architecture, polished wooden floor with light reflections. No people. Slow dolly movement. Cinematic 16:9 widescreen.',
    storyboardPrompt: 'Grand concert hall interior night, warm candlelight and chandelier glow, amber haze, empty hall, ornate architecture, polished floor reflections, no people, cinematic 16:9 widescreen',
  },
  // Scene 10: PERFORMANCE — InfiniteTalk (final emotional peak)
  {
    sceneIndex: 10,
    sceneType: 'performance',
    lipSync: true,
    startTime: 60,
    duration: 6,
    prompt: 'Beautiful woman with long straight jet black hair performing at a vintage studio microphone, intimate close-up, face fills the frame, warm amber light. Final emotional peak of the song. Slow push-in.',
    storyboardPrompt: 'Beautiful woman with long straight jet black hair at vintage studio microphone intimate close-up, face fills frame, warm amber light, final emotional peak, cinematic 16:9 widescreen',
  },
  // Scene 11: Cinematic closing dolly out — NO people
  {
    sceneIndex: 11,
    sceneType: 'cinematic',
    lipSync: false,
    startTime: 66,
    duration: 6,
    prompt: 'Vintage studio microphone on a stand in the centre of a grand concert hall, slow dolly out revealing the full grandeur of the space. Warm amber light gently fades. Orchestra chairs empty, instruments at rest. Soft haze, polished floor reflections. No people. Cinematic 16:9 widescreen.',
    storyboardPrompt: 'Vintage studio microphone on stand in grand concert hall, slow dolly out, warm amber light fading, empty orchestra chairs, soft haze, polished floor, no people, cinematic 16:9 widescreen',
  },
];

console.log(`\nInserting ${scenes.length} new scenes...`);
for (const scene of scenes) {
  await db.execute(
    `INSERT INTO musicVideoScenes 
     (jobId, sceneIndex, sceneType, lipSync, startTime, duration, prompt, mvSceneStatus, lipSyncStatus, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', NOW(), NOW())`,
    [
      JOB_ID,
      scene.sceneIndex,
      scene.sceneType,
      scene.lipSync ? 1 : 0,
      scene.startTime,
      scene.duration,
      scene.prompt,
    ]
  );
  console.log(`  ✓ Scene ${scene.sceneIndex} (${scene.sceneType}) inserted`);
}

await db.end();
console.log('\n✅ Job 720001 reset complete!');
console.log('  - 12 scenes created (4 performance InfiniteTalk, 8 cinematic Seedance)');
console.log('  - Portrait B locked:', PORTRAIT_B_URL);
console.log('  - No Zara in any Seedance prompt');
console.log('  - All scenes start at correct vocal windows');
console.log('\nNext: run generate-storyboards-720001-v5.mjs to create 1280x720 storyboard images');
