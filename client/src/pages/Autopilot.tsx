import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wand2, Sparkles, RefreshCw, Play, ChevronRight,
  Zap, CheckCircle2, Clock, Film, ArrowLeft, Loader2,
  Music, FileText, Image, AlertCircle
} from "lucide-react";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

const VIDEO_STYLES = [
  { id: "cinematic", label: "Cinematic", desc: "Hollywood-quality realism" },
  { id: "anime", label: "Anime", desc: "Japanese animation style" },
  { id: "pixar", label: "Pixar 3D", desc: "Vibrant 3D animation" },
  { id: "documentary", label: "Documentary", desc: "Authentic & raw footage" },
  { id: "abstract", label: "Abstract", desc: "Artistic visual journey" },
  { id: "vintage", label: "Vintage", desc: "Retro film aesthetic" },
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

type StoryboardScene = {
  id: number;
  title: string;
  description: string;
  visualNotes: string;
  duration: string;
};

// Generates a mock storyboard from a prompt (free, no credits)
function generateStoryboardFromPrompt(prompt: string, style: string): StoryboardScene[] {
  const styleDesc = VIDEO_STYLES.find((s) => s.id === style)?.label || "Cinematic";
  return [
    {
      id: 1,
      title: "Opening Shot",
      description: `Establish the scene: ${prompt.slice(0, 60)}...`,
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
  const [, setLocation] = useLocation();

  // Step state: "input" | "storyboard" | "generating" | "done"
  const [step, setStep] = useState<"input" | "storyboard" | "generating" | "done">("input");

  // Form state
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState("10");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [storyboard, setStoryboard] = useState<StoryboardScene[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioMode, setAudioMode] = useState<"prompt" | "audio">("prompt");

  const selectedDuration = DURATIONS.find((d) => d.id === duration)!;
  const creditCost = selectedDuration.credits;

  const generateVideo = trpc.billing.generateVideo.useMutation({
    onSuccess: (data) => {
      setStep("done");
      toast.success("Your video is being generated! Check Projects for status.");
    },
    onError: (err) => {
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
    setStep("generating");
    generateVideo.mutate({
      toolType: "text_to_video",
      prompt,
      options: { style, duration, aspectRatio },
    });
  }, [isAuthenticated, prompt, style, duration, aspectRatio, generateVideo]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="container flex h-16 items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (step === "storyboard" ? setStep("input") : setLocation("/"))}
            className="gap-2 text-muted-foreground hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === "storyboard" ? "Edit Prompt" : "Back"}
          </Button>
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-400" />
            <span className="font-bold text-white">WizPilot</span>
          </div>
          <div className="w-24" />
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-white/10 bg-white/5">
        <div className="container py-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            {[
              { key: "input", label: "1. Describe" },
              { key: "storyboard", label: "2. Storyboard (Free)" },
              { key: "generating", label: "3. Render" },
            ].map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 font-medium transition-all ${
                    step === s.key
                      ? "bg-purple-600 text-white"
                      : step === "done" || (i < ["input", "storyboard", "generating"].indexOf(step))
                      ? "bg-green-600/30 text-green-400"
                      : "bg-white/10 text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {i < 2 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-12 max-w-4xl">

        {/* ── STEP 1: INPUT ── */}
        {step === "input" && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5 text-sm text-green-300 mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                Storyboard generation is always free — pay only when you render
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Describe Your Video
              </h1>
              <p className="text-muted-foreground">
                Tell WizVid what you want to create. We'll generate a free storyboard you can refine as many times as you like before spending any credits.
              </p>
            </div>

            {/* Prompt Input */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <label className="block text-sm font-medium text-white mb-2">
                Video Prompt <span className="text-muted-foreground">(min. 10 characters)</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A futuristic city at sunset with flying cars weaving between neon-lit skyscrapers, cinematic drone shot..."
                className="w-full h-32 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-3">Duration</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDuration(d.id)}
                      className={`flex-1 rounded-xl border p-3 text-center transition-all ${
                        duration === d.id
                          ? "border-purple-500 bg-purple-500/20 text-white"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-sm">{d.label}</div>
                      <div className="text-xs opacity-70 mt-0.5">{d.credits} credits</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-3">Aspect Ratio</label>
                <div className="flex gap-3">
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
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                  <Music className="h-4 w-4 text-purple-400" />
                  Audio Soundtrack <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAudioMode("prompt")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                      audioMode === "prompt"
                        ? "bg-purple-600 text-white"
                        : "bg-white/10 text-muted-foreground hover:text-white"
                    }`}
                  >
                    Prompt only
                  </button>
                  <button
                    onClick={() => setAudioMode("audio")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                      audioMode === "audio"
                        ? "bg-purple-600 text-white"
                        : "bg-white/10 text-muted-foreground hover:text-white"
                    }`}
                  >
                    Upload audio
                  </button>
                </div>
              </div>
              {audioMode === "audio" ? (
                <div>
                  <label
                    htmlFor="audio-upload"
                    className="flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-purple-500/30 bg-purple-500/5 cursor-pointer hover:border-purple-500/60 hover:bg-purple-500/10 transition-all"
                  >
                    {audioFile ? (
                      <div className="flex items-center gap-2 text-purple-300">
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                        <span className="text-sm font-medium">{audioFile.name}</span>
                        <span className="text-xs text-muted-foreground">({(audioFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Music className="h-6 w-6 text-purple-400" />
                        <span className="text-sm">Click to upload MP3, WAV, or M4A</span>
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    Your audio will be used to set the mood and pacing of the generated video.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  WizVid will automatically compose a soundtrack based on your prompt and chosen style. You can also upload your own audio above.
                </p>
              )}
            </div>

            {/* Generate Storyboard CTA */}
            <div className="text-center">
              <Button
                size="lg"
                onClick={handleGenerateStoryboard}
                disabled={prompt.length < 10}
                className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 px-10 py-6 text-base font-semibold"
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
          <div className="space-y-8">
            <div className="text-center">
              <Badge className="mb-4 bg-green-500/20 text-green-300 border-green-500/30">
                ✓ Storyboard Generated — Free
              </Badge>
              <h1 className="text-3xl font-bold text-white mb-2">Your Storyboard</h1>
              <p className="text-muted-foreground">
                Review your scenes below. Not happy? Regenerate for free — as many times as you need.
              </p>
            </div>

            {/* Scenes */}
            <div className="space-y-4">
              {storyboard.map((scene, i) => (
                <div
                  key={scene.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 flex gap-4"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white text-sm">{scene.title}</h3>
                      <span className="text-xs text-muted-foreground border border-white/10 rounded px-1.5 py-0.5">
                        {scene.duration}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 mb-1">{scene.description}</p>
                    <p className="text-xs text-muted-foreground italic">{scene.visualNotes}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Regenerate + Render */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="font-semibold text-white">Ready to render?</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Final render costs <span className="text-white font-semibold">{creditCost} credits</span> for {duration}s · {aspectRatio}
                </p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handleRegenerateStoryboard}
                  disabled={regenerating}
                  className="gap-2 border-white/20 text-white hover:bg-white/10 flex-1 sm:flex-none"
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
                  className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 flex-1 sm:flex-none"
                >
                  <Play className="h-4 w-4" />
                  Render Video
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-300">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>WizVid advantage:</strong> Unlike other platforms that charge credits every time you regenerate the storyboard, WizVid lets you refine your vision completely free. You only pay when you're ready to render.
              </span>
            </div>
          </div>
        )}

        {/* ── STEP 3: GENERATING ── */}
        {step === "generating" && (
          <div className="text-center py-20 space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-600/20 border border-purple-500/40">
              <Loader2 className="h-10 w-10 text-purple-400 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white">Rendering Your Video</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your video is being generated by our AI engines. This typically takes 1–5 minutes depending on duration and style.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Estimated time: 1–5 minutes
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/projects")}
              className="gap-2 border-white/20 text-white hover:bg-white/10"
            >
              <Film className="h-4 w-4" />
              View in Projects
            </Button>
          </div>
        )}

        {/* ── STEP 4: DONE ── */}
        {step === "done" && (
          <div className="text-center py-20 space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-600/20 border border-green-500/40">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Video Queued!</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your video has been added to the generation queue. You'll be able to download it from your Projects page once it's ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => setLocation("/projects")}
                className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0"
              >
                <Film className="h-4 w-4" />
                View Projects
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("input");
                  setPrompt("");
                  setStoryboard([]);
                }}
                className="gap-2 border-white/20 text-white hover:bg-white/10"
              >
                <Wand2 className="h-4 w-4" />
                Create Another
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
