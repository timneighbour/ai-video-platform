import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { musicVideoJobs } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const dbUrl = process.env.DATABASE_URL;
const connection = await mysql.createConnection(dbUrl);
const db = drizzle(connection);

const job = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 720001)).limit(1);

if (job.length > 0) {
  const j = job[0];
  console.log('✅ Job 720001 found');
  console.log('Status:', j.status);
  console.log('Has Final Video:', !!j.finalVideoUrl);
  if (j.finalVideoUrl) {
    console.log('Video URL:', j.finalVideoUrl);
  }
  console.log('Last Updated:', new Date(j.updatedAt).toISOString());
} else {
  console.log('❌ Job not found');
}

await connection.end();
