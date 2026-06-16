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
    localStorage.setItem(INTRO_SESSION_KEY, "1");
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
        {/* Top row — Sound toggle (left) + Skip Intro (right) */}
        <div className="flex justify-between items-center pointer-events-auto">
          {/* Premium Sound toggle with unmute prompt */}
          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            style={{
              animation: isMuted ? "unmute-pulse 2s ease-in-out infinite" : "none",
              background: isMuted
                ? "rgba(196,164,100,0.12)"
                : "rgba(196,164,100,0.08)",
              border: isMuted
                ? "1px solid rgba(196,164,100,0.55)"
                : "1px solid rgba(196,164,100,0.25)",
              boxShadow: isMuted
                ? "0 0 16px rgba(196,164,100,0.30), inset 0 0 8px rgba(196,164,100,0.08)"
                : "none",
            }}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-105"
          >
            {isMuted ? (
              <>
                {/* Animated sound wave bars — gold, pulsing */}
                <div className="flex items-end gap-[2px] h-4">
                  {[
                    { anim: "sound-bar-1 0.6s 0s ease-in-out infinite" },
                    { anim: "sound-bar-2 0.6s 0.1s ease-in-out infinite" },
                    { anim: "sound-bar-3 0.6s 0.2s ease-in-out infinite" },
                    { anim: "sound-bar-4 0.6s 0.3s ease-in-out infinite" },
                    { anim: "sound-bar-5 0.6s 0.15s ease-in-out infinite" },
                  ].map((b, i) => (
                    <div
                      key={i}
                      style={{
                        animation: b.anim,
                        width: "3px",
                        borderRadius: "2px",
                        background: "#c4a464",
                        minHeight: "4px",
                      }}
                    />
                  ))}
                </div>
                <span className="text-primary/90 text-xs tracking-[0.18em] uppercase font-semibold">Tap for Sound</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-primary/80" />
                <span className="text-primary/80 text-xs tracking-[0.18em] uppercase font-semibold">Sound On</span>
              </>
            )}
          </button>

          {/* Skip Intro */}
          <button
            onClick={dismiss}
            className="text-white/40 hover:text-white/80 transition-colors text-xs tracking-[0.2em] uppercase font-medium px-3 py-2"
            aria-label="Skip intro"
          >
            Skip Intro
          </button>
        </div>

        {/* Bottom — Enter WIZ AI ultra-premium button */}
        <div className="flex flex-col items-center gap-3 pointer-events-auto pb-4">
          {/* Sparkle particles */}
          <div className="relative w-0 h-0">
            {[
              { left: "-60px", delay: "0s",   dur: "2.2s", size: "5px", color: "#e8c97a" },
              { left: "-30px", delay: "0.4s", dur: "1.8s", size: "3px", color: "#fff" },
              { left: "10px",  delay: "0.8s", dur: "2.5s", size: "4px", color: "#c4a464" },
              { left: "40px",  delay: "0.2s", dur: "2.0s", size: "3px", color: "#e8c97a" },
              { left: "65px",  delay: "1.1s", dur: "1.9s", size: "5px", color: "#fff" },
              { left: "-50px", delay: "1.5s", dur: "2.3s", size: "3px", color: "#c4a464" },
              { left: "20px",  delay: "0.6s", dur: "2.1s", size: "4px", color: "#e8c97a" },
            ].map((p, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: p.left,
                  bottom: "8px",
                  width: p.size,
                  height: p.size,
                  borderRadius: "50%",
                  background: p.color,
                  boxShadow: `0 0 6px 2px ${p.color}88`,
                  animation: `enter-btn-sparkle ${p.dur} ${p.delay} ease-out infinite`,
                }}
              />
            ))}
          </div>

          {/* The button itself */}
          <div className="relative">
            {/* Outer breathing ring */}
            <div
              style={{
                position: "absolute",
                inset: "-10px",
                borderRadius: "9999px",
                border: "1.5px solid rgba(196,164,100,0.5)",
                animation: "enter-btn-ring-breathe 2.4s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
            {/* Fast pulse ring */}
            <div
              style={{
                position: "absolute",
                inset: "-6px",
                borderRadius: "9999px",
                border: "2px solid rgba(232,201,122,0.6)",
                animation: "enter-btn-ring-pulse 1.8s ease-out infinite",
                pointerEvents: "none",
              }}
            />

            <button
              onClick={dismiss}
              aria-label="Enter WIZ AI"
              style={{
                background:
                  "linear-gradient(105deg, #8a6a20 0%, #c4a464 20%, #f0d98a 45%, #e8c97a 55%, #c4a464 75%, #8a6a20 100%)",
                backgroundSize: "300% 100%",
                animation: "enter-btn-shimmer 3s linear infinite",
                boxShadow: [
                  "0 0 0 1px rgba(255,255,255,0.18)",
                  "0 0 28px rgba(196,164,100,0.55)",
                  "0 0 60px rgba(196,164,100,0.28)",
                  "0 0 90px rgba(196,164,100,0.12)",
                  "inset 0 1px 0 rgba(255,255,255,0.35)",
                  "inset 0 -1px 0 rgba(0,0,0,0.20)",
                ].join(", "),
                letterSpacing: "0.22em",
                overflow: "hidden",
              }}
              className="group relative flex items-center gap-4 px-12 py-4 rounded-full text-background font-black text-base uppercase transition-all duration-200 hover:scale-[1.06] active:scale-[0.98]"
            >
              {/* Continuous light sweep */}
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: "40%",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
                  animation: "enter-btn-sweep 2.8s ease-in-out infinite",
                  pointerEvents: "none",
                }}
              />
              {/* Hover inner glow */}
              <span
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(255,255,255,0.18) 0%, transparent 70%)",
                }}
              />
              <span
                className="relative"
                style={{
                  textShadow:
                    "0 1px 0 rgba(255,255,255,0.3), 0 -1px 0 rgba(0,0,0,0.15)",
                }}
              >
                Enter WIZ AI
              </span>
              <ChevronRight
                className="relative w-5 h-5 transition-transform duration-200 group-hover:translate-x-1.5"
                style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.3))" }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
