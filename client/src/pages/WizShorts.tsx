import { useState, useEffect, useRef } from "react";
import { WIZSOUND_TIERS, VIDEO_QUALITY_2TIER, WIZLUMINAR_CINEMATIC } from "@/lib/pricing";
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

// ─── Fuchsia accent token ─────────────────────────────────────────────────────
// WizShorts brand: fuchsia #d946ef — matches WizShortsProductPage.tsx
const FX = "#d946ef";
const FX_DIM = "rgba(217,70,239,0.15)";
const FX_BORDER = "rgba(217,70,239,0.35)";

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
    <div className="min-h-screen studio-bg text-white" style={{ backgroundColor: "#07040d" }}>

      {/* ── Creator Energy Environment ── */}
      {/* Deep dark base + fuchsia radial glow from top-right */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 80% 0%, rgba(217,70,239,0.18) 0%, transparent 65%), " +
            "radial-gradient(ellipse 50% 40% at 20% 100%, rgba(168,85,247,0.10) 0%, transparent 60%), " +
            "linear-gradient(180deg, #07040d 0%, #0d0516 100%)",
          zIndex: 0,
        }}
      />

      {/* Diagonal speed lines — creator / short-form energy */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 1 }}
      >
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.055]"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="speed-lines" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
              <line x1="0" y1="0" x2="0" y2="120" stroke="#d946ef" strokeWidth="0.8" />
              <line x1="40" y1="0" x2="40" y2="120" stroke="#d946ef" strokeWidth="0.4" />
              <line x1="80" y1="0" x2="80" y2="120" stroke="#d946ef" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#speed-lines)" />
        </svg>
      </div>

      {/* Subtle vignette overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(7,4,13,0.7) 100%)",
          zIndex: 2,
        }}
      />

      {/* ── Header ── */}
      <div className="studio-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* WizShorts logo mark — vertical phone with speed mark */}
            <div
              className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center border"
              style={{
                background: `linear-gradient(135deg, rgba(217,70,239,0.25) 0%, #0d0516 100%)`,
                borderColor: "rgba(217,70,239,0.25)",
              }}
            >
              <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
                {/* Phone outline */}
                <rect x="12" y="5" width="16" height="28" rx="3" stroke="white" strokeWidth="1.8" fill="none"/>
                {/* Speed chevron */}
                <path d="M17 19l4-4 4 4" stroke={FX} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 23l4-4 4 4" stroke={FX} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-base tracking-widest" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>WIZSHORTS™</span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest"
                  style={{ background: FX, color: "#07040d" }}
                >
                  SHORT-FORM CREATOR
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="studio-led studio-led-green" style={{ width: 5, height: 5 }} />
                <span className="studio-label">Creator Studio · Online</span>
              </div>
            </div>
          </div>

          {/* Platform nav pills */}
          <div className="hidden md:flex items-center gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={
                  platform === p.id
                    ? { background: FX, color: "#07040d" }
                    : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }
                }
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold hidden sm:block" style={{ color: FX }}>10,000 Credits</span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border"
              style={{ background: FX_DIM, borderColor: FX_BORDER, color: FX }}
            >
              T
            </div>
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
                  <div
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all"
                    style={
                      stageIdx === i
                        ? { background: FX, color: "#07040d", boxShadow: `0 4px 16px rgba(217,70,239,0.35)` }
                        : stageIdx > i
                        ? { background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }
                        : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }
                    }
                  >
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
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-[220px_1fr_300px] gap-5">

          {/* ── LEFT SIDEBAR ── */}
          <aside className="hidden lg:block space-y-4 sticky top-40 self-start">
            {/* Session info */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border"
                  style={{ background: FX_DIM, borderColor: FX_BORDER, color: FX }}
                >
                  T
                </div>
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
              <h3 className="text-[10px] font-bold tracking-widest uppercase" style={{ color: FX }}>Platform &amp; Format</h3>
              <div className="space-y-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left"
                    style={
                      platform === p.id
                        ? { borderColor: FX_BORDER, background: FX_DIM }
                        : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }
                    }
                  >
                    <span className="text-lg">{p.icon}</span>
                    <div>
                      <div className="text-xs font-bold" style={{ color: platform === p.id ? FX : "white" }}>{p.label}</div>
                      <div className="text-[9px] text-white/40">{p.sub}</div>
                      <div className="text-[9px] text-white/30">{p.followers}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Style */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 space-y-3">
              <h3 className="text-[10px] font-bold tracking-widest uppercase" style={{ color: FX }}>Visual Style</h3>
              <div className="space-y-1.5">
                {VISUAL_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setVisualStyle(s.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all"
                    style={
                      visualStyle === s.id
                        ? { borderColor: FX_BORDER, background: FX_DIM, color: FX }
                        : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.55)" }
                    }
                  >
                    <span>{s.label}</span>
                    {visualStyle === s.id && <span style={{ color: FX }}>ON</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Production Settings */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 space-y-3">
              <h3 className="text-[10px] font-bold tracking-widest uppercase" style={{ color: FX }}>Production Settings</h3>
              <div>
                <div className="text-[10px] text-white/40 mb-1.5">Duration</div>
                <div className="grid grid-cols-4 gap-1">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className="py-1.5 rounded-lg border text-[10px] font-bold transition-all"
                      style={
                        duration === d
                          ? { borderColor: FX_BORDER, background: FX_DIM, color: FX }
                          : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.4)" }
                      }
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
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white/70 focus:outline-none"
                    style={{ ["--tw-ring-color" as any]: FX }}
                  >
                    {s.options.map((o) => <option key={o} className="bg-[#0d0516]">{o}</option>)}
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border"
                      style={{ background: FX_DIM, borderColor: FX_BORDER, color: FX }}
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
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
                      style={{ ["--tw-ring-color" as any]: FX }}
                    />
                    <div className="text-[10px] text-white/30 mt-1.5">Select your opening hook — AI generates 4 options based on your topic</div>
                  </div>
                  <div className="space-y-2">
                    {AI_HOOKS.map((hook, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedHook(i)}
                        className="w-full text-left px-4 py-2.5 rounded-xl border text-xs transition-all"
                        style={
                          selectedHook === i
                            ? { borderColor: FX_BORDER, background: FX_DIM, color: "white" }
                            : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.55)" }
                        }
                      >
                        {hook}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Script & Brief */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white tracking-widest uppercase">Script &amp; Brief</h3>
                    <div className="text-[10px] text-white/30">Describe your short</div>
                  </div>
                  <Textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Describe your short-form video..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none h-24 text-sm"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-white/30">{topic.length} / 500</span>
                    <button className="flex items-center gap-1.5 text-[10px] transition-colors" style={{ color: FX }}>
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
                        <div className="relative aspect-[9/16] bg-gradient-to-b from-[#1a0a2e] to-[#07040d] flex items-center justify-center">
                          <span className="text-white/20 text-xs font-bold">{sc.id}</span>
                          {sc.badge && (
                            <span
                              className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={
                                sc.badge === "FREE"
                                  ? { background: "rgba(34,197,94,0.8)", color: "white" }
                                  : { background: `${FX}cc`, color: "#07040d" }
                              }
                            >
                              {sc.badge}
                            </span>
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
                  className="w-full h-12 font-bold text-sm rounded-xl border-0 tracking-widest uppercase"
                  style={{
                    background: `linear-gradient(90deg, ${FX} 0%, #a855f7 100%)`,
                    color: "white",
                  }}
                >
                  {createJobMutation.isPending || generateScenesMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating scenes...</>
                  ) : (
                    <>CREATE SHORT &nbsp; Generate Scenes → Upgrade Preview → Render &amp; Publish</>
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
                        <span className="text-xs font-bold" style={{ color: FX }}>SC {String(i + 1).padStart(2, "0")}</span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed">{scene.prompt}</p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleStartRender}
                  disabled={startRenderMutation.isPending}
                  className="w-full h-12 font-bold rounded-xl border-0"
                  style={{ background: `linear-gradient(90deg, ${FX} 0%, #a855f7 100%)`, color: "white" }}
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
                      <div
                        className="absolute inset-0 rounded-full border-2 animate-spin"
                        style={{ borderColor: `${FX}33`, borderTopColor: FX }}
                      />
                      <div
                        className="absolute inset-3 rounded-full border-2 animate-spin"
                        style={{ borderColor: "rgba(168,85,247,0.2)", borderBottomColor: "#a855f7", animationDirection: "reverse", animationDuration: "1.5s" }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Film className="w-10 h-10" style={{ color: FX }} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Building scenes...</h2>
                      <p className="text-white/50 text-sm">{completedScenes} of {totalScenes} scenes complete</p>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${totalScenes > 0 ? (completedScenes / totalScenes) * 100 : 5}%`,
                          background: `linear-gradient(90deg, ${FX} 0%, #a855f7 100%)`,
                        }}
                      />
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
                      <Button
                        onClick={handleDownload}
                        className="h-11 px-6 font-bold rounded-xl border-0"
                        style={{ background: `linear-gradient(90deg, ${FX} 0%, #a855f7 100%)`, color: "white" }}
                      >
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
                      <Button
                        onClick={() => { setRenderStatus("rendering"); startPolling(jobId!); }}
                        className="h-11 px-6 font-bold rounded-xl border-0"
                        style={{ background: `linear-gradient(90deg, ${FX} 0%, #a855f7 100%)`, color: "white" }}
                      >
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
            <div
              className="rounded-2xl backdrop-blur-sm p-4 border"
              style={{
                borderColor: FX_BORDER,
                background: `linear-gradient(160deg, ${FX_DIM} 0%, transparent 100%)`,
              }}
            >
              <h3
                className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 mb-3"
                style={{ color: FX }}
              >
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
                    className="w-full text-left rounded-xl border p-2.5 text-xs transition-all"
                    style={
                      upgradeTier === t.key
                        ? { borderColor: FX_BORDER, background: FX_DIM, color: "white" }
                        : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.45)" }
                    }
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
                  <button
                    className="w-7 h-7 rounded-full flex items-center justify-center border"
                    style={{ background: FX_DIM, borderColor: FX_BORDER }}
                  >
                    <Play className="w-3 h-3" style={{ color: FX }} />
                  </button>
                  <div className="flex-1 h-1 bg-white/10 rounded-full">
                    <div className="h-1 w-1/3 rounded-full" style={{ background: FX }} />
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
                    <div
                      key={t}
                      className="rounded-lg border p-2 text-center text-[9px]"
                      style={
                        i === 0
                          ? { borderColor: FX_BORDER, background: FX_DIM, color: "white" }
                          : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.35)" }
                      }
                    >
                      <div className="font-bold">{t}</div>
                      {i > 0 && <div className="text-[8px] mt-0.5">🔒</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <button
                  className="w-full rounded-xl border p-2.5 text-left transition-all"
                  style={{ background: FX_DIM, borderColor: FX_BORDER }}
                >
                  <div className="text-xs font-bold" style={{ color: FX }}>WizSound™ Cinematic</div>
                  <div className="text-[9px] text-white/40">Stereo widening · EQ mastering · Spatial depth</div>
                  <div className="text-[10px] font-bold mt-1" style={{ color: FX }}>{WIZSOUND_TIERS.CINEMATIC.price}</div>
                </button>
                <button className="w-full rounded-xl bg-gradient-to-r from-purple-500/20 to-purple-500/10 border border-purple-500/30 p-2.5 text-left hover:from-purple-500/30 transition-all">
                  <div className="text-xs font-bold text-purple-400">WizLuminar™ Cinematic</div>
                  <div className="text-[9px] text-white/40">Colour grade · Film grain · Deep blacks</div>
                  <div className="text-[10px] text-purple-400 font-bold mt-1">{WIZLUMINAR_CINEMATIC.price}</div>
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
                    <button
                      key={q.k}
                      onClick={() => setRenderQuality(q.k as typeof renderQuality)}
                      className="rounded-lg border p-2.5 text-center transition-all"
                      style={
                        renderQuality === q.k
                          ? { borderColor: FX_BORDER, background: FX_DIM }
                          : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }
                      }
                    >
                      <div className="text-xs font-bold" style={{ color: renderQuality === q.k ? FX : "rgba(255,255,255,0.55)" }}>{q.k}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: renderQuality === q.k ? FX : "rgba(255,255,255,0.25)" }}>{q.p}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-white/30 mt-1.5">1080p included · 4K upgrade at checkout</p>
              </div>
              <div>
                <div className="text-[9px] text-white/40 mb-1.5">Format</div>
                <div className="flex gap-1.5">
                  {["mp4", "mov"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setRenderFormat(f as typeof renderFormat)}
                      className="px-3 py-1 rounded-lg border text-[10px] font-bold transition-all"
                      style={
                        renderFormat === f
                          ? { borderColor: FX_BORDER, background: FX_DIM, color: FX }
                          : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.35)" }
                      }
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-white/40 mb-1.5">Export for</div>
                <div className="flex gap-1.5">
                  {["youtube", "tiktok", "all"].map((e) => (
                    <button
                      key={e}
                      onClick={() => setExportFor(e as typeof exportFor)}
                      className="px-2 py-1 rounded-lg border text-[9px] font-bold transition-all capitalize"
                      style={
                        exportFor === e
                          ? { borderColor: FX_BORDER, background: FX_DIM, color: FX }
                          : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.35)" }
                      }
                    >
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
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded"
                    style={
                      s.status === "done"
                        ? { background: "rgba(34,197,94,0.15)", color: "#4ade80" }
                        : s.status === "progress"
                        ? { background: FX_DIM, color: FX }
                        : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)" }
                    }
                  >
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
                    className="w-8 h-4 rounded-full transition-all"
                    style={{
                      background: features[f.key as keyof typeof features] ? FX : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full bg-white transition-all mx-0.5"
                      style={{
                        transform: features[f.key as keyof typeof features] ? "translateX(16px)" : "translateX(0)",
                      }}
                    />
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
