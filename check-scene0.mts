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

console.log('Scene 0 status:', scene?.status);
console.log('Scene 0 taskId:', scene?.taskId);
console.log('Scene 0 videoUrl:', scene?.videoUrl?.slice(0, 80) ?? 'null');
console.log('Scene 0 lipSyncStatus:', scene?.lipSyncStatus);
console.log('Scene 0 lipSyncTaskId:', scene?.lipSyncTaskId);
console.log('Scene 0 lipSyncVideoUrl:', scene?.lipSyncVideoUrl?.slice(0, 80) ?? 'null');
console.log('Scene 0 updatedAt:', scene?.updatedAt);

await conn.end();
