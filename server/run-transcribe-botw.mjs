/**
 * Transcribe "Beauty of the Wreckage" with word-level timestamps using AssemblyAI
 * Saves segments to musicVideoJobs.transcriptionSegments for Job 930003
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const ASSEMBLY_KEY = process.env.ASSEMBLY_AI_API_KEY;
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get audio URL for Job 930003
const [jobs] = await conn.execute('SELECT audioUrl FROM musicVideoJobs WHERE id=930003');
const audioUrl = jobs[0].audioUrl;
console.log('Audio URL:', audioUrl.slice(0, 80));

// Step 1: Upload audio to AssemblyAI
console.log('\nUploading audio to AssemblyAI...');
const audioData = readFileSync('/tmp/botw.mp3');
const uploadResp = await fetch('https://api.assemblyai.com/v2/upload', {
  method: 'POST',
  headers: { 'authorization': ASSEMBLY_KEY, 'content-type': 'application/octet-stream' },
  body: audioData
});
const { upload_url } = await uploadResp.json();
console.log('Uploaded to AssemblyAI:', upload_url);

// Step 2: Request transcription with word-level timestamps
const txResp = await fetch('https://api.assemblyai.com/v2/transcript', {
  method: 'POST',
  headers: { 'authorization': ASSEMBLY_KEY, 'content-type': 'application/json' },
  body: JSON.stringify({
    audio_url: upload_url,
    language_code: 'en',
    word_boost: [],
    speaker_labels: false,
    punctuate: true,
    format_text: true
  })
});
const tx = await txResp.json();
console.log('Transcript job ID:', tx.id);

// Step 3: Poll for completion
let result;
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 4000));
  const pollResp = await fetch(`https://api.assemblyai.com/v2/transcript/${tx.id}`, {
    headers: { 'authorization': ASSEMBLY_KEY }
  });
  result = await pollResp.json();
  process.stdout.write(`\rStatus: ${result.status} (${i * 4}s)...`);
  if (result.status === 'completed' || result.status === 'error') break;
}
console.log('');

if (result.status !== 'completed') {
  console.error('Transcription failed:', result.error);
  process.exit(1);
}

console.log('\nFull transcript:', result.text);
console.log('Word count:', result.words?.length);

// Step 4: Build segments from words (group into ~5s chunks matching scene boundaries)
// Scene boundaries: 0, 5.92, 11.84, 18.16, 24.08, 30.0, 35.92, 41.84, 48.16, 54.08, 60.0, 65.92
const sceneBoundaries = [0, 5.92, 11.84, 18.16, 24.08, 30.0, 35.92, 41.84, 48.16, 54.08, 60.0, 65.92, 999];
const segments = [];

for (let i = 0; i < sceneBoundaries.length - 1; i++) {
  const start = sceneBoundaries[i];
  const end = sceneBoundaries[i + 1];
  const words = (result.words || []).filter(w => 
    (w.start / 1000) >= start && (w.start / 1000) < end
  );
  if (words.length > 0) {
    const text = words.map(w => w.text).join(' ');
    segments.push({
      start: start,
      end: Math.min(end, words[words.length - 1].end / 1000),
      text,
      words: words.map(w => ({ word: w.text, start: w.start / 1000, end: w.end / 1000 }))
    });
    console.log(`Scene ${i} (${start}s-${end}s): "${text}"`);
  } else {
    console.log(`Scene ${i} (${start}s-${end}s): [instrumental]`);
  }
}

// Step 5: Save to DB
await conn.execute(
  'UPDATE musicVideoJobs SET transcriptionSegments=?, transcriptionStatus="done", updatedAt=NOW() WHERE id=930003',
  [JSON.stringify(segments)]
);

// Also update individual scene lyrics fields
for (const seg of segments) {
  const sceneIdx = sceneBoundaries.indexOf(seg.start);
  if (sceneIdx >= 0) {
    await conn.execute(
      'UPDATE musicVideoScenes SET lyrics=? WHERE jobId=930003 AND sceneIndex=?',
      [seg.text, sceneIdx]
    );
  }
}

console.log(`\nSaved ${segments.length} segments to DB for Job 930003`);
await conn.end();
