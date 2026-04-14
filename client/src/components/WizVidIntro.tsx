/**
 * WizVidIntro — Cinematic intro with crossfading video loop (Apr 2026)
 *
 * Chrome Autoplay Policy Compliant:
 * - Video autoplays MUTED (allowed by Chrome)
 * - Audio requires user interaction (click unmute)
 * - Sound state persists via sessionStorage
 *
 * Video loop: 5 clips crossfade seamlessly (Pixar, Band, Singer, Creator, Cinematic)
 * Straplines: 3 timed text overlays with fade in/out
 * No auto-dismiss. User must click "Enter WizVid" (or Skip) to proceed.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, X, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

// ── CDN Assets ────────────────────────────────────────────────────────────────
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const LOGO = `${CDN}/wizvid-logo-transparent_fcdb69d6.png`;

const BG_CLIPS = [
  `${CDN}/intro-new-pixar_7b2b8abd.mp4`,
  `${CDN}/intro-new-band_b014ba31.mp4`,
  `${CDN}/intro-new-singer_fdadff1e.mp4`,
  `${CDN}/intro-new-creator_cdb4f41a.mp4`,
  `${CDN}/intro-new-cinematic_d6673107.mp4`,
];

const CLIP_DURATION_MS = 6000;
const CROSSFADE_MS = 1200;

const AMBIENT_AUDIO = `${CDN}/wizsound-standard_31845db2.m4a`;

export const INTRO_SEEN_KEY = "wizvid_intro_v3_seen";
const SOUND_KEY = "wizvid_intro_sound";

// ── Straplines config ─────────────────────────────────────────────────────────
const STRAPLINES = [
  { text: "Create without limits",         startMs: 3000,  endMs: 6000  },
  { text: "See it. Hear it. Feel it",      startMs: 9000,  endMs: 12000 },
  { text: "From imagination to immersion", startMs: 15000, endMs: 18000 },
] as const;

const STRAPLINE_FADE_MS = 600;

interface WizVidIntroProps {
  onClose: () => void;
}

type Phase = "fade-in" | "logo" | "tagline" | "ready" | "exiting";

export default function WizVidIntro({ onClose }: WizVidIntroProps) {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("fade-in");
  const [clipIdx, setClipIdx] = useState(0);
  const [nextClipIdx, setNextClipIdx] = useState(1);
  const [crossfading, setCrossfading] = useState(false);

  // Sound: starts muted (Chrome autoplay policy), persists in session
  const [muted, setMuted] = useState(() => {
    try { return sessionStorage.getItem(SOUND_KEY) !== "on"; }
    catch { return true; }
  });

  const [videoAReady, setVideoAReady] = useState(false);
  const [videoBReady, setVideoBReady] = useState(false);

  // Strapline state
  const [activeStrapIdx, setActiveStrapIdx] = useState(-1);
  const [strapOpacity, setStrapOpacity] = useState(0);

  const isExitingRef = useRef(false);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Phase transitions ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timers.current.push(id);
    };
    t(() => setPhase("logo"),    400);
    t(() => setPhase("tagline"), 1200);
    t(() => setPhase("ready"),   2200);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  // ── Strapline scheduling ───────────────────────────────────────────────────
  useEffect(() => {
    const ids: ReturnType<typeof setTimeout>[] = [];

    STRAPLINES.forEach((s, idx) => {
      ids.push(setTimeout(() => {
        setActiveStrapIdx(idx);
        setStrapOpacity(0);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setStrapOpacity(1));
        });
      }, s.startMs));

      ids.push(setTimeout(() => {
        setStrapOpacity(0);
        const clearId = setTimeout(() => setActiveStrapIdx(-1), STRAPLINE_FADE_MS + 50);
        ids.push(clearId);
      }, s.endMs - STRAPLINE_FADE_MS));
    });

    return () => ids.forEach(clearTimeout);
  }, []);

  // ── Crossfading clip cycling ───────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      // Start crossfade
      setCrossfading(true);
      setNextClipIdx((prev) => (prev + 1) % BG_CLIPS.length);

      // After crossfade completes, swap
      setTimeout(() => {
        setClipIdx((prev) => (prev + 1) % BG_CLIPS.length);
        setNextClipIdx((prev) => (prev + 1) % BG_CLIPS.length);
        setCrossfading(false);
        setVideoAReady(true);
      }, CROSSFADE_MS);
    }, CLIP_DURATION_MS);

    return () => clearInterval(id);
  }, []);

  // ── Video A load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const v = videoARef.current;
    if (!v) return;
    v.src = BG_CLIPS[clipIdx];
    v.load();
    v.play().catch(() => {});
  }, [clipIdx]);

  // ── Video B (next) preload ─────────────────────────────────────────────────
  useEffect(() => {
    const v = videoBRef.current;
    if (!v) return;
    v.src = BG_CLIPS[nextClipIdx];
    v.load();
    v.play().catch(() => {});
  }, [nextClipIdx]);

  // ── Audio: mute sync + session persistence ─────────────────────────────────
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = muted;
    try { sessionStorage.setItem(SOUND_KEY, muted ? "off" : "on"); }
    catch { /* ignore */ }
    if (!muted) {
      // User clicked unmute — this is a user gesture context, so play() is allowed
      a.play().catch(() => {});
    }
  }, [muted]);

  // ── Dismiss ────────────────────────────────────────────────────────────────
  const dismiss = useCallback((destination?: string) => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setPhase("exiting");
    // Pause audio on exit
    const a = audioRef.current;
    if (a) { a.pause(); }
    setTimeout(() => {
      onClose();
      if (destination) navigate(destination);
    }, 600);
  }, [onClose, navigate]);

  const isExiting   = phase === "exiting";
  const showLogo    = phase !== "fade-in";
  const showTagline = phase === "tagline" || phase === "ready" || phase === "exiting";
  const showReady   = phase === "ready"   || phase === "exiting";

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
      {/* Background video A (current) */}
      <video
        ref={videoARef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{
          opacity: videoAReady ? (crossfading ? 0 : 1) : 0,
          transition: `opacity ${CROSSFADE_MS}ms ease`,
        }}
        autoPlay
        muted
        playsInline
        loop
        crossOrigin="anonymous"
        onCanPlay={() => setVideoAReady(true)}
      />

      {/* Background video B (next — fades in during crossfade) */}
      <video
        ref={videoBRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{
          opacity: crossfading ? 1 : 0,
          transition: `opacity ${CROSSFADE_MS}ms ease`,
        }}
        autoPlay
        muted
        playsInline
        loop
        crossOrigin="anonymous"
        onCanPlay={() => setVideoBReady(true)}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* Ambient audio — never autoplays, requires user click */}
      <audio ref={audioRef} src={AMBIENT_AUDIO} loop muted={muted} preload="none" crossOrigin="anonymous" />

      {/* Skip (top-right) */}
      <button
        onClick={() => dismiss()}
        className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/60 hover:text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm"
        aria-label="Skip intro"
      >
        <X className="w-3.5 h-3.5" />
        Skip
      </button>

      {/* Mute toggle (top-left) — prominent for Chrome compliance */}
      <button
        onClick={() => setMuted((m) => !m)}
        className="absolute top-5 left-5 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm"
        aria-label={muted ? "Unmute" : "Mute audio"}
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

      {/* ── Straplines — pointer-events:none, positioned above CTA ─────────── */}
      <div
        className="absolute inset-x-0 pointer-events-none z-10"
        style={{ bottom: "30%" }}
        aria-hidden="true"
      >
        <div
          style={{
            opacity: activeStrapIdx >= 0 ? strapOpacity : 0,
            transition: `opacity ${STRAPLINE_FADE_MS}ms cubic-bezier(0.4,0,0.2,1)`,
          }}
          className="flex items-center justify-center px-6"
        >
          <p
            className="text-center text-white text-xl sm:text-2xl md:text-3xl font-light tracking-[0.2em] uppercase"
            style={{
              fontFamily: "'Bebas Neue', 'Barlow', 'Inter', sans-serif",
              textShadow: "0 2px 28px rgba(0,0,0,0.95), 0 0 60px rgba(139,92,246,0.4)",
              letterSpacing: "0.2em",
            }}
          >
            {activeStrapIdx >= 0 ? STRAPLINES[activeStrapIdx].text : ""}
          </p>
        </div>
      </div>

      {/* Centre content — logo, tagline, CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">

        {/* Logo */}
        <div
          style={{
            opacity: showLogo ? 1 : 0,
            transform: showLogo ? "scale(1) translateY(0)" : "scale(0.88) translateY(24px)",
            transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <img
            src={LOGO}
            alt="WizVid"
            className="w-64 sm:w-80 md:w-96 mx-auto"
            style={{
              filter: "drop-shadow(0 0 40px rgba(139,92,246,0.9)) drop-shadow(0 0 80px rgba(139,92,246,0.45))",
              mixBlendMode: "screen",
            }}
            draggable={false}
          />
        </div>

        {/* Tagline */}
        <div
          className="mt-5"
          style={{
            opacity: showTagline ? 1 : 0,
            transform: showTagline ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 500ms ease 0.1s, transform 500ms ease 0.1s",
          }}
        >
          <p
            className="text-white/85 font-light tracking-[0.28em] uppercase text-sm sm:text-base"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.9)" }}
          >
            AI Music Video Creator
          </p>
          <p
            className="mt-1.5 text-white/50 font-light tracking-widest uppercase text-xs"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.9)" }}
          >
            Cinematic visuals · Immersive sound
          </p>
        </div>

        {/* Enter button */}
        <div
          className="mt-12"
          style={{
            opacity: showReady ? 1 : 0,
            transform: showReady ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 600ms ease 0.1s, transform 600ms ease 0.1s",
            pointerEvents: showReady ? "auto" : "none",
          }}
        >
          <button
            onClick={() => dismiss("/")}
            className="group relative inline-flex items-center gap-3 px-12 py-4 rounded-full text-base font-semibold text-white transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(109,40,217,0.95) 100%)",
              boxShadow: "0 0 40px rgba(139,92,246,0.5), 0 0 80px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
              animation: "enterPulse 2.5s ease-in-out infinite",
            }}
          >
            Enter WizVid
            <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes enterPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(139,92,246,0.5), 0 0 80px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.15); }
          50%       { box-shadow: 0 0 60px rgba(139,92,246,0.75), 0 0 110px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.15); }
        }
      `}</style>
    </div>
  );
}
