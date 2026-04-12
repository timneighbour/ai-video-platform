import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Wand2, Sparkles, RefreshCw, Play, ChevronRight,
  Zap, CheckCircle2, Clock, ArrowLeft, Loader2,
  AlertCircle, Download, ExternalLink, Plus, Trash2, Copy, ImageIcon,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import CreditBalance from "@/components/CreditBalance";
import { LowCreditBanner } from "@/components/LowCreditBanner";
import { useCreditGuard } from "@/hooks/useCreditGuard";
import AuthGate from "@/components/AuthGate";
import { WizBrandBadge } from "@/components/WizBrand";

const VIDEO_STYLES = [
  { id: "cinematic",    label: "Cinematic",    desc: "Hollywood-quality realism",       emoji: "🎬" },
  { id: "anime",        label: "Anime",         desc: "Japanese animation style",        emoji: "🌸" },
  { id: "pixar",        label: "Pixar 3D",      desc: "Vibrant 3D animation",            emoji: "🎭" },
  { id: "documentary",  label: "Documentary",   desc: "Authentic & raw footage",         emoji: "📽️" },
  { id: "abstract",     label: "Abstract",      desc: "Artistic visual journey",         emoji: "🎨" },
  { id: "vintage",      label: "Vintage",       desc: "Retro film aesthetic",            emoji: "📺" },
  { id: "neon_noir",    label: "Neon Noir",     desc: "Dark cyberpunk neon glow",        emoji: "🌃" },
  { id: "disney",       label: "Disney",        desc: "Magical Disney animation",        emoji: "✨" },
  { id: "epic_fantasy", label: "Epic Fantasy",  desc: "Dramatic magical landscapes",     emoji: "⚔️" },
  { id: "realistic",    label: "Realistic",     desc: "Photorealistic true-to-life",     emoji: "📷" },
  { id: "horror",       label: "Horror",        desc: "Dark atmospheric tension",        emoji: "👻" },
];

const DURATIONS = [
  { id: "5",  label: "5s",  credits: 50 },
  { id: "10", label: "10s", credits: 100 },
  { id: "15", label: "15s", credits: 150 },
  { id: "30", label: "30s", credits: 300 },
  { id: "60", label: "60s", credits: 600 },
];

const ASPECT_RATIOS = [
  { id: "16:9", label: "16:9", desc: "Landscape" },
  { id: "9:16", label: "9:16", desc: "Portrait" },
  { id: "1:1",  label: "1:1",  desc: "Square" },
];

const PROGRESS_STAGES = [
  { label: "Submitting your request…",                        pct: 8  },
  { label: "WizCreate™ is analysing your prompt…",           pct: 18 },
  { label: "WizCreate™ is building scene composition…",      pct: 32 },
  { label: "WizRender™ is generating video frames…",         pct: 52 },
  { label: "WizRender™ is applying style & effects…",        pct: 68 },
  { label: "WizRender™ is rendering final video…",           pct: 82 },
  { label: "Finalising & uploading…",                        pct: 94 },
];

const EXAMPLE_PROMPTS = [
  "A lone astronaut walking across a red Martian landscape at sunset, cinematic slow motion",
  "A futuristic city at night with flying cars and neon signs reflecting in rain puddles",
  "A wolf howling at the full moon on a snowy mountain peak, epic fantasy style",
  "A time-lapse of a flower blooming in a sunlit meadow, photorealistic",
  "An underwater world with bioluminescent creatures swimming through coral reefs",
];

type StoryboardScene = {
  id: number;
  title: string;
  description: string;
  visualNotes: string;
  duration: string;
  previewImageUrl?: string;
  previewLoading?: boolean;
};

let nextSceneId = 300;

function generateStoryboard(prompt: string, style: string): StoryboardScene[] {
  const styleLabel = VIDEO_STYLES.find((s) => s.id === style)?.label || "Cinematic";
  return [
    {
      id: 1,
      title: "Opening Shot",
      description: `Establish the scene: ${prompt.slice(0, 80)}…`,
      visualNotes: `${styleLabel} style. Wide establishing shot. Set the mood and atmosphere.`,
      duration: "3s",
    },
    {
      id: 2,
      title: "Main Action",
      description: `The core visual: ${prompt.slice(0, 100)}`,
      visualNotes: `${styleLabel} style. Dynamic movement. Focus on the key subject.`,
      duration: "5s",
    },
    {
      id: 3,
      title: "Closing Shot",
      description: "A satisfying conclusion to the visual narrative.",
      visualNotes: `${styleLabel} style. Slow fade or dramatic close-up. Memorable final frame.`,
      duration: "3s",
    },
  ];
}

export default function TextToVideoCreator() {
  const { isAuthenticated } = useAuth();
  const { balance: creditBalance } = useCreditGuard();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<"input" | "storyboard" | "generating" | "done">("input");
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState("10");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [storyboard, setStoryboard] = useState<StoryboardScene[]>([]);
  const [regenerating, setRegenerating] = useState(false);

  const [projectId, setProjectId] = useState<number | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const [progressStage, setProgressStage] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedDuration = DURATIONS.find((d) => d.id === duration)!;
  const creditCost = selectedDuration.credits;

  const startProgressAnimation = useCallback(() => {
    setProgressPct(PROGRESS_STAGES[0].pct);
    setProgressStage(0);
    let stageIdx = 0;
    stageIntervalRef.current = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, PROGRESS_STAGES.length - 1);
      setProgressStage(stageIdx);
      setProgressPct(PROGRESS_STAGES[stageIdx].pct);
      if (stageIdx === PROGRESS_STAGES.length - 1) clearInterval(stageIntervalRef.current!);
    }, 6000);
  }, []);

  const stopProgressAnimation = useCallback(() => {
    if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
  }, []);

  useEffect(() => () => stopProgressAnimation(), [stopProgressAnimation]);

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
          toast.success("Your video is ready!");
        } else if (result.status === "failed") {
          stopProgressAnimation();
          setGenerationError(result.error || "Video generation failed. Please try again.");
          setStep("storyboard");
          toast.error(result.error || "Video generation failed.");
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 8000);
  }, [utils, stopProgressAnimation]);

  const generateVideoMutation = trpc.billing.generateVideo.useMutation({
    onSuccess: (data) => {
      if (data.projectId) {
        setProjectId(data.projectId);
        startPolling(data.projectId);
      }
      if (data.status === "completed") {
        stopProgressAnimation();
        setProgressPct(100);
        setStep("done");
        toast.success("Your video is ready!");
      }
    },
    onError: (err) => {
      stopProgressAnimation();
      setGenerationError(err.message || "Video generation failed. Please try again.");
      setStep("storyboard");
      toast.error(err.message || "Video generation failed.");
    },
  });

  const generateScenePreviewMutation = trpc.billing.generateScenePreview.useMutation();

  const generatePreviewForScene = useCallback(async (sceneId: number) => {
    const scene = storyboard.find((s) => s.id === sceneId);
    if (!scene) return;
    setStoryboard((prev) =>
      prev.map((s) => s.id === sceneId ? { ...s, previewLoading: true } : s)
    );
    try {
      const styleLabel = VIDEO_STYLES.find((s) => s.id === style)?.label || style;
      const result = await generateScenePreviewMutation.mutateAsync({
        sceneTitle: scene.title,
        sceneDescription: scene.description,
        visualNotes: scene.visualNotes,
        style: styleLabel,
      });
      setStoryboard((prev) =>
        prev.map((s) =>
          s.id === sceneId
            ? { ...s, previewLoading: false, previewImageUrl: result.imageUrl }
            : s
        )
      );
    } catch {
      setStoryboard((prev) =>
        prev.map((s) => s.id === sceneId ? { ...s, previewLoading: false } : s)
      );
      toast.error("Preview generation failed for this scene.");
    }
  }, [storyboard, style, generateScenePreviewMutation]);

  const generateAllPreviews = useCallback(async (scenes: StoryboardScene[]) => {
    for (const scene of scenes) {
      await generatePreviewForScene(scene.id);
    }
  }, [generatePreviewForScene]);

  const handleGenerateStoryboard = useCallback(() => {
    if (!prompt.trim() || prompt.length < 10) {
      toast.error("Please enter a prompt (at least 10 characters).");
      return;
    }
    const scenes = generateStoryboard(prompt, style);
    setStoryboard(scenes);
    setStep("storyboard");
    setTimeout(() => generateAllPreviews(scenes), 300);
  }, [prompt, style, generateAllPreviews]);

  const handleRegenerateStoryboard = useCallback(() => {
    setRegenerating(true);
    setTimeout(() => {
      const scenes = generateStoryboard(
        prompt + " " + Math.random().toString(36).slice(2, 6),
        style
      );
      setStoryboard(scenes);
      setRegenerating(false);
      toast.success("Storyboard regenerated — free of charge!");
      generateAllPreviews(scenes);
    }, 1200);
  }, [prompt, style, generateAllPreviews]);

  const updateScene = useCallback((id: number, field: keyof StoryboardScene, value: string) => {
    setStoryboard((prev) =>
      prev.map((s) => s.id === id ? { ...s, [field]: value } : s)
    );
  }, []);

  const addScene = useCallback(() => {
    const styleLabel = VIDEO_STYLES.find((s) => s.id === style)?.label || "Cinematic";
    const newScene: StoryboardScene = {
      id: ++nextSceneId,
      title: "New Scene",
      description: "Describe what happens in this scene…",
      visualNotes: `${styleLabel} style. Describe the visual direction.`,
      duration: "3s",
    };
    setStoryboard((prev) => [...prev, newScene]);
    toast.success("Scene added!");
  }, [style]);

  const removeScene = useCallback((id: number) => {
    setStoryboard((prev) => {
      if (prev.length <= 1) { toast.error("You need at least one scene."); return prev; }
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const copySceneText = useCallback((scene: StoryboardScene) => {
    const text = `${scene.title}\n${scene.description}\nVisual notes: ${scene.visualNotes}`;
    navigator.clipboard.writeText(text).then(() => toast.success("Scene text copied!"));
  }, []);

  const handleRenderVideo = useCallback(() => {
    if (!isAuthenticated) {
      setShowAuthGate(true);
      return;
    }
    setGenerationError(null);
    setGeneratedVideoUrl(null);
    setProjectId(null);
    setStep("generating");
    startProgressAnimation();
    generateVideoMutation.mutate({
      toolType: "text_to_video",
      prompt,
      options: { style, duration, aspectRatio },
    });
  }, [isAuthenticated, prompt, style, duration, aspectRatio, generateVideoMutation, startProgressAnimation]);

  const stepIndex = { input: 0, storyboard: 1, generating: 2, done: 2 }[step];
  const styleObj = VIDEO_STYLES.find((s) => s.id === style);

  return (
    <div className="min-h-screen bg-background">
      {/* Auth Gate */}
      <AuthGate open={showAuthGate} onClose={() => setShowAuthGate(false)} featureName="render your video" />
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (step === "storyboard") setStep("input");
              else if (step === "generating") toast.info("Video is rendering — check progress in Projects.");
              else setLocation("/");
            }}
            className="gap-2 text-muted-foreground hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{step === "storyboard" ? "Edit Prompt" : "Back"}</span>
          </Button>

          <div className="flex items-center gap-2.5">
            <Wand2 className="h-5 w-5 text-violet-400" />
            <span className="font-bold text-white">Text to Video</span>
            <Badge className="bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs hidden sm:inline-flex">
              AI Generator
            </Badge>
          </div>

          <CreditBalance variant="badge" />
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-white/10 bg-white/5">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 sm:gap-2 py-3 overflow-x-auto scrollbar-none">
            {[
              { label: "1. Your Prompt" },
              { label: "2. Storyboard" },
              { label: "3. Render" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    stepIndex === i
                      ? "bg-violet-600 text-white"
                      : stepIndex > i
                      ? "bg-green-600/30 text-green-400"
                      : "bg-white/10 text-muted-foreground"
                  }`}
                >
                  {stepIndex > i ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  <span className="whitespace-nowrap">{s.label}</span>
                </div>
                {i < 2 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-10 max-w-3xl">

        {/* ── STEP 1: INPUT ── */}
        {step === "input" && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs sm:text-sm text-violet-300 mb-4">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                See your full storyboard before you render — always free
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Text to Video
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Describe what you want to see. We'll generate a storyboard with AI preview images for you to review and edit before rendering.
              </p>
            </div>

            {/* Prompt */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
              <label className="block text-sm font-medium text-white mb-2">
                Your Prompt <span className="text-muted-foreground">(min. 10 characters)</span>
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A lone astronaut walking across a red Martian landscape at sunset, cinematic slow motion…"
                className="w-full h-28 sm:h-36 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">{prompt.length} / 2000</span>
                {prompt.length >= 10 && (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Ready
                  </span>
                )}
              </div>
              {/* Example prompts */}
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">💡 Example prompts:</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.slice(0, 3).map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(ex)}
                      className="text-xs rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1 text-violet-300 hover:bg-violet-500/15 transition text-left"
                    >
                      {ex.slice(0, 50)}…
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Style */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">Video Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {VIDEO_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      style === s.id
                        ? "border-violet-500 bg-violet-500/20 text-white"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <div className="text-lg mb-1">{s.emoji}</div>
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
                <div className="grid grid-cols-5 gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDuration(d.id)}
                      className={`rounded-xl border p-2.5 text-center transition-all ${
                        duration === d.id
                          ? "border-violet-500 bg-violet-500/20 text-white"
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
                          ? "border-violet-500 bg-violet-500/20 text-white"
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

            <div className="text-center">
              <Button
                size="lg"
                onClick={handleGenerateStoryboard}
                disabled={prompt.length < 10}
                className="gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 w-full sm:w-auto px-10 py-6 text-base font-semibold"
              >
                <Wand2 className="h-5 w-5" />
                Generate Free Storyboard
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Free storyboard preview · Credits only charged on final render
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 2: STORYBOARD ── */}
        {step === "storyboard" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Your Storyboard</h2>
              <p className="text-sm text-muted-foreground">
                Review your AI-generated storyboard. Edit scenes, regenerate previews, then render when you're satisfied.
              </p>
            </div>

            {generationError && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{generationError}</span>
              </div>
            )}

            <div className="space-y-4">
              {storyboard.map((scene, i) => (
                <div key={scene.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-violet-400 bg-violet-500/20 rounded-full px-2 py-0.5">
                        Scene {i + 1}
                      </span>
                      <input
                        value={scene.title}
                        onChange={(e) => updateScene(scene.id, "title", e.target.value)}
                        className="bg-transparent text-sm font-semibold text-white border-none outline-none focus:ring-1 focus:ring-violet-500/50 rounded px-1"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => generatePreviewForScene(scene.id)}
                        title="Regenerate AI preview"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 transition"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => copySceneText(scene)}
                        title="Copy scene text"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeScene(scene.id)}
                        title="Remove scene"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {scene.previewLoading && (
                    <div className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-xl border border-violet-500/20 bg-violet-500/5 aspect-video flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
                      <span className="text-xs text-violet-300">Generating AI preview…</span>
                    </div>
                  )}
                  {!scene.previewLoading && scene.previewImageUrl && (
                    <div className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-xl overflow-hidden aspect-video">
                      <img
                        src={scene.previewImageUrl}
                        alt={scene.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {!scene.previewLoading && !scene.previewImageUrl && (
                    <button
                      onClick={() => generatePreviewForScene(scene.id)}
                      className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-xl border border-dashed border-violet-500/20 bg-violet-500/5 aspect-video flex flex-col items-center justify-center gap-2 hover:border-violet-500/40 hover:bg-violet-500/10 transition group"
                    >
                      <ImageIcon className="h-6 w-6 text-muted-foreground/40 group-hover:text-violet-400 transition" />
                      <span className="text-xs text-muted-foreground/60 group-hover:text-violet-300 transition">
                        Click to generate AI preview image
                      </span>
                    </button>
                  )}

                  <div className="px-4 pt-3 pb-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Scene description</label>
                    <Textarea
                      value={scene.description}
                      onChange={(e) => updateScene(scene.id, "description", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 min-h-[60px]"
                      placeholder="Describe what happens in this scene…"
                    />
                  </div>
                  <div className="px-4 pb-4">
                    <label className="text-xs text-muted-foreground mb-1 block">Visual direction</label>
                    <Textarea
                      value={scene.visualNotes}
                      onChange={(e) => updateScene(scene.id, "visualNotes", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-muted-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 min-h-[48px]"
                      placeholder="Camera angle, lighting, mood, colours…"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addScene}
              className="w-full rounded-2xl border-2 border-dashed border-violet-500/20 bg-transparent py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/5 transition"
            >
              <Plus className="h-4 w-4" />
              Add Scene
            </button>

            <LowCreditBanner
              balance={creditBalance}
              estimatedCost={creditCost}
              variant="inline"
              dismissible
            />

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="font-semibold text-white">Ready to render?</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Final render costs <span className="text-white font-semibold">{creditCost} credits</span> for {duration}s · {styleObj?.label} · {aspectRatio}
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
                  {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Regenerate Free
                </Button>
                <Button
                  onClick={handleRenderVideo}
                  className="gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 flex-1"
                >
                  <Play className="h-4 w-4" />
                  Render Video — {creditCost} Credits
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: GENERATING ── */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 space-y-8 text-center">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                <Wand2 className="h-9 w-9 text-violet-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex justify-center mb-3">
                <WizBrandBadge layer="render" size="md" animated />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Rendering with WizRender™…</h2>
              <p className="text-muted-foreground text-sm">
                WizRender™ is generating your video. This usually takes 2–5 minutes.
              </p>
            </div>
            <div className="w-full max-w-md space-y-3">
              <Progress value={progressPct} className="h-3 rounded-full" />
              <p className="text-sm text-violet-300 font-medium">{PROGRESS_STAGES[progressStage].label}</p>
              <p className="text-xs text-muted-foreground">{progressPct}% complete</p>
            </div>
            <div className="space-y-2 w-full max-w-md">
              {PROGRESS_STAGES.map((stage, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  {i < progressStage ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                  ) : i === progressStage ? (
                    <Loader2 className="h-4 w-4 text-violet-400 animate-spin flex-shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-white/20 flex-shrink-0" />
                  )}
                  <span className={i <= progressStage ? "text-white" : "text-muted-foreground/50"}>
                    {stage.label}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              This page will update automatically when your video is ready.
            </p>
          </div>
        )}

        {/* ── STEP 4: DONE ── */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-10 sm:py-16 space-y-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Your Video is Ready!</h2>
              <p className="text-muted-foreground">Watch your AI-generated video below.</p>
            </div>
            {generatedVideoUrl ? (
              <div className="w-full max-w-2xl rounded-2xl overflow-hidden border border-violet-500/30 bg-black">
                <video
                  src={generatedVideoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full"
                  style={{ maxHeight: "400px" }}
                />
              </div>
            ) : (
              <div className="w-full max-w-2xl rounded-2xl border border-violet-500/30 bg-violet-500/5 aspect-video flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 text-violet-400 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading video…</p>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
              {generatedVideoUrl && (
                <>
                  <Button
                    variant="outline"
                    className="gap-2 border-white/20 text-white hover:bg-white/10 flex-1"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = generatedVideoUrl;
                      a.download = "text-to-video.mp4";
                      a.click();
                      toast.success("Download started!");
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 border-white/20 text-white hover:bg-white/10 flex-1"
                    onClick={() => window.open(generatedVideoUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </Button>
                </>
              )}
              <Button
                onClick={() => setLocation("/projects")}
                className="gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white border-0 flex-1"
              >
                View All Projects
              </Button>
            </div>
            <button
              onClick={() => {
                setStep("input");
                setPrompt("");
                setStoryboard([]);
                setGeneratedVideoUrl(null);
                setProjectId(null);
                setGenerationError(null);
              }}
              className="text-sm text-muted-foreground hover:text-white transition underline underline-offset-4"
            >
              Create another video
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
