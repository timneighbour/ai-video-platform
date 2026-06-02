/**
 * WIZ AI Stem Intelligence Service
 * ==================================
 * Orchestrates the full Demucs 8-stem analysis pipeline for a music video job.
 *
 * Pipeline (runs once per audio upload, results reused across all renders):
 *   1. Download original audio from S3
 *   2. Run stem_extract.py (Demucs + librosa envelope analysis)
 *   3. Upload all 8 stem WAV files to S3
 *   4. Upload large JSON blobs (envelopes, energy maps) to S3
 *   5. Store compact JSON inline (sections, subtitle timing, validation)
 *   6. Update musicVideoJobs with all URLs and stemAnalysisStatus = 'done'
 *
 * The results are then consumed by:
 *   - sceneDispatchHeartbeat: section type → scene type mapping
 *   - storyboard generator: energy maps → emotional arc
 *   - HeyGen lip sync: vocal stem URL (replaces full mix)
 *   - Future subtitle service: subtitle_timing.json
 *
 * NOTE: Python 3 + demucs + librosa must be installed in the execution environment.
 * This service is designed to run in the sandbox heartbeat (not Cloud Run).
 */

import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as https from "https";
import * as http from "http";
import { getDb } from "./db";
import { musicVideoJobs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";

const execFileAsync = promisify(execFile);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StemSection {
  start: number;
  end: number;
  duration: number;
  type: "vocal_performance" | "instrumental" | "orchestral_build" | "emotional_transition" | "climax" | "outro";
  confidence: number;
  stem_rms: {
    vocals: number;
    drums: number;
    bass: number;
    piano: number;
    guitar: number;
    other: number;
  };
}

export interface StemSectionsData {
  version: string;
  total_duration: number;
  sections: StemSection[];
}

export interface SubtitlePhrase {
  start: number;
  end: number;
  duration: number;
  avg_energy: number;
  text?: string; // populated by lyric alignment service later
}

export interface SubtitleTimingData {
  version: string;
  total_duration: number;
  phrases: SubtitlePhrase[];
  note: string;
  subtitle_schema: {
    description: string;
    fields: Record<string, string>;
  };
}

export interface EnergyMapPoint {
  t: number;
  intensity: number;
}

export interface EnergyMapSummary {
  vocal_peak: { t: number; intensity: number } | null;
  orchestral_peak: { t: number; intensity: number } | null;
  rhythm_peak: { t: number; intensity: number } | null;
  total_duration: number;
  vocal_build_regions: Array<{ start: number; end: number; slope: number }>;
  orchestral_build_regions: Array<{ start: number; end: number; slope: number }>;
  section_count: number;
  vocal_performance_sections: number;
  instrumental_sections: number;
  climax_sections: number;
}

export interface EnergyMapsData {
  vocal_intensity: EnergyMapPoint[];
  orchestral_intensity: EnergyMapPoint[];
  rhythm_intensity: EnergyMapPoint[];
  summary: EnergyMapSummary;
}

export interface ValidationData {
  total_duration_seconds: number;
  total_sections: number;
  section_breakdown: Record<string, {
    count: number;
    coverage_pct?: number;
    sections: Array<{ start: number; end: number; confidence?: number }>;
  }>;
  vocal_phrases: { count: number; phrases: SubtitlePhrase[] };
  energy_peaks: {
    vocal_peak: EnergyMapPoint | null;
    orchestral_peak: EnergyMapPoint | null;
    rhythm_peak: EnergyMapPoint | null;
  };
  build_regions: {
    vocal: Array<{ start: number; end: number; slope: number }>;
    orchestral: Array<{ start: number; end: number; slope: number }>;
  };
  stem_availability: Record<string, boolean>;
  classification_quality: {
    has_vocal_sections: boolean;
    has_instrumental_sections: boolean;
    has_climax: boolean;
    vocal_coverage_reasonable: boolean;
    phrase_count_reasonable: boolean;
  };
}

export interface StemIntelligenceResult {
  stemVocalsUrl: string;
  stemDrumsUrl?: string;
  stemBassUrl?: string;
  stemPianoUrl?: string;
  stemGuitarUrl?: string;
  stemOtherUrl?: string;
  stemAccompanimentUrl?: string;
  envelopesUrl: string;
  energyMapsUrl: string;
  sectionsJson: string;
  subtitleTimingJson: string;
  validationJson: string;
  totalDuration: number;
  sectionCount: number;
  phraseCount: number;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

/**
 * Thrown when uploaded audio is silent, near-silent, or too short for Demucs.
 * Callers should catch this and set stemAnalysisStatus = 'skipped_invalid_audio'.
 */
export class SilentAudioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SilentAudioError";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadToTemp(url: string, ext = ".mp3"): Promise<string> {
  const tmpPath = path.join(
    os.tmpdir(),
    `wiz-stem-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  );
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(tmpPath);
    const req = protocol.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => resolve(tmpPath));
      file.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(60_000, () => {
      req.destroy();
      reject(new Error("Download timeout"));
    });
  });
}

async function uploadFile(
  filePath: string,
  s3Key: string,
  contentType: string
): Promise<string> {
  const data = fs.readFileSync(filePath);
  const { url } = await storagePut(s3Key, data, contentType);
  return url;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Get audio duration in seconds using ffprobe.
 * Returns 0 on failure (non-fatal — used for guard only).
 */
async function getAudioDurationSeconds(audioPath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", audioPath],
      { timeout: 15_000 }
    );
    return parseFloat(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}

/**
 * Get audio RMS level in dBFS using ffmpeg volumedetect filter.
 * Returns -Infinity on failure (non-fatal — used for guard only).
 * A truly silent file returns approximately -91 dBFS or lower.
 */
async function getAudioRmsDb(audioPath: string): Promise<number> {
  try {
    // ffmpeg volumedetect writes to stderr
    const { stderr } = await execFileAsync(
      "ffmpeg",
      ["-i", audioPath, "-af", "volumedetect", "-vn", "-sn", "-dn", "-f", "null", "/dev/null"],
      { timeout: 30_000 }
    );
    const match = stderr.match(/mean_volume:\s*([\-\d\.]+)\s*dB/);
    if (match) return parseFloat(match[1]);
    return -Infinity;
  } catch (e: any) {
    // ffmpeg writes to stderr even on success — parse from error output
    const match = e?.stderr?.match(/mean_volume:\s*([\-\d\.]+)\s*dB/);
    if (match) return parseFloat(match[1]);
    return -Infinity;
  }
}

// ─── Main Service Function ────────────────────────────────────────────────────

/**
 * Run the full stem intelligence pipeline for a job.
 * Returns all URLs and JSON blobs to be stored on the job record.
 */
export async function runStemIntelligence(
  jobId: number,
  audioUrl: string,
  hopSize = 0.1
): Promise<StemIntelligenceResult> {
  const tmpDir = path.join(os.tmpdir(), `wiz-stem-job-${jobId}-${Date.now()}`);
  const audioExt = audioUrl.includes(".wav") ? ".wav" : audioUrl.includes(".flac") ? ".flac" : ".mp3";

  try {
    fs.mkdirSync(tmpDir, { recursive: true });

    // ── Step 1: Download audio ──────────────────────────────────────────────
    console.log(`[StemIntelligence] Job ${jobId}: Downloading audio...`);
    const audioPath = await downloadToTemp(audioUrl, audioExt);

    // ── Step 1b: Silent / near-silent / too-short audio guard ─────────────────
    // Demucs crashes with AssertionError on silent or very short audio.
    // Real music-video audio MUST have audible content. Silent files are only
    // valid for render-system smoke tests and MUST NOT be used for end-to-end
    // music-video validation.
    const audioDurationSec = await getAudioDurationSeconds(audioPath);
    const audioRmsDb = await getAudioRmsDb(audioPath);
    const SILENT_THRESHOLD_DB = -60; // dBFS — below this is effectively silent
    const MIN_DURATION_SEC = 10;     // Demucs needs at least ~10s of audio
    console.log(`[StemIntelligence] Job ${jobId}: Audio validation — duration: ${audioDurationSec.toFixed(1)}s, RMS: ${audioRmsDb.toFixed(1)} dBFS`);
    if (audioRmsDb < SILENT_THRESHOLD_DB) {
      throw new SilentAudioError(
        `Audio is silent or near-silent (RMS: ${audioRmsDb.toFixed(1)} dBFS, threshold: ${SILENT_THRESHOLD_DB} dBFS). ` +
        `Please upload a track with audible vocals and music. Silent files cannot be used for music-video generation.`
      );
    }
    if (audioDurationSec > 0 && audioDurationSec < MIN_DURATION_SEC) {
      throw new SilentAudioError(
        `Audio is too short (${audioDurationSec.toFixed(1)}s). ` +
        `Minimum duration for music-video generation is ${MIN_DURATION_SEC} seconds.`
      );
    }

    // ── Step 2: Run Python stem extraction ─────────────────────────────────
    // Use path.resolve relative to this file's location (ESM-compatible)
    const scriptPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), "audio", "stem_extract.py");
    console.log(`[StemIntelligence] Job ${jobId}: Running Demucs + envelope analysis...`);

    const { stdout, stderr } = await execFileAsync(
      "python3",
      [scriptPath, audioPath, tmpDir, "--hop-size", String(hopSize)],
      { timeout: 900_000 } // 15 minutes max
    );

    if (stderr && !stderr.includes("[WizStem]")) {
      console.warn(`[StemIntelligence] Job ${jobId}: Python stderr: ${stderr.slice(0, 500)}`);
    }

    // Parse the final JSON line from stdout
    const lines = stdout.trim().split("\n");
    const lastLine = lines[lines.length - 1];
    let pythonResult: { status: string; total_duration: number; sections: number; phrases: number };
    try {
      pythonResult = JSON.parse(lastLine);
    } catch {
      throw new Error(`Python script did not return valid JSON. Last line: ${lastLine}`);
    }

    if (pythonResult.status !== "ok") {
      throw new Error(`Python script returned non-ok status: ${JSON.stringify(pythonResult)}`);
    }

    console.log(`[StemIntelligence] Job ${jobId}: Analysis complete — ${pythonResult.sections} sections, ${pythonResult.phrases} phrases, ${pythonResult.total_duration}s`);

    // ── Step 3: Upload stem WAV files ───────────────────────────────────────
    const stemsDir = path.join(tmpDir, "stems");
    const stemNames = ["vocals", "drums", "bass", "piano", "guitar", "other", "accompaniment"];
    const stemUrls: Record<string, string> = {};

    for (const stemName of stemNames) {
      const stemPath = path.join(stemsDir, `${stemName}.wav`);
      if (fs.existsSync(stemPath)) {
        const s3Key = `stem-intelligence/${jobId}/${stemName}-${randomSuffix()}.wav`;
        const url = await uploadFile(stemPath, s3Key, "audio/wav");
        stemUrls[stemName] = url;
        console.log(`[StemIntelligence] Job ${jobId}: Uploaded ${stemName} stem`);
      }
    }

    // ── Step 4: Upload large JSON blobs ─────────────────────────────────────
    const envelopesPath = path.join(tmpDir, "envelopes.json");
    const energyMapsPath = path.join(tmpDir, "energy_maps.json");

    const envelopesUrl = await uploadFile(
      envelopesPath,
      `stem-intelligence/${jobId}/envelopes-${randomSuffix()}.json`,
      "application/json"
    );
    const energyMapsUrl = await uploadFile(
      energyMapsPath,
      `stem-intelligence/${jobId}/energy-maps-${randomSuffix()}.json`,
      "application/json"
    );

    // ── Step 5: Read compact JSON for inline storage ─────────────────────────
    const sectionsJson = fs.readFileSync(path.join(tmpDir, "sections.json"), "utf8");
    const subtitleTimingJson = fs.readFileSync(path.join(tmpDir, "subtitle_timing.json"), "utf8");
    const validationJson = fs.readFileSync(path.join(tmpDir, "validation.json"), "utf8");

    // ── Step 6: Clean up temp files ─────────────────────────────────────────
    fs.rmSync(audioPath, { force: true });
    fs.rmSync(tmpDir, { recursive: true, force: true });

    return {
      stemVocalsUrl: stemUrls["vocals"] ?? "",
      stemDrumsUrl: stemUrls["drums"],
      stemBassUrl: stemUrls["bass"],
      stemPianoUrl: stemUrls["piano"],
      stemGuitarUrl: stemUrls["guitar"],
      stemOtherUrl: stemUrls["other"],
      stemAccompanimentUrl: stemUrls["accompaniment"],
      envelopesUrl,
      energyMapsUrl,
      sectionsJson,
      subtitleTimingJson,
      validationJson,
      totalDuration: pythonResult.total_duration,
      sectionCount: pythonResult.sections,
      phraseCount: pythonResult.phrases,
    };
  } catch (err) {
    // Clean up on error
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    throw err;
  }
}

// ─── DB Integration ───────────────────────────────────────────────────────────

/**
 * Run stem intelligence for a job and persist all results to the database.
 * Sets stemAnalysisStatus = 'done' on success, 'failed' on error.
 */
export async function runAndPersistStemIntelligence(jobId: number): Promise<void> {
  const db = (await getDb())!;

  // Mark as processing
  await db
    .update(musicVideoJobs)
    .set({ stemAnalysisStatus: "processing" })
    .where(eq(musicVideoJobs.id, jobId));

  // Get audio URL
  const [job] = await db
    .select({ audioUrl: musicVideoJobs.audioUrl })
    .from(musicVideoJobs)
    .where(eq(musicVideoJobs.id, jobId));

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  try {
    const result = await runStemIntelligence(jobId, job.audioUrl);

    // Persist all results
    await db
      .update(musicVideoJobs)
      .set({
        stemAnalysisStatus: "done",
        stemAnalysisCompletedAt: new Date(),
        stemVocalsUrl: result.stemVocalsUrl || null,
        stemDrumsUrl: result.stemDrumsUrl || null,
        stemBassUrl: result.stemBassUrl || null,
        stemPianoUrl: result.stemPianoUrl || null,
        stemGuitarUrl: result.stemGuitarUrl || null,
        stemOtherUrl: result.stemOtherUrl || null,
        stemAccompanimentUrl: result.stemAccompanimentUrl || null,
        envelopesUrl: result.envelopesUrl,
        energyMapsUrl: result.energyMapsUrl,
        sectionsJson: result.sectionsJson,
        subtitleTimingJson: result.subtitleTimingJson,
        validationJson: result.validationJson,
      })
      .where(eq(musicVideoJobs.id, jobId));

    console.log(`[StemIntelligence] Job ${jobId}: Persisted — ${result.sectionCount} sections, ${result.phraseCount} phrases`);
  } catch (err) {
    if (err instanceof SilentAudioError) {
      // Permanent guard: silent/near-silent/too-short audio cannot be used for music-video generation.
      // Mark as skipped_invalid_audio so the pipeline knows not to attempt lip-sync.
      console.warn(`[StemIntelligence] Job ${jobId}: INVALID AUDIO — ${err.message}`);
      await db
        .update(musicVideoJobs)
        .set({ stemAnalysisStatus: "skipped_invalid_audio" })
        .where(eq(musicVideoJobs.id, jobId));
      // Re-throw so callers can surface the validation message to the user
      throw err;
    }
    console.error(`[StemIntelligence] Job ${jobId}: Failed — ${err}`);
    await db
      .update(musicVideoJobs)
      .set({ stemAnalysisStatus: "failed" })
      .where(eq(musicVideoJobs.id, jobId));
    throw err;
  }
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

/**
 * Get the parsed sections data for a job.
 * Returns null if stem analysis has not completed.
 */
export async function getStemSections(jobId: number): Promise<StemSectionsData | null> {
  const db = (await getDb())!;
  const [job] = await db
    .select({ sectionsJson: musicVideoJobs.sectionsJson, stemAnalysisStatus: musicVideoJobs.stemAnalysisStatus })
    .from(musicVideoJobs)
    .where(eq(musicVideoJobs.id, jobId));

  if (!job?.sectionsJson || job.stemAnalysisStatus !== "done") return null;
  try {
    return JSON.parse(job.sectionsJson) as StemSectionsData;
  } catch {
    return null;
  }
}

/**
 * Get the section type at a given time offset (in seconds).
 * Used by scene dispatch to determine scene classification.
 * Returns null if no stem analysis available (falls back to BPM/LLM classification).
 */
export function getSectionTypeAtTime(
  sections: StemSection[],
  timeSeconds: number
): StemSection["type"] | null {
  for (const section of sections) {
    if (timeSeconds >= section.start && timeSeconds < section.end) {
      return section.type;
    }
  }
  return null;
}

/**
 * Map a stem section type to a scene type for the storyboard.
 * This is the bridge between stem intelligence and scene dispatch.
 */
export function stemSectionToSceneType(
  sectionType: StemSection["type"],
  lipSyncEnabled: boolean
): "performance" | "cinematic" | "narrative" | "transition" {
  switch (sectionType) {
    case "vocal_performance":
    case "climax":
      return lipSyncEnabled ? "performance" : "cinematic";
    case "orchestral_build":
      return "cinematic";
    case "instrumental":
      return "narrative";
    case "emotional_transition":
      return "transition";
    case "outro":
      return "cinematic";
    default:
      return "narrative";
  }
}

/**
 * Get the vocal stem URL for a job (for HeyGen lip sync input).
 * Falls back to the job's vocalsUrl if stem analysis is not complete.
 */
export async function getStemVocalsUrl(jobId: number): Promise<string | null> {
  const db = (await getDb())!;
  const [job] = await db
    .select({
      stemVocalsUrl: musicVideoJobs.stemVocalsUrl,
      vocalsUrl: musicVideoJobs.vocalsUrl,
      stemAnalysisStatus: musicVideoJobs.stemAnalysisStatus,
    })
    .from(musicVideoJobs)
    .where(eq(musicVideoJobs.id, jobId));

  if (!job) return null;

  // Prefer the Demucs stem vocals (cleaner isolation)
  if (job.stemAnalysisStatus === "done" && job.stemVocalsUrl) {
    return job.stemVocalsUrl;
  }

  // Fall back to the existing vocal isolation result
  return job.vocalsUrl ?? null;
}

/**
 * Get the energy map summary for a job.
 * Used by the storyboard generator to understand emotional arc.
 */
export async function getEnergyMapSummary(jobId: number): Promise<EnergyMapSummary | null> {
  const db = (await getDb())!;
  const [job] = await db
    .select({ energyMapsUrl: musicVideoJobs.energyMapsUrl, stemAnalysisStatus: musicVideoJobs.stemAnalysisStatus })
    .from(musicVideoJobs)
    .where(eq(musicVideoJobs.id, jobId));

  if (!job?.energyMapsUrl || job.stemAnalysisStatus !== "done") return null;

  try {
    // Fetch the energy maps JSON from S3
    const res = await fetch(job.energyMapsUrl);
    if (!res.ok) return null;
    const data = (await res.json()) as EnergyMapsData;
    return data.summary;
  } catch {
    return null;
  }
}

/**
 * Get the validation summary for a job.
 * Used by the admin dashboard to confirm classification quality.
 */
export async function getValidationSummary(jobId: number): Promise<ValidationData | null> {
  const db = (await getDb())!;
  const [job] = await db
    .select({ validationJson: musicVideoJobs.validationJson, stemAnalysisStatus: musicVideoJobs.stemAnalysisStatus })
    .from(musicVideoJobs)
    .where(eq(musicVideoJobs.id, jobId));

  if (!job?.validationJson || job.stemAnalysisStatus !== "done") return null;
  try {
    return JSON.parse(job.validationJson) as ValidationData;
  } catch {
    return null;
  }
}
