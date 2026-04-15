/**
 * GraphicEqualiser — Real-time frequency visualisation using Web Audio API.
 *
 * Connects to an <audio> element via a MediaElementSourceNode → AnalyserNode
 * and renders animated frequency bars on a <canvas>.
 *
 * Brand colours: violet → blue gradient bars on a transparent background.
 */

import { useRef, useEffect, useCallback } from "react";

interface GraphicEqualiserProps {
  /** The HTMLAudioElement to visualise */
  audioElement: HTMLAudioElement | null;
  /** Whether audio is currently playing (drives animation loop) */
  isPlaying: boolean;
  /** Number of frequency bars to render */
  barCount?: number;
  /** Height of the canvas in px */
  height?: number;
  /** Additional className for the wrapper */
  className?: string;
}

// We cache the AudioContext + source per audio element to avoid
// "already connected" errors when React re-renders.
const audioCtxMap = new WeakMap<
  HTMLAudioElement,
  { ctx: AudioContext; analyser: AnalyserNode; source: MediaElementAudioSourceNode }
>();

function getOrCreateAnalyser(audio: HTMLAudioElement) {
  const existing = audioCtxMap.get(audio);
  if (existing) return existing;

  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 128; // 64 frequency bins
  analyser.smoothingTimeConstant = 0.8;

  const source = ctx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(ctx.destination);

  const entry = { ctx, analyser, source };
  audioCtxMap.set(audio, entry);
  return entry;
}

export default function GraphicEqualiser({
  audioElement,
  isPlaying,
  barCount = 32,
  height = 48,
  className = "",
}: GraphicEqualiserProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  // Initialise analyser when audio element is available
  useEffect(() => {
    if (!audioElement) return;
    try {
      const { ctx, analyser } = getOrCreateAnalyser(audioElement);
      analyserRef.current = analyser;
      ctxRef.current = ctx;
    } catch (e) {
      // Silently fail if Web Audio API is unavailable
      console.warn("[GraphicEqualiser] Web Audio init failed:", e);
    }
  }, [audioElement]);

  // Resume AudioContext on play (browsers require user gesture)
  useEffect(() => {
    if (isPlaying && ctxRef.current?.state === "suspended") {
      ctxRef.current.resume();
    }
  }, [isPlaying]);

  // Animation loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Ensure canvas resolution matches CSS size
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx2d.scale(dpr, dpr);
    }

    ctx2d.clearRect(0, 0, w, h);

    // Sample `barCount` evenly-spaced bins
    const step = Math.max(1, Math.floor(bufferLength / barCount));
    const gap = 2;
    const barWidth = (w - gap * (barCount - 1)) / barCount;

    for (let i = 0; i < barCount; i++) {
      const binIndex = Math.min(i * step, bufferLength - 1);
      const value = dataArray[binIndex] / 255; // normalise 0..1
      const barHeight = Math.max(2, value * h * 0.95);

      const x = i * (barWidth + gap);
      const y = h - barHeight;

      // Gradient from violet (#8b5cf6) at bottom to blue (#3b82f6) at top
      const gradient = ctx2d.createLinearGradient(x, h, x, y);
      gradient.addColorStop(0, `rgba(139, 92, 246, ${0.6 + value * 0.4})`);
      gradient.addColorStop(0.5, `rgba(99, 102, 241, ${0.5 + value * 0.5})`);
      gradient.addColorStop(1, `rgba(59, 130, 246, ${0.4 + value * 0.6})`);

      ctx2d.fillStyle = gradient;
      ctx2d.beginPath();
      ctx2d.roundRect(x, y, barWidth, barHeight, [barWidth / 2, barWidth / 2, 0, 0]);
      ctx2d.fill();

      // Glow effect for active bars
      if (value > 0.5) {
        ctx2d.shadowColor = "rgba(139, 92, 246, 0.4)";
        ctx2d.shadowBlur = 6;
        ctx2d.fill();
        ctx2d.shadowBlur = 0;
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [barCount]);

  // Start / stop animation based on isPlaying
  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(rafRef.current);
      // Draw one last idle frame with minimal bars
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx2d = canvas.getContext("2d");
        if (ctx2d) {
          const dpr = window.devicePixelRatio || 1;
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx2d.scale(dpr, dpr);
          }
          ctx2d.clearRect(0, 0, w, h);
          const gap = 2;
          const barWidth = (w - gap * (barCount - 1)) / barCount;
          for (let i = 0; i < barCount; i++) {
            const x = i * (barWidth + gap);
            const idleHeight = 2 + Math.sin(i * 0.4) * 1.5;
            ctx2d.fillStyle = "rgba(139, 92, 246, 0.25)";
            ctx2d.beginPath();
            ctx2d.roundRect(x, h - idleHeight, barWidth, idleHeight, [barWidth / 2, barWidth / 2, 0, 0]);
            ctx2d.fill();
          }
        }
      }
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, draw, barCount]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full pointer-events-none ${className}`}
      style={{ height }}
    />
  );
}
