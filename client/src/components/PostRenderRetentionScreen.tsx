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
    href: "/music-video/create",
    gradient: "from-[#4a4a5a] to-[#2e2e36]",
  },
  {
    id: "kids-animation",
    title: "Kids animation",
    subtitle: "Fun animated story for children",
    icon: Baby,
    href: "/kids-video",
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
    if (navigator.share) {
      navigator.share({ title: videoTitle || "My WIZ AI video", url: finalVideoUrl })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(finalVideoUrl);
      toast.success("Link copied!", { description: "Share your video link." });
    }
    mp.track("PostRender_Share", { jobId });
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
      <div className="text-center mb-6">
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

      {/* ── Video Player ────────────────────────────────────────────── */}
      <div className="relative rounded-xl overflow-hidden mb-5 ring-1 ring-[--color-gold]/20 bg-black group">
        <video
          ref={videoRef}
          src={finalVideoUrl}
          controls
          autoPlay
          muted
          playsInline
          className="w-full max-h-72 bg-black"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        {/* Format badge */}
        <div className="absolute top-2 left-2 pointer-events-none">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${formatInfo.color}`}>
            {formatInfo.platform} · {formatInfo.label}
          </span>
        </div>
        {/* Glow effect */}
        <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-[--color-gold]/10 shadow-[0_0_40px_rgba(184,137,42,0.15)]" />
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
          className="border-white/15 text-zinc-300 bg-transparent hover:bg-white/5 h-11 px-4"
        >
          <Share2 className="w-4 h-4" />
        </Button>
      </div>

      {/* ── Upgrade Prompt (free/starter users only) ──────────────────── */}
      {showUpgradePrompt && (
        <div className="mb-5 px-4 py-3.5 rounded-xl border border-[--color-gold]/30 bg-gradient-to-r from-[#b8892a]/60 to-[#1a1a1a] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[--color-gold]/15 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-[--color-gold]" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Get more Build Credits every month</p>
              <p className="text-zinc-400 text-xs mt-0.5">Basic £19/mo · 5 Build Credits · HD quality · no watermark</p>
            </div>
          </div>
          <a
            href="/pricing"
            onClick={() => mp.track("PostRender_UpgradeClick", { jobId, currentPlan: subData?.plan ?? "free" })}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[--color-gold] hover:bg-[--color-gold]/20 text-white text-xs font-semibold transition-colors"
          >
            Upgrade
            <ChevronRight className="w-3 h-3" />
          </a>
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
            href="/manus-storage/wizai-logo-premium-transparent_ac3f550b.png"
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
                className="flex-1 h-8 text-xs bg-[--color-gold] hover:bg-[--color-gold]/20 text-white"
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
