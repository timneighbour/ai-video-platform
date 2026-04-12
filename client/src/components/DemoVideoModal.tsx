import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Pause, Subtitles, Maximize2, Volume2, VolumeX } from "lucide-react";

/* ── Asset URLs ──────────────────────────────────────────────────────── */
const POSTER_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-demo-poster-4k-anXRaxizHsSLrb8pmCTu5A.webp";

// Final demo video URL — replace with real render when ready
const DEMO_VIDEO_URL = "";

/* ── Proxy scene data (shown until real video is ready) ──────────────── */
interface ProxyScene {
  start: number; // seconds
  end: number;
  label: string;
  sublabel?: string;
  bg: string; // tailwind gradient or solid
  image?: string;
  type: "text" | "prompt" | "storyboard" | "output";
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
    start: 22,
    end: 30,
    label: "Your cinematic video — ready.",
    sublabel: "No editing. No timeline. Just results.",
    bg: "bg-gradient-to-br from-[#0a0a0a] to-[#0d0a1a]",
    image:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-demo-poster-4k-anXRaxizHsSLrb8pmCTu5A.webp",
    type: "output",
  },
];

const TOTAL_DURATION = 30; // seconds for proxy mode

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
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [proxyTime, setProxyTime] = useState(0);
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
      }
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
    setPlaying(false);
    track("demo_complete");
  }, []);

  /* ── Controls ────────────────────────────────────────────────────── */
  const togglePlay = useCallback(() => {
    if (hasRealVideo && videoRef.current) {
      if (playing) {
        videoRef.current.pause();
        track("demo_pause", { time: videoRef.current.currentTime });
      } else {
        videoRef.current.play();
        track("demo_play", { time: videoRef.current.currentTime });
      }
    } else {
      if (!playing) track("demo_play_proxy");
      else track("demo_pause_proxy");
    }
    setPlaying((p) => !p);
  }, [playing, hasRealVideo]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) videoRef.current.muted = !muted;
    setMuted((m) => !m);
    track("demo_mute_toggle", { muted: !muted });
  }, [muted]);

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

      {/* Modal container */}
      <div
        id="wizvid-demo-modal-video-container"
        className="relative z-10 w-full max-w-5xl mx-4 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-300"
        style={{ aspectRatio: "16/9" }}
      >
        {/* ── Poster / proxy scene background ───────────────────────── */}
        {!playing && !hasRealVideo && (
          <div className="absolute inset-0">
            <img
              src={POSTER_URL}
              alt="WizVid demo poster"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
            {/* Poster overlay text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <p className="text-white/60 text-sm font-medium tracking-widest uppercase">
                30-second demo
              </p>
              <h2 className="text-white text-3xl sm:text-4xl font-bold text-center leading-tight">
                See how WizVid works
              </h2>
              <p className="text-white/70 text-base text-center max-w-sm">
                Type a prompt. Get a cinematic video. No editing required.
              </p>
            </div>
          </div>
        )}

        {/* ── Proxy animated scene (playing, no real video) ──────────── */}
        {playing && !hasRealVideo && (
          <div
            className={`absolute inset-0 transition-all duration-700 ${currentScene.bg}`}
          >
            {/* Background image for storyboard/output scenes */}
            {currentScene.image && (
              <img
                src={currentScene.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
            )}

            {/* Film grain overlay */}
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
                backgroundSize: "200px 200px",
              }}
            />

            {/* Anamorphic letterbox bars */}
            <div className="absolute top-0 left-0 right-0 h-[6%] bg-black" />
            <div className="absolute bottom-0 left-0 right-0 h-[6%] bg-black" />

            {/* Scene content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 gap-4">
              {/* Scene type badge */}
              {currentScene.type === "prompt" && (
                <div className="px-3 py-1 rounded-full border border-white/20 bg-white/5 text-white/50 text-xs font-mono tracking-widest uppercase mb-2">
                  Prompt
                </div>
              )}
              {currentScene.type === "storyboard" && (
                <div className="px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-mono tracking-widest uppercase mb-2">
                  Generating storyboard…
                </div>
              )}
              {currentScene.type === "output" && (
                <div className="px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-mono tracking-widest uppercase mb-2">
                  ✓ Video ready
                </div>
              )}

              <h3
                className="text-white font-bold text-center leading-tight"
                style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}
              >
                {currentScene.label}
              </h3>

              {currentScene.sublabel && (
                <p
                  className={`text-center max-w-lg ${
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
            </div>

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
            muted={muted}
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
            <div
              className="h-full bg-white rounded-full transition-all duration-100 relative"
              style={{ width: `${progressPercent}%` }}
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
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <div className="flex-1" />

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
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
