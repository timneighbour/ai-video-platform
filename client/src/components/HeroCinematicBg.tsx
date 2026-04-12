import { useEffect, useRef, useState, useCallback } from "react";
import { Pause, Play } from "lucide-react";

/* ── Asset URLs ─────────────────────────────────────────────────────── */
const ASSETS = {
  // Background loop video — replace these with final rendered assets
  bgVideoAV1: "",
  bgVideoVP9: "",
  bgVideoMP4: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/hero-bg-loop_f96b1288.mp4",
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

// 3-state product story overlays — cycle every 3.5s in sync with frames
const PRODUCT_STATES = [
  {
    badge: "PROMPT",
    badgeColor: "violet" as const,
    text: '"Walking through fire"',
    sub: "You type it.",
    mono: true,
  },
  {
    badge: "AI GENERATING",
    badgeColor: "blue" as const,
    text: "WizVid builds your scene.",
    sub: "Storyboard. Characters. Lighting.",
    mono: false,
  },
  {
    badge: "READY",
    badgeColor: "emerald" as const,
    text: "Your cinematic video.",
    sub: "No editing. No timeline.",
    mono: false,
  },
  {
    badge: "PROMPT",
    badgeColor: "violet" as const,
    text: '"A dragon flying over a city"',
    sub: "You type it.",
    mono: true,
  },
];

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
  const [stateIndex, setStateIndex] = useState(0);
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

  // Cycle product state overlays in sync with frame duration
  useEffect(() => {
    if (prefersReducedMotion || paused) return;
    const interval = setInterval(() => {
      setStateIndex((prev) => (prev + 1) % PRODUCT_STATES.length);
    }, FRAME_DURATION);
    return () => clearInterval(interval);
  }, [prefersReducedMotion, paused]);

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

      {/* ── 3-state product story overlay ─────────────────────── */}
      {!prefersReducedMotion && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          {PRODUCT_STATES.map((state, i) => {
            const isActive = i === stateIndex;
            const badgeClass =
              state.badgeColor === "violet"
                ? "border-violet-400/40 bg-violet-500/10 text-violet-300"
                : state.badgeColor === "blue"
                ? "border-blue-400/40 bg-blue-500/10 text-blue-300"
                : "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
            return (
              <div
                key={i}
                className={`flex flex-col items-center gap-2 transition-all duration-700 absolute left-1/2 -translate-x-1/2 bottom-0 w-max max-w-[90vw] ${
                  isActive
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4 pointer-events-none"
                }`}
              >
                <div className={`px-3 py-1 rounded-full border text-[10px] font-mono tracking-[0.18em] uppercase font-semibold ${badgeClass}`}>
                  {state.badge === "AI GENERATING" && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 animate-pulse" />
                  )}
                  {state.badge}
                </div>
                <p
                  className={`text-center font-bold text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.9)] ${
                    state.mono ? "font-mono text-violet-100" : ""
                  }`}
                  style={{ fontSize: "clamp(1.1rem, 3vw, 1.75rem)" }}
                >
                  {state.text}
                </p>
                <p className="text-white/50 text-xs text-center">{state.sub}</p>
              </div>
            );
          })}
        </div>
      )}

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
