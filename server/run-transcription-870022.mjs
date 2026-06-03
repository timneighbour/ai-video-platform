/**
 * run-transcription-870022.mjs
 *
 * Directly triggers Whisper transcription for Job 870022's audio.
 * Downloads the vocal stem WAV, converts to MP3 (to stay under 16MB limit),
 * then sends as multipart FormData to the Forge Whisper API.
 *
 * Usage: node server/run-transcription-870022.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const JOB_ID = 870022;

async function transcribeAudio(audioUrl) {
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error("BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY not set");
  }

  console.log(`  Downloading audio from: ${audioUrl.slice(0, 80)}...`);
  const downloadResp = await fetch(audioUrl);
  if (!downloadResp.ok) {
    throw new Error(`Failed to download audio: HTTP ${downloadResp.status}`);
  }

  const audioBuffer = Buffer.from(await downloadResp.arrayBuffer());
  const mimeType = downloadResp.headers.get('content-type') || 'audio/wav';
  const sizeMB = audioBuffer.length / (1024 * 1024);
  console.log(`  Downloaded ${sizeMB.toFixed(2)} MB (${mimeType})`);

  // If WAV and over 10MB, convert to MP3 to stay well under 16MB limit
  let finalBuffer = audioBuffer;
  let finalMimeType = mimeType;
  let finalFilename = 'audio.wav';

  if ((mimeType.includes('wav') || audioUrl.endsWith('.wav')) && sizeMB > 10) {
    console.log(`  WAV file too large (${sizeMB.toFixed(2)}MB) — converting to MP3...`);
    const tmpWav = join(tmpdir(), `transcribe-in-${Date.now()}.wav`);
    const tmpMp3 = join(tmpdir(), `transcribe-out-${Date.now()}.mp3`);
    
    writeFileSync(tmpWav, audioBuffer);
    execSync(`ffmpeg -y -i "${tmpWav}" -codec:a libmp3lame -qscale:a 3 "${tmpMp3}" 2>/dev/null`);
    
    finalBuffer = readFileSync(tmpMp3);
    finalMimeType = 'audio/mpeg';
    finalFilename = 'audio.mp3';
    
    const mp3SizeMB = finalBuffer.length / (1024 * 1024);
    console.log(`  Converted to MP3: ${mp3SizeMB.toFixed(2)} MB`);
    
    // Cleanup temp files
    try { unlinkSync(tmpWav); } catch {}
    try { unlinkSync(tmpMp3); } catch {}
  }

  const audioBlob = new Blob([new Uint8Array(finalBuffer)], { type: finalMimeType });
  const formData = new FormData();
  formData.append("file", audioBlob, finalFilename);
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("language", "en");
  formData.append("prompt", "Transcribe English song lyrics accurately with timestamps. This is a pop/soul song in English.");

  const baseUrl = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;
  const fullUrl = new URL("v1/audio/transcriptions", baseUrl).toString();

  console.log(`  Calling Whisper API...`);
  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "Accept-Encoding": "identity",
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Whisper API error ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const rawBody = await response.text();
  return JSON.parse(rawBody);
}

async function main() {
  console.log("=== Transcription Trigger for Job 870022 ===\n");

  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  const [rows] = await conn.execute(
    "SELECT id, audioUrl, stemVocalsUrl, transcriptionStatus FROM musicVideoJobs WHERE id = ?",
    [JOB_ID]
  );
  const job = rows[0];
  console.log("Job state:", {
    id: job.id,
    transcriptionStatus: job.transcriptionStatus,
    audioUrl: job.audioUrl?.slice(0, 80),
    stemVocalsUrl: job.stemVocalsUrl?.slice(0, 80),
  });

  // Use original MP3 (3MB) instead of vocal stem WAV (22MB) — MP3 is already under limit
  // and the vocal stem WAV was giving Whisper hallucination issues
  const audioUrl = job.audioUrl ?? job.stemVocalsUrl;
  if (!audioUrl) {
    console.error("No audio URL found for job 870022");
    await conn.end();
    return;
  }

  // Mark as processing
  await conn.execute(
    "UPDATE musicVideoJobs SET transcriptionStatus = 'processing', updatedAt = NOW() WHERE id = ?",
    [JOB_ID]
  );
  console.log("  ✓ transcriptionStatus = 'processing'\n");

  try {
    const result = await transcribeAudio(audioUrl);

    const segments = (result.segments || []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }));

    console.log(`\n  ✓ Transcription complete!`);
    console.log(`  Full text: "${result.text?.slice(0, 200)}"`);
    console.log(`  ${segments.length} timed segments extracted`);
    if (segments.length > 0) {
      console.log("  First 6 segments:");
      for (const seg of segments.slice(0, 6)) {
        console.log(`    [${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s] "${seg.text}"`);
      }
    }

    await conn.execute(
      `UPDATE musicVideoJobs 
       SET transcription = ?, transcriptionSegments = ?, transcriptionStatus = 'done', updatedAt = NOW()
       WHERE id = ?`,
      [result.text, JSON.stringify(segments), JOB_ID]
    );
    console.log("\n  ✓ Transcription saved to DB");
    console.log("  ✓ transcriptionStatus = 'done'");

  } catch (err) {
    console.error("  ✗ Transcription failed:", err.message);
    await conn.execute(
      "UPDATE musicVideoJobs SET transcriptionStatus = 'failed', updatedAt = NOW() WHERE id = ?",
      [JOB_ID]
    );
  }

  await conn.end();
  console.log("\n=== Transcription trigger complete ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
