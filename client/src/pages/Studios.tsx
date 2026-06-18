import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Film, Music, Mic, Disc3, Video, Tv2, Podcast, Layers,
  FolderOpen, ChevronRight, Sparkles
} from "lucide-react";

const PROFILE_TYPES = [
  { value: "animator", label: "Animator / Animation Studio", icon: "🎬" },
  { value: "band", label: "Band / Music Group", icon: "🎸" },
  { value: "artist", label: "Solo Artist / Singer-Songwriter", icon: "🎤" },
  { value: "dj", label: "DJ / Electronic Producer", icon: "🎧" },
  { value: "filmmaker", label: "Filmmaker / Director", icon: "🎥" },
  { value: "youtuber", label: "YouTube Creator / Vlogger", icon: "📺" },
  { value: "podcaster", label: "Podcaster / Audio Creator", icon: "🎙️" },
  { value: "other", label: "Other / Multi-disciplinary", icon: "✨" },
];

const THEME_COLORS = [
  "#b8892a", "#7c3aed", "#0ea5e9", "#10b981", "#ef4444",
  "#f59e0b", "#ec4899", "#6366f1", "#14b8a6", "#f97316",
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  animator: <Film className="w-6 h-6" />,
  band: <Music className="w-6 h-6" />,
  artist: <Mic className="w-6 h-6" />,
  dj: <Disc3 className="w-6 h-6" />,
  filmmaker: <Video className="w-6 h-6" />,
  youtuber: <Tv2 className="w-6 h-6" />,
  podcaster: <Podcast className="w-6 h-6" />,
  other: <Sparkles className="w-6 h-6" />,
};

interface ProfileFormData {
  name: string;
  type: string;
  bio: string;
  colorTheme: string;
}

function ProfileForm({
  initial,
  onSave,
  onClose,
  loading,
}: {
  initial?: ProfileFormData;
  onSave: (data: ProfileFormData) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<ProfileFormData>(
    initial ?? { name: "", type: "other", bio: "", colorTheme: "#b8892a" }
  );

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium text-white/80 mb-1.5 block">Studio Name *</Label>
        <Input
          placeholder="e.g. Tim's Animation Studio, The Midnight Band..."
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />
      </div>

      <div>
        <Label className="text-sm font-medium text-white/80 mb-1.5 block">Creative Type *</Label>
        <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a2e] border-white/10">
            {PROFILE_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value} className="text-white hover:bg-white/10">
                {t.icon} {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium text-white/80 mb-1.5 block">Bio / Description</Label>
        <Textarea
          placeholder="Describe what this studio is about..."
          value={form.bio}
          onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
          rows={3}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
        />
      </div>

      <div>
        <Label className="text-sm font-medium text-white/80 mb-2 block">Studio Colour</Label>
        <div className="flex gap-2 flex-wrap">
          {THEME_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setForm(f => ({ ...f, colorTheme: c }))}
              className="w-8 h-8 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c,
                borderColor: form.colorTheme === c ? "white" : "transparent",
                transform: form.colorTheme === c ? "scale(1.2)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          onClick={() => onSave(form)}
          disabled={!form.name.trim() || loading}
          className="flex-1 text-black font-semibold"
          style={{ backgroundColor: form.colorTheme }}
        >
          {loading ? "Saving..." : "Save Studio"}
        </Button>
        <Button variant="outline" onClick={onClose} className="border-white/20 text-white/70 hover:bg-white/5">
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function Studios() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: profiles = [], isLoading } = trpc.studios.listProfiles.useQuery(undefined, {
    enabled: !!user,
  });

  const createMutation = trpc.studios.createProfile.useMutation({
    onSuccess: () => {
      utils.studios.listProfiles.invalidate();
      setCreateOpen(false);
      toast.success("Studio created!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.studios.updateProfile.useMutation({
    onSuccess: () => {
      utils.studios.listProfiles.invalidate();
      setEditProfile(null);
      toast.success("Studio updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.studios.deleteProfile.useMutation({
    onSuccess: () => {
      utils.studios.listProfiles.invalidate();
      setDeleteId(null);
      toast.success("Studio deleted.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Layers className="w-16 h-16 text-[#b8892a] mx-auto" />
          <h2 className="text-2xl font-bold text-white">My Creative Studios</h2>
          <p className="text-white/60">Sign in to manage your creative projects</p>
          <Button asChild className="bg-[#b8892a] hover:bg-[#a07820] text-black font-semibold">
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-gradient-to-r from-[#0a0a14] via-[#12122a] to-[#0a0a14]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#b8892a]/20 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-[#b8892a]" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  My Creative Studios
                </h1>
              </div>
              <p className="text-white/50 text-sm pl-13">
                Your private creative locker — all your projects, all in one place
              </p>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#b8892a] hover:bg-[#a07820] text-black font-semibold gap-2">
                  <Plus className="w-4 h-4" /> New Studio
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#12122a] border-white/10 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Create a New Studio</DialogTitle>
                </DialogHeader>
                <ProfileForm
                  onSave={(data) => createMutation.mutate({
                    name: data.name,
                    type: data.type as any,
                    bio: data.bio || undefined,
                    colorTheme: data.colorTheme,
                  })}
                  onClose={() => setCreateOpen(false)}
                  loading={createMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-52 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 rounded-3xl bg-[#b8892a]/10 flex items-center justify-center mx-auto mb-6">
              <Layers className="w-12 h-12 text-[#b8892a]/60" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No Studios Yet</h3>
            <p className="text-white/50 max-w-md mx-auto mb-8">
              Create your first creative studio — whether you're an animator, musician, filmmaker, DJ, or all of the above.
              Keep all your projects organised under one roof.
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-[#b8892a] hover:bg-[#a07820] text-black font-semibold gap-2 px-8 py-3"
            >
              <Plus className="w-5 h-5" /> Create Your First Studio
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile: any) => {
              const typeInfo = PROFILE_TYPES.find(t => t.value === profile.type) ?? PROFILE_TYPES[7];
              return (
                <div
                  key={profile.id}
                  className="group relative rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/5 transition-all duration-300 overflow-hidden"
                  style={{ borderColor: `${profile.colorTheme}30` }}
                >
                  {/* Colour accent bar */}
                  <div className="h-1.5 w-full" style={{ backgroundColor: profile.colorTheme }} />

                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${profile.colorTheme}20`, color: profile.colorTheme }}
                        >
                          {TYPE_ICONS[profile.type] ?? <Sparkles className="w-6 h-6" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg leading-tight">{profile.name}</h3>
                          <span className="text-xs text-white/40">{typeInfo.icon} {typeInfo.label}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditProfile(profile)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(profile.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bio */}
                    {profile.bio && (
                      <p className="text-white/50 text-sm mb-4 line-clamp-2">{profile.bio}</p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="flex items-center gap-1.5 text-white/40 text-sm">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>{profile.projectCount ?? 0} project{(profile.projectCount ?? 0) !== 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    {/* CTA */}
                    <Link href={`/studios/${profile.id}`}>
                      <Button
                        className="w-full font-semibold gap-2 text-black"
                        style={{ backgroundColor: profile.colorTheme }}
                      >
                        Open Studio <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}

            {/* Add new card */}
            <button
              onClick={() => setCreateOpen(true)}
              className="rounded-2xl border-2 border-dashed border-white/10 hover:border-[#b8892a]/40 hover:bg-[#b8892a]/5 transition-all duration-300 min-h-[220px] flex flex-col items-center justify-center gap-3 text-white/30 hover:text-[#b8892a] group"
            >
              <div className="w-12 h-12 rounded-xl border-2 border-dashed border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Add Another Studio</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editProfile} onOpenChange={v => !v && setEditProfile(null)}>
        <DialogContent className="bg-[#12122a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Studio</DialogTitle>
          </DialogHeader>
          {editProfile && (
            <ProfileForm
              initial={{ name: editProfile.name, type: editProfile.type, bio: editProfile.bio ?? "", colorTheme: editProfile.colorTheme }}
              onSave={(data) => updateMutation.mutate({
                id: editProfile.id,
                data: { name: data.name, type: data.type as any, bio: data.bio || undefined, colorTheme: data.colorTheme },
              })}
              onClose={() => setEditProfile(null)}
              loading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={v => !v && setDeleteId(null)}>
        <DialogContent className="bg-[#12122a] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Studio?</DialogTitle>
          </DialogHeader>
          <p className="text-white/60 text-sm">
            This will permanently delete this studio and all its saved projects. This cannot be undone.
          </p>
          <div className="flex gap-3 mt-4">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="border-white/20 text-white/70">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
