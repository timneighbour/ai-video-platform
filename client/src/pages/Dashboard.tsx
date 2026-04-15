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
  CheckCircle2, RefreshCw, Eye, Users
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const WIZVID_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-transparent_fcdb69d6.png";
const WIZLUMINA_ORB = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizlumina-logo-final-RNomEkxpATo5cgx6gBQPGN.webp";

// ── Create Action Cards ──────────────────────────────────────────────────────
const CREATE_ACTIONS = [
  {
    id: "music-video",
    title: "Create Video",
    subtitle: "Music video from your track",
    icon: Film,
    href: "/music-video/create",
    gradient: "from-violet-600 to-purple-700",
    glow: "shadow-violet-500/25",
    badge: "Most Popular",
  },
  {
    id: "music",
    title: "Create Music",
    subtitle: "AI-generated original songs",
    icon: Music,
    href: "/music-video/create",
    gradient: "from-indigo-600 to-blue-700",
    glow: "shadow-indigo-500/25",
    badge: null,
  },
  {
    id: "kids",
    title: "Kids Animation",
    subtitle: "Fun animated stories for children",
    icon: Baby,
    href: "/kids-video",
    gradient: "from-pink-600 to-rose-700",
    glow: "shadow-pink-500/25",
    badge: null,
  },
  {
    id: "youtube",
    title: "YouTube Video",
    subtitle: "Cinematic content for your channel",
    icon: Youtube,
    href: "/music-video/create",
    gradient: "from-red-600 to-orange-700",
    glow: "shadow-red-500/25",
    badge: null,
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
    completed: { label: "Complete", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
    rendering: { label: "Rendering", cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
    assembling: { label: "Assembling", cls: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
    storyboard_ready: { label: "Ready", cls: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
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
        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
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
  const { data: recentJobsData } = trpc.musicVideo.listJobs.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 });

  const creditBalance = creditData?.balance ?? 0;
  const currentPlan = subData?.plan ? subData.plan.charAt(0).toUpperCase() + subData.plan.slice(1) : "Free";
  const renderBalance = renderStatus?.total ?? 0;
  const totalProjects = recentJobsData?.length ?? 0;
  const completedProjects = recentJobsData?.filter((j: any) => j.status === "completed").length ?? 0;

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  // Fire Signup Completed when Stripe redirects back with ?success=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      const plan = params.get("plan") ?? currentPlan;
      mp.signupCompleted(plan, 0);
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("plan");
      window.history.replaceState({}, "", url.toString());
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
            <img src={WIZVID_LOGO} alt="WizVid" className="h-12 w-auto" />
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300 text-xs font-medium">
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
            <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-fuchsia-400 bg-clip-text text-transparent">Welcome to your Studio</span>
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
            { label: "Total Videos", value: totalProjects, icon: Film, color: "text-violet-400" },
            { label: "Renders Done", value: completedProjects, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Renders Left", value: renderBalance, icon: Zap, color: "text-amber-400" },
            { label: "Credits", value: creditBalance.toLocaleString(), icon: Star, color: "text-blue-400" },
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
                  href={`/music-video/create?resume=${job.id}`}
                  className="group rounded-xl border border-white/8 bg-white/[0.03] hover:border-violet-500/30 hover:bg-white/[0.06] transition-all overflow-hidden"
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
                    <p className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">
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
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-violet-400 font-medium">
                      <Play className="w-3 h-3" />
                      Continue
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
                    : `/music-video/create?resume=${job.id}`}
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
                href="/music-video/create"
                className="group rounded-xl border border-dashed border-white/15 bg-transparent hover:border-violet-500/40 hover:bg-violet-500/5 transition-all flex flex-col items-center justify-center gap-2 aspect-video p-4"
              >
                <div className="w-8 h-8 rounded-full bg-white/8 group-hover:bg-violet-500/20 flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4 text-zinc-400 group-hover:text-violet-400 transition-colors" />
                </div>
                <span className="text-[11px] text-zinc-500 group-hover:text-violet-400 transition-colors text-center">New Project</span>
              </a>
            </div>
          </section>
        ) : (
          /* ── Empty State ──────────────────────────────────────────────── */
          <section className="text-center py-16">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600/30 to-purple-600/30 animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Sparkles className="w-9 h-9 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Let's create your first video</h2>
            <p className="text-zinc-400 mb-8 max-w-md mx-auto">
              Upload a track, describe your vision, and WizVid will generate a fully produced cinematic music video in minutes.
            </p>
            <a href="/music-video/create">
              <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-8 h-12 text-base font-semibold shadow-lg shadow-violet-900/40">
                <Sparkles className="w-5 h-5 mr-2" />
                Start Creating
              </Button>
            </a>
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
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Completed Videos
                </h2>
                <a href="/projects" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                  View all <ChevronRight className="w-3 h-3" />
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedVideos.slice(0, 6).map((job: any) => (
                  <div key={job.id} className="group rounded-xl border border-white/8 bg-white/[0.03] hover:border-emerald-500/30 transition-all overflow-hidden">
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
                        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Done</span>
                      </div>
                    </div>
                    <div className="p-3 flex items-center gap-2">
                      <a
                        href={job.finalVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/25 text-violet-300 text-xs font-medium transition-all"
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
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* ── Go Cinematic Upgrade Block ───────────────────────────────── */}
        <section className="relative rounded-2xl overflow-hidden border border-violet-500/20 bg-gradient-to-br from-violet-950/60 via-purple-950/40 to-black p-6 sm:p-8">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }}
          />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 uppercase tracking-wider">
                  🎬 Cinematic Mode
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Go Cinematic</h2>
              <p className="text-zinc-400 text-sm max-w-md">
                Upgrade your next video with studio-grade audio and film-level visuals. One click, total transformation.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-indigo-400 text-sm font-semibold">WizSound™</span>
                  <span className="text-zinc-500 text-xs">Cinematic audio mastering</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-fuchsia-400 text-sm font-semibold">WizLumina™</span>
                  <span className="text-zinc-500 text-xs">Film-level colour grading</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <a href="/music-video/create">
                <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white px-6 h-11 font-semibold shadow-lg shadow-violet-900/40 whitespace-nowrap">
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
                href={`/music-video/create?prompt=${encodeURIComponent(idea.prompt)}`}
                className="group rounded-xl border border-white/8 bg-white/[0.03] hover:border-violet-500/30 hover:bg-violet-500/5 p-3 transition-all"
              >
                <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 mb-2">
                  {idea.genre}
                </span>
                <p className="text-xs font-medium text-white group-hover:text-violet-300 transition-colors leading-snug">
                  {idea.title}
                </p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-zinc-600 group-hover:text-violet-500 transition-colors">
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
            <a href="/music-video/create">
              <Button variant="outline" className="border-violet-500/30 text-violet-300 bg-transparent hover:bg-violet-500/10 px-6">
                <Plus className="w-4 h-4 mr-2" />
                Create Another Video
              </Button>
            </a>
          </section>
        )}

      </main>
    </div>
  );
}
