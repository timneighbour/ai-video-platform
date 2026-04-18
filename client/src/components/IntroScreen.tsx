/**
 * IntroScreen — Full-screen cinematic pre-homepage intro video experience.
 *
 * Behaviour:
 * - Appears ONCE per browser session (sessionStorage gated)
 * - Muted autoplay by default (mobile-safe, browser-policy compliant)
 * - User can unmute/mute via the audio toggle
 * - "Skip Intro" and "Enter WIZ AI" both dismiss the intro
 * - Smooth fade-out transition into the homepage
 * - Falls back to homepage after 3 s if video fails to load
 * - Replay can be triggered externally via sessionStorage.removeItem + reload,
 *   or via the exported triggerIntroReplay() helper
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, ChevronRight, Play } from "lucide-react";
import { INTRO_SESSION_KEY } from "@/lib/introReplay";

const VIDEO_URL =
  "/manus-storage/wizai-intro-final-v2_990161d4.mp4";
const POSTER_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-intro-poster_760474dc.jpg";

const LOAD_TIMEOUT_MS = 3000; // fall back to homepage if video stalls

interface IntroScreenProps {
  onComplete: () => void;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
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

  // ── Audio toggle ──────────────────────────────────────────────────────────
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const newMuted = !muted;
    video.muted = newMuted;
    setMuted(newMuted);
    // If unmuting and video is paused (e.g. autoplay was blocked), play it
    if (!newMuted && video.paused) {
      video.play().catch(() => {});
    }
  };

  // ── Manual play (when autoplay is blocked) ────────────────────────────────
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
      }}
    >
      {/* ── Video ─────────────────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        poster={POSTER_URL}
        muted
        playsInline
        preload="auto"
        onCanPlay={handleCanPlay}
        onError={() => dismiss()}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: videoReady ? 1 : 0, transition: "opacity 0.4s ease" }}
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
        {/* Top row — mute / unmute */}
        <div className="flex justify-end">
          <button
            onClick={toggleMute}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white/80 hover:text-white hover:bg-black/60 transition-all text-sm font-medium"
            aria-label={muted ? "Play with sound" : "Mute"}
          >
            {muted ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span className="hidden sm:inline">Play with Sound</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-[--color-gold]" />
                <span className="hidden sm:inline">Mute</span>
              </>
            )}
          </button>
        </div>

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
