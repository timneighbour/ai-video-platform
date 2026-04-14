/**
 * WizVidIntro — Cinematic Trailer (Apr 2026)
 *
 * ARCHITECTURE: Two persistent video elements (A/B) — NO key props.
 * Clips loaded via ref.current.src. Dissolves are CSS opacity cross-fades.
 *
 * 6 visually distinct clip categories (no duplicates):
 *   1. Music video        — singer clip
 *   2. Cinematic film     — dramatic wide shot
 *   3. Abstract / wow     — abstract visual effects
 *   4. Social / nightclub — atmospheric, creator-style
 *   5. AI showcase        — product demo / cinematic output
 *   6. Animation          — WizVid animation sequence
 *
 * Trailer timing (audio: Steel Thunderfall 12.48s):
 *   0–3s    BLACK SCREEN     "This changes everything"
 *   3–5.5s  MUSIC VIDEO      "Music videos"
 *   5.5–8s  CINEMATIC FILM   "Cinematic films"
 *   8–10.5s ABSTRACT / WOW   "Abstract worlds"
 *   10.5–13s SOCIAL / NIGHT  "Social content"
 *   13–15.5s AI SHOWCASE     "Powered by AI"
 *   15.5–18s ANIMATION       "Enhanced with WizSound™"
 *   18s+    HOLD FRAME       "Enter WizVid" CTA
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, X, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

// ── CDN ───────────────────────────────────────────────────────────────────────
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const LOGO        = `${CDN}/wizvid-logo-transparent_fcdb69d6.png`;
const INTRO_AUDIO = `${CDN}/SteelThunderfall_a37defe2.mp3`;

// 6 visually distinct clips — one per category
const CLIPS = {
  music:     `${CDN}/intro-new-singer_fdadff1e.mp4`,       // 1. Music video
  cinematic: `${CDN}/intro-new-cinematic_d6673107.mp4`,    // 2. Cinematic film
  abstract:  `${CDN}/hero-abstract-web_ed099aea.mp4`,      // 3. Abstract / wow shot
  social:    `${CDN}/hero-nightclub-web_3a88ea3e.mp4`,     // 4. Social / nightclub
  showcase:  `${CDN}/showcase-cinematic_13667434.mp4`,     // 5. AI showcase / product
  animation: `${CDN}/wizvid-animation-v3_85969477.mp4`,    // 6. Animation
};

export const INTRO_SEEN_KEY = "wizvid_intro_v3_seen";
const SOUND_KEY = "wizvid_intro_sound";

const DISSOLVE_MS = 900; // smooth but not sluggish

// ── Clip schedule (ms from start) ─────────────────────────────────────────────
const CLIP_SCHEDULE = [
  { at: 3000,  src: CLIPS.music     },  // Music video
  { at: 5500,  src: CLIPS.cinematic },  // Cinematic film
  { at: 8000,  src: CLIPS.abstract  },  // Abstract / wow
  { at: 10500, src: CLIPS.social    },  // Social / nightclub
  { at: 13000, src: CLIPS.showcase  },  // AI showcase
  { at: 15500, src: CLIPS.animation },  // Animation — hold for CTA
];

// ── Text schedule (ms from start) ─────────────────────────────────────────────
// Synced to Steel Thunderfall (12.48s):
//   0–3s:   deep bass impact
//   3–7s:   tension build
//   7–12s:  energy peak / drop
//   12s+:   resolution / silence
const TEXT_SCHEDULE = [
  { showAt: 700,   hideAt: 2700,  text: "This changes everything" },
  { showAt: 3200,  hideAt: 5200,  text: "Music videos"            },
  { showAt: 5700,  hideAt: 7700,  text: "Cinematic films"         },
  { showAt: 8200,  hideAt: 10200, text: "Abstract worlds"         },
  { showAt: 10700, hideAt: 12700, text: "Social content"          },
  { showAt: 13200, hideAt: 15200, text: "Powered by AI"           },
  { showAt: 15700, hideAt: 17700, text: "Enhanced with WizSound™" },
];

const TEXT_FADE_IN_MS  = 500;
const TEXT_FADE_OUT_MS = 400;

interface WizVidIntroProps {
  onClose: () => void;
}

export default function WizVidIntro({ onClose }: WizVidIntroProps) {
  const [, navigate] = useLocation();

  // ── Video A/B opacity — cross-fade dissolve ───────────────────────────────
  const [aOpacity, setAOpacity] = useState(0);
  const [bOpacity, setBOpacity] = useState(0);
  const frontIsARef = useRef(true);

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
    src: string
  ) => {
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
  const dissolveToClip = useCallback((src: string) => {
    if (isExitingRef.current) return;
    const isFrontA = frontIsARef.current;
    const backRef  = isFrontA ? videoBRef : videoARef;

    // Load clip into back element
    loadAndPlay(backRef, src);

    // Cross-fade: bring back to full opacity, fade out front
    if (isFrontA) {
      setBOpacity(1);
      addTimer(() => setAOpacity(0), 80);
    } else {
      setAOpacity(1);
      addTimer(() => setBOpacity(0), 80);
    }

    // After dissolve, swap front reference
    addTimer(() => {
      frontIsARef.current = !isFrontA;
    }, DISSOLVE_MS + 150);
  }, [addTimer, loadAndPlay]);

  // ── Show a text overlay ───────────────────────────────────────────────────
  const showTextOverlay = useCallback((text: string, showAt: number, hideAt: number) => {
    addTimer(() => {
      if (isExitingRef.current) return;
      setOverlayText(text);
      setOverlayOpacity(0);
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
    // Preload first clip into video B immediately — ready at 3s
    loadAndPlay(videoBRef, CLIPS.music);

    // Logo at 0.8s, tagline at 1.8s
    addTimer(() => setShowLogo(true),    800);
    addTimer(() => setShowTagline(true), 1800);

    // Text overlays
    TEXT_SCHEDULE.forEach(({ showAt, hideAt, text }) => {
      showTextOverlay(text, showAt, hideAt);
    });

    // Clip transitions
    CLIP_SCHEDULE.forEach(({ at, src }) => {
      addTimer(() => dissolveToClip(src), at);
    });

    // CTA at 18.5s
    addTimer(() => setShowCTA(true), 18500);

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
    a.loop = false;
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
            "  rgba(0,0,0,0.55) 0%,",
            "  rgba(0,0,0,0.08) 30%,",
            "  rgba(0,0,0,0.08) 65%,",
            "  rgba(0,0,0,0.78) 100%",
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
            textShadow: "0 2px 60px rgba(0,0,0,0.99), 0 0 120px rgba(139,92,246,0.45)",
            letterSpacing: "0.2em",
            lineHeight: 1.05,
          }}
          className="text-center text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-[0.2em] uppercase"
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
          Create anything with AI
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
