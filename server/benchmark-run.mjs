/**
 * Benchmark Run Script — Priority 4 Validation
 * Creates a valid session JWT and triggers the full benchmark pipeline via HTTP
 * 
 * Usage: node server/benchmark-run.mjs <jobId>
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
const OWNER_OPEN_ID = process.env.OWNER_OPEN_ID;
const APP_ID = process.env.VITE_APP_ID;
const OWNER_NAME = process.env.OWNER_NAME;
const JWT_SECRET = process.env.JWT_SECRET;

async function createSessionToken() {
  const secretKey = new TextEncoder().encode(JWT_SECRET);
  const token = await new SignJWT({
    openId: OWNER_OPEN_ID,
    appId: APP_ID,
    name: OWNER_NAME,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(secretKey);
  return token;
}

async function callTRPC(procedure, input, token) {
  const url = `${BASE_URL}/api/trpc/${procedure}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `app_session_id=${token}`,
    },
    body: JSON.stringify({ json: input }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  console.log(`\n=== BENCHMARK RUN: Job ${JOB_ID} ===`);
  console.log(`Owner: ${OWNER_NAME} (${OWNER_OPEN_ID})`);
  console.log(`App ID: ${APP_ID}`);
  console.log('');

  // Create valid session token
  const token = await createSessionToken();
  console.log(`✓ Session token created`);

  // Step 1: Generate storyboard (this fires stem analysis in background)
  console.log('\n[1/2] Calling generateStoryboard...');
  const storyboardResult = await callTRPC('musicVideo.generateStoryboard', { jobId: JOB_ID }, token);
  
  if (storyboardResult?.error) {
    console.error('ERROR in generateStoryboard:', JSON.stringify(storyboardResult.error?.json?.message || storyboardResult.error, null, 2));
    
    // Check if it's an auth issue
    if (storyboardResult.error?.json?.data?.code === 'UNAUTHORIZED') {
      console.log('\nAuth failed — checking what the server expects...');
      // Try to get user info
      const meResult = await callTRPC('auth.me', {}, token);
      console.log('auth.me result:', JSON.stringify(meResult?.result?.data?.json || meResult?.error?.json?.message, null, 2));
    }
    process.exit(1);
  }
  
  const storyboard = storyboardResult?.result?.data?.json;
  console.log(`✓ Storyboard generated: ${storyboard?.scenes?.length || 0} scenes`);
  if (storyboard?.scenes) {
    storyboard.scenes.forEach((s, i) => {
      console.log(`  Scene ${i+1}: [${s.sceneType || 'unknown'}] ${s.shotType || ''} — ${s.description?.slice(0, 60) || ''}...`);
    });
  }

  // Step 2: Start render
  console.log('\n[2/2] Calling startRender...');
  const renderResult = await callTRPC('musicVideo.startRender', { jobId: JOB_ID }, token);
  
  if (renderResult?.error) {
    console.error('ERROR in startRender:', JSON.stringify(renderResult.error?.json?.message || renderResult.error, null, 2));
    process.exit(1);
  }
  
  const renderData = renderResult?.result?.data?.json;
  console.log(`✓ Render started:`, JSON.stringify(renderData, null, 2));

  console.log(`\n=== BENCHMARK PIPELINE TRIGGERED ===`);
  console.log(`Job ${JOB_ID} is now rendering.`);
  console.log(`Monitor: node server/benchmark-monitor.mjs ${JOB_ID}`);
}

main().catch(err => {
  console.error('FATAL:', err.message || err);
  process.exit(1);
});
