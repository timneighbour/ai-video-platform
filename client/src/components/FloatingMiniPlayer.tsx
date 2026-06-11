/**
 * FloatingMiniPlayer — Premium cinematic floating audio island.
 *
 * Features:
 * - Draggable: grab the header bar to reposition anywhere on screen
 * - Resizable: drag the bottom-right corner handle to resize width
 * - Position & size remembered in sessionStorage
 * - Defaults to bottom-right corner (not centre)
 * - Collapse to pill mode
 * - Live gold EQ bars, volume slider, seek bar, ±10s skip
 */

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Play, Pause, SkipBack, SkipForward, ChevronDown, ChevronUp,
  Music2, Volume2, VolumeX, Volume1, GripHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const WIZSOUND_LOGO = "/manus-storage/wizsound-logo-new_c5cced65_d334a3bb.png";
const STORAGE_KEY = "floatingMiniPlayer_pos";
const MIN_WIDTH = 280;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 480;

function fmt(s: number) {
  if (!isFinite(s)) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Compact live EQ bars */
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
    } catch { /* fallback to idle */ }
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let idlePhase = 0;
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const W = canvas.width, H = canvas.height;
      ctx2d.clearRect(0, 0, W, H);
      const barW = (W / BARS) * 0.55, gap = (W / BARS) * 0.45;
      for (let i = 0; i < BARS; i++) {
        let value: number;
        if (analyser && data && isPlaying) {
          analyser.getByteFrequencyData(data);
          value = data[i * Math.floor(data.length / BARS)] / 255;
        } else {
          value = 0.08 + 0.06 * Math.sin(idlePhase + i * 0.5);
        }
        const barH = Math.max(2, value * H);
        const x = i * (barW + gap), y = (H - barH) / 2;
        const grad = ctx2d.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, isPlaying ? "rgba(251,191,36,0.95)" : "rgba(251,191,36,0.30)");
        grad.addColorStop(0.5, isPlaying ? "rgba(184,137,42,1)" : "rgba(184,137,42,0.35)");
        grad.addColorStop(1, isPlaying ? "rgba(251,191,36,0.95)" : "rgba(251,191,36,0.30)");
        ctx2d.fillStyle = grad;
        if (typeof ctx2d.roundRect === "function") {
          ctx2d.beginPath(); ctx2d.roundRect(x, y, barW, barH, 1.5); ctx2d.fill();
        } else {
          ctx2d.fillRect(x, y, barW, barH);
        }
      }
      if (!isPlaying) idlePhase += 0.025;
    };
    draw();
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [audioRef, isPlaying]);

  return <canvas ref={canvasRef} width={72} height={24} className="shrink-0" style={{ imageRendering: "pixelated" }} />;
}

/** Gold volume slider */
function VolumeControl({ volume, muted, onVolumeChange, onToggleMute }: {
  volume: number; muted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
}) {
  const eff = muted ? 0 : volume;
  const Icon = muted || eff === 0 ? VolumeX : eff < 0.5 ? Volume1 : Volume2;
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button onClick={onToggleMute} className="w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:bg-white/10" aria-label={muted ? "Unmute" : "Mute"}>
        <Icon className="w-3.5 h-3.5" style={{ color: muted ? "rgba(255,255,255,0.25)" : "rgba(184,137,42,0.75)" }} />
      </button>
      <div className="relative w-20 h-5 flex items-center group">
        <div className="absolute inset-y-0 my-auto h-1 w-full rounded-full" style={{ background: "rgba(255,255,255,0.10)" }} />
        <div className="absolute inset-y-0 my-auto h-1 left-0 rounded-full" style={{ width: `${eff * 100}%`, background: muted ? "rgba(255,255,255,0.15)" : "linear-gradient(90deg,#8a6420,#b8892a,#f5c842)", boxShadow: muted ? "none" : "0 0 4px rgba(184,137,42,0.5)" }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full" style={{ left: `calc(${eff * 100}% - 6px)`, background: muted ? "rgba(255,255,255,0.3)" : "#f5c842", boxShadow: muted ? "none" : "0 0 6px rgba(245,200,66,0.7)", border: "1px solid rgba(255,255,255,0.2)" }} />
        <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={e => onVolumeChange(parseFloat(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label="Volume" />
      </div>
      <span className="text-[9px] tabular-nums w-6 text-right shrink-0" style={{ color: muted ? "rgba(255,255,255,0.2)" : "rgba(184,137,42,0.55)" }}>
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

interface SavedState {
  x: number;
  y: number;
  width: number;
  collapsed: boolean;
}

function loadSavedState(): SavedState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(s: SavedState) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export default function FloatingMiniPlayer({ audioRef, title, imageUrl, visible }: FloatingMiniPlayerProps) {
  // ── Audio state ──────────────────────────────────────────────────────────
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  // ── Position / size / collapse ───────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  // Refs for drag / resize
  const containerRef = useRef<HTMLDivElement>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const draggingSeekRef = useRef(false);
  const dragOffsetRef = useRef({ dx: 0, dy: 0 });
  const isDraggingPlayerRef = useRef(false);
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef({ mouseX: 0, startWidth: 0 });

  // ── Initialise position ──────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) { setMounted(false); return; }
    const saved = loadSavedState();
    if (saved) {
      setPos({ x: saved.x, y: saved.y });
      setWidth(saved.width);
      setCollapsed(saved.collapsed);
    } else {
      // Default: bottom-right corner with some padding
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPos({ x: vw - DEFAULT_WIDTH - 24, y: vh - 220 });
      setWidth(DEFAULT_WIDTH);
      setCollapsed(false);
    }
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, [visible]);

  // Persist state whenever pos/width/collapsed changes
  useEffect(() => {
    if (pos) saveState({ x: pos.x, y: pos.y, width, collapsed });
  }, [pos, width, collapsed]);

  // Keep position in bounds when window resizes
  useEffect(() => {
    const onResize = () => {
      setPos(prev => {
        if (!prev) return prev;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        return {
          x: clamp(prev.x, 0, vw - MIN_WIDTH),
          y: clamp(prev.y, 0, vh - 60),
        };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Audio event sync ─────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => { if (!draggingSeekRef.current) setCurrentTime(audio.currentTime); };
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVol = () => { setMuted(audio.muted); setVolume(audio.volume); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("volumechange", onVol);
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
      audio.removeEventListener("volumechange", onVol);
    };
  }, [audioRef, visible]);

  // ── Audio controls ───────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.paused ? a.play().catch(() => {}) : a.pause();
  }, [audioRef]);

  const skip = useCallback((s: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = clamp(a.currentTime + s, 0, a.duration || 0);
  }, [audioRef]);

  const handleVolumeChange = useCallback((v: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = v; a.muted = v === 0;
    setVolume(v); setMuted(v === 0);
  }, [audioRef]);

  const toggleMute = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = !a.muted; setMuted(a.muted);
  }, [audioRef]);

  // ── Seek ─────────────────────────────────────────────────────────────────
  const seekTo = useCallback((clientX: number) => {
    const a = audioRef.current;
    const bar = seekBarRef.current;
    if (!a || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = clamp((clientX - rect.left) / rect.width, 0, 1);
    a.currentTime = pct * (a.duration || 0);
    setCurrentTime(pct * (a.duration || 0));
  }, [audioRef]);

  const handleSeekDown = (e: React.MouseEvent<HTMLDivElement>) => {
    draggingSeekRef.current = true;
    seekTo(e.clientX);
    const onMove = (ev: MouseEvent) => seekTo(ev.clientX);
    const onUp = () => {
      draggingSeekRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleTouchSeek = (e: React.TouchEvent<HTMLDivElement>) => {
    draggingSeekRef.current = true;
    seekTo(e.touches[0].clientX);
    const onMove = (ev: TouchEvent) => seekTo(ev.touches[0].clientX);
    const onEnd = () => {
      draggingSeekRef.current = false;
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
  };

  // ── Drag to reposition ───────────────────────────────────────────────────
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't start drag if clicking a button inside the header
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    isDraggingPlayerRef.current = true;
    const rect = containerRef.current!.getBoundingClientRect();
    dragOffsetRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };

    const onMove = (ev: MouseEvent) => {
      if (!isDraggingPlayerRef.current) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const newX = clamp(ev.clientX - dragOffsetRef.current.dx, 0, vw - MIN_WIDTH);
      const newY = clamp(ev.clientY - dragOffsetRef.current.dy, 0, vh - 60);
      setPos({ x: newX, y: newY });
    };
    const onUp = () => {
      isDraggingPlayerRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Touch drag
  const handleTouchDragStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const touch = e.touches[0];
    const rect = containerRef.current!.getBoundingClientRect();
    dragOffsetRef.current = { dx: touch.clientX - rect.left, dy: touch.clientY - rect.top };

    const onMove = (ev: TouchEvent) => {
      const t = ev.touches[0];
      const vw = window.innerWidth, vh = window.innerHeight;
      setPos({
        x: clamp(t.clientX - dragOffsetRef.current.dx, 0, vw - MIN_WIDTH),
        y: clamp(t.clientY - dragOffsetRef.current.dy, 0, vh - 60),
      });
    };
    const onEnd = () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
  };

  // ── Resize handle ────────────────────────────────────────────────────────
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    resizeStartRef.current = { mouseX: e.clientX, startWidth: width };

    const onMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = ev.clientX - resizeStartRef.current.mouseX;
      setWidth(clamp(resizeStartRef.current.startWidth + delta, MIN_WIDTH, MAX_WIDTH));
    };
    const onUp = () => {
      isResizingRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!visible || !pos) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-50 transition-opacity duration-500",
        mounted ? "opacity-100" : "opacity-0"
      )}
      style={{
        left: pos.x,
        top: pos.y,
        width: collapsed ? "auto" : width,
        minWidth: collapsed ? 220 : MIN_WIDTH,
        maxWidth: MAX_WIDTH,
        userSelect: "none",
      }}
    >
      {/* ── ISLAND SHELL ─────────────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(12,10,8,0.97) 0%, rgba(20,16,10,0.99) 100%)",
          border: "1px solid rgba(184,137,42,0.35)",
          boxShadow:
            "0 0 0 1px rgba(184,137,42,0.08), " +
            "0 12px 40px rgba(0,0,0,0.75), " +
            "0 2px 8px rgba(0,0,0,0.5), " +
            "0 0 48px rgba(184,137,42,0.08), " +
            "inset 0 1px 0 rgba(255,255,255,0.06)",
          backdropFilter: "blur(28px) saturate(1.5)",
          WebkitBackdropFilter: "blur(28px) saturate(1.5)",
        }}
      >
        {/* Gold shimmer top edge */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent 0%,rgba(184,137,42,0.6) 30%,rgba(251,191,36,0.9) 50%,rgba(184,137,42,0.6) 70%,transparent 100%)" }} />

        {/* ── DRAG HANDLE BAR ─────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-3 py-1.5 cursor-grab active:cursor-grabbing"
          style={{ borderBottom: "1px solid rgba(184,137,42,0.10)", background: "rgba(0,0,0,0.25)" }}
          onMouseDown={handleDragStart}
          onTouchStart={handleTouchDragStart}
          title="Drag to move"
        >
          <div className="flex items-center gap-1.5">
            <GripHorizontal className="w-3 h-3 text-white/20" />
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(184,137,42,0.4)" }}>
              WizSound™
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Collapse / expand */}
            <button
              onClick={() => setCollapsed(c => !c)}
              className="w-5 h-5 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
              aria-label={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed
                ? <ChevronDown className="w-3 h-3 text-white/40" />
                : <ChevronUp className="w-3 h-3 text-white/40" />}
            </button>
          </div>
        </div>

        {/* ── COLLAPSED PILL BODY ─────────────────────────────────────── */}
        {collapsed ? (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "rgba(184,137,42,0.15)", border: "1px solid rgba(184,137,42,0.3)" }}>
              {imageUrl ? <img src={imageUrl} alt={title} className="w-full h-full object-cover" /> : <Music2 className="w-3 h-3" style={{ color: "var(--color-gold)" }} />}
            </div>
            <button onClick={togglePlay} className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0" style={{ background: "linear-gradient(135deg,#b8892a,#8a6420)", boxShadow: "0 2px 8px rgba(184,137,42,0.4)" }} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="w-3 h-3 text-black" /> : <Play className="w-3 h-3 text-black ml-0.5" />}
            </button>
            <span className="text-xs font-semibold text-white/80 truncate flex-1 min-w-0">{title}</span>
            <span className="text-[10px] tabular-nums shrink-0" style={{ color: "rgba(184,137,42,0.7)" }}>{fmt(currentTime)}</span>
          </div>
        ) : (
          /* ── EXPANDED BODY ──────────────────────────────────────────── */
          <div className="px-4 pt-3 pb-4">
            {/* Top row: art + info + EQ */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(184,137,42,0.2),rgba(100,70,20,0.3))", border: "1px solid rgba(184,137,42,0.35)", boxShadow: "0 0 12px rgba(184,137,42,0.15)" }}>
                {imageUrl ? <img src={imageUrl} alt={title} className="w-full h-full object-cover" /> : <Music2 className="w-4 h-4" style={{ color: "var(--color-gold)" }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate leading-tight">{title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <img src={WIZSOUND_LOGO} alt="WizSound" className="h-2.5 w-auto opacity-70" />
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(184,137,42,0.6)" }}>Now Playing</span>
                </div>
              </div>
              <MiniEQ audioRef={audioRef} isPlaying={playing} />
            </div>

            {/* Seek bar */}
            <div className="mb-2.5">
              <div ref={seekBarRef} className="relative h-1.5 rounded-full cursor-pointer group" style={{ background: "rgba(255,255,255,0.08)" }} onMouseDown={handleSeekDown} onTouchStart={handleTouchSeek} role="slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Seek">
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#8a6420,#b8892a,#f5c842)", boxShadow: "0 0 6px rgba(184,137,42,0.5)" }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `calc(${progress}% - 6px)`, background: "#f5c842", boxShadow: "0 0 8px rgba(245,200,66,0.8)" }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] tabular-nums" style={{ color: "rgba(184,137,42,0.6)" }}>{fmt(currentTime)}</span>
                <span className="text-[10px] tabular-nums text-white/25">{fmt(duration)}</span>
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-3">
              <button onClick={() => skip(-10)} className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/8 active:scale-90 group" aria-label="Skip back 10s" title="−10s">
                <SkipBack className="w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-colors" />
              </button>
              <button onClick={togglePlay} className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90" style={{ background: "linear-gradient(135deg,#b8892a 0%,#7a5c1e 100%)", boxShadow: playing ? "0 0 20px rgba(184,137,42,0.55),0 4px 12px rgba(0,0,0,0.4)" : "0 0 12px rgba(184,137,42,0.25),0 4px 12px rgba(0,0,0,0.4)", border: "1px solid rgba(245,200,66,0.3)" }} aria-label={playing ? "Pause" : "Play"}>
                {playing ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-0.5" />}
              </button>
              <button onClick={() => skip(10)} className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/8 active:scale-90 group" aria-label="Skip forward 10s" title="+10s">
                <SkipForward className="w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-colors" />
              </button>
              <div className="flex-1" />
              <VolumeControl volume={volume} muted={muted} onVolumeChange={handleVolumeChange} onToggleMute={toggleMute} />
            </div>
          </div>
        )}

        {/* Gold shimmer bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent 0%,rgba(184,137,42,0.2) 30%,rgba(184,137,42,0.4) 50%,rgba(184,137,42,0.2) 70%,transparent 100%)" }} />
      </div>

      {/* ── RESIZE HANDLE (bottom-right corner) ─────────────────────────── */}
      {!collapsed && (
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-ew-resize flex items-end justify-end pb-1 pr-1"
          onMouseDown={handleResizeStart}
          title="Drag to resize"
          style={{ zIndex: 10 }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M7 1L1 7M7 4L4 7" stroke="rgba(184,137,42,0.5)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
