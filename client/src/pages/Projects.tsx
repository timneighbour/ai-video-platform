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
  Globe,
  Link2,
  Plus,
  Eye,
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
      return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 gap-1 text-[11px] font-semibold"><CheckCircle className="h-3 w-3" /> Complete</Badge>;
    case "rendering": case "assembling": case "processing":
      return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 gap-1 text-[11px] font-semibold"><Loader2 className="h-3 w-3 animate-spin" /> Rendering</Badge>;
    case "storyboard_ready":
      return <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/25 gap-1 text-[11px] font-semibold"><Clapperboard className="h-3 w-3" /> Ready to Render</Badge>;
    case "pending": case "queued":
      return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25 gap-1 text-[11px] font-semibold"><Clock className="h-3 w-3" /> Queued</Badge>;
    case "draft":
      return <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/25 gap-1 text-[11px] font-semibold"><Edit3 className="h-3 w-3" /> Draft</Badge>;
    case "failed":
      return <Badge className="bg-red-500/15 text-red-400 border-red-500/25 gap-1 text-[11px] font-semibold"><AlertCircle className="h-3 w-3" /> Failed</Badge>;
    default:
      return <Badge variant="outline" className="text-[11px]">{status}</Badge>;
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
    ? "h-11 px-6 text-sm font-bold rounded-xl shadow-lg"
    : "h-9 px-4 text-xs font-semibold rounded-lg";

  switch (status) {
    case "completed":
      return (
        <Button onClick={onWatch} className={`${cls} gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white border-0 shadow-emerald-900/30`}>
          <Play className="h-3.5 w-3.5 fill-current" /> Watch Video
        </Button>
      );
    case "rendering": case "assembling": case "processing":
      return (
        <Button disabled className={`${cls} gap-2 bg-amber-600/15 text-amber-300 border border-amber-500/25 cursor-not-allowed`}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Rendering…
        </Button>
      );
    case "storyboard_ready":
      return (
        <Button onClick={onRender ?? onContinue} className={`${cls} gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0 shadow-violet-900/30`}>
          <Zap className="h-3.5 w-3.5" /> Render Now
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
        <Button onClick={onContinue} className={`${cls} gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0 shadow-violet-900/30`}>
          <Edit3 className="h-3.5 w-3.5" /> Continue Editing
        </Button>
      );
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Scene dots — visual progress for music video scenes                        */
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
              isCompleted ? "bg-emerald-400" : isFailed ? "bg-red-400" : "bg-white/10"
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
  const [activeTab, setActiveTab] = useState<"music_videos" | "generated">("music_videos");
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

  const deleteMusicJobMutation = trpc.musicVideo.deleteJob.useMutation({
    onSuccess: () => { toast.success("Music video deleted."); utils.musicVideo.listJobs.invalidate(); setDeleteMusicJobId(null); },
    onError: (err) => { toast.error(err.message || "Failed to delete."); setDeleteMusicJobId(null); },
  });

  const togglePublicMutation = trpc.musicVideo.togglePublic.useMutation({
    onSuccess: (data) => {
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

  const totalCount = activeTab === "music_videos" ? (musicJobs?.length ?? 0) : (projects?.length ?? 0);
  const isLoading = activeTab === "music_videos" ? musicLoading : projectsLoading;

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
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
        filter === value
          ? "bg-violet-600 text-white shadow-lg shadow-violet-900/30"
          : "bg-white/5 text-zinc-400 hover:bg-white/8 hover:text-white border border-white/8"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`text-[10px] rounded-full px-1.5 py-0.5 leading-none font-bold ${filter === value ? "bg-white/20" : "bg-white/10 text-zinc-300"}`}>
          {count}
        </span>
      )}
    </button>
  );

  /* ── Music Video Card ─────────────────────────────────────────────────── */
  const MusicCard = ({ job, isPrimary = false }: { job: MusicVideoJob; isPrimary?: boolean }) => {
    const progress = job.totalScenes ? Math.round((job.completedScenes / job.totalScenes) * 100) : 0;
    const rendering = ["rendering","assembling"].includes(job.status);
    const completed = job.status === "completed";

    return (
      <div className={`relative rounded-2xl border overflow-hidden transition-all duration-200 group ${
        isPrimary
          ? "border-violet-500/40 bg-gradient-to-br from-violet-950/40 via-[#111118] to-purple-950/20 shadow-xl shadow-violet-900/15"
          : completed
          ? "border-emerald-500/20 bg-[#111118] hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-900/10"
          : rendering
          ? "border-amber-500/25 bg-[#111118] shadow-md shadow-amber-900/10"
          : "border-white/8 bg-[#111118] hover:border-white/15 hover:shadow-md"
      }`}>
        {/* Ambient glow for rendering */}
        {rendering && <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />}
        {completed && <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/4 to-transparent pointer-events-none" />}

        <div className="p-5">
          {/* Top row: badge + time */}
          <div className="flex items-center justify-between mb-3">
            <StatusBadge status={job.status} />
            <span className="text-[11px] text-zinc-600">{timeAgo(job.createdAt)}</span>
          </div>

          {/* Thumbnail + info */}
          <div className="flex gap-4">
            <div className={`relative flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden border ${
              completed ? "border-emerald-500/25" : rendering ? "border-amber-500/20" : "border-white/8"
            } bg-zinc-900`}>
              {completed && job.finalVideoUrl ? (
                <>
                  {job.thumbnailUrl ? (
                    <img src={job.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <video src={job.finalVideoUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
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
                      <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                    </div>
                  ) : (
                    <Music className="h-6 w-6 text-zinc-600" />
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[15px] truncate leading-tight text-white mb-1">{job.title}</h3>
              <div className="flex flex-wrap gap-x-2 text-[11px] text-zinc-500">
                {job.genre && <span className="text-zinc-400">{job.genre}</span>}
                {job.mood && <><span className="text-zinc-600">·</span><span>{job.mood}</span></>}
                {job.audioDuration ? <><span className="text-zinc-600">·</span><span>{formatDuration(job.audioDuration)}</span></> : null}
                <span className="text-zinc-600">·</span><span>{job.completedScenes}/{job.totalScenes} scenes</span>
              </div>
            </div>
          </div>

          {/* Scene progress dots */}
          {job.totalScenes > 0 && (rendering || completed || job.failedScenes > 0) && (
            <SceneDots total={job.totalScenes} completed={job.completedScenes} failed={job.failedScenes} />
          )}

          {/* Render progress bar */}
          {rendering && job.totalScenes > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Rendering your video…
                </span>
                <span className="text-zinc-500">{progress}%{job.totalScenes - job.completedScenes > 0 && ` · ~${Math.ceil((job.totalScenes - job.completedScenes) * 8)}s`}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700" style={{ width: `${Math.max(progress, 3)}%` }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 flex-wrap">
            <PrimaryCTA
              status={job.status}
              onContinue={() => handleContinueMusicJob(job)}
              onWatch={() => job.finalVideoUrl ? window.open(job.finalVideoUrl, "_blank") : toast.error("Video not ready yet.")}
              large={isPrimary}
            />
            {completed && job.finalVideoUrl && (
              <Button size="sm" variant="outline" onClick={() => handleMusicDownloadVideo(job)} className="gap-1.5 border-white/12 text-zinc-400 hover:bg-white/8 hover:text-white h-9 text-xs rounded-lg">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            )}
            {job.audioUrl && (
              <Button size="sm" variant="outline" onClick={() => handleMusicDownloadAudio(job)} className="gap-1.5 border-white/12 text-zinc-400 hover:bg-white/8 hover:text-white h-9 text-xs rounded-lg">
                <Music className="h-3.5 w-3.5" /> Audio
              </Button>
            )}
            {completed && job.finalVideoUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => togglePublicMutation.mutate({ jobId: job.id, isPublic: !job.isPublic })}
                disabled={togglePublicMutation.isPending}
                className={`gap-1.5 border-white/12 hover:bg-white/8 h-9 text-xs rounded-lg ${
                  job.isPublic
                    ? "text-emerald-400 border-emerald-500/25 hover:text-emerald-300"
                    : "text-zinc-400 hover:text-white"
                }`}
                title={job.isPublic ? "Public — click to make private" : "Make public for Google indexing"}
              >
                {job.isPublic ? <Link2 className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                {job.isPublic ? "Public" : "Share"}
              </Button>
            )}
            <button onClick={() => setDeleteMusicJobId(job.id)} className="ml-auto p-2 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/8 transition-colors" title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ── Generated Video Card ─────────────────────────────────────────────── */
  const GeneratedCard = ({ project, isPrimary = false }: { project: Project; isPrimary?: boolean }) => {
    const completed = project.status === "completed";
    const rendering = ["processing","pending"].includes(project.status);

    return (
      <div className={`relative rounded-2xl border overflow-hidden transition-all duration-200 group ${
        isPrimary
          ? "border-violet-500/40 bg-gradient-to-br from-violet-950/40 via-[#111118] to-purple-950/20 shadow-xl shadow-violet-900/15"
          : completed
          ? "border-emerald-500/20 bg-[#111118] hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-900/10"
          : rendering
          ? "border-amber-500/25 bg-[#111118] shadow-md shadow-amber-900/10"
          : "border-white/8 bg-[#111118] hover:border-white/15 hover:shadow-md"
      }`}>
        {rendering && <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />}
        {completed && <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/4 to-transparent pointer-events-none" />}

        <div className="p-5">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <StatusBadge status={project.status} />
            <span className="text-[11px] text-zinc-600">{timeAgo(project.createdAt)}</span>
          </div>

          {/* Thumbnail + info */}
          <div className="flex gap-4">
            <div className={`relative flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden border ${
              completed ? "border-emerald-500/25" : rendering ? "border-amber-500/20" : "border-white/8"
            } bg-zinc-900`}>
              {completed && project.outputUrl ? (
                <>
                  <video src={project.outputUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
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
                      <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                    </div>
                  ) : (
                    <Wand2 className="h-6 w-6 text-zinc-600" />
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[15px] truncate leading-tight text-white mb-1">{project.title}</h3>
              <div className="flex flex-wrap gap-x-2 text-[11px] text-zinc-500">
                <span className="text-zinc-400">{TOOL_LABELS[project.toolType] ?? project.toolType}</span>
                <span className="text-zinc-600">·</span><span>{project.creditCost} credits</span>
              </div>
            </div>
          </div>

          {/* Processing indicator */}
          {rendering && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Processing your video…
                </span>
                <span className="text-zinc-500">In queue</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse" style={{ width: "55%" }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 flex-wrap">
            <PrimaryCTA
              status={project.status}
              onContinue={() => toast.info("Opening project…")}
              onWatch={() => setPreviewProject(project)}
              large={isPrimary}
            />
            {completed && project.outputUrl && (
              <Button size="sm" variant="outline" onClick={() => handleDownload(project)} className="gap-1.5 border-white/12 text-zinc-400 hover:bg-white/8 hover:text-white h-9 text-xs rounded-lg">
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            )}
            <button onClick={() => setDeleteProjectId(project.id)} className="ml-auto p-2 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/8 transition-colors" title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ── Empty state ─────────────────────────────────────────────────────── */
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-2xl bg-violet-600/8 border border-violet-500/15 flex items-center justify-center mb-5">
        {activeTab === "music_videos" ? <Music className="h-9 w-9 text-violet-400" /> : <Wand2 className="h-9 w-9 text-violet-400" />}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">No projects yet</h3>
      <p className="text-zinc-500 text-sm mb-8 max-w-xs leading-relaxed">
        {activeTab === "music_videos"
          ? "Create your first AI music video — upload a song and let WizVid handle the rest."
          : "Generate your first AI video from a text prompt in seconds."}
      </p>
      <a
        href={activeTab === "music_videos" ? "/music-video/create" : "/wizpilot"}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold px-7 py-3 transition-all shadow-lg shadow-violet-900/25 text-sm"
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
      <div className="border-b border-white/6 sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex h-14 items-center justify-between px-4">
          <a href="/dashboard" className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-white transition-colors px-2 py-2 rounded-lg hover:bg-white/5">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </a>
          <div className="flex items-center gap-2">
            <Film className="h-4.5 w-4.5 text-violet-400" />
            <h1 className="text-base font-bold text-white tracking-tight">My Projects</h1>
          </div>
          <div className="flex items-center gap-2">
            {(activeTab === "generated" ? pendingCount : musicRenderingCount) > 0 && (
              <button onClick={() => activeTab === "generated" ? refetchProjects() : refetchMusic()} className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5">
                <RefreshCw className="h-3 w-3" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
            <CreditBalance variant="badge" />
          </div>
        </div>
        {/* Tab bar */}
        <div className="max-w-4xl mx-auto px-4 flex gap-0 pb-0">
          {(["music_videos", "generated"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setFilter("all"); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab ? "border-violet-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab === "music_videos" ? <><Music className="h-3.5 w-3.5" /> Music Videos</> : <><Zap className="h-3.5 w-3.5" /> Generated Videos</>}
              {tab === "music_videos" && (musicJobs?.length ?? 0) > 0 && (
                <span className="rounded-full bg-violet-600/25 text-violet-300 text-[10px] px-1.5 py-0.5 leading-none font-bold">{musicJobs!.length}</span>
              )}
              {tab === "generated" && (projects?.length ?? 0) > 0 && (
                <span className="rounded-full bg-violet-600/25 text-violet-300 text-[10px] px-1.5 py-0.5 leading-none font-bold">{projects!.length}</span>
              )}
            </button>
          ))}
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
              <span className="font-bold text-yellow-300">{creditData.balance.toLocaleString()}</span> <span className="text-zinc-400">credits remaining</span>
            </span>
            <a href="/credits" className="ml-auto text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium">Top up</a>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
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
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  <span className="text-xs font-semibold text-violet-300 uppercase tracking-widest">Continue where you left off</span>
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
            {(activeTab === "music_videos" ? filteredMusicJobs : filteredProjects).length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-sm">No projects match this filter.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {activeTab === "music_videos"
                  ? filteredMusicJobs.map(job => <MusicCard key={job.id} job={job} />)
                  : filteredProjects.map(project => <GeneratedCard key={project.id} project={project} />)
                }
              </div>
            )}

            {/* ── New project CTA ─────────────────────────────────────────── */}
            <div className="mt-10 pt-6 border-t border-white/5 flex justify-center">
              <a
                href={activeTab === "music_videos" ? "/music-video/create" : "/wizpilot"}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 hover:border-violet-500/30 text-zinc-400 hover:text-white font-medium px-6 py-3 transition-all text-sm"
              >
                <Plus className="h-4 w-4 text-violet-400" />
                Start a new project
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </>
        )}
      </div>

      {/* ── Preview Modal ───────────────────────────────────────────────────── */}
      <Dialog open={!!previewProject} onOpenChange={(open) => !open && setPreviewProject(null)}>
        <DialogContent className="max-w-3xl w-full bg-[#111118] border-white/10 p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-white text-lg font-bold">{previewProject?.title}</DialogTitle>
            <DialogDescription className="text-zinc-500 text-sm">
              {TOOL_LABELS[previewProject?.toolType ?? ""] ?? previewProject?.toolType} · {previewProject?.creditCost} credits · {previewProject?.createdAt ? new Date(previewProject.createdAt).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>
          {previewProject?.outputUrl && (
            <div className="bg-black aspect-video w-full">
              <video src={previewProject.outputUrl} controls autoPlay muted playsInline className="w-full h-full object-contain" />
            </div>
          )}
          <div className="flex gap-3 px-6 py-5">
            <Button onClick={() => previewProject && handleDownload(previewProject)} className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white border-0 flex-1 h-11 rounded-xl font-semibold">
              <Download className="h-4 w-4" /> Download Video
            </Button>
            <Button variant="outline" onClick={() => setPreviewProject(null)} className="border-white/15 text-white hover:bg-white/8 h-11 rounded-xl">Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Generated ────────────────────────────────────────────────── */}
      <AlertDialog open={deleteProjectId !== null} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
        <AlertDialogContent className="bg-[#111118] border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this project?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">This will permanently delete the project and its video. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/15 text-white hover:bg-white/8 bg-transparent rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteProjectId !== null && deleteProjectMutation.mutate({ projectId: deleteProjectId })} disabled={deleteProjectMutation.isPending} className="bg-red-600 hover:bg-red-500 text-white border-0 rounded-xl">
              {deleteProjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Music Video ──────────────────────────────────────────────── */}
      <AlertDialog open={deleteMusicJobId !== null} onOpenChange={(open) => !open && setDeleteMusicJobId(null)}>
        <AlertDialogContent className="bg-[#111118] border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this music video?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">This will permanently delete the project, all scenes, and any generated video.</AlertDialogDescription>
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
