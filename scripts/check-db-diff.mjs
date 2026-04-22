import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute('SHOW TABLES');
  const dbTables = new Set(rows.map(r => Object.values(r)[0]));

  // All tables expected from drizzle/schema.ts
  const schemaTables = [
    'users','subscriptions','credits','creditTransactions','topupPurchases',
    'projects','musicVideoJobs','musicVideoScenes','apiKeys',
    'videoCharacters','videoCharacterPhotos','enhancementJobs',
    'showcaseItems','suno_music_tasks','renderJobs',
    'subscriptionRenderAllowances','renderBundles','reEngagementReminders',
    'inAppNotifications','kidsVideoJobs','blogPosts','creators',
    'wizSyncJobs','wizSyncSpeakers','wizSyncSegments','wizScoreJobs',
    'wizImages','wizShortsJobs','wizShortsScenes',
    'analyticsSessions','analyticsPageViews','analyticsEvents',
    'providerJobLogs','wizPerformerConsents','dataRequests',
    'wizadora_api_keys','wizadora_jobs','wizadora_provider_logs',
    'wizadora_idempotency_keys','wizadora_webhook_logs','wizadora_spend_caps',
    'experiment_assignments','autoSaves','debugLogs'
  ];

  const missing = schemaTables.filter(t => !dbTables.has(t));
  const extra = [...dbTables].filter(t => !schemaTables.includes(t) && t !== '__drizzle_migrations');

  console.log('\n=== MISSING from live DB (in schema but not in DB) ===');
  if (missing.length === 0) console.log('  None — all schema tables exist in DB');
  else missing.forEach(t => console.log('  MISSING:', t));

  console.log('\n=== EXTRA in live DB (in DB but not in schema) ===');
  if (extra.length === 0) console.log('  None');
  else extra.forEach(t => console.log('  EXTRA:', t));

  console.log('\n=== ALL LIVE DB TABLES ===');
  [...dbTables].sort().forEach(t => console.log(' ', t));

  await conn.end();
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1); });
