/**
 * DemoVideoModal — WIZ AI product demo with premium overlay captions
 *
 * Architecture:
 * - ONE <audio> element whose src is swapped on toggle (guarantees zero overlap)
 * - Web Audio API AnalyserNode reads real FFT data → drives EQ bars from actual signal
 * - Standard track: SubwooferTension-WizAI (flat, dry, unprocessed)
 * - WizSound track: Sub-bassRavel-WizAI (cinematic, boosted bass + presence)
 * - React-based caption overlay timed to video currentTime (not VTT)
 *   → positioned at top-centre, high-contrast, premium typography
 *   → covers all WIZ AI USPs + WizLumina upsell moment
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, Volume2, VolumeX, Sparkles, Maximize2 } from "@/lib/icons";
import { mp } from "@/lib/mixpanel";

/* ── CDN assets ──────────────────────────────────────────────────────── */
const POSTER_URL =
  "/manus-storage/studio-mic-dark_bd0b6598.jpg";

const VIDEO_SRC =
  "/manus-storage/demo-video-only_404f1adb.mp4";

// Standard: same source track, normalized at -20 LUFS — flat, dry, quiet — the "before" experience
const AUDIO_STANDARD =
  "/manus-storage/wizsound-normal_83a5954c.mp3";

// WizSound Cinematic: same source track, FFmpeg DSP processed — EQ boosted, compressed, +6 LUFS louder — the "wow" moment
const AUDIO_WIZSOUND =
  "/manus-storage/wizsound-enhanced_63baf559.mp3";

/* ── Premium caption timeline ────────────────────────────────────────── */
// Each entry: [startSec, endSec, headline, subtext?, accentColour?, isLuminaUpsell?]
interface CaptionEntry {
  start: number;
  end: number;
  headline: string;
  sub?: string;
  accent?: string; // CSS colour for headline gradient
  isLumina?: boolean;
  isSoundUpsell?: boolean;
}

const CAPTION_TIMELINE: CaptionEntry[] = [
  { start: 0,   end: 4,   headline: "Six AI tools. One creative platform.", sub: "WIZ AI — built for creators who think in stories", accent: "#d4af37" },
  { start: 4,   end: 8,   headline: "WizCreate™ — Turn any idea into a storyboard", sub: "Describe your concept. AI builds the full scene plan.", accent: "#c4a464" },
  { start: 8,   end: 12,  headline: "WizAnimate™ — Bring characters to life", sub: "Pixar-quality animation styles. No rigging. No keyframes.", accent: "#67e8f9" },
  { start: 12,  end: 16,  headline: "WizScript™ — Plain text to full video script", sub: "Scene-by-scene structure, dialogue, and visual direction — instantly.", accent: "#a78bfa" },
  { start: 16,  end: 20,  headline: "WizGenesis™ — Cinematic building engine", sub: "4K output. Consistent characters. Every scene, every time.", accent: "#f9a8d4" },
  { start: 20,  end: 24,  headline: "WizLumina™ — See the difference", sub: "AI colour grading and cinematic enhancement — before and after.", accent: "#fbbf24", isLumina: true },
  { start: 24,  end: 28,  headline: "WizSound™ — Hear the difference", sub: "Spatial audio mastering. Toggle Standard vs WizSound™ below.", accent: "#d4af37", isSoundUpsell: true },
  { start: 28,  end: 32,  headline: "WizBoost™ — Distribute to the world", sub: "YouTube, Instagram, TikTok — one click, all platforms.", accent: "#fb923c" },
];

function getCaption(t: number): CaptionEntry | null {
  return CAPTION_TIMELINE.find(c => t >= c.start && t < c.end) ?? null;
}

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
          const binIndex = Math.floor(Math.pow(i / BAR_COUNT, 1.5) * (dataArray.length * 0.75));
          rawVal = dataArray[Math.min(binIndex, dataArray.length - 1)] / 255;
        } else {
          rawVal = 0.04;
        }

        const h = Math.max(2, rawVal * H * 0.92);
        const x = i * (barW + gap);

        const grad = ctx.createLinearGradient(0, H, 0, H - h);
        if (wizsound) {
          grad.addColorStop(0, "rgba(140,120,60,1)");
          grad.addColorStop(0.45, "rgba(212,175,55,1)");
          grad.addColorStop(0.78, "rgba(196,164,100,0.95)");
          grad.addColorStop(1, "rgba(230,210,150,0.9)");
        } else {
          grad.addColorStop(0, "rgba(80,80,90,0.9)");
          grad.addColorStop(0.5, "rgba(140,140,155,0.85)");
          grad.addColorStop(1, "rgba(200,200,210,0.7)");
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, H - h, barW, h, [2, 2, 0, 0]);
        ctx.fill();

        if (wizsound && rawVal > 0.5) {
          ctx.shadowColor = "rgba(212,175,55,0.4)";
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

/* ── WizLumina before/after upsell overlay ───────────────────────────── */
function LuminaUpsellOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none"
      style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.5) 100%)" }}
    >
      <div
        className="flex gap-0 rounded-xl overflow-hidden border border-white/20 shadow-2xl"
        style={{ maxWidth: "60%", boxShadow: "0 0 40px rgba(251,191,36,0.25)" }}
      >
        {/* Before */}
        <div className="relative flex-1">
          <div
            className="w-full h-20 sm:h-28"
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
              filter: "grayscale(0.6) brightness(0.7)",
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center py-1">
            <span className="text-white/60 text-[0.6rem] font-semibold tracking-widest uppercase">Before</span>
          </div>
        </div>
        {/* Divider */}
        <div className="w-0.5 bg-white/30" />
        {/* After */}
        <div className="relative flex-1">
          <div
            className="w-full h-20 sm:h-28"
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #2d1b69 50%, #0f3460 100%)",
              filter: "saturate(1.8) brightness(1.2) contrast(1.1)",
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 py-1 text-center"
            style={{ background: "linear-gradient(90deg, rgba(251,191,36,0.3), rgba(196,164,100,0.3))" }}>
            <span
              className="text-[0.6rem] font-bold tracking-widest uppercase"
              style={{
                background: "linear-gradient(90deg,#fbbf24,#d4af37)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >WizLumina™ Enhanced</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Premium caption overlay ─────────────────────────────────────────── */
interface CaptionOverlayProps {
  caption: CaptionEntry | null;
  playing: boolean;
}

function CaptionOverlay({ caption, playing }: CaptionOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [displayed, setDisplayed] = useState<CaptionEntry | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (caption && playing) {
      if (caption !== displayed) {
        // Fade out then in for new caption
        setVisible(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setDisplayed(caption);
          setVisible(true);
        }, 200);
      } else {
        setVisible(true);
      }
    } else {
      setVisible(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [caption, playing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!displayed) return null;

  const accent = displayed.accent ?? "#ffffff";

  return (
    <div
      className="absolute top-14 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-6px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}
    >
      <div
        className="max-w-xl w-full text-center rounded-xl px-5 py-3"
        style={{
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(12px)",
          border: `1px solid ${accent}30`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 20px ${accent}15`,
        }}
      >
        <p
          className="text-sm sm:text-base font-bold leading-tight tracking-wide"
          style={{
            background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "none",
          }}
        >
          {displayed.headline}
        </p>
        {displayed.sub && (
          <p className="text-[0.7rem] sm:text-xs text-white/65 mt-1 leading-relaxed font-medium">
            {displayed.sub}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */
interface DemoVideoModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoVideoModal({ open, onClose }: DemoVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
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
  // Default to Standard Audio so user hears flat version first — toggling to WizSound™ is the "wow" moment
  const [wizsoundMode, setWizsoundMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // Derived: current caption and WizLumina upsell visibility
  const currentCaption = getCaption(currentTime);
  const showLuminaUpsell = playing && currentCaption?.isLumina === true;

  /* ── Build Web Audio graph (once, on first play) ─────────────────── */
  const buildAudioGraph = useCallback(() => {
    if (graphBuiltRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;

    const ctx = getAudioContext();
    audioCtxRef.current = ctx;

    const source = ctx.createMediaElementSource(audio);
    sourceNodeRef.current = source;

    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.8;
    analyserRef.current = analyserNode;

    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = 120;
    lowShelf.gain.value = 0;
    lowShelfRef.current = lowShelf;

    const peaking = ctx.createBiquadFilter();
    peaking.type = "peaking";
    peaking.frequency.value = 3000;
    peaking.Q.value = 1.2;
    peaking.gain.value = 0;
    peakingRef.current = peaking;

    const highShelf = ctx.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = 8000;
    highShelf.gain.value = 0;
    highShelfRef.current = highShelf;

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
    const t = ramp + 0.05;
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

  /* ── Switch audio track (swap src, maintain position) ─────────────── */
  const switchTrack = useCallback(async (toWizSound: boolean) => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio || !video) return;

    const wasPlaying = !audio.paused;
    const savedTime = video.currentTime;

    // Pause current audio immediately to prevent overlap
    audio.pause();

    audio.src = toWizSound ? AUDIO_WIZSOUND : AUDIO_STANDARD;
    audio.load();
    applyEQ(toWizSound);

    if (wasPlaying) {
      // Wait for the new track to be seekable before playing to eliminate silence gap
      await new Promise<void>((resolve) => {
        const onReady = () => {
          audio.removeEventListener('canplay', onReady);
          audio.removeEventListener('error', onReady);
          resolve();
        };
        audio.addEventListener('canplay', onReady, { once: true });
        audio.addEventListener('error', onReady, { once: true });
        // Fallback: proceed after 800ms even if canplay never fires (iOS Safari)
        setTimeout(resolve, 800);
      });
      audio.currentTime = video.currentTime; // Re-sync after load
      audio.muted = isMuted;
      try {
        await audio.play();
      } catch {
        // Autoplay blocked — user will hear on next interaction
      }
    } else {
      audio.currentTime = savedTime;
    }
  }, [applyEQ, isMuted]);

  /* ── React to mode toggle ────────────────────────────────────────── */
  useEffect(() => {
    switchTrack(wizsoundMode);
  }, [wizsoundMode]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Sync mute ───────────────────────────────────────────────────── */
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = isMuted;
  }, [isMuted]);

  /* ── AudioContext resume on visibility change (iOS/Android tab-switch fix) ── */
  useEffect(() => {
    if (!playing) return;
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        const ctx = audioCtxRef.current;
        const aud = audioRef.current;
        const vid = videoRef.current;
        // Resume suspended AudioContext (iOS suspends it when tab goes background)
        if (ctx && ctx.state === 'suspended') {
          try { await ctx.resume(); } catch { /* ignore */ }
        }
        // Re-sync audio position after returning from background
        // Only hard-seek if drift is very large (>2s) — the rate-based drift
        // correction loop will handle smaller drifts without causing pops
        if (aud && vid && !aud.paused && Math.abs(vid.currentTime - aud.currentTime) > 2.0) {
          aud.currentTime = vid.currentTime;
        }
        // If audio stalled while video kept playing, restart it
        if (aud && vid && !vid.paused && aud.paused) {
          try { await aud.play(); } catch { /* autoplay blocked — user must interact */ }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [playing]);

  /* ── Drift correction (rate-based, no seeks = no pops) ───────────── */
  // Instead of seeking the audio element (which causes buffer decode pops),
  // we nudge playbackRate to gently speed up or slow down the audio until
  // it catches up with the video. Only hard-seek as a last resort (>2s drift).
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      const a = audioRef.current;
      if (!v || !a || a.paused) return;

      const drift = v.currentTime - a.currentTime; // positive = audio behind video

      if (Math.abs(drift) > 2.0) {
        // Large drift (e.g. after seeking the video scrubber) — hard sync is unavoidable
        // but only do it once, not every tick
        a.currentTime = v.currentTime;
        a.playbackRate = 1.0;
      } else if (drift > 0.08) {
        // Audio is behind — speed it up slightly to catch up (inaudible at 1.04x)
        a.playbackRate = 1.04;
      } else if (drift < -0.08) {
        // Audio is ahead — slow it down slightly
        a.playbackRate = 0.96;
      } else {
        // In sync — restore normal rate
        a.playbackRate = 1.0;
      }
    }, 250);
    return () => {
      clearInterval(interval);
      // Always restore normal rate when effect cleans up
      const a = audioRef.current;
      if (a) a.playbackRate = 1.0;
    };
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

    buildAudioGraph();

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
    const el = document.getElementById("wizai-demo-container");
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
          <Sparkles className="w-3.5 h-3.5" style={{ color: 'rgba(212,175,55,0.7)' }} />
          <p
            className="text-xs font-semibold tracking-wide transition-all duration-300"
            style={
              wizsoundMode
                ? {
                    background: "linear-gradient(90deg,#d4af37,#c4a464,#d4af37)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }
                : { color: "rgba(255,255,255,0.55)" }
            }
          >
            {wizsoundMode
              ? "WizSound™ Cinematic — Hear the difference"
              : "WIZ AI — Six tools. One creative platform."}
          </p>
          <Sparkles className="w-3.5 h-3.5" style={{ color: 'rgba(212,175,55,0.7)' }} />
        </div>

        {/* ── Modal container ── */}
        <div
          id="wizai-demo-container"
          className="relative w-full rounded-2xl overflow-hidden bg-black"
          style={{
            aspectRatio: "16/9",
            boxShadow: wizsoundMode
              ? "0 0 0 1px rgba(212,175,55,0.3), 0 32px 80px rgba(0,0,0,0.85), 0 0 40px rgba(212,175,55,0.1)"
              : "0 0 0 1px rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.8)",
            transition: "box-shadow 0.4s ease",
          }}
        >
          {/* ── Premium caption overlay (top-centre, above toggle pill) ── */}
          <CaptionOverlay caption={currentCaption} playing={playing} />

          {/* ── WizLumina upsell overlay ── */}
          <LuminaUpsellOverlay visible={showLuminaUpsell} />

          {/* ── WizSound toggle pill ── */}
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
                      background: "linear-gradient(135deg,rgba(212,175,55,0.9),rgba(196,164,100,0.8))",
                      boxShadow: "0 0 16px rgba(212,175,55,0.35), 0 0 4px rgba(196,164,100,0.5)",
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
          </video>

          {/* ── Single audio element — src swapped on toggle ── */}
          <audio
            ref={audioRef}
            src={AUDIO_STANDARD}
            preload="auto"
            crossOrigin="anonymous"
          />

          {/* ── Close ── */}
          <button
            onMouseDown={onClose}
            className="absolute top-4 right-4 z-40 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-all cursor-pointer"
            aria-label="Close demo"
          >
            <X className="w-4 h-4" />
          </button>

          {/* ── Centre play button ── */}
          {!playing && (
            <button
              onMouseDown={(e) => { e.preventDefault(); togglePlay(); }}
              className="absolute inset-0 z-10 flex items-center justify-center group cursor-pointer"
              aria-label="Play WIZ AI demo"
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                <span className="absolute inset-0 rounded-full bg-white/20 animate-ping pointer-events-none" />
                <span className="absolute inset-0 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center transition-all shadow-2xl">
                  <Play className="w-8 h-8 text-black ml-1" />
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
                    ? "linear-gradient(90deg,#8c7830,#d4af37,#c4a464)"
                    : "rgba(255,255,255,0.65)",
                  transition: "background 0.3s ease",
                  boxShadow: wizsoundMode ? "0 0 8px rgba(212,175,55,0.4)" : "none",
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
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                onMouseDown={(e) => { e.preventDefault(); setIsMuted(m => !m); }}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <div className="flex-1" />

              {/* WizSound badge */}
              <div
                className="flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-300"
                style={
                  wizsoundMode
                    ? {
                        borderColor: "rgba(212,175,55,0.4)",
                        background: "rgba(212,175,55,0.12)",
                        boxShadow: "0 0 10px rgba(212,175,55,0.15)",
                      }
                    : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }
                }
              >
                {wizsoundMode ? (
                  <span
                    className="font-bold text-[0.65rem] tracking-wide"
                    style={{
                      background: "linear-gradient(90deg,#d4af37,#c4a464)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    WizSound™ ON
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
                onMouseDown={handleFullscreen}
                className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors cursor-pointer"
                aria-label="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
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
                background: "linear-gradient(90deg,#d4af37,#c4a464)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              WizSound™
            </span>
            {" "}to hear the difference · WIZ AI — six tools, one platform
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
