/**
 * AnimatedEqualiser — Real-time Web Audio API frequency analyser visualised as bar chart.
 *
 * Usage:
 *   <AnimatedEqualiser audioRef={audioRef} barCount={24} color="#c9a84c" height={48} />
 *
 * When no audio is playing (or no audioRef provided) it falls back to a slow ambient pulse.
 */
import { useEffect, useRef } from "react";

interface Props {
  /** Ref to an <audio> or <video> element to analyse */
  audioRef?: React.RefObject<HTMLAudioElement | HTMLVideoElement | null>;
  barCount?: number;        // default 24
  color?: string;           // primary bar colour (CSS colour)
  peakColor?: string;       // peak dot colour — defaults to white
  height?: number;          // px height of the canvas
  className?: string;
  /** If true, always show ambient animation even without audio */
  alwaysAnimate?: boolean;
}

export default function AnimatedEqualiser({
  audioRef,
  barCount = 24,
  color = "#c9a84c",
  peakColor = "rgba(255,255,255,0.7)",
  height = 48,
  className = "",
  alwaysAnimate = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const levelsRef = useRef<number[]>(Array.from({ length: barCount }, () => 0));
  const peaksRef = useRef<number[]>(Array.from({ length: barCount }, () => 0));
  const peakHoldRef = useRef<number[]>(Array.from({ length: barCount }, () => 0));
  const phaseRef = useRef<number[]>(
    Array.from({ length: barCount }, (_, i) => (i / barCount) * Math.PI * 2)
  );

  // Connect Web Audio API to the media element
  useEffect(() => {
    const el = audioRef?.current;
    if (!el) return;

    const tryConnect = () => {
      try {
        if (!ctxRef.current) {
          ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ac = ctxRef.current;
        if (ac.state === "suspended") ac.resume();

        if (!analyserRef.current) {
          analyserRef.current = ac.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.8;
          dataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount) as Uint8Array<ArrayBuffer>;
          analyserRef.current.connect(ac.destination);
        }

        if (!sourceRef.current) {
          sourceRef.current = ac.createMediaElementSource(el);
          sourceRef.current.connect(analyserRef.current);
        }
      } catch {
        // Browser may block before user interaction — ambient fallback handles it
      }
    };

    el.addEventListener("play", tryConnect, { once: false });
    tryConnect();

    return () => {
      el.removeEventListener("play", tryConnect);
    };
  }, [audioRef]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const analyser = analyserRef.current;
      const data = dataRef.current;
      let hasRealData = false;

      if (analyser && data) {
        analyser.getByteFrequencyData(data);
        // Check if any real audio data
        hasRealData = data.some((v) => v > 0);
      }

      const barW = Math.floor(W / barCount) - 1;
      const now = Date.now() / 1000;

      for (let i = 0; i < barCount; i++) {
        let target: number;

        if (hasRealData && data) {
          // Map bar index to frequency bin (logarithmic-ish spread)
          const binIdx = Math.floor((i / barCount) * (data.length * 0.75));
          target = data[binIdx] / 255;
        } else if (alwaysAnimate) {
          // Ambient sine wave fallback
          const phase = phaseRef.current[i];
          const freq = 0.3 + (i / barCount) * 0.4;
          target = (Math.sin(now * freq * Math.PI * 2 + phase) * 0.5 + 0.5) * 0.35;
        } else {
          target = 0;
        }

        // Smooth
        levelsRef.current[i] += (target - levelsRef.current[i]) * 0.2;
        const l = levelsRef.current[i];

        // Peak tracking
        if (l > peaksRef.current[i]) {
          peaksRef.current[i] = l;
          peakHoldRef.current[i] = 60;
        } else {
          peakHoldRef.current[i]--;
          if (peakHoldRef.current[i] <= 0) {
            peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 0.008);
          }
        }

        const x = i * (barW + 1);
        const barH = Math.max(2, Math.floor(l * H));

        // Bar gradient
        const grad = ctx.createLinearGradient(0, H, 0, H - barH);
        grad.addColorStop(0, color);
        grad.addColorStop(0.6, color + "cc");
        grad.addColorStop(1, color + "44");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, H - barH, barW, barH, [2, 2, 0, 0]);
        ctx.fill();

        // Peak dot
        const peakY = H - Math.floor(peaksRef.current[i] * H) - 2;
        if (peakY > 0 && peakY < H) {
          ctx.fillStyle = peakColor;
          ctx.fillRect(x, peakY, barW, 2);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [barCount, color, peakColor, alwaysAnimate]);

  return (
    <canvas
      ref={canvasRef}
      width={barCount * 12}
      height={height}
      className={`w-full ${className}`}
      style={{ imageRendering: "auto" }}
    />
  );
}
