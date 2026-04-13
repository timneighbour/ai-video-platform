/**
 * CinematicIntroSequence V2
 *
 * A true cinematic product trailer rendered on a 4K Canvas.
 * 3 immersive scenes connected by morphing transitions (no hard cuts).
 * Every frame has camera movement — push-in, pan, or parallax.
 *
 * Timeline (total ~12s):
 *   SCENE 1 (0–4s)   — Void Awakening: deep black → energy particles converge → glow builds
 *   MORPH  (3.5–4.5s) — Particle explosion transitions into Scene 2
 *   SCENE 2 (4–8s)    — Cinematic Worlds: concert stage → morphs into film set → morphs into animation
 *   MORPH  (7.5–8.5s) — Light tunnel collapses into logo
 *   SCENE 3 (8–10.5s) — Logo Reveal: WIZVID with impact hit, glow sweep, camera push-in
 *   HOLD   (10.5–13s) — Final frame: WIZVID + tagline + "Start Creating →" CTA
 *
 * Audio (Web Audio API):
 *   0–4s:    Sub-bass rumble (30Hz) building
 *   4–8s:    Rising cinematic tension (layered oscillators + filter sweep)
 *   8s:      IMPACT HIT (noise burst + sub drop + all oscillators peak)
 *   8–13s:   Reverb tail + atmospheric pad fade-out
 *
 * Canvas: 4K resolution (3840×2160) scaled by devicePixelRatio
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { mp } from "@/lib/mixpanel";

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * clamp(t, 0, 1); }
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
function easeOutExpo(t: number) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
function easeInOutQuart(t: number) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  hue: number; sat: number; light: number;
  alpha: number;
  life: number; maxLife: number;
  layer: number; // 0=far 1=mid 2=near — affects parallax speed
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SCENE_1_END = 4000;
const SCENE_2_END = 8000;
const SCENE_3_END = 10500;
const HOLD_END = 13000;
const MORPH_DURATION = 1000; // ms overlap between scenes

// ── Camera state ──────────────────────────────────────────────────────────────

interface Camera {
  x: number; y: number; zoom: number; rotation: number;
}

function getCamera(elapsed: number, w: number, h: number): Camera {
  const cam: Camera = { x: 0, y: 0, zoom: 1, rotation: 0 };

  if (elapsed < SCENE_1_END) {
    // Slow push-in from 0.92 → 1.05 + slight upward pan
    const t = elapsed / SCENE_1_END;
    cam.zoom = lerp(0.92, 1.05, easeInOutQuart(t));
    cam.y = lerp(h * 0.04, -h * 0.02, t);
    cam.x = Math.sin(elapsed * 0.0003) * w * 0.008;
    cam.rotation = Math.sin(elapsed * 0.0002) * 0.003;
  } else if (elapsed < SCENE_2_END) {
    // Continuous pan right + slow zoom out then in
    const t = (elapsed - SCENE_1_END) / (SCENE_2_END - SCENE_1_END);
    cam.x = lerp(-w * 0.03, w * 0.03, t) + Math.sin(elapsed * 0.0004) * w * 0.01;
    cam.y = Math.cos(elapsed * 0.00025) * h * 0.015;
    cam.zoom = lerp(1.08, 1.0, Math.abs(Math.sin(t * Math.PI)));
    cam.rotation = Math.sin(elapsed * 0.00015) * 0.004;
  } else if (elapsed < SCENE_3_END) {
    // Camera push-in on logo (dramatic)
    const t = (elapsed - SCENE_2_END) / (SCENE_3_END - SCENE_2_END);
    cam.zoom = lerp(0.95, 1.12, easeOutExpo(t));
    cam.y = lerp(h * 0.01, 0, t);
  }
  // HOLD: camera stays still

  return cam;
}

// ── Audio Engine ──────────────────────────────────────────────────────────────

function buildAudio(ctx: AudioContext) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.8, now + 0.5);

  // Convolver reverb (synthetic IR — 3s hall)
  const convolver = ctx.createConvolver();
  const irLen = ctx.sampleRate * 3;
  const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < irLen; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3);
    }
  }
  convolver.buffer = ir;
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.35;
  master.connect(reverbSend);
  reverbSend.connect(convolver);
  convolver.connect(ctx.destination);
  master.connect(ctx.destination);

  // 1) Sub-bass rumble (30Hz, 0–8s, peaks at impact)
  const subOsc = ctx.createOscillator();
  subOsc.type = "sine";
  subOsc.frequency.value = 30;
  const subGain = ctx.createGain();
  const subFilter = ctx.createBiquadFilter();
  subFilter.type = "lowpass";
  subFilter.frequency.value = 80;
  subOsc.connect(subFilter);
  subFilter.connect(subGain);
  subGain.connect(master);
  subGain.gain.setValueAtTime(0, now);
  subGain.gain.linearRampToValueAtTime(0.25, now + 2);
  subGain.gain.linearRampToValueAtTime(0.4, now + 7.5);
  subGain.gain.linearRampToValueAtTime(0.7, now + 8); // peak at impact
  subGain.gain.linearRampToValueAtTime(0.15, now + 9);
  subGain.gain.linearRampToValueAtTime(0, now + 11);
  subOsc.start(now);
  subOsc.stop(now + 12);

  // 2) Rising tension (detuned sawtooths + bandpass sweep, 2–8s)
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 60 + i * 20;
    osc.detune.value = (i - 1) * 15;
    const g = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 3;
    bp.frequency.setValueAtTime(150, now + 2);
    bp.frequency.exponentialRampToValueAtTime(3000, now + 8);
    osc.connect(bp);
    bp.connect(g);
    g.connect(master);
    g.gain.setValueAtTime(0, now + 2);
    g.gain.linearRampToValueAtTime(0.08, now + 5);
    g.gain.linearRampToValueAtTime(0.2, now + 7.8);
    g.gain.linearRampToValueAtTime(0, now + 8.5);
    osc.start(now + 2);
    osc.stop(now + 9);
  }

  // 3) Cinematic pad (soft chord, 4–10s)
  const padNotes = [110, 164.81, 220, 329.63]; // Am chord
  padNotes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 800;
    osc.connect(lp);
    lp.connect(g);
    g.connect(master);
    g.gain.setValueAtTime(0, now + 4);
    g.gain.linearRampToValueAtTime(0.04, now + 6);
    g.gain.linearRampToValueAtTime(0.06, now + 8);
    g.gain.linearRampToValueAtTime(0.02, now + 10);
    g.gain.linearRampToValueAtTime(0, now + 12);
    osc.start(now + 4);
    osc.stop(now + 13);
  });

  // 4) IMPACT HIT at 8s (noise burst + sub drop)
  const impactAt = now + 8;
  // Noise burst
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseData.length, 1.5);
  }
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.8, impactAt);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, impactAt + 0.2);
  const noiseLp = ctx.createBiquadFilter();
  noiseLp.type = "lowpass";
  noiseLp.frequency.value = 400;
  noiseSrc.connect(noiseLp);
  noiseLp.connect(noiseGain);
  noiseGain.connect(master);
  noiseSrc.start(impactAt);

  // Sub drop (80Hz → 25Hz in 0.3s)
  const dropOsc = ctx.createOscillator();
  dropOsc.type = "sine";
  dropOsc.frequency.setValueAtTime(80, impactAt);
  dropOsc.frequency.exponentialRampToValueAtTime(25, impactAt + 0.3);
  const dropGain = ctx.createGain();
  dropGain.gain.setValueAtTime(0.6, impactAt);
  dropGain.gain.exponentialRampToValueAtTime(0.001, impactAt + 0.5);
  dropOsc.connect(dropGain);
  dropGain.connect(master);
  dropOsc.start(impactAt);
  dropOsc.stop(impactAt + 0.6);

  // 5) Fade out master
  master.gain.setValueAtTime(0.8, now + 10.5);
  master.gain.linearRampToValueAtTime(0, now + 13);

  return master;
}

// ── Particle factory ──────────────────────────────────────────────────────────

function makeParticle(w: number, h: number, layer: number, scene: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = (0.2 + Math.random() * 1.5) * (layer * 0.5 + 0.5);

  // Scene-specific colour palettes
  let hue: number, sat: number, light: number;
  if (scene === 0) {
    // Void: deep violet/indigo
    hue = 260 + Math.random() * 40;
    sat = 70 + Math.random() * 30;
    light = 50 + Math.random() * 30;
  } else if (scene === 1) {
    // Worlds: warm amber → cool teal shift
    hue = Math.random() < 0.5 ? 20 + Math.random() * 30 : 170 + Math.random() * 30;
    sat = 80 + Math.random() * 20;
    light = 55 + Math.random() * 25;
  } else {
    // Logo: pure white/violet
    hue = 270 + Math.random() * 50;
    sat = 40 + Math.random() * 40;
    light = 70 + Math.random() * 30;
  }

  return {
    x: w * 0.5 + (Math.random() - 0.5) * w * 0.8,
    y: h * 0.5 + (Math.random() - 0.5) * h * 0.8,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 0.3,
    radius: (0.5 + Math.random() * 3) * (layer * 0.4 + 0.6),
    hue, sat, light,
    alpha: 0.5 + Math.random() * 0.5,
    life: 0,
    maxLife: 80 + Math.random() * 160,
    layer,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onComplete: () => void; }

export default function CinematicIntroSequence({ onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioStartedRef = useRef(false);
  const doneRef = useRef(false);

  const [phase, setPhase] = useState<"playing" | "hold">("playing");
  const [ctaVisible, setCTAVisible] = useState(false);
  const [logoAlpha, setLogoAlpha] = useState(0);
  const [impactFlash, setImpactFlash] = useState(0);

  // ── Audio ─────────────────────────────────────────────────────────────────

  const startAudio = useCallback(() => {
    if (audioStartedRef.current) return;
    audioStartedRef.current = true;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      buildAudio(ctx);
    } catch { /* silent */ }
  }, []);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    cleanup();
    onComplete();
  }, [cleanup, onComplete]);

  // ── Canvas loop ───────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // 4K resolution with DPR scaling
    const dpr = Math.min(window.devicePixelRatio || 1, 3); // cap at 3x for perf
    let cssW = window.innerWidth;
    let cssH = window.innerHeight;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    ctx.scale(dpr, dpr);

    const onResize = () => {
      cssW = window.innerWidth;
      cssH = window.innerHeight;
      const newDpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = cssW * newDpr;
      canvas.height = cssH * newDpr;
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(newDpr, newDpr);
    };
    window.addEventListener("resize", onResize);

    // Seed particles
    for (let i = 0; i < 200; i++) {
      particlesRef.current.push(makeParticle(cssW, cssH, i % 3, 0));
    }

    startRef.current = performance.now();
    let impactFired = false;

    function draw(now: number) {
      if (!ctx) return;
      const elapsed = now - startRef.current;
      const w = cssW;
      const h = cssH;

      // ── Determine scene ────────────────────────────────────────────────
      const inScene1 = elapsed < SCENE_1_END;
      const inMorph1 = elapsed >= SCENE_1_END - MORPH_DURATION / 2 && elapsed < SCENE_1_END + MORPH_DURATION / 2;
      const inScene2 = elapsed >= SCENE_1_END && elapsed < SCENE_2_END;
      const inMorph2 = elapsed >= SCENE_2_END - MORPH_DURATION / 2 && elapsed < SCENE_2_END + MORPH_DURATION / 2;
      const inScene3 = elapsed >= SCENE_2_END && elapsed < SCENE_3_END;
      const inHold = elapsed >= SCENE_3_END;

      // ── Camera ─────────────────────────────────────────────────────────
      const cam = getCamera(elapsed, w, h);

      // ── Motion blur: semi-transparent clear ────────────────────────────
      const blurAlpha = inScene1 ? 0.06 : inScene2 ? 0.05 : inScene3 ? 0.08 : 0.12;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const currentDpr = Math.min(window.devicePixelRatio || 1, 3);
      ctx.scale(currentDpr, currentDpr);
      ctx.fillStyle = `rgba(0,0,0,${blurAlpha})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // ── Apply camera transform ─────────────────────────────────────────
      ctx.save();
      ctx.translate(w / 2 + cam.x, h / 2 + cam.y);
      ctx.rotate(cam.rotation);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-w / 2, -h / 2);

      // ── SCENE 1: Void Awakening ────────────────────────────────────────
      if (inScene1 || inMorph1) {
        const t = elapsed / SCENE_1_END;
        const glowIntensity = smoothstep(0, 1, t);

        // Central energy core — pulsing radial gradient
        const pulseR = w * (0.15 + 0.25 * glowIntensity + 0.03 * Math.sin(elapsed * 0.003));
        const coreGrd = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, pulseR);
        coreGrd.addColorStop(0, `rgba(140,80,255,${0.2 * glowIntensity})`);
        coreGrd.addColorStop(0.4, `rgba(100,40,200,${0.1 * glowIntensity})`);
        coreGrd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = coreGrd;
        ctx.fillRect(0, 0, w, h);

        // Nebula wisps — multiple offset orbs drifting
        for (let i = 0; i < 4; i++) {
          const ox = w * (0.3 + i * 0.15) + Math.sin(elapsed * 0.0005 + i * 2) * w * 0.08;
          const oy = h * (0.35 + Math.cos(elapsed * 0.0004 + i * 1.5) * 0.15);
          const or = w * (0.08 + i * 0.03) * glowIntensity;
          const nebGrd = ctx.createRadialGradient(ox, oy, 0, ox, oy, or);
          nebGrd.addColorStop(0, `hsla(${260 + i * 20},80%,50%,${0.06 * glowIntensity})`);
          nebGrd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = nebGrd;
          ctx.fillRect(0, 0, w, h);
        }

        // Converging light streaks toward centre
        if (t > 0.3) {
          const streakAlpha = smoothstep(0.3, 0.8, t) * 0.04;
          for (let s = 0; s < 12; s++) {
            const angle = (s / 12) * Math.PI * 2 + elapsed * 0.0001;
            const startR = w * 0.7;
            const endR = w * 0.05 * (1 - t * 0.5);
            const sx = w * 0.5 + Math.cos(angle) * startR;
            const sy = h * 0.5 + Math.sin(angle) * startR;
            const ex = w * 0.5 + Math.cos(angle) * endR;
            const ey = h * 0.5 + Math.sin(angle) * endR;
            const streakGrd = ctx.createLinearGradient(sx, sy, ex, ey);
            streakGrd.addColorStop(0, "rgba(0,0,0,0)");
            streakGrd.addColorStop(0.5, `rgba(180,120,255,${streakAlpha})`);
            streakGrd.addColorStop(1, "rgba(0,0,0,0)");
            ctx.strokeStyle = streakGrd;
            ctx.lineWidth = 1.5 + t * 2;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
          }
        }
      }

      // ── MORPH 1: Particle explosion transition ─────────────────────────
      if (inMorph1) {
        const mt = (elapsed - (SCENE_1_END - MORPH_DURATION / 2)) / MORPH_DURATION;
        const flashAlpha = Math.sin(mt * Math.PI) * 0.15;
        const flashGrd = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
        flashGrd.addColorStop(0, `rgba(200,150,255,${flashAlpha})`);
        flashGrd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = flashGrd;
        ctx.fillRect(0, 0, w, h);
        // Spawn burst particles
        if (particlesRef.current.length < 500) {
          for (let i = 0; i < 8; i++) {
            particlesRef.current.push(makeParticle(w, h, Math.floor(Math.random() * 3), 1));
          }
        }
      }

      // ── SCENE 2: Cinematic Worlds ──────────────────────────────────────
      if (inScene2 || inMorph2) {
        const t = (elapsed - SCENE_1_END) / (SCENE_2_END - SCENE_1_END);

        // Sub-scene blending (3 worlds morphing into each other)
        // World A (0–0.4): Concert stage — warm amber/red
        // World B (0.3–0.7): Film noir — cool blue/teal
        // World C (0.6–1.0): Animation — golden/teal/violet
        const worldA = smoothstep(0, 0.15, t) * (1 - smoothstep(0.3, 0.45, t));
        const worldB = smoothstep(0.25, 0.4, t) * (1 - smoothstep(0.6, 0.75, t));
        const worldC = smoothstep(0.55, 0.7, t);

        // World A: Concert stage
        if (worldA > 0.01) {
          // Stage floor
          const floorGrd = ctx.createLinearGradient(0, h * 0.55, 0, h);
          floorGrd.addColorStop(0, `rgba(255,100,20,${0.08 * worldA})`);
          floorGrd.addColorStop(1, `rgba(120,20,0,${0.04 * worldA})`);
          ctx.fillStyle = floorGrd;
          ctx.fillRect(0, h * 0.5, w, h * 0.5);

          // Spotlights (volumetric cones)
          for (let s = 0; s < 5; s++) {
            const sx = w * (0.1 + s * 0.2) + Math.sin(elapsed * 0.001 + s) * 20;
            ctx.save();
            ctx.globalAlpha = worldA;
            const spotGrd = ctx.createRadialGradient(sx, -h * 0.1, 0, sx, h * 0.5, h * 0.8);
            spotGrd.addColorStop(0, `rgba(255,200,80,0.08)`);
            spotGrd.addColorStop(0.5, `rgba(255,150,50,0.03)`);
            spotGrd.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = spotGrd;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
          }

          // Crowd silhouettes (moving)
          ctx.fillStyle = `rgba(0,0,0,${0.4 * worldA})`;
          for (let c = 0; c < 50; c++) {
            const cx = (c / 50) * w;
            const bobY = Math.sin(elapsed * 0.004 + c * 0.8) * 4;
            const cy = h * (0.74 + Math.sin(c * 1.3) * 0.03) + bobY;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 6 + Math.sin(c) * 2, 10 + Math.cos(c) * 3, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // World B: Film noir
        if (worldB > 0.01) {
          const filmGrd = ctx.createLinearGradient(0, 0, w, h);
          filmGrd.addColorStop(0, `rgba(0,30,70,${0.12 * worldB})`);
          filmGrd.addColorStop(0.5, `rgba(0,60,100,${0.06 * worldB})`);
          filmGrd.addColorStop(1, `rgba(15,0,50,${0.08 * worldB})`);
          ctx.fillStyle = filmGrd;
          ctx.fillRect(0, 0, w, h);

          // Letterbox bars (cinematic aspect)
          const barH = h * 0.07 * worldB;
          ctx.fillStyle = `rgba(0,0,0,${0.8 * worldB})`;
          ctx.fillRect(0, 0, w, barH);
          ctx.fillRect(0, h - barH, w, barH);

          // Volumetric light shaft from upper-right
          ctx.save();
          ctx.globalAlpha = worldB * 0.06;
          ctx.translate(w * 0.8, 0);
          ctx.rotate(0.3);
          const shaftGrd = ctx.createLinearGradient(0, 0, 0, h * 1.5);
          shaftGrd.addColorStop(0, "rgba(100,180,255,0)");
          shaftGrd.addColorStop(0.3, "rgba(100,180,255,1)");
          shaftGrd.addColorStop(1, "rgba(100,180,255,0)");
          ctx.fillStyle = shaftGrd;
          ctx.fillRect(-40, 0, 80, h * 1.5);
          ctx.restore();
        }

        // World C: Animation
        if (worldC > 0.01) {
          const animGrd = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.7);
          animGrd.addColorStop(0, `rgba(255,180,60,${0.08 * worldC})`);
          animGrd.addColorStop(0.4, `rgba(0,200,180,${0.04 * worldC})`);
          animGrd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = animGrd;
          ctx.fillRect(0, 0, w, h);

          // Floating luminous orbs (Pixar-style)
          for (let o = 0; o < 7; o++) {
            const ox = w * (0.1 + o * 0.13) + Math.sin(elapsed * 0.0008 + o * 1.5) * 40;
            const oy = h * (0.25 + Math.cos(elapsed * 0.0006 + o * 2) * 0.2);
            const orbR = 20 + o * 10 + Math.sin(elapsed * 0.002 + o) * 8;
            const orbGrd = ctx.createRadialGradient(ox, oy, 0, ox, oy, orbR);
            orbGrd.addColorStop(0, `rgba(255,220,100,${0.18 * worldC})`);
            orbGrd.addColorStop(0.5, `rgba(255,180,60,${0.06 * worldC})`);
            orbGrd.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = orbGrd;
            ctx.fillRect(ox - orbR, oy - orbR, orbR * 2, orbR * 2);
          }
        }
      }

      // ── MORPH 2: Light tunnel collapse ─────────────────────────────────
      if (inMorph2) {
        const mt = (elapsed - (SCENE_2_END - MORPH_DURATION / 2)) / MORPH_DURATION;
        // Radial light tunnel collapsing inward
        const tunnelR = w * 0.6 * (1 - mt);
        const tunnelGrd = ctx.createRadialGradient(w * 0.5, h * 0.5, tunnelR * 0.1, w * 0.5, h * 0.5, tunnelR);
        tunnelGrd.addColorStop(0, `rgba(255,255,255,${0.15 * Math.sin(mt * Math.PI)})`);
        tunnelGrd.addColorStop(0.5, `rgba(180,120,255,${0.08 * Math.sin(mt * Math.PI)})`);
        tunnelGrd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = tunnelGrd;
        ctx.fillRect(0, 0, w, h);
      }

      // ── SCENE 3: Logo Reveal + Impact ──────────────────────────────────
      if (inScene3 || inHold) {
        const t3 = clamp((elapsed - SCENE_2_END) / (SCENE_3_END - SCENE_2_END), 0, 1);

        // Impact flash at the very start of scene 3
        if (!impactFired && elapsed >= SCENE_2_END) {
          impactFired = true;
          setImpactFlash(1);
          // Decay flash over 600ms
          const flashStart = performance.now();
          const decayFlash = () => {
            const dt = (performance.now() - flashStart) / 600;
            if (dt < 1) {
              setImpactFlash(1 - dt);
              requestAnimationFrame(decayFlash);
            } else {
              setImpactFlash(0);
            }
          };
          requestAnimationFrame(decayFlash);
        }

        // Glow sweep behind logo
        const sweepX = lerp(-0.3, 1.3, easeOutExpo(clamp(t3 * 1.5, 0, 1)));
        const sweepGrd = ctx.createLinearGradient(w * (sweepX - 0.15), 0, w * (sweepX + 0.15), 0);
        sweepGrd.addColorStop(0, "rgba(0,0,0,0)");
        sweepGrd.addColorStop(0.5, `rgba(200,150,255,${0.12 * (1 - t3 * 0.5)})`);
        sweepGrd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sweepGrd;
        ctx.fillRect(0, h * 0.3, w, h * 0.4);

        // Central glow
        const logoGlow = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, w * 0.35);
        logoGlow.addColorStop(0, `rgba(160,100,255,${0.08 * easeOutExpo(t3)})`);
        logoGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = logoGlow;
        ctx.fillRect(0, 0, w, h);

        setLogoAlpha(easeOutExpo(clamp(t3 * 2, 0, 1)));
      }

      // ── Particles (all scenes) ─────────────────────────────────────────
      const currentScene = inScene1 ? 0 : inScene2 ? 1 : 2;
      const spawnRate = inScene1 ? 2 : inScene2 ? 3 : inScene3 ? 1 : 0;
      for (let i = 0; i < spawnRate; i++) {
        if (particlesRef.current.length < 600) {
          particlesRef.current.push(makeParticle(w, h, Math.floor(Math.random() * 3), currentScene));
        }
      }

      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);

      for (const p of particlesRef.current) {
        p.life++;
        // Parallax: deeper layers move slower
        const parallaxFactor = 0.3 + p.layer * 0.35;
        p.x += p.vx * parallaxFactor;
        p.y += p.vy * parallaxFactor;
        p.vy -= 0.008; // gentle upward drift

        const lifeT = p.life / p.maxLife;
        const fadeIn = smoothstep(0, 0.15, lifeT);
        const fadeOut = 1 - smoothstep(0.7, 1, lifeT);
        const a = p.alpha * fadeIn * fadeOut;

        if (a < 0.01) continue;

        const r = p.radius * (1 + p.layer * 0.3);
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.5);
        grd.addColorStop(0, `hsla(${p.hue},${p.sat}%,${p.light}%,${a})`);
        grd.addColorStop(0.4, `hsla(${p.hue},${p.sat}%,${p.light}%,${a * 0.4})`);
        grd.addColorStop(1, `hsla(${p.hue},${p.sat}%,${p.light}%,0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Film grain (subtle) ────────────────────────────────────────────
      const grainCount = Math.floor(w * h / 5000);
      ctx.fillStyle = "rgba(255,255,255,0.018)";
      for (let g = 0; g < grainCount; g++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
      }

      // ── Depth vignette ─────────────────────────────────────────────────
      const vigGrd = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.25, w * 0.5, h * 0.5, w * 0.75);
      vigGrd.addColorStop(0, "rgba(0,0,0,0)");
      vigGrd.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = vigGrd;
      ctx.fillRect(0, 0, w, h);

      ctx.restore(); // camera transform

      // ── Phase transitions ──────────────────────────────────────────────
      if (elapsed >= SCENE_3_END && phase !== "hold") {
        setPhase("hold");
        setTimeout(() => setCTAVisible(true), 800);
      }

      if (elapsed < HOLD_END + 5000) {
        rafRef.current = requestAnimationFrame(draw);
      }
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleInteraction = useCallback(() => { startAudio(); }, [startAudio]);
  const handleCTA = useCallback(() => {
    startAudio();
    mp.heroCTAClicked();
    finish();
  }, [startAudio, finish]);
  const handleSkip = useCallback(() => { finish(); }, [finish]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black overflow-hidden cursor-pointer"
      onClick={handleInteraction}
      role="presentation"
      aria-label="WizVid cinematic intro"
    >
      {/* 4K Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      />

      {/* Impact flash overlay */}
      {impactFlash > 0 && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: `radial-gradient(circle at 50% 45%, rgba(200,150,255,${impactFlash * 0.5}), rgba(255,255,255,${impactFlash * 0.2}) 30%, transparent 70%)`,
          }}
        />
      )}

      {/* Logo overlay (Scene 3 + Hold) */}
      {logoAlpha > 0 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20"
          style={{ opacity: logoAlpha }}
        >
          <h1
            className="font-black tracking-[0.35em] uppercase select-none"
            style={{
              fontSize: "clamp(3.5rem, 12vw, 10rem)",
              background: "linear-gradient(135deg, #e2d9f3 0%, #c084fc 35%, #f0abfc 65%, #e2d9f3 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: `drop-shadow(0 0 ${50 * logoAlpha}px rgba(192,132,252,0.9)) drop-shadow(0 0 ${100 * logoAlpha}px rgba(192,132,252,0.4))`,
              transform: `scale(${1 + (1 - logoAlpha) * 0.12})`,
              transition: "transform 0.15s ease-out",
            }}
          >
            WIZVID
          </h1>
          <p
            className="mt-3 font-semibold tracking-[0.3em] uppercase select-none"
            style={{
              fontSize: "clamp(0.65rem, 1.8vw, 1rem)",
              color: `rgba(200,160,255,${0.8 * logoAlpha})`,
              letterSpacing: "0.35em",
            }}
          >
            Cinematic AI Video Creation
          </p>
          <p
            className="mt-1 font-medium tracking-[0.2em] uppercase select-none"
            style={{
              fontSize: "clamp(0.5rem, 1.2vw, 0.7rem)",
              color: `rgba(180,140,240,${0.5 * logoAlpha})`,
              letterSpacing: "0.25em",
            }}
          >
            Powered by WizSound™
          </p>
        </div>
      )}

      {/* CTA (Hold phase) */}
      {ctaVisible && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pb-[15vh] z-30"
          style={{
            opacity: ctaVisible ? 1 : 0,
            animation: "fadeInUp 0.8s ease forwards",
          }}
        >
          <button
            onClick={handleCTA}
            aria-label="Start Creating with WizVid"
            className="group relative inline-flex items-center gap-3 px-12 py-5 rounded-2xl font-bold text-black overflow-hidden"
            style={{
              fontSize: "clamp(1rem, 2.2vw, 1.25rem)",
              background: "linear-gradient(135deg, #e2d9f3, #c084fc, #f0abfc)",
              boxShadow: "0 0 60px rgba(192,132,252,0.5), 0 0 120px rgba(192,132,252,0.2)",
              letterSpacing: "0.08em",
            }}
          >
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
                animation: "shimmer 2s infinite",
              }}
            />
            <span className="relative z-10">Start Creating</span>
            <span className="relative z-10 text-xl transition-transform group-hover:translate-x-1">→</span>
          </button>
          <p className="mt-4 text-white/25 text-sm font-medium tracking-widest uppercase">
            No credit card required
          </p>
        </div>
      )}

      {/* Skip button */}
      <button
        onClick={handleSkip}
        aria-label="Skip intro"
        className="absolute top-6 right-6 z-50 px-5 py-2.5 rounded-full text-white/25 hover:text-white/60 text-sm font-medium border border-white/8 hover:border-white/20 bg-black/20 backdrop-blur-sm transition-all duration-300"
        style={{ letterSpacing: "0.06em" }}
      >
        Skip →
      </button>

      {/* Keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-150%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}
