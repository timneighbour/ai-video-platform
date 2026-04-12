import { useEffect, useRef, useState, useCallback } from "react";

/* ── Assets ─────────────────────────────────────────────────────────── */
// Video A: The cinematic intro film — separate from homepage background
const INTRO_VIDEO_MP4 =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/intro-sequence_8f81fbfd.mp4";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-transparent_fcdb69d6.png";

const SESSION_KEY = "wizvid_intro_seen_v3";

/* ── 8-scene story overlay sequence ─────────────────────────────────
   Timecoded to the intro video. Each scene has a purpose.
─────────────────────────────────────────────────────────────────────── */
interface Scene {
  id: number;
  startSec: number;
  phase: "problem" | "reset" | "reveal" | "prompt" | "storyboard" | "build" | "output" | "cta";
  eyebrow?: string;
  headline: string;
  sub?: string;
  mono?: boolean;
}

const SCENES: Scene[] = [
  {
    id: 1,
    startSec: 0,
    phase: "problem",
    eyebrow: "THE PROBLEM",
    headline: "Creating videos is slow.",
    sub: "Too many tools. Too much time. Too much friction.",
  },
  {
    id: 2,
    startSec: 2.8,
    phase: "reset",
    headline: "",
    // Pure black reset — no text
  },
  {
    id: 3,
    startSec: 3.5,
    phase: "reveal",
    eyebrow: "INTRODUCING",
    headline: "WizVid",
    sub: "AI that turns your idea into a cinematic video.",
  },
  {
    id: 4,
    startSec: 5.5,
    phase: "prompt",
    eyebrow: "STEP 1 — YOUR IDEA",
    headline: '"Walking through fire"',
    sub: "Type a prompt. That's all.",
    mono: true,
  },
  {
    id: 5,
    startSec: 7.5,
    phase: "storyboard",
    eyebrow: "STEP 2 — STORYBOARD",
    headline: "WizVid builds your scenes.",
    sub: "Characters. Lighting. Composition.",
  },
  {
    id: 6,
    startSec: 9.5,
    phase: "build",
    eyebrow: "STEP 3 — GENERATING",
    headline: "Every frame rendered.",
    sub: "Cinematic quality. No editing required.",
  },
  {
    id: 7,
    startSec: 11.5,
    phase: "output",
    eyebrow: "RESULT",
    headline: "Your cinematic video.",
    sub: "Ready in under 2 minutes.",
  },
  {
    id: 8,
    startSec: 13.5,
    phase: "cta",
    headline: "WizVid",
    sub: "Turn your ideas into cinematic video — free.",
  },
];

const TOTAL_SECS = 16; // Auto-advance after this

/* ── Phase colour map ──────────────────────────────────────────────── */
const PHASE_COLORS: Record<Scene["phase"], string> = {
  problem: "text-red-300",
  reset: "text-white",
  reveal: "text-violet-200",
  prompt: "text-violet-100",
  storyboard: "text-blue-200",
  build: "text-blue-300",
  output: "text-emerald-200",
  cta: "text-white",
};

const EYEBROW_COLORS: Record<Scene["phase"], string> = {
  problem: "border-red-400/30 bg-red-500/8 text-red-300",
  reset: "border-white/20 bg-white/5 text-white/60",
  reveal: "border-violet-400/40 bg-violet-500/10 text-violet-300",
  prompt: "border-violet-400/40 bg-violet-500/10 text-violet-300",
  storyboard: "border-blue-400/40 bg-blue-500/10 text-blue-300",
  build: "border-blue-400/40 bg-blue-500/10 text-blue-300",
  output: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  cta: "border-white/20 bg-white/5 text-white/70",
};

/* ── Component ───────────────────────────────────────────────────────── */
interface CinematicEntryScreenProps {
  onComplete: () => void;
}

export default function CinematicEntryScreen({ onComplete }: CinematicEntryScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timerSec, setTimerSec] = useState(0);

  /* ── Timer fallback (if video stalls / autoplay blocked) ──────── */
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimerSec((t) => t + 0.1);
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  /* ── Auto-complete after TOTAL_SECS ──────────────────────────── */
  useEffect(() => {
    const timeout = setTimeout(() => {
      handleComplete();
    }, TOTAL_SECS * 1000 + 1200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Show CTA after scene 7 ──────────────────────────────────── */
  const t = videoReady ? currentTime : timerSec;
  useEffect(() => {
    if (t >= 13.5) setCtaVisible(true);
  }, [t]);

  const handleComplete = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* noop */
    }
    setTimeout(onComplete, 800);
  }, [exiting, onComplete]);

  /* ── Video events ─────────────────────────────────────────────── */
  const handleCanPlay = useCallback(() => {
    setVideoReady(true);
    videoRef.current?.play().catch(() => {});
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }, []);

  const handleEnded = useCallback(() => {
    setCtaVisible(true);
    // Don't auto-complete on video end — let user click Enter WizVid
  }, []);

  /* ── Determine active scene ───────────────────────────────────── */
  const activeScene = [...SCENES].reverse().find((s) => t >= s.startSec) ?? SCENES[0];
  const isCTAScene = activeScene.phase === "cta";

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex flex-col transition-opacity duration-800 ${
        exiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ transition: "opacity 0.8s ease-in-out" }}
    >
      {/* ── Video A: Cinematic intro film ──────────────────────── */}
      <video
        ref={videoRef}
        src={INTRO_VIDEO_MP4}
        autoPlay
        muted
        playsInline
        preload="auto"
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          videoReady ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* ── Gradient overlays for text readability ─────────────── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/25 to-black/90 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* ── Film grain ────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── Anamorphic letterbox bars ──────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-[6%] bg-black pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-[6%] bg-black pointer-events-none z-10" />

      {/* ── Logo top-left ──────────────────────────────────────── */}
      <div className="absolute top-[8%] left-8 z-20">
        <img
          src={LOGO_URL}
          alt="WizVid"
          className="h-20 w-auto object-contain drop-shadow-[0_0_24px_rgba(139,92,246,0.95)]"
        />
      </div>

      {/* ── Scene text overlays ───────────────────────────────── */}
      {SCENES.map((scene) => {
        const isActive = scene.id === activeScene.id && !isCTAScene;
        if (scene.phase === "reset") return null; // Pure black reset, no text
        if (scene.phase === "cta") return null; // CTA handled separately below
        return (
          <div
            key={scene.id}
            className={`absolute inset-0 flex flex-col items-center justify-center px-8 z-20 transition-all duration-600 ${
              isActive
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8 pointer-events-none"
            }`}
            style={{ transition: "opacity 0.6s ease, transform 0.6s ease" }}
          >
            {/* Eyebrow badge */}
            {scene.eyebrow && (
              <div
                className={`mb-6 px-4 py-1.5 rounded-full border text-[11px] font-mono tracking-[0.22em] uppercase font-semibold ${
                  EYEBROW_COLORS[scene.phase]
                }`}
              >
                {scene.phase === "build" && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-2 animate-pulse" />
                )}
                {scene.eyebrow}
              </div>
            )}

            {/* Main headline */}
            <h1
              className={`font-extrabold text-center leading-tight drop-shadow-[0_2px_40px_rgba(0,0,0,0.98)] ${
                PHASE_COLORS[scene.phase]
              } ${scene.mono ? "font-mono" : ""}`}
              style={{ fontSize: "clamp(2rem, 7vw, 5.5rem)" }}
            >
              {scene.headline}
            </h1>

            {/* Sub-headline */}
            {scene.sub && (
              <p
                className="mt-6 text-white/60 text-center font-medium drop-shadow-[0_1px_12px_rgba(0,0,0,0.9)] max-w-xl"
                style={{ fontSize: "clamp(0.95rem, 2.5vw, 1.35rem)" }}
              >
                {scene.sub}
              </p>
            )}
          </div>
        );
      })}

      {/* ── CTA Scene (Scene 8) — the front door ──────────────── */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center px-8 z-20 transition-all duration-700 ${
          ctaVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-12 pointer-events-none"
        }`}
        style={{ transition: "opacity 0.7s ease, transform 0.7s ease" }}
      >
        {/* Large logo centred */}
        <img
          src={LOGO_URL}
          alt="WizVid"
          className="h-28 sm:h-36 w-auto object-contain mb-8 drop-shadow-[0_0_40px_rgba(139,92,246,0.9)]"
        />

        <p
          className="text-white/70 text-center mb-12 max-w-md font-medium"
          style={{ fontSize: "clamp(1rem, 2.5vw, 1.3rem)" }}
        >
          Turn your ideas into cinematic video — free.
        </p>

        {/* Primary CTA */}
        <button
          onClick={handleComplete}
          className="group relative px-10 py-4 rounded-2xl bg-white text-black font-bold text-lg tracking-wide hover:bg-white/90 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.25)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] mb-4"
          style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)" }}
        >
          Enter WizVid
          <svg
            className="inline-block ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        {/* Secondary CTA */}
        <button
          onClick={handleComplete}
          className="text-white/50 hover:text-white/80 text-sm font-medium transition-colors tracking-wide underline underline-offset-4"
        >
          Create Your First Video Free
        </button>
      </div>

      {/* ── Progress bar (hidden during CTA scene) ────────────── */}
      {!ctaVisible && (
        <div className="absolute bottom-[7.5%] left-1/2 -translate-x-1/2 w-48 h-[2px] bg-white/12 rounded-full overflow-hidden z-20">
          <div
            className="h-full bg-white/55 rounded-full transition-all duration-100"
            style={{ width: `${Math.min((t / TOTAL_SECS) * 100, 100)}%` }}
          />
        </div>
      )}

      {/* ── Skip button (always visible until CTA) ────────────── */}
      {!ctaVisible && (
        <button
          onClick={handleComplete}
          className="absolute bottom-[7.5%] right-8 z-20 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/6 border border-white/12 backdrop-blur-sm text-white/50 hover:text-white/80 hover:bg-white/12 hover:border-white/25 transition-all text-sm font-medium tracking-wide"
          aria-label="Skip intro"
        >
          Skip
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
