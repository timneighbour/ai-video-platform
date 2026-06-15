import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL);

// 1. Get the job details
const [jobs] = await db.execute(
  `SELECT id, status, title, audioUrl, finalVideoUrl, characterImageUrl, characterLockEnabled, 
          enableLipSync, lockedStyle, characterRoster, artistType, enforceStrictMode,
          themePrompt, genre, mood, totalScenes, completedScenes, createdAt, updatedAt
   FROM musicVideoJobs WHERE id = 390001`
);
const job = jobs[0];
console.log('\n=== JOB 390001 ===');
console.log(`Status: ${job.status}`);
console.log(`Title: ${job.title}`);
console.log(`CharacterLockEnabled: ${job.characterLockEnabled}`);
console.log(`CharacterImageUrl: ${job.characterImageUrl ? job.characterImageUrl.substring(0, 100) + '...' : 'NONE'}`);
console.log(`EnableLipSync: ${job.enableLipSync}`);
console.log(`LockedStyle: ${job.lockedStyle}`);
console.log(`ArtistType: ${job.artistType}`);
console.log(`EnforceStrictMode: ${job.enforceStrictMode}`);
console.log(`ThemePrompt: ${job.themePrompt}`);
console.log(`Genre: ${job.genre} | Mood: ${job.mood}`);
console.log(`TotalScenes: ${job.totalScenes} | CompletedScenes: ${job.completedScenes}`);
if (job.characterRoster) {
  try {
    const roster = JSON.parse(job.characterRoster);
    console.log(`CharacterRoster: ${JSON.stringify(roster).substring(0, 400)}`);
  } catch { console.log(`CharacterRoster (raw): ${String(job.characterRoster).substring(0, 200)}`); }
}

// 2. Get all scenes with their prompts, lip sync, and character reference
const [scenes] = await db.execute(
  `SELECT id, sceneIndex, mvSceneStatus as status, prompt, userEditedPrompt, lipSync, lipSyncStyle,
          characterAssignments, focusCharacter, visualStyle, camera, lyrics,
          videoUrl, errorMessage, submissionCount, taskId
   FROM musicVideoScenes 
   WHERE jobId = 390001 
   ORDER BY sceneIndex ASC`
);
console.log(`\n=== SCENES (${scenes.length} total) ===`);
for (const s of scenes) {
  console.log(`\n--- Scene ${s.sceneIndex} (id: ${s.id}) ---`);
  console.log(`  Status: ${s.status} | LipSync: ${s.lipSync} | LipSyncStyle: ${s.lipSyncStyle}`);
  console.log(`  VisualStyle: ${s.visualStyle} | Camera: ${s.camera}`);
  console.log(`  FocusCharacter: ${s.focusCharacter}`);
  if (s.characterAssignments) {
    try {
      const ca = JSON.parse(s.characterAssignments);
      console.log(`  CharacterAssignments: ${JSON.stringify(ca).substring(0, 200)}`);
    } catch { console.log(`  CharacterAssignments (raw): ${String(s.characterAssignments).substring(0, 100)}`); }
  } else {
    console.log(`  CharacterAssignments: NONE`);
  }
  console.log(`  Lyrics: ${s.lyrics ? s.lyrics.substring(0, 80) : 'NONE'}`);
  console.log(`  Prompt: ${s.prompt ? s.prompt.substring(0, 300) : 'NONE'}`);
  if (s.userEditedPrompt) console.log(`  UserEditedPrompt: ${s.userEditedPrompt.substring(0, 200)}`);
  console.log(`  VideoUrl: ${s.videoUrl ? 'YES' : 'NONE'} | TaskId: ${s.taskId || 'NONE'}`);
  if (s.errorMessage) console.log(`  Error: ${s.errorMessage}`);
}

// 3. Check provider job logs for what was actually sent to Atlas Cloud
const [provLogs] = await db.execute(
  `SELECT id, sceneId, provider, requestPayload, responsePayload, status, createdAt
   FROM providerJobLogs 
   WHERE sceneId IN (SELECT id FROM musicVideoScenes WHERE jobId = 390001)
   ORDER BY createdAt DESC
   LIMIT 5`
);
console.log(`\n=== PROVIDER LOGS (last 5) ===`);
for (const log of provLogs) {
  console.log(`\nLog ${log.id} | Scene: ${log.sceneId} | Provider: ${log.provider} | Status: ${log.status}`);
  if (log.requestPayload) {
    try {
      const req = JSON.parse(log.requestPayload);
      console.log(`  Request: ${JSON.stringify(req).substring(0, 400)}`);
    } catch { console.log(`  Request (raw): ${String(log.requestPayload).substring(0, 300)}`); }
  }
}

await db.end();
