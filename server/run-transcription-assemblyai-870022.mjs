/**
 * run-transcription-assemblyai-870022.mjs
 *
 * Uses AssemblyAI to transcribe Job 870022's original MP3.
 * AssemblyAI handles mixed audio (instrumental + vocals) much better than Whisper.
 * Returns timestamped word/sentence segments.
 *
 * Usage: node server/run-transcription-assemblyai-870022.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const JOB_ID = 870022;
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLY_AI_API_KEY;
const AUDIO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/benchmark/glass-on-the-water-1780418618919.mp3";

async function transcribeWithAssemblyAI(audioUrl) {
  if (!ASSEMBLYAI_API_KEY) {
    throw new Error("ASSEMBLY_AI_API_KEY not set");
  }

  console.log("  Submitting to AssemblyAI...");
  
  // Step 1: Submit transcription job
  const submitResp = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      authorization: ASSEMBLYAI_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_code: "en",
      punctuate: true,
      format_text: true,
    }),
  });

  if (!submitResp.ok) {
    const err = await submitResp.text();
    throw new Error(`AssemblyAI submit error ${submitResp.status}: ${err.slice(0, 200)}`);
  }

  const submitData = await submitResp.json();
  const transcriptId = submitData.id;
  console.log(`  Transcript ID: ${transcriptId}`);

  // Step 2: Poll for completion
  let attempts = 0;
  while (attempts < 60) {
    await new Promise((r) => setTimeout(r, 5000)); // 5s between polls
    attempts++;

    const pollResp = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { authorization: ASSEMBLYAI_API_KEY },
    });

    if (!pollResp.ok) {
      throw new Error(`AssemblyAI poll error ${pollResp.status}`);
    }

    const pollData = await pollResp.json();
    console.log(`  Poll ${attempts}: status=${pollData.status}`);

    if (pollData.status === "completed") {
      return pollData;
    } else if (pollData.status === "error") {
      throw new Error(`AssemblyAI transcription error: ${pollData.error}`);
    }
  }

  throw new Error("AssemblyAI transcription timed out after 5 minutes");
}

async function main() {
  console.log("=== AssemblyAI Transcription for Job 870022 ===\n");

  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Mark as processing
  await conn.execute(
    "UPDATE musicVideoJobs SET transcriptionStatus = 'processing', updatedAt = NOW() WHERE id = ?",
    [JOB_ID]
  );
  console.log("  ✓ transcriptionStatus = 'processing'\n");

  try {
    const result = await transcribeWithAssemblyAI(AUDIO_URL);

    // Convert AssemblyAI words to Whisper-compatible segments
    // Group words into ~5-6 second segments aligned to scene boundaries
    const words = result.words || [];
    const segments = [];
    
    if (words.length > 0) {
      // Group words into segments of ~5 seconds
      let segStart = words[0].start / 1000; // ms to seconds
      let segEnd = words[0].end / 1000;
      let segText = words[0].text;
      
      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const wordStart = word.start / 1000;
        const wordEnd = word.end / 1000;
        
        // Start new segment if gap > 1s or segment > 6s
        if (wordStart - segEnd > 1.0 || wordEnd - segStart > 6.0) {
          segments.push({ start: segStart, end: segEnd, text: segText.trim() });
          segStart = wordStart;
          segEnd = wordEnd;
          segText = word.text;
        } else {
          segEnd = wordEnd;
          segText += " " + word.text;
        }
      }
      // Push last segment
      if (segText.trim()) {
        segments.push({ start: segStart, end: segEnd, text: segText.trim() });
      }
    } else if (result.text) {
      // No word-level timestamps — use sentence-level if available
      const utterances = result.utterances || [];
      for (const u of utterances) {
        segments.push({
          start: u.start / 1000,
          end: u.end / 1000,
          text: u.text.trim(),
        });
      }
    }

    const fullText = result.text || "";
    console.log(`\n  ✓ Transcription complete!`);
    console.log(`  Full text: "${fullText.slice(0, 200)}"`);
    console.log(`  ${segments.length} timed segments extracted`);
    if (segments.length > 0) {
      console.log("  All segments:");
      for (const seg of segments) {
        console.log(`    [${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s] "${seg.text}"`);
      }
    } else {
      console.log("  ⚠ No segments extracted — track may be instrumental");
    }

    await conn.execute(
      `UPDATE musicVideoJobs 
       SET transcription = ?, transcriptionSegments = ?, transcriptionStatus = ?, updatedAt = NOW()
       WHERE id = ?`,
      [
        fullText,
        JSON.stringify(segments),
        segments.length > 0 ? "done" : "done", // done either way — heartbeat handles empty segments
        JOB_ID,
      ]
    );
    console.log("\n  ✓ Transcription saved to DB");
    console.log(`  ✓ transcriptionStatus = 'done' (${segments.length} segments)`);

  } catch (err) {
    console.error("  ✗ Transcription failed:", err.message);
    await conn.execute(
      "UPDATE musicVideoJobs SET transcriptionStatus = 'failed', updatedAt = NOW() WHERE id = ?",
      [JOB_ID]
    );
  }

  await conn.end();
  console.log("\n=== AssemblyAI transcription complete ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
