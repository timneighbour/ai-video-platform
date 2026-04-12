import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get the most recent job
const [jobs] = await conn.execute('SELECT id, title FROM musicVideoJobs ORDER BY createdAt DESC LIMIT 1');
const job = jobs[0];
console.log('Latest job:', job.id, job.title);

// Get all scenes to check which ones have no characterAssignments
const [scenes] = await conn.execute(
  'SELECT id, sceneIndex, characterAssignments, previewImageUrl FROM musicVideoScenes WHERE jobId = ? ORDER BY sceneIndex',
  [job.id]
);

let noAssignment = 0;
let noPreview = 0;
for (const s of scenes) {
  const hasAssignment = s.characterAssignments && s.characterAssignments !== 'null' && s.characterAssignments !== '[]';
  const hasPreview = !!s.previewImageUrl;
  if (!hasAssignment) {
    noAssignment++;
    console.log(`Scene ${s.sceneIndex} (id=${s.id}): NO CHARACTER ASSIGNMENT, hasPreview=${hasPreview}`);
  } else if (!hasPreview) {
    noPreview++;
    console.log(`Scene ${s.sceneIndex} (id=${s.id}): assignments=${s.characterAssignments}, NO PREVIEW`);
  }
}
console.log(`\nTotal: ${scenes.length} scenes, ${noAssignment} with no assignment, ${noPreview} with assignment but no preview`);

// Also check the server logs for recent generateScenePreview errors
await conn.end();
