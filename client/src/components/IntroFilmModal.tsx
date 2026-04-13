import { useEffect, useRef, useState, useCallback } from "react";
import { X, Play, Volume2, VolumeX, Maximize, Minimize, Captions, CaptionsOff } from "lucide-react";
import { useGlobalAudio } from "@/contexts/AudioContext";

/* ── Asset URLs ─────────────────────────────────────────────────────── */
const ASSETS = {
  // Intro film video — replace with final rendered assets
  introVideoAV1: "", // e.g. /assets/intro-film.av1.webm
  introVideoVP9: "", // e.g. /assets/intro-film.vp9.webm
  introVideoMP4: "", // e.g. /assets/intro-film.mp4
  // Posters
  posterDesktop:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/poster-intro-desktop-2Xh5BzRVD8ty9ef5YUJWz8.webp",
  posterMobile:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/poster-intro-mobile-4ao9q2zXTvr4UsZSusV5ZR.webp",
  // VTT captions
  captionsUrl: "/captions/intro-film.vtt",
  // Storyboard frames for proxy slideshow
  storyboardFrames: [
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/intro-scene1-problem-NUDPXm4zAHrwbTQNxpG2EY.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/intro-scene2-friction-NmEviwrPfokNcXnr4AFVKK.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/intro-scene3-reset-ZDdtyjbTkAHnskxAhb859q.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/intro-scene4-reveal-ZbdCdSTL2JVwthCsunMJ8a.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/intro-scene5-mechanism-8efAUip8Z2FaeyKUU8BxkQ.webp",
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/intro-scene6-payoff-i4oZPuEGtUBVZaXieTDACC.webp",
  ],
};

const SCENE_CAPTIONS = [
  "Every creator starts with a vision...",
  "But turning ideas into video is painful.",
  "What if there was a better way?",
  "Meet WizVid — your AI video studio.",
  "One prompt. Consistent characters. Full storyboard.",
  "Start creating free — your story awaits.",
];

const PROXY_FRAME_DURATION = 4000; // ms per storyboard frame

/* ── Analytics helper ───────────────────────────────────────────────── */
function trackEvent(
  name: string,
  params: Record<string, string | number | boolean> = {}
) {
  try {
    const w = window as any;
    if (w.dataLayer) w.dataLayer.push({ event: name, ...params });
  } catch {
    /* noop */
  }
}

/* ── Component ──────────────────────────────────────────────────────── */
interface IntroFilmModalProps {
  open: boolean;
  onClose: () => void;
}

export default function IntroFilmModal({ open, onClose }: IntroFilmModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const { isMuted, toggleMute: globalToggleMute, requestAudioFocus, releaseAudioFocus } = useGlobalAudio();
  const filmId = "intro-film-modal";
  const [captionsOn, setCaptionsOn] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [proxyFrame, setProxyFrame] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasVideo =
    ASSETS.introVideoAV1 || ASSETS.introVideoVP9 || ASSETS.introVideoMP4;

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      trackEvent("wizvid_intro_opened", {
        video_id: "intro_film",
        video_name: "WizVid Intro Film",
        location: "hero_cta",
      });
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Proxy slideshow timer
  useEffect(() => {
    if (!open || hasVideo || !playing) return;
    const interval = setInterval(() => {
      setProxyFrame((prev) => {
        const next = prev + 1;
        if (next >= ASSETS.storyboardFrames.length) {
          setPlaying(false);
          setProxyFrame(0);
          return 0;
        }
        return next;
      });
    }, PROXY_FRAME_DURATION);
    return () => clearInterval(interval);
  }, [open, hasVideo, playing]);

  // Progress for proxy
  useEffect(() => {
    if (!open || hasVideo || !playing) return;
    const total = ASSETS.storyboardFrames.length * PROXY_FRAME_DURATION;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 100 / (total / 100);
        return Math.min(next, 100);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [open, hasVideo, playing]);

  // Video time update
  useEffect(() => {
    if (!hasVideo || !videoRef.current) return;
    const v = videoRef.current;
    const onTime = () => {
      if (v.duration) setProgress((v.currentTime / v.duration) * 100);
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [hasVideo, videoReady]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handlePlay = useCallback(() => {
    if (hasVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    setPlaying(true);
    setProgress(0);
    trackEvent("wizvid_intro_played", {
      video_id: "intro_film",
      video_name: "WizVid Intro Film",
      location: "hero_cta",
    });
  }, [hasVideo]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      requestAudioFocus(filmId);
    }
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    globalToggleMute();
  }, [isMuted, globalToggleMute, requestAudioFocus]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!fullscreen) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    setFullscreen(!fullscreen);
  }, [fullscreen]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="WizVid Intro Film"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal container */}
      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-5xl mx-4 aspect-video rounded-2xl overflow-hidden bg-[#05060A] shadow-2xl shadow-violet-500/10 border border-white/5"
      >
        {/* ── Poster / Play overlay ──────────────────────────────── */}
        {!playing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <picture>
              <source
                media="(max-width: 768px)"
                srcSet={ASSETS.posterMobile}
                type="image/webp"
              />
              <img
                src={ASSETS.posterDesktop}
                alt="WizVid Intro Film poster"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </picture>
            <div className="absolute inset-0 bg-black/40" />
            <button
              onClick={handlePlay}
              className="relative z-20 group flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 hover:scale-110 transition-all duration-300"
              aria-label="Play intro film"
            >
              <Play className="w-8 h-8 text-white ml-1 group-hover:scale-110 transition-transform" />
              {/* Glow ring */}
              <span className="absolute inset-0 rounded-full border-2 border-violet-400/40 animate-ping" />
            </button>
            <p className="relative z-20 mt-4 text-sm text-[rgba(244,247,255,0.72)] font-medium">
              Watch the 30-second film
            </p>
          </div>
        )}

        {/* ── Video player (lazy-loaded) ─────────────────────────── */}
        {hasVideo && playing && (
          <video
            ref={videoRef}
            muted={isMuted}
            playsInline
            preload="none"
            onCanPlay={() => setVideoReady(true)}
            onEnded={() => {
              setPlaying(false);
              trackEvent("wizvid_intro_completed", {
                video_id: "intro_film",
                video_name: "WizVid Intro Film",
              });
            }}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${videoReady ? "opacity-100" : "opacity-0"}`}
          >
            {ASSETS.introVideoAV1 && (
              <source src={ASSETS.introVideoAV1} type='video/webm; codecs="av01.0.08M.08"' />
            )}
            {ASSETS.introVideoVP9 && (
              <source src={ASSETS.introVideoVP9} type='video/webm; codecs="vp9"' />
            )}
            {ASSETS.introVideoMP4 && (
              <source src={ASSETS.introVideoMP4} type="video/mp4" />
            )}
            {ASSETS.captionsUrl && (
              <track
                kind="captions"
                src={ASSETS.captionsUrl}
                srcLang="en"
                label="English"
                default={captionsOn}
              />
            )}
          </video>
        )}

        {/* ── Proxy storyboard slideshow ─────────────────────────── */}
        {!hasVideo && playing && (
          <div className="absolute inset-0">
            {ASSETS.storyboardFrames.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  opacity: i === proxyFrame ? 1 : 0,
                  transition: "opacity 0.8s ease-in-out",
                  transform: i === proxyFrame ? "scale(1.02)" : "scale(1)",
                }}
              />
            ))}
            {/* Caption overlay for proxy */}
            {captionsOn && SCENE_CAPTIONS[proxyFrame] && (
              <div className="absolute bottom-16 left-0 right-0 flex justify-center z-20">
                <div className="px-6 py-3 bg-black/70 backdrop-blur-sm rounded-lg max-w-lg">
                  <p className="text-white text-center text-base font-medium">
                    {SCENE_CAPTIONS[proxyFrame]}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Controls bar ───────────────────────────────────────── */}
        {playing && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-4 px-4">
            {/* Progress bar */}
            <div className="w-full h-1 bg-white/10 rounded-full mb-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Control buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (hasVideo && videoRef.current) {
                      if (videoRef.current.paused) {
                        videoRef.current.play().catch(() => {});
                      } else {
                        videoRef.current.pause();
                      }
                    }
                  }}
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="Play/Pause"
                >
                  <Play className="w-5 h-5" />
                </button>
                {hasVideo && (
                  <button
                    onClick={toggleMute}
                    className="text-white/80 hover:text-white transition-colors"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCaptionsOn(!captionsOn)}
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label={captionsOn ? "Hide captions" : "Show captions"}
                >
                  {captionsOn ? (
                    <Captions className="w-5 h-5" />
                  ) : (
                    <CaptionsOff className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {fullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Close button ───────────────────────────────────────── */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Close intro film"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
