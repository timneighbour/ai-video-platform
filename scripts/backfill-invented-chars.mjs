import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

const [jobs] = await conn.execute('SELECT id, userId, characterRoster FROM musicVideoJobs WHERE id IN (120002,120003,120004,120005)');

for (const job of jobs) {
  if (!job.characterRoster) {
    console.log(`Job ${job.id} - no characterRoster, skipping`);
    continue;
  }

  let roster;
  try {
    roster = JSON.parse(job.characterRoster);
  } catch (e) {
    console.log(`Job ${job.id} - failed to parse characterRoster`);
    continue;
  }

  const invented = roster.filter(c => c.isLocked === false);
  console.log(`Job ${job.id} - invented chars: ${invented.map(c => c.name + ' (' + c.role + ')').join(', ')}`);

  for (const char of invented) {
    // Check if already in videoCharacters
    const [existing] = await conn.execute(
      'SELECT id, isLocked FROM videoCharacters WHERE jobId = ? AND name = ?',
      [job.id, char.name]
    );

    if (existing.length > 0) {
      const row = existing[0];
      if (!row.isLocked) {
        await conn.execute(
          'UPDATE videoCharacters SET lockedDescription = ?, isLocked = 1, lockedAt = NOW(), updatedAt = NOW() WHERE id = ?',
          [char.description, row.id]
        );
        console.log(`  Updated ${char.name} in videoCharacters (id=${row.id})`);
      } else {
        console.log(`  ${char.name} already locked in videoCharacters (id=${row.id}) - keeping`);
      }
    } else {
      // Get current slot count for this job
      const [slots] = await conn.execute('SELECT COUNT(*) AS cnt FROM videoCharacters WHERE jobId = ?', [job.id]);
      const nextSlot = slots[0].cnt;

      await conn.execute(
        'INSERT INTO videoCharacters (jobId, userId, name, role, slotIndex, lockedDescription, isLocked, lockedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), NOW())',
        [job.id, job.userId, char.name, char.role, nextSlot, char.description]
      );
      console.log(`  Inserted ${char.name} (${char.role}) into videoCharacters for job ${job.id}`);
    }
  }
}

// Show final state
const [allChars] = await conn.execute(
  'SELECT jobId, name, role, isLocked, LEFT(lockedDescription, 100) AS shortDesc FROM videoCharacters WHERE jobId IN (120002,120003,120004,120005) ORDER BY jobId, name'
);
console.log('\n=== Final videoCharacters state ===');
for (const c of allChars) {
  console.log(`Job ${c.jobId} | ${c.name} (${c.role}) | locked=${c.isLocked} | ${c.shortDesc}`);
}

await conn.end();
