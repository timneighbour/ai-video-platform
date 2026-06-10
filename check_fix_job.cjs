const mysql = require('mysql2/promise');

async function main() {
  const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY || '';

  console.log('HEYGEN_API_KEY set:', HEYGEN_API_KEY.length > 0, '| length:', HEYGEN_API_KEY.length);
  console.log('WAVESPEED_API_KEY set:', WAVESPEED_API_KEY.length > 0, '| length:', WAVESPEED_API_KEY.length);

  // Test HeyGen API key validity
  if (HEYGEN_API_KEY) {
    const res = await fetch('https://api.heygen.com/v2/user/remaining_quota', {
      headers: { 'X-Api-Key': HEYGEN_API_KEY }
    });
    const text = await res.text();
    console.log('HeyGen API test:', res.status, text.slice(0, 300));
  }

  // Reset job 1020003 to rendering
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get correct column names first
  const [cols] = await conn.execute('DESCRIBE musicVideoScenes LIMIT 1');
  
  // Reset job status
  await conn.execute("UPDATE musicVideoJobs SET status = 'rendering', updatedAt = NOW() WHERE id = 1020003");
  console.log('Job 1020003 reset to rendering');

  // Check scene statuses using SHOW COLUMNS
  const [sceneCols] = await conn.execute('SHOW COLUMNS FROM musicVideoScenes');
  const colNames = sceneCols.map(c => c.Field);
  console.log('Scene columns (first 20):', colNames.slice(0, 20).join(', '));
  
  // Find status-related columns
  const statusCols = colNames.filter(c => c.toLowerCase().includes('status') || c.toLowerCase().includes('order') || c.toLowerCase().includes('retry') || c.toLowerCase().includes('error'));
  console.log('Status-related columns:', statusCols.join(', '));
  
  await conn.end();
}

main().catch(console.error);
