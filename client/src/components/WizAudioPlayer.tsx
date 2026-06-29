/**
 * WizAudioPlayer — Premium audio player with:
 * - Real-time graphic equaliser (Web Audio API, 40 bars)
 * - Waveform seek bar with buffered progress
 * - Play / Pause / Skip ±10s
 * - Volume slider with mute toggle
 * - Pay-on-download gate: 2 credits for subscribers, £3.99 Stripe for non-subscribers
 * - WizSound™ branding badge
 * - Responsive, dark-themed
 * - Mobile collapse/expand toggle (mobile-only slim bar when collapsed)
 */

import { useRef, useEffect, useState, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, Download, Lock,
  SkipBack, SkipForward, Music2, ChevronUp, ChevronDown, Loader2,
} from "@/lib/icons";
import GraphicEqualiser from "@/components/GraphicEqualiser";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";

const WIZSOUND_LOGO = "/manus-storage/wizsound-logo-new_c5cced65_d334a3bb.png";

interface WizAudioPlayerProps {
  /** Proxied stream URL — must start with /api/audio/stream/ */
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
  /**
   * DB task ID — when provided, enables the pay-on-download gate.
   * If omitted the download button is hidden (e.g. featured/demo tracks).
   */
  taskId?: number;
  /** Track index within the task (0 or 1). Required when taskId is set. */
  trackIndex?: number;
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
  taskId,
  trackIndex = 0,
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
  // Mobile collapse state — starts collapsed on mobile to save screen space
  const [mobileCollapsed, setMobileCollapsed] = useState(true);

  // ── Download gate state ────────────────────────────────────────────────────
  const hasGate = taskId !== undefined;

  const downloadSong = trpc.suno.downloadSong.useMutation({
    onSuccess: (data) => {
      if ("downloadUrl" in data && data.downloadUrl) {
        // Trigger the browser download via the signed download token URL
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (data.alreadyUnlocked) {
          toast.success("Downloading your track");
        } else {
          toast.success("Track unlocked — downloading now");
        }
      } else if ("requiresPayment" in data && data.requiresPayment) {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          // STRIPE_SONG_DOWNLOAD_PRICE_ID not yet configured
          toast.info("Song download coming soon — subscribe to a plan to download now.", {
            action: { label: "View plans", onClick: () => { window.location.href = "/pricing"; } },
          });
        }
      }
    },
    onError: (err) => {
      if (err.data?.code === "PAYMENT_REQUIRED") {
        toast.error("Not enough credits", {
          description: "You need 2 credits to download this track. Top up your credits to continue.",
          action: { label: "Top up", onClick: () => { window.location.href = "/pricing"; } },
        });
      } else if (err.data?.code === "UNAUTHORIZED") {
        toast.error("Sign in to download", {
          description: "Create a free account to download your tracks.",
        });
      } else {
        toast.error("Download failed", { description: err.message });
      }
    },
  });

  const handleDownload = useCallback(() => {
    if (!hasGate || taskId === undefined) return;
    downloadSong.mutate({ taskId, trackIndex });
  }, [hasGate, taskId, trackIndex, downloadSong]);

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

  // Touch-based seek for mobile
  const seekToTouch = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = seekRef.current;
    if (!audio || !bar) return;
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
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

  // ── Download button rendering ──────────────────────────────────────────────
  const renderDownloadButton = () => {
    if (!hasGate) return null;

    const isLoading = downloadSong.isPending;

    return (
      <button
        onClick={handleDownload}
        disabled={isLoading}
        title="Download track (2 credits for subscribers · £3.99 one-off)"
        className="w-9 h-9 md:w-7 md:h-7 rounded-full bg-white/6 hover:bg-white/12 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative group"
        aria-label="Download track"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 md:w-3 md:h-3 text-white/50 animate-spin" />
        ) : (
          <>
            <Download className="w-4 h-4 md:w-3 md:h-3 text-white/50 group-hover:text-white/80 transition-colors" />
            {/* Lock badge — indicates payment required */}
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[--color-gold] flex items-center justify-center">
              <Lock className="w-1.5 h-1.5 text-black" />
            </span>
          </>
        )}
      </button>
    );
  };

  return (
    <div
      className={`relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1228] to-[#0f0f18] overflow-hidden focus-within:ring-1 focus-within:ring-violet-500/40 ${className}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`Audio player: ${title}`}
    >
      {/* ── Mobile collapsed bar (visible only on mobile when collapsed) ── */}
      <div className={`md:hidden flex items-center gap-3 px-3 py-2 ${mobileCollapsed ? "flex" : "hidden"}`}>
        {/* Play/Pause mini */}
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing
            ? <Pause className="w-4 h-4 text-white" />
            : <Play className="w-4 h-4 text-white ml-0.5" />
          }
        </button>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-xs truncate leading-tight">{title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {playing && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse flex-shrink-0" />
            )}
            <span className="text-white/40 text-[10px] tabular-nums">{fmt(currentTime)} / {fmt(duration)}</span>
          </div>
        </div>

        {/* Expand chevron */}
        <button
          onClick={() => setMobileCollapsed(false)}
          className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0 active:bg-white/16 transition-colors"
          aria-label="Expand audio player"
          title="Expand player"
        >
          <ChevronUp className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* ── Full player (always visible on desktop; visible on mobile only when expanded) ── */}
      <div className={`md:block ${mobileCollapsed ? "hidden" : "block"}`}>
        {/* Top: album art + info + badge + mobile collapse button */}
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

          {/* WizSound™ badge — hidden on mobile to save space */}
          {showBadge && (
            <div className="hidden sm:flex items-center gap-1.5 bg-[--color-gold]/15 border border-[--color-gold]/30 rounded-full px-2.5 py-1 flex-shrink-0">
              <img src={WIZSOUND_LOGO} alt="WizSound" className="h-3 w-auto" />
              <span className="text-[9px] font-bold text-[--color-gold] uppercase tracking-wider">WizSound™</span>
            </div>
          )}

          {/* Mobile collapse button — only visible on mobile in expanded state */}
          <button
            onClick={() => setMobileCollapsed(true)}
            className="md:hidden w-8 h-8 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0 active:bg-white/16 transition-colors"
            aria-label="Collapse audio player"
            title="Collapse player"
          >
            <ChevronDown className="w-4 h-4 text-white/60" />
          </button>
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

        {/* Waveform seek bar — supports both mouse and touch */}
        <div className="px-4 pb-2">
          <div
            ref={seekRef}
            className="relative h-3 md:h-2 rounded-full bg-white/8 cursor-pointer group touch-none"
            onMouseDown={handleSeekMouseDown}
            onTouchStart={seekToTouch}
            onTouchMove={seekToTouch}
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
            {/* Thumb — larger on mobile for easier touch */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 md:w-3 md:h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 8px)` }}
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
            className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-white/6 hover:bg-white/12 active:bg-white/16 flex items-center justify-center transition-colors group"
            aria-label="Skip back 10s"
            title="−10s"
          >
            <SkipBack className="w-4 h-4 md:w-3.5 md:h-3.5 text-white/60 group-hover:text-white transition-colors" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-12 h-12 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 flex items-center justify-center transition-all shadow-lg shadow-violet-500/20 active:scale-95"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing
              ? <Pause className="w-5 h-5 md:w-4 md:h-4 text-white" />
              : <Play className="w-5 h-5 md:w-4 md:h-4 text-white ml-0.5" />
            }
          </button>

          {/* Skip forward */}
          <button
            onClick={() => skip(10)}
            className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-white/6 hover:bg-white/12 active:bg-white/16 flex items-center justify-center transition-colors group"
            aria-label="Skip forward 10s"
            title="+10s"
          >
            <SkipForward className="w-4 h-4 md:w-3.5 md:h-3.5 text-white/60 group-hover:text-white transition-colors" />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Volume — hidden on mobile (use device volume buttons instead) */}
          <div className="hidden sm:flex items-center gap-1.5">
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

          {/* Download — pay-on-download gate when taskId is set */}
          {renderDownloadButton()}
        </div>

        {/* Download hint — only shown when gate is active */}
        {hasGate && (
          <div className="px-4 pb-3 -mt-1">
            <p className="text-[10px] text-white/30 text-right">
              Download: 2 credits (subscribers) · £3.99 one-off
            </p>
          </div>
        )}
      </div>

      {/* Hidden audio element — crossOrigin="anonymous" is REQUIRED for Web Audio API
          createMediaElementSource() to work with cross-origin URLs (S3/CloudFront).
          Without it the browser taints the audio stream and blocks the analyser. */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" crossOrigin="anonymous" />
    </div>
  );
}
