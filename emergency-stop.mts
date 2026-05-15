import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { musicVideoScenes, musicVideoJobs } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

await db.update(musicVideoJobs).set({ status: 'paused', updatedAt: new Date() }).where(eq(musicVideoJobs.id, 540026));
await db.update(musicVideoScenes).set({ status: 'pending', taskId: null, videoUrl: null, videoKey: null, errorMessage: null, lipSyncStatus: 'pending', lipSyncTaskId: null, lipSyncVideoUrl: null, lipSyncVideoKey: null, updatedAt: new Date() }).where(eq(musicVideoScenes.jobId, 540026));

console.log('🛑 Job 540026 PAUSED — all scenes reset to pending, no more credits will be spent.');
await conn.end();
