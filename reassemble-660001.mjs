/**
 * Direct re-assembly script for Job 660001
 * Calls assembleMusicVideo directly — no heartbeat dependency
 */
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

// Load env
import { config } from 'dotenv';
config();

// We need to call the assembly function via the server's HTTP endpoint
// to avoid module resolution issues with tsx vs node
const BASE_URL = 'http://localhost:3000';

// First get a cron session token by checking the heartbeat endpoint
// The assembly is triggered via the assembleHeartbeat endpoint
const resp = await fetch(`${BASE_URL}/api/heartbeat/assemble`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-cron-secret': process.env.CRON_SECRET || '',
  },
  body: JSON.stringify({ jobId: 660001 }),
});

console.log('Assembly trigger response:', resp.status, resp.statusText);
const body = await resp.text();
console.log('Body:', body);
