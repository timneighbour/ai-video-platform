import { } from "react";
import { useLocation } from "wouter";
import BackButton from "@/components/BackButton";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "lucide-react";

type JobStatus = "draft" | "storyboard_ready" | "rendering" | "assembling" | "completed" | "failed";

function StatusBadge({ status }: { status: JobStatus }) {
  const config: Record<JobStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    draft: { label: "Draft", variant: "secondary", icon: <Edit3 className="w-3 h-3" /> },
    storyboard_ready: { label: "Storyboard Ready", variant: "outline", icon: <Film className="w-3 h-3" /> },
    rendering: { label: "Rendering", variant: "default", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    assembling: { label: "Assembling", variant: "default", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    completed: { label: "Complete", variant: "default", icon: <CheckCircle2 className="w-3 h-3" /> },
    failed: { label: "Failed", variant: "destructive", icon: <AlertCircle className="w-3 h-3" /> },
  };
  const { label, variant, icon } = config[status] ?? config.draft;
  return (
    <Badge variant={variant} className="flex items-center gap-1 text-xs">
      {icon}
      {label}
    </Badge>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(ts: Date | string | number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MyProjects() {
  const [, navigate] = useLocation();
  // toast imported from sonner
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

  function openProject(jobId: number) {
    navigate(`/music-video/create?jobId=${jobId}`);
  }

  function downloadFile(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <BackButton fallback="/dashboard" label="Back to Dashboard" className="mb-4" />
        </div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Projects</h1>
            <p className="text-muted-foreground mt-1">
              {jobs ? `${jobs.length} project${jobs.length !== 1 ? "s" : ""}` : "Loading your projects..."}
            </p>
          </div>
          <Button onClick={() => navigate("/music-video/create")} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && jobs?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Film className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first AI music video to get started. Upload a song and let WizVid do the rest.
            </p>
            <Button onClick={() => navigate("/music-video/create")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Video
            </Button>
          </div>
        )}

        {/* Project grid */}
        {!isLoading && jobs && jobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => {
              // Find first completed scene preview as thumbnail
              const thumbnailUrl = (job as any).thumbnailUrl ?? null;

              return (
                <Card key={job.id} className="flex flex-col overflow-hidden border border-border/60 hover:border-border transition-colors">
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted/30 overflow-hidden">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={job.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-12 h-12 text-muted-foreground/20" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <StatusBadge status={job.status as JobStatus} />
                    </div>
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold line-clamp-1">{job.title}</CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(job.createdAt)}
                      </span>
                      {job.audioDuration > 0 && (
                        <span className="flex items-center gap-1">
                          <Music className="w-3 h-3" />
                          {formatDuration(job.audioDuration)}
                        </span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pb-2 flex-1">
                    {/* Scene progress */}
                    <div className="text-xs text-muted-foreground">
                      {(job as any).totalScenes > 0 ? (
                        <span>
                          {(job as any).completedScenes}/{(job as any).totalScenes} scenes complete
                        </span>
                      ) : (
                        <span>No scenes generated yet</span>
                      )}
                    </div>
                    {job.genre && (
                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs">{job.genre}</Badge>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                    {/* Open / Edit */}
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 min-w-[80px]"
                      onClick={() => openProject(job.id)}
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Open
                    </Button>

                    {/* Download Video */}
                    {job.finalVideoUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(job.finalVideoUrl!, `${job.title}-video.mp4`)}
                        title="Download video"
                      >
                        <Video className="w-3 h-3 mr-1" />
                        Video
                      </Button>
                    )}

                    {/* Download Audio */}
                    {job.audioUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(job.audioUrl, `${job.title}-audio.mp3`)}
                        title="Download audio"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Audio
                      </Button>
                    )}

                    {/* Delete */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete project?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete <strong>{job.title}</strong> and all its scenes, characters, and generated content. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate({ jobId: job.id })}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
