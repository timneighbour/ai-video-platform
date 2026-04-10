import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Wand2, Sparkles, RefreshCw, Play, ChevronRight,
  Zap, CheckCircle2, Clock, ArrowLeft, Loader2,
  AlertCircle, Download, ExternalLink, Plus, Trash2, Copy, ImageIcon, X,
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

// Kids-friendly styles only
const KIDS_STYLES = [
  { id: "pixar",       label: "Pixar 3D",     desc: "Vibrant 3D animation",        emoji: "🎬" },
  { id: "disney",      label: "Disney",        desc: "Magical Disney animation",    emoji: "✨" },
  { id: "anime",       label: "Anime",         desc: "Fun Japanese animation",      emoji: "🌸" },
  { id: "cartoon",     label: "Cartoon",       desc: "Classic colourful cartoon",   emoji: "🎨" },
  { id: "storybook",   label: "Storybook",     desc: "Illustrated fairy-tale style",emoji: "📖" },
  { id: "claymation",  label: "Claymation",    desc: "Playful clay-style animation",emoji: "🧸" },
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
  { label: "Submitting your request…",        pct: 8  },
  { label: "Analysing your story idea…",      pct: 18 },
  { label: "Building scene composition…",     pct: 32 },
  { label: "Generating animation frames…",    pct: 52 },
  { label: "Applying colours & style…",       pct: 68 },
  { label: "Rendering your video…",           pct: 82 },
  { label: "Finalising & uploading…",         pct: 94 },
];

const KIDS_PROMPT_EXAMPLES = [
  "A friendly dragon who loves baking cookies and shares them with woodland animals",
  "A little astronaut exploring a colourful planet full of singing aliens",
  "A brave bunny who goes on an adventure to find the magical golden carrot",
  "A group of toy robots who come to life at night and tidy up the playroom",
  "A mermaid princess who teaches sea creatures how to read and write",
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

let nextSceneId = 200;

function generateKidsStoryboard(prompt: string, style: string): StoryboardScene[] {
  const styleLabel = KIDS_STYLES.find((s) => s.id === style)?.label || "Pixar 3D";
  return [
    {
      id: 1,
      title: "Meet the Characters 🌟",
      description: `Introduce the main character: ${prompt.slice(0, 60)}…`,
      visualNotes: `${styleLabel} style. Bright, warm colours. Big expressive eyes. Friendly and welcoming atmosphere.`,
      duration: "3s",
    },
    {
      id: 2,
      title: "The Adventure Begins 🚀",
      description: `The exciting part of the story: ${prompt.slice(0, 80)}`,
      visualNotes: `${styleLabel} action scene. Lots of movement and energy. Vivid colours. Fun and playful.`,
      duration: "5s",
    },
    {
      id: 3,
      title: "Happy Ending 🎉",
      description: "Everyone is happy and the story ends with a smile!",
      visualNotes: `${styleLabel} warm glow. Confetti and sparkles. Big smiles. Safe and joyful atmosphere.`,
      duration: "3s",
    },
  ];
}

export default function KidsVideo() {
  const { isAuthenticated } = useAuth();
  const { balance: creditBalance } = useCreditGuard();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<"input" | "storyboard" | "generating" | "done">("input");
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("pixar");
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
          toast.success("🎉 Your kids video is ready!");
        } else if (result.status === "failed") {
          stopProgressAnimation();
          setGenerationError(result.error || "Video generation failed. Please try again.");
          setStep("storyboard");
          toast.error(result.error || "Video generation failed. Please try again.");
        }
      } catch {
        // network hiccup — keep polling silently
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
        toast.success("🎉 Your kids video is ready!");
      }
    },
    onError: (err) => {
      stopProgressAnimation();
      setGenerationError(err.message || "Video generation failed. Please try again.");
      setStep("storyboard");
      toast.error(err.message || "Video generation failed. Please try again.");
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
      const styleLabel = KIDS_STYLES.find((s) => s.id === style)?.label || style;
      const result = await generateScenePreviewMutation.mutateAsync({
        sceneTitle: scene.title,
        sceneDescription: scene.description,
        visualNotes: `Kids animation, child-friendly, safe for children. ${scene.visualNotes}`,
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
      toast.error("Please describe your story idea (at least 10 characters).");
      return;
    }
    const scenes = generateKidsStoryboard(prompt, style);
    setStoryboard(scenes);
    setStep("storyboard");
    setTimeout(() => generateAllPreviews(scenes), 300);
  }, [prompt, style, generateAllPreviews]);

  const handleRegenerateStoryboard = useCallback(() => {
    setRegenerating(true);
    setTimeout(() => {
      const scenes = generateKidsStoryboard(
        prompt + " " + Math.random().toString(36).slice(2, 6),
        style
      );
      setStoryboard(scenes);
      setRegenerating(false);
      toast.success("Storyboard regenerated — free of charge! 🎨");
      generateAllPreviews(scenes);
    }, 1200);
  }, [prompt, style, generateAllPreviews]);

  const updateScene = useCallback((id: number, field: keyof StoryboardScene, value: string) => {
    setStoryboard((prev) =>
      prev.map((s) => s.id === id ? { ...s, [field]: value } : s)
    );
  }, []);

  const addScene = useCallback(() => {
    const styleLabel = KIDS_STYLES.find((s) => s.id === style)?.label || "Pixar 3D";
    const newScene: StoryboardScene = {
      id: ++nextSceneId,
      title: "New Scene ✨",
      description: "Describe what happens in this part of the story…",
      visualNotes: `${styleLabel} style. Bright colours, fun characters, child-friendly.`,
      duration: "3s",
    };
    setStoryboard((prev) => [...prev, newScene]);
    toast.success("Scene added! 🎬");
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
      prompt: `Kids animation: ${prompt}`,
      options: { style, duration, aspectRatio },
    });
  }, [isAuthenticated, prompt, style, duration, aspectRatio, generateVideoMutation, startProgressAnimation]);

  const stepIndex = { input: 0, storyboard: 1, generating: 2, done: 2 }[step];

  return (
    <div className="min-h-screen bg-background">
      {/* Auth Gate */}
      <AuthGate open={showAuthGate} onClose={() => setShowAuthGate(false)} featureName="render your kids video" />
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
            <span className="hidden sm:inline">{step === "storyboard" ? "Edit Story" : "Back"}</span>
          </Button>

          {/* Kids Video branding */}
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🧒</span>
            <span className="font-bold text-white">Kids Video</span>
            <Badge className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs hidden sm:inline-flex">
              Child-Safe AI
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
              { key: "input",      label: "1. Story Idea" },
              { key: "storyboard", label: "2. Storyboard" },
              { key: "generating", label: "3. Render" },
            ].map((s, i) => (
              <div key={s.key} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    stepIndex === i
                      ? "bg-pink-600 text-white"
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

      {/* Content */}
      <div className="container mx-auto px-4 py-6 sm:py-10 max-w-3xl">

        {/* ── STEP 1: INPUT ── */}
        {step === "input" && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-1.5 text-xs sm:text-sm text-pink-300 mb-4">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                Storyboard preview is always free — pay only when you render
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                🌈 Create a Kids Video
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Describe your story idea and we'll create a fun animated storyboard for you to review before generating.
              </p>
            </div>

            {/* Story Prompt */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
              <label className="block text-sm font-medium text-white mb-2">
                Story Idea <span className="text-muted-foreground">(min. 10 characters)</span>
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A friendly dragon who loves baking cookies and shares them with woodland animals…"
                className="w-full h-28 sm:h-32 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/50 text-sm"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">{prompt.length} / 1000</span>
                {prompt.length >= 10 && (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Ready
                  </span>
                )}
              </div>
              {/* Example prompts */}
              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground mb-2">💡 Need inspiration? Try one of these:</p>
                <div className="flex flex-wrap gap-2">
                  {KIDS_PROMPT_EXAMPLES.slice(0, 3).map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(ex)}
                      className="text-xs rounded-full border border-pink-500/20 bg-pink-500/5 px-3 py-1 text-pink-300 hover:bg-pink-500/15 transition text-left"
                    >
                      {ex.slice(0, 45)}…
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Style Selection */}
            <div>
              <label className="block text-sm font-medium text-white mb-3">Animation Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {KIDS_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      style === s.id
                        ? "border-pink-500 bg-pink-500/20 text-white"
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
                <label className="block text-sm font-medium text-white mb-3">Video Length</label>
                <div className="grid grid-cols-5 gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDuration(d.id)}
                      className={`rounded-xl border p-2.5 text-center transition-all ${
                        duration === d.id
                          ? "border-pink-500 bg-pink-500/20 text-white"
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
                <label className="block text-sm font-medium text-white mb-3">Screen Format</label>
                <div className="flex gap-2 sm:gap-3">
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setAspectRatio(r.id)}
                      className={`flex-1 rounded-xl border p-3 text-center transition-all ${
                        aspectRatio === r.id
                          ? "border-pink-500 bg-pink-500/20 text-white"
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

            {/* CTA */}
            <div className="text-center">
              <Button
                size="lg"
                onClick={handleGenerateStoryboard}
                disabled={prompt.length < 10}
                className="gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white border-0 w-full sm:w-auto px-10 py-6 text-base font-semibold"
              >
                <Wand2 className="h-5 w-5" />
                Create Free Storyboard 🌈
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Free storyboard preview · No credits charged yet
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 2: STORYBOARD ── */}
        {step === "storyboard" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">🎬 Your Storyboard</h2>
              <p className="text-sm text-muted-foreground">
                Here's your free AI storyboard preview. Edit scenes, regenerate images, then render when you're happy!
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
                  {/* Scene header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-pink-400 bg-pink-500/20 rounded-full px-2 py-0.5">
                        Scene {i + 1}
                      </span>
                      <input
                        value={scene.title}
                        onChange={(e) => updateScene(scene.id, "title", e.target.value)}
                        className="bg-transparent text-sm font-semibold text-white border-none outline-none focus:ring-1 focus:ring-pink-500/50 rounded px-1"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => generatePreviewForScene(scene.id)}
                        title="Regenerate AI preview"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-pink-400 hover:bg-pink-500/10 transition"
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

                  {/* AI Preview image */}
                  {scene.previewLoading && (
                    <div className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-xl border border-pink-500/20 bg-pink-500/5 aspect-video flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 text-pink-400 animate-spin" />
                      <span className="text-xs text-pink-300">Generating AI preview…</span>
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
                      className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-xl border border-dashed border-pink-500/20 bg-pink-500/5 aspect-video flex flex-col items-center justify-center gap-2 hover:border-pink-500/40 hover:bg-pink-500/10 transition group"
                    >
                      <ImageIcon className="h-6 w-6 text-muted-foreground/40 group-hover:text-pink-400 transition" />
                      <span className="text-xs text-muted-foreground/60 group-hover:text-pink-300 transition">
                        Tap to generate AI preview image 🎨
                      </span>
                    </button>
                  )}

                  {/* Editable description */}
                  <div className="px-4 pt-3 pb-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Scene description</label>
                    <Textarea
                      value={scene.description}
                      onChange={(e) => updateScene(scene.id, "description", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-pink-500/50 min-h-[60px]"
                      placeholder="Describe what happens in this scene…"
                    />
                  </div>
                  <div className="px-4 pb-4">
                    <label className="text-xs text-muted-foreground mb-1 block">Visual direction</label>
                    <Textarea
                      value={scene.visualNotes}
                      onChange={(e) => updateScene(scene.id, "visualNotes", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-muted-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-pink-500/50 min-h-[48px]"
                      placeholder="Colours, characters, mood…"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add Scene */}
            <button
              onClick={addScene}
              className="w-full rounded-2xl border-2 border-dashed border-pink-500/20 bg-transparent py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-pink-500/40 hover:text-pink-300 hover:bg-pink-500/5 transition"
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

            {/* Render controls */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="font-semibold text-white">Ready to render? 🚀</span>
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
                  {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Regenerate Free 🎨
                </Button>
                <Button
                  onClick={handleRenderVideo}
                  className="gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white border-0 flex-1"
                >
                  <Play className="h-4 w-4" />
                  Render Video — {creditCost} Credits
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-300">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                All content is generated to be safe and appropriate for children. AI-generated previews are free — credits are only charged when you render the final video.
              </span>
            </div>
          </div>
        )}

        {/* ── STEP 3: GENERATING ── */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 space-y-8 text-center">
            <div className="text-5xl animate-bounce">🎬</div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Creating Your Kids Video…</h2>
              <p className="text-muted-foreground text-sm">
                Our AI is bringing your story to life! This usually takes 2–5 minutes.
              </p>
            </div>
            <div className="w-full max-w-md space-y-3">
              <Progress value={progressPct} className="h-3 rounded-full" />
              <p className="text-sm text-pink-300 font-medium">{PROGRESS_STAGES[progressStage].label}</p>
              <p className="text-xs text-muted-foreground">{progressPct}% complete</p>
            </div>
            <div className="space-y-2 w-full max-w-md">
              {PROGRESS_STAGES.map((stage, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  {i < progressStage ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                  ) : i === progressStage ? (
                    <Loader2 className="h-4 w-4 text-pink-400 animate-spin flex-shrink-0" />
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
              This page will update automatically when your video is ready 🌈
            </p>
          </div>
        )}

        {/* ── STEP 4: DONE ── */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-10 sm:py-16 space-y-8 text-center">
            <div className="text-6xl">🎉</div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Your Kids Video is Ready!</h2>
              <p className="text-muted-foreground">Your animated video has been created. Watch it below!</p>
            </div>
            {generatedVideoUrl ? (
              <div className="w-full max-w-2xl rounded-2xl overflow-hidden border border-pink-500/30 bg-black">
                <video
                  src={generatedVideoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full"
                  style={{ maxHeight: "400px" }}
                />
              </div>
            ) : (
              <div className="w-full max-w-2xl rounded-2xl border border-pink-500/30 bg-pink-500/5 aspect-video flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="text-4xl">🎬</div>
                  <p className="text-sm text-muted-foreground">Video processing…</p>
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
                      a.download = "kids-video.mp4";
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
                className="gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white border-0 flex-1"
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
              Create another video 🌈
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
