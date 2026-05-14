import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, CheckCircle, RotateCcw, Play, Pause, Volume2, VolumeX, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ScenePreviewData {
  id: number;
  index: number;
  sceneIndex?: number;
  videoUrl: string | null;
  lipSyncVideoUrl?: string | null;
  lipSyncStatus?: string | null;
  audioUrl?: string | null; // Full track audio URL
  audioStartTime?: number;  // Scene start time in seconds
  audioDuration?: number;   // Scene duration in seconds
  lyrics?: string | null;
  prompt?: string | null;
  isApproved?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  scenes: ScenePreviewData[];
  initialSceneIndex: number; // index into scenes array (not sceneIndex)
  onApprove?: (sceneId: number) => void;
  onRerender?: (sceneId: number) => void;
  jobAudioUrl?: string | null;
}

export function SceneLipSyncPreviewModal({
  open,
  onClose,
  scenes,
  initialSceneIndex,
  onApprove,
  onRerender,
  jobAudioUrl,
}: Props) {
  const [currentIdx, setCurrentIdx] = useState(initialSceneIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number | null>(null);
  const driftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scene = scenes[currentIdx];

  // The video to play: prefer lipSyncVideoUrl (has lip sync), fall back to videoUrl
  const videoSrc = scene?.lipSyncVideoUrl || scene?.videoUrl || null;
  const audioSrc = scene?.audioUrl || jobAudioUrl || null;
  const audioStart = scene?.audioStartTime ?? 0;

  // Reset when scene changes
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setVideoLoaded(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (driftTimerRef.current) clearInterval(driftTimerRef.current);
  }, [currentIdx, videoSrc]);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setCurrentIdx(initialSceneIndex);
    } else {
      // Stop everything on close
      setIsPlaying(false);
      videoRef.current?.pause();
      audioRef.current?.pause();
    }
  }, [open, initialSceneIndex]);

  // Keyboard controls
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
      if (e.key === "m") toggleMute();
      if (e.key === "ArrowLeft" && currentIdx > 0) setCurrentIdx(i => i - 1);
      if (e.key === "ArrowRight" && currentIdx < scenes.length - 1) setCurrentIdx(i => i + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, currentIdx, scenes.length]);

  // Progress tracking via rAF
  const trackProgress = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    setProgress(vid.currentTime);
    setDuration(vid.duration || 0);
    rafRef.current = requestAnimationFrame(trackProgress);
  }, []);

  // Drift correction: keep audio aligned to video
  useEffect(() => {
    if (!isPlaying) return;
    driftTimerRef.current = setInterval(() => {
      const vid = videoRef.current;
      const aud = audioRef.current;
      if (!vid || !aud || vid.paused) return;
      const expectedAudioTime = audioStart + vid.currentTime;
      const drift = Math.abs(aud.currentTime - expectedAudioTime);
      if (drift > 0.2) {
        aud.currentTime = expectedAudioTime;
      }
    }, 300);
    return () => {
      if (driftTimerRef.current) clearInterval(driftTimerRef.current);
    };
  }, [isPlaying, audioStart]);

  const togglePlay = useCallback(async () => {
    const vid = videoRef.current;
    const aud = audioRef.current;
    if (!vid) return;

    if (isPlaying) {
      vid.pause();
      aud?.pause();
      setIsPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } else {
      // Sync audio to correct position before playing
      if (aud && audioSrc) {
        aud.currentTime = audioStart + vid.currentTime;
        aud.muted = isMuted;
      }
      try {
        // Start both in the same tick for mobile Safari autoplay compliance
        const playPromises = [vid.play()];
        if (aud && audioSrc) playPromises.push(aud.play());
        await Promise.all(playPromises);
        setIsPlaying(true);
        rafRef.current = requestAnimationFrame(trackProgress);
      } catch {
        // Fallback: muted autoplay
        vid.muted = true;
        await vid.play();
        setIsPlaying(true);
        rafRef.current = requestAnimationFrame(trackProgress);
      }
    }
  }, [isPlaying, isMuted, audioSrc, audioStart, trackProgress]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) videoRef.current.muted = newMuted;
    if (audioRef.current) audioRef.current.muted = newMuted;
  }, [isMuted]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const vid = videoRef.current;
    if (!vid || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * duration;
    vid.currentTime = newTime;
    if (audioRef.current && audioSrc) {
      audioRef.current.currentTime = audioStart + newTime;
    }
    setProgress(newTime);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    audioRef.current?.pause();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setProgress(0);
    if (videoRef.current) videoRef.current.currentTime = 0;
    if (audioRef.current) audioRef.current.currentTime = audioStart;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!open || !scene) return null;

  const hasLipSync = !!(scene.lipSyncVideoUrl);
  const lipSyncPending = scene.lipSyncStatus === "processing" || scene.lipSyncStatus === "pending";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-5xl mx-4 flex flex-col gap-3">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-sm font-mono">
              SCENE {(scene.sceneIndex ?? scene.index) + 1} / {scenes.length}
            </span>
            {hasLipSync ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                <Music className="w-3 h-3 mr-1" /> LIP SYNC READY
              </Badge>
            ) : lipSyncPending ? (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs animate-pulse">
                <Music className="w-3 h-3 mr-1" /> LIP SYNC PROCESSING…
              </Badge>
            ) : (
              <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30 text-xs">
                RAW VIDEO (no lip sync yet)
              </Badge>
            )}
            {scene.isApproved && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" /> APPROVED
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Video Player ── */}
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
          {videoSrc ? (
            <>
              <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-contain"
                playsInline
                onLoadedData={() => setVideoLoaded(true)}
                onEnded={handleVideoEnded}
                onError={(e) => console.error("[ScenePreview] Video error:", e)}
              />

              {/* Separate audio track for the full song (synced to scene start time) */}
              {audioSrc && (
                <audio
                  ref={audioRef}
                  src={audioSrc}
                  preload="metadata"
                  onLoadedMetadata={() => {
                    if (audioRef.current) audioRef.current.currentTime = audioStart;
                  }}
                />
              )}

              {/* Click-to-play overlay */}
              {videoLoaded && (
                <div
                  className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                  onClick={togglePlay}
                >
                  {!isPlaying && (
                    <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center group-hover:bg-black/80 transition-all">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                  )}
                </div>
              )}

              {/* Lyrics overlay */}
              {scene.lyrics && (
                <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none px-8">
                  <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 max-w-2xl text-center">
                    <p className="text-white text-sm font-medium leading-relaxed italic">
                      ♪ {scene.lyrics}
                    </p>
                  </div>
                </div>
              )}

              {/* Transport controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
                {/* Progress bar */}
                <div
                  className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 hover:h-2.5 transition-all"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full bg-amber-400 rounded-full transition-none"
                    style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : "0%" }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={togglePlay} className="text-white hover:text-amber-400 transition-colors">
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-white/60 text-xs font-mono ml-auto">
                    {fmt(progress)} / {fmt(duration)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Scene still rendering…</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Scene info ── */}
        {scene.prompt && (
          <p className="text-white/50 text-xs leading-relaxed px-1 line-clamp-2">
            {scene.prompt}
          </p>
        )}

        {/* ── Controls row ── */}
        <div className="flex items-center justify-between gap-3">
          {/* Prev / Next */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(i => i - 1)}
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentIdx === scenes.length - 1}
              onClick={() => setCurrentIdx(i => i + 1)}
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Scene dot indicators */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {scenes.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrentIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIdx
                    ? "bg-amber-400 scale-125"
                    : s.isApproved
                    ? "bg-green-400"
                    : s.videoUrl
                    ? "bg-white/40"
                    : "bg-white/15"
                }`}
                title={`Scene ${(s.sceneIndex ?? s.index) + 1}`}
              />
            ))}
          </div>

          {/* Approve / Re-render */}
          <div className="flex gap-2">
            {onRerender && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRerender(scene.id)}
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Re-render
              </Button>
            )}
            {onApprove && (
              <Button
                size="sm"
                onClick={() => onApprove(scene.id)}
                disabled={scene.isApproved}
                className={scene.isApproved
                  ? "bg-green-500/20 text-green-400 border border-green-500/30 cursor-default"
                  : "bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                }
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                {scene.isApproved ? "Approved" : "Approve"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
