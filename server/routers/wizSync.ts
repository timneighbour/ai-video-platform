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
});
