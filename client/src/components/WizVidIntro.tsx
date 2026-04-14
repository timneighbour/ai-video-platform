/**
 * WizVidIntro — Cinematic Trailer (Apr 2026)
 *
 * ARCHITECTURE: Two persistent video elements (A/B) — NO key props.
 * Clips loaded via ref.current.src. Dissolves are CSS opacity cross-fades.
 *
 * Trailer structure (audio: Steel Thunderfall 12.48s):
 *
 *   0–3s    BLACK SCREEN     Deep bass hit → "This changes everything"
 *   3–10s   SINGER CLIP      Slow, intimate build → "Create anything"
 *   10–18s  CINEMATIC CLIP   Hero moment (best clip) → "Powered by AI"
 *   18–24s  CONCERT CLIP     Energy close → "Enhanced with WizSound™"
 *   24s+    HOLD FRAME       Audio ends → "Enter WizVid" CTA
 *
 * Rules:
 *   - 3 clips only. No weak clips. No slideshow.
 *   - Each clip held for 7–8s minimum (cinematic pacing)
 *   - Dissolve: 1500ms slow fade (not a cut)
 *   - Audio drives timing — text appears on key audio moments
 *   - No loop on clips or audio
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, X, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

// ── CDN ───────────────────────────────────────────────────────────────────────
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const LOGO        = `${CDN}/wizvid-logo-transparent_fcdb69d6.png`;
const INTRO_AUDIO = `${CDN}/SteelThunderfall_a37defe2.mp3`;

// 3 premium clips — ordered by emotional arc
const CLIP_SINGER    = `${CDN}/intro-new-singer_fdadff1e.mp4`;
const CLIP_CINEMATIC = `${CDN}/intro-new-cinematic_d6673107.mp4`;
const CLIP_CONCERT   = `${CDN}/hero-concert-web_2f9db1a6.mp4`;

export const INTRO_SEEN_KEY = "wizvid_intro_v3_seen";
const SOUND_KEY = "wizvid_intro_sound";

const DISSOLVE_MS = 1500; // slow cinematic dissolve

// ── Clip transition schedule (ms from start) ─────────────────────────────────
const CLIP_SCHEDULE = [
  { at: 3000,  src: CLIP_SINGER    },  // BUILD phase
  { at: 10000, src: CLIP_CINEMATIC },  // HERO MOMENT
  { at: 18000, src: CLIP_CONCERT   },  // ENERGY CLOSE
];

// ── Text overlay schedule (ms from start) ─────────────────────────────────────
// Synced to Steel Thunderfall's musical structure:
//   0–3s:   bass impact
//   3–7s:   tension build
//   7–12s:  energy peak
//   12–16s: cinematic drop
//   16–20s: resolution
const TEXT_SCHEDULE = [
  { showAt: 800,   hideAt: 2700,  text: "This changes everything" },
  { showAt: 4000,  hideAt: 8500,  text: "Create anything"         },
  { showAt: 11000, hideAt: 16500, text: "Powered by AI"           },
  { showAt: 18500, hideAt: 23000, text: "Enhanced with WizSound™" },
];

const TEXT_FADE_IN_MS  = 600;
const TEXT_FADE_OUT_MS = 500;

interface WizVidIntroProps {
  onClose: () => void;
}

export default function WizVidIntro({ onClose }: WizVidIntroProps) {
  const [, navigate] = useLocation();

  // ── Video A/B opacity — cross-fade dissolve ───────────────────────────────
  const [aOpacity, setAOpacity] = useState(0);
  const [bOpacity, setBOpacity] = useState(0);
  const frontIsARef = useRef(true); // which element is currently "front"

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
  const timers       = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  // ── Load a clip into a video element and play it ──────────────────────────
  const loadAndPlay = useCallback((
    ref: React.RefObject<HTMLVideoElement | null>,
    src: string,
    loop = false
  ) => {
    const v = ref.current;
    if (!v) return;
    v.src = src;
    v.muted = true;
    v.loop = loop;
    v.playsInline = true;
    v.load();
    v.play().catch(() => {});
  }, []);

  // ── Dissolve to a new clip ─────────────────────────────────────────────────
  const dissolveToClip = useCallback((src: string) => {
    if (isExitingRef.current) return;
    const isFrontA = frontIsARef.current;
    const backRef  = isFrontA ? videoBRef : videoARef;

    // Load clip into the back element
    loadAndPlay(backRef, src, false);

    // Cross-fade: bring back to full opacity, fade out front
    if (isFrontA) {
      setBOpacity(1);
      // Delay fading out A so back clip has a moment to start
      addTimer(() => setAOpacity(0), 100);
    } else {
      setAOpacity(1);
      addTimer(() => setBOpacity(0), 100);
    }

    // After dissolve completes, swap front reference
    addTimer(() => {
      frontIsARef.current = !isFrontA;
    }, DISSOLVE_MS + 200);
  }, [addTimer, loadAndPlay]);

  // ── Show a text overlay with fade in/out ─────────────────────────────────
  const showTextOverlay = useCallback((text: string, showAt: number, hideAt: number) => {
    addTimer(() => {
      if (isExitingRef.current) return;
      setOverlayText(text);
      setOverlayOpacity(0);
      // Double rAF to ensure the DOM has updated before starting transition
      requestAnimationFrame(() => requestAnimationFrame(() => setOverlayOpacity(1)));

      const holdDuration = hideAt - showAt - TEXT_FADE_OUT_MS;
      addTimer(() => {
        setOverlayOpacity(0);
        addTimer(() => setOverlayText(null), TEXT_FADE_OUT_MS + 50);
      }, holdDuration);
    }, showAt);
  }, [addTimer]);

  // ── Master timeline ────────────────────────────────────────────────────────
  useEffect(() => {
    // Preload first clip (singer) into video B immediately — ready at 3s
    loadAndPlay(videoBRef, CLIP_SINGER, false);

    // Logo fades in at 1s, tagline at 2s
    addTimer(() => setShowLogo(true),    1000);
    addTimer(() => setShowTagline(true), 2000);

    // Text overlays (synced to Steel Thunderfall)
    TEXT_SCHEDULE.forEach(({ showAt, hideAt, text }) => {
      showTextOverlay(text, showAt, hideAt);
    });

    // Clip transitions
    CLIP_SCHEDULE.forEach(({ at, src }) => {
      addTimer(() => dissolveToClip(src), at);
    });

    // CTA appears at 24.5s (after audio ends at ~24s, slight delay for impact)
    addTimer(() => setShowCTA(true), 24500);

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
    a.loop = false; // NO loop
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
        transition: isExiting ? "opacity 600ms ease" : "opacity 1000ms ease",
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
          transition: `opacity ${DISSOLVE_MS}ms cubic-bezier(0.4,0,0.2,1)`,
          zIndex: 0,
        }}
        muted
        playsInline
        crossOrigin="anonymous"
      />

      {/* ── Video B (persistent — no key prop) ─────────────────────────────── */}
      <video
        ref={videoBRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{
          opacity: bOpacity,
          transition: `opacity ${DISSOLVE_MS}ms cubic-bezier(0.4,0,0.2,1)`,
          zIndex: 0,
        }}
        muted
        playsInline
        crossOrigin="anonymous"
      />

      {/* ── Cinematic vignette ──────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: [
            "linear-gradient(to bottom,",
            "  rgba(0,0,0,0.6) 0%,",
            "  rgba(0,0,0,0.05) 35%,",
            "  rgba(0,0,0,0.05) 65%,",
            "  rgba(0,0,0,0.75) 100%",
            ")",
          ].join(""),
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

      {/* ── Cinematic strapline text ────────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 pointer-events-none flex items-center justify-center px-8"
        style={{
          zIndex: 10,
          top: "36%",
          transform: "translateY(-50%)",
        }}
        aria-hidden="true"
      >
        <p
          style={{
            opacity: overlayText ? overlayOpacity : 0,
            transition: `opacity ${overlayOpacity > 0 ? TEXT_FADE_IN_MS : TEXT_FADE_OUT_MS}ms cubic-bezier(0.4,0,0.2,1)`,
            fontFamily: "'Bebas Neue', 'Barlow Condensed', 'Impact', sans-serif",
            textShadow: "0 2px 60px rgba(0,0,0,0.99), 0 0 120px rgba(139,92,246,0.4)",
            letterSpacing: "0.18em",
            lineHeight: 1.05,
          }}
          className="text-center text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-[0.18em] uppercase"
        >
          {overlayText ?? "\u00A0"}
        </p>
      </div>

      {/* ── Bottom: logo + tagline + CTA ───────────────────────────────────── */}
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-16 sm:pb-20 px-6 text-center"
        style={{ zIndex: 10 }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: showLogo ? 1 : 0,
            transform: showLogo ? "scale(1) translateY(0)" : "scale(0.88) translateY(24px)",
            transition: "opacity 1000ms cubic-bezier(0.16,1,0.3,1), transform 1000ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <img
            src={LOGO}
            alt="WizVid"
            className="w-52 sm:w-72 md:w-80 mx-auto"
            style={{
              filter: "drop-shadow(0 0 50px rgba(139,92,246,0.95)) drop-shadow(0 0 100px rgba(139,92,246,0.5))",
            }}
            draggable={false}
          />
        </div>

        {/* Tagline */}
        <p
          className="mt-3 text-white/65 font-light tracking-[0.35em] uppercase text-xs sm:text-sm"
          style={{
            opacity: showTagline ? 1 : 0,
            transform: showTagline ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 700ms ease 0.15s, transform 700ms ease 0.15s",
            textShadow: "0 2px 20px rgba(0,0,0,0.95)",
          }}
        >
          AI Music Video Creator
        </p>

        {/* Enter WizVid CTA */}
        <div
          className="mt-10"
          style={{
            opacity: showCTA ? 1 : 0,
            transform: showCTA ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
            transition: "opacity 800ms cubic-bezier(0.16,1,0.3,1), transform 800ms cubic-bezier(0.16,1,0.3,1)",
            pointerEvents: showCTA ? "auto" : "none",
          }}
        >
          <button
            onClick={() => dismiss("/")}
            className="group relative inline-flex items-center gap-3 px-16 py-4 rounded-full text-base font-semibold text-white transition-all duration-300 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.95) 0%, rgba(109,40,217,1) 100%)",
              boxShadow: "0 0 50px rgba(139,92,246,0.6), 0 0 100px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.18)",
              animation: showCTA ? "ctaPulse 2.8s ease-in-out infinite" : "none",
              letterSpacing: "0.04em",
            }}
          >
            Enter WizVid
            <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1.5" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ctaPulse {
          0%, 100% {
            box-shadow: 0 0 50px rgba(139,92,246,0.6), 0 0 100px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.18);
          }
          50% {
            box-shadow: 0 0 80px rgba(139,92,246,0.85), 0 0 150px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.18);
          }
        }
      `}</style>
    </div>
  );
}
