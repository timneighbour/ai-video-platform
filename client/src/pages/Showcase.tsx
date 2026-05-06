/**
 * Showcase — Premium curated AI video gallery for WIZ AI.
 *
 * Layout:
 * - Full-width cinematic hero with autoplay video + CTA
 * - Category filter bar (All, Music Videos, Shorts, Animation, etc.)
 * - Netflix-style responsive grid with hover play overlays
 * - Full-screen lightbox modal with video playback
 * - Dark luxury styling, gold accents, mobile responsive
 *
 * Content: Curated by admin. Structure supports future user submissions,
 * featured creator profiles, approval/moderation, and like/share buttons.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSEO } from "@/hooks/useSEO";
import { trpc } from "@/lib/trpc";
import { Play, Pause, X, ChevronRight, Sparkles, Volume2, VolumeX } from "@/lib/icons";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShowcaseItem {
  id: number;
  title: string;
  category: string;
  description: string;
  posterUrl: string;
  videoUrl?: string | null;
  /** Future fields for creator profiles, likes, badges */
  creatorName?: string;
  tool?: string;
  featured?: boolean;
}

// ─── CDN base for showcase assets ────────────────────────────────────────────
const _SC = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";

// ─── Curated showcase content ─────────────────────────────────────────────────
// Each item uses a real CDN asset. Thumbnails are .webp, videos are .mp4.
// Categories map to the filter bar. Add new items here as content grows.
const CURATED_ITEMS: ShowcaseItem[] = [
  {
    id: 30001,
    title: "Midnight City",
    category: "Music Videos",
    tool: "WizVideo",
    featured: true,
    posterUrl: `${_SC}/showcase-cinematic-jTTeeqZXf4L3U5HPJLwD4n.webp`,
    videoUrl: `${_SC}/showcase-cinematic_13667434.mp4`,
    description: "A lone figure walks rain-soaked streets under warm city lights. Generated from a single text prompt in under three minutes.",
    creatorName: "WIZ AI Demo",
  },
  {
    id: 30002,
    title: "Stage Performance",
    category: "Music Videos",
    tool: "WizVideo",
    posterUrl: `${_SC}/showcase-music-video-6dF3UkNuwxfUVSax7gz7xi.webp`,
    videoUrl: `${_SC}/showcase-music-video_19324f13.mp4`,
    description: "A full music video with synced visuals, concert lighting, and cinematic effects. Created from an uploaded track.",
    creatorName: "WIZ AI Demo",
  },
  {
    id: 30003,
    title: "Star Quest — Kids Intro",
    category: "Animation",
    tool: "WizAnimate",
    posterUrl: `${_SC}/showcase-kids-fxm6wHeSYgLJUHFdQPtC6r.webp`,
    videoUrl: `${_SC}/showcase-kids_d49d86f8.mp4`,
    description: "Cinematic 3D animation for a kids YouTube channel. Generated from a character description and theme prompt.",
    creatorName: "WIZ AI Demo",
  },
  {
    id: 30004,
    title: "Cherry Blossom",
    category: "Animation",
    tool: "WizAnimate",
    posterUrl: `${_SC}/showcase-anime-gdkPWj4zZ3wPdwmswMeaY9.webp`,
    videoUrl: `${_SC}/showcase-anime_36099b49.mp4`,
    description: "Fluid anime-style visuals with cherry blossom transitions. Generated entirely from a mood and colour palette prompt.",
    creatorName: "WIZ AI Demo",
  },
  {
    id: 30005,
    title: "The Enchanted Forest",
    category: "Shorts",
    tool: "WizShorts",
    posterUrl: `${_SC}/showcase-story-USepA6hkPxe97oTtpWXhtt.webp`,
    videoUrl: `${_SC}/showcase-story_ffc51308.mp4`,
    description: "A magical forest short with cinematic lighting and character animation. Generated from a narrative prompt.",
    creatorName: "WIZ AI Demo",
  },
  {
    id: 30006,
    title: "Ancient Ruins",
    category: "Social Content",
    tool: "WizScript",
    posterUrl: `${_SC}/showcase-faceless-czjqMEgbKbB2YQHLyDgQBB.webp`,
    videoUrl: `${_SC}/showcase-faceless_9566b108.mp4`,
    description: "A documentary-style faceless video exploring ancient ruins. No presenter needed — just a topic and a style.",
    creatorName: "WIZ AI Demo",
  },
  // Additional items using existing project CDN imagery as visual showcases
  {
    id: 30007,
    title: "Concert Hall — Cinematic",
    category: "Music Videos",
    tool: "WizVideo",
    posterUrl: "/manus-storage/concert-hall_2b6b946b.jpg",
    videoUrl: `/manus-storage/demo-video-only_404f1adb.mp4`,
    description: "A sweeping cinematic concert hall sequence with dramatic lighting. Produced from a single scene description.",
    creatorName: "WIZ AI Demo",
  },
  {
    id: 30008,
    title: "Studio Session",
    category: "Social Content",
    tool: "WizScript",
    posterUrl: "/manus-storage/studio-console_91324aaa.jpg",
    videoUrl: null,
    description: "A behind-the-scenes studio content piece for social media. Created using WizScript's faceless content engine.",
    creatorName: "WIZ AI Demo",
  },
  {
    id: 30009,
    title: "Sphere Concert",
    category: "Music Videos",
    tool: "WizVideo",
    posterUrl: "/manus-storage/sphere-concert_e0e5b1d0.jpg",
    videoUrl: null,
    description: "Immersive 360° concert visuals inspired by the Las Vegas Sphere. Generated from a venue and mood description.",
    creatorName: "WIZ AI Demo",
  },
  {
    id: 30010,
    title: "Moody Studio Vibes",
    category: "Social Content",
    tool: "WizImage",
    posterUrl: "/manus-storage/studio-moody_02c867cc.jpg",
    videoUrl: null,
    description: "A series of atmospheric studio images for Instagram and press kits. Generated with WizImage in minutes.",
    creatorName: "WIZ AI Demo",
  },
  {
    id: 30011,
    title: "Stage Spotlight",
    category: "Music Videos",
    tool: "WizVideo",
    posterUrl: "/manus-storage/showcase-stage-performance_3379ee75.jpg",
    videoUrl: `/manus-storage/tier-standard-demo_9df28025.mp4`,
    description: "A high-energy stage performance video with dramatic spotlight effects. Created with WizVideo from a performance brief.",
    creatorName: "WIZ AI Demo",
  },
  {
    id: 30012,
    title: "WIZ AI Cinematic Intro",
    category: "Commercial / Brand",
    tool: "WizVideo",
    posterUrl: "/manus-storage/music-studio-bg_207e72b0.jpg",
    videoUrl: `/manus-storage/wizai-intro-wizsound-pure_8c53762c.mp4`,
    description: "The official WIZ AI brand intro — a cinematic showcase of what's possible when AI meets creative vision.",
    creatorName: "WIZ AI Studio",
  },
];

// ─── Category definitions ─────────────────────────────────────────────────────
// Only show categories that have at least one item
const ALL_CATEGORIES = ["All", "Music Videos", "Shorts", "Animation", "Social Content", "Commercial / Brand"];

// ─── Lightbox Modal ───────────────────────────────────────────────────────────

function LightboxModal({ item, onClose }: { item: ShowcaseItem; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Auto-play when modal opens
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !item.videoUrl) return;
    const t = setTimeout(() => {
      video.play().then(() => setPlaying(true)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [item.videoUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) { video.pause(); setPlaying(false); }
    else { video.play(); setPlaying(true); }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) videoRef.current.muted = !muted;
    setMuted((m) => !m);
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/60 hover:text-white transition-colors flex items-center gap-2 text-sm"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
          <span className="hidden sm:inline">Close</span>
        </button>

        {/* Video / Image container */}
        <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl" style={{ boxShadow: "0 0 80px rgba(196,164,100,0.12)" }}>
          {item.videoUrl ? (
            <>
              <video
                ref={videoRef}
                src={item.videoUrl}
                poster={item.posterUrl}
                muted={muted}
                playsInline
                loop
                className="w-full aspect-video object-cover"
                onEnded={() => setPlaying(false)}
                onClick={togglePlay}
              />
              {/* Play/pause overlay — only when paused */}
              {!playing && (
                <div
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  onClick={togglePlay}
                >
                  <div className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                    <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                  </div>
                </div>
              )}
              {/* Controls bar */}
              <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-4"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
                <div>
                  <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full mr-2"
                    style={{ background: "rgba(196,164,100,0.15)", color: "#c4a464", border: "1px solid rgba(196,164,100,0.2)" }}>
                    {item.category}
                  </span>
                  {item.tool && (
                    <span className="text-[10px] font-semibold tracking-wider text-white/40">{item.tool}</span>
                  )}
                </div>
                <button onClick={toggleMute} className="text-white/60 hover:text-white transition-colors" aria-label="Toggle mute">
                  {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </>
          ) : (
            <img src={item.posterUrl} alt={item.title} className="w-full aspect-video object-cover" />
          )}
        </div>

        {/* Info below video */}
        <div className="mt-5 px-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{item.title}</h2>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">{item.description}</p>
            </div>
            <Link href="/create">
              <a className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #c4a464 0%, #e8c97a 50%, #c4a464 100%)", boxShadow: "0 0 20px rgba(196,164,100,0.3)" }}>
                <Sparkles className="w-4 h-4" />
                Create Yours
              </a>
            </Link>
          </div>
          {item.creatorName && (
            <p className="mt-3 text-xs text-zinc-600">
              Made with WIZ AI · {item.tool} · <span className="text-zinc-500">{item.creatorName}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Hero Featured Item ───────────────────────────────────────────────────────

function ShowcaseHero({ item, onPlay }: { item: ShowcaseItem; onPlay: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !item.videoUrl) return;
    video.play().catch(() => {});
  }, [item.videoUrl]);

  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: "min(60vh, 520px)" }}>
      {/* Background video / image */}
      <div className="absolute inset-0">
        {item.videoUrl ? (
          <video
            ref={videoRef}
            src={item.videoUrl}
            poster={item.posterUrl}
            muted
            playsInline
            loop
            autoPlay
            className="w-full h-full object-cover"
            onCanPlay={() => setVideoLoaded(true)}
            style={{ opacity: videoLoaded ? 1 : 0, transition: "opacity 0.8s ease" }}
          />
        ) : null}
        <img
          src={item.posterUrl}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: videoLoaded ? 0 : 1, transition: "opacity 0.8s ease" }}
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(3,3,3,0.85) 0%, rgba(3,3,3,0.4) 50%, rgba(3,3,3,0.1) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(3,3,3,0.9) 0%, transparent 50%)" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full px-6 md:px-12 pb-10 pt-16" style={{ minHeight: "min(60vh, 520px)" }}>
        {/* Featured badge */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] font-black tracking-[0.25em] uppercase px-3 py-1.5 rounded-full"
            style={{ background: "linear-gradient(135deg, #c4a464, #e8c97a)", color: "#0a0a14" }}>
            Featured
          </span>
          <span className="text-xs font-semibold tracking-widest uppercase text-white/40">{item.category}</span>
          {item.tool && <span className="text-xs text-white/30">· {item.tool}</span>}
        </div>

        <h2 className="text-3xl md:text-5xl font-black text-white mb-3 leading-tight max-w-xl">{item.title}</h2>
        <p className="text-zinc-300 text-sm md:text-base max-w-lg mb-6 leading-relaxed">{item.description}</p>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onPlay}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #c4a464 0%, #e8c97a 50%, #c4a464 100%)", boxShadow: "0 0 24px rgba(196,164,100,0.35)" }}
          >
            <Play className="w-4 h-4" fill="currentColor" />
            Watch Now
          </button>
          <Link href="/create">
            <a className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
              <Sparkles className="w-4 h-4" />
              Create Yours
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────

function ShowcaseCard({ item, onOpen }: { item: ShowcaseItem; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    setHovered(true);
    if (item.videoUrl && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
      style={{
        background: "#0d0d0d",
        border: hovered ? "1px solid rgba(196,164,100,0.4)" : "1px solid rgba(255,255,255,0.06)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? "0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(196,164,100,0.08)" : "0 4px 20px rgba(0,0,0,0.4)",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onOpen}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video overflow-hidden">
        {/* Poster image — always present */}
        <img
          src={item.posterUrl}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700"
          style={{ transform: hovered ? "scale(1.05)" : "scale(1)" }}
        />

        {/* Video preview on hover */}
        {item.videoUrl && (
          <video
            ref={videoRef}
            src={item.videoUrl}
            muted
            playsInline
            loop
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            style={{ opacity: hovered ? 1 : 0 }}
          />
        )}

        {/* Dark overlay */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)",
            opacity: hovered ? 1 : 0.5,
          }}
        />

        {/* Play button */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-all duration-300"
          style={{ opacity: hovered ? 1 : 0 }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-200"
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.25)",
              backdropFilter: "blur(6px)",
              transform: hovered ? "scale(1)" : "scale(0.8)",
            }}
          >
            <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span
            className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
            style={{ background: "rgba(196,164,100,0.15)", color: "#c4a464", border: "1px solid rgba(196,164,100,0.2)" }}
          >
            {item.category}
          </span>
        </div>

        {/* Tool badge top-right */}
        {item.tool && (
          <div className="absolute top-3 right-3">
            <span className="text-[9px] font-semibold tracking-wider text-white/40 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
              {item.tool}
            </span>
          </div>
        )}

        {/* Image-only badge */}
        {!item.videoUrl && (
          <div className="absolute bottom-3 right-3">
            <span className="text-[9px] font-semibold tracking-wider text-white/50 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
              Image
            </span>
          </div>
        )}
      </div>

      {/* Card info */}
      <div className="p-4">
        <h3 className="font-bold text-white text-sm mb-1.5 line-clamp-1 group-hover:text-[#e8c97a] transition-colors">{item.title}</h3>
        <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed">{item.description}</p>
        {item.creatorName && (
          <p className="mt-2 text-[10px] text-zinc-700">Made with WIZ AI</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ShowcasePage() {
  useSEO({
    title: "Showcase — WIZ AI | AI-Generated Videos & Animations",
    path: "/showcase",
    description: "Watch AI-generated music videos, animations, shorts, and brand content created with WIZ AI. See what's possible — then create your own.",
  });

  // DB items override fallback when available (future admin CMS)
  const { data: dbItems } = trpc.showcase.list.useQuery();
  const items: ShowcaseItem[] = (dbItems && dbItems.length > 0)
    ? dbItems.map((i) => ({ ...i, featured: i.id === dbItems[0].id }))
    : CURATED_ITEMS;

  // Category filter
  const availableCategories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];
  const categories = ALL_CATEGORIES.filter((c) => availableCategories.includes(c));
  const [activeCategory, setActiveCategory] = useState("All");

  // Lightbox
  const [lightboxItem, setLightboxItem] = useState<ShowcaseItem | null>(null);
  const openLightbox = useCallback((item: ShowcaseItem) => setLightboxItem(item), []);
  const closeLightbox = useCallback(() => setLightboxItem(null), []);

  // Featured item = first item with featured:true, or first item
  const featuredItem = items.find((i) => i.featured) ?? items[0];

  // Grid items = all except featured (or all if category filtered)
  const gridItems = activeCategory === "All"
    ? items.filter((i) => i.id !== featuredItem.id)
    : items.filter((i) => i.category === activeCategory);

  return (
    <div className="min-h-screen text-white" style={{ background: "#030303" }}>

      {/* ── Nav bar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: "rgba(3,3,3,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/">
          <a className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm">
            <img
              src="/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png"
              alt="WIZ AI"
              className="h-7 w-auto"
            />
          </a>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/pricing">
            <a className="hidden sm:block text-zinc-400 hover:text-white text-sm transition-colors">Pricing</a>
          </Link>
          <Link href="/create">
            <a className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs text-white transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #c4a464, #e8c97a)", boxShadow: "0 0 16px rgba(196,164,100,0.25)" }}>
              <Sparkles className="w-3.5 h-3.5" />
              Start Creating
            </a>
          </Link>
        </div>
      </nav>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 pt-10 pb-6">
        <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-3"
          style={{ color: "rgba(196,164,100,0.5)" }}>
          WIZ AI — Curated Showcase
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
              AI Creations Gallery
            </h1>
            <p className="text-zinc-500 text-sm mt-2 max-w-lg">
              Real outputs from WIZ AI tools. Every video, animation, and image is AI-generated — no editing required.
            </p>
          </div>
          <Link href="/create">
            <a className="shrink-0 flex items-center gap-2 text-sm font-semibold transition-colors"
              style={{ color: "#c4a464" }}>
              Create your own
              <ChevronRight className="w-4 h-4" />
            </a>
          </Link>
        </div>
      </div>

      {/* ── Hero featured item ───────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 pb-8">
        <div className="rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <ShowcaseHero item={featuredItem} onPlay={() => openLightbox(featuredItem)} />
        </div>
      </div>

      {/* ── Category filter bar ──────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 pb-6">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="shrink-0 px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-200"
              style={
                activeCategory === cat
                  ? {
                      background: "linear-gradient(135deg, #c4a464, #e8c97a)",
                      color: "#0a0a14",
                      boxShadow: "0 0 16px rgba(196,164,100,0.3)",
                    }
                  : {
                      background: "rgba(255,255,255,0.05)",
                      color: "rgba(255,255,255,0.5)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 pb-24">
        {gridItems.length === 0 ? (
          <div className="text-center py-20 text-zinc-600">
            <p className="text-lg font-semibold mb-2">No items in this category yet</p>
            <p className="text-sm">Check back soon — more content is being added regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {gridItems.map((item) => (
              <ShowcaseCard key={item.id} item={item} onOpen={() => openLightbox(item)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#040404" }}>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-4" style={{ color: "rgba(196,164,100,0.5)" }}>
            Your turn
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Create your own AI video</h2>
          <p className="text-zinc-400 mb-8 text-sm md:text-base">
            No editing experience needed. Start free — no credit card required.
          </p>
          <Link href="/create">
            <a
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base text-white transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #c4a464 0%, #e8c97a 50%, #c4a464 100%)",
                boxShadow: "0 0 32px rgba(196,164,100,0.35)",
              }}
            >
              <Sparkles className="w-5 h-5" />
              Start Creating — Free
            </a>
          </Link>
        </div>
      </div>

      {/* ── Lightbox ────────────────────────────────────────────────────────── */}
      {lightboxItem && (
        <LightboxModal item={lightboxItem} onClose={closeLightbox} />
      )}
    </div>
  );
}
