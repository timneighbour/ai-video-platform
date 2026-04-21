/**
 * IntroScreen — Full-screen cinematic pre-homepage intro video experience.
 *
 * Behaviour:
 * - Appears ONCE per browser session (sessionStorage gated)
 * - Permanently muted (silent cinematic experience)
 * - "Skip Intro" and "Enter WIZ AI" both dismiss the intro
 * - Smooth fade-out transition into the homepage
 * - Falls back to homepage after 12 s if video fails to load (iOS needs more time)
 * - Portrait mode: video uses contain so full frame is visible (no text cut-off)
 * - Landscape mode: video uses cover for full cinematic widescreen look
 * - Replay can be triggered externally via sessionStorage.removeItem + reload
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronRight, Play } from "@/lib/icons";
import { INTRO_SESSION_KEY } from "@/lib/introReplay";

const VIDEO_URL =
  "/manus-storage/wizai-intro-wizsound-pure_8c53762c.mp4";
const POSTER_URL =
  "/manus-storage/studio-moody_02c867cc.jpg";

// iOS Safari needs significantly more time to buffer — use 12 s
const LOAD_TIMEOUT_MS = 12000;

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

  // ── Load-timeout fallback (12 s — iOS needs more time) ───────────────────
  useEffect(() => {
    loadTimerRef.current = setTimeout(() => {
      if (!videoReady) {
        dismiss();
      }
    }, LOAD_TIMEOUT_MS);
    return () => {
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

  // ── Video ready ───────────────────────────────────────────────────────────
  const handleCanPlay = () => {
    setVideoReady(true);
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    videoRef.current?.play().catch(() => {
      setShowPlayHint(true);
    });
  };

  // ── Handle stall: try reloading on iOS ───────────────────────────────────
  const handleStalled = () => {
    const video = videoRef.current;
    if (!video || videoReady) return;
    // On iOS, stalled can mean the video hasn't started buffering yet
    // Calling load() again can kick it back into gear
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

  // ── Determine video fit based on orientation ──────────────────────────────
  // Portrait: contain — shows full video frame, no text cut-off, black bars on sides
  // Landscape: cover — fills the full cinematic widescreen view
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
      {/* ── Poster shown while video loads ───────────────────────────────── */}
      {!videoReady && (
        <img
          src={POSTER_URL}
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: videoObjectFit,
            objectPosition: "center center",
          }}
        />
      )}

      {/* ── Video ─────────────────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        poster={POSTER_URL}
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
        {/* Top row — empty */}
        <div />

        {/* Bottom row — Skip left, Enter centred (above Crisp chat icon) */}
        <div className="relative flex items-end pointer-events-auto">
          {/* Skip Intro — bottom left */}
          <button
            onClick={dismiss}
            className="text-white/50 hover:text-white/90 transition-colors text-sm tracking-widest uppercase font-medium"
            aria-label="Skip intro"
          >
            Skip Intro
          </button>

          {/* Enter WIZ AI — absolute centre, raised 1rem above the bottom edge */}
          <button
            onClick={dismiss}
            className="absolute left-1/2 -translate-x-1/2 bottom-0 flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-[#b8892a] to-[#8a6520] text-white font-semibold text-sm tracking-wide hover:from-[#c99a3a] hover:to-[#9a7530] transition-all shadow-lg shadow-[#b8892a]/30 btn-sheen"
            aria-label="Enter WIZ AI"
          >
            Enter WIZ AI
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
