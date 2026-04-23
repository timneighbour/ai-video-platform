import { useState, useEffect, useRef } from "react";
import { WIZSOUND_TIERS, VIDEO_QUALITY_2TIER } from "@/lib/pricing";
import { mp } from "@/lib/mixpanel";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import {
  Sparkles, Play, Download, ChevronRight,
  Loader2, Film, Zap, CheckCircle2, AlertCircle,
  Youtube, Music2, Smartphone, Mic, Settings
} from "@/lib/icons";

// ─── Types ───────────────────────────────────────────────────────────────────

type Platform = "youtube_shorts" | "tiktok" | "reels";
type VisualStyle = "talking_head" | "cinematic" | "text_first" | "animated";
type WizStep = "setup" | "scenes" | "render";

interface Scene {
  index: number;
  prompt: string;
  caption: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PLATFORMS: { id: Platform; label: string; sub: string; followers: string; icon: string }[] = [
  { id: "youtube_shorts", label: "YouTube",  sub: "Shorts · 9:16", followers: "124.7K subs",     icon: "▶" },
  { id: "tiktok",         label: "TikTok",   sub: "Video · 9:16",  followers: "89.2K followers",  icon: "♫" },
  { id: "reels",          label: "Reels",    sub: "Reels · 9:16",  followers: "41.8K followers",  icon: "◆" },
];

const VISUAL_STYLES: { id: VisualStyle; label: string; active?: boolean }[] = [
  { id: "talking_head", label: "Talking Head", active: true },
  { id: "cinematic",    label: "Cinematic" },
  { id: "text_first",   label: "Text-First" },
  { id: "animated",     label: "Animated" },
];

const DURATIONS = [15, 30, 60, 90];

const AI_HOOKS = [
  '"I wish someone had told me this before I hit 100K subscribers..."',
  '"Most YouTubers quit before they discover this one trick."',
  '"The YouTube algorithm is broken — here\'s how to beat it anyway."',
  '"I made 47 Shorts before anything went viral. Here\'s what changed."',
];

const MOCK_SCENES = [
  { id: "SC01", time: "0:00–0:12", title: '"I wish someone had told me this before I hit 100K..."', desc: "Hook · Talking head · Close-up", free: true, badge: "FREE" },
  { id: "SC02", time: "0:12–0:28", title: "Point 1: Consistency beats quality early on",           desc: "B-roll cutaway · Text overlay",    free: true, badge: "FREE" },
  { id: "SC03", time: "0:28–0:44", title: "Point 2: Your first 10 videos will be terrible",        desc: "Talking head · Reaction cut",       free: false, badge: "AI" },
  { id: "SC04", time: "0:44–0:55", title: "Points 3–5: Algorithm, thumbnails, titles",             desc: "Fast cut montage · Text-first",     free: false, badge: "AI" },
  { id: "SC05", time: "0:55–1:00", title: "CTA: Subscribe for more creator tips",                  desc: "End screen · Subscribe prompt",     free: false, badge: "AI" },
];

const PRODUCTION_STATUS = [
  { label: "Platform Selected", status: "done" },
  { label: "Script & Hook",     status: "progress" },
  { label: "Scene Generation",  status: "pending" },
  { label: "WizSound Processing", status: "pending" },
  { label: "WizLuminar Grade",  status: "pending" },
  { label: "Render & Publish",  status: "pending" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WizShorts() {
  useSEO({ title: "WizShorts™ — AI Shorts Creator", path: "/wiz-shorts", description: "Create viral AI short-form videos for TikTok, YouTube Shorts, and Instagram Reels." });
  const { user } = useAuth();
  const [step, setStep] = useState<WizStep>("setup");
  const [jobId, setJobId] = useState<number | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);

  const [topic, setTopic] = useState("5 things nobody tells you about starting a YouTube channel");
  const [platform, setPlatform] = useState<Platform>("youtube_shorts");
  const [duration, setDuration] = useState(60);
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("talking_head");
  const [selectedHook, setSelectedHook] = useState<number | null>(0);
  const [upgradeTier, setUpgradeTier] = useState<"original" | "enhanced" | "cinematic">("original");
  const [renderQuality, setRenderQuality] = useState<"1080p" | "4k">("1080p");
  const [renderFormat, setRenderFormat] = useState<"mp4" | "mov">("mp4");
  const [exportFor, setExportFor] = useState<"youtube" | "tiktok" | "all">("youtube");
  const [ambience, setAmbience] = useState(50);
  const [features, setFeatures] = useState({
    autoCaptions: true, beatSync: false, hookOptimiser: true, subscribeCta: false, multiPlatform: false,
  });
  const [renderStatus, setRenderStatus] = useState<"idle" | "rendering" | "complete" | "failed">("idle");
  const [completedScenes, setCompletedScenes] = useState(0);
  const [totalScenes, setTotalScenes] = useState(0);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createJobMutation = trpc.wizShorts.createJob.useMutation();
  const generateScenesMutation = trpc.wizShorts.generateScenes.useMutation();
  const startRenderMutation = trpc.wizShorts.startRender.useMutation();
  const pollProgressMutation = trpc.wizShorts.pollProgress.useMutation();

  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  const handleCreateJob = async () => {
    if (!user) { window.location.href = getLoginUrl(); return; }
    if (!topic.trim()) { toast.error("Please describe your video topic"); return; }
    try {
      const job = await createJobMutation.mutateAsync({ topic: topic.trim(), platform, targetDuration: duration, visualStyle });
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
      } catch (_) {}
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
  };

  // ─── Stage index ─────────────────────────────────────────────────────────────
  const STAGES = ["setup", "script", "scenes", "upgrade", "render"];
  const stageIdx = step === "setup" ? 0 : step === "scenes" ? 2 : 4;

  return (
    <div className="min-h-screen studio-bg text-white" style={{ backgroundColor: "#06050a" }}>
      {/* ── VR Environment: Broadcast Studio ── */}
      <div className="env-bg">
        <img src="https://storage.manus.space/public/user-uploads/MPtNk7V8XUiyp7GcfLr2KS/env-broadcast-studio_5a824d1f.jpg" alt="" />
        <div className="env-bg-overlay" />
      </div>
      <div className="env-ambient env-tint-stage" />

      {/* ── Header ── */}
      <div className="studio-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#b8892a]/30 to-[#1a1a20] border border-[#b8892a]/20">
              <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
                <rect x="4" y="10" width="24" height="20" rx="3" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M28 16l8-4v16l-8-4V16z" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-base tracking-widest" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>WIZSHORTS™</span>
                <span className="bg-[--color-gold] text-black text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest">SHORT-FORM CREATOR</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="studio-led studio-led-green" style={{ width: 5, height: 5 }} />
                <span className="studio-label">Shorts Studio · Online</span>
              </div>
            </div>
          </div>
          {/* Platform nav pills */}
          <div className="hidden md:flex items-center gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  platform === p.id
                    ? "bg-[--color-gold] text-black"
                    : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white"
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[--color-gold] font-semibold hidden sm:block">10,000 Credits</span>
            <div className="w-8 h-8 rounded-full bg-[--color-gold]/20 border border-[--color-gold]/40 flex items-center justify-center text-[--color-gold] text-xs font-bold">T</div>
          </div>
        </div>

        {/* Stage bar */}
        <div className="border-t border-white/10 bg-white/[0.03]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-1 sm:gap-2 py-2.5 overflow-x-auto scrollbar-none">
              {[
                { key: "setup",   label: "Platform" },
                { key: "script",  label: "Script & Hook" },
                { key: "scenes",  label: "Scenes" },
                { key: "upgrade", label: "Upgrade Preview" },
                { key: "render",  label: "Render & Publish" },
              ].map((s, i) => (
                <div key={s.key} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    stageIdx === i
                      ? "bg-[--color-gold] text-white shadow-lg shadow-[#b8892a]/30"
                      : stageIdx > i
                      ? "bg-[--color-silver]/15 text-[--color-silver]"
                      : "bg-white/10 text-white/40"
                  }`}>
                    {stageIdx > i && <CheckCircle2 className="h-3 w-3" />}
                    {s.label}
                  </div>
                  {i < 4 && <ChevronRight className="h-3 w-3 text-white/20 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-[220px_1fr_300px] gap-5">

          {/* ── LEFT SIDEBAR ── */}
          <aside className="hidden lg:block space-y-4 sticky top-40 self-start">
            {/* Session info */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-[--color-gold]/20 border border-[--color-gold]/40 flex items-center justify-center text-[--color-gold] text-xs font-bold">T</div>
                <div>
                  <div className="text-xs font-bold text-white">@TimCreates</div>
                  <div className="text-[10px] text-white/40">124.7K YT Subs</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  { val: "89.2K", lbl: "TikTok" },
                  { val: "8.4M",  lbl: "Total Views" },
                  { val: "47",    lbl: "Shorts Made" },
                  { val: "LIVE",  lbl: "1,247 watching", live: true },
                ].map((s) => (
                  <div key={s.lbl} className="rounded-lg bg-white/5 border border-white/10 p-2">
                    <div className={`text-sm font-bold ${s.live ? "text-red-400" : "text-white"}`}>{s.val}</div>
                    <div className="text-[9px] text-white/40">{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform & Format */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 space-y-3">
              <h3 className="text-[10px] font-bold text-[--color-gold] tracking-widest uppercase">Platform & Format</h3>
              <div className="space-y-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
                      platform === p.id
                        ? "border-[--color-gold]/50 bg-[--color-gold]/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <span className="text-lg">{p.icon}</span>
                    <div>
                      <div className={`text-xs font-bold ${platform === p.id ? "text-[--color-gold]" : "text-white"}`}>{p.label}</div>
                      <div className="text-[9px] text-white/40">{p.sub}</div>
                      <div className="text-[9px] text-white/30">{p.followers}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Style */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 space-y-3">
              <h3 className="text-[10px] font-bold text-[--color-gold] tracking-widest uppercase">Visual Style</h3>
              <div className="space-y-1.5">
                {VISUAL_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setVisualStyle(s.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      visualStyle === s.id
                        ? "border-[--color-gold]/50 bg-[--color-gold]/10 text-[--color-gold]"
                        : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <span>{s.label}</span>
                    {visualStyle === s.id && <span className="text-[--color-gold]">ON</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Production Settings */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 space-y-3">
              <h3 className="text-[10px] font-bold text-[--color-gold] tracking-widest uppercase">Production Settings</h3>
              <div>
                <div className="text-[10px] text-white/40 mb-1.5">Duration</div>
                <div className="grid grid-cols-4 gap-1">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                        duration === d
                          ? "border-[--color-gold]/50 bg-[--color-gold]/10 text-[--color-gold]"
                          : "border-white/10 bg-white/5 text-white/40 hover:border-white/20"
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
              {[
                { label: "Captions", options: ["Auto-captions (AI)", "No captions", "Custom captions"] },
                { label: "Music",    options: ["WizAudio (generate)", "Upload my track", "No music"] },
                { label: "CTA Style",options: ["Subscribe prompt (end screen)", "Comment CTA", "Link in bio", "No CTA"] },
                { label: "Branding", options: ["Channel watermark", "Intro card (3s)", "No branding"] },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-[10px] text-white/40 mb-1">{s.label}</div>
                  <select className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white/70 focus:outline-none focus:border-[--color-gold]/40">
                    {s.options.map((o) => <option key={o} className="bg-[#1a1a20]">{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </aside>

          {/* ── CENTRE: Main Workspace ── */}
          <div className="min-w-0 space-y-5">
            {step === "setup" && (
              <>
                {/* Hook Builder */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white tracking-widest uppercase">Hook Builder — First 3 seconds decide everything</h3>
                    <button
                      onClick={() => toast.info("AI hook generation coming soon")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[--color-gold]/20 border border-[--color-gold]/40 text-[--color-gold] text-xs font-bold hover:bg-[--color-gold]/30 transition-all"
                    >
                      AI Hooks ▶
                    </button>
                  </div>
                  <div className="mb-3">
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Describe your video topic..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[--color-gold]/40"
                    />
                    <div className="text-[10px] text-white/30 mt-1.5">Select your opening hook — AI generates 4 options based on your topic</div>
                  </div>
                  <div className="space-y-2">
                    {AI_HOOKS.map((hook, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedHook(i)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs transition-all ${
                          selectedHook === i
                            ? "border-[--color-gold]/50 bg-[--color-gold]/10 text-white"
                            : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {hook}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Script & Brief */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white tracking-widest uppercase">Script & Brief</h3>
                    <div className="text-[10px] text-white/30">Describe your short</div>
                  </div>
                  <Textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Describe your short-form video..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none h-24 focus:border-[--color-gold]/40 text-sm"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-white/30">{topic.length} / 500</span>
                    <button className="flex items-center gap-1.5 text-[10px] text-[--color-gold] hover:text-[--color-gold]/80 transition-colors">
                      <Mic className="w-3 h-3" />
                      Speak Brief
                    </button>
                  </div>
                </div>

                {/* Scene Preview (mockup-style) */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white tracking-widest uppercase">Scene Preview — 9:16 vertical</h3>
                    <span className="text-[10px] text-white/30">First 2 scenes free · Credits used on render</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {MOCK_SCENES.map((sc) => (
                      <div key={sc.id} className="flex-shrink-0 w-28 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                        <div className="relative aspect-[9/16] bg-gradient-to-b from-[#1a1a2e] to-[#0a0a14] flex items-center justify-center">
                          <span className="text-white/20 text-xs font-bold">{sc.id}</span>
                          {sc.badge && (
                            <span className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              sc.badge === "FREE" ? "bg-green-500/80 text-white" : "bg-[--color-gold]/80 text-black"
                            }`}>{sc.badge}</span>
                          )}
                        </div>
                        <div className="p-2">
                          <div className="text-[9px] text-white/40 mb-0.5">{sc.time}</div>
                          <div className="text-[9px] text-white/70 leading-tight line-clamp-2">{sc.title}</div>
                          <div className="text-[8px] text-white/30 mt-1 leading-tight">{sc.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generate CTA */}
                <Button
                  onClick={handleCreateJob}
                  disabled={createJobMutation.isPending || generateScenesMutation.isPending || !topic.trim()}
                  className="w-full h-12 bg-gradient-to-r from-[--color-gold] to-orange-500 hover:from-[--color-gold]/90 hover:to-orange-400 text-black font-bold text-sm rounded-xl border-0 tracking-widest uppercase"
                >
                  {createJobMutation.isPending || generateScenesMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating scenes...</>
                  ) : (
                    <>CREATE SHORT &nbsp; Generate Scenes → Upgrade Preview → Render & Publish</>
                  )}
                </Button>
              </>
            )}

            {step === "scenes" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Review Your Scenes</h2>
                  <span className="text-xs text-white/40">{scenes.length} scenes generated</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {scenes.map((scene, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-[--color-gold]">SC {String(i + 1).padStart(2, "0")}</span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed">{scene.prompt}</p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleStartRender}
                  disabled={startRenderMutation.isPending}
                  className="w-full h-12 bg-gradient-to-r from-[--color-gold] to-orange-500 text-black font-bold rounded-xl border-0"
                >
                  {startRenderMutation.isPending ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Starting...</> : <><Zap className="w-5 h-5 mr-2" />Render All Scenes</>}
                </Button>
              </div>
            )}

            {step === "render" && (
              <div className="max-w-2xl mx-auto space-y-8">
                {renderStatus === "rendering" ? (
                  <div className="text-center space-y-6">
                    <div className="relative w-32 h-32 mx-auto">
                      <div className="absolute inset-0 rounded-full border-2 border-[--color-silver]/20 border-t-[--color-silver] animate-spin" />
                      <div className="absolute inset-3 rounded-full border-2 border-orange-500/20 border-b-orange-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Film className="w-10 h-10 text-[--color-silver]" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Building scenes...</h2>
                      <p className="text-white/50 text-sm">{completedScenes} of {totalScenes} scenes complete</p>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div className="h-2 rounded-full bg-gradient-to-r from-[--color-gold] to-orange-500 transition-all duration-500" style={{ width: `${totalScenes > 0 ? (completedScenes / totalScenes) * 100 : 5}%` }} />
                    </div>
                  </div>
                ) : renderStatus === "complete" && finalVideoUrl ? (
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 border border-green-500/40 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-xl font-semibold">Your WizShort is ready!</h2>
                    <div className="mx-auto max-w-xs rounded-2xl overflow-hidden border border-white/10 aspect-[9/16] bg-black">
                      <video src={finalVideoUrl} controls autoPlay loop muted className="w-full h-full object-cover" crossOrigin="anonymous" />
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={handleDownload} className="h-11 px-6 bg-gradient-to-r from-[--color-gold] to-orange-500 text-black font-bold rounded-xl border-0">
                        <Download className="w-4 h-4 mr-2" />Download MP4
                      </Button>
                      <Button variant="outline" onClick={handleReset} className="h-11 px-6 border-white/20 text-white/70 hover:text-white bg-transparent rounded-xl">
                        <Sparkles className="w-4 h-4 mr-2" />Create Another
                      </Button>
                    </div>
                  </div>
                ) : renderStatus === "failed" ? (
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold">Build failed</h2>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => { setRenderStatus("rendering"); startPolling(jobId!); }} className="h-11 px-6 bg-gradient-to-r from-[--color-gold] to-orange-500 text-black font-bold rounded-xl border-0">
                        <Play className="w-4 h-4 mr-2" />Retry
                      </Button>
                      <Button variant="outline" onClick={handleReset} className="h-11 px-6 border-white/20 text-white/70 hover:text-white bg-transparent rounded-xl">Start Over</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR: Upgrade Preview ── */}
          <aside className="hidden lg:block space-y-4 sticky top-40 self-start">
            {/* Upgrade Preview */}
            <div className="rounded-2xl border border-[--color-gold]/30 bg-gradient-to-b from-[--color-gold]/10 to-transparent backdrop-blur-sm p-4">
              <h3 className="text-[10px] font-bold text-[--color-gold] tracking-widest uppercase flex items-center gap-2 mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                Hear &amp; See the Difference
              </h3>
              <p className="text-[10px] text-white/40 mb-3">Preview all three quality tiers. No download until payment confirmed.</p>
              <div className="space-y-2 mb-4">
                {[
                  { key: WIZSOUND_TIERS.ORIGINAL.key,  label: "ORIGINAL",  price: WIZSOUND_TIERS.ORIGINAL.price },
                  { key: WIZSOUND_TIERS.ENHANCED.key,  label: "ENHANCED",  price: WIZSOUND_TIERS.ENHANCED.price },
                  { key: WIZSOUND_TIERS.CINEMATIC.key, label: "CINEMATIC", price: WIZSOUND_TIERS.CINEMATIC.price },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setUpgradeTier(t.key as typeof upgradeTier)}
                    className={`w-full text-left rounded-xl border p-2.5 text-xs transition-all ${
                      upgradeTier === t.key
                        ? "border-[--color-gold]/50 bg-[--color-gold]/15 text-white"
                        : "border-white/10 bg-white/5 text-white/50 hover:border-white/20"
                    }`}
                  >
                    <div className="font-bold tracking-wider">{t.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{t.price}</div>
                  </button>
                ))}
              </div>
              {/* WizSound player */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 mb-3">
                <div className="text-[10px] font-bold text-white mb-2">WizSound™ — Original</div>
                <div className="flex items-center gap-2">
                  <button className="w-7 h-7 rounded-full bg-[--color-gold]/20 border border-[--color-gold]/40 flex items-center justify-center">
                    <Play className="w-3 h-3 text-[--color-gold]" />
                  </button>
                  <div className="flex-1 h-1 bg-white/10 rounded-full">
                    <div className="h-1 w-1/3 bg-[--color-gold] rounded-full" />
                  </div>
                  <span className="text-[9px] text-white/30">0:21 / 1:00</span>
                </div>
                <div className="text-[9px] text-white/30 mt-2">🔒 Preview only</div>
              </div>
              {/* WizLuminar */}
              <div className="mb-4">
                <div className="text-[10px] font-bold text-white/60 tracking-widest uppercase mb-2">WizLuminar™ — Visual Quality</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {["Original", "Enhanced", "WizLuminar™"].map((t, i) => (
                    <div key={t} className={`rounded-lg border p-2 text-center text-[9px] ${i === 0 ? "border-[--color-gold]/40 bg-[--color-gold]/10 text-white" : "border-white/10 bg-white/5 text-white/40"}`}>
                      <div className="font-bold">{t}</div>
                      {i > 0 && <div className="text-[8px] mt-0.5">🔒</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <button className="w-full rounded-xl bg-gradient-to-r from-[--color-gold]/20 to-[--color-gold]/10 border border-[--color-gold]/30 p-2.5 text-left hover:from-[--color-gold]/30 transition-all">
                  <div className="text-xs font-bold text-[--color-gold]">WizSound™ Cinematic</div>
                  <div className="text-[9px] text-white/40">Stereo widening · EQ mastering · Spatial depth</div>
                  <div className="text-[10px] text-[--color-gold] font-bold mt-1">{WIZSOUND_TIERS.CINEMATIC.price}</div>
                </button>
                <button className="w-full rounded-xl bg-gradient-to-r from-purple-500/20 to-purple-500/10 border border-purple-500/30 p-2.5 text-left hover:from-purple-500/30 transition-all">
                  <div className="text-xs font-bold text-purple-400">WizLuminar™ Cinematic</div>
                  <div className="text-[9px] text-white/40">Colour grade · Film grain · Deep blacks</div>
                  <div className="text-[10px] text-purple-400 font-bold mt-1">+£3.99</div>
                </button>
              </div>
            </div>

            {/* Render Quality */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 space-y-3">
              <h3 className="text-[10px] font-bold text-white tracking-widest uppercase">Render Quality</h3>
              <div>
                <div className="text-[9px] text-white/40 mb-1.5">Resolution</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {VIDEO_QUALITY_2TIER.map((q) => ({ k: q.label, p: q.price })).map((q) => (
                    <button key={q.k} onClick={() => setRenderQuality(q.k as typeof renderQuality)} className={`rounded-lg border p-2.5 text-center transition-all ${renderQuality === q.k ? "border-[--color-gold]/40 bg-[--color-gold]/15" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                      <div className={`text-xs font-bold ${renderQuality === q.k ? "text-[--color-gold]" : "text-white/60"}`}>{q.k}</div>
                      <div className={`text-[9px] mt-0.5 ${renderQuality === q.k ? "text-[--color-gold]" : "text-white/30"}`}>{q.p}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-white/30 mt-1.5">1080p included · 4K upgrade at checkout</p>
              </div>
              <div>
                <div className="text-[9px] text-white/40 mb-1.5">Format</div>
                <div className="flex gap-1.5">
                  {["mp4", "mov"].map((f) => (
                    <button key={f} onClick={() => setRenderFormat(f as typeof renderFormat)} className={`px-3 py-1 rounded-lg border text-[10px] font-bold transition-all ${renderFormat === f ? "border-[--color-gold]/40 bg-[--color-gold]/15 text-[--color-gold]" : "border-white/10 bg-white/5 text-white/40"}`}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-white/40 mb-1.5">Export for</div>
                <div className="flex gap-1.5">
                  {["youtube", "tiktok", "all"].map((e) => (
                    <button key={e} onClick={() => setExportFor(e as typeof exportFor)} className={`px-2 py-1 rounded-lg border text-[9px] font-bold transition-all capitalize ${exportFor === e ? "border-[--color-gold]/40 bg-[--color-gold]/15 text-[--color-gold]" : "border-white/10 bg-white/5 text-white/40"}`}>
                      {e === "all" ? "All 3" : e.charAt(0).toUpperCase() + e.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Production Status */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 space-y-2">
              <h3 className="text-[10px] font-bold text-white tracking-widest uppercase mb-3">Production Status</h3>
              {PRODUCTION_STATUS.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-white/60">{s.label}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                    s.status === "done"     ? "bg-green-500/20 text-green-400" :
                    s.status === "progress" ? "bg-[--color-gold]/20 text-[--color-gold]" :
                    "bg-white/5 text-white/30"
                  }`}>
                    {s.status === "done" ? "DONE" : s.status === "progress" ? "IN PROGRESS" : "PENDING"}
                  </span>
                </div>
              ))}
            </div>

            {/* Creator Features */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 space-y-2">
              <h3 className="text-[10px] font-bold text-white tracking-widest uppercase mb-3 flex items-center gap-2">
                <Settings className="w-3 h-3" />
                Creator Features
              </h3>
              {[
                { key: "autoCaptions",  label: "Auto-Captions (AI)" },
                { key: "beatSync",      label: "Beat-Sync Cuts" },
                { key: "hookOptimiser", label: "Hook Optimiser" },
                { key: "subscribeCta",  label: "Subscribe CTA Overlay" },
                { key: "multiPlatform", label: "Multi-Platform Export" },
              ].map((f) => (
                <div key={f.key} className="flex items-center justify-between">
                  <span className="text-[10px] text-white/60">{f.label}</span>
                  <button
                    onClick={() => setFeatures((prev) => ({ ...prev, [f.key]: !prev[f.key as keyof typeof features] }))}
                    className={`w-8 h-4 rounded-full transition-all ${features[f.key as keyof typeof features] ? "bg-[--color-gold]" : "bg-white/10"}`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white transition-all mx-0.5 ${features[f.key as keyof typeof features] ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
