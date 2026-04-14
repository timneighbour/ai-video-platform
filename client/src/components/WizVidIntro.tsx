/**
 * WizVidIntro — Cinematic Trailer (Apr 2026)
 *
 * Structure (not a montage — a trailer):
 *   HOOK      0–3s    Black screen + bass hit → "This changes everything"
 *   BUILD     3–7s    Singer clip → "Create anything"
 *   EXPANSION 7–12s   Band clip → "Music videos · Films · Animation"
 *   POWER     12–16s  Cinematic clip → "Powered by AI"
 *   USP CLOSE 16–20s  Creator clip → "Enhanced with WizSound™"
 *   END       20s+    Hold final frame → CTA "Enter WizVid"
 *
 * Audio: Steel Thunderfall (12.48s) — plays once, no loop
 * Chrome Autoplay Policy: video muted, audio muted until user clicks Enable Sound
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, X, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

// ── CDN Assets ────────────────────────────────────────────────────────────────
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const LOGO = `${CDN}/wizvid-logo-transparent_fcdb69d6.png`;
const INTRO_AUDIO = `${CDN}/SteelThunderfall_a37defe2.mp3`;

// Intentional clip sequence — each plays ONCE, in order, no random cycling
const CLIPS = {
  singer:    `${CDN}/intro-new-singer_fdadff1e.mp4`,
  band:      `${CDN}/intro-new-band_b014ba31.mp4`,
  cinematic: `${CDN}/intro-new-cinematic_d6673107.mp4`,
  creator:   `${CDN}/intro-new-creator_cdb4f41a.mp4`,
};

export const INTRO_SEEN_KEY = "wizvid_intro_v3_seen";
const SOUND_KEY = "wizvid_intro_sound";

// ── Trailer Phases ────────────────────────────────────────────────────────────
// Each phase: when it starts (ms), which clip to show (null = black), text overlay
type TrailerPhase = {
  startMs: number;
  clip: string | null;    // null = black screen
  text: string | null;    // null = no text
  textStartMs: number;    // ms after phase start when text appears
  textEndMs: number;      // ms after phase start when text fades out (0 = hold until next phase)
};

const DISSOLVE_MS = 1200; // slow cinematic dissolve between clips

const PHASES: TrailerPhase[] = [
  // HOOK: black screen, bass hit, impactful text
  {
    startMs:    0,
    clip:       null,
    text:       "This changes everything",
    textStartMs: 800,
    textEndMs:  2600,
  },
  // BUILD: singer clip fades in, "Create anything"
  {
    startMs:    3000,
    clip:       CLIPS.singer,
    text:       "Create anything",
    textStartMs: 600,
    textEndMs:  3200,
  },
  // EXPANSION: band clip, "Music videos · Films · Animation"
  {
    startMs:    7000,
    clip:       CLIPS.band,
    text:       "Music videos · Films · Animation",
    textStartMs: 600,
    textEndMs:  4200,
  },
  // POWER MOMENT: cinematic clip, "Powered by AI"
  {
    startMs:    12000,
    clip:       CLIPS.cinematic,
    text:       "Powered by AI",
    textStartMs: 600,
    textEndMs:  3200,
  },
  // USP CLOSE: creator clip, "Enhanced with WizSound™"
  {
    startMs:    16000,
    clip:       CLIPS.creator,
    text:       "Enhanced with WizSound™",
    textStartMs: 600,
    textEndMs:  3200,
  },
  // END STATE: hold cinematic clip, CTA appears (handled separately)
  {
    startMs:    20000,
    clip:       CLIPS.cinematic,
    text:       null,
    textStartMs: 0,
    textEndMs:  0,
  },
];

const TEXT_FADE_IN_MS  = 500;
const TEXT_FADE_OUT_MS = 400;

interface WizVidIntroProps {
  onClose: () => void;
}

export default function WizVidIntro({ onClose }: WizVidIntroProps) {
  const [, navigate] = useLocation();

  // ── Trailer state ──────────────────────────────────────────────────────────
  const [phaseIdx, setPhaseIdx]       = useState(0);
  const [nextPhaseIdx, setNextPhaseIdx] = useState<number | null>(null);
  const [dissolving, setDissolving]   = useState(false);
  const [showCTA, setShowCTA]         = useState(false);
  const [isExiting, setIsExiting]     = useState(false);

  // Text overlay state
  const [overlayText, setOverlayText]       = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  // Logo/tagline state (appear early, persist)
  const [showLogo, setShowLogo]       = useState(false);
  const [showTagline, setShowTagline] = useState(false);

  // Sound
  const [muted, setMuted] = useState(() => {
    try { return sessionStorage.getItem(SOUND_KEY) !== "on"; }
    catch { return true; }
  });

  // Clip video elements
  const videoARef = useRef<HTMLVideoElement>(null); // current clip
  const videoBRef = useRef<HTMLVideoElement>(null); // next clip (preloaded)
  const audioRef  = useRef<HTMLAudioElement>(null);
  const isExitingRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimer = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  };

  // ── Load clip into a video element ────────────────────────────────────────
  const loadClip = (ref: React.RefObject<HTMLVideoElement | null>, src: string) => {
    const v = ref.current;
    if (!v) return;
    v.src = src;
    v.load();
    v.play().catch(() => {});
  };

  // ── Show a text overlay with fade in/out ──────────────────────────────────
  const showText = useCallback((text: string, holdMs: number) => {
    setOverlayText(text);
    setOverlayOpacity(0);
    // Fade in
    requestAnimationFrame(() => requestAnimationFrame(() => setOverlayOpacity(1)));
    // Fade out
    addTimer(() => {
      setOverlayOpacity(0);
      addTimer(() => setOverlayText(null), TEXT_FADE_OUT_MS + 50);
    }, holdMs);
  }, []);

  // ── Transition to next phase ───────────────────────────────────────────────
  const transitionToPhase = useCallback((idx: number) => {
    if (isExitingRef.current) return;
    const phase = PHASES[idx];
    if (!phase) return;

    // If new phase has a clip, preload into video B then dissolve
    if (phase.clip) {
      setNextPhaseIdx(idx);
      loadClip(videoBRef, phase.clip);
      setDissolving(true);

      addTimer(() => {
        // Swap: B becomes A
        setPhaseIdx(idx);
        setNextPhaseIdx(null);
        setDissolving(false);
        // Now load the same clip into A ref
        loadClip(videoARef, phase.clip!);
      }, DISSOLVE_MS);
    } else {
      // Black screen phase — just update state
      setPhaseIdx(idx);
    }

    // Schedule text overlay for this phase
    if (phase.text) {
      const holdMs = phase.textEndMs - phase.textStartMs - TEXT_FADE_OUT_MS;
      addTimer(() => showText(phase.text!, holdMs), phase.textStartMs);
    }
  }, [showText]);

  // ── Master timeline ────────────────────────────────────────────────────────
  useEffect(() => {
    // Logo appears at 1s, tagline at 1.8s
    addTimer(() => setShowLogo(true),    1000);
    addTimer(() => setShowTagline(true), 1800);

    // Show text for HOOK phase (phase 0 — starts immediately)
    const hookPhase = PHASES[0];
    if (hookPhase.text) {
      const holdMs = hookPhase.textEndMs - hookPhase.textStartMs - TEXT_FADE_OUT_MS;
      addTimer(() => showText(hookPhase.text!, holdMs), hookPhase.textStartMs);
    }

    // Schedule all subsequent phases
    for (let i = 1; i < PHASES.length; i++) {
      const idx = i;
      addTimer(() => transitionToPhase(idx), PHASES[idx].startMs);
    }

    // Show CTA at 20.5s
    addTimer(() => setShowCTA(true), 20500);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audio: autoplay muted on mount ────────────────────────────────────────
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = true;
    a.currentTime = 0;
    a.play().catch(() => {});
  }, []);

  // ── Audio: mute/unmute sync ────────────────────────────────────────────────
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = muted;
    try { sessionStorage.setItem(SOUND_KEY, muted ? "off" : "on"); }
    catch { /* ignore */ }
    if (!muted && a.paused) {
      a.play().catch(() => {});
    }
  }, [muted]);

  // ── Initial clip load (BUILD phase clip preloaded into video A) ───────────
  useEffect(() => {
    // Preload the first clip (singer) so it's ready when phase 1 starts at 3s
    loadClip(videoBRef, CLIPS.singer);
  }, []);

  // ── Dismiss ────────────────────────────────────────────────────────────────
  const dismiss = useCallback((destination?: string) => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsExiting(true);
    timers.current.forEach(clearTimeout);
    const a = audioRef.current;
    if (a) a.pause();
    setTimeout(() => {
      onClose();
      if (destination) navigate(destination);
    }, 600);
  }, [onClose, navigate]);

  // ── Current and next clip sources ─────────────────────────────────────────
  const currentClip = PHASES[phaseIdx]?.clip;
  const nextClip    = nextPhaseIdx !== null ? PHASES[nextPhaseIdx]?.clip : null;

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
      aria-label="WizVid intro"
    >
      {/* ── Background: current clip (video A) ─────────────────────────────── */}
      <video
        ref={videoARef}
        key={`a-${currentClip ?? "black"}`}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{
          opacity: currentClip && !dissolving ? 1 : 0,
          transition: `opacity ${DISSOLVE_MS}ms ease`,
        }}
        autoPlay
        muted
        playsInline
        loop
        crossOrigin="anonymous"
      />

      {/* ── Background: next clip (video B — dissolves in) ─────────────────── */}
      <video
        ref={videoBRef}
        key={`b-${nextClip ?? "none"}`}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{
          opacity: dissolving && nextClip ? 1 : 0,
          transition: `opacity ${DISSOLVE_MS}ms ease`,
        }}
        autoPlay
        muted
        playsInline
        loop
        crossOrigin="anonymous"
      />

      {/* ── Cinematic gradient overlay ──────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* ── Steel Thunderfall audio ─────────────────────────────────────────── */}
      <audio
        ref={audioRef}
        src={INTRO_AUDIO}
        preload="auto"
        crossOrigin="anonymous"
      />

      {/* ── Skip button (top-right) ─────────────────────────────────────────── */}
      <button
        onClick={() => dismiss()}
        className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/60 hover:text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm"
        aria-label="Skip intro"
      >
        <X className="w-3.5 h-3.5" />
        Skip
      </button>

      {/* ── Sound toggle (top-left) ─────────────────────────────────────────── */}
      <button
        onClick={() => setMuted((m) => !m)}
        className="absolute top-5 left-5 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm"
        aria-label={muted ? "Enable sound" : "Mute audio"}
      >
        {muted ? (
          <>
            <VolumeX className="w-4 h-4" />
            <span className="hidden sm:inline">Enable Sound</span>
          </>
        ) : (
          <>
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">Mute</span>
          </>
        )}
      </button>

      {/* ── Phase text overlay (cinematic straplines) ───────────────────────── */}
      <div
        className="absolute inset-x-0 pointer-events-none z-10"
        style={{ top: "50%", transform: "translateY(-50%)" }}
        aria-hidden="true"
      >
        <div
          style={{
            opacity: overlayText ? overlayOpacity : 0,
            transition: `opacity ${overlayOpacity > 0 ? TEXT_FADE_IN_MS : TEXT_FADE_OUT_MS}ms cubic-bezier(0.4,0,0.2,1)`,
          }}
          className="flex items-center justify-center px-8"
        >
          <p
            className="text-center text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light tracking-[0.15em] uppercase"
            style={{
              fontFamily: "'Bebas Neue', 'Barlow Condensed', 'Inter', sans-serif",
              textShadow: "0 2px 40px rgba(0,0,0,0.98), 0 0 80px rgba(139,92,246,0.35)",
              letterSpacing: "0.15em",
              lineHeight: 1.1,
            }}
          >
            {overlayText}
          </p>
        </div>
      </div>

      {/* ── Centre content: logo, tagline, CTA ─────────────────────────────── */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 px-6 text-center">

        {/* Logo */}
        <div
          style={{
            opacity: showLogo ? 1 : 0,
            transform: showLogo ? "scale(1) translateY(0)" : "scale(0.9) translateY(20px)",
            transition: "opacity 800ms cubic-bezier(0.16,1,0.3,1), transform 800ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <img
            src={LOGO}
            alt="WizVid"
            className="w-48 sm:w-64 md:w-72 mx-auto"
            style={{
              filter: "drop-shadow(0 0 40px rgba(139,92,246,0.9)) drop-shadow(0 0 80px rgba(139,92,246,0.45))",
              mixBlendMode: "screen",
            }}
            draggable={false}
          />
        </div>

        {/* Tagline */}
        <div
          className="mt-3"
          style={{
            opacity: showTagline ? 1 : 0,
            transform: showTagline ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 600ms ease 0.1s, transform 600ms ease 0.1s",
          }}
        >
          <p
            className="text-white/70 font-light tracking-[0.3em] uppercase text-xs sm:text-sm"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.9)" }}
          >
            AI Music Video Creator
          </p>
        </div>

        {/* Enter WizVid CTA — appears at 20.5s */}
        <div
          className="mt-8"
          style={{
            opacity: showCTA ? 1 : 0,
            transform: showCTA ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1) 0.1s, transform 700ms cubic-bezier(0.16,1,0.3,1) 0.1s",
            pointerEvents: showCTA ? "auto" : "none",
          }}
        >
          <button
            onClick={() => dismiss("/")}
            className="group relative inline-flex items-center gap-3 px-14 py-4 rounded-full text-base font-semibold text-white transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.95) 0%, rgba(109,40,217,1) 100%)",
              boxShadow: "0 0 40px rgba(139,92,246,0.55), 0 0 80px rgba(139,92,246,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
              animation: showCTA ? "enterPulse 2.5s ease-in-out infinite" : "none",
            }}
          >
            Enter WizVid
            <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes enterPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(139,92,246,0.55), 0 0 80px rgba(139,92,246,0.28), inset 0 1px 0 rgba(255,255,255,0.15); }
          50%       { box-shadow: 0 0 65px rgba(139,92,246,0.8), 0 0 120px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.15); }
        }
      `}</style>
    </div>
  );
}
