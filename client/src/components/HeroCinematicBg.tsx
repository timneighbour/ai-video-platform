import { useEffect, useRef, useState, useCallback } from "react";
import { Pause, Play } from "lucide-react";

/* ── Asset URLs ─────────────────────────────────────────────────────── */
const ASSETS = {
  // Background loop video — replace these with final rendered assets
  bgVideoAV1: "", // e.g. /assets/hero-bg-loop.av1.webm
  bgVideoVP9: "", // e.g. /assets/hero-bg-loop.vp9.webm
  bgVideoMP4: "", // e.g. /assets/hero-bg-loop.mp4
  // Posters
  posterDesktop:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/poster-bg-desktop-PbmdiBCY44BQqDVNBMG4cu.webp",
  posterMobile:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/poster-bg-mobile-dz7ff7n5tfbQcaPEGNQYJD.webp",
  backgroundStatic:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/background-static-26hfv2iSf3duNSvqQunvsu.webp",
  // Storyboard styleframes used as animated proxy (crossfade sequence)
  styleframes: [
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/bg-beat1-reveal-Vck6bEQh55CtAQTUFc9bRi.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/bg-beat2-prompt-VaPBgqUQ2AXxfpvPM4PGbK.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/bg-beat3-storyboard-Cw5exPHLhQsPmxAgvctukJ.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/bg-beat4-output-j65jh9UYoNEupVq62hyfFJ.webp",
  ],
};

const LS_KEY = "wizvid_motion_paused";
const FRAME_DURATION = 3500; // ms per styleframe

/* ── Analytics helper ───────────────────────────────────────────────── */
function trackEvent(
  name: string,
  params: Record<string, string | number | boolean> = {}
) {
  try {
    const w = window as any;
    if (w.dataLayer) {
      w.dataLayer.push({ event: name, ...params });
    }
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
  const [currentFrame, setCurrentFrame] = useState(0);
  const hasVideo =
    ASSETS.bgVideoAV1 || ASSETS.bgVideoVP9 || ASSETS.bgVideoMP4;

  // Detect reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Persist pause preference
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, String(paused));
    } catch {
      /* noop */
    }
  }, [paused]);

  // Styleframe crossfade animation (proxy until real video)
  useEffect(() => {
    if (hasVideo || prefersReducedMotion || paused) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % ASSETS.styleframes.length);
    }, FRAME_DURATION);
    trackEvent("wizvid_bg_started", {
      video_id: "bg_proxy_styleframes",
      video_name: "Hero Background Proxy",
      location: "hero",
    });
    return () => clearInterval(interval);
  }, [hasVideo, prefersReducedMotion, paused]);

  // Video playback control
  useEffect(() => {
    if (!hasVideo || !videoRef.current) return;
    if (paused || prefersReducedMotion) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [paused, prefersReducedMotion, hasVideo, videoReady]);

  const handleVideoCanPlay = useCallback(() => {
    setVideoReady(true);
    trackEvent("wizvid_bg_started", {
      video_id: "hero_bg_loop",
      video_name: "Hero Background Loop",
      location: "hero",
    });
  }, []);

  const togglePause = useCallback(() => {
    const next = !paused;
    setPaused(next);
    trackEvent("wizvid_bg_paused", {
      video_id: hasVideo ? "hero_bg_loop" : "bg_proxy_styleframes",
      video_name: "Hero Background",
      location: "hero",
      paused: next,
    });
  }, [paused, hasVideo]);

  // Parallax offset
  const px = (mouseX - 0.5) * 12;
  const py = (mouseY - 0.5) * 8;

  // ── Reduced motion: static poster only ───────────────────────────
  if (prefersReducedMotion && paused) {
    return (
      <div className="absolute inset-0 z-0">
        <picture>
          <source
            media="(max-width: 768px)"
            srcSet={ASSETS.posterMobile}
            type="image/webp"
          />
          <img
            src={ASSETS.backgroundStatic}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-[#05060A]/40 via-transparent to-[#05060A]/90" />
        <button
          onClick={() => {
            setPaused(false);
            setPrefersReducedMotion(false);
          }}
          className="absolute bottom-6 right-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-sm text-[rgba(244,247,255,0.72)] hover:bg-white/10 transition-all"
          aria-label="Play animation"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Play animation</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* ── Responsive poster (LCP-friendly, loads before video) ──── */}
      <picture>
        <source
          media="(max-width: 768px)"
          srcSet={ASSETS.posterMobile}
          type="image/webp"
        />
        <img
          src={ASSETS.posterDesktop}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
      </picture>

      {/* ── Video layer (loads after first paint) ────────────────── */}
      {hasVideo && !prefersReducedMotion && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          onCanPlay={handleVideoCanPlay}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoReady ? "opacity-100" : "opacity-0"}`}
          style={{
            transform: `translate(${px}px, ${py}px) scale(1.05)`,
            transition: "transform 0.3s ease-out",
          }}
          aria-hidden="true"
        >
          {ASSETS.bgVideoAV1 && (
            <source src={ASSETS.bgVideoAV1} type='video/webm; codecs="av01.0.08M.08"' />
          )}
          {ASSETS.bgVideoVP9 && (
            <source src={ASSETS.bgVideoVP9} type='video/webm; codecs="vp9"' />
          )}
          {ASSETS.bgVideoMP4 && (
            <source src={ASSETS.bgVideoMP4} type="video/mp4" />
          )}
        </video>
      )}

      {/* ── Styleframe proxy (crossfade sequence until real video) ── */}
      {!hasVideo && !prefersReducedMotion && !paused && (
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${px}px, ${py}px) scale(1.05)`,
            transition: "transform 0.3s ease-out",
          }}
          aria-hidden="true"
        >
          {ASSETS.styleframes.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: i === currentFrame ? 1 : 0,
                transition: "opacity 1.2s ease-in-out",
              }}
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
        </div>
      )}

      {/* ── Overlays ─────────────────────────────────────────────── */}
      {/* Top-to-bottom gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#05060A]/60 via-[#05060A]/20 to-[#05060A]/95 pointer-events-none" />
      {/* Subtle radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(5,6,10,0.7) 100%)",
        }}
      />
      {/* Film grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── Pause / Play toggle ──────────────────────────────────── */}
      <button
        onClick={togglePause}
        className="absolute bottom-6 right-6 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-[rgba(244,247,255,0.72)] hover:bg-white/10 hover:text-white transition-all"
        aria-label={paused ? "Play background animation" : "Pause background animation"}
      >
        {paused ? (
          <Play className="w-4 h-4" />
        ) : (
          <Pause className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
