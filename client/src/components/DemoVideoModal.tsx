import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, Subtitles, Maximize2, Volume2, VolumeX } from "lucide-react";
import { mp } from "@/lib/mixpanel";
import { useGlobalAudio } from "@/contexts/AudioContext";

/* ── Asset URLs ──────────────────────────────────────────────────────── */
const POSTER_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-demo-poster-4k-anXRaxizHsSLrb8pmCTu5A.webp";

// Final demo video URL
const DEMO_VIDEO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid_demo_cd4e1b19.mp4";

/* ── Proxy scene data ────────────────────────────────────────────────── */
interface ProxyScene {
  start: number; // seconds
  end: number;
  label: string;
  sublabel?: string;
  bg: string;
  image?: string;
  type: "text" | "prompt" | "storyboard" | "wizsound" | "output";
}

const PROXY_SCENES: ProxyScene[] = [
  {
    start: 0,
    end: 3,
    label: "Creating videos is slow…",
    bg: "bg-[#0a0a0a]",
    type: "text",
  },
  {
    start: 3,
    end: 6,
    label: "Endless tools. Hours of editing.",
    sublabel: "There has to be a better way.",
    bg: "bg-gradient-to-br from-[#1a0a0a] to-[#0a0a0a]",
    type: "text",
  },
  {
    start: 6,
    end: 9,
    label: "There's a better way.",
    bg: "bg-gradient-to-br from-[#0a1a1a] to-[#0a0a0a]",
    type: "text",
  },
  {
    start: 9,
    end: 15,
    label: "You type a prompt.",
    sublabel: '"Walking through fire, cinematic, epic"',
    bg: "bg-gradient-to-br from-[#0d1117] to-[#0a0a0a]",
    type: "prompt",
  },
  {
    start: 15,
    end: 22,
    label: "WizVid generates your storyboard.",
    sublabel: "Scenes, characters, lighting — all AI.",
    bg: "bg-gradient-to-br from-[#0a0d1a] to-[#0a0a0a]",
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-demo-poster-4k-anXRaxizHsSLrb8pmCTu5A.webp",
    type: "storyboard",
  },
  {
    // WizSound™ enhancement moment — 4 seconds
    start: 22,
    end: 26,
    label: "Enhancing audio with WizSound™…",
    sublabel: "Proprietary audio enhancement for richer, more immersive sound",
    bg: "bg-[#080010]",
    type: "wizsound",
  },
  {
    start: 26,
    end: 34,
    label: "Your cinematic video — ready.",
    sublabel: "No editing. No timeline. Just results.",
    bg: "bg-gradient-to-br from-[#0a0a0a] to-[#0d0a1a]",
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-demo-poster-4k-anXRaxizHsSLrb8pmCTu5A.webp",
    type: "output",
  },
];

const TOTAL_DURATION = 34; // seconds for proxy mode

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
    <div
      className={`flex items-end ${gap}`}
      aria-hidden="true"
      style={{ height: containerH }}
    >
      {heights.map((h, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: barW,
            height: h,
            background: "linear-gradient(to top, #5b21b6, #a78bfa, #e879f9)",
            animation: `wizEq ${0.4 + i * 0.06}s ease-in-out ${i * 0.035}s infinite alternate`,
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
  const timeRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (ts: number) => {
      timeRef.current = ts;
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

/* ── WizSound™ corner badge (shown during output scene) ─────────────── */
function WizSoundBadge() {
  return (
    <div
      className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full border border-violet-500/35 bg-black/70 backdrop-blur-sm px-3 py-1.5"
      style={{ boxShadow: "0 0 16px rgba(109,40,217,0.25)" }}
    >
      <WizSoundEQ size="sm" />
      <div className="flex flex-col leading-none">
        <span
          className="font-bold"
          style={{
            fontSize: "0.65rem",
            background: "linear-gradient(90deg, #a78bfa, #e879f9)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 6px rgba(167,139,250,0.6))",
          }}
        >
          WizSound™
        </span>
        <span className="text-white/40 text-[0.55rem] tracking-wide">Enhanced</span>
      </div>
    </div>
  );
}

/* ── Analytics helper ────────────────────────────────────────────────── */
function track(event: string, data?: Record<string, unknown>) {
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).wizvid_track) {
    ((window as unknown as Record<string, unknown>).wizvid_track as (e: string, d?: unknown) => void)(event, data);
  }
}

/* ── Component ───────────────────────────────────────────────────────── */
interface DemoVideoModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoVideoModal({ open, onClose }: DemoVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  // Use global audio state
  const { isMuted, toggleMute: globalToggleMute, requestAudioFocus, releaseAudioFocus, registerAudioElement, unregisterAudioElement } = useGlobalAudio();
  const [volume, setVolume] = useState(0.8);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoId = "demo-video-modal";
  const [captions, setCaptions] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [proxyTime, setProxyTime] = useState(0);
  // Standard vs WizSound comparison toggle
  const [wizsoundMode, setWizsoundMode] = useState(true);
  const proxyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRealVideo = Boolean(DEMO_VIDEO_URL);

  /* ── Current proxy scene ─────────────────────────────────────────── */
  const currentScene = PROXY_SCENES.find(
    (s) => proxyTime >= s.start && proxyTime < s.end
  ) ?? PROXY_SCENES[PROXY_SCENES.length - 1];

  const sceneProgress =
    currentScene
      ? ((proxyTime - currentScene.start) / (currentScene.end - currentScene.start)) * 100
      : 0;

  /* ── ESC to close ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* ── Reset on close ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) {
      setPlaying(false);
      setProxyTime(0);
      setCurrentTime(0);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        videoRef.current.muted = true;
      }
      releaseAudioFocus(demoId);
      if (proxyTimerRef.current) clearInterval(proxyTimerRef.current);
    } else {
      track("demo_modal_open");
    }
  }, [open]);

  /* ── Proxy timer ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open || hasRealVideo) return;
    if (playing) {
      proxyTimerRef.current = setInterval(() => {
        setProxyTime((t) => {
          const next = t + 0.1;
          if (next >= TOTAL_DURATION) {
            setPlaying(false);
            return TOTAL_DURATION;
          }
          return next;
        });
      }, 100);
    } else {
      if (proxyTimerRef.current) clearInterval(proxyTimerRef.current);
    }
    return () => {
      if (proxyTimerRef.current) clearInterval(proxyTimerRef.current);
    };
  }, [open, playing, hasRealVideo]);

  /* ── Video event handlers ────────────────────────────────────────── */
  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }, []);

  const handleVideoEnded = useCallback(() => {
    mp.demoVideoCompleted();
    track("demo_complete");
    setPlaying(false);
  }, []);

  /* ── Controls ────────────────────────────────────────────────────── */
  const togglePlay = useCallback(() => {
    if (hasRealVideo && videoRef.current) {
      if (playing) {
        videoRef.current.pause();
        track("demo_pause", { time: videoRef.current.currentTime });
        mp.demoVideoPaused(videoRef.current.currentTime);
      } else {
        videoRef.current.play();
        track("demo_play", { time: videoRef.current.currentTime });
        mp.demoVideoPlayed();
      }
    } else {
      if (!playing) { track("demo_play_proxy"); mp.demoVideoPlayed(); }
      else track("demo_pause_proxy");
    }
    setPlaying((p) => !p);
  }, [playing, hasRealVideo]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      requestAudioFocus(demoId);
    }
    globalToggleMute();
    track("demo_mute_toggle", { muted: !isMuted });
  }, [isMuted, globalToggleMute, requestAudioFocus]);

  const handleVolumeChange = useCallback((newVol: number) => {
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
    }
  }, []);

  const toggleCaptions = useCallback(() => {
    setCaptions((c) => !c);
    track("demo_captions_toggle", { on: !captions });
  }, [captions]);

  const handleFullscreen = useCallback(() => {
    const el = document.getElementById("wizvid-demo-modal-video-container");
    if (el?.requestFullscreen) el.requestFullscreen();
  }, []);

  /* ── Progress bar click ──────────────────────────────────────────── */
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      if (hasRealVideo && videoRef.current) {
        videoRef.current.currentTime = ratio * videoRef.current.duration;
      } else {
        setProxyTime(ratio * TOTAL_DURATION);
      }
    },
    [hasRealVideo]
  );

  const progressPercent = hasRealVideo
    ? videoRef.current
      ? (currentTime / (videoRef.current.duration || 1)) * 100
      : 0
    : (proxyTime / TOTAL_DURATION) * 100;

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
            boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(109,40,217,0.15)",
          }}
        >
          {/* ── Standard/WizSound comparison toggle ─────────────────── */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full bg-black/70 border border-white/10 backdrop-blur-md p-1">
            <button
              onClick={() => setWizsoundMode(false)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                !wizsoundMode
                  ? "bg-white/20 text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
              aria-label="Standard audio mode"
              aria-pressed={!wizsoundMode}
            >
              Standard Audio
            </button>
            <button
              onClick={() => setWizsoundMode(true)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                wizsoundMode
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
              style={
                wizsoundMode
                  ? {
                      background: "linear-gradient(90deg, #5b21b6, #7c3aed)",
                      boxShadow: "0 0 12px rgba(109,40,217,0.5)",
                    }
                  : {}
              }
              aria-label="WizSound Cinematic audio mode"
              aria-pressed={wizsoundMode}
            >
              {wizsoundMode && <WizSoundEQ size="sm" />}
              WizSound™
            </button>
          </div>

          {/* ── Floating mute/unmute button on video frame ───────────── */}
          <div
            className="absolute bottom-16 right-4 z-30 flex flex-col items-end gap-2"
            onMouseEnter={() => {
              if (volumeHoverTimerRef.current) clearTimeout(volumeHoverTimerRef.current);
              setShowVolumeSlider(true);
            }}
            onMouseLeave={() => {
              volumeHoverTimerRef.current = setTimeout(() => setShowVolumeSlider(false), 800);
            }}
          >
            {/* Volume slider — shown on hover */}
            {showVolumeSlider && (
              <div
                className="flex flex-col items-center gap-1 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md px-3 py-3"
                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
              >
                <span className="text-white/50 text-[0.6rem] tracking-wide mb-1">VOL</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="h-20 cursor-pointer accent-violet-500"
                  style={{
                    writingMode: "vertical-lr",
                    direction: "rtl",
                  } as React.CSSProperties}
                  aria-label="Volume"
                />
                <span className="text-white/40 text-[0.6rem] tabular-nums mt-1">
                  {isMuted ? "0" : Math.round(volume * 100)}%
                </span>
              </div>
            )}

            {/* Floating mute toggle button */}
            <button
              onClick={toggleMute}
              className="w-10 h-10 rounded-full bg-black/70 border border-white/15 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-black/90 transition-all"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
              aria-label="Toggle sound"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          {/* ── Proxy scene renderer ──────────────────────────────────── */}
          {!hasRealVideo && (
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center ${currentScene.bg} transition-all duration-500`}
            >
              {/* WizSound scene */}
              {currentScene.type === "wizsound" && (
                <div className="flex flex-col items-center gap-6 px-8 text-center">
                  {/* Bloom ring */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "radial-gradient(ellipse at center, rgba(109,40,217,0.25) 0%, transparent 70%)",
                      animation: "wsBloom 1.5s ease-in-out infinite alternate",
                    }}
                  />
                  <div
                    className="absolute w-64 h-64 rounded-full pointer-events-none"
                    style={{
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%,-50%)",
                      border: "1px solid rgba(167,139,250,0.3)",
                      animation: "wsRing 2s ease-in-out infinite alternate",
                    }}
                  />

                  <p className="text-white/40 uppercase tracking-[0.3em] text-xs">Powered by</p>
                  <div
                    className="text-5xl font-black tracking-tight"
                    style={{
                      background: "linear-gradient(135deg, #a78bfa, #e879f9, #a78bfa)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      animation: "wsGlow 1.5s ease-in-out infinite alternate",
                    }}
                  >
                    WizSound™
                  </div>

                  {/* Large EQ waveform */}
                  <div className="flex items-end gap-1" aria-hidden="true">
                    {Array.from({ length: 18 }, (_, i) => {
                      const h = [8, 16, 28, 40, 52, 60, 52, 40, 28, 40, 52, 60, 52, 40, 28, 16, 8, 4][i] ?? 20;
                      return (
                        <div
                          key={i}
                          className="rounded-full"
                          style={{
                            width: 5,
                            height: h,
                            background: "linear-gradient(to top, #5b21b6, #a78bfa, #e879f9)",
                            animation: `wizEq ${0.35 + i * 0.055}s ease-in-out ${i * 0.03}s infinite alternate`,
                            boxShadow: "0 0 8px rgba(167,139,250,0.6)",
                          }}
                        />
                      );
                    })}
                  </div>

                  <p className="text-violet-300/70 text-sm">{currentScene.label}</p>
                  {currentScene.sublabel && (
                    <p className="text-white/40 text-xs max-w-sm">{currentScene.sublabel}</p>
                  )}

                  {/* Animated processing dots */}
                  <div className="flex gap-2" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-violet-400"
                        style={{
                          animation: `wsDot 0.6s ease-in-out ${i * 0.2}s infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Image scenes (storyboard / output) */}
              {(currentScene.type === "storyboard" || currentScene.type === "output") && currentScene.image && (
                <>
                  <img
                    src={currentScene.image}
                    alt={currentScene.label}
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                  />
                  {currentScene.type === "output" && <WizSoundBadge />}
                  <div
                    className="relative z-10 flex flex-col items-center gap-3 px-8 text-center"
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
                  >
                    <p
                      className="font-bold text-white"
                      style={{ fontSize: "clamp(1.1rem, 3vw, 1.6rem)" }}
                    >
                      {currentScene.label}
                    </p>
                    {currentScene.sublabel && (
                      <p className="text-white/70 text-sm">{currentScene.sublabel}</p>
                    )}
                    <div className="w-24 h-0.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-white/60 rounded-full transition-all duration-100"
                        style={{ width: `${sceneProgress}%` }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Text / prompt scenes */}
              {(currentScene.type === "text" || currentScene.type === "prompt") && (
                <>
                  <p
                    className="font-bold text-white text-center px-8"
                    style={{ fontSize: "clamp(1.1rem, 3vw, 1.8rem)", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
                  >
                    {currentScene.label}
                  </p>

                  {currentScene.sublabel && (
                    <p
                      className={`text-center max-w-lg mt-3 ${
                        currentScene.type === "prompt"
                          ? "font-mono text-orange-300 bg-white/5 border border-white/10 rounded-lg px-4 py-2"
                          : "text-white/60"
                      }`}
                      style={{ fontSize: "clamp(0.9rem, 2vw, 1.1rem)" }}
                    >
                      {currentScene.sublabel}
                    </p>
                  )}

                  {/* Scene progress bar */}
                  <div className="w-24 h-0.5 bg-white/10 rounded-full mt-4 overflow-hidden">
                    <div
                      className="h-full bg-white/60 rounded-full transition-all duration-100"
                      style={{ width: `${sceneProgress}%` }}
                    />
                  </div>
                </>
              )}

              {/* Vignette */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
                }}
              />
            </div>
          )}

          {/* ── Real video element (lazy-loaded on first play) ─────────── */}
          {hasRealVideo && (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              poster={POSTER_URL}
              playsInline
              muted={isMuted}
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
              onCanPlay={() => setVideoLoaded(true)}
            >
              <source src={DEMO_VIDEO_URL} type="video/mp4" />
              {captions && (
                <track
                  kind="subtitles"
                  src="/captions/intro-film.vtt"
                  srcLang="en"
                  label="English"
                  default
                />
              )}
            </video>
          )}

          {/* ── Close button ──────────────────────────────────────────── */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-all"
            aria-label="Close demo"
          >
            <X size={18} />
          </button>

          {/* ── Centre play button (when paused) ──────────────────────── */}
          {!playing && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 z-10 flex items-center justify-center group"
              aria-label="Play demo"
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                {/* Pulse rings */}
                <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
                <span className="absolute inset-1 rounded-full bg-white/10 animate-ping [animation-delay:0.3s]" />
                {/* Button */}
                <span className="absolute inset-0 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center transition-all shadow-2xl">
                  <Play size={32} className="text-black ml-1" fill="black" />
                </span>
              </div>
            </button>
          )}

          {/* ── Controls bar ──────────────────────────────────────────── */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-8">
            {/* Waveform canvas — shown when playing */}
            {playing && (
              <div className="mb-2 opacity-70">
                <WaveformCanvas active={playing} wizsound={wizsoundMode} />
              </div>
            )}

            {/* Progress bar */}
            <div
              className="w-full h-1 bg-white/20 rounded-full mb-3 cursor-pointer group"
              onClick={handleProgressClick}
              role="slider"
              aria-label="Video progress"
              aria-valuenow={Math.round(progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {/* Scene markers */}
              {PROXY_SCENES.map((s) => (
                <div
                  key={s.start}
                  className="absolute top-0 bottom-0 w-px bg-white/20"
                  style={{ left: `${(s.start / TOTAL_DURATION) * 100}%` }}
                />
              ))}
              <div
                className="h-full rounded-full transition-all duration-100 relative"
                style={{
                  width: `${progressPercent}%`,
                  background:
                    wizsoundMode
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
                aria-label="Toggle sound"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <div className="flex-1" />

              {/* WizSound™ comparison label */}
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all duration-300"
                style={
                  wizsoundMode
                    ? {
                        borderColor: "rgba(109,40,217,0.4)",
                        background: "rgba(109,40,217,0.15)",
                      }
                    : {
                        borderColor: "rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.05)",
                      }
                }
                aria-label="Compare standard vs cinematic audio"
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

              {/* Time display */}
              <span className="text-white/50 text-xs font-mono tabular-nums">
                {formatTime(hasRealVideo ? currentTime : proxyTime)} /{" "}
                {formatTime(TOTAL_DURATION)}
              </span>

              <button
                onClick={toggleCaptions}
                className={`w-8 h-8 flex items-center justify-center transition-colors ${
                  captions ? "text-white" : "text-white/40 hover:text-white/80"
                }`}
                aria-label="Toggle captions"
                title="Captions"
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

          {/* Loading spinner for real video */}
          {hasRealVideo && !videoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* ── WizSound™ keyframes ────────────────────────────────────── */}
          <style>{`
            @keyframes wizEq {
              0%   { transform: scaleY(0.25); }
              100% { transform: scaleY(1); }
            }
            @keyframes wsBloom {
              0%   { opacity: 0.7; }
              100% { opacity: 1; }
            }
            @keyframes wsRing {
              0%   { opacity: 0.5; transform: translate(-50%, -50%) scale(0.95); }
              100% { opacity: 1;   transform: translate(-50%, -50%) scale(1.05); }
            }
            @keyframes wsGlow {
              0%   { filter: drop-shadow(0 0 18px rgba(167,139,250,0.7)); }
              100% { filter: drop-shadow(0 0 36px rgba(232,121,249,1)); }
            }
            @keyframes wsDot {
              0%   { opacity: 0.3; transform: scale(0.8); }
              100% { opacity: 1;   transform: scale(1.2); }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
