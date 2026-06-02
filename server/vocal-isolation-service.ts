/**
 * Vocal Isolation Service
 * ========================
 * Produces per-vocalist isolated vocal stems for SyncLabs lip sync.
 *
 * Pipeline:
 *  1. Download the original full-mix audio from S3
 *  2. Run Demucs (htdemucs model) to split into vocals.wav + no_vocals.wav
 *  3. If AssemblyAI detects multiple speakers, run speaker diarisation and
 *     split the vocals.wav into per-speaker stems
 *  4. Upload each stem to S3 and insert rows into musicVideoVocalStems
 *  5. Update musicVideoJobs.vocalsStatus = 'done'
 *
 * NOTE: Demucs requires Python 3.8+ with demucs installed.
 * In Cloud Run (Node-only), this service is triggered via the sandbox
 * heartbeat endpoint which runs in the sandbox environment where Python
 * is available. The resulting stemUrl values are stored in the DB and
 * read by Cloud Run at SyncLabs submission time.
 */

import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getDb } from "./db";
import { musicVideoJobs, musicVideoVocalStems } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";

const ASSEMBLY_AI_API_KEY = process.env.ASSEMBLY_AI_API_KEY;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VocalStem {
  stemIndex: number;
  stemUrl: string;
  stemKey: string;
  voiceGender: "male" | "female" | "unknown";
  voiceLabel: string;
  isLeadVocal: boolean;
  characterName?: string;
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Run the full vocal isolation pipeline for a job.
 * Idempotent — if vocalsStatus is already 'done', returns existing stems.
 */
export async function isolateVocals(jobId: number): Promise<VocalStem[]> {
  const db = (await getDb())!;
  const [job] = await db
    .select()
    .from(musicVideoJobs)
    .where(eq(musicVideoJobs.id, jobId));

  if (!job) throw new Error(`Job ${jobId} not found`);

  // Already done — return existing stems
  if (job.vocalsStatus === "done") {
    const existing = await db
      .select()
      .from(musicVideoVocalStems)
      .where(eq(musicVideoVocalStems.jobId, jobId));
    if (existing.length > 0) {
      return existing.map((s: typeof musicVideoVocalStems.$inferSelect) => ({
        stemIndex: s.stemIndex,
        stemUrl: s.stemUrl,
        stemKey: s.stemKey,
        voiceGender: (s.voiceGender as "male" | "female" | "unknown") ?? "unknown",
        voiceLabel: s.voiceLabel ?? "Lead Vocal",
        isLeadVocal: s.isLeadVocal,
        characterName: s.characterName ?? undefined,
      }));
    }
  }

  // Mark as processing
  await db!
    .update(musicVideoJobs)
    .set({ vocalsStatus: "processing" })
    .where(eq(musicVideoJobs.id, jobId));

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `demucs-${jobId}-`));

  try {
    // ── Step 1: Download audio ──────────────────────────────────────────────
    const audioPath = path.join(tmpDir, "song.mp3");
    console.log(`[VocalIsolation] Downloading audio for job ${jobId}...`);
    execSync(`curl -sL "${job.audioUrl}" -o "${audioPath}"`, { timeout: 120_000 });

    // ── Step 2: Run Demucs ──────────────────────────────────────────────────
    console.log(`[VocalIsolation] Running Demucs for job ${jobId}...`);
    const demucsResult = spawnSync(
      "python3",
      ["-m", "demucs", "--two-stems=vocals", "--out", tmpDir, audioPath],
      { timeout: 600_000, encoding: "utf8" }
    );

    if (demucsResult.status !== 0) {
      throw new Error(`Demucs failed: ${demucsResult.stderr}`);
    }

    // Demucs outputs to: tmpDir/htdemucs/song/vocals.wav
    const vocalsWav = path.join(tmpDir, "htdemucs", "song", "vocals.wav");
    if (!fs.existsSync(vocalsWav)) {
      throw new Error(`Demucs output not found at ${vocalsWav}`);
    }

    // Convert to MP3 for smaller upload
    const vocalsMp3 = path.join(tmpDir, "vocals.mp3");
    execSync(`ffmpeg -y -i "${vocalsWav}" -b:a 192k "${vocalsMp3}"`, { timeout: 120_000 });

    // ── Step 3: Detect number of speakers via AssemblyAI ───────────────────
    const stems = await detectAndSplitStems(jobId, vocalsMp3, tmpDir);

    // ── Step 4: Upload stems to S3 and insert DB rows ──────────────────────
    const result: VocalStem[] = [];
    // Clear any existing stems for this job first
    const db2 = (await getDb())!;
    await db2
      .delete(musicVideoVocalStems)
      .where(eq(musicVideoVocalStems.jobId, jobId));

    for (const stem of stems) {
      const fileBuffer = fs.readFileSync(stem.localPath);
      const stemKey = `music-video-audio/${jobId}-vocals-stem${stem.stemIndex}-${Date.now()}.mp3`;
      const { url: stemUrl } = await storagePut(stemKey, fileBuffer, "audio/mpeg");

      await db2.insert(musicVideoVocalStems).values({
        jobId,
        stemIndex: stem.stemIndex,
        stemUrl,
        stemKey,
        voiceGender: stem.voiceGender,
        voiceLabel: stem.voiceLabel,
        isLeadVocal: stem.isLeadVocal,
        diarisationStatus: "done",
      });

      result.push({
        stemIndex: stem.stemIndex,
        stemUrl,
        stemKey,
        voiceGender: stem.voiceGender,
        voiceLabel: stem.voiceLabel,
        isLeadVocal: stem.isLeadVocal,
      });
    }

    // ── Step 5: Update job ──────────────────────────────────────────────────
    // Store the lead vocal URL on the job for quick access
    const leadStem = result.find((s: VocalStem) => s.isLeadVocal) ?? result[0];
    await db2
      .update(musicVideoJobs)
      .set({
        vocalsUrl: leadStem.stemUrl,
        vocalsKey: leadStem.stemKey,
        vocalsStatus: "done",
      })
      .where(eq(musicVideoJobs.id, jobId));

    console.log(
      `[VocalIsolation] Job ${jobId}: ${result.length} stem(s) isolated and stored.`
    );
    return result;
    } catch (err) {
    const dbErr = (await getDb())!;
    await dbErr
      .update(musicVideoJobs)
      .set({ vocalsStatus: "failed" })
      .where(eq(musicVideoJobs.id, jobId));
    throw err;
  } finally {
    // Clean up tmp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

// ─── Speaker Detection & Stem Splitting ─────────────────────────────────────

interface RawStem {
  stemIndex: number;
  localPath: string;
  voiceGender: "male" | "female" | "unknown";
  voiceLabel: string;
  isLeadVocal: boolean;
}

/**
 * Detect number of speakers in the vocals track.
 * If only 1 speaker (or AssemblyAI unavailable), return the full vocals as a single stem.
 * If 2+ speakers, split by speaker using diarisation timestamps + ffmpeg.
 */
async function detectAndSplitStems(
  jobId: number,
  vocalsMp3: string,
  tmpDir: string
): Promise<RawStem[]> {
  if (!ASSEMBLY_AI_API_KEY) {
    console.log(
      `[VocalIsolation] No AssemblyAI key — treating as single vocalist.`
    );
    return [
      {
        stemIndex: 0,
        localPath: vocalsMp3,
        voiceGender: "unknown",
        voiceLabel: "Lead Vocal",
        isLeadVocal: true,
      },
    ];
  }

  try {
    // Upload to AssemblyAI for diarisation
    const uploadUrl = await uploadToAssemblyAI(vocalsMp3);
    const transcript = await transcribeWithDiarisation(uploadUrl);

    if (!transcript.utterances || transcript.utterances.length === 0) {
      return [
        {
          stemIndex: 0,
          localPath: vocalsMp3,
          voiceGender: "unknown",
          voiceLabel: "Lead Vocal",
          isLeadVocal: true,
        },
      ];
    }

    // Count unique speakers
  const speakerSet = new Set<string>(transcript.utterances.map((u: any) => u.speaker as string));
  const speakers = Array.from(speakerSet);

    if (speakers.length <= 1) {
      // Single vocalist — no need to split
      return [
        {
          stemIndex: 0,
          localPath: vocalsMp3,
          voiceGender: "unknown",
          voiceLabel: "Lead Vocal",
          isLeadVocal: true,
        },
      ];
    }

    console.log(
      `[VocalIsolation] Job ${jobId}: Detected ${speakers.length} speakers. Splitting stems...`
    );

    // Calculate total duration per speaker to determine lead vocal
    const speakerDuration: Record<string, number> = {};
    for (const utt of transcript.utterances) {
      speakerDuration[utt.speaker] =
        (speakerDuration[utt.speaker] ?? 0) + (utt.end - utt.start);
    }

    // Sort by duration descending — most prominent voice = lead vocal
    const sortedSpeakers = speakers.sort(
      (a, b) => (speakerDuration[b] ?? 0) - (speakerDuration[a] ?? 0)
    );

    const stems: RawStem[] = [];
    for (let i = 0; i < sortedSpeakers.length; i++) {
      const speaker = sortedSpeakers[i];
      const isLead = i === 0;
      const utterances = transcript.utterances.filter(
        (u: any) => u.speaker === speaker
      );

      // Build a filter_complex to extract only this speaker's segments
      const stemPath = path.join(tmpDir, `stem-${i}.mp3`);
      await extractSpeakerStem(vocalsMp3, utterances, stemPath);

      // Detect gender from pitch (simple heuristic via ffmpeg)
      const gender = await detectGender(stemPath);

      stems.push({
        stemIndex: i,
        localPath: stemPath,
        voiceGender: gender,
        voiceLabel: isLead
          ? gender === "male"
            ? "Lead Male Vocal"
            : gender === "female"
            ? "Lead Female Vocal"
            : "Lead Vocal"
          : gender === "male"
          ? "Male Vocalist"
          : gender === "female"
          ? "Female Vocalist"
          : `Vocalist ${i + 1}`,
        isLeadVocal: isLead,
      });
    }

    return stems;
  } catch (err) {
    console.warn(
      `[VocalIsolation] Diarisation failed, falling back to single stem: ${err}`
    );
    return [
      {
        stemIndex: 0,
        localPath: vocalsMp3,
        voiceGender: "unknown",
        voiceLabel: "Lead Vocal",
        isLeadVocal: true,
      },
    ];
  }
}

// ─── AssemblyAI Helpers ──────────────────────────────────────────────────────

async function uploadToAssemblyAI(filePath: string): Promise<string> {
  const fileData = fs.readFileSync(filePath);
  const res = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: {
      authorization: ASSEMBLY_AI_API_KEY!,
      "content-type": "application/octet-stream",
    },
    body: fileData,
  });
  if (!res.ok) throw new Error(`AssemblyAI upload failed: ${res.status}`);
  const { upload_url } = (await res.json()) as { upload_url: string };
  return upload_url;
}

async function transcribeWithDiarisation(audioUrl: string): Promise<any> {
  // Submit transcription request with speaker diarisation
  const submitRes = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      authorization: ASSEMBLY_AI_API_KEY!,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
    }),
  });
  if (!submitRes.ok)
    throw new Error(`AssemblyAI submit failed: ${submitRes.status}`);
  const { id } = (await submitRes.json()) as { id: string };

  // Poll until complete (max 10 minutes)
  const deadline = Date.now() + 600_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(
      `https://api.assemblyai.com/v2/transcript/${id}`,
      {
        headers: { authorization: ASSEMBLY_AI_API_KEY! },
      }
    );
    const data = (await pollRes.json()) as any;
    if (data.status === "completed") return data;
    if (data.status === "error")
      throw new Error(`AssemblyAI error: ${data.error}`);
  }
  throw new Error("AssemblyAI diarisation timed out");
}

// ─── ffmpeg Stem Extraction ──────────────────────────────────────────────────

/**
 * Extract only the segments where a specific speaker is talking,
 * silence everything else. Output is a continuous MP3 file.
 */
async function extractSpeakerStem(
  inputPath: string,
  utterances: Array<{ start: number; end: number }>,
  outputPath: string
): Promise<void> {
  // Build a volume filter that silences non-speaker segments
  // utterances timestamps are in milliseconds from AssemblyAI
  const volumeFilters = utterances
    .map(
      (u) =>
        `volume=enable='between(t,${u.start / 1000},${u.end / 1000})':volume=1`
    )
    .join(",");

  // Silence everything, then unmute speaker segments
  const silenceFilter = `volume=0,${volumeFilters}`;

  execSync(
    `ffmpeg -y -i "${inputPath}" -af "${silenceFilter}" -b:a 192k "${outputPath}"`,
    { timeout: 120_000 }
  );
}

// ─── Gender Detection (pitch heuristic) ─────────────────────────────────────

/**
 * Rough gender detection via ffmpeg mean frequency analysis.
 * Female voices typically have a fundamental frequency > 165 Hz,
 * male voices < 165 Hz.
 */
async function detectGender(
  stemPath: string
): Promise<"male" | "female" | "unknown"> {
  try {
    const result = spawnSync(
      "ffprobe",
      [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_streams",
        stemPath,
      ],
      { encoding: "utf8", timeout: 15_000 }
    );
    // Simple heuristic: we can't easily get pitch from ffprobe alone.
    // For now return 'unknown' — WizPerformer UI will let user assign.
    return "unknown";
  } catch {
    return "unknown";
  }
}

// ─── Lookup helper for heartbeat ─────────────────────────────────────────────

/**
 * Get the vocal stem URL for a specific character in a job.
 * Falls back to the lead vocal stem if no character-specific stem is assigned.
 */
export async function getVocalStemForCharacter(
  jobId: number,
  characterName?: string
): Promise<string | null> {
  const db = (await getDb())!;
  const stems = await db
    .select()
    .from(musicVideoVocalStems)
    .where(eq(musicVideoVocalStems.jobId, jobId));

  if (stems.length === 0) {
    // Fall back to job-level stemVocalsUrl (Demucs stem intelligence) or vocalsUrl (old pipeline)
    const [job] = await db
      .select({ vocalsUrl: musicVideoJobs.vocalsUrl, stemVocalsUrl: musicVideoJobs.stemVocalsUrl })
      .from(musicVideoJobs)
      .where(eq(musicVideoJobs.id, jobId));
    // Prefer stemVocalsUrl (Demucs stem intelligence pipeline) over vocalsUrl (old vocal isolation)
    return job?.stemVocalsUrl ?? job?.vocalsUrl ?? null;
  }

  // Try to find a stem assigned to this character
  if (characterName) {
    const charStem = stems.find(
      (s: typeof musicVideoVocalStems.$inferSelect) =>
        s.characterName?.toLowerCase() === characterName.toLowerCase()
    );
    if (charStem) return charStem.stemUrl;
  }

  // Fall back to lead vocal stem
  const leadStem = stems.find((s: typeof musicVideoVocalStems.$inferSelect) => s.isLeadVocal);
  return leadStem?.stemUrl ?? stems[0]?.stemUrl ?? null;
}
