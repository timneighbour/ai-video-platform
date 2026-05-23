/**
 * RenderScenePreview — Live composited scene preview grid.
 *
 * Shows individual scenes as they finish compositing during a music video render.
 * Performance scenes show the WizSync™ composited clip (Zara on stage).
 * Cinematic scenes show the raw Seedance clip.
 * Scenes that are still rendering show a pulsing skeleton card.
 *
 * Polls `musicVideo.getScenePreviews` every 8 seconds while the job is active.
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Play, Pause, Film, Mic, Loader2, Clock, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RenderScenePreviewProps {
  jobId: number;
  jobStatus: string; // rendering | assembling | completed | failed
  className?: string;
}

type PreviewState = "pending" | "waiting" | "compositing" | "ready";

interface ScenePreview {
  id: number;
  sceneIndex: number;
  sceneType: "performance" | "cinematic";
  status: string;
  lipSyncStatus: string | null;
  compositeStatus: string | null;
  previewUrl: string | null;
  previewState: PreviewState;
  prompt: string;
  startTime: number;
  duration: number;
}

// ── Lightbox modal ────────────────────────────────────────────────────────────
function SceneLightbox({
  scene,
  onClose,
}: {
  scene: ScenePreview;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/60">
          <div className="flex items-center gap-2.5">
            {scene.sceneType === "performance" ? (
              <Mic className="w-4 h-4 text-[--color-gold]" />
            ) : (
              <Film className="w-4 h-4 text-blue-400" />
            )}
            <span className="text-sm font-semibold text-white">
              Scene {scene.sceneIndex + 1}
            </span>
            <span className="text-xs text-white/40">
              {formatTime(scene.startTime)} — {formatTime(scene.startTime + scene.duration)}
            </span>
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide",
                scene.sceneType === "performance"
                  ? "bg-[--color-gold]/20 text-[--color-gold] border border-[--color-gold]/30"
                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
              )}
            >
              {scene.sceneType === "performance" ? "WizSync™" : "Cinematic"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video */}
        <div className="aspect-video bg-black">
          {scene.previewUrl ? (
            <video
              ref={videoRef}
              src={scene.previewUrl}
              controls
              autoPlay
              loop
              className="w-full h-full object-contain"
              playsInline
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/30">
              No preview available
            </div>
          )}
        </div>

        {/* Prompt */}
        <div className="px-4 py-3 bg-black/40 border-t border-white/10">
          <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{scene.prompt}</p>
        </div>
      </div>
    </div>
  );
}

// ── Scene card ────────────────────────────────────────────────────────────────
function SceneCard({
  scene,
  onOpen,
}: {
  scene: ScenePreview;
  onOpen: (scene: ScenePreview) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isReady = scene.previewState === "ready";
  const isCompositing = scene.previewState === "compositing";
  const isWaiting = scene.previewState === "waiting";
  const isPending = scene.previewState === "pending";

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Hover preview: play muted on hover
  useEffect(() => {
    if (!videoRef.current || !scene.previewUrl) return;
    if (hovered) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [hovered, scene.previewUrl]);

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border transition-all duration-300 group",
        isReady
          ? "border-white/15 cursor-pointer hover:border-[--color-gold]/40 hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]"
          : "border-white/8 cursor-default",
        // Animate in when ready
        isReady && "animate-in fade-in duration-500"
      )}
      style={{ aspectRatio: "16/9", background: "oklch(0.08 0 0)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => isReady && onOpen(scene)}
    >
      {/* Video thumbnail / hover preview */}
      {scene.previewUrl && (
        <video
          ref={videoRef}
          src={scene.previewUrl}
          muted
          loop
          playsInline
          preload="metadata"
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            hovered ? "opacity-100" : "opacity-70"
          )}
        />
      )}

      {/* Skeleton shimmer for non-ready states */}
      {!isReady && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/3 via-white/6 to-white/3 animate-pulse" />
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Status indicator — top right */}
      <div className="absolute top-2 right-2">
        {isReady ? (
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-semibold">Ready</span>
          </div>
        ) : isCompositing ? (
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1">
            <Loader2 className="w-3 h-3 text-[--color-gold] animate-spin" />
            <span className="text-[10px] text-[--color-gold] font-semibold">Compositing</span>
          </div>
        ) : isWaiting ? (
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1">
            <Loader2 className="w-3 h-3 text-white/50 animate-spin" />
            <span className="text-[10px] text-white/50 font-semibold">Rendering</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1">
            <Clock className="w-3 h-3 text-white/30" />
            <span className="text-[10px] text-white/30 font-semibold">Queued</span>
          </div>
        )}
      </div>

      {/* Scene type badge — top left */}
      <div className="absolute top-2 left-2">
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-1 backdrop-blur-sm",
            scene.sceneType === "performance"
              ? "bg-[--color-gold]/20 border border-[--color-gold]/30"
              : "bg-blue-500/20 border border-blue-500/30"
          )}
        >
          {scene.sceneType === "performance" ? (
            <Mic className="w-2.5 h-2.5 text-[--color-gold]" />
          ) : (
            <Film className="w-2.5 h-2.5 text-blue-300" />
          )}
          <span
            className={cn(
              "text-[9px] font-bold uppercase tracking-wide",
              scene.sceneType === "performance" ? "text-[--color-gold]" : "text-blue-300"
            )}
          >
            {scene.sceneType === "performance" ? "Perf" : "Cine"}
          </span>
        </div>
      </div>

      {/* Bottom: scene number + timestamp + play button */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold text-white leading-none">Scene {scene.sceneIndex + 1}</p>
          <p className="text-[10px] text-white/40 mt-0.5">{formatTime(scene.startTime)}</p>
        </div>
        {isReady && (
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
              "bg-white/20 backdrop-blur-sm",
              hovered && "bg-[--color-gold]/80 scale-110"
            )}
          >
            <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function RenderScenePreview({ jobId, jobStatus, className }: RenderScenePreviewProps) {
  const [lightboxScene, setLightboxScene] = useState<ScenePreview | null>(null);

  const isActive = jobStatus === "rendering" || jobStatus === "assembling";
  const isDone = jobStatus === "completed";

  const { data, refetch } = trpc.musicVideo.getScenePreviews.useQuery(
    { jobId },
    {
      refetchInterval: isActive ? 8000 : false,
      staleTime: isActive ? 0 : 60_000,
    }
  );

  const scenes = data?.scenes ?? [];
  const readyCount = scenes.filter((s) => s.previewState === "ready").length;
  const totalCount = scenes.length;

  if (totalCount === 0) return null;

  return (
    <>
      {lightboxScene && (
        <SceneLightbox scene={lightboxScene} onClose={() => setLightboxScene(null)} />
      )}

      <div className={cn("space-y-3", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">
              Scene Previews
            </p>
            <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
              {readyCount}/{totalCount} ready
            </span>
            {readyCount > 0 && (
              <span className="text-[10px] text-[--color-gold]/70 bg-[--color-gold]/10 border border-[--color-gold]/20 px-2 py-0.5 rounded-full">
                Click any scene to preview
              </span>
            )}
          </div>
          {isActive && (
            <div className="flex items-center gap-1.5 text-[10px] text-white/30">
              <Loader2 className="w-3 h-3 animate-spin" />
              Live
            </div>
          )}
          {isDone && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              All scenes ready
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-white/30">
          <div className="flex items-center gap-1">
            <Mic className="w-3 h-3 text-[--color-gold]/60" />
            <span>Performance — WizSync™ composited</span>
          </div>
          <div className="flex items-center gap-1">
            <Film className="w-3 h-3 text-blue-400/60" />
            <span>Cinematic — AI generated</span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene as ScenePreview}
              onOpen={setLightboxScene}
            />
          ))}
        </div>
      </div>
    </>
  );
}
