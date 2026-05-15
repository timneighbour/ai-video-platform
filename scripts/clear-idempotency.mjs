import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/home/ubuntu/ai-video-platform/.env' });

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await createConnection(url);

const sceneIds = [600001, 600002, 600003, 600004, 600005, 600006, 600007, 600008, 600009, 600010, 600011, 600012];

// First check the actual columns in providerJobLogs
const [cols] = await conn.execute('DESCRIBE providerJobLogs');
console.log('providerJobLogs columns:', cols.map(c => c.Field).join(', '));

// Check what's in providerJobLogs for these scenes
const [logs] = await conn.execute(
  `SELECT * FROM providerJobLogs WHERE sceneId IN (${sceneIds.join(',')}) LIMIT 10`
);
console.log('providerJobLogs count:', logs.length);
if (logs.length > 0) {
  console.log('Sample:', JSON.stringify(logs.slice(0, 2), null, 2));
}

await conn.end();
