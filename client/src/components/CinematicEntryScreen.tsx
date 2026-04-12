import { useEffect, useRef, useState } from "react";

/* ── Assets ─────────────────────────────────────────────────────────── */
const INTRO_VIDEO_MP4 =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/intro-sequence_8f81fbfd.mp4";
const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-transparent_fcdb69d6.png";
const POSTER_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/poster-intro-desktop_b8b0b3a0.webp";

export const INTRO_SESSION_KEY = "wizvid_intro_seen";

interface Props {
  onComplete: () => void;
}

/**
 * CinematicEntryScreen — true fullscreen pre-homepage gate.
 *
 * - Renders at z-index 9999, fixed inset-0. Completely blocks all content.
 * - Auto-plays cinematic intro video (muted for browser autoplay compliance).
 * - Shows "Enter Experience" CTA at bottom centre with pulse animation.
 * - "Skip" button top-right, small and subtle.
 * - Smooth 700ms fade-out on dismiss. Falls back to static poster if video fails.
 * - Marks session as seen via sessionStorage (key: wizvid_intro_seen).
 */
export default function CinematicEntryScreen({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStarted, setVideoStarted] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [ctaPulse, setCtaPulse] = useState(false);
  const [progress, setProgress] = useState(0);
  const exitingRef = useRef(false);

  /* ── Attempt autoplay on mount ───────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.play().catch(() => setVideoFailed(true));
    };

    if (video.readyState >= 3) {
      tryPlay();
    } else {
      video.addEventListener("canplay", tryPlay, { once: true });
    }

    // Hard fallback: if video hasn't started in 5s, show static poster
    const fallback = setTimeout(() => {
      if (!videoStarted) setVideoFailed(true);
    }, 5000);

    return () => {
      clearTimeout(fallback);
      video.removeEventListener("canplay", tryPlay);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Pulse CTA after 2s ──────────────────────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => setCtaPulse(true), 2000);
    return () => clearTimeout(t);
  }, []);

  /* ── Track video progress ────────────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => {
      if (video.duration > 0) setProgress((video.currentTime / video.duration) * 100);
    };
    video.addEventListener("timeupdate", update);
    return () => video.removeEventListener("timeupdate", update);
  }, []);

  /* ── Keyboard: Escape or Space to skip ──────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " ") {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Dismiss: fade out then call onComplete ──────────────────────── */
  const dismiss = () => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);
    try {
      sessionStorage.setItem(INTRO_SESSION_KEY, "true");
    } catch {
      /* noop */
    }
    setTimeout(onComplete, 700);
  };

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden"
      style={{
        zIndex: 9999,
        opacity: exiting ? 0 : 1,
        transition: "opacity 700ms cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: exiting ? "none" : "auto",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="WizVid intro experience"
    >
      {/* ── Background video ──────────────────────────────────────── */}
      {!videoFailed && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          src={INTRO_VIDEO_MP4}
          poster={POSTER_URL}
          muted
          playsInline
          preload="auto"
          onPlay={() => setVideoStarted(true)}
          onError={() => setVideoFailed(true)}
          style={{ zIndex: 0 }}
        />
      )}

      {/* ── Fallback: static cinematic poster ────────────────────── */}
      {videoFailed && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${POSTER_URL})`, zIndex: 0 }}
        />
      )}

      {/* ── Cinematic gradient overlay ────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* ── Radial vignette ──────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* ── Film grain ───────────────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 2, opacity: 0.035 }}
        aria-hidden="true"
      >
        <filter id="cine-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cine-grain)" />
      </svg>

      {/* ── Anamorphic letterbox bars ─────────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 bg-black pointer-events-none"
        style={{ height: "4.5vh", zIndex: 3 }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 bg-black pointer-events-none"
        style={{ height: "4.5vh", zIndex: 3 }}
      />

      {/* ── Skip — top right, subtle ──────────────────────────────── */}
      <button
        onClick={dismiss}
        className="absolute flex items-center gap-2 rounded-full border border-white/15 bg-white/8 backdrop-blur-sm text-white/45 hover:text-white/75 hover:bg-white/14 hover:border-white/28 transition-all text-xs font-medium tracking-widest uppercase"
        style={{
          top: "6.5vh",
          right: "1.5rem",
          zIndex: 10,
          padding: "0.45rem 1rem",
        }}
        aria-label="Skip intro"
      >
        Skip
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* ── Centre: logo + tagline ────────────────────────────────── */}
      <div
        className="relative flex flex-col items-center justify-center text-center px-8 w-full"
        style={{ zIndex: 5 }}
      >
        <img
          src={LOGO_URL}
          alt="WizVid"
          draggable={false}
          className="w-auto object-contain mb-5 select-none"
          style={{
            height: "clamp(3.5rem, 9vw, 7.5rem)",
            filter:
              "drop-shadow(0 0 28px rgba(139,92,246,0.9)) drop-shadow(0 0 56px rgba(139,92,246,0.45))",
          }}
        />
        <p
          className="text-white/60 font-medium tracking-wide"
          style={{ fontSize: "clamp(0.85rem, 1.8vw, 1.1rem)" }}
        >
          Turn your ideas into cinematic video
        </p>
      </div>

      {/* ── Bottom: Enter Experience CTA + progress ───────────────── */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center gap-4 px-6"
        style={{ bottom: "8vh", zIndex: 10 }}
      >
        {/* Primary CTA */}
        <button
          onClick={dismiss}
          className="group relative inline-flex items-center gap-3 bg-white text-black font-bold rounded-2xl tracking-wide transition-all duration-300 active:scale-95 hover:bg-white/92"
          style={{
            fontSize: "clamp(0.95rem, 2.2vw, 1.15rem)",
            padding: "clamp(0.8rem, 2vw, 1rem) clamp(1.8rem, 4.5vw, 2.8rem)",
            boxShadow: ctaPulse
              ? "0 0 50px rgba(255,255,255,0.3)"
              : "0 0 28px rgba(255,255,255,0.18)",
            animation: ctaPulse ? "intro-cta-pulse 2.2s ease-in-out infinite" : "none",
          }}
          aria-label="Enter WizVid experience"
        >
          Enter Experience
          <svg
            className="w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        {/* Progress bar */}
        {!videoFailed && (
          <div className="w-28 h-[2px] bg-white/14 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/50 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* ── CTA pulse keyframe ────────────────────────────────────── */}
      <style>{`
        @keyframes intro-cta-pulse {
          0%, 100% { box-shadow: 0 0 28px rgba(255,255,255,0.18), 0 0 0 0 rgba(255,255,255,0.12); }
          50%       { box-shadow: 0 0 52px rgba(255,255,255,0.32), 0 0 0 14px rgba(255,255,255,0); }
        }
      `}</style>
    </div>
  );
}
