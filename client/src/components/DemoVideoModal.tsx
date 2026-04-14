import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, Subtitles, Maximize2, Volume2, VolumeX, Sparkles } from "lucide-react";
import { mp } from "@/lib/mixpanel";

/* ── Asset URLs ──────────────────────────────────────────────────────── */
const POSTER_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-demo-poster-4k-anXRaxizHsSLrb8pmCTu5A.webp";

const VIDEO_SRC =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/demo-video-only_553227ac.mp4";

// Standard Audio: SubwooferTension-WizVid — raw, unprocessed comparison track
const AUDIO_STANDARD =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizsound-standard-v2_0af03a11.mp3";

// WizSound Enhanced: Sub-bassRavel-WizVid — WizSound™ processed, cinematic quality
const AUDIO_ENHANCED =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizsound-enhanced-v2_31089485.mp3";

/* ── WizSound™ EQ Bar animation ─────────────────────────────────────── */
function WizSoundEQ({ size = "lg", active = true }: { size?: "sm" | "lg"; active?: boolean }) {
  const isLg = size === "lg";
  // More bars for premium feel, varied heights for organic look
  const heights = isLg
    ? [5, 10, 18, 28, 38, 44, 38, 28, 18, 10, 5]
    : [3, 5, 9, 13, 16, 13, 9, 5, 3];
  const gap = isLg ? "gap-[3px]" : "gap-[2px]";
  const barW = isLg ? 3.5 : 2;
  const containerH = isLg ? 44 : 20;

  return (
    <div className={`flex items-end ${gap}`} aria-hidden="true" style={{ height: containerH }}>
      {heights.map((h, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: barW,
            height: active ? h : Math.max(2, h * 0.2),
            background: active
              ? "linear-gradient(to top, #4c1d95, #8b5cf6, #e879f9, #f0abfc)"
              : "rgba(255,255,255,0.15)",
            animationName: active ? "wizEqPremium" : "none",
            animationDuration: `${0.35 + i * 0.055}s`,
            animationDelay: `${i * 0.03}s`,
            animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
            animationIterationCount: "infinite",
            animationDirection: "alternate",
            opacity: active ? 0.95 : 0.3,
            boxShadow: active && isLg
              ? `0 0 6px rgba(167,139,250,0.6), 0 0 12px rgba(232,121,249,0.3)`
              : "none",
            transition: "height 0.2s ease, opacity 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}

/* ── Canvas waveform overlay ─────────────────────────────────────────── */
function WaveformCanvas({ active, wizsound }: { active: boolean; wizsound: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      tRef.current += 1;
      const t = tRef.current;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const bars = wizsound ? 48 : 28;
      const barW = (W - bars * 1.5) / bars;

      for (let i = 0; i < bars; i++) {
        const phase = (i / bars) * Math.PI * 2;
        // WizSound: richer, more complex waveform with multiple frequencies
        const h = wizsound
          ? H * 0.75 * Math.abs(
              Math.sin(t * 0.045 + phase) * 0.5 +
              Math.sin(t * 0.08 + phase * 1.7) * 0.3 +
              Math.sin(t * 0.12 + phase * 0.8) * 0.2
            )
          : H * 0.45 * Math.abs(Math.sin(t * 0.03 + phase));

        const x = i * (barW + 1.5);
        const grad = ctx.createLinearGradient(0, H, 0, H - h);
        if (wizsound) {
          grad.addColorStop(0, "rgba(76,29,149,0.9)");
          grad.addColorStop(0.4, "rgba(139,92,246,0.95)");
          grad.addColorStop(0.75, "rgba(217,70,239,0.9)");
          grad.addColorStop(1, "rgba(240,171,252,0.85)");
        } else {
          grad.addColorStop(0, "rgba(255,255,255,0.15)");
          grad.addColorStop(1, "rgba(255,255,255,0.4)");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, H - h, barW, h, 2);
        ctx.fill();

        // Glow for WizSound bars
        if (wizsound && h > H * 0.3) {
          ctx.shadowColor = "rgba(167,139,250,0.4)";
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, wizsound]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={56}
      className="w-full"
      style={{ height: 56, display: "block" }}
      aria-hidden="true"
    />
  );
}

/* ── Component ───────────────────────────────────────────────────────── */
interface DemoVideoModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoVideoModal({ open, onClose }: DemoVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioStdRef = useRef<HTMLAudioElement>(null);
  const audioEnhRef = useRef<HTMLAudioElement>(null);
  const switchingRef = useRef(false); // Prevent rapid toggle race conditions
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [captions, setCaptions] = useState(false);
  const [wizsoundMode, setWizsoundMode] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  /* ── Get active/inactive audio refs ── */
  const getActiveAudio = useCallback(() => {
    return wizsoundMode ? audioEnhRef.current : audioStdRef.current;
  }, [wizsoundMode]);

  const getInactiveAudio = useCallback(() => {
    return wizsoundMode ? audioStdRef.current : audioEnhRef.current;
  }, [wizsoundMode]);

  /* ── Switch audio mode (instant, no overlap) ── */
  const switchAudioMode = useCallback(async (toWizSound: boolean) => {
    if (switchingRef.current) return; // Prevent race conditions
    switchingRef.current = true;

    const v = videoRef.current;
    const nextActive = toWizSound ? audioEnhRef.current : audioStdRef.current;
    const nextInactive = toWizSound ? audioStdRef.current : audioEnhRef.current;

    // Step 1: Immediately silence and stop inactive track
    if (nextInactive) {
      nextInactive.volume = 0;
      nextInactive.pause();
      nextInactive.currentTime = 0;
    }

    // Step 2: Sync new active track to video position
    if (nextActive && v) {
      nextActive.currentTime = v.currentTime;
      nextActive.muted = isMuted;
      nextActive.volume = 1;
    }

    // Step 3: Play new track if video is playing
    if (playing && nextActive) {
      try {
        await nextActive.play();
      } catch {
        // Autoplay blocked — user will hear audio on next interaction
      }
    }

    switchingRef.current = false;
  }, [playing, isMuted]);

  /* ── Sync audio to video on mode switch ── */
  useEffect(() => {
    switchAudioMode(wizsoundMode);
  }, [wizsoundMode]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Sync mute state to active track only ── */
  useEffect(() => {
    const active = getActiveAudio();
    if (active) active.muted = isMuted;
    // Ensure inactive track stays silent
    const inactive = getInactiveAudio();
    if (inactive) {
      inactive.muted = true;
      inactive.volume = 0;
    }
  }, [isMuted, getActiveAudio, getInactiveAudio]);

  /* ── Drift correction: keep audio in sync with video ── */
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      const active = getActiveAudio();
      if (!v || !active) return;
      const drift = Math.abs(v.currentTime - active.currentTime);
      // Correct drift > 80ms (tighter threshold for better sync)
      if (drift > 0.08) {
        active.currentTime = v.currentTime;
      }
    }, 150); // Check every 150ms for tighter sync
    return () => clearInterval(interval);
  }, [playing, getActiveAudio]);

  /* ── ESC to close ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* ── Full reset on close ─────────────────────────────────────────── */
  useEffect(() => {
    if (!open) {
      const vid = videoRef.current;
      if (vid) { vid.pause(); vid.currentTime = 0; }
      // Hard stop both tracks
      [audioStdRef.current, audioEnhRef.current].forEach(a => {
        if (a) { a.pause(); a.currentTime = 0; a.volume = 1; a.muted = false; }
      });
      setPlaying(false);
      setCurrentTime(0);
      switchingRef.current = false;
    }
  }, [open]);

  /* ── Video event handlers ────────────────────────────────────────── */
  const handleCanPlay = useCallback(() => {
    setVideoLoaded(true);
    const vid = videoRef.current;
    if (vid) setDuration(vid.duration || 0);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const vid = videoRef.current;
    if (vid) setDuration(vid.duration || 0);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current;
    if (vid) setCurrentTime(vid.currentTime);
  }, []);

  const handleEnded = useCallback(() => {
    mp.demoVideoCompleted();
    setPlaying(false);
    audioStdRef.current?.pause();
    audioEnhRef.current?.pause();
  }, []);

  /* ── Play / Pause ────────────────────────────────────────────────── */
  const togglePlay = useCallback(async () => {
    const vid = videoRef.current;
    const active = getActiveAudio();
    if (!vid) return;

    if (playing) {
      vid.pause();
      active?.pause();
      // Ensure inactive track is also stopped
      const inactive = getInactiveAudio();
      if (inactive) { inactive.pause(); inactive.currentTime = 0; }
      mp.demoVideoPaused(vid.currentTime);
      setPlaying(false);
    } else {
      // Sync active audio to video position before playing
      if (active) {
        active.currentTime = vid.currentTime;
        active.muted = isMuted;
        active.volume = 1;
      }
      // Ensure inactive track is silent
      const inactive = getInactiveAudio();
      if (inactive) { inactive.pause(); inactive.currentTime = 0; inactive.volume = 0; }

      try {
        await vid.play();
        if (active) await active.play();
        setPlaying(true);
        mp.demoVideoPlayed();
      } catch {
        // If audio is blocked, play video only (browser autoplay policy)
        try {
          await vid.play();
          setPlaying(true);
          mp.demoVideoPlayed();
        } catch {
          setPlaying(false);
        }
      }
    }
  }, [playing, getActiveAudio, getInactiveAudio, isMuted]);

  /* ── Mute toggle ── */
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  /* ── Progress bar seek ───────────────────────────────────────────── */
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const vid = videoRef.current;
    const active = getActiveAudio();
    if (!vid || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekTo = ratio * duration;
    vid.currentTime = seekTo;
    if (active) active.currentTime = seekTo;
    setCurrentTime(seekTo);
  }, [duration, getActiveAudio]);

  const handleFullscreen = useCallback(() => {
    const el = document.getElementById("wizvid-demo-modal-video-container");
    if (el?.requestFullscreen) el.requestFullscreen();
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="WizVid product demo"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/92 backdrop-blur-md animate-in fade-in duration-300"
        style={{ pointerEvents: "auto" }}
        onClick={onClose}
      />

      {/* ── WizSound caption above video ──────────────────────────────── */}
      <div className="relative z-10 w-full max-w-5xl mx-4 flex flex-col gap-0">
        {/* Header badge */}
        <div className="flex items-center justify-center gap-3 pb-3">
          <WizSoundEQ size="sm" active={wizsoundMode} />
          <p
            className="text-center text-sm font-semibold tracking-wide"
            style={{
              background: wizsoundMode
                ? "linear-gradient(90deg, #a78bfa, #e879f9, #f0abfc)"
                : "rgba(255,255,255,0.4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              transition: "all 0.3s ease",
            }}
          >
            {wizsoundMode
              ? "WizSound™ Active — Cinematic Audio Enhancement"
              : "Standard Audio — Toggle WizSound™ to hear the difference"}
          </p>
          <WizSoundEQ size="sm" active={wizsoundMode} />
        </div>

        {/* Modal container */}
        <div
          id="wizvid-demo-modal-video-container"
          className="relative w-full rounded-2xl overflow-hidden bg-black"
          style={{
            aspectRatio: "16/9",
            boxShadow: wizsoundMode
              ? "0 0 0 1px rgba(139,92,246,0.3), 0 32px 80px rgba(0,0,0,0.85), 0 0 80px rgba(109,40,217,0.25)"
              : "0 0 0 1px rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.8)",
            transition: "box-shadow 0.4s ease",
          }}
        >
          {/* ── Standard/WizSound comparison toggle ─────────────────── */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full bg-black/80 border border-white/10 backdrop-blur-md p-1">
            <button
              onMouseDown={(e) => { e.preventDefault(); setWizsoundMode(false); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                !wizsoundMode
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-white/40 hover:text-white/70"
              }`}
              aria-pressed={!wizsoundMode}
            >
              Standard Audio
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); setWizsoundMode(true); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                wizsoundMode ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
              style={
                wizsoundMode
                  ? {
                      background: "linear-gradient(135deg, rgba(109,40,217,0.85), rgba(217,70,239,0.75))",
                      boxShadow: "0 0 16px rgba(217,70,239,0.4), 0 0 4px rgba(139,92,246,0.6)",
                    }
                  : {}
              }
              aria-pressed={wizsoundMode}
            >
              {wizsoundMode && <WizSoundEQ size="sm" active={true} />}
              WizSound™
            </button>
          </div>

          {/* ── Video element — always muted (audio from separate element) ── */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            poster={POSTER_URL}
            playsInline
            muted
            preload="metadata"
            onCanPlay={handleCanPlay}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          >
            <source src={VIDEO_SRC} type="video/mp4" />
            {captions && (
              <track kind="subtitles" src="/captions/intro-film.vtt" srcLang="en" label="English" default />
            )}
          </video>

          {/* Hidden audio elements — preload both for instant switching */}
          <audio
            ref={audioStdRef}
            src={AUDIO_STANDARD}
            preload="auto"
            crossOrigin="anonymous"
          />
          <audio
            ref={audioEnhRef}
            src={AUDIO_ENHANCED}
            preload="auto"
            crossOrigin="anonymous"
          />

          {/* ── Close button ──────────────────────────────────────── */}
          <button
            onMouseDown={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-all cursor-pointer"
            aria-label="Close demo"
          >
            <X size={18} />
          </button>

          {/* ── Centre play button (when paused) ──────────────────── */}
          {!playing && (
            <button
              onMouseDown={(e) => { e.preventDefault(); togglePlay(); }}
              className="absolute inset-0 z-10 flex items-center justify-center group cursor-pointer"
              aria-label="Play demo"
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                <span className="absolute inset-0 rounded-full bg-white/20 animate-ping pointer-events-none" />
                <span className="absolute inset-1 rounded-full bg-white/10 animate-ping [animation-delay:0.3s] pointer-events-none" />
                <span className="absolute inset-0 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center transition-all shadow-2xl">
                  <Play size={32} className="text-black ml-1" fill="black" />
                </span>
              </div>
            </button>
          )}

          {/* ── Controls bar ──────────────────────────────────────── */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-4 pt-12">
            {/* Waveform canvas */}
            {playing && (
              <div className="mb-2 opacity-80">
                <WaveformCanvas active={playing} wizsound={wizsoundMode} />
              </div>
            )}

            {/* Progress bar */}
            <div
              className="w-full h-2 bg-white/15 rounded-full mb-3 cursor-pointer group relative"
              onMouseDown={handleProgressClick}
              role="slider"
              aria-label="Video progress"
              aria-valuenow={Math.round(progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full relative"
                style={{
                  width: `${progressPercent}%`,
                  background: wizsoundMode
                    ? "linear-gradient(90deg, #6d28d9, #8b5cf6, #e879f9)"
                    : "rgba(255,255,255,0.7)",
                  transition: "background 0.3s ease",
                  boxShadow: wizsoundMode ? "0 0 8px rgba(139,92,246,0.5)" : "none",
                }}
              >
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Buttons row */}
            <div className="flex items-center gap-3">
              <button
                onMouseDown={(e) => { e.preventDefault(); togglePlay(); }}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button
                onMouseDown={(e) => { e.preventDefault(); toggleMute(); }}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <div className="flex-1" />

              {/* WizSound™ status badge */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-400"
                style={
                  wizsoundMode
                    ? {
                        borderColor: "rgba(139,92,246,0.5)",
                        background: "rgba(109,40,217,0.2)",
                        boxShadow: "0 0 10px rgba(139,92,246,0.2)",
                      }
                    : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }
                }
              >
                {wizsoundMode ? (
                  <>
                    <WizSoundEQ size="sm" active={playing} />
                    <span
                      className="font-bold text-[0.65rem] tracking-wide"
                      style={{
                        background: "linear-gradient(90deg, #a78bfa, #e879f9)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      WizSound™ ON
                    </span>
                  </>
                ) : (
                  <span className="text-white/40 text-[0.65rem] tracking-wide font-medium">Standard Audio</span>
                )}
              </div>

              {/* Time display */}
              <span className="text-white/50 text-xs font-mono tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <button
                onMouseDown={(e) => { e.preventDefault(); setCaptions((c) => !c); }}
                className={`w-8 h-8 flex items-center justify-center transition-colors cursor-pointer ${
                  captions ? "text-white" : "text-white/40 hover:text-white/80"
                }`}
                aria-label="Toggle captions"
              >
                <Subtitles size={18} />
              </button>

              <button
                onMouseDown={handleFullscreen}
                className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                aria-label="Fullscreen"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </div>

          {/* Loading spinner */}
          {!videoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 pointer-events-none">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* ── WizSound™ keyframes ────────────────────────────────── */}
          <style>{`
            @keyframes wizEqPremium {
              0%   { transform: scaleY(0.2); opacity: 0.7; }
              50%  { transform: scaleY(0.85); opacity: 1; }
              100% { transform: scaleY(1); opacity: 0.95; }
            }
          `}</style>
        </div>

        {/* ── Below modal: WizSound comparison hint ── */}
        <div className="flex items-center justify-center gap-2 pt-3">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <p className="text-center text-xs text-white/40 font-medium">
            Toggle between <span className="text-white/60">Standard Audio</span> and{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #a78bfa, #e879f9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              className="font-semibold"
            >
              WizSound™
            </span>{" "}
            to hear the difference
          </p>
          <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds || 0);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
