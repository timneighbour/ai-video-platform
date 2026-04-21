import React, { useState, useRef } from "react";
import { useSEO } from "@/hooks/useSEO";
import { trpc } from "@/lib/trpc";
import { Play, Pause, ArrowLeft, Sparkles } from "@/lib/icons";
import { Link } from "wouter";

interface ShowcaseItem {
  id: number;
  title: string;
  category: string;
  description: string;
  posterUrl: string;
  videoUrl?: string | null;
}

const FALLBACK_ITEMS: ShowcaseItem[] = [
  {
    id: 1,
    title: "Midnight City — Cinematic Style",
    category: "Cinematic AI Video",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-midnight-city_caf4be96.jpg",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/demo-video-only_404f1adb.mp4",
    description: "A lone figure walks rain-soaked streets under warm city lights. Generated from a single text prompt in under three minutes.",
  },
  {
    id: 2,
    title: "Stage Performance — Music Video",
    category: "Music Video",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-stage-performance_b1d68ebf.jpg",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/demo-video-only_404f1adb.mp4",
    description: "A full music video with synced visuals, concert lighting, and cinematic effects. Created with WizVideo from an uploaded track.",
  },
  {
    id: 3,
    title: "Star Quest — Kids Channel Intro",
    category: "Animation",
    posterUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/showcase-star-quest_c73c29bd.jpg",
    videoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/demo-video-only_404f1adb.mp4",
    description: "Cinematic 3D animation for a kids YouTube channel. Generated from a character description and theme prompt.",
  },
];

function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleToggle = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div
      className="group relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-[--color-gold]/40 transition-all duration-300 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleToggle}
    >
      {/* Poster / Video */}
      <div className="relative aspect-video">
        {item.videoUrl ? (
          <video
            ref={videoRef}
            src={item.videoUrl}
            poster={item.posterUrl}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
        )}
        {/* Overlay */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${hovered || !playing ? "opacity-100" : "opacity-0"}`}>
          <div className="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center backdrop-blur-sm">
            {playing ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
            )}
          </div>
        </div>
        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full bg-[--color-gold]/15 text-[--color-gold] border border-[--color-gold]/20">
            {item.category}
          </span>
        </div>
      </div>
      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white text-sm mb-1 line-clamp-1">{item.title}</h3>
        <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed">{item.description}</p>
      </div>
    </div>
  );
}

export default function ShowcasePage() {
  useSEO({ title: "Showcase — WIZ AI", path: "/showcase", description: "Watch AI-generated music videos created with WIZ AI. See cinematic, animated, and live-action styles made by real artists." });
  const { data: dbItems } = trpc.showcase.list.useQuery();
  const items: ShowcaseItem[] = (dbItems && dbItems.length > 0) ? dbItems : FALLBACK_ITEMS;

  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All" ? items : items.filter((i) => i.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* Header */}
      <div className="relative border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to WIZ AI
          </a>
          <a href="/onboarding" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[--color-gold] text-black font-bold text-sm hover:bg-[--color-gold-light] transition-colors">
            <Sparkles className="w-4 h-4" />
            Create Your Own
          </a>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10 text-center">
        <p className="text-[10px] font-black tracking-[0.3em] uppercase text-[--color-gold-dark]/60 mb-4">WIZ AI — Real Outputs</p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
          AI Videos Created on WIZ AI
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Real videos generated by creators using WizVideo, WizAnimate, and WizScript. Every frame is AI-generated — no editing required.
        </p>
      </div>

      {/* Category Filter */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? "bg-[--color-gold] text-black"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-zinc-600">No videos in this category yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <ShowcaseCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="border-t border-zinc-800/50 bg-[#040404]">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-black text-white mb-4">Create your own AI video</h2>
          <p className="text-zinc-400 mb-8">No editing experience needed. Start free — no credit card required.</p>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-[--color-gold] text-black font-bold text-base hover:bg-[--color-gold-light] transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Start Creating — Free
          </a>
        </div>
      </div>
    </div>
  );
}
