import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Save,
  Globe,
  Link2,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import CreditBalance from "@/components/CreditBalance";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
const TOOL_LABELS: Record<string, string> = {
  text_to_video: "Text to Video",
  lip_sync: "Lip Sync",
  video_to_video: "Video to Video",
  voiceover: "Voiceover",
  musetalk_lip_sync: "Lip Sync (MuseTalk)",
  seedance_t2v: "Text to Video (Seedance)",
  seedance_i2v: "Image to Video (Seedance)",
};

type Project = {
  id: number;
  title: string;
  description: string | null;
  toolType: string;
  status: "pending" | "processing" | "completed" | "failed";
  outputUrl: string | null;
  creditCost: number;
  createdAt: Date;
};

type MusicVideoJob = {
  id: number;
  title: string;
  status: string;
  audioUrl: string | null;
  finalVideoUrl: string | null;
  audioDuration: number | null;
  totalScenes: number;
  completedScenes: number;
  failedScenes: number;
  renderingScenes: number;
  createdAt: Date;
  genre: string | null;
  mood: string | null;
  isPublic?: boolean;
  shareSlug?: string | null;
  thumbnailUrl?: string | null;
};

type FilterTab = "all" | "active" | "completed" | "draft";

type KidsAnimationJob = {
  id: number;
  storyPrompt: string;
  animationStyle: string;
  videoLength: string;
  renderStatus: string;
  videoUrl: string | null;
  thumbnailUrl?: string | null;
  createdAt: Date;
  renderProgress: number | null;
  renderMessage: string | null;
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function formatDuration(seconds: number | null): string {
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
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1 text-xs"><CheckCircle className="h-3 w-3" /> Complete</Badge>;
    case "rendering": case "assembling": case "processing":
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1 text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Rendering</Badge>;
    case "storyboard_ready":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1 text-xs"><Clapperboard className="h-3 w-3" /> Ready to Render</Badge>;
    case "pending": case "queued":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1 text-xs"><Clock className="h-3 w-3" /> Queued</Badge>;
    case "draft":
      return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 gap-1 text-xs"><Edit3 className="h-3 w-3" /> Draft</Badge>;
    case "failed":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1 text-xs"><AlertCircle className="h-3 w-3" /> Failed</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  PrimaryCTA — status-driven action button                                   */
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
    ? "h-11 px-6 text-base font-bold rounded-xl shadow-lg"
    : "h-9 px-4 text-sm font-semibold rounded-lg";

  switch (status) {
    case "completed":
      return (
        <Button onClick={onWatch} className={`${cls} gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0 shadow-green-900/30`}>
          <Play className="h-4 w-4 fill-current" /> Watch Video
        </Button>
      );
    case "rendering": case "assembling": case "processing":
      return (
        <Button disabled className={`${cls} gap-2 bg-amber-600/20 text-amber-300 border border-amber-500/30 cursor-not-allowed`}>
          <Loader2 className="h-4 w-4 animate-spin" /> Rendering…
        </Button>
      );
    case "storyboard_ready":
      return (
        <Button onClick={onRender ?? onContinue} className={`${cls} gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-purple-900/30`}>
          <Zap className="h-4 w-4" /> Render Now
        </Button>
      );
    case "failed":
      return (
        <Button onClick={onContinue} className={`${cls} gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30`}>
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      );
    default:
      return (
        <Button onClick={onContinue} className={`${cls} gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-purple-900/30`}>
          <Edit3 className="h-4 w-4" /> Continue Editing
        </Button>
      );
  }
}

/* ───────────────────────────────────────────────────────────────────────────── */
/*  KidsAnimCard                                                                */
/* ───────────────────────────────────────────────────────────────────────────── */
function KidsAnimCard({ job }: { job: KidsAnimationJob }) {
  const isRendering = ["rendering", "queued", "preparing"].includes(job.renderStatus);
  const isComplete = job.renderStatus === "completed";
  const isFailed = job.renderStatus === "failed";
  const progress = job.renderProgress ?? 0;

  const STYLE_LABELS: Record<string, string> = {
    anime: "Anime", pixar3d: "Pixar 3D", cartoon: "Cartoon",
    disney: "Disney", storybook: "Storybook", claymation: "Claymation",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 hover:bg-white/5 transition-all overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-pink-900/40 to-purple-900/40 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {job.thumbnailUrl ? (
            <img src={job.thumbnailUrl} alt="thumbnail" className="w-full h-full object-cover" />
          ) : (
            <Film className="h-8 w-8 text-pink-400/50" />
          )}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-white font-semibold text-sm line-clamp-1">
                {STYLE_LABELS[job.animationStyle] ?? job.animationStyle} Animation
              </p>
              <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{job.storyPrompt}</p>
            </div>
            <div className="flex-shrink-0">
              {isComplete ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1 text-xs"><CheckCircle className="h-3 w-3" /> Complete</Badge>
              ) : isRendering ? (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1 text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Rendering</Badge>
              ) : isFailed ? (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1 text-xs"><AlertCircle className="h-3 w-3" /> Failed</Badge>
              ) : (
                <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 gap-1 text-xs"><Clock className="h-3 w-3" /> Queued</Badge>
              )}
            </div>
          </div>
          {/* Progress bar */}
          {isRendering && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>{job.renderMessage ?? "Rendering…"}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-zinc-600">{timeAgo(job.createdAt)}</span>
            {isComplete && job.videoUrl && (
              <a
                href={job.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                <Play className="h-3 w-3" /> Watch
              </a>
            )}
            {isComplete && job.videoUrl && (
              <a
                href={job.videoUrl}
                download
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Download className="h-3 w-3" /> Download
              </a>
            )}
            {isFailed && (
              <a href="/kids-animation" className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors">
                <RefreshCw className="h-3 w-3" /> Retry
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────── */
/*  Main component                                                              */
/* ───────────────────────────────────────────────────────────────────────────── */
export default function Projects() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"music_videos" | "kids_animation" | "generated">("music_videos");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [deleteMusicJobId, setDeleteMusicJobId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  /* ── Data ─────────────────────────────────────────────────────────────── */
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } =
    trpc.billing.getProjects.useQuery(
      { limit: 50 },
      { enabled: isAuthenticated && activeTab === "generated", refetchInterval: 8000 }
    );

  const { data: creditData } = trpc.billing.getCredits.useQuery(undefined, { enabled: isAuthenticated });

  const deleteProjectMutation = trpc.billing.deleteProject.useMutation({
    onSuccess: () => { toast.success("Project deleted."); utils.billing.getProjects.invalidate(); setDeleteProjectId(null); },
    onError: (err) => { toast.error(err.message || "Failed to delete."); setDeleteProjectId(null); },
  });

  const { data: musicJobs, isLoading: musicLoading, refetch: refetchMusic } =
    trpc.musicVideo.listJobs.useQuery(undefined, {
      enabled: isAuthenticated && activeTab === "music_videos",
      refetchInterval: 5000,
    });

  const { data: kidsJobs, isLoading: kidsLoading } =
    trpc.kidsVideo.listJobs.useQuery(undefined, {
      enabled: isAuthenticated && activeTab === "kids_animation",
      refetchInterval: 5000,
    });

  const deleteMusicJobMutation = trpc.musicVideo.deleteJob.useMutation({
    onSuccess: () => { toast.success("Music video deleted."); utils.musicVideo.listJobs.invalidate(); setDeleteMusicJobId(null); },
    onError: (err) => { toast.error(err.message || "Failed to delete."); setDeleteMusicJobId(null); },
  });

  const togglePublicMutation = trpc.musicVideo.togglePublic.useMutation({
    onSuccess: (data) => {
      utils.musicVideo.listJobs.invalidate();
      if (data.isPublic && data.shareSlug) {
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

  /* ── Sorted lists ─────────────────────────────────────────────────────── */
  const sortedMusicJobs = useMemo(() => {
    if (!musicJobs) return [];
    return [...musicJobs].sort((a, b) => {
      const d = sortPriority(a.status) - sortPriority(b.status);
      return d !== 0 ? d : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [musicJobs]);

  const sortedProjects = useMemo(() => {
    if (!projects) return [];
    return [...projects].sort((a, b) => {
      const d = sortPriority(a.status) - sortPriority(b.status);
      return d !== 0 ? d : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [projects]);

  const filteredMusicJobs = useMemo(() => {
    if (filter === "all") return sortedMusicJobs;
    if (filter === "active") return sortedMusicJobs.filter(j => ["rendering","assembling","storyboard_ready","pending","queued"].includes(j.status));
    if (filter === "completed") return sortedMusicJobs.filter(j => j.status === "completed");
    if (filter === "draft") return sortedMusicJobs.filter(j => j.status === "draft");
    return sortedMusicJobs;
  }, [sortedMusicJobs, filter]);

  const filteredProjects = useMemo(() => {
    if (filter === "all") return sortedProjects;
    if (filter === "active") return sortedProjects.filter(p => ["processing","pending"].includes(p.status));
    if (filter === "completed") return sortedProjects.filter(p => p.status === "completed");
    return sortedProjects;
  }, [sortedProjects, filter]);

  /* ── Counts ─────────────────────────────────────────────────────────────── */
  const musicRenderingCount = musicJobs?.filter(j => ["rendering","assembling"].includes(j.status)).length ?? 0;
  const pendingCount = projects?.filter(p => ["processing","pending"].includes(p.status)).length ?? 0;
  const musicActiveCount = musicJobs?.filter(j => ["rendering","assembling","storyboard_ready","pending","draft"].includes(j.status)).length ?? 0;
  const musicCompletedCount = musicJobs?.filter(j => j.status === "completed").length ?? 0;
  const musicDraftCount = musicJobs?.filter(j => j.status === "draft").length ?? 0;
  const projActiveCount = projects?.filter(p => ["processing","pending"].includes(p.status)).length ?? 0;
  const projCompletedCount = projects?.filter(p => p.status === "completed").length ?? 0;

  const totalCount = activeTab === "music_videos" ? (musicJobs?.length ?? 0) : activeTab === "kids_animation" ? (kidsJobs?.length ?? 0) : (projects?.length ?? 0);
  const isLoading = activeTab === "music_videos" ? musicLoading : activeTab === "kids_animation" ? kidsLoading : projectsLoading;

  /* ── Primary (hero) project ─────────────────────────────────────────────── */
  const primaryMusicJob = sortedMusicJobs[0] ?? null;
  const primaryProject = sortedProjects[0] ?? null;

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const handleContinueMusicJob = (job: MusicVideoJob) => {
    window.location.href = `/music-video/create?jobId=${job.id}`;
  };

  const handleDownload = (project: Project) => {
    if (!project.outputUrl) { toast.error("Video not ready yet."); return; }
    const a = document.createElement("a");
    a.href = project.outputUrl;
    a.download = `${project.title.replace(/[^a-z0-9]/gi, "_")}.mp4`;
    a.target = "_blank"; a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success("Download started!");
  };

  const handleMusicDownloadVideo = (job: MusicVideoJob) => {
    if (!job.finalVideoUrl) { toast.error("Video not ready yet."); return; }
    const a = document.createElement("a");
    a.href = job.finalVideoUrl;
    a.download = `${job.title.replace(/[^a-z0-9]/gi, "_")}.mp4`;
    a.target = "_blank"; a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success("Download started!");
  };

  const handleMusicDownloadAudio = (job: MusicVideoJob) => {
    if (!job.audioUrl) return;
    const a = document.createElement("a");
    a.href = job.audioUrl;
    a.download = `${job.title.replace(/[^a-z0-9]/gi, "_")}_audio.mp3`;
    a.target = "_blank"; a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success("Audio download started!");
  };

  /* ── Sub-components ───────────────────────────────────────────────────── */
  const FilterPill = ({ value, label, count }: { value: FilterTab; label: string; count?: number }) => (
    <button
      onClick={() => setFilter(value)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
        filter === value
          ? "bg-purple-600 text-white shadow-lg shadow-purple-900/30"
          : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/10"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`text-xs rounded-full px-1.5 py-0.5 leading-none ${filter === value ? "bg-white/20" : "bg-white/10 text-zinc-300"}`}>
          {count}
        </span>
      )}
    </button>
  );

  const MusicCard = ({ job, isPrimary = false }: { job: MusicVideoJob; isPrimary?: boolean }) => {
    const progress = job.totalScenes ? Math.round((job.completedScenes / job.totalScenes) * 100) : 0;
    const rendering = ["rendering","assembling"].includes(job.status);
    const completed = job.status === "completed";

    return (
      <div className={`relative rounded-2xl border overflow-hidden transition-all group ${
        isPrimary
          ? "border-purple-500/50 bg-gradient-to-br from-purple-900/30 via-zinc-900 to-pink-900/20 shadow-xl shadow-purple-900/20"
          : completed
          ? "border-green-500/20 bg-zinc-900/80 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-900/10"
          : rendering
          ? "border-amber-500/30 bg-zinc-900/80"
          : "border-white/10 bg-zinc-900/80 hover:border-white/20"
      }`}>
        {completed && <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />}
        {isPrimary && (
          <div className="absolute top-3 right-3 z-10">
            <span className="flex items-center gap-1 text-xs font-semibold text-purple-300 bg-purple-600/20 border border-purple-500/30 rounded-full px-2 py-0.5">
              <Sparkles className="h-3 w-3" /> Last edited
            </span>
          </div>
        )}
        <div className="p-5">
          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className={`relative flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden border ${completed ? "border-green-500/30" : "border-white/10"} bg-zinc-800`}>
              {completed && job.finalVideoUrl ? (
                <>
                  <video src={job.finalVideoUrl} className="w-full h-full object-cover wiz-video" muted playsInline preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                    <Play className="h-5 w-5 text-white fill-current drop-shadow" />
                  </div>
                  <div className="absolute inset-0 rounded-xl ring-1 ring-green-400/40 group-hover:ring-green-400/60 transition-all" />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {rendering ? <Loader2 className="h-6 w-6 text-amber-400 animate-spin" /> : <Film className="h-6 w-6 text-zinc-600" />}
                </div>
              )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1 flex-wrap">
                <h3 className="font-bold text-base truncate leading-tight text-zinc-100">{job.title}</h3>
                <StatusBadge status={job.status} />
              </div>
              <div className="flex flex-wrap gap-x-2 text-xs text-zinc-500 mb-1.5">
                {job.genre && <span className="text-zinc-400">{job.genre}</span>}
                {job.mood && <><span>·</span><span>{job.mood}</span></>}
                {job.audioDuration && <><span>·</span><span>{formatDuration(job.audioDuration)}</span></>}
                <span>·</span><span>{job.completedScenes}/{job.totalScenes} scenes</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-zinc-600">
                <Save className="h-3 w-3" />
                <span>Saved automatically · {timeAgo(job.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Render progress */}
          {rendering && job.totalScenes > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Rendering your video…
                </span>
                <span className="text-zinc-400">{progress}% · ~{Math.ceil((job.totalScenes - job.completedScenes) * 8)}s left</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <PrimaryCTA
              status={job.status}
              onContinue={() => handleContinueMusicJob(job)}
              onWatch={() => job.finalVideoUrl ? window.open(job.finalVideoUrl, "_blank") : toast.error("Video not ready yet.")}
              large={isPrimary}
            />
            {completed && job.finalVideoUrl && (
              <Button size="sm" variant="outline" onClick={() => handleMusicDownloadVideo(job)} className="gap-1.5 border-white/20 text-zinc-300 hover:bg-white/10 hover:text-white">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            )}
            {job.audioUrl && (
              <Button size="sm" variant="outline" onClick={() => handleMusicDownloadAudio(job)} className="gap-1.5 border-white/20 text-zinc-300 hover:bg-white/10 hover:text-white">
                <Music className="h-3.5 w-3.5" /> Audio
              </Button>
            )}
            {completed && job.finalVideoUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => togglePublicMutation.mutate({ jobId: job.id, isPublic: !job.isPublic })}
                disabled={togglePublicMutation.isPending}
                className={`gap-1.5 border-white/20 hover:bg-white/10 ${
                  job.isPublic
                    ? "text-green-400 border-green-500/30 hover:text-green-300"
                    : "text-zinc-300 hover:text-white"
                }`}
                title={job.isPublic ? `Public — click to make private` : "Make public for Google indexing"}
              >
                {job.isPublic ? <Link2 className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                {job.isPublic ? "Public" : "Share"}
              </Button>
            )}
            <button onClick={() => setDeleteMusicJobId(job.id)} className="ml-auto p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const GeneratedCard = ({ project, isPrimary = false }: { project: Project; isPrimary?: boolean }) => {
    const completed = project.status === "completed";
    const rendering = ["processing","pending"].includes(project.status);

    return (
      <div className={`relative rounded-2xl border overflow-hidden transition-all group ${
        isPrimary
          ? "border-purple-500/50 bg-gradient-to-br from-purple-900/30 via-zinc-900 to-pink-900/20 shadow-xl shadow-purple-900/20"
          : completed
          ? "border-green-500/20 bg-zinc-900/80 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-900/10"
          : rendering
          ? "border-amber-500/30 bg-zinc-900/80"
          : "border-white/10 bg-zinc-900/80 hover:border-white/20"
      }`}>
        {completed && <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />}
        {isPrimary && (
          <div className="absolute top-3 right-3 z-10">
            <span className="flex items-center gap-1 text-xs font-semibold text-purple-300 bg-purple-600/20 border border-purple-500/30 rounded-full px-2 py-0.5">
              <Sparkles className="h-3 w-3" /> Last edited
            </span>
          </div>
        )}
        <div className="p-5">
          <div className="flex gap-4">
            <div className={`relative flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden border ${completed ? "border-green-500/30" : "border-white/10"} bg-zinc-800`}>
              {completed && project.outputUrl ? (
                <>
                  <video src={project.outputUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                    <Play className="h-5 w-5 text-white fill-current drop-shadow" />
                  </div>
                  <div className="absolute inset-0 rounded-xl ring-1 ring-green-400/40 group-hover:ring-green-400/60 transition-all" />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {rendering ? <Loader2 className="h-6 w-6 text-amber-400 animate-spin" /> : <Wand2 className="h-6 w-6 text-zinc-600" />}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1 flex-wrap">
                <h3 className="font-bold text-base truncate leading-tight text-zinc-100">{project.title}</h3>
                <StatusBadge status={project.status} />
              </div>
              <div className="flex flex-wrap gap-x-2 text-xs text-zinc-500 mb-1.5">
                <span className="text-zinc-400">{TOOL_LABELS[project.toolType] ?? project.toolType}</span>
                <span>·</span><span>{project.creditCost} credits</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-zinc-600">
                <Save className="h-3 w-3" />
                <span>Saved automatically · {timeAgo(project.createdAt)}</span>
              </div>
            </div>
          </div>

          {rendering && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Processing your video…
                </span>
                <span className="text-zinc-400">In queue</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse" style={{ width: "55%" }} />
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <PrimaryCTA
              status={project.status}
              onContinue={() => toast.info("Opening project…")}
              onWatch={() => setPreviewProject(project)}
              large={isPrimary}
            />
            {completed && project.outputUrl && (
              <Button size="sm" variant="outline" onClick={() => handleDownload(project)} className="gap-1.5 border-white/20 text-zinc-300 hover:bg-white/10 hover:text-white">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            )}
            <button onClick={() => setDeleteProjectId(project.id)} className="ml-auto p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-4">
        {activeTab === "music_videos" ? <Music className="h-8 w-8 text-purple-400" /> : <Wand2 className="h-8 w-8 text-purple-400" />}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">No projects yet</h3>
      <p className="text-zinc-500 text-sm mb-6 max-w-xs">
        {activeTab === "music_videos"
          ? "Create your first AI music video — upload a song and let WizVid do the rest."
          : "Generate your first AI video from a text prompt in seconds."}
      </p>
      <a
        href={activeTab === "music_videos" ? "/music-video/create" : "/text-to-video"}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold px-6 py-3 transition-all shadow-lg shadow-purple-900/30"
      >
        <Sparkles className="h-4 w-4" />
        Create your first video
        <ChevronRight className="h-4 w-4" />
      </a>
    </div>
  );

  /* ── Page ───────────────────────────────────────────────────────────────── */
  const activeCount = activeTab === "music_videos" ? musicActiveCount : projActiveCount;
  const completedCount = activeTab === "music_videos" ? musicCompletedCount : projCompletedCount;
  const draftCount = activeTab === "music_videos" ? musicDraftCount : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/8 sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur">
        <div className="max-w-4xl mx-auto flex h-16 items-center justify-between px-4">
          <a href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-white transition-colors px-2 py-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </a>
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-purple-400" />
            <h1 className="text-lg font-bold text-white">My Projects</h1>
          </div>
          <div className="flex items-center gap-2">
            {(activeTab === "generated" ? pendingCount : musicRenderingCount) > 0 && (
              <button onClick={() => activeTab === "generated" ? refetchProjects() : refetchMusic()} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5">
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
            <CreditBalance variant="badge" />
          </div>
        </div>
        {/* Tab bar */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto">
          {(["music_videos", "kids_animation", "generated"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setFilter("all"); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab ? "border-purple-500 text-white" : "border-transparent text-zinc-500 hover:text-white"
              }`}
            >
              {tab === "music_videos" ? <><Music className="h-4 w-4" /> Music Videos</> :
               tab === "kids_animation" ? <><Film className="h-4 w-4" /> Kids Animation</> :
               <><Zap className="h-4 w-4" /> Generated Videos</>}
              {tab === "music_videos" && (musicJobs?.length ?? 0) > 0 && (
                <span className="ml-1 rounded-full bg-purple-600/30 text-purple-300 text-xs px-1.5 py-0.5 leading-none">{musicJobs!.length}</span>
              )}
              {tab === "kids_animation" && (kidsJobs?.length ?? 0) > 0 && (
                <span className="ml-1 rounded-full bg-pink-600/30 text-pink-300 text-xs px-1.5 py-0.5 leading-none">{kidsJobs!.length}</span>
              )}
              {tab === "generated" && (projects?.length ?? 0) > 0 && (
                <span className="ml-1 rounded-full bg-purple-600/30 text-purple-300 text-xs px-1.5 py-0.5 leading-none">{projects!.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto py-6 sm:py-8 px-4">
        {/* Credit bar */}
        {creditData && (
          <div className="flex items-center gap-2 mb-6 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
            <Zap className="h-4 w-4 text-yellow-400 flex-shrink-0" />
            <span className="text-sm text-white">
              <span className="font-bold text-yellow-300">{creditData.balance.toLocaleString()} credits</span> remaining
            </span>
            <a href="/credits" className="ml-auto text-xs text-purple-400 hover:text-purple-300 transition-colors">Top up →</a>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
            <p className="text-zinc-500 text-sm">Loading your projects…</p>
          </div>
        ) : totalCount === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* ── Hero: Continue last project ─────────────────────────────── */}
            {((activeTab === "music_videos" && primaryMusicJob) || (activeTab === "generated" && primaryProject)) && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-semibold text-purple-300 uppercase tracking-wider">Continue your last project</span>
                </div>
                {activeTab === "music_videos" && primaryMusicJob && <MusicCard job={primaryMusicJob} isPrimary />}
                {activeTab === "generated" && primaryProject && <GeneratedCard project={primaryProject} isPrimary />}
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
            {(activeTab === "music_videos" ? filteredMusicJobs : activeTab === "kids_animation" ? (kidsJobs ?? []) : filteredProjects).length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm">No projects match this filter.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeTab === "music_videos"
                  ? filteredMusicJobs.map(job => <MusicCard key={job.id} job={job} />)
                  : activeTab === "kids_animation"
                  ? (kidsJobs ?? []).map(job => <KidsAnimCard key={job.id} job={job as unknown as KidsAnimationJob} />)
                  : filteredProjects.map(project => <GeneratedCard key={project.id} project={project} />)
                }
              </div>
            )}

            {/* ── New project CTA ─────────────────────────────────────────── */}
            <div className="mt-8 pt-6 border-t border-white/8 flex justify-center">
              <a
                href={activeTab === "music_videos" ? "/music-video/create" : "/text-to-video"}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 text-zinc-300 hover:text-white font-medium px-6 py-3 transition-all"
              >
                <Sparkles className="h-4 w-4 text-purple-400" />
                Start a new project
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </>
        )}
      </div>

      {/* ── Preview Modal ───────────────────────────────────────────────────── */}
      <Dialog open={!!previewProject} onOpenChange={(open) => !open && setPreviewProject(null)}>
        <DialogContent className="max-w-3xl w-full bg-zinc-900 border-white/10 p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-white text-lg">{previewProject?.title}</DialogTitle>
            <DialogDescription className="text-zinc-500 text-sm">
              {TOOL_LABELS[previewProject?.toolType ?? ""] ?? previewProject?.toolType} · {previewProject?.creditCost} credits · {previewProject?.createdAt ? new Date(previewProject.createdAt).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>
          {previewProject?.outputUrl && (
            <div className="bg-black aspect-video w-full">
              <video src={previewProject.outputUrl} controls autoPlay muted playsInline className="w-full h-full object-contain wiz-video" />
            </div>
          )}
          <div className="flex gap-3 px-5 py-4">
            <Button onClick={() => previewProject && handleDownload(previewProject)} className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 flex-1">
              <Download className="h-4 w-4" /> Download Video
            </Button>
            <Button variant="outline" onClick={() => setPreviewProject(null)} className="border-white/20 text-white hover:bg-white/10">Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Generated ────────────────────────────────────────────────── */}
      <AlertDialog open={deleteProjectId !== null} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this project?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">This will permanently delete the project and its video. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10 bg-transparent">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteProjectId !== null && deleteProjectMutation.mutate({ projectId: deleteProjectId })} disabled={deleteProjectMutation.isPending} className="bg-red-600 hover:bg-red-500 text-white border-0">
              {deleteProjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Music Video ──────────────────────────────────────────────── */}
      <AlertDialog open={deleteMusicJobId !== null} onOpenChange={(open) => !open && setDeleteMusicJobId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this music video?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">This will permanently delete the project, all scenes, and any generated video.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10 bg-transparent">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMusicJobId !== null && deleteMusicJobMutation.mutate({ jobId: deleteMusicJobId })} disabled={deleteMusicJobMutation.isPending} className="bg-red-600 hover:bg-red-500 text-white border-0">
              {deleteMusicJobMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
