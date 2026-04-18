/**
 * WizProductGrid — Premium luxury product section for the WIZ AI homepage.
 * Each product has its own distinct colour accent and visual personality.
 */
import { ArrowRight } from "lucide-react";
import {
  WizAudioEmblem,
  WizImageEmblem,
  WizVideoEmblem,
  WizShortsEmblem,
  WizAnimateEmblem,
  WizScriptEmblem,
} from "./WizProductEmblems";

type AccentKey = "emerald" | "amber" | "violet" | "cyan" | "rose" | "orange";

const ACCENTS: Record<AccentKey, {
  primary: string; mid: string; light: string;
  glow: string; glowHover: string;
  badgeBg: string; badgeBorder: string; badgeText: string;
  cardBg: string; borderIdle: string; borderHover: string;
  nameCss: string;
}> = {
  emerald: {
    primary: "#0d9488", mid: "#34d399", light: "#6ee7b7",
    glow: "rgba(52,211,153,0.18)", glowHover: "rgba(52,211,153,0.28)",
    badgeBg: "rgba(52,211,153,0.12)", badgeBorder: "rgba(52,211,153,0.3)", badgeText: "#6ee7b7",
    cardBg: "linear-gradient(135deg, rgba(13,148,136,0.12) 0%, rgba(5,150,105,0.04) 100%)",
    borderIdle: "rgba(52,211,153,0.18)", borderHover: "rgba(52,211,153,0.45)",
    nameCss: "linear-gradient(135deg, #0d9488 0%, #34d399 40%, #6ee7b7 55%, #34d399 70%, #0f766e 100%)",
  },
  amber: {
    primary: "#d97706", mid: "#f59e0b", light: "#fcd34d",
    glow: "rgba(245,158,11,0.18)", glowHover: "rgba(245,158,11,0.28)",
    badgeBg: "rgba(245,158,11,0.12)", badgeBorder: "rgba(245,158,11,0.3)", badgeText: "#fcd34d",
    cardBg: "linear-gradient(135deg, rgba(217,119,6,0.12) 0%, rgba(236,72,153,0.06) 100%)",
    borderIdle: "rgba(245,158,11,0.18)", borderHover: "rgba(245,158,11,0.45)",
    nameCss: "linear-gradient(135deg, #d97706 0%, #f59e0b 35%, #fcd34d 55%, #ec4899 75%, #9d174d 100%)",
  },
  violet: {
    primary: "#7c3aed", mid: "#a78bfa", light: "#c4b5fd",
    glow: "rgba(124,58,237,0.18)", glowHover: "rgba(124,58,237,0.30)",
    badgeBg: "rgba(124,58,237,0.12)", badgeBorder: "rgba(124,58,237,0.3)", badgeText: "#c4b5fd",
    cardBg: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(96,165,250,0.06) 100%)",
    borderIdle: "rgba(124,58,237,0.18)", borderHover: "rgba(124,58,237,0.45)",
    nameCss: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 35%, #a78bfa 55%, #60a5fa 75%, #1e40af 100%)",
  },
  cyan: {
    primary: "#0891b2", mid: "#06b6d4", light: "#67e8f9",
    glow: "rgba(6,182,212,0.18)", glowHover: "rgba(6,182,212,0.30)",
    badgeBg: "rgba(6,182,212,0.12)", badgeBorder: "rgba(6,182,212,0.3)", badgeText: "#67e8f9",
    cardBg: "linear-gradient(135deg, rgba(8,145,178,0.12) 0%, rgba(14,116,144,0.04) 100%)",
    borderIdle: "rgba(6,182,212,0.18)", borderHover: "rgba(6,182,212,0.45)",
    nameCss: "linear-gradient(135deg, #0e7490 0%, #06b6d4 35%, #67e8f9 55%, #06b6d4 70%, #0891b2 100%)",
  },
  rose: {
    primary: "#f43f5e", mid: "#fb7185", light: "#fda4af",
    glow: "rgba(244,63,94,0.18)", glowHover: "rgba(244,63,94,0.28)",
    badgeBg: "rgba(244,63,94,0.12)", badgeBorder: "rgba(244,63,94,0.3)", badgeText: "#fda4af",
    cardBg: "linear-gradient(135deg, rgba(244,63,94,0.12) 0%, rgba(251,146,60,0.06) 100%)",
    borderIdle: "rgba(244,63,94,0.18)", borderHover: "rgba(244,63,94,0.45)",
    nameCss: "linear-gradient(135deg, #9f1239 0%, #f43f5e 35%, #fb7185 55%, #fb923c 75%, #c2410c 100%)",
  },
  orange: {
    primary: "#d97706", mid: "#f97316", light: "#fbbf24",
    glow: "rgba(249,115,22,0.18)", glowHover: "rgba(249,115,22,0.28)",
    badgeBg: "rgba(249,115,22,0.12)", badgeBorder: "rgba(249,115,22,0.3)", badgeText: "#fbbf24",
    cardBg: "linear-gradient(135deg, rgba(217,119,6,0.12) 0%, rgba(194,65,12,0.06) 100%)",
    borderIdle: "rgba(249,115,22,0.18)", borderHover: "rgba(249,115,22,0.45)",
    nameCss: "linear-gradient(135deg, #92400e 0%, #d97706 35%, #fbbf24 55%, #f97316 75%, #c2410c 100%)",
  },
};

// ── Card background visuals ───────────────────────────────────────────────────
function AudioCardBg() {
  const bars = [4, 8, 14, 20, 28, 36, 44, 38, 30, 22, 16, 10, 6, 4, 8, 14, 22, 30, 38, 44, 36, 26, 18, 12, 8];
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="aud-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0d9488" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#0f766e" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="aud-bar" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#34d399" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.15" />
        </linearGradient>
        <radialGradient id="aud-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill="url(#aud-bg)" />
      <ellipse cx="140" cy="80" rx="110" ry="65" fill="url(#aud-glow)" />
      {bars.map((h, i) => (
        <rect key={i} x={10 + i * 10.5} y={80 - h / 2} width="5" height={h} rx="2.5" fill="url(#aud-bar)" />
      ))}
      {bars.map((h, i) => (
        <rect key={`r${i}`} x={10 + i * 10.5} y={80 + h / 2 + 2} width="5" height={h * 0.3} rx="2.5" fill="url(#aud-bar)" opacity="0.18" />
      ))}
      <line x1="0" y1="80" x2="280" y2="80" stroke="#34d399" strokeWidth="0.5" opacity="0.2" />
    </svg>
  );
}

function ImageCardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="img-bg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97706" stopOpacity="0.10" />
          <stop offset="60%" stopColor="#ec4899" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#9d174d" stopOpacity="0.03" />
        </linearGradient>
        <radialGradient id="img-glow2" cx="50%" cy="50%" r="45%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.16" />
          <stop offset="60%" stopColor="#ec4899" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill="url(#img-bg2)" />
      <ellipse cx="140" cy="80" rx="100" ry="60" fill="url(#img-glow2)" />
      {[0, 1, 2].map(row => [0, 1, 2].map(col => (
        <rect key={`${row}-${col}`} x={70 + col * 48} y={20 + row * 42} width="42" height="36" rx="4"
          stroke="#f59e0b" strokeWidth="0.75" fill="none" opacity={0.15 + (row + col) * 0.04} />
      )))}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 140 + Math.cos(rad) * 28;
        const cy = 80 + Math.sin(rad) * 28;
        return <ellipse key={i} cx={cx} cy={cy} rx="18" ry="9"
          transform={`rotate(${angle + 30}, ${cx}, ${cy})`} fill="#f59e0b" opacity="0.08" />;
      })}
      <circle cx="140" cy="80" r="22" stroke="#f59e0b" strokeWidth="0.75" fill="none" opacity="0.2" />
    </svg>
  );
}

function VideoCardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vid-bg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.12" />
          <stop offset="60%" stopColor="#60a5fa" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#1e40af" stopOpacity="0.03" />
        </linearGradient>
        <radialGradient id="vid-glow2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
          <stop offset="60%" stopColor="#60a5fa" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill="url(#vid-bg2)" />
      <ellipse cx="140" cy="80" rx="110" ry="60" fill="url(#vid-glow2)" />
      <rect x="20" y="30" width="240" height="100" rx="6" stroke="#a78bfa" strokeWidth="1" fill="none" opacity="0.25" />
      <rect x="20" y="30" width="240" height="14" rx="6" fill="#7c3aed" opacity="0.07" />
      <rect x="20" y="116" width="240" height="14" rx="6" fill="#7c3aed" opacity="0.07" />
      {[40, 75, 110, 145, 180, 215, 250].map((x, i) => (
        <rect key={`t${i}`} x={x - 5} y="33" width="10" height="8" rx="2" fill="#a78bfa" opacity="0.3" />
      ))}
      {[40, 75, 110, 145, 180, 215, 250].map((x, i) => (
        <rect key={`b${i}`} x={x - 5} y="119" width="10" height="8" rx="2" fill="#a78bfa" opacity="0.3" />
      ))}
      <line x1="95" y1="44" x2="95" y2="116" stroke="#a78bfa" strokeWidth="0.75" opacity="0.2" />
      <line x1="185" y1="44" x2="185" y2="116" stroke="#a78bfa" strokeWidth="0.75" opacity="0.2" />
      <polygon points="120,65 120,95 155,80" fill="#a78bfa" opacity="0.3" />
    </svg>
  );
}

function ShortsCardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sho-bg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0891b2" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0e7490" stopOpacity="0.04" />
        </linearGradient>
        <radialGradient id="sho-glow2" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill="url(#sho-bg2)" />
      <ellipse cx="140" cy="70" rx="90" ry="65" fill="url(#sho-glow2)" />
      {[80, 140, 200].map((cx, i) => (
        <g key={i} opacity={i === 1 ? 0.7 : 0.3}>
          <rect x={cx - 22} y="15" width="44" height="130" rx="8" stroke="#06b6d4" strokeWidth={i === 1 ? 1.2 : 0.75} fill="none" />
          <rect x={cx - 19} y="22" width="38" height="112" rx="5" stroke="#06b6d4" strokeWidth="0.5" fill="none" opacity="0.4" />
          <circle cx={cx} cy="18" r="2" fill="#06b6d4" opacity="0.4" />
          <rect x={cx - 8} y="137" width="16" height="3" rx="1.5" fill="#06b6d4" opacity="0.4" />
          {i === 1 && <polygon points={`${cx - 8},65 ${cx - 8},85 ${cx + 10},75`} fill="#06b6d4" opacity="0.6" />}
        </g>
      ))}
      {[35, 45, 55].map((y, i) => (
        <line key={i} x1="0" y1={y} x2={30 + i * 8} y2={y} stroke="#06b6d4" strokeWidth="0.75" opacity="0.25" />
      ))}
    </svg>
  );
}

function AnimateCardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ani-bg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.12" />
          <stop offset="60%" stopColor="#fb923c" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#c2410c" stopOpacity="0.03" />
        </linearGradient>
        <radialGradient id="ani-glow2" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
          <stop offset="60%" stopColor="#fb923c" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill="url(#ani-bg2)" />
      <ellipse cx="140" cy="75" rx="100" ry="60" fill="url(#ani-glow2)" />
      <polygon points="140,20 210,58 140,96 70,58" stroke="#fb7185" strokeWidth="1" fill="#f43f5e" fillOpacity="0.06" opacity="0.6" />
      <polygon points="70,58 140,96 140,140 70,102" stroke="#fb7185" strokeWidth="1" fill="#f43f5e" fillOpacity="0.04" opacity="0.4" />
      <polygon points="210,58 140,96 140,140 210,102" stroke="#fb7185" strokeWidth="1" fill="#fb923c" fillOpacity="0.05" opacity="0.5" />
      {[55, 65, 75].map((y, i) => (
        <line key={i} x1="0" y1={y} x2={20 + i * 10} y2={y} stroke="#fb7185" strokeWidth="0.75" opacity="0.3" />
      ))}
      <circle cx="220" cy="30" r="2.5" fill="#fb7185" opacity="0.5" />
      <circle cx="230" cy="45" r="1.5" fill="#fb923c" opacity="0.4" />
    </svg>
  );
}

function ScriptCardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="scr-bg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97706" stopOpacity="0.12" />
          <stop offset="60%" stopColor="#f97316" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#c2410c" stopOpacity="0.03" />
        </linearGradient>
        <radialGradient id="scr-glow2" cx="35%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d97706" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill="url(#scr-bg2)" />
      <ellipse cx="110" cy="80" rx="90" ry="60" fill="url(#scr-glow2)" />
      <rect x="30" y="15" width="110" height="130" rx="6" stroke="#f59e0b" strokeWidth="1" fill="none" opacity="0.3" />
      {[35, 48, 61, 74, 87, 100, 113].map((y, i) => (
        <line key={i} x1="44" y1={y} x2={i % 3 === 1 ? 110 : 128} y2={y} stroke="#f59e0b" strokeWidth={i === 0 ? 1.5 : 1} opacity={i === 0 ? 0.5 : 0.2} />
      ))}
      <rect x="38" y="28" width="28" height="20" rx="3" stroke="#f59e0b" strokeWidth="0.75" fill="none" opacity="0.35" />
      <path d="M155 80 L185 80 M177 72 L185 80 L177 88" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      <rect x="190" y="30" width="60" height="42" rx="4" stroke="#f59e0b" strokeWidth="0.75" fill="none" opacity="0.3" />
      <rect x="190" y="88" width="60" height="42" rx="4" stroke="#f59e0b" strokeWidth="0.75" fill="none" opacity="0.3" />
    </svg>
  );
}

// ── Product data ──────────────────────────────────────────────────────────────
interface Product {
  name: string; label: string; tagline: string; desc: string; href: string;
  emblem: React.ReactNode; accent: AccentKey; cardVisual: React.ReactNode;
}

const PRODUCTS: Product[] = [
  {
    name: "WizAudio", label: "CREATE AUDIO",
    tagline: "AI music & audio production studio",
    desc: "Generate original tracks, soundscapes, and audio from text. Studio-quality sound in seconds.",
    href: "/create", emblem: <WizAudioEmblem size={56} />, accent: "emerald", cardVisual: <AudioCardBg />,
  },
  {
    name: "WizImage", label: "CREATE IMAGES",
    tagline: "AI image & artwork creator",
    desc: "Describe any image and WizImage renders it in seconds. 8 art styles, photorealistic to cinematic.",
    href: "/wiz-image", emblem: <WizImageEmblem size={56} />, accent: "amber", cardVisual: <ImageCardBg />,
  },
  {
    name: "WizVideo", label: "CREATE VIDEO",
    tagline: "Upload a song, get a full music video",
    desc: "Turn any track into a full-length AI-directed music video — scenes, cuts, and all.",
    href: "/music-video/create", emblem: <WizVideoEmblem size={56} />, accent: "violet", cardVisual: <VideoCardBg />,
  },
  {
    name: "WizShorts", label: "CREATE SHORTS",
    tagline: "Short-form vertical video creator",
    desc: "Create viral-ready vertical videos for TikTok, Instagram Reels, and YouTube Shorts.",
    href: "/wiz-shorts", emblem: <WizShortsEmblem size={56} />, accent: "cyan", cardVisual: <ShortsCardBg />,
  },
  {
    name: "WizAnimate", label: "CREATE ANIMATION",
    tagline: "AI character animation engine",
    desc: "Bring characters to life with fluid, beat-matched AI animation. Every movement timed to the music.",
    href: "/products/wizanimate", emblem: <WizAnimateEmblem size={56} />, accent: "rose", cardVisual: <AnimateCardBg />,
  },
  {
    name: "WizScript", label: "CREATE CINEMATIC",
    tagline: "Scene-by-scene cinematic control",
    desc: "Write each scene yourself for full creative control. Script to storyboard to cinematic video.",
    href: "/text-to-video", emblem: <WizScriptEmblem size={56} />, accent: "orange", cardVisual: <ScriptCardBg />,
  },
];

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ product }: { product: Product }) {
  const a = ACCENTS[product.accent];
  return (
    <a
      href={product.href}
      className="group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300"
      style={{
        background: "linear-gradient(160deg, #0a0a0a 0%, #080808 100%)",
        border: `1px solid ${a.borderIdle}`,
        boxShadow: `0 2px 20px ${a.glow}`,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.border = `1px solid ${a.borderHover}`;
        el.style.boxShadow = `0 4px 40px ${a.glowHover}, 0 0 0 1px ${a.borderHover}`;
        el.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.border = `1px solid ${a.borderIdle}`;
        el.style.boxShadow = `0 2px 20px ${a.glow}`;
        el.style.transform = "translateY(0)";
      }}
    >
      {/* Card visual background */}
      <div className="relative h-36 overflow-hidden" style={{ background: a.cardBg }}>
        {product.cardVisual}
        <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
          style={{ background: "linear-gradient(0deg, #0a0a0a 0%, transparent 100%)" }} />
        {/* Badge */}
        <div className="absolute top-3 left-3">
          <span className="text-[9px] font-black tracking-[0.2em] uppercase px-2 py-0.5 rounded-full"
            style={{ background: a.badgeBg, border: `1px solid ${a.badgeBorder}`, color: a.badgeText }}>
            {product.label}
          </span>
        </div>
        {/* Emblem */}
        <div className="absolute bottom-2 right-3 opacity-90 group-hover:opacity-100 transition-opacity duration-300">
          {product.emblem}
        </div>
      </div>

      {/* Card content */}
      <div className="relative flex flex-col gap-2 p-5 pt-3">
        <h3 className="text-xl font-black tracking-tight leading-none"
          style={{ background: a.nameCss, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          {product.name}
        </h3>
        <p className="text-white/75 text-sm font-semibold leading-snug">{product.tagline}</p>
        <p className="text-white/40 text-xs leading-relaxed">{product.desc}</p>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0"
          style={{ color: a.light }}>
          Start creating <ArrowRight className="w-3 h-3" />
        </div>
      </div>

      {/* Hover corner glow */}
      <div className="absolute top-0 right-0 w-36 h-36 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${a.glow}, transparent 70%)` }} />
      {/* Hover bottom shimmer */}
      <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${a.mid}55, transparent)` }} />
    </a>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function WizProductGrid() {
  return (
    <section id="products" className="relative py-28 px-6 scroll-mt-20 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #030303 0%, #050505 50%, #030303 100%)" }}>
      {/* Multi-colour atmospheric depth */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: [
          "radial-gradient(ellipse 60% 40% at 20% 30%, rgba(52,211,153,0.03) 0%, transparent 70%)",
          "radial-gradient(ellipse 60% 40% at 80% 30%, rgba(124,58,237,0.03) 0%, transparent 70%)",
          "radial-gradient(ellipse 80% 50% at 50% 80%, rgba(249,115,22,0.03) 0%, transparent 70%)",
        ].join(", "),
      }} />
      {/* Grain texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundSize: "256px 256px" }} />
      <div className="luxury-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto relative">
        <div className="mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">WIZ AI Platform</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white leading-tight mb-4">
            Choose what you want to create
          </h2>
          <p className="text-white/40 text-lg max-w-xl leading-relaxed">
            Six premium AI creation tools — one unified platform. No editing experience required.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRODUCTS.map((p) => <ProductCard key={p.name} product={p} />)}
        </div>

        <div className="mt-16 text-center">
          <a href="/create" className="btn-primary inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-sm font-bold">
            <span>Explore All Tools</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <p className="mt-4 text-white/25 text-xs">50 free credits on sign-up — no card required</p>
        </div>
      </div>

      <div className="luxury-divider absolute bottom-0 left-0 right-0" />
    </section>
  );
}
