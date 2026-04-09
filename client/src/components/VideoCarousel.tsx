import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Video, Mic, Wand2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CarouselVideo {
  id: string;
  title: string;
  description: string;
  videoUrl?: string;
  tool: "text-to-video" | "lip-sync" | "video-to-video" | "voiceover";
  duration: number;
  tagline?: string;
}

interface VideoCarouselProps {
  videos: CarouselVideo[];
  autoPlayInterval?: number;
}

const toolConfig: Record<string, {
  label: string;
  gradient: string;
  bgGradient: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  particles: string[];
}> = {
  "text-to-video": {
    label: "Text-to-Video",
    gradient: "from-blue-500 via-purple-500 to-violet-600",
    bgGradient: "from-blue-900/40 via-purple-900/60 to-black",
    icon: Video,
    accentColor: "#7c3aed",
    particles: ["🎬", "✨", "🌟", "💫", "🎥"],
  },
  "lip-sync": {
    label: "Lip-Sync & Avatars",
    gradient: "from-purple-500 via-pink-500 to-rose-500",
    bgGradient: "from-purple-900/40 via-pink-900/60 to-black",
    icon: Mic,
    accentColor: "#ec4899",
    particles: ["🎤", "👤", "💬", "🗣️", "🎭"],
  },
  "video-to-video": {
    label: "Video-to-Video",
    gradient: "from-pink-500 via-orange-500 to-amber-500",
    bgGradient: "from-pink-900/40 via-orange-900/60 to-black",
    icon: Wand2,
    accentColor: "#f97316",
    particles: ["🎨", "🖌️", "✨", "🌈", "⚡"],
  },
  "voiceover": {
    label: "AI Voiceover",
    gradient: "from-cyan-500 via-teal-500 to-emerald-500",
    bgGradient: "from-cyan-900/40 via-teal-900/60 to-black",
    icon: Sparkles,
    accentColor: "#06b6d4",
    particles: ["🎙️", "🔊", "🌊", "💎", "🎵"],
  },
};

function AnimatedPlaceholder({ tool, title, description, tagline }: {
  tool: string;
  title: string;
  description: string;
  tagline?: string;
}) {
  const config = toolConfig[tool] ?? toolConfig["text-to-video"];
  const Icon = config.icon;

  return (
    <div className={`w-full h-full bg-gradient-to-br ${config.bgGradient} flex flex-col items-center justify-center relative overflow-hidden`}>
      {/* Animated background orbs */}
      <div
        className="absolute w-64 h-64 rounded-full opacity-20 blur-3xl animate-pulse"
        style={{ background: config.accentColor, top: "10%", left: "10%" }}
      />
      <div
        className="absolute w-48 h-48 rounded-full opacity-15 blur-2xl animate-pulse"
        style={{ background: config.accentColor, bottom: "15%", right: "15%", animationDelay: "1s" }}
      />

      {/* Grid lines */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(${config.accentColor} 1px, transparent 1px), linear-gradient(90deg, ${config.accentColor} 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 gap-4">
        {/* Icon with glow */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-2"
          style={{
            background: `linear-gradient(135deg, ${config.accentColor}33, ${config.accentColor}11)`,
            border: `1px solid ${config.accentColor}44`,
            boxShadow: `0 0 30px ${config.accentColor}33`,
          }}
        >
          <Icon className="w-10 h-10 text-white" />
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          {config.particles.map((particle, i) => (
            <span
              key={i}
              className="absolute text-2xl opacity-30 animate-bounce"
              style={{
                top: `${15 + i * 15}%`,
                left: `${5 + i * 18}%`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: `${2 + i * 0.3}s`,
              }}
            >
              {particle}
            </span>
          ))}
        </div>

        <h3 className="text-3xl font-bold text-white leading-tight">{title}</h3>
        {tagline && (
          <p className={`text-sm font-semibold bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
            {tagline}
          </p>
        )}
        <p className="text-gray-300 text-sm max-w-sm leading-relaxed">{description}</p>

        {/* Animated waveform for voiceover */}
        {tool === "voiceover" && (
          <div className="flex items-center gap-1 mt-2">
            {[3, 6, 9, 5, 8, 4, 7, 10, 5, 6, 3, 8].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full animate-pulse"
                style={{
                  height: `${h * 3}px`,
                  background: config.accentColor,
                  opacity: 0.7,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Demo badge */}
        <div
          className="mt-2 px-4 py-1.5 rounded-full text-xs font-semibold text-white"
          style={{
            background: `linear-gradient(135deg, ${config.accentColor}66, ${config.accentColor}33)`,
            border: `1px solid ${config.accentColor}55`,
          }}
        >
          AI-Powered Demo
        </div>
      </div>
    </div>
  );
}

export default function VideoCarousel({ videos, autoPlayInterval = 6000 }: VideoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [videoError, setVideoError] = useState<Record<string, boolean>>({});
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isAutoPlaying || isHovered || videos.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % videos.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [isAutoPlaying, isHovered, videos.length, autoPlayInterval]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (videos.length === 0) return null;

  const currentVideo = videos[currentIndex];
  const config = toolConfig[currentVideo.tool] ?? toolConfig["text-to-video"];
  const hasWorkingVideo = currentVideo.videoUrl && !videoError[currentVideo.id];

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-white/10"
      style={{ boxShadow: `0 0 60px ${config.accentColor}22` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main display area */}
      <div className="relative aspect-video bg-black overflow-hidden">
        {hasWorkingVideo ? (
          <video
            ref={videoRef}
            key={currentVideo.id}
            src={currentVideo.videoUrl}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoError((prev) => ({ ...prev, [currentVideo.id]: true }))}
          />
        ) : (
          <AnimatedPlaceholder
            tool={currentVideo.tool}
            title={currentVideo.title}
            description={currentVideo.description}
            tagline={currentVideo.tagline}
          />
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Tool badge */}
        <div className={`absolute top-4 left-4 bg-gradient-to-r ${config.gradient} px-4 py-1.5 rounded-full`}>
          <span className="text-white font-semibold text-xs tracking-wide">{config.label}</span>
        </div>

        {/* Auto-play indicator */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/60 transition border border-white/10"
            aria-label={isAutoPlaying ? "Pause slideshow" : "Play slideshow"}
          >
            {isAutoPlaying ? (
              <Pause className="w-3.5 h-3.5 text-white" />
            ) : (
              <Play className="w-3.5 h-3.5 text-white" />
            )}
          </button>
        </div>

        {/* Navigation arrows */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur rounded-full border border-white/10 text-white"
          onClick={goToPrevious}
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur rounded-full border border-white/10 text-white"
          onClick={goToNext}
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h3 className="text-xl font-bold text-white mb-1">{currentVideo.title}</h3>
          <p className="text-gray-300 text-sm leading-relaxed">{currentVideo.description}</p>
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="flex bg-gray-950 border-t border-white/5">
        {videos.map((video, index) => {
          const thumbConfig = toolConfig[video.tool] ?? toolConfig["text-to-video"];
          const ThumbIcon = thumbConfig.icon;
          const isActive = index === currentIndex;
          return (
            <button
              key={video.id}
              onClick={() => goToSlide(index)}
              className={`flex-1 py-3 px-2 flex flex-col items-center gap-1.5 transition-all ${
                isActive ? "bg-white/5" : "hover:bg-white/3"
              }`}
              style={{
                borderBottom: isActive ? `2px solid ${thumbConfig.accentColor}` : "2px solid transparent",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${thumbConfig.accentColor}44, ${thumbConfig.accentColor}22)`
                    : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isActive ? thumbConfig.accentColor + "55" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <div style={{ color: isActive ? thumbConfig.accentColor : "#6b7280" }}>
                <ThumbIcon className="w-4 h-4" />
              </div>
              </div>
              <span
                className="text-xs font-medium hidden sm:block truncate max-w-full"
                style={{ color: isActive ? "white" : "#6b7280" }}
              >
                {thumbConfig.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
