/**
 * FloatingMiniPlayer — Premium cinematic floating audio island.
 *
 * Docks at the bottom-centre of the viewport as a frosted-glass "island"
 * whenever the user is on the Storyboard or Screening Room steps.
 *
 * Design language: dark frosted glass · gold/amber accents · live EQ bars ·
 * smooth slide-up entrance · collapse to pill · keyboard-accessible.
 *
 * Shares the same HTMLAudioElement ref as the inline WizAudioPlayer so there
 * is never any duplicate audio — it's a second controller for the same source.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Play, Pause, SkipBack, SkipForward, ChevronDown, ChevronUp,
  Music2, Volume2, VolumeX, Volume1,
} from "lucide-react";
import { cn } from "@/lib/utils";

const WIZSOUND_LOGO = "/manus-storage/wizsound-logo-new_c5cced65_d334a3bb.png";

function fmt(s: number) {
  if (!isFinite(s)) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** Compact live EQ bars — drawn from the audio element's frequency data */
function MiniEQ({ audioRef, isPlaying }: { audioRef: React.RefObject<HTMLAudioElement | null>; isPlaying: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const ctxRef = useRef<{ audioCtx: AudioContext; analyser: AnalyserNode } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const BARS = 18;
    let analyser: AnalyserNode | null = null;

    // Try to wire up the analyser — may fail if another AudioContext already owns this element
    try {
      if (!ctxRef.current) {
        const audioCtx = new AudioContext();
        const an = audioCtx.createAnalyser();
        an.fftSize = 64;
        an.smoothingTimeConstant = 0.75;
        if (audio) {
          const src = audioCtx.createMediaElementSource(audio);
          src.connect(an);
          an.connect(audioCtx.destination);
        }
        ctxRef.current = { audioCtx, analyser: an };
      }
      analyser = ctxRef.current.analyser;
    } catch {
      // Already owned by WizAudioPlayer — fall back to idle animation
    }

    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let idlePhase = 0;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const W = canvas.width;
      const H = canvas.height;
      ctx2d.clearRect(0, 0, W, H);

      const barW = (W / BARS) * 0.55;
      const gap = (W / BARS) * 0.45;

      for (let i = 0; i < BARS; i++) {
        let value: number;
        if (analyser && data && isPlaying) {
          analyser.getByteFrequencyData(data);
          const step = Math.floor(data.length / BARS);
          value = data[i * step] / 255;
        } else {
          value = 0.08 + 0.06 * Math.sin(idlePhase + i * 0.5);
        }

        const barH = Math.max(2, value * H);
        const x = i * (barW + gap);
        const y = (H - barH) / 2;

        const grad = ctx2d.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, isPlaying ? "rgba(251,191,36,0.95)" : "rgba(251,191,36,0.30)");
        grad.addColorStop(0.5, isPlaying ? "rgba(184,137,42,1)" : "rgba(184,137,42,0.35)");
        grad.addColorStop(1, isPlaying ? "rgba(251,191,36,0.95)" : "rgba(251,191,36,0.30)");
        ctx2d.fillStyle = grad;
        if (typeof ctx2d.roundRect === "function") {
          ctx2d.beginPath();
          ctx2d.roundRect(x, y, barW, barH, 1.5);
          ctx2d.fill();
        } else {
          ctx2d.fillRect(x, y, barW, barH);
        }
      }

      if (!isPlaying) idlePhase += 0.025;
    };

    draw();
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [audioRef, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={72}
      height={24}
      className="shrink-0"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

/** Gold-styled volume slider with icon that changes at 0 / low / high */
function VolumeControl({
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
}: {
  volume: number;
  muted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
}) {
  const effectiveVolume = muted ? 0 : volume;

  const VolumeIcon = muted || effectiveVolume === 0
    ? VolumeX
    : effectiveVolume < 0.5
    ? Volume1
    : Volume2;

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Volume icon — click to mute/unmute */}
      <button
        onClick={onToggleMute}
        className="w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:bg-white/10 shrink-0"
        aria-label={muted ? "Unmute" : "Mute"}
        title={muted ? "Unmute" : "Mute"}
      >
        <VolumeIcon
          className="w-3.5 h-3.5 transition-colors"
          style={{ color: muted ? "rgba(255,255,255,0.25)" : "rgba(184,137,42,0.75)" }}
        />
      </button>

      {/* Slider track */}
      <div className="relative w-20 h-5 flex items-center group">
        {/* Track background */}
        <div
          className="absolute inset-y-0 my-auto h-1 w-full rounded-full"
          style={{ background: "rgba(255,255,255,0.10)" }}
        />
        {/* Filled portion */}
        <div
          className="absolute inset-y-0 my-auto h-1 left-0 rounded-full transition-all"
          style={{
            width: `${effectiveVolume * 100}%`,
            background: muted
              ? "rgba(255,255,255,0.15)"
              : "linear-gradient(90deg, #8a6420, #b8892a, #f5c842)",
            boxShadow: muted ? "none" : "0 0 4px rgba(184,137,42,0.5)",
          }}
        />
        {/* Thumb — always visible */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all"
          style={{
            left: `calc(${effectiveVolume * 100}% - 6px)`,
            background: muted ? "rgba(255,255,255,0.3)" : "#f5c842",
            boxShadow: muted ? "none" : "0 0 6px rgba(245,200,66,0.7)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        />
        {/* Native range input (invisible, sits on top for interaction) */}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onVolumeChange(v);
          }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          aria-label="Volume"
          title={`Volume: ${Math.round(effectiveVolume * 100)}%`}
        />
      </div>

      {/* Percentage label */}
      <span
        className="text-[9px] tabular-nums w-6 text-right shrink-0"
        style={{ color: muted ? "rgba(255,255,255,0.2)" : "rgba(184,137,42,0.55)" }}
      >
        {muted ? "0%" : `${Math.round(volume * 100)}%`}
      </span>
    </div>
  );
}

interface FloatingMiniPlayerProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  title: string;
  imageUrl?: string;
  audioUrl: string;
  visible: boolean;
}

export default function FloatingMiniPlayer({
  audioRef,
  title,
  imageUrl,
  visible,
}: FloatingMiniPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Slide-in on mount
  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setMounted(true), 60);
      return () => clearTimeout(t);
    } else {
      setMounted(false);
    }
  }, [visible]);

  // Sync state from the shared audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => { if (!draggingRef.current) setCurrentTime(audio.currentTime); };
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVolumeChange = () => {
      setMuted(audio.muted);
      setVolume(audio.volume);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("volumechange", onVolumeChange);

    setPlaying(!audio.paused);
    setCurrentTime(audio.currentTime);
    setDuration(audio.duration || 0);
    setMuted(audio.muted);
    setVolume(audio.volume);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("volumechange", onVolumeChange);
    };
  }, [audioRef, visible]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, [audioRef]);

  const skip = useCallback((secs: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + secs));
  }, [audioRef]);

  const handleVolumeChange = useCallback((v: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = v;
    audio.muted = v === 0;
    setVolume(v);
    setMuted(v === 0);
  }, [audioRef]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  }, [audioRef]);

  const seekTo = useCallback((clientX: number) => {
    const audio = audioRef.current;
    const bar = seekBarRef.current;
    if (!audio || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = pct * (audio.duration || 0);
    setCurrentTime(pct * (audio.duration || 0));
  }, [audioRef]);

  const handleSeekDown = (e: React.MouseEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    seekTo(e.clientX);
    const onMove = (ev: MouseEvent) => seekTo(ev.clientX);
    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    seekTo(e.touches[0].clientX);
    const onMove = (ev: TouchEvent) => seekTo(ev.touches[0].clientX);
    const onEnd = () => {
      draggingRef.current = false;
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-50 transition-all duration-500 ease-out",
        mounted ? "translate-y-0 opacity-100 -translate-x-1/2" : "translate-y-24 opacity-0 -translate-x-1/2"
      )}
      style={{ width: collapsed ? "auto" : "min(600px, calc(100vw - 32px))" }}
    >
      {/* ── ISLAND SHELL ─────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden select-none"
        style={{
          background: "linear-gradient(135deg, rgba(12,10,8,0.96) 0%, rgba(20,16,10,0.98) 100%)",
          border: "1px solid rgba(184,137,42,0.35)",
          boxShadow:
            "0 0 0 1px rgba(184,137,42,0.08), " +
            "0 8px 32px rgba(0,0,0,0.7), " +
            "0 2px 8px rgba(0,0,0,0.5), " +
            "0 0 48px rgba(184,137,42,0.08), " +
            "inset 0 1px 0 rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
        }}
      >
        {/* Gold shimmer top edge */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(184,137,42,0.6) 30%, rgba(251,191,36,0.9) 50%, rgba(184,137,42,0.6) 70%, transparent 100%)",
          }}
        />

        {/* ── COLLAPSED PILL ──────────────────────────────────────────────── */}
        {collapsed ? (
          <div className="flex items-center gap-3 px-4 py-3">
            <div
              className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
              style={{ background: "rgba(184,137,42,0.15)", border: "1px solid rgba(184,137,42,0.3)" }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
              ) : (
                <Music2 className="w-3.5 h-3.5" style={{ color: "var(--color-gold)" }} />
              )}
            </div>

            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: "linear-gradient(135deg, #b8892a, #8a6420)", boxShadow: "0 2px 8px rgba(184,137,42,0.4)" }}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="w-3.5 h-3.5 text-black" /> : <Play className="w-3.5 h-3.5 text-black ml-0.5" />}
            </button>

            <span className="text-xs font-semibold text-white/80 truncate max-w-[120px]">{title}</span>
            <span className="text-[10px] tabular-nums" style={{ color: "rgba(184,137,42,0.7)" }}>{fmt(currentTime)}</span>

            <button
              onClick={() => setCollapsed(false)}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
              aria-label="Expand player"
            >
              <ChevronUp className="w-3.5 h-3.5 text-white/50" />
            </button>
          </div>
        ) : (
          /* ── EXPANDED ISLAND ──────────────────────────────────────────── */
          <div className="px-4 pt-3.5 pb-4">
            {/* Top row: art + info + EQ + collapse */}
            <div className="flex items-center gap-3 mb-3">
              {/* Album art */}
              <div
                className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(184,137,42,0.2), rgba(100,70,20,0.3))",
                  border: "1px solid rgba(184,137,42,0.35)",
                  boxShadow: "0 0 12px rgba(184,137,42,0.15)",
                }}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-4 h-4" style={{ color: "var(--color-gold)" }} />
                )}
              </div>

              {/* Title + WizSound badge */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate leading-tight">{title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <img src={WIZSOUND_LOGO} alt="WizSound" className="h-2.5 w-auto opacity-70" />
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(184,137,42,0.6)" }}>
                    Now Playing
                  </span>
                </div>
              </div>

              {/* Live EQ bars */}
              <MiniEQ audioRef={audioRef} isPlaying={playing} />

              {/* Collapse */}
              <button
                onClick={() => setCollapsed(true)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 shrink-0"
                aria-label="Collapse player"
              >
                <ChevronDown className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>

            {/* Seek bar */}
            <div className="mb-2.5">
              <div
                ref={seekBarRef}
                className="relative h-1.5 rounded-full cursor-pointer group"
                style={{ background: "rgba(255,255,255,0.08)" }}
                onMouseDown={handleSeekDown}
                onTouchStart={handleTouchStart}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                aria-label="Seek"
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #8a6420, #b8892a, #f5c842)",
                    boxShadow: "0 0 6px rgba(184,137,42,0.5)",
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    left: `calc(${progress}% - 6px)`,
                    background: "#f5c842",
                    boxShadow: "0 0 8px rgba(245,200,66,0.8)",
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] tabular-nums" style={{ color: "rgba(184,137,42,0.6)" }}>{fmt(currentTime)}</span>
                <span className="text-[10px] tabular-nums text-white/25">{fmt(duration)}</span>
              </div>
            </div>

            {/* Controls row — skip / play / skip + volume */}
            <div className="flex items-center gap-3">
              {/* Skip back */}
              <button
                onClick={() => skip(-10)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/8 active:scale-90 group"
                aria-label="Skip back 10s"
                title="−10s"
              >
                <SkipBack className="w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-colors" />
              </button>

              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: "linear-gradient(135deg, #b8892a 0%, #7a5c1e 100%)",
                  boxShadow: playing
                    ? "0 0 20px rgba(184,137,42,0.55), 0 4px 12px rgba(0,0,0,0.4)"
                    : "0 0 12px rgba(184,137,42,0.25), 0 4px 12px rgba(0,0,0,0.4)",
                  border: "1px solid rgba(245,200,66,0.3)",
                }}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-0.5" />}
              </button>

              {/* Skip forward */}
              <button
                onClick={() => skip(10)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/8 active:scale-90 group"
                aria-label="Skip forward 10s"
                title="+10s"
              >
                <SkipForward className="w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-colors" />
              </button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Volume control */}
              <VolumeControl
                volume={volume}
                muted={muted}
                onVolumeChange={handleVolumeChange}
                onToggleMute={toggleMute}
              />
            </div>
          </div>
        )}

        {/* Gold shimmer bottom edge */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(184,137,42,0.2) 30%, rgba(184,137,42,0.4) 50%, rgba(184,137,42,0.2) 70%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}
