/**
 * WizSync™ — Voice to Character Assignment System
 *
 * Pipeline:
 *  1. analyseAudio   — Submit audio to AssemblyAI (speaker diarisation) + fal.ai Demucs (6-stem separation)
 *  2. pollAnalysis   — Poll both jobs; when complete, persist speakers + segments to DB
 *  3. assignCharacter — User maps a speaker to a character (manual override)
 *  4. getJob         — Return full job with speakers, segments, and stems
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { wizSyncJobs, wizSyncSpeakers, wizSyncSegments } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { fal } from "@fal-ai/client";

// ─── AssemblyAI helpers ───────────────────────────────────────────────────────

async function getAssemblyAIClient() {
  const apiKey = process.env.ASSEMBLY_AI_API_KEY;
  if (!apiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AssemblyAI API key not configured. Please add ASSEMBLY_AI_API_KEY in Settings → Secrets.",
    });
  }
  const { AssemblyAI } = await import("assemblyai");
  return new AssemblyAI({ apiKey });
}

async function submitAssemblyAIJob(audioUrl: string): Promise<string> {
  const client = await getAssemblyAIClient();
  const transcript = await client.transcripts.submit({
    audio_url: audioUrl,
    speaker_labels: true,
    language_detection: true,
  });
  return transcript.id;
}

async function pollAssemblyAIJob(transcriptId: string) {
  const client = await getAssemblyAIClient();
  return await client.transcripts.get(transcriptId);
}

// ─── Demucs (fal.ai) helpers ─────────────────────────────────────────────────

function initFal() {
  const apiKey = process.env.FAL_AI_API_KEY;
  if (!apiKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "FAL_AI_API_KEY not configured." });
  fal.config({ credentials: apiKey });
}

async function submitDemucsJob(audioUrl: string): Promise<string> {
  initFal();
  const { request_id } = await fal.queue.submit("fal-ai/demucs", {
    input: {
      audio_url: audioUrl,
      model: "htdemucs_6s",
    },
  });
  return request_id;
}

async function pollDemucsJob(requestId: string) {
  initFal();
  const status = await fal.queue.status("fal-ai/demucs", { requestId, logs: false });
  if (status.status === "COMPLETED") {
    const result = await fal.queue.result("fal-ai/demucs", { requestId }) as {
      data: Record<string, { url: string } | undefined>;
    };
    return { status: "COMPLETED" as const, data: result.data };
  }
  if ((status.status as string) === "FAILED") {
    return { status: "FAILED" as const, data: null };
  }
  return { status: "IN_PROGRESS" as const, data: null };
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

      let assemblyAiTranscriptId: string | undefined;
      let demucsRequestId: string | undefined;
      let errorMessage: string | undefined;

      try {
        assemblyAiTranscriptId = await submitAssemblyAIJob(input.audioUrl);
      } catch (e: unknown) {
        errorMessage = e instanceof Error ? e.message : "AssemblyAI submission failed";
        console.error("[WizSync] AssemblyAI error:", errorMessage);
      }

      try {
        demucsRequestId = await submitDemucsJob(input.audioUrl);
      } catch (e: unknown) {
        const demucsErr = e instanceof Error ? e.message : "Demucs submission failed";
        console.error("[WizSync] Demucs error:", demucsErr);
        if (!errorMessage) errorMessage = demucsErr;
      }

      const [job] = await db.insert(wizSyncJobs).values({
        userId: ctx.user.id,
        audioUrl: input.audioUrl,
        audioName: input.audioName ?? "Audio Track",
        audioDuration: input.audioDuration ? input.audioDuration.toFixed(3) : undefined,
        status: assemblyAiTranscriptId ? "analysing" : "error",
        errorMessage,
        assemblyAiTranscriptId,
        demucsRequestId,
        musicVideoJobId: input.musicVideoJobId,
      }).$returningId();

      return { jobId: job.id, status: assemblyAiTranscriptId ? "analysing" : "error" };
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

      // Poll AssemblyAI
      let assemblyDone = !job.assemblyAiTranscriptId;
      let utterancesData: Array<{ speaker: string; start: number; end: number; text: string; confidence: number }> = [];
      let speakerCount = 0;

      if (job.assemblyAiTranscriptId) {
        try {
          const transcript = await pollAssemblyAIJob(job.assemblyAiTranscriptId);
          if (transcript.status === "completed" && transcript.utterances) {
            assemblyDone = true;
            utterancesData = transcript.utterances as typeof utterancesData;
            const speakerSet = new Set(transcript.utterances.map((u: { speaker: string }) => u.speaker));
            speakerCount = speakerSet.size;
          } else if (transcript.status === "error") {
            await db.update(wizSyncJobs)
              .set({ status: "error", errorMessage: transcript.error ?? "AssemblyAI transcription failed" })
              .where(eq(wizSyncJobs.id, job.id));
            return { job: { ...job, status: "error" as const }, speakers: [], segments: [] };
          }
        } catch (e) {
          console.error("[WizSync] Poll AssemblyAI error:", e);
        }
      }

      // Poll Demucs
      let demucsData: Record<string, { url: string } | undefined> | null = null;
      if (job.demucsRequestId) {
        try {
          const result = await pollDemucsJob(job.demucsRequestId);
          if (result.status === "COMPLETED") demucsData = result.data;
        } catch (e) {
          console.error("[WizSync] Poll Demucs error:", e);
        }
      }

      // Persist speakers + segments when AssemblyAI is done
      if (assemblyDone && utterancesData.length > 0) {
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

        // Mark job ready
        await db.update(wizSyncJobs).set({
          status: "ready",
          speakerCount,
          utterances: utterancesData,
          stems: demucsData,
        }).where(eq(wizSyncJobs.id, job.id));

        const speakers = await db.select().from(wizSyncSpeakers)
          .where(eq(wizSyncSpeakers.wizSyncJobId, job.id));
        const segments = await db.select().from(wizSyncSegments)
          .where(eq(wizSyncSegments.wizSyncJobId, job.id));

        return {
          job: { ...job, status: "ready" as const, speakerCount, stems: demucsData },
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
