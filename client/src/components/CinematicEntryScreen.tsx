import { useEffect, useRef, useState, useCallback } from "react";

/* ── Assets ─────────────────────────────────────────────────────────── */
const INTRO_VIDEO_MP4 =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/intro-sequence_8f81fbfd.mp4";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-premium_a0b936c5.png";

const SESSION_KEY = "wizvid_intro_seen_v3";

/* ── 3-state overlay sequence ────────────────────────────────────────
   Each state shows a text overlay on top of the moving video.
─────────────────────────────────────────────────────────────────────── */
interface OverlayState {
  id: number;
  startSec: number;
  badge?: string;
  headline: string;
  sub?: string;
}

const OVERLAYS: OverlayState[] = [
  {
    id: 1,
    startSec: 0,
    headline: "Your ideas…",
  },
  {
    id: 2,
    startSec: 2.5,
    badge: "PROMPT",
    headline: '"Walking through fire"',
    sub: "You type it. That's all.",
  },
  {
    id: 3,
    startSec: 5,
    badge: "AI GENERATING",
    headline: "WizVid builds your scene.",
    sub: "Storyboard. Characters. Lighting.",
  },
  {
    id: 4,
    startSec: 7.5,
    badge: "READY",
    headline: "Your cinematic video.",
    sub: "No editing. No timeline. Just results.",
  },
];

const TOTAL_SECS = 10;

/* ── Component ───────────────────────────────────────────────────────── */
interface CinematicEntryScreenProps {
  onComplete: () => void;
}

export default function CinematicEntryScreen({ onComplete }: CinematicEntryScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timerSec, setTimerSec] = useState(0);

  /* ── Timer fallback (if video stalls) ─────────────────────────── */
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
    }, TOTAL_SECS * 1000 + 500);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleComplete = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* noop */ }
    setTimeout(onComplete, 700);
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
    handleComplete();
  }, [handleComplete]);

  /* ── Determine active overlay ─────────────────────────────────── */
  const t = videoReady ? currentTime : timerSec;
  const activeOverlay = [...OVERLAYS].reverse().find((o) => t >= o.startSec) ?? OVERLAYS[0];

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black transition-opacity duration-700 ${
        exiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* ── Video background ──────────────────────────────────── */}
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/85 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.65) 100%)" }}
      />

      {/* ── Film grain ────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── Anamorphic letterbox bars ──────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-[5%] bg-black pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[5%] bg-black pointer-events-none" />

      {/* ── Logo top-left ──────────────────────────────────────── */}
      <div className="absolute top-8 left-8 z-20">
        <img
          src={LOGO_URL}
          alt="WizVid"
          className="h-12 w-auto object-contain drop-shadow-[0_0_20px_rgba(139,92,246,0.9)]"
        />
      </div>

      {/* ── 3-state text overlays ──────────────────────────────── */}
      {OVERLAYS.map((overlay) => {
        const isActive = overlay.id === activeOverlay.id;
        return (
          <div
            key={overlay.id}
            className={`absolute inset-0 flex flex-col items-center justify-center px-8 transition-all duration-700 ${
              isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
            }`}
          >
            {overlay.badge && (
              <div
                className={`mb-5 px-4 py-1.5 rounded-full border text-xs font-mono tracking-[0.2em] uppercase font-semibold ${
                  overlay.badge === "PROMPT"
                    ? "border-violet-400/40 bg-violet-500/10 text-violet-300"
                    : overlay.badge === "AI GENERATING"
                    ? "border-blue-400/40 bg-blue-500/10 text-blue-300"
                    : "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                }`}
              >
                {overlay.badge === "AI GENERATING" && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-2 animate-pulse" />
                )}
                {overlay.badge}
              </div>
            )}

            <h1
              className={`font-extrabold text-center leading-tight text-white drop-shadow-[0_2px_32px_rgba(0,0,0,0.95)] ${
                overlay.badge === "PROMPT" ? "font-mono text-violet-100" : ""
              }`}
              style={{ fontSize: "clamp(2.2rem, 6vw, 5rem)" }}
            >
              {overlay.headline}
            </h1>

            {overlay.sub && (
              <p
                className="mt-5 text-white/65 text-center font-medium drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]"
                style={{ fontSize: "clamp(1rem, 2.5vw, 1.4rem)" }}
              >
                {overlay.sub}
              </p>
            )}
          </div>
        );
      })}

      {/* ── Progress bar ──────────────────────────────────────── */}
      <div className="absolute bottom-[6.5%] left-1/2 -translate-x-1/2 w-48 h-0.5 bg-white/15 rounded-full overflow-hidden z-20">
        <div
          className="h-full bg-white/60 rounded-full transition-all duration-100"
          style={{ width: `${Math.min((t / TOTAL_SECS) * 100, 100)}%` }}
        />
      </div>

      {/* ── Skip button ───────────────────────────────────────── */}
      <button
        onClick={handleComplete}
        className="absolute bottom-[7%] right-8 z-20 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/8 border border-white/15 backdrop-blur-sm text-white/60 hover:text-white hover:bg-white/15 hover:border-white/30 transition-all text-sm font-medium tracking-wide"
        aria-label="Skip intro"
      >
        Skip
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
