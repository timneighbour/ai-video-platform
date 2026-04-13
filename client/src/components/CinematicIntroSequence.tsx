/**
 * CinematicIntroSequence
 *
 * A full-screen, gated cinematic intro (7–9 seconds) rendered entirely on Canvas.
 * Acts:
 *   ACT 1 (0–1.5s)  — Black → subtle glow build → particles forming
 *   ACT 2 (1.5–5s)  — Cinematic scene flow: concert → animation → film
 *   ACT 3 (5–6.5s)  — Genre text reveals inside the scene
 *   ACT 4 (6.5–8s)  — WizVid logo reveal with glow sweep + camera push-in
 *   ACT 5 (8–9s)    — Hold on WIZVID / "Powered by WizSound™" + "Start Creating →"
 *
 * Audio: Web Audio API spatial engine (bass rumble → rising tension → impact hit → reverb tail)
 * No autoplay audio — starts only after first user interaction.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { mp } from "@/lib/mixpanel";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  hue: number;
  life: number;
  maxLife: number;
  layer: number; // 0=far, 1=mid, 2=near
}

interface LightRay {
  x: number;
  angle: number;
  width: number;
  alpha: number;
  speed: number;
  hue: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_DURATION = 8800; // ms
const ACT_TIMES = {
  act1End: 1500,
  act2End: 5000,
  act3End: 6500,
  act4End: 8000,
  act5End: 8800,
};

const GENRE_LABELS = ["Music Videos", "Cinematic Films", "Animation"];

// ── Easing helpers ────────────────────────────────────────────────────────────

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}
function easeInExpo(t: number) {
  return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ── Audio engine ──────────────────────────────────────────────────────────────

function buildAudioEngine(ctx: AudioContext) {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // Bass rumble: low-frequency oscillator
  const bassOsc = ctx.createOscillator();
  bassOsc.type = "sine";
  bassOsc.frequency.value = 40;
  const bassGain = ctx.createGain();
  bassGain.gain.value = 0;
  const bassFilter = ctx.createBiquadFilter();
  bassFilter.type = "lowpass";
  bassFilter.frequency.value = 120;
  bassOsc.connect(bassFilter);
  bassFilter.connect(bassGain);
  bassGain.connect(master);
  bassOsc.start();

  // Rising tension: detuned sawtooth + filter sweep
  const tensionOsc = ctx.createOscillator();
  tensionOsc.type = "sawtooth";
  tensionOsc.frequency.value = 80;
  const tensionGain = ctx.createGain();
  tensionGain.gain.value = 0;
  const tensionFilter = ctx.createBiquadFilter();
  tensionFilter.type = "bandpass";
  tensionFilter.frequency.value = 200;
  tensionFilter.Q.value = 2;
  tensionOsc.connect(tensionFilter);
  tensionFilter.connect(tensionGain);
  tensionGain.connect(master);
  tensionOsc.start();

  // Impact hit: short noise burst
  function triggerImpact(when: number) {
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const impactGain = ctx.createGain();
    impactGain.gain.setValueAtTime(0.6, when);
    impactGain.gain.exponentialRampToValueAtTime(0.001, when + 0.15);
    const impactFilter = ctx.createBiquadFilter();
    impactFilter.type = "lowpass";
    impactFilter.frequency.value = 300;
    source.connect(impactFilter);
    impactFilter.connect(impactGain);
    impactGain.connect(master);
    source.start(when);
  }

  // Reverb tail: convolver with synthetic IR
  const convolver = ctx.createConvolver();
  const irLength = ctx.sampleRate * 2.5;
  const ir = ctx.createBuffer(2, irLength, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < irLength; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLength, 2.5);
  }
  convolver.buffer = ir;
  const reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.25;
  master.connect(convolver);
  convolver.connect(reverbGain);
  reverbGain.connect(ctx.destination);

  // Schedule the full audio sequence
  const now = ctx.currentTime;

  // Fade in master
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.7, now + 0.3);

  // Bass rumble: 0–5s
  bassGain.gain.setValueAtTime(0, now);
  bassGain.gain.linearRampToValueAtTime(0.4, now + 0.5);
  bassGain.gain.linearRampToValueAtTime(0.5, now + 2.5);
  bassGain.gain.linearRampToValueAtTime(0.1, now + 5.0);
  bassGain.gain.linearRampToValueAtTime(0, now + 6.0);

  // Rising tension: 1.5–6.5s with frequency sweep
  tensionGain.gain.setValueAtTime(0, now + 1.5);
  tensionGain.gain.linearRampToValueAtTime(0.15, now + 3.0);
  tensionGain.gain.linearRampToValueAtTime(0.3, now + 6.0);
  tensionGain.gain.linearRampToValueAtTime(0, now + 6.8);
  tensionFilter.frequency.setValueAtTime(200, now + 1.5);
  tensionFilter.frequency.exponentialRampToValueAtTime(2000, now + 6.5);

  // Impact hit at logo reveal (6.5s)
  triggerImpact(now + 6.5);

  // Fade out master after reverb tail
  master.gain.setValueAtTime(0.7, now + 8.0);
  master.gain.linearRampToValueAtTime(0, now + 9.5);

  return { master };
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onComplete: () => void;
}

export default function CinematicIntroSequence({ onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const raysRef = useRef<LightRay[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioStartedRef = useRef(false);
  const [showCTA, setShowCTA] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [genreIndex, setGenreIndex] = useState(-1);
  const [logoAlpha, setLogoAlpha] = useState(0);
  const [glowSweep, setGlowSweep] = useState(0); // 0–1 sweep progress
  const completedRef = useRef(false);

  // ── Particle factory ──────────────────────────────────────────────────────

  const spawnParticle = useCallback((w: number, h: number, t: number, layer: number): Particle => {
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.3 + Math.random() * 1.2) * (layer + 1) * 0.5;
    const hue = layer === 0 ? 260 + Math.random() * 40 : layer === 1 ? 290 + Math.random() * 50 : 310 + Math.random() * 60;
    return {
      x: w * 0.5 + (Math.random() - 0.5) * w * 0.6,
      y: h * 0.5 + (Math.random() - 0.5) * h * 0.6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.4,
      radius: (0.8 + Math.random() * 2.5) * (layer + 1) * 0.6,
      alpha: 0.6 + Math.random() * 0.4,
      hue,
      life: 0,
      maxLife: 60 + Math.random() * 120,
      layer,
    };
  }, []);

  const spawnRay = useCallback((w: number): LightRay => ({
    x: Math.random() * w,
    angle: -0.3 + Math.random() * 0.6,
    width: 20 + Math.random() * 60,
    alpha: 0.02 + Math.random() * 0.05,
    speed: 0.3 + Math.random() * 0.8,
    hue: 260 + Math.random() * 80,
  }), []);

  // ── Audio start on first interaction ─────────────────────────────────────

  const startAudio = useCallback(() => {
    if (audioStartedRef.current) return;
    audioStartedRef.current = true;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      buildAudioEngine(ctx);
    } catch {
      // Audio not available — silently skip
    }
  }, []);

  // ── Canvas render loop ────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", onResize);

    // Seed initial particles
    for (let i = 0; i < 120; i++) {
      particlesRef.current.push(spawnParticle(w, h, 0, i % 3));
    }
    for (let i = 0; i < 8; i++) {
      raysRef.current.push(spawnRay(w));
    }

    startTimeRef.current = performance.now();

    function draw(now: number) {
      if (!ctx) return;
      const elapsed = now - startTimeRef.current;
      const t = clamp(elapsed / TOTAL_DURATION, 0, 1);

      // ── Act detection ──────────────────────────────────────────────────
      const inAct1 = elapsed < ACT_TIMES.act1End;
      const inAct2 = elapsed >= ACT_TIMES.act1End && elapsed < ACT_TIMES.act2End;
      const inAct3 = elapsed >= ACT_TIMES.act2End && elapsed < ACT_TIMES.act3End;
      const inAct4 = elapsed >= ACT_TIMES.act3End && elapsed < ACT_TIMES.act4End;
      const inAct5 = elapsed >= ACT_TIMES.act4End;

      // ── Background ────────────────────────────────────────────────────
      // Motion blur: semi-transparent clear
      const blurAlpha = inAct1 ? 0.12 : inAct2 ? 0.08 : 0.15;
      ctx.fillStyle = `rgba(0,0,0,${blurAlpha})`;
      ctx.fillRect(0, 0, w, h);

      // ── Scene-specific backgrounds ────────────────────────────────────

      if (inAct1) {
        // Black with subtle glow build
        const act1T = elapsed / ACT_TIMES.act1End;
        const glowR = easeInOutCubic(act1T);
        const grd = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
        grd.addColorStop(0, `rgba(88,28,220,${0.12 * glowR})`);
        grd.addColorStop(0.5, `rgba(120,20,180,${0.06 * glowR})`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
      }

      if (inAct2) {
        const act2T = (elapsed - ACT_TIMES.act1End) / (ACT_TIMES.act2End - ACT_TIMES.act1End);

        // Scene 1 (0–0.33): Concert — warm amber/red stage lights
        if (act2T < 0.33) {
          const st = act2T / 0.33;
          // Stage floor gradient
          const floor = ctx.createLinearGradient(0, h * 0.6, 0, h);
          floor.addColorStop(0, `rgba(255,120,0,${0.08 * st})`);
          floor.addColorStop(1, `rgba(180,40,0,${0.04 * st})`);
          ctx.fillStyle = floor;
          ctx.fillRect(0, h * 0.6, w, h * 0.4);
          // Stage spotlights
          for (let s = 0; s < 3; s++) {
            const sx = w * (0.2 + s * 0.3);
            const sg = ctx.createRadialGradient(sx, h * 0.1, 0, sx, h * 0.5, h * 0.6);
            sg.addColorStop(0, `rgba(255,200,80,${0.06 * st})`);
            sg.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = sg;
            ctx.fillRect(0, 0, w, h);
          }
          // Crowd silhouette
          ctx.fillStyle = `rgba(0,0,0,${0.3 * st})`;
          for (let c = 0; c < 40; c++) {
            const cx = (c / 40) * w;
            const ch = h * (0.72 + Math.sin(c * 1.7) * 0.04 + Math.cos(c * 0.9) * 0.03);
            ctx.beginPath();
            ctx.arc(cx, ch, 8 + Math.sin(c) * 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Scene 2 (0.33–0.66): Pixar animation — warm golden + teal
        if (act2T >= 0.33 && act2T < 0.66) {
          const st = (act2T - 0.33) / 0.33;
          const animGrd = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.7);
          animGrd.addColorStop(0, `rgba(255,180,60,${0.09 * st})`);
          animGrd.addColorStop(0.5, `rgba(0,180,160,${0.05 * st})`);
          animGrd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = animGrd;
          ctx.fillRect(0, 0, w, h);
          // Floating orbs (Pixar-style)
          for (let o = 0; o < 5; o++) {
            const ox = w * (0.1 + o * 0.2) + Math.sin(elapsed * 0.001 + o) * 30;
            const oy = h * (0.3 + Math.cos(elapsed * 0.0008 + o * 1.2) * 0.15);
            const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, 40 + o * 15);
            og.addColorStop(0, `rgba(255,220,100,${0.15 * st})`);
            og.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = og;
            ctx.fillRect(0, 0, w, h);
          }
        }

        // Scene 3 (0.66–1.0): Cinematic film — cool blue/teal
        if (act2T >= 0.66) {
          const st = (act2T - 0.66) / 0.34;
          const filmGrd = ctx.createLinearGradient(0, 0, w, h);
          filmGrd.addColorStop(0, `rgba(0,40,80,${0.12 * st})`);
          filmGrd.addColorStop(0.5, `rgba(0,80,120,${0.06 * st})`);
          filmGrd.addColorStop(1, `rgba(20,0,60,${0.08 * st})`);
          ctx.fillStyle = filmGrd;
          ctx.fillRect(0, 0, w, h);
          // Letterbox bars
          const barH = h * 0.08 * st;
          ctx.fillStyle = `rgba(0,0,0,${0.7 * st})`;
          ctx.fillRect(0, 0, w, barH);
          ctx.fillRect(0, h - barH, w, barH);
        }

        // Cross-scene motion: camera pan simulation via canvas transform
        const panX = Math.sin(elapsed * 0.0003) * w * 0.008;
        const panY = Math.cos(elapsed * 0.0002) * h * 0.005;
        ctx.save();
        ctx.translate(panX, panY);
        ctx.restore();
      }

      if (inAct3) {
        // Maintain film look from act 2
        const filmGrd = ctx.createLinearGradient(0, 0, w, h);
        filmGrd.addColorStop(0, "rgba(0,20,50,0.04)");
        filmGrd.addColorStop(1, "rgba(10,0,40,0.04)");
        ctx.fillStyle = filmGrd;
        ctx.fillRect(0, 0, w, h);
        // Letterbox
        const barH = h * 0.08;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, w, barH);
        ctx.fillRect(0, h - barH, w, barH);
      }

      if (inAct4 || inAct5) {
        // Deep black for logo reveal
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fillRect(0, 0, w, h);
      }

      // ── Light rays ────────────────────────────────────────────────────
      if (!inAct1) {
        const rayAlphaScale = inAct4 || inAct5 ? 0.3 : 1;
        raysRef.current.forEach((ray) => {
          ray.x += ray.speed;
          if (ray.x > w + 100) ray.x = -100;
          ctx.save();
          ctx.translate(ray.x, 0);
          ctx.rotate(ray.angle);
          const rg = ctx.createLinearGradient(0, 0, 0, h * 1.5);
          rg.addColorStop(0, `hsla(${ray.hue},80%,60%,0)`);
          rg.addColorStop(0.3, `hsla(${ray.hue},80%,60%,${ray.alpha * rayAlphaScale})`);
          rg.addColorStop(1, `hsla(${ray.hue},80%,60%,0)`);
          ctx.fillStyle = rg;
          ctx.fillRect(-ray.width / 2, 0, ray.width, h * 1.5);
          ctx.restore();
        });
      }

      // ── Particles ─────────────────────────────────────────────────────
      const spawnRate = inAct1 ? 3 : inAct2 ? 5 : inAct3 ? 2 : 1;
      for (let s = 0; s < spawnRate; s++) {
        if (particlesRef.current.length < 400) {
          particlesRef.current.push(spawnParticle(w, h, elapsed, Math.floor(Math.random() * 3)));
        }
      }

      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      particlesRef.current.forEach((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.01; // slight upward drift
        const lifeT = p.life / p.maxLife;
        const fadeAlpha = lifeT < 0.1 ? lifeT / 0.1 : lifeT > 0.7 ? 1 - (lifeT - 0.7) / 0.3 : 1;
        const depthScale = 0.4 + p.layer * 0.3;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
        grd.addColorStop(0, `hsla(${p.hue},90%,70%,${p.alpha * fadeAlpha * depthScale})`);
        grd.addColorStop(1, `hsla(${p.hue},90%,70%,0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── Film grain ────────────────────────────────────────────────────
      if (!inAct1) {
        const grainAlpha = 0.025;
        const grainSize = 1.5;
        const grainCount = Math.floor((w * h) / 3000);
        ctx.fillStyle = `rgba(255,255,255,${grainAlpha})`;
        for (let g = 0; g < grainCount; g++) {
          ctx.fillRect(
            Math.random() * w,
            Math.random() * h,
            grainSize,
            grainSize
          );
        }
      }

      // ── React state updates for overlay elements ──────────────────────

      // Genre reveals (act 3)
      if (inAct3) {
        const act3T = (elapsed - ACT_TIMES.act2End) / (ACT_TIMES.act3End - ACT_TIMES.act2End);
        const idx = Math.floor(act3T * GENRE_LABELS.length);
        setGenreIndex(Math.min(idx, GENRE_LABELS.length - 1));
      }

      // Logo alpha (act 4)
      if (inAct4) {
        const act4T = (elapsed - ACT_TIMES.act3End) / (ACT_TIMES.act4End - ACT_TIMES.act3End);
        setLogoAlpha(easeOutExpo(clamp(act4T * 2, 0, 1)));
        setGlowSweep(clamp(act4T, 0, 1));
      }

      // CTA (act 5)
      if (inAct5 && !showCTA) {
        setShowCTA(true);
        setTimeout(() => setCtaVisible(true), 200);
      }

      // Auto-complete after full duration
      if (elapsed >= TOTAL_DURATION + 2000 && !completedRef.current) {
        completedRef.current = true;
        handleComplete();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Complete handler ──────────────────────────────────────────────────────

  const handleComplete = useCallback(() => {
    if (completedRef.current && !skipped) return;
    completedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
    }
    onComplete();
  }, [onComplete, skipped]);

  const handleSkip = useCallback(() => {
    setSkipped(true);
    completedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
    }
    onComplete();
  }, [onComplete]);

  const handleCTAClick = useCallback(() => {
    startAudio();
    mp.heroCTAClicked();
    handleComplete();
  }, [startAudio, handleComplete]);

  const handleInteraction = useCallback(() => {
    startAudio();
  }, [startAudio]);

  // ── Genre label positions (in-scene, not flat overlay) ────────────────────

  const genrePositions = [
    { x: "20%", y: "65%", rotate: "-2deg" },
    { x: "50%", y: "72%", rotate: "0deg" },
    { x: "72%", y: "62%", rotate: "2deg" },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black overflow-hidden"
      onClick={handleInteraction}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleInteraction(); }}
      role="presentation"
      aria-label="WizVid cinematic intro"
    >
      {/* Canvas: full-screen cinematic render */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      />

      {/* Overlay: genre labels (act 3) */}
      {genreIndex >= 0 && genreIndex < GENRE_LABELS.length && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {GENRE_LABELS.slice(0, genreIndex + 1).map((label, i) => (
            <div
              key={label}
              className="absolute"
              style={{
                left: genrePositions[i].x,
                top: genrePositions[i].y,
                transform: `translateX(-50%) rotate(${genrePositions[i].rotate})`,
                opacity: i === genreIndex ? 1 : 0.55,
                transition: "opacity 0.4s ease",
              }}
            >
              <span
                className="font-black tracking-[0.15em] uppercase"
                style={{
                  fontSize: "clamp(1rem, 2.5vw, 1.6rem)",
                  color: i === 0 ? "rgba(255,180,80,0.9)" : i === 1 ? "rgba(80,220,180,0.9)" : "rgba(180,100,255,0.9)",
                  textShadow: `0 0 30px ${i === 0 ? "rgba(255,150,0,0.6)" : i === 1 ? "rgba(0,200,160,0.6)" : "rgba(160,80,255,0.6)"}`,
                  letterSpacing: "0.2em",
                  animation: "genreReveal 0.5s cubic-bezier(0.22,1,0.36,1) forwards",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Overlay: logo reveal (act 4+) */}
      {logoAlpha > 0 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          aria-hidden="true"
          style={{ opacity: logoAlpha }}
        >
          {/* Glow sweep effect */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(105deg, transparent ${(glowSweep * 120 - 20)}%, rgba(180,100,255,0.12) ${glowSweep * 120}%, rgba(255,255,255,0.06) ${glowSweep * 120 + 5}%, transparent ${glowSweep * 120 + 25}%)`,
              transition: "background 0.05s linear",
            }}
          />
          {/* Logo text */}
          <div className="relative flex flex-col items-center gap-3">
            <h1
              className="font-black tracking-[0.3em] uppercase"
              style={{
                fontSize: "clamp(3rem, 10vw, 8rem)",
                background: "linear-gradient(135deg, #e2d9f3 0%, #c084fc 40%, #f0abfc 70%, #e2d9f3 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: "none",
                filter: `drop-shadow(0 0 ${40 * logoAlpha}px rgba(192,132,252,0.8)) drop-shadow(0 0 ${80 * logoAlpha}px rgba(192,132,252,0.4))`,
                transform: `scale(${1 + (1 - logoAlpha) * 0.08})`,
                transition: "transform 0.1s ease",
              }}
            >
              WIZVID
            </h1>
            <p
              className="font-semibold tracking-[0.25em] uppercase"
              style={{
                fontSize: "clamp(0.6rem, 1.5vw, 0.9rem)",
                color: "rgba(200,160,255,0.7)",
                letterSpacing: "0.3em",
                opacity: logoAlpha,
              }}
            >
              Powered by WizSound™
            </p>
          </div>
        </div>
      )}

      {/* Overlay: CTA (act 5) */}
      {showCTA && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-8"
          style={{
            opacity: ctaVisible ? 1 : 0,
            transition: "opacity 0.8s ease",
          }}
        >
          {/* Logo (persistent) */}
          <div className="flex flex-col items-center gap-2">
            <h1
              className="font-black tracking-[0.3em] uppercase"
              style={{
                fontSize: "clamp(3rem, 10vw, 8rem)",
                background: "linear-gradient(135deg, #e2d9f3 0%, #c084fc 40%, #f0abfc 70%, #e2d9f3 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 40px rgba(192,132,252,0.8)) drop-shadow(0 0 80px rgba(192,132,252,0.4))",
              }}
            >
              WIZVID
            </h1>
            <p
              className="font-semibold tracking-[0.25em] uppercase"
              style={{
                fontSize: "clamp(0.6rem, 1.5vw, 0.9rem)",
                color: "rgba(200,160,255,0.7)",
                letterSpacing: "0.3em",
              }}
            >
              Powered by WizSound™
            </p>
          </div>

          {/* CTA button */}
          <button
            onClick={handleCTAClick}
            aria-label="Start Creating with WizVid"
            className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-black overflow-hidden"
            style={{
              fontSize: "clamp(1rem, 2vw, 1.2rem)",
              background: "linear-gradient(135deg, #e2d9f3, #c084fc, #f0abfc)",
              boxShadow: "0 0 60px rgba(192,132,252,0.5), 0 0 120px rgba(192,132,252,0.2)",
              letterSpacing: "0.05em",
            }}
          >
            {/* Shimmer */}
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)",
                animation: "shimmer 1.5s infinite",
              }}
            />
            <span className="relative z-10">Start Creating</span>
            <span className="relative z-10 text-xl">→</span>
          </button>

          <p
            className="text-white/30 text-sm font-medium tracking-wide"
            style={{ letterSpacing: "0.1em" }}
          >
            No credit card required
          </p>
        </div>
      )}

      {/* Skip button (always visible after 1s) */}
      <button
        onClick={handleSkip}
        aria-label="Skip intro"
        className="absolute top-6 right-6 z-50 px-4 py-2 rounded-full text-white/30 hover:text-white/70 text-sm font-medium border border-white/10 hover:border-white/25 bg-black/20 backdrop-blur-sm transition-all duration-300"
        style={{ letterSpacing: "0.05em" }}
      >
        Skip →
      </button>

      {/* CSS keyframes */}
      <style>{`
        @keyframes genreReveal {
          from { opacity: 0; transform: translateX(-50%) translateY(12px) rotate(var(--rotate, 0deg)); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)    rotate(var(--rotate, 0deg)); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
