import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  Layers, Zap, Sparkles, ArrowRight, Lock, Mic2,
  Star, ChevronRight, Play,
} from "@/lib/icons";
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
const WIZAI_LOGO = "/manus-storage/wizai-logo-premium-transparent_ac3f550b.png";
const WIZPILOT_LOGO = `${CDN}/wizpilot-logo-final_22d02597.png`;
const WIZSOUND_LOGO = `${CDN}/wizsound-logo-v5_76ab5163.png`;
const WIZLUMINA_LOGO = `${CDN}/wizlumina-logo-final-RNomEkxpATo5cgx6gBQPGN.webp`;
const WIZCREATE_LOGO = `${CDN}/wizcreate-logo-final_9f61f0de.png`;
const WIZANIMATE_LOGO = `${CDN}/wizanimate-logo-v2_e4d3081b.png`;
const WIZSYNC_LOGO = `${CDN}/wizsync-logo-v1-DCKqEogpbduD58LkFMnAts.png`;

const IMG = {
  musicVideo:   `${CDN}/wizbeat-musician-solo_c77dcffb.jpg`,
  cinematic:    `${CDN}/style-cinematic-UvoChSsK7xZ9a7MR2bUHeq.webp`,
  cinematic2:   `${CDN}/style-cinematic-8EttbpJCG8aAwirxMzv25p.webp`,
  anime:        `${CDN}/style-anime-bCLhyWeYo6mek5pWMnEUV7.webp`,
  anime2:       `${CDN}/style-anime-76BJuATsMcjhGJHYLXERiU.webp`,
  neonNoir:     `${CDN}/style-neon-noir-5FS7RgdStYibD2k7cDsLtT.webp`,
  neonNoir2:    `${CDN}/style-neon-noir-XR46whfoD5cgi3ADa8iDDe.webp`,
  epicFantasy:  `${CDN}/style-epic-fantasy-aaR23m63VQcBx6VzTSa7jJ.webp`,
  documentary:  `${CDN}/style-documentary-nyjoHJnTHZU2hdjABnnjBm.webp`,
  realistic:    `${CDN}/style-realistic-aoCsFQg7RrHiDwviHBmAKk.webp`,
  abstract:     `${CDN}/style-abstract-E9NdxWuFeAHfGRiGpsbW9Y.webp`,
  vintage:      `${CDN}/style-vintage-mkatVcuLLHQ5oBRYWdLWtp.webp`,
  pixar:        `${CDN}/style-pixar3d-eN2z5fKQJJTuTc3Ghd84dV.webp`,
  horror:       `${CDN}/style-horror-V8mWQPZYZySQZ5xPr9y3q4.webp`,
  musicians:    `${CDN}/whos-it-for-musicians-ezcSAGNTzuKKxG5kyRC8bK.webp`,
  youtubers:    `${CDN}/whos-it-for-youtubers-hVpTL9NRQkqFJoeEzGZYpN.webp`,
  aiCreators:   `${CDN}/whos-it-for-ai-creators-iNKM9VvLTuKBigHPwZC3HS.webp`,
  kidsCreators: `${CDN}/whos-it-for-kids-creators-V7CLZTheKBJ8dstLuLDWem.webp`,
  heroBg:       `${CDN}/wizvid-hero-bg-4k-GUBZqG8hsPmj5uDf256WGz.webp`,
  demoPoster:   `${CDN}/step3-ai-generated-scene-5QTx7hBMWwzLqpgwATS24U.webp`,
  neonStage:    `${CDN}/showcase-music-neon-stage-L43AthLEfiF5bt3wJUcHWB.webp`,
  cyberpunk:    `${CDN}/showcase-music-cyberpunk-band-mEMS5T6znt5Fqj3DwimTcK.webp`,
};

interface Tool {
  id: string;
  name: string;
  badge?: string;
  badgeStyle?: "gold" | "silver" | "red" | "green" | "blue" | "fuchsia";
  tagline: string;
  description: string;
  href: string;
  logo?: string;
  emblem?: React.ReactNode;
  bg: string;
  bgAlt?: string;
  accentColor: string;
  popular?: boolean;
  authRequired?: boolean;
}

const TOOLS: Tool[] = [
  {
    id: "music-video",
    name: "WizVideo\u2122",
    badge: "Most Popular",
    badgeStyle: "gold",
    tagline: "Turn your music into a full AI-generated music video, scene by scene.",
    description: "Upload your track and WIZ AI builds a full music video — storyboard, scenes, characters, and cinematic visuals synced to every beat and lyric. Preview every scene before you render.",
    href: "/music-video/create",
    logo: WIZPILOT_LOGO,
    emblem: <WizVideoEmblem size={40} />,
    bg: IMG.musicVideo,
    bgAlt: IMG.neonStage,
    accentColor: "#c4a464",
    popular: true,
    authRequired: true,
  },
  {
    id: "autopilot",
    name: "WizScript\u2122",
    badge: "AI Autopilot",
    badgeStyle: "blue",
    tagline: "Describe your idea in plain text and let AI build the full video script and storyboard.",
    description: "WizScript converts a plain-text idea into a fully structured video script and storyboard. Define your concept, and WIZ AI generates the scenes, dialogue, and visual direction automatically.",
    href: "/autopilot",
    logo: WIZCREATE_LOGO,
    emblem: <WizScriptEmblem size={40} />,
    bg: IMG.cinematic,
    bgAlt: IMG.cinematic2,
    accentColor: "#3b82f6",
    authRequired: true,
  },
  {
    id: "wiz-animate",
    name: "WizAnimate\u2122",
    badge: "Animation",
    badgeStyle: "fuchsia",
    tagline: "Bring characters and scenes to life with AI-powered animation.",
    description: "WizAnimate brings AI-generated characters and scenes to life. From lyric videos to animated explainers, WizAnimate adds motion, expression, and cinematic movement to your creative projects.",
    href: "/wiz-animate",
    logo: WIZANIMATE_LOGO,
    emblem: <WizAnimateEmblem size={40} />,
    bg: IMG.anime,
    bgAlt: IMG.anime2,
    accentColor: "#d946ef",
    authRequired: true,
  },
  {
    id: "wiz-script",
    name: "WizScript\u2122",
    badge: "Advanced",
    badgeStyle: "silver",
    tagline: "Describe your idea in plain text and let AI build the full video script and storyboard.",
    description: "Write each scene yourself for full creative control. WIZ AI generates every scene individually, giving you complete creative direction from concept to final render.",
    href: "/wiz-script",
    emblem: <WizScriptEmblem size={40} />,
    bg: IMG.epicFantasy,
    bgAlt: IMG.horror,
    accentColor: "#a78bfa",
    authRequired: true,
  },
  {
    id: "lip-sync",
    name: "Lip Sync",
    badge: "WIZ AI",
    badgeStyle: "silver",
    tagline: "Sync any video to any audio with AI",
    description: "Upload a video and an audio track \u2014 our AI perfectly syncs the lip movements to the new audio. Ideal for dubbing, music videos, and avatar content.",
    href: "/lip-sync",
    bg: IMG.documentary,
    bgAlt: IMG.realistic,
    accentColor: "#10b981",
    authRequired: true,
  },
  {
    id: "enhancement-studio",
    name: "Enhancement Studio",
    badge: "WizLumina\u2122",
    badgeStyle: "gold",
    tagline: "Enhance any video \u2014 4K, colour, audio",
    description: "Upscale to 4K, apply cinematic colour grading with WizLumina\u2122, and enhance audio quality with WizSound\u2122. Make any video look and sound premium.",
    href: "/enhancement-studio",
    logo: WIZLUMINA_LOGO,
    bg: IMG.neonNoir,
    bgAlt: IMG.neonNoir2,
    accentColor: "#c4a464",
    authRequired: true,
  },
  {
    id: "style-transfer",
    name: "Style Transfer",
    badge: "WizLumina\u2122",
    badgeStyle: "gold",
    tagline: "Transform any video into a new visual style",
    description: "Apply Anime, Cinematic, 3D Animation, or any custom style to an existing video. Reimagine any existing video in a completely new aesthetic.",
    href: "/tools/video-to-video",
    bg: IMG.abstract,
    bgAlt: IMG.vintage,
    accentColor: "#9090a0",
    authRequired: true,
  },
  {
    id: "voiceover",
    name: "AI Voiceover",
    badge: "100+ Voices",
    badgeStyle: "silver",
    tagline: "Studio-quality voiceovers in any language",
    description: "Generate professional voiceovers from any script. Choose from 100+ voices across 30+ languages. Perfect for YouTube, ads, and explainer videos.",
    href: "/tools/voiceover",
    bg: IMG.musicians,
    bgAlt: IMG.youtubers,
    accentColor: "#9090a0",
    authRequired: true,
  },
  {
    id: "wiz-image",
    name: "WizImage\u2122",
    badge: "New",
    badgeStyle: "gold",
    tagline: "Create cinematic AI images and visual assets from any idea, instantly.",
    description: "Describe any image and WizImage renders it in seconds. Choose from 8 art styles, 4 aspect ratios, and build a personal gallery. Photorealistic, cinematic, anime, oil painting, and more.",
    href: "/wiz-image",
    emblem: <WizImageEmblem size={40} />,
    bg: IMG.pixar,
    bgAlt: IMG.demoPoster,
    accentColor: "#c4a464",
    authRequired: true,
  },
  {
    id: "wiz-shorts",
    name: "WizShorts\u2122",
    badge: "New",
    badgeStyle: "gold",
    tagline: "Produce scroll-stopping vertical short-form videos for social media in minutes.",
    description: "WizShorts is built for social-first creators. Generate vertical short-form videos optimised for TikTok, Instagram Reels, and YouTube Shorts — with captions, pacing, and visual hooks built in.",
    href: "/wiz-shorts",
    emblem: <WizShortsEmblem size={40} />,
    bg: IMG.aiCreators,
    bgAlt: IMG.kidsCreators,
    accentColor: "#c4a464",
    authRequired: true,
  },
  {
    id: "wizsync",
    name: "WizSync\u2122",
    badge: "WizPerformer™",
    badgeStyle: "silver",
    tagline: "Sync any AI-generated character to your audio with precision lip-sync and performance.",
    description: "Upload any audio track. WizSync detects every speaker with timestamps, separates 6 instrument stems, and maps each voice to a character \u2014 ready for AI lip-sync generation.",
    href: "/wizsync",
    logo: WIZSYNC_LOGO,
    emblem: <Mic2 className="w-10 h-10" />,
    bg: IMG.cyberpunk,
    bgAlt: IMG.neonNoir2,
    accentColor: "#9090a0",
    authRequired: true,
  },
];

const BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  gold:    { bg: "rgba(196,164,100,0.15)", text: "#e8d5a0", border: "rgba(196,164,100,0.35)" },
  silver:  { bg: "rgba(180,180,190,0.12)", text: "#c8c8d8", border: "rgba(180,180,190,0.30)" },
  red:     { bg: "rgba(239,68,68,0.12)",   text: "#fca5a5", border: "rgba(239,68,68,0.30)" },
  green:   { bg: "rgba(16,185,129,0.12)",  text: "#6ee7b7", border: "rgba(16,185,129,0.30)" },
  blue:    { bg: "rgba(59,130,246,0.12)",  text: "#93c5fd", border: "rgba(59,130,246,0.30)" },
  fuchsia: { bg: "rgba(217,70,239,0.12)",  text: "#f0abfc", border: "rgba(217,70,239,0.30)" },
};

function ToolCard({ tool }: { tool: Tool }) {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const badge = BADGE_STYLES[tool.badgeStyle ?? "silver"];
  const accentColor = tool.accentColor;

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
      className="group relative cursor-pointer rounded-3xl overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1"
      style={{
        background: "#080808",
        border: `1px solid ${accentColor}28`,
        boxShadow: `0 4px 30px rgba(0,0,0,0.6)`,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.border = `1px solid ${accentColor}60`;
        el.style.boxShadow = `0 8px 50px rgba(0,0,0,0.7), 0 0 40px ${accentColor}18`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.border = `1px solid ${accentColor}28`;
        el.style.boxShadow = `0 4px 30px rgba(0,0,0,0.6)`;
      }}
    >
      {/* Full-bleed background image */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={tool.bg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:opacity-0"
          style={{ opacity: 0.75 }}
        />
        {tool.bgAlt && (
          <img
            src={tool.bgAlt}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-0 group-hover:opacity-75 scale-110"
          />
        )}
        <div className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, rgba(8,8,8,0.15) 0%, rgba(8,8,8,0.35) 40%, rgba(8,8,8,0.95) 100%)` }} />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 80% 60% at 50% 100%, ${accentColor}18, transparent)` }} />

        {/* Lock indicator */}
        {tool.authRequired && !isAuthenticated && (
          <div className="absolute top-4 left-4 w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Lock className="w-3.5 h-3.5 text-white/40" />
          </div>
        )}

        {/* Brand logo or emblem bottom-left */}
        <div className="absolute bottom-4 left-4">
          {tool.logo ? (
            <img
              src={tool.logo}
              alt={tool.name}
              className="h-14 w-auto object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-110"
              style={{ filter: "drop-shadow(0 0 12px rgba(0,0,0,0.8))" }}
            />
          ) : tool.emblem ? (
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl"
              style={{
                background: `linear-gradient(145deg, ${accentColor}18, ${accentColor}08)`,
                border: `1px solid ${accentColor}30`,
                boxShadow: `0 0 20px ${accentColor}20`,
              }}>
              <span style={{ color: accentColor }}>{tool.emblem}</span>
            </div>
          ) : null}
        </div>

        {/* Top accent line */}
        <div className="absolute top-0 inset-x-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)` }} />
      </div>

      {/* Card content */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-xl font-black tracking-tight leading-tight"
            style={{
              background: accentColor === "#c4a464"
                ? "linear-gradient(135deg, #c4a464 0%, #e8d5a0 35%, #fff 55%, #e8d5a0 70%, #c4a464 100%)"
                : `linear-gradient(135deg, ${accentColor} 0%, #fff 50%, ${accentColor} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
            {tool.name}
          </h3>
          {tool.badge && (
            <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}>
              {tool.badge}
            </span>
          )}
        </div>
        <p className="text-white/65 text-sm font-semibold mb-2 leading-snug">{tool.tagline}</p>
        <p className="text-white/38 text-xs leading-relaxed line-clamp-3">{tool.description}</p>
        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs font-bold transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
            style={{ color: accentColor }}>
            {isAuthenticated ? "Open tool \u2192" : "Sign in to start \u2192"}
          </span>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}>
            <ArrowRight className="w-3.5 h-3.5" style={{ color: accentColor }} />
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)` }} />
    </div>
  );
}

function FeaturedCard({ tool }: { tool: Tool }) {
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
      className="group relative cursor-pointer rounded-3xl overflow-hidden transition-all duration-500 hover:scale-[1.005] hover:-translate-y-1"
      style={{
        background: "#080808",
        border: "1px solid rgba(196,164,100,0.30)",
        boxShadow: "0 4px 40px rgba(0,0,0,0.7), 0 0 60px rgba(196,164,100,0.06)",
        minHeight: "320px",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.border = "1px solid rgba(196,164,100,0.65)";
        el.style.boxShadow = "0 8px 60px rgba(0,0,0,0.8), 0 0 80px rgba(196,164,100,0.14)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.border = "1px solid rgba(196,164,100,0.30)";
        el.style.boxShadow = "0 4px 40px rgba(0,0,0,0.7), 0 0 60px rgba(196,164,100,0.06)";
      }}
    >
      <div className="absolute inset-0">
        <img src={tool.bg} alt="" className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
          style={{ opacity: 0.50 }} />
        {tool.bgAlt && (
          <img src={tool.bgAlt} alt="" className="absolute inset-0 w-full h-full object-cover transition-all duration-700 opacity-0 group-hover:opacity-50 scale-105" />
        )}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, rgba(8,8,8,0.94) 0%, rgba(8,8,8,0.60) 50%, rgba(8,8,8,0.80) 100%)" }} />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: "radial-gradient(ellipse 70% 80% at 0% 50%, rgba(196,164,100,0.10), transparent)" }} />
      </div>
      <div className="absolute top-0 inset-x-0 h-px"
        style={{ background: "linear-gradient(90deg, rgba(196,164,100,0.8), rgba(232,213,160,0.4), transparent)" }} />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8 p-8 md:p-10">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: "linear-gradient(135deg, #c4a464, #e8d5a0)", boxShadow: "0 2px 12px rgba(196,164,100,0.4)" }}>
              <Star className="w-3 h-3 fill-[#0a0a0a] text-[#0a0a0a]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a]">Most Popular</span>
            </div>
          </div>
          <div className="mb-5">
            {tool.logo ? (
              <img src={tool.logo} alt={tool.name}
                className="h-20 w-auto object-contain drop-shadow-2xl"
                style={{ filter: "drop-shadow(0 0 20px rgba(196,164,100,0.3))" }} />
            ) : (
              <h2 className="text-4xl font-black tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 35%, #fff 55%, #e8d5a0 70%, #c4a464 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>
                {tool.name}
              </h2>
            )}
          </div>
          <h3 className="text-2xl font-black text-white mb-3 leading-tight">{tool.tagline}</h3>
          <p className="text-white/50 text-base leading-relaxed max-w-md mb-6">{tool.description}</p>
          <button
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 50%, #c4a464 100%)",
              color: "#0a0a0a",
              boxShadow: "0 0 30px rgba(196,164,100,0.25), 0 4px 20px rgba(0,0,0,0.5)",
            }}>
            <Play className="w-4 h-4 fill-[#0a0a0a]" />
            {isAuthenticated ? "Open WizVideo\u2122" : "Sign in to start"}
          </button>
        </div>
        <div className="flex flex-col gap-3 md:w-56">
          {[
            { icon: "\u266b", label: "Lyrics-synced storyboard" },
            { icon: "\u25c8", label: "AI scene generation" },
            { icon: "\u25b6", label: "Full video in minutes" },
            { icon: "\u2726", label: "HD & 4K output" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(196,164,100,0.06)", border: "1px solid rgba(196,164,100,0.14)" }}>
              <span className="text-[#c4a464] text-sm font-bold w-5 text-center">{f.icon}</span>
              <span className="text-white/60 text-xs font-medium">{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Create() {
  const { isAuthenticated } = useAuth();
  const featuredTool = TOOLS[0];
  const remainingTools = TOOLS.slice(1);

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-[#060606]/95 backdrop-blur-xl border-b border-white/6">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallback="/" label="Home" />
            <NavLink href="/" className="hidden md:flex items-center">
              <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[4.5rem] w-auto object-contain" />
            </NavLink>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "How It Works", href: "/how-it-works" },
              { label: "Examples", href: "/creators" },
              { label: "Pricing", href: "/pricing" },
              { label: "Help", href: "/help" },
            ].map((l) => (
              <NavLink key={l.href} href={l.href}
                className="px-3 py-2 text-sm text-white/55 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <NavLink href="/dashboard">
                <button className="px-4 py-2 rounded-xl text-xs font-bold border border-white/12 text-white/75 hover:bg-white/6 transition-all">
                  Dashboard
                </button>
              </NavLink>
            ) : (
              <a href={getLoginUrl()}>
                <button className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 50%, #c4a464 100%)",
                    color: "#0a0a0a",
                    boxShadow: "0 0 20px rgba(196,164,100,0.20)",
                  }}>
                  Sign In Free
                </button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(196,164,100,0.07), transparent)" }} />
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: "rgba(196,164,100,0.10)", border: "1px solid rgba(196,164,100,0.22)" }}>
            <Sparkles className="w-3.5 h-3.5 text-[#c4a464]" />
            <span className="text-[10px] font-black tracking-[0.25em] uppercase text-[#c4a464]">AI Creator Studio</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.92] mb-6">
            <span className="text-white">Choose Your</span>
            <br />
            <span style={{
              background: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 30%, #fff 50%, #e8d5a0 70%, #c4a464 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              AI Creation Tool
            </span>
          </h1>
          <p className="text-white/42 text-xl max-w-xl mx-auto mb-6 leading-relaxed">
            Eleven professional AI tools. One platform. No editing skills required.
          </p>
          {!isAuthenticated && (
            <p className="text-white/28 text-sm">
              <a href={getLoginUrl()} className="underline underline-offset-2 hover:text-[#c4a464] transition-colors"
                style={{ color: "#c4a464" }}>
                Sign in free
              </a>{" "}
              to unlock all tools \u2014 50 credits included, no card needed.
            </p>
          )}
        </div>
      </div>

      {/* TOOL GRID */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20">
        <div className="mb-5">
          <FeaturedCard tool={featuredTool} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {remainingTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
        <div className="mt-16 text-center border-t border-white/5 pt-12">
          <p className="text-white/28 text-sm mb-5">Not sure where to start?</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: "How It Works", href: "/how-it-works" },
              { label: "View Pricing", href: "/pricing" },
              { label: "See Examples", href: "/creators" },
            ].map((l) => (
              <NavLink key={l.href} href={l.href}>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}>
                  <ChevronRight className="w-4 h-4" />
                  {l.label}
                </button>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
