import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [chars] = await conn.execute(
  'SELECT id, name, masterPortraitUrl, previewImageUrl, environmentRefUrl, performanceRefUrl, autoPrepStatus FROM videoCharacters WHERE jobId = 930003'
);

for (const c of chars) {
  console.log('Character:', c.id, c.name);
  console.log('  masterPortraitUrl:', c.masterPortraitUrl?.slice(0, 100) ?? 'NULL');
  console.log('  previewImageUrl:', c.previewImageUrl?.slice(0, 100) ?? 'NULL');
  console.log('  environmentRefUrl:', c.environmentRefUrl?.slice(0, 100) ?? 'NULL');
  console.log('  performanceRefUrl:', c.performanceRefUrl?.slice(0, 100) ?? 'NULL');
  console.log('  autoPrepStatus:', c.autoPrepStatus);
}

// Also check Zara's global character (570001) for environment ref
const [globalZara] = await conn.execute(
  'SELECT id, name, masterPortraitUrl, environmentRefUrl, autoPrepStatus FROM videoCharacters WHERE id = 570001'
);
if (globalZara.length > 0) {
  const z = globalZara[0];
  console.log('\nGlobal Zara (570001):');
  console.log('  masterPortraitUrl:', z.masterPortraitUrl?.slice(0, 100) ?? 'NULL');
  console.log('  environmentRefUrl:', z.environmentRefUrl?.slice(0, 100) ?? 'NULL');
  console.log('  autoPrepStatus:', z.autoPrepStatus);
}

await conn.end();
