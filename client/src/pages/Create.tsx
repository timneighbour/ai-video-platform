import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Music, Film, Baby, Wand2, Mic, Layers, Zap, Sparkles,
  ArrowRight, ChevronRight, Lock, Mic2, ImageIcon, Smartphone,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";
import {
  WizAudioEmblem,
  WizImageEmblem,
  WizVideoEmblem,
  WizShortsEmblem,
  WizAnimateEmblem,
  WizScriptEmblem,
} from "@/components/WizProductEmblems";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const WIZAI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-logo-v3_bd51f720.png";
const WIZPILOT_LOGO = `${CDN}/wizpilot-logo-final_22d02597.png`;
const WIZSOUND_LOGO = `${CDN}/wizsound-logo-v5_76ab5163.png`;
const WIZLUMINA_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizlumina-logo-final-RNomEkxpATo5cgx6gBQPGN.webp";
const WIZCREATE_LOGO = `${CDN}/wizcreate-logo-final_9f61f0de.png`;

interface Tool {
  id: string;
  name: string;
  tagline: string;
  subheading: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
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
    name: "WizVideo",
    tagline: "WizVideo™ — Upload a song, get a full music video",
    subheading: "Turn any track into a full-length, AI-directed music video — scenes, cuts, and all.",
    description: "Upload any track and our AI writes a lyrics-synced storyboard, generates every scene, and assembles a complete music video — in minutes.",
    href: "/music-video/create",
    icon: <WizVideoEmblem size={36} />,
    iconBg: "bg-transparent",
    iconColor: "text-[--color-gold]",
    badge: "Most Popular",
    badgeColor: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30",
    accentFrom: "from-[#b8892a]/15",
    accentTo: "to-[#4a3010]/5",
    borderColor: "border-[--color-gold]/25 hover:border-[--color-gold]/50",
    previewImg: `${CDN}/wizbeat-musician-solo_c77dcffb.jpg`,
    popular: true,
    authRequired: true,
  },
  {
    id: "wizpilot",
    name: "Cinematic Video",
    tagline: "WizScript — Text to cinematic video, fully automated",
    subheading: "Describe your idea and get a polished, scene-by-scene cinematic video in minutes.",
    description: "Type a prompt, choose a style, and WizScript writes a full storyboard and renders a cinematic video. No editing skills needed.",
    href: "/wizpilot",
    icon: <Film className="w-6 h-6" />,
    iconBg: "bg-[--color-silver]/10",
    iconColor: "text-[--color-silver]",
    logo: WIZPILOT_LOGO,
    badge: "AI Autopilot",
    badgeColor: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/30",
    accentFrom: "from-[#9090a0]/10",
    accentTo: "to-[#2e2e36]/5",
    borderColor: "border-[--color-silver]/20 hover:border-[--color-silver]/40",
    previewImg: `${CDN}/style-cinematic-UvoChSsK7xZ9a7MR2bUHeq-thumb_855006a3.webp`,
    authRequired: true,
  },
  {
    id: "kids-video",
    name: "WizAnimate™",
    tagline: "AI character animation engine",
    subheading: "Bring your characters to life with fluid, beat-matched AI animation.",
    description: "WizAnimate™ takes your storyboard and generates cinematic character animation — every movement, gesture, and expression timed to the beat and emotion of your track.",
    href: "/products/wizanimate",
    icon: <WizAnimateEmblem size={36} />,
    iconBg: "bg-transparent",
    iconColor: "text-[--color-silver]",
    badge: "Animation",
    badgeColor: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/30",
    accentFrom: "from-[#9090a0]/10",
    accentTo: "to-[#2e2e36]/5",
    borderColor: "border-[--color-silver]/20 hover:border-[--color-silver]/40",
    previewImg: `${CDN}/style-cinematic-UvoChSsK7xZ9a7MR2bUHeq-thumb_855006a3.webp`,
    authRequired: true,
  },
  {
    id: "text-to-video",
    name: "WizScript",
    tagline: "Scene-by-scene cinematic control",
    subheading: "Write each scene yourself for full creative control — choose your renderer and quality.",
    description: "Write each scene prompt manually for full creative control. Choose your renderer (Seedance for speed, Kling for quality) and render each scene individually.",
    href: "/text-to-video",
    icon: <WizScriptEmblem size={36} />,
    iconBg: "bg-transparent",
    iconColor: "text-[--color-gold]",
    badge: "Advanced",
    badgeColor: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30",
    accentFrom: "from-[#b8892a]/12",
    accentTo: "to-[#4a3010]/5",
    borderColor: "border-[--color-gold]/20 hover:border-[--color-gold]/40",
    previewImg: `${CDN}/style-documentary-nyjoHJnTHZU2hdjABnnjBm-thumb_3587102a.webp`,
    authRequired: true,
  },
  {
    id: "lip-sync",
    name: "Lip Sync",
    tagline: "Sync any video to any audio with AI",
    subheading: "Perfectly match lip movements to any new audio track — ideal for dubbing and avatars.",
    description: "Upload a video and an audio track — our AI perfectly syncs the lip movements to the new audio. Ideal for dubbing, music videos, and avatar content.",
    href: "/tools/lip-sync",
    icon: <Mic className="w-6 h-6" />,
    iconBg: "bg-[--color-silver]/10",
    iconColor: "text-[--color-silver]",
    badge: "HeyGen AI",
    badgeColor: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/30",
    accentFrom: "from-[#9090a0]/10",
    accentTo: "to-[#2e2e36]/5",
    borderColor: "border-[--color-silver]/20 hover:border-[--color-silver]/40",
    authRequired: true,
  },
  {
    id: "enhancement-studio",
    name: "Enhancement Studio",
    tagline: "WizLumina™ + WizSound™ — Enhance any video",
    subheading: "Upscale to 4K, apply cinematic colour grading, and boost audio quality in one step.",
    description: "Upscale to 4K, apply cinematic colour grading with WizLumina™, and enhance audio quality with WizSound™. Make any video look and sound premium.",
    href: "/enhancement-studio",
    icon: <Sparkles className="w-6 h-6" />,
    iconBg: "bg-[--color-gold]/15",
    iconColor: "text-[--color-gold]",
    logo: WIZLUMINA_LOGO,
    badge: "WizLumina™",
    badgeColor: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30",
    accentFrom: "from-[#b8892a]/12",
    accentTo: "to-[#4a3010]/5",
    borderColor: "border-[--color-gold]/20 hover:border-[--color-gold]/40",
    authRequired: true,
  },
  {
    id: "video-to-video",
    name: "Style Transfer",
    tagline: "Transform any video into a new visual style",
    subheading: "Reimagine any existing video in Anime, Cinematic, 3D Animation, or a custom style.",
    description: "Apply Anime, Cinematic, 3D Animation, or any custom style to an existing video.",
    href: "/tools/video-to-video",
    icon: <Layers className="w-6 h-6" />,
    iconBg: "bg-[--color-silver]/10",
    iconColor: "text-[--color-silver]",
    badge: "Runway ML",
    badgeColor: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/30",
    accentFrom: "from-[#9090a0]/10",
    accentTo: "to-[#2e2e36]/5",
    borderColor: "border-[--color-silver]/20 hover:border-[--color-silver]/40",
    previewImg: `${CDN}/style-anime-bCLhyWeYo6mek5pWMnEUV7-thumb_2704d4cf.webp`,
    authRequired: true,
  },
  {
    id: "voiceover",
    name: "AI Voiceover",
    tagline: "Studio-quality voiceovers in any language",
    subheading: "Generate professional narration from any script — 100+ voices, 30+ languages.",
    description: "Generate professional voiceovers from any script. Choose from 100+ voices across 30+ languages. Perfect for YouTube, ads, and explainer videos.",
    href: "/tools/voiceover",
    icon: <Zap className="w-6 h-6" />,
    iconBg: "bg-[--color-silver]/10",
    iconColor: "text-[--color-silver]",
    badge: "100+ Voices",
    badgeColor: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/30",
    accentFrom: "from-[#9090a0]/10",
    accentTo: "to-[#2e2e36]/5",
    borderColor: "border-[--color-silver]/20 hover:border-[--color-silver]/40",
    authRequired: true,
  },
  {
    id: "wiz-image",
    name: "WizImage™",
    tagline: "AI image and artwork creator",
    subheading: "Generate stunning images with the world's #1 ranked AI image model.",
    description: "Describe any image and WizImage renders it in seconds. Choose from 8 art styles, 4 aspect ratios, and build a personal gallery. Photorealistic, cinematic, anime, oil painting, and more.",
    href: "/wiz-image",
    icon: <WizImageEmblem size={36} />,
    iconBg: "bg-transparent",
    iconColor: "text-[--color-gold]",
    badge: "New",
    badgeColor: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30",
    accentFrom: "from-[#b8892a]/12",
    accentTo: "to-[#4a3010]/5",
    borderColor: "border-[--color-gold]/20 hover:border-[--color-gold]/40",
    authRequired: true,
  },
  {
    id: "wiz-shorts",
    name: "WizShorts™",
    tagline: "AI short-form video creator for Shorts, TikTok & Reels",
    subheading: "Turn any topic into a viral short-form video in minutes.",
    description: "Describe your topic, pick a platform and style, and WizShorts generates a complete 15–60s vertical video. Ready to upload to YouTube Shorts, TikTok, or Instagram Reels.",
    href: "/wiz-shorts",
    icon: <WizShortsEmblem size={36} />,
    iconBg: "bg-transparent",
    iconColor: "text-[--color-gold]",
    badge: "New",
    badgeColor: "bg-[--color-gold]/15 text-[--color-gold] border-[--color-gold]/30",
    accentFrom: "from-[#b8892a]/12",
    accentTo: "to-[#4a3010]/5",
    borderColor: "border-[--color-gold]/20 hover:border-[--color-gold]/40",
    authRequired: true,
  },
  {
    id: "wizsync",
    name: "WizSync™",
    tagline: "Voice-to-character assignment system",
    subheading: "Detect every voice, separate stems, and map speakers to characters for AI lip-sync.",
    description: "Upload any audio track. WizSync detects every speaker with timestamps, separates 6 instrument stems, and maps each voice to a character — ready for AI lip-sync generation.",
    href: "/wizsync",
    icon: <Mic2 className="w-6 h-6" />,
    iconBg: "bg-[--color-silver]/10",
    iconColor: "text-[--color-silver]",
    badge: "Beta",
    badgeColor: "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/30",
    accentFrom: "from-[#9090a0]/10",
    accentTo: "to-[#2e2e36]/5",
    borderColor: "border-[--color-silver]/20 hover:border-[--color-silver]/40",
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
      className="group relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: "linear-gradient(160deg, #0d0d0d 0%, #080808 60%, #050505 100%)",
        border: "1px solid rgba(196,164,100,0.20)",
        boxShadow: [
          "0 1px 0 0 rgba(232,213,160,0.12) inset",
          "0 -1px 0 0 rgba(0,0,0,0.8) inset",
          "1px 0 0 0 rgba(232,213,160,0.06) inset",
          "0 4px 20px rgba(0,0,0,0.6)",
        ].join(", "),
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.border = "1px solid rgba(196,164,100,0.50)";
        el.style.boxShadow = [
          "0 1px 0 0 rgba(232,213,160,0.28) inset",
          "0 -1px 0 0 rgba(0,0,0,0.8) inset",
          "1px 0 0 0 rgba(232,213,160,0.14) inset",
          "0 8px 40px rgba(196,164,100,0.12)",
          "0 0 0 1px rgba(196,164,100,0.50)",
        ].join(", ");
        el.style.transform = "translateY(-3px) scale(1.01)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.border = "1px solid rgba(196,164,100,0.20)";
        el.style.boxShadow = [
          "0 1px 0 0 rgba(232,213,160,0.12) inset",
          "0 -1px 0 0 rgba(0,0,0,0.8) inset",
          "1px 0 0 0 rgba(232,213,160,0.06) inset",
          "0 4px 20px rgba(0,0,0,0.6)",
        ].join(", ");
        el.style.transform = "translateY(0) scale(1)";
      }}
    >
      {/* Polished bevel — top edge */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none z-20"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(232,213,160,0.18) 20%, rgba(232,213,160,0.32) 50%, rgba(232,213,160,0.18) 80%, transparent 100%)" }} />
      {/* Polished bevel — left edge */}
      <div className="absolute top-0 left-0 bottom-0 w-px pointer-events-none z-20"
        style={{ background: "linear-gradient(180deg, transparent 0%, rgba(232,213,160,0.16) 20%, rgba(232,213,160,0.10) 50%, transparent 100%)" }} />
      {/* Metallic grain overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 rounded-2xl opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`, backgroundSize: "200px 200px" }} />
      {/* Brushed metal diagonal shimmer on hover */}
      <div className="absolute inset-0 pointer-events-none z-10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "linear-gradient(125deg, transparent 0%, rgba(232,213,160,0.04) 30%, rgba(255,255,255,0.05) 50%, rgba(232,213,160,0.04) 70%, transparent 100%)" }} />
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
              <span className="text-[10px] font-bold uppercase tracking-widest metallic-gold text-[#1a1000] px-2 py-1 rounded-full">
                Most Popular
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Large colourful icon above title */}
        <div className="mb-4 flex items-start justify-between">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
            style={{
              background: "linear-gradient(145deg, rgba(196,164,100,0.12) 0%, rgba(232,213,160,0.06) 100%)",
              border: "1px solid rgba(196,164,100,0.22)",
              boxShadow: "0 1px 0 rgba(232,213,160,0.10) inset, 0 2px 8px rgba(0,0,0,0.5)",
            }}
          >
            <div className={`w-7 h-7 ${tool.iconColor}`}>{tool.icon}</div>
          </div>
          {tool.authRequired && !isAuthenticated ? (
            <Lock className="w-4 h-4 text-white/30 flex-shrink-0 mt-1" />
          ) : (
            <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
          )}
        </div>
        {/* Title + badge row */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {tool.logo ? (
            <img src={tool.logo} alt={tool.name} className="h-6 w-auto object-contain" />
          ) : (
            <h3
              className="font-bold text-base leading-tight"
              style={{
                background: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 35%, #fff 55%, #e8d5a0 70%, #c4a464 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
              {tool.name}
            </h3>
          )}
          {tool.badge && !tool.popular && (
            <span className={`text-[10px] font-semibold uppercase tracking-wider border rounded-full px-2 py-0.5 ${tool.badgeColor}`}>
              {tool.badge}
            </span>
          )}
        </div>

        {/* Tagline */}
        <p className="text-white/50 text-xs font-medium mb-1 leading-snug">{tool.tagline}</p>

        {/* Subheading */}
        <p className="text-white/80 text-sm font-semibold mb-2 leading-snug">{tool.subheading}</p>

        {/* Description */}
        <p className="text-white/55 text-sm leading-relaxed">{tool.description}</p>

        {/* CTA */}
        <div className="mt-4 flex items-center gap-2">
          <span
            className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0"
            style={{ color: "#c4a464" }}>
            {isAuthenticated ? "Open tool" : "Sign in to start"} →
          </span>
        </div>
      </div>
      {/* Bottom shimmer on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20"
        style={{ background: "linear-gradient(90deg, transparent, rgba(196,164,100,0.5), transparent)" }} />
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
              <img src={WIZAI_LOGO} alt="WIZ AI" className="h-20 w-auto object-contain" />
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
                <Button size="sm" className="btn-primary btn-sheen text-xs px-4">
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
          <div className="inline-flex items-center gap-2 bg-[--color-gold]/10 border border-[--color-gold]/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[--color-gold]" />
            <span className="text-[--color-gold] text-xs font-semibold uppercase tracking-widest">AI Creator Studio</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-5 leading-tight">
            Choose Your<br />
            <span className="metallic-gold">
              AI Creation Tool
            </span>
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed">
            Eight professional AI tools. One platform. No editing skills required.
          </p>
          {!isAuthenticated && (
            <p className="mt-4 text-white/30 text-sm">
              <a href={getLoginUrl()} className="text-[--color-gold] hover:text-[--color-gold]/80 underline underline-offset-2">
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
