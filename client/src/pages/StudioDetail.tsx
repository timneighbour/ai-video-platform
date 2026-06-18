import { useState } from "react";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Download, Share2, Film, Music, Image, Video,
  FolderOpen, Clock, Layers, Play
} from "lucide-react";

const PROJECT_TYPES = [
  { value: "animation", label: "Animation", icon: <Film className="w-4 h-4" /> },
  { value: "music_video", label: "Music Video", icon: <Video className="w-4 h-4" /> },
  { value: "music", label: "Music / Audio", icon: <Music className="w-4 h-4" /> },
  { value: "image", label: "Image / Artwork", icon: <Image className="w-4 h-4" /> },
  { value: "short", label: "Short Film", icon: <Play className="w-4 h-4" /> },
  { value: "other", label: "Other", icon: <FolderOpen className="w-4 h-4" /> },
];

const SOCIAL_PLATFORMS = [
  { id: "youtube", label: "YouTube", color: "#FF0000", icon: "▶" },
  { id: "tiktok", label: "TikTok", color: "#111", icon: "♪" },
  { id: "instagram", label: "Instagram", color: "#E1306C", icon: "📷" },
  { id: "facebook", label: "Facebook", color: "#1877F2", icon: "f" },
];

function formatDuration(secs?: number | null) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`;
  return `${Math.floor(d / 30)} months ago`;
}

function AddProjectModal({ profileId, onClose, onSuccess }: { profileId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", type: "other" as any, outputUrl: "" });
  const saveMutation = trpc.studios.saveProject.useMutation({
    onSuccess: () => { toast.success("Project saved!"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm text-white/70 mb-1 block">Project Title *</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Summer Vibes Music Video" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
      </div>
      <div>
        <Label className="text-sm text-white/70 mb-1 block">Type</Label>
        <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-white/10">
            {PROJECT_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-sm text-white/70 mb-1 block">Output URL (video/audio link)</Label>
        <Input value={form.outputUrl} onChange={e => setForm(f => ({ ...f, outputUrl: e.target.value }))}
          placeholder="https://..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
      </div>
      <div>
        <Label className="text-sm text-white/70 mb-1 block">Notes</Label>
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none" />
      </div>
      <div className="flex gap-3">
        <Button onClick={() => saveMutation.mutate({ profileId, title: form.title, type: form.type, description: form.description || undefined, outputUrl: form.outputUrl || undefined, source: "manual" })}
          disabled={!form.title.trim() || saveMutation.isPending}
          className="flex-1 bg-[#b8892a] hover:bg-[#a07820] text-black font-semibold">
          {saveMutation.isPending ? "Saving..." : "Save Project"}
        </Button>
        <Button variant="outline" onClick={onClose} className="border-white/20 text-white/70">Cancel</Button>
      </div>
    </div>
  );
}

function SocialSharePanel({ project, onClose }: { project: any; onClose: () => void }) {
  const logMutation = trpc.studios.logPublish.useMutation();

  const handleShare = (platform: string) => {
    if (!project.outputUrl) {
      toast.error("No output URL available for this project.");
      return;
    }
    const instructions: Record<string, string> = {
      youtube: "URL copied! Go to YouTube Studio → Upload to publish your video.",
      tiktok: "URL copied! Open TikTok → + → Upload to share your video.",
      instagram: "URL copied! Open Instagram → + → Reel or Post to share.",
      facebook: "URL copied! Go to Facebook → Create Post → Photo/Video to share.",
    };
    navigator.clipboard.writeText(project.outputUrl).then(() => toast.success(instructions[platform]));
    logMutation.mutate({ projectId: project.id, platform: platform as any, status: "pending" });
  };

  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm">Copy your video link and upload directly to your chosen platform.</p>
      {project.outputUrl ? (
        <div className="bg-white/5 rounded-lg p-3 flex items-center gap-2">
          <span className="text-white/50 text-xs truncate flex-1">{project.outputUrl}</span>
          <Button size="sm" variant="ghost" className="text-[#b8892a] hover:bg-[#b8892a]/10 shrink-0"
            onClick={() => { navigator.clipboard.writeText(project.outputUrl); toast.success("URL copied!"); }}>
            Copy
          </Button>
        </div>
      ) : (
        <div className="bg-white/5 rounded-lg p-3 text-white/40 text-sm text-center">No output URL available</div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {SOCIAL_PLATFORMS.map(p => (
          <button key={p.id} onClick={() => handleShare(p.id)}
            className="flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: p.color }}>
              {p.icon}
            </div>
            <div>
              <div className="text-white text-sm font-medium">{p.label}</div>
              <div className="text-white/40 text-xs">Copy & upload</div>
            </div>
          </button>
        ))}
      </div>
      {project.outputUrl && (
        <Button asChild variant="outline" className="w-full border-white/20 text-white/70 gap-2">
          <a href={project.outputUrl} download target="_blank" rel="noopener noreferrer">
            <Download className="w-4 h-4" /> Download Project File
          </a>
        </Button>
      )}
      <Button variant="ghost" onClick={onClose} className="w-full text-white/40 hover:text-white/60">Close</Button>
    </div>
  );
}

export default function StudioDetail() {
  const [, params] = useRoute("/studios/:id");
  const profileId = parseInt(params?.id ?? "0");
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [shareProject, setShareProject] = useState<any>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState("all");

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.studios.getProfile.useQuery(
    { id: profileId },
    { enabled: !!user && !!profileId }
  );

  const deleteMutation = trpc.studios.deleteProject.useMutation({
    onSuccess: () => {
      utils.studios.getProfile.invalidate({ id: profileId });
      setDeleteProjectId(null);
      toast.success("Project deleted.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="text-white/40">{isLoading ? "Loading studio..." : "Sign in to view your studio"}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Studio not found</p>
          <Link href="/studios">
            <Button variant="outline" className="border-white/20 text-white/70">Back to Studios</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { projects = [], ...profile } = data as any;
  const filteredProjects = filterType === "all" ? projects : projects.filter((p: any) => p.type === filterType);
  const typeGroups = PROJECT_TYPES.map(t => ({
    ...t, count: projects.filter((p: any) => p.type === t.value).length,
  })).filter(t => t.count > 0);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      {/* Header */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/studios">
              <button className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <span className="text-white/30 text-sm">My Studios</span>
          </div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${profile.colorTheme}20`, color: profile.colorTheme }}>
                <Layers className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{profile.name}</h1>
                {profile.bio && <p className="text-white/50 text-sm mt-1 max-w-lg">{profile.bio}</p>}
                <span className="text-white/30 text-xs mt-1 block">{projects.length} project{projects.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <Button onClick={() => setAddOpen(true)} className="gap-2 text-black font-semibold"
              style={{ backgroundColor: profile.colorTheme }}>
              <Plus className="w-4 h-4" /> Add Project
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter tabs */}
        {typeGroups.length > 0 && (
          <div className="flex gap-2 mb-8 flex-wrap">
            <button onClick={() => setFilterType("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filterType === "all" ? "text-black" : "bg-white/5 text-white/50 hover:text-white"}`}
              style={filterType === "all" ? { backgroundColor: profile.colorTheme } : {}}>
              All ({projects.length})
            </button>
            {typeGroups.map(t => (
              <button key={t.value} onClick={() => setFilterType(t.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${filterType === t.value ? "text-black" : "bg-white/5 text-white/50 hover:text-white"}`}
                style={filterType === t.value ? { backgroundColor: profile.colorTheme } : {}}>
                {t.icon} {t.label} ({t.count})
              </button>
            ))}
          </div>
        )}

        {filteredProjects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-5">
              <FolderOpen className="w-10 h-10 text-white/20" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Projects Yet</h3>
            <p className="text-white/40 mb-6 max-w-sm mx-auto">
              Add your first project — animations, music videos, tracks, or anything you create.
            </p>
            <Button onClick={() => setAddOpen(true)} className="gap-2 text-black font-semibold"
              style={{ backgroundColor: profile.colorTheme }}>
              <Plus className="w-4 h-4" /> Add Your First Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project: any) => {
              const typeInfo = PROJECT_TYPES.find(t => t.value === project.type) ?? PROJECT_TYPES[5];
              return (
                <div key={project.id}
                  className="group rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/5 transition-all overflow-hidden">
                  <div className="relative aspect-video bg-white/5 overflow-hidden">
                    {project.thumbnailUrl ? (
                      <img src={project.thumbnailUrl} alt={project.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: `${profile.colorTheme}10`, color: `${profile.colorTheme}60` }}>
                        {typeInfo.icon}
                      </div>
                    )}
                    {project.outputUrl && (
                      <a href={project.outputUrl} target="_blank" rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-all opacity-0 group-hover:opacity-100">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        </div>
                      </a>
                    )}
                    {project.durationSeconds && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                        {formatDuration(project.durationSeconds)}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 flex-1 mr-2">{project.title}</h3>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setShareProject(project)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        {project.outputUrl && (
                          <a href={project.outputUrl} download target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button onClick={() => setDeleteProjectId(project.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {project.description && (
                      <p className="text-white/40 text-xs mb-2 line-clamp-1">{project.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-white/30 text-xs">
                        {typeInfo.icon}<span>{typeInfo.label}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/30 text-xs">
                        <Clock className="w-3 h-3" /><span>{timeAgo(project.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-[#12122a] border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle>Add Project to {profile.name}</DialogTitle></DialogHeader>
          <AddProjectModal profileId={profileId} onClose={() => setAddOpen(false)}
            onSuccess={() => { setAddOpen(false); utils.studios.getProfile.invalidate({ id: profileId }); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!shareProject} onOpenChange={v => !v && setShareProject(null)}>
        <DialogContent className="bg-[#12122a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#b8892a]" /> Share "{shareProject?.title}"
            </DialogTitle>
          </DialogHeader>
          {shareProject && <SocialSharePanel project={shareProject} onClose={() => setShareProject(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteProjectId !== null} onOpenChange={v => !v && setDeleteProjectId(null)}>
        <DialogContent className="bg-[#12122a] border-white/10 text-white max-w-sm">
          <DialogHeader><DialogTitle>Delete Project?</DialogTitle></DialogHeader>
          <p className="text-white/60 text-sm">This will permanently remove this project from your studio.</p>
          <div className="flex gap-3 mt-4">
            <Button variant="destructive" className="flex-1"
              onClick={() => deleteProjectId && deleteMutation.mutate({ id: deleteProjectId })}
              disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteProjectId(null)} className="border-white/20 text-white/70">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
