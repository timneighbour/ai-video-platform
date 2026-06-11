/**
 * Voice transcription helper using internal Speech-to-Text service
 *
 * Frontend implementation guide:
 * 1. Capture audio using MediaRecorder API
 * 2. Upload audio to storage (e.g., S3) to get URL
 * 3. Call transcription with the URL
 *
 * Example usage:
 * ```tsx
 * const transcribeMutation = trpc.voice.transcribe.useMutation({
 *   onSuccess: (data) => {
 *     console.log(data.text); // Full transcription
 *     console.log(data.language); // Detected language
 *   }
 * });
 * transcribeMutation.mutate({ audioUrl: uploadedAudioUrl, language: 'en' });
 * ```
 */
import { ENV } from "./env";

export type TranscribeOptions = {
  audioUrl: string;
  language?: string;
  prompt?: string;
};

export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse;

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

/** Sleep helper for retry backoff */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Transcribe audio to text using the internal Speech-to-Text service.
 * Includes exponential-backoff retry on both the audio download and
 * the Whisper API call to handle transient CDN/rate-limit failures.
 */
export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  try {
    // ── Step 1: Validate environment ────────────────────────────────────────
    if (!ENV.forgeApiUrl) {
      return { error: "Voice transcription service is not configured", code: "SERVICE_ERROR", details: "BUILT_IN_FORGE_API_URL is not set" };
    }
    if (!ENV.forgeApiKey) {
      return { error: "Voice transcription service authentication is missing", code: "SERVICE_ERROR", details: "BUILT_IN_FORGE_API_KEY is not set" };
    }

    // ── Step 2: Download audio from URL (retry up to 3×) ────────────────────
    // S3/CDN can take 1-3 s to propagate a freshly uploaded file, so we retry
    // on 4xx/5xx with short delays before giving up.
    let audioBuffer: Buffer;
    let mimeType: string;
    {
      const MAX_DL_ATTEMPTS = 3;
      let lastDlError: string | null = null;
      let dlSuccess = false;
      audioBuffer = Buffer.alloc(0);
      mimeType = "audio/webm";

      for (let attempt = 1; attempt <= MAX_DL_ATTEMPTS; attempt++) {
        try {
          const dlRes = await fetch(options.audioUrl);
          if (!dlRes.ok) {
            lastDlError = `HTTP ${dlRes.status}: ${dlRes.statusText}`;
            console.warn(`[Voice] Audio download attempt ${attempt}/${MAX_DL_ATTEMPTS} failed: ${lastDlError}`);
            if (attempt < MAX_DL_ATTEMPTS) {
              await sleep(attempt * 1500); // 1.5 s, 3 s
              continue;
            }
            return { error: "Failed to download audio file", code: "INVALID_FORMAT", details: lastDlError };
          }
          audioBuffer = Buffer.from(await dlRes.arrayBuffer());
          mimeType = dlRes.headers.get("content-type") || "audio/webm";
          dlSuccess = true;
          break;
        } catch (err) {
          lastDlError = err instanceof Error ? err.message : String(err);
          console.warn(`[Voice] Audio download attempt ${attempt}/${MAX_DL_ATTEMPTS} threw: ${lastDlError}`);
          if (attempt < MAX_DL_ATTEMPTS) {
            await sleep(attempt * 1500);
            continue;
          }
          return { error: "Failed to fetch audio file", code: "SERVICE_ERROR", details: lastDlError };
        }
      }

      if (!dlSuccess) {
        return { error: "Failed to download audio file after retries", code: "SERVICE_ERROR", details: lastDlError ?? "Unknown" };
      }

      // Check file size (16 MB limit)
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        return { error: "Audio file exceeds maximum size limit", code: "FILE_TOO_LARGE", details: `${sizeMB.toFixed(2)} MB — max 16 MB` };
      }
    }

    // ── Step 3: Build FormData for Whisper ──────────────────────────────────
    const baseMimeType = mimeType.split(";")[0].trim();
    const ext = getFileExtension(baseMimeType);
    const filename = `audio.${ext}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: baseMimeType });

    const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const whisperUrl = new URL("v1/audio/transcriptions", baseUrl).toString();

    const prompt =
      options.prompt ||
      (options.language
        ? `Transcribe the user's voice to text, the user's working language is ${getLanguageName(options.language)}`
        : "Transcribe the user's voice to text");

    // ── Step 4: Call Whisper API (retry up to 3× on 429/503/502/412) ────────
    const MAX_WHISPER_ATTEMPTS = 3;
    let lastWhisperError: string | null = null;

    for (let attempt = 1; attempt <= MAX_WHISPER_ATTEMPTS; attempt++) {
      // Rebuild FormData each attempt (FormData is consumed after first use)
      const formData = new FormData();
      formData.append("file", audioBlob, filename);
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");
      formData.append("prompt", prompt);

      let whisperRes: Response;
      try {
        whisperRes = await fetch(whisperUrl, {
          method: "POST",
          headers: {
            authorization: `Bearer ${ENV.forgeApiKey}`,
            "Accept-Encoding": "identity",
          },
          body: formData,
        });
      } catch (err) {
        lastWhisperError = err instanceof Error ? err.message : String(err);
        console.warn(`[Voice] Whisper fetch attempt ${attempt}/${MAX_WHISPER_ATTEMPTS} threw: ${lastWhisperError}`);
        if (attempt < MAX_WHISPER_ATTEMPTS) {
          await sleep(attempt * 2000);
          continue;
        }
        return { error: "Voice transcription service error", code: "SERVICE_ERROR", details: lastWhisperError };
      }

      // Retry on transient / rate-limit status codes
      if (whisperRes.status === 429 || whisperRes.status === 503 || whisperRes.status === 502 || whisperRes.status === 412) {
        const body = await whisperRes.text().catch(() => "");
        lastWhisperError = `${whisperRes.status} ${whisperRes.statusText}: ${body.slice(0, 200)}`;
        console.warn(`[Voice] Whisper attempt ${attempt}/${MAX_WHISPER_ATTEMPTS} rate-limited/unavailable: ${lastWhisperError}`);
        if (attempt < MAX_WHISPER_ATTEMPTS) {
          await sleep(attempt * 3000); // 3 s, 6 s
          continue;
        }
        return { error: "Transcription service is temporarily unavailable", code: "TRANSCRIPTION_FAILED", details: lastWhisperError };
      }

      if (!whisperRes.ok) {
        const errorText = await whisperRes.text().catch(() => "");
        return {
          error: "Transcription service request failed",
          code: "TRANSCRIPTION_FAILED",
          details: `${whisperRes.status} ${whisperRes.statusText}${errorText ? `: ${errorText}` : ""}`,
        };
      }

      // ── Step 5: Parse response ─────────────────────────────────────────────
      const rawBody = await whisperRes.text().catch(() => "");
      let whisperResponse: WhisperResponse;
      try {
        whisperResponse = JSON.parse(rawBody) as WhisperResponse;
      } catch {
        return { error: "Transcription service returned invalid response", code: "SERVICE_ERROR", details: `Could not parse: ${rawBody.slice(0, 200)}` };
      }

      if (!whisperResponse.text || typeof whisperResponse.text !== "string") {
        return { error: "Invalid transcription response", code: "SERVICE_ERROR", details: "Transcription service returned an invalid response format" };
      }

      console.log(`[Voice] Transcription succeeded on attempt ${attempt}: "${whisperResponse.text.slice(0, 80)}..."`);
      return whisperResponse;
    }

    // Should never reach here
    return { error: "Voice transcription failed after retries", code: "TRANSCRIPTION_FAILED", details: lastWhisperError ?? "Unknown" };

  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get file extension from MIME type.
 * Always pass the BASE mime type (no codec params).
 */
function getFileExtension(mimeType: string): string {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  const mimeToExt: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/m4a": "m4a",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/flac": "flac",
    "video/webm": "webm",
    "video/mp4": "mp4",
  };
  return mimeToExt[base] || "webm";
}

/**
 * Get full language name from ISO-639-1 code.
 */
function getLanguageName(langCode: string): string {
  const langMap: Record<string, string> = {
    en: "English", es: "Spanish", fr: "French", de: "German",
    it: "Italian", pt: "Portuguese", ru: "Russian", ja: "Japanese",
    ko: "Korean", zh: "Chinese", ar: "Arabic", hi: "Hindi",
    nl: "Dutch", pl: "Polish", tr: "Turkish", sv: "Swedish",
    da: "Danish", no: "Norwegian", fi: "Finnish",
  };
  return langMap[langCode] || langCode;
}
