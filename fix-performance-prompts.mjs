/**
 * Fix performance scene Seedance prompts for job 720001.
 *
 * PROBLEM: Performance scenes (750027, 750031, 750033, 750035) have prompts that describe
 * "a beautiful woman at a vintage studio microphone" — this causes Seedance to generate
 * ANOTHER AI singer as the background clip. When Zara is composited on top, you get
 * two women in the same frame.
 *
 * FIX: Change performance scene Seedance prompts to empty Air Studios stage backgrounds.
 * Zara is composited in via InfiniteTalk — the background should be an empty venue.
 *
 * The InfiniteTalk prompt (line 473 in heartbeat) is separate and describes Zara's performance style.
 */

import { createConnection } from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

const conn = await createConnection(url);

// New empty-stage prompts for each performance scene
// These describe the Air Studios / Lyndhurst Hall environment with NO person present.
// Zara will be composited in via InfiniteTalk chromakey compositing.
const updates = [
  {
    id: 750027,
    prompt: `Empty Lyndhurst Hall stage at Air Studios, warm amber light flooding through tall arched windows onto an empty stage. Grand concert hall interior, ornate ceiling with chandeliers, polished wooden floor. Orchestra pit visible in foreground. No performers, no people. Cinematic 16:9. Slow gentle camera drift. Warm golden atmosphere.`
  },
  {
    id: 750031,
    prompt: `Empty Air Studios performance stage, dramatic spotlights illuminating an empty vintage microphone stand at centre stage. Warm golden concert hall lighting, soft haze, bokeh background showing ornate hall architecture. No performers, no people. Cinematic 16:9. Slow push-in toward the microphone. Warm amber glow.`
  },
  {
    id: 750033,
    prompt: `Wide shot of empty Lyndhurst Hall concert stage, full orchestra setup visible — music stands, chairs, instruments — but no musicians. Warm amber chandelier light, soft atmospheric haze. Grand hall architecture, ornate ceiling. No performers, no people. Cinematic 16:9. Slow aerial drift from above. Warm golden atmosphere.`
  },
  {
    id: 750035,
    prompt: `Empty Air Studios stage, intimate close-up on a vintage condenser microphone stand bathed in warm amber spotlight. Soft bokeh background of grand concert hall, ornate architecture, chandelier glow. No performers, no people. Cinematic 16:9. Very slow push-in on the microphone. Final emotional atmosphere, warm and golden.`
  },
];

console.log('Updating performance scene Seedance prompts to empty Air Studios stage backgrounds...\n');

for (const { id, prompt } of updates) {
  const [result] = await conn.execute(
    `UPDATE musicVideoScenes SET prompt = ? WHERE id = ? AND jobId = 720001`,
    [prompt, id]
  );
  console.log(`Scene ${id}: updated (${result.affectedRows} row affected)`);
  console.log(`  New prompt: ${prompt.slice(0, 100)}...`);
}

console.log('\nDone. Performance scene prompts updated to empty stage backgrounds.');
console.log('Zara will be composited in via InfiniteTalk chromakey compositing.');

await conn.end();
