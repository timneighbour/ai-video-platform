/**
 * ShowcaseVideoSection — shared premium showcase block used on landing pages.
 *
 * Props:
 *   title        — section headline (defaults to "See what WIZ AI can create")
 *   subtitle     — optional sub-label above the headline
 *   description  — optional body copy below the headline
 *   ctaLabel     — CTA button text (defaults to "Start Creating")
 *   ctaHref      — CTA link destination (defaults to "/onboarding")
 *   items        — array of ShowcaseItem (from DB or static fallback)
 *   maxItems     — how many items to display (defaults to 3)
 *   onCtaClick   — optional click handler (for analytics events)
 *
 * If no items are provided, a polished "Showcase video coming soon" placeholder
 * is rendered instead.
 */
import { useState, useRef } from "react";
import { Play, Sparkles } from "@/lib/icons";
import { Link } from "wouter";

export interface ShowcaseItem {
  id: number;
  title: string;
  category: string;
  description: string;
  posterUrl: string;
  videoUrl?: string | null;
}

interface ShowcaseVideoSectionProps {
  title?: string;
  subtitle?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  items?: ShowcaseItem[];
  maxItems?: number;
  onCtaClick?: () => void;
  className?: string;
}

function VideoCard({ item }: { item: ShowcaseItem }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function handlePlay() {
    if (!item.videoUrl) return;
    setPlaying(true);
    setTimeout(() => videoRef.current?.play(), 50);
  }

  function handlePause() {
    setPlaying(false);
    videoRef.current?.pause();
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden group cursor-pointer"
      style={{ border: "1px solid rgba(196,164,100,0.12)", background: "#0d0d0d" }}
      onClick={playing ? handlePause : handlePlay}
    >
      {/* Poster / video */}
      <div className="relative aspect-video w-full overflow-hidden">
        {item.videoUrl && playing ? (
          <video
            ref={videoRef}
            src={item.videoUrl}
            poster={item.posterUrl}
            className="w-full h-full object-cover"
            playsInline
            muted
            loop
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <img
            src={item.posterUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* Overlay gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.0) 60%)" }}
        />

        {/* Play button */}
        {item.videoUrl && !playing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-sm transition-transform duration-200 group-hover:scale-110"
              style={{ background: "rgba(196,164,100,0.18)", border: "1px solid rgba(196,164,100,0.4)" }}
            >
              <Play className="w-6 h-6 text-[--color-gold] ml-1" />
            </div>
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span
            className="text-[10px] font-bold tracking-[0.2em] uppercase px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.6)", color: "rgba(196,164,100,0.9)", border: "1px solid rgba(196,164,100,0.2)", backdropFilter: "blur(8px)" }}
          >
            {item.category}
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="p-5">
        <h3 className="text-white font-semibold text-sm mb-1.5 leading-snug">{item.title}</h3>
        <p className="text-white/45 text-xs leading-relaxed">{item.description}</p>
      </div>
    </div>
  );
}

function PlaceholderCard({ index }: { index: number }) {
  const labels = ["Music Video", "AI Animation", "Cinematic Scene"];
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(196,164,100,0.08)", background: "#0d0d0d" }}
    >
      <div className="aspect-video w-full flex flex-col items-center justify-center gap-3" style={{ background: "linear-gradient(135deg, #111 0%, #0a0a0a 100%)" }}>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(196,164,100,0.06)", border: "1px solid rgba(196,164,100,0.15)" }}
        >
          <Play className="w-5 h-5 text-[--color-gold]/40 ml-0.5" />
        </div>
        <p className="text-white/20 text-xs font-medium tracking-wide">Showcase video coming soon</p>
      </div>
      <div className="p-5">
        <div className="h-3 rounded-full bg-white/5 mb-2 w-3/4" />
        <div className="h-2.5 rounded-full bg-white/[0.03] w-full mb-1.5" />
        <div className="h-2.5 rounded-full bg-white/[0.03] w-2/3" />
        <div className="mt-3">
          <span
            className="text-[10px] font-bold tracking-[0.2em] uppercase px-2.5 py-1 rounded-full"
            style={{ background: "rgba(196,164,100,0.05)", color: "rgba(196,164,100,0.3)", border: "1px solid rgba(196,164,100,0.08)" }}
          >
            {labels[index % labels.length]}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ShowcaseVideoSection({
  title = "See what WIZ AI can create",
  subtitle = "Created with WIZ AI",
  description,
  ctaLabel = "Start Creating",
  ctaHref = "/onboarding",
  items,
  maxItems = 3,
  onCtaClick,
  className = "",
}: ShowcaseVideoSectionProps) {
  const hasItems = items && items.length > 0;
  const displayItems = hasItems ? items.slice(0, maxItems) : [];
  const placeholderCount = hasItems ? 0 : maxItems;

  return (
    <section
      className={`relative bg-[#040404] py-24 px-6 ${className}`}
      style={{ borderTop: "1px solid rgba(196,164,100,0.06)" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          {subtitle && (
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">
              {subtitle}
            </p>
          )}
          <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-black tracking-tight text-white mb-4">
            {title}
          </h2>
          {description && (
            <p className="text-white/50 text-base max-w-xl mx-auto leading-relaxed">{description}</p>
          )}
        </div>

        {/* Cards grid */}
        <div className={`grid gap-6 mb-12 ${maxItems === 1 ? "max-w-2xl mx-auto" : maxItems === 2 ? "sm:grid-cols-2 max-w-3xl mx-auto" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {displayItems.map((item) => (
            <VideoCard key={item.id} item={item} />
          ))}
          {Array.from({ length: placeholderCount }).map((_, i) => (
            <PlaceholderCard key={`placeholder-${i}`} index={i} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href={ctaHref}
            onClick={onCtaClick}
            className="inline-flex items-center gap-2 bg-[--color-gold] hover:bg-[--color-gold-dark] text-black font-bold px-8 py-3.5 rounded-xl transition-all duration-200 text-sm shadow-[0_0_30px_rgba(196,164,100,0.25)] hover:shadow-[0_0_40px_rgba(196,164,100,0.35)]"
          >
            <Sparkles className="w-4 h-4" />
            {ctaLabel}
          </Link>
          <p className="text-white/25 text-xs mt-3">Free to create · No credit card · Only pay when you're ready</p>
        </div>
      </div>
    </section>
  );
}
