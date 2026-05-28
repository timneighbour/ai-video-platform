import { getDb } from "../server/db";
import { musicVideoJobs, musicVideoScenes } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const db = await getDb();
if (!db) { console.error("No DB"); process.exit(1); }

const jobs = await db.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, 720001));
const job = jobs[0] as Record<string, unknown>;
console.log(`\n=== JOB 720001: ${job?.title} ===`);
console.log(`  status       : ${job?.status}`);
console.log(`  finalVideoUrl: ${job?.finalVideoUrl ? "SET ✅" : "null (not yet assembled)"}`);

const scenes = await db.select().from(musicVideoScenes).where(eq(musicVideoScenes.jobId, 720001));
console.log(`\n=== SCENES (${scenes.length} total) ===`);

let lipSyncDone = 0, lipSyncPending = 0, lipSyncProcessing = 0, lipSyncError = 0;
let compositeDone = 0, compositePending = 0, compositeProcessing = 0, compositeError = 0;

(scenes as Record<string, unknown>[])
  .sort((a, b) => (a.sceneIndex as number) - (b.sceneIndex as number))
  .forEach((s) => {
    const idx = String((s.sceneIndex as number) + 1).padStart(2);
    const ls = String(s.lipSyncStatus).padEnd(12);
    const cs = String(s.compositeStatus).padEnd(12);
    const lsTask = s.lipSyncTaskId ? `task=${String(s.lipSyncTaskId).slice(0,16)}` : "no task";
    console.log(`  Scene ${idx}: lipSync=${ls} composite=${cs} | ${lsTask}`);
    if (s.lipSyncStatus === "done") lipSyncDone++;
    else if (s.lipSyncStatus === "pending") lipSyncPending++;
    else if (s.lipSyncStatus === "processing") lipSyncProcessing++;
    else if (s.lipSyncStatus === "error") lipSyncError++;
    if (s.compositeStatus === "done") compositeDone++;
    else if (s.compositeStatus === "pending") compositePending++;
    else if (s.compositeStatus === "processing") compositeProcessing++;
    else if (s.compositeStatus === "error") compositeError++;
  });

console.log(`\n=== SUMMARY ===`);
console.log(`  Lip Sync  : done=${lipSyncDone} processing=${lipSyncProcessing} pending=${lipSyncPending} error=${lipSyncError}`);
console.log(`  Composite : done=${compositeDone} processing=${compositeProcessing} pending=${compositePending} error=${compositeError}`);
console.log(`  Progress  : ${compositeDone}/12 scenes fully composited`);
process.exit(0);
