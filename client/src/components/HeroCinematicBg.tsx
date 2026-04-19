import { useEffect, useRef, useState, useCallback } from "react";
import { Pause, Play } from "@/lib/icons";

/* ── Video B: Homepage hero background ──────────────────────────────
   Subtle, dark, cinematic loop — supports headline, never overpowers.
   Luxury upgrade: gold dust particles, metallic bloom, warm waveform.
────────────────────────────────────────────────────────────────────── */
const ASSETS = {
  // Served via /manus-storage/ to ensure video/mp4 Content-Type (CDN returns application/octet-stream)
  videoMP4: "/manus-storage/hero-bg-v2_dc5fb17d.mp4",
  poster:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-hero-bg-4k-GUBZqG8hsPmj5uDf256WGz.webp",
  staticBg:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-hero-bg-4k-GUBZqG8hsPmj5uDf256WGz.webp",
};

const LS_KEY = "wizai_motion_paused";

/* ── Particle system — gold dust ─────────────────────────────────── */
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  warmth: number; life: number; maxLife: number;
}

function createParticle(w: number, h: number): Particle {
  // warmth 0–1: 0 = silver/white, 1 = warm gold
  const warmth = Math.random();
  return {
    x: Math.random() * w,
    y: h + Math.random() * 20,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -(0.2 + Math.random() * 0.5),
    size: 0.8 + Math.random() * 2,
    opacity: 0.1 + Math.random() * 0.35,
    warmth,
    life: 0,
    maxLife: 140 + Math.random() * 200,
  };
}

function particleColor(warmth: number, alpha: number): string {
  // Interpolate between silver (210,210,220) and warm gold (212,175,55)
  const r = Math.round(210 + warmth * 2);
  const g = Math.round(210 - warmth * 35);
  const b = Math.round(220 - warmth * 165);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ── Waveform bars ───────────────────────────────────────────────── */
const WAVEFORM_BARS = 28;

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
  const flashRef = useRef(0);
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
  }, []);

  const togglePause = useCallback(() => {
    setPaused((p) => !p);
  }, []);

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
    particlesRef.current = Array.from({ length: 50 }, () => {
      const p = createParticle(w, h);
      p.y = Math.random() * h;
      p.life = Math.random() * p.maxLife;
      return p;
    });

    let bassTimer = 0;

    function draw() {
      if (!ctx) return;
      timeRef.current += 1;
      const t = timeRef.current;

      ctx.clearRect(0, 0, w, h);

      /* ── Warm flash (subtle gold pulse every ~100 frames) ── */
      bassTimer++;
      if (bassTimer > 95 + Math.random() * 35) {
        flashRef.current = 0.08 + Math.random() * 0.06;
        bassTimer = 0;
      }
      if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(212,175,55,${flashRef.current})`;
        ctx.fillRect(0, 0, w, h);
        flashRef.current = Math.max(0, flashRef.current - 0.012);
      }

      /* ── Particles — gold dust ── */
      if (particlesRef.current.length < 65) {
        particlesRef.current.push(createParticle(w, h));
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        if (p.life > p.maxLife) return false;
        p.x += p.vx;
        p.y += p.vy;

        const progress = p.life / p.maxLife;
        const alpha = p.opacity * Math.sin(progress * Math.PI);

        // Glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        grad.addColorStop(0, particleColor(p.warmth, alpha));
        grad.addColorStop(1, particleColor(p.warmth, 0));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = particleColor(p.warmth, alpha * 1.3);
        ctx.fill();
        return true;
      });

      /* ── Waveform (bottom-left) — warm gold/silver ── */
      const barW = 3;
      const barGap = 2;
      const waveX = 24;
      const waveY = h - 48;
      const maxBarH = 28;

      for (let i = 0; i < WAVEFORM_BARS; i++) {
        const target = 0.2 + Math.abs(Math.sin(t * 0.04 + i * 0.55)) * 0.8;
        waveRef.current[i] += (target - waveRef.current[i]) * 0.12;
        const barH = waveRef.current[i] * maxBarH;
        // Gradient from silver to warm gold across bars
        const ratio = i / WAVEFORM_BARS;
        const r = Math.round(180 + ratio * 32);
        const g = Math.round(180 - ratio * 10);
        const b = Math.round(195 - ratio * 140);
        const alpha = 0.45 + waveRef.current[i] * 0.35;

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath();
        ctx.roundRect(waveX + i * (barW + barGap), waveY - barH / 2, barW, barH, 1.5);
        ctx.fill();
      }

      /* ── WizSound label — warm gold ── */
      ctx.font = "bold 9px 'Inter', sans-serif";
      ctx.letterSpacing = "0.12em";
      ctx.fillStyle = "rgba(212,175,55,0.5)";
      ctx.fillText("WIZSOUND\u2122", waveX, waveY + 20);
      ctx.letterSpacing = "0";

      /* ── Bloom orbs (warm gold ambient) ── */
      const bx = w * 0.5 + Math.sin(t * 0.005) * w * 0.15;
      const by = h * 0.4 + Math.cos(t * 0.004) * h * 0.1;
      const bg1 = ctx.createRadialGradient(bx, by, 0, bx, by, w * 0.45);
      bg1.addColorStop(0, "rgba(212,175,55,0.04)");
      bg1.addColorStop(1, "rgba(212,175,55,0)");
      ctx.fillStyle = bg1;
      ctx.fillRect(0, 0, w, h);

      // Foreground accent orb — polished silver
      const fx = w * 0.75 + Math.sin(t * 0.007 + 1) * w * 0.08;
      const fy = h * 0.3 + Math.cos(t * 0.006) * h * 0.12;
      const fg1 = ctx.createRadialGradient(fx, fy, 0, fx, fy, w * 0.22);
      fg1.addColorStop(0, "rgba(200,200,210,0.04)");
      fg1.addColorStop(1, "rgba(200,200,210,0)");
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
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <img src={ASSETS.staticBg} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/50 to-black/95" />
        <button
          onClick={() => { setPaused(false); setPrefersReducedMotion(false); }}
          className="absolute bottom-6 right-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-sm text-white/60 hover:bg-white/10 transition-all pointer-events-auto"
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
            filter: "brightness(0.5) saturate(0.7) contrast(1.15) sepia(0.15)",
          }}
          aria-hidden="true"
        >
          <source src={ASSETS.videoMP4} type="video/mp4" />
        </video>
      )}

      {/* ── Canvas: gold dust particles + waveform + bloom ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
        style={{ mixBlendMode: "screen" }}
      />

      {/* ── Dark gradient overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/92 pointer-events-none" />
      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 35%, transparent 30%, rgba(0,0,0,0.75) 100%)" }}
      />
      {/* Left-side gradient for text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 55%)" }}
      />
      {/* Film grain — very subtle */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.022] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "96px 96px",
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
