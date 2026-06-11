import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { transcribeAudio } from "../_core/voiceTranscription";
import { invokeLLM } from "../_core/llm";
import { withQuotaGuard, QUOTA_EXHAUSTED_MESSAGE } from "../_core/quotaError";

/**
 * Refine a raw voice transcript into an optimised AI generation prompt.
 * Uses GPT-4 to clean up natural speech, remove filler words, and rewrite
 * the brief as a precise, detailed prompt suited to the target tool.
 */
async function refineTranscriptToPrompt(
  rawTranscript: string,
  toolContext: string
): Promise<string> {
  const systemPrompt = `You are an expert AI prompt engineer specialising in ${toolContext}. 
Your job is to take a raw voice transcript (natural spoken language, possibly with filler words, 
repetitions, or incomplete sentences) and convert it into a precise, detailed, optimised prompt 
that will produce the best possible results from an AI generation model.

Rules:
- Remove filler words (um, uh, like, you know, sort of, etc.)
- Fix grammar and sentence structure
- Add relevant technical/creative details that improve the output quality
- Keep the user's original creative intent 100% intact
- Be specific and descriptive — more detail = better AI output
- Return ONLY the refined prompt, no explanation, no preamble, no quotes`;

   try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Raw voice transcript: "${rawTranscript}"\n\nConvert this into an optimised ${toolContext} prompt:`,
        },
      ],
    });
    const content = response?.choices?.[0]?.message?.content;
    const refined =
      (typeof content === "string" ? content.trim() : null) ?? rawTranscript;
    return refined;
  } catch (err) {
    // LLM refinement is best-effort — fall back to raw transcript on failure
    console.warn("[VoiceRouter] LLM refinement failed, returning raw transcript:", err instanceof Error ? err.message : err);
    return rawTranscript;
  }
}

export const voiceRouter = router({
  /**
   * Transcribe an audio file URL and refine the transcript into an
   * optimised AI generation prompt for the specified tool.
   *
   * Flow:
   * 1. Frontend records audio via MediaRecorder API
   * 2. Frontend uploads audio blob to S3 via storagePut
   * 3. Frontend calls this mutation with the S3 URL + toolContext
   * 4. Server transcribes with Whisper, then refines with GPT-4
   * 5. Returns both the raw transcript and the refined prompt
   */
  transcribeAndRefine: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string().url("Must be a valid audio URL"),
        toolContext: z
          .enum([
            "text-to-video generation",
            "AI music and song creation",
            "AI image generation",
            "music video creation",
            "music video creation and visual storytelling",
            "video automation and storyboarding",
            "orchestral score and music composition",
            "audio-video synchronisation",
            "video enhancement and colour grading",
            "scene direction and cinematography",
            "character description and appearance",
          ])
          .default("text-to-video generation"),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      console.log("[Voice] transcribeAndRefine called:", {
        audioUrl: input.audioUrl,
        toolContext: input.toolContext,
        language: input.language,
      });

      // Step 1: Transcribe the audio (with quota guard for rate-limit errors)
      let transcriptionResult;
      try {
        transcriptionResult = await withQuotaGuard(() => transcribeAudio({
          audioUrl: input.audioUrl,
          language: input.language,
          prompt: `Transcribe the user's creative brief for ${input.toolContext}`,
        }));
      } catch (err) {
        console.error("[Voice] transcribeAudio threw unexpected error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Voice transcription service error. Please try again.",
          cause: err,
        });
      }

      console.log("[Voice] transcription result:", JSON.stringify(transcriptionResult).slice(0, 300));

      if ("error" in transcriptionResult) {
        console.error("[Voice] transcription error:", transcriptionResult);
        // Surface quota/rate-limit errors with a friendly message
        const details = (transcriptionResult as any).details ?? "";
        if (/412|usage exhausted|quota|rate limit/i.test(details)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: QUOTA_EXHAUSTED_MESSAGE });
        }
        // Surface download errors clearly
        if (transcriptionResult.code === "INVALID_FORMAT" || transcriptionResult.code === "FILE_TOO_LARGE") {
          throw new TRPCError({ code: "BAD_REQUEST", message: transcriptionResult.error });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Voice transcription failed: ${transcriptionResult.error}. Please try again.`,
          cause: transcriptionResult,
        });
      }

      const rawTranscript = transcriptionResult.text.trim();

      if (!rawTranscript || rawTranscript.length < 3) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No speech detected. Please try speaking more clearly.",
        });
      }

      // Step 2: Refine transcript into an optimised prompt
      const refinedPrompt = await refineTranscriptToPrompt(
        rawTranscript,
        input.toolContext
      );

      return {
        rawTranscript,
        refinedPrompt,
        language: transcriptionResult.language ?? "en",
        duration: (transcriptionResult as { duration?: number }).duration,
      };
    }),
});
