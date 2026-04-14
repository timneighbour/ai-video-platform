/**
 * WizVidIntro — Cinematic Trailer (Apr 2026)
 *
 * ARCHITECTURE: Two persistent video elements (A and B) — NO key props.
 * Clips are loaded by setting ref.current.src directly.
 * Dissolves are pure CSS opacity transitions.
 *
 * Trailer structure:
 *   HOOK      0–3s    Black screen + "This changes everything"
 *   BUILD     3–7s    Singer clip → "Create anything"
 *   EXPANSION 7–12s   Band clip → "Music videos · Films · Animation"
 *   POWER     12–16s  Cinematic clip → "Powered by AI"
 *   USP CLOSE 16–20s  Creator clip → "Enhanced with WizSound™"
 *   END       20s+    Hold final frame → CTA "Enter WizVid"
 *
 * Audio: Steel Thunderfall (12.48s) — plays once, no loop
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, X, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

// ── CDN Assets ────────────────────────────────────────────────────────────────
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const LOGO       = `${CDN}/wizvid-logo-transparent_fcdb69d6.png`;
const INTRO_AUDIO = `${CDN}/SteelThunderfall_a37defe2.mp3`;

const CLIPS = [
  `${CDN}/intro-new-singer_fdadff1e.mp4`,    // 0 — BUILD
  `${CDN}/intro-new-band_b014ba31.mp4`,       // 1 — EXPANSION
  `${CDN}/intro-new-cinematic_d6673107.mp4`,  // 2 — POWER
  `${CDN}/intro-new-creator_cdb4f41a.mp4`,    // 3 — USP CLOSE
  `${CDN}/intro-new-cinematic_d6673107.mp4`,  // 4 — END (same as POWER)
];

export const INTRO_SEEN_KEY = "wizvid_intro_v3_seen";
const SOUND_KEY = "wizvid_intro_sound";

const DISSOLVE_MS = 1200;

// ── Text overlay schedule (absolute ms from start) ────────────────────────────
const TEXT_SCHEDULE = [
  { showAt: 800,   hideAt: 2600,  text: "This changes everything" },
  { showAt: 3600,  hideAt: 6600,  text: "Create anything" },
  { showAt: 7600,  hideAt: 11600, text: "Music videos · Films · Animation" },
  { showAt: 12600, hideAt: 15600, text: "Powered by AI" },
  { showAt: 16600, hideAt: 19600, text: "Enhanced with WizSound™" },
];

// ── Clip transition schedule (absolute ms from start) ─────────────────────────
// Each entry: when to start dissolving the next clip in
const CLIP_SCHEDULE = [
  { at: 3000,  clipIdx: 0 },  // Singer at 3s
  { at: 7000,  clipIdx: 1 },  // Band at 7s
  { at: 12000, clipIdx: 2 },  // Cinematic at 12s
  { at: 16000, clipIdx: 3 },  // Creator at 16s
  { at: 20000, clipIdx: 4 },  // Back to cinematic at 20s (END)
];

interface WizVidIntroProps {
  onClose: () => void;
}

export default function WizVidIntro({ onClose }: WizVidIntroProps) {
  const [, navigate] = useLocation();

  // ── Which video element is "front" (visible) ──────────────────────────────
  // We alternate between video A and B for dissolves
  const [frontIsA, setFrontIsA]   = useState(true);
  const [aOpacity, setAOpacity]   = useState(0); // starts at 0 (HOOK = black)
  const [bOpacity, setBOpacity]   = useState(0);

  // ── Text overlay ──────────────────────────────────────────────────────────
  const [overlayText, setOverlayText]       = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showLogo, setShowLogo]       = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [showCTA, setShowCTA]         = useState(false);
  const [isExiting, setIsExiting]     = useState(false);

  // ── Sound ─────────────────────────────────────────────────────────────────
  const [muted, setMuted] = useState(() => {
    try { return sessionStorage.getItem(SOUND_KEY) !== "on"; }
    catch { return true; }
  });

  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoARef    = useRef<HTMLVideoElement>(null);
  const videoBRef    = useRef<HTMLVideoElement>(null);
  const audioRef     = useRef<HTMLAudioElement>(null);
  const isExitingRef = useRef(false);
  const frontIsARef  = useRef(true); // tracks which is front without stale closure
  const timers       = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  // ── Load a clip into a specific video element and play it ─────────────────
  const loadAndPlay = useCallback((ref: React.RefObject<HTMLVideoElement | null>, src: string) => {
    const v = ref.current;
    if (!v) return;
    v.src = src;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.load();
    v.play().catch(() => {});
  }, []);

  // ── Dissolve to a new clip ─────────────────────────────────────────────────
  // Loads the clip into the BACK element, then cross-fades to it
  const dissolveToClip = useCallback((src: string) => {
    if (isExitingRef.current) return;

    const isFrontA = frontIsARef.current;
    const backRef  = isFrontA ? videoBRef : videoARef;

    // Load clip into back element
    loadAndPlay(backRef, src);

    // Start dissolve: fade in back, fade out front
    if (isFrontA) {
      setBOpacity(1);
      setAOpacity(0);
    } else {
      setAOpacity(1);
      setBOpacity(0);
    }

    // After dissolve completes, swap front
    addTimer(() => {
      frontIsARef.current = !isFrontA;
      setFrontIsA(!isFrontA);
    }, DISSOLVE_MS);
  }, [addTimer, loadAndPlay]);

  // ── Show text overlay ─────────────────────────────────────────────────────
  const showTextOverlay = useCallback((text: string, showAt: number, hideAt: number) => {
    addTimer(() => {
      if (isExitingRef.current) return;
      setOverlayText(text);
      setOverlayOpacity(0);
      requestAnimationFrame(() => requestAnimationFrame(() => setOverlayOpacity(1)));

      addTimer(() => {
        setOverlayOpacity(0);
        addTimer(() => setOverlayText(null), 450);
      }, hideAt - showAt - 450);
    }, showAt);
  }, [addTimer]);

  // ── Master timeline ────────────────────────────────────────────────────────
  useEffect(() => {
    // Preload first clip into video B immediately so it's ready at 3s
    loadAndPlay(videoBRef, CLIPS[0]);

    // Logo and tagline
    addTimer(() => setShowLogo(true),    800);
    addTimer(() => setShowTagline(true), 1600);

    // Text overlays
    TEXT_SCHEDULE.forEach(({ showAt, hideAt, text }) => {
      showTextOverlay(text, showAt, hideAt);
    });

    // Clip transitions
    CLIP_SCHEDULE.forEach(({ at, clipIdx }) => {
      addTimer(() => dissolveToClip(CLIPS[clipIdx]), at);
    });

    // CTA
    addTimer(() => setShowCTA(true), 20500);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Audio: start muted on mount ───────────────────────────────────────────
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = true;
    a.currentTime = 0;
    a.play().catch(() => {});
  }, []);

  // ── Audio: sync mute state ────────────────────────────────────────────────
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = muted;
    try { sessionStorage.setItem(SOUND_KEY, muted ? "off" : "on"); }
    catch { /* ignore */ }
    if (!muted && a.paused) a.play().catch(() => {});
  }, [muted]);

  // ── Dismiss ───────────────────────────────────────────────────────────────
  const dismiss = useCallback((destination?: string) => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setIsExiting(true);
    timers.current.forEach(clearTimeout);
    audioRef.current?.pause();
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
      {/* ── Video A (persistent — no key prop) ─────────────────────────────── */}
      <video
        ref={videoARef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{
          opacity: aOpacity,
          transition: `opacity ${DISSOLVE_MS}ms ease`,
          zIndex: 0,
        }}
        autoPlay
        muted
        playsInline
        loop
        crossOrigin="anonymous"
      />

      {/* ── Video B (persistent — no key prop) ─────────────────────────────── */}
      <video
        ref={videoBRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{
          opacity: bOpacity,
          transition: `opacity ${DISSOLVE_MS}ms ease`,
          zIndex: 0,
        }}
        autoPlay
        muted
        playsInline
        loop
        crossOrigin="anonymous"
      />

      {/* ── Cinematic vignette overlay ──────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* ── Steel Thunderfall audio ─────────────────────────────────────────── */}
      <audio
        ref={audioRef}
        src={INTRO_AUDIO}
        preload="auto"
        crossOrigin="anonymous"
      />

      {/* ── Skip (top-right) ───────────────────────────────────────────────── */}
      <button
        onClick={() => dismiss()}
        className="absolute top-5 right-5 flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/60 hover:text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm"
        style={{ zIndex: 20 }}
        aria-label="Skip intro"
      >
        <X className="w-3.5 h-3.5" />
        Skip
      </button>

      {/* ── Sound toggle (top-left) ─────────────────────────────────────────── */}
      <button
        onClick={() => setMuted(m => !m)}
        className="absolute top-5 left-5 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm"
        style={{ zIndex: 20 }}
        aria-label={muted ? "Enable sound" : "Mute audio"}
      >
        {muted ? (
          <><VolumeX className="w-4 h-4" /><span className="hidden sm:inline">Enable Sound</span></>
        ) : (
          <><Volume2 className="w-4 h-4" /><span className="hidden sm:inline">Mute</span></>
        )}
      </button>

      {/* ── Cinematic strapline text overlay ───────────────────────────────── */}
      <div
        className="absolute inset-x-0 pointer-events-none flex items-center justify-center px-8"
        style={{
          zIndex: 10,
          top: "38%",
          transform: "translateY(-50%)",
        }}
        aria-hidden="true"
      >
        <p
          style={{
            opacity: overlayText ? overlayOpacity : 0,
            transition: `opacity ${overlayOpacity > 0 ? 500 : 400}ms cubic-bezier(0.4,0,0.2,1)`,
            fontFamily: "'Bebas Neue', 'Barlow Condensed', 'Inter', sans-serif",
            textShadow: "0 2px 40px rgba(0,0,0,0.98), 0 0 80px rgba(139,92,246,0.35)",
            letterSpacing: "0.15em",
            lineHeight: 1.1,
          }}
          className="text-center text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light tracking-[0.15em] uppercase"
        >
          {overlayText ?? "\u00A0"}
        </p>
      </div>

      {/* ── Bottom content: logo + tagline + CTA ───────────────────────────── */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-16 sm:pb-20 px-6 text-center"
        style={{ zIndex: 10 }}
      >
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
            }}
            draggable={false}
          />
        </div>

        {/* Tagline */}
        <p
          className="mt-3 text-white/70 font-light tracking-[0.3em] uppercase text-xs sm:text-sm"
          style={{
            opacity: showTagline ? 1 : 0,
            transform: showTagline ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 600ms ease 0.1s, transform 600ms ease 0.1s",
            textShadow: "0 2px 20px rgba(0,0,0,0.9)",
          }}
        >
          AI Music Video Creator
        </p>

        {/* Enter WizVid CTA */}
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
