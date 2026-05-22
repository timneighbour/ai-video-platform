import { config } from 'dotenv';
import mysql from 'mysql2/promise';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check providerJobLogs for job 690007 scenes
console.log('=== Checking providerJobLogs for job 690007 scenes ===');
try {
  const [cols] = await conn.execute('DESCRIBE providerJobLogs');
  console.log('Columns:', cols.map(c => c.Field).join(', '));
  
  const sceneIds = [690013, 690014, 690015, 690016, 690017, 690018, 690019, 690020, 690021, 690022, 690023, 690024];
  const placeholders = sceneIds.map(() => '?').join(',');
  
  const [logs] = await conn.execute(
    `SELECT id, sceneId, idempotencyKey, status, provider, createdAt FROM providerJobLogs WHERE sceneId IN (${placeholders}) LIMIT 50`,
    sceneIds
  );
  console.log('Found providerJobLogs:', logs.length);
  logs.forEach(l => console.log(` sceneId=${l.sceneId} status=${l.status} key=${l.idempotencyKey}`));
  
  if (logs.length > 0) {
    // Cancel all non-cancelled entries for these scenes
    const [cancelRes] = await conn.execute(
      `UPDATE providerJobLogs SET status='cancelled' WHERE sceneId IN (${placeholders}) AND status != 'cancelled'`,
      sceneIds
    );
    console.log('Cancelled providerJobLogs:', cancelRes.affectedRows);
  }
} catch (e) {
  console.error('providerJobLogs error:', e.message);
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
