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
  Home,
  Loader2,
  RefreshCw,
  Wand2,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import CreditBalance from "@/components/CreditBalance";

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

export default function Projects() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Preview modal state
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  // Delete confirmation state
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  // Back navigation dropdown
  const [showNavMenu, setShowNavMenu] = useState(false);

  const utils = trpc.useUtils();

  const { data: projects, isLoading, error, refetch } = trpc.billing.getProjects.useQuery(
    { limit: 50 },
    { enabled: isAuthenticated, refetchInterval: 15000 } // auto-refresh every 15s for pending jobs
  );

  const { data: creditData } = trpc.billing.getCredits.useQuery(undefined, {
    enabled: isAuthenticated,
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

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
            <CheckCircle className="h-3 w-3" /> Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1">
            <Clock className="h-3 w-3 animate-spin" /> Processing
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Queued
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
            <AlertCircle className="h-3 w-3" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDownload = (project: Project) => {
    if (!project.outputUrl) {
      toast.error("Video URL not available yet. Please wait for processing to complete.");
      return;
    }
    // Create a temporary anchor and trigger download
    const a = document.createElement("a");
    a.href = project.outputUrl;
    a.download = `${project.title.replace(/[^a-z0-9]/gi, "_")}.mp4`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Download started!");
  };

  const handlePreview = (project: Project) => {
    if (!project.outputUrl) {
      toast.error("Video is not ready yet. Please wait for processing to complete.");
      return;
    }
    setPreviewProject(project);
  };

  const handleDelete = (projectId: number) => {
    setDeleteProjectId(projectId);
  };

  const confirmDelete = () => {
    if (deleteProjectId !== null) {
      deleteProjectMutation.mutate({ projectId: deleteProjectId });
    }
  };

  const pendingCount = projects?.filter((p) => p.status === "pending" || p.status === "processing").length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/10 sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Back / Home navigation */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNavMenu((v) => !v)}
              className="gap-2 text-muted-foreground hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            {showNavMenu && (
              <div className="absolute left-0 top-full mt-1 w-44 rounded-xl border border-white/10 bg-zinc-900 shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => { setShowNavMenu(false); setLocation("/dashboard"); }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-white hover:bg-white/10 transition"
                >
                  <Film className="h-4 w-4 text-purple-400" />
                  Dashboard
                </button>
                <button
                  onClick={() => { setShowNavMenu(false); setLocation("/"); }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-white hover:bg-white/10 transition"
                >
                  <Home className="h-4 w-4 text-blue-400" />
                  Home Page
                </button>
                <button
                  onClick={() => { setShowNavMenu(false); setLocation("/wizvid"); }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-white hover:bg-white/10 transition"
                >
                  <Wand2 className="h-4 w-4 text-pink-400" />
                  WizPilot
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-purple-400" />
            <h1 className="text-lg font-bold text-white">Your Projects</h1>
          </div>

          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                className="gap-1.5 text-xs text-muted-foreground hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            )}
            <CreditBalance variant="badge" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-6 sm:py-8 px-4 max-w-4xl mx-auto">

        {/* Credit balance summary */}
        {creditData && (
          <div className="flex items-center gap-2 mb-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <Zap className="h-4 w-4 text-yellow-400 flex-shrink-0" />
            <span className="text-sm text-white">
              You have <span className="font-bold text-yellow-300">{creditData.balance.toLocaleString()} credits</span> remaining
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/credits")}
              className="ml-auto text-xs text-purple-400 hover:text-purple-300"
            >
              Top up
            </Button>
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Generated Videos</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {projects?.length ?? 0} project{projects?.length !== 1 ? "s" : ""}
              {pendingCount > 0 && (
                <span className="ml-2 text-yellow-400">· {pendingCount} processing</span>
              )}
            </p>
          </div>
          <Button
            onClick={() => setLocation("/wizvid")}
            className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 text-sm"
          >
            <Wand2 className="h-4 w-4" />
            New Video
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading your projects…</p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-white font-medium">Failed to load projects</p>
            <p className="text-muted-foreground text-sm">{error.message}</p>
            <Button variant="outline" onClick={() => refetch()} className="gap-2 border-white/20 text-white hover:bg-white/10">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && projects?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <Film className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-white font-semibold text-lg">No projects yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Create your first video with WizPilot — storyboard generation is always free.
            </p>
            <Button
              onClick={() => setLocation("/wizvid")}
              className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0"
            >
              <Wand2 className="h-4 w-4" />
              Create First Video
            </Button>
          </div>
        )}

        {/* Project list */}
        {!isLoading && !error && projects && projects.length > 0 && (
          <div className="space-y-3 sm:space-y-4">
            {[...projects].reverse().map((project) => (
              <div
                key={project.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 hover:border-white/20 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1.5">
                      <h3 className="font-semibold text-white text-sm sm:text-base truncate">
                        {project.title}
                      </h3>
                      {getStatusBadge(project.status)}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{TOOL_LABELS[project.toolType] ?? project.toolType}</span>
                      <span>·</span>
                      <span>{project.creditCost} credits used</span>
                      <span>·</span>
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                    {project.description && (
                      <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-2 italic">
                        "{project.description}"
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
                    {project.status === "completed" && project.outputUrl && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(project as Project)}
                          className="gap-1.5 border-white/20 text-white hover:bg-white/10 flex-1 sm:flex-none"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(project as Project)}
                          className="gap-1.5 border-white/20 text-white hover:bg-white/10 flex-1 sm:flex-none"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                      </>
                    )}
                    {(project.status === "pending" || project.status === "processing") && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="gap-1.5 border-white/10 text-muted-foreground flex-1 sm:flex-none"
                      >
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Rendering…
                      </Button>
                    )}
                    {project.status === "failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation("/wizvid")}
                        className="gap-1.5 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 flex-1 sm:flex-none"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(project.id)}
                      className="gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sm:hidden">Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewProject} onOpenChange={(open) => !open && setPreviewProject(null)}>
        <DialogContent className="max-w-3xl w-full bg-zinc-900 border-white/10 p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-white text-lg">{previewProject?.title}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
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
                loop
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteProjectId !== null} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete this project?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete the project and its video. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10 bg-transparent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteProjectMutation.isPending}
              className="bg-red-600 hover:bg-red-500 text-white border-0"
            >
              {deleteProjectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Click-outside to close nav menu */}
      {showNavMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNavMenu(false)}
        />
      )}
    </div>
  );
}
