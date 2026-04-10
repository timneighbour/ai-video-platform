import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Wand2, Sparkles, RefreshCw, Play, ChevronRight,
  Zap, CheckCircle2, Clock, Film, ArrowLeft, Loader2,
  Music, AlertCircle, Download, ExternalLink, Clapperboard,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import CreditBalance from "@/components/CreditBalance";
import { LowCreditBanner } from "@/components/LowCreditBanner";
import { useCreditGuard } from "@/hooks/useCreditGuard";

const VIDEO_STYLES = [
  { id: "cinematic", label: "Cinematic", desc: "Hollywood-quality realism" },
  { id: "anime", label: "Anime", desc: "Japanese animation style" },
  { id: "pixar", label: "Pixar 3D", desc: "Vibrant 3D animation" },
  { id: "documentary", label: "Documentary", desc: "Authentic & raw footage" },
  { id: "abstract", label: "Abstract", desc: "Artistic visual journey" },
  { id: "vintage", label: "Vintage", desc: "Retro film aesthetic" },
  { id: "neon_noir", label: "Neon Noir", desc: "Dark cyberpunk neon glow" },
  { id: "disney", label: "Disney", desc: "Magical Disney animation" },
  { id: "epic_fantasy", label: "Epic Fantasy", desc: "Dramatic magical landscapes" },
  { id: "realistic", label: "Realistic", desc: "True-to-life photorealism" },
  { id: "horror", label: "Horror", desc: "Dark, eerie & atmospheric" },
];

const DURATIONS = [
  { id: "5", label: "5s", credits: 50 },
  { id: "10", label: "10s", credits: 100 },
  { id: "15", label: "15s", credits: 150 },
  { id: "30", label: "30s", credits: 300 },
  { id: "60", label: "60s", credits: 600 },
  { id: "90", label: "90s", credits: 900 },
  { id: "120", label: "120s", credits: 1200 },
];

const ASPECT_RATIOS = [
  { id: "16:9", label: "16:9", desc: "Landscape" },
  { id: "9:16", label: "9:16", desc: "Portrait" },
  { id: "1:1", label: "1:1", desc: "Square" },
];

// Generation progress stages shown to the user
const PROGRESS_STAGES = [
  { label: "Submitting your request…", pct: 8 },
  { label: "Analysing your prompt…", pct: 18 },
  { label: "Building scene composition…", pct: 32 },
  { label: "Generating frames…", pct: 52 },
  { label: "Applying style & colour grading…", pct: 68 },
  { label: "Rendering final video…", pct: 82 },
  { label: "Finalising & uploading…", pct: 94 },
];

type StoryboardScene = {
  id: number;
  title: string;
  description: string;
  visualNotes: string;
  duration: string;
};

function generateStoryboardFromPrompt(prompt: string, style: string): StoryboardScene[] {
  const styleDesc = VIDEO_STYLES.find((s) => s.id === style)?.label || "Cinematic";
  return [
    {
      id: 1,
      title: "Opening Shot",
      description: `Establish the scene: ${prompt.slice(0, 60)}…`,
      visualNotes: `${styleDesc} wide-angle establishing shot. Rich colour palette, dramatic lighting.`,
      duration: "2s",
    },
    {
      id: 2,
      title: "Main Action",
      description: `Core narrative moment — ${prompt.slice(0, 80)}`,
      visualNotes: `Medium close-up. ${styleDesc} motion blur and depth of field. Emotional peak.`,
      duration: "6s",
    },
    {
      id: 3,
      title: "Closing Frame",
      description: "Resolution and final impression.",
      visualNotes: `${styleDesc} slow zoom out. Fade to black with lingering atmosphere.`,
      duration: "4s",
    },
  ];
}

export default function Autopilot() {
  const { isAuthenticated } = useAuth();
  const { balance: creditBalance } = useCreditGuard();
  const [, setLocation] = useLocation();

  // Step state
  const [step, setStep] = useState<"input" | "storyboard" | "generating" | "done">("input");

  // Form state
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState("10");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [storyboard, setStoryboard] = useState<StoryboardScene[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioMode, setAudioMode] = useState<"prompt" | "audio">("prompt");

  // Generation tracking
  const [projectId, setProjectId] = useState<number | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const [progressStage, setProgressStage] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedDuration = DURATIONS.find((d) => d.id === duration)!;
  const creditCost = selectedDuration.credits;

  // Animated progress stage ticker (advances through stages while polling)
  const startProgressAnimation = useCallback(() => {
    setProgressPct(PROGRESS_STAGES[0].pct);
    setProgressStage(0);
    let stageIdx = 0;
    stageIntervalRef.current = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, PROGRESS_STAGES.length - 1);
      setProgressStage(stageIdx);
      setProgressPct(PROGRESS_STAGES[stageIdx].pct);
      if (stageIdx === PROGRESS_STAGES.length - 1) {
        clearInterval(stageIntervalRef.current!);
      }
    }, 6000); // advance a stage every 6s
  }, []);

  const stopProgressAnimation = useCallback(() => {
    if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopProgressAnimation(), [stopProgressAnimation]);

  // Poll for video status
  const utils = trpc.useUtils();
  const startPolling = useCallback((pid: number) => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await utils.billing.checkVideoStatus.fetch({ projectId: pid });
        if (result.status === "completed" && result.videoUrl) {
          stopProgressAnimation();
          setProgressPct(100);
          setGeneratedVideoUrl(result.videoUrl);
          setStep("done");
          toast.success("🎬 Your video is ready!");
        } else if (result.status === "failed") {
          stopProgressAnimation();
          setGenerationError(result.error || "Video generation failed. Please try again.");
          setStep("storyboard");
          toast.error(result.error || "Video generation failed. Please try again.");
        }
        // "processing" / "pending" → keep polling
      } catch {
        // network hiccup — keep polling silently
      }
    }, 8000); // poll every 8s
  }, [utils, stopProgressAnimation]);

  const generateVideo = trpc.billing.generateVideo.useMutation({
    onSuccess: (data) => {
      if (data.projectId) {
        setProjectId(data.projectId);
        startPolling(data.projectId);
      }
      // If already completed synchronously (unlikely but possible)
      if (data.status === "completed") {
        stopProgressAnimation();
        setProgressPct(100);
        setStep("done");
        toast.success("🎬 Your video is ready!");
      }
    },
    onError: (err) => {
      stopProgressAnimation();
      setGenerationError(err.message || "Video generation failed. Please try again.");
      setStep("storyboard");
      toast.error(err.message || "Video generation failed. Please try again.");
    },
  });

  const handleGenerateStoryboard = useCallback(() => {
    if (!prompt.trim() || prompt.length < 10) {
      toast.error("Please enter a prompt of at least 10 characters.");
      return;
    }
    const scenes = generateStoryboardFromPrompt(prompt, style);
    setStoryboard(scenes);
    setStep("storyboard");
  }, [prompt, style]);

  const handleRegenerateStoryboard = useCallback(() => {
    setRegenerating(true);
    setTimeout(() => {
      const scenes = generateStoryboardFromPrompt(
        prompt + " " + Math.random().toString(36).slice(2, 6),
        style
      );
      setStoryboard(scenes);
      setRegenerating(false);
      toast.success("Storyboard regenerated — free of charge!");
    }, 1200);
  }, [prompt, style]);

  const handleRenderVideo = useCallback(() => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setGenerationError(null);
    setGeneratedVideoUrl(null);
    setProjectId(null);
    setStep("generating");
    startProgressAnimation();
    generateVideo.mutate({
      toolType: "text_to_video",
      prompt,
      options: { style, duration, aspectRatio },
    });
  }, [isAuthenticated, prompt, style, duration, aspectRatio, generateVideo, startProgressAnimation]);

  const stepIndex = { input: 0, storyboard: 1, generating: 2, done: 2 }[step];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (step === "storyboard") {
                setStep("input");
              } else if (step === "generating") {
                // Don't go back during generation
                toast.info("Video is rendering — you can check progress in Projects.");
              } else {
                setLocation("/");
              }
            }}
            className="gap-2 text-muted-foreground hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">
              {step === "storyboard" ? "Edit Prompt" : "Back"}
            </span>
          </Button>
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-400" />
            <span className="font-bold text-white">WizPilot</span>
          </div>
          <CreditBalance variant="badge" />
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-white/10 bg-white/5">
        <div className="container mx-auto py-3 px-4">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm overflow-x-auto">
            {[
              { key: "input", label: "1. Describe" },
              { key: "storyboard", label: "2. Storyboard" },
              { key: "generating", label: "3. Render" },
            ].map((s, i) => (
              <div key={s.key} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <span
                  className={`rounded-full px-2.5 sm:px-3 py-1 font-medium transition-all whitespace-nowrap ${
                    step === s.key
                      ? "bg-purple-600 text-white"
                      : step === "done" || i < stepIndex
                      ? "bg-green-600/30 text-green-400"
                      : "bg-white/10 text-muted-foreground"
                  }`}
                >
                  {step === "done" && i < 3 ? "✓ " : ""}{s.label}
                </span>
                {i < 2 && <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8 sm:py-12 max-w-4xl mx-auto px-4">

        {/* ── STEP 1: INPUT ── */}
        {step === "input" && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5 text-xs sm:text-sm text-green-300 mb-4">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                Storyboard generation is always free — pay only when you render
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Describe Your Video
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Tell WizVid what you want to create. We'll generate a free storyboard you can refine before spending any credits.
              </p>
            </div>

            {/* Prompt Input */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
              <label className="block text-sm font-medium text-white mb-2">
                Video Prompt <span className="text-muted-foreground">(min. 10 characters)</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A futuristic city at sunset with flying cars weaving between neon-lit skyscrapers, cinematic drone shot…"
                className="w-full h-28 sm:h-32 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">{prompt.length} / 1000</span>
                {prompt.length >= 10 && (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Ready
                  </span>
                )}
              </div>
            </div>

            {/* Style Selection */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">Video Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {VIDEO_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      style === s.id
                        ? "border-purple-500 bg-purple-500/20 text-white"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <div className="font-medium text-sm">{s.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration & Aspect Ratio */}
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-3">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDuration(d.id)}
                      className={`rounded-xl border p-2.5 text-center transition-all ${
                        duration === d.id
                          ? "border-purple-500 bg-purple-500/20 text-white"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-xs sm:text-sm">{d.label}</div>
                      <div className="text-xs opacity-70 mt-0.5 hidden sm:block">{d.credits}cr</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-3">Aspect Ratio</label>
                <div className="flex gap-2 sm:gap-3">
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setAspectRatio(r.id)}
                      className={`flex-1 rounded-xl border p-3 text-center transition-all ${
                        aspectRatio === r.id
                          ? "border-purple-500 bg-purple-500/20 text-white"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-xs">{r.id}</div>
                      <div className="text-xs opacity-70 mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Audio Upload (Optional) */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                  <Music className="h-4 w-4 text-purple-400" />
                  Audio Soundtrack <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <div className="flex gap-2">
                  {(["prompt", "audio"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAudioMode(mode)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                        audioMode === mode
                          ? "bg-purple-600 text-white"
                          : "bg-white/10 text-muted-foreground hover:text-white"
                      }`}
                    >
                      {mode === "prompt" ? "Prompt only" : "Upload audio"}
                    </button>
                  ))}
                </div>
              </div>
              {audioMode === "audio" ? (
                <div>
                  <label
                    htmlFor="audio-upload"
                    className="flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-purple-500/30 bg-purple-500/5 cursor-pointer hover:border-purple-500/60 hover:bg-purple-500/10 transition-all"
                  >
                    {audioFile ? (
                      <div className="flex items-center gap-2 text-purple-300 px-4 text-center">
                        <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{audioFile.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">({(audioFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Music className="h-6 w-6 text-purple-400" />
                        <span className="text-sm">Tap to upload MP3, WAV, or M4A</span>
                        <span className="text-xs">Max 16 MB</span>
                      </div>
                    )}
                    <input
                      id="audio-upload"
                      type="file"
                      accept="audio/mp3,audio/wav,audio/m4a,audio/mpeg,audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 16 * 1024 * 1024) {
                            toast.error("Audio file must be under 16 MB");
                            return;
                          }
                          setAudioFile(file);
                          toast.success(`Audio uploaded: ${file.name}`);
                        }
                      }}
                    />
                  </label>
                  {audioFile && (
                    <button
                      onClick={() => setAudioFile(null)}
                      className="mt-2 text-xs text-muted-foreground hover:text-red-400 transition"
                    >
                      Remove audio
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  WizVid will automatically compose a soundtrack based on your prompt and chosen style.
                </p>
              )}
            </div>

            {/* Generate Storyboard CTA */}
            <div className="text-center">
              <Button
                size="lg"
                onClick={handleGenerateStoryboard}
                disabled={prompt.length < 10}
                className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 w-full sm:w-auto px-10 py-6 text-base font-semibold"
              >
                <Sparkles className="h-5 w-5" />
                Generate Storyboard — Free
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                No credits required. Regenerate as many times as you like.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 2: STORYBOARD ── */}
        {step === "storyboard" && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <Badge className="mb-4 bg-green-500/20 text-green-300 border-green-500/30">
                ✓ Storyboard Generated — Free
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Your Storyboard</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Review your scenes below. Not happy? Regenerate for free — as many times as you need.
              </p>
            </div>

            {/* Error banner if previous render failed */}
            {generationError && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Previous render failed</p>
                  <p className="opacity-80 mt-0.5">{generationError}</p>
                </div>
              </div>
            )}

            {/* Scenes */}
            <div className="space-y-3 sm:space-y-4">
              {storyboard.map((scene, i) => (
                <div
                  key={scene.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-white text-sm">{scene.title}</h3>
                        <span className="text-xs text-muted-foreground border border-white/10 rounded px-1.5 py-0.5">
                          {scene.duration}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 mb-1">{scene.description}</p>
                      <p className="text-xs text-muted-foreground italic">{scene.visualNotes}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Low credit warning */}
            <LowCreditBanner
              balance={creditBalance}
              estimatedCost={creditCost}
              variant="inline"
              dismissible
            />

            {/* Regenerate + Render */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="font-semibold text-white">Ready to render?</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Final render costs <span className="text-white font-semibold">{creditCost} credits</span> for {duration}s · {aspectRatio}
                </p>
                <div className="mt-2">
                  <CreditBalance variant="inline" cost={creditCost} />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={handleRegenerateStoryboard}
                  disabled={regenerating}
                  className="gap-2 border-white/20 text-white hover:bg-white/10 flex-1"
                >
                  {regenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Regenerate Free
                </Button>
                <Button
                  onClick={handleRenderVideo}
                  className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 flex-1"
                >
                  <Play className="h-4 w-4" />
                  Render Video — {creditCost} Credits
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-300">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>WizVid advantage:</strong> Unlike other platforms that charge credits every time you regenerate, WizVid lets you refine your vision completely free. You only pay when you're ready to render.
              </span>
            </div>
          </div>
        )}

        {/* ── STEP 3: GENERATING ── */}
        {step === "generating" && (
          <div className="py-12 sm:py-20 space-y-8 max-w-lg mx-auto">
            {/* Animated icon */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-600/20 border border-purple-500/40 mb-6">
                <Clapperboard className="h-10 w-10 text-purple-400 animate-pulse" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Rendering Your Video</h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Our AI engines are building your video. Sit tight — this usually takes 1–5 minutes.
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{PROGRESS_STAGES[progressStage]?.label}</span>
                <span className="text-purple-300 font-semibold tabular-nums">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-3 bg-white/10" />
              <p className="text-xs text-muted-foreground text-center">
                This page will update automatically when your video is ready
              </p>
            </div>

            {/* Stage indicators */}
            <div className="grid grid-cols-1 gap-2">
              {PROGRESS_STAGES.map((stage, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all ${
                    i < progressStage
                      ? "bg-green-500/10 text-green-400"
                      : i === progressStage
                      ? "bg-purple-500/20 text-white"
                      : "bg-white/5 text-muted-foreground/50"
                  }`}
                >
                  {i < progressStage ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-400" />
                  ) : i === progressStage ? (
                    <Loader2 className="h-4 w-4 flex-shrink-0 text-purple-400 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 flex-shrink-0 rounded-full border border-white/20" />
                  )}
                  {stage.label}
                </div>
              ))}
            </div>

            {/* Escape hatch */}
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground mb-3">
                You can safely leave this page — your video will still be generated.
              </p>
              <Button
                variant="outline"
                onClick={() => setLocation("/projects")}
                className="gap-2 border-white/20 text-white hover:bg-white/10"
              >
                <Film className="h-4 w-4" />
                View Projects While Waiting
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: DONE ── */}
        {step === "done" && (
          <div className="py-12 sm:py-20 space-y-8 max-w-lg mx-auto text-center">
            <div>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-600/20 border border-green-500/40 mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Your Video is Ready! 🎬</h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Your video has been generated and is ready to watch, download, or share.
              </p>
            </div>

            {/* Inline video player if URL available */}
            {generatedVideoUrl && (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video">
                <video
                  src={generatedVideoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {generatedVideoUrl && (
                <Button
                  asChild
                  className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0"
                >
                  <a href={generatedVideoUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                    Download Video
                  </a>
                </Button>
              )}
              <Button
                onClick={() => setLocation("/projects")}
                variant={generatedVideoUrl ? "outline" : "default"}
                className={`gap-2 ${generatedVideoUrl ? "border-white/20 text-white hover:bg-white/10" : "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0"}`}
              >
                <Film className="h-4 w-4" />
                View All Projects
              </Button>
              {generatedVideoUrl && (
                <Button
                  asChild
                  variant="outline"
                  className="gap-2 border-white/20 text-white hover:bg-white/10"
                >
                  <a href={generatedVideoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </a>
                </Button>
              )}
            </div>

            {/* Create another */}
            <div className="pt-2 border-t border-white/10">
              <Button
                variant="ghost"
                onClick={() => {
                  setStep("input");
                  setPrompt("");
                  setStoryboard([]);
                  setGeneratedVideoUrl(null);
                  setProjectId(null);
                  setProgressPct(0);
                  setProgressStage(0);
                }}
                className="gap-2 text-muted-foreground hover:text-white"
              >
                <Wand2 className="h-4 w-4" />
                Create Another Video
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
