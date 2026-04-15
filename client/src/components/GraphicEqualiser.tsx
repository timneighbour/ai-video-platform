/**
 * GraphicEqualiser — real-time frequency visualisation using Web Audio API.
 * Renders animated vertical bars that respond to audio playback.
 * Pass an HTMLAudioElement ref and isPlaying flag.
 */

import { useRef, useEffect, useCallback } from "react";

interface GraphicEqualiserProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  /** Number of bars to render (default 32) */
  barCount?: number;
  /** Height of the canvas in px (default 48) */
  height?: number;
  /** Optional className for the wrapper */
  className?: string;
}

export default function GraphicEqualiser({
  audioRef,
  isPlaying,
  barCount = 32,
  height = 48,
  className = "",
}: GraphicEqualiserProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const connectedRef = useRef(false);

  // Connect audio element to Web Audio API analyser
  const connectAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || connectedRef.current) return;

    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = ctxRef.current;

      if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 128;
        analyserRef.current.smoothingTimeConstant = 0.78;
      }

      if (!sourceRef.current) {
        sourceRef.current = ctx.createMediaElementSource(audio);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      }

      connectedRef.current = true;
    } catch {
      // Silently fail — audio still plays, just no visualisation
    }
  }, [audioRef]);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);

      const analyser = analyserRef.current;
      if (analyser && isPlaying && connectedRef.current) {
        const bufLen = analyser.frequencyBinCount;
        const data = new Uint8Array(bufLen);
        analyser.getByteFrequencyData(data);

        const gap = 2;
        const barW = Math.max(1, (w - gap * (barCount - 1)) / barCount);

        for (let i = 0; i < barCount; i++) {
          const binIdx = Math.min(Math.floor((i / barCount) * bufLen), bufLen - 1);
          const val = data[binIdx] / 255;
          const barH = Math.max(2, val * h);

          const gradient = ctx2d.createLinearGradient(0, h, 0, h - barH);
          gradient.addColorStop(0, `rgba(139, 92, 246, ${0.6 + val * 0.4})`);
          gradient.addColorStop(0.5, `rgba(124, 58, 237, ${0.5 + val * 0.5})`);
          gradient.addColorStop(1, `rgba(59, 130, 246, ${0.4 + val * 0.6})`);

          ctx2d.fillStyle = gradient;
          const x = i * (barW + gap);
          ctx2d.beginPath();
          ctx2d.roundRect(x, h - barH, barW, barH, 1);
          ctx2d.fill();
        }
      } else {
        // Idle state: subtle pulsing bars
        const gap = 2;
        const barW = Math.max(1, (w - gap * (barCount - 1)) / barCount);
        for (let i = 0; i < barCount; i++) {
          const idleH = 2 + Math.sin(i * 0.4 + Date.now() * 0.001) * 2;
          ctx2d.fillStyle = "rgba(139, 92, 246, 0.2)";
          const x = i * (barW + gap);
          ctx2d.beginPath();
          ctx2d.roundRect(x, h - idleH, barW, idleH, 1);
          ctx2d.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, barCount, height]);

  // Connect when playing starts
  useEffect(() => {
    if (isPlaying) connectAudio();
  }, [isPlaying, connectAudio]);

  // Resume AudioContext if suspended (browser autoplay policy)
  useEffect(() => {
    if (isPlaying && ctxRef.current?.state === "suspended") {
      ctxRef.current.resume();
    }
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={height}
      className={`w-full ${className}`}
      style={{ height: `${height}px`, imageRendering: "auto" }}
    />
  );
}
