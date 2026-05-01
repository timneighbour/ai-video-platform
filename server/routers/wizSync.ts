/**
 * WizSync™ — Voice to Character Assignment System
 *
 * Pipeline:
 *  1. analyseAudio   — Submit audio for speaker diarisation
 *  2. pollAnalysis   — Poll analysis; when complete, persist speakers + segments to DB
 *  3. assignCharacter — User maps a speaker to a character (manual override)
 *  4. getJob         — Return full job with speakers and segments
 *
 * NOTE: Stem separation is temporarily unavailable. No fal.ai or third-party
 * stem-separation calls are made. All provider calls must go through the
 * WizAdora cost-control layer before stem separation can be re-enabled.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { wizSyncJobs, wizSyncSpeakers, wizSyncSegments } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { deductCredits } from "../credit-service";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { storagePut } from "../storage";
const execAsync = promisify(exec);

// ─── Audio analysis helpers ───────────────────────────────────────────────────

async function getAudioAnalysisClient() {
  const apiKey = process.env.ASSEMBLY_AI_API_KEY;
  if (!apiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Audio analysis service is not configured. Please contact support.",
    });
  }
  const { AssemblyAI } = await import("assemblyai");
  return new AssemblyAI({ apiKey });
}

async function submitAudioAnalysisJob(audioUrl: string): Promise<string> {
  const client = await getAudioAnalysisClient();
  const transcript = await client.transcripts.submit({
    audio_url: audioUrl,
    speaker_labels: true,
    language_detection: true,
  });
  return transcript.id;
}

async function pollAudioAnalysisJob(transcriptId: string) {
  const client = await getAudioAnalysisClient();
  return await client.transcripts.get(transcriptId);
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const wizSyncRouter = router({

  /** Step 1: Submit audio for analysis */
  analyseAudio: protectedProcedure
    .input(z.object({
      audioUrl: z.string().url(),
      audioName: z.string().optional(),
      audioDuration: z.number().optional(),
      musicVideoJobId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      let transcriptId: string | undefined;
      let errorMessage: string | undefined;

      try {
        transcriptId = await submitAudioAnalysisJob(input.audioUrl);
      } catch (e: unknown) {
        // Log internal details server-side only; never expose provider names to users
        const internalMsg = e instanceof Error ? e.message : "Audio analysis submission failed";
        console.error("[WizSync] Audio analysis error:", internalMsg);
        // Surface a safe, generic message to the user
        errorMessage = "Audio analysis service is not configured. Please contact support.";
      }

      const [job] = await db.insert(wizSyncJobs).values({
        userId: ctx.user.id,
        audioUrl: input.audioUrl,
        audioName: input.audioName ?? "Audio Track",
        audioDuration: input.audioDuration ? input.audioDuration.toFixed(3) : undefined,
        status: transcriptId ? "analysing" : "error",
        errorMessage,
        assemblyAiTranscriptId: transcriptId,
        // demucsRequestId intentionally omitted — stem separation temporarily unavailable
        musicVideoJobId: input.musicVideoJobId,
      }).$returningId();

      return { jobId: job.id, status: transcriptId ? "analysing" : "error" };
    }),

  /** Step 2: Poll analysis status */
  pollAnalysis: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(wizSyncJobs)
        .where(and(eq(wizSyncJobs.id, input.jobId), eq(wizSyncJobs.userId, ctx.user.id)));

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "WizSync job not found" });

      if (job.status === "ready" || job.status === "error") {
        const speakers = await db.select().from(wizSyncSpeakers)
          .where(eq(wizSyncSpeakers.wizSyncJobId, job.id));
        const segments = await db.select().from(wizSyncSegments)
          .where(eq(wizSyncSegments.wizSyncJobId, job.id));
        return { job, speakers, segments };
      }

      // Poll audio analysis
      let analysisDone = !job.assemblyAiTranscriptId;
      let utterancesData: Array<{ speaker: string; start: number; end: number; text: string; confidence: number }> = [];
      let speakerCount = 0;

      if (job.assemblyAiTranscriptId) {
        try {
          const transcript = await pollAudioAnalysisJob(job.assemblyAiTranscriptId);
          if (transcript.status === "completed" && transcript.utterances) {
            analysisDone = true;
            utterancesData = transcript.utterances as typeof utterancesData;
            const speakerSet = new Set(transcript.utterances.map((u: { speaker: string }) => u.speaker));
            speakerCount = speakerSet.size;
          } else if (transcript.status === "error") {
            await db.update(wizSyncJobs)
              .set({ status: "error", errorMessage: "Audio analysis failed. Please try again or contact support." })
              .where(eq(wizSyncJobs.id, job.id));
            return { job: { ...job, status: "error" as const }, speakers: [], segments: [] };
          }
        } catch (e) {
          console.error("[WizSync] Poll audio analysis error:", e);
        }
      }

      // Stem separation is temporarily unavailable — no fal.ai or third-party calls
      // stems will be null until routed through the WizAdora cost-control layer
      const stemsData = null;

      // Persist speakers + segments when analysis is done
      if (analysisDone && utterancesData.length > 0) {
        const existingSpeakers = await db.select().from(wizSyncSpeakers)
          .where(eq(wizSyncSpeakers.wizSyncJobId, job.id));

        if (existingSpeakers.length === 0) {
          // Build speaker map
          const speakerMap = new Map<string, { totalDuration: number }>();
          for (const utt of utterancesData) {
            if (!speakerMap.has(utt.speaker)) speakerMap.set(utt.speaker, { totalDuration: 0 });
            speakerMap.get(utt.speaker)!.totalDuration += (utt.end - utt.start) / 1000;
          }

          // Insert speakers
          const speakerIdMap = new Map<string, number>();
          for (const [label, data] of Array.from(speakerMap.entries())) {
            const [spk] = await db.insert(wizSyncSpeakers).values({
              wizSyncJobId: job.id,
              speakerLabel: label,
              inferredGender: "unknown",
              displayName: `Speaker ${label}`,
              totalDuration: data.totalDuration.toFixed(3),
            }).$returningId();
            speakerIdMap.set(label, spk.id);
          }

          // Insert segments
          for (const utt of utterancesData) {
            const speakerId = speakerIdMap.get(utt.speaker);
            if (!speakerId) continue;
            await db.insert(wizSyncSegments).values({
              wizSyncJobId: job.id,
              wizSyncSpeakerId: speakerId,
              startMs: utt.start,
              endMs: utt.end,
              text: utt.text,
              confidence: utt.confidence?.toFixed(4),
            });
          }
        }

        // Mark job ready (stems null — stem separation unavailable)
        await db.update(wizSyncJobs).set({
          status: "ready",
          speakerCount,
          utterances: utterancesData,
          stems: stemsData,
        }).where(eq(wizSyncJobs.id, job.id));

        const speakers = await db.select().from(wizSyncSpeakers)
          .where(eq(wizSyncSpeakers.wizSyncJobId, job.id));
        const segments = await db.select().from(wizSyncSegments)
          .where(eq(wizSyncSegments.wizSyncJobId, job.id));

        return {
          job: { ...job, status: "ready" as const, speakerCount, stems: stemsData },
          speakers,
          segments,
        };
      }

      // Still processing
      const speakers = await db.select().from(wizSyncSpeakers)
        .where(eq(wizSyncSpeakers.wizSyncJobId, job.id));
      const segments = await db.select().from(wizSyncSegments)
        .where(eq(wizSyncSegments.wizSyncJobId, job.id));

      return { job, speakers, segments };
    }),

  /** Step 3: Assign a character to a speaker */
  assignCharacter: protectedProcedure
    .input(z.object({
      speakerId: z.number(),
      characterId: z.number().nullable(),
      displayName: z.string().optional(),
      inferredGender: z.enum(["male", "female", "unknown"]).optional(),
      instrumentRole: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [speaker] = await db.select().from(wizSyncSpeakers)
        .where(eq(wizSyncSpeakers.id, input.speakerId));
      if (!speaker) throw new TRPCError({ code: "NOT_FOUND", message: "Speaker not found" });

      const [job] = await db.select().from(wizSyncJobs)
        .where(and(eq(wizSyncJobs.id, speaker.wizSyncJobId), eq(wizSyncJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "FORBIDDEN" });

      await db.update(wizSyncSpeakers).set({
        assignedCharacterId: input.characterId ?? undefined,
        isManualOverride: true,
        displayName: input.displayName ?? speaker.displayName,
        inferredGender: input.inferredGender ?? speaker.inferredGender,
        instrumentRole: input.instrumentRole ?? speaker.instrumentRole,
      }).where(eq(wizSyncSpeakers.id, input.speakerId));

      return { success: true };
    }),

  /** Get a WizSync job with all speakers and segments */
  getJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(wizSyncJobs)
        .where(and(eq(wizSyncJobs.id, input.jobId), eq(wizSyncJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });

      const speakers = await db.select().from(wizSyncSpeakers)
        .where(eq(wizSyncSpeakers.wizSyncJobId, job.id));
      const segments = await db.select().from(wizSyncSegments)
        .where(eq(wizSyncSegments.wizSyncJobId, job.id));

      return { job, speakers, segments };
    }),

  /** List all WizSync jobs for the current user */
  listJobs: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return await db.select().from(wizSyncJobs)
        .where(eq(wizSyncJobs.userId, ctx.user.id));
    }),

  /**
   * generatePreview — Start a free 5-second lip-sync preview for a segment.
   * Costs 0 credits. Uses Atlas Cloud text-to-video with a lip-sync prompt
   * derived from the segment transcript and speaker character assignment.
   * Returns immediately with the Atlas job ID; poll with pollPreview.
   */
  generatePreview: protectedProcedure
    .input(z.object({ segmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Load segment and verify ownership
      const [segment] = await db.select().from(wizSyncSegments)
        .where(eq(wizSyncSegments.id, input.segmentId));
      if (!segment) throw new TRPCError({ code: "NOT_FOUND", message: "Segment not found" });

      const [job] = await db.select().from(wizSyncJobs)
        .where(and(eq(wizSyncJobs.id, segment.wizSyncJobId), eq(wizSyncJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "FORBIDDEN" });

      // If preview already ready, return it
      if (segment.previewStatus === "ready" && segment.previewVideoUrl) {
        return { status: "ready" as const, previewVideoUrl: segment.previewVideoUrl };
      }

      // If already generating, return current status
      if (segment.previewStatus === "generating") {
        return { status: "generating" as const, previewVideoUrl: null };
      }

      // Load speaker for character context
      const [speaker] = await db.select().from(wizSyncSpeakers)
        .where(eq(wizSyncSpeakers.id, segment.wizSyncSpeakerId));

      // Build a cinematic lip-sync prompt for the 5-second preview
      const speakerName = speaker?.displayName ?? speaker?.speakerLabel ?? "a singer";
      const gender = speaker?.inferredGender === "female" ? "woman" : "man";
      const transcript = segment.text ? `"${segment.text.slice(0, 80)}"` : "performing a song";
      const prompt = [
        `Cinematic close-up of a ${gender} named ${speakerName} singing ${transcript}.`,
        "Photorealistic, dramatic studio lighting, shallow depth of field.",
        "Mouth moving in perfect sync with the lyrics. High detail facial animation.",
        "Professional music video style. 5 seconds.",
      ].join(" ");

      // Submit to Atlas Cloud (5-second clip, 0 credits)
      const { submitAtlasVideo } = await import("../ai-apis/atlascloud");
      let atlasJobId: string;
      try {
        const atlasJob = await submitAtlasVideo(prompt, 5);
        atlasJobId = atlasJob.predictionId;
      } catch (err) {
        await db.update(wizSyncSegments).set({ previewStatus: "error" })
          .where(eq(wizSyncSegments.id, input.segmentId));
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Preview generation failed. Please try again.",
        });
      }

      // Persist job ID and set status to generating
      await db.update(wizSyncSegments).set({
        previewStatus: "generating",
        previewAtlasJobId: atlasJobId,
      }).where(eq(wizSyncSegments.id, input.segmentId));

      return { status: "generating" as const, previewVideoUrl: null };
    }),

  /**
   * pollPreview — Poll the Atlas Cloud job for a segment preview.
   * Returns the preview URL when ready, or current status.
   */
  pollPreview: protectedProcedure
    .input(z.object({ segmentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [segment] = await db.select().from(wizSyncSegments)
        .where(eq(wizSyncSegments.id, input.segmentId));
      if (!segment) throw new TRPCError({ code: "NOT_FOUND" });

      const [job] = await db.select().from(wizSyncJobs)
        .where(and(eq(wizSyncJobs.id, segment.wizSyncJobId), eq(wizSyncJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "FORBIDDEN" });

      // If already ready or errored, return current state
      if (segment.previewStatus === "ready") {
        return { status: "ready" as const, previewVideoUrl: segment.previewVideoUrl ?? null };
      }
      if (segment.previewStatus === "error") {
        return { status: "error" as const, previewVideoUrl: null };
      }
      if (segment.previewStatus === "idle" || !segment.previewAtlasJobId) {
        return { status: "idle" as const, previewVideoUrl: null };
      }

      // Poll Atlas Cloud
      const { pollAtlasVideo } = await import("../ai-apis/atlascloud");
      let result;
      try {
        result = await pollAtlasVideo(segment.previewAtlasJobId);
      } catch {
        return { status: "generating" as const, previewVideoUrl: null };
      }

      if (result.status === "completed" && result.videoUrl) {
        await db.update(wizSyncSegments).set({
          previewStatus: "ready",
          previewVideoUrl: result.videoUrl,
        }).where(eq(wizSyncSegments.id, input.segmentId));
        return { status: "ready" as const, previewVideoUrl: result.videoUrl };
      }

      if (result.status === "failed") {
        await db.update(wizSyncSegments).set({ previewStatus: "error" })
          .where(eq(wizSyncSegments.id, input.segmentId));
        return { status: "error" as const, previewVideoUrl: null };
      }

      return { status: "generating" as const, previewVideoUrl: null };
    }),

  /**
   * fullRender - Concatenate all ready segment preview clips with the original audio
   * into a single final video. Deducts 5 Build Credits.
   */
  fullRender: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [job] = await db.select().from(wizSyncJobs)
        .where(and(eq(wizSyncJobs.id, input.jobId), eq(wizSyncJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      const segments = await db.select().from(wizSyncSegments)
        .where(eq(wizSyncSegments.wizSyncJobId, input.jobId));

      const readySegments = segments
        .filter((s: typeof segments[0]) => s.previewStatus === "ready" && s.previewVideoUrl)
        .sort((a: typeof segments[0], b: typeof segments[0]) => a.startMs - b.startMs);

      if (readySegments.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No ready preview segments found. Please generate previews first.",
        });
      }

      const CREDIT_COST = 5;
      const ok = await deductCredits(
        ctx.user.id,
        CREDIT_COST,
        "WizSync Full Render - Job #" + input.jobId,
      );
      if (!ok) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient credits. You need at least 5 Build Credits for a full render.",
        });
      }

      // Store render-in-progress flag in stems JSON
      const existingStems = (job.stems as Record<string, string> | null) ?? {};
      await db.update(wizSyncJobs)
        .set({ stems: { ...existingStems, fullRenderStatus: "rendering" }, updatedAt: new Date() })
        .where(eq(wizSyncJobs.id, input.jobId));

      // Run assembly async (non-blocking)
      assembleFullRenderAsync(input.jobId, job.audioUrl, readySegments).catch((err: unknown) => {
        console.error("[WizSync] Full render failed for job " + input.jobId + ":", err);
      });

      return { status: "rendering" as const, message: "Full render started. This may take a few minutes." };
    }),

  /**
   * pollFullRender - Poll the status of a full render job.
   */
  pollFullRender: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(wizSyncJobs)
        .where(and(eq(wizSyncJobs.id, input.jobId), eq(wizSyncJobs.userId, ctx.user.id)));
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      const stemsData = (job.stems as Record<string, string> | null) ?? {};
      return {
        fullRenderStatus: stemsData.fullRenderStatus ?? "idle",
        outputUrl: stemsData.fullRenderUrl ?? null,
      };
    }),
});

/**
 * Async helper: download all ready segment preview clips, concatenate them
 * with the original audio track, and upload the final video to S3.
 */
async function assembleFullRenderAsync(
  jobId: number,
  audioUrl: string,
  segments: Array<{ id: number; previewVideoUrl: string | null; startMs: number; endMs: number }>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wizsync-" + jobId + "-"));
  try {
    // Download each segment preview clip
    const clipFiles: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (!seg.previewVideoUrl) continue;
      const clipPath = path.join(tmpDir, "clip-" + String(i).padStart(3, "0") + ".mp4");
      const resp = await fetch(seg.previewVideoUrl);
      if (!resp.ok) throw new Error("Failed to download clip " + i + ": " + resp.status);
      fs.writeFileSync(clipPath, Buffer.from(await resp.arrayBuffer()));
      clipFiles.push(clipPath);
    }

    if (clipFiles.length === 0) throw new Error("No clip files to assemble");

    // Download original audio
    const audioPath = path.join(tmpDir, "audio.mp3");
    const audioResp = await fetch(audioUrl);
    if (!audioResp.ok) throw new Error("Failed to download audio: " + audioResp.status);
    fs.writeFileSync(audioPath, Buffer.from(await audioResp.arrayBuffer()));

    // Concatenate video clips
    const concatFile = path.join(tmpDir, "concat.txt");
    fs.writeFileSync(concatFile, clipFiles.map(f => "file '" + f + "'").join("\n"));
    const concatenatedPath = path.join(tmpDir, "concatenated.mp4");
    await execAsync(
      'ffmpeg -y -f concat -safe 0 -i "' + concatFile + '" -c:v libx264 -preset fast -crf 22 "' + concatenatedPath + '"',
      { timeout: 600000 }
    );

    // Mix with original audio
    const finalPath = path.join(tmpDir, "final.mp4");
    await execAsync(
      'ffmpeg -y -i "' + concatenatedPath + '" -i "' + audioPath + '" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest "' + finalPath + '"',
      { timeout: 600000 }
    );

    // Upload to S3
    const outputKey = "wizsync/" + jobId + "/full-render-" + Date.now() + ".mp4";
    const finalBuf = fs.readFileSync(finalPath);
    const { url: outputUrl } = await storagePut(outputKey, finalBuf, "video/mp4");

    // Update job with result
    const [currentJob] = await db.select().from(wizSyncJobs).where(eq(wizSyncJobs.id, jobId));
    const existingStems = (currentJob?.stems as Record<string, string> | null) ?? {};
    await db.update(wizSyncJobs)
      .set({
        stems: { ...existingStems, fullRenderStatus: "completed", fullRenderUrl: outputUrl },
        updatedAt: new Date(),
      })
      .where(eq(wizSyncJobs.id, jobId));

    console.log("[WizSync] Full render complete for job " + jobId + ": " + outputUrl);
  } catch (err) {
    const [currentJob] = await db.select().from(wizSyncJobs).where(eq(wizSyncJobs.id, jobId));
    const existingStems = (currentJob?.stems as Record<string, string> | null) ?? {};
    await db.update(wizSyncJobs)
      .set({
        stems: { ...existingStems, fullRenderStatus: "failed" },
        updatedAt: new Date(),
      })
      .where(eq(wizSyncJobs.id, jobId));
    throw err;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}
