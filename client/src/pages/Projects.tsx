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
  Eye,
  Clock,
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
  Filter,
  Sparkles,
  ArrowRight,
  Video,
  RotateCcw,
  FolderOpen,
  Plus,
} from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import CreditBalance from "@/components/CreditBalance";

/* ── Constants ────────────────────────────────────────────────────────────── */
const TOOL_LABELS: Record<string, string> = {
  text_to_video: "Text to Video",
  lip_sync: "Lip Sync",
  video_to_video: "Video to Video",
  voiceover: "Voiceover",
  musetalk_lip_sync: "Lip Sync (MuseTalk)",
  seedance_t2v: "Text to Video (Seedance)",
  seedance_i2v: "Image to Video (Seedance)",
};

const TOOL_ICONS: Record<string, typeof Film> = {
  text_to_video: Video,
  lip_sync: Wand2,
  video_to_video: RefreshCw,
  voiceover: Music,
  musetalk_lip_sync: Wand2,
  seedance_t2v: Video,
  seedance_i2v: Video,
};

/* ── Types ────────────────────────────────────────────────────────────────── */
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
};

type FilterTab = "all" | "active" | "completed" | "drafts";

/* Unified project wrapper for sorting/sectioning */
type UnifiedProject = {
  kind: "music" | "generated";
  id: number;
  title: string;
  status: string;
  createdAt: Date;
  raw: MusicVideoJob | Project;
};

/* ── Status helpers ───────────────────────────────────────────────────────── */
function getProjectPhase(status: string): "active" | "completed" | "failed" | "draft" {
  switch (status) {
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "draft":
    case "storyboard_ready":
      return "draft";
    default:
      return "active";
  }
}

function getSection(status: string): "active" | "completed" | "older" {
  const phase = getProjectPhase(status);
  if (phase === "active" || phase === "draft") return "active";
  if (phase === "completed") return "completed";
  return "older";
}

function isOlderThan30Days(date: Date): boolean {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return new Date(date) < thirtyDaysAgo;
}

/* ── Status Badge ─────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 gap-1 text-[11px] font-semibold">
          <CheckCircle className="h-3 w-3" /> Completed
        </Badge>
      );
    case "rendering":
    case "assembling":
    case "processing":
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 gap-1 text-[11px] font-semibold">
          <Loader2 className="h-3 w-3 animate-spin" /> Rendering
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25 gap-1 text-[11px] font-semibold">
          <Clock className="h-3 w-3 animate-pulse" /> Queued
        </Badge>
      );
    case "storyboard_ready":
      return (
        <Badge className="bg-violet-500/15 text-violet-400 border-violet-500/25 gap-1 text-[11px] font-semibold">
          <Clapperboard className="h-3 w-3" /> Ready to Render
        </Badge>
      );
    case "draft":
      return (
        <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/25 gap-1 text-[11px] font-semibold">
          <Edit3 className="h-3 w-3" /> Draft
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/25 gap-1 text-[11px] font-semibold">
          <AlertCircle className="h-3 w-3" /> Failed
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-[11px]">{status}</Badge>;
  }
}

/* ── Primary CTA per status ───────────────────────────────────────────────── */
function PrimaryCTA({
  status,
  onContinue,
  onWatch,
  onRender,
  onViewProgress,
  onRetry,
}: {
  status: string;
  onContinue: () => void;
  onWatch: () => void;
  onRender: () => void;
  onViewProgress: () => void;
  onRetry: () => void;
}) {
  switch (status) {
    case "draft":
      return (
        <Button
          size="sm"
          onClick={onContinue}
          className="gap-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white border-0 shadow-lg shadow-purple-500/20"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Continue Editing
        </Button>
      );
    case "storyboard_ready":
      return (
        <Button
          size="sm"
          onClick={onRender}
          className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-0 shadow-lg shadow-emerald-500/20"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Render Video
        </Button>
      );
    case "rendering":
    case "assembling":
    case "processing":
    case "pending":
      return (
        <Button
          size="sm"
          onClick={onViewProgress}
          className="gap-1.5 bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          View Progress
        </Button>
      );
    case "completed":
      return (
        <Button
          size="sm"
          onClick={onWatch}
          className="gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 shadow-lg shadow-purple-500/20"
        >
          <Play className="h-3.5 w-3.5" />
          Watch Video
        </Button>
      );
    case "failed":
      return (
        <Button
          size="sm"
          onClick={onRetry}
          className="gap-1.5 bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </Button>
      );
    default:
      return (
        <Button size="sm" variant="outline" onClick={onContinue} className="gap-1.5 border-white/20 text-white hover:bg-white/10">
          <ArrowRight className="h-3.5 w-3.5" /> Open
        </Button>
      );
  }
}

/* ── Lazy thumbnail ───────────────────────────────────────────────────────── */
function LazyThumbnail({
  videoUrl,
  status,
  kind,
  progress,
}: {
  videoUrl: string | null;
  status: string;
  kind: "music" | "generated";
  progress?: number;
}) {
  const isRendering = ["rendering", "assembling", "processing", "pending"].includes(status);

  return (
    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/8">
      {videoUrl && status === "completed" ? (
        <video
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"

          onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
          onMouseLeave={(e) => {
            const v = e.currentTarget as HTMLVideoElement;
            v.pause();
            v.currentTime = 0;
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          {isRendering ? (
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
              {progress !== undefined && progress > 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-purple-300">
                  {progress}%
                </span>
              )}
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background:
                  kind === "music"
                    ? "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.2))"
                    : "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.2))",
              }}
            >
              {kind === "music" ? (
                <Music className="w-5 h-5 text-purple-300" />
              ) : (
                <Video className="w-5 h-5 text-blue-300" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Render progress overlay */}
      {isRendering && progress !== undefined && progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Music Video Card ─────────────────────────────────────────────────────── */
function MusicVideoCard({
  job,
  onContinue,
  onWatch,
  onDownloadVideo,
  onDownloadAudio,
  onDelete,
}: {
  job: MusicVideoJob;
  onContinue: () => void;
  onWatch: () => void;
  onDownloadVideo: () => void;
  onDownloadAudio: () => void;
  onDelete: () => void;
}) {
  const progress = job.totalScenes > 0 ? Math.round((job.completedScenes / job.totalScenes) * 100) : 0;
  const isRendering = job.status === "rendering" || job.status === "assembling";

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div
      className={`group rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-lg ${
        isRendering
          ? "border-amber-500/25 bg-amber-500/5 hover:border-amber-500/40 shadow-amber-500/5"
          : job.status === "completed"
          ? "border-emerald-500/15 bg-white/[0.03] hover:border-emerald-500/30"
          : job.status === "failed"
          ? "border-red-500/15 bg-white/[0.03] hover:border-red-500/30"
          : "border-white/10 bg-white/[0.03] hover:border-white/20"
      }`}
    >
      <div className="flex gap-4">
        <LazyThumbnail
          videoUrl={job.finalVideoUrl}
          status={job.status}
          kind="music"
          progress={isRendering ? progress : undefined}
        />

        <div className="flex-1 min-w-0">
          {/* Title + badge row */}
          <div className="flex items-start gap-2 flex-wrap mb-1.5">
            <h3 className="font-semibold text-white text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">
              {job.title}
            </h3>
            <StatusBadge status={job.status} />
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/40 mb-2">
            <span className="inline-flex items-center gap-1">
              <Music className="h-3 w-3" /> Music Video
            </span>
            {job.genre && <span>{job.genre}</span>}
            {job.mood && (
              <>
                <span className="text-white/20">·</span>
                <span>{job.mood}</span>
              </>
            )}
            {job.audioDuration && (
              <>
                <span className="text-white/20">·</span>
                <span>{formatDuration(job.audioDuration)}</span>
              </>
            )}
            <span className="text-white/20">·</span>
            <span>{job.completedScenes}/{job.totalScenes} scenes</span>
            <span className="text-white/20">·</span>
            <span>{new Date(job.createdAt).toLocaleDateString()}</span>
          </div>

          {/* Render progress bar */}
          {isRendering && job.totalScenes > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-[11px] text-amber-300/70 mb-1">
                <span>Rendering your video...</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {job.totalScenes > 0 && (
                <p className="text-[10px] text-white/30 mt-1">
                  Est. {Math.max(1, Math.ceil((job.totalScenes - job.completedScenes) * 0.5))} min remaining
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <PrimaryCTA
              status={job.status}
              onContinue={onContinue}
              onWatch={onWatch}
              onRender={onContinue}
              onViewProgress={onContinue}
              onRetry={onContinue}
            />

            {job.status === "completed" && job.finalVideoUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDownloadVideo}
                className="gap-1.5 border-white/15 text-white/70 hover:bg-white/8 hover:text-white text-xs"
              >
                <Download className="h-3 w-3" />
                Download
              </Button>
            )}

            {job.audioUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDownloadAudio}
                className="gap-1.5 border-white/15 text-white/70 hover:bg-white/8 hover:text-white text-xs"
              >
                <Music className="h-3 w-3" />
                Audio
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="gap-1 text-red-400/60 hover:text-red-300 hover:bg-red-500/10 ml-auto text-xs"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Generated Video Card ─────────────────────────────────────────────────── */
function GeneratedVideoCard({
  project,
  onPreview,
  onDownload,
  onDelete,
}: {
  project: Project;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const isRendering = project.status === "pending" || project.status === "processing";
  const Icon = TOOL_ICONS[project.toolType] || Film;

  return (
    <div
      className={`group rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-lg ${
        isRendering
          ? "border-amber-500/25 bg-amber-500/5 hover:border-amber-500/40"
          : project.status === "completed"
          ? "border-emerald-500/15 bg-white/[0.03] hover:border-emerald-500/30"
          : project.status === "failed"
          ? "border-red-500/15 bg-white/[0.03] hover:border-red-500/30"
          : "border-white/10 bg-white/[0.03] hover:border-white/20"
      }`}
    >
      <div className="flex gap-4">
        <LazyThumbnail
          videoUrl={project.outputUrl}
          status={project.status}
          kind="generated"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap mb-1.5">
            <h3 className="font-semibold text-white text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">
              {project.title}
            </h3>
            <StatusBadge status={project.status} />
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/40 mb-2">
            <span className="inline-flex items-center gap-1">
              <Icon className="h-3 w-3" />
              {TOOL_LABELS[project.toolType] ?? project.toolType}
            </span>
            <span className="text-white/20">·</span>
            <span>{project.creditCost} credits</span>
            <span className="text-white/20">·</span>
            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>

          {project.description && (
            <p className="text-[11px] text-white/30 line-clamp-1 italic mb-2">"{project.description}"</p>
          )}

          {isRendering && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-[11px] text-amber-300/70 mb-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Rendering your video...</span>
              </div>
              <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse w-2/3" />
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <PrimaryCTA
              status={project.status}
              onContinue={() => window.location.href = "/music-video/create"}
              onWatch={onPreview}
              onRender={() => {}}
              onViewProgress={() => {}}
              onRetry={() => window.location.href = "/music-video/create"}
            />

            {project.status === "completed" && project.outputUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDownload}
                className="gap-1.5 border-white/15 text-white/70 hover:bg-white/8 hover:text-white text-xs"
              >
                <Download className="h-3 w-3" />
                Download
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="gap-1 text-red-400/60 hover:text-red-300 hover:bg-red-500/10 ml-auto text-xs"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section Header ───────────────────────────────────────────────────────── */
function SectionHeader({ title, count, icon: Icon, color }: { title: string; count: number; icon: typeof Film; color: string }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2.5 mb-4 mt-8 first:mt-0">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <h3 className="text-sm font-semibold text-white/80 tracking-wide uppercase">{title}</h3>
      <span className="text-xs text-white/30 font-mono">{count}</span>
      <div className="flex-1 h-px bg-white/6" />
    </div>
  );
}

/* ── Continue Banner ──────────────────────────────────────────────────────── */
function ContinueBanner() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: musicSave } = trpc.engine.getAutoSave.useQuery(
    { toolType: "music_video" },
    { enabled: isAuthenticated }
  );
  const { data: textSave } = trpc.engine.getAutoSave.useQuery(
    { toolType: "text_to_video" },
    { enabled: isAuthenticated }
  );
  const { data: kidsSave } = trpc.engine.getAutoSave.useQuery(
    { toolType: "kids_video" },
    { enabled: isAuthenticated }
  );

  const saves = [
    musicSave && { ...musicSave, route: "/music-video/create", label: "Music Video" },
    textSave && { ...textSave, route: "/text-to-video", label: "Text to Video" },
    kidsSave && { ...kidsSave, route: "/kids-video", label: "Kids Animation" },
  ].filter(Boolean) as Array<{
    toolType: string;
    title: string | null;
    updatedAt: Date;
    route: string;
    label: string;
  }>;

  if (saves.length === 0) return null;

  // Show the most recently updated save
  const latest = saves.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const timeAgo = getTimeAgo(new Date(latest.updatedAt));

  return (
    <div className="rounded-2xl border border-purple-500/25 bg-gradient-to-r from-purple-500/8 via-fuchsia-500/5 to-transparent p-4 sm:p-5 mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">
            Continue your last project
          </p>
          <p className="text-white/40 text-xs mt-0.5">
            {latest.title || latest.label} · saved {timeAgo}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setLocation(latest.route)}
          className="gap-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white border-0 shadow-lg shadow-purple-500/20"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          Continue
        </Button>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */
export default function Projects() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterTab>("all");

  // Preview modal state
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [previewMusicJob, setPreviewMusicJob] = useState<MusicVideoJob | null>(null);
  // Delete confirmation state
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [deleteMusicJobId, setDeleteMusicJobId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } =
    trpc.billing.getProjects.useQuery(
      { limit: 100 },
      { enabled: isAuthenticated, refetchInterval: 15000 }
    );

  const { data: creditData } = trpc.billing.getCredits.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: musicJobs, isLoading: musicLoading, refetch: refetchMusic } =
    trpc.musicVideo.listJobs.useQuery(undefined, {
      enabled: isAuthenticated,
      refetchInterval: 10000,
    });

  const deleteProjectMutation = trpc.billing.deleteProject.useMutation({
    onSuccess: () => {
      toast.success("Project deleted.");
      utils.billing.getProjects.invalidate();
      setDeleteProjectId(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete project.");
      setDeleteProjectId(null);
    },
  });

  const deleteMusicJobMutation = trpc.musicVideo.deleteJob.useMutation({
    onSuccess: () => {
      toast.success("Music video project deleted.");
      utils.musicVideo.listJobs.invalidate();
      setDeleteMusicJobId(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete project.");
      setDeleteMusicJobId(null);
    },
  });

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  // ── Unified + sorted projects ──────────────────────────────────────────────
  const { activeProjects, completedProjects, olderProjects, counts } = useMemo(() => {
    const unified: UnifiedProject[] = [];

    if (musicJobs) {
      for (const job of musicJobs) {
        unified.push({
          kind: "music",
          id: job.id,
          title: job.title,
          status: job.status,
          createdAt: job.createdAt,
          raw: job,
        });
      }
    }

    if (projects) {
      for (const p of projects) {
        unified.push({
          kind: "generated",
          id: p.id,
          title: p.title,
          status: p.status,
          createdAt: p.createdAt,
          raw: p,
        });
      }
    }

    // Sort by created date descending
    unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply filter
    let filtered = unified;
    if (filter === "active") {
      filtered = unified.filter((p) => getProjectPhase(p.status) === "active");
    } else if (filter === "completed") {
      filtered = unified.filter((p) => getProjectPhase(p.status) === "completed");
    } else if (filter === "drafts") {
      filtered = unified.filter((p) => getProjectPhase(p.status) === "draft");
    }

    // Section into groups
    const active: UnifiedProject[] = [];
    const completed: UnifiedProject[] = [];
    const older: UnifiedProject[] = [];

    for (const p of filtered) {
      if (isOlderThan30Days(p.createdAt) && getProjectPhase(p.status) === "completed") {
        older.push(p);
      } else {
        const section = getSection(p.status);
        if (section === "active") active.push(p);
        else if (section === "completed") completed.push(p);
        else older.push(p);
      }
    }

    // Count for filter badges
    const allActive = unified.filter((p) => getProjectPhase(p.status) === "active").length;
    const allCompleted = unified.filter((p) => getProjectPhase(p.status) === "completed").length;
    const allDrafts = unified.filter((p) => getProjectPhase(p.status) === "draft").length;

    return {
      activeProjects: active,
      completedProjects: completed,
      olderProjects: older,
      counts: { all: unified.length, active: allActive, completed: allCompleted, drafts: allDrafts },
    };
  }, [musicJobs, projects, filter]);

  const isLoading = projectsLoading || musicLoading;
  const totalProjects = counts.all;
  const renderingCount =
    (musicJobs?.filter((j) => j.status === "rendering" || j.status === "assembling").length ?? 0) +
    (projects?.filter((p) => p.status === "pending" || p.status === "processing").length ?? 0);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDownload = useCallback((project: Project) => {
    if (!project.outputUrl) {
      toast.error("Video URL not available yet.");
      return;
    }
    const a = document.createElement("a");
    a.href = project.outputUrl;
    a.download = `${project.title.replace(/[^a-z0-9]/gi, "_")}.mp4`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Download started!");
  }, []);

  const handleMusicDownloadVideo = useCallback((job: MusicVideoJob) => {
    if (!job.finalVideoUrl) {
      toast.error("Video is not ready yet.");
      return;
    }
    const a = document.createElement("a");
    a.href = job.finalVideoUrl;
    a.download = `${job.title.replace(/[^a-z0-9]/gi, "_")}_video.mp4`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Video download started!");
  }, []);

  const handleMusicDownloadAudio = useCallback((job: MusicVideoJob) => {
    if (!job.audioUrl) {
      toast.error("Audio not available.");
      return;
    }
    const a = document.createElement("a");
    a.href = job.audioUrl;
    a.download = `${job.title.replace(/[^a-z0-9]/gi, "_")}_audio.mp3`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Audio download started!");
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All Projects", count: counts.all },
    { key: "active", label: "In Progress", count: counts.active },
    { key: "completed", label: "Completed", count: counts.completed },
    { key: "drafts", label: "Drafts", count: counts.drafts },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/8 sticky top-0 z-10 bg-background/95 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4 max-w-5xl mx-auto">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </a>

          <div className="flex items-center gap-2.5">
            <FolderOpen className="h-5 w-5 text-purple-400" />
            <h1 className="text-lg font-bold text-white">My Projects</h1>
            {renderingCount > 0 && (
              <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[10px] gap-1">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                {renderingCount} rendering
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { refetchProjects(); refetchMusic(); }}
              className="text-white/40 hover:text-white h-8 w-8 p-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <CreditBalance variant="badge" />
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="container py-6 sm:py-8 px-4 max-w-5xl mx-auto">
        {/* Continue banner */}
        <ContinueBanner />

        {/* Credit summary */}
        {creditData && (
          <div className="flex items-center gap-3 mb-6 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <Zap className="h-4 w-4 text-yellow-400 flex-shrink-0" />
            <span className="text-sm text-white/70">
              <span className="font-bold text-yellow-300">{creditData.balance.toLocaleString()}</span> credits remaining
            </span>
            <a
              href="/credits"
              className="ml-auto text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
            >
              Top up →
            </a>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
          <Filter className="h-3.5 w-3.5 text-white/30 mr-1 flex-shrink-0" />
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filter === tab.key
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "text-white/40 hover:text-white/60 hover:bg-white/5 border border-transparent"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none font-mono ${
                    filter === tab.key ? "bg-purple-500/30 text-purple-200" : "bg-white/8 text-white/30"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}

          {/* New project CTA */}
          <a
            href="/music-video/create"
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500 transition-all whitespace-nowrap shadow-lg shadow-purple-500/15"
          >
            <Plus className="h-3 w-3" />
            New Project
          </a>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
            <p className="text-white/40 text-sm">Loading your projects…</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && totalProjects === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.15))",
                border: "1px solid rgba(168,85,247,0.25)",
              }}
            >
              <Film className="h-9 w-9 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl mb-2">Create your first video</h3>
              <p className="text-white/40 text-sm max-w-sm mx-auto leading-relaxed">
                Start with a music video, text-to-video, or kids animation. Storyboard generation is always free.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              <a
                href="/music-video/create"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-purple-500/20"
              >
                <Music className="h-4 w-4" />
                Music Video
              </a>
              <a
                href="/text-to-video"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 px-5 py-2.5 text-sm font-medium transition-all"
              >
                <Video className="h-4 w-4" />
                Text to Video
              </a>
              <a
                href="/kids-video"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 px-5 py-2.5 text-sm font-medium transition-all"
              >
                <Sparkles className="h-4 w-4" />
                Kids Animation
              </a>
            </div>
          </div>
        )}

        {/* Projects list */}
        {!isLoading && totalProjects > 0 && (
          <>
            {/* Active Projects */}
            <SectionHeader
              title="Active Projects"
              count={activeProjects.length}
              icon={Zap}
              color="bg-amber-500/20 text-amber-400"
            />
            <div className="space-y-3">
              {activeProjects.map((p) =>
                p.kind === "music" ? (
                  <MusicVideoCard
                    key={`m-${p.id}`}
                    job={p.raw as MusicVideoJob}
                    onContinue={() => setLocation(`/music-video/create?jobId=${p.id}`)}
                    onWatch={() => setPreviewMusicJob(p.raw as MusicVideoJob)}
                    onDownloadVideo={() => handleMusicDownloadVideo(p.raw as MusicVideoJob)}
                    onDownloadAudio={() => handleMusicDownloadAudio(p.raw as MusicVideoJob)}
                    onDelete={() => setDeleteMusicJobId(p.id)}
                  />
                ) : (
                  <GeneratedVideoCard
                    key={`g-${p.id}`}
                    project={p.raw as Project}
                    onPreview={() => setPreviewProject(p.raw as Project)}
                    onDownload={() => handleDownload(p.raw as Project)}
                    onDelete={() => setDeleteProjectId(p.id)}
                  />
                )
              )}
            </div>

            {/* Completed Projects */}
            <SectionHeader
              title="Completed"
              count={completedProjects.length}
              icon={CheckCircle}
              color="bg-emerald-500/20 text-emerald-400"
            />
            <div className="space-y-3">
              {completedProjects.map((p) =>
                p.kind === "music" ? (
                  <MusicVideoCard
                    key={`m-${p.id}`}
                    job={p.raw as MusicVideoJob}
                    onContinue={() => setLocation(`/music-video/create?jobId=${p.id}`)}
                    onWatch={() => setPreviewMusicJob(p.raw as MusicVideoJob)}
                    onDownloadVideo={() => handleMusicDownloadVideo(p.raw as MusicVideoJob)}
                    onDownloadAudio={() => handleMusicDownloadAudio(p.raw as MusicVideoJob)}
                    onDelete={() => setDeleteMusicJobId(p.id)}
                  />
                ) : (
                  <GeneratedVideoCard
                    key={`g-${p.id}`}
                    project={p.raw as Project}
                    onPreview={() => setPreviewProject(p.raw as Project)}
                    onDownload={() => handleDownload(p.raw as Project)}
                    onDelete={() => setDeleteProjectId(p.id)}
                  />
                )
              )}
            </div>

            {/* Older Projects */}
            {olderProjects.length > 0 && (
              <>
                <SectionHeader
                  title="Older Projects"
                  count={olderProjects.length}
                  icon={Clock}
                  color="bg-zinc-500/20 text-zinc-400"
                />
                <div className="space-y-3">
                  {olderProjects.map((p) =>
                    p.kind === "music" ? (
                      <MusicVideoCard
                        key={`m-${p.id}`}
                        job={p.raw as MusicVideoJob}
                        onContinue={() => setLocation(`/music-video/create?jobId=${p.id}`)}
                        onWatch={() => setPreviewMusicJob(p.raw as MusicVideoJob)}
                        onDownloadVideo={() => handleMusicDownloadVideo(p.raw as MusicVideoJob)}
                        onDownloadAudio={() => handleMusicDownloadAudio(p.raw as MusicVideoJob)}
                        onDelete={() => setDeleteMusicJobId(p.id)}
                      />
                    ) : (
                      <GeneratedVideoCard
                        key={`g-${p.id}`}
                        project={p.raw as Project}
                        onPreview={() => setPreviewProject(p.raw as Project)}
                        onDownload={() => handleDownload(p.raw as Project)}
                        onDelete={() => setDeleteProjectId(p.id)}
                      />
                    )
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Preview Modal (Generated) ───────────────────────────────────────── */}
      <Dialog open={!!previewProject} onOpenChange={(open) => !open && setPreviewProject(null)}>
        <DialogContent className="max-w-3xl w-full bg-zinc-900 border-white/10 p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-white text-lg">{previewProject?.title}</DialogTitle>
            <DialogDescription className="text-white/40 text-sm">
              {TOOL_LABELS[previewProject?.toolType ?? ""] ?? previewProject?.toolType} ·{" "}
              {previewProject?.creditCost} credits ·{" "}
              {previewProject?.createdAt ? new Date(previewProject.createdAt).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>
          {previewProject?.outputUrl && (
            <div className="bg-black aspect-video w-full">
              <video
                src={previewProject.outputUrl}
                controls
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="flex gap-3 px-5 py-4">
            <Button
              onClick={() => previewProject && handleDownload(previewProject)}
              className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 flex-1"
            >
              <Download className="h-4 w-4" />
              Download Video
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreviewProject(null)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Preview Modal (Music Video) ─────────────────────────────────────── */}
      <Dialog open={!!previewMusicJob} onOpenChange={(open) => !open && setPreviewMusicJob(null)}>
        <DialogContent className="max-w-3xl w-full bg-zinc-900 border-white/10 p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-white text-lg">{previewMusicJob?.title}</DialogTitle>
            <DialogDescription className="text-white/40 text-sm">
              Music Video · {previewMusicJob?.genre} · {previewMusicJob?.totalScenes} scenes ·{" "}
              {previewMusicJob?.createdAt ? new Date(previewMusicJob.createdAt).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>
          {previewMusicJob?.finalVideoUrl && (
            <div className="bg-black aspect-video w-full">
              <video
                src={previewMusicJob.finalVideoUrl}
                controls
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="flex gap-3 px-5 py-4">
            {previewMusicJob?.finalVideoUrl && (
              <Button
                onClick={() => previewMusicJob && handleMusicDownloadVideo(previewMusicJob)}
                className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 flex-1"
              >
                <Download className="h-4 w-4" />
                Download Video
              </Button>
            )}
            {previewMusicJob?.audioUrl && (
              <Button
                variant="outline"
                onClick={() => previewMusicJob && handleMusicDownloadAudio(previewMusicJob)}
                className="gap-2 border-white/20 text-white hover:bg-white/10"
              >
                <Music className="h-4 w-4" />
                Audio
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setPreviewMusicJob(null)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Generated Project ────────────────────────────────────────── */}
      <AlertDialog open={deleteProjectId !== null} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this project?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This will permanently delete the project and its video. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10 bg-transparent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProjectId !== null && deleteProjectMutation.mutate({ projectId: deleteProjectId })}
              disabled={deleteProjectMutation.isPending}
              className="bg-red-600 hover:bg-red-500 text-white border-0"
            >
              {deleteProjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Music Video ──────────────────────────────────────────────── */}
      <AlertDialog open={deleteMusicJobId !== null} onOpenChange={(open) => !open && setDeleteMusicJobId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this music video?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              This will permanently delete the project, all scenes, and any generated video. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10 bg-transparent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMusicJobId !== null && deleteMusicJobMutation.mutate({ jobId: deleteMusicJobId })}
              disabled={deleteMusicJobMutation.isPending}
              className="bg-red-600 hover:bg-red-500 text-white border-0"
            >
              {deleteMusicJobMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
