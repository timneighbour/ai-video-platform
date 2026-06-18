import { useEffect, useRef, useCallback, useState } from "react";
import { Pause, Play } from "@/lib/icons";

/* ── Hero Cinematic Background ──────────────────────────────────────
   Base layer  : Recording studio photo (user-provided)
   Canvas layer: Single elegant oscilloscope waveform line — thin,
                 continuous, gold, flowing through the studio like
                 the sound signal itself is alive in the room.
                 Subtle gold glitter particles drift off the peaks.
                 Mouse reactivity: cursor position gently shifts the
                 wave amplitude and vertical position so the studio
                 feels alive and interactive.
────────────────────────────────────────────────────────────────────── */

const STUDIO_BG = "/manus-storage/recording-studio-hero_944057cd.png";
const LS_KEY = "wizai_motion_paused";

/* ── Glitter particle ────────────────────────────────────────────── */
interface Glitter {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  life: number; maxLife: number;
}

/* ── Component ───────────────────────────────────────────────────── */
export default function HeroCinematicBg() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const pausedRef   = useRef(false);
  const rafRef      = useRef<number>(0);
  const phaseRef    = useRef(0);
  const glitters    = useRef<Glitter[]>([]);
  const [paused, setPaused] = useState(false);

  /* Smoothed mouse influence — avoids jerky jumps */
  const mouseRef = useRef({ x: 0.5, y: 0.5 });        // normalised 0-1
  const smoothRef = useRef({ x: 0.5, y: 0.5 });        // lerped target

  /* Pause toggle — persisted in localStorage */
  const togglePause = useCallback(() => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    localStorage.setItem(LS_KEY, next ? "1" : "0");
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY) === "1";
    pausedRef.current = stored;
    setPaused(stored);
  }, []);

  /* ── Mouse tracking ─────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top)  / rect.height,
      };
    };

    /* Touch support */
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.touches[0].clientX - rect.left) / rect.width,
        y: (e.touches[0].clientY - rect.top)  / rect.height,
      };
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
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
    const spawnGlitter = (x: number, y: number) => {
      glitters.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(0.3 + Math.random() * 0.9),
        size: 0.8 + Math.random() * 1.6,
        life: 0,
        maxLife: 50 + Math.random() * 70,
      });
    };

    /* Main draw */
    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      /* ── Smooth mouse lerp (runs every frame) ── */
      const LERP = 0.045; // lower = smoother/slower response
      smoothRef.current.x += (mouseRef.current.x - smoothRef.current.x) * LERP;
      smoothRef.current.y += (mouseRef.current.y - smoothRef.current.y) * LERP;

      const mx = smoothRef.current.x; // 0 = left edge, 1 = right edge
      const my = smoothRef.current.y; // 0 = top,       1 = bottom

      if (!pausedRef.current) {
        phaseRef.current += 0.012; // wave travel speed
      }
      const phase = phaseRef.current;

      /* ── Mouse influence parameters ──
         - Amplitude: cursor near top → bigger wave; near bottom → quieter
         - Vertical shift: cursor left/right nudges the wave slightly up/down
         - Frequency multiplier: cursor X adds a subtle harmonic richness
      ── */
      const ampInfluence   = 1 + (0.5 - my) * 0.6;        // ±30% amplitude
      const vertShift      = (mx - 0.5) * H * 0.035;       // ±1.75% height shift
      const freqInfluence  = 1 + (mx - 0.5) * 0.18;        // ±9% frequency nudge

      /* ── Waveform line ── */
      /* Positioned at ~62% down the canvas — passes through the
         mixing desk area so it looks like it's flowing through the room */
      const centreY = H * 0.62 + vertShift;
      const maxAmp  = H * 0.055 * ampInfluence;

      /* Build the waveform path with many points for smoothness */
      const POINTS = 300;
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i <= POINTS; i++) {
        const t = i / POINTS;
        const x = t * W;

        /* Composite wave: primary sine + two harmonics for organic feel */
        const w1 = Math.sin(t * Math.PI * 6  * freqInfluence + phase * 2.8) * 0.55;
        const w2 = Math.sin(t * Math.PI * 11 * freqInfluence + phase * 4.9) * 0.28;
        const w3 = Math.sin(t * Math.PI * 19 * freqInfluence + phase * 8.1) * 0.17;

        /* Envelope: fade in/out at edges so the line appears to emerge
           from the left side of the studio and dissolve into the right */
        const edgeFade = Math.sin(t * Math.PI);
        const amp = (w1 + w2 + w3) * edgeFade;

        points.push({ x, y: centreY + amp * maxAmp });
      }

      /* ── Glow intensity: brighter when mouse is near the wave ── */
      const glowBoost = 1 + Math.max(0, 0.5 - Math.abs(my - 0.62)) * 0.8;

      /* ── Draw outer glow pass (wide, very soft) ── */
      ctx.save();
      ctx.lineWidth   = 6;
      ctx.strokeStyle = `hsla(45,100%,65%,${0.08 * glowBoost})`;
      ctx.shadowColor = "hsla(45,100%,65%,0.0)";
      ctx.shadowBlur  = 0;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const mx2 = (points[i].x + points[i + 1].x) / 2;
        const my2 = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, mx2, my2);
      }
      ctx.stroke();
      ctx.restore();

      /* ── Draw mid glow pass ── */
      ctx.save();
      ctx.lineWidth   = 3;
      ctx.strokeStyle = `hsla(45,100%,70%,${0.22 * glowBoost})`;
      ctx.shadowColor = `hsla(45,100%,65%,${0.5 * glowBoost})`;
      ctx.shadowBlur  = 14;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const mx2 = (points[i].x + points[i + 1].x) / 2;
        const my2 = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, mx2, my2);
      }
      ctx.stroke();
      ctx.restore();

      /* ── Draw core line (sharp, bright gold) ── */
      ctx.save();
      ctx.lineWidth   = 1.5;
      ctx.strokeStyle = `hsla(48,100%,78%,${0.75 * Math.min(1.3, glowBoost)})`;
      ctx.shadowColor = `hsla(48,100%,72%,${0.9 * glowBoost})`;
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const mx2 = (points[i].x + points[i + 1].x) / 2;
        const my2 = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, mx2, my2);
      }
      ctx.stroke();
      ctx.restore();

      /* ── Spawn glitter at wave peaks ── */
      if (!pausedRef.current) {
        /* More glitter when mouse is near the wave */
        const spawnRate = 0.06 * glowBoost;
        for (let i = 2; i < points.length - 2; i += 8) {
          const prev = points[i - 2].y;
          const curr = points[i].y;
          const next = points[i + 2].y;
          const displacement = Math.abs(curr - centreY);
          if (curr < prev && curr < next && displacement > maxAmp * 0.4) {
            if (Math.random() < spawnRate) {
              spawnGlitter(points[i].x, points[i].y);
            }
          }
        }
      }

      /* ── Update & draw glitter particles ── */
      glitters.current = glitters.current.filter(g => g.life < g.maxLife);
      for (const g of glitters.current) {
        g.life++;
        g.x  += g.vx;
        g.y  += g.vy;
        g.vy += 0.025; // gentle gravity
        const progress = g.life / g.maxLife;
        const alpha    = progress < 0.25
          ? progress / 0.25
          : 1 - (progress - 0.25) / 0.75;

        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.shadowColor = "hsla(48,100%,78%,0.9)";
        ctx.shadowBlur  = 5;
        ctx.fillStyle   = "hsla(48,100%,82%,1)";
        /* 4-point star */
        ctx.translate(g.x, g.y);
        ctx.rotate(g.life * 0.12);
        ctx.beginPath();
        for (let p = 0; p < 4; p++) {
          const angle = (p / 4) * Math.PI * 2;
          const r = p % 2 === 0 ? g.size : g.size * 0.35;
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
          background: "linear-gradient(180deg, rgba(8,5,2,0.52) 0%, rgba(8,5,2,0.28) 45%, rgba(8,5,2,0.58) 100%)",
        }}
      />

      {/* ── Warm vignette ── */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(4,2,0,0.62) 100%)",
        }}
      />

      {/* ── Canvas: oscilloscope waveform line + glitter ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ mixBlendMode: "screen" }}
      />

      {/* ── Bottom fade ── */}
      <div
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, rgba(6,3,1,0.65))" }}
      />

      {/* ── Pause / resume control ── */}
      <button
        onClick={togglePause}
        title={paused ? "Resume background animation" : "Pause background animation"}
        aria-label={paused ? "Resume background animation" : "Pause background animation"}
        className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-white/50 backdrop-blur-sm transition hover:bg-black/50 hover:text-white/80"
      >
        {paused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
        {paused ? "Resume" : "Pause"}
      </button>
    </div>
  );
}
