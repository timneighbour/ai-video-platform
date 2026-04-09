import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CarouselVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  tool: "text-to-video" | "lip-sync" | "video-to-video" | "voiceover";
  duration: number;
}

interface VideoCarouselProps {
  videos: CarouselVideo[];
  autoPlayInterval?: number;
}

export default function VideoCarousel({ videos, autoPlayInterval = 5000 }: VideoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || isHovered || videos.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % videos.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [isPlaying, isHovered, videos.length, autoPlayInterval]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (videos.length === 0) {
    return null;
  }

  const currentVideo = videos[currentIndex];

  const toolColors: Record<string, string> = {
    "text-to-video": "from-blue-500 to-purple-500",
    "lip-sync": "from-purple-500 to-pink-500",
    "video-to-video": "from-pink-500 to-orange-500",
    "voiceover": "from-orange-500 to-yellow-500",
  };

  const toolLabels: Record<string, string> = {
    "text-to-video": "Text-to-Video",
    "lip-sync": "Lip-Sync & Avatars",
    "video-to-video": "Video-to-Video",
    "voiceover": "AI Voiceover",
  };

  return (
    <div
      className="relative w-full bg-gradient-to-b from-gray-900 to-black rounded-lg overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video Container */}
      <div className="relative aspect-video bg-black overflow-hidden">
        {/* Video */}
        <video
          key={currentVideo.id}
          src={currentVideo.videoUrl}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-40" />

        {/* Tool Badge */}
        <div className={`absolute top-4 left-4 bg-gradient-to-r ${toolColors[currentVideo.tool]} px-4 py-2 rounded-full`}>
          <span className="text-white font-semibold text-sm">{toolLabels[currentVideo.tool]}</span>
        </div>

        {/* Play/Pause Button (Center) */}
        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              size="lg"
              className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white" />
              )}
            </Button>
          </div>
        )}

        {/* Previous Button */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-full"
          onClick={goToPrevious}
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </Button>

        {/* Next Button */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-full"
          onClick={goToNext}
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </Button>

        {/* Video Info (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
          <h3 className="text-2xl font-bold text-white mb-2">{currentVideo.title}</h3>
          <p className="text-gray-300 text-sm">{currentVideo.description}</p>
        </div>
      </div>

      {/* Carousel Indicators */}
      <div className="flex items-center justify-center gap-2 py-4 bg-gray-900/50">
        {videos.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex
                ? "bg-gradient-to-r from-purple-500 to-blue-500 w-8"
                : "bg-gray-600 hover:bg-gray-500 w-2"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Slide Counter */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900/30 text-gray-400 text-sm">
        <span>
          {currentIndex + 1} / {videos.length}
        </span>
        <span className="text-xs">{currentVideo.duration}s</span>
      </div>
    </div>
  );
}
