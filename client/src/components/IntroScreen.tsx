/**
 * IntroScreen — Full-screen cinematic pre-homepage intro video experience.
 *
 * Behaviour:
 * - Appears ONCE per browser session (sessionStorage gated)
 * - Starts muted (browser autoplay policy) — user can unmute via the toggle
 * - Mute/unmute button persists state during the session
 * - "Skip Intro" and "Enter WIZ AI" both dismiss the intro
 * - Smooth fade-out transition into the homepage
 * - Falls back to homepage after 12 s if video fails to load (iOS needs more time)
 * - Portrait mode: video uses contain so full frame is visible (no text cut-off)
 * - Landscape mode: video uses cover for full cinematic widescreen look
 * - Replay can be triggered externally via sessionStorage.removeItem + reload
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronRight, Play, Volume2, VolumeX } from "@/lib/icons";
import { INTRO_SESSION_KEY } from "@/lib/introReplay";

const VIDEO_URL =
  "/manus-storage/WizAIIntroVidMAIN_a2651b4e.mp4";
// No poster — we show a pure black screen while the video buffers to avoid any image flash on iOS Safari

// iOS Safari needs significantly more time to buffer
// If video doesn't fire canplay in 8s, show it anyway (readyState check) or dismiss
const LOAD_TIMEOUT_MS = 8000;

// Session key to remember mute preference
const MUTE_SESSION_KEY = "wizai_intro_muted";

interface IntroScreenProps {
  onComplete: () => void;
}

function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(
    () => window.innerWidth > window.innerHeight
  );

  useEffect(() => {
    const update = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    // orientationchange fires before dimensions update — re-check after short delay
    const handleOrientationChange = () => setTimeout(update, 100);
    window.addEventListener("orientationchange", handleOrientationChange);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  return isLandscape;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showPlayHint, setShowPlayHint] = useState(false);
  // Start muted (required for autoplay) — user can toggle
  const [isMuted, setIsMuted] = useState(true);
  const dismissedRef = useRef(false);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLandscape = useOrientation();

  // ── Dismiss helper ────────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setVisible(false);
    setTimeout(() => {
      onComplete();
    }, 600);
  }, [onComplete]);

  // ── Load-timeout fallback — iOS needs more time ─────────────────────────
  useEffect(() => {
    // Poll every 500ms: if video has enough data (readyState >= 2), show it
    // even if canplay event hasn't fired (iOS Safari quirk)
    const pollInterval = setInterval(() => {
      const video = videoRef.current;
      if (!video || videoReady) { clearInterval(pollInterval); return; }
      if (video.readyState >= 2) {
        setVideoReady(true);
        clearInterval(pollInterval);
        if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
        video.play().catch(() => setShowPlayHint(true));
      }
    }, 500);

    loadTimerRef.current = setTimeout(() => {
      clearInterval(pollInterval);
      if (!videoReady) {
        // On iOS Low Power Mode or strict autoplay block — just dismiss gracefully
        dismiss();
      }
    }, LOAD_TIMEOUT_MS);

    return () => {
      clearInterval(pollInterval);
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [videoReady, dismiss]);

  // ── Show controls after brief delay ──────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setShowControls(true), 800);
    return () => clearTimeout(t);
  }, []);

  // ── Auto-dismiss when video ends ──────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnded = () => dismiss();
    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [dismiss]);

  // ── iOS Safari: force load() on mount to kick off buffering ──────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Explicitly call load() — iOS Safari sometimes ignores src until load() is called
    video.load();
  }, []);

  // ── Sync muted state to video element ────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    // If unmuting and video is paused due to autoplay block, try playing
    if (!isMuted && video.paused) {
      video.play().catch(() => {
        // If play fails after unmute, re-mute and show hint
        setIsMuted(true);
      });
    }
  }, [isMuted]);

  // ── Video ready ───────────────────────────────────────────────────────────
  const handleCanPlay = () => {
    setVideoReady(true);
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    // Always start muted for autoplay compliance
    if (videoRef.current) videoRef.current.muted = true;
    videoRef.current?.play().catch(() => {
      setShowPlayHint(true);
    });
  };

  // ── Handle stall: try reloading on iOS ───────────────────────────────────
  const handleStalled = () => {
    const video = videoRef.current;
    if (!video || videoReady) return;
    const currentSrc = video.src;
    if (currentSrc) {
      video.load();
    }
  };

  // ── Manual play (when autoplay is blocked) ─────────────────────────────────
  const handleManualPlay = () => {
    videoRef.current?.play().catch(() => {});
    setShowPlayHint(false);
  };

  // ── Toggle mute ───────────────────────────────────────────────────────────
  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  // ── Determine video fit based on orientation ──────────────────────────────
  const videoObjectFit = isLandscape ? "cover" : "contain";

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease-in-out",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* ── Black screen while video buffers — no poster image to avoid iOS flash ── */}
      {!videoReady && (
        <div className="absolute inset-0 bg-black" />
      )}

      {/* ── Video ─────────────────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        muted
        playsInline
        // iOS-specific attributes for reliable autoplay
        {...({ "webkit-playsinline": "true", "x-webkit-airplay": "deny" } as any)}
        preload="metadata"
        onCanPlay={handleCanPlay}
        onCanPlayThrough={handleCanPlay}
        onError={() => dismiss()}
        onStalled={handleStalled}
        onWaiting={() => { /* iOS buffer pause — will resume automatically */ }}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: videoReady ? 1 : 0,
          transition: "opacity 0.4s ease",
          objectFit: videoObjectFit,
          objectPosition: "center center",
          width: "100%",
          height: "100%",
          WebkitAppearance: "none",
        }}
      />

      {/* ── Subtle dark vignette overlay ─────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isLandscape
            ? "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 40%, rgba(0,0,0,0.15) 100%)"
            : "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 30%, rgba(0,0,0,0.3) 100%)",
        }}
      />

      {/* ── Manual play hint (when autoplay is blocked) ───────────────────── */}
      {showPlayHint && (
        <button
          onClick={handleManualPlay}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 cursor-pointer"
          aria-label="Play intro"
        >
          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/20 transition-all">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
          <p className="text-white/70 text-sm tracking-widest uppercase">Tap to play</p>
        </button>
      )}

      {/* ── Controls overlay ─────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col justify-between pointer-events-none"
        style={{
          opacity: showControls ? 1 : 0,
          transition: "opacity 0.5s ease",
          // Respect iOS safe areas
          paddingTop: "max(env(safe-area-inset-top), 1.5rem)",
          paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)",
          paddingLeft: "max(env(safe-area-inset-left), 1.5rem)",
          paddingRight: "max(env(safe-area-inset-right), 1.5rem)",
        }}
      >
        {/* Top row — Mute toggle (left) + Skip Intro (right) */}
        <div className="flex justify-between items-center pointer-events-auto">
          {/* Mute / Unmute toggle */}
          <button
            onClick={toggleMute}
            className="flex items-center gap-2 text-white/50 hover:text-white/90 transition-colors text-xs tracking-[0.15em] uppercase font-medium"
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span className="hidden sm:inline">Sound Off</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-[#c4a464]" />
                <span className="hidden sm:inline text-[#c4a464]">Sound On</span>
              </>
            )}
          </button>

          {/* Skip Intro */}
          <button
            onClick={dismiss}
            className="text-white/40 hover:text-white/80 transition-colors text-xs tracking-[0.2em] uppercase font-medium"
            aria-label="Skip intro"
          >
            Skip Intro
          </button>
        </div>

        {/* Bottom row — Enter WIZ AI perfectly centred */}
        <div className="flex justify-center pointer-events-auto pb-4">
          <button
            onClick={dismiss}
            aria-label="Enter WIZ AI"
            style={{
              background: "linear-gradient(135deg, #c4a464 0%, #e8c97a 45%, #c4a464 100%)",
              backgroundSize: "200% 100%",
              boxShadow: "0 0 32px rgba(196,164,100,0.45), 0 0 8px rgba(196,164,100,0.25), inset 0 1px 0 rgba(255,255,255,0.25)",
              border: "1px solid rgba(255,255,255,0.15)",
              letterSpacing: "0.12em",
            }}
            className="group relative flex items-center gap-3 px-10 py-4 rounded-full text-[#0a0a14] font-bold text-sm uppercase tracking-widest transition-all duration-300 hover:scale-105 hover:shadow-[0_0_48px_rgba(196,164,100,0.65)]"
          >
            {/* Inner shimmer line */}
            <span
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: "linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
              }}
            />
            <span className="relative">Enter WIZ AI</span>
            <ChevronRight className="relative w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
