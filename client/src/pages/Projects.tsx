import {
  WIZVIDEO_STUDIO_PAGE,
  WIZPILOT_STUDIO_PAGE,
  WIZSHORTS_STUDIO_PAGE,
  WIZANIMATE_STUDIO_PAGE,
  WIZSCRIPT_STUDIO_PAGE,
} from "@/lib/routes";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  ArrowLeft,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  Film,
  Loader2,
  RefreshCw,
  Wand2,
  Zap,
  Music,
  Play,
  Edit3,
  Clapperboard,
  Clock,
  Sparkles,
  ChevronRight,
  Globe,
  Link2,
  Plus,
} from "@/lib/icons";
import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import CreditBalance from "@/components/CreditBalance";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
type StudioType = "music_video" | "wizanimate" | "wiz_shorts" | "generated";

type UnifiedJob = {
  id: number;
  title: string;
  status: string;
  thumbnailUrl: string | null | undefined;
  finalVideoUrl: string | null | undefined;
  createdAt: Date;
  creditCost: number;
  studioType: StudioType;
  studioUrl: string;
  jobParam: string;
  // music-video-only extras (optional)
  totalScenes?: number;
  completedScenes?: number;
  failedScenes?: number;
  renderingScenes?: number;
  audioDuration?: number | null;
  genre?: string | null;
  mood?: string | null;
  isPublic?: boolean;
  shareSlug?: string | null;
  audioUrl?: string | null;
  toolType?: string;
  outputUrl?: string | null;
};

type FilterTab = "all" | "active" | "completed" | "draft";

const STUDIO_LABELS: Record<StudioType, string> = {
  music_video: "WizVideo™",
  wizanimate: "WizAnimate™",
  wiz_shorts: "WizShorts™",
  generated: "WizPilot™",
};

const TOOL_LABELS: Record<string, string> = {
  text_to_video: "WizPilot™",
  lip_sync: "Lip Sync",
  video_to_video: "Video to Video",
  voiceover: "Voiceover",
  musetalk_lip_sync: "Lip Sync",
  seedance_t2v: "WizScript™",
  seedance_i2v: "WizImage to Video",
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  const days = Math.floor(secs / 86400);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function sortPriority(status: string): number {
  switch (status) {
    case "rendering": case "assembling": case "processing": return 0;
    case "storyboard_ready": case "pending": case "queued": return 1;
    case "draft": return 2;
    case "completed": return 3;
    case "failed": return 4;
    default: return 5;
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  StatusBadge                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <Badge className="bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/25 gap-1 text-[11px] font-semibold"><CheckCircle className="h-3 w-3" /> Complete</Badge>;
    case "rendering": case "assembling": case "processing":
      return <Badge className="bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30 gap-1 text-[11px] font-semibold"><Loader2 className="h-3 w-3 animate-spin" /> Building Your Video</Badge>;
    case "storyboard_ready":
      return <Badge className="bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30 gap-1 text-[11px] font-semibold"><Clapperboard className="h-3 w-3" /> Ready to Render</Badge>;
    case "pending": case "queued":
      return <Badge className="bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/25 gap-1 text-[11px] font-semibold"><Clock className="h-3 w-3" /> Queued</Badge>;
    case "draft":
      return <Badge className="bg-muted-foreground/20/15 text-muted-foreground border-border/50/25 gap-1 text-[11px] font-semibold"><Edit3 className="h-3 w-3" /> Draft</Badge>;
    case "failed":
      return <Badge className="bg-red-500/15 text-red-400 border-red-500/25 gap-1 text-[11px] font-semibold"><AlertCircle className="h-3 w-3" /> Failed</Badge>;
    default:
      return <Badge variant="outline" className="text-[11px]">{status}</Badge>;
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  PrimaryCTA                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function PrimaryCTA({
  status, onContinue, onWatch, onRender, large = false,
}: {
  status: string;
  onContinue: () => void;
  onWatch: () => void;
  onRender?: () => void;
  large?: boolean;
}) {
  const cls = large
    ? "h-11 px-6 text-sm font-bold rounded-xl shadow-lg"
    : "h-9 px-4 text-xs font-semibold rounded-lg";

  switch (status) {
    case "completed":
      return (
        <Button onClick={onWatch} className={`${cls} gap-2 bg-gradient-to-r from-primary to-primary/40 hover:from-primary/80 hover:to-primary text-white border-0 shadow-[#b8892a]/30`}>
          <Play className="h-3.5 w-3.5 fill-current" /> Watch Video
        </Button>
      );
    case "rendering": case "assembling": case "processing":
      return (
        <Button disabled className={`${cls} gap-2 bg-[--color-gold]/15 text-[--color-gold] border border-[--color-gold]/30 cursor-not-allowed`}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building Your Video…
        </Button>
      );
    case "storyboard_ready":
      return (
        <Button onClick={onRender ?? onContinue} className={`${cls} gap-2 bg-gradient-to-r from-primary to-primary/40 hover:from-primary hover:to-primary/40 text-white border-0 shadow-[#b8892a]/30`}>
          <Zap className="h-3.5 w-3.5" /> Build Now
        </Button>
      );
    case "failed":
      return (
        <Button onClick={onContinue} className={`${cls} gap-2 bg-red-600/15 hover:bg-red-600/25 text-red-300 border border-red-500/25`}>
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      );
    default:
      return (
        <Button onClick={onContinue} className={`${cls} gap-2 bg-gradient-to-r from-primary to-primary/40 hover:from-primary hover:to-primary/40 text-white border-0 shadow-[#b8892a]/30`}>
          <Edit3 className="h-3.5 w-3.5" /> Continue Editing
        </Button>
      );
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Scene dots                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
function SceneDots({ total, completed, failed }: { total: number; completed: number; failed: number }) {
  if (total <= 0) return null;
  const maxDots = Math.min(total, 20);
  const ratio = total / maxDots;
  return (
    <div className="flex items-center gap-0.5 mt-2">
      {Array.from({ length: maxDots }).map((_, i) => {
        const sceneIdx = Math.floor(i * ratio);
        const isCompleted = sceneIdx < completed;
        const isFailed = sceneIdx >= completed && sceneIdx < completed + failed;
        return (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              isCompleted ? "bg-[--color-silver]" : isFailed ? "bg-red-400" : "bg-white/10"
            }`}
            style={{ width: `${100 / maxDots}%` }}
          />
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main component                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function Projects() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [deleteMusicJobId, setDeleteMusicJobId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  /* ── Data ─────────────────────────────────────────────────────────────── */
  const { data: creditData } = trpc.billing.getCredits.useQuery(undefined, { enabled: isAuthenticated });

  // Unified jobs list (music videos + WizShorts + WizAnimate)
  const { data: allJobs, isLoading: allJobsLoading, refetch: refetchAll } =
    trpc.musicVideo.listAllJobs.useQuery(undefined, {
      enabled: isAuthenticated,
      refetchInterval: 8000,
    });

  // Generated projects (Autopilot / TextToVideoCreator)
  const { data: generatedProjects, isLoading: generatedLoading, refetch: refetchGenerated } =
    trpc.billing.getProjects.useQuery(
      { limit: 50 },
      { enabled: isAuthenticated, refetchInterval: 8000 }
    );

  const deleteMusicJobMutation = trpc.musicVideo.deleteJob.useMutation({
    onSuccess: () => {
      toast.success("Project deleted.");
      utils.musicVideo.listAllJobs.invalidate();
      utils.musicVideo.listJobs.invalidate();
      setDeleteMusicJobId(null);
    },
    onError: (err) => { toast.error(err.message || "Failed to delete."); setDeleteMusicJobId(null); },
  });

  const togglePublicMutation = trpc.musicVideo.togglePublic.useMutation({
    onSuccess: (data) => {
      utils.musicVideo.listAllJobs.invalidate();
      utils.musicVideo.listJobs.invalidate();
      if (data.shareSlug) {
        const url = `${window.location.origin}/watch/${data.shareSlug}`;
        navigator.clipboard.writeText(url).catch(() => {});
        toast.success("Video is now public! Link copied to clipboard.");
      } else {
        toast.success("Video set to private.");
      }
    },
    onError: (err) => toast.error(err.message || "Failed to update visibility."),
  });

  useEffect(() => { if (!isAuthenticated) setLocation("/"); }, [isAuthenticated, setLocation]);

  /* ── Build unified list ─────────────────────────────────────────────── */
  const unifiedJobs = useMemo((): UnifiedJob[] => {
    const jobs: UnifiedJob[] = [];

    // From listAllJobs (music videos, WizShorts, WizAnimate)
    if (allJobs) {
      for (const j of allJobs) {
        jobs.push({
          id: j.id,
          title: j.title,
          status: j.status,
          thumbnailUrl: j.thumbnailUrl,
          finalVideoUrl: j.finalVideoUrl,
          createdAt: j.createdAt,
          creditCost: j.creditCost,
          studioType: j.studioType as StudioType,
          studioUrl: j.studioUrl,
          jobParam: j.jobParam,
        });
      }
    }

    // From getProjects (Autopilot / TextToVideoCreator / LipSync etc.)
    if (generatedProjects) {
      for (const p of generatedProjects) {
        jobs.push({
          id: p.id,
          title: p.title,
          status: p.status,
          thumbnailUrl: null,
          finalVideoUrl: p.outputUrl,
          outputUrl: p.outputUrl,
          createdAt: p.createdAt,
          creditCost: p.creditCost,
          studioType: "generated",
          studioUrl: WIZPILOT_STUDIO_PAGE,
          jobParam: `projectId=${p.id}`,
          toolType: p.toolType,
        });
      }
    }

    return jobs.sort((a, b) => {
      const d = sortPriority(a.status) - sortPriority(b.status);
      return d !== 0 ? d : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [allJobs, generatedProjects]);

  /* ── Filtered list ──────────────────────────────────────────────────── */
  const filteredJobs = useMemo(() => {
    if (filter === "all") return unifiedJobs;
    if (filter === "active") return unifiedJobs.filter(j => ["rendering","assembling","storyboard_ready","pending","queued","processing"].includes(j.status));
    if (filter === "completed") return unifiedJobs.filter(j => j.status === "completed");
    if (filter === "draft") return unifiedJobs.filter(j => j.status === "draft");
    return unifiedJobs;
  }, [unifiedJobs, filter]);

  /* ── Counts ─────────────────────────────────────────────────────────── */
  const totalCount = unifiedJobs.length;
  const activeCount = unifiedJobs.filter(j => ["rendering","assembling","storyboard_ready","pending","queued","processing"].includes(j.status)).length;
  const completedCount = unifiedJobs.filter(j => j.status === "completed").length;
  const draftCount = unifiedJobs.filter(j => j.status === "draft").length;
  const isLoading = allJobsLoading || generatedLoading;
  const renderingCount = unifiedJobs.filter(j => ["rendering","assembling","processing"].includes(j.status)).length;

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const handleContinue = (job: UnifiedJob) => {
    window.location.href = `${job.studioUrl}?${job.jobParam}`;
  };

  const handleWatch = (job: UnifiedJob) => {
    const url = job.finalVideoUrl ?? job.outputUrl;
    if (!url) { toast.error("Video not ready yet."); return; }
    window.open(url, "_blank");
  };

  const handleDownload = (job: UnifiedJob) => {
    const url = job.finalVideoUrl ?? job.outputUrl;
    if (!url) { toast.error("Video not ready yet."); return; }
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job.title.replace(/[^a-z0-9]/gi, "_")}.mp4`;
    a.target = "_blank"; a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success("Download started!");
  };

  /* ── Sub-components ──────────────────────────────────────────────────── */
  const FilterPill = ({ value, label, count }: { value: FilterTab; label: string; count?: number }) => (
    <button
      onClick={() => setFilter(value)}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
        filter === value
          ? "bg-[--color-gold] text-white shadow-lg shadow-[#b8892a]/30"
          : "bg-white/5 text-muted-foreground hover:bg-white/8 hover:text-white border border-white/8"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`text-[10px] rounded-full px-1.5 py-0.5 leading-none font-bold ${filter === value ? "bg-white/20" : "bg-white/10 text-foreground/80"}`}>
          {count}
        </span>
      )}
    </button>
  );

  /* ── Unified Project Card ─────────────────────────────────────────────── */
  const ProjectCard = ({ job, isPrimary = false }: { job: UnifiedJob; isPrimary?: boolean }) => {
    const completed = job.status === "completed";
    const rendering = ["rendering","assembling","processing"].includes(job.status);
    const isMusicVideo = job.studioType === "music_video";
    const videoUrl = job.finalVideoUrl ?? job.outputUrl;
    const progress = (job.totalScenes && job.completedScenes != null)
      ? Math.round((job.completedScenes / job.totalScenes) * 100)
      : 0;

    const studioLabel = job.studioType === "generated" && job.toolType
      ? (TOOL_LABELS[job.toolType] ?? STUDIO_LABELS[job.studioType])
      : STUDIO_LABELS[job.studioType];

    return (
      <div className={`relative rounded-2xl border overflow-hidden transition-all duration-200 group ${
        isPrimary
          ? "border-[--color-gold]/30 bg-gradient-to-br from-primary/40 via-background to-primary/40/20 shadow-xl shadow-[#b8892a]/15"
          : completed
          ? "border-[--color-silver]/20 bg-card hover:border-[--color-silver]/40/35 hover:shadow-lg hover:shadow-emerald-900/10"
          : rendering
          ? "border-[--color-gold]/30 bg-card shadow-md shadow-amber-900/10"
          : "border-white/8 bg-card hover:border-white/15 hover:shadow-md"
      }`}>
        {rendering && <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />}
        {completed && <div className="absolute inset-0 bg-gradient-to-br from-muted-foreground/4 to-transparent pointer-events-none" />}

        <div className="p-5">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={job.status} />
              <span className="text-[10px] text-muted-foreground/50 font-medium bg-white/5 px-2 py-0.5 rounded-full">{studioLabel}</span>
            </div>
            <span className="text-[11px] text-muted-foreground/50">{timeAgo(job.createdAt)}</span>
          </div>

          {/* Thumbnail + info */}
          <div className="flex gap-4">
            <div className={`relative flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden border ${
              completed ? "border-[--color-silver]/25" : rendering ? "border-[--color-gold]/30" : "border-white/8"
            } bg-card`}>
              {completed && videoUrl ? (
                <>
                  {job.thumbnailUrl ? (
                    <img src={job.thumbnailUrl} alt={job.title} className="w-full h-full object-cover" />
                  ) : (
                    <video src={videoUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/15 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Play className="h-3.5 w-3.5 text-white fill-current ml-0.5" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                  {rendering ? (
                    <div className="relative">
                      <Loader2 className="h-6 w-6 text-[--color-gold] animate-spin" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[--color-gold] animate-pulse" />
                    </div>
                  ) : (
                    isMusicVideo ? <Music className="h-6 w-6 text-muted-foreground/50" /> : <Wand2 className="h-6 w-6 text-muted-foreground/50" />
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[15px] truncate leading-tight text-white mb-1">{job.title}</h3>
              <div className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground/70">
                {job.genre && <span className="text-muted-foreground">{job.genre}</span>}
                {job.mood && <><span className="text-muted-foreground/50">·</span><span>{job.mood}</span></>}
                {job.audioDuration ? <><span className="text-muted-foreground/50">·</span><span>{formatDuration(job.audioDuration)}</span></> : null}
                {isMusicVideo && job.totalScenes != null && job.completedScenes != null && (
                  <><span className="text-muted-foreground/50">·</span><span>{job.completedScenes}/{job.totalScenes} scenes</span></>
                )}
                {!isMusicVideo && <><span className="text-muted-foreground/50">·</span><span>{job.creditCost} credits</span></>}
              </div>
            </div>
          </div>

          {/* Scene progress dots (music video only) */}
          {isMusicVideo && job.totalScenes != null && job.totalScenes > 0 && (rendering || completed || (job.failedScenes ?? 0) > 0) && (
            <SceneDots total={job.totalScenes} completed={job.completedScenes ?? 0} failed={job.failedScenes ?? 0} />
          )}

          {/* Render progress bar */}
          {rendering && isMusicVideo && job.totalScenes != null && job.totalScenes > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-[--color-gold] font-medium flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Rendering your video…
                </span>
                <span className="text-muted-foreground/70">{progress}%{(job.totalScenes - (job.completedScenes ?? 0)) > 0 && ` · ~${Math.ceil((job.totalScenes - (job.completedScenes ?? 0)) * 8)}s`}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-orange-500 transition-all duration-700" style={{ width: `${Math.max(progress, 3)}%` }} />
              </div>
            </div>
          )}

          {rendering && !isMusicVideo && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-[--color-gold] font-medium flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Processing your video…
                </span>
                <span className="text-muted-foreground/70">In queue</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-orange-500 animate-pulse" style={{ width: "55%" }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 flex-wrap">
            <PrimaryCTA
              status={job.status}
              onContinue={() => handleContinue(job)}
              onWatch={() => handleWatch(job)}
              large={isPrimary}
            />
            {completed && videoUrl && (
              <Button size="sm" variant="outline" onClick={() => handleDownload(job)} className="gap-1.5 border-white/12 text-muted-foreground hover:bg-white/8 hover:text-white h-9 text-xs rounded-lg">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            )}
            {isMusicVideo && job.audioUrl && (
              <Button size="sm" variant="outline" onClick={() => {
                const a = document.createElement("a");
                a.href = job.audioUrl!;
                a.download = `${job.title.replace(/[^a-z0-9]/gi, "_")}_audio.mp3`;
                a.target = "_blank"; a.rel = "noopener noreferrer";
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                toast.success("Audio download started!");
              }} className="gap-1.5 border-white/12 text-muted-foreground hover:bg-white/8 hover:text-white h-9 text-xs rounded-lg">
                <Music className="h-3.5 w-3.5" /> Audio
              </Button>
            )}
            {isMusicVideo && completed && videoUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => togglePublicMutation.mutate({ jobId: job.id, isPublic: !job.isPublic })}
                disabled={togglePublicMutation.isPending}
                className={`gap-1.5 border-white/12 hover:bg-white/8 h-9 text-xs rounded-lg ${
                  job.isPublic
                    ? "text-[--color-silver] border-[--color-silver]/25 hover:text-[--color-silver]"
                    : "text-muted-foreground hover:text-white"
                }`}
                title={job.isPublic ? "Public — click to make private" : "Make public for Google indexing"}
              >
                {job.isPublic ? <Link2 className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                {job.isPublic ? "Public" : "Share"}
              </Button>
            )}
            {isMusicVideo && (
              <button onClick={() => setDeleteMusicJobId(job.id)} className="ml-auto p-2 rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/8 transition-colors" title="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ── Empty state ─────────────────────────────────────────────────────── */
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-[--color-gold]/15 border border-[--color-gold]/30 flex items-center justify-center mb-5" style={{ boxShadow: "0 0 30px rgba(201,168,76,0.12)" }}>
        <Film className="h-9 w-9 text-[--color-gold]" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">Your first creation is one click away</h3>
      <p className="text-muted-foreground text-sm mb-8 max-w-sm leading-relaxed">
        Upload a song, describe a vibe, and WIZ AI builds your entire music video — scenes, visuals, and cinematic effects — in minutes.
      </p>
      {/* Example prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 w-full max-w-xl">
        {[
          { icon: "🎬", label: "Cinematic night drive", sub: "Moody, neon-lit streets" },
          { icon: "🌌", label: "Cosmic journey", sub: "Epic space visuals" },
          { icon: "🔥", label: "High-energy performance", sub: "Stage lights & crowd" },
        ].map((p) => (
          <a
            key={p.label}
            href={`${WIZVIDEO_STUDIO_PAGE}?demo=1&prompt=${encodeURIComponent(p.label)}`}
            className="flex flex-col items-start gap-1 rounded-xl p-3 text-left transition-all hover:scale-[1.02]"
            style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}
          >
            <span className="text-lg">{p.icon}</span>
            <span className="text-white text-xs font-semibold">{p.label}</span>
            <span className="text-muted-foreground/70 text-xs">{p.sub}</span>
          </a>
        ))}
      </div>
      <a
        href={WIZVIDEO_STUDIO_PAGE}
        className="inline-flex items-center gap-2 rounded-xl text-white font-semibold px-7 py-3 transition-all shadow-lg text-sm"
        style={{ background: "linear-gradient(135deg, #b8892a, #4a3010)", boxShadow: "0 4px 20px rgba(184,137,42,0.3)" }}
      >
        <Sparkles className="h-4 w-4" />
        Start Creating with WizVideo
        <ChevronRight className="h-4 w-4" />
      </a>
      <p className="text-muted-foreground/50 text-xs mt-4">50 free credits included · No card required</p>
    </div>
  );

  /* ── Page ───────────────────────────────────────────────────────────────── */
  const primaryJob = filteredJobs[0] ?? null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/6 sticky top-0 z-10 bg-background/95 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex h-14 items-center justify-between px-4">
          <a href="/dashboard" className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground/70 hover:text-white transition-colors px-2 py-2 rounded-lg hover:bg-white/5">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </a>
          <div className="flex items-center gap-2">
            <Film className="h-4.5 w-4.5 text-[--color-gold]" />
            <h1 className="text-base font-bold text-white tracking-tight">My Projects</h1>
          </div>
          <div className="flex items-center gap-2">
            {renderingCount > 0 && (
              <button onClick={() => { refetchAll(); refetchGenerated(); }} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5">
                <RefreshCw className="h-3 w-3" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
            <CreditBalance variant="badge" />
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto py-6 sm:py-8 px-4">
        {/* Credit bar */}
        {creditData && (
          <div className="flex items-center gap-3 mb-6 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 text-yellow-400" />
            </div>
            <span className="text-sm text-white">
              <span className="font-bold text-yellow-300">{creditData.balance.toLocaleString()}</span> <span className="text-muted-foreground">credits remaining</span>
            </span>
            <a href="/credits" className="ml-auto text-xs text-[--color-gold] hover:text-[--color-gold] transition-colors font-medium">Top up</a>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 text-[--color-gold] animate-spin" />
            <p className="text-muted-foreground/70 text-sm">Loading your projects…</p>
          </div>
        ) : totalCount === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* ── Hero: Continue last project ─────────────────────────────── */}
            {primaryJob && filter === "all" && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
                  <span className="text-xs font-semibold text-[--color-gold] uppercase tracking-widest">Continue where you left off</span>
                </div>
                <ProjectCard job={primaryJob} isPrimary />
              </div>
            )}

            {/* ── Filters ─────────────────────────────────────────────────── */}
            {totalCount > 1 && (
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <FilterPill value="all" label="All" count={totalCount} />
                {activeCount > 0 && <FilterPill value="active" label="Active" count={activeCount} />}
                {completedCount > 0 && <FilterPill value="completed" label="Completed" count={completedCount} />}
                {draftCount > 0 && <FilterPill value="draft" label="Drafts" count={draftCount} />}
              </div>
            )}

            {/* ── Project list ─────────────────────────────────────────────── */}
            {filteredJobs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground/70 text-sm">No projects match this filter.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredJobs
                  .slice(filter === "all" ? 1 : 0)
                  .map(job => <ProjectCard key={`${job.studioType}-${job.id}`} job={job} />)
                }
              </div>
            )}

            {/* ── New project CTA ─────────────────────────────────────────── */}
            <div className="mt-10 pt-6 border-t border-white/5 flex justify-center">
              <a
                href={WIZVIDEO_STUDIO_PAGE}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 hover:border-[--color-gold]/30 text-muted-foreground hover:text-white font-medium px-6 py-3 transition-all text-sm"
              >
                <Plus className="h-4 w-4 text-[--color-gold]" />
                Start a new project
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </>
        )}
      </div>

      {/* ── Delete Music Video ──────────────────────────────────────────────── */}
      <AlertDialog open={deleteMusicJobId !== null} onOpenChange={(open) => !open && setDeleteMusicJobId(null)}>
        <AlertDialogContent className="bg-card border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this project?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/70">This will permanently delete the project, all scenes, and any generated video. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 text-white hover:bg-white/8 bg-transparent rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMusicJobId !== null && deleteMusicJobMutation.mutate({ jobId: deleteMusicJobId })} disabled={deleteMusicJobMutation.isPending} className="bg-red-600 hover:bg-red-500 text-white border-0 rounded-xl">
              {deleteMusicJobMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
