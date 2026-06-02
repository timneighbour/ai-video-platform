/**
 * Upload the benchmark vocal track to S3 and update Job 870022's audioUrl.
 */
import { storagePut } from "./storage.ts";
import { getDb } from "./db.ts";
import { musicVideoJobs, musicVideoScenes } from "../drizzle/schema.ts";
import { eq } from "drizzle-orm";
import fs from "fs";

const db = await getDb();

const JOB_ID = 870022;
const LOCAL_PATH = "/home/ubuntu/webdev-static-assets/benchmark-vocal-track.mp3";

console.log("[UploadBenchmarkAudio] Reading file:", LOCAL_PATH);
const data = fs.readFileSync(LOCAL_PATH);
console.log("[UploadBenchmarkAudio] File size:", data.length, "bytes");

const key = `benchmark/glass-on-the-water-${Date.now()}.mp3`;
console.log("[UploadBenchmarkAudio] Uploading to S3 key:", key);
const { url } = await storagePut(key, data, "audio/mpeg");
console.log("[UploadBenchmarkAudio] ✓ S3 URL:", url);

// Update Job 870022 with the new audio URL and reset stem analysis
await db.update(musicVideoJobs)
  .set({
    audioUrl: url,
    stemAnalysisStatus: "pending",
    stemVocalsUrl: null,
    stemDrumsUrl: null,
    stemBassUrl: null,
    stemPianoUrl: null,
    stemGuitarUrl: null,
    stemOtherUrl: null,
    stemAccompanimentUrl: null,
    envelopesUrl: null,
    energyMapsUrl: null,
    sectionsJson: null,
    subtitleTimingJson: null,
    validationJson: null,
    stemAnalysisCompletedAt: null,
    probeVideoUrl: null,
    probePassed: null,
    probeApprovedAt: null,
  })
  .where(eq(musicVideoJobs.id, JOB_ID));

console.log("[UploadBenchmarkAudio] ✓ Job 870022 audioUrl updated to:", url);

// Reset all scenes to pending and clear task IDs
const resetResult = await db.update(musicVideoScenes)
  .set({
    mvSceneStatus: "pending",
    taskId: null,
    videoUrl: null,
    lipSyncVideoUrl: null,
    errorMessage: null,
    retryCount: 0,
  })
  .where(eq(musicVideoScenes.jobId, JOB_ID));

console.log("[UploadBenchmarkAudio] ✓ All scenes reset to pending");
console.log("[UploadBenchmarkAudio] Done. New audio URL:", url);
