/**
 * PostRenderRetentionScreen — Celebration + next-action engine.
 *
 * Shown when a render completes. Goal: user should NOT leave after download.
 * Shows celebration, video player, download CTA, "what next?" cards,
 * continue projects, and a retention message.
 */
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { mp } from "@/lib/mixpanel";
import { trpc } from "@/lib/trpc";
import {
  Download, Play, Pause, Share2, Sparkles, Film, Music,
  Baby, Youtube, ChevronRight, ArrowRight, Star, Zap, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface PostRenderRetentionScreenProps {
  finalVideoUrl: string;
  videoTitle?: string;
  jobId?: number;
  onCreateAnother?: () => void;
}

const NEXT_ACTIONS = [
  {
    id: "another-video",
    title: "Create another video",
    subtitle: "Start a new music video",
    icon: Film,
    href: "/music-video/create",
    gradient: "from-violet-600 to-purple-700",
  },
  {
    id: "new-song",
    title: "Generate a new song",
    subtitle: "AI-composed original music",
    icon: Music,
    href: "/music-video/create",
    gradient: "from-indigo-600 to-blue-700",
  },
  {
    id: "kids-animation",
    title: "Kids animation",
    subtitle: "Fun animated story for children",
    icon: Baby,
    href: "/kids-video",
    gradient: "from-pink-600 to-rose-700",
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
  const colors = ["bg-violet-400", "bg-fuchsia-400", "bg-amber-400", "bg-emerald-400", "bg-blue-400"];
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
  onCreateAnother,
}: PostRenderRetentionScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    const a = document.createElement("a");
    a.href = finalVideoUrl;
    a.download = videoTitle ? `${videoTitle}.mp4` : "wizvid-video.mp4";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Download started!", { description: "Your video is downloading." });
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: videoTitle || "My WizVid video", url: finalVideoUrl })
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
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/40">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Your cinematic video is ready</h2>
        <p className="text-zinc-400 text-sm">
          {videoTitle ? `"${videoTitle}" — ` : ""}Download it, share it, or create something new.
        </p>
      </div>

      {/* ── Video Player ────────────────────────────────────────────── */}
      <div className="relative rounded-xl overflow-hidden mb-5 ring-1 ring-violet-500/20 bg-black group">
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
        {/* Glow effect */}
        <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-violet-500/10 shadow-[0_0_40px_rgba(139,92,246,0.15)]" />
      </div>

      {/* ── Primary CTAs ────────────────────────────────────────────── */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={handleDownload}
          className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white h-11 font-semibold shadow-lg shadow-violet-900/40"
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

      {/* ── What next? ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-white mb-3">What would you like to create next?</h3>
        <div className="grid grid-cols-2 gap-2">
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
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] hover:border-violet-500/30 hover:bg-white/[0.06] p-3 transition-all group"
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
                  <p className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">
                    {job.title || `Project #${job.id}`}
                  </p>
                  <p className="text-[11px] text-zinc-500">{new Date(job.createdAt).toLocaleDateString()}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-violet-400 transition-colors flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Retention message ────────────────────────────────────────── */}
      <div className="text-center py-4 border-t border-white/8">
        <p className="text-zinc-500 text-xs">Your next video could be even better.</p>
        <a href="/music-video/create" className="inline-flex items-center gap-1.5 text-violet-400 text-xs font-medium mt-1.5 hover:text-violet-300 transition-colors">
          <Sparkles className="w-3 h-3" />
          Start creating now
          <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
