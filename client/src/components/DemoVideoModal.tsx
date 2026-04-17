/**
 * DemoVideoModal — WizSound™ comparison demo
 *
 * Architecture:
 * - ONE <audio> element whose src is swapped on toggle (guarantees zero overlap)
 * - Web Audio API AnalyserNode reads real FFT data → drives EQ bars from actual signal
 * - Standard track: SubwooferTension-WizAI (flat, dry, unprocessed)
 * - WizSound track: Sub-bassRavel-WizAI (cinematic, boosted bass + presence)
 * - BiquadFilter chain applied in Web Audio graph for WizSound mode:
 *     lowShelf +8dB @ 120Hz, peaking +5dB @ 3kHz, highShelf +3dB @ 8kHz
 *   giving an immediately audible difference on the SAME signal path
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX, Sparkles, Maximize2, Subtitles } from "lucide-react";
import { mp } from "@/lib/mixpanel";

/* ── CDN assets ──────────────────────────────────────────────────────── */
const POSTER_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-demo-poster-4k-anXRaxizHsSLrb8pmCTu5A.webp";

const VIDEO_SRC =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/demo-video-only_553227ac.mp4";

// Standard: same source track, normalized at -20 LUFS — flat, dry, quiet — the "before" experience
const AUDIO_STANDARD =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizsound-demo-standard-subwoofer_df98cac4.mp3";

// WizSound Cinematic: same source track, FFmpeg DSP processed — EQ boosted, compressed, +6 LUFS louder — the "wow" moment
const AUDIO_WIZSOUND =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizsound-demo-enhanced-subwoofer_eec1eb9c.mp3";

/* ── Web Audio context (singleton, created on first user gesture) ─────── */
let sharedCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AudioContext();
  }
  return sharedCtx;
}

/* ── Real-FFT EQ bar component ──────────────────────────────────────── */
interface EQBarsProps {
  analyser: AnalyserNode | null;
  wizsound: boolean;
  active: boolean;
}

function EQBars({ analyser, wizsound, active }: EQBarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const BAR_COUNT = 32;
    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : BAR_COUNT);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      if (analyser && active) {
        analyser.getByteFrequencyData(dataArray);
      }

      const gap = 2;
      const barW = (W - gap * (BAR_COUNT - 1)) / BAR_COUNT;

      for (let i = 0; i < BAR_COUNT; i++) {
        let rawVal: number;
        if (analyser && active) {
          // Sample from frequency bins — weight toward lower bins for music
          const binIndex = Math.floor(Math.pow(i / BAR_COUNT, 1.5) * (dataArray.length * 0.75));
          rawVal = dataArray[Math.min(binIndex, dataArray.length - 1)] / 255;
        } else {
          rawVal = 0.04; // Flat line when paused
        }

        const h = Math.max(2, rawVal * H * 0.92);
        const x = i * (barW + gap);

        const grad = ctx.createLinearGradient(0, H, 0, H - h);
        if (wizsound) {
          grad.addColorStop(0, "rgba(76,29,149,1)");
          grad.addColorStop(0.45, "rgba(139,92,246,1)");
          grad.addColorStop(0.78, "rgba(217,70,239,0.95)");
          grad.addColorStop(1, "rgba(240,171,252,0.9)");
        } else {
          grad.addColorStop(0, "rgba(80,80,90,0.9)");
          grad.addColorStop(0.5, "rgba(140,140,155,0.85)");
          grad.addColorStop(1, "rgba(200,200,210,0.7)");
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, H - h, barW, h, [2, 2, 0, 0]);
        ctx.fill();

        // Glow on tall bars for WizSound
        if (wizsound && rawVal > 0.5) {
          ctx.shadowColor = "rgba(167,139,250,0.5)";
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, wizsound, active]);

  return (
    <canvas
      ref={canvasRef}
      width={560}
      height={52}
      className="w-full rounded"
      style={{ height: 52, display: "block" }}
      aria-hidden="true"
    />
  );
}

/* ── Main component ──────────────────────────────────────────────────── */
interface DemoVideoModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoVideoModal({ open, onClose }: DemoVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // SINGLE audio element — src swapped on toggle
  const audioRef = useRef<HTMLAudioElement>(null);

  // Web Audio nodes
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const lowShelfRef = useRef<BiquadFilterNode | null>(null);
  const peakingRef = useRef<BiquadFilterNode | null>(null);
  const highShelfRef = useRef<BiquadFilterNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const graphBuiltRef = useRef(false);

  const [videoLoaded, setVideoLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // IMPORTANT: Default to Standard Audio so user hears flat version first
  // Toggling to WizSound™ creates the "wow" moment that sells the upgrade
  const [wizsoundMode, setWizsoundMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [captions, setCaptions] = useState(false);
  // Expose analyser to EQ component only after graph is built
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  /* ── Build Web Audio graph (once, on first play) ─────────────────── */
  const buildAudioGraph = useCallback(() => {
    if (graphBuiltRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;

    const ctx = getAudioContext();
    audioCtxRef.current = ctx;

    // Source node
    const source = ctx.createMediaElementSource(audio);
    sourceNodeRef.current = source;

    // Analyser (reads actual FFT data)
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.8;
    analyserRef.current = analyserNode;

    // EQ chain for WizSound™ enhancement
    // Low shelf: +8dB @ 120Hz — deep bass boost
    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = 120;
    lowShelf.gain.value = 0; // starts at 0, set by applyEQ()
    lowShelfRef.current = lowShelf;

    // Peaking: +5dB @ 3kHz — vocal presence / clarity
    const peaking = ctx.createBiquadFilter();
    peaking.type = "peaking";
    peaking.frequency.value = 3000;
    peaking.Q.value = 1.2;
    peaking.gain.value = 0;
    peakingRef.current = peaking;

    // High shelf: +3dB @ 8kHz — air / brightness
    const highShelf = ctx.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = 8000;
    highShelf.gain.value = 0;
    highShelfRef.current = highShelf;

    // Chain: source → lowShelf → peaking → highShelf → analyser → destination
    source.connect(lowShelf);
    lowShelf.connect(peaking);
    peaking.connect(highShelf);
    highShelf.connect(analyserNode);
    analyserNode.connect(ctx.destination);

    graphBuiltRef.current = true;
    setAnalyser(analyserNode);
  }, []);

  /* ── Apply / remove EQ based on mode ────────────────────────────── */
  const applyEQ = useCallback((wizSound: boolean) => {
    const ramp = audioCtxRef.current?.currentTime ?? 0;
    const t = ramp + 0.05; // 50ms ramp for smooth transition
    if (lowShelfRef.current) {
      lowShelfRef.current.gain.linearRampToValueAtTime(wizSound ? 8 : 0, t);
    }
    if (peakingRef.current) {
      peakingRef.current.gain.linearRampToValueAtTime(wizSound ? 5 : 0, t);
    }
    if (highShelfRef.current) {
      highShelfRef.current.gain.linearRampToValueAtTime(wizSound ? 3 : 0, t);
    }
  }, []);

  /* ── Switch audio track (swap src, maintain position) ───────────── */
  const switchTrack = useCallback(async (toWizSound: boolean) => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio || !video) return;

    const wasPlaying = !audio.paused;
    const savedTime = video.currentTime;

    // Swap source
    audio.src = toWizSound ? AUDIO_WIZSOUND : AUDIO_STANDARD;
    audio.load();

    // Restore position and apply EQ
    audio.currentTime = savedTime;
    applyEQ(toWizSound);

    if (wasPlaying) {
      try {
        await audio.play();
      } catch {
        // Autoplay blocked — user will hear on next interaction
      }
    }
  }, [applyEQ]);

  /* ── React to mode toggle ────────────────────────────────────────── */
  useEffect(() => {
    switchTrack(wizsoundMode);
  }, [wizsoundMode]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Sync mute ───────────────────────────────────────────────────── */
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = isMuted;
  }, [isMuted]);

  /* ── Drift correction ────────────────────────────────────────────── */
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      const a = audioRef.current;
      if (v && a && Math.abs(v.currentTime - a.currentTime) > 0.1) {
        a.currentTime = v.currentTime;
      }
    }, 150);
    return () => clearInterval(interval);
  }, [playing]);

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
      const aud = audioRef.current;
      if (vid) { vid.pause(); vid.currentTime = 0; }
      if (aud) { aud.pause(); aud.currentTime = 0; }
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
    audioRef.current?.pause();
  }, []);

  /* ── Play / Pause ────────────────────────────────────────────────── */
  const togglePlay = useCallback(async () => {
    const vid = videoRef.current;
    const aud = audioRef.current;
    if (!vid) return;

    // Build Web Audio graph on first user gesture
    buildAudioGraph();

    // Resume AudioContext if suspended (browser autoplay policy)
    if (audioCtxRef.current?.state === "suspended") {
      await audioCtxRef.current.resume();
    }

    if (playing) {
      vid.pause();
      aud?.pause();
      mp.demoVideoPaused(vid.currentTime);
      setPlaying(false);
    } else {
      if (aud) {
        aud.currentTime = vid.currentTime;
        aud.muted = isMuted;
        applyEQ(wizsoundMode);
      }
      try {
        await vid.play();
        if (aud) await aud.play();
        setPlaying(true);
        mp.demoVideoPlayed();
      } catch {
        try {
          await vid.play();
          setPlaying(true);
          mp.demoVideoPlayed();
        } catch {
          setPlaying(false);
        }
      }
    }
  }, [playing, isMuted, wizsoundMode, buildAudioGraph, applyEQ]);

  /* ── Progress bar seek ───────────────────────────────────────────── */
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const vid = videoRef.current;
    const aud = audioRef.current;
    if (!vid || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekTo = ratio * duration;
    vid.currentTime = seekTo;
    if (aud) aud.currentTime = seekTo;
    setCurrentTime(seekTo);
  }, [duration]);

  const handleFullscreen = useCallback(() => {
    const el = document.getElementById("wizvid-demo-container");
    if (el?.requestFullscreen) el.requestFullscreen();
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="WIZ AI product demo"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/92 backdrop-blur-md"
        style={{ pointerEvents: "auto" }}
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-5xl mx-4 flex flex-col gap-0">

          {/* ── Header label ── */}
        <div className="flex items-center justify-center gap-2 pb-3">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <p
            className="text-xs font-semibold tracking-wide transition-all duration-300"
            style={
              wizsoundMode
                ? {
                    background: "linear-gradient(90deg,#a78bfa,#e879f9,#f0abfc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }
                : { color: "rgba(255,255,255,0.55)" }
            }
          >
            {wizsoundMode
              ? "✦ WizSound™ Cinematic — Hear the difference"
              : "Standard Audio — Press play, then toggle WizSound™"}
          </p>
          <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
        </div>

        {/* ── Modal container ── */}
        <div
          id="wizvid-demo-container"
          className="relative w-full rounded-2xl overflow-hidden bg-black"
          style={{
            aspectRatio: "16/9",
            boxShadow: wizsoundMode
              ? "0 0 0 1px rgba(139,92,246,0.4), 0 32px 80px rgba(0,0,0,0.85), 0 0 80px rgba(109,40,217,0.3)"
              : "0 0 0 1px rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.8)",
            transition: "box-shadow 0.4s ease",
          }}
        >
          {/* ── Toggle pill — positioned high so it doesn't overlap video content ── */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full bg-black/85 border border-white/15 backdrop-blur-md p-1 shadow-xl">
            <button
              onMouseDown={(e) => { e.preventDefault(); setWizsoundMode(false); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
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
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                wizsoundMode ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
              style={
                wizsoundMode
                  ? {
                      background: "linear-gradient(135deg,rgba(109,40,217,0.9),rgba(217,70,239,0.8))",
                      boxShadow: "0 0 16px rgba(217,70,239,0.45), 0 0 4px rgba(139,92,246,0.6)",
                    }
                  : {}
              }
              aria-pressed={wizsoundMode}
            >
              WizSound™
            </button>
          </div>

          {/* ── Video (always muted — audio from separate element) ── */}
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
          >
            <source src={VIDEO_SRC} type="video/mp4" />
            {captions && (
              <track kind="subtitles" src="/captions/intro-film.vtt" srcLang="en" label="English" default />
            )}
          </video>

          {/* ── Single audio element — src swapped on toggle ── */}
          {/* Start with Standard Audio src — user hears flat version first */}
          <audio
            ref={audioRef}
            src={AUDIO_STANDARD}
            preload="auto"
            crossOrigin="anonymous"
          />

          {/* ── Close ── */}
          <button
            onMouseDown={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-all cursor-pointer"
            aria-label="Close demo"
          >
            <X size={18} />
          </button>

          {/* ── Centre play button ── */}
          {!playing && (
            <button
              onMouseDown={(e) => { e.preventDefault(); togglePlay(); }}
              className="absolute inset-0 z-10 flex items-center justify-center group cursor-pointer"
              aria-label="Play demo"
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                <span className="absolute inset-0 rounded-full bg-white/20 animate-ping pointer-events-none" />
                <span className="absolute inset-0 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center transition-all shadow-2xl">
                  <Play size={32} className="text-black ml-1" fill="black" />
                </span>
              </div>
            </button>
          )}

          {/* ── Controls bar ── */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/98 via-black/70 to-transparent px-4 pb-4 pt-20">

            {/* Real FFT EQ bars */}
            <div className="mb-2">
              <EQBars analyser={analyser} wizsound={wizsoundMode} active={playing} />
            </div>

            {/* Progress */}
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
                    ? "linear-gradient(90deg,#6d28d9,#8b5cf6,#e879f9)"
                    : "rgba(255,255,255,0.65)",
                  transition: "background 0.3s ease",
                  boxShadow: wizsoundMode ? "0 0 8px rgba(139,92,246,0.5)" : "none",
                }}
              >
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Button row */}
            <div className="flex items-center gap-3">
              <button
                onMouseDown={(e) => { e.preventDefault(); togglePlay(); }}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <button
                onMouseDown={(e) => { e.preventDefault(); setIsMuted(m => !m); }}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <div className="flex-1" />

              {/* WizSound badge */}
              <div
                className="flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-300"
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
                  <span
                    className="font-bold text-[0.65rem] tracking-wide"
                    style={{
                      background: "linear-gradient(90deg,#a78bfa,#e879f9)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    ✦ WizSound™ ON
                  </span>
                ) : (
                  <span className="text-white/40 text-[0.65rem] tracking-wide font-medium">Standard Audio</span>
                )}
              </div>

              {/* Time */}
              <span className="text-white/50 text-xs font-mono tabular-nums">
                {fmt(currentTime)} / {fmt(duration)}
              </span>

              <button
                onMouseDown={(e) => { e.preventDefault(); setCaptions(c => !c); }}
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
        </div>

        {/* ── Below modal hint ── */}
        <div className="flex items-center justify-center gap-2 pt-3">
          <p className="text-center text-xs text-white/40 font-medium">
            Toggle between{" "}
            <span className="text-white/60 font-semibold">Standard Audio</span>
            {" "}and{" "}
            <span
              className="font-bold"
              style={{
                background: "linear-gradient(90deg,#a78bfa,#e879f9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              WizSound™
            </span>
            {" "}to hear the difference
          </p>
        </div>
      </div>
    </div>
  );
}

function fmt(s: number): string {
  const sec = Math.floor(s || 0);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
