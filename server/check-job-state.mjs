/**
 * Check Job 870022 state via tRPC
 */
import { SignJWT } from 'jose';
import { readFileSync } from 'fs';

// Load env
try {
  const envContent = readFileSync('/home/ubuntu/ai-video-platform/.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {}

const JOB_ID = parseInt(process.argv[2] || '870022');
const BASE_URL = 'http://localhost:3000';

async function createSessionToken() {
  const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);
  const token = await new SignJWT({
    openId: process.env.OWNER_OPEN_ID,
    appId: process.env.VITE_APP_ID,
    name: process.env.OWNER_NAME,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(secretKey);
  return token;
}

async function callTRPC(procedure, input, token, method = 'POST') {
  let url = `${BASE_URL}/api/trpc/${procedure}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `app_session_id=${token}`,
    },
  };
  if (method === 'GET') {
    url += '?input=' + encodeURIComponent(JSON.stringify({ json: input }));
  } else {
    opts.body = JSON.stringify({ json: input });
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function main() {
  const token = await createSessionToken();
  
  // Try getJob
  const result = await callTRPC('musicVideo.getJob', { jobId: JOB_ID }, token, 'GET');
  const job = result?.result?.data?.json;
  
  if (job) {
    console.log('=== JOB STATE ===');
    console.log('ID:', job.id);
    console.log('Title:', job.title);
    console.log('Status:', job.status);
    console.log('Has storyboard:', !!(job.storyboardJson));
    console.log('Stem analysis:', job.stemAnalysisStatus);
    console.log('Scenes count:', job.scenes?.length || 0);
    if (job.scenes && job.scenes.length > 0) {
      const byStat = {};
      job.scenes.forEach(s => { byStat[s.status] = (byStat[s.status] || 0) + 1; });
      console.log('Scene statuses:', JSON.stringify(byStat));
      console.log('\nScene details:');
      job.scenes.forEach((s, i) => {
        console.log(`  Scene ${i+1} (id=${s.id}): [${s.sceneType || 'unknown'}] status=${s.status} lipSync=${s.lipSyncStatus || 'n/a'} taskId=${s.taskId || 'none'}`);
      });
    }
  } else {
    console.log('Error:', JSON.stringify(result?.error?.json?.message || result, null, 2).slice(0, 500));
  }
}

main().catch(err => {
  console.error('FATAL:', err.message || err);
  process.exit(1);
});
