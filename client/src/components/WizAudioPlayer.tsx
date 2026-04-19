/**
 * WizAudioPlayer — Premium audio player with:
 * - Real-time graphic equaliser (Web Audio API, 40 bars)
 * - Waveform seek bar with buffered progress
 * - Play / Pause / Skip ±10s
 * - Volume slider with mute toggle
 * - Download button
 * - WizSound™ branding badge
 * - Responsive, dark-themed
 */

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, Download,
  SkipBack, SkipForward, Music2,
} from "@/lib/icons";
import GraphicEqualiser from "@/components/GraphicEqualiser";

const WIZSOUND_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/wizsound-logo-v5_76ab5163.png";

/**
 * Proxy external audio CDN URLs through our server to avoid CORS issues.
 * S3-hosted trimmed audio (cloudfront.net) is served directly.
 */
function resolveAudioUrl(url: string): string {
  if (!url) return url;
  // Already proxied or hosted on our CDN — serve directly
  if (url.includes("d2xsxph8kpxj0f.cloudfront.net") || url.startsWith("/")) return url;
  // External audio CDN URLs need proxying for browser playback
  if (url.includes("suno.ai") || url.includes("audiopipe") || url.includes("aiquickdraw.com")) {
    return `/api/audio/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

interface WizAudioPlayerProps {
  /** URL of the audio file to play */
  audioUrl: string;
  /** Track title */
  title: string;
  /** Optional artist / subtitle */
  subtitle?: string;
  /** Optional album art URL */
  imageUrl?: string;
  /** Number of EQ bars (default 40) */
  barCount?: number;
  /** Show WizSound™ badge (default true) */
  showBadge?: boolean;
  /** Optional className for outer wrapper */
  className?: string;
  /** Called when audio ends */
  onEnded?: () => void;
}

function fmt(s: number) {
  if (!isFinite(s)) return "--:--";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function WizAudioPlayer({
  audioUrl,
  title,
  subtitle,
  imageUrl,
  barCount = 40,
  showBadge = true,
  className = "",
  onEnded,
}: WizAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const seekRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [dragging, setDragging] = useState(false);

  // ── Sync audio events ──────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      if (!dragging) setCurrentTime(audio.currentTime);
      if (audio.buffered.length > 0) {
        setBuffered((audio.buffered.end(audio.buffered.length - 1) / audio.duration) * 100 || 0);
      }
    };
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => { setPlaying(false); onEnded?.(); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [dragging, onEnded]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play().catch(() => {});
  }, [playing]);

  const skip = useCallback((secs: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + secs));
  }, []);

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    const audio = audioRef.current;
    const bar = seekRef.current;
    if (!audio || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
    setCurrentTime(pct * audio.duration);
  }, []);

  const handleSeekMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true);
    seekTo(e);
    const onMove = (ev: MouseEvent) => seekTo(ev);
    const onUp = () => { setDragging(false); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) { audioRef.current.volume = v; audioRef.current.muted = v === 0; }
    setMuted(v === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !muted;
    audio.muted = next;
    setMuted(next);
    if (!next && volume === 0) { setVolume(0.7); audio.volume = 0.7; }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Keyboard shortcut (space to play/pause when focused) ──────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
    if (e.key === "ArrowLeft") skip(-10);
    if (e.key === "ArrowRight") skip(10);
    if (e.key === "m") toggleMute();
  };

  return (
    <div
      className={`relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1228] to-[#0f0f18] overflow-hidden focus-within:ring-1 focus-within:ring-violet-500/40 ${className}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`Audio player: ${title}`}
    >
      {/* Top: album art + info + badge */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {/* Album art */}
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-violet-900/60 to-blue-900/60 border border-white/10 flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <Music2 className="w-5 h-5 text-[--color-gold]" />
          )}
        </div>

        {/* Title + subtitle */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate leading-tight">{title}</p>
          {subtitle && <p className="text-white/40 text-xs truncate mt-0.5">{subtitle}</p>}
        </div>

        {/* WizSound™ badge */}
        {showBadge && (
          <div className="flex items-center gap-1.5 bg-[--color-gold]/15 border border-[--color-gold]/30 rounded-full px-2.5 py-1 flex-shrink-0">
            <img src={WIZSOUND_LOGO} alt="WizSound" className="h-3 w-auto" />
            <span className="text-[9px] font-bold text-[--color-gold] uppercase tracking-wider">WizSound™</span>
          </div>
        )}
      </div>

      {/* Graphic EQ */}
      <div className="px-4 pb-1">
        <GraphicEqualiser
          audioRef={audioRef}
          isPlaying={playing}
          barCount={barCount}
          height={44}
          className="w-full"
        />
      </div>

      {/* Waveform seek bar */}
      <div className="px-4 pb-2">
        <div
          ref={seekRef}
          className="relative h-2 rounded-full bg-white/8 cursor-pointer group"
          onMouseDown={handleSeekMouseDown}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="Seek"
        >
          {/* Buffered */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/12 transition-all"
            style={{ width: `${buffered}%` }}
          />
          {/* Played */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        {/* Time labels */}
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-white/35 tabular-nums">{fmt(currentTime)}</span>
          <span className="text-[10px] text-white/35 tabular-nums">{fmt(duration)}</span>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 px-4 pb-4">
        {/* Skip back */}
        <button
          onClick={() => skip(-10)}
          className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center transition-colors group"
          aria-label="Skip back 10s"
          title="−10s"
        >
          <SkipBack className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors" />
        </button>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 flex items-center justify-center transition-all shadow-lg shadow-violet-500/20 active:scale-95"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing
            ? <Pause className="w-4 h-4 text-white" />
            : <Play className="w-4 h-4 text-white ml-0.5" />
          }
        </button>

        {/* Skip forward */}
        <button
          onClick={() => skip(10)}
          className="w-8 h-8 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center transition-colors group"
          aria-label="Skip forward 10s"
          title="+10s"
        >
          <SkipForward className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors" />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Volume */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            className="w-7 h-7 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center transition-colors"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted || volume === 0
              ? <VolumeX className="w-3 h-3 text-white/50" />
              : <Volume2 className="w-3 h-3 text-white/50" />
            }
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 rounded-full accent-violet-500 cursor-pointer"
            aria-label="Volume"
          />
        </div>

        {/* Download */}
        <a
      href={resolveAudioUrl(audioUrl)}
      download
          className="w-7 h-7 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center transition-colors"
          aria-label="Download audio"
        >
          <Download className="w-3 h-3 text-white/50" />
        </a>
      </div>

      {/* Hidden audio element — crossOrigin="anonymous" is REQUIRED for Web Audio API
          createMediaElementSource() to work with cross-origin URLs (S3/CloudFront).
          Without it the browser taints the audio stream and blocks the analyser. */}
      <audio ref={audioRef} src={resolveAudioUrl(audioUrl)} preload="metadata" crossOrigin="anonymous" />
    </div>
  );
}
