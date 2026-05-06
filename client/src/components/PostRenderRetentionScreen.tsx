import { WIZANIMATE_PRODUCT_PAGE } from "@/lib/routes";
/**
 * PostRenderRetentionScreen — Celebration + next-action engine.
 *
 * Shown when a build completes. Goal: user should NOT leave after download.
 * Shows celebration, video player, download CTA, "what next?" cards,
 * continue projects, and a retention message.
 */
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mp } from "@/lib/mixpanel";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Download, Play, Pause, Share2, Sparkles, Film, Music,
  Baby, Youtube, ChevronRight, ArrowRight, Star, Zap, RefreshCw,
  Rocket, Globe, Instagram, Twitter, Users, Crown
} from "@/lib/icons";
import { toast } from "sonner";

interface PostRenderRetentionScreenProps {
  finalVideoUrl: string;
  videoTitle?: string;
  jobId?: number;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  onCreateAnother?: () => void;
}

const FORMAT_LABELS: Record<string, { label: string; platform: string; color: string }> = {
  "16:9": { label: "16:9", platform: "YouTube", color: "text-red-400 bg-red-900/30 border-red-700/40" },
  "9:16": { label: "9:16", platform: "TikTok", color: "text-pink-400 bg-pink-900/30 border-pink-700/40" },
  "1:1": { label: "1:1", platform: "Instagram", color: "text-purple-400 bg-purple-900/30 border-purple-700/40" },
};

const NEXT_ACTIONS = [
  {
    id: "another-video",
    title: "Create another video",
    subtitle: "Start a new music video",
    icon: Film,
    href: "/music-video/create",
    gradient: "from-[#b8892a] to-[#4a3010]",
  },
  {
    id: "new-song",
    title: "Generate a new song",
    subtitle: "AI-composed original music",
    icon: Music,
    href: "/music-creator",
    gradient: "from-[#4a4a5a] to-[#2e2e36]",
  },
  {
    id: "kids-animation",
    title: "Kids animation",
    subtitle: "Fun animated story for children",
    icon: Baby,
    href: WIZANIMATE_PRODUCT_PAGE,
    gradient: "from-[#9090a0] to-[#2e2e36]",
  },
  {
    id: "youtube-video",
    title: "YouTube video",
    subtitle: "Cinematic content for your channel",
    icon: Youtube,
    href: "/music-video/create",
    gradient: "from-red-600 to-orange-700",
  },
];

function ConfettiParticle({ delay }: { delay: number }) {
  const colors = ["bg-[--color-gold]", "bg-[--color-gold]", "bg-[--color-gold]", "bg-[--color-silver]", "bg-[--color-silver]"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const left = Math.random() * 100;
  const size = Math.random() * 6 + 4;
  return (
    <div
      className={`absolute ${color} rounded-sm pointer-events-none`}
      style={{
        left: `${left}%`,
        top: "-10px",
        width: size,
        height: size,
        animation: `confettiFall ${1.5 + Math.random()}s ease-in ${delay}s forwards`,
        opacity: 0,
      }}
    />
  );
}

export function PostRenderRetentionScreen({
  finalVideoUrl,
  videoTitle,
  jobId,
  aspectRatio = "16:9",
  onCreateAnother,
}: PostRenderRetentionScreenProps) {
  const formatInfo = FORMAT_LABELS[aspectRatio] ?? FORMAT_LABELS["16:9"];
  const [isPlaying, setIsPlaying] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isAuthenticated } = useAuth();
  const { data: subData } = trpc.billing.getSubscription.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 });
  // Show upgrade prompt for free users or starter plan users
  const showUpgradePrompt = !subData?.plan || subData.plan === "starter";

  const { data: recentJobsData } = trpc.musicVideo.listJobs.useQuery(undefined, { staleTime: 60_000 });
  const continueProjects = recentJobsData
    ?.filter((j: any) => j.status !== "completed" && j.status !== "failed" && j.id !== jobId)
    .slice(0, 3) ?? [];

  // Hide confetti after 3s
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  // Track view
  useEffect(() => {
    mp.track("PostRender_Viewed", { jobId });
  }, [jobId]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) { v.pause(); setIsPlaying(false); }
    else { v.play(); setIsPlaying(true); }
  }

  function handleDownload() {
    mp.track("PostRender_Download", { jobId });
    mp.downloadClicked("WizVideo");
    const a = document.createElement("a");
    a.href = finalVideoUrl;
    a.download = videoTitle ? `${videoTitle}.mp4` : "wizai-video.mp4";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Download started!", { description: "Your video is downloading." });
  }

  function handleShare() {
    setShowSharePanel((v) => !v);
    mp.track("PostRender_Share", { jobId });
  }
  function handleCopyLink() {
    const shareText = includeWatermark
      ? `${finalVideoUrl}\n\nCreated with Wiz AI — https://wiz-ai.io`
      : finalVideoUrl;
    navigator.clipboard.writeText(shareText);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
    toast.success("Link copied!", { description: "Paste it anywhere to share." });
    mp.track("PostRender_CopyLink", { jobId, watermark: includeWatermark });
  }
  function handleShareTwitter() {
    const text = encodeURIComponent(
      `Just created this with Wiz AI ✨${includeWatermark ? " — Created with @WizAI" : ""}\n${finalVideoUrl}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
    mp.track("PostRender_ShareTwitter", { jobId });
  }
  function handleShareWhatsApp() {
    const text = encodeURIComponent(
      `Check out this video I made with Wiz AI! ${finalVideoUrl}${includeWatermark ? " — Created with Wiz AI" : ""}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
    mp.track("PostRender_ShareWhatsApp", { jobId });
  }

  return (
    <div className="relative">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="absolute inset-x-0 top-0 h-40 overflow-hidden pointer-events-none z-10">
          <style>{`
            @keyframes confettiFall {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(160px) rotate(720deg); opacity: 0; }
            }
          `}</style>
          {Array.from({ length: 20 }).map((_, i) => (
            <ConfettiParticle key={i} delay={i * 0.1} />
          ))}
        </div>
      )}

      {/* ── Celebration Header ──────────────────────────────────────── */}
      <div className="screening-room-celebration text-center mb-6">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#b8892a]/30 to-[#2e2e36]/30 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-[#b8892a] to-[#4a3010] flex items-center justify-center shadow-lg shadow-[#b8892a]/40">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Your cinematic video is ready</h2>
        <p className="text-zinc-400 text-sm">
          {videoTitle ? `"${videoTitle}" — ` : ""}Download it, share it, or create something new.
        </p>
      </div>

      {/* Rotate hint — shown in portrait on phones/tablets */}
      <div className="rotate-hint-visible" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
        <span>Rotate for best experience</span>
      </div>

      {/* ── Screening Room Player Chrome ──────────────────────────── */}
      <div className="mb-5" style={{fontFamily:"'Courier Prime',monospace"}}>
        {/* Title rail */}
        <div style={{background:'rgba(8,6,4,0.97)',borderTop:'1px solid rgba(184,137,42,0.25)',borderLeft:'1px solid rgba(184,137,42,0.25)',borderRight:'1px solid rgba(184,137,42,0.25)',borderRadius:'8px 8px 0 0',padding:'8px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{display:'flex',gap:5}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:'#ef4444'}} />
              <div style={{width:10,height:10,borderRadius:'50%',background:'#f59e0b'}} />
              <div style={{width:10,height:10,borderRadius:'50%',background:'#22c55e'}} />
            </div>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:2,color:'rgba(212,168,67,0.9)',textTransform:'uppercase'}}>SCREENING ROOM · WizVideo™</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:9,color:'rgba(255,255,255,0.35)',letterSpacing:1}}>TAKE 1 · FINAL CUT</span>
            <span style={{fontSize:9,fontWeight:700,padding:'2px 7px',border:'1px solid rgba(212,168,67,0.4)',borderRadius:2,color:'rgba(212,168,67,0.9)',letterSpacing:1}}>{aspectRatio}</span>
          </div>
        </div>
        {/* Video container */}
        <div className="relative overflow-hidden bg-black group" style={{border:'1px solid rgba(184,137,42,0.15)',borderTop:'none',borderBottom:'none'}}>
          <video
            ref={videoRef}
            src={finalVideoUrl}
            autoPlay
            muted
            playsInline
            className="w-full max-h-72 bg-black screening-room-video"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          {/* Scanlines */}
          <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)',pointerEvents:'none',zIndex:2}} />
          {/* Vignette */}
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,0.45) 100%)',pointerEvents:'none',zIndex:3}} />
          {/* Format badge top-left */}
          <div style={{position:'absolute',top:10,left:10,zIndex:5,pointerEvents:'none'}}>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${formatInfo.color}`}>
              {formatInfo.platform} · {formatInfo.label}
            </span>
          </div>
          {/* Gold circular play/pause button — centre */}
          <button
            onClick={togglePlay}
            style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:52,height:52,borderRadius:'50%',background:'linear-gradient(135deg,rgba(212,168,67,0.9),rgba(184,137,42,0.7))',border:'2px solid rgba(212,168,67,0.6)',boxShadow:'0 0 24px rgba(212,168,67,0.35)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',zIndex:6,opacity: isPlaying ? 0 : 1,transition:'opacity 0.2s'}}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying
              ? <Pause style={{width:20,height:20,color:'#000'}} />
              : <Play style={{width:20,height:20,color:'#000',marginLeft:2}} />
            }
          </button>
          {/* Glow ring */}
          <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:4,boxShadow:'inset 0 0 40px rgba(184,137,42,0.12)'}} />
        </div>
        {/* Transport controls bar */}
        <div style={{background:'rgba(8,6,4,0.97)',border:'1px solid rgba(184,137,42,0.15)',borderTop:'1px solid rgba(184,137,42,0.25)',borderRadius:'0 0 8px 8px',padding:'8px 14px'}}>
          {/* Progress bar */}
          <div
            style={{width:'100%',height:3,background:'rgba(255,255,255,0.1)',borderRadius:2,marginBottom:8,cursor:'pointer',position:'relative'}}
            onClick={(e) => {
              const v = videoRef.current;
              if (!v || !v.duration) return;
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              v.currentTime = pct * v.duration;
            }}
          >
            <div style={{height:'100%',background:'linear-gradient(90deg,#d4a843,#b8892a)',borderRadius:2,width:'0%',transition:'width 0.1s'}} id="screening-room-progress" />
            <div style={{position:'absolute',top:'50%',left:'0%',transform:'translate(-50%,-50%)',width:9,height:9,borderRadius:'50%',background:'#d4a843',boxShadow:'0 0 6px rgba(212,168,67,0.6)'}} id="screening-room-scrubber" />
          </div>
          {/* Transport controls row */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <button onClick={togglePlay} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.7)',padding:0,display:'flex',alignItems:'center'}}>
                {isPlaying ? <Pause style={{width:14,height:14}} /> : <Play style={{width:14,height:14}} />}
              </button>
              <span style={{fontSize:9,color:'rgba(255,255,255,0.35)',letterSpacing:0.5}}>00:00 / --:--</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={handleDownload} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(212,168,67,0.7)',padding:0,display:'flex',alignItems:'center',gap:4,fontSize:9,fontWeight:600,letterSpacing:1}}>
                <Download style={{width:11,height:11}} /> EXPORT
              </button>
              <button onClick={handleShare} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.35)',padding:0,display:'flex',alignItems:'center',gap:4,fontSize:9,letterSpacing:1}}>
                <Share2 style={{width:11,height:11}} /> SHARE
              </button>
            </div>
          </div>
        </div>
        {/* Filmstrip beneath player */}
        <div style={{marginTop:6,display:'flex',gap:3,overflowX:'auto',paddingBottom:2}}>
          {Array.from({length:8}).map((_,i) => (
            <div key={i} style={{flexShrink:0,width:48,height:28,background:'rgba(24,20,16,0.9)',border:'1px solid rgba(184,137,42,0.12)',borderRadius:2,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
              {/* Sprocket holes */}
              <div style={{position:'absolute',top:2,left:2,width:4,height:4,borderRadius:'50%',background:'rgba(0,0,0,0.6)',border:'1px solid rgba(184,137,42,0.15)'}} />
              <div style={{position:'absolute',bottom:2,right:2,width:4,height:4,borderRadius:'50%',background:'rgba(0,0,0,0.6)',border:'1px solid rgba(184,137,42,0.15)'}} />
              <span style={{fontSize:7,color:'rgba(255,255,255,0.2)',fontWeight:600}}>{String(i+1).padStart(2,'0')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Primary CTAs ────────────────────────────────────────────── */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={handleDownload}
          className="flex-1 bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#b8892a] hover:to-[#4a3010] text-white h-11 font-semibold shadow-lg shadow-[#b8892a]/40"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Video
        </Button>
        <Button
          onClick={handleShare}
          variant="outline"
          className={`border-white/15 text-zinc-300 bg-transparent hover:bg-white/5 h-11 px-4 transition-colors ${showSharePanel ? "bg-white/8 border-white/25" : ""}`}
        >
          <Share2 className="w-4 h-4" />
          <span className="ml-1.5 text-xs hidden sm:inline">Share</span>
        </Button>
      </div>
      {/* ── Share Panel ──────────────────────────────────────────────────────── */}
      {showSharePanel && (
        <div className="mb-5 rounded-xl border border-white/10 bg-white/4 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8">
            <p className="text-sm font-semibold text-white mb-0.5">Share your video</p>
            <p className="text-xs text-zinc-500">Turn your creation into distribution</p>
          </div>
          {/* Copy link row */}
          <div className="px-4 py-3 flex items-center gap-2">
            <div className="flex-1 bg-black/30 border border-white/8 rounded-lg px-3 py-2 text-xs text-zinc-400 truncate font-mono">
              {finalVideoUrl.length > 48 ? finalVideoUrl.slice(0, 48) + "…" : finalVideoUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: linkCopied ? "rgba(74,222,128,0.15)" : "rgba(184,137,42,0.15)", color: linkCopied ? "#4ade80" : "#b8892a", border: `1px solid ${linkCopied ? "rgba(74,222,128,0.3)" : "rgba(184,137,42,0.3)"}` }}
            >
              {linkCopied ? "✓ Copied!" : "Copy link"}
            </button>
          </div>
          {/* Social share buttons */}
          <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
            <button
              onClick={handleShareTwitter}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#0a0a1a] border border-[#1d9bf0]/30 text-[#1d9bf0] hover:bg-[#1d9bf0]/10 transition-colors"
            >
              <Twitter className="w-3.5 h-3.5" /> Twitter / X
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#0a1a0a] border border-[#25d366]/30 text-[#25d366] hover:bg-[#25d366]/10 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" /> WhatsApp
            </button>
            {typeof navigator.share === "function" && (
              <button
                onClick={() => { navigator.share({ title: videoTitle || "My Wiz AI video", url: finalVideoUrl }); mp.track("PostRender_NativeShare", { jobId }); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/8 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" /> More
              </button>
            )}
          </div>
          {/* Watermark toggle */}
          <div className="px-4 pb-3 flex items-center justify-between border-t border-white/6 pt-3">
            <div>
              <p className="text-xs font-medium text-zinc-300">Include “Created with Wiz AI”</p>
              <p className="text-[10px] text-zinc-600">Adds a credit line to your shared link text</p>
            </div>
            <button
              onClick={() => setIncludeWatermark((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${includeWatermark ? "bg-[--color-gold]" : "bg-white/10"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${includeWatermark ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
      )}
      {/* ── Upgrade Prompt (free/starter users only) ──────────────────── */}
      {showUpgradePrompt && (
        <div className="mb-5 rounded-xl border border-[--color-gold]/30 bg-gradient-to-br from-[#b8892a]/10 to-[#1a1a1a] overflow-hidden">
          <div className="px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[--color-gold]/15 flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4 text-[--color-gold]" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Loved this? Unlock more every month</p>
                <p className="text-zinc-400 text-xs mt-0.5">Monthly credits, 4K exports, WizLumina™ + WizSound™ cinematic upgrades</p>
              </div>
            </div>
            <a
              href="/pricing"
              onClick={() => mp.track("PostRender_UpgradeClick", { jobId, currentPlan: subData?.plan ?? "free" })}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[--color-gold] hover:bg-[--color-gold]/80 text-white text-xs font-semibold transition-colors"
            >
              See plans
              <ChevronRight className="w-3 h-3" />
            </a>
          </div>
          <div className="px-4 pb-3 flex flex-wrap gap-x-5 gap-y-1">
            {['No credit card required to try', 'Cancel anytime', 'You own all your content', 'Secure checkout via Stripe'].map((t) => (
              <span key={t} className="text-[10px] text-zinc-600 flex items-center gap-1">
                <span className="text-[--color-gold]/50">✓</span> {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── What next? ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-white mb-3">What would you like to create next?</h3> <div className="grid grid-cols-2 gap-2">
          {NEXT_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <a
                key={action.id}
                href={action.href}
                onClick={() => {
                  mp.track("PostRender_NextAction", { action: action.id });
                  if (action.id === "another-video" && onCreateAnother) onCreateAnother();
                }}
                className={`group relative rounded-xl bg-gradient-to-br ${action.gradient} p-3 hover:scale-[1.02] transition-all overflow-hidden`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white leading-tight truncate">{action.title}</p>
                    <p className="text-[10px] text-white/60 truncate">{action.subtitle}</p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* ── Continue saved projects ──────────────────────────────────── */}
      {continueProjects.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            Continue where you left off
          </h3>
          <div className="space-y-2">
            {continueProjects.map((job: any) => (
              <a
                key={job.id}
                href={`/music-video/create?resume=${job.id}`}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] hover:border-[--color-gold]/30 hover:bg-white/[0.06] p-3 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                  {job.thumbnailUrl ? (
                    <img src={job.thumbnailUrl} alt={job.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-4 h-4 text-zinc-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-[--color-gold] transition-colors">
                    {job.title || `Project #${job.id}`}
                  </p>
                  <p className="text-[11px] text-zinc-500">{new Date(job.createdAt).toLocaleDateString()}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[--color-gold] transition-colors flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Feature My Video ─────────────────────────────────────────── */}
      <FeatureMyVideoSection jobId={jobId} />

      {/* ── Retention message ────────────────────────────────────────── */}
      <div className="text-center py-4 border-t border-white/8">
        <p className="text-zinc-500 text-xs">Create videos. Get discovered. Grow your audience.</p>
        <a href="/music-video/create" className="inline-flex items-center gap-1.5 text-[--color-gold] text-xs font-medium mt-1.5 hover:text-[--color-gold] transition-colors">
          <Sparkles className="w-3 h-3" />
          Start creating now
          <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ── Feature My Video Section ──────────────────────────────────────────────────
function FeatureMyVideoSection({ jobId }: { jobId?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    creatorType: "music_artist" as "music_artist" | "youtuber" | "animator" | "kids_creator" | "content_creator",
    youtubeUrl: "",
    instagramUrl: "",
    tiktokUrl: "",
    websiteUrl: "",
    bio: "",
  });

  const submitFeature = trpc.creator.submitFeatureRequest.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      mp.track("PostRender_FeatureSubmitted", { jobId });
      toast.success("Feature request submitted!", {
        description: "We'll review your video and reach out if selected.",
      });
    },
    onError: (err) => {
      toast.error("Submission failed", { description: err.message });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter your creator name");
      return;
    }
    submitFeature.mutate({
      name: form.name,
      creatorType: form.creatorType,
      bio: form.bio || undefined,
      youtubeUrl: form.youtubeUrl || undefined,
      instagramUrl: form.instagramUrl || undefined,
      tiktokUrl: form.tiktokUrl || undefined,
      websiteUrl: form.websiteUrl || undefined,
    });
  }

  if (submitted) {
    return (
      <div className="mb-6 rounded-xl border border-[--color-silver]/30 bg-[--color-silver]/10 p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-[--color-silver]/10 flex items-center justify-center mx-auto mb-2">
          <Rocket className="w-5 h-5 text-[--color-silver]" />
        </div>
        <p className="text-sm font-semibold text-[--color-silver] mb-1">You're in the queue!</p>
        <p className="text-xs text-zinc-400">We'll review your video and reach out if selected for the WIZ AI Creator Network.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-3">
          <a href="/discover" className="inline-flex items-center gap-1.5 text-[--color-gold] text-xs font-medium hover:text-[--color-gold] transition-colors">
            <Users className="w-3 h-3" />
            View Creator Network
            <ArrowRight className="w-3 h-3" />
          </a>
          <a
            href="/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png"
            download="wiz-ai-logo.png"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[--color-gold] text-xs font-medium hover:text-[--color-gold] transition-colors"
          >
            <Download className="w-3 h-3" />
            Download your badge
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {!isOpen ? (
        <button
          onClick={() => { setIsOpen(true); mp.track("PostRender_FeatureClicked", { jobId }); }}
          className="w-full flex items-center gap-3 rounded-xl border border-[--color-gold]/30 bg-[--color-gold]/15 hover:bg-[--color-gold]/15 hover:border-[--color-gold]/30 p-4 transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-[--color-gold]/15 flex items-center justify-center flex-shrink-0">
            <Rocket className="w-4 h-4 text-[--color-gold]" />
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-white">Want to get featured on WIZ AI?</p>
            <p className="text-xs text-zinc-400">Create videos. Get discovered. Grow your audience.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-[--color-gold] transition-colors" />
        </button>
      ) : (
        <div className="rounded-xl border border-[--color-gold]/30 bg-[--color-gold]/15 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Rocket className="w-4 h-4 text-[--color-gold]" />
            <p className="text-sm font-semibold text-white">Feature my video on WIZ AI</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Creator name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your name or channel"
                  className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Creator type</label>
                <select
                  value={form.creatorType}
                  onChange={(e) => setForm(f => ({ ...f, creatorType: e.target.value as typeof form.creatorType }))}
                  className="w-full h-8 text-xs bg-zinc-900 border border-white/10 text-white rounded-md px-2"
                >
                  {(["music_artist", "youtuber", "animator", "kids_creator", "content_creator"] as const).map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1"><Youtube className="w-3 h-3" /> YouTube</label>
                <Input
                  value={form.youtubeUrl}
                  onChange={(e) => setForm(f => ({ ...f, youtubeUrl: e.target.value }))}
                  placeholder="youtube.com/..."
                  className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1"><Instagram className="w-3 h-3" /> Instagram</label>
                <Input
                  value={form.instagramUrl}
                  onChange={(e) => setForm(f => ({ ...f, instagramUrl: e.target.value }))}
                  placeholder="@handle"
                  className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1"><Twitter className="w-3 h-3" /> TikTok</label>
                <Input
                  value={form.tiktokUrl}
                  onChange={(e) => setForm(f => ({ ...f, tiktokUrl: e.target.value }))}
                  placeholder="@handle"
                  className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block flex items-center gap-1"><Globe className="w-3 h-3" /> Website</label>
                <Input
                  value={form.websiteUrl}
                  onChange={(e) => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
                  placeholder="yoursite.com"
                  className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 h-8 text-xs border-white/10 text-zinc-400 bg-transparent hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitFeature.isPending}
                className="flex-1 h-8 text-xs bg-[--color-gold] hover:bg-[--color-gold]/80 text-white"
              >
                {submitFeature.isPending ? "Submitting..." : "Submit for review"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
