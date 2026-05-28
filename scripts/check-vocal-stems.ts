import { getDb } from "../server/db";
import { musicVideoVocalStems, musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const db = await getDb();
if (!db) { console.error("No DB"); process.exit(1); }

// Full stem record
const stems = await db.select().from(musicVideoVocalStems).where(eq(musicVideoVocalStems.jobId, 720001));
console.log(`\nVocal stems for job 720001: ${stems.length}`);
(stems as Record<string, unknown>[]).forEach(s => {
  const keys = Object.keys(s);
  keys.forEach(k => console.log(`  ${k.padEnd(24)}: ${s[k] ?? "null"}`));
});

// Also check the job audio URL
const jobs = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 720001));
const job = jobs[0] as Record<string, unknown>;
console.log(`\nJob audioUrl: ${job?.audioUrl ?? "null"}`);

process.exit(0);
