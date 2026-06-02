/**
 * Benchmark Trigger Script — Priority 4 Validation
 * 
 * Creates a fresh benchmark job using:
 * - Golden Audio (Beauty of the Wreckage)
 * - Zara character (id=540001) with Stage 1 auto-prep triggered
 * - Air Studios / Lyndhurst Hall scene setting
 * - Full new pipeline: Demucs + HeyGen v3 + character auto-prep
 * 
 * Usage: node server/benchmark-trigger.mjs
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

// Load env
const envPath = '/home/ubuntu/ai-video-platform/.env';
try {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
} catch {}

const DB_URL = process.env.DATABASE_URL;
const GOLDEN_AUDIO_URL = process.env.GOLDEN_AUDIO_URL;
const OWNER_USER_ID = 1;

// Air Studios / Lyndhurst Hall scene setting (same as Job 720001)
const AIR_STUDIOS_SETTING = `A single coherent warm Air Studios / Lyndhurst Hall-style recording environment throughout: grand wooden recording hall, amber orchestral lighting, vintage studio microphone, music stands, piano, cello, light strings, conductor cues, soft haze, tall windows, polished floor reflections, and controlled camera movement circling Zara without breaking the approved side-profile identity.`;

async function main() {
  const conn = await mysql.createConnection(DB_URL);

  console.log('=== BENCHMARK TRIGGER: Priority 4 Platform Validation ===');
  console.log(`Golden Audio: ${GOLDEN_AUDIO_URL?.slice(0, 60)}...`);
  console.log(`User ID: ${OWNER_USER_ID}`);
  console.log('');

  // Step 1: Verify Zara character exists and is locked
  const [zaraRows] = await conn.execute(
    'SELECT id, name, isLocked, masterPortraitUrl, autoPrepStatus, performanceRefUrl FROM videoCharacters WHERE id = 540001'
  );
  const zara = zaraRows[0];
  if (!zara) {
    console.error('ERROR: Zara character (id=540001) not found');
    process.exit(1);
  }
  console.log(`✓ Zara character found: id=${zara.id}, locked=${zara.isLocked}, autoPrepStatus=${zara.autoPrepStatus}`);
  console.log(`  masterPortraitUrl: ${zara.masterPortraitUrl?.slice(0, 60)}...`);
  console.log(`  performanceRefUrl: ${zara.performanceRefUrl || 'null (auto-prep not yet run)'}`);
  console.log('');

  // Step 2: Create the benchmark job
  console.log('Creating benchmark job...');
  // Derive audioKey from the Golden Audio URL (last path segment)
  const audioKey = GOLDEN_AUDIO_URL.split('/').slice(-2).join('/');

  const [insertResult] = await conn.execute(
    `INSERT INTO musicVideoJobs (
      userId, title, genre, mood, themePrompt, sceneSetting,
      audioUrl, audioKey, audioDuration, enableLipSync,
      status, stemAnalysisStatus, vocalsStatus,
      performanceShotRatio,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      OWNER_USER_ID,
      'BENCHMARK v2 — Beauty of the Wreckage (New Pipeline)',
      'Orchestral Pop',
      'Emotional, Cinematic, Vulnerable',
      `Zara, a female lead vocalist, performs "Beauty of the Wreckage" in a grand orchestral recording session at Air Studios / Lyndhurst Hall. The video should feel like a premium cinematic music video — intimate close-ups of Zara singing, wide shots of the full orchestra, conductor directing, musicians playing. Emotional and powerful. Zara has dark flowing hair and wears an elegant black gown.`,
      AIR_STUDIOS_SETTING,
      GOLDEN_AUDIO_URL,
      audioKey,
      71, // 71 seconds
      1,  // enableLipSync = true
      'draft',
      'pending',
      'pending',
      75, // 75% performance shot ratio
    ]
  );
  const jobId = insertResult.insertId;
  console.log(`✓ Benchmark job created: id=${jobId}`);
  console.log('');

  // Step 3: Link Zara to the new job by creating a new character record
  // (We create a copy of Zara for this job so the benchmark is self-contained)
  const [zaraFullRows] = await conn.execute(
    'SELECT * FROM videoCharacters WHERE id = 540001'
  );
  const zaraFull = zaraFullRows[0];
  
  const [charInsert] = await conn.execute(
    `INSERT INTO videoCharacters (
      jobId, userId, name, role, slotIndex,
      isLocked, lockedDescription, lockedAt,
      masterPortraitUrl, characterVisualDetails,
      autoPrepStatus,
      previewApproved,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      jobId,
      OWNER_USER_ID,
      'Zara',
      'Lead Vocalist',
      0,
      1, // isLocked
      zaraFull.lockedDescription,
      zaraFull.lockedAt || new Date(),
      zaraFull.masterPortraitUrl,
      zaraFull.characterVisualDetails,
      'pending', // auto-prep will run
      1, // previewApproved = true (simulates user approval)
    ]
  );
  const newCharId = charInsert.insertId;
  console.log(`✓ Zara character linked to benchmark job: charId=${newCharId}`);
  console.log('');

  // Step 4: Report what will happen next
  console.log('=== BENCHMARK JOB READY ===');
  console.log(`Job ID: ${jobId}`);
  console.log(`Status: draft → ready for storyboard generation`);
  console.log('');
  console.log('Next steps (automated):');
  console.log('  1. Call generateStoryboard → triggers stem analysis (fire-and-forget)');
  console.log('  2. Stem analysis: Demucs 8-stem extraction + classification + energy maps');
  console.log('  3. Character auto-prep Stage 1: performance + mediumShot + cinematic refs');
  console.log('  4. Character auto-prep Stage 2: environment-aware ref (Air Studios)');
  console.log('  5. startRender → scene dispatch heartbeat begins');
  console.log('  6. Scene dispatch: reference selection by scene type');
  console.log('  7. Seedance scene generation → raw scene validation gate');
  console.log('  8. HeyGen Precision v3 lip-sync (vocal stem audio)');
  console.log('  9. HeyGen output validation gate (GREEN/AMBER/RED)');
  console.log(' 10. Assembly worker → final video');
  console.log('');
  console.log(`Monitor with: node server/benchmark-monitor.mjs ${jobId}`);

  await conn.end();
  return jobId;
}

main().then(jobId => {
  console.log(`\nBENCHMARK JOB ID: ${jobId}`);
  process.exit(0);
}).catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
