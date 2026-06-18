import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2, CheckCircle2, Copy, RotateCcw, ChevronRight } from "lucide-react";
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
  /** Called with the refined AI prompt only when the user explicitly clicks "Use this" */
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

type RecordingState = "idle" | "recording" | "processing" | "ready" | "done" | "error";

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
 * Transcription output box — shown after transcription completes.
 * Displays both the raw transcript and the AI-refined prompt as separate
 * read-only text areas. The user can copy either, or click "Use this" to
 * apply the refined prompt (or the raw one) to the scene description.
 */
function TranscriptionBox({
  rawTranscript,
  refinedPrompt,
  onUse,
  onDismiss,
}: {
  rawTranscript: string;
  refinedPrompt: string;
  onUse: (text: string, source: "refined" | "raw") => void;
  onDismiss: () => void;
}) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    });
  };

  const showBoth = rawTranscript && rawTranscript !== refinedPrompt && rawTranscript.length > 0;

  return (
    <div className="mt-3 w-full rounded-xl border border-border/60 bg-background/95 shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-card/60">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          <span className="text-[11px] font-semibold text-foreground/80 uppercase tracking-wider">
            Transcription
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-secondary/60"
        >
          Dismiss
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Raw transcript */}
        {showBoth && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                What you said
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => copyToClipboard(rawTranscript, "Transcript")}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => onUse(rawTranscript, "raw")}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground/70 hover:text-amber-400 transition-colors font-medium"
                >
                  Use this
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="relative">
              <textarea
                readOnly
                value={rawTranscript}
                rows={2}
                className={cn(
                  "w-full resize-none rounded-lg px-3 py-2 text-[12px] leading-relaxed",
                  "bg-card/60 border border-border/60 text-muted-foreground",
                  "focus:outline-none cursor-text select-all"
                )}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
            </div>
          </div>
        )}

        {/* AI-refined prompt */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-medium text-amber-500/80 uppercase tracking-wider">
              {showBoth ? "AI-refined prompt" : "Transcription"}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => copyToClipboard(refinedPrompt, "Refined prompt")}
                className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
              <button
                type="button"
                onClick={() => onUse(refinedPrompt, "refined")}
                className={cn(
                  "flex items-center gap-1 text-[11px] font-semibold transition-colors",
                  "text-amber-400 hover:text-amber-300"
                )}
              >
                Use this
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="relative">
            <textarea
              readOnly
              value={refinedPrompt}
              rows={3}
              className={cn(
                "w-full resize-none rounded-lg px-3 py-2.5 text-[12px] leading-relaxed",
                "bg-card/80 border border-amber-500/20 text-foreground",
                "focus:outline-none cursor-text"
              )}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-[10px] text-muted-foreground/50 text-center">
          Click a text box to select all · Copy or click "Use this" to apply to the scene
        </p>
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

  // Transcription result — persists until dismissed or used
  const [transcriptionData, setTranscriptionData] = useState<{
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
      setState("ready");
      setTranscriptionData({
        rawTranscript: data.rawTranscript,
        refinedPrompt: data.refinedPrompt,
      });
    },
    onError: (err) => {
      setState("error");
      const rawMsg = err.message || "";
      console.error("[Voice] transcribeAndRefine error:", rawMsg);
      let description: string;
      if (rawMsg.includes("quota") || rawMsg.includes("rate limit") || rawMsg.includes("429")) {
        description = "Voice service is busy — please wait a moment and try again.";
      } else if (rawMsg.includes("too large") || rawMsg.includes("16MB") || rawMsg.includes("size")) {
        description = "Recording is too long. Please keep voice briefs under 60 seconds.";
      } else if (rawMsg.includes("UNAUTHORIZED") || rawMsg.includes("401") || rawMsg.includes("sign in")) {
        description = "Please sign in to use voice input.";
      } else if (rawMsg.includes("Transcription service") || rawMsg.includes("transcrib")) {
        description = "The transcription service is temporarily unavailable. Please try again.";
      } else if (rawMsg.includes("Failed to fetch") || rawMsg.includes("NetworkError") || rawMsg.includes("ECONNREFUSED")) {
        description = "Connection error — the transcription request timed out. Please try again.";
      } else {
        description = `Voice processing failed: ${rawMsg.slice(0, 80)}`;
      }
      toast.error("Voice input failed", { description });
      setTimeout(() => setState("idle"), 3000);
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
    // Clear any previous transcription when starting a new recording
    setTranscriptionData(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

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
            { method: "POST", body: formData, credentials: "include" }
          );

          if (!uploadRes.ok) {
            const status = uploadRes.status;
            if (status === 413) throw new Error("Recording is too large. Please keep voice briefs under 60 seconds.");
            if (status === 401 || status === 403) throw new Error("Please sign in to use voice input.");
            if (status === 429) throw new Error("Voice service is busy — please wait a moment and try again.");
            throw new Error(`Audio upload failed (HTTP ${status}) — please try again.`);
          }
          const { url: audioUrl } = await uploadRes.json();
          transcribeMutation.mutate({ audioUrl, toolContext });
        } catch (err) {
          setState("error");
          toast.error("Voice input failed", {
            description: err instanceof Error ? err.message : "Could not upload audio — please try again.",
          });
          setTimeout(() => setState("idle"), 3000);
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
    } else if (state === "idle" || state === "ready") {
      // Allow re-recording even when transcription is visible
      startRecording();
    }
  };

  const handleUse = (text: string, _source: "refined" | "raw") => {
    if (!transcriptionData) return;
    setState("done");
    onPromptReady(text, transcriptionData.rawTranscript);
    setTranscriptionData(null);
    toast.success("Direction applied to scene");
    setTimeout(() => setState("idle"), 2000);
  };

  const handleDismiss = () => {
    setState("idle");
    setTranscriptionData(null);
  };

  const isRecording = state === "recording";
  const isProcessing = state === "processing";
  const isDone = state === "done";
  const isReady = state === "ready";

  return (
    <div className="flex flex-col gap-0 w-full">
      {/* Button row */}
      <div className="flex items-center gap-2">
        {/* Mic button */}
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
              ? "Direction applied!"
              : isReady
              ? "Tap to record again"
              : "Tap to speak your direction"
          }
          className={cn(
            "relative flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60",
            "w-10 h-10 shrink-0",
            (state === "idle" || state === "ready") && !disabled &&
              "bg-secondary/80 border border-border/70/50 text-muted-foreground hover:border-amber-500/60 hover:text-amber-400 hover:bg-muted/80 hover:shadow-[0_0_12px_rgba(184,137,42,0.25)]",
            isRecording &&
              "bg-red-900/40 border border-red-500/70 text-red-400 shadow-[0_0_16px_rgba(220,38,38,0.45)]",
            isProcessing &&
              "bg-amber-900/30 border border-amber-500/50 text-amber-400 cursor-wait",
            isDone &&
              "bg-green-900/30 border border-green-500/50 text-green-400",
            disabled && "opacity-40 cursor-not-allowed",
            className
          )}
        >
          {isRecording && (
            <span className="absolute inset-0 rounded-full border-2 border-red-500/60 animate-ping" />
          )}

          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isDone ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : isRecording ? (
            <MicOff className="w-4 h-4" />
          ) : isReady ? (
            <RotateCcw className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}

          {isRecording && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-[9px] font-bold leading-none border border-red-400/60 shadow">
              {secondsLeft}
            </span>
          )}
        </button>

        {/* Live waveform */}
        {showWaveform && isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/80 border border-red-500/30 shadow-[0_0_12px_rgba(220,38,38,0.15)]">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 uppercase tracking-widest shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              REC
            </span>
            <WaveformCanvas analyser={analyser} />
            <span className="text-[10px] text-muted-foreground/70 shrink-0">{secondsLeft}s</span>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/80 border border-amber-500/30">
            <Loader2 className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
            <span className="text-[11px] text-amber-300">Transcribing…</span>
          </div>
        )}

        {/* Ready hint */}
        {isReady && (
          <span className="text-[11px] text-muted-foreground">
            Transcription ready — copy or click "Use this" below
          </span>
        )}

        {/* Idle hint */}
        {state === "idle" && !disabled && (
          <span className="text-[11px] text-muted-foreground/70 italic">or speak your direction</span>
        )}

        {/* Done confirmation */}
        {isDone && (
          <span className="text-[11px] text-green-400 font-medium">Direction applied ✓</span>
        )}
      </div>

      {/* Transcription output box — shown below the button row */}
      {isReady && transcriptionData && (
        <TranscriptionBox
          rawTranscript={transcriptionData.rawTranscript}
          refinedPrompt={transcriptionData.refinedPrompt}
          onUse={handleUse}
          onDismiss={handleDismiss}
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
        <span className="text-sm font-medium text-foreground/80">{label}</span>
      )}
      <VoicePromptButton
        toolContext={toolContext}
        onPromptReady={onPromptReady}
        disabled={disabled}
      />
    </div>
  );
}
