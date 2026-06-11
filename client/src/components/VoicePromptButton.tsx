import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2, CheckCircle2, Edit3, RotateCcw, Check, X } from "lucide-react";
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
  | "video enhancement and colour grading"
  | "character description and appearance"
  | "scene direction and cinematography";

interface VoicePromptButtonProps {
  /** Called with the refined AI prompt once the user confirms it */
  onPromptReady: (refinedPrompt: string, rawTranscript: string) => void;
  /** Which tool this prompt is for — used to guide GPT-4 refinement */
  toolContext: VoiceToolContext;
  /** Optional extra class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show expanded waveform bar alongside the button */
  showWaveform?: boolean;
}

type RecordingState = "idle" | "recording" | "processing" | "review" | "done" | "error";

const MAX_RECORDING_SECONDS = 60;
const WAVEFORM_BARS = 32;

/** Live waveform canvas drawn from AnalyserNode frequency data */
function WaveformCanvas({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const barWidth = (W / WAVEFORM_BARS) * 0.7;
      const gap = (W / WAVEFORM_BARS) * 0.3;
      const step = Math.floor(bufferLength / WAVEFORM_BARS);

      for (let i = 0; i < WAVEFORM_BARS; i++) {
        const value = dataArray[i * step] / 255;
        const barH = Math.max(3, value * H);
        const x = i * (barWidth + gap);
        const y = (H - barH) / 2;

        // Gold gradient bar
        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, "rgba(251,191,36,0.9)");
        grad.addColorStop(0.5, "rgba(184,137,42,1)");
        grad.addColorStop(1, "rgba(251,191,36,0.9)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 2);
        ctx.fill();
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={32}
      className="rounded-md"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

/**
 * Review panel shown after transcription completes.
 * Displays both the raw transcript and the AI-refined prompt,
 * lets the user edit the refined text, then confirm or discard.
 */
function ReviewPanel({
  rawTranscript,
  refinedPrompt,
  onConfirm,
  onDiscard,
}: {
  rawTranscript: string;
  refinedPrompt: string;
  onConfirm: (text: string) => void;
  onDiscard: () => void;
}) {
  const [editedPrompt, setEditedPrompt] = useState(refinedPrompt);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus and select all text when panel opens
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onConfirm(editedPrompt.trim());
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onDiscard();
    }
  };

  return (
    <div className="mt-2 w-full rounded-xl border border-amber-500/30 bg-zinc-950/95 shadow-[0_0_24px_rgba(184,137,42,0.15)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/60">
        <div className="flex items-center gap-1.5">
          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
            Review &amp; Edit
          </span>
        </div>
        <button
          type="button"
          onClick={onDiscard}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 rounded"
          title="Discard (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Raw transcript (read-only reference) */}
        {rawTranscript && rawTranscript !== refinedPrompt && (
          <div>
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
              What you said
            </p>
            <p className="text-[11px] text-zinc-400 italic leading-relaxed line-clamp-2">
              "{rawTranscript}"
            </p>
          </div>
        )}

        {/* Editable refined prompt */}
        <div>
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
            AI-refined prompt — edit before applying
          </p>
          <textarea
            ref={textareaRef}
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            className={cn(
              "w-full resize-none rounded-lg px-3 py-2.5 text-[12px] leading-relaxed",
              "bg-zinc-900 border border-zinc-700/60 text-zinc-100 placeholder-zinc-600",
              "focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20",
              "transition-colors"
            )}
            placeholder="Edit the prompt here…"
          />
          <p className="text-[10px] text-zinc-600 mt-1">
            ⌘↵ to apply · Esc to discard
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => onConfirm(editedPrompt.trim())}
            disabled={!editedPrompt.trim()}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all",
              "bg-amber-500/20 border border-amber-500/40 text-amber-300",
              "hover:bg-amber-500/30 hover:border-amber-400/60 hover:text-amber-200",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
            )}
          >
            <Check className="w-3.5 h-3.5" />
            Apply to scene
          </button>

          <button
            type="button"
            onClick={() => setEditedPrompt(rawTranscript)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all",
              "bg-zinc-800/60 border border-zinc-700/50 text-zinc-400",
              "hover:bg-zinc-700/60 hover:text-zinc-300",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50"
            )}
            title="Use raw transcript instead of AI-refined version"
          >
            <RotateCcw className="w-3 h-3" />
            Use original
          </button>

          <button
            type="button"
            onClick={onDiscard}
            className={cn(
              "ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all",
              "bg-zinc-800/40 border border-zinc-700/40 text-zinc-500",
              "hover:bg-zinc-700/40 hover:text-zinc-400",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50"
            )}
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

export function VoicePromptButton({
  onPromptReady,
  toolContext,
  className,
  disabled,
  showWaveform = true,
}: VoicePromptButtonProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(MAX_RECORDING_SECONDS);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // Review state — holds transcription result while user edits
  const [reviewData, setReviewData] = useState<{
    rawTranscript: string;
    refinedPrompt: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const transcribeMutation = trpc.voice.transcribeAndRefine.useMutation({
    onSuccess: (data) => {
      // Instead of immediately calling onPromptReady, enter review state
      setState("review");
      setReviewData({
        rawTranscript: data.rawTranscript,
        refinedPrompt: data.refinedPrompt,
      });
    },
    onError: (err) => {
      setState("error");
      const rawMsg = err.message || "";
      let description: string;
      if (rawMsg.includes("quota") || rawMsg.includes("rate limit") || rawMsg.includes("429")) {
        description = "Voice service is busy — please wait a moment and try again.";
      } else if (rawMsg.includes("too large") || rawMsg.includes("16MB") || rawMsg.includes("size")) {
        description = "Recording is too long. Please keep voice briefs under 60 seconds.";
      } else if (rawMsg.includes("network") || rawMsg.includes("fetch") || rawMsg.includes("ECONNREFUSED")) {
        description = "Network error — check your connection and try again.";
      } else if (rawMsg.includes("Transcription service") || rawMsg.includes("transcrib")) {
        description = "The transcription service is temporarily unavailable. Please try again.";
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setAnalyser(null);
    setSecondsLeft(MAX_RECORDING_SECONDS);
  }, []);

  const startRecording = useCallback(async () => {
    if (state !== "idle") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Set up Web Audio analyser for waveform
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 128;
      analyserNode.smoothingTimeConstant = 0.8;
      source.connect(analyserNode);
      setAnalyser(analyserNode);

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

        try {
          const ext = mimeType.includes("webm") ? "webm" : "mp4";
          const key = `voice-prompts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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
          transcribeMutation.mutate({ audioUrl, toolContext });
        } catch (err) {
          setState("error");
          toast.error("Voice input failed", {
            description: err instanceof Error ? err.message : "Could not upload audio — please try again.",
          });
          setTimeout(() => setState("idle"), 2500);
        }
      };

      recorder.start(250);
      setState("recording");
      setSecondsLeft(MAX_RECORDING_SECONDS);

      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return s - 1;
        });
      }, 1000);
    } catch {
      toast.error("Microphone access denied", {
        description: "Please allow microphone access in your browser to use voice input.",
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

  const handleConfirm = (text: string) => {
    if (!reviewData) return;
    setState("done");
    onPromptReady(text, reviewData.rawTranscript);
    setReviewData(null);
    toast.success("Voice direction applied", {
      description: "Your direction has been added to the scene.",
    });
    setTimeout(() => setState("idle"), 2000);
  };

  const handleDiscard = () => {
    setState("idle");
    setReviewData(null);
  };

  const isRecording = state === "recording";
  const isProcessing = state === "processing";
  const isDone = state === "done";
  const isReview = state === "review";

  return (
    <div className="flex flex-col gap-0 w-full">
      <div className="flex items-center gap-2">
        {/* Mic button */}
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || isProcessing || isDone || isReview}
          title={
            isRecording
              ? `Recording… tap to stop (${secondsLeft}s left)`
              : isProcessing
              ? "Processing your voice brief…"
              : isDone
              ? "Prompt ready!"
              : isReview
              ? "Review your transcription below"
              : "Tap to speak your direction"
          }
          className={cn(
            "relative flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60",
            "w-10 h-10 shrink-0",
            state === "idle" && !disabled &&
              "bg-zinc-800/80 border border-zinc-600/50 text-zinc-400 hover:border-amber-500/60 hover:text-amber-400 hover:bg-zinc-700/80 hover:shadow-[0_0_12px_rgba(184,137,42,0.25)]",
            isRecording &&
              "bg-red-900/40 border border-red-500/70 text-red-400 shadow-[0_0_16px_rgba(220,38,38,0.45)]",
            isProcessing &&
              "bg-amber-900/30 border border-amber-500/50 text-amber-400 cursor-wait",
            isDone &&
              "bg-green-900/30 border border-green-500/50 text-green-400",
            isReview &&
              "bg-amber-900/20 border border-amber-500/40 text-amber-400 cursor-default",
            disabled && "opacity-40 cursor-not-allowed",
            className
          )}
        >
          {/* ON AIR ping ring */}
          {isRecording && (
            <span className="absolute inset-0 rounded-full border-2 border-red-500/60 animate-ping" />
          )}

          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isDone ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : isReview ? (
            <Edit3 className="w-4 h-4" />
          ) : isRecording ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}

          {/* Countdown badge */}
          {isRecording && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-[9px] font-bold leading-none border border-red-400/60 shadow">
              {secondsLeft}
            </span>
          )}
        </button>

        {/* Live waveform — only shown while recording */}
        {showWaveform && isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-red-500/30 shadow-[0_0_12px_rgba(220,38,38,0.15)]">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 uppercase tracking-widest shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              REC
            </span>
            <WaveformCanvas analyser={analyser} />
            <span className="text-[10px] text-zinc-500 shrink-0">{secondsLeft}s</span>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-amber-500/30">
            <Loader2 className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
            <span className="text-[11px] text-amber-300">Transcribing your direction…</span>
          </div>
        )}

        {/* Review hint */}
        {isReview && (
          <span className="text-[11px] text-amber-400 font-medium">Review your transcription below ↓</span>
        )}

        {/* Idle hint */}
        {!isRecording && !isProcessing && !isDone && !isReview && !disabled && (
          <span className="text-[11px] text-zinc-500 italic">or speak your direction</span>
        )}

        {/* Done confirmation */}
        {isDone && (
          <span className="text-[11px] text-green-400 font-medium">Direction applied ✓</span>
        )}
      </div>

      {/* Review/edit panel — shown inline below the button row */}
      {isReview && reviewData && (
        <ReviewPanel
          rawTranscript={reviewData.rawTranscript}
          refinedPrompt={reviewData.refinedPrompt}
          onConfirm={handleConfirm}
          onDiscard={handleDiscard}
        />
      )}
    </div>
  );
}

/**
 * Wrapper that renders the VoicePromptButton inline next to a textarea label.
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
    </div>
  );
}
