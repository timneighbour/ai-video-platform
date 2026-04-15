/**
 * WizVidIntro — Cinematic Trailer v12 Enhanced (Apr 2026)
 *
 * Precision pass fixes:
 * - Enable Sound centre button auto-hides after 4s (no longer blocks video)
 * - CTA timer tightened to 25s (matches v11 duration of 25.4s)
 * - Emoji removed from Enable Sound button (iOS rendering inconsistency)
 * - All Safari/iOS/Android compatibility preserved
 *
 * Audio UX:
 * - "Tap to Enter" pre-play overlay — user taps → video starts with sound
 * - Any click/tap anywhere unmutes the video
 * - Small mute toggle in corner for users who want to mute after entering
 *
 * Video: v14c — WizSound™ Immersive (v9 piano, perfectly balanced L=R) + WizLumina™ Subtle 4K, 25.4s total
 * Cross-device: iOS Safari / Chrome, Android, Desktop — all supported
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, X, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
// WizSound™ Immersive + WizLumina™ Subtle 4K — v14c FINAL
// Source: v9 (confirmed correct piano/orchestral audio by Tim)
// Audio: mono-balanced (L=R=-14.41 dBRMS, 0.00 dB difference), 6-band piano EQ,
//        extrastereo m=1.8, hall reverb, 2:1 compressor, -14 LUFS loudnorm
// Video: subtle WizLumina (denoise, +3% contrast, +5% sat, gentle sharpen, Lanczos 4K)
const TRAILER_URL = `${CDN}/wizvid-intro-v14c-final_757bf92b.mp4`;
const LOGO = `${CDN}/wizvid-logo-transparent_fcdb69d6.png`;

export const INTRO_SEEN_KEY = "wizvid_intro_v14c_seen";

// CTA appears when video ends (~25.4s); timer fires at 25s as backup
const CTA_SHOW_AT_MS = 25000;
// Enable Sound hint auto-hides after 4s of playback
const SOUND_HINT_HIDE_MS = 4000;

interface WizVidIntroProps {
  onClose: () => void;
}

export default function WizVidIntro({ onClose }: WizVidIntroProps) {
  const [, navigate] = useLocation();

  // Phase: "tap-to-enter" | "playing" | "exiting"
  const [phase, setPhase] = useState<"tap-to-enter" | "playing" | "exiting">("tap-to-enter");
  const [muted, setMuted] = useState(true);
  const [showCTA, setShowCTA] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showSoundHint, setShowSoundHint] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const isExitingRef = useRef(false);
  const ctaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedRef = useRef(false);

  const startCTATimer = useCallback(() => {
    if (ctaTimer.current) return;
    ctaTimer.current = setTimeout(() => {
      if (!isExitingRef.current) setShowCTA(true);
    }, CTA_SHOW_AT_MS);
  }, []);

  const startSoundHintTimer = useCallback(() => {
    if (soundHintTimer.current) return;
    soundHintTimer.current = setTimeout(() => {
      setShowSoundHint(false);
    }, SOUND_HINT_HIDE_MS);
  }, []);

  const handleVideoEnd = useCallback(() => {
    if (!isExitingRef.current) setShowCTA(true);
  }, []);

  // Attempt to play the video (always muted first for iOS)
  const attemptPlay = useCallback(async (v: HTMLVideoElement, withSound: boolean) => {
    if (hasStartedRef.current) return;
    try {
      v.muted = true; // must start muted for iOS autoplay
      await v.play();
      hasStartedRef.current = true;
      startCTATimer();
      startSoundHintTimer();
      if (withSound) {
        // Small delay to let play() succeed before unmuting
        setTimeout(() => {
          v.muted = false;
          setMuted(false);
        }, 80);
      }
    } catch {
      // Autoplay still blocked even muted — show CTA
      setShowCTA(true);
    }
  }, [startCTATimer, startSoundHintTimer]);

  // Preload the video as soon as component mounts (so it's ready when user taps)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    v.loop = false;
    v.preload = "auto";

    const onCanPlay = () => setVideoReady(true);
    const onCanPlayThrough = () => setVideoReady(true);
    const onEnded = handleVideoEnd;

    v.addEventListener("canplay", onCanPlay, { once: true });
    v.addEventListener("canplaythrough", onCanPlayThrough, { once: true });
    v.addEventListener("ended", onEnded);
    v.load();

    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("canplaythrough", onCanPlayThrough);
      v.removeEventListener("ended", onEnded);
      if (ctaTimer.current) clearTimeout(ctaTimer.current);
      if (soundHintTimer.current) clearTimeout(soundHintTimer.current);
    };
  }, [handleVideoEnd]);

  // Sync muted state to video element
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
  }, [muted]);

  // "Tap to Enter" — user taps the overlay → start video with sound
  const handleTapToEnter = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    setPhase("playing");
    await attemptPlay(v, true);
  }, [attemptPlay]);

  // Any click/tap on the playing screen → unmute if still muted
  const handleScreenTap = useCallback(() => {
    if (phase !== "playing") return;
    const v = videoRef.current;
    if (!v) return;
    if (muted) {
      v.muted = false;
      setMuted(false);
    }
  }, [phase, muted]);

  const dismiss = useCallback((destination?: string) => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setPhase("exiting");
    if (ctaTimer.current) clearTimeout(ctaTimer.current);
    if (soundHintTimer.current) clearTimeout(soundHintTimer.current);
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

  const isExiting = phase === "exiting";

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
      onClick={handleScreenTap}
    >
      {/* ── Trailer video ─────────────────────────── */}
      <video
        ref={videoRef}
        src={TRAILER_URL}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: phase === "playing" && videoReady ? 1 : 0,
          transition: "opacity 800ms ease",
          zIndex: 0,
          pointerEvents: "none",
        }}
        muted
        playsInline
        preload="auto"
      />

      {/* ── Cinematic vignette overlay ──────────────────── */}
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

      {/* ══════════════════════════════════════════════════════════════
          TAP TO ENTER OVERLAY — shown before video starts
      ══════════════════════════════════════════════════════════════ */}
      {phase === "tap-to-enter" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center"
          style={{ zIndex: 30 }}
        >
          {/* Logo */}
          <img
            src={LOGO}
            alt="WizVid"
            className="w-32 sm:w-40 opacity-95"
            style={{ filter: "drop-shadow(0 0 30px rgba(139,92,246,0.7))" }}
          />

          {/* Headline */}
          <div className="flex flex-col items-center gap-3">
            <p
              className="text-white/70 text-sm sm:text-base font-medium tracking-widest uppercase"
              style={{ textShadow: "0px 2px 12px rgba(0,0,0,0.9)" }}
            >
              Experience WizVid with sound
            </p>
          </div>

          {/* Tap to Enter button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleTapToEnter(); }}
            className="relative flex items-center gap-3 px-12 py-5 rounded-full text-white text-lg sm:text-xl font-bold transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,1) 0%, rgba(109,40,217,1) 100%)",
              boxShadow: "0 0 60px rgba(139,92,246,0.7), 0 0 120px rgba(139,92,246,0.35)",
              animation: "tapPulse 2.4s ease-in-out infinite",
              letterSpacing: "0.04em",
              textShadow: "0px 2px 12px rgba(0,0,0,0.8)",
            }}
          >
            <Volume2 className="w-6 h-6" />
            Tap to Enter
          </button>

          {/* Skip link */}
          <button
            onClick={(e) => { e.stopPropagation(); dismiss("/"); }}
            className="text-white/40 text-sm font-medium hover:text-white/70 transition-colors mt-2"
          >
            Skip intro →
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PLAYING STATE UI
      ══════════════════════════════════════════════════════════════ */}
      {phase === "playing" && (
        <>
          {/* Loading spinner while buffering */}
          {!videoReady && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 5 }}>
              <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
            </div>
          )}

          {/* Skip button (top-left) */}
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            className="absolute top-5 left-5 flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/50 hover:bg-black/70 border border-white/25 text-white text-sm font-semibold transition-all duration-200 backdrop-blur-sm"
            style={{ zIndex: 20, cursor: "pointer", textShadow: "0px 2px 8px rgba(0,0,0,0.9)" }}
            aria-label="Skip intro"
          >
            <X className="w-3.5 h-3.5" />
            Skip
          </button>

          {/* WizSound badge + mute toggle (top-right) */}
          <div className="absolute top-5 right-5 flex items-center gap-2" style={{ zIndex: 20 }}>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-fuchsia-500/30 backdrop-blur-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#d946ef" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-fuchsia-300 text-[11px] font-bold tracking-wide">WizSound™</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}
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

          {/* Enable Sound hint — centre screen, shown only for first 4s if still muted */}
          {muted && videoReady && showSoundHint && !showCTA && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                zIndex: 10,
                pointerEvents: "none",
                opacity: showSoundHint ? 1 : 0,
                transition: "opacity 600ms ease",
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); const vid = videoRef.current; if (vid) { vid.muted = false; } setMuted(false); }}
                className="flex flex-col items-center gap-3 px-10 py-6 rounded-2xl text-white font-bold transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  pointerEvents: "auto",
                  background: "rgba(0,0,0,0.6)",
                  border: "1.5px solid rgba(139,92,246,0.5)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 0 60px rgba(139,92,246,0.5), 0 0 120px rgba(139,92,246,0.2)",
                  animation: "soundPulse 2.2s ease-in-out infinite",
                  textShadow: "0px 2px 12px rgba(0,0,0,0.9)",
                }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(109,40,217,0.9) 100%)",
                    boxShadow: "0 0 40px rgba(139,92,246,0.8)",
                  }}
                >
                  <Volume2 className="w-8 h-8 text-white" />
                </div>
                <span className="text-base sm:text-lg tracking-wide">Enable Sound</span>
                <span className="text-white/50 text-xs font-normal">Tap anywhere to unmute</span>
              </button>
            </div>
          )}

          {/* Enter Site CTA — appears near end of trailer */}
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
                onClick={(e) => { e.stopPropagation(); dismiss("/"); }}
                onMouseDown={(e) => { e.stopPropagation(); dismiss("/"); }}
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
        </>
      )}

      <style>{`
        @keyframes tapPulse {
          0%, 100% { box-shadow: 0 0 60px rgba(139,92,246,0.7), 0 0 120px rgba(139,92,246,0.35); }
          50%       { box-shadow: 0 0 90px rgba(139,92,246,0.95), 0 0 180px rgba(139,92,246,0.55); }
        }
        @keyframes soundPulse {
          0%, 100% { box-shadow: 0 0 60px rgba(139,92,246,0.5), 0 0 120px rgba(139,92,246,0.2); border-color: rgba(139,92,246,0.5); }
          50%       { box-shadow: 0 0 90px rgba(139,92,246,0.8), 0 0 180px rgba(139,92,246,0.4); border-color: rgba(139,92,246,0.9); }
        }
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 50px rgba(139,92,246,0.6), 0 0 100px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.18); }
          50%       { box-shadow: 0 0 80px rgba(139,92,246,0.85), 0 0 150px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.18); }
        }
      `}</style>
    </div>
  );
}
