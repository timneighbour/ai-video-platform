import "dotenv/config";
import { getDb } from "./db";
import { musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.error("DB unavailable"); process.exit(1); }
  const [job] = await db.select({
    audioUrl: musicVideoJobs.audioUrl,
    vocalsUrl: musicVideoJobs.vocalsUrl,
    title: musicVideoJobs.title,
  }).from(musicVideoJobs).where(eq(musicVideoJobs.id, 660001));

  console.log(`Job 660001: "${job.title}"`);
  console.log(`  audioUrl (original full mix): ${job.audioUrl}`);
  console.log(`  vocalsUrl: ${job.vocalsUrl}`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
