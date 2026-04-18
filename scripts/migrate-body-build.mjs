import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);
try {
  await conn.execute(
    "ALTER TABLE `videoCharacters` ADD `bodyBuild` enum('slim','lean','average','athletic','stocky','muscular') DEFAULT 'average'"
  );
  console.log('✅ Migration applied: bodyBuild column added to videoCharacters');
} catch (err) {
  if (err.code === 'ER_DUP_FIELDNAME') {
    console.log('ℹ️  Column bodyBuild already exists — skipping');
  } else {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
} finally {
  await conn.end();
}
