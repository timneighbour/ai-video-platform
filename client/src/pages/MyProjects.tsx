import BackButton from "@/components/BackButton";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Download,
  Edit3,
  Trash2,
  Music,
  Video,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Plus,
  Sparkles,
  BookmarkCheck,
  Share2,
} from "lucide-react";

type JobStatus = "draft" | "storyboard_ready" | "rendering" | "assembling" | "completed" | "failed";

function StatusBadge({ status }: { status: JobStatus }) {
  const config: Record<JobStatus, { label: string; className: string; icon: React.ReactNode }> = {
    draft:            { label: "Draft",            className: "bg-zinc-800 text-zinc-400 border-zinc-700",          icon: <Edit3 className="w-3 h-3" /> },
    storyboard_ready: { label: "Storyboard Ready", className: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30", icon: <BookmarkCheck className="w-3 h-3" /> },
    rendering:        { label: "Building Your Video",        className: "bg-blue-500/15 text-[--color-gold] border-[--color-gold]/30",    icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    assembling:       { label: "Assembling",       className: "bg-blue-500/15 text-[--color-gold] border-[--color-gold]/30",    icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    completed:        { label: "Complete",         className: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/30", icon: <CheckCircle2 className="w-3 h-3" /> },
    failed:           { label: "Failed",           className: "bg-red-500/15 text-red-300 border-red-500/30",       icon: <AlertCircle className="w-3 h-3" /> },
  };
  const { label, className, icon } = config[status] ?? config.draft;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${className}`}>
      {icon}
      {label}
    </span>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(ts: Date | string | number): string {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ProjectCard({ job, onDelete }: { job: any; onDelete: (id: number) => void }) {
  const thumbnailUrl = job.thumbnailUrl ?? null;
  const isActive = job.status === "rendering" || job.status === "assembling";
  const pct = isActive && job.totalScenes > 0
    ? Math.round((job.completedScenes / job.totalScenes) * 100)
    : null;

  async function downloadFile(url: string, filename: string) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
      navigator.clipboard.writeText(url).catch(() => {});
      toast.info("Video opened in new tab — right-click to save. Link also copied to clipboard.");
    }
  }

  return (
    <div className="flex flex-col rounded-xl bg-[#141414] border border-white/8 hover:border-white/14 transition-all overflow-hidden group">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-black/40 overflow-hidden">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={job.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-10 h-10 text-white/10" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <StatusBadge status={job.status as JobStatus} />
        </div>
        {/* Active render overlay */}
        {isActive && pct !== null && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <div className="flex justify-between text-xs text-white/70 mb-1.5">
              <span>{job.completedScenes}/{job.totalScenes} scenes</span>
              <span className="font-semibold text-[--color-gold]">{pct}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-[#4a3010] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-white text-sm line-clamp-1 mb-1">{job.title}</h3>
        <div className="flex items-center gap-3 text-xs text-white/35 mb-3">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(job.createdAt)}</span>
          {job.audioDuration > 0 && (
            <span className="flex items-center gap-1"><Music className="w-3 h-3" />{formatDuration(job.audioDuration)}</span>
          )}
        </div>
        {job.genre && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/6 border border-white/10 text-white/45 w-fit mb-3">{job.genre}</span>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-white/6">
          {job.status === "completed" && job.finalVideoUrl ? (
            <>
              <Button
                size="sm"
                className="flex-1 bg-[--color-silver] hover:bg-[--color-silver]/15 text-white text-xs h-8"
                onClick={() => downloadFile(job.finalVideoUrl, `${job.title}-video.mp4`)}
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/15 text-white/60 bg-transparent hover:bg-white/5 text-xs h-8"
                onClick={() => {
                  navigator.clipboard.writeText(job.finalVideoUrl);
                  toast.success("Video link copied to clipboard");
                }}
              >
                <Share2 className="w-3 h-3 mr-1" />
                Share
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/15 text-white/60 bg-transparent hover:bg-white/5 text-xs h-8"
                onClick={() => window.location.href = `/music-video/create?jobId=${job.id}`}
              >
                <Edit3 className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </>
          ) : isActive ? (
            <Button
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs h-8"
              onClick={() => window.location.href = `/music-video/create?jobId=${job.id}`}
            >
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              View Progress
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 bg-[--color-gold] hover:bg-[--color-gold]/20 text-white text-xs h-8"
              onClick={() => window.location.href = `/music-video/create?jobId=${job.id}`}
            >
              <Edit3 className="w-3 h-3 mr-1" />
              {job.status === "storyboard_ready" ? "Continue" : "Open"}
            </Button>
          )}

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white/25 hover:text-red-400 hover:bg-red-500/10 h-8 px-2">
                <Trash2 className="w-3 h-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#1a1a1a] border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete project?</AlertDialogTitle>
                <AlertDialogDescription className="text-white/50">
                  This will permanently delete <strong className="text-white">{job.title}</strong> and all its scenes, characters, and generated content. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-white/15 bg-transparent text-white/60">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-500 text-white"
                  onClick={() => onDelete(job.id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className={`text-sm font-bold uppercase tracking-widest ${color}`}>{title}</h2>
      <span className="text-xs text-white/25 font-mono">{count}</span>
      <div className="flex-1 h-px bg-white/6" />
    </div>
  );
}

export default function MyProjects() {
  const utils = trpc.useUtils();
  const { data: jobs, isLoading } = trpc.musicVideo.listJobs.useQuery();

  const deleteMutation = trpc.musicVideo.deleteJob.useMutation({
    onSuccess: () => {
      utils.musicVideo.listJobs.invalidate();
      toast.success("Project deleted — permanently removed.");
    },
    onError: (err) => {
      toast.error(`Delete failed: ${err.message}`);
    },
  });

  // Segment jobs into three buckets
  const drafts     = jobs?.filter(j => j.status === "draft" || j.status === "storyboard_ready") ?? [];
  const rendering  = jobs?.filter(j => j.status === "rendering" || j.status === "assembling") ?? [];
  const completed  = jobs?.filter(j => j.status === "completed" || j.status === "failed") ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <BackButton fallback="/dashboard" label="Back to Dashboard" className="mb-4" />
        </div>
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-white">My Projects</h1>
            <p className="text-white/40 text-sm mt-1">
              {jobs ? `${jobs.length} project${jobs.length !== 1 ? "s" : ""}` : "Loading your projects..."}
            </p>
          </div>
          <a
            href="/music-video"
            className="inline-flex items-center gap-2 bg-[--color-gold] hover:bg-[--color-gold]/20 text-white text-sm px-4 py-2 rounded-xl font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </a>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-white/20" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && jobs?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Film className="w-16 h-16 text-white/10 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No projects yet</h2>
            <p className="text-white/40 mb-6 max-w-sm text-sm">
              Create your first AI music video to get started. Upload a song and let WIZ AI do the rest.
            </p>
            <a
              href="/music-video"
              className="inline-flex items-center gap-2 bg-[--color-gold] hover:bg-[--color-gold]/20 text-white text-sm px-5 py-2.5 rounded-xl font-semibold transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Create Your First Video
            </a>
          </div>
        )}

        {/* Segmented sections */}
        {!isLoading && jobs && jobs.length > 0 && (
          <div className="space-y-12">
            {/* Rendering */}
            {rendering.length > 0 && (
              <section>
                <SectionHeader title="Building Your Video" count={rendering.length} color="text-[--color-gold]" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {rendering.map(job => (
                    <ProjectCard key={job.id} job={job} onDelete={(id) => deleteMutation.mutate({ jobId: id })} />
                  ))}
                </div>
              </section>
            )}

            {/* Drafts */}
            {drafts.length > 0 && (
              <section>
                <SectionHeader title="Drafts" count={drafts.length} color="text-[--color-gold]" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {drafts.map(job => (
                    <ProjectCard key={job.id} job={job} onDelete={(id) => deleteMutation.mutate({ jobId: id })} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <section>
                <SectionHeader title="Completed" count={completed.length} color="text-[--color-silver]" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {completed.map(job => (
                    <ProjectCard key={job.id} job={job} onDelete={(id) => deleteMutation.mutate({ jobId: id })} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
