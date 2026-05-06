import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL);

// 1. Full character roster
const [jobs] = await db.execute(
  `SELECT characterRoster, characterImageUrl, characterImageKey FROM musicVideoJobs WHERE id = 390001`
);
const job = jobs[0];
console.log('\n=== CHARACTER ROSTER (full) ===');
if (job.characterRoster) {
  try {
    const roster = JSON.parse(job.characterRoster);
    console.log(JSON.stringify(roster, null, 2));
  } catch { console.log(String(job.characterRoster)); }
}
console.log('\ncharacterImageUrl:', job.characterImageUrl);
console.log('characterImageKey:', job.characterImageKey);

// 2. First 3 scene prompts and character assignments
const [scenes] = await db.execute(
  `SELECT id, sceneIndex, prompt, characterAssignments, focusCharacter, lipSync, videoUrl
   FROM musicVideoScenes 
   WHERE jobId = 390001 
   ORDER BY sceneIndex ASC
   LIMIT 5`
);
console.log('\n=== FIRST 5 SCENE PROMPTS ===');
for (const s of scenes) {
  console.log(`\nScene ${s.sceneIndex} (id: ${s.id})`);
  console.log(`  LipSync: ${s.lipSync} | FocusCharacter: ${s.focusCharacter}`);
  if (s.characterAssignments) {
    try { console.log(`  CharAssign: ${JSON.stringify(JSON.parse(s.characterAssignments))}`); }
    catch { console.log(`  CharAssign: ${s.characterAssignments}`); }
  } else {
    console.log(`  CharAssign: NONE`);
  }
  console.log(`  Prompt: ${s.prompt ? s.prompt.substring(0, 500) : 'NONE'}`);
  console.log(`  VideoUrl: ${s.videoUrl ? s.videoUrl.substring(0, 80) + '...' : 'NONE'}`);
}

// 3. Check provider logs for what was sent to Atlas Cloud for scene 1
const [scenes2] = await db.execute(`SELECT id FROM musicVideoScenes WHERE jobId = 390001 AND sceneIndex = 0 LIMIT 1`);
if (scenes2.length > 0) {
  const sceneId = scenes2[0].id;
  const [logs] = await db.execute(
    `SELECT provider, requestPayload, responsePayload, status, createdAt FROM providerJobLogs WHERE sceneId = ? ORDER BY createdAt DESC LIMIT 2`,
    [sceneId]
  );
  console.log('\n=== PROVIDER LOG FOR SCENE 0 ===');
  for (const log of logs) {
    console.log(`Provider: ${log.provider} | Status: ${log.status}`);
    if (log.requestPayload) {
      try {
        const req = JSON.parse(log.requestPayload);
        console.log('Request payload:');
        console.log(JSON.stringify(req, null, 2).substring(0, 1000));
      } catch { console.log(String(log.requestPayload).substring(0, 500)); }
    }
  }
}

await db.end();
