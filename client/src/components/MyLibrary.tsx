/**
 * MyLibrary — Unified cross-studio output library for the Dashboard.
 *
 * Shows all completed outputs across every WIZ AI studio:
 *   Songs (WizAudio), Music Videos, Animations (WizAnimate),
 *   Images (WizImages), Shorts (WizShorts), WizScore outputs.
 *
 * Songs are re-downloaded via the server-side redownloadSong procedure
 * (unlock verification + signed token). All other items link directly
 * to their S3 URL.
 */

import { useState } from "react";
import {
  Download, Music, Film, Baby, Image, Youtube, Mic2,
  Loader2, Archive, ChevronDown, ChevronUp, Lock
} from "@/lib/icons";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// ── Studio icon + colour map ──────────────────────────────────────────────────
const STUDIO_META: Record<string, { icon: React.ElementType; colour: string; label: string }> = {
  WizAudio:   { icon: Music,    colour: "text-purple-400",  label: "WizAudio" },
  WizCreate:  { icon: Film,     colour: "text-amber-400",   label: "WizCreate" },
  WizAnimate: { icon: Baby,     colour: "text-pink-400",    label: "WizAnimate" },
  WizImages:  { icon: Image,    colour: "text-blue-400",    label: "WizImages" },
  WizShorts:  { icon: Youtube,  colour: "text-red-400",     label: "WizShorts" },
  WizScore:   { icon: Mic2,     colour: "text-green-400",   label: "WizScore" },
};

// ── Song download button ──────────────────────────────────────────────────────
function SongDownloadButton({ taskId, trackIndex }: { taskId: number; trackIndex: number }) {
  const [loading, setLoading] = useState(false);
  const redownload = trpc.suno.redownloadSong.useMutation({
    onSuccess: (data) => {
      setLoading(false);
      if (data.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = `wiz-audio-track-${taskId}-${trackIndex}.mp3`;
        a.click();
        toast.success("Download started");
      } else {
        toast.error("Download failed", { description: "Could not generate download link." });
      }
    },
    onError: (err) => {
      setLoading(false);
      toast.error("Download failed", { description: err.message });
    },
  });

  const handleClick = () => {
    setLoading(true);
    redownload.mutate({ taskId, trackIndex });
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-medium hover:bg-purple-500/25 transition-all disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
      Download
    </button>
  );
}

// ── Library card ──────────────────────────────────────────────────────────────
function LibraryCard({ item }: { item: any }) {
  const meta = STUDIO_META[item.studio] ?? { icon: Download, colour: "text-zinc-400", label: item.studio };
  const Icon = meta.icon;

  return (
    <div className="group rounded-xl border border-white/8 bg-white/[0.03] hover:border-white/15 transition-all overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-zinc-900 overflow-hidden">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className={`w-6 h-6 ${meta.colour} opacity-40`} />
          </div>
        )}
        {/* Studio badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm ${meta.colour}`}>
            <Icon className="w-2.5 h-2.5" />
            {meta.label}
          </span>
        </div>
      </div>

      {/* Info + action */}
      <div className="p-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-white truncate">{item.title}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Download action */}
        {item.type === "song" && item.songMeta ? (
          <SongDownloadButton taskId={item.songMeta.taskId} trackIndex={item.songMeta.trackIndex} />
        ) : item.downloadUrl ? (
          <a
            href={item.downloadUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 border border-white/12 text-zinc-300 text-xs font-medium hover:bg-white/15 transition-all"
          >
            <Download className="w-3 h-3" />
            Download
          </a>
        ) : (
          <span className="flex-shrink-0 flex items-center gap-1 text-xs text-zinc-600">
            <Lock className="w-3 h-3" /> Locked
          </span>
        )}
      </div>
    </div>
  );
}

// ── Filter pill ───────────────────────────────────────────────────────────────
const FILTERS = [
  { key: "all",         label: "All" },
  { key: "song",        label: "Songs" },
  { key: "music_video", label: "Videos" },
  { key: "animation",   label: "Animations" },
  { key: "image",       label: "Images" },
  { key: "short",       label: "Shorts" },
  { key: "score",       label: "WizScore" },
] as const;

// ── Main component ────────────────────────────────────────────────────────────
export function MyLibrary({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState(true);

  // Use any cast because the library router may not yet be reflected in the
  // auto-generated tRPC type tree until the next full type rebuild.
  const libraryRouter = (trpc as any).library;
  const { data: items, isLoading, error, refetch } = libraryRouter.getAll.useQuery(
    { limit: 100 },
    { enabled: isAuthenticated, staleTime: 30_000 }
  );

  const filtered = filter === "all"
    ? (items ?? [])
    : (items ?? []).filter((i: any) => i.type === filter);

  // Error state — show inline retry rather than silently disappearing
  if (error) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-3 text-lg font-semibold text-white">
          <Archive className="w-4 h-4 text-zinc-400" />
          My Library
        </div>
        <div className="flex items-center gap-3 py-6 px-4 rounded-xl border border-red-500/20 bg-red-500/[0.04]">
          <p className="text-sm text-zinc-400 flex-1">Could not load your library.</p>
          <button
            onClick={() => refetch()}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/8 border border-white/12 text-zinc-300 hover:bg-white/15 transition-all"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  // Don't render the section at all if there's nothing yet
  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-lg font-semibold text-white hover:text-zinc-300 transition-colors"
        >
          <Archive className="w-4 h-4 text-zinc-400" />
          My Library
          {items && items.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/8 text-zinc-400 border-0">
              {items.length}
            </Badge>
          )}
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
            : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
        </button>
      </div>

      {expanded && (
        <>
          {/* Filter pills */}
          {items && items.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {FILTERS.map((f) => {
                const count = f.key === "all"
                  ? items.length
                  : items.filter((i: any) => i.type === f.key).length;
                if (count === 0 && f.key !== "all") return null;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                      filter === f.key
                        ? "bg-white/15 border-white/25 text-white font-medium"
                        : "bg-transparent border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20"
                    }`}
                  >
                    {f.label} {count > 0 && <span className="opacity-60">({count})</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-zinc-600">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading library…</span>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-zinc-600 py-6 text-center">
              No {filter === "all" ? "" : filter} items yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {filtered.map((item: any) => (
                <LibraryCard key={item.key} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
