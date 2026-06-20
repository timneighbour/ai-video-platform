/**
 * regen-sc02-sc10.cjs
 * Triggers regeneration of SC02 (id 1110051) and SC10 (id 1110059) for job 1290008
 * by calling the tRPC endpoint on the running dev server with a valid session.
 */
const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');

async function getSession() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  // Get the most recent session for the job owner
  const [rows] = await conn.execute(
    `SELECT s.token, s.userId FROM sessions s
     INNER JOIN music_video_jobs j ON j.userId = s.userId
     WHERE j.id = 1290008
     ORDER BY s.createdAt DESC LIMIT 1`
  );
  await conn.end();
  if (!rows.length) throw new Error('No session found for job owner');
  return rows[0];
}

async function callTRPC(token, procedure, input) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(input);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/trpc/musicVideo.${procedure}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Cookie': `session=${token}`,
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const { token, userId } = await getSession();
  console.log(`Using session for userId ${userId}`);

  console.log('\n--- Regenerating SC02 (sceneId 1110051) ---');
  const r1 = await callTRPC(token, 'regenerateSingleScenePreview', { jobId: 1290008, sceneId: 1110051 });
  console.log('SC02 status:', r1.status);
  console.log('SC02 result:', JSON.stringify(r1.body).slice(0, 200));

  console.log('\n--- Regenerating SC10 (sceneId 1110059) ---');
  const r2 = await callTRPC(token, 'regenerateSingleScenePreview', { jobId: 1290008, sceneId: 1110059 });
  console.log('SC10 status:', r2.status);
  console.log('SC10 result:', JSON.stringify(r2.body).slice(0, 200));
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
