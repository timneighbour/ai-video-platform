/**
 * BPM Detection Utility
 * Uses ffmpeg to decode audio to raw PCM float32, then music-tempo to detect BPM.
 * Works entirely in Node.js — no Python, no Web Audio API required.
 */
import { spawn } from "child_process";
import MusicTempo from "music-tempo";

const SAMPLE_RATE = 44100;

/**
 * Decode audio URL to raw PCM float32 array using ffmpeg.
 * Downsamples to mono 44100 Hz for BPM analysis.
 */
async function decodeAudioToPCM(audioUrl: string): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const ffmpeg = spawn("ffmpeg", [
      "-i", audioUrl,
      "-ac", "1",           // mono
      "-ar", String(SAMPLE_RATE), // 44100 Hz
      "-f", "f32le",        // raw float32 little-endian
      "-vn",                // no video
      "pipe:1",             // output to stdout
    ], { stdio: ["ignore", "pipe", "pipe"] });

    ffmpeg.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.stderr.on("data", () => {}); // suppress ffmpeg logs

    ffmpeg.on("close", (code) => {
      if (code !== 0 && chunks.length === 0) {
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }
      const buf = Buffer.concat(chunks);
      const floats = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
      resolve(floats);
    });

    ffmpeg.on("error", reject);
  });
}

/**
 * Detect BPM from an audio URL.
 * Returns the detected BPM rounded to 1 decimal place.
 * Falls back to null if detection fails.
 */
export async function detectBPM(audioUrl: string): Promise<number | null> {
  try {
    console.log(`[BPM] Detecting BPM for: ${audioUrl}`);
    const pcm = await decodeAudioToPCM(audioUrl);

    // music-tempo expects an AudioBuffer-like object with getChannelData
    const audioBuffer = {
      sampleRate: SAMPLE_RATE,
      length: pcm.length,
      duration: pcm.length / SAMPLE_RATE,
      numberOfChannels: 1,
      getChannelData: (_channel: number) => pcm,
    };

    const mt = new MusicTempo(audioBuffer as unknown as AudioBuffer);
    const bpm = Math.round(mt.tempo * 10) / 10;
    console.log(`[BPM] Detected BPM: ${bpm}`);
    return bpm;
  } catch (err) {
    console.error("[BPM] Detection failed:", err);
    return null;
  }
}

/**
 * Calculate the ffmpeg speed factor to match a target BPM.
 * 
 * The video generation model produces motion at an assumed "natural" tempo.
 * We use a reference tempo of 120 BPM as the baseline (typical AI video generation default).
 * 
 * speedFactor = referenceBPM / songBPM
 * - If song is 60 BPM (slow): speedFactor = 2.0 → slow video to 50% speed
 * - If song is 120 BPM (medium): speedFactor = 1.0 → no change
 * - If song is 180 BPM (fast): speedFactor = 0.67 → speed up video by 1.5×
 * 
 * Clamped to [0.5, 2.0] to avoid extreme distortion.
 */
export function calculateTempoSpeedFactor(songBPM: number, referenceBPM = 120): number {
  const factor = referenceBPM / songBPM;
  return Math.max(0.5, Math.min(2.0, Math.round(factor * 100) / 100));
}
