import { config } from 'dotenv';
config({ path: '/home/ubuntu/ai-video-platform/.env' });

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check job 870022
const [jobs] = await conn.query('SELECT id, characterId, status, fallbackProvider FROM musicVideoJobs WHERE id = 870022');
console.log('Job 870022:', JSON.stringify(jobs[0]));

// List all characters
const [chars] = await conn.query('SELECT id, name, LEFT(portraitUrl, 100) as portraitUrl, LEFT(performanceRefUrl, 80) as performanceRefUrl FROM videoCharacters ORDER BY id DESC LIMIT 20');
console.log('Characters:');
for (const c of chars) {
  console.log(`  ${c.id}: ${c.name} | portrait: ${c.portraitUrl || 'NONE'} | perfRef: ${c.performanceRefUrl || 'NONE'}`);
}

await conn.end();
process.exit(0);
