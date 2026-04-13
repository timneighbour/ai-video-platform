import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, Subtitles, Maximize2, Volume2, VolumeX, Sparkles } from "lucide-react";
import { mp } from "@/lib/mixpanel";

/* ── Asset URLs ──────────────────────────────────────────────────────── */
const POSTER_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-demo-poster-4k-anXRaxizHsSLrb8pmCTu5A.webp";

const VIDEO_SRC =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/demo-video-only_553227ac.mp4";

const AUDIO_STANDARD =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizsound-standard_31845db2.m4a";

const AUDIO_ENHANCED =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizsound-enhanced_9f37b387.m4a";

/* ── WizSound™ EQ Bar animation component ───────────────────────────── */
function WizSoundEQ({ size = "lg" }: { size?: "sm" | "lg" }) {
  const isLg = size === "lg";
  const heights = isLg
    ? [6, 12, 20, 30, 36, 30, 20, 12, 6]
    : [3, 6, 10, 14, 16, 14, 10, 6, 3];
  const gap = isLg ? "gap-[3px]" : "gap-[2px]";
  const barW = isLg ? 4 : 2.5;
  const containerH = isLg ? 40 : 20;

  return (
    <div className={`flex items-end ${gap}`} aria-hidden="true" style={{ height: containerH }}>
      {heights.map((h, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: barW,
            height: h,
            background: "linear-gradient(to top, #5b21b6, #a78bfa, #e879f9)",
            animationName: "wizEq",
            animationDuration: `${0.4 + i * 0.06}s`,
            animationDelay: `${i * 0.035}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationDirection: "alternate",
            opacity: 0.92,
            boxShadow: isLg ? "0 0 5px rgba(167,139,250,0.5)" : "0 0 3px rgba(167,139,250,0.4)",
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

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (ts: number) => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const bars = wizsound ? 32 : 20;
      const barW = W / bars;
      const t = ts / 1000;
      for (let i = 0; i < bars; i++) {
        const phase = (i / bars) * Math.PI * 2;
        const freq = wizsound ? 2.8 : 1.6;
        const amp = wizsound ? 0.85 : 0.55;
        const h = H * amp * Math.abs(Math.sin(t * freq + phase)) * (0.4 + 0.6 * Math.random() * 0.3);
        const x = i * barW + barW * 0.15;
        const w = barW * 0.7;
        const grad = ctx.createLinearGradient(0, H, 0, H - h);
        if (wizsound) {
          grad.addColorStop(0, "rgba(91,33,182,0.8)");
          grad.addColorStop(0.5, "rgba(167,139,250,0.9)");
          grad.addColorStop(1, "rgba(232,121,249,0.95)");
        } else {
          grad.addColorStop(0, "rgba(255,255,255,0.2)");
          grad.addColorStop(1, "rgba(255,255,255,0.5)");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, H - h, w, h, 2);
        ctx.fill();
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
      height={60}
      className="w-full"
      style={{ height: 60, display: "block" }}
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
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [captions, setCaptions] = useState(false);
  const [wizsoundMode, setWizsoundMode] = useState(true);
  const [isMuted, setIsMuted] = useState(false); // Start unmuted — user clicks play (gesture)

  /* ── Get active/inactive audio refs ── */
  const getActiveAudio = useCallback(() => {
    return wizsoundMode ? audioEnhRef.current : audioStdRef.current;
  }, [wizsoundMode]);

  const getInactiveAudio = useCallback(() => {
    return wizsoundMode ? audioStdRef.current : audioEnhRef.current;
  }, [wizsoundMode]);

  /* ── Sync audio to video on mode switch ── */
  useEffect(() => {
    const v = videoRef.current;
    const active = getActiveAudio();
    const inactive = getInactiveAudio();
    if (!v || !active) return;

    if (inactive) inactive.pause();
    active.currentTime = v.currentTime;
    active.muted = isMuted;

    if (playing) {
      active.play().catch(() => {});
    }
  }, [wizsoundMode]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Sync mute state ── */
  useEffect(() => {
    const active = getActiveAudio();
    if (active) active.muted = isMuted;
  }, [isMuted, getActiveAudio]);

  /* ── Keep audio synced to video (drift correction) ── */
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      const active = getActiveAudio();
      if (v && active && Math.abs(v.currentTime - active.currentTime) > 0.15) {
        active.currentTime = v.currentTime;
      }
    }, 500);
    return () => clearInterval(interval);
  }, [playing, getActiveAudio]);

  /* ── ESC to close ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* ── Reset on close ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) {
      const vid = videoRef.current;
      if (vid) {
        vid.pause();
        vid.currentTime = 0;
      }
      audioStdRef.current?.pause();
      audioEnhRef.current?.pause();
      setPlaying(false);
      setCurrentTime(0);
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
      mp.demoVideoPaused(vid.currentTime);
      setPlaying(false);
    } else {
      if (active) {
        active.currentTime = vid.currentTime;
        active.muted = isMuted;
      }
      try {
        await vid.play(); // Video is muted, always works
        if (active) await active.play(); // Audio plays — user clicked (gesture satisfied)
        setPlaying(true);
        mp.demoVideoPlayed();
      } catch {
        // If audio blocked, play video only
        try {
          await vid.play();
          setPlaying(true);
          mp.demoVideoPlayed();
        } catch {
          setPlaying(false);
        }
      }
    }
  }, [playing, getActiveAudio, isMuted]);

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
    vid.currentTime = ratio * duration;
    if (active) active.currentTime = vid.currentTime;
    setCurrentTime(ratio * duration);
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
        className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* ── WizSound caption above video ──────────────────────────────── */}
      <div className="relative z-10 w-full max-w-5xl mx-4 flex flex-col gap-0">
        <div className="flex items-center justify-center gap-3 pb-3">
          <WizSoundEQ size="sm" />
          <p
            className="text-center text-sm font-medium"
            style={{
              background: "linear-gradient(90deg, #a78bfa, #e879f9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Powered by WizSound™ – richer, more cinematic audio
          </p>
          <WizSoundEQ size="sm" />
        </div>

        {/* Modal container */}
        <div
          id="wizvid-demo-modal-video-container"
          className="relative w-full rounded-2xl overflow-hidden bg-black"
          style={{
            aspectRatio: "16/9",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(109,40,217,0.15)",
          }}
        >
          {/* ── Standard/WizSound comparison toggle ─────────────────── */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full bg-black/70 border border-white/10 backdrop-blur-md p-1">
            <button
              onClick={() => setWizsoundMode(false)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                !wizsoundMode ? "bg-white/20 text-white" : "text-white/40 hover:text-white/70"
              }`}
              aria-pressed={!wizsoundMode}
            >
              Standard Audio
            </button>
            <button
              onClick={() => setWizsoundMode(true)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                wizsoundMode ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
              style={
                wizsoundMode
                  ? {
                      background: "linear-gradient(135deg, rgba(109,40,217,0.7), rgba(217,70,239,0.6))",
                      boxShadow: "0 0 12px rgba(217,70,239,0.3)",
                    }
                  : {}
              }
              aria-pressed={wizsoundMode}
            >
              {wizsoundMode && <WizSoundEQ size="sm" />}
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

          {/* Hidden audio elements */}
          <audio ref={audioStdRef} src={AUDIO_STANDARD} preload="auto" />
          <audio ref={audioEnhRef} src={AUDIO_ENHANCED} preload="auto" />

          {/* ── Close button ──────────────────────────────────────── */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-all"
            aria-label="Close demo"
          >
            <X size={18} />
          </button>

          {/* ── Centre play button (when paused) ──────────────────── */}
          {!playing && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 z-10 flex items-center justify-center group"
              aria-label="Play demo"
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
                <span className="absolute inset-1 rounded-full bg-white/10 animate-ping [animation-delay:0.3s]" />
                <span className="absolute inset-0 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center transition-all shadow-2xl">
                  <Play size={32} className="text-black ml-1" fill="black" />
                </span>
              </div>
            </button>
          )}

          {/* ── Controls bar ──────────────────────────────────────── */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-8">
            {/* Waveform canvas */}
            {playing && (
              <div className="mb-2 opacity-70">
                <WaveformCanvas active={playing} wizsound={wizsoundMode} />
              </div>
            )}

            {/* Progress bar */}
            <div
              className="w-full h-1.5 bg-white/20 rounded-full mb-3 cursor-pointer group relative"
              onClick={handleProgressClick}
              role="slider"
              aria-label="Video progress"
              aria-valuenow={Math.round(progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full transition-all duration-100 relative"
                style={{
                  width: `${progressPercent}%`,
                  background: wizsoundMode
                    ? "linear-gradient(90deg, #7c3aed, #e879f9)"
                    : "white",
                }}
              >
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Buttons row */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button
                onClick={toggleMute}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <div className="flex-1" />

              {/* WizSound™ status badge */}
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all duration-300"
                style={
                  wizsoundMode
                    ? { borderColor: "rgba(109,40,217,0.4)", background: "rgba(109,40,217,0.15)" }
                    : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }
                }
              >
                {wizsoundMode ? (
                  <>
                    <WizSoundEQ size="sm" />
                    <span
                      className="font-semibold text-[0.6rem] tracking-wide"
                      style={{
                        background: "linear-gradient(90deg, #a78bfa, #e879f9)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      WizSound™ Active
                    </span>
                  </>
                ) : (
                  <span className="text-white/40 text-[0.6rem] tracking-wide">Standard Audio</span>
                )}
              </div>

              {/* Audio mode indicator */}
              {playing && (
                <div className={`text-[9px] font-mono ${wizsoundMode ? "text-fuchsia-400/60" : "text-white/25"}`}>
                  {wizsoundMode ? "⚡ CINEMATIC" : "○ FLAT"}
                </div>
              )}

              {/* Time display */}
              <span className="text-white/50 text-xs font-mono tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <button
                onClick={() => setCaptions((c) => !c)}
                className={`w-8 h-8 flex items-center justify-center transition-colors ${
                  captions ? "text-white" : "text-white/40 hover:text-white/80"
                }`}
                aria-label="Toggle captions"
              >
                <Subtitles size={18} />
              </button>

              <button
                onClick={handleFullscreen}
                className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
                aria-label="Fullscreen"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </div>

          {/* Loading spinner */}
          {!videoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* ── WizSound™ keyframes ────────────────────────────────── */}
          <style>{`
            @keyframes wizEq {
              0%   { transform: scaleY(0.25); }
              100% { transform: scaleY(1); }
            }
          `}</style>
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
