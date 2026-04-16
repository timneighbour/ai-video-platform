/*
 * WizVidIntro — Cinematic Trailer v6 (Apr 2026)
 *
 * B&W eerie opening → vortex → near-silence drop at 4s → IMPACT "There is." at 4.5s → colour explosion → WizAI logo.
 * Signature line: "Every idea begins as nothing" → "If ever there was a Wiz…" → PAUSE → "There is." → "Create without limits" → "Welcome to WizVid".
 * Text overlays baked in: Inter 600/700, bottom-centre, cinematic fade+rise, violet glow post-impact.
 *
 * Cross-device compatible:
 * - iOS Safari / Chrome: playsinline + muted autoplay + canplaythrough fallback
 * - Android Chrome/Firefox: standard muted autoplay
 * - Desktop: all browsers supported
 * - Fallback: manual play button if autoplay blocked
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, X, ChevronRight, Play } from "lucide-react";
import { useLocation } from "wouter";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
// v6 — 10.5s cinematic: B&W → vortex → near-silence drop → IMPACT "There is." at 4.5s → colour → worlds → WizAI logo
const TRAILER_URL = `${CDN}/wizvid-intro-v6_3c5b4ab8.mp4`;
const LOGO = `${CDN}/wizvid-logo-transparent_fcdb69d6.png`;

export const INTRO_SEEN_KEY = "wizvid_intro_v6_seen";

// CTA appears when video ends (~10.5s); timer fires at 10s as backup
const CTA_SHOW_AT_MS = 10000;

interface WizVidIntroProps {
  onClose: () => void;
}

export default function WizVidIntro({ onClose }: WizVidIntroProps) {
  const [, navigate] = useLocation();

  const [muted, setMuted] = useState(true);
  const [showCTA, setShowCTA] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const isExitingRef = useRef(false);
  const ctaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedRef = useRef(false);

  // Start CTA timer — idempotent
  const startCTATimer = useCallback(() => {
    if (ctaTimer.current) return;
    ctaTimer.current = setTimeout(() => {
      if (!isExitingRef.current) setShowCTA(true);
    }, CTA_SHOW_AT_MS);
  }, []);

  const handleVideoEnd = useCallback(() => {
    if (!isExitingRef.current) setShowCTA(true);
  }, []);

  // Attempt to play — handles iOS autoplay policy
  const attemptPlay = useCallback(async (v: HTMLVideoElement) => {
    if (hasStartedRef.current) return;
    try {
      v.muted = true; // MUST be muted for iOS autoplay
      await v.play();
      hasStartedRef.current = true;
      setAutoplayBlocked(false);
      startCTATimer();
    } catch {
      // Autoplay blocked (e.g. low-power mode on iOS)
      setAutoplayBlocked(true);
    }
  }, [startCTATimer]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // iOS CRITICAL: these must be set as attributes AND properties
    v.muted = true;
    v.playsInline = true;
    v.loop = false;
    v.preload = "metadata";

    const onCanPlayThrough = () => {
      setVideoReady(true);
      attemptPlay(v);
    };

    const onCanPlay = () => {
      setVideoReady(true);
      // On iOS, canplaythrough may never fire — canplay is enough
      attemptPlay(v);
    };

    const onLoadedMetadata = () => {
      // Fallback for slow connections — try play as soon as metadata is ready
      setTimeout(() => attemptPlay(v), 100);
    };

    const onPlay = () => {
      hasStartedRef.current = true;
      setAutoplayBlocked(false);
      startCTATimer();
    };

    v.addEventListener("canplaythrough", onCanPlayThrough, { once: true });
    v.addEventListener("canplay", onCanPlay, { once: true });
    v.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    v.addEventListener("play", onPlay);
    v.addEventListener("ended", handleVideoEnd);

    // Force load on iOS (sometimes needed after setting src)
    v.load();

    return () => {
      v.removeEventListener("canplaythrough", onCanPlayThrough);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("ended", handleVideoEnd);
      if (ctaTimer.current) clearTimeout(ctaTimer.current);
    };
  }, [attemptPlay, startCTATimer, handleVideoEnd]);

  // Sync mute state — must re-apply after user interaction on iOS
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
  }, [muted]);

  // Manual play when autoplay is blocked
  const handleManualPlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = true;
      await v.play();
      hasStartedRef.current = true;
      setAutoplayBlocked(false);
      startCTATimer();
    } catch {
      // Still blocked — show CTA immediately
      setShowCTA(true);
    }
  }, [startCTATimer]);

  const dismiss = useCallback((destination?: string) => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsExiting(true);
    if (ctaTimer.current) clearTimeout(ctaTimer.current);
    const v = videoRef.current;
    if (v) {
      v.pause();
      // Properly release audio context before clearing src
      v.muted = true;
      setTimeout(() => { v.src = ""; v.load(); }, 50);
    }
    setTimeout(() => {
      onClose();
      if (destination) navigate(destination);
    }, 600);
  }, [onClose, navigate]);

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden bg-black select-none"
      style={{
        opacity: isExiting ? 0 : 1,
        transition: isExiting ? "opacity 600ms ease" : "opacity 800ms ease",
        pointerEvents: isExiting ? "none" : "auto",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="WizVid cinematic intro"
    >
      {/* ── Trailer video ─────────────────────────── */}
      {/* NOTE: crossOrigin removed — causes CORS block on iOS Safari with some CDNs */}
      <video
        ref={videoRef}
        src={TRAILER_URL}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: videoReady ? 1 : 0,
          transition: "opacity 800ms ease",
          zIndex: 0,
          pointerEvents: "none",
        }}
        muted
        playsInline
        preload="metadata"
      />

      {/* ── Loading spinner — shown while buffering ── */}
      {!videoReady && !autoplayBlocked && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
        </div>
      )}

      {/* ── Autoplay blocked fallback — manual play button ── */}
      {autoplayBlocked && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-6"
          style={{ zIndex: 15 }}
        >
          {/* Logo */}
          <img src={LOGO} alt="WizVid" className="w-[9.1rem] opacity-90" />
          <button
            onClick={handleManualPlay}
            className="flex items-center gap-3 px-10 py-4 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-lg font-bold transition-all duration-200 hover:scale-105"
            style={{
              boxShadow: "0 0 40px rgba(139,92,246,0.6)",
              textShadow: "0px 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            <Play className="w-6 h-6 fill-white" />
            Watch Intro
          </button>
          <button
            onClick={() => dismiss("/")}
            className="text-white/50 text-sm font-medium hover:text-white/80 transition-colors"
          >
            Skip intro →
          </button>
        </div>
      )}

      {/* ── Cinematic vignette + text protection overlay ──────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          pointerEvents: "none",
          background: [
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 12%, transparent 25%)",
            "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 18%, transparent 35%)",
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
          ].join(", "),
        }}
      />

      {/* ── Skip (top-left) ──────────────────── */}
      <button
        onClick={() => dismiss()}
        className="absolute top-5 left-5 flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/50 hover:bg-black/70 border border-white/25 text-white text-sm font-semibold transition-all duration-200 backdrop-blur-sm"
        style={{
          zIndex: 20,
          cursor: "pointer",
          textShadow: "0px 2px 8px rgba(0,0,0,0.9)",
        }}
        aria-label="Skip intro"
      >
        <X className="w-3.5 h-3.5" />
        Skip
      </button>

      {/* ── Sound toggle (top-right) ─────────────── */}
      <div className="absolute top-5 right-5 flex items-center gap-2" style={{ zIndex: 20 }}>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-fuchsia-500/30 backdrop-blur-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#d946ef" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-fuchsia-300 text-[11px] font-bold tracking-wide">WizSound™</span>
        </div>
        <button
          onClick={() => setMuted(m => !m)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 hover:bg-black/70 border border-white/25 text-white text-sm font-semibold transition-all duration-200 backdrop-blur-sm"
          style={{
            cursor: "pointer",
            textShadow: "0px 2px 8px rgba(0,0,0,0.9)",
          }}
          aria-label={muted ? "Enable sound" : "Mute audio"}
        >
          {muted ? (
            <><VolumeX className="w-4 h-4" /><span className="hidden sm:inline">Enable Sound</span></>
          ) : (
            <><Volume2 className="w-4 h-4" /><span className="hidden sm:inline">Mute</span></>
          )}
        </button>
      </div>

      {/* ── Enter Site CTA — appears near end of trailer (bottom centre) ── */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-16 sm:pb-20 px-6 text-center"
        style={{ zIndex: 10 }}
      >
        <div
          style={{
            opacity: showCTA ? 1 : 0,
            transform: showCTA ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
            transition: "opacity 900ms cubic-bezier(0.16,1,0.3,1), transform 900ms cubic-bezier(0.16,1,0.3,1)",
            pointerEvents: showCTA ? "auto" : "none",
          }}
        >
          <button
            onClick={() => dismiss("/")}
            className="group relative inline-flex items-center gap-3 px-14 py-4 rounded-full text-base font-bold text-white transition-all duration-300 hover:scale-105"
            style={{
              cursor: "pointer",
              background: "linear-gradient(135deg, rgba(139,92,246,0.98) 0%, rgba(109,40,217,1) 100%)",
              boxShadow: "0 0 50px rgba(139,92,246,0.6), 0 0 100px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.18)",
              animation: "ctaPulse 2.8s ease-in-out infinite",
              letterSpacing: "0.06em",
              textShadow: "0px 2px 12px rgba(0,0,0,0.8)",
              color: "#FFFFFF",
            }}
          >
            Enter Site
            <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 50px rgba(139,92,246,0.6), 0 0 100px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.18); }
          50%       { box-shadow: 0 0 80px rgba(139,92,246,0.85), 0 0 150px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.18); }
        }
      `}</style>
    </div>
  );
}
