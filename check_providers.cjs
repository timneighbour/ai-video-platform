const mysql = require('mysql2/promise');

async function main() {
  // Check fal.ai balance
  const FAL_KEY = process.env.FAL_AI_API_KEY || '';
  console.log('FAL_AI_API_KEY set:', FAL_KEY.length > 0, '| length:', FAL_KEY.length);
  
  if (FAL_KEY) {
    try {
      const res = await fetch('https://fal.ai/api/billing/balance', {
        headers: { 'Authorization': `Key ${FAL_KEY}` }
      });
      const text = await res.text();
      console.log('fal.ai balance check:', res.status, text.slice(0, 300));
    } catch (e) {
      console.log('fal.ai balance check error:', e.message);
    }
    
    // Try alternate endpoint
    try {
      const res2 = await fetch('https://fal.run/fal-ai/billing/balance', {
        headers: { 'Authorization': `Key ${FAL_KEY}` }
      });
      const text2 = await res2.text();
      console.log('fal.ai balance check 2:', res2.status, text2.slice(0, 300));
    } catch (e) {
      console.log('fal.ai balance check 2 error:', e.message);
    }
  }

  // Check scene error messages for job 1020003
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [scenes] = await conn.execute(
    "SELECT id, error_message, provider_error_code, mv_scene_status, mv_scene_order FROM musicVideoScenes WHERE job_id = 1020003 ORDER BY mv_scene_order"
  );
  console.log('\nScene errors:');
  scenes.forEach(s => {
    if (s.error_message || s.provider_error_code) {
      console.log(`  Scene ${s.mv_scene_order} (id ${s.id}): status=${s.mv_scene_status} | error=${s.error_message} | code=${s.provider_error_code}`);
    } else {
      console.log(`  Scene ${s.mv_scene_order} (id ${s.id}): status=${s.mv_scene_status} | no error`);
    }
  });
  
  // Also check debug logs for recent errors
  const [logs] = await conn.execute(
    "SELECT message, created_at FROM debugLogs WHERE job_id = 1020003 ORDER BY created_at DESC LIMIT 10"
  );
  console.log('\nRecent debug logs:');
  logs.forEach(l => console.log(`  [${l.created_at}] ${l.message}`));
  
  await conn.end();
}

main().catch(console.error);
