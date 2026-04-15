/**
 * WizVidIntro — Cinematic Trailer v20 (Apr 2026)
 *
 * Enhancements over v19:
 * - Animated logo reveal (fade + scale-up + glow pulse, timed to ~2s after play)
 * - WizSound™ + WizLumina™ branded badges in top-right corner
 * - Cinematic colour-balance CSS filter on video (contrast, saturation, brightness)
 * - Consistent cinematic vignette + film grain overlay for premium look
 * - All existing cross-device autoplay logic preserved
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, X, ChevronRight, Play } from "lucide-react";
import { useLocation } from "wouter";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const TRAILER_URL = `${CDN}/wizvid-intro-v19-final_c40a623c.mp4`;
const LOGO = `${CDN}/wizvid-logo-transparent_fcdb69d6.png`;

export const INTRO_SEEN_KEY = "wizvid_intro_v19_seen";

// CTA appears when video ends (~29s); timer fires at 27s as backup
const CTA_SHOW_AT_MS = 27000;
// Logo animates in 2s after playback starts
const LOGO_SHOW_AT_MS = 1800;

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
  const [showLogo, setShowLogo] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const isExitingRef = useRef(false);
  const ctaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedRef = useRef(false);

  const startCTATimer = useCallback(() => {
    if (ctaTimer.current) return;
    ctaTimer.current = setTimeout(() => {
      if (!isExitingRef.current) setShowCTA(true);
    }, CTA_SHOW_AT_MS);
  }, []);

  const startLogoTimer = useCallback(() => {
    if (logoTimer.current) return;
    logoTimer.current = setTimeout(() => {
      if (!isExitingRef.current) setShowLogo(true);
    }, LOGO_SHOW_AT_MS);
  }, []);

  const handleVideoEnd = useCallback(() => {
    if (!isExitingRef.current) setShowCTA(true);
  }, []);

  const attemptPlay = useCallback(async (v: HTMLVideoElement) => {
    if (hasStartedRef.current) return;
    try {
      v.muted = true;
      await v.play();
      hasStartedRef.current = true;
      setAutoplayBlocked(false);
      startCTATimer();
      startLogoTimer();
    } catch {
      setAutoplayBlocked(true);
    }
  }, [startCTATimer, startLogoTimer]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.muted = true;
    v.playsInline = true;
    v.loop = false;
    v.preload = "auto";

    const onCanPlayThrough = () => { setVideoReady(true); attemptPlay(v); };
    const onCanPlay = () => { setVideoReady(true); attemptPlay(v); };
    const onLoadedMetadata = () => { setTimeout(() => attemptPlay(v), 100); };
    const onPlay = () => {
      hasStartedRef.current = true;
      setAutoplayBlocked(false);
      startCTATimer();
      startLogoTimer();
    };

    v.addEventListener("canplaythrough", onCanPlayThrough, { once: true });
    v.addEventListener("canplay", onCanPlay, { once: true });
    v.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    v.addEventListener("play", onPlay);
    v.addEventListener("ended", handleVideoEnd);
    v.load();

    return () => {
      v.removeEventListener("canplaythrough", onCanPlayThrough);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("ended", handleVideoEnd);
      if (ctaTimer.current) clearTimeout(ctaTimer.current);
      if (logoTimer.current) clearTimeout(logoTimer.current);
    };
  }, [attemptPlay, startCTATimer, startLogoTimer, handleVideoEnd]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
  }, [muted]);

  const handleManualPlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = true;
      await v.play();
      hasStartedRef.current = true;
      setAutoplayBlocked(false);
      startCTATimer();
      startLogoTimer();
    } catch {
      setShowCTA(true);
    }
  }, [startCTATimer, startLogoTimer]);

  const dismiss = useCallback((destination?: string) => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsExiting(true);
    if (ctaTimer.current) clearTimeout(ctaTimer.current);
    if (logoTimer.current) clearTimeout(logoTimer.current);
    const v = videoRef.current;
    if (v) {
      v.pause();
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
      {/* ── Trailer video with cinematic colour-balance filter ── */}
      <video
        ref={videoRef}
        src={TRAILER_URL}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: videoReady ? 1 : 0,
          transition: "opacity 800ms ease",
          zIndex: 0,
          pointerEvents: "none",
          /* Cinematic colour balance: slight contrast boost, warm saturation, subtle brightness lift */
          filter: "contrast(1.08) saturate(1.18) brightness(1.04) hue-rotate(-3deg)",
        }}
        muted
        playsInline
        preload="auto"
      />

      {/* ── Film grain overlay for cinematic texture ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
          opacity: 0.35,
          mixBlendMode: "overlay",
        }}
      />

      {/* ── Cinematic vignette + text protection ── */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 2,
          pointerEvents: "none",
          background: [
            "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 12%, transparent 28%)",
            "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.35) 20%, transparent 40%)",
            "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.60) 100%)",
          ].join(", "),
        }}
      />

      {/* ── Loading spinner ── */}
      {!videoReady && !autoplayBlocked && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 5 }}>
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
        </div>
      )}

      {/* ── Autoplay blocked fallback ── */}
      {autoplayBlocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6" style={{ zIndex: 15 }}>
          <img src={LOGO} alt="WizVid" className="w-36 opacity-90 drop-shadow-[0_0_24px_rgba(139,92,246,0.7)]" />
          <button
            onClick={handleManualPlay}
            className="flex items-center gap-3 px-10 py-4 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-lg font-bold transition-all duration-200 hover:scale-105"
            style={{ boxShadow: "0 0 40px rgba(139,92,246,0.6)", textShadow: "0px 2px 8px rgba(0,0,0,0.8)" }}
          >
            <Play className="w-6 h-6 fill-white" />
            Watch Intro
          </button>
          <button onClick={() => dismiss("/")} className="text-white/50 text-sm font-medium hover:text-white/80 transition-colors">
            Skip intro →
          </button>
        </div>
      )}

      {/* ── Animated Logo (centre, fades in at ~1.8s) ── */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 8 }}
      >
        <div
          style={{
            opacity: showLogo && !showCTA ? 1 : 0,
            transform: showLogo && !showCTA ? "scale(1) translateY(0)" : "scale(0.82) translateY(12px)",
            transition: "opacity 1200ms cubic-bezier(0.16,1,0.3,1), transform 1200ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <img
            src={LOGO}
            alt="WizVid"
            className="w-44 sm:w-56"
            style={{
              filter: "drop-shadow(0 0 32px rgba(139,92,246,0.85)) drop-shadow(0 0 64px rgba(139,92,246,0.45))",
              animation: showLogo && !showCTA ? "logoPulse 3.5s ease-in-out infinite" : "none",
            }}
          />
        </div>
      </div>

      {/* ── Skip (top-left) ── */}
      <button
        onClick={() => dismiss()}
        className="absolute top-5 left-5 flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/50 hover:bg-black/70 border border-white/25 text-white text-sm font-semibold transition-all duration-200 backdrop-blur-sm"
        style={{ zIndex: 20, cursor: "pointer", textShadow: "0px 2px 8px rgba(0,0,0,0.9)" }}
        aria-label="Skip intro"
      >
        <X className="w-3.5 h-3.5" />
        Skip
      </button>

      {/* ── WizSound™ + WizLumina™ badges (top-right) ── */}
      <div className="absolute top-5 right-5 flex items-center gap-2" style={{ zIndex: 20 }}>
        {/* WizLumina™ badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-amber-400/30 backdrop-blur-sm">
          {/* Orb icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="5" fill="#f59e0b" opacity="0.9"/>
            <circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="1.5" opacity="0.35"/>
            <circle cx="12" cy="12" r="11.5" stroke="#f59e0b" strokeWidth="0.8" opacity="0.15"/>
          </svg>
          <span className="text-amber-300 text-[11px] font-bold tracking-wide">WizLumina™</span>
        </div>
        {/* WizSound™ badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-fuchsia-500/30 backdrop-blur-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#d946ef" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-fuchsia-300 text-[11px] font-bold tracking-wide">WizSound™</span>
        </div>
        {/* Sound toggle */}
        <button
          onClick={() => setMuted(m => !m)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 hover:bg-black/70 border border-white/25 text-white text-sm font-semibold transition-all duration-200 backdrop-blur-sm"
          style={{ cursor: "pointer", textShadow: "0px 2px 8px rgba(0,0,0,0.9)" }}
          aria-label={muted ? "Enable sound" : "Mute audio"}
        >
          {muted ? (
            <><VolumeX className="w-4 h-4" /><span className="hidden sm:inline">Enable Sound</span></>
          ) : (
            <><Volume2 className="w-4 h-4" /><span className="hidden sm:inline">Mute</span></>
          )}
        </button>
      </div>

      {/* ── Enter Site CTA ── */}
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
          {/* Logo above CTA */}
          <div className="mb-6 flex justify-center">
            <img
              src={LOGO}
              alt="WizVid"
              className="w-28 sm:w-36"
              style={{ filter: "drop-shadow(0 0 20px rgba(139,92,246,0.8))" }}
            />
          </div>
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
            Enter WizVid
            <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
          {/* WizSound + WizLumina attribution below CTA (mobile-visible) */}
          <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-fuchsia-300/80 text-[11px] font-semibold tracking-wide">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#d946ef" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              WizSound™
            </span>
            <span className="text-white/20 text-xs">·</span>
            <span className="flex items-center gap-1 text-amber-300/80 text-[11px] font-semibold tracking-wide">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" fill="#f59e0b" opacity="0.9"/><circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="1.5" opacity="0.35"/></svg>
              WizLumina™
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 50px rgba(139,92,246,0.6), 0 0 100px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.18); }
          50%       { box-shadow: 0 0 80px rgba(139,92,246,0.85), 0 0 150px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.18); }
        }
        @keyframes logoPulse {
          0%, 100% { filter: drop-shadow(0 0 28px rgba(139,92,246,0.8)) drop-shadow(0 0 56px rgba(139,92,246,0.4)); }
          50%       { filter: drop-shadow(0 0 44px rgba(139,92,246,1.0)) drop-shadow(0 0 88px rgba(139,92,246,0.6)); }
        }
      `}</style>
    </div>
  );
}
