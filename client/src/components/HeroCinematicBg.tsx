import { useEffect, useRef, useCallback } from "react";
import { Pause, Play } from "@/lib/icons";

/* ── Hero Cinematic Background ──────────────────────────────────────
   Base layer  : Recording studio photo (user-provided)
   Canvas layer: Sparkly gold animated sound wave — multi-band EQ
                 bars with gold glitter particles drifting off peaks
────────────────────────────────────────────────────────────────────── */

const STUDIO_BG = "/manus-storage/recording-studio-hero_944057cd.png";
const LS_KEY = "wizai_motion_paused";

/* ── Waveform config ─────────────────────────────────────────────── */
const NUM_BARS = 80;          // number of EQ bars across the width
const BAR_GAP = 2;            // px gap between bars
const WAVE_Y = 0.72;          // vertical centre of wave (fraction of height)
const WAVE_AMP = 0.18;        // max amplitude as fraction of height
const WAVE_SPEED = 0.0018;    // phase advance per frame
const GLITTER_PER_FRAME = 3;  // new sparkle particles per frame

/* ── Glitter particle ────────────────────────────────────────────── */
interface Glitter {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  life: number; maxLife: number;
  hue: number; // 35–55 for gold range
}

/* ── Component ───────────────────────────────────────────────────── */
export default function HeroCinematicBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);
  const rafRef    = useRef<number>(0);
  const phaseRef  = useRef(0);
  const glitters  = useRef<Glitter[]>([]);

  /* Pause toggle — persisted in localStorage */
  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    localStorage.setItem(LS_KEY, pausedRef.current ? "1" : "0");
  }, []);

  useEffect(() => {
    pausedRef.current = localStorage.getItem(LS_KEY) === "1";
  }, []);

  /* ── Canvas render loop ─────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* Resize handler */
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* Spawn a glitter particle at (x, y) */
    const spawnGlitter = (x: number, y: number, intensity: number) => {
      const hue = 38 + Math.random() * 18; // gold 38–56
      glitters.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(0.4 + Math.random() * 1.4) * intensity,
        size: 1 + Math.random() * 2.5,
        life: 0,
        maxLife: 40 + Math.random() * 60,
        hue,
      });
    };

    /* Draw a single EQ bar */
    const drawBar = (
      x: number, barW: number,
      centreY: number, halfH: number,
      alpha: number, hue: number
    ) => {
      /* Gradient: bright gold centre → transparent edges */
      const grad = ctx.createLinearGradient(x, centreY - halfH, x, centreY + halfH);
      grad.addColorStop(0,   `hsla(${hue},100%,70%,0)`);
      grad.addColorStop(0.2, `hsla(${hue},100%,65%,${alpha * 0.6})`);
      grad.addColorStop(0.5, `hsla(${hue},100%,72%,${alpha})`);
      grad.addColorStop(0.8, `hsla(${hue},100%,65%,${alpha * 0.6})`);
      grad.addColorStop(1,   `hsla(${hue},100%,70%,0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, centreY - halfH, barW, halfH * 2, barW / 2);
      ctx.fill();

      /* Glow */
      ctx.shadowColor  = `hsla(${hue},100%,65%,${alpha * 0.8})`;
      ctx.shadowBlur   = 12;
      ctx.fillStyle    = grad;
      ctx.beginPath();
      ctx.roundRect(x, centreY - halfH, barW, halfH * 2, barW / 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    /* Main draw */
    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      if (pausedRef.current) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      phaseRef.current += WAVE_SPEED;
      const phase = phaseRef.current;

      const centreY = H * WAVE_Y;
      const maxAmp  = H * WAVE_AMP;
      const barW    = Math.max(2, (W - BAR_GAP * NUM_BARS) / NUM_BARS);
      const step    = barW + BAR_GAP;

      /* ── Draw horizontal glow line beneath bars ── */
      const lineGrad = ctx.createLinearGradient(0, centreY, W, centreY);
      lineGrad.addColorStop(0,   "hsla(45,100%,65%,0)");
      lineGrad.addColorStop(0.15,"hsla(45,100%,65%,0.25)");
      lineGrad.addColorStop(0.5, "hsla(45,100%,65%,0.45)");
      lineGrad.addColorStop(0.85,"hsla(45,100%,65%,0.25)");
      lineGrad.addColorStop(1,   "hsla(45,100%,65%,0)");
      ctx.fillStyle = lineGrad;
      ctx.fillRect(0, centreY - 1, W, 2);

      /* ── EQ bars ── */
      for (let i = 0; i < NUM_BARS; i++) {
        const t  = i / NUM_BARS;
        const x  = i * step;

        /* Multi-frequency wave: primary + harmonics */
        const h1 = Math.sin(t * Math.PI * 4 + phase * 3.1)  * 0.55;
        const h2 = Math.sin(t * Math.PI * 7 + phase * 5.3)  * 0.28;
        const h3 = Math.sin(t * Math.PI * 12 + phase * 8.7) * 0.17;
        /* Envelope: taper at edges */
        const env = Math.sin(t * Math.PI);
        const amp = (h1 + h2 + h3) * env;

        const halfH = Math.abs(amp) * maxAmp + 3;
        const alpha = 0.55 + Math.abs(amp) * 0.45;
        const hue   = 38 + Math.abs(amp) * 20; // gold → bright gold

        drawBar(x, barW, centreY, halfH, alpha, hue);

        /* Spawn glitter at bar peaks */
        if (Math.random() < 0.04 * Math.abs(amp) + 0.005) {
          for (let g = 0; g < GLITTER_PER_FRAME; g++) {
            spawnGlitter(
              x + barW / 2 + (Math.random() - 0.5) * barW,
              centreY - halfH * (0.8 + Math.random() * 0.4),
              0.5 + Math.abs(amp)
            );
          }
        }
      }

      /* ── Update & draw glitter particles ── */
      glitters.current = glitters.current.filter(g => g.life < g.maxLife);
      for (const g of glitters.current) {
        g.life++;
        g.x  += g.vx;
        g.y  += g.vy;
        g.vy += 0.03; // gentle gravity
        const progress = g.life / g.maxLife;
        const alpha    = progress < 0.3
          ? progress / 0.3
          : 1 - (progress - 0.3) / 0.7;

        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.shadowColor = `hsla(${g.hue},100%,75%,0.9)`;
        ctx.shadowBlur  = 6;
        ctx.fillStyle   = `hsla(${g.hue},100%,80%,1)`;
        /* Star shape */
        ctx.translate(g.x, g.y);
        ctx.rotate(g.life * 0.15);
        ctx.beginPath();
        for (let p = 0; p < 4; p++) {
          const angle = (p / 4) * Math.PI * 2;
          const r = p % 2 === 0 ? g.size : g.size * 0.4;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">

      {/* ── Base layer: recording studio photo ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${STUDIO_BG})` }}
      />

      {/* ── Dark overlay: preserve text readability ── */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(8,5,2,0.55) 0%, rgba(8,5,2,0.35) 40%, rgba(8,5,2,0.60) 100%)",
        }}
      />

      {/* ── Warm vignette ── */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(4,2,0,0.65) 100%)",
        }}
      />

      {/* ── Canvas: sparkly gold waveform ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ mixBlendMode: "screen" }}
      />

      {/* ── Subtle top-to-bottom gradient fade ── */}
      <div
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, rgba(6,3,1,0.7))" }}
      />

      {/* ── Pause / resume control ── */}
      <button
        onClick={togglePause}
        title={pausedRef.current ? "Resume background animation" : "Pause background animation"}
        aria-label={pausedRef.current ? "Resume background animation" : "Pause background animation"}
        className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-white/50 backdrop-blur-sm transition hover:bg-black/50 hover:text-white/80"
      >
        {pausedRef.current ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
        {pausedRef.current ? "Resume" : "Pause"}
      </button>
    </div>
  );
}
