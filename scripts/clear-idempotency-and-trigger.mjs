import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check the idempotency keys table structure
console.log('=== Checking wizadora_idempotency_keys table ===');
try {
  const [cols] = await conn.execute('DESCRIBE wizadora_idempotency_keys');
  console.log('Columns:', cols.map(c => c.Field + ' ' + c.Type).join(', '));
  
  // Find keys related to job 690007 scenes
  const [keys] = await conn.execute(
    "SELECT * FROM wizadora_idempotency_keys WHERE idempotency_key LIKE '%690007%' OR idempotency_key LIKE '%690013%' OR idempotency_key LIKE '%690014%' OR idempotency_key LIKE '%690015%' OR idempotency_key LIKE '%690016%' OR idempotency_key LIKE '%690017%' OR idempotency_key LIKE '%690018%' OR idempotency_key LIKE '%690019%' OR idempotency_key LIKE '%690020%' OR idempotency_key LIKE '%690021%' OR idempotency_key LIKE '%690022%' OR idempotency_key LIKE '%690023%' OR idempotency_key LIKE '%690024%' LIMIT 50"
  );
  console.log('Found idempotency keys:', keys.length);
  keys.forEach(k => console.log(' ', JSON.stringify(k)));
  
  if (keys.length > 0) {
    // Delete them
    const [del] = await conn.execute(
      "DELETE FROM wizadora_idempotency_keys WHERE idempotency_key LIKE '%690007%' OR idempotency_key LIKE '%690013%' OR idempotency_key LIKE '%690014%' OR idempotency_key LIKE '%690015%' OR idempotency_key LIKE '%690016%' OR idempotency_key LIKE '%690017%' OR idempotency_key LIKE '%690018%' OR idempotency_key LIKE '%690019%' OR idempotency_key LIKE '%690020%' OR idempotency_key LIKE '%690021%' OR idempotency_key LIKE '%690022%' OR idempotency_key LIKE '%690023%' OR idempotency_key LIKE '%690024%'"
    );
    console.log('Deleted idempotency keys:', del.affectedRows);
  }
} catch (e) {
  console.log('Idempotency table error:', e.message);
}

// Also check renderAttempts with correct column name
try {
  const [cols] = await conn.execute('DESCRIBE renderAttempts');
  console.log('\nrenderAttempts columns:', cols.map(c => c.Field).join(', '));
  
  // Find the scene ID column
  const sceneCol = cols.find(c => c.Field.toLowerCase().includes('scene'));
  if (sceneCol) {
    console.log('Scene column:', sceneCol.Field);
    const [attempts] = await conn.execute(
      `SELECT * FROM renderAttempts WHERE ${sceneCol.Field} IN (690013,690014,690015,690016,690017,690018,690019,690020,690021,690022,690023,690024) LIMIT 20`
    );
    console.log('renderAttempts for job 690007 scenes:', attempts.length);
    if (attempts.length > 0) {
      const [del] = await conn.execute(
        `DELETE FROM renderAttempts WHERE ${sceneCol.Field} IN (690013,690014,690015,690016,690017,690018,690019,690020,690021,690022,690023,690024)`
      );
      console.log('Deleted renderAttempts:', del.affectedRows);
    }
  }
} catch (e) {
  console.log('renderAttempts error:', e.message);
}

await conn.end();

// Now trigger the heartbeat
console.log('\n=== Triggering heartbeat ===');
const res = await fetch('http://localhost:3000/api/scheduled/sceneDispatchHeartbeat', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-dev-bypass': 'scene-dispatch-2026'
  }
});
const text = await res.text();
console.log('Heartbeat HTTP', res.status, ':', text.substring(0, 500));
