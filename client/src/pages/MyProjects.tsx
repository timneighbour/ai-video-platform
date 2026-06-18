import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
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
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Plus,
  Sparkles,
  BookmarkCheck,
  Share2,
  Pause,
  Play,
} from "@/lib/icons";

type JobStatus = "draft" | "storyboard_ready" | "rendering" | "assembling" | "completed" | "failed" | "paused" | "cancelled";

function StatusBadge({ status }: { status: JobStatus }) {
  const config: Record<JobStatus, { label: string; className: string; icon: React.ReactNode }> = {
    draft:            { label: "Draft",            className: "bg-zinc-800 text-zinc-400 border-zinc-700",          icon: <Edit3 className="w-3 h-3" /> },
    storyboard_ready: { label: "Storyboard Ready", className: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30", icon: <BookmarkCheck className="w-3 h-3" /> },
    rendering:        { label: "Building Your Video", className: "bg-blue-500/15 text-[--color-gold] border-[--color-gold]/30", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    assembling:       { label: "Assembling",       className: "bg-blue-500/15 text-[--color-gold] border-[--color-gold]/30", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    completed:        { label: "Complete",         className: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/30", icon: <CheckCircle2 className="w-3 h-3" /> },
    failed:           { label: "Failed",           className: "bg-red-500/15 text-red-300 border-red-500/30",       icon: <AlertCircle className="w-3 h-3" /> },
    paused:           { label: "Paused — Action Required", className: "bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse", icon: <Pause className="w-3 h-3" /> },
    cancelled:        { label: "Cancelled",        className: "bg-zinc-800 text-zinc-500 border-zinc-700",          icon: <AlertCircle className="w-3 h-3" /> },
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

function ProjectCard({
  job,
  onDelete,
  onPause,
  onResume,
}: {
  job: any;
  onDelete: (id: number) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
}) {
  const thumbnailUrl = job.thumbnailUrl ?? null;
  const isActive = job.status === "rendering" || job.status === "assembling";
  const isPaused = job.status === "paused";
  const pct = (isActive || isPaused) && job.totalScenes > 0
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
    <div className={`flex flex-col rounded-xl border transition-all overflow-hidden group ${
      isPaused
        ? "bg-[#1a1200] border-amber-500/30 hover:border-amber-400/50"
        : "bg-[#141414] border-white/8 hover:border-white/14"
    }`}>
      {/* Paused banner */}
      {isPaused && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-start gap-2">
          <Pause className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-300 text-xs font-semibold">Rendering Paused — Your Decision Required</p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              {job.completedScenes}/{job.totalScenes} scenes completed ({pct}%). Resume to continue spending credits, or delete this project.
            </p>
          </div>
        </div>
      )}

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
        {/* Progress overlay for active/paused */}
        {(isActive || isPaused) && pct !== null && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <div className="flex justify-between text-xs text-white/70 mb-1.5">
              <span>{job.completedScenes}/{job.totalScenes} scenes</span>
              <span className={`font-semibold ${isPaused ? "text-amber-400" : "text-[--color-gold]"}`}>{pct}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${isPaused ? "bg-amber-500/60" : "bg-gradient-to-r from-blue-500 to-[#4a3010]"}`}
                style={{ width: `${pct}%` }}
              />
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
          {isPaused ? (
            /* Paused job — show Resume and Delete prominently */
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs h-8"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Resume Render
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1a1a1a] border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Resume rendering?</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/50">
                      This will resume rendering <strong className="text-white">{job.title}</strong>. The remaining {job.totalScenes - job.completedScenes} scene(s) will be dispatched and provider credits will be charged.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/15 bg-transparent text-white/60">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-green-600 hover:bg-green-500 text-white"
                      onClick={() => onResume(job.id)}
                    >
                      Yes, Resume
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-red-500/40 text-red-400 bg-transparent hover:bg-red-500/10 text-xs h-8"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete Project
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
            </>
          ) : job.status === "completed" && job.finalVideoUrl ? (
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
            <>
              <Button
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs h-8"
                onClick={() => window.location.href = `/music-video/create?jobId=${job.id}`}
              >
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                View Progress
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-amber-400/60 hover:text-amber-300 hover:bg-amber-500/10 h-8 px-2">
                    <Pause className="w-3 h-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1a1a1a] border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Pause rendering?</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/50">
                      Scenes currently generating will finish, but no new scenes will be dispatched until you resume. You can resume or delete the project at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/15 bg-transparent text-white/60">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-amber-600 hover:bg-amber-500 text-white"
                      onClick={() => onPause(job.id)}
                    >
                      Pause
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <Button
              size="sm"
              className="flex-1 bg-[--color-gold] hover:bg-[--color-gold]/80 text-white text-xs h-8"
              onClick={() => window.location.href = `/music-video/create?jobId=${job.id}`}
            >
              <Edit3 className="w-3 h-3 mr-1" />
              {job.status === "storyboard_ready" ? "Continue" : "Open"}
            </Button>
          )}

          {/* Delete (for non-paused jobs) */}
          {!isPaused && (
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
          )}
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
    onError: (err) => toast.error(`Delete failed: ${err.message}`),
  });

  const pauseMutation = trpc.musicVideo.pauseRender.useMutation({
    onSuccess: () => {
      utils.musicVideo.listJobs.invalidate();
      toast.success("Render paused. Resume or delete when you're ready.");
    },
    onError: (err) => toast.error(`Pause failed: ${err.message}`),
  });

  const resumeMutation = trpc.musicVideo.resumeRender.useMutation({
    onSuccess: () => {
      utils.musicVideo.listJobs.invalidate();
      toast.success("Render resumed — scenes will start dispatching shortly.");
    },
    onError: (err) => toast.error(`Resume failed: ${err.message}`),
  });

  // Segment jobs into buckets
  const paused     = jobs?.filter(j => j.status === "paused") ?? [];
  const rendering  = jobs?.filter(j => j.status === "rendering" || j.status === "assembling") ?? [];
  const drafts     = jobs?.filter(j => j.status === "draft" || j.status === "storyboard_ready") ?? [];
  const completed  = jobs?.filter(j => j.status === "completed" || j.status === "failed") ?? [];

  const cardProps = (job: any) => ({
    job,
    onDelete: (id: number) => deleteMutation.mutate({ jobId: id }),
    onPause:  (id: number) => pauseMutation.mutate({ jobId: id }),
    onResume: (id: number) => resumeMutation.mutate({ jobId: id }),
  });

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-white">My Projects</h1>
            <p className="text-white/40 text-sm mt-1">
              {jobs ? `${jobs.length} project${jobs.length !== 1 ? "s" : ""}` : "Loading your projects..."}
            </p>
          </div>
          <a
            href="/music-video"
            className="inline-flex items-center gap-2 bg-[--color-gold] hover:bg-[--color-gold]/80 text-white text-sm px-4 py-2 rounded-xl font-semibold transition-colors"
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
              className="inline-flex items-center gap-2 bg-[--color-gold] hover:bg-[--color-gold]/80 text-white text-sm px-5 py-2.5 rounded-xl font-semibold transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Create Your First Video
            </a>
          </div>
        )}

        {/* Segmented sections */}
        {!isLoading && jobs && jobs.length > 0 && (
          <div className="space-y-12">

            {/* ── Paused — action required ── */}
            {paused.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Pause className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-amber-400">Paused — Action Required</h2>
                  <span className="text-xs text-white/25 font-mono">{paused.length}</span>
                  <div className="flex-1 h-px bg-amber-500/20" />
                </div>
                <p className="text-amber-400/60 text-xs mb-4">
                  These projects have been paused. Review each one and choose to <strong className="text-amber-300">Resume</strong> (continues spending credits) or <strong className="text-amber-300">Delete</strong> to remove permanently.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paused.map((job: any) => (
                    <ProjectCard key={job.id} {...cardProps(job)} />
                  ))}
                </div>
              </section>
            )}

            {/* Rendering */}
            {rendering.length > 0 && (
              <section>
                <SectionHeader title="Building Your Video" count={rendering.length} color="text-[--color-gold]" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {rendering.map((job: any) => (
                    <ProjectCard key={job.id} {...cardProps(job)} />
                  ))}
                </div>
              </section>
            )}

            {/* Drafts */}
            {drafts.length > 0 && (
              <section>
                <SectionHeader title="Drafts" count={drafts.length} color="text-[--color-gold]" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {drafts.map((job: any) => (
                    <ProjectCard key={job.id} {...cardProps(job)} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <section>
                <SectionHeader title="Completed" count={completed.length} color="text-[--color-silver]" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {completed.map((job: any) => (
                    <ProjectCard key={job.id} {...cardProps(job)} />
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
