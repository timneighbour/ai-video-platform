import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { toast } from "sonner";

// ── Animation style options (shared with KidsVideo) ──────────────────────────
const ANIM_STYLES = [
  { id: "pixar3d",   label: "Pixar 3D",      icon: "🎬" },
  { id: "ghibli",    label: "Studio Ghibli",  icon: "🌸" },
  { id: "anime",     label: "Anime",          icon: "⚡" },
  { id: "cartoon2d", label: "2D Cartoon",     icon: "🎨" },
  { id: "realistic", label: "Realistic",      icon: "📷" },
  { id: "stopmotion",label: "Stop Motion",    icon: "🧸" },
  { id: "watercolor",label: "Watercolour",    icon: "🖌️" },
  { id: "claymation",label: "Claymation",     icon: "🏺" },
];

const GENDER_LABELS: Record<string, string> = {
  male: "♂ Male",
  female: "♀ Female",
  neutral: "⊙ Neutral",
};

const GENDER_COLOURS: Record<string, string> = {
  male:    "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300",
  female:  "from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-300",
  neutral: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-300",
};

const STUDIO_BG = "/manus-storage/wizanimate-studio-pov-v2_e5827366.jpg";

// ── Edit modal ────────────────────────────────────────────────────────────────
function EditModal({
  char,
  onClose,
  onSaved,
}: {
  char: {
    id: number;
    name: string;
    description: string | null;
    gender: "male" | "female" | "neutral";
    animStyle: string | null;
    tags: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(char.name);
  const [description, setDescription] = useState(char.description ?? "");
  const [gender, setGender] = useState<"male" | "female" | "neutral">(char.gender);
  const [animStyle, setAnimStyle] = useState(char.animStyle ?? "");
  const [tags, setTags] = useState(char.tags ?? "");

  const updateMut = trpc.characterLibrary.update.useMutation({
    onSuccess: () => { toast.success("Character updated"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-amber-500/30 bg-[#0e0b07] shadow-2xl shadow-amber-900/20 p-6">
        {/* Gold top bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        <h2 className="text-xl font-bold text-amber-300 mb-5">Edit Character</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-amber-400/70 uppercase tracking-widest mb-1">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-amber-500/20 bg-black/40 px-3 py-2 text-sm text-amber-100 placeholder-amber-700/50 focus:outline-none focus:border-amber-400/60"
              placeholder="Character name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-amber-400/70 uppercase tracking-widest mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-amber-500/20 bg-black/40 px-3 py-2 text-sm text-amber-100 placeholder-amber-700/50 focus:outline-none focus:border-amber-400/60 resize-none"
              placeholder="Appearance, costume, colours, personality..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-amber-400/70 uppercase tracking-widest mb-1">Gender / Voice</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as "male" | "female" | "neutral")}
                className="w-full rounded-lg border border-amber-500/20 bg-black/40 px-3 py-2 text-sm text-amber-100 focus:outline-none focus:border-amber-400/60"
              >
                <option value="male">♂ Male</option>
                <option value="female">♀ Female</option>
                <option value="neutral">⊙ Neutral</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-amber-400/70 uppercase tracking-widest mb-1">Animation Style</label>
              <select
                value={animStyle}
                onChange={e => setAnimStyle(e.target.value)}
                className="w-full rounded-lg border border-amber-500/20 bg-black/40 px-3 py-2 text-sm text-amber-100 focus:outline-none focus:border-amber-400/60"
              >
                <option value="">— Any style —</option>
                {ANIM_STYLES.map(s => (
                  <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-amber-400/70 uppercase tracking-widest mb-1">Tags (comma-separated)</label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full rounded-lg border border-amber-500/20 bg-black/40 px-3 py-2 text-sm text-amber-100 placeholder-amber-700/50 focus:outline-none focus:border-amber-400/60"
              placeholder="e.g. dog, animal, pixar, hero"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-amber-500/20 bg-transparent py-2 text-sm text-amber-400/70 hover:text-amber-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => updateMut.mutate({ id: char.id, name, description, gender, animStyle: animStyle || undefined, tags: tags || undefined })}
            disabled={updateMut.isPending || !name.trim()}
            className="flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 py-2 text-sm font-bold text-black hover:from-amber-400 hover:to-yellow-300 disabled:opacity-50 transition-all"
          >
            {updateMut.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Character Card ────────────────────────────────────────────────────────────
function CharacterCard({
  char,
  onDeleted,
  onEdited,
}: {
  char: {
    id: number;
    name: string;
    description: string | null;
    gender: "male" | "female" | "neutral";
    animStyle: string | null;
    photoUrl: string | null;
    previewUrl: string | null;
    tags: string | null;
    useCount: number;
    createdAt: Date;
  };
  onDeleted: () => void;
  onEdited: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  const deleteMut = trpc.characterLibrary.delete.useMutation({
    onSuccess: () => { toast.success(`"${char.name}" removed from library`); onDeleted(); },
    onError: (e) => toast.error(e.message),
  });

  const styleInfo = ANIM_STYLES.find(s => s.id === char.animStyle);
  const genderColour = GENDER_COLOURS[char.gender] ?? GENDER_COLOURS.neutral;
  const displayImage = char.previewUrl || char.photoUrl;

  return (
    <>
      {editing && (
        <EditModal char={char} onClose={() => setEditing(false)} onSaved={onEdited} />
      )}

      <div className="group relative rounded-2xl border border-amber-500/20 bg-gradient-to-b from-[#1a1208] to-[#0e0b07] overflow-hidden hover:border-amber-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-900/30">
        {/* Gold shimmer top border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        {/* Image zone */}
        <div className="relative h-52 bg-black/40 overflow-hidden">
          {displayImage ? (
            <img
              src={displayImage}
              alt={char.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/20 to-black">
              <div className="text-center">
                <div className="text-6xl mb-2 opacity-40">
                  {char.gender === "male" ? "♂" : char.gender === "female" ? "♀" : "⊙"}
                </div>
                <div className="text-xs text-amber-700/60 uppercase tracking-widest">No Preview</div>
              </div>
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0b07] via-transparent to-transparent" />

          {/* Style badge */}
          {styleInfo && (
            <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/60 border border-amber-500/30 px-2 py-0.5 text-xs text-amber-300 backdrop-blur-sm">
              <span>{styleInfo.icon}</span>
              <span>{styleInfo.label}</span>
            </div>
          )}

          {/* Use count badge */}
          {char.useCount > 0 && (
            <div className="absolute top-3 right-3 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-xs text-amber-300">
              Used {char.useCount}×
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Name + gender */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-amber-100 text-base leading-tight truncate flex-1">{char.name}</h3>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium bg-gradient-to-r ${genderColour}`}>
              {GENDER_LABELS[char.gender]}
            </span>
          </div>

          {/* Description */}
          {char.description && (
            <p className="text-xs text-amber-200/50 line-clamp-2 mb-3 leading-relaxed">{char.description}</p>
          )}

          {/* Tags */}
          {char.tags && (
            <div className="flex flex-wrap gap-1 mb-3">
              {char.tags.split(",").slice(0, 4).map(tag => (
                <span key={tag.trim()} className="rounded-full bg-amber-900/20 border border-amber-700/20 px-2 py-0.5 text-xs text-amber-600">
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}

          {/* WizSync badge */}
          <div className="flex items-center gap-1.5 mb-4 text-xs text-amber-500/70">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>WizSync™ Ready — Lip-sync enabled</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 rounded-lg border border-amber-500/20 bg-amber-900/10 py-1.5 text-xs text-amber-400 hover:bg-amber-900/30 hover:border-amber-400/40 transition-all"
            >
              ✏️ Edit
            </button>
            {confirmDelete ? (
              <div className="flex gap-1 flex-1">
                <button
                  onClick={() => deleteMut.mutate({ id: char.id })}
                  disabled={deleteMut.isPending}
                  className="flex-1 rounded-lg bg-red-600/80 py-1.5 text-xs text-white hover:bg-red-500 transition-all"
                >
                  {deleteMut.isPending ? "…" : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-lg border border-amber-500/20 py-1.5 text-xs text-amber-500/60 hover:text-amber-400 transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg border border-red-500/20 bg-red-900/10 px-3 py-1.5 text-xs text-red-400/70 hover:text-red-300 hover:border-red-400/40 transition-all"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CharacterLibrary() {
  const { user, isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [filterStyle, setFilterStyle] = useState("");
  const [filterGender, setFilterGender] = useState("");

  const { data: characters, isLoading, refetch } = trpc.characterLibrary.list.useQuery(
    { search: search || undefined, animStyle: filterStyle || undefined },
    { enabled: isAuthenticated }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070503]">
        <div className="text-center max-w-sm px-6">
          <div className="text-5xl mb-4">🎭</div>
          <h2 className="text-2xl font-bold text-amber-200 mb-3">Character Library</h2>
          <p className="text-amber-200/50 mb-6 text-sm">Sign in to save and manage your AI characters across all Wiz products.</p>
          <a
            href={getLoginUrl()}
            className="inline-block rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-3 text-sm font-bold text-black hover:from-amber-400 hover:to-yellow-300 transition-all"
          >
            Sign In to Access Library
          </a>
        </div>
      </div>
    );
  }

  // Client-side gender filter
  const filtered = (characters ?? []).filter(c =>
    !filterGender || c.gender === filterGender
  );

  return (
    <div className="min-h-screen bg-[#070503] text-amber-100">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden">
        {/* Studio background */}
        <img
          src={STUDIO_BG}
          alt="WizAnimate Studio"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.25) saturate(0.7)" }}
        />
        {/* Warm amber overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/30 via-transparent to-[#070503]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070503]/60 via-transparent to-[#070503]/60" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-amber-600/70 mb-6">
            <Link href="/" className="hover:text-amber-400 transition-colors">Home</Link>
            <span>›</span>
            <Link href="/dashboard" className="hover:text-amber-400 transition-colors">Dashboard</Link>
            <span>›</span>
            <span className="text-amber-400">Character Library</span>
          </div>

          {/* Title block */}
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400 uppercase tracking-widest">
                  WizSync™ Character Library
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 mb-2">
                Your Characters
              </h1>
              <p className="text-amber-200/50 text-sm max-w-xl">
                Save, manage, and reuse your AI characters across WizAnimate, Music Video, and all Wiz products. Lock a character once — use it everywhere.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-4">
              <div className="rounded-xl border border-amber-500/20 bg-amber-900/10 px-4 py-3 text-center">
                <div className="text-2xl font-black text-amber-300">{filtered.length}</div>
                <div className="text-xs text-amber-600/70 uppercase tracking-wider">Characters</div>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-900/10 px-4 py-3 text-center">
                <div className="text-2xl font-black text-amber-300">
                  {(characters ?? []).reduce((s, c) => s + c.useCount, 0)}
                </div>
                <div className="text-xs text-amber-600/70 uppercase tracking-wider">Total Uses</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Engine badges ── */}
      <div className="max-w-6xl mx-auto px-6 -mt-2 mb-8">
        <div className="flex flex-wrap gap-2">
          {["WizSync™", "WizCreate™", "WizAdora™", "WizAnimate™", "WizGenesis™"].map(eng => (
            <span key={eng} className="rounded-full bg-amber-900/20 border border-amber-700/30 px-3 py-1 text-xs text-amber-500/80">
              {eng}
            </span>
          ))}
        </div>
      </div>

      {/* ── Search & filters ── */}
      <div className="max-w-6xl mx-auto px-6 mb-8">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600/50 text-sm">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, description, or tag…"
              className="w-full rounded-xl border border-amber-500/20 bg-black/40 pl-9 pr-4 py-2.5 text-sm text-amber-100 placeholder-amber-700/50 focus:outline-none focus:border-amber-400/60"
            />
          </div>

          {/* Style filter */}
          <select
            value={filterStyle}
            onChange={e => setFilterStyle(e.target.value)}
            className="rounded-xl border border-amber-500/20 bg-black/40 px-3 py-2.5 text-sm text-amber-200 focus:outline-none focus:border-amber-400/60"
          >
            <option value="">All Styles</option>
            {ANIM_STYLES.map(s => (
              <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
            ))}
          </select>

          {/* Gender filter */}
          <select
            value={filterGender}
            onChange={e => setFilterGender(e.target.value)}
            className="rounded-xl border border-amber-500/20 bg-black/40 px-3 py-2.5 text-sm text-amber-200 focus:outline-none focus:border-amber-400/60"
          >
            <option value="">All Genders</option>
            <option value="male">♂ Male</option>
            <option value="female">♀ Female</option>
            <option value="neutral">⊙ Neutral</option>
          </select>

          {/* Create new CTA */}
          <Link href="/kids-video">
            <button className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-4 py-2.5 text-sm font-bold text-black hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-900/30 whitespace-nowrap">
              + Create Character
            </button>
          </Link>
        </div>
      </div>

      {/* ── Character grid ── */}
      <div className="max-w-6xl mx-auto px-6 pb-20">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-amber-500/10 bg-[#1a1208] overflow-hidden animate-pulse">
                <div className="h-52 bg-amber-900/10" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-amber-900/20 rounded w-3/4" />
                  <div className="h-3 bg-amber-900/10 rounded w-full" />
                  <div className="h-3 bg-amber-900/10 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            {/* Empty state */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-900/40 to-black border border-amber-500/20 flex items-center justify-center text-4xl">
                🎭
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-sm">
                ✨
              </div>
            </div>
            <h3 className="text-xl font-bold text-amber-200 mb-2">
              {search || filterStyle || filterGender ? "No characters match your filters" : "Your library is empty"}
            </h3>
            <p className="text-amber-200/40 text-sm max-w-sm mb-6">
              {search || filterStyle || filterGender
                ? "Try adjusting your search or filters."
                : "Create a character in WizAnimate or Music Video, then click \"Save to Library\" to add them here for reuse across all your projects."}
            </p>
            {!search && !filterStyle && !filterGender && (
              <Link href="/kids-video">
                <button className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-6 py-3 text-sm font-bold text-black hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-900/30">
                  🎬 Open WizAnimate Studio
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(char => (
              <CharacterCard
                key={char.id}
                char={char}
                onDeleted={() => refetch()}
                onEdited={() => refetch()}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom CTA strip ── */}
      {filtered.length > 0 && (
        <div className="border-t border-amber-900/30 bg-gradient-to-r from-[#0e0b07] via-[#1a1208] to-[#0e0b07]">
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-200">Ready to animate your characters?</p>
              <p className="text-xs text-amber-600/60">Use "Add from Library" in any project to instantly import a saved character.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/kids-video">
                <button className="rounded-xl border border-amber-500/30 bg-amber-900/20 px-4 py-2 text-sm text-amber-300 hover:bg-amber-900/40 transition-all">
                  🎬 WizAnimate
                </button>
              </Link>
              <Link href="/music-video">
                <button className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-4 py-2 text-sm font-bold text-black hover:from-amber-400 hover:to-yellow-300 transition-all">
                  🎵 Music Video
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
