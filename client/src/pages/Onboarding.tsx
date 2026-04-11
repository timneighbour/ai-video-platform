import { Music, Youtube, Baby, Wand2, ArrowRight, Headphones, Home } from "lucide-react";
import React from "react";
import { Link } from "wouter";

const WIZVID_LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-cropped_86dbad19.png";

const CARD_IMAGES = {
  music:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/onboarding-music-video-Lti8pizeJFuSUTkuX2SUfY.webp",
  youtube: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/onboarding-youtube-video-6X3kKvAJxkigT4BXCR4wzr.webp",
  kids:    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/kids-video-thumbnail_207da3b3.png",
  other:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/onboarding-other-video-FnRcSMEshSBioqwE2ZWqnB.webp",
  aimusic: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/whos-it-for-musicians-ezcSAGNTzuKKxG5kyRC8bK.webp",
};

const CREATOR_TYPES: {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
  href: string;
  wide?: boolean;
}[] = [
  { id: "music",   icon: <Music className="w-5 h-5" />,      title: "Music Video",        desc: "Turn your songs into cinematic music videos",             accent: "from-purple-600/80 to-violet-900/90", href: "/music-video/create" },
  { id: "youtube", icon: <Youtube className="w-5 h-5" />,    title: "YouTube Video",      desc: "Create engaging content that stands out in the feed",     accent: "from-red-600/70 to-slate-900/90",     href: "/wizpilot" },
  { id: "kids",    icon: <Baby className="w-5 h-5" />,       title: "Kids Video",         desc: "Animated characters, nursery rhymes, and family content", accent: "from-pink-500/70 to-orange-900/90",   href: "/kids-video" },
  { id: "other",   icon: <Wand2 className="w-5 h-5" />,      title: "Text to Video",      desc: "Describe any scene and AI generates a video for you",     accent: "from-blue-600/70 to-indigo-900/90",   href: "/text-to-video" },
  { id: "aimusic", icon: <Headphones className="w-5 h-5" />, title: "AI Music Generator", desc: "Generate original songs and tracks powered by Suno AI",   accent: "from-emerald-600/70 to-teal-900/90",  href: "/music-creator", wide: true },
];

export default function Onboarding() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-4 sm:px-6 py-12 font-sans">

      {/* ── Header ── */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-10">
        <Link
          href="/"
          className="text-sm text-[#a1a1aa] hover:text-white transition-colors flex items-center gap-1.5"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
        <Link href="/" className="flex items-center">
          <img
            src={WIZVID_LOGO_FULL}
            alt="WizVid"
            className="h-10 w-auto object-contain hover:scale-105 hover:brightness-110 transition-all duration-300"
            style={{ minWidth: "110px" }}
          />
        </Link>
        <div className="w-24" />
      </div>

      {/* ── Heading ── */}
      <div className="text-center mb-10 w-full max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
          What do you want to create?
        </h1>
        <p className="text-[#a1a1aa] text-base">
          We'll personalise your experience based on your goals.
        </p>
      </div>

      {/* ── Video type cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {CREATOR_TYPES.map((ct) => (
          <Link
            key={ct.id}
            href={ct.href}
            className={`group relative overflow-hidden rounded-2xl border border-white/10 hover:border-white/30 hover:scale-[1.01] text-left transition-all focus:outline-none focus:ring-2 focus:ring-white/20 h-48 sm:h-52 cursor-pointer block ${ct.wide ? "sm:col-span-2" : ""}`}
          >
            {/* Background image */}
            <img
              src={CARD_IMAGES[ct.id as keyof typeof CARD_IMAGES]}
              alt={ct.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${ct.accent} opacity-80`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col justify-between p-5">
              {/* Icon badge */}
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white">
                {ct.icon}
              </div>

              {/* Title + desc */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-white font-bold text-base leading-tight">{ct.title}</h3>
                  <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
                </div>
                <p className="text-white/70 text-xs leading-relaxed">{ct.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Footer note ── */}
      <p className="mt-10 text-[#a1a1aa] text-xs text-center max-w-xs">
        By continuing, you agree to WizVid's{" "}
        <Link href="/terms" className="underline hover:text-white transition-colors">Terms of Service</Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-white transition-colors">Privacy Policy</Link>.
      </p>
    </div>
  );
}
