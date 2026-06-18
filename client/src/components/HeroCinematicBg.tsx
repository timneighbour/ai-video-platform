import { useEffect, useRef, useState, useCallback } from "react";
import { Pause, Play } from "@/lib/icons";

/* ── Hero Cinematic Background ──────────────────────────────────────
   Base layer: 4K warm gold bokeh video (Pixabay CC0, skarletmotion)
   Canvas layer: gold-dust particles, waveform, bloom orbs on top.
────────────────────────────────────────────────────────────────────── */

const LS_KEY = "wizai_motion_paused";

/* ── Static poster fallback ─────────────────────────────────────── */
const STATIC_BG = "/manus-storage/concert-hall_2b6b946b.jpg";
const HERO_VIDEO = "/manus-storage/hero-bg-gold-bokeh-4k_b3c3269e.mp4";

/* ── Particle system — gold dust ─────────────────────────────────── */
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; opacity: number;
  warmth: number; life: number; maxLife: number;
}

function createParticle(w: number, h: number): Particle {
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

    // Seed initial particles spread across the canvas
    particlesRef.current = Array.from({ length: 60 }, () => {
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
        flashRef.current = 0.10 + Math.random() * 0.08;
        bassTimer = 0;
      }
      if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(212,175,55,${flashRef.current})`;
        ctx.fillRect(0, 0, w, h);
        flashRef.current = Math.max(0, flashRef.current - 0.010);
      }

      /* ── Particles — gold dust ── */
      if (particlesRef.current.length < 75) {
        particlesRef.current.push(createParticle(w, h));
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        if (p.life > p.maxLife) return false;
        p.x += p.vx;
        p.y += p.vy;

        const progress = p.life / p.maxLife;
        const alpha = p.opacity * Math.sin(progress * Math.PI);

        // Glow halo
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        grad.addColorStop(0, particleColor(p.warmth, alpha * 0.8));
        grad.addColorStop(1, particleColor(p.warmth, 0));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = particleColor(p.warmth, alpha * 1.4);
        ctx.fill();
        return true;
      });

      /* ── Waveform (bottom-left) — warm gold/silver ── */
      const barW = 3;
      const barGap = 2;
      const waveX = 24;
      const waveY = h - 48;
      const maxBarH = 32;

      for (let i = 0; i < WAVEFORM_BARS; i++) {
        const target = 0.2 + Math.abs(Math.sin(t * 0.04 + i * 0.55)) * 0.8;
        waveRef.current[i] += (target - waveRef.current[i]) * 0.12;
        const barH = waveRef.current[i] * maxBarH;
        const ratio = i / WAVEFORM_BARS;
        const r = Math.round(180 + ratio * 32);
        const g = Math.round(180 - ratio * 10);
        const b = Math.round(195 - ratio * 140);
        const alpha = 0.50 + waveRef.current[i] * 0.35;

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath();
        ctx.roundRect(waveX + i * (barW + barGap), waveY - barH / 2, barW, barH, 1.5);
        ctx.fill();
      }

      /* ── WizSound label ── */
      ctx.font = "bold 9px 'Inter', sans-serif";
      ctx.letterSpacing = "0.12em";
      ctx.fillStyle = "rgba(212,175,55,0.55)";
      ctx.fillText("WIZSOUND\u2122", waveX, waveY + 20);
      ctx.letterSpacing = "0";

      /* ── Large bloom orbs (warm gold ambient — larger than before) ── */
      // Orb 1: centre-left, slow drift
      const b1x = w * 0.35 + Math.sin(t * 0.004) * w * 0.18;
      const b1y = h * 0.45 + Math.cos(t * 0.003) * h * 0.12;
      const bg1 = ctx.createRadialGradient(b1x, b1y, 0, b1x, b1y, w * 0.55);
      bg1.addColorStop(0, "rgba(196,140,60,0.13)");
      bg1.addColorStop(0.5, "rgba(180,120,40,0.06)");
      bg1.addColorStop(1, "rgba(160,100,30,0)");
      ctx.fillStyle = bg1;
      ctx.fillRect(0, 0, w, h);

      // Orb 2: upper-right, offset phase
      const b2x = w * 0.78 + Math.sin(t * 0.006 + 2.1) * w * 0.12;
      const b2y = h * 0.28 + Math.cos(t * 0.005 + 1.3) * h * 0.14;
      const bg2 = ctx.createRadialGradient(b2x, b2y, 0, b2x, b2y, w * 0.38);
      bg2.addColorStop(0, "rgba(212,175,55,0.10)");
      bg2.addColorStop(0.6, "rgba(200,150,50,0.04)");
      bg2.addColorStop(1, "rgba(180,130,40,0)");
      ctx.fillStyle = bg2;
      ctx.fillRect(0, 0, w, h);

      // Orb 3: lower-centre, deep amber
      const b3x = w * 0.55 + Math.sin(t * 0.0035 + 4.2) * w * 0.20;
      const b3y = h * 0.72 + Math.cos(t * 0.004 + 2.8) * h * 0.10;
      const bg3 = ctx.createRadialGradient(b3x, b3y, 0, b3x, b3y, w * 0.42);
      bg3.addColorStop(0, "rgba(160,110,40,0.09)");
      bg3.addColorStop(1, "rgba(140,90,20,0)");
      ctx.fillStyle = bg3;
      ctx.fillRect(0, 0, w, h);

      // Orb 4: far-left edge, silver accent
      const b4x = w * 0.08 + Math.sin(t * 0.005 + 1.0) * w * 0.06;
      const b4y = h * 0.38 + Math.cos(t * 0.007 + 3.5) * h * 0.15;
      const bg4 = ctx.createRadialGradient(b4x, b4y, 0, b4x, b4y, w * 0.28);
      bg4.addColorStop(0, "rgba(200,190,160,0.07)");
      bg4.addColorStop(1, "rgba(180,170,140,0)");
      ctx.fillStyle = bg4;
      ctx.fillRect(0, 0, w, h);

      // Orb 5: upper-centre, subtle warm highlight
      const b5x = w * 0.50 + Math.sin(t * 0.003 + 5.5) * w * 0.14;
      const b5y = h * 0.15 + Math.cos(t * 0.004 + 0.7) * h * 0.08;
      const bg5 = ctx.createRadialGradient(b5x, b5y, 0, b5x, b5y, w * 0.32);
      bg5.addColorStop(0, "rgba(196,140,60,0.08)");
      bg5.addColorStop(1, "rgba(180,120,40,0)");
      ctx.fillStyle = bg5;
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
  const px = (mouseX - 0.5) * 12;
  const py = (mouseY - 0.5) * 8;

  /* ── Reduced motion / paused: static ───────────────────────────── */
  if (prefersReducedMotion && paused) {
    return (
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <img src={STATIC_BG} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/75" />
        <button
          onClick={() => { setPaused(false); setPrefersReducedMotion(false); }}
          className="absolute bottom-6 right-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-sm text-white/60 hover:bg-white/10 transition-all pointer-events-auto"
          aria-label="Play background animation"
        >
          <Play className="w-3.5 h-3.5" /><span>Play</span>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">

      {/* ── Deep dark base ── */}
      <div
        className="absolute inset-0"
        style={{ background: "#0a0705" }}
      />

      {/* ── 4K gold bokeh video — base moving layer ── */}
      {!prefersReducedMotion && !paused && (
        <video
          key="hero-bg-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: `translate(${px}px, ${py}px) scale(1.08)`,
            transition: "transform 0.5s ease-out",
            filter: "brightness(0.72) saturate(1.15)",
          }}
          aria-hidden="true"
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
      )}

      {/* Paused state — static poster */}
      {paused && (
        <img
          src={STATIC_BG}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.65) saturate(1.1)" }}
        />
      )}

      {/* ── Canvas: gold dust particles + waveform + bloom ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
        style={{ mixBlendMode: "screen" }}
      />

      {/* ── Dark gradient overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/70 pointer-events-none" />
      {/* Radial vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 35%, transparent 15%, rgba(0,0,0,0.55) 100%)" }}
      />
      {/* Left-side gradient for text readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to right, rgba(0,0,0,0.45) 0%, transparent 60%)" }}
      />
      {/* Film grain — subtle depth texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* ── Pause / Play toggle ── */}
      <button
        onClick={togglePause}
        className="absolute bottom-6 right-6 z-20 w-9 h-9 rounded-full bg-black/35 backdrop-blur-md border border-white/8 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white/80 transition-all pointer-events-auto"
        aria-label={paused ? "Play background animation" : "Pause background animation"}
      >
        {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
