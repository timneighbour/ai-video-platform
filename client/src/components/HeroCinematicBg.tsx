import { useEffect, useRef, useState, useCallback } from "react";
import { Pause, Play } from "lucide-react";

/* ── Video B: Homepage hero background ──────────────────────────────
   This is a SEPARATE asset from the intro film (Video A).
   Purpose: subtle, dark, elegant loop that supports the headline.
   It must NEVER overpower the text or feel like a second intro.
────────────────────────────────────────────────────────────────────── */
const ASSETS = {
  // Video B — subtle 8s dark loop: prompt typed → storyboard → cinematic output
  videoMP4:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/hero-bg-v2_737633d7.mp4",
  // Poster: shown before video loads (LCP-safe)
  poster:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/scene-fire-Rz5UrKEXzVWkjfUVCFPRXH.webp",
  // Reduced-motion static (dark cinematic still)
  staticBg:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/scene-fire-Rz5UrKEXzVWkjfUVCFPRXH.webp",
};

const LS_KEY = "wizvid_motion_paused";

/* ── Analytics helper ───────────────────────────────────────────────── */
function trackEvent(
  name: string,
  params: Record<string, string | number | boolean> = {}
) {
  try {
    const w = window as any;
    if (w.dataLayer) w.dataLayer.push({ event: name, ...params });
  } catch {
    /* noop */
  }
}

/* ── Component ──────────────────────────────────────────────────────── */
interface HeroCinematicBgProps {
  mouseX?: number;
  mouseY?: number;
}

export default function HeroCinematicBg({
  mouseX = 0.5,
  mouseY = 0.5,
}: HeroCinematicBgProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [paused, setPaused] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  /* ── Detect reduced-motion preference ─────────────────────────── */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ── Persist pause preference ──────────────────────────────────── */
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, String(paused));
    } catch {
      /* noop */
    }
  }, [paused]);

  /* ── Video playback control ────────────────────────────────────── */
  useEffect(() => {
    if (!videoRef.current) return;
    if (paused || prefersReducedMotion) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [paused, prefersReducedMotion, videoReady]);

  const handleVideoCanPlay = useCallback(() => {
    setVideoReady(true);
    trackEvent("wizvid_bg_started", {
      video_id: "hero_bg_v2",
      video_name: "Hero Background V2",
      location: "hero",
    });
  }, []);

  const togglePause = useCallback(() => {
    const next = !paused;
    setPaused(next);
    trackEvent("wizvid_bg_paused", {
      video_id: "hero_bg_v2",
      paused: next,
    });
  }, [paused]);

  /* ── Subtle parallax offset ────────────────────────────────────── */
  const px = (mouseX - 0.5) * 10;
  const py = (mouseY - 0.5) * 6;

  /* ── Reduced motion: static poster only ───────────────────────── */
  if (prefersReducedMotion && paused) {
    return (
      <div className="absolute inset-0 z-0">
        <img
          src={ASSETS.staticBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        {/* Heavy dark overlay so text is always readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/50 to-black/95" />
        <button
          onClick={() => {
            setPaused(false);
            setPrefersReducedMotion(false);
          }}
          className="absolute bottom-6 right-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-sm text-white/60 hover:bg-white/10 transition-all"
          aria-label="Play background video"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Play</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* ── Poster: loads instantly, shown until video is ready ── */}
      <img
        src={ASSETS.poster}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        fetchPriority="high"
      />

      {/* ── Video B: subtle dark background loop ─────────────── */}
      {!prefersReducedMotion && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          onCanPlay={handleVideoCanPlay}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1500 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
          style={{
            transform: `translate(${px}px, ${py}px) scale(1.04)`,
            transition: "transform 0.4s ease-out, opacity 1.5s ease",
          }}
          aria-hidden="true"
        >
          <source src={ASSETS.videoMP4} type="video/mp4" />
        </video>
      )}

      {/* ── Dark gradient overlays — text MUST be readable ───── */}
      {/* Top gradient: nav and headline area */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/92 pointer-events-none" />
      {/* Radial vignette: darkens edges, keeps centre cinematic */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, transparent 35%, rgba(0,0,0,0.65) 100%)",
        }}
      />
      {/* Film grain: subtle texture, premium feel */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── Pause / Play toggle ──────────────────────────────── */}
      <button
        onClick={togglePause}
        className="absolute bottom-6 right-6 z-20 w-9 h-9 rounded-full bg-black/35 backdrop-blur-md border border-white/8 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white/80 transition-all"
        aria-label={paused ? "Play background video" : "Pause background video"}
      >
        {paused ? (
          <Play className="w-3.5 h-3.5" />
        ) : (
          <Pause className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}
