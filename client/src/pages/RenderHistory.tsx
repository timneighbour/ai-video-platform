import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Film,
  Download,
  RefreshCw,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Play,
  Sparkles,
  FileVideo,
  History,
  Trash2,
} from "@/lib/icons";
import { toast } from "sonner";
import { Link } from "wouter";
import BackButton from "@/components/BackButton";
import { WizBrandPostBadge } from "@/components/WizBrand";
import SubscriptionUpgradeNudge from "@/components/SubscriptionUpgradeNudge";
import PostRenderCinematicPackModal from "@/components/PostRenderCinematicPackModal";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

type JobStatus = "draft" | "storyboard_ready" | "rendering" | "assembling" | "completed" | "failed";

function StatusBadge({ status }: { status: JobStatus | string }) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-zinc-700 text-zinc-300 border-zinc-600" },
    storyboard_ready: { label: "Ready", className: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30" },
    rendering: { label: "Building Your Video", className: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30" },
    assembling: { label: "Assembling", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" },
    completed: { label: "Completed", className: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/20" },
    failed: { label: "Failed", className: "bg-red-500/20 text-red-300 border-red-500/40" },
  };
  const cfg = map[status] ?? { label: status, className: "bg-zinc-700 text-zinc-300 border-zinc-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function SceneStatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="w-3.5 h-3.5 text-[--color-silver] shrink-0" />;
  if (status === "failed") return <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
  if (status === "generating") return <Loader2 className="w-3.5 h-3.5 text-[--color-gold] animate-spin shrink-0" />;
  return <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RenderHistory() {
  const { isAuthenticated } = useAuth();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<number | null>(null);
  const [confirmRetryJob, setConfirmRetryJob] = useState<{ id: number; title: string; failedCount: number } | null>(null);
  const [cinematicPackJob, setCinematicPackJob] = useState<{ id: number; videoUrl: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ jobId: number; title: string } | null>(null);

  const jobsQuery = trpc.musicVideo.listJobs.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: (query) => {
      // Poll every 15s if any job is actively rendering
      const data = query.state.data as any[] | undefined;
      if (!data) return false;
      const hasActive = data.some((j) => j.status === "rendering" || j.status === "assembling");
      return hasActive ? 15000 : false;
    },
  });

  const detailsQuery = trpc.musicVideo.getJobDetails.useQuery(
    { jobId: selectedJobId! },
    { enabled: selectedJobId !== null }
  );

  const retryAllMutation = trpc.musicVideo.retryAllFailedScenes.useMutation();
  const utils = trpc.useUtils();
  const deleteJobMutation = trpc.musicVideo.deleteJob.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      utils.musicVideo.listJobs.invalidate();
    },
    onError: (err: any) => toast.error("Delete failed", { description: err.message }),
  });
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <History className="w-12 h-12 text-zinc-600 mx-auto" />
          <p className="text-zinc-400">Sign in to view your render history</p>
          <Button asChild>
            <a href={getLoginUrl()}>Sign in</a>
          </Button>
        </div>
      </div>
    );
  }

  const jobs = jobsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Page header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-2">
          <BackButton fallback="/projects" label="Back to Projects" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[--color-gold]/15 flex items-center justify-center">
                <History className="w-4 h-4 text-[--color-gold]" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-foreground">Render History</h1>
                <p className="text-xs text-muted-foreground">{jobs.length} video{jobs.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-[--color-gold] hover:bg-[--color-gold]/20 text-white">
              <Link href="/music-video/create"><Sparkles className="w-3.5 h-3.5 mr-1.5" />New Video</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Subscription upgrade nudge */}
        <div className="mb-4">
          <SubscriptionUpgradeNudge />
        </div>
        {/* Loading */}
        {jobsQuery.isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[--color-gold] animate-spin" />
          </div>
        )}

        {/* Error */}
        {jobsQuery.isError && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-zinc-400 text-sm">Failed to load render history</p>
            <Button size="sm" variant="outline" onClick={() => jobsQuery.refetch()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Retry
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!jobsQuery.isLoading && !jobsQuery.isError && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
              <FileVideo className="w-8 h-8 text-zinc-600" />
            </div>
            <div className="text-center">
              <p className="text-zinc-300 font-medium mb-1">No videos yet</p>
              <p className="text-zinc-500 text-sm">Create your first AI music video to see it here</p>
            </div>
            <Button asChild className="bg-[--color-gold] hover:bg-[--color-gold]/20 text-white">
              <Link href="/music-video/create"><Sparkles className="w-3.5 h-3.5 mr-1.5" />Create your first video</Link>
            </Button>
          </div>
        )}

        {/* Job list */}
        {jobs.length > 0 && (
          <div className="space-y-3">
            {jobs.map((job: any) => {
              const progressPct = job.totalScenes > 0
                ? Math.round((job.completedScenes / job.totalScenes) * 100)
                : 0;
              const isActive = job.status === "rendering" || job.status === "assembling";
              const hasFailures = job.failedScenes > 0;

              return (
                <div
                  key={job.id}
                  className="bg-card border border-border rounded-xl overflow-hidden hover:border-[--color-gold]/30 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Thumbnail / video preview */}
                      <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden relative group cursor-pointer"
                        onClick={() => job.status === "completed" && job.finalVideoUrl && setSelectedJobId(job.id)}>
                        {job.status === "completed" && job.finalVideoUrl ? (
                          <>
                            <video
                              src={job.finalVideoUrl}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover"
                              onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                              onMouseLeave={(e) => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <Play className="w-5 h-5 text-white fill-white" />
                            </div>
                          </>
                        ) : job.thumbnailUrl ? (
                          <img src={job.thumbnailUrl} alt={job.title || `Video #${job.id}`} className="w-full h-full object-cover" />
                        ) : (
                          <Film className="w-5 h-5 text-zinc-600" />
                        )}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {job.title || `Video #${job.id}`}
                          </p>
                          <StatusBadge status={job.status} />
                          {job.status === "completed" && (
                            <WizBrandPostBadge layer="render" />
                          )}
                          {hasFailures && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              <AlertCircle className="w-3 h-3" />{job.failedScenes} failed
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{formatDate(job.createdAt)}
                          </span>
                          {job.audioDuration && (
                            <span className="flex items-center gap-1">
                              <Play className="w-3 h-3" />{formatDuration(job.audioDuration)}
                            </span>
                          )}
                          {job.totalScenes > 0 && (
                            <span>{job.completedScenes}/{job.totalScenes} scenes</span>
                          )}
                        </div>

                        {/* Progress bar for active / partial renders */}
                        {(isActive || (job.totalScenes > 0 && job.status !== "draft" && job.status !== "storyboard_ready")) && (
                          <div className="space-y-1">
                            <Progress value={progressPct} className="h-1.5 bg-zinc-800" />
                            <p className="text-xs text-muted-foreground">{progressPct}% complete</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {/* View details */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-800"
                          onClick={() => setSelectedJobId(job.id)}
                        >
                          <ChevronRight className="w-3.5 h-3.5 mr-1" />Details
                        </Button>

                        {/* Download if completed — opens Cinematic Pack upsell first */}
                        {job.status === "completed" && job.finalVideoUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs border-[--color-gold]/40 text-[--color-gold] bg-transparent hover:bg-[--color-gold]/10"
                            onClick={() => setCinematicPackJob({ id: job.id, videoUrl: job.finalVideoUrl! })}
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />Download
                          </Button>
                        )}

                        {/* Resume in WizScript */}
                        {(job.status === "draft" || job.status === "storyboard_ready" || job.status === "rendering") && (
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-[--color-gold] hover:bg-[--color-gold]/20 text-white"
                            asChild
                          >
                            <Link href={`/music-video/create?jobId=${job.id}`}>
                              <Play className="w-3 h-3 mr-1" />Resume
                            </Link>
                          </Button>
                        )}

                        {/* Retry all failed — opens confirmation dialog */}
                        {hasFailures && job.status !== "rendering" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs border-red-500/40 text-red-400 bg-transparent hover:bg-red-500/10"
                            disabled={retryingJobId === job.id}
                            onClick={() =>
                              setConfirmRetryJob({
                                id: job.id,
                                title: job.title || `Job #${job.id}`,
                                failedCount: job.failedScenes,
                              })
                            }
                          >
                            {retryingJobId === job.id
                              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Retrying</>
                              : <><RefreshCw className="w-3 h-3 mr-1" />Retry Failed</>}
                          </Button>
                        )}
                        {/* Delete project */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs border-zinc-700 text-zinc-500 bg-transparent hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400"
                          disabled={deletingJobId === job.id}
                          onClick={() => setDeleteTarget({ jobId: job.id, title: job.title })}
                        >
                          {deletingJobId === job.id
                            ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Deleting</>
                            : <><Trash2 className="w-3 h-3 mr-1" />Delete</>}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scene details drawer */}
      <Dialog open={selectedJobId !== null} onOpenChange={(open) => { if (!open) setSelectedJobId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Film className="w-4 h-4 text-[--color-gold]" />
              {detailsQuery.data?.job?.title || `Video #${selectedJobId}`}
              {detailsQuery.data?.job?.status && (
                <StatusBadge status={detailsQuery.data.job.status} />
              )}
            </DialogTitle>
          </DialogHeader>

          {detailsQuery.isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-[--color-gold] animate-spin" />
            </div>
          )}

          {detailsQuery.data && (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Scenes", value: detailsQuery.data.totalScenes, color: "text-foreground" },
                  { label: "Completed", value: detailsQuery.data.completedScenes, color: "text-[--color-silver]" },
                  { label: "Failed", value: detailsQuery.data.failedScenes, color: detailsQuery.data.failedScenes > 0 ? "text-red-400" : "text-muted-foreground" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-zinc-800/60 rounded-lg p-3 text-center">
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Job metadata */}
              <div className="bg-zinc-800/40 rounded-lg p-3 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span className="text-foreground">{formatDate(detailsQuery.data.job.createdAt)}</span>
                </div>
                {detailsQuery.data.job.audioDuration && (
                  <div className="flex justify-between">
                    <span>Audio Duration</span>
                    <span className="text-foreground">{formatDuration(detailsQuery.data.job.audioDuration)}</span>
                  </div>
                )}
                {detailsQuery.data.job.finalVideoUrl && (
                  <div className="flex justify-between items-center">
                    <span>Final Video</span>
                    <a
                      href={detailsQuery.data.job.finalVideoUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[--color-gold] hover:text-[--color-gold]/80"
                    >
                      <Download className="w-3 h-3" />Download
                    </a>
                  </div>
                )}
              </div>

              {/* Scene-by-scene log */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Scene Log</p>
                <div className="space-y-1.5">
                  {detailsQuery.data.scenes.map((scene: any) => {
                    const rawErr = scene.errorMessage ?? "";
                    const friendlyErr = rawErr.includes("429") || rawErr.toLowerCase().includes("rate limit")
                      ? "Rate limit reached — the AI rendering service was busy."
                      : rawErr.includes("timeout") || rawErr.toLowerCase().includes("timed out")
                      ? "Request timed out. The scene took too long to generate."
                      : rawErr.length > 300 ? rawErr.slice(0, 300) + "…" : rawErr;

                    return (
                      <div
                        key={scene.id}
                        className={`flex items-start gap-2.5 rounded-lg p-2.5 text-xs ${
                          scene.status === "failed"
                            ? "bg-red-500/5 border border-red-500/20"
                            : scene.status === "completed"
                            ? "bg-[--color-silver]/5 border border-[--color-silver]/10"
                            : "bg-zinc-800/40 border border-border"
                        }`}
                      >
                        <SceneStatusIcon status={scene.status} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-foreground">Scene {scene.sceneIndex + 1}</span>
                            <span className="text-muted-foreground capitalize">{scene.status}</span>
                            {scene.lipSync && (
                              <span className="text-[--color-gold] text-xs">Lip sync</span>
                            )}
                          </div>
                          {scene.prompt && (
                            <p className="text-muted-foreground truncate">{scene.prompt}</p>
                          )}
                          {scene.status === "failed" && friendlyErr && (
                            <p className="text-red-400 mt-1 leading-relaxed break-words">{friendlyErr}</p>
                          )}
                        </div>
                        {scene.status === "completed" && scene.videoUrl && (
                          <div className="shrink-0 relative group w-16 h-10 rounded overflow-hidden bg-zinc-800 cursor-pointer"
                            onClick={() => window.open(scene.videoUrl, '_blank')}>
                            <video
                              src={scene.videoUrl}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover"
                              onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                              onMouseLeave={(e) => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <Play className="w-3 h-3 text-white fill-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Retry All Failed — Confirmation Dialog */}
      <AlertDialog
        open={confirmRetryJob !== null}
        onOpenChange={(open) => { if (!open) setConfirmRetryJob(null); }}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <RefreshCw className="w-4 h-4 text-red-400" />
              Retry Failed Scenes?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              <span className="block mb-2">
                You are about to re-queue{" "}
                <span className="font-semibold text-red-400">
                  {confirmRetryJob?.failedCount} failed scene{confirmRetryJob?.failedCount !== 1 ? "s" : ""}
                </span>{" "}
                from <span className="font-semibold text-foreground">{confirmRetryJob?.title}</span>.
              </span>
              <span className="block text-sm">
                Each scene will be sent back to the AI renderer. This may consume additional credits. Scenes will be staggered to avoid rate limits.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-accent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!confirmRetryJob) return;
                const { id } = confirmRetryJob;
                setConfirmRetryJob(null);
                setRetryingJobId(id);
                try {
                  const result = await retryAllMutation.mutateAsync({ jobId: id });
                  toast.success(
                    `${result.retriedCount} scene${result.retriedCount !== 1 ? "s" : ""} re-queued`,
                    { description: "Building will resume shortly." }
                  );
                  utils.musicVideo.listJobs.invalidate();
                } catch (err: any) {
                  toast.error("Retry failed", { description: err.message });
                } finally {
                  setRetryingJobId(null);
                }
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Confirm Retry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30">
                <AlertCircle className="w-5 h-5 text-red-400" />
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
              onClick={() => {
                if (!deleteTarget) return;
                setDeletingJobId(deleteTarget.jobId);
                deleteJobMutation.mutate({ jobId: deleteTarget.jobId }, { onSettled: () => setDeletingJobId(null) });
                setDeleteTarget(null);
              }}
              className="bg-red-600 hover:bg-red-700 text-white border-0 focus:ring-red-500"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Post-Render Cinematic Pack upsell modal */}
      {cinematicPackJob && (
        <PostRenderCinematicPackModal
          open={cinematicPackJob !== null}
          onClose={() => setCinematicPackJob(null)}
          jobId={cinematicPackJob.id}
          jobType="music_video"
          finalVideoUrl={cinematicPackJob.videoUrl}
          onSkip={(url) => {
            const a = document.createElement("a");
            a.href = url;
            a.download = "";
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setCinematicPackJob(null);
          }}
        />
      )}
    </div>
  );
}
