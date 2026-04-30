import { useState, useEffect, useRef } from "react";
import { LandscapeHint } from "@/components/LandscapeHint";
import { WIZSOUND_TIERS, VIDEO_QUALITY_2TIER, WIZLUMINAR_CINEMATIC } from "@/lib/pricing";
import { mp } from "@/lib/mixpanel";
import { trpc } from "@/lib/trpc";
import { StarterTemplates } from "@/components/StarterTemplates";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import AnimatedEqualiser from "@/components/AnimatedEqualiser";
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
// ─── Studio environment ───────────────────────────────────────────────────────
const ENV_IMG = "/manus-storage/wizshorts-creator-pov-v2_f5971b8f.jpg";
// Platform accent colours for plat-badge chips and channel-stats
const PLAT_COLOURS: Record<string, string> = {
  youtube_shorts: "#ff4444",
  tiktok: "#cccccc",
  reels: "#c060e0",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WizShorts() {
  useSEO({ title: "WizShorts™ — AI Shorts Creator", path: "/wiz-shorts", description: "Create viral AI short-form videos for TikTok, YouTube Shorts, and Instagram Reels.", noindex: true });
  const { user, loading: authLoading } = useAuth();
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
  // Audio upload
  const [audioFile, setAudioFile] = useState<File|null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const audioInputRef = useRef<HTMLInputElement>(null);
  // Visual/image uploads (for talking head or b-roll)
  const [visualFiles, setVisualFiles] = useState<File[]>([]);
  const [visualUrls, setVisualUrls] = useState<string[]>([]);
  const visualInputRef = useRef<HTMLInputElement>(null);
  const [features, setFeatures] = useState({
    autoCaptions: true, beatSync: false, hookOptimiser: true, subscribeCta: false, multiPlatform: false,
  });
  const [renderStatus, setRenderStatus] = useState<"idle" | "rendering" | "assembling" | "complete" | "failed">("idle");
  const [completedScenes, setCompletedScenes] = useState(0);
  const [totalScenes, setTotalScenes] = useState(0);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist active job to localStorage so page refresh can recover
  const WIZ_SHORTS_RESUME_KEY = "wizshorts_active_job";
  const persistJob = (jid: number, status: string) => {
    localStorage.setItem(WIZ_SHORTS_RESUME_KEY, JSON.stringify({ jobId: jid, status, ts: Date.now() }));
  };
  const clearPersistedJob = () => localStorage.removeItem(WIZ_SHORTS_RESUME_KEY);

  const createJobMutation = trpc.wizShorts.createJob.useMutation();
  const generateScenesMutation = trpc.wizShorts.generateScenes.useMutation();
  const startRenderMutation = trpc.wizShorts.startRender.useMutation();
  const pollProgressMutation = trpc.wizShorts.pollProgress.useMutation();
  const assembleJobMutation = trpc.wizShorts.assembleJob.useMutation();
  const getJobQuery = trpc.wizShorts.getJob.useQuery(
    { jobId: jobId ?? 0 },
    { enabled: false } // manually triggered via refetch
  );

  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  // Quick-start pre-fill: ?demo=1&prompt=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1" && params.get("prompt")) {
      setTopic(params.get("prompt") as string);
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On mount: check localStorage for an in-progress job and resume
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    try {
      const saved = localStorage.getItem(WIZ_SHORTS_RESUME_KEY);
      if (!saved) return;
      const { jobId: savedJobId, status: savedStatus, ts } = JSON.parse(saved);
      // Only resume jobs less than 30 minutes old
      if (Date.now() - ts > 30 * 60 * 1000) { clearPersistedJob(); return; }
      if (!savedJobId) return;
      if (savedStatus === "assembling" || savedStatus === "rendering" || savedStatus === "scenes_ready") {
        setJobId(savedJobId);
        setStep("render");
        setRenderStatus(savedStatus === "assembling" ? "assembling" : "rendering");
        toast.info("Resuming your WizShorts build...");
        if (savedStatus === "assembling") {
          startAssemblyPolling(savedJobId);
        } else {
          startPolling(savedJobId);
        }
      } else if (savedStatus === "complete") {
        clearPersistedJob();
      }
    } catch (_) { clearPersistedJob(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  /** Converts raw API/server error messages into user-friendly text */
  const friendlyError = (err: any, fallback: string): string => {
    const msg: string = err?.message || err?.data?.message || fallback;
    if (/capacity|rate.?limit|busy|429/i.test(msg)) return "Our servers are at capacity right now. Please try again in a moment.";
    if (/auth|401|403|forbidden/i.test(msg)) return "Session expired. Please refresh and try again.";
    if (/timeout|network|ECONNRESET/i.test(msg)) return "Connection timed out. Please check your internet and try again.";
    return msg;
  };

  const handleCreateJob = async () => {
    if (!user) { window.location.href = getLoginUrl("/wiz-shorts"); return; }
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
      toast.error(friendlyError(err, "Failed to create job"));
    }
  };

  const handleStartRender = async () => {
    if (!jobId) return;
    try {
      await startRenderMutation.mutateAsync({ jobId });
      mp.buildStarted("WizShorts");
      setStep("render");
      setRenderStatus("rendering");
      persistJob(jobId, "rendering");
      startPolling(jobId);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to start render"));
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
        } else if (result.status === "scenes_ready") {
          // All scenes rendered — stop scene-polling and trigger background assembly
          clearInterval(pollIntervalRef.current!);
          setCompletedScenes((result as any).completedScenes ?? 0);
          setRenderStatus("assembling" as any);
          persistJob(jid, "assembling");
          toast.info("Scenes ready — assembling final video...");
          try {
            await assembleJobMutation.mutateAsync({ jobId: jid });
          } catch (assembleErr: any) {
            toast.error(assembleErr?.message || "Assembly failed to start");
            setRenderStatus("failed");
            return;
          }
          // Switch to polling getJob every 10s for the final assembled URL
          startAssemblyPolling(jid);
        } else if (result.status === "assembling") {
          // Assembly already running (e.g. page refresh mid-assembly)
          clearInterval(pollIntervalRef.current!);
          setRenderStatus("assembling" as any);
          startAssemblyPolling(jid);
        } else if (result.status === "complete") {
          clearInterval(pollIntervalRef.current!);
          clearPersistedJob();
          setRenderStatus("complete");
          setFinalVideoUrl(result.videoUrl ?? null);
          mp.buildCompleted("WizShorts");
          toast.success("Your WizShort is ready!");
        } else if (result.status === "failed") {
          clearInterval(pollIntervalRef.current!);
          clearPersistedJob();
          setRenderStatus("failed");
          mp.buildFailed("WizShorts");
          toast.error("Build failed. Please try again.");
        }
      } catch (_) {}
    }, 8000);
  };

  const startAssemblyPolling = (jid: number) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const { job } = await getJobQuery.refetch().then((r) => r.data ?? { job: null, scenes: [] });
        if (!job) return;
        if (job.status === "complete") {
          clearInterval(pollIntervalRef.current!);
          clearPersistedJob();
          setRenderStatus("complete");
          setFinalVideoUrl(job.videoUrl ?? null);
          mp.buildCompleted("WizShorts");
          toast.success("Your WizShort is ready!");
        } else if (job.status === "failed") {
          clearInterval(pollIntervalRef.current!);
          clearPersistedJob();
          setRenderStatus("failed");
          mp.buildFailed("WizShorts");
          toast.error("Assembly failed. Please try again.");
        }
        // status === "assembling" → keep polling
      } catch (_) {}
    }, 10000);
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
    clearPersistedJob();
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

  // Page-load auth gate
  if (!authLoading && !user) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#07040d", color: "#e0d8cc", fontFamily: "'Montserrat',sans-serif", alignItems: "center", justifyContent: "center", gap: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "12px", color: "#e0d8cc" }}>WizShorts™ requires an account</h2>
          <p style={{ color: "rgba(224,216,204,0.45)", marginBottom: "32px", lineHeight: 1.6 }}>Sign in to create viral AI short-form videos for TikTok, YouTube Shorts, and Instagram Reels.</p>
          <a href={getLoginUrl("/wiz-shorts")} style={{ display: "inline-block", padding: "12px 32px", background: "linear-gradient(135deg, #d4a843, #b8892a)", color: "#000", borderRadius: "12px", fontWeight: 700, fontSize: "15px", textDecoration: "none" }}>Sign in to continue</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#080808',color:'#e0d8cc',fontFamily:"'Montserrat',sans-serif"}}>

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

          {/* Platform plat-badge chips — compact nav right treatment matching reference */}
          <div className="hidden md:flex items-center gap-1.5">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold tracking-wide transition-all"
                style={{
                  background: platform === p.id ? "rgba(0,0,0,0.7)" : "#141414",
                  border: `1px solid ${platform === p.id ? PLAT_COLOURS[p.id] + "66" : "#222"}`,
                  borderRadius: 3,
                  color: platform === p.id ? PLAT_COLOURS[p.id] : "#666",
                }}
              >
                <span style={{ fontSize: 9 }}>{p.icon}</span>
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

        {/* Stage bar — flat border-bottom underline treatment matching mockup-wizshorts.html */}
        <div style={{ background: "#0a0a0a", borderTop: "1px solid #1a1a1a" }}>
          <div className="flex items-center justify-center overflow-x-auto scrollbar-none">
            {[
              { key: "setup",   label: "Platform" },
              { key: "script",  label: "Script & Hook" },
              { key: "scenes",  label: "Scenes" },
              { key: "upgrade", label: "Upgrade Preview" },
              { key: "render",  label: "Render & Publish" },
            ].map((s, i) => (
              <div key={s.key} className="flex items-center flex-shrink-0">
                <div
                  className="flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap transition-all cursor-pointer"
                  style={{
                    color: stageIdx === i ? "#e07a50" : stageIdx > i ? "#6db86d" : "#444",
                    borderBottom: stageIdx === i ? "2px solid #e05c2a" : "2px solid transparent",
                  }}
                >
                  {/* Stage number badge */}
                  <span
                    className="flex items-center justify-center text-[9px] font-black"
                    style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: stageIdx === i ? "#e05c2a" : stageIdx > i ? "#6db86d" : "#222",
                      color: stageIdx === i ? "#fff" : stageIdx > i ? "#000" : "#555",
                      flexShrink: 0,
                    }}
                  >
                    {stageIdx > i ? "✓" : i + 1}
                  </span>
                  {s.label}
                </div>
                {i < 4 && <span style={{ color: "#2a2a2a", fontSize: 10, padding: "0 2px" }}>›</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Studio Viewport Hero — matching .studio-viewport from mockup-wizshorts.html ── */}
      <div
        className="relative overflow-hidden"
        style={{ height: 520, flexShrink: 0 }}
      >
        {/* Studio background image */}
        <img
          src={ENV_IMG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 40%", filter: `brightness(${0.3 + (ambience/100)*0.85})`, transition: "filter 0.5s ease" }}
          draggable={false}
        />
        {/* Gradient overlay — stronger base */}
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.3)" }} />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.2) 0%, rgba(8,8,8,0.05) 40%, rgba(8,8,8,0.9) 100%)" }}
        />

        {/* mon-main — floating creator dashboard panel, centre of viewport */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: "29%", top: "15%",
            width: "42%", height: "52%",
            background: "rgba(8,6,18,0.85)",
            border: "1px solid rgba(217,70,239,0.2)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {/* mon header */}
          <div
            style={{
              padding: "3px 8px",
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: "0.5px",
              background: "rgba(20,8,20,0.95)",
              borderBottom: "1px solid rgba(217,70,239,0.2)",
              color: "#d946ef",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>WIZSHORTS™ — CREATOR DASHBOARD</span>
            <span style={{ color: "#555" }}>{PLATFORMS.find(p => p.id === platform)?.label} Shorts · 9:16</span>
          </div>
          {/* Stats grid */}
          <div style={{ padding: "5px 8px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            {[
              { label: "SUBSCRIBERS", val: "124.7K", sub: "▲ +2.1K this week", color: "#ff6666" },
              { label: "TOTAL VIEWS",  val: "8.4M",   sub: "Last 28 days",      color: "#d4a843" },
              { label: "SHORTS MADE", val: "47",      sub: "12 this month",     color: "#fff" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#1a0e08", borderRadius: 2, padding: "5px 6px" }}>
                <div style={{ fontSize: 6, color: "#e07a50", fontWeight: 700, letterSpacing: "0.5px" }}>{s.label}</div>
                <div style={{ fontSize: 12, fontWeight: 900, color: s.color, marginTop: 1 }}>{s.val}</div>
                <div style={{ fontSize: 6, color: "#3a3a3a" }}>{s.sub}</div>
              </div>
            ))}
          </div>
          {/* Live / next upload row */}
          <div style={{ padding: "0 8px 5px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            <div style={{ background: "#0d0d0d", borderRadius: 2, padding: "4px 6px", display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4444", animation: "wizLivePulse 1s infinite" }} />
              <div>
                <div style={{ fontSize: 6, color: "#ff6666", fontWeight: 700 }}>LIVE NOW</div>
                <div style={{ fontSize: 8, color: "#888", fontWeight: 700 }}>1,247 watching</div>
              </div>
            </div>
            <div style={{ background: "#0d0d0d", borderRadius: 2, padding: "4px 6px" }}>
              <div style={{ fontSize: 6, color: "#555", fontWeight: 700 }}>NEXT UPLOAD</div>
              <div style={{ fontSize: 8, color: "#ccc", fontWeight: 700 }}>In 2 days</div>
            </div>
          </div>
          {/* Mini scene strip */}
          <div style={{ padding: "0 8px 5px", display: "flex", gap: 3 }}>
            {[
              { id: "SC01", bg: "linear-gradient(135deg,#2a1a0a,#3a2a10)", color: "#e07a50" },
              { id: "SC02", bg: "linear-gradient(135deg,#1a1a2a,#2a2a3a)", color: "#9b7de0" },
              { id: "SC03", bg: "linear-gradient(135deg,#1a2a1a,#2a3a2a)", color: "#6db86d" },
              { id: "SC04", bg: "linear-gradient(135deg,#2a1a1a,#3a2a2a)", color: "#d4a843" },
              { id: "SC05", bg: "#141414",                                  color: "#333" },
            ].map((sc) => (
              <div key={sc.id} style={{ flex: 1, height: 18, background: sc.bg, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 6, color: sc.color }}>{sc.id}</div>
            ))}
          </div>
        </div>

        {/* channel-stats HUD — top-left of viewport */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: 12, left: 14,
            background: "rgba(0,0,0,0.7)",
            border: "1px solid #1e1e1e",
            borderRadius: 4,
            padding: "8px 12px",
            backdropFilter: "blur(4px)",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: "0.5px" }}>@TimCreates</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
            {[
              { val: "124.7K", lbl: "YT Subs",     color: "#ff6666" },
              { val: "89.2K",  lbl: "TikTok",      color: "#ccc" },
              { val: "8.4M",   lbl: "Total Views", color: "#d4a843" },
              { val: "47",     lbl: "Shorts Made", color: "#6db86d" },
            ].map((s) => (
              <div key={s.lbl} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</span>
                <span style={{ fontSize: 7, color: "#555", letterSpacing: "0.5px", textTransform: "uppercase", marginTop: 1 }}>{s.lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* REC indicator — top-right of viewport */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: 12, right: 14,
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(0,0,0,0.6)",
            border: "1px solid #222",
            padding: "5px 10px",
            borderRadius: 3,
          }}
        >
          <div
            style={{
              width: 7, height: 7, borderRadius: "50%",
              background: renderStatus === "rendering" ? "#ff4444" : "#444",
              animation: renderStatus === "rendering" ? "wizLivePulse 1s ease-in-out infinite" : "none",
            }}
          />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: renderStatus === "rendering" ? "#ff6666" : "#666" }}>
            {renderStatus === "rendering" ? "LIVE · 1,247" : "STANDBY"}
          </span>
        </div>

        {/* studio-session-info — bottom-left of viewport */}
        <div
          className="absolute pointer-events-none"
          style={{ bottom: 14, left: 16 }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Session</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", letterSpacing: 1, marginTop: 2, fontFamily: "'Bebas Neue', sans-serif" }}>
            {PLATFORMS.find(p => p.id === platform)?.label} Shorts · {duration}s
          </div>
          <div style={{ fontSize: 10, color: "#e07a50", marginTop: 2 }}>
            {MOCK_SCENES.length} Scenes · {VISUAL_STYLES.find(s => s.id === visualStyle)?.label} · Hook: {selectedHook !== null ? "Selected" : "None"}
          </div>
        </div>

        {/* Ambient dimmer control — bottom-right of viewport */}
        <div
          className="absolute"
          style={{ bottom: 14, right: 16, display: "flex", alignItems: "center", gap: 8 }}
        >
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase" }}>Ambience</span>
          <input
            type="range" min={20} max={100} value={ambience}
            onChange={(e) => setAmbience(Number(e.target.value))}
            className="w-20 h-1 accent-fuchsia-500 cursor-pointer"
          />
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{ambience}%</span>
        </div>
        {/* EQ Visualiser strip — bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none" style={{ padding: "0 16px 4px" }}>
          <AnimatedEqualiser barCount={52} color="#e05c2a" height={44} alwaysAnimate={true} />
        </div>
      </div>

      {/* ── DIRECTOR'S BRIEF — large hero prompt, always visible in setup ── */}
      {step === "setup" && (
        <div style={{ background: "linear-gradient(180deg, rgba(217,70,239,0.08) 0%, rgba(0,0,0,0) 100%)", borderBottom: "1px solid rgba(217,70,239,0.18)", padding: "28px 32px 24px" }}>
          {/* Label row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 3, height: 32, background: `linear-gradient(180deg, ${FX}, #e05c2a)`, borderRadius: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" as const, color: FX, marginBottom: 3 }}>DIRECTOR'S BRIEF</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>What is your Short about? WizShorts™ generates scenes, hooks, captions &amp; music automatically.</div>
            </div>
          </div>
          {/* Starter templates — shown only when topic is empty or default */}
          {(topic === "5 things nobody tells you about starting a YouTube channel" || !topic.trim()) && (
            <StarterTemplates
              studio="wizshorts"
              onSelect={(prompt) => setTopic(prompt)}
              accentColor="#d946ef"
              className="mb-4"
            />
          )}
          {/* Large prompt input */}
          <div style={{ position: "relative" as const, maxWidth: 920 }}>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && topic.trim()) handleCreateJob(); }}
              placeholder="e.g. 5 things nobody tells you about starting a YouTube channel..."
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: topic.trim() ? `1.5px solid ${FX_BORDER}` : "1.5px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                padding: "16px 180px 16px 20px",
                fontSize: 16,
                fontWeight: 500,
                color: "white",
                outline: "none",
                transition: "border-color 0.2s",
                boxShadow: topic.trim() ? `0 0 0 3px ${FX_DIM}` : "none",
              }}
              autoFocus
            />
            <button
              onClick={handleCreateJob}
              disabled={createJobMutation.isPending || generateScenesMutation.isPending || !topic.trim()}
              style={{
                position: "absolute" as const,
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: topic.trim() ? `linear-gradient(90deg, ${FX} 0%, #e05c2a 100%)` : "rgba(255,255,255,0.06)",
                border: "none",
                borderRadius: 10,
                padding: "10px 22px",
                color: topic.trim() ? "white" : "rgba(255,255,255,0.3)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase" as const,
                cursor: topic.trim() ? "pointer" : "default",
                transition: "all 0.2s",
                whiteSpace: "nowrap" as const,
              }}
            >
              {createJobMutation.isPending || generateScenesMutation.isPending ? "Generating..." : "Create Short →"}
            </button>
          </div>
          {/* Quick-pick topic chips */}
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginTop: 12 }}>
            {["5 things nobody tells you about YouTube", "How I got my first 1000 subscribers", "AI tools that changed my workflow", "Day in my life as a creator", "Biggest mistakes new YouTubers make"].map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                style={{
                  fontSize: 11,
                  padding: "5px 13px",
                  borderRadius: 20,
                  border: `1px solid ${topic === t ? FX_BORDER : "rgba(255,255,255,0.1)"}`,
                  background: topic === t ? FX_DIM : "rgba(255,255,255,0.03)",
                  color: topic === t ? FX : "rgba(255,255,255,0.45)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── AUDIO UPLOAD BANNER ── */}
      <input ref={audioInputRef} type="file" accept="audio/*" style={{display:"none"}}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) { setAudioFile(f); setAudioUrl(URL.createObjectURL(f)); }
        }}
      />
      <input ref={visualInputRef} type="file" accept="image/*,video/*" multiple style={{display:"none"}}
        onChange={e => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) {
            setVisualFiles(prev => [...prev, ...files]);
            setVisualUrls(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
          }
        }}
      />
      {!audioFile ? (
        <div
          onClick={() => audioInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith("audio/")) { setAudioFile(f); setAudioUrl(URL.createObjectURL(f)); } }}
          style={{
            flexShrink: 0, cursor: "pointer", transition: "background 0.2s",
            background: "linear-gradient(90deg, rgba(217,70,239,0.12) 0%, rgba(217,70,239,0.06) 100%)",
            borderBottom: "1px solid rgba(217,70,239,0.25)",
            padding: "12px 24px", display: "flex", alignItems: "center", gap: 14,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "linear-gradient(90deg, rgba(217,70,239,0.2) 0%, rgba(217,70,239,0.1) 100%)")}
          onMouseLeave={e => (e.currentTarget.style.background = "linear-gradient(90deg, rgba(217,70,239,0.12) 0%, rgba(217,70,239,0.06) 100%)")}
        >
          <div style={{width:40,height:40,borderRadius:8,background:"rgba(217,70,239,0.18)",border:"1px solid rgba(217,70,239,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}></div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:800,color:FX,letterSpacing:"0.8px",marginBottom:2}}>ADD BACKGROUND MUSIC OR AUDIO TRACK</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.4)"}}>MP3, WAV, M4A · WizShorts™ syncs beat cuts, captions and transitions to your audio</div>
          </div>
          <div style={{fontSize:9,fontWeight:700,color:"rgba(217,70,239,0.7)",border:"1px solid rgba(217,70,239,0.3)",padding:"5px 12px",borderRadius:3,flexShrink:0}}>CLICK OR DROP</div>
        </div>
      ) : (
        <div style={{flexShrink:0,background:"rgba(109,184,109,0.08)",borderBottom:"1px solid rgba(109,184,109,0.2)",padding:"8px 24px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#6db86d",boxShadow:"0 0 6px #6db86d",flexShrink:0}} />
          <div style={{fontSize:10,fontWeight:700,color:"#6db86d"}}>AUDIO LOADED — {audioFile.name}</div>
          <div style={{flex:1,height:28}}><AnimatedEqualiser barCount={32} color="#6db86d" height={28} alwaysAnimate={true} /></div>
          <button onClick={() => { setAudioFile(null); setAudioUrl(""); }} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:13}}>×</button>
        </div>
      )}
      {/* ── VISUAL / IMAGE UPLOAD BANNER ── */}
      <div
        onClick={() => visualInputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
          if (files.length) { setVisualFiles(prev => [...prev, ...files]); setVisualUrls(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]); }
        }}
        style={{
          flexShrink: 0, cursor: "pointer", transition: "background 0.2s",
          background: visualUrls.length > 0
            ? "linear-gradient(90deg, rgba(109,184,109,0.08) 0%, rgba(109,184,109,0.04) 100%)"
            : "linear-gradient(90deg, rgba(255,165,0,0.08) 0%, rgba(255,165,0,0.04) 100%)",
          borderBottom: "1px solid rgba(255,165,0,0.2)",
          padding: "10px 24px", display: "flex", alignItems: "center", gap: 14,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "linear-gradient(90deg, rgba(255,165,0,0.14) 0%, rgba(255,165,0,0.07) 100%)")}
        onMouseLeave={e => (e.currentTarget.style.background = visualUrls.length > 0
          ? "linear-gradient(90deg, rgba(109,184,109,0.08) 0%, rgba(109,184,109,0.04) 100%)"
          : "linear-gradient(90deg, rgba(255,165,0,0.08) 0%, rgba(255,165,0,0.04) 100%)")}
      >
        <div style={{width:36,height:36,borderRadius:8,background:"rgba(255,165,0,0.18)",border:"1px solid rgba(255,165,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}></div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:800,color:"#ffa500",letterSpacing:"0.8px",marginBottom:2}}>UPLOAD VISUALS — PHOTOS, B-ROLL, FACE CAM</div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.4)"}}>JPG, PNG, MP4 · Upload your face cam, product shots, or b-roll for AI to use in your Short</div>
        </div>
        {visualUrls.length > 0 ? (
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {visualUrls.slice(0,4).map((url, i) => (
              <img key={i} src={url} alt="" style={{width:32,height:32,objectFit:"cover",borderRadius:4,border:"1px solid rgba(255,165,0,0.4)"}} />
            ))}
            {visualUrls.length > 4 && <span style={{fontSize:9,color:"#ffa500",fontWeight:700}}>+{visualUrls.length-4}</span>}
            <button onClick={e => { e.stopPropagation(); setVisualFiles([]); setVisualUrls([]); }} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:13,marginLeft:4}}>×</button>
          </div>
        ) : (
          <div style={{fontSize:9,fontWeight:700,color:"rgba(255,165,0,0.7)",border:"1px solid rgba(255,165,0,0.3)",padding:"5px 12px",borderRadius:3,flexShrink:0}}>CLICK OR DROP</div>
        )}
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
                {/* Hook Builder — orange gradient treatment matching mockup-wizshorts.html .hook-builder */}
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: "linear-gradient(135deg, rgba(30,15,8,0.85), rgba(15,8,4,0.95))",
                    border: "1px solid rgba(224,92,42,0.25)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white tracking-widest uppercase">
                      Hook Builder{" "}
                      <span style={{ color: "#e05c2a", fontSize: 9, fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>— First 3 seconds decide everything</span>
                    </h3>
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
                    <button
                      className="flex items-center gap-1.5 text-[10px] font-semibold transition-all"
                      style={{
                        background: "#1a1a1a",
                        border: "1px solid #2a2a2a",
                        color: "#666",
                        padding: "4px 10px",
                        borderRadius: 3,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e05c2a"; (e.currentTarget as HTMLButtonElement).style.color = "#e07a50"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a"; (e.currentTarget as HTMLButtonElement).style.color = "#666"; }}
                    >
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
                ) : renderStatus === "assembling" ? (
                  <div className="text-center space-y-6">
                    <div className="relative w-32 h-32 mx-auto">
                      <div
                        className="absolute inset-0 rounded-full border-2 animate-spin"
                        style={{ borderColor: "rgba(168,85,247,0.2)", borderTopColor: "#a855f7", animationDuration: "2s" }}
                      />
                      <div
                        className="absolute inset-3 rounded-full border-2 animate-pulse"
                        style={{ borderColor: `${FX}55`, borderTopColor: FX }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="w-10 h-10" style={{ color: "#a855f7" }} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Assembling final video...</h2>
                      <p className="text-white/50 text-sm">{completedScenes} scenes assembled — stitching and encoding</p>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="h-2 rounded-full animate-pulse"
                        style={{ width: "85%", background: `linear-gradient(90deg, #a855f7 0%, ${FX} 100%)` }}
                      />
                    </div>
                    <p className="text-white/30 text-xs">This usually takes 10–30 seconds</p>
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
                    <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Rendering unavailable</h2>
                      <p className="text-sm text-white/50 max-w-xs mx-auto">Our rendering servers are at capacity right now. This usually clears within 30–60 seconds.</p>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={() => { setRenderStatus("rendering"); startPolling(jobId!); }}
                        className="h-11 px-6 font-bold rounded-xl border-0"
                        style={{ background: `linear-gradient(90deg, ${FX} 0%, #a855f7 100%)`, color: "white" }}
                      >
                        <Play className="w-4 h-4 mr-2" />Try Again
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
                <div className="text-[9px] text-white/30 mt-2"> Preview only</div>
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
                      {i > 0 && <div className="text-[8px] mt-0.5"></div>}
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
      <LandscapeHint />
    </div>
  );
}
