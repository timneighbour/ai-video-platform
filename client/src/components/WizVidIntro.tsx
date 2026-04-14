/**
 * WizVidIntro — Cinematic Trailer (Apr 2026)
 *
 * Single-file 30s trailer with burned-in text and BGM.
 * - Starts MUTED (browser autoplay policy compliance)
 * - Sound toggle always visible
 * - Video STOPS at final frame (does NOT loop)
 * - "Enter Site" CTA appears at end
 * - Skip button always available
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, X, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const TRAILER_URL = `${CDN}/wizvid-intro-v6_41ca86e4.mp4`;
const LOGO = `${CDN}/wizvid-logo-transparent_fcdb69d6.png`;

export const INTRO_SEEN_KEY = "wizvid_intro_v6_seen";

// CTA appears when video ends (video is ~37.5s); timer fires at 36s as backup
const CTA_SHOW_AT_MS = 36000;

interface WizVidIntroProps {
  onClose: () => void;
}

export default function WizVidIntro({ onClose }: WizVidIntroProps) {
  const [, navigate] = useLocation();

  const [muted, setMuted] = useState(true);
  const [showCTA, setShowCTA] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const isExitingRef = useRef(false);
  const ctaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start CTA timer when video begins playing
  const startCTATimer = useCallback(() => {
    if (ctaTimer.current) return;
    ctaTimer.current = setTimeout(() => {
      if (!isExitingRef.current) setShowCTA(true);
    }, CTA_SHOW_AT_MS);
  }, []);

  // When video ends, show CTA immediately
  const handleVideoEnd = useCallback(() => {
    if (!isExitingRef.current) setShowCTA(true);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.muted = true;
    v.playsInline = true;
    v.loop = false; // MUST NOT loop — stop at final frame

    const onCanPlay = () => {
      setVideoReady(true);
      v.play().catch(() => {});
      startCTATimer();
    };

    const onPlay = () => startCTATimer();

    v.addEventListener("canplay", onCanPlay, { once: true });
    v.addEventListener("play", onPlay);
    v.addEventListener("ended", handleVideoEnd);

    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("ended", handleVideoEnd);
      if (ctaTimer.current) clearTimeout(ctaTimer.current);
    };
  }, [startCTATimer, handleVideoEnd]);

  // Sync mute state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
  }, [muted]);

  const dismiss = useCallback((destination?: string) => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsExiting(true);
    if (ctaTimer.current) clearTimeout(ctaTimer.current);
    const v = videoRef.current;
    if (v) { v.pause(); v.src = ""; }
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
        preload="auto"
        crossOrigin="anonymous"
      />

      {/* ── Loading state — black screen while buffering ── */}
      {!videoReady && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
        </div>
      )}

      {/* ── Cinematic vignette ──────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          pointerEvents: "none",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 75%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* ── Skip (top-left) ─────────────────────── */}
      <button
        onClick={() => dismiss()}
        className="absolute top-5 left-5 flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/60 hover:text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm"
        style={{ zIndex: 20, cursor: "pointer" }}
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
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm"
          style={{ cursor: "pointer" }}
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
            className="group relative inline-flex items-center gap-3 px-14 py-4 rounded-full text-base font-semibold text-white transition-all duration-300 hover:scale-105"
            style={{
              cursor: "pointer",
              background: "linear-gradient(135deg, rgba(139,92,246,0.95) 0%, rgba(109,40,217,1) 100%)",
              boxShadow: "0 0 50px rgba(139,92,246,0.6), 0 0 100px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.18)",
              animation: "ctaPulse 2.8s ease-in-out infinite",
              letterSpacing: "0.04em",
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
