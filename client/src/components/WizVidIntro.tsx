/*
 * WizVidIntro — Ultra-Premium v9 (Apr 2026)
 *
 * 10.0s cinematic intro: gold particles → formation → Wiz AI logo reveal
 * Text: "Welcome to the world of..." → 3s PAUSE → logo reveals "Wiz AI"
 * Video stops at end (no loop). Final frame holds. "Press to continue" baked in.
 * User clicks anywhere or taps "Enter Site" to proceed.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, X, ChevronRight, Play } from "lucide-react";
import { useLocation } from "wouter";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const TRAILER_URL = `${CDN}/wiz-intro-v9_e0245df6.mp4`;

export const INTRO_SEEN_KEY = "wizvid_v9_ultra_seen";

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
  const hasStartedRef = useRef(false);

  const handleVideoEnd = useCallback(() => {
    if (!isExitingRef.current) setShowCTA(true);
  }, []);

  // Attempt to play — handles iOS autoplay policy
  const attemptPlay = useCallback(async (v: HTMLVideoElement) => {
    if (hasStartedRef.current) return;
    try {
      v.muted = true;
      await v.play();
      hasStartedRef.current = true;
      setAutoplayBlocked(false);
    } catch {
      setAutoplayBlocked(true);
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.muted = true;
    v.playsInline = true;
    v.loop = false;
    v.preload = "metadata";

    const onCanPlay = () => {
      setVideoReady(true);
      attemptPlay(v);
    };

    const onLoadedMetadata = () => {
      setTimeout(() => attemptPlay(v), 100);
    };

    const onPlay = () => {
      hasStartedRef.current = true;
      setAutoplayBlocked(false);
    };

    v.addEventListener("canplay", onCanPlay, { once: true });
    v.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    v.addEventListener("play", onPlay);
    v.addEventListener("ended", handleVideoEnd);

    v.load();

    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("ended", handleVideoEnd);
    };
  }, [attemptPlay, handleVideoEnd]);

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
    } catch {
      setShowCTA(true);
    }
  }, []);

  const dismiss = useCallback((destination?: string) => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsExiting(true);
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
      aria-label="Wiz AI cinematic intro"
    >
      {/* ── Trailer video ── */}
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

      {/* ── Loading spinner ── */}
      {!videoReady && !autoplayBlocked && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
        </div>
      )}

      {/* ── Autoplay blocked fallback ── */}
      {autoplayBlocked && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-6"
          style={{ zIndex: 15 }}
        >
          <p className="text-white/70 text-lg font-medium tracking-wide">Welcome to the world of...</p>
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
            Skip intro
          </button>
        </div>
      )}

      {/* ── Skip (top-left) ── */}
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

      {/* ── Sound toggle (top-right) ── */}
      <div className="absolute top-5 right-5 flex items-center gap-2" style={{ zIndex: 20 }}>
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

      {/* ── Enter Site CTA — appears when video ends ── */}
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

      {/* ── Click anywhere to enter after video ends ── */}
      {showCTA && (
        <div
          className="absolute inset-0"
          style={{ zIndex: 5, cursor: "pointer" }}
          onClick={() => dismiss("/")}
        />
      )}

      <style>{`
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 50px rgba(139,92,246,0.6), 0 0 100px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.18); }
          50%       { box-shadow: 0 0 80px rgba(139,92,246,0.85), 0 0 150px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.18); }
        }
      `}</style>
    </div>
  );
}
