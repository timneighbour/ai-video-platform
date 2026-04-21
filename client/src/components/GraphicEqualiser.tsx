/**
 * GraphicEqualiser — real-time frequency visualisation using Web Audio API.
 *
 * Two usage modes:
 *
 * 1. PREFERRED — pass a pre-wired AnalyserNode from the parent's DSP chain:
 *      <GraphicEqualiser analyser={analyserNode} isPlaying={isPlaying} />
 *    Use this when the parent already owns the AudioContext (WizSoundDemoPlayer,
 *    WizSoundShowcase). The analyser must already be connected to the audio graph.
 *
 * 2. LEGACY FALLBACK — pass an HTMLAudioElement ref:
 *      <GraphicEqualiser audioRef={audioRef} isPlaying={isPlaying} />
 *    Use this when the parent doesn't manage its own AudioContext (WizSoundSection,
 *    MusicCreator). The component creates its own AudioContext and AnalyserNode
 *    internally, connected to the audio element.
 *    NOTE: A MediaElementAudioSourceNode can only be created once per element.
 *    If the parent already created one, this will silently fall back to idle animation.
 */

import { useRef, useEffect, useCallback } from "react";

interface GraphicEqualiserProps {
  /** Pre-wired AnalyserNode from the parent's DSP chain (preferred) */
  analyser?: AnalyserNode | null;
  /** Legacy: HTMLAudioElement ref — component creates its own AudioContext internally */
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  /** Number of bars to build (default 32) */
  barCount?: number;
  /** Height of the canvas in px (default 56) */
  height?: number;
  /** Accent colour hex for gradient top stop */
  accentHex?: string;
  /** Optional className for the wrapper */
  className?: string;
}

export default function GraphicEqualiser({
  analyser: externalAnalyser,
  audioRef,
  isPlaying,
  barCount = 32,
  height = 56,
  accentHex = "#9b59b6",
  className = "",
}: GraphicEqualiserProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // Internal AudioContext + AnalyserNode for legacy audioRef mode
  const internalCtxRef = useRef<AudioContext | null>(null);
  const internalAnalyserRef = useRef<AnalyserNode | null>(null);
  const internalSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const connectedRef = useRef(false);

  // Connect legacy audioRef to internal analyser
  const connectLegacyAudio = useCallback(() => {
    if (!audioRef?.current || connectedRef.current) return;
    try {
      if (!internalCtxRef.current || internalCtxRef.current.state === "closed") {
        internalCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = internalCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      if (!internalAnalyserRef.current) {
        internalAnalyserRef.current = ctx.createAnalyser();
        internalAnalyserRef.current.fftSize = 256;
        internalAnalyserRef.current.smoothingTimeConstant = 0.8;
      }

      if (!internalSourceRef.current) {
        internalSourceRef.current = ctx.createMediaElementSource(audioRef.current);
        internalSourceRef.current.connect(internalAnalyserRef.current);
        internalAnalyserRef.current.connect(ctx.destination);
        connectedRef.current = true;
      }
    } catch {
      // Silently fail — audio still plays, just no visualisation
    }
  }, [audioRef]);

  // Connect legacy audio when playing starts
  useEffect(() => {
    if (isPlaying && audioRef && !externalAnalyser) {
      connectLegacyAudio();
      if (internalCtxRef.current?.state === "suspended") {
        internalCtxRef.current.resume();
      }
    }
  }, [isPlaying, audioRef, externalAnalyser, connectLegacyAudio]);

  // Cleanup internal AudioContext on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      try { internalCtxRef.current?.close(); } catch {}
    };
  }, []);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    // Parse accentHex to RGB
    const hex = accentHex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) || 155;
    const g = parseInt(hex.substring(2, 4), 16) || 89;
    const b = parseInt(hex.substring(4, 6), 16) || 182;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);

      // Use external analyser if provided, otherwise use internal one
      const activeAnalyser = externalAnalyser ?? internalAnalyserRef.current;

      const gap = 2;
      const barW = Math.max(1, (w - gap * (barCount - 1)) / barCount);

      if (activeAnalyser && isPlaying) {
        const bufLen = activeAnalyser.frequencyBinCount;
        const data = new Uint8Array(bufLen);
        activeAnalyser.getByteFrequencyData(data);

        for (let i = 0; i < barCount; i++) {
          // Log-scale frequency mapping for better visual spread
          const logIdx = Math.floor(Math.pow(i / barCount, 1.5) * bufLen);
          const binIdx = Math.min(logIdx, bufLen - 1);
          const val = data[binIdx] / 255;
          const barH = Math.max(2, val * h);

          const gradient = ctx2d.createLinearGradient(0, h, 0, h - barH);
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.5 + val * 0.5})`);
          gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${0.35 + val * 0.4})`);
          gradient.addColorStop(1, `rgba(255, 255, 255, ${0.15 + val * 0.35})`);

          ctx2d.fillStyle = gradient;
          const x = i * (barW + gap);
          ctx2d.beginPath();
          ctx2d.roundRect(x, h - barH, barW, barH, [2, 2, 0, 0]);
          ctx2d.fill();
        }
      } else {
        // Idle state: gentle breathing bars
        const t = Date.now() * 0.0008;
        for (let i = 0; i < barCount; i++) {
          const idleH = 2 + Math.sin(i * 0.35 + t) * 1.5 + Math.sin(i * 0.7 + t * 1.3) * 1;
          ctx2d.fillStyle = `rgba(${r}, ${g}, ${b}, 0.18)`;
          const x = i * (barW + gap);
          ctx2d.beginPath();
          ctx2d.roundRect(x, h - idleH, barW, idleH, [1, 1, 0, 0]);
          ctx2d.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalAnalyser, isPlaying, barCount, height, accentHex]);

  return (
    <canvas
      ref={canvasRef}
      width={512}
      height={height}
      className={`w-full ${className}`}
      style={{ height: `${height}px`, imageRendering: "auto" }}
    />
  );
}
