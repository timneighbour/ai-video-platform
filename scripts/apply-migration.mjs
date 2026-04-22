import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlFile = join(__dirname, '../drizzle/migration-missing-tables.sql');
const sql = readFileSync(sqlFile, 'utf8');

// Strip comments and split into individual statements
const statements = sql
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('Connected to database.');
  
  for (const stmt of statements) {
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
    console.log(`\nExecuting: ${preview}...`);
    try {
      await conn.execute(stmt);
      console.log('  OK');
    } catch (err) {
      console.error('  ERROR:', err.message);
      await conn.end();
      process.exit(1);
    }
  }
  
  await conn.end();
  console.log('\nMigration complete.');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
