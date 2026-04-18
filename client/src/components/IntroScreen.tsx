/**
 * IntroScreen — Full-screen cinematic pre-homepage intro video experience.
 *
 * Behaviour:
 * - Appears ONCE per browser session (sessionStorage gated)
 * - Permanently muted (silent cinematic experience)
 * - "Skip Intro" and "Enter WIZ AI" both dismiss the intro
 * - Smooth fade-out transition into the homepage
 * - Falls back to homepage after 3 s if video fails to load
 * - Replay can be triggered externally via sessionStorage.removeItem + reload,
 *   or via the exported triggerIntroReplay() helper
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronRight, Play } from "lucide-react";
import { INTRO_SESSION_KEY } from "@/lib/introReplay";

const VIDEO_URL =
  "/manus-storage/wizai-intro-wizsound-pure_8c53762c.mp4"; // WizSound™ Pure — music-only, no narrator, 13-stage chain, -11.32 LUFS, 320kbps AAC
const POSTER_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-intro-poster_760474dc.jpg";

const LOAD_TIMEOUT_MS = 3000; // fall back to homepage if video stalls

interface IntroScreenProps {
  onComplete: () => void;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(true);   // controls opacity fade
  const [showControls, setShowControls] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showPlayHint, setShowPlayHint] = useState(false);
  const dismissedRef = useRef(false);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Dismiss helper ────────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    // Pause video immediately to avoid audio bleed
    if (videoRef.current) {
      videoRef.current.pause();
    }
    // Fade out, then hand off to parent
    setVisible(false);
    setTimeout(() => {
      onComplete();
    }, 600); // matches CSS transition duration
  }, [onComplete]);

  // ── Load-timeout fallback ─────────────────────────────────────────────────
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

  // ── Video ready ───────────────────────────────────────────────────────────
  const handleCanPlay = () => {
    setVideoReady(true);
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    // Attempt muted autoplay
    videoRef.current?.play().catch(() => {
      // Autoplay blocked — show play hint
      setShowPlayHint(true);
    });
  };

  // ── Manual play (when autoplay is blocked) ─────────────────────────────────
  const handleManualPlay = () => {
    videoRef.current?.play().catch(() => {});
    setShowPlayHint(false);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease-in-out",
        pointerEvents: visible ? "auto" : "none",
        // iOS safe area
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* ── Video ─────────────────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        poster={POSTER_URL}
        muted
        playsInline
        // iOS-specific attributes for reliable playback
        {...({ "webkit-playsinline": "true", "x-webkit-airplay": "deny" } as any)}
        // permanently muted — no audio
        preload="auto"
        onCanPlay={handleCanPlay}
        onError={() => dismiss()}
        onStalled={() => { videoRef.current?.load(); }}
        onWaiting={() => { /* buffer pause — iOS will resume */ }}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: videoReady ? 1 : 0,
          transition: "opacity 0.4s ease",
          // iOS object-fit fix — use explicit styles instead of Tailwind class
          objectFit: "cover",
          objectPosition: "center center",
          width: "100%",
          height: "100%",
          // Prevent iOS from showing native video controls
          WebkitAppearance: "none",
        }}
      />

      {/* ── Poster shown while video loads ───────────────────────────────── */}
      {!videoReady && (
        <img
          src={POSTER_URL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* ── Subtle dark vignette overlay ─────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

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
        className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8"
        style={{
          opacity: showControls ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        {/* Top row — empty (no sound toggle) */}
        <div />

        {/* Bottom row — Skip + Enter */}
        <div className="flex items-center justify-between">
          {/* Skip Intro */}
          <button
            onClick={dismiss}
            className="text-white/50 hover:text-white/90 transition-colors text-sm tracking-widest uppercase font-medium"
            aria-label="Skip intro"
          >
            Skip Intro
          </button>

          {/* Enter WIZ AI */}
          <button
            onClick={dismiss}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#b8892a] to-[#8a6520] text-white font-semibold text-sm tracking-wide hover:from-[#c99a3a] hover:to-[#9a7530] transition-all shadow-lg shadow-[#b8892a]/30 btn-sheen"
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
