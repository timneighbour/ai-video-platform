import { useAuth } from "@/_core/hooks/useAuth";
import { analytics } from "@/lib/analytics";
import { mp } from "@/lib/mixpanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Wand2, Sparkles, RefreshCw, Play, ChevronRight,
  Zap, CheckCircle2, Clock, Film, ArrowLeft, Loader2,
  Music, AlertCircle, Download, ExternalLink, Clapperboard,
  Plus, Trash2, Copy, ImageIcon, Video, X, Eye,
} from "@/lib/icons";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import CreditBalance from "@/components/CreditBalance";
import { LowCreditBanner } from "@/components/LowCreditBanner";
import { useCreditGuard } from "@/hooks/useCreditGuard";
import { WizBrandBadge } from "@/components/WizBrand";
import AuthGate from "@/components/AuthGate";
import { useSEO } from "@/hooks/useSEO";
import { VoicePromptButton } from "@/components/VoicePromptButton";
import { CreditCostBanner } from "@/components/CreditCostBanner";
import { QuickTopUpModal } from "@/components/QuickTopUpModal";

// YouTube brand colour
const YT_RED = "#FF0000";

const VIDEO_STYLES = [
  { id: "cinematic", label: "Cinematic", desc: "Hollywood-quality realism", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-cinematic-1-7fzYSK4QF3mixYeH3YCQwJ.webp" },
  { id: "anime", label: "Anime", desc: "Japanese animation style", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-anime-1-V8cGaKNXBvMPgNtyuk2xCr.webp" },
  { id: "pixar", label: "Stylised 3D", desc: "Vibrant 3D animation", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-pixar-1-63hx7LosqShdkEWUgxNme8.webp" },
  { id: "documentary", label: "Documentary", desc: "Authentic & raw footage", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-documentary-1-27gSFotXB4DE92dN47HiDu.webp" },
  { id: "abstract", label: "Abstract", desc: "Artistic visual journey", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-abstract-2-WyT8jPLyFBhfgxtbBwkvUy.webp" },
  { id: "vintage", label: "Vintage", desc: "Retro film aesthetic", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-vintage-2-NJ6jDetQEdsupChus3Npta.webp" },
  { id: "neon_noir", label: "Neon Noir", desc: "Dark cyberpunk neon glow", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-neon-noir-1-GDpPcEYGEwEHgfbURRVa2k.webp" },
  { id: "disney", label: "Disney", desc: "Magical Disney animation", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-disney-1-6yqZHZYNgMr4yD3vZEFnJS.webp" },
  { id: "epic_fantasy", label: "Epic Fantasy", desc: "Dramatic magical landscapes", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-epic-fantasy-2-KL5YAPEZG5DuMGKfganeji.webp" },
  { id: "realistic", label: "Realistic", desc: "True-to-life photorealism", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-realistic-2-Xg8LGZv3hqv8kvqqApjVav.webp" },
  { id: "horror", label: "Horror", desc: "Dark, eerie & atmospheric", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-horror-1-SiNk872QcoYBRoMFbonyfG.webp" },
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

const PROGRESS_STAGES = [
  { label: "Submitting your request…", pct: 8 },
  { label: "WizCreate™ is analysing your prompt…", pct: 18 },
  { label: "WizCreate™ is building scene composition…", pct: 32 },
  { label: "WizRender™ is generating frames…", pct: 52 },
  { label: "WizRender™ is applying style & colour grading…", pct: 68 },
  { label: "WizRender™ is building final video…", pct: 82 },
  { label: "Finalising & uploading…", pct: 94 },
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

let nextSceneId = 100;

// YouTube logo SVG inline
function YouTubeLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size * 1.42} height={size} viewBox="0 0 71 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M69.5 7.8C68.7 4.9 66.4 2.6 63.5 1.8C57.9 0.3 35.5 0.3 35.5 0.3C35.5 0.3 13.1 0.3 7.5 1.8C4.6 2.6 2.3 4.9 1.5 7.8C0 13.4 0 25 0 25C0 25 0 36.6 1.5 42.2C2.3 45.1 4.6 47.4 7.5 48.2C13.1 49.7 35.5 49.7 35.5 49.7C35.5 49.7 57.9 49.7 63.5 48.2C66.4 47.4 68.7 45.1 69.5 42.2C71 36.6 71 25 71 25C71 25 71 13.4 69.5 7.8Z" fill="#FF0000"/>
      <path d="M28.4 35.5L46.9 25L28.4 14.5V35.5Z" fill="white"/>
    </svg>
  );
}

export default function Autopilot() {

  useSEO({ title: "WizPilot™ — AI Video Autopilot — WIZ AI", path: "/wizpilot", description: "Let AI handle everything. WizPilot™ takes your prompt and automatically generates a complete video with scenes, transitions, music, and effects.", noindex: true });
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { balance: creditBalance } = useCreditGuard();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [, setLocation] = useLocation();

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

  // Photo / video context uploads
  const [contextImageFile, setContextImageFile] = useState<File | null>(null);
  const [contextImageUrl, setContextImageUrl] = useState<string | null>(null);
  const [contextVideoFile, setContextVideoFile] = useState<File | null>(null);
  const [uploadingContext, setUploadingContext] = useState(false);

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

  useEffect(() => { if (isAuthenticated) { mp.studioEntered("WizPilot"); } }, [isAuthenticated]);
  useEffect(() => () => stopProgressAnimation(), [stopProgressAnimation]);

  const utils = trpc.useUtils();

  const startPolling = useCallback((pid: number) => {
    let pollBackoffMs = 8000;
    const MAX_POLL_BACKOFF_MS = 60000;
    const schedulePoll = () => {
      if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = setTimeout(async () => {
        try {
          const result = await utils.billing.checkVideoStatus.fetch({ projectId: pid });
          if (result.status === "completed" && result.videoUrl) {
            stopProgressAnimation();
            setProgressPct(100);
            setGeneratedVideoUrl(result.videoUrl);
            setStep("done");
            toast.success("– Your video is ready!");
            return;
          } else if (result.status === "failed") {
            stopProgressAnimation();
            setGenerationError(result.error || "Video generation failed. Please try again.");
            setStep("storyboard");
            toast.error(result.error || "Video generation failed. Please try again.");
            return;
          }
          // Still processing — reset backoff and continue
          pollBackoffMs = 8000;
          schedulePoll();
        } catch (err: any) {
          const is429 = String(err?.message).includes("429") || String(err?.message).toLowerCase().includes("rate limit");
          if (is429) {
            pollBackoffMs = Math.min(pollBackoffMs * 2, MAX_POLL_BACKOFF_MS);
            console.warn(`[WizScript] Rate limited. Backing off to ${pollBackoffMs}ms`);
          }
          // network hiccup or rate limit — keep polling with backoff
          schedulePoll();
        }
      }, pollBackoffMs) as unknown as ReturnType<typeof setInterval>;
    };
    schedulePoll();
  }, [utils, stopProgressAnimation]);

  // tRPC mutations
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
        toast.success("– Your video is ready!");
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
  const generateAIStoryboardMutation = trpc.billing.generateAIStoryboard.useMutation();
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [consistencyAnchor, setConsistencyAnchor] = useState<string | undefined>(undefined);

  // Generate AI preview image for a single scene
  const generatePreviewForScene = useCallback(async (sceneId: number, anchor?: string) => {
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
        contextImageUrl: contextImageUrl || undefined,
        consistencyAnchor: anchor ?? consistencyAnchor,
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
  }, [storyboard, style, contextImageUrl, generateScenePreviewMutation]);

  // Generate previews for all scenes
  const generateAllPreviews = useCallback(async (scenes: StoryboardScene[], anchor?: string) => {
    for (const scene of scenes) {
      await generatePreviewForScene(scene.id, anchor);
    }
  }, [generatePreviewForScene]);

  // Storyboard handlers — AI world-lock system
  const handleGenerateStoryboard = useCallback(async () => {
    if (!prompt.trim() || prompt.length < 10) {
      toast.error("Please enter a prompt of at least 10 characters.");
      return;
    }
    setGenerationError(null);
    setIsGeneratingStoryboard(true);
    try {
      const styleLabel = VIDEO_STYLES.find((s) => s.id === style)?.label || style;
      const result = await generateAIStoryboardMutation.mutateAsync({ prompt: prompt.trim(), style: styleLabel });
      const anchor = result.consistencyAnchor;
      setConsistencyAnchor(anchor);
      const scenes: StoryboardScene[] = result.scenes.map((s: any, i: number) => ({
        id: i + 1,
        title: s.title,
        description: s.description,
        visualNotes: s.visualNotes,
        duration: s.duration ?? "4s",
      }));
      setStoryboard(scenes);
      setStep("storyboard");
      setTimeout(() => generateAllPreviews(scenes, anchor), 100);
    } catch (err: any) {
      toast.error(err.message || "Storyboard generation failed. Please try again.");
    } finally {
      setIsGeneratingStoryboard(false);
    }
  }, [prompt, style, generateAIStoryboardMutation, generateAllPreviews]);

  const handleRegenerateStoryboard = useCallback(async () => {
    setGenerationError(null);
    setRegenerating(true);
    try {
      const styleLabel = VIDEO_STYLES.find((s) => s.id === style)?.label || style;
      const result = await generateAIStoryboardMutation.mutateAsync({ prompt: prompt.trim(), style: styleLabel });
      const anchor = result.consistencyAnchor;
      setConsistencyAnchor(anchor);
      const scenes: StoryboardScene[] = result.scenes.map((s: any, i: number) => ({
        id: i + 1,
        title: s.title,
        description: s.description,
        visualNotes: s.visualNotes,
        duration: s.duration ?? "4s",
      }));
      setStoryboard(scenes);
      toast.success("Storyboard regenerated — free of charge!");
      generateAllPreviews(scenes, anchor);
    } catch (err: any) {
      toast.error(err.message || "Storyboard regeneration failed.");
    } finally {
      setRegenerating(false);
    }
  }, [prompt, style, generateAIStoryboardMutation, generateAllPreviews]);

  // Scene editing handlers
  const updateScene = useCallback((id: number, field: keyof StoryboardScene, value: string) => {
    setStoryboard((prev) =>
      prev.map((s) => s.id === id ? { ...s, [field]: value } : s)
    );
  }, []);

  const addScene = useCallback(() => {
    const styleDesc = VIDEO_STYLES.find((s) => s.id === style)?.label || "Cinematic";
    const newScene: StoryboardScene = {
      id: ++nextSceneId,
      title: "New Scene",
      description: "Describe what happens in this scene…",
      visualNotes: `${styleDesc} composition. Add your visual direction here.`,
      duration: "4s",
    };
    setStoryboard((prev) => [...prev, newScene]);
    toast.success("Scene added.");
  }, [style]);

  const removeScene = useCallback((id: number) => {
    setStoryboard((prev) => {
      if (prev.length <= 1) {
        toast.error("You need at least one scene.");
        return prev;
      }
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const copySceneText = useCallback((scene: StoryboardScene) => {
    const text = `${scene.title}\n${scene.description}\nVisual notes: ${scene.visualNotes}`;
    navigator.clipboard.writeText(text).then(() => toast.success("Scene text copied!"));
  }, []);

  const handleRenderVideo = useCallback(() => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl("/wizpilot");
      return;
    }
    analytics.renderVideoClicked("wizpilot");
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

  // Context image upload (read as data URL for preview, store URL for API)
  const handleContextImageChange = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB");
      return;
    }
    setContextImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setContextImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
    toast.success(`Photo uploaded: ${file.name}`);
  }, []);

  const handleContextVideoChange = useCallback((file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video must be under 100 MB");
      return;
    }
    setContextVideoFile(file);
    toast.success(`Video uploaded: ${file.name}`);
  }, []);

  const stepIndex = { input: 0, storyboard: 1, generating: 2, done: 2 }[step];

  // Page-load auth gate
  if (!authLoading && !isAuthenticated) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#06050a", color: "#e0d8cc", fontFamily: "'Montserrat',sans-serif", alignItems: "center", justifyContent: "center", gap: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "12px", color: "#e0d8cc" }}>WizPilot™ requires an account</h2>
          <p style={{ color: "rgba(224,216,204,0.45)", marginBottom: "32px", lineHeight: 1.6 }}>Sign in to describe, storyboard, and render AI-powered videos automatically.</p>
          <a href={getLoginUrl("/wizpilot")} style={{ display: "inline-block", padding: "12px 32px", background: "linear-gradient(135deg, #d4a843, #b8892a)", color: "#000", borderRadius: "12px", fontWeight: 700, fontSize: "15px", textDecoration: "none" }}>Sign in to continue</a>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen studio-bg text-white" style={{backgroundColor:'#06050a'}}>
      {/* ── VR Environment: Live Broadcast TV Control Room ── */}
      <div className="env-bg">
        <img src="/manus-storage/env-broadcast-studio_5a824d1f.jpg" alt="" />
        <div className="env-bg-overlay" />
      </div>
      <div className="env-ambient env-tint-blue" />
      {/* Header — Mockup-style sticky nav */}
      <div className="sticky top-0 z-40" style={{background:'rgba(10,10,10,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between">
          <Button
            variant="ghost" size="sm"
            onClick={() => {
              if (step === "storyboard") setStep("input");
              else if (step === "generating") toast.info("Video is building — you can check progress in Projects.");
              else setLocation("/");
            }}
            className="gap-2 text-white/50 hover:text-white text-xs font-medium tracking-wider uppercase"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Studio</span>
          </Button>
          <a href="/">
            <img src="/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png" alt="WIZ AI" className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(196,164,100,0.15)]" loading="eager" decoding="async" />
          </a>
          <CreditBalance variant="badge" />
        </div>
        {/* Stage pills */}
        <div className="max-w-3xl mx-auto px-4 pb-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {[
              { key: "input", label: "Describe" },
              { key: "storyboard", label: "Storyboard" },
              { key: "generating", label: "Render" },
            ].map((s, i) => {
              const isActive = stepIndex === i;
              const isDone = stepIndex > i;
              return (
                <React.Fragment key={s.key}>
                  <div style={{
                    display:'flex',alignItems:'center',gap:6,
                    padding:'5px 14px',borderRadius:20,
                    fontSize:11,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',
                    whiteSpace:'nowrap',
                    background: isActive ? 'linear-gradient(135deg,#d4a843,#b8892a)' : isDone ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.04)',
                    border: isActive ? '1px solid #d4a843' : isDone ? '1px solid rgba(212,168,67,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    color: isActive ? '#000' : isDone ? '#d4a843' : 'rgba(255,255,255,0.35)',
                  }}>
                    <span style={{width:18,height:18,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,background:isActive?'rgba(0,0,0,0.25)':isDone?'rgba(212,168,67,0.2)':'rgba(255,255,255,0.08)',color:isActive?'#000':isDone?'#d4a843':'rgba(255,255,255,0.4)'}}>
                      {isDone ? '✓' : i + 1}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < 2 && <ChevronRight className="w-3 h-3 flex-shrink-0" style={{color:'rgba(255,255,255,0.2)'}} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
      {/* Production Set Hero — matches mockup */}
      <div style={{position:'relative',width:'100%',height:180,overflow:'hidden',background:'#000'}}>
        <img
          src="/manus-storage/env-broadcast-studio_5a824d1f.jpg"
          alt="Production Set"
          style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 40%',filter:'brightness(0.5)'}}
        />
        <div style={{position:'absolute',inset:0,background:'linear-gradient(0deg,rgba(10,10,10,1) 0%,rgba(10,10,10,0.35) 40%,transparent 100%)',pointerEvents:'none'}} />
        <div style={{position:'absolute',top:16,left:24,zIndex:20}}>
          <div style={{fontSize:9,fontWeight:600,letterSpacing:'2.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.4)',marginBottom:3}}>WizAI</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:3,color:'rgba(255,255,255,0.9)',textShadow:'0 2px 20px rgba(0,0,0,0.8)',lineHeight:1}}>WIZVIDEO AUTOPILOT</div>
          <div style={{fontSize:11,fontWeight:500,color:'#d4a843',letterSpacing:'0.5px',marginTop:3}}>Describe · Storyboard · Render</div>
        </div>
        <div style={{position:'absolute',top:16,right:24,display:'flex',alignItems:'center',gap:7,background:'rgba(0,0,0,0.75)',border:'1px solid rgba(255,59,48,0.5)',borderRadius:3,padding:'5px 12px',zIndex:20}}>
          <YouTubeLogo size={14} />
          <div style={{fontSize:10,fontWeight:800,letterSpacing:2,textTransform:'uppercase',color:'#ff3b30'}}>YouTube Ready</div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-6 sm:py-10 max-w-3xl">

        {/* ── STEP 1: INPUT ── */}
        {step === "input" && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/10 px-4 py-1.5 text-xs sm:text-sm text-[--color-gold] mb-4">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                Storyboard generation is always free — pay only when you build your final video
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Describe Your Video
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Tell WIZ AI what you want to create. We'll generate a free storyboard you can refine before spending any credits.
              </p>
            </div>

            {/* Prompt Input — Broadcast Studio Terminal */}
            <div className="studio-card overflow-hidden">
              {/* Terminal header bar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[--color-gold]/10 bg-black/40">
                <div className="flex items-center gap-2.5">
                  <span className={`studio-led ${prompt.length >= 10 ? 'studio-led-green' : 'studio-led-off'}`} />
                  <span className="studio-label tracking-widest">PRODUCTION BRIEF</span>
                  <span className={`text-[10px] font-mono ${prompt.length >= 10 ? 'text-green-400' : 'text-white/20'}`}>
                    {prompt.length >= 10 ? '\u25cf LOCKED' : '\u25cb STANDBY'}
                  </span>
                </div>
                <VoicePromptButton
                  toolContext="video automation and storyboarding"
                  onPromptReady={(refined) => setPrompt(refined)}
                />
              </div>
              <div className="p-4 sm:p-5">
                <label className="block text-xs font-mono text-white/40 uppercase tracking-widest mb-2">
                  Video Prompt <span className="text-white/20">(min. 10 characters)</span>
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A futuristic city at sunset with flying cars weaving between neon-lit skyscrapers, cinematic drone shot…"
                  className="w-full h-28 sm:h-32 rounded-xl border border-white/8 bg-black/30 px-4 py-3 text-white placeholder:text-white/20 resize-none focus:outline-none focus:ring-1 focus:ring-[--color-gold]/50 text-sm font-mono"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-mono text-white/20">{prompt.length} / 1000</span>
                  {prompt.length >= 10 && (
                    <span className="text-xs font-mono text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> BRIEF LOCKED
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Photo & Video Context Upload */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-white mb-1 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[--color-gold]" />
                  Reference Photo <span className="text-muted-foreground font-normal">(optional)</span>
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload a photo to guide the AI's visual style, colour palette, or subject matter.
                </p>
                {contextImageFile ? (
                  <div className="flex items-center gap-3 rounded-xl border border-[--color-gold]/30 bg-[--color-gold]/10 px-4 py-3">
                    {contextImageUrl && (
                      <img src={contextImageUrl} alt="context" className="h-12 w-16 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{contextImageFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(contextImageFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button
                      onClick={() => { setContextImageFile(null); setContextImageUrl(null); }}
                      className="text-muted-foreground hover:text-red-400 transition flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="context-image-upload"
                    className="flex flex-col items-center justify-center w-full h-20 rounded-xl border-2 border-dashed border-[--color-gold]/30 bg-[--color-gold]/5 cursor-pointer hover:border-[--color-gold]/60 hover:bg-[--color-gold]/10 transition-all"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-5 w-5 text-[--color-gold]" />
                      <span className="text-sm">Tap to upload JPG, PNG, or WEBP</span>
                    </div>
                    <span className="text-xs text-muted-foreground/60 mt-1">Max 10 MB</span>
                    <input
                      id="context-image-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleContextImageChange(file);
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-medium text-white mb-1 flex items-center gap-2">
                  <Video className="h-4 w-4 text-[--color-gold]" />
                  Reference Video <span className="text-muted-foreground font-normal">(optional)</span>
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload a video clip to show the AI the pacing, style, or content you're going for.
                </p>
                {contextVideoFile ? (
                  <div className="flex items-center gap-3 rounded-xl border border-[--color-gold]/30 bg-[--color-gold]/10 px-4 py-3">
                    <Video className="h-8 w-8 text-[--color-gold] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{contextVideoFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(contextVideoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button
                      onClick={() => setContextVideoFile(null)}
                      className="text-muted-foreground hover:text-red-400 transition flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="context-video-upload"
                    className="flex flex-col items-center justify-center w-full h-20 rounded-xl border-2 border-dashed border-[--color-gold]/30 bg-[--color-gold]/5 cursor-pointer hover:border-[--color-gold]/60 hover:bg-[--color-gold]/10 transition-all"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Video className="h-5 w-5 text-[--color-gold]" />
                      <span className="text-sm">Tap to upload MP4, MOV, or WEBM</span>
                    </div>
                    <span className="text-xs text-muted-foreground/60 mt-1">Max 100 MB</span>
                    <input
                      id="context-video-upload"
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleContextVideoChange(file);
                      }}
                    />
                  </label>
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
                    className={`rounded-xl border overflow-hidden text-left transition-all ${
                      style === s.id
                        ? "border-[--color-gold] ring-2 ring-[--color-gold]/40"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    {s.image && (
                      <div className="relative w-full aspect-video overflow-hidden">
                        <img
                          src={s.image}
                          alt={s.label}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                        {style === s.id && (
                          <div className="absolute inset-0 bg-[--color-gold]/15 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-[--color-gold] flex items-center justify-center">
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`p-2 ${style === s.id ? "bg-[--color-gold]/15" : "bg-white/5"}`}>
                      <div className="font-medium text-sm text-white">{s.label}</div>
                      <div className="text-xs text-white/60 mt-0.5 hidden sm:block">{s.desc}</div>
                    </div>
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
                          ? "border-[--color-gold] bg-[--color-gold]/15 text-white"
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
                          ? "border-[--color-gold] bg-[--color-gold]/15 text-white"
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
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <Music className="h-4 w-4 text-[--color-gold]" />
                  Audio / Soundtrack <span className="text-muted-foreground font-normal">(optional)</span>
                </h3>
                <div className="flex gap-1 rounded-lg bg-white/10 p-0.5">
                  {(["prompt", "audio"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setAudioMode(mode)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                        audioMode === mode
                          ? "bg-[--color-gold] text-white"
                          : "bg-transparent text-muted-foreground hover:text-white"
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
                    className="flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-[--color-gold]/30 bg-[--color-gold]/5 cursor-pointer hover:border-[--color-gold]/60 hover:bg-[--color-gold]/10 transition-all"
                  >
                    {audioFile ? (
                      <div className="flex items-center gap-2 text-[--color-gold]/80 px-4 text-center">
                        <CheckCircle2 className="h-5 w-5 text-[--color-silver] flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{audioFile.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">({(audioFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Music className="h-6 w-6 text-[--color-gold]" />
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
                          if (file.size > 16 * 1024 * 1024) { toast.error("Audio file must be under 16 MB"); return; }
                          setAudioFile(file);
                          toast.success(`Audio uploaded: ${file.name}`);
                        }
                      }}
                    />
                  </label>
                  {audioFile && (
                    <button onClick={() => setAudioFile(null)} className="mt-2 text-xs text-muted-foreground hover:text-red-400 transition">
                      Remove audio
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  WIZ AI will automatically compose a soundtrack based on your prompt and chosen style.
                </p>
              )}
            </div>

            {/* ── UPFRONT COST BANNER ── */}
            {(() => {
              const cost = creditCost;
              const balance = creditBalance ?? 0;
              const shortfall = cost - balance;
              const hasEnough = shortfall <= 0;
              return (
                <CreditCostBanner
                  credits={cost}
                  label="WizPilot Video"
                  breakdown={`${duration}s video · ${aspectRatio}`}
                  note="Storyboard is free · credits charged only when you build your final video"
                >
                  <div className="rounded-lg px-3 py-2.5 space-y-2" style={{ background: hasEnough ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${hasEnough ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Your balance</span>
                      <span className="font-semibold" style={{ color: hasEnough ? '#10b981' : 'rgba(255,255,255,0.7)' }}>{balance} credits</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">This project costs</span>
                      <span className="font-semibold text-white/80">{cost} credits</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2">
                      <span className="font-bold" style={{ color: hasEnough ? '#10b981' : '#ef4444' }}>
                        {hasEnough ? '✓ You have enough credits' : `${shortfall} credits short`}
                      </span>
                      {!hasEnough && (
                        <button type="button" onClick={() => setTopUpOpen(true)}
                          className="text-xs font-bold px-2.5 py-1 rounded-md transition-all"
                          style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }}
                        >Top up credits →</button>
                      )}
                    </div>
                  </div>
                </CreditCostBanner>
              );
            })()}

            {/* Generate Storyboard CTA */}
            <div className="text-center">
              <Button
                size="lg"
                onClick={handleGenerateStoryboard}
                disabled={prompt.length < 10 || isGeneratingStoryboard}
                className="gap-2 btn-primary btn-sheen border-0 w-full sm:w-auto px-10 py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingStoryboard ? (
                  <><Loader2 className="h-5 w-5 animate-spin" />Building your storyboard…</>
                ) : (
                  <><Sparkles className="h-5 w-5" />Generate Storyboard — Free</>
                )}
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                {isGeneratingStoryboard ? "WizGenesis™ is locking your world bible and building scenes…" : "No credits required. Regenerate as many times as you like."}
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 2: STORYBOARD ── */}
        {step === "storyboard" && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <Badge className="mb-4 bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/20">
                ✓ Storyboard Generated — Free
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Your Storyboard</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Edit scene text, add or remove scenes, and preview AI images before building.
              </p>
            </div>

            {/* Error banner */}
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
            <div className="space-y-4">
              {storyboard.map((scene, i) => (
                <div
                  key={scene.id}
                  className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
                >
                  {/* Scene header */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[--color-gold]/15 border border-[--color-gold]/40 flex items-center justify-center text-[--color-gold]/80 font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={scene.title}
                        onChange={(e) => updateScene(scene.id, "title", e.target.value)}
                        className="w-full bg-transparent text-white font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-[--color-gold]/50 rounded px-1 -ml-1"
                        placeholder="Scene title…"
                      />
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => copySceneText(scene)}
                        title="Copy scene text"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => generatePreviewForScene(scene.id)}
                        title="Generate AI preview image"
                        disabled={scene.previewLoading}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-[--color-gold] hover:bg-[--color-gold]/10 transition disabled:opacity-50"
                      >
                        {scene.previewLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
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

                  {/* AI Preview Image */}
                  {(scene.previewLoading || scene.previewImageUrl) && (
                    <div className="mx-4 mb-3 rounded-xl overflow-hidden bg-white/5 border border-white/10 aspect-video relative">
                      {scene.previewLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                          <Loader2 className="h-6 w-6 text-[--color-gold] animate-spin" />
                          <p className="text-xs text-muted-foreground">Generating AI preview…</p>
                        </div>
                      ) : scene.previewImageUrl ? (
                        <img
                          src={scene.previewImageUrl}
                          alt={`Preview for ${scene.title}`}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                  )}

                  {/* No preview yet — placeholder */}
                  {!scene.previewLoading && !scene.previewImageUrl && (
                    <button
                      onClick={() => generatePreviewForScene(scene.id)}
                      className="mx-4 mb-3 w-[calc(100%-2rem)] rounded-xl border border-dashed border-white/10 bg-white/3 aspect-video flex flex-col items-center justify-center gap-2 hover:border-[--color-gold]/40 hover:bg-[--color-gold]/5 transition group"
                    >
                      <ImageIcon className="h-6 w-6 text-muted-foreground/40 group-hover:text-[--color-gold] transition" />
                      <span className="text-xs text-muted-foreground/60 group-hover:text-[--color-gold]/80 transition">
                        Click to generate AI preview image
                      </span>
                    </button>
                  )}

                  {/* Editable description */}
                  <div className="px-4 pb-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Scene description</label>
                    <Textarea
                      value={scene.description}
                      onChange={(e) => updateScene(scene.id, "description", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-[--color-gold]/50 min-h-[60px]"
                      placeholder="Describe what happens in this scene…"
                    />
                  </div>

                  {/* Editable visual notes */}
                  <div className="px-4 pb-4">
                    <label className="text-xs text-muted-foreground mb-1 block">Visual notes / direction</label>
                    <Textarea
                      value={scene.visualNotes}
                      onChange={(e) => updateScene(scene.id, "visualNotes", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-muted-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-[--color-gold]/50 min-h-[48px]"
                      placeholder="Camera angle, lighting, mood…"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add Scene button */}
            <button
              onClick={addScene}
              className="w-full rounded-2xl border-2 border-dashed border-white/10 bg-transparent py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-[--color-gold]/40 hover:text-[--color-gold]/80 hover:bg-[--color-gold]/5 transition"
            >
              <Plus className="h-4 w-4" />
              Add Scene
            </button>

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
                  <span className="font-semibold text-white">Ready to build?</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Final build costs <span className="text-white font-semibold">{creditCost} credits</span> for {duration}s · {aspectRatio}
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
                  className="gap-2 bg-gradient-to-r btn-primary border-0 flex-1"
                >
                  <Play className="h-4 w-4" />
                  Build Video — {creditCost} Credits
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-[--color-silver]/20 bg-[--color-silver]/5 p-4 text-sm text-[--color-silver]">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>WIZ AI advantage:</strong> Unlike other platforms that charge credits every time you regenerate, WIZ AI lets you refine your vision completely free. You only pay when you're ready to build.
              </span>
            </div>
          </div>
        )}

        {/* ── STEP 3: GENERATING ── */}
        {step === "generating" && (
          <div className="py-12 sm:py-20 space-y-8 max-w-lg mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[--color-gold]/15 border border-[--color-gold]/40 mb-6">
                <Clapperboard className="h-10 w-10 text-[--color-gold] animate-pulse" />
              </div>
              <div className="flex justify-center mb-3">
                <WizBrandBadge layer="render" size="md" animated />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Building with WizRender™</h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                WizRender™ is building your video. Sit tight — this usually takes 1–5 minutes.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{PROGRESS_STAGES[progressStage]?.label}</span>
                <span className="text-[--color-gold]/80 font-semibold tabular-nums">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-3 bg-white/10" />
              <p className="text-xs text-muted-foreground text-center">
                This page will update automatically when your video is ready
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {PROGRESS_STAGES.map((stage, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-all ${
                    i < progressStage ? "bg-[--color-silver]/10 text-[--color-silver]"
                    : i === progressStage ? "bg-[--color-gold]/15 text-white"
                    : "bg-white/5 text-muted-foreground/50"
                  }`}
                >
                  {i < progressStage ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[--color-silver]" />
                  : i === progressStage ? <Loader2 className="h-4 w-4 flex-shrink-0 text-[--color-gold] animate-spin" />
                  : <div className="h-4 w-4 flex-shrink-0 rounded-full border border-white/20" />}
                  {stage.label}
                </div>
              ))}
            </div>
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground mb-3">
                You can safely leave this page — your video will still be generated.
              </p>
              <a
                href="/projects"
                className="inline-flex items-center gap-2 rounded-md border border-white/20 text-white hover:bg-white/10 px-4 py-2 text-sm font-medium transition-colors"
              >
                <Film className="h-4 w-4" />
                View Projects While Waiting
              </a>
            </div>
          </div>
        )}

        {/* ── STEP 4: DONE ── */}
        {step === "done" && (
          <div className="py-12 sm:py-20 space-y-8 max-w-lg mx-auto text-center">
            <div>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[--color-silver]/10 border border-[--color-silver]/30 mb-6">
                <CheckCircle2 className="h-10 w-10 text-[--color-silver]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Your Video is Ready! </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Your video has been generated and is ready to watch, download, or share.
              </p>
            </div>
            {generatedVideoUrl && (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video">
                <video src={generatedVideoUrl} controls autoPlay muted playsInline className="w-full h-full object-contain" />
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {generatedVideoUrl && (
                <Button asChild className="gap-2 bg-gradient-to-r btn-primary border-0">
                  <a href={generatedVideoUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                    Download Video
                  </a>
                </Button>
              )}
              <a
                href="/projects"
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${generatedVideoUrl ? "border border-white/20 text-white hover:bg-white/10" : "bg-gradient-to-r btn-primary text-white"}`}
              >
                <Film className="h-4 w-4" />
                View All Projects
              </a>
              {generatedVideoUrl && (
                <Button asChild variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10">
                  <a href={generatedVideoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </a>
                </Button>
              )}
            </div>
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
                  setContextImageFile(null);
                  setContextImageUrl(null);
                  setContextVideoFile(null);
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
    <QuickTopUpModal open={topUpOpen} onOpenChange={(v) => setTopUpOpen(v)} currentBalance={creditBalance ?? 0} />
  </>
  );
}
