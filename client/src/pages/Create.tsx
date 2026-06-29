import {
  WIZVIDEO_STUDIO_PAGE,
  WIZPILOT_STUDIO_PAGE,
  WIZIMAGE_STUDIO_PAGE,
  WIZSHORTS_STUDIO_PAGE,
  WIZSYNC_STUDIO_PAGE,
  WIZSCRIPT_STUDIO_PAGE,
} from "@/lib/routes";
import { LandscapeHint } from "@/components/LandscapeHint";
import { getProduct } from "@/lib/products";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  Layers, Sparkles, ArrowRight, Lock, Mic2,
  Star, Play, Settings,
} from "@/lib/icons";
import PublicNavBar from "@/components/PublicNavBar";
import {
  WizAudioEmblem,
  WizImageEmblem,
  WizVideoEmblem,
  WizShortsEmblem,
  WizAnimateEmblem,
  WizScriptEmblem,
} from "@/components/WizProductEmblems";

const CDN = "/manus-storage";
const WIZPILOT_LOGO = `${CDN}/wizscript-logo-v1_c6af5345.png`;
const WIZSOUND_LOGO = `${CDN}/wizsound-logo-new_c5cced65_d334a3bb.png`;
const WIZLUMINA_LOGO = `${CDN}/wizlumina-logo-new_0709f3c5_83ddc673.png`;
const WIZCREATE_LOGO = `${CDN}/wizcreate-logo-new_85a25756_f4aa29bb.png`;
const WIZANIMATE_LOGO = `${CDN}/wizanimate-logo-new_a84f9808_a089857a.png`;
const WIZSYNC_LOGO = `${CDN}/wizsync-logo-new_9563f007_70cef76a.png`;

const IMG = {
  musicVideo:   `${CDN}/wizbeat-musician-solo_c77dcffb.jpg`,
  cinematic:    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-cinematic-2-h73cYMBR7EECiKvo2X9uWr.webp",
  cinematic2:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-cinematic-1-7fzYSK4QF3mixYeH3YCQwJ.webp",
  anime:        "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizanimate-kids-thumb-FhzAxoBuN8orFaGnJZGRmM.webp",
  anime2:       "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-anime-1-V8cGaKNXBvMPgNtyuk2xCr.webp",
  neonNoir:     "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-neon-noir-1-GDpPcEYGEwEHgfbURRVa2k.webp",
  neonNoir2:    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-neon-noir-2-YErB4W3WPjcqzZRDEQe8wU.webp",
  epicFantasy:  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-epic-fantasy-1-4xZQHj6htBWh5fPP25HQQf.webp",
  documentary:  "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-documentary-2-JZWthvzPWVptr78ua34rZz.webp",
  realistic:    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-realistic-2-Xg8LGZv3hqv8kvqqApjVav.webp",
  abstract:     "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-abstract-1-ZjbMsSCt6wFuq7NBMAyxHR.webp",
  vintage:      "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-vintage-2-NJ6jDetQEdsupChus3Npta.webp",
  pixar:        "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-pixar-2-kCF7GThiy6baRGQLei9RKw.webp",
  horror:       "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-horror-1-SiNk872QcoYBRoMFbonyfG.webp",
  musicians:    `${CDN}/whos-it-for-musicians_45f54b69.png`,
  youtubers:    `${CDN}/whos-it-for-youtubers_58ce347b.png`,
  aiCreators:   `${CDN}/whos-it-for-ai-creators_722cf5c6.png`,
  kidsCreators: `${CDN}/whos-it-for-kids_09e9420f.png`,
  demoPoster:   `${CDN}/step3-ai-scene_a71432c5.png`,
  neonStage:    `${CDN}/showcase-stage-performance_3379ee75.jpg`,
  cyberpunk:    `${CDN}/showcase-midnight-city_caf4be96.jpg`,
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

// ── Core creation products (six flagship products) ────────────────────────────
const CORE_TOOLS: Tool[] = [
  {
    id: "music-video",
    name: getProduct("wizvideo")!.name,
    badge: "Most Popular",
    badgeStyle: "gold",
    tagline: getProduct("wizvideo")!.tagline,
    description: getProduct("wizvideo")!.shortDesc,
    href: WIZVIDEO_STUDIO_PAGE,
    logo: WIZPILOT_LOGO,
    emblem: <WizVideoEmblem size={40} />,
    bg: IMG.musicVideo,
    bgAlt: IMG.neonStage,
    accentColor: "#c4a464",
    popular: true,
    authRequired: true,
  },
  {
    id: "wiz-shorts",
    name: getProduct("wizshorts")!.name,
    badge: "For Creators",
    badgeStyle: "fuchsia",
    tagline: getProduct("wizshorts")!.tagline,
    description: getProduct("wizshorts")!.shortDesc,
    href: WIZSHORTS_STUDIO_PAGE,
    emblem: <WizShortsEmblem size={40} />,
    bg: IMG.aiCreators,
    bgAlt: IMG.kidsCreators,
    accentColor: "#d946ef",
    authRequired: true,
  },
  {
    id: "wiz-animate",
    name: getProduct("wizanimate")!.name,
    badge: "Animation",
    badgeStyle: "fuchsia",
    tagline: getProduct("wizanimate")!.tagline,
    description: getProduct("wizanimate")!.shortDesc,
    href: getProduct("wizanimate")!.productPage,
    logo: WIZANIMATE_LOGO,
    emblem: <WizAnimateEmblem size={40} />,
    bg: IMG.anime,
    bgAlt: IMG.anime2,
    accentColor: "#f97316",
    authRequired: true,
  },
  {
    id: "wiz-script",
    name: getProduct("wizscript")!.name,
    badge: "Cinematic",
    badgeStyle: "silver",
    tagline: getProduct("wizscript")!.tagline,
    description: getProduct("wizscript")!.shortDesc,
    href: WIZSCRIPT_STUDIO_PAGE,
    emblem: <WizScriptEmblem size={40} />,
    bg: IMG.epicFantasy,
    bgAlt: IMG.horror,
    accentColor: "#7c3aed",
    authRequired: true,
  },
  {
    id: "wiz-image",
    name: getProduct("wizimage")!.name,
    badge: "Images",
    badgeStyle: "blue",
    tagline: getProduct("wizimage")!.tagline,
    description: getProduct("wizimage")!.shortDesc,
    href: WIZIMAGE_STUDIO_PAGE,
    emblem: <WizImageEmblem size={40} />,
    bg: IMG.pixar,
    bgAlt: IMG.demoPoster,
    accentColor: "#6366f1",
    authRequired: true,
  },
  {
    id: "wiz-sound",
    name: getProduct("wizsound")!.name,
    badge: "Audio",
    badgeStyle: "green",
    tagline: getProduct("wizsound")!.tagline,
    description: getProduct("wizsound")!.shortDesc,
    href: "/music-creator",
    logo: WIZSOUND_LOGO,
    emblem: <WizAudioEmblem size={40} />,
    bg: IMG.abstract,
    bgAlt: IMG.vintage,
    accentColor: "#c9a84c",
    authRequired: true,
  },
];

// ── Utility & enhancement tools ───────────────────────────────────────────────
const UTILITY_TOOLS: Tool[] = [
  {
    id: "autopilot",
    name: getProduct("wizpilot")!.name,
    badge: "WizPilot™",
    badgeStyle: "blue",
    tagline: getProduct("wizpilot")!.tagline,
    description: getProduct("wizpilot")!.shortDesc,
    href: WIZPILOT_STUDIO_PAGE,
    logo: WIZCREATE_LOGO,
    emblem: <WizScriptEmblem size={40} />,
    bg: IMG.cinematic,
    bgAlt: IMG.cinematic2,
    accentColor: "#3b82f6",
    authRequired: true,
  },
  {
    id: "lip-sync",
    name: "Lip Sync",
    badge: "WIZ AI",
    badgeStyle: "silver",
    tagline: "Sync any video to any audio with AI",
    description: "Upload a video and an audio track — our AI perfectly syncs the lip movements to the new audio. Ideal for dubbing, music videos, and avatar content.",
    href: "/lip-sync",
    bg: IMG.documentary,
    bgAlt: IMG.realistic,
    accentColor: "#10b981",
    authRequired: true,
  },
  {
    id: "enhancement-studio",
    name: "Enhancement Studio",
    badge: "WizLumina™",
    badgeStyle: "gold",
    tagline: "Enhance any video — 4K, colour, audio",
    description: "Upscale to 4K, apply cinematic colour grading with WizLumina™, and enhance audio quality with WizSound™. Make any video look and sound premium.",
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
    badge: "WizLumina™",
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
    id: "wizsync",
    name: getProduct("wizsync")!.name,
    badge: "WizPerformer™",
    badgeStyle: "silver",
    tagline: "Sync any AI-generated character to your audio with precision lip-sync and performance.",
    description: "Upload any audio track. WizSync detects every speaker with timestamps, separates 6 instrument stems, and maps each voice to a character — ready for AI lip-sync generation.",
    href: WIZSYNC_STUDIO_PAGE,
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
        background: "#060606",
        border: `1px solid ${accentColor}28`,
        boxShadow: `0 8px 40px rgba(0,0,0,0.7)`,
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
      <div className="relative h-64 overflow-hidden">
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
            {isAuthenticated ? "Open tool →" : "Sign in to start →"}
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
          style={{ backgroundImage: "linear-gradient(135deg, rgba(8,8,8,0.94) 0%, rgba(8,8,8,0.60) 50%, rgba(8,8,8,0.80) 100%)" }} />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: "radial-gradient(ellipse 70% 80% at 0% 50%, rgba(196,164,100,0.10), transparent)" }} />
      </div>
      <div className="absolute top-0 inset-x-0 h-px"
        style={{ backgroundImage: "linear-gradient(90deg, rgba(196,164,100,0.8), rgba(232,213,160,0.4), transparent)" }} />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8 p-8 md:p-10">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ backgroundImage: "linear-gradient(135deg, #c4a464, #e8d5a0)", boxShadow: "0 2px 12px rgba(196,164,100,0.4)" }}>
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
                  backgroundImage: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 35%, #fff 55%, #e8d5a0 70%, #c4a464 100%)",
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
              backgroundImage: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 50%, #c4a464 100%)",
              color: "#0a0a0a",
              boxShadow: "0 0 30px rgba(196,164,100,0.25), 0 4px 20px rgba(0,0,0,0.5)",
            }}>
            <Play className="w-4 h-4 fill-[#0a0a0a]" />
            {isAuthenticated ? "Open WizVideo™" : "Sign in to start"}
          </button>
        </div>
        <div className="flex flex-col gap-3 md:w-56">
          {[
            { label: "Lyrics-synced storyboard" },
            { icon: "◈", label: "AI scene generation" },
            { icon: "▶", label: "Full video in minutes" },
            { label: "HD & 4K output" },
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

// ── Section divider with label ─────────────────────────────────────────────────
function SectionDivider({ icon, label, sublabel }: { icon: React.ReactNode; label: string; sublabel?: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(196,164,100,0.10)", border: "1px solid rgba(196,164,100,0.20)" }}>
          <span className="text-[#c4a464]">{icon}</span>
        </div>
        <div>
          <p className="text-[11px] font-black tracking-[0.25em] uppercase text-[#c4a464]">{label}</p>
          {sublabel && <p className="text-[10px] text-white/30 mt-0.5">{sublabel}</p>}
        </div>
      </div>
      <div className="flex-1 h-px" style={{ backgroundImage: "linear-gradient(90deg, rgba(196,164,100,0.25), transparent)" }} />
    </div>
  );
}

export default function Create() {
  const { isAuthenticated } = useAuth();
  const featuredTool = CORE_TOOLS[0];
  const remainingCoreTools = CORE_TOOLS.slice(1);

  return (
    <div className="min-h-screen text-white" style={{ background: "#040404" }}>
      {/* ── Ambient background layers ────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {/* Deep black base */}
        <div className="absolute inset-0" style={{ background: "#040404" }} />
        {/* Gold radial glow — top centre */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 55% at 50% -10%, rgba(196,164,100,0.09), transparent 65%)" }} />
        {/* Secondary warm glow — bottom right */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 90% 100%, rgba(196,164,100,0.05), transparent 70%)" }} />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(196,164,100,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(196,164,100,0.025) 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
        {/* Noise texture overlay */}
        <div className="absolute inset-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")", opacity: 0.4 }} />
      </div>

      {/* ── Unified PublicNavBar ─────────────────────────────────────────────── */}
      <div className="relative" style={{ zIndex: 10 }}>
      <PublicNavBar />
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
           <div className="relative overflow-hidden" style={{ zIndex: 1 }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(196,164,100,0.07), transparent)" }} />
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: "rgba(196,164,100,0.10)", border: "1px solid rgba(196,164,100,0.22)" }}>
            <Sparkles className="w-3.5 h-3.5 text-[#c4a464]" />
            <span className="text-[10px] font-black tracking-[0.25em] uppercase text-[#c4a464]">AI Creator Studio</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.92] mb-6">
            <span className="text-white">Choose Your</span>
            <br />
            <span style={{
              backgroundImage: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 30%, #fff 50%, #e8d5a0 70%, #c4a464 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              AI Creation Tool
            </span>
          </h1>
          <p className="text-white/42 text-xl max-w-xl mx-auto mb-6 leading-relaxed">
            Six core creation tools plus enhancement utilities. One platform. No editing skills required.
          </p>
          {!isAuthenticated && (
            <p className="text-white/28 text-sm">
              <a href={getLoginUrl()} className="underline underline-offset-2 hover:text-[#c4a464] transition-colors"
                style={{ color: "#c4a464" }}>
                Sign in free
              </a>{" "}
              to unlock all tools — 30 free credits included, no card needed.
            </p>
          )}
        </div>
      </div>

      {/* ── Core creation tools ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-8 relative" style={{ zIndex: 1 }}>
        <SectionDivider
          icon={<Layers className="w-4 h-4" />}
          label="Core Creation Tools"
          sublabel="Six flagship AI creation products"
        />

        {/* Featured card — WizVideo */}
        <div className="mb-5">
          <FeaturedCard tool={featuredTool} />
        </div>

        {/* Remaining core tools — 5 in a responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {remainingCoreTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>

      {/* ── Utility & enhancement tools ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 mt-12 relative" style={{ zIndex: 1 }}>
        {/* Visual separator */}
        <div className="border-t border-white/5 pt-12 mb-8">
          <SectionDivider
            icon={<Settings className="w-4 h-4" />}
            label="Enhancement & Utility Tools"
            sublabel="Enhance, sync, and transform your existing content"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {UTILITY_TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>

      {/* ── Footer CTA ──────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 relative" style={{ zIndex: 1 }}>
        <div className="text-center border-t border-white/5 pt-12">
          <p className="text-white/28 text-sm mb-5">Not sure where to start?</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: "How It Works", href: "/how-it-works" },
              { label: "View Pricing", href: "/pricing" },
              { label: "See Examples", href: "/creators" },
            ].map((l) => (
              <a key={l.href} href={l.href}>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}>
                  <ArrowRight className="w-4 h-4" />
                  {l.label}
                </button>
              </a>
            ))}
          </div>
        </div>
      </div>
      <LandscapeHint />
    </div>
  );
}
