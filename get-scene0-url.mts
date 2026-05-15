import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { musicVideoScenes } from './drizzle/schema.js';
import { eq, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

const [scene] = await db.select().from(musicVideoScenes)
  .where(and(eq(musicVideoScenes.jobId, 540026), eq(musicVideoScenes.sceneIndex, 0)));

console.log('RAW_VIDEO_URL:', scene?.videoUrl);
console.log('LIP_SYNC_URL:', scene?.lipSyncVideoUrl);

await conn.end();
