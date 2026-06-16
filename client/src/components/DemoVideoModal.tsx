/**
 * DemoVideoModal — clean video player for the WIZ AI demo video.
 * No separate audio tracks, no WizSound toggle, no caption overlays.
 * Just the video playing with its own audio.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize2 } from "@/lib/icons";
import { mp } from "@/lib/mixpanel";

const VIDEO_SRC = "/manus-storage/WizAiDemoVideoFINAL_cf182b1e.mp4";
const POSTER_URL = "/manus-storage/trailer-v2-poster_4a74cc1c.jpg";

interface DemoVideoModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoVideoModal({ open, onClose }: DemoVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Show play overlay immediately — don't wait for loadedMetadata (iOS fires it late)
  const [videoLoaded, setVideoLoaded] = useState(true);

  // Reset and play when modal opens
  useEffect(() => {
    if (!open) {
      const vid = videoRef.current;
      if (vid) {
        vid.pause();
        vid.currentTime = 0;
      }
      setPlaying(false);
      setCurrentTime(0);
      return;
    }
    // Auto-play when opened — iOS requires muted first, then unmute after user interaction
    const vid = videoRef.current;
    if (vid) {
      vid.currentTime = 0;
      // Try with sound first
      vid.muted = false;
      setIsMuted(false);
      const tryPlay = () => {
        vid.play()
          .then(() => setPlaying(true))
          .catch(() => {
            // Browser blocked autoplay with sound — start muted (required on iOS)
            vid.muted = true;
            setIsMuted(true);
            vid.play().then(() => setPlaying(true)).catch(() => {});
          });
      };
      // On iOS, readyState may be 0 — wait for canplay
      if (vid.readyState >= 2) {
        tryPlay();
      } else {
        vid.addEventListener("canplay", tryPlay, { once: true });
        vid.load();
      }
    }
    mp.demoVideoCompleted?.();
  }, [open]);

  // Sync muted state to video element
  useEffect(() => {
    const vid = videoRef.current;
    if (vid) vid.muted = isMuted;
  }, [isMuted]);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      vid.pause();
      setPlaying(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current;
    if (vid) setCurrentTime(vid.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const vid = videoRef.current;
    if (vid) setDuration(vid.duration);
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const vid = videoRef.current;
    if (!vid || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    vid.currentTime = ratio * duration;
  }, [duration]);

  const handleFullscreen = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    // iOS Safari uses webkitEnterFullscreen
    if ((vid as any).webkitEnterFullscreen) {
      (vid as any).webkitEnterFullscreen();
    } else if (vid.requestFullscreen) {
      vid.requestFullscreen().catch(() => {});
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === "Escape") onClose();
    if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
    if (e.key === "m") setIsMuted(m => !m);
  }, [open, onClose, togglePlay]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto py-4 sm:py-0"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full flex flex-col"
        style={{ maxWidth: 960, padding: "0 16px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video container */}
        <div
          className="relative w-full rounded-xl overflow-hidden bg-black"
          style={{ aspectRatio: "16/9", boxShadow: "0 0 80px rgba(0,0,0,0.8)" }}
        >
          {/* iOS Safari: muted attr required for autoplay, playsInline + webkit-playsinline both needed */}
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            poster={POSTER_URL}
            className="w-full h-full object-contain"
            playsInline
            muted
            preload="metadata"
            {...{ "webkit-playsinline": "true", "x-webkit-airplay": "allow" }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onClick={togglePlay}
            style={{ cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
          />

          {/* Play overlay when paused */}
          {!playing && videoLoaded && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
              onClick={togglePlay}
              style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "rgba(212,175,55,0.15)", border: "2px solid rgba(212,175,55,0.5)", backdropFilter: "blur(4px)" }}
              >
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
            </div>
          )}


        </div>

        {/* WizSound caption */}
        <div className="flex items-center justify-center gap-2 mt-2.5 mb-0.5">
          <img
            src="/manus-storage/wizsound-logo-new_c5cced65_d334a3bb.png"
            alt="WizSound"
            className="h-4 w-auto object-contain opacity-70"
          />
          <span className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: "rgba(212,175,55,0.55)" }}>
            Powered by WizSound™
          </span>
        </div>

        {/* Controls bar */}
        <div
          className="mt-2 px-1 flex flex-col gap-2"
        >
          {/* Progress bar */}
          <div
            className="w-full h-1.5 rounded-full bg-white/10 cursor-pointer group"
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full relative transition-all"
              style={{
                width: `${progressPercent}%`,
                background: "linear-gradient(90deg,#8c7830,#d4af37,#c4a464)",
              }}
            >
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Button row */}
          <div className="flex items-center gap-3">
            {/* Close — always visible on mobile */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setIsMuted(m => !m)}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="flex-1" />
            <span className="text-white/50 text-xs font-mono tabular-nums">
              {fmt(currentTime)} / {fmt(duration)}
            </span>
            <button
              type="button"
              onClick={handleFullscreen}
              className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors cursor-pointer"
              aria-label="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(s: number): string {
  const sec = Math.floor(s || 0);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
