import { useEffect, useRef, useState, useCallback } from "react";

/* ── Asset URLs ──────────────────────────────────────────────────────────── */
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";

const LOGO_URL     = `${CDN}/wizvid-logo-transparent_fcdb69d6.png`;
const AUDIO_URL    = `${CDN}/wizvid_cinema_sting_afce8fbc.mp3`;

// Fast-cut clip images — 4 cinematic frames
const CLIP_MUSIC   = `${CDN}/whos-it-for-musicians-ezcSAGNTzuKKxG5kyRC8bK.webp`;
const CLIP_PIXAR   = `${CDN}/style-pixar3d-eN2z5fKQJJTuTc3Ghd84dV.webp`;
const CLIP_CINEMA  = `${CDN}/style-cinematic-UvoChSsK7xZ9a7MR2bUHeq.webp`;
const CLIP_FANTASY = `${CDN}/style-epic-fantasy-aaR23m63VQcBx6VzTSa7jJ.webp`;

// UI flow frames
const UI_PROMPT    = `${CDN}/step1-upload-audio-byRxxURESoxMZYpCB7FKpm.webp`;
const UI_STORYBOARD= `${CDN}/step2-style-collage-P6HWeTbd9g6UsLFLRWYJEi.webp`;
const UI_RENDER    = `${CDN}/step3-ai-generated-scene-5QTx7hBMWwzLqpgwATS24U.webp`;

// Background poster for logo reveal
const BG_POSTER    = `${CDN}/wizvid-intro-bg-4k-S9fuvpjGgLio3Y2rzSEUfh.webp`;

export const INTRO_SESSION_KEY = "wizvid_intro_seen";
const SOUND_STORAGE_KEY = "wizvid_sound_enabled";

interface Props {
  onComplete: () => void;
}

// ── Stage type ────────────────────────────────────────────────────────────
// stage 0: black (pre-start)
// stage 1: fast-cut clips (0–1.2s)
// stage 2: category text (1.2–2.5s)
// stage 3: UI flow (2.5–3.8s)
// stage 4: logo reveal (3.8–5s+)
type Stage = 0 | 1 | 2 | 3 | 4;

const FAST_CLIPS = [
  { src: CLIP_MUSIC,   label: "MUSIC VIDEO"       },
  { src: CLIP_PIXAR,   label: "PIXAR ANIMATION"   },
  { src: CLIP_CINEMA,  label: "CINEMATIC FILM"     },
  { src: CLIP_FANTASY, label: "EPIC FANTASY"       },
];

const CATEGORY_WORDS = ["MUSIC VIDEOS", "CINEMATIC FILMS", "PIXAR ANIMATION"];

const UI_FRAMES = [
  { src: UI_PROMPT,     label: "Describe your idea…",       sub: "Prompt" },
  { src: UI_STORYBOARD, label: "AI builds storyboard…",     sub: "Storyboard" },
  { src: UI_RENDER,     label: "Rendering final video…",    sub: "Final Video" },
];

/**
 * CinematicEntryScreen — IMAX-style 5-second product trailer.
 *
 * Stage 0 (0ms):       Black screen
 * Stage 1 (0–1200ms):  Fast-cut clips (4 × 300ms each)
 * Stage 2 (1200–2500ms): Category text — MUSIC VIDEOS / CINEMATIC FILMS / PIXAR ANIMATION
 * Stage 3 (2500–3800ms): UI flow — prompt → storyboard → final video
 * Stage 4 (3800ms+):   Logo reveal with bloom + WizSound™ waveform
 * Exit (5000ms):       Auto-dismiss with 700ms fade
 */
export default function CinematicEntryScreen({ onComplete }: Props) {
  const [stage, setStage]           = useState<Stage>(0);
  const [clipIndex, setClipIndex]   = useState(0);
  const [flashActive, setFlash]     = useState(false);
  const [catIndex, setCatIndex]     = useState(0);
  const [catVisible, setCatVisible] = useState(false);
  const [uiFrame, setUiFrame]       = useState(0);
  const [uiVisible, setUiVisible]   = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [soundVisible, setSoundVisible] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [exiting, setExiting]       = useState(false);

  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const exitingRef  = useRef(false);
  const timersRef   = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  /* ── Preload all images ───────────────────────────────────────────────── */
  useEffect(() => {
    const urls = [
      CLIP_MUSIC, CLIP_PIXAR, CLIP_CINEMA, CLIP_FANTASY,
      UI_PROMPT, UI_STORYBOARD, UI_RENDER, BG_POSTER,
    ];
    urls.forEach((src) => { const img = new Image(); img.src = src; });
  }, []);

  /* ── Master timeline ─────────────────────────────────────────────────── */
  useEffect(() => {
    // Stage 1: fast-cut clips start immediately
    addTimer(() => setStage(1), 80);

    // Clip transitions: 4 clips × 300ms each
    addTimer(() => { setFlash(true); setTimeout(() => setFlash(false), 80); setClipIndex(1); }, 300);
    addTimer(() => { setFlash(true); setTimeout(() => setFlash(false), 80); setClipIndex(2); }, 600);
    addTimer(() => { setFlash(true); setTimeout(() => setFlash(false), 80); setClipIndex(3); }, 900);

    // Stage 2: category text (1200ms)
    addTimer(() => {
      setStage(2);
      setClipIndex(0);
      setCatIndex(0);
      setCatVisible(true);
    }, 1200);
    addTimer(() => { setCatVisible(false); }, 1600);
    addTimer(() => { setCatIndex(1); setCatVisible(true); }, 1750);
    addTimer(() => { setCatVisible(false); }, 2100);
    addTimer(() => { setCatIndex(2); setCatVisible(true); }, 2250);
    addTimer(() => { setCatVisible(false); }, 2450);

    // Stage 3: UI flow (2500ms)
    addTimer(() => {
      setStage(3);
      setUiFrame(0);
      setUiVisible(true);
    }, 2500);
    addTimer(() => { setUiVisible(false); }, 2850);
    addTimer(() => { setUiFrame(1); setUiVisible(true); }, 3000);
    addTimer(() => { setUiVisible(false); }, 3350);
    addTimer(() => { setUiFrame(2); setUiVisible(true); }, 3500);
    addTimer(() => { setUiVisible(false); }, 3750);

    // Stage 4: logo reveal (3800ms)
    addTimer(() => {
      setStage(4);
      setSoundVisible(true);
      setTimeout(() => setLogoVisible(true), 150);
    }, 3800);

    // Auto-dismiss at 6200ms (gives time to read logo)
    addTimer(() => dismiss(), 6200);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Sound toggle ────────────────────────────────────────────────────── */
  const enableSound = useCallback(() => {
    if (soundEnabled) return;
    setSoundEnabled(true);
    try { localStorage.setItem(SOUND_STORAGE_KEY, "1"); } catch { /* noop */ }
    const audio = new Audio(AUDIO_URL);
    audio.volume = 0.85;
    audioRef.current = audio;
    audio.play().catch(() => { /* blocked */ });
  }, [soundEnabled]);

  /* ── Keyboard skip ───────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " ") { e.preventDefault(); dismiss(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Dismiss ─────────────────────────────────────────────────────────── */
  const dismiss = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    timersRef.current.forEach(clearTimeout);
    if (audioRef.current) {
      const audio = audioRef.current;
      const fade = setInterval(() => {
        if (audio.volume > 0.06) audio.volume = Math.max(0, audio.volume - 0.1);
        else { audio.pause(); clearInterval(fade); }
      }, 40);
    }
    setExiting(true);
    try { sessionStorage.setItem(INTRO_SESSION_KEY, "true"); } catch { /* noop */ }
    setTimeout(onComplete, 700);
  }, [onComplete]);

  /* ── Current clip for fast-cut ───────────────────────────────────────── */
  const currentClip = FAST_CLIPS[clipIndex];
  const currentCat  = CATEGORY_WORDS[catIndex];
  const currentUi   = UI_FRAMES[uiFrame];

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{
        zIndex: 9999,
        background: "#000",
        opacity: exiting ? 0 : 1,
        transition: "opacity 700ms cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: exiting ? "none" : "auto",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="WizVid cinematic intro"
    >
      {/* ── ANAMORPHIC LETTERBOX ─────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 bg-black pointer-events-none" style={{ height: "5vh", zIndex: 50 }} />
      <div className="absolute bottom-0 left-0 right-0 bg-black pointer-events-none" style={{ height: "5vh", zIndex: 50 }} />

      {/* ── STAGE 1: FAST-CUT CLIPS ──────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          opacity: stage === 1 ? 1 : 0,
          transition: stage === 1 ? "none" : "opacity 200ms ease-out",
          zIndex: 5,
        }}
      >
        {/* Clip image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${currentClip.src})`,
            transition: "none",
          }}
        />
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 bg-black/35" />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.75) 100%)" }} />
        {/* Clip label — bottom left */}
        <div
          className="absolute bottom-[7vh] left-6 text-white/70 font-mono text-xs tracking-[0.25em] uppercase"
          style={{ letterSpacing: "0.25em" }}
        >
          {currentClip.label}
        </div>
        {/* Frame counter — top right */}
        <div className="absolute top-[7vh] right-6 text-white/30 font-mono text-xs tracking-widest">
          {String(clipIndex + 1).padStart(2, "0")} / 04
        </div>
      </div>

      {/* ── FLASH OVERLAY ────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-white pointer-events-none"
        style={{
          zIndex: 20,
          opacity: flashActive ? 0.85 : 0,
          transition: flashActive ? "none" : "opacity 120ms ease-out",
        }}
      />

      {/* ── STAGE 2: CATEGORY TEXT ───────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          zIndex: 10,
          opacity: stage === 2 ? 1 : 0,
          transition: stage === 2 ? "opacity 100ms ease-in" : "opacity 150ms ease-out",
          background: "radial-gradient(ellipse at 50% 50%, rgba(88,28,235,0.22) 0%, #000 70%)",
        }}
      >
        {/* Scanline texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)",
            zIndex: 0,
          }}
        />
        {/* Category word */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            opacity: catVisible ? 1 : 0,
            transform: catVisible ? "scale(1) translateY(0)" : "scale(1.08) translateY(-6px)",
            transition: catVisible
              ? "opacity 80ms ease-out, transform 100ms cubic-bezier(0.22, 1, 0.36, 1)"
              : "opacity 100ms ease-in, transform 100ms ease-in",
          }}
        >
          <span
            style={{
              display: "block",
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontSize: "clamp(2.2rem, 7vw, 5.5rem)",
              background: "linear-gradient(135deg, #fff 0%, #c4b5fd 40%, #e879f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 30px rgba(167,139,250,0.9)) drop-shadow(0 0 60px rgba(167,139,250,0.5))",
              animation: catVisible ? "catImpact 0.15s ease-out" : "none",
            }}
          >
            {currentCat}
          </span>
          {/* Underline glow bar */}
          <div
            style={{
              height: 2,
              marginTop: 8,
              background: "linear-gradient(90deg, transparent, #a78bfa, #e879f9, #a78bfa, transparent)",
              opacity: catVisible ? 1 : 0,
              transform: catVisible ? "scaleX(1)" : "scaleX(0)",
              transition: "transform 120ms ease-out, opacity 120ms ease-out",
              transformOrigin: "center",
            }}
          />
        </div>
      </div>

      {/* ── STAGE 3: UI FLOW ─────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-4"
        style={{
          zIndex: 10,
          opacity: stage === 3 ? 1 : 0,
          transition: stage === 3 ? "opacity 120ms ease-in" : "opacity 150ms ease-out",
          background: "radial-gradient(ellipse at 50% 50%, rgba(30,10,60,0.95) 0%, #000 80%)",
        }}
      >
        {/* UI frame container */}
        <div
          style={{
            opacity: uiVisible ? 1 : 0,
            transform: uiVisible ? "scale(1) translateY(0)" : "scale(0.96) translateY(8px)",
            transition: uiVisible
              ? "opacity 100ms ease-out, transform 120ms cubic-bezier(0.22, 1, 0.36, 1)"
              : "opacity 100ms ease-in",
            width: "min(85vw, 520px)",
          }}
        >
          {/* Browser chrome mockup */}
          <div
            className="rounded-xl overflow-hidden border border-white/15"
            style={{
              background: "rgba(15,10,30,0.95)",
              boxShadow: "0 0 60px rgba(109,40,217,0.4), 0 0 120px rgba(109,40,217,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8" style={{ background: "rgba(0,0,0,0.5)" }}>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 mx-3 h-5 rounded bg-white/6 flex items-center px-2">
                <span className="text-white/30 text-[10px] font-mono">wizvid.ai</span>
              </div>
            </div>
            {/* Screenshot */}
            <div className="relative" style={{ aspectRatio: "16/9" }}>
              <img
                src={currentUi.src}
                alt={currentUi.sub}
                className="w-full h-full object-cover"
                style={{ display: "block" }}
              />
              {/* Purple tint overlay */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(88,28,235,0.15) 0%, transparent 60%)" }} />
              {/* Step label */}
              <div
                className="absolute bottom-3 left-3 right-3 flex items-center justify-between"
              >
                <span
                  className="text-white font-semibold text-xs px-2.5 py-1 rounded-md"
                  style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  {currentUi.label}
                </span>
                <span
                  className="text-violet-300 font-bold text-xs px-2 py-1 rounded-md"
                  style={{ background: "rgba(88,28,235,0.5)", backdropFilter: "blur(4px)", border: "1px solid rgba(139,92,246,0.3)" }}
                >
                  {currentUi.sub}
                </span>
              </div>
            </div>
          </div>
          {/* Step dots */}
          <div className="flex justify-center gap-2 mt-3">
            {UI_FRAMES.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === uiFrame ? 20 : 6,
                  height: 6,
                  background: i === uiFrame ? "linear-gradient(90deg, #7c3aed, #e879f9)" : "rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── STAGE 4: LOGO REVEAL ─────────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 8,
          opacity: stage === 4 ? 1 : 0,
          transition: "opacity 400ms ease-in",
        }}
      >
        {/* Background poster */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${BG_POSTER})` }}
        />
        {/* Deep dark overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.92) 100%)" }} />
        {/* Radial vignette */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(0,0,0,0.7) 100%)" }} />
        {/* Purple bloom */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 48%, rgba(109,40,217,0.22) 0%, transparent 55%)",
            animation: "bloomPulse 2.5s ease-in-out infinite alternate",
          }}
        />
        {/* Glow sweep — horizontal light bar */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "42%",
            left: "-10%",
            width: "120%",
            height: 1.5,
            background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.8), rgba(232,121,249,0.9), rgba(167,139,250,0.8), transparent)",
            animation: "glowSweep 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards",
            opacity: 0,
            boxShadow: "0 0 20px 4px rgba(167,139,250,0.5)",
          }}
        />
        {/* Film grain */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.03 }} aria-hidden="true">
          <filter id="grain4">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain4)" />
        </svg>
      </div>

      {/* ── LOGO + WIZSOUND (stage 4) ─────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          zIndex: 15,
          opacity: logoVisible ? 1 : 0,
          transform: logoVisible ? "scale(1) translateY(0)" : "scale(0.88) translateY(12px)",
          transition: "opacity 500ms cubic-bezier(0.22, 1, 0.36, 1), transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Logo */}
        <img
          src={LOGO_URL}
          alt="WizVid"
          draggable={false}
          className="object-contain mb-6"
          style={{
            height: "clamp(4.5rem, 12vw, 9rem)",
            filter: "drop-shadow(0 0 40px rgba(139,92,246,1)) drop-shadow(0 0 80px rgba(139,92,246,0.6)) drop-shadow(0 0 140px rgba(109,40,217,0.35))",
            animation: "logoPulse 2.8s ease-in-out infinite",
          }}
        />

        {/* WizSound™ branding */}
        <div className="flex flex-col items-center gap-2">
          <span
            className="uppercase tracking-[0.3em] font-light"
            style={{ fontSize: "clamp(0.55rem, 1.1vw, 0.7rem)", color: "rgba(255,255,255,0.4)" }}
          >
            Powered by
          </span>
          <span
            className="font-bold tracking-wide"
            style={{
              fontSize: "clamp(1rem, 2.5vw, 1.5rem)",
              background: "linear-gradient(90deg, #a78bfa, #e879f9, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 18px rgba(167,139,250,0.8))",
              animation: "wizSoundGlow 0.9s ease-in-out infinite alternate",
            }}
          >
            WizSound™
          </span>
          {/* Animated waveform */}
          <div className="flex items-end gap-[3px] mt-1" aria-hidden="true" style={{ height: 24 }}>
            {[5, 10, 18, 24, 28, 24, 18, 10, 5].map((h, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: 3,
                  height: h,
                  background: "linear-gradient(to top, #5b21b6, #a78bfa, #e879f9)",
                  animation: `eqBar ${0.4 + i * 0.06}s ease-in-out ${i * 0.035}s infinite alternate`,
                  opacity: 0.9,
                  boxShadow: "0 0 4px rgba(167,139,250,0.5)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── SKIP BUTTON ──────────────────────────────────────────────────── */}
      <button
        onClick={dismiss}
        className="absolute flex items-center gap-2 rounded-full border border-white/15 bg-black/40 backdrop-blur-sm text-white/45 hover:text-white/80 hover:bg-white/10 hover:border-white/30 transition-all text-xs font-medium tracking-widest uppercase"
        style={{ top: "6.5vh", right: "1.5rem", zIndex: 60, padding: "0.4rem 1rem" }}
        aria-label="Skip intro"
      >
        SKIP
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* ── ENABLE SOUND BUTTON ──────────────────────────────────────────── */}
      {soundVisible && !soundEnabled && (
        <button
          onClick={enableSound}
          className="absolute flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/15 backdrop-blur-sm text-violet-200 hover:bg-violet-500/25 hover:border-violet-400/60 transition-all text-xs font-semibold tracking-wide"
          style={{ top: "6.5vh", left: "1.5rem", zIndex: 60, padding: "0.4rem 1rem", animation: "soundPulse 2s ease-in-out infinite" }}
          aria-label="Enable sound"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
          Enable Sound
        </button>
      )}
      {soundVisible && soundEnabled && (
        <div
          className="absolute flex items-center gap-2 rounded-full border border-white/10 bg-white/5 text-white/35 text-xs font-medium tracking-wide"
          style={{ top: "6.5vh", left: "1.5rem", zIndex: 60, padding: "0.4rem 1rem" }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          Sound On
        </div>
      )}

      {/* ── ENTER EXPERIENCE CTA (stage 4) ───────────────────────────────── */}
      {stage === 4 && (
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{ bottom: "8vh", zIndex: 60, opacity: logoVisible ? 1 : 0, transition: "opacity 600ms ease-out 400ms" }}
        >
          <button
            onClick={dismiss}
            className="group inline-flex items-center gap-3 bg-white text-black font-bold rounded-2xl tracking-wide transition-all duration-300 active:scale-95 hover:bg-white/92"
            style={{
              fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
              padding: "clamp(0.75rem, 1.8vw, 0.95rem) clamp(1.6rem, 4vw, 2.5rem)",
              boxShadow: "0 0 40px rgba(255,255,255,0.25), 0 0 80px rgba(255,255,255,0.1)",
              animation: "ctaPulse 2.5s ease-in-out infinite",
            }}
            aria-label="Enter WizVid"
          >
            Enter Experience
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* ── KEYFRAMES ────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes catImpact {
          0%   { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        @keyframes glowSweep {
          0%   { transform: translateX(-5%) scaleX(0); opacity: 0; transform-origin: left center; }
          20%  { opacity: 1; }
          100% { transform: translateX(5%) scaleX(1); opacity: 0; transform-origin: left center; }
        }
        @keyframes bloomPulse {
          0%   { opacity: 0.6; }
          100% { opacity: 1; }
        }
        @keyframes logoPulse {
          0%, 100% {
            filter: drop-shadow(0 0 40px rgba(139,92,246,1)) drop-shadow(0 0 80px rgba(139,92,246,0.6)) drop-shadow(0 0 140px rgba(109,40,217,0.35));
          }
          50% {
            filter: drop-shadow(0 0 55px rgba(139,92,246,1)) drop-shadow(0 0 110px rgba(139,92,246,0.75)) drop-shadow(0 0 180px rgba(109,40,217,0.5));
          }
        }
        @keyframes wizSoundGlow {
          0%   { filter: drop-shadow(0 0 12px rgba(167,139,250,0.6)); }
          100% { filter: drop-shadow(0 0 28px rgba(232,121,249,1)); }
        }
        @keyframes eqBar {
          0%   { transform: scaleY(0.25); }
          100% { transform: scaleY(1); }
        }
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(255,255,255,0.25), 0 0 80px rgba(255,255,255,0.1); }
          50%       { box-shadow: 0 0 60px rgba(255,255,255,0.38), 0 0 120px rgba(255,255,255,0.15); }
        }
        @keyframes soundPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); }
          50%       { box-shadow: 0 0 0 6px rgba(139,92,246,0); }
        }
      `}</style>
    </div>
  );
}
