import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

async function checkAssembly() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [jobs] = await conn.execute(
    "SELECT id, status, finalVideoUrl, finalVideoKey, completedScenes, totalScenes, assemblyStartedAt FROM musicVideoJobs WHERE id=690007"
  );
  await conn.end();
  return jobs[0];
}

let attempts = 0;
const maxAttempts = 20; // 10 minutes max

while (attempts < maxAttempts) {
  const job = await checkAssembly();
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] Status: ${job.status} | scenes: ${job.completedScenes}/${job.totalScenes} | finalVideo: ${job.finalVideoUrl ? 'READY' : 'pending'}`);
  
  if (job.finalVideoUrl) {
    console.log('\n🎬 FINAL VIDEO READY!');
    console.log('URL:', job.finalVideoUrl);
    console.log('Key:', job.finalVideoKey);
    break;
  }
  
  if (job.status === 'failed') {
    console.log('\n❌ Assembly failed!');
    break;
  }
  
  attempts++;
  if (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 30000));
  }
}
