import { createConnection } from '../node_modules/mysql2/promise.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('No DATABASE_URL'); process.exit(1); }

const sqlFile = join(__dirname, '../drizzle/0056_lush_johnny_blaze.sql');
const sql = readFileSync(sqlFile, 'utf8');
const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

const conn = await createConnection(dbUrl);
console.log('Connected to DB');

for (const stmt of statements) {
  if (!stmt) continue;
  try {
    await conn.execute(stmt);
    console.log('✓', stmt.substring(0, 80).replace(/\n/g, ' '));
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('Duplicate')) {
      console.log('⚠ Skip (exists):', stmt.substring(0, 60).replace(/\n/g, ' '));
    } else {
      console.error('✗ Error:', err.message, '\nSQL:', stmt.substring(0, 120));
    }
  }
}

await conn.end();
console.log('Migration complete');
