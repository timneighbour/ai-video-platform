import { useEffect, useRef, useState, useCallback } from "react";
import { Pause, Play } from "lucide-react";

/* ── Video B: Homepage hero background ──────────────────────────────
   Subtle, dark, cinematic loop — supports headline, never overpowers.
   IMAX upgrade: particles, bloom, waveform, bass-hit flashes, depth.
────────────────────────────────────────────────────────────────────── */
const ASSETS = {
  videoMP4:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/hero-bg-v2_737633d7.mp4",
  poster:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-hero-bg-4k-GUBZqG8hsPmj5uDf256WGz.webp",
  staticBg:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-hero-bg-4k-GUBZqG8hsPmj5uDf256WGz.webp",
};

const LS_KEY = "wizvid_motion_paused";

/* ── Particle system ─────────────────────────────────────────────── */
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  hue: number; life: number; maxLife: number;
}

function createParticle(w: number, h: number): Particle {
  const hue = 260 + Math.random() * 60; // violet → fuchsia
  return {
    x: Math.random() * w,
    y: h + Math.random() * 20,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -(0.3 + Math.random() * 0.7),
    size: 1 + Math.random() * 2.5,
    opacity: 0.15 + Math.random() * 0.45,
    hue,
    life: 0,
    maxLife: 120 + Math.random() * 180,
  };
}

/* ── Waveform bars ───────────────────────────────────────────────── */
const WAVEFORM_BARS = 28;

/* ── Analytics ───────────────────────────────────────────────────── */
function trackEvent(name: string, params: Record<string, string | number | boolean> = {}) {
  try {
    const w = window as any;
    if (w.dataLayer) w.dataLayer.push({ event: name, ...params });
  } catch { /* noop */ }
}

/* ── Component ──────────────────────────────────────────────────────── */
interface HeroCinematicBgProps {
  mouseX?: number;
  mouseY?: number;
}

export default function HeroCinematicBg({ mouseX = 0.5, mouseY = 0.5 }: HeroCinematicBgProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const waveRef = useRef<number[]>(Array.from({ length: WAVEFORM_BARS }, () => 0.3 + Math.random() * 0.4));
  const flashRef = useRef(0); // 0–1 bass flash intensity
  const timeRef = useRef(0);

  const [paused, setPaused] = useState(() => {
    try { return localStorage.getItem(LS_KEY) === "true"; } catch { return false; }
  });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, String(paused)); } catch { /* noop */ }
  }, [paused]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (paused || prefersReducedMotion) { videoRef.current.pause(); }
    else { videoRef.current.play().catch(() => {}); }
  }, [paused, prefersReducedMotion, videoReady]);

  const handleVideoCanPlay = useCallback(() => {
    setVideoReady(true);
    trackEvent("wizvid_bg_started", { video_id: "hero_bg_v2", location: "hero" });
  }, []);

  const togglePause = useCallback(() => {
    const next = !paused;
    setPaused(next);
    trackEvent("wizvid_bg_paused", { video_id: "hero_bg_v2", paused: next });
  }, [paused]);

  /* ── Canvas animation loop ─────────────────────────────────────── */
  useEffect(() => {
    if (prefersReducedMotion || paused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;
    canvas.width = w;
    canvas.height = h;

    const onResize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", onResize);

    // Seed initial particles
    particlesRef.current = Array.from({ length: 60 }, () => {
      const p = createParticle(w, h);
      p.y = Math.random() * h; // scatter vertically on init
      p.life = Math.random() * p.maxLife;
      return p;
    });

    let bassTimer = 0;

    function draw() {
      if (!ctx) return;
      timeRef.current += 1;
      const t = timeRef.current;

      ctx.clearRect(0, 0, w, h);

      /* ── Bass hit flash (every ~90 frames) ── */
      bassTimer++;
      if (bassTimer > 88 + Math.random() * 30) {
        flashRef.current = 0.18 + Math.random() * 0.12;
        bassTimer = 0;
      }
      if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(139,92,246,${flashRef.current})`;
        ctx.fillRect(0, 0, w, h);
        flashRef.current = Math.max(0, flashRef.current - 0.018);
      }

      /* ── Particles ── */
      // Spawn new
      if (particlesRef.current.length < 80) {
        particlesRef.current.push(createParticle(w, h));
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        if (p.life > p.maxLife) return false;
        p.x += p.vx;
        p.y += p.vy;

        const progress = p.life / p.maxLife;
        const alpha = p.opacity * Math.sin(progress * Math.PI); // fade in/out

        // Glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        grad.addColorStop(0, `hsla(${p.hue},80%,70%,${alpha})`);
        grad.addColorStop(1, `hsla(${p.hue},80%,70%,0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},90%,80%,${alpha * 1.4})`;
        ctx.fill();
        return true;
      });

      /* ── Waveform (bottom-left) ── */
      const barW = 3;
      const barGap = 2;
      const waveX = 24;
      const waveY = h - 48;
      const maxBarH = 28;

      for (let i = 0; i < WAVEFORM_BARS; i++) {
        // Animate each bar independently
        const target = 0.2 + Math.abs(Math.sin(t * 0.04 + i * 0.55)) * 0.8;
        waveRef.current[i] += (target - waveRef.current[i]) * 0.12;
        const barH = waveRef.current[i] * maxBarH;
        const hue = 260 + (i / WAVEFORM_BARS) * 60;
        const alpha = 0.55 + waveRef.current[i] * 0.35;

        ctx.fillStyle = `hsla(${hue},80%,65%,${alpha})`;
        ctx.beginPath();
        ctx.roundRect(waveX + i * (barW + barGap), waveY - barH / 2, barW, barH, 1.5);
        ctx.fill();
      }

      /* ── WizSound label next to waveform ── */
      ctx.font = "bold 9px 'Inter', sans-serif";
      ctx.letterSpacing = "0.12em";
      ctx.fillStyle = "rgba(167,139,250,0.6)";
      ctx.fillText("WIZSOUND™", waveX, waveY + 20);
      ctx.letterSpacing = "0";

      /* ── Bloom orbs (layered depth) ── */
      // Background orb — slow drift
      const bx = w * 0.5 + Math.sin(t * 0.005) * w * 0.15;
      const by = h * 0.4 + Math.cos(t * 0.004) * h * 0.1;
      const bg1 = ctx.createRadialGradient(bx, by, 0, bx, by, w * 0.45);
      bg1.addColorStop(0, "rgba(88,28,220,0.07)");
      bg1.addColorStop(1, "rgba(88,28,220,0)");
      ctx.fillStyle = bg1;
      ctx.fillRect(0, 0, w, h);

      // Foreground accent orb
      const fx = w * 0.75 + Math.sin(t * 0.007 + 1) * w * 0.08;
      const fy = h * 0.3 + Math.cos(t * 0.006) * h * 0.12;
      const fg1 = ctx.createRadialGradient(fx, fy, 0, fx, fy, w * 0.22);
      fg1.addColorStop(0, "rgba(217,70,239,0.06)");
      fg1.addColorStop(1, "rgba(217,70,239,0)");
      ctx.fillStyle = fg1;
      ctx.fillRect(0, 0, w, h);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [prefersReducedMotion, paused]);

  /* ── Parallax ───────────────────────────────────────────────────── */
  const px = (mouseX - 0.5) * 10;
  const py = (mouseY - 0.5) * 6;

  /* ── Reduced motion: static ─────────────────────────────────────── */
  if (prefersReducedMotion && paused) {
    return (
      <div className="absolute inset-0 z-0">
        <img src={ASSETS.staticBg} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/50 to-black/95" />
        <button
          onClick={() => { setPaused(false); setPrefersReducedMotion(false); }}
          className="absolute bottom-6 right-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-sm text-white/60 hover:bg-white/10 transition-all"
          aria-label="Play background video"
        >
          <Play className="w-3.5 h-3.5" /><span>Play</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* ── Poster: shown until video loads ── */}
      <img
        src={ASSETS.poster} alt="" aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        // @ts-ignore
        fetchPriority="high"
      />

      {/* ── Background video loop ── */}
      {!prefersReducedMotion && (
        <video
          ref={videoRef}
          autoPlay muted loop playsInline preload="none"
          onCanPlay={handleVideoCanPlay}
          width={1920}
          height={1080}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1500 ${videoReady ? "opacity-100" : "opacity-0"}`}
          style={{
            transform: `translate(${px}px, ${py}px) scale(1.04)`,
            transition: "transform 0.4s ease-out, opacity 1.5s ease",
            filter: "brightness(0.55) saturate(1.3)",
          }}
          aria-hidden="true"
        >
          <source src={ASSETS.videoMP4} type="video/mp4" />
        </video>
      )}

      {/* ── Canvas: particles + waveform + bloom + flash ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
        style={{ mixBlendMode: "screen" }}
      />

      {/* ── Dark gradient overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/82 via-black/38 to-black/94 pointer-events-none" />
      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 35%, transparent 30%, rgba(0,0,0,0.7) 100%)" }}
      />
      {/* Left-side gradient for text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to right, rgba(0,0,0,0.55) 0%, transparent 55%)" }}
      />
      {/* Film grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.028] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── Pause / Play toggle ── */}
      <button
        onClick={togglePause}
        className="absolute bottom-6 right-6 z-20 w-9 h-9 rounded-full bg-black/35 backdrop-blur-md border border-white/8 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white/80 transition-all pointer-events-auto"
        aria-label={paused ? "Play background video" : "Pause background video"}
      >
        {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
