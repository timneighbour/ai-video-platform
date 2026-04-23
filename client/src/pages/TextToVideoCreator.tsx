/**
 * WizScript™ — AI Text-to-Video Engine
 * Full Hollywood LED Volume Stage: 3-column layout with numbered config sidebar,
 * central Script Terminal workspace, and right Upgrade Preview panel.
 * Matches the WizScore mockup quality standard.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { RENDER_QUALITY_TIERS, WIZSOUND_TIERS, WIZLUMINAR_CINEMATIC } from "@/lib/pricing";
import ShowcaseVideoSection from "@/components/ShowcaseVideoSection";
import { analytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Wand2, Sparkles, RefreshCw, Play, ChevronRight, Pause,
  Zap, CheckCircle2, Clock, ArrowLeft, Loader2,
  AlertCircle, Download, ExternalLink, Plus, Trash2, Copy, ImageIcon,
  Film, Eye, Check, Headphones, SlidersHorizontal,
} from "@/lib/icons";
import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import CreditBalance from "@/components/CreditBalance";
import { VoicePromptButton } from "@/components/VoicePromptButton";
import { LowCreditBanner } from "@/components/LowCreditBanner";
import { useCreditGuard } from "@/hooks/useCreditGuard";
import AuthGate from "@/components/AuthGate";
import { WizBrandBadge } from "@/components/WizBrand";
import { useSEO } from "@/hooks/useSEO";

/* ── Constants ────────────────────────────────────────────────────────────── */
const ENV_IMG = "/manus-storage/env-hollywood-studio_1da3e15e.jpg";

const VIDEO_STYLES = [
  { id: "cinematic",    label: "Cinematic",    desc: "Hollywood-quality realism",       image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&q=80" },
  { id: "anime",        label: "Anime",         desc: "Japanese animation style",        image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80" },
  { id: "pixar",        label: "Stylised 3D",  desc: "Vibrant 3D animation",            image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80" },
  { id: "documentary",  label: "Documentary",   desc: "Authentic & raw footage",         image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&q=80" },
  { id: "abstract",     label: "Abstract",      desc: "Artistic visual journey",         image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&q=80" },
  { id: "vintage",      label: "Vintage",       desc: "Retro film grain aesthetic",      image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80" },
  { id: "neon_noir",    label: "Neon Noir",     desc: "Dark cyberpunk neon glow",        image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80" },
  { id: "disney",       label: "Disney",        desc: "Magical Disney animation",        image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/kids-style-disney-Ps9izwb4mjU6QbawNJEZ9C.webp" },
  { id: "epic_fantasy", label: "Epic Fantasy",  desc: "Dramatic magical landscapes",     image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80" },
  { id: "realistic",    label: "Realistic",     desc: "Photorealistic true-to-life",     image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80" },
  { id: "horror",       label: "Horror",        desc: "Dark atmospheric tension",        image: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=400&q=80" },
  { id: "watercolor",   label: "Watercolour",   desc: "Painterly soft art style",        image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80" },
  { id: "cyberpunk",    label: "Cyberpunk",     desc: "Neon-lit dystopian future",       image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" },
  { id: "oil_painting", label: "Oil Painting",  desc: "Rich classical art style",        image: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&q=80" },
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
  { label: "WizRender™ is building final video…",           pct: 82 },
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
  id: number; title: string; description: string; visualNotes: string; duration: string; previewImageUrl?: string; previewLoading?: boolean;
};

type Stage = "prompt" | "storyboard" | "upgrade" | "render";
const STAGES: { id: Stage; label: string }[] = [
  { id: "prompt", label: "YOUR PROMPT" },
  { id: "storyboard", label: "STORYBOARD" },
  { id: "upgrade", label: "UPGRADE PREVIEW" },
  { id: "render", label: "RENDER & EXPORT" },
];
type RenderQuality = "hd" | "4k" | "8k";
type VisualTier = "original" | "enhanced" | "cinematic";

let nextSceneId = 300;

function generateStoryboard(prompt: string, style: string): StoryboardScene[] {
  const styleLabel = VIDEO_STYLES.find((s) => s.id === style)?.label || "Cinematic";
  return [
    { id: 1, title: "Opening Shot", description: `Establish the scene: ${prompt.slice(0, 80)}…`, visualNotes: `${styleLabel} style. Wide establishing shot. Set the mood and atmosphere.`, duration: "3s" },
    { id: 2, title: "Main Action", description: `The core visual: ${prompt.slice(0, 100)}`, visualNotes: `${styleLabel} style. Dynamic movement. Focus on the key subject.`, duration: "5s" },
    { id: 3, title: "Closing Shot", description: "A satisfying conclusion to the visual narrative.", visualNotes: `${styleLabel} style. Slow fade or dramatic close-up. Memorable final frame.`, duration: "3s" },
  ];
}

/* ── Spectrum Analyzer ────────────────────────────────────────────────────── */
function SpectrumAnalyzer() {
  return (
    <div className="w-full h-16 flex items-end gap-[2px] px-4 overflow-hidden">
      {Array.from({ length: 120 }).map((_, i) => {
        const h = Math.sin(i * 0.15) * 30 + Math.random() * 25 + 15;
        const hue = (i / 120) * 300;
        return <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: `hsl(${hue}, 80%, 55%)`, opacity: 0.85 }} />;
      })}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────────────── */
export default function TextToVideoCreator() {
  useSEO({ title: "AI Text to Video Generator — WIZ AI", path: "/text-to-video", description: "Turn any text prompt into a cinematic AI video. Describe your vision and WIZ AI generates stunning visuals with WizGenesis™ prompt enhancement and WizLumina™ grading." });
  const { user, isAuthenticated } = useAuth();
  const { balance: creditBalance } = useCreditGuard();
  const [, setLocation] = useLocation();

  // ── Form state ──
  const [step, setStep] = useState<"input" | "storyboard" | "generating" | "done">("input");
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [duration, setDuration] = useState("10");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [storyboard, setStoryboard] = useState<StoryboardScene[]>([]);
  const [regenerating, setRegenerating] = useState(false);

  // ── Mockup state ──
  const [activeStage, setActiveStage] = useState<Stage>("prompt");
  const [completedStages] = useState<Stage[]>([]);
  const [activeTier, setActiveTier] = useState<VisualTier>("original");
  const [renderQuality, setRenderQuality] = useState<RenderQuality>("hd");

  // ── Generation state ──
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
    setProgressPct(PROGRESS_STAGES[0].pct); setProgressStage(0);
    let stageIdx = 0;
    stageIntervalRef.current = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, PROGRESS_STAGES.length - 1);
      setProgressStage(stageIdx); setProgressPct(PROGRESS_STAGES[stageIdx].pct);
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
        if (result.status === "completed" && result.videoUrl) { stopProgressAnimation(); setProgressPct(100); setGeneratedVideoUrl(result.videoUrl); setStep("done"); toast.success("Your video is ready!"); }
        else if (result.status === "failed") { stopProgressAnimation(); setGenerationError(result.error || "Video generation failed."); setStep("storyboard"); toast.error(result.error || "Video generation failed."); }
      } catch { /* network hiccup */ }
    }, 8000);
  }, [utils, stopProgressAnimation]);

  const generateVideoMutation = trpc.billing.generateVideo.useMutation({
    onSuccess: (data) => {
      if (data.projectId) { setProjectId(data.projectId); startPolling(data.projectId); }
      if (data.status === "completed") { stopProgressAnimation(); setProgressPct(100); setStep("done"); toast.success("Your video is ready!"); }
    },
    onError: (err) => { stopProgressAnimation(); setGenerationError(err.message || "Video generation failed."); setStep("storyboard"); toast.error(err.message || "Video generation failed."); },
  });

  const generateScenePreviewMutation = trpc.billing.generateScenePreview.useMutation();

  const generatePreviewForScene = useCallback(async (sceneId: number) => {
    const scene = storyboard.find((s) => s.id === sceneId);
    if (!scene) return;
    setStoryboard((prev) => prev.map((s) => s.id === sceneId ? { ...s, previewLoading: true } : s));
    try {
      const styleLabel = VIDEO_STYLES.find((s) => s.id === style)?.label || style;
      const result = await generateScenePreviewMutation.mutateAsync({ sceneTitle: scene.title, sceneDescription: scene.description, visualNotes: scene.visualNotes, style: styleLabel });
      setStoryboard((prev) => prev.map((s) => s.id === sceneId ? { ...s, previewLoading: false, previewImageUrl: result.imageUrl } : s));
    } catch {
      setStoryboard((prev) => prev.map((s) => s.id === sceneId ? { ...s, previewLoading: false } : s));
      toast.error("Preview generation failed for this scene.");
    }
  }, [storyboard, style, generateScenePreviewMutation]);

  const generateAllPreviews = useCallback(async (scenes: StoryboardScene[]) => {
    for (const scene of scenes) { await generatePreviewForScene(scene.id); }
  }, [generatePreviewForScene]);

  const handleGenerateStoryboard = useCallback(() => {
    if (!prompt.trim() || prompt.length < 10) { toast.error("Please enter a prompt (at least 10 characters)."); return; }
    const scenes = generateStoryboard(prompt, style);
    setStoryboard(scenes); setStep("storyboard");
    setTimeout(() => generateAllPreviews(scenes), 300);
  }, [prompt, style, generateAllPreviews]);

  const handleRegenerateStoryboard = useCallback(() => {
    setRegenerating(true);
    setTimeout(() => {
      const scenes = generateStoryboard(prompt + " " + Math.random().toString(36).slice(2, 6), style);
      setStoryboard(scenes); setRegenerating(false); toast.success("Storyboard regenerated!");
      generateAllPreviews(scenes);
    }, 1200);
  }, [prompt, style, generateAllPreviews]);

  const updateScene = useCallback((id: number, field: keyof StoryboardScene, value: string) => {
    setStoryboard((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  const addScene = useCallback(() => {
    const styleLabel = VIDEO_STYLES.find((s) => s.id === style)?.label || "Cinematic";
    setStoryboard((prev) => [...prev, { id: ++nextSceneId, title: "New Scene", description: "Describe what happens…", visualNotes: `${styleLabel} style.`, duration: "3s" }]);
    toast.success("Scene added!");
  }, [style]);

  const removeScene = useCallback((id: number) => {
    setStoryboard((prev) => { if (prev.length <= 1) { toast.error("Need at least one scene."); return prev; } return prev.filter((s) => s.id !== id); });
  }, []);

  const copySceneText = useCallback((scene: StoryboardScene) => {
    navigator.clipboard.writeText(`${scene.title}\n${scene.description}\nVisual notes: ${scene.visualNotes}`).then(() => toast.success("Copied!"));
  }, []);

  const handleRenderVideo = useCallback(() => {
    if (!isAuthenticated) { setShowAuthGate(true); return; }
    analytics.renderVideoClicked("text_to_video_creator");
    setGenerationError(null); setGeneratedVideoUrl(null); setProjectId(null);
    setStep("generating"); startProgressAnimation();
    generateVideoMutation.mutate({ toolType: "text_to_video", prompt, options: { style, duration, aspectRatio } });
  }, [isAuthenticated, prompt, style, duration, aspectRatio, generateVideoMutation, startProgressAnimation]);

  const stepIndex = { input: 0, storyboard: 1, generating: 2, done: 2 }[step];
  const styleObj = VIDEO_STYLES.find((s) => s.id === style);

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: "#06050a" }}>
      {/* ── VR Environment: Hollywood LED Volume Stage ── */}
      <div className="env-bg"><img src={ENV_IMG} alt="" /><div className="env-bg-overlay" /></div>
      <div className="env-ambient env-tint-cinematic" />
      <AuthGate open={showAuthGate} onClose={() => setShowAuthGate(false)} featureName="build your video" returnPath="/text-to-video" />

      {/* ══════════════ TOP NAV ══════════════ */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => { if (step === "storyboard") setStep("input"); else window.location.href = "/"; }} className="text-white/40 hover:text-white/70 text-sm flex items-center gap-1.5 transition-colors"><ArrowLeft className="w-3.5 h-3.5" /> Back to Studio</button>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg tracking-tight">WIZSCRIPT</span>
              <span className="bg-[--color-gold] text-black text-[10px] font-bold px-2 py-0.5 rounded tracking-widest">AI VIDEO ENGINE</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-xs text-white/40 font-semibold tracking-widest">
            {["CINEMATIC", "ANIME", "3D", "DOCUMENTARY"].map((g, i) => (
              <span key={g} className="flex items-center gap-1">{i > 0 && <span className="text-white/15 mx-1">·</span>}<span className="hover:text-white/70 cursor-pointer transition-colors">{g}</span></span>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <CreditBalance variant="badge" />
            <div className="w-8 h-8 rounded-full bg-[--color-gold]/20 border border-[--color-gold]/30 flex items-center justify-center text-[--color-gold] text-xs font-bold">{user?.name?.charAt(0) || "T"}</div>
          </div>
        </div>
        {/* ── 4-Stage Workflow Bar ── */}
        <div className="border-t border-white/[0.04] bg-[#0a0a0f]/60">
          <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-center gap-2">
            {STAGES.map((s, i) => {
              const isActive = activeStage === s.id;
              const isDone = completedStages.includes(s.id);
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <button onClick={() => setActiveStage(s.id)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all ${isActive ? "bg-[--color-gold]/20 border border-[--color-gold]/40 text-[--color-gold] shadow-[0_0_15px_rgba(184,137,42,0.2)]" : isDone ? "text-white/60 hover:text-white/80" : "text-white/30 hover:text-white/50"}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isDone ? "bg-green-500/20 text-green-400" : isActive ? "bg-[--color-gold]/30 text-[--color-gold]" : "bg-white/10"}`}>{isDone ? <Check className="w-3 h-3" /> : i + 1}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STAGES.length - 1 && <ChevronRight className="w-3 h-3 text-white/15" />}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── VR Hero Banner ── */}
      <div className="relative h-[180px] overflow-hidden">
        <img src={ENV_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: "brightness(0.45) saturate(1.2)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06050a] via-[#06050a]/30 to-transparent" />
        <div className="absolute top-4 left-4 z-10 studio-card rounded-xl px-4 py-2.5">
          <p className="text-[9px] text-white/40 font-bold tracking-widest uppercase">CURRENT PROJECT</p>
          <p className="text-white/80 text-sm font-bold italic">{prompt ? prompt.slice(0, 40) + "…" : "New Video"}</p>
          <p className="text-white/30 text-[10px]">{styleObj?.label || "Cinematic"} · {duration}s · {aspectRatio}</p>
        </div>
        <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-[10px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> STAGE READY</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0"><SpectrumAnalyzer /></div>
      </div>

      {/* ══════════════ MAIN 3-COLUMN LAYOUT ══════════════ */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_280px] gap-4">

          {/* ── LEFT SIDEBAR: Video Configuration ── */}
          <aside className="space-y-5">
            {/* 1. Video Style */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-white/70 tracking-widest uppercase mb-3">
                <span className="w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] flex items-center justify-center text-[10px] font-bold">1</span>
                Video Style
              </h3>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {VIDEO_STYLES.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all ${style === s.id ? "bg-[--color-gold]/15 border border-[--color-gold]/30" : "bg-white/[0.03] border border-white/[0.06] hover:border-white/15"}`}>
                    <img src={s.image} alt={s.label} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    <div>
                      <p className={`text-[11px] font-semibold ${style === s.id ? "text-[--color-gold]" : "text-white/60"}`}>{s.label}</p>
                      <p className="text-[9px] text-white/30">{s.desc}</p>
                    </div>
                    {style === s.id && <Check className="w-3 h-3 text-[--color-gold] ml-auto flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Duration */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-white/70 tracking-widest uppercase mb-3">
                <span className="w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] flex items-center justify-center text-[10px] font-bold">2</span>
                Duration
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {DURATIONS.map(d => (
                  <button key={d.id} onClick={() => setDuration(d.id)} className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all ${duration === d.id ? "bg-[--color-gold]/20 border-[--color-gold]/40 text-[--color-gold]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}>
                    {d.label}<span className="text-[8px] ml-1 opacity-60">{d.credits}cr</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Aspect Ratio */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-white/70 tracking-widest uppercase mb-3">
                <span className="w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] flex items-center justify-center text-[10px] font-bold">3</span>
                Aspect Ratio
              </h3>
              <div className="flex gap-1.5">
                {ASPECT_RATIOS.map(r => (
                  <button key={r.id} onClick={() => setAspectRatio(r.id)} className={`flex-1 py-2 rounded-xl text-center border transition-all ${aspectRatio === r.id ? "bg-[--color-gold]/15 border-[--color-gold]/30 text-[--color-gold]" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}>
                    <p className="text-xs font-bold">{r.id}</p>
                    <p className="text-[9px] text-white/30">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Script Brief */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-white/70 tracking-widest uppercase mb-3">
                <span className="w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] flex items-center justify-center text-[10px] font-bold">4</span>
                Script Brief
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <VoicePromptButton toolContext="text-to-video generation" onPromptReady={(refined) => setPrompt(refined)} />
                <span className="text-white/25 text-[10px]">or type below</span>
              </div>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={5} maxLength={2000} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white/70 text-xs resize-none focus:border-[--color-gold]/30 focus:outline-none transition-colors font-mono" placeholder="A lone astronaut walking across a red Martian landscape at sunset…" />
              <p className="text-[10px] text-white/30 mt-1">{prompt.length}/2000</p>
            </div>
          </aside>

          {/* ── CENTER: Script Terminal Workspace ── */}
          <main className="space-y-4">
            {/* Step 1: Input */}
            {step === "input" && (
              <>
                {/* Script Terminal Console */}
                <div className="studio-card rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[--color-gold]/10 bg-black/40">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${prompt.length >= 10 ? "bg-green-500" : "bg-white/20"}`} />
                      <span className="text-[10px] text-white/40 font-bold tracking-widest uppercase">SCRIPT TERMINAL</span>
                      <span className={`text-[10px] font-mono ${prompt.length >= 10 ? "text-green-400" : "text-white/20"}`}>{prompt.length >= 10 ? "● READY" : "○ AWAITING INPUT"}</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/15 px-4 py-1.5 text-xs text-[--color-gold] mb-3"><Sparkles className="h-3.5 w-3.5" /> See your full storyboard before you build — always free</div>
                      <h1 className="text-2xl font-bold text-white mb-2">WizScript™ — Text to Video</h1>
                      <p className="text-white/40 text-sm">Describe what you want to see. We'll generate a storyboard with AI preview images for you to review and edit before building.</p>
                    </div>

                    {/* Quick load examples */}
                    <div className="mb-4">
                      <p className="text-[10px] font-mono text-white/30 mb-2 uppercase tracking-widest">▶ Quick load:</p>
                      <div className="flex flex-wrap gap-2">
                        {EXAMPLE_PROMPTS.slice(0, 3).map((ex, i) => (
                          <button key={i} onClick={() => setPrompt(ex)} className="text-xs font-mono rounded border border-[--color-gold]/20 bg-[--color-gold]/8 px-3 py-1 text-[--color-gold]/70 hover:text-[--color-gold] hover:border-[--color-gold]/40 transition text-left">{ex.slice(0, 50)}…</button>
                        ))}
                      </div>
                    </div>

                    {/* Video Style Grid */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-white/90 uppercase tracking-wider mb-3">Video Style</label>
                      <div className="grid grid-cols-3 gap-2">
                        {VIDEO_STYLES.slice(0, 6).map(s => (
                          <button key={s.id} onClick={() => setStyle(s.id)} className={`relative rounded-xl overflow-hidden border-2 transition-all group ${style === s.id ? "border-[--color-gold] shadow-lg shadow-[--color-gold]/20" : "border-white/10 hover:border-white/30"}`} style={{ aspectRatio: "16/9" }}>
                            <img src={s.image} alt={s.label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                            {style === s.id && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[--color-gold] flex items-center justify-center"><CheckCircle2 className="h-3 w-3 text-black" /></div>}
                            <div className="absolute bottom-0 left-0 right-0 p-2"><div className="text-xs font-bold text-white">{s.label}</div><div className="text-[10px] text-white/60 hidden sm:block">{s.desc}</div></div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Generate Storyboard CTA */}
                    <Button size="lg" onClick={handleGenerateStoryboard} disabled={prompt.length < 10} className="w-full gap-2 btn-primary btn-sheen border-0 py-4 text-base disabled:opacity-50">
                      <Wand2 className="h-5 w-5" /> Generate Free Storyboard
                    </Button>
                    <p className="text-xs text-white/30 mt-2 text-center">Free storyboard preview · Credits only charged on final build</p>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Storyboard */}
            {step === "storyboard" && (
              <div className="space-y-4">
                <div className="text-center mb-2">
                  <div className="inline-flex items-center gap-2.5 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/10 px-4 py-1.5 text-xs font-mono text-[--color-gold] mb-2"><span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" /> PRE-PRODUCTION → STORYBOARD REVIEW</div>
                  <h2 className="text-xl font-bold text-white mb-1">Director's Storyboard</h2>
                  <p className="text-sm text-white/40">Review each scene. Edit descriptions, regenerate previews, then render.</p>
                </div>
                {generationError && <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"><AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{generationError}</span></div>}
                {storyboard.map((scene, i) => (
                  <div key={scene.id} className="studio-card rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.08] bg-black/40">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-[--color-gold]/10 border border-[--color-gold]/25 rounded px-2 py-0.5"><span className="text-[10px] font-mono font-bold text-[--color-gold]/70 tracking-widest">SCN</span><span className="text-sm font-bold text-[--color-gold] font-mono">{String(i + 1).padStart(2, "0")}</span></div>
                        <input value={scene.title} onChange={(e) => updateScene(scene.id, "title", e.target.value)} className="bg-transparent text-sm font-semibold text-white border-none outline-none focus:ring-1 focus:ring-[--color-gold]/50 rounded px-1" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${scene.previewImageUrl ? "bg-green-500" : scene.previewLoading ? "bg-[--color-gold] animate-pulse" : "bg-white/20"}`} />
                        <button onClick={() => generatePreviewForScene(scene.id)} className="p-1.5 rounded-lg text-white/30 hover:text-[--color-gold] transition"><RefreshCw className="h-3.5 w-3.5" /></button>
                        <button onClick={() => copySceneText(scene)} className="p-1.5 rounded-lg text-white/30 hover:text-white transition"><Copy className="h-3.5 w-3.5" /></button>
                        <button onClick={() => removeScene(scene.id)} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {scene.previewLoading && <div className="mx-4 mt-4 aspect-video rounded-xl bg-white/[0.03] flex items-center justify-center"><Loader2 className="w-6 h-6 text-[--color-gold] animate-spin" /></div>}
                    {!scene.previewLoading && scene.previewImageUrl && <div className="mx-4 mt-4 aspect-video rounded-xl overflow-hidden relative"><img src={scene.previewImageUrl} alt={scene.title} className="w-full h-full object-cover" /><div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1 bg-black/60"><span className="text-[9px] font-mono text-white/40 tracking-widest">PREVIEW • {style.toUpperCase()}</span><span className="w-1.5 h-1.5 rounded-full bg-green-500" /></div></div>}
                    {!scene.previewLoading && !scene.previewImageUrl && <button onClick={() => generatePreviewForScene(scene.id)} className="mx-4 mt-4 aspect-video rounded-xl bg-white/[0.03] border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-[--color-gold]/30 transition w-[calc(100%-2rem)]"><ImageIcon className="h-6 w-6 text-white/20" /><span className="text-[10px] text-white/30">▶ GENERATE PREVIEW</span></button>}
                    <div className="px-4 pt-3 pb-2"><Textarea value={scene.description} onChange={(e) => updateScene(scene.id, "description", e.target.value)} className="bg-white/[0.03] border-white/10 text-white text-sm resize-none min-h-[60px] rounded-xl" placeholder="Scene description…" /></div>
                    <div className="px-4 pb-4"><Textarea value={scene.visualNotes} onChange={(e) => updateScene(scene.id, "visualNotes", e.target.value)} className="bg-white/[0.03] border-white/10 text-white/50 text-xs resize-none min-h-[48px] rounded-xl" placeholder="Visual direction…" /></div>
                  </div>
                ))}
                <button onClick={addScene} className="w-full rounded-2xl border-2 border-dashed border-[--color-gold]/30 py-4 flex items-center justify-center gap-2 text-sm text-white/30 hover:text-[--color-gold] hover:bg-[--color-gold]/5 transition"><Plus className="h-4 w-4" /> Add Scene</button>
                <LowCreditBanner balance={creditBalance} estimatedCost={creditCost} variant="inline" dismissible />
                <div className="studio-card rounded-2xl p-5 space-y-4">
                  <div><div className="flex items-center gap-2 mb-1"><Zap className="h-4 w-4 text-yellow-400" /><span className="font-semibold text-white">Ready to build?</span></div><p className="text-sm text-white/40">Final build costs <span className="text-white font-semibold">{creditCost} credits</span> for {duration}s · {styleObj?.label} · {aspectRatio}</p><div className="mt-2"><CreditBalance variant="inline" cost={creditCost} /></div></div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleRegenerateStoryboard} disabled={regenerating} className="gap-2 border-white/20 text-white hover:bg-white/10 flex-1">{regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Regenerate Free</Button>
                    <Button onClick={handleRenderVideo} className="gap-2 btn-primary btn-sheen border-0 flex-1"><Play className="h-4 w-4" /> Build Video — {creditCost} Credits</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Generating */}
            {step === "generating" && (
              <div className="flex flex-col items-center justify-center py-16 space-y-8 text-center">
                <div className="h-20 w-20 rounded-full bg-[--color-gold]/15 border border-[--color-gold]/30 flex items-center justify-center"><Wand2 className="h-9 w-9 text-[--color-gold] animate-pulse" /></div>
                <div><WizBrandBadge layer="render" size="md" animated /><h2 className="text-xl font-bold text-white mb-2 mt-3">Rendering with WizRender™…</h2><p className="text-white/40 text-sm">Usually takes 2–5 minutes.</p></div>
                <div className="w-full max-w-md space-y-3"><Progress value={progressPct} className="h-3 rounded-full" /><p className="text-sm text-[--color-gold] font-medium">{PROGRESS_STAGES[progressStage].label}</p><p className="text-xs text-white/30">{progressPct}% complete</p></div>
                <div className="space-y-2 w-full max-w-md">
                  {PROGRESS_STAGES.map((stage, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">{i < progressStage ? <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" /> : i === progressStage ? <Loader2 className="h-4 w-4 text-[--color-gold] animate-spin flex-shrink-0" /> : <div className="h-4 w-4 rounded-full border border-white/20 flex-shrink-0" />}<span className={i <= progressStage ? "text-white" : "text-white/25"}>{stage.label}</span></div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Done */}
            {step === "done" && (
              <div className="flex flex-col items-center justify-center py-10 space-y-8 text-center">
                <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center"><CheckCircle2 className="h-8 w-8 text-green-400" /></div>
                <div><h2 className="text-2xl font-bold text-white mb-2">Your Video is Ready!</h2><p className="text-white/40">Watch your AI-generated video below.</p></div>
                {generatedVideoUrl ? <div className="w-full max-w-2xl rounded-2xl overflow-hidden border border-[--color-gold]/30 bg-black"><video src={generatedVideoUrl} controls autoPlay muted playsInline className="w-full" style={{ maxHeight: "400px" }} /></div> : <div className="w-full max-w-2xl rounded-2xl border border-[--color-gold]/30 bg-[--color-gold]/15 aspect-video flex items-center justify-center"><Loader2 className="h-8 w-8 text-[--color-gold] animate-spin" /></div>}
                <div className="flex gap-3 w-full max-w-md">
                  {generatedVideoUrl && <><Button variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10 flex-1" onClick={() => { const a = document.createElement("a"); a.href = generatedVideoUrl; a.download = "text-to-video.mp4"; a.click(); }}><Download className="h-4 w-4" /> Download</Button><Button variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10 flex-1" onClick={() => window.open(generatedVideoUrl, "_blank")}><ExternalLink className="h-4 w-4" /> Open</Button></>}
                  <a href="/projects" className="inline-flex items-center justify-center gap-2 rounded-md btn-primary btn-sheen flex-1 px-4 py-2 text-sm font-medium">View All Projects</a>
                </div>
                <button onClick={() => { setStep("input"); setPrompt(""); setStoryboard([]); setGeneratedVideoUrl(null); setProjectId(null); setGenerationError(null); }} className="text-sm text-white/30 hover:text-white transition underline underline-offset-4">Create another video</button>
              </div>
            )}
          </main>

          {/* ── RIGHT SIDEBAR: Upgrade Preview ── */}
          <aside className="space-y-4">
            {/* Hear & See the Difference */}
            <div className="studio-card rounded-2xl p-4">
              <h3 className="flex items-center gap-2 text-[--color-gold] text-xs font-bold tracking-wider mb-2"><Sparkles className="w-3.5 h-3.5" /> HEAR & SEE THE DIFFERENCE</h3>
              <p className="text-white/30 text-[10px] leading-relaxed mb-4">Preview in all three quality tiers — no download until payment confirmed.</p>
              <div className="flex rounded-lg overflow-hidden border border-white/10 mb-4">
                {(["original", "enhanced", "cinematic"] as VisualTier[]).map(t => (
                  <button key={t} onClick={() => setActiveTier(t)} className={`flex-1 py-2 text-[10px] font-bold tracking-wider transition-all ${activeTier === t ? "bg-[--color-gold]/20 text-[--color-gold]" : "bg-white/5 text-white/30 hover:text-white/50"}`}>
                    {t.toUpperCase()}
                    {t !== "original" && <span className="block text-[8px] text-[--color-gold]/60">+£{t === "enhanced" ? "2.99" : "4.99"}</span>}
                  </button>
                ))}
              </div>
              <div className="rounded-xl overflow-hidden bg-white/[0.03] aspect-video mb-3">
                <img src={ENV_IMG} alt="" className="w-full h-full object-cover" style={{ filter: `brightness(${activeTier === "cinematic" ? 0.8 : activeTier === "enhanced" ? 0.6 : 0.4}) saturate(${activeTier === "cinematic" ? 1.4 : activeTier === "enhanced" ? 1.1 : 0.8})` }} />
              </div>
              <p className="text-white/30 text-[9px] font-bold tracking-widest uppercase mb-1">WIZSCRIPT™ — {activeTier.toUpperCase()} RENDER</p>
              <p className="text-white/70 text-xs font-semibold mb-2">{prompt ? prompt.slice(0, 30) + "…" : "New Video"}</p>
              <div className="flex items-center gap-3 mb-3">
                <button className="w-8 h-8 rounded-full bg-[--color-gold] flex items-center justify-center shadow-[0_0_12px_rgba(184,137,42,0.3)]"><Play className="w-3.5 h-3.5 text-black ml-0.5" /></button>
                <span className="text-white/40 text-[11px] font-mono">0:00 / {duration}s</span>
              </div>
            </div>

            {/* WizLuminar Visual Quality */}
            <div className="studio-card rounded-2xl p-4">
              <h3 className="text-white/60 text-xs font-bold tracking-wider mb-3">WIZLUMINAR™ — VISUAL QUALITY</h3>
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                {["ORIGINAL", "ENHANCED", "CINEMATIC"].map((t, i) => (
                  <button key={t} className={`flex-1 py-2 text-[10px] font-bold tracking-wider transition-all ${i === 0 ? "bg-white/10 text-white/70" : "bg-white/5 text-white/30 hover:text-white/50"}`}>{t}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-3">
                {[0.3, 0.5, 0.8].map((b, i) => (
                  <div key={i} className="aspect-video rounded-lg overflow-hidden bg-white/5"><img src={ENV_IMG} alt="" className="w-full h-full object-cover" style={{ filter: `brightness(${b}) saturate(${0.8 + i * 0.3})` }} /></div>
                ))}
              </div>
            </div>

            {/* Upsell buttons */}
            <button className="w-full btn-primary btn-sheen py-2.5 rounded-xl text-xs font-bold flex items-center justify-between px-4"><span className="flex items-center gap-2"><Headphones className="w-3.5 h-3.5" /> WizSound™ Cinematic</span><span>{WIZSOUND_TIERS.CINEMATIC.price}</span></button>
            <button className="w-full border border-[--color-gold]/30 bg-[--color-gold]/5 hover:bg-[--color-gold]/10 text-[--color-gold] py-2.5 rounded-xl text-xs font-bold flex items-center justify-between px-4 transition-colors"><span className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> WizLuminar™ Cinematic</span><span>{WIZLUMINAR_CINEMATIC.price}</span></button>

            {/* Render Quality */}
            <div className="studio-card rounded-2xl p-4">
              <h3 className="text-white/60 text-xs font-bold tracking-wider mb-3">RENDER QUALITY</h3>
              <div className="grid grid-cols-3 gap-2">
                {([{ id: "hd" as RenderQuality, label: RENDER_QUALITY_TIERS[0].label, sub: "standard", price: RENDER_QUALITY_TIERS[0].price }, { id: "4k" as RenderQuality, label: RENDER_QUALITY_TIERS[1].label, sub: "studio", price: RENDER_QUALITY_TIERS[1].price }, { id: "8k" as RenderQuality, label: RENDER_QUALITY_TIERS[2].label, sub: "master", price: RENDER_QUALITY_TIERS[2].price }]).map(q => (
                  <button key={q.id} onClick={() => setRenderQuality(q.id)} className={`rounded-xl p-3 text-center transition-all border ${renderQuality === q.id ? "bg-[--color-gold]/15 border-[--color-gold]/40 shadow-[0_0_12px_rgba(184,137,42,0.15)]" : "bg-white/5 border-white/10 hover:border-white/20"}`}>
                    <p className={`text-sm font-bold ${renderQuality === q.id ? "text-[--color-gold]" : "text-white/60"}`}>{q.label}</p>
                    <p className="text-[9px] text-white/30">{q.sub}</p>
                    <p className={`text-[10px] font-bold mt-1 ${renderQuality === q.id ? "text-[--color-gold]" : "text-white/40"}`}>{q.price}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Render CTA */}
            <button className="w-full btn-primary btn-sheen py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"><Film className="w-4 h-4" /> RENDER VIDEO — {renderQuality.toUpperCase()}</button>
          </aside>
        </div>
      </div>

      {/* Showcase — only on input step */}
      {step === "input" && (
        <ShowcaseVideoSection
          title="See what WIZ AI can generate"
          subtitle="AI video showcase"
          description="Every video created from a text prompt. No footage, no editing, no crew."
          ctaLabel="Start Creating"
          ctaHref="/onboarding"
          items={[
            { id: 30001, title: "Midnight City — Cinematic Style", category: "Cinematic AI Video", posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-cinematic-jTTeeqZXf4L3U5HPJLwD4n.webp", videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-cinematic_13667434.mp4", description: "A lone figure walks rain-soaked streets under warm city lights." },
            { id: 30002, title: "Stage Performance — Music Video Style", category: "Music Video", posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-music-video-6dF3UkNuwxfUVSax7gz7xi.webp", videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-music-video_19324f13.mp4", description: "Full music video with synced visuals and cinematic effects." },
            { id: 30003, title: "Star Quest — Kids Channel Intro", category: "Animation", posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-kids-fxm6wHeSYgLJUHFdQPtC6r.webp", videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-kids_d49d86f8.mp4", description: "Cinematic 3D animation for a kids YouTube channel." },
          ]}
        />
      )}
    </div>
  );
}
