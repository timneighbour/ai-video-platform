/**
 * setup_job_1080001.mjs
 * 
 * Fixes job 1080001 before scenes start rendering:
 * 1. Uploads Zara's close-up portrait and sets it as environmentRefUrl + performanceRefUrl
 * 2. Reassigns cinematic scenes (Concertmaster/Cellist/Pianist) to Zara
 * 3. Triggers the heartbeat to start rendering
 */

import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
// FormData and Blob are global in Node 22

const dbUrl = new URL(process.env.DATABASE_URL);
const sslParam = dbUrl.searchParams.get('ssl');
const ssl = sslParam ? JSON.parse(sslParam) : { rejectUnauthorized: false };

const conn = await createConnection({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || '3306'),
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  ssl,
});

console.log('Connected to DB');

// Step 1: Upload Zara's close-up portrait via the forge storage API
const portraitPath = '/home/ubuntu/webdev-static-assets/zara_closeup_lipsync.png';
const portraitData = readFileSync(portraitPath);

const forgeUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, '');
const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

if (!forgeUrl || !forgeKey) {
  throw new Error('Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY');
}

const uploadUrl = `${forgeUrl}/v1/storage/upload?path=zara-closeup-lipsync-v2.png`;
const formData = new FormData();
formData.append('file', new Blob([portraitData], { type: 'image/png' }), 'zara-closeup-lipsync-v2.png');

console.log('Uploading Zara close-up portrait...');
const uploadRes = await fetch(uploadUrl, {
  method: 'POST',
  headers: { Authorization: `Bearer ${forgeKey}` },
  body: formData,
});

if (!uploadRes.ok) {
  const text = await uploadRes.text();
  throw new Error(`Upload failed: ${uploadRes.status} ${text}`);
}

const { url: portraitCdnUrl } = await uploadRes.json();
console.log('Portrait uploaded:', portraitCdnUrl);

// Step 2: Set environmentRefUrl and performanceRefUrl for Zara (character 720001)
await conn.execute(
  `UPDATE videoCharacters 
   SET environmentRefUrl = ?, performanceRefUrl = ?, autoPrepStatus = 'complete', updatedAt = NOW()
   WHERE id = 720001 AND jobId = 1080001`,
  [portraitCdnUrl, portraitCdnUrl]
);
console.log('Updated Zara environmentRefUrl and performanceRefUrl');

// Step 3: Reassign cinematic scenes from Concertmaster/Cellist/Pianist to Zara
// These characters have no portrait — reassign to Zara so they render correctly
const cinematicScenes = [930001, 930003, 930005, 930008, 930011]; // scenes 0,2,4,7,10
for (const sceneId of cinematicScenes) {
  await conn.execute(
    `UPDATE musicVideoScenes 
     SET characterAssignments = '["Zara"]', updatedAt = NOW()
     WHERE id = ? AND jobId = 1080001`,
    [sceneId]
  );
}
console.log('Reassigned cinematic scenes to Zara');

// Step 4: Verify the fix
const [chars] = await conn.query(
  'SELECT id, name, LEFT(environmentRefUrl, 80) as envRef, autoPrepStatus FROM videoCharacters WHERE jobId = 1080001'
);
console.log('\nCharacters for job 1080001:');
console.table(chars);

const [scenes] = await conn.query(
  'SELECT id, sceneIndex, sceneType, lipSync, characterAssignments FROM musicVideoScenes WHERE jobId = 1080001 ORDER BY sceneIndex'
);
console.log('\nScenes for job 1080001:');
console.table(scenes);

await conn.end();
console.log('\nDone! Now trigger the heartbeat to start rendering.');
