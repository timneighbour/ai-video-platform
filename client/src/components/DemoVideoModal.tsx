/**
 * DemoVideoModal — video player with WizLumina™ Standard / Cinematic comparison toggle.
 * Lets viewers switch between the standard demo and the WizLumina Cinematic grade
 * to experience the visual uplift before committing to a render.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize2 } from "@/lib/icons";
import { mp } from "@/lib/mixpanel";

const VIDEO_STANDARD = "/manus-storage/WizAiDemoVideoFINAL_cf182b1e.mp4";
const VIDEO_CINEMATIC = "/manus-storage/std-tier-cinematic-v6_6caf492a.mp4";
const POSTER_URL = "/manus-storage/trailer-v2-poster_4a74cc1c.jpg";
const WIZLUMINA_LOGO = "/manus-storage/wizlumina-logo-new_0709f3c5_83ddc673.png";
const WIZSOUND_LOGO = "/manus-storage/wizsound-logo-new_c5cced65_d334a3bb.png";

type DemoTier = "standard" | "cinematic";

const TIERS: { key: DemoTier; label: string; badge: string | null; accentColor: string }[] = [
  { key: "standard", label: "Standard", badge: null, accentColor: "rgba(180,180,180,0.7)" },
  {
    key: "cinematic",
    label: "Cinematic",
    badge: "WizLumina™",
    accentColor: "rgba(212,175,55,0.9)",
  },
];

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
  const [tier, setTier] = useState<DemoTier>("standard");
  const [switching, setSwitching] = useState(false);

  const videoSrc = tier === "cinematic" ? VIDEO_CINEMATIC : VIDEO_STANDARD;

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
      setTier("standard");
      return;
    }
    // Auto-play when opened
    const vid = videoRef.current;
    if (vid) {
      vid.currentTime = 0;
      vid.muted = false;
      setIsMuted(false);
      const tryPlay = () => {
        vid.play()
          .then(() => setPlaying(true))
          .catch(() => {
            vid.muted = true;
            setIsMuted(true);
            vid.play().then(() => setPlaying(true)).catch(() => {});
          });
      };
      if (vid.readyState >= 2) {
        tryPlay();
      } else {
        vid.addEventListener("canplay", tryPlay, { once: true });
        vid.load();
      }
    }
    mp.demoVideoCompleted?.();
  }, [open]);

  // Handle tier switch — preserve playback position
  const handleTierChange = useCallback((newTier: DemoTier) => {
    if (newTier === tier) return;
    const vid = videoRef.current;
    const savedTime = vid?.currentTime ?? 0;
    const wasPlaying = !vid?.paused;
    setSwitching(true);
    setTier(newTier);
    mp.track?.("Demo Tier Switched", { tier: newTier });
    // After src change, restore position and resume
    setTimeout(() => {
      const v = videoRef.current;
      if (!v) { setSwitching(false); return; }
      v.load();
      const onCanPlay = () => {
        v.currentTime = savedTime;
        if (wasPlaying) {
          v.play().then(() => setPlaying(true)).catch(() => {});
        }
        setSwitching(false);
      };
      v.addEventListener("canplay", onCanPlay, { once: true });
    }, 50);
  }, [tier]);

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
  const isCinematic = tier === "cinematic";
  const accentColor = isCinematic ? "rgba(212,175,55,0.9)" : "rgba(180,180,180,0.7)";
  const glowColor = isCinematic ? "rgba(212,175,55,0.15)" : "transparent";

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
        {/* Tier toggle */}
        <div className="flex items-center justify-center gap-2 mb-3">
          {TIERS.map((t) => {
            const isActive = tier === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTierChange(t.key)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer"
                style={{
                  background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                  border: `1px solid ${isActive ? t.accentColor : "rgba(255,255,255,0.12)"}`,
                  color: isActive ? t.accentColor : "rgba(255,255,255,0.35)",
                  boxShadow: isActive && t.key === "cinematic" ? `0 0 16px ${glowColor}` : "none",
                }}
              >
                {t.badge && (
                  <img src={WIZLUMINA_LOGO} alt="WizLumina" className="h-3.5 w-auto object-contain opacity-90" />
                )}
                {t.label}
                {isActive && t.key === "cinematic" && (
                  <span
                    className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-full ml-0.5"
                    style={{ background: "rgba(212,175,55,0.15)", color: "rgba(212,175,55,0.9)" }}
                  >
                    HDR · 4K
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Video container */}
        <div
          className="relative w-full rounded-xl overflow-hidden bg-black transition-all duration-500"
          style={{
            aspectRatio: "16/9",
            boxShadow: isCinematic
              ? `0 0 80px rgba(0,0,0,0.8), 0 0 40px ${glowColor}`
              : "0 0 80px rgba(0,0,0,0.8)",
            border: `1px solid ${isCinematic ? "rgba(212,175,55,0.2)" : "transparent"}`,
          }}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            poster={POSTER_URL}
            className="w-full h-full object-contain transition-opacity duration-300"
            style={{ opacity: switching ? 0.4 : 1, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
            playsInline
            preload="metadata"
            {...{ "webkit-playsinline": "true", "x-webkit-airplay": "allow" }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onClick={togglePlay}
          />

          {/* Play overlay when paused */}
          {!playing && !switching && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
              onClick={togglePlay}
              style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: isCinematic ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.08)",
                  border: `2px solid ${accentColor}`,
                  backdropFilter: "blur(4px)",
                }}
              >
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
            </div>
          )}

          {/* Switching overlay */}
          {switching && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: accentColor }}>
                Switching…
              </div>
            </div>
          )}

          {/* Cinematic badge overlay */}
          {isCinematic && (
            <div
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(212,175,55,0.35)", backdropFilter: "blur(6px)" }}
            >
              <img src={WIZLUMINA_LOGO} alt="WizLumina" className="h-3 w-auto object-contain" />
              <span className="text-[10px] font-bold tracking-wider" style={{ color: "rgba(212,175,55,0.9)" }}>
                WizLumina™ Cinematic
              </span>
            </div>
          )}
        </div>

        {/* Engine caption */}
        <div className="flex items-center justify-center gap-2 mt-2.5 mb-0.5">
          {isCinematic ? (
            <>
              <img src={WIZLUMINA_LOGO} alt="WizLumina" className="h-4 w-auto object-contain opacity-70" />
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: "rgba(212,175,55,0.55)" }}>
                WizLumina™ · Film-Grade Colour · HDR · 4K
              </span>
            </>
          ) : (
            <>
              <img src={WIZSOUND_LOGO} alt="WizSound" className="h-4 w-auto object-contain opacity-70" />
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: "rgba(212,175,55,0.55)" }}>
                Powered by WizSound™
              </span>
            </>
          )}
        </div>

        {/* Controls bar */}
        <div className="mt-2 px-1 flex flex-col gap-2">
          {/* Progress bar */}
          <div
            className="w-full h-1.5 rounded-full bg-white/10 cursor-pointer group"
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full relative transition-all"
              style={{
                width: `${progressPercent}%`,
                background: isCinematic
                  ? "linear-gradient(90deg,#8c7830,#d4af37,#c4a464)"
                  : "linear-gradient(90deg,#666,#aaa,#888)",
              }}
            >
              <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Button row */}
          <div className="flex items-center gap-3">
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
