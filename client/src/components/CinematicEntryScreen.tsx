/**
 * CinematicEntryScreen — Premium Netflix-Style Immersive Intro
 *
 * 6-scene cinematic experience built entirely in CSS/canvas.
 * No video file required. Under 3MB. Seamlessly looping.
 *
 * Scene 1 (0–1.5s):  Black fade-in, particles, "Your ideas..."
 * Scene 2 (1.5–3s):  "...come to life" + beat-pulse light
 * Scene 3 (3–5s):    CAUSE→EFFECT USP: "Walking through fire" → flames react
 * Scene 4 (5–7s):    Character consistency: same face/outfit across 2 cuts
 * Scene 5 (7–9s):    Use-case montage: cinematic / vertical / kids
 * Scene 6 (9–11s):   Zoom-out to polished final output
 * Loop:              Fades seamlessly back to Scene 1
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";

const SESSION_KEY = "wizvid_entry_shown";

// ─── Particle system ────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; opacity: number; color: string; life: number; maxLife: number;
}

function createParticle(w: number, h: number, type: "ambient" | "fire" | "spark" = "ambient"): Particle {
  if (type === "fire") {
    return {
      x: w * 0.5 + (Math.random() - 0.5) * w * 0.6,
      y: h * 0.8 + Math.random() * h * 0.2,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(Math.random() * 3 + 1.5),
      size: Math.random() * 6 + 2,
      opacity: Math.random() * 0.8 + 0.2,
      color: Math.random() > 0.5 ? "#ff6b35" : "#ffd700",
      life: 0, maxLife: Math.random() * 80 + 40,
    };
  }
  if (type === "spark") {
    return {
      x: w * 0.5 + (Math.random() - 0.5) * w * 0.8,
      y: h * 0.6 + (Math.random() - 0.5) * h * 0.4,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 1,
      size: Math.random() * 3 + 1,
      opacity: 1,
      color: Math.random() > 0.5 ? "#fff" : "#ffd700",
      life: 0, maxLife: Math.random() * 30 + 15,
    };
  }
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -(Math.random() * 0.5 + 0.1),
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.4 + 0.05,
    color: Math.random() > 0.6 ? "#a78bfa" : Math.random() > 0.5 ? "#60a5fa" : "#fff",
    life: 0, maxLife: Math.random() * 200 + 100,
  };
}

interface CinematicEntryScreenProps {
  onDismiss?: () => void;
}

export default function CinematicEntryScreen({ onDismiss }: CinematicEntryScreenProps) {
  const [, navigate] = useLocation();
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [sceneIndex, setSceneIndex] = useState(0); // 0–5
  const [beatPulse, setBeatPulse] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const sceneTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scene durations (ms)
  const SCENE_DURATIONS = [1500, 1500, 2000, 2000, 2000, 2000];
  const TOTAL_DURATION = SCENE_DURATIONS.reduce((a, b) => a + b, 0); // 11000ms

  // ── Scene sequencer ──────────────────────────────────────────────────────
  const startSequence = useCallback(() => {
    sceneTimerRef.current.forEach(clearTimeout);
    sceneTimerRef.current = [];
    setSceneIndex(0);
    let elapsed = 0;
    SCENE_DURATIONS.forEach((dur, i) => {
      elapsed += dur;
      const t = setTimeout(() => setSceneIndex(i + 1 < 6 ? i + 1 : 5), elapsed - dur);
      sceneTimerRef.current.push(t);
    });
    // Loop
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    loopTimerRef.current = setTimeout(() => {
      setLoopCount(c => c + 1);
    }, TOTAL_DURATION);
  }, []);

  useEffect(() => {
    startSequence();
    return () => {
      sceneTimerRef.current.forEach(clearTimeout);
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    };
  }, [loopCount, startSequence]);

  // ── Beat pulse (100bpm illusion) ─────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setBeatPulse(true);
      setTimeout(() => setBeatPulse(false), 100);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // ── Mouse parallax ───────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({
      x: (e.clientX / window.innerWidth - 0.5) * 2,
      y: (e.clientY / window.innerHeight - 0.5) * 2,
    });
  }, []);
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  // ── Canvas particle system ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Seed ambient particles
    for (let i = 0; i < 80; i++) {
      particlesRef.current.push(createParticle(canvas.width, canvas.height, "ambient"));
    }

    let frame = 0;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const currentScene = sceneIndex;
      const isFireScene = currentScene === 2;
      const isSparkScene = currentScene === 2 || currentScene === 3;

      // Spawn fire/spark particles in scene 3
      if (isFireScene && frame % 2 === 0) {
        particlesRef.current.push(createParticle(w, h, "fire"));
        if (frame % 4 === 0) particlesRef.current.push(createParticle(w, h, "spark"));
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);
      for (const p of particlesRef.current) {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        const progress = p.life / p.maxLife;
        const alpha = p.opacity * (1 - progress);

        ctx.save();
        ctx.globalAlpha = alpha;
        if (p.color === "#ff6b35" || p.color === "#ffd700") {
          // Fire glow
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Respawn ambient particles
        if (p.life >= p.maxLife && !isFireScene) {
          Object.assign(p, createParticle(w, h, "ambient"));
        }
      }

      // Keep ambient particle count stable
      while (particlesRef.current.filter(p => p.color !== "#ff6b35" && p.color !== "#ffd700" && p.color !== "#fff").length < 60) {
        particlesRef.current.push(createParticle(w, h, "ambient"));
      }

      frame++;
      animFrameRef.current = requestAnimationFrame(draw);
    };
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [sceneIndex]);

  // ── CTA handlers ─────────────────────────────────────────────────────────
  const handleCTA = () => {
    setExiting(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    requestAnimationFrame(() => {
      setTimeout(() => {
        setVisible(false);
        onDismiss?.();
        navigate("/onboarding");
      }, 700);
    });
  };

  const handleSkip = () => {
    setExiting(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    requestAnimationFrame(() => {
      setTimeout(() => {
        setVisible(false);
        onDismiss?.();
        navigate("/");
      }, 500);
    });
  };

  if (!visible) return null;

  const px = mousePos.x;
  const py = mousePos.y;

  // ── Scene-specific colours ───────────────────────────────────────────────
  const sceneAccent = [
    "rgba(139,92,246,0.3)",   // 0: purple ambient
    "rgba(99,102,241,0.4)",   // 1: indigo burst
    "rgba(251,146,60,0.5)",   // 2: fire orange
    "rgba(139,92,246,0.35)",  // 3: character purple
    "rgba(59,130,246,0.3)",   // 4: montage blue
    "rgba(167,139,250,0.4)",  // 5: final violet
  ];

  const isFireScene = sceneIndex === 2;

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-black ${exiting ? "opacity-0 scale-110" : "opacity-100 scale-100"}`}
      style={{ transition: "transform 0.8s cubic-bezier(0.16,1,0.3,1), opacity 0.7s ease-out", willChange: "transform, opacity" }}
    >
      {/* ── Canvas particle layer ── */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* ── Parallax ambient glow — shifts with mouse ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ transform: `translate(${px * 25}px, ${py * 18}px)`, transition: "transform 0.2s ease-out" }}
      >
        <div
          className="absolute top-1/4 left-1/4 w-[700px] h-[700px] rounded-full"
          style={{
            background: `radial-gradient(circle, ${sceneAccent[sceneIndex]} 0%, transparent 70%)`,
            filter: "blur(80px)",
            transition: "background 1s ease",
          }}
        />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ transform: `translate(${px * -18}px, ${py * 12}px)`, transition: "transform 0.25s ease-out" }}
      >
        <div
          className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full"
          style={{
            background: `radial-gradient(circle, ${sceneAccent[(sceneIndex + 2) % 6]} 0%, transparent 70%)`,
            filter: "blur(60px)",
            transition: "background 1s ease",
          }}
        />
      </div>

      {/* ── Fire scene: volumetric flame glow ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 80%, rgba(251,146,60,0.35) 0%, rgba(239,68,68,0.2) 30%, transparent 65%)",
          opacity: isFireScene ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      />

      {/* ── Beat burst radial ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${sceneAccent[sceneIndex].replace("0.3", "0.1").replace("0.4", "0.12").replace("0.5", "0.15").replace("0.35", "0.1").replace("0.4", "0.12")} 0%, transparent 60%)`,
          opacity: beatPulse ? 1 : 0,
          transition: "opacity 0.08s ease",
        }}
      />

      {/* ── Dark cinematic overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85 pointer-events-none" />

      {/* ── Vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.75) 100%)" }}
      />

      {/* ── Film grain ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* ── Scene-specific background layers ── */}

      {/* Scene 4: Character consistency — two-cut grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: sceneIndex === 3 ? 0.18 : 0, transition: "opacity 0.8s ease" }}
      >
        <div className="absolute inset-0 grid grid-cols-2 gap-1">
          <div className="bg-gradient-to-br from-violet-900/60 to-purple-950/80 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-400/40 to-purple-600/40 border border-violet-400/30" />
          </div>
          <div className="bg-gradient-to-br from-violet-900/60 to-purple-950/80 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-400/40 to-purple-600/40 border border-violet-400/30" />
          </div>
        </div>
      </div>

      {/* Scene 5: Use-case montage — three-panel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: sceneIndex === 4 ? 0.15 : 0, transition: "opacity 0.8s ease" }}
      >
        <div className="absolute inset-0 grid grid-cols-3 gap-1">
          <div className="bg-gradient-to-br from-blue-900/60 to-blue-950/80" />
          <div className="bg-gradient-to-br from-pink-900/60 to-pink-950/80" style={{ aspectRatio: "9/16" }} />
          <div className="bg-gradient-to-br from-yellow-900/60 to-amber-950/80" />
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">

        {/* ── SCENE 1: "Your ideas..." ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={{
            opacity: sceneIndex === 0 ? 1 : 0,
            transition: "opacity 0.8s ease",
            pointerEvents: sceneIndex === 0 ? "auto" : "none",
          }}
        >
          <div
            className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white/90 tracking-tight"
            style={{
              textShadow: "0 0 60px rgba(139,92,246,0.5), 0 0 120px rgba(139,92,246,0.2)",
              animation: "fadeSlideUp 0.8s ease forwards",
            }}
          >
            Your ideas...
          </div>
        </div>

        {/* ── SCENE 2: "...come to life" ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={{
            opacity: sceneIndex === 1 ? 1 : 0,
            transition: "opacity 0.8s ease",
            pointerEvents: sceneIndex === 1 ? "auto" : "none",
          }}
        >
          <div
            className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #60a5fa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "none",
              boxShadow: beatPulse ? "0 0 80px rgba(139,92,246,0.6)" : "none",
              filter: beatPulse ? "brightness(1.3)" : "brightness(1)",
              transition: "filter 0.08s ease",
              animation: "fadeSlideUp 0.8s ease forwards",
            }}
          >
            ...come to life
          </div>
          {/* Beat-pulse ring */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: beatPulse ? 1 : 0, transition: "opacity 0.08s ease" }}
          >
            <div
              className="rounded-full border border-violet-400/30"
              style={{ width: "60vw", height: "60vw", maxWidth: 500, maxHeight: 500 }}
            />
          </div>
        </div>

        {/* ── SCENE 3: CAUSE→EFFECT USP ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={{
            opacity: sceneIndex === 2 ? 1 : 0,
            transition: "opacity 0.6s ease",
            pointerEvents: sceneIndex === 2 ? "auto" : "none",
          }}
        >
          {/* Input text */}
          <div
            className="inline-flex items-center gap-3 bg-black/50 border border-white/10 backdrop-blur-sm rounded-xl px-6 py-3 mb-6"
            style={{ animation: sceneIndex === 2 ? "fadeSlideUp 0.5s ease forwards" : "none" }}
          >
            <span className="text-white/40 text-sm font-mono">✎</span>
            <span className="text-white/80 text-base sm:text-lg font-medium italic">"Walking through fire"</span>
          </div>

          {/* Arrow */}
          <div
            className="text-orange-400 text-3xl mb-6"
            style={{
              animation: sceneIndex === 2 ? "arrowPulse 0.6s ease 0.3s forwards" : "none",
              opacity: 0,
            }}
          >
            ↓
          </div>

          {/* Visual reaction label */}
          <div
            className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 rounded-full px-5 py-2.5"
            style={{ animation: sceneIndex === 2 ? "fadeSlideUp 0.5s ease 0.5s forwards" : "none", opacity: 0 }}
          >
            <span className="text-2xl">🔥</span>
            <span className="text-orange-300 font-semibold text-sm sm:text-base">Flames · Sparks · Heat</span>
            <span className="text-2xl">⚡</span>
          </div>

          <p
            className="mt-4 text-white/40 text-xs tracking-widest uppercase"
            style={{ animation: sceneIndex === 2 ? "fadeSlideUp 0.5s ease 0.8s forwards" : "none", opacity: 0 }}
          >
            AI understands your content → generates matching visuals
          </p>
        </div>

        {/* ── SCENE 4: Character consistency ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={{
            opacity: sceneIndex === 3 ? 1 : 0,
            transition: "opacity 0.8s ease",
            pointerEvents: sceneIndex === 3 ? "auto" : "none",
          }}
        >
          <div
            className="mb-4 text-white/40 text-xs tracking-widest uppercase"
            style={{ animation: sceneIndex === 3 ? "fadeSlideUp 0.5s ease forwards" : "none" }}
          >
            Consistency Engine
          </div>
          <div
            className="flex items-center gap-4 sm:gap-8"
            style={{ animation: sceneIndex === 3 ? "fadeSlideUp 0.5s ease 0.2s forwards" : "none", opacity: 0 }}
          >
            {/* Cut 1 */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl border-2 border-violet-400/40 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(99,102,241,0.15) 100%)" }}
              >
                <span className="text-4xl sm:text-5xl">👤</span>
              </div>
              <span className="text-white/30 text-xs">Scene 1</span>
            </div>

            {/* Same indicator */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-px bg-violet-400/50" />
              <span className="text-violet-300 text-xs font-medium">Same</span>
              <div className="w-8 h-px bg-violet-400/50" />
            </div>

            {/* Cut 2 */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl border-2 border-violet-400/40 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(99,102,241,0.15) 100%)" }}
              >
                <span className="text-4xl sm:text-5xl">👤</span>
              </div>
              <span className="text-white/30 text-xs">Scene 8</span>
            </div>
          </div>

          <div
            className="mt-5 flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-2"
            style={{ animation: sceneIndex === 3 ? "fadeSlideUp 0.5s ease 0.5s forwards" : "none", opacity: 0 }}
          >
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-violet-300 text-sm font-medium">Same face · Same outfit · Every scene</span>
          </div>
        </div>

        {/* ── SCENE 5: Use-case montage ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={{
            opacity: sceneIndex === 4 ? 1 : 0,
            transition: "opacity 0.8s ease",
            pointerEvents: sceneIndex === 4 ? "auto" : "none",
          }}
        >
          <div
            className="mb-6 text-white/40 text-xs tracking-widest uppercase"
            style={{ animation: sceneIndex === 4 ? "fadeSlideUp 0.5s ease forwards" : "none" }}
          >
            One platform · Every format
          </div>
          <div
            className="flex items-end gap-3 sm:gap-5"
            style={{ animation: sceneIndex === 4 ? "fadeSlideUp 0.5s ease 0.2s forwards" : "none", opacity: 0 }}
          >
            {/* Cinematic 16:9 */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="rounded-xl border border-blue-400/30 flex items-center justify-center"
                style={{ width: 100, height: 56, background: "linear-gradient(135deg, rgba(30,58,138,0.6) 0%, rgba(59,130,246,0.2) 100%)" }}
              >
                <span className="text-2xl">🎬</span>
              </div>
              <span className="text-blue-300 text-xs font-medium">Cinematic</span>
            </div>

            {/* Vertical 9:16 */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="rounded-xl border-2 border-pink-400/40 flex items-center justify-center"
                style={{ width: 56, height: 100, background: "linear-gradient(180deg, rgba(131,24,67,0.6) 0%, rgba(236,72,153,0.2) 100%)" }}
              >
                <span className="text-2xl">📱</span>
              </div>
              <span className="text-pink-300 text-xs font-medium">Social</span>
            </div>

            {/* Kids animated */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="rounded-xl border border-yellow-400/30 flex items-center justify-center"
                style={{ width: 100, height: 56, background: "linear-gradient(135deg, rgba(120,53,15,0.6) 0%, rgba(234,179,8,0.2) 100%)" }}
              >
                <span className="text-2xl">✨</span>
              </div>
              <span className="text-yellow-300 text-xs font-medium">Kids</span>
            </div>
          </div>
        </div>

        {/* ── SCENE 6: Polished final output + CTA ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={{
            opacity: sceneIndex === 5 ? 1 : 0,
            transition: "opacity 0.8s ease",
            pointerEvents: sceneIndex === 5 ? "auto" : "none",
          }}
        >
          {/* WizVid badge */}
          <div
            className="mb-6"
            style={{ animation: sceneIndex === 5 ? "fadeSlideUp 0.5s ease forwards" : "none" }}
          >
            <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md rounded-full px-5 py-2 text-sm text-purple-300 font-medium tracking-wide">
              <span
                className="w-2 h-2 rounded-full bg-purple-400"
                style={{
                  boxShadow: beatPulse ? "0 0 8px 3px rgba(167,139,250,0.8)" : "0 0 4px 1px rgba(167,139,250,0.4)",
                  transition: "box-shadow 0.08s ease",
                }}
              />
              WizVid · AI Video Creator
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4 max-w-3xl"
            style={{
              animation: sceneIndex === 5 ? "fadeSlideUp 0.5s ease 0.1s forwards" : "none",
              opacity: 0,
            }}
          >
            <span className="text-white">Turn your ideas into</span>
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #60a5fa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              cinematic video
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-base sm:text-lg text-white/55 max-w-xl leading-relaxed mb-8"
            style={{
              animation: sceneIndex === 5 ? "fadeSlideUp 0.5s ease 0.2s forwards" : "none",
              opacity: 0,
            }}
          >
            AI that understands your content, lyrics and story
          </p>

          {/* CTA */}
          <div
            style={{
              animation: sceneIndex === 5 ? "fadeSlideUp 0.5s ease 0.35s forwards" : "none",
              opacity: 0,
            }}
          >
            <button
              onClick={handleCTA}
              className="group relative inline-flex items-center gap-3 text-white font-bold text-lg px-10 py-4 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.95) 0%, rgba(99,102,241,0.95) 50%, rgba(59,130,246,0.95) 100%)",
                boxShadow: beatPulse
                  ? "0 0 50px rgba(139,92,246,0.8), 0 0 100px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.15)"
                  : "0 0 25px rgba(139,92,246,0.45), 0 0 50px rgba(139,92,246,0.18), inset 0 1px 0 rgba(255,255,255,0.15)",
                transition: "box-shadow 0.08s ease, transform 0.3s ease",
              }}
            >
              <span className="absolute inset-0 rounded-2xl pointer-events-none" style={{ border: "1px solid rgba(167,139,250,0.5)", animation: "ctaBorderPulse 2s ease-in-out infinite" }} />
              <span className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)", backgroundSize: "200% 100%", animation: "shimmerSweep 1.5s ease infinite" }} />
              <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              <span className="relative z-10">Create Your First Video</span>
              <svg className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>

            <div className="mt-5">
              <button onClick={handleSkip} className="text-white/30 hover:text-white/60 text-sm transition-colors duration-200 underline underline-offset-4">
                Skip intro
              </button>
            </div>
          </div>
        </div>

        {/* ── Scene progress dots (always visible) ── */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 pointer-events-none">
          {[0,1,2,3,4,5].map(i => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: sceneIndex === i ? 20 : 6,
                height: 6,
                background: sceneIndex === i ? "rgba(167,139,250,0.9)" : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes arrowPulse {
          0%   { opacity: 0; transform: translateY(-8px); }
          60%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ctaBorderPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.01); }
        }
        @keyframes shimmerSweep {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>
  );
}
