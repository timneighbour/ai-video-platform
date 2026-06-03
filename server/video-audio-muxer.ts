/**
 * video-audio-muxer.ts
 *
 * Muxes an audio clip into a silent video using ffmpeg.
 * Used to prepare Seedance i2v renders (which have no audio track) for HeyGen
 * Precision v3 lip sync, which requires the input video to have an audio track.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createRequire } from "module";
import { storagePut } from "./storage";

const _require = createRequire(import.meta.url);

function getFFmpegBin(): string {
  try {
    const installer = _require("@ffmpeg-installer/ffmpeg");
    if (installer?.path && fs.existsSync(installer.path)) {
      try { fs.chmodSync(installer.path, 0o755); } catch { /* ignore */ }
      return installer.path;
    }
  } catch { /* ignore */ }
  return "ffmpeg";
}

export interface MuxAudioIntoVideoOptions {
  /** URL of the silent (or existing) video */
  videoUrl: string;
  /** URL of the audio clip to mux in */
  audioUrl: string;
  /** Scene ID for logging and S3 key generation */
  sceneId: number;
}

/**
 * Downloads the video and audio, muxes them together using ffmpeg,
 * uploads the result to S3, and returns the permanent CDN URL.
 */
export async function muxAudioIntoVideo(opts: MuxAudioIntoVideoOptions): Promise<string> {
  const { videoUrl, audioUrl, sceneId } = opts;
  const ffmpeg = getFFmpegBin();
  const tmpDir = os.tmpdir();

  const videoPath = path.join(tmpDir, `mux-video-${sceneId}-${Date.now()}.mp4`);
  const audioPath = path.join(tmpDir, `mux-audio-${sceneId}-${Date.now()}.mp3`);
  const outputPath = path.join(tmpDir, `mux-out-${sceneId}-${Date.now()}.mp4`);

  try {
    // Download video
    const videoResp = await fetch(videoUrl);
    if (!videoResp.ok) throw new Error(`Video download failed: ${videoResp.status}`);
    fs.writeFileSync(videoPath, Buffer.from(await videoResp.arrayBuffer()));

    // Download audio
    const audioResp = await fetch(audioUrl);
    if (!audioResp.ok) throw new Error(`Audio download failed: ${audioResp.status}`);
    fs.writeFileSync(audioPath, Buffer.from(await audioResp.arrayBuffer()));

    // Mux: copy video stream, encode audio as AAC, trim to shorter of the two
    execSync(
      `"${ffmpeg}" -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${outputPath}" 2>/dev/null`,
      { timeout: 60_000 }
    );

    const outputBuf = fs.readFileSync(outputPath);
    if (outputBuf.length < 10_000) {
      throw new Error(`Muxed output too small (${outputBuf.length} bytes) — ffmpeg likely failed`);
    }

    // Upload to S3
    const key = `music-video-scenes/${sceneId}-muxed-${Date.now()}.mp4`;
    const { url } = await storagePut(key, outputBuf, "video/mp4");

    console.log(`[VideoAudioMuxer] Scene ${sceneId}: muxed video uploaded → ${url.slice(0, 80)}...`);
    return url;
  } finally {
    // Clean up temp files
    for (const f of [videoPath, audioPath, outputPath]) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch { /* ignore */ }
    }
  }
}
