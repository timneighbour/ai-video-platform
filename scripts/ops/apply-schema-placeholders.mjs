import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const migrations = [
  {
    name: 'voiceProfile on videoCharacters',
    sql: 'ALTER TABLE `videoCharacters` ADD `voiceProfile` TEXT NULL',
    dupCheck: 'voiceProfile',
    table: 'videoCharacters',
  },
  {
    name: 'focusCharacter on musicVideoScenes',
    sql: 'ALTER TABLE `musicVideoScenes` ADD `focusCharacter` VARCHAR(128) NULL',
    dupCheck: 'focusCharacter',
    table: 'musicVideoScenes',
  },
  {
    name: 'camera JSON on musicVideoScenes',
    sql: 'ALTER TABLE `musicVideoScenes` ADD `camera` JSON NULL',
    dupCheck: 'camera',
    table: 'musicVideoScenes',
  },
];

for (const m of migrations) {
  try {
    await conn.execute(m.sql);
    console.log(`✅ Applied: ${m.name}`);
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log(`⏭  Already exists: ${m.name}`);
    } else {
      console.error(`❌ Failed: ${m.name} — ${e.message}`);
    }
  }
}

await conn.end();
console.log('Done.');
