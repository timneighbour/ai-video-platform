import { useState, useEffect, useRef } from "react";
import { mp } from "@/lib/mixpanel";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import {
  Sparkles, Play, Download, ChevronRight, ChevronLeft,
  Loader2, Film, Zap, Clock, CheckCircle2, AlertCircle,
  Youtube, Music2, Smartphone
} from "@/lib/icons";

// ─── Types ───────────────────────────────────────────────────────────────────

type Platform = "youtube_shorts" | "tiktok" | "reels";
type VisualStyle = "cinematic" | "anime" | "realistic" | "cartoon" | "neon-noir" | "minimalist" | "documentary" | "epic-fantasy" | "vintage" | "horror" | "watercolor" | "cyberpunk";
type WizStep = "setup" | "scenes" | "render";

interface Scene {
  index: number;
  prompt: string;
  caption: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "youtube_shorts", label: "YouTube Shorts", icon: <Youtube className="w-4 h-4" />, color: "from-red-600 to-red-500" },
  { id: "tiktok", label: "TikTok", icon: <Music2 className="w-4 h-4" />, color: "from-[#9090a0] to-[#2e2e36]" },
  { id: "reels", label: "Instagram Reels", icon: <Smartphone className="w-4 h-4" />, color: "from-[#b8892a] to-orange-500" },
];

const DURATIONS = [15, 30, 45, 60];

const VISUAL_STYLES: { id: VisualStyle; label: string; desc: string; image: string }[] = [
  { id: "cinematic",    label: "Cinematic",     desc: "Film-quality, dramatic lighting",    image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&q=80" },
  { id: "anime",        label: "Anime",          desc: "Vibrant, Studio Ghibli-inspired",    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80" },
  { id: "realistic",   label: "Realistic",      desc: "Natural, true-to-life footage",      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80" },
  { id: "cartoon",     label: "Cartoon",        desc: "Bold, animated, colourful fun",      image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80" },
  { id: "neon-noir",   label: "Neon Noir",      desc: "Cyberpunk, rain-slicked streets",    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80" },
  { id: "minimalist",  label: "Minimalist",     desc: "Clean, elegant, modern",             image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&q=80" },
  { id: "documentary", label: "Documentary",    desc: "Authentic raw footage style",        image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&q=80" },
  { id: "epic-fantasy",label: "Epic Fantasy",   desc: "Dramatic magical landscapes",        image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80" },
  { id: "vintage",     label: "Vintage",        desc: "Retro film grain aesthetic",         image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80" },
  { id: "horror",      label: "Horror",         desc: "Dark atmospheric tension",           image: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=400&q=80" },
  { id: "watercolor",  label: "Watercolour",    desc: "Painterly, soft artistic style",     image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80" },
  { id: "cyberpunk",   label: "Cyberpunk",      desc: "Neon-lit dystopian future",          image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80" },
];

const EXAMPLE_TOPICS = [
  "A day in the life of a street food chef in Tokyo",
  "5 mind-blowing facts about the deep ocean",
  "How to make the perfect espresso at home",
  "The rise and fall of the Roman Empire in 30 seconds",
  "A motivational message about chasing your dreams",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WizShorts() {

  useSEO({ title: "AI Shorts Creator — WIZ AI", path: "/wiz-shorts", description: "Create viral AI short-form videos for TikTok, YouTube Shorts, and Instagram Reels. Generate eye-catching vertical content in seconds." });
  const { user } = useAuth();
  const [step, setStep] = useState<WizStep>("setup");
  const [jobId, setJobId] = useState<number | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);

  // Setup form state
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("youtube_shorts");
  const [duration, setDuration] = useState(30);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("cinematic");

  // Render state
  const [renderStatus, setRenderStatus] = useState<"idle" | "rendering" | "assembling" | "complete" | "failed">("idle");
  const [completedScenes, setCompletedScenes] = useState(0);
  const [totalScenes, setTotalScenes] = useState(0);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createJobMutation = trpc.wizShorts.createJob.useMutation();
  const generateScenesMutation = trpc.wizShorts.generateScenes.useMutation();
  const startRenderMutation = trpc.wizShorts.startRender.useMutation();
  const pollProgressMutation = trpc.wizShorts.pollProgress.useMutation();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // ── Step 1: Setup → Scenes ────────────────────────────────────────────────

  const handleCreateJob = async () => {
    if (!user) { window.location.href = getLoginUrl(); return; }
    if (!topic.trim()) { toast.error("Please describe your video topic"); return; }

    try {
      const job = await createJobMutation.mutateAsync({
        topic: topic.trim(),
        platform,
        targetDuration: duration,
        visualStyle,
      });

      setJobId(job.jobId);
      setTotalScenes(job.sceneCount);
      mp.projectCreated("WizShorts");
      toast.info(`Generating ${job.sceneCount} scenes...`);

      const scenesResult = await generateScenesMutation.mutateAsync({ jobId: job.jobId });
      setScenes(scenesResult.scenes);
      setStep("scenes");
    } catch (err: any) {
      toast.error(err.message || "Failed to create job");
    }
  };

  // ── Step 2: Scene Review → Render ─────────────────────────────────────────

  const handleStartRender = async () => {
    if (!jobId) return;
    try {
      await startRenderMutation.mutateAsync({ jobId });
      mp.buildStarted("WizShorts");
      setStep("render");
      setRenderStatus("rendering");
      startPolling(jobId);
    } catch (err: any) {
      toast.error(err.message || "Failed to start render");
    }
  };

  const startPolling = (jid: number) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await pollProgressMutation.mutateAsync({ jobId: jid });
        if (result.status === "rendering") {
          setCompletedScenes((result as any).completedScenes ?? 0);
          setTotalScenes((result as any).totalScenes ?? totalScenes);
        } else if (result.status === "complete") {
          clearInterval(pollIntervalRef.current!);
          setRenderStatus("complete");
          setFinalVideoUrl(result.videoUrl ?? null);
          mp.buildCompleted("WizShorts");
          toast.success("Your WizShort is ready!");
        } else if (result.status === "failed") {
          clearInterval(pollIntervalRef.current!);
          setRenderStatus("failed");
          mp.buildFailed("WizShorts");
          toast.error("Build failed. Please try again.");
        }
      } catch (err) {
        // Polling errors are transient — keep trying
      }
    }, 8000);
  };

  const handleDownload = () => {
    if (!finalVideoUrl) return;
    const a = document.createElement("a");
    a.href = finalVideoUrl;
    a.download = "wizshort.mp4";
    a.target = "_blank";
    a.click();
  };

  const handleReset = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setStep("setup");
    setJobId(null);
    setScenes([]);
    setRenderStatus("idle");
    setCompletedScenes(0);
    setFinalVideoUrl(null);
    setTopic("");
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen studio-bg text-white" style={{backgroundColor:'#06050a'}}>
      {/* ── VR Environment: Broadcast Studio ── */}
      <div className="env-bg">
        <img src="/manus-storage/env-broadcast-studio_5a824d1f.jpg" alt="" />
        <div className="env-bg-overlay" />
      </div>
      <div className="env-ambient env-tint-stage" />

      {/* Header */}
      <div className="studio-header sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#b8892a]/30 to-[#1a1a20] border border-[#b8892a]/20 shadow-[0_0_12px_rgba(184,137,42,0.15)]">
              <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
                <rect x="4" y="10" width="24" height="20" rx="3" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M28 16l8-4v16l-8-4V16z" fill="white"/>
                <rect x="8" y="14" width="6" height="2" rx="1" fill="white" opacity="0.7"/>
                <rect x="8" y="18" width="10" height="2" rx="1" fill="white" opacity="0.5"/>
                <rect x="8" y="22" width="7" height="2" rx="1" fill="white" opacity="0.4"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.08em" }}>WIZSHORTS</span>
                <span className="bg-[--color-gold] text-black text-[10px] font-bold px-2 py-0.5 rounded tracking-widest">AI SHORTS ENGINE</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="studio-led studio-led-green" style={{width:5,height:5}} />
                <span className="studio-label">Shorts Studio · Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block studio-waveform">
              <span /><span /><span /><span /><span /><span />
            </div>
            <Badge variant="outline" className="border-[--color-silver]/50 text-[--color-silver] text-xs hidden sm:flex">
              YouTube Shorts · TikTok · Reels
            </Badge>
          </div>
        </div>

        {/* Stage bar — matches mockup exactly */}
        <div className="border-t border-white/10 bg-white/[0.03]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-1 sm:gap-2 py-2.5 overflow-x-auto scrollbar-none">
              {[
                { key: 'setup',    label: 'Platform' },
                { key: 'script',   label: 'Script & Hook' },
                { key: 'scenes',   label: 'Scenes' },
                { key: 'upgrade',  label: 'Upgrade Preview' },
                { key: 'render',   label: 'Render & Publish' },
              ].map((s, i) => {
                const stepOrder = ['setup','script','scenes','upgrade','render'];
                const currentIdx = stepOrder.indexOf(step === 'setup' ? 'setup' : step === 'scenes' ? 'scenes' : 'render');
                const thisIdx = i;
                return (
                  <div key={s.key} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      currentIdx === thisIdx
                        ? 'bg-[--color-gold] text-white shadow-lg shadow-[#b8892a]/30'
                        : currentIdx > thisIdx
                        ? 'bg-[--color-silver]/15 text-[--color-silver]'
                        : 'bg-white/10 text-muted-foreground'
                    }`}>
                      {currentIdx > thisIdx ? <CheckCircle2 className="h-3 w-3" /> : null}
                      {s.label}
                    </div>
                    {i < 4 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[220px_1fr_300px] gap-6">
          {/* ── LEFT SIDEBAR: Config Summary ── */}
          <aside className="hidden lg:block space-y-4 sticky top-40 self-start">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-4">
              <h3 className="text-xs font-bold text-[--color-gold] tracking-widest uppercase">Project Config</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Platform</div>
                  <div className="text-sm text-white font-medium capitalize">{platform.replace('_', ' ')}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration</div>
                  <div className="text-sm text-white font-medium">{duration}s</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Visual Style</div>
                  <div className="text-sm text-white font-medium capitalize">{visualStyle.replace('-', ' ')}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Scenes</div>
                  <div className="text-sm text-white font-medium">{scenes.length > 0 ? `${scenes.length} planned` : `~${Math.ceil(duration / 5)} estimated`}</div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-3">
              <h3 className="text-xs font-bold text-[--color-gold] tracking-widest uppercase">Credits</h3>
              <div className="text-2xl font-bold text-white">{Math.ceil(duration / 5) * 5}</div>
              <div className="text-xs text-muted-foreground">credits for final render</div>
              <div className="text-[10px] text-muted-foreground border-t border-white/10 pt-3 mt-2">
                Scene planning is always free. You only pay when you build your final video.
              </div>
            </div>
          </aside>
          {/* ── CENTER: Main Workspace ── */}
          <div>
        {/* ── STEP 1: Setup ──────────────────────────────────────────────────── */}
        {step === "setup" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            <div className="space-y-6">
              {/* Topic */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">What's your video about?</label>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. 5 mind-blowing facts about the deep ocean..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none h-28 focus:border-[--color-silver]/50"
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white/30">{topic.length}/500</p>
                  <button
                    onClick={() => setTopic(EXAMPLE_TOPICS[Math.floor(Math.random() * EXAMPLE_TOPICS.length)])}
                    className="text-xs text-[--color-silver] hover:text-[--color-silver] transition-colors"
                  >
                    Try example
                  </button>
                </div>
              </div>

              {/* Platform */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white/70">Platform</label>
                <div className="grid grid-cols-3 gap-3">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        platform === p.id
                          ? "border-pink-500 bg-[--color-silver]/10 text-white"
                          : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-1">{p.icon}</div>
                      <div className="text-xs font-medium">{p.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white/70">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        duration === d
                          ? "border-pink-500 bg-[--color-silver]/10 text-white"
                          : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
                      }`}
                    >
                      <Clock className="w-4 h-4 mx-auto mb-1 opacity-70" />
                      <div className="text-sm font-semibold">{d}s</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Style */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-white/90 uppercase tracking-wider">Visual Style</label>
                  <span className="text-xs text-[--color-gold]">{VISUAL_STYLES.find(s => s.id === visualStyle)?.label}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {VISUAL_STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setVisualStyle(s.id)}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all group ${
                        visualStyle === s.id
                          ? "border-[--color-gold] shadow-lg shadow-[--color-gold]/20"
                          : "border-white/10 hover:border-white/30"
                      }`}
                      style={{ aspectRatio: "16/9" }}
                    >
                      <img
                        src={s.image}
                        alt={s.label}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      {visualStyle === s.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[--color-gold] flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-black" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <div className="text-xs font-bold text-white">{s.label}</div>
                        <div className="text-[10px] text-white/60 leading-tight mt-0.5 hidden sm:block">{s.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreateJob}
                disabled={createJobMutation.isPending || generateScenesMutation.isPending || !topic.trim()}
                className="w-full h-12 bg-gradient-to-r from-[#9090a0] to-orange-500 hover:from-[#9090a0] hover:to-orange-400 text-white font-semibold text-base rounded-xl border-0"
              >
                {createJobMutation.isPending || generateScenesMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {generateScenesMutation.isPending ? "Generating scenes with AI..." : "Creating job..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Scene Plan
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Right — Info card */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white/80">How WizShorts works</h3>
                {[
                  { icon: <Sparkles className="w-4 h-4 text-[--color-silver]" />, title: "AI Scene Planning", desc: "GPT breaks your topic into perfectly timed scenes" },
                  { icon: <Film className="w-4 h-4 text-orange-400" />, title: "WizPilot™ Video Generation", desc: "Each scene rendered by our top-ranked AI video engine" },
                  { icon: <Zap className="w-4 h-4 text-yellow-400" />, title: "Auto Assembly", desc: "Scenes stitched together with optional music track" },
                  { icon: <Download className="w-4 h-4 text-[--color-silver]" />, title: "Ready to Upload", desc: "9:16 vertical format, ready for Shorts/TikTok/Reels" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5">{item.icon}</div>
                    <div>
                      <div className="text-xs font-semibold text-white/80">{item.title}</div>
                      <div className="text-xs text-white/40">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-[--color-silver]/20 bg-[--color-silver]/10 p-4">
                <div className="text-xs font-semibold text-[--color-silver] mb-2">Credit estimate</div>
                <div className="text-2xl font-bold text-white">
                  {Math.ceil(duration / 5) * 5}
                  <span className="text-sm font-normal text-white/50 ml-1">credits</span>
                </div>
                <div className="text-xs text-white/40 mt-1">
                  {Math.ceil(duration / 5)} scenes × 5 credits each
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Scene Review ───────────────────────────────────────────── */}
        {step === "scenes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Review your scenes</h2>
                <p className="text-sm text-white/50 mt-0.5">
                  {scenes.length} scenes planned for your {duration}s {platform.replace("_", " ")} video
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("setup")}
                className="border-white/20 text-white/70 hover:text-white bg-transparent"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>

            {/* Scene grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenes.map((scene) => (
                <div
                  key={scene.index}
                  className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
                >
                  {/* Scene number header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5">
                    <span className="text-xs font-semibold text-white/60">Scene {scene.index + 1}</span>
                    <span className="text-xs text-white/30">5s</span>
                  </div>

                  {/* Preview placeholder — 9:16 aspect */}
                  <div className="relative bg-gradient-to-br from-[#9090a0]/20 to-orange-900/20 aspect-[9/16] max-h-48 flex items-center justify-center">
                    <Film className="w-8 h-8 text-white/20" />
                    {scene.caption && (
                      <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
                        <p className="text-[10px] text-white text-center font-medium">{scene.caption}</p>
                      </div>
                    )}
                  </div>

                  {/* Prompt */}
                  <div className="p-3">
                    <p className="text-xs text-white/60 line-clamp-3 leading-relaxed">{scene.prompt}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleStartRender}
                disabled={startRenderMutation.isPending}
                className="h-12 px-8 bg-gradient-to-r from-[#9090a0] to-orange-500 hover:from-[#9090a0] hover:to-orange-400 text-white font-semibold rounded-xl border-0"
              >
                {startRenderMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Starting build...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Render All Scenes
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Render ─────────────────────────────────────────────────── */}
        {step === "render" && (
          <div className="max-w-2xl mx-auto space-y-8">
            {renderStatus === "rendering" || renderStatus === "assembling" ? (
              <div className="text-center space-y-6">
                {/* Animated render indicator */}
                <div className="relative w-32 h-32 mx-auto">
                  <div className="absolute inset-0 rounded-full border-2 border-[--color-silver]/20 border-t-[--color-silver] animate-spin" />
                  <div className="absolute inset-3 rounded-full border-2 border-orange-500/20 border-b-orange-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film className="w-10 h-10 text-[--color-silver]" />
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    {renderStatus === "assembling" ? "Assembling your video..." : "Building scenes..."}
                  </h2>
                  <p className="text-white/50 text-sm">
                    {renderStatus === "assembling"
                      ? "Stitching scenes together with ffmpeg"
                      : `${completedScenes} of ${totalScenes} scenes complete`}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-[#9090a0] to-orange-500 transition-all duration-500"
                    style={{ width: `${totalScenes > 0 ? (completedScenes / totalScenes) * 100 : 5}%` }}
                  />
                </div>

                {/* Scene status grid */}
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: totalScenes }).map((_, i) => (
                    <div
                      key={i}
                      className={`aspect-square rounded-lg border flex items-center justify-center transition-all ${
                        i < completedScenes
                          ? "border-green-500/50 bg-green-500/10"
                          : i === completedScenes
                          ? "border-[--color-silver]/50 bg-[--color-silver]/10 animate-pulse"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      {i < completedScenes ? (
                        <CheckCircle2 className="w-3 h-3 text-[--color-silver]" />
                      ) : i === completedScenes ? (
                        <Loader2 className="w-3 h-3 text-[--color-silver] animate-spin" />
                      ) : (
                        <span className="text-[10px] text-white/30">{i + 1}</span>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-white/30">
                  WizPilot renders each scene in 30–90 seconds. Please keep this tab open.
                </p>
              </div>
            ) : renderStatus === "complete" && finalVideoUrl ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-[--color-silver]/10 border border-green-500/40 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-[--color-silver]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">Your WizShort is ready!</h2>
                  <p className="text-white/50 text-sm">9:16 vertical video · Ready to upload</p>
                </div>

                {/* Video preview */}
                <div className="mx-auto max-w-xs">
                  <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[9/16] bg-black">
                    <video
                      src={finalVideoUrl}
                      controls
                      autoPlay
                      loop
                      muted
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={handleDownload}
                    className="h-11 px-6 bg-gradient-to-r from-[#9090a0] to-orange-500 hover:from-[#9090a0] hover:to-orange-400 text-white font-semibold rounded-xl border-0"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download MP4
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="h-11 px-6 border-white/20 text-white/70 hover:text-white bg-transparent rounded-xl"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Another
                  </Button>
                </div>
              </div>
            ) : renderStatus === "failed" ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">Build failed</h2>
                  <p className="text-white/50 text-sm">Something went wrong during video generation.</p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => { setRenderStatus("rendering"); startPolling(jobId!); }}
                    className="h-11 px-6 bg-gradient-to-r from-[#9090a0] to-orange-500 text-white font-semibold rounded-xl border-0"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="h-11 px-6 border-white/20 text-white/70 hover:text-white bg-transparent rounded-xl"
                  >
                    Start Over
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
          </div>
          {/* ── RIGHT SIDEBAR: Upgrade Preview ── */}
          <aside className="hidden lg:block space-y-4 sticky top-40 self-start">
            <div className="rounded-2xl border border-[--color-gold]/30 bg-gradient-to-b from-[--color-gold]/10 to-transparent backdrop-blur-sm p-4">
              <h3 className="text-xs font-bold text-[--color-gold] tracking-widest uppercase flex items-center gap-2 mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                Hear & See the Difference
              </h3>
              <p className="text-[10px] text-muted-foreground mb-4">
                Preview all three quality tiers before you render. No download until payment confirmed.
              </p>
              <div className="space-y-2 mb-4">
                {['ORIGINAL', 'ENHANCED', 'CINEMATIC'].map((tier, i) => (
                  <button
                    key={tier}
                    className={`w-full text-left rounded-lg border p-2.5 text-xs transition-all ${
                      i === 0
                        ? 'border-[--color-gold]/40 bg-[--color-gold]/15 text-white'
                        : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold tracking-wider">{tier}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">
                      {i === 0 ? 'Included' : i === 1 ? '+\u00a33.99' : '+\u00a34.99'}
                    </div>
                  </button>
                ))}
              </div>
              <div className="border-t border-white/10 pt-4 mb-4">
                <h4 className="text-[10px] font-bold text-white tracking-widest uppercase mb-3">WIZLUMINAR\u2122 \u2014 VISUAL QUALITY</h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {['ORIGINAL', 'ENHANCED', 'CINEMATIC'].map((tier, i) => (
                    <div key={tier} className={`rounded-lg border p-2 text-center text-[10px] ${
                      i === 0 ? 'border-[--color-gold]/40 bg-[--color-gold]/15 text-white' : 'border-white/10 bg-white/5 text-muted-foreground'
                    }`}>
                      <div className="font-bold">{tier}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <button className="w-full rounded-lg bg-gradient-to-r from-[--color-gold]/20 to-[--color-gold]/10 border border-[--color-gold]/30 p-2.5 text-left">
                  <div className="text-xs font-bold text-[--color-gold]">WizSound\u2122 Cinematic</div>
                  <div className="text-[10px] text-muted-foreground">+\u00a34.99</div>
                </button>
                <button className="w-full rounded-lg bg-gradient-to-r from-purple-500/20 to-purple-500/10 border border-purple-500/30 p-2.5 text-left">
                  <div className="text-xs font-bold text-purple-400">WizLuminar\u2122 Cinematic</div>
                  <div className="text-[10px] text-muted-foreground">+\u00a33.99</div>
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
              <h3 className="text-xs font-bold text-white tracking-widest uppercase mb-3">RENDER QUALITY</h3>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {[
                  { label: '1080p', price: 'Included', active: true },
                  { label: '4K', price: '+£3.99', active: false },
                ].map((q) => (
                  <div key={q.label} className={`rounded-lg border p-2.5 text-center cursor-pointer transition-all ${
                    q.active ? 'border-[--color-gold]/40 bg-[--color-gold]/15' : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}>
                    <div className={`text-xs font-bold ${q.active ? 'text-[--color-gold]' : 'text-white/60'}`}>{q.label}</div>
                    <div className={`text-[10px] mt-1 font-medium ${q.active ? 'text-[--color-gold]' : 'text-muted-foreground'}`}>{q.price}</div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground mb-3">1080p included · 4K upgrade at checkout</p>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] text-white/60">Format</span>
              </div>
              <div className="flex gap-1.5">
                {['MP4', 'MOV'].map((fmt, i) => (
                  <div key={fmt} className={`rounded px-3 py-1 text-[10px] font-bold border cursor-pointer ${
                    i === 0 ? 'border-[--color-gold]/40 bg-[--color-gold]/15 text-[--color-gold]' : 'border-white/10 bg-white/5 text-white/40'
                  }`}>{fmt}</div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
