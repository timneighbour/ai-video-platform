import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Music, Film, Baby, Wand2, Mic, Layers, Zap, Sparkles,
  ArrowRight, ChevronRight, Lock
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const WIZVID_LOGO = `${CDN}/wizvid-logo-transparent_fcdb69d6.png`;
const WIZPILOT_LOGO = `${CDN}/wizpilot-logo-final_22d02597.png`;
const WIZSOUND_LOGO = `${CDN}/wizsound-logo-v5_76ab5163.png`;
const WIZLUMINA_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizlumina-logo-final-RNomEkxpATo5cgx6gBQPGN.webp";
const WIZCREATE_LOGO = `${CDN}/wizcreate-logo-final_9f61f0de.png`;

interface Tool {
  id: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  logo?: string;
  badge?: string;
  badgeColor?: string;
  accentFrom: string;
  accentTo: string;
  borderColor: string;
  previewImg?: string;
  popular?: boolean;
  free?: boolean;
  authRequired?: boolean;
}

const TOOLS: Tool[] = [
  {
    id: "music-video",
    name: "Music Video",
    tagline: "WizBeat™ — Upload a song, get a full music video",
    description: "Upload any track and our AI writes a lyrics-synced storyboard, generates every scene, and assembles a complete music video — in minutes.",
    href: "/music-video/create",
    icon: <Music className="w-6 h-6" />,
    badge: "Most Popular",
    badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    accentFrom: "from-violet-600/25",
    accentTo: "to-purple-600/5",
    borderColor: "border-violet-500/25 hover:border-violet-400/50",
    previewImg: `${CDN}/wizbeat-musician-solo_c77dcffb.jpg`,
    popular: true,
    authRequired: true,
  },
  {
    id: "wizpilot",
    name: "Cinematic Video",
    tagline: "WizPilot™ — Text to cinematic video, fully automated",
    description: "Type a prompt, choose a style, and WizPilot writes a full storyboard and renders a cinematic video. No editing skills needed.",
    href: "/wizpilot",
    icon: <Film className="w-6 h-6" />,
    logo: WIZPILOT_LOGO,
    badge: "AI Autopilot",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    accentFrom: "from-cyan-600/20",
    accentTo: "to-blue-600/5",
    borderColor: "border-cyan-500/20 hover:border-cyan-400/45",
    previewImg: `${CDN}/style-cinematic-UvoChSsK7xZ9a7MR2bUHeq-thumb_855006a3.webp`,
    authRequired: true,
  },
  {
    id: "kids-video",
    name: "Kids Animation",
    tagline: "Pixar-style animated stories for children",
    description: "Turn any story idea into a fully animated Pixar-style video. Safe, fun, and completely automated — perfect for family creators.",
    href: "/kids-video",
    icon: <Baby className="w-6 h-6" />,
    badge: "Animated",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    accentFrom: "from-pink-600/20",
    accentTo: "to-yellow-600/5",
    borderColor: "border-pink-500/20 hover:border-pink-400/45",
    previewImg: `${CDN}/style-pixar3d-eN2z5fKQJJTuTc3Ghd84dV-thumb_59429596.webp`,
    authRequired: true,
  },
  {
    id: "text-to-video",
    name: "Text to Video",
    tagline: "Scene-by-scene cinematic control",
    description: "Write each scene prompt manually for full creative control. Choose your renderer (Seedance for speed, Kling for quality) and render each scene individually.",
    href: "/text-to-video",
    icon: <Wand2 className="w-6 h-6" />,
    badge: "Advanced",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    accentFrom: "from-amber-600/20",
    accentTo: "to-orange-600/5",
    borderColor: "border-amber-500/20 hover:border-amber-400/45",
    previewImg: `${CDN}/style-documentary-nyjoHJnTHZU2hdjABnnjBm-thumb_3587102a.webp`,
    authRequired: true,
  },
  {
    id: "lip-sync",
    name: "Lip Sync",
    tagline: "Sync any video to any audio with AI",
    description: "Upload a video and an audio track — our AI perfectly syncs the lip movements to the new audio. Ideal for dubbing, music videos, and avatar content.",
    href: "/tools/lip-sync",
    icon: <Mic className="w-6 h-6" />,
    badge: "HeyGen AI",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    accentFrom: "from-emerald-600/20",
    accentTo: "to-teal-600/5",
    borderColor: "border-emerald-500/20 hover:border-emerald-400/45",
    authRequired: true,
  },
  {
    id: "enhancement-studio",
    name: "Enhancement Studio",
    tagline: "WizLumina™ + WizSound™ — Enhance any video",
    description: "Upscale to 4K, apply cinematic colour grading with WizLumina™, and enhance audio quality with WizSound™. Make any video look and sound premium.",
    href: "/enhancement-studio",
    icon: <Sparkles className="w-6 h-6" />,
    logo: WIZLUMINA_LOGO,
    badge: "WizLumina™",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    accentFrom: "from-purple-600/20",
    accentTo: "to-indigo-600/5",
    borderColor: "border-purple-500/20 hover:border-purple-400/45",
    authRequired: true,
  },
  {
    id: "video-to-video",
    name: "Style Transfer",
    tagline: "Transform any video into a new visual style",
    description: "Apply Anime, Cinematic, Pixar, or any custom style to an existing video. Powered by Runway ML for high-quality style transformation.",
    href: "/tools/video-to-video",
    icon: <Layers className="w-6 h-6" />,
    badge: "Runway ML",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    accentFrom: "from-rose-600/20",
    accentTo: "to-red-600/5",
    borderColor: "border-rose-500/20 hover:border-rose-400/45",
    previewImg: `${CDN}/style-anime-bCLhyWeYo6mek5pWMnEUV7-thumb_2704d4cf.webp`,
    authRequired: true,
  },
  {
    id: "voiceover",
    name: "AI Voiceover",
    tagline: "Studio-quality voiceovers in any language",
    description: "Generate professional voiceovers from any script. Choose from 100+ voices across 30+ languages. Perfect for YouTube, ads, and explainer videos.",
    href: "/tools/voiceover",
    icon: <Zap className="w-6 h-6" />,
    badge: "100+ Voices",
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
    accentFrom: "from-sky-600/20",
    accentTo: "to-blue-600/5",
    borderColor: "border-sky-500/20 hover:border-sky-400/45",
    authRequired: true,
  },
];

function ToolCard({ tool }: { tool: Tool }) {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleClick = () => {
    if (tool.authRequired && !isAuthenticated) {
      window.location.href = getLoginUrl();
    } else {
      navigate(tool.href);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative cursor-pointer rounded-2xl border bg-gradient-to-br ${tool.accentFrom} ${tool.accentTo} bg-[#111] ${tool.borderColor} transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl overflow-hidden`}
    >
      {/* Preview image strip */}
      {tool.previewImg && (
        <div className="relative h-36 overflow-hidden">
          <img
            src={tool.previewImg}
            alt={tool.name}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#111]" />
          {/* Popular badge overlay */}
          {tool.popular && (
            <div className="absolute top-3 right-3">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-violet-500 text-white px-2 py-1 rounded-full">
                Most Popular
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {tool.logo ? (
              <img src={tool.logo} alt={tool.name} className="h-8 w-auto object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center text-white/70 group-hover:text-white transition-colors flex-shrink-0">
                {tool.icon}
              </div>
            )}
            <div>
              <h3 className="text-white font-bold text-base leading-tight">{tool.name}</h3>
              {tool.badge && !tool.popular && (
                <span className={`text-[10px] font-semibold uppercase tracking-wider border rounded-full px-2 py-0.5 ${tool.badgeColor}`}>
                  {tool.badge}
                </span>
              )}
            </div>
          </div>
          {tool.authRequired && !isAuthenticated ? (
            <Lock className="w-4 h-4 text-white/30 flex-shrink-0 mt-1" />
          ) : (
            <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
          )}
        </div>

        {/* Tagline */}
        <p className="text-white/50 text-xs font-medium mb-2 leading-snug">{tool.tagline}</p>

        {/* Description */}
        <p className="text-white/65 text-sm leading-relaxed">{tool.description}</p>

        {/* CTA */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs font-semibold text-white/40 group-hover:text-white/70 transition-colors">
            {isAuthenticated ? "Open tool" : "Sign in to start"} →
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Create() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallback="/" label="Home" />
            <NavLink href="/" className="hidden md:flex items-center">
              <img src={WIZVID_LOGO} alt="WizVid" className="h-20 w-auto object-contain" />
            </NavLink>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "How It Works", href: "/how-it-works" },
              { label: "Examples", href: "/creators" },
              { label: "Pricing", href: "/pricing" },
              { label: "Help", href: "/help" },
            ].map((l) => (
              <NavLink key={l.href} href={l.href} className="px-3 py-2 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/6 transition-all">
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <NavLink href="/dashboard">
                <Button size="sm" variant="outline" className="border-white/15 text-white/80 hover:bg-white/8 text-xs">
                  Dashboard
                </Button>
              </NavLink>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs px-4">
                  Sign In Free
                </Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-violet-300 text-xs font-semibold uppercase tracking-widest">AI Creator Studio</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-5 leading-tight">
            Choose Your<br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              AI Creation Tool
            </span>
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed">
            Eight professional AI tools. One platform. No editing skills required.
          </p>
          {!isAuthenticated && (
            <p className="mt-4 text-white/30 text-sm">
              <a href={getLoginUrl()} className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                Sign in free
              </a>{" "}
              to unlock all tools — 50 credits included, no card needed.
            </p>
          )}
        </div>

        {/* Tools grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center border-t border-white/6 pt-12">
          <p className="text-white/35 text-sm mb-4">Not sure where to start?</p>
          <div className="flex flex-wrap justify-center gap-3">
            <NavLink href="/how-it-works">
              <Button variant="outline" className="border-white/15 text-white/70 hover:bg-white/8 gap-2">
                <ChevronRight className="w-4 h-4" /> How It Works
              </Button>
            </NavLink>
            <NavLink href="/pricing">
              <Button variant="outline" className="border-white/15 text-white/70 hover:bg-white/8 gap-2">
                <ChevronRight className="w-4 h-4" /> View Pricing
              </Button>
            </NavLink>
            <NavLink href="/creators">
              <Button variant="outline" className="border-white/15 text-white/70 hover:bg-white/8 gap-2">
                <ChevronRight className="w-4 h-4" /> See Examples
              </Button>
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
