// One-shot diagnostic: job 720001 full flags + scene sceneType breakdown
import { getDb } from "../server/db";
import { musicVideoJobs, musicVideoScenes } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const db = await getDb();
if (!db) { console.error("No DB"); process.exit(1); }

const jobs = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 720001));
const job = jobs[0] as Record<string, unknown>;
console.log("\n=== JOB 720001 FLAGS ===");
const interestingKeys = ["title","status","renderer","fallbackProvider","enableLipSync","lipSync","audioUrl","aspectRatio","characterId","characterName","probeMode","probePassed"];
interestingKeys.forEach(k => console.log(`  ${k.padEnd(20)}: ${job?.[k] ?? "not set"}`));

const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 720001));
console.log("\n=== SCENES ===");
(scenes as Record<string, unknown>[])
  .sort((a, b) => (a.sceneIndex as number) - (b.sceneIndex as number))
  .forEach((s) => {
    const idx = String((s.sceneIndex as number) + 1).padStart(2);
    console.log(`  Scene ${idx}: type=${String(s.sceneType).padEnd(12)} lipSync=${String(s.lipSync).padEnd(5)} model=${String(s.modelAssignment ?? "null").padEnd(25)} composite=${s.compositeStatus}`);
  });

process.exit(0);
