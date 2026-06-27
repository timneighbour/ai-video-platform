/**
 * reset-probe-v3.cjs
 * Resets probe scene 1140064 and job 1320002 for a fresh 3-stage pipeline run.
 * Run: node reset-probe-v3.cjs
 */
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL || '');
  try {
    // Reset scene
    await conn.execute(`
      UPDATE musicVideoScenes SET
        \`status\` = 'pending',
        taskId = NULL,
        heroImageUrl = NULL,
        grokVideoStatus = 'pending',
        grokVideoRequestId = NULL,
        lipSyncStatus = 'pending',
        lipSyncTaskId = NULL,
        lipSyncVideoUrl = NULL,
        errorMessage = NULL,
        updatedAt = NOW()
      WHERE id = 1140064
    `);
    console.log('Scene 1140064 reset to pending');

    // Reset job
    await conn.execute(`
      UPDATE musicVideoJobs SET
        \`status\` = 'rendering',
        probePassed = NULL,
        updatedAt = NOW()
      WHERE id = 1320002
    `);
    console.log('Job 1320002 reset to rendering');

    // Verify
    const [scenes] = await conn.execute('SELECT id, `status`, grokVideoStatus, lipSyncStatus, heroImageUrl FROM musicVideoScenes WHERE id = 1140064');
    const [jobs] = await conn.execute('SELECT id, `status`, probePassed FROM musicVideoJobs WHERE id = 1320002');
    console.log('Scene:', JSON.stringify(scenes[0]));
    console.log('Job:', JSON.stringify(jobs[0]));
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
