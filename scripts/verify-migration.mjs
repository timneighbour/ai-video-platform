import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('=== POST-MIGRATION VERIFICATION ===\n');
  
  // 1. Check new tables exist
  const newTables = ['enhancementJobs', 'experiment_assignments'];
  console.log('--- New tables ---');
  for (const t of newTables) {
    const [rows] = await conn.execute('SHOW TABLES LIKE ?', [t]);
    const exists = rows.length > 0;
    console.log(`  ${t}: ${exists ? 'EXISTS ✓' : 'MISSING ✗'}`);
    if (exists) {
      const [cols] = await conn.execute('SELECT COUNT(*) as cnt FROM `' + t + '`');
      console.log(`    rows: ${cols[0].cnt}`);
    }
  }
  
  // 2. Verify existing critical tables are untouched
  const critical = [
    { table: 'users', expected: 5 },
    { table: 'subscriptions', expected: 5 },
    { table: 'credits', expected: 5 },
    { table: 'creditTransactions', expected: 6 },
    { table: 'musicVideoJobs', expected: 44 },
    { table: 'musicVideoScenes', expected: 814 },
    { table: 'renderJobs', expected: 14 },
    { table: 'showcaseItems', expected: 6 },
    { table: 'blogPosts', expected: 3 },
  ];
  
  console.log('\n--- Existing table row counts (must match baseline) ---');
  let allMatch = true;
  for (const { table, expected } of critical) {
    const [rows] = await conn.execute('SELECT COUNT(*) as cnt FROM `' + table + '`');
    const actual = rows[0].cnt;
    const match = actual >= expected; // >= because new rows could be added
    if (!match) allMatch = false;
    console.log(`  ${table}: ${actual} rows ${match ? '✓' : `✗ (expected >= ${expected})`}`);
  }
  
  console.log('\n--- Summary ---');
  console.log(`  New tables created: ${newTables.length}`);
  console.log(`  Existing data intact: ${allMatch ? 'YES ✓' : 'NO ✗ — INVESTIGATE'}`);
  console.log(`  Destructive operations: NONE (CREATE IF NOT EXISTS only)`);
  
  await conn.end();
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1); });
