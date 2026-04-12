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
 * CinematicEntryScreen — 5-stage WizSound™ intro sequence.
 *
 * Stage 1 (0–2s):   Black + subtle waveform ripple
 * Stage 2 (2–3s):   "Powered by WizSound™" flash with purple glow
 * Stage 3 (3–5s):   Energy streak + WizVid logo reveal
 * Stage 4 (5–6s):   WizVid logo + "Create. Imagine. Animate." tagline
 * Stage 5 (6s+):    Smooth 700ms fade to homepage
 *
 * Total: ≤6 seconds. Plays once per session via sessionStorage.
 */
export default function CinematicEntryScreen({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);
  const [progress, setProgress] = useState(0);
  const [ctaPulse, setCtaPulse] = useState(false);
  const exitingRef = useRef(false);

  /* ── Stage timeline ──────────────────────────────────────────────── */
  useEffect(() => {
    const t2 = setTimeout(() => setStage(2), 2000);   // WizSound™ flash
    const t3 = setTimeout(() => setStage(3), 3000);   // Energy streak + logo
    const t4 = setTimeout(() => setStage(4), 5000);   // Final frame
    const tCta = setTimeout(() => setCtaPulse(true), 3500); // CTA pulse
    return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(tCta); };
  }, []);

  /* ── Attempt autoplay ────────────────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tryPlay = () => video.play().catch(() => setVideoFailed(true));
    if (video.readyState >= 3) tryPlay();
    else video.addEventListener("canplay", tryPlay, { once: true });
    const fallback = setTimeout(() => setVideoFailed(true), 5000);
    return () => { clearTimeout(fallback); video.removeEventListener("canplay", tryPlay); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (e.key === "Escape" || e.key === " ") { e.preventDefault(); dismiss(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Dismiss ─────────────────────────────────────────────────────── */
  const dismiss = () => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setExiting(true);
    try { sessionStorage.setItem(INTRO_SESSION_KEY, "true"); } catch { /* noop */ }
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
          onError={() => setVideoFailed(true)}
          style={{
            zIndex: 0,
            opacity: stage >= 3 ? 1 : 0,
            transition: "opacity 800ms ease-in",
          }}
        />
      )}

      {/* ── Fallback: static cinematic poster ────────────────────── */}
      {videoFailed && stage >= 3 && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${POSTER_URL})`, zIndex: 0 }}
        />
      )}

      {/* ── Stage 1: Pure black + waveform ripple (0–2s) ─────────── */}
      <div
        className="absolute inset-0 bg-black pointer-events-none"
        style={{
          zIndex: 1,
          opacity: stage === 1 ? 1 : 0,
          transition: "opacity 600ms ease-out",
        }}
      >
        {/* Subtle waveform ripple SVG */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{ opacity: 0.12 }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse
              key={i}
              cx="720"
              cy="450"
              rx={120 + i * 80}
              ry={30 + i * 20}
              fill="none"
              stroke="rgba(139,92,246,0.6)"
              strokeWidth="1"
              style={{
                animation: `waveRipple ${1.4 + i * 0.2}s ease-out ${i * 0.18}s infinite`,
                transformOrigin: "720px 450px",
              }}
            />
          ))}
        </svg>
        {/* Bass pulse vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(88,28,235,0.08) 0%, transparent 65%)",
            animation: "bassPulse 1.2s ease-in-out infinite",
          }}
        />
      </div>

      {/* ── Stage 2: WizSound™ flash (2–3s) ──────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{
          zIndex: 6,
          opacity: stage === 2 ? 1 : 0,
          transition: stage === 2 ? "opacity 200ms ease-in" : "opacity 300ms ease-out",
        }}
      >
        {/* Purple glow backdrop */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(109,40,217,0.22) 0%, transparent 60%)",
          }}
        />
        {/* Waveform bars */}
        <div className="relative flex items-end gap-[3px] mb-4" aria-hidden="true" style={{ height: 28 }}>
          {[10, 18, 24, 28, 22, 28, 24, 18, 10].map((h, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: 3,
                height: h,
                background: "linear-gradient(to top, #7c3aed, #c084fc)",
                animation: `eqBar ${0.55 + i * 0.06}s ease-in-out ${i * 0.04}s infinite alternate`,
                opacity: 0.85,
              }}
            />
          ))}
        </div>
        {/* WizSound™ text */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-white/40 uppercase tracking-[0.3em] font-light"
            style={{ fontSize: "clamp(0.6rem, 1.2vw, 0.75rem)" }}
          >
            Powered by
          </span>
          <span
            className="font-bold tracking-wide"
            style={{
              fontSize: "clamp(1.1rem, 2.8vw, 1.6rem)",
              background: "linear-gradient(90deg, #a78bfa, #e879f9, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 18px rgba(167,139,250,0.7))",
              animation: "wizSoundGlow 0.8s ease-in-out infinite alternate",
            }}
          >
            WizSound™
          </span>
        </div>
      </div>

      {/* ── Stage 3–4: Energy streak + logo reveal ───────────────── */}
      {/* Energy streak */}
      <div
        className="absolute pointer-events-none"
        style={{
          zIndex: 5,
          inset: 0,
          opacity: stage === 3 ? 1 : 0,
          transition: "opacity 400ms ease-out",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "-10%",
            width: "120%",
            height: 2,
            background: "linear-gradient(90deg, transparent, #7c3aed, #e879f9, #7c3aed, transparent)",
            transform: "translateY(-50%)",
            animation: "energyStreak 0.7s ease-out forwards",
            boxShadow: "0 0 20px 4px rgba(167,139,250,0.5)",
          }}
        />
        {/* Secondary streak */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "-10%",
            width: "120%",
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(232,121,249,0.4), transparent)",
            transform: "translateY(8px)",
            animation: "energyStreak 0.7s ease-out 0.1s forwards",
            opacity: 0,
          }}
        />
      </div>

      {/* ── Cinematic gradient overlay (stages 3+) ────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          opacity: stage >= 3 ? 1 : 0,
          transition: "opacity 800ms ease-in",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      {/* ── Radial vignette ──────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* ── Film grain ───────────────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 3, opacity: 0.03 }}
        aria-hidden="true"
      >
        <filter id="cine-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cine-grain)" />
      </svg>

      {/* ── Anamorphic letterbox bars ─────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 bg-black pointer-events-none" style={{ height: "4.5vh", zIndex: 4 }} />
      <div className="absolute bottom-0 left-0 right-0 bg-black pointer-events-none" style={{ height: "4.5vh", zIndex: 4 }} />

      {/* ── Skip button ──────────────────────────────────────────── */}
      <button
        onClick={dismiss}
        className="absolute flex items-center gap-2 rounded-full border border-white/15 bg-white/8 backdrop-blur-sm text-white/45 hover:text-white/75 hover:bg-white/14 hover:border-white/28 transition-all text-xs font-medium tracking-widest uppercase"
        style={{ top: "6.5vh", right: "1.5rem", zIndex: 10, padding: "0.45rem 1rem" }}
        aria-label="Skip intro"
      >
        Skip
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* ── Centre: logo + tagline (stages 3+) ───────────────────── */}
      <div
        className="relative flex flex-col items-center justify-center text-center px-8 w-full"
        style={{
          zIndex: 7,
          opacity: stage >= 3 ? 1 : 0,
          transform: stage >= 3 ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 600ms ease-out, transform 600ms ease-out",
        }}
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
            animation: stage >= 3 ? "logoPulse 3s ease-in-out infinite" : "none",
          }}
        />
        {/* Tagline — only visible in stage 4 */}
        <p
          className="font-medium tracking-[0.18em] uppercase"
          style={{
            fontSize: "clamp(0.7rem, 1.5vw, 0.9rem)",
            opacity: stage === 4 ? 1 : 0,
            transition: "opacity 500ms ease-in",
            background: "linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.85), rgba(255,255,255,0.5))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Create. Imagine. Animate.
        </p>
      </div>

      {/* ── Bottom: Enter Experience CTA + progress ───────────────── */}
      <div
        className="absolute left-0 right-0 flex flex-col items-center gap-4 px-6"
        style={{
          bottom: "8vh",
          zIndex: 10,
          opacity: stage >= 3 ? 1 : 0,
          transition: "opacity 600ms ease-out",
        }}
      >
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

        {!videoFailed && (
          <div className="w-28 h-[2px] bg-white/14 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/50 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Keyframes ────────────────────────────────────────────── */}
      <style>{`
        @keyframes waveRipple {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes bassPulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        @keyframes eqBar {
          0%   { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }
        @keyframes wizSoundGlow {
          0%   { filter: drop-shadow(0 0 12px rgba(167,139,250,0.5)); }
          100% { filter: drop-shadow(0 0 28px rgba(232,121,249,0.9)); }
        }
        @keyframes energyStreak {
          0%   { transform: translateY(-50%) scaleX(0); opacity: 0; transform-origin: left center; }
          40%  { opacity: 1; }
          100% { transform: translateY(-50%) scaleX(1); opacity: 0; transform-origin: left center; }
        }
        @keyframes logoPulse {
          0%, 100% { filter: drop-shadow(0 0 28px rgba(139,92,246,0.9)) drop-shadow(0 0 56px rgba(139,92,246,0.45)); }
          50%       { filter: drop-shadow(0 0 40px rgba(139,92,246,1))   drop-shadow(0 0 80px rgba(139,92,246,0.6)); }
        }
        @keyframes intro-cta-pulse {
          0%, 100% { box-shadow: 0 0 28px rgba(255,255,255,0.18), 0 0 0 0 rgba(255,255,255,0.12); }
          50%       { box-shadow: 0 0 52px rgba(255,255,255,0.32), 0 0 0 14px rgba(255,255,255,0); }
        }
      `}</style>
    </div>
  );
}
