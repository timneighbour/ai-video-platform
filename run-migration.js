// CJS migration script - run with: node run-migration.js
const mysql = require('./node_modules/mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const migrations = [
    { sql: 'ALTER TABLE `users` ADD `isFoundingCreator` boolean DEFAULT false NOT NULL', name: 'isFoundingCreator' },
    { sql: 'ALTER TABLE `users` ADD `foundingCreatorGrantedAt` timestamp NULL', name: 'foundingCreatorGrantedAt' },
    { sql: 'ALTER TABLE `musicVideoScenes` ADD `focusCharacter` varchar(128)', name: 'focusCharacter' },
    { sql: 'ALTER TABLE `videoCharacters` ADD `voiceProfile` longtext', name: 'voiceProfile' },
  ];

  for (const m of migrations) {
    try {
      await conn.execute(m.sql);
      console.log('✓ Added', m.name);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('→ Already exists:', m.name);
      } else {
        console.warn('⚠ Error on', m.name, ':', e.message);
      }
    }
  }

  // Verify
  const [rows] = await conn.execute('SHOW COLUMNS FROM users LIKE "%founding%"');
  console.log('\nVerification - founding columns:', rows.map(r => r.Field));
  
  await conn.end();
  console.log('\nMigration complete');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
