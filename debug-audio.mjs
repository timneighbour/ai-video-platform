import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';
config();

const conn = await createConnection(process.env.DATABASE_URL);

// Get job details - check column names
const [cols] = await conn.execute('SHOW COLUMNS FROM musicVideoJobs');
const colNames = cols.map(c => c.Field);
console.log('musicVideoJobs columns:', colNames.join(', '));

// Get job audio info
const [jobs] = await conn.execute('SELECT * FROM musicVideoJobs WHERE id = 1080001');
const job = jobs[0];
// Print only audio-related fields
const audioFields = {};
for (const key of Object.keys(job)) {
  if (key.toLowerCase().includes('audio') || key.toLowerCase().includes('vocal') || key.toLowerCase().includes('stem') || key.toLowerCase().includes('char')) {
    audioFields[key] = job[key];
  }
}
console.log('Job audio fields:', JSON.stringify(audioFields, null, 2));

// Check characters table
const [charCols] = await conn.execute('SHOW COLUMNS FROM musicVideoCharacters');
console.log('musicVideoCharacters columns:', charCols.map(c => c.Field).join(', '));

await conn.end();
