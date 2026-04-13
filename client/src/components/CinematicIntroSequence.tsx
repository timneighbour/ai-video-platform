/**
 * CinematicIntroSequence V3 — Final Polish
 *
 * Timeline (7–8s active + 2–3s hold):
 *   OPEN    0–1200ms    Black → glow build → light particles → bass rumble
 *   FLOW    1200–4500ms 3 scenes: concert (push-in) → Pixar (parallax) → film (slow pan)
 *   GENRE   4500–5800ms "Music Videos" / "Cinematic Films" / "Animation" in-scene
 *   IMPACT  5800–7000ms Logo emerges from light, glow sweep, push-in, micro-shake
 *   HOLD    7000–10000ms WIZVID + tagline + "Start Creating →" CTA
 *
 * Canvas: 4K (3840×2160) with devicePixelRatio scaling
 * Audio: Web Audio API — rumble → tension → impact (boom + sub drop) → reverb tail
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { mp } from "@/lib/mixpanel";

/* ── Math helpers ──────────────────────────────────────────────────────────── */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeInOut = (t: number) => {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

/* ── Timeline constants (ms) ───────────────────────────────────────────────── */
const T_OPEN_END = 1200;
const T_FLOW_END = 4500;
const T_GENRE_END = 5800;
const T_IMPACT_END = 7000;
const T_HOLD_END = 10000;
const MORPH_MS = 400; // cross-fade between flow sub-scenes

/* ── Particle ──────────────────────────────────────────────────────────────── */
interface Particle {
  x: number; y: number; vx: number; vy: number;
  r: number; hue: number; sat: number; lum: number;
  alpha: number; life: number; maxLife: number; layer: number;
}

function spawnParticle(w: number, h: number, layer: number, palette: number): Particle {
  const a = Math.random() * Math.PI * 2;
  const spd = (0.15 + Math.random() * 1.2) * (0.4 + layer * 0.3);
  const hues = [
    [260, 290], // violet (open)
    [15, 45],   // amber (concert)
    [40, 70],   // gold (pixar)
    [190, 220], // teal (film)
    [270, 310], // purple (impact)
  ];
  const [hLo, hHi] = hues[palette % hues.length];
  return {
    x: w / 2 + (Math.random() - 0.5) * w * 0.9,
    y: h / 2 + (Math.random() - 0.5) * h * 0.9,
    vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 0.2,
    r: (0.4 + Math.random() * 2.5) * (0.5 + layer * 0.35),
    hue: hLo + Math.random() * (hHi - hLo),
    sat: 65 + Math.random() * 35,
    lum: 50 + Math.random() * 35,
    alpha: 0.4 + Math.random() * 0.6,
    life: 0, maxLife: 60 + Math.random() * 120, layer,
  };
}

/* ── Camera ────────────────────────────────────────────────────────────────── */
interface Cam { x: number; y: number; zoom: number; rot: number; shakeX: number; shakeY: number; }

function getCam(t: number, w: number, h: number): Cam {
  const c: Cam = { x: 0, y: 0, zoom: 1, rot: 0, shakeX: 0, shakeY: 0 };

  if (t < T_OPEN_END) {
    // Slow zoom in from dark
    const p = t / T_OPEN_END;
    c.zoom = lerp(0.94, 1.02, easeInOut(p));
    c.y = lerp(h * 0.02, 0, p);
  } else if (t < T_FLOW_END) {
    // 3 sub-scenes with continuous motion
    const p = (t - T_OPEN_END) / (T_FLOW_END - T_OPEN_END);
    if (p < 0.35) {
      // Concert: push-in
      const sp = p / 0.35;
      c.zoom = lerp(1.0, 1.1, easeOut(sp));
      c.y = lerp(0, -h * 0.02, sp);
      c.x = Math.sin(t * 0.0005) * w * 0.006;
    } else if (p < 0.68) {
      // Pixar: parallax drift right + gentle zoom out
      const sp = (p - 0.35) / 0.33;
      c.x = lerp(-w * 0.015, w * 0.02, easeInOut(sp));
      c.y = Math.cos(t * 0.0004) * h * 0.01;
      c.zoom = lerp(1.06, 1.0, sp);
      c.rot = Math.sin(t * 0.0002) * 0.003;
    } else {
      // Film: slow pan left + slight zoom in
      const sp = (p - 0.68) / 0.32;
      c.x = lerp(w * 0.015, -w * 0.01, easeInOut(sp));
      c.zoom = lerp(1.0, 1.05, easeOut(sp));
      c.rot = Math.sin(t * 0.00015) * 0.002;
    }
  } else if (t < T_GENRE_END) {
    // Gentle drift during genre reveal
    const p = (t - T_FLOW_END) / (T_GENRE_END - T_FLOW_END);
    c.zoom = lerp(1.02, 1.0, p);
    c.x = Math.sin(t * 0.0003) * w * 0.005;
  } else if (t < T_IMPACT_END) {
    // Impact: push-in + micro-shake
    const p = (t - T_GENRE_END) / (T_IMPACT_END - T_GENRE_END);
    c.zoom = lerp(0.96, 1.08, easeOut(p));
    // Micro-shake decays over impact
    const shakeIntensity = Math.max(0, 1 - p * 2.5);
    c.shakeX = (Math.random() - 0.5) * 6 * shakeIntensity;
    c.shakeY = (Math.random() - 0.5) * 4 * shakeIntensity;
  }
  // HOLD: still
  return c;
}

/* ── Audio Engine ──────────────────────────────────────────────────────────── */
function buildAudio(ctx: AudioContext) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.75, now + 0.3);

  // Reverb (synthetic 2.5s hall)
  const conv = ctx.createConvolver();
  const irLen = ctx.sampleRate * 2.5;
  const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.8);
  }
  conv.buffer = ir;
  const revSend = ctx.createGain();
  revSend.gain.value = 0.4;
  master.connect(revSend);
  revSend.connect(conv);
  conv.connect(ctx.destination);
  master.connect(ctx.destination);

  // 1) Sub-bass rumble (28Hz, 0–6s)
  const sub = ctx.createOscillator();
  sub.type = "sine"; sub.frequency.value = 28;
  const subG = ctx.createGain();
  const subLP = ctx.createBiquadFilter();
  subLP.type = "lowpass"; subLP.frequency.value = 70;
  sub.connect(subLP); subLP.connect(subG); subG.connect(master);
  subG.gain.setValueAtTime(0, now);
  subG.gain.linearRampToValueAtTime(0.2, now + 1.2);
  subG.gain.linearRampToValueAtTime(0.35, now + 4.5);
  subG.gain.linearRampToValueAtTime(0.6, now + 5.7);
  subG.gain.linearRampToValueAtTime(0.8, now + 5.8); // peak at impact
  subG.gain.linearRampToValueAtTime(0.15, now + 6.5);
  subG.gain.linearRampToValueAtTime(0, now + 8);
  sub.start(now); sub.stop(now + 9);

  // 2) Rising tension (detuned saws + sweep, 1.2–5.8s)
  for (let i = 0; i < 3; i++) {
    const o = ctx.createOscillator();
    o.type = "sawtooth"; o.frequency.value = 55 + i * 18; o.detune.value = (i - 1) * 12;
    const g = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.Q.value = 4;
    bp.frequency.setValueAtTime(120, now + 1.2);
    bp.frequency.exponentialRampToValueAtTime(2800, now + 5.8);
    o.connect(bp); bp.connect(g); g.connect(master);
    g.gain.setValueAtTime(0, now + 1.2);
    g.gain.linearRampToValueAtTime(0.06, now + 3);
    g.gain.linearRampToValueAtTime(0.18, now + 5.6);
    g.gain.linearRampToValueAtTime(0, now + 6.2);
    o.start(now + 1.2); o.stop(now + 6.5);
  }

  // 3) Cinematic pad (Am chord, 2.5–8s)
  [110, 164.81, 220, 329.63].forEach(freq => {
    const o = ctx.createOscillator();
    o.type = "triangle"; o.frequency.value = freq;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 700;
    o.connect(lp); lp.connect(g); g.connect(master);
    g.gain.setValueAtTime(0, now + 2.5);
    g.gain.linearRampToValueAtTime(0.035, now + 4);
    g.gain.linearRampToValueAtTime(0.05, now + 5.8);
    g.gain.linearRampToValueAtTime(0.02, now + 7.5);
    g.gain.linearRampToValueAtTime(0, now + 9);
    o.start(now + 2.5); o.stop(now + 10);
  });

  // 4) IMPACT at 5.8s — cinematic boom (noise burst + sub drop + boom oscillator)
  const impT = now + 5.8;

  // Noise burst
  const nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
  const nD = nBuf.getChannelData(0);
  for (let i = 0; i < nD.length; i++) nD[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nD.length, 1.2);
  const nSrc = ctx.createBufferSource(); nSrc.buffer = nBuf;
  const nG = ctx.createGain();
  nG.gain.setValueAtTime(0.7, impT);
  nG.gain.exponentialRampToValueAtTime(0.001, impT + 0.15);
  const nLP = ctx.createBiquadFilter(); nLP.type = "lowpass"; nLP.frequency.value = 500;
  nSrc.connect(nLP); nLP.connect(nG); nG.connect(master);
  nSrc.start(impT);

  // Sub drop (70Hz → 22Hz)
  const drop = ctx.createOscillator();
  drop.type = "sine";
  drop.frequency.setValueAtTime(70, impT);
  drop.frequency.exponentialRampToValueAtTime(22, impT + 0.35);
  const dG = ctx.createGain();
  dG.gain.setValueAtTime(0.65, impT);
  dG.gain.exponentialRampToValueAtTime(0.001, impT + 0.5);
  drop.connect(dG); dG.connect(master);
  drop.start(impT); drop.stop(impT + 0.6);

  // Boom body (low sine burst)
  const boom = ctx.createOscillator();
  boom.type = "sine"; boom.frequency.value = 45;
  const bG = ctx.createGain();
  bG.gain.setValueAtTime(0.5, impT);
  bG.gain.exponentialRampToValueAtTime(0.001, impT + 0.4);
  boom.connect(bG); bG.connect(master);
  boom.start(impT); boom.stop(impT + 0.5);

  // 5) Master fade
  master.gain.setValueAtTime(0.75, now + 7.5);
  master.gain.linearRampToValueAtTime(0, now + 10);

  return master;
}

/* ── Component ─────────────────────────────────────────────────────────────── */
interface Props { onComplete: () => void; }

export default function CinematicIntroSequence({ onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const particles = useRef<Particle[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioStarted = useRef(false);
  const doneRef = useRef(false);

  const [ctaVisible, setCTAVisible] = useState(false);
  const [logoAlpha, setLogoAlpha] = useState(0);
  const [impactFlash, setImpactFlash] = useState(0);
  const [shakeCSS, setShakeCSS] = useState({ x: 0, y: 0 });

  const startAudio = useCallback(() => {
    if (audioStarted.current) return;
    audioStarted.current = true;
    try { const c = new AudioContext(); audioCtxRef.current = c; buildAudio(c); } catch { /* */ }
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    onComplete();
  }, [onComplete]);

  /* ── Canvas render loop ────────────────────────────────────────────────── */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    let W = window.innerWidth, H = window.innerHeight;
    cvs.width = W * dpr; cvs.height = H * dpr;
    cvs.style.width = W + "px"; cvs.style.height = H + "px";
    ctx.scale(dpr, dpr);

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight;
      const d = Math.min(window.devicePixelRatio || 1, 3);
      cvs.width = W * d; cvs.height = H * d;
      cvs.style.width = W + "px"; cvs.style.height = H + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(d, d);
    };
    window.addEventListener("resize", onResize);

    // Seed initial particles
    for (let i = 0; i < 120; i++) particles.current.push(spawnParticle(W, H, i % 3, 0));

    startRef.current = performance.now();
    let impactFired = false;

    // Genre text data (positioned in-scene)
    const genres = [
      { text: "MUSIC VIDEOS", x: 0.18, y: 0.42, hue: 30, delay: 0 },
      { text: "CINEMATIC FILMS", x: 0.5, y: 0.55, hue: 195, delay: 350 },
      { text: "ANIMATION", x: 0.82, y: 0.40, hue: 280, delay: 700 },
    ];

    function draw(now: number) {
      if (!ctx) return;
      const t = now - startRef.current;
      const w = W, h = H;

      const cam = getCam(t, w, h);

      // Motion blur: semi-transparent clear
      const blur = t < T_OPEN_END ? 0.07 : t < T_FLOW_END ? 0.045 : t < T_IMPACT_END ? 0.06 : 0.1;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const d = Math.min(window.devicePixelRatio || 1, 3);
      ctx.scale(d, d);
      ctx.fillStyle = `rgba(0,0,0,${blur})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // Camera transform
      ctx.save();
      ctx.translate(w / 2 + cam.x + cam.shakeX, h / 2 + cam.y + cam.shakeY);
      ctx.rotate(cam.rot);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-w / 2, -h / 2);

      // Update shake CSS for DOM elements
      if (t >= T_GENRE_END && t < T_IMPACT_END) {
        setShakeCSS({ x: cam.shakeX, y: cam.shakeY });
      } else if (t >= T_IMPACT_END) {
        setShakeCSS({ x: 0, y: 0 });
      }

      /* ── OPEN: 0–1200ms ─────────────────────────────────────────────── */
      if (t < T_OPEN_END) {
        const p = t / T_OPEN_END;
        // Central glow builds
        const r = w * (0.1 + 0.2 * easeOut(p));
        const grd = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, r);
        grd.addColorStop(0, `rgba(120,60,220,${0.15 * easeOut(p)})`);
        grd.addColorStop(0.6, `rgba(80,30,160,${0.06 * easeOut(p)})`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        // Light streaks converging
        if (p > 0.3) {
          const sa = smoothstep(0.3, 0.9, p) * 0.03;
          for (let s = 0; s < 10; s++) {
            const angle = (s / 10) * Math.PI * 2 + t * 0.00008;
            const sR = w * 0.65;
            const eR = w * 0.04 * (1 - p * 0.4);
            ctx.strokeStyle = `rgba(180,130,255,${sa})`;
            ctx.lineWidth = 1 + p * 1.5;
            ctx.beginPath();
            ctx.moveTo(w * 0.5 + Math.cos(angle) * sR, h * 0.5 + Math.sin(angle) * sR);
            ctx.lineTo(w * 0.5 + Math.cos(angle) * eR, h * 0.5 + Math.sin(angle) * eR);
            ctx.stroke();
          }
        }
      }

      /* ── FLOW: 1200–4500ms (3 sub-scenes) ───────────────────────────── */
      if (t >= T_OPEN_END && t < T_FLOW_END) {
        const fp = (t - T_OPEN_END) / (T_FLOW_END - T_OPEN_END);

        // Sub-scene blend weights (smooth cross-fades via MORPH_MS overlap)
        const sceneLen = (T_FLOW_END - T_OPEN_END) / 3;
        const s1 = smoothstep(0, 0.05, fp) * (1 - smoothstep(0.3, 0.38, fp));
        const s2 = smoothstep(0.28, 0.38, fp) * (1 - smoothstep(0.63, 0.72, fp));
        const s3 = smoothstep(0.62, 0.72, fp);

        // Scene A: Concert stage (warm amber)
        if (s1 > 0.005) {
          // Floor glow
          const flG = ctx.createLinearGradient(0, h * 0.5, 0, h);
          flG.addColorStop(0, `rgba(255,120,30,${0.07 * s1})`);
          flG.addColorStop(1, `rgba(100,20,0,${0.03 * s1})`);
          ctx.fillStyle = flG; ctx.fillRect(0, h * 0.45, w, h * 0.55);

          // Volumetric spotlights
          for (let i = 0; i < 5; i++) {
            const sx = w * (0.08 + i * 0.22) + Math.sin(t * 0.001 + i * 1.3) * 15;
            const sg = ctx.createRadialGradient(sx, -h * 0.05, 0, sx, h * 0.5, h * 0.7);
            sg.addColorStop(0, `rgba(255,200,80,${0.06 * s1})`);
            sg.addColorStop(0.5, `rgba(255,150,50,${0.02 * s1})`);
            sg.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
          }

          // Crowd silhouettes (bobbing)
          ctx.fillStyle = `rgba(0,0,0,${0.35 * s1})`;
          for (let c = 0; c < 40; c++) {
            const cx = (c / 40) * w;
            const cy = h * (0.76 + Math.sin(c * 1.5) * 0.02) + Math.sin(t * 0.005 + c * 0.7) * 3;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 5 + Math.sin(c) * 2, 9, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Scene B: Pixar animation (golden orbs + teal)
        if (s2 > 0.005) {
          const bg = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.6);
          bg.addColorStop(0, `rgba(255,200,80,${0.06 * s2})`);
          bg.addColorStop(0.5, `rgba(0,180,160,${0.03 * s2})`);
          bg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

          // Floating luminous orbs
          for (let o = 0; o < 8; o++) {
            const ox = w * (0.08 + o * 0.12) + Math.sin(t * 0.0009 + o * 1.8) * 35;
            const oy = h * (0.2 + Math.cos(t * 0.0007 + o * 2.2) * 0.22);
            const or = 15 + o * 8 + Math.sin(t * 0.002 + o) * 6;
            const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, or);
            og.addColorStop(0, `rgba(255,220,100,${0.15 * s2})`);
            og.addColorStop(0.5, `rgba(255,180,60,${0.05 * s2})`);
            og.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = og;
            ctx.beginPath(); ctx.arc(ox, oy, or, 0, Math.PI * 2); ctx.fill();
          }
        }

        // Scene C: Cinematic film (cool blue/teal + letterbox)
        if (s3 > 0.005) {
          const fg = ctx.createLinearGradient(0, 0, w, h);
          fg.addColorStop(0, `rgba(0,25,60,${0.1 * s3})`);
          fg.addColorStop(0.5, `rgba(0,50,90,${0.05 * s3})`);
          fg.addColorStop(1, `rgba(10,0,40,${0.07 * s3})`);
          ctx.fillStyle = fg; ctx.fillRect(0, 0, w, h);

          // Letterbox bars
          const barH = h * 0.06 * s3;
          ctx.fillStyle = `rgba(0,0,0,${0.75 * s3})`;
          ctx.fillRect(0, 0, w, barH);
          ctx.fillRect(0, h - barH, w, barH);

          // Volumetric light shaft
          ctx.save();
          ctx.globalAlpha = s3 * 0.05;
          ctx.translate(w * 0.75, 0); ctx.rotate(0.25);
          const sh = ctx.createLinearGradient(0, 0, 0, h * 1.4);
          sh.addColorStop(0, "rgba(80,160,255,0)");
          sh.addColorStop(0.35, "rgba(80,160,255,1)");
          sh.addColorStop(1, "rgba(80,160,255,0)");
          ctx.fillStyle = sh; ctx.fillRect(-35, 0, 70, h * 1.4);
          ctx.restore();

          // Anamorphic lens flare
          const flareX = w * (0.3 + Math.sin(t * 0.0003) * 0.15);
          const flareG = ctx.createRadialGradient(flareX, h * 0.45, 0, flareX, h * 0.45, w * 0.15);
          flareG.addColorStop(0, `rgba(100,180,255,${0.06 * s3})`);
          flareG.addColorStop(0.3, `rgba(60,120,200,${0.02 * s3})`);
          flareG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = flareG; ctx.fillRect(0, 0, w, h);
          // Horizontal streak
          ctx.fillStyle = `rgba(100,180,255,${0.015 * s3})`;
          ctx.fillRect(0, h * 0.43, w, h * 0.04);
        }

        // Cross-fade light flash at transition points
        const m1p = smoothstep(0.3, 0.35, fp) * (1 - smoothstep(0.35, 0.4, fp));
        const m2p = smoothstep(0.63, 0.68, fp) * (1 - smoothstep(0.68, 0.73, fp));
        const morphFlash = Math.max(m1p, m2p);
        if (morphFlash > 0.01) {
          const mG = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.5);
          mG.addColorStop(0, `rgba(200,160,255,${0.1 * morphFlash})`);
          mG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = mG; ctx.fillRect(0, 0, w, h);
        }
      }

      /* ── GENRE: 4500–5800ms (text in-scene) ─────────────────────────── */
      if (t >= T_FLOW_END && t < T_GENRE_END + 300) {
        const gBase = t - T_FLOW_END;
        // Keep film scene fading in background
        const filmBg = ctx.createLinearGradient(0, 0, w, h);
        filmBg.addColorStop(0, `rgba(0,20,50,${0.04})`);
        filmBg.addColorStop(1, `rgba(10,0,35,${0.03})`);
        ctx.fillStyle = filmBg; ctx.fillRect(0, 0, w, h);

        genres.forEach(({ text, x, y, hue, delay }) => {
          const gt = gBase - delay;
          if (gt < 0) return;
          const fadeIn = smoothstep(0, 300, gt);
          const fadeOut = 1 - smoothstep(T_GENRE_END - T_FLOW_END - delay - 200, T_GENRE_END - T_FLOW_END - delay, gt);
          const alpha = fadeIn * fadeOut;
          if (alpha < 0.01) return;

          const px = w * x;
          const py = h * y + (1 - easeOut(clamp(gt / 400, 0, 1))) * 20; // slide up

          // Glow behind text
          const tg = ctx.createRadialGradient(px, py, 0, px, py, w * 0.08);
          tg.addColorStop(0, `hsla(${hue},80%,60%,${0.08 * alpha})`);
          tg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = tg; ctx.fillRect(px - w * 0.1, py - h * 0.08, w * 0.2, h * 0.16);

          // Text
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.font = `800 ${Math.round(w * 0.018)}px sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.letterSpacing = "0.25em";
          ctx.fillStyle = `hsla(${hue},70%,75%,1)`;
          ctx.shadowColor = `hsla(${hue},80%,50%,0.6)`;
          ctx.shadowBlur = 25;
          ctx.fillText(text, px, py);
          ctx.shadowBlur = 0;
          ctx.restore();
        });
      }

      /* ── IMPACT: 5800–7000ms ────────────────────────────────────────── */
      if (t >= T_GENRE_END && t < T_IMPACT_END + 500) {
        const ip = clamp((t - T_GENRE_END) / (T_IMPACT_END - T_GENRE_END), 0, 1);

        // Impact flash
        if (!impactFired && t >= T_GENRE_END) {
          impactFired = true;
          setImpactFlash(1);
          const fStart = performance.now();
          const decay = () => {
            const dt = (performance.now() - fStart) / 500;
            if (dt < 1) { setImpactFlash(1 - dt); requestAnimationFrame(decay); }
            else setImpactFlash(0);
          };
          requestAnimationFrame(decay);
        }

        // Logo glow sweep
        const sweepX = lerp(-0.2, 1.2, easeOut(clamp(ip * 1.8, 0, 1)));
        const sg = ctx.createLinearGradient(w * (sweepX - 0.12), 0, w * (sweepX + 0.12), 0);
        sg.addColorStop(0, "rgba(0,0,0,0)");
        sg.addColorStop(0.5, `rgba(200,160,255,${0.1 * (1 - ip * 0.6)})`);
        sg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = sg; ctx.fillRect(0, h * 0.3, w, h * 0.4);

        // Central radial glow
        const lg = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, w * 0.3);
        lg.addColorStop(0, `rgba(150,100,255,${0.07 * easeOut(ip)})`);
        lg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);

        setLogoAlpha(easeOut(clamp(ip * 2.2, 0, 1)));
      }

      /* ── HOLD: 7000ms+ ──────────────────────────────────────────────── */
      if (t >= T_IMPACT_END) {
        setLogoAlpha(1);
        // Subtle ambient glow
        const ag = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, w * 0.25);
        ag.addColorStop(0, "rgba(140,90,240,0.04)");
        ag.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = ag; ctx.fillRect(0, 0, w, h);
      }

      /* ── Particles (all phases) ─────────────────────────────────────── */
      const palette = t < T_OPEN_END ? 0 : t < T_FLOW_END ? (
        (t - T_OPEN_END) / (T_FLOW_END - T_OPEN_END) < 0.35 ? 1 : (t - T_OPEN_END) / (T_FLOW_END - T_OPEN_END) < 0.68 ? 2 : 3
      ) : 4;
      const rate = t < T_OPEN_END ? 2 : t < T_FLOW_END ? 3 : t < T_IMPACT_END ? 1 : 0;
      for (let i = 0; i < rate; i++) {
        if (particles.current.length < 450) {
          particles.current.push(spawnParticle(w, h, Math.floor(Math.random() * 3), palette));
        }
      }
      // Burst at impact
      if (t >= T_GENRE_END && t < T_GENRE_END + 200 && particles.current.length < 500) {
        for (let i = 0; i < 10; i++) particles.current.push(spawnParticle(w, h, Math.floor(Math.random() * 3), 4));
      }

      particles.current = particles.current.filter(p => p.life < p.maxLife);
      for (const p of particles.current) {
        p.life++;
        const pf = 0.25 + p.layer * 0.35;
        p.x += p.vx * pf;
        p.y += p.vy * pf;
        p.vy -= 0.006;
        const lt = p.life / p.maxLife;
        const a = p.alpha * smoothstep(0, 0.12, lt) * (1 - smoothstep(0.7, 1, lt));
        if (a < 0.008) continue;
        const pr = p.r * (1 + p.layer * 0.25);
        const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pr * 2.2);
        pg.addColorStop(0, `hsla(${p.hue},${p.sat}%,${p.lum}%,${a})`);
        pg.addColorStop(0.35, `hsla(${p.hue},${p.sat}%,${p.lum}%,${a * 0.35})`);
        pg.addColorStop(1, `hsla(${p.hue},${p.sat}%,${p.lum}%,0)`);
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(p.x, p.y, pr * 2.2, 0, Math.PI * 2); ctx.fill();
      }

      /* ── Film grain ─────────────────────────────────────────────────── */
      ctx.fillStyle = "rgba(255,255,255,0.014)";
      const gc = Math.floor(w * h / 6000);
      for (let i = 0; i < gc; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);

      /* ── Vignette ───────────────────────────────────────────────────── */
      const vg = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.22, w * 0.5, h * 0.5, w * 0.72);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);

      ctx.restore(); // camera

      /* ── Phase transitions ──────────────────────────────────────────── */
      if (t >= T_IMPACT_END && !ctaVisible) {
        setTimeout(() => setCTAVisible(true), 600);
      }

      if (t < T_HOLD_END + 3000) rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", onResize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const handleCTA = useCallback(() => { startAudio(); mp.heroCTAClicked(); finish(); }, [startAudio, finish]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black overflow-hidden cursor-pointer"
      onClick={() => startAudio()}
      role="presentation"
      aria-label="WizVid cinematic intro"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />

      {/* Impact flash */}
      {impactFlash > 0 && (
        <div className="absolute inset-0 pointer-events-none z-10" style={{
          background: `radial-gradient(circle at 50% 45%, rgba(200,160,255,${impactFlash * 0.45}), rgba(255,255,255,${impactFlash * 0.15}) 25%, transparent 65%)`,
        }} />
      )}

      {/* Logo (Impact + Hold) */}
      {logoAlpha > 0 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20"
          style={{
            opacity: logoAlpha,
            transform: `translate(${shakeCSS.x}px, ${shakeCSS.y}px) scale(${1 + (1 - logoAlpha) * 0.1})`,
          }}
        >
          <h1
            className="font-black tracking-[0.35em] uppercase select-none"
            style={{
              fontSize: "clamp(3.5rem, 12vw, 10rem)",
              background: "linear-gradient(135deg, #e2d9f3 0%, #c084fc 35%, #f0abfc 65%, #e2d9f3 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: `drop-shadow(0 0 ${45 * logoAlpha}px rgba(192,132,252,0.85)) drop-shadow(0 0 ${90 * logoAlpha}px rgba(192,132,252,0.35))`,
            }}
          >
            WIZVID
          </h1>
          <p className="mt-2 font-semibold tracking-[0.3em] uppercase select-none" style={{
            fontSize: "clamp(0.6rem, 1.6vw, 0.95rem)",
            color: `rgba(200,160,255,${0.8 * logoAlpha})`,
          }}>
            Cinematic AI Video Creation
          </p>
          <p className="mt-1 font-medium tracking-[0.2em] uppercase select-none" style={{
            fontSize: "clamp(0.45rem, 1.1vw, 0.65rem)",
            color: `rgba(180,140,240,${0.45 * logoAlpha})`,
          }}>
            Powered by WizSound™
          </p>
        </div>
      )}

      {/* CTA */}
      {ctaVisible && (
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-[14vh] z-30"
          style={{ animation: "introFadeUp 0.7s ease forwards" }}>
          <button
            onClick={handleCTA}
            aria-label="Start Creating with WizVid"
            className="group relative inline-flex items-center gap-3 px-12 py-5 rounded-2xl font-bold text-black overflow-hidden"
            style={{
              fontSize: "clamp(1rem, 2.2vw, 1.25rem)",
              background: "linear-gradient(135deg, #e2d9f3, #c084fc, #f0abfc)",
              boxShadow: "0 0 50px rgba(192,132,252,0.45), 0 0 100px rgba(192,132,252,0.18)",
              letterSpacing: "0.08em",
            }}
          >
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)", animation: "introShimmer 2s infinite" }} />
            <span className="relative z-10">Start Creating</span>
            <span className="relative z-10 text-xl transition-transform group-hover:translate-x-1">→</span>
          </button>
          <p className="mt-4 text-white/20 text-sm font-medium tracking-widest uppercase">No credit card required</p>
        </div>
      )}

      {/* Skip */}
      <button
        onClick={finish}
        aria-label="Skip intro"
        className="absolute top-5 right-5 z-50 px-4 py-2 rounded-full text-white/20 hover:text-white/50 text-xs font-medium border border-white/6 hover:border-white/15 bg-black/15 backdrop-blur-sm transition-all duration-300"
      >
        Skip →
      </button>

      <style>{`
        @keyframes introFadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes introShimmer { 0% { transform:translateX(-150%); } 100% { transform:translateX(250%); } }
      `}</style>
    </div>
  );
}
