import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type VoiceToolContext =
  | "text-to-video generation"
  | "AI music and song creation"
  | "AI image generation"
  | "music video creation"
  | "music video creation and visual storytelling"
  | "video automation and storyboarding"
  | "orchestral score and music composition"
  | "audio-video synchronisation"
  | "video enhancement and colour grading";

interface VoicePromptButtonProps {
  /** Called with the refined AI prompt once transcription + refinement is complete */
  onPromptReady: (refinedPrompt: string, rawTranscript: string) => void;
  /** Which tool this prompt is for — used to guide GPT-4 refinement */
  toolContext: VoiceToolContext;
  /** Optional extra class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

type RecordingState = "idle" | "recording" | "processing" | "done" | "error";

const MAX_RECORDING_SECONDS = 60;

export function VoicePromptButton({
  onPromptReady,
  toolContext,
  className,
  disabled,
}: VoicePromptButtonProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(MAX_RECORDING_SECONDS);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const transcribeMutation = trpc.voice.transcribeAndRefine.useMutation({
    onSuccess: (data) => {
      setState("done");
      onPromptReady(data.refinedPrompt, data.rawTranscript);
      toast.success("Voice prompt ready", {
        description: "Your brief has been converted into an optimised prompt.",
      });
      // Reset to idle after 2s
      setTimeout(() => setState("idle"), 2000);
    },
    onError: (err) => {
      setState("error");
      // Map raw error messages to user-friendly descriptions
      const rawMsg = err.message || "";
      let description: string;
      if (rawMsg.includes("quota") || rawMsg.includes("rate limit") || rawMsg.includes("429")) {
        description = "Voice service is busy — please wait a moment and try again.";
      } else if (rawMsg.includes("too large") || rawMsg.includes("16MB") || rawMsg.includes("size")) {
        description = "Recording is too long. Please keep voice briefs under 60 seconds.";
      } else if (rawMsg.includes("network") || rawMsg.includes("fetch") || rawMsg.includes("ECONNREFUSED")) {
        description = "Network error — check your connection and try again.";
      } else if (rawMsg.includes("Transcription service") || rawMsg.includes("transcrib")) {
        description = "The transcription service is temporarily unavailable. Please try again in a few seconds.";
      } else if (rawMsg.includes("UNAUTHORIZED") || rawMsg.includes("401") || rawMsg.includes("sign in")) {
        description = "Please sign in to use voice input.";
      } else {
        description = "Voice processing failed — please try again.";
      }
      toast.error("Voice input failed", { description });
      setTimeout(() => setState("idle"), 2500);
    },
  });

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setSecondsLeft(MAX_RECORDING_SECONDS);
  }, []);

  const startRecording = useCallback(async () => {
    if (state !== "idle") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Prefer webm/opus, fall back to whatever is supported
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setState("processing");
        const blob = new Blob(chunksRef.current, { type: mimeType });

        // Upload audio blob to S3 via the existing upload endpoint
        try {
          const ext = mimeType.includes("webm") ? "webm" : "mp4";
          const key = `voice-prompts/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${ext}`;
          const formData = new FormData();
          formData.append("file", blob, `voice.${ext}`);

          const uploadRes = await fetch(
            `/api/video/upload?key=${encodeURIComponent(key)}&type=${encodeURIComponent(mimeType)}`,
            { method: "POST", body: formData }
          );

          if (!uploadRes.ok) {
            const status = uploadRes.status;
            if (status === 413) throw new Error("Recording is too large. Please keep voice briefs under 60 seconds.");
            if (status === 401 || status === 403) throw new Error("Please sign in to use voice input.");
            if (status === 429) throw new Error("Voice service is busy — please wait a moment and try again.");
            throw new Error("Audio upload failed — please try again.");
          }
          const { url: audioUrl } = await uploadRes.json();

          // Now transcribe + refine
          transcribeMutation.mutate({ audioUrl, toolContext });
        } catch (err) {
          setState("error");
          toast.error("Voice input failed", {
            description:
              err instanceof Error ? err.message : "Could not upload audio — please try again.",
          });
          setTimeout(() => setState("idle"), 2500);
        }
      };

      recorder.start(250); // collect chunks every 250ms
      setState("recording");
      setSecondsLeft(MAX_RECORDING_SECONDS);

      // Auto-stop after MAX_RECORDING_SECONDS
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return s - 1;
        });
      }, 1000);
    } catch (err) {
      toast.error("Microphone access denied", {
        description:
          "Please allow microphone access in your browser to use voice input.",
      });
    }
  }, [state, toolContext, stopRecording, transcribeMutation]);

  const handleClick = () => {
    if (disabled) return;
    if (state === "recording") {
      stopRecording();
    } else if (state === "idle") {
      startRecording();
    }
  };

  const isRecording = state === "recording";
  const isProcessing = state === "processing";
  const isDone = state === "done";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing || isDone}
      title={
        isRecording
          ? `Recording… tap to stop (${secondsLeft}s left)`
          : isProcessing
          ? "Processing your voice brief…"
          : isDone
          ? "Prompt ready!"
          : "Tap to speak your brief"
      }
      className={cn(
        "relative flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60",
        // Size
        "w-10 h-10 shrink-0",
        // Idle
        state === "idle" &&
          !disabled &&
          "bg-zinc-800/80 border border-zinc-600/50 text-zinc-400 hover:border-amber-500/60 hover:text-amber-400 hover:bg-zinc-700/80 hover:shadow-[0_0_12px_rgba(184,137,42,0.25)]",
        // Recording — pulsing red ON AIR indicator
        isRecording &&
          "bg-red-900/40 border border-red-500/70 text-red-400 shadow-[0_0_16px_rgba(220,38,38,0.45)] animate-pulse",
        // Processing
        isProcessing &&
          "bg-amber-900/30 border border-amber-500/50 text-amber-400 cursor-wait",
        // Done
        isDone &&
          "bg-green-900/30 border border-green-500/50 text-green-400",
        // Disabled
        disabled && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      {/* ON AIR ring when recording */}
      {isRecording && (
        <span className="absolute inset-0 rounded-full border-2 border-red-500/60 animate-ping" />
      )}

      {/* Icon */}
      {isProcessing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isDone ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : isRecording ? (
        <MicOff className="w-4 h-4" />
      ) : (
        <Mic className="w-4 h-4" />
      )}

      {/* Recording timer badge */}
      {isRecording && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-[9px] font-bold leading-none border border-red-400/60 shadow">
          {secondsLeft}
        </span>
      )}
    </button>
  );
}

/**
 * Wrapper that renders the VoicePromptButton inline next to a textarea label.
 * Usage:
 *   <VoicePromptInline
 *     label="Your Prompt"
 *     toolContext="text-to-video generation"
 *     onPromptReady={(p) => setPrompt(p)}
 *   />
 */
export function VoicePromptInline({
  label,
  toolContext,
  onPromptReady,
  disabled,
}: {
  label?: string;
  toolContext: VoiceToolContext;
  onPromptReady: (refined: string, raw: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-sm font-medium text-zinc-300">{label}</span>
      )}
      <VoicePromptButton
        toolContext={toolContext}
        onPromptReady={onPromptReady}
        disabled={disabled}
      />
      <span className="text-xs text-zinc-500 italic">or speak your brief</span>
    </div>
  );
}
