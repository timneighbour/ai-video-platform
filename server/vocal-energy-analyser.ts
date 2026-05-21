/**
 * vocal-energy-analyser.ts
 *
 * Analyses a vocal stem audio file to produce a per-second RMS energy profile.
 * Used to classify scenes as "performance" (singing) or "cinematic" (instrumental)
 * based on actual audio signal rather than LLM inference.
 *
 * Pipeline:
 *   1. Download the vocal stem (Demucs output) from S3/CDN.
 *   2. Use ffmpeg to extract per-second RMS loudness values.
 *   3. Classify each second as "performance" or "cinematic" based on RMS threshold.
 *   4. Aggregate per-second classifications into scene-level recommendations.
 *
 * The result is stored as JSON on musicVideoJobs.vocalEnergyProfile and used
 * by the storyboard generator to override LLM scene type assignments.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { createRequire } from "module";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as https from "https";
import * as http from "http";
const execAsync = promisify(exec);
const _vea_require = createRequire(import.meta.url);
let FFMPEG_BIN = "ffmpeg";
try {
  const ffmpegInstaller = _vea_require("@ffmpeg-installer/ffmpeg");
  if (ffmpegInstaller?.path) FFMPEG_BIN = ffmpegInstaller.path;
} catch { /* fall back to system ffmpeg */ }

// RMS threshold above which a second is classified as "performance" (singing)
// Range: 0.0 (silence) to 1.0 (clipping). 0.05 = -26dBFS, typical singing floor.
export const VOCAL_ENERGY_THRESHOLD = 0.05;

// Minimum fraction of seconds in a scene that must be "performance" to classify
// the whole scene as performance mode.
export const PERFORMANCE_FRACTION_THRESHOLD = 0.4; // 40% of the scene must be singing

export interface VocalEnergySecond {
  second: number;       // 0-indexed second from start of audio
  rms: number;          // RMS amplitude 0.0–1.0
  type: "performance" | "cinematic";
}

export interface VocalEnergyProfile {
  totalDurationSeconds: number;
  performanceSeconds: number;
  cinematicSeconds: number;
  profile: VocalEnergySecond[];
  analysedAt: string; // ISO timestamp
}

export interface SceneTypeRecommendation {
  startTimeMs: number;
  endTimeMs: number;
  recommendedType: "performance" | "cinematic";
  performanceFraction: number; // 0.0–1.0
}

/**
 * Download a URL to a temporary file. Returns the local path.
 */
async function downloadToTemp(url: string, ext = ".mp3"): Promise<string> {
  const tmpPath = path.join(
    os.tmpdir(),
    `wiz-vocal-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
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
  });
}

/**
 * Extract per-second RMS values from an audio file using ffmpeg's astats filter.
 * Returns an array of { second, rms } objects.
 */
async function extractRmsPerSecond(
  audioPath: string
): Promise<Array<{ second: number; rms: number }>> {
  // ffmpeg astats filter outputs RMS level per frame; we use 1-second frames
  const cmd = [
    `"${FFMPEG_BIN}"`,
    `-i "${audioPath}"`,
    `-af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-"`,
    `-f null -`,
  ].join(" ");

  let stdout = "";
  let stderr = "";
  try {
    const result = await execAsync(cmd, { timeout: 120_000 });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err: unknown) {
    // ffmpeg writes to stderr even on success; capture both
    const e = err as { stdout?: string; stderr?: string };
    stdout = e.stdout ?? "";
    stderr = e.stderr ?? "";
  }

  // Parse lines like: "pts_time:1.000000 lavfi.astats.Overall.RMS_level=-26.5"
  const results: Array<{ second: number; rms: number }> = [];
  const lines = (stdout + "\n" + stderr).split("\n");

  for (const line of lines) {
    const match = line.match(/pts_time:([\d.]+).*RMS_level=([-\d.]+)/);
    if (match) {
      const second = Math.floor(parseFloat(match[1]));
      const dbLevel = parseFloat(match[2]);
      // Convert dBFS to linear RMS (0.0–1.0). -inf dBFS = 0.0 (silence).
      const rms = isFinite(dbLevel) ? Math.pow(10, dbLevel / 20) : 0;
      // Only keep one entry per second (take the max if multiple frames per second)
      const existing = results.find((r) => r.second === second);
      if (existing) {
        existing.rms = Math.max(existing.rms, rms);
      } else {
        results.push({ second, rms });
      }
    }
  }

  // If astats parsing failed (no output), fall back to a simpler volumedetect approach
  if (results.length === 0) {
    return await extractRmsViaVolumedetect(audioPath);
  }

  return results.sort((a, b) => a.second - b.second);
}

/**
 * Fallback: use ffmpeg volumedetect to get a single mean volume for the file,
 * then create a uniform profile. Less accurate but always works.
 */
async function extractRmsViaVolumedetect(
  audioPath: string
): Promise<Array<{ second: number; rms: number }>> {
  // Get duration first
  const probeCmd = `ffprobe -v quiet -show_format -print_format json "${audioPath}"`;
  let duration = 30; // default
  try {
    const { stdout } = await execAsync(probeCmd, { timeout: 15_000 });
    const data = JSON.parse(stdout) as { format?: { duration?: string } };
    duration = parseFloat(data.format?.duration ?? "30") || 30;
  } catch { /* use default */ }

  // Get mean volume
  const volCmd = `"${FFMPEG_BIN}" -i "${audioPath}" -af volumedetect -f null - 2>&1`;
  let meanDb = -30; // default: moderate signal
  try {
    const { stdout } = await execAsync(volCmd, { timeout: 30_000 });
    const match = stdout.match(/mean_volume:\s*([-\d.]+)/);
    if (match) meanDb = parseFloat(match[1]);
  } catch { /* use default */ }

  const rms = isFinite(meanDb) ? Math.pow(10, meanDb / 20) : 0;
  const results: Array<{ second: number; rms: number }> = [];
  for (let s = 0; s < Math.ceil(duration); s++) {
    results.push({ second: s, rms });
  }
  return results;
}

/**
 * Analyse a vocal stem URL and return a VocalEnergyProfile.
 *
 * @param vocalStemUrl - CDN URL of the isolated vocal stem (Demucs output)
 */
export async function analyseVocalEnergy(
  vocalStemUrl: string
): Promise<VocalEnergyProfile> {
  let tmpPath: string | null = null;
  try {
    tmpPath = await downloadToTemp(vocalStemUrl);
    const rmsData = await extractRmsPerSecond(tmpPath);

    const profile: VocalEnergySecond[] = rmsData.map(({ second, rms }) => ({
      second,
      rms,
      type: rms >= VOCAL_ENERGY_THRESHOLD ? "performance" : "cinematic",
    }));

    const performanceSeconds = profile.filter((p) => p.type === "performance").length;
    const cinematicSeconds = profile.filter((p) => p.type === "cinematic").length;

    return {
      totalDurationSeconds: profile.length,
      performanceSeconds,
      cinematicSeconds,
      profile,
      analysedAt: new Date().toISOString(),
    };
  } finally {
    if (tmpPath) {
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  }
}

/**
 * Given a VocalEnergyProfile and a list of scene time windows, recommend
 * a scene type for each scene based on the fraction of performance seconds
 * within that window.
 *
 * @param profile   - Result of analyseVocalEnergy()
 * @param scenes    - Array of { startTimeMs, endTimeMs } scene windows
 */
export function recommendSceneTypes(
  profile: VocalEnergyProfile,
  scenes: Array<{ startTimeMs: number; endTimeMs: number }>
): SceneTypeRecommendation[] {
  return scenes.map(({ startTimeMs, endTimeMs }) => {
    const startSec = Math.floor(startTimeMs / 1000);
    const endSec = Math.ceil(endTimeMs / 1000);

    const sceneSeconds = profile.profile.filter(
      (p) => p.second >= startSec && p.second < endSec
    );

    if (sceneSeconds.length === 0) {
      return {
        startTimeMs,
        endTimeMs,
        recommendedType: "cinematic",
        performanceFraction: 0,
      };
    }

    const performanceCount = sceneSeconds.filter((p) => p.type === "performance").length;
    const performanceFraction = performanceCount / sceneSeconds.length;
    const recommendedType: "performance" | "cinematic" =
      performanceFraction >= PERFORMANCE_FRACTION_THRESHOLD ? "performance" : "cinematic";

    return {
      startTimeMs,
      endTimeMs,
      recommendedType,
      performanceFraction,
    };
  });
}
