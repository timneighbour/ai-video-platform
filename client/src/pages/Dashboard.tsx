import { WIZANIMATE_PRODUCT_PAGE, WIZVIDEO_STUDIO_PAGE, WIZAUDIO_STUDIO_PAGE } from "@/lib/routes";
/**
 * Dashboard — High-retention creator hub.
 * Shows action cards, continue projects, project grid, insights, upgrade block, inspiration, empty state.
 */
import { useState, useEffect } from "react";
import { mp } from "@/lib/mixpanel";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Film, Music, Baby, Youtube, Clock, Download,
  ChevronRight, Play, Zap, Star, ArrowRight, Plus,
  TrendingUp, Clapperboard, Wand2, Settings, Crown,
  CheckCircle2, RefreshCw, Eye, Users, Trash2, AlertTriangle, Loader2
} from "@/lib/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const WIZAI_LOGO = "/manus-storage/wizai-logo-premium-transparent_ac3f550b.png";
const DASH_BG_MUSIC_VIDEO = "/manus-storage/dash-card-music-video_894d27ae.jpg";
const DASH_BG_MUSIC = "/manus-storage/card-wizaudio-v2_ba9bb3e1.jpg";
const DASH_BG_KIDS = "/manus-storage/dash-card-animation_9f04fd06.jpg";
const DASH_BG_YOUTUBE = "/manus-storage/dash-card-youtube_cec93053.jpg";
const DASH_CINEMATIC_BANNER = "/manus-storage/dash-cinematic-banner_10dc07fe.jpg";
const DASH_EMPTY_STATE = "/manus-storage/dash-empty-state_4cc61677.jpg";
const WIZLUMINA_ORB = "/manus-storage/wizlumina-logo-new_0709f3c5.png";

// ── Create Action Cards ──────────────────────────────────────────────────────
const CREATE_ACTIONS = [
  {
    id: "music-video",
    title: "Create Video",
    subtitle: "Music video from your track",
    icon: Film,
    href: WIZVIDEO_STUDIO_PAGE,
    gradient: "from-[#b8892a] to-[#4a3010]",
    glow: "shadow-[#b8892a]/25",
    badge: "Most Popular",
    bgImage: DASH_BG_MUSIC_VIDEO,
  },
  {
    id: "music",
    title: "Create Music",
    subtitle: "AI-generated original songs",
    icon: Music,
    href: WIZAUDIO_STUDIO_PAGE,
    gradient: "from-[#4a4a5a] to-[#2e2e36]",
    glow: "shadow-[#9090a0]/25",
    badge: null,
    bgImage: DASH_BG_MUSIC,
  },
  {
    id: "kids",
    title: "Kids Animation",
    subtitle: "Fun animated stories for children",
    icon: Baby,
    href: WIZANIMATE_PRODUCT_PAGE,
    gradient: "from-[#9090a0] to-[#2e2e36]",
    glow: "shadow-[#9090a0]/20",
    badge: null,
    bgImage: DASH_BG_KIDS,
  },
  {
    id: "youtube",
    title: "YouTube Video",
    subtitle: "Cinematic content for your channel",
    icon: Youtube,
    href: WIZVIDEO_STUDIO_PAGE,
    gradient: "from-[#3a2a10] to-[#1a1a1a]",
    glow: "shadow-[#b8892a]/20",
    badge: null,
    bgImage: DASH_BG_YOUTUBE,
  },
];

// ── Inspiration Cards ────────────────────────────────────────────────────────
const INSPIRATION = [
  { title: "Cinematic Music Video", prompt: "A solo artist performing on a rooftop at sunset, golden hour light, cinematic", genre: "Cinematic" },
  { title: "Neon Nightclub Scene", prompt: "Underground club with neon lights, DJ on stage, crowd dancing, electric atmosphere", genre: "Electronic" },
  { title: "Kids Adventure Story", prompt: "A brave little fox exploring an enchanted forest, colourful and magical", genre: "Animation" },
  { title: "Hip-Hop Street Video", prompt: "Urban street art backdrop, graffiti walls, breakdancers, golden chain close-ups", genre: "Hip-Hop" },
  { title: "Anime Music Video", prompt: "Anime-style characters in a futuristic city, cherry blossoms falling, emotional", genre: "Anime" },
  { title: "Documentary Style", prompt: "Black and white concert footage, close-up of instruments, raw and authentic", genre: "Documentary" },
];

// ── Status badge helper ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed: { label: "Complete", cls: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/20" },
    rendering: { label: "Building Your Video", cls: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30" },
    assembling: { label: "Assembling", cls: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30" },
    storyboard_ready: { label: "Ready", cls: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30" },
    failed: { label: "Failed", cls: "bg-red-500/15 text-red-400 border-red-500/20" },
    draft: { label: "Draft", cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1 bg-white/8 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-[#b8892a] to-[#4a3010] rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: creditData } = trpc.billing.getCredits.useQuery(undefined, { enabled: isAuthenticated });
  const { data: subData } = trpc.billing.getSubscription.useQuery(undefined, { enabled: isAuthenticated });
  const { data: renderStatus } = trpc.render.getRenderStatus.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 });
  const utils = trpc.useUtils();
  const { data: recentJobsData } = trpc.musicVideo.listJobs.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 });
  const [deleteTarget, setDeleteTarget] = useState<{ jobId: number; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteJobMutation = trpc.musicVideo.deleteJob.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      utils.musicVideo.listJobs.invalidate();
      setDeleteTarget(null);
      setIsDeleting(false);
    },
    onError: (err) => {
      toast.error("Delete failed", { description: err.message });
      setIsDeleting(false);
    },
  });
  const openDeleteDialog = (e: React.MouseEvent, jobId: number, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget({ jobId, title });
  };
  const confirmDelete = () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    deleteJobMutation.mutate({ jobId: deleteTarget.jobId });
  };

  const creditBalance = creditData?.balance ?? 0;
  const currentPlan = subData?.plan ? subData.plan.charAt(0).toUpperCase() + subData.plan.slice(1) : "Free";
  const renderBalance = renderStatus?.total ?? 0;
  const totalProjects = recentJobsData?.length ?? 0;
  const completedProjects = recentJobsData?.filter((j: any) => j.status === "completed").length ?? 0;

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  // Fire Purchase Completed (client-side confirmation) when Stripe redirects back with ?success=true.
  // The authoritative server-side Purchase Completed fires from the Stripe webhook in webhooks.ts.
  // Deduplication: sessionStorage key prevents duplicate fires if the component re-renders while
  // ?success=true is still in the URL (e.g. due to currentPlan loading asynchronously).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") !== "true") return;
    // Remove ?success from URL immediately so back-navigation cannot retrigger this
    const url = new URL(window.location.href);
    const plan = params.get("plan") ?? currentPlan ?? "subscription";
    url.searchParams.delete("success");
    url.searchParams.delete("plan");
    window.history.replaceState({}, "", url.toString());
    // Guard against duplicate fires within the same browser session
    const dedupKey = `purchase_completed_fired_${plan}`;
    if (sessionStorage.getItem(dedupKey)) return;
    sessionStorage.setItem(dedupKey, "1");
    // Only fire if plan is resolved (not still loading)
    if (plan && plan !== "subscription") {
      mp.purchaseCompleted(plan, 0, "GBP");
    }
  }, [currentPlan]);

  const hasProjects = totalProjects > 0;
  const recentProjects = recentJobsData?.slice(0, 6) ?? [];
  const continueProjects = recentJobsData?.filter((j: any) => j.status !== "completed" && j.status !== "failed").slice(0, 3) ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Top Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[3.375rem] w-auto" />
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[--color-gold]/15 border border-[--color-gold]/30 text-[--color-gold] text-xs font-medium">
              <Crown className="w-3 h-3" />
              {currentPlan}
            </span>
            <a
              href="/discover"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-xs font-medium hover:bg-white/10 hover:text-white transition-all"
            >
              <Users className="w-3 h-3" />
              Discover Creators
            </a>
            <a
              href="/account"
              className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/15 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-white/70" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">

        {/* ── Welcome ──────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-[#e8c878] via-[#f2dfa0] to-[#b8892a] bg-clip-text text-transparent">Welcome to your Studio</span>
          </h1>
          <p className="text-zinc-400 mt-2 text-base">
            What do you want to create today{user?.name ? `, ${user.name.split(" ")[0]}` : ""}? Your creative workspace — everything in one place.
          </p>
        </div>

        {/* ── Create Action Cards ──────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {CREATE_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.id}
                  href={action.href}
                  onClick={() => mp.track("Dashboard_CreateCard_Click", { card: action.id })}
                  className={`relative group rounded-2xl bg-gradient-to-br ${action.gradient} p-5 hover:scale-[1.02] transition-all duration-200 shadow-lg ${action.glow} overflow-hidden`}
                >
                  {/* Premium photo background */}
                  {action.bgImage && (
                    <img src={action.bgImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-300" loading="eager" />
                  )}
                  {/* Dark overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
                  {/* Subtle noise texture */}
                  <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }}
                  />
                  {action.badge && (
                    <span className="absolute top-3 right-3 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white/90 tracking-wider uppercase">
                      {action.badge}
                    </span>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-bold text-white text-base leading-tight">{action.title}</p>
                  <p className="text-white/70 text-xs mt-0.5 leading-snug">{action.subtitle}</p>
                  <div className="mt-3 flex items-center gap-1 text-white/60 text-xs group-hover:text-white/90 transition-colors">
                    <span>Start</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* ── Insights Strip ───────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Videos", value: totalProjects, icon: Film, color: "text-[--color-gold]" },
            { label: "Builds Done", value: completedProjects, icon: CheckCircle2, color: "text-[--color-silver]" },
            { label: "Renders Left", value: renderBalance, icon: Zap, color: "text-[--color-gold]" },
            { label: "Credits", value: creditBalance.toLocaleString(), icon: Star, color: "text-[--color-gold]" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            );
          })}
        </section>

        {/* ── Continue Where You Left Off ──────────────────────────────── */}
        {continueProjects.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                Continue where you left off
              </h2>
              <a href="/projects" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                View all <ChevronRight className="w-3 h-3" />
              </a>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {continueProjects.map((job: any) => (
                <a
                  key={job.id}
                  href={`${WIZVIDEO_STUDIO_PAGE}?resume=${job.id}`}
                  className="group rounded-xl border border-white/8 bg-white/[0.03] hover:border-[--color-gold]/30 hover:bg-white/[0.06] transition-all overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="relative h-28 bg-zinc-900 overflow-hidden">
                    {job.thumbnailUrl ? (
                      <img src={job.thumbnailUrl} alt={job.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-8 h-8 text-zinc-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-2">
                      <StatusBadge status={job.status} />
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <p className="text-sm font-medium text-white truncate group-hover:text-[--color-gold] transition-colors">
                      {job.title || `Project #${job.id}`}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                    {job.totalScenes > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                          <span>{job.completedScenes}/{job.totalScenes} scenes</span>
                          <span>{Math.round((job.completedScenes / job.totalScenes) * 100)}%</span>
                        </div>
                        <ProgressBar value={job.completedScenes} max={job.totalScenes} />
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-[--color-gold] font-medium">
                        <Play className="w-3 h-3" />
                        Continue
                      </div>
                      <button
                        onClick={(e) => openDeleteDialog(e, job.id, job.title)}
                        className="p-1 rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-all"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Your Projects Grid ───────────────────────────────────────── */}
        {hasProjects ? (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clapperboard className="w-4 h-4 text-zinc-400" />
                Your Projects
              </h2>
              <a href="/projects" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                View all <ChevronRight className="w-3 h-3" />
              </a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {recentProjects.map((job: any) => (
                <a
                  key={job.id}
                  href={job.status === "completed" && job.finalVideoUrl
                    ? job.finalVideoUrl
                    : `${WIZVIDEO_STUDIO_PAGE}?resume=${job.id}`}
                  target={job.status === "completed" && job.finalVideoUrl ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="group rounded-xl border border-white/8 bg-white/[0.03] hover:border-white/20 transition-all overflow-hidden"
                >
                  <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                    {job.thumbnailUrl ? (
                      <img src={job.thumbnailUrl} alt={job.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-5 h-5 text-zinc-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      {job.status === "completed" ? (
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                          <Download className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] font-medium text-white truncate">{job.title || `#${job.id}`}</p>
                    <StatusBadge status={job.status} />
                  </div>
                </a>
              ))}
              {/* New project card */}
              <a
                href={WIZVIDEO_STUDIO_PAGE}
                className="group rounded-xl border border-dashed border-white/15 bg-transparent hover:border-[--color-gold]/30 hover:bg-[--color-gold]/15 transition-all flex flex-col items-center justify-center gap-2 aspect-video p-4"
              >
                <div className="w-8 h-8 rounded-full bg-white/8 group-hover:bg-[--color-gold]/15 flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4 text-zinc-400 group-hover:text-[--color-gold] transition-colors" />
                </div>
                <span className="text-[11px] text-zinc-500 group-hover:text-[--color-gold] transition-colors text-center">New Project</span>
              </a>
            </div>
          </section>
        ) : (
          /* ── Empty State ──────────────────────────────────────────────── */
          <section className="relative rounded-2xl overflow-hidden border border-white/8 text-center py-16 px-6">
            {/* Premium background image */}
            <img src={DASH_EMPTY_STATE} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/40 pointer-events-none" />
            <div className="relative">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#b8892a]/30 to-[#4a3010]/30 animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#b8892a] to-[#4a3010] flex items-center justify-center shadow-lg shadow-[#b8892a]/30">
                  <Sparkles className="w-9 h-9 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Let's create your first video</h2>
              <p className="text-zinc-400 mb-8 max-w-md mx-auto">
                Upload a track, describe your vision, and WIZ AI will generate a fully produced cinematic music video in minutes.
              </p>
              <a href={WIZVIDEO_STUDIO_PAGE}>
                <Button className="bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#e8c878] hover:to-[#b8892a] text-white px-8 h-12 text-base font-semibold shadow-lg shadow-[#b8892a]/30">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Creating
                </Button>
              </a>
            </div>
          </section>
        )}

        {/* ── Completed Videos Library ──────────────────────────────── */}
        {(() => {
          const completedVideos = recentJobsData?.filter((j: any) => j.status === "completed" && j.finalVideoUrl) ?? [];
          if (completedVideos.length === 0) return null;
          return (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[--color-silver]" />
                  Completed Videos
                </h2>
                <a href="/projects" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                  View all <ChevronRight className="w-3 h-3" />
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedVideos.slice(0, 6).map((job: any) => (
                  <div key={job.id} className="group rounded-xl border border-white/8 bg-white/[0.03] hover:border-[--color-silver]/40/30 transition-all overflow-hidden">
                    <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                      {job.thumbnailUrl ? (
                        <img src={job.thumbnailUrl} alt={job.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-6 h-6 text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-white/80 truncate max-w-[60%]">{job.title || `#${job.id}`}</span>
                        <span className="text-[10px] text-[--color-silver] font-semibold bg-[--color-silver]/10 border border-[--color-silver]/20 px-1.5 py-0.5 rounded-full">Done</span>
                      </div>
                    </div>
                    <div className="p-3 flex items-center gap-2">
                      <a
                        href={job.finalVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-[--color-gold]/15 hover:bg-[--color-gold]/15 border border-[--color-gold]/30 text-[--color-gold] text-xs font-medium transition-all"
                      >
                        <Play className="w-3 h-3" /> Watch
                      </a>
                      <a
                        href={job.finalVideoUrl}
                        download
                        className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-medium transition-all"
                      >
                        <Download className="w-3 h-3" /> Download
                      </a>
                      <button
                        onClick={(e) => openDeleteDialog(e, job.id, job.title)}
                        className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-zinc-500 hover:text-red-400 text-xs transition-all"
                        title="Delete project"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* ── Go Cinematic Upgrade Block ───────────────────────────────── */}
        <section className="relative rounded-2xl overflow-hidden border border-[--color-gold]/30 bg-gradient-to-br from-[#b8892a]/20 via-[#1a1a1a] to-black p-6 sm:p-8">
          {/* Cinematic banner background */}
          <img src={DASH_CINEMATIC_BANNER} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }}
          />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[--color-gold]/15 border border-[--color-gold]/30 text-[--color-gold] uppercase tracking-wider">
                  – Cinematic Mode
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Go Cinematic</h2>
              <p className="text-zinc-400 text-sm max-w-md">
                Upgrade your next video with studio-grade audio and film-level visuals. One click, total transformation.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[--color-silver] text-sm font-semibold">WizSound™</span>
                  <span className="text-zinc-500 text-xs">Cinematic audio mastering</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[--color-gold] text-sm font-semibold">WizLumina™</span>
                  <span className="text-zinc-500 text-xs">Film-level colour grading</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <a href={WIZVIDEO_STUDIO_PAGE}>
                <Button className="bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#e8c878] hover:to-[#b8892a] text-white px-6 h-11 font-semibold shadow-lg shadow-[#b8892a]/30 whitespace-nowrap">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Upgrade your next video
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* ── Get Inspired ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-zinc-400" />
              Get inspired
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {INSPIRATION.map((idea) => (
              <a
                key={idea.title}
                href={`${WIZVIDEO_STUDIO_PAGE}?prompt=${encodeURIComponent(idea.prompt)}`}
                className="group rounded-xl border border-white/8 bg-white/[0.03] hover:border-[--color-gold]/30 hover:bg-[--color-gold]/15 p-3 transition-all"
              >
                <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[--color-gold]/15 text-[--color-gold] mb-2">
                  {idea.genre}
                </span>
                <p className="text-xs font-medium text-white group-hover:text-[--color-gold] transition-colors leading-snug">
                  {idea.title}
                </p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-600 group-hover:text-[--color-gold] transition-colors">
                  <Sparkles className="w-2.5 h-2.5" />
                  Try this
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── Your next video could be even better ─────────────────────── */}
        {hasProjects && (
          <section className="text-center py-8 border-t border-white/8">
            <p className="text-zinc-400 text-sm mb-4">Your next video could be even better.</p>
            <a href={WIZVIDEO_STUDIO_PAGE}>
              <Button variant="outline" className="border-[--color-gold]/30 text-[--color-gold] bg-transparent hover:bg-[--color-gold]/15 px-6">
                <Plus className="w-4 h-4 mr-2" />
                Create Another Video
              </Button>
            </a>
          </section>
        )}

      </main>

      {/* ── Delete Confirmation Dialog ─────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <AlertDialogTitle className="text-lg font-semibold text-white">Delete Project</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-zinc-400 text-sm leading-relaxed">
              Are you sure you want to delete <span className="text-white font-medium">"{deleteTarget?.title || `Project #${deleteTarget?.jobId}`}"</span>? This will permanently remove the project and all associated scenes, builds, and files. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white border-0 focus:ring-red-500"
            >
              {isDeleting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" /> Delete Project</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
