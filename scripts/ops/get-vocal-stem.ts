import { getDb } from "./server/db";
import { musicVideoJobs } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) { console.log("No DB"); return; }
  const jobs = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 720001));
  const job = jobs[0] as any;
  console.log("vocalStemUrl:", job?.vocalStemUrl || "none");
  console.log("vocalStemKey:", job?.vocalStemKey || "none");
  // Print all fields with values
  for (const [k, v] of Object.entries(job || {})) {
    if (v && typeof v === "string" && v.length > 5) {
      console.log(`${k}: ${String(v).substring(0, 200)}`);
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
