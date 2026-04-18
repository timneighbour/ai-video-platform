/**
 * WizProductGrid — Premium luxury product section for the WIZ AI homepage.
 *
 * Design brief:
 * - Each card is a branded mini-product, not a generic feature tile
 * - Custom SVG emblems per product with reflective metallic gold/silver
 * - Cinematic card backgrounds with product-specific visual storytelling
 * - Atmospheric depth: radial glows, grain texture, ambient light
 * - Product names use metallic-gold / metallic-silver CSS shimmer animation
 * - The whole section feels like a luxury AI production suite
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

interface Product {
  name: string;
  label: string;
  tagline: string;
  desc: string;
  href: string;
  emblem: React.ReactNode;
  /** "gold" | "silver" — controls accent system */
  accent: "gold" | "silver";
  /** Inline SVG background visual for the card */
  cardVisual: React.ReactNode;
}

// ── Per-product cinematic card background visuals ─────────────────────────────

/** WizAudio — studio waveform / EQ visualiser */
function AudioCardBg() {
  const bars = [4, 8, 14, 20, 28, 36, 44, 38, 30, 22, 16, 10, 6, 4, 8, 14, 22, 30, 38, 44, 36, 26, 18, 12, 8];
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="audio-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#b8892a" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#4a3010" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="audio-bar" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f2dfa0" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#b8892a" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#4a3010" stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id="audio-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#b8892a" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#b8892a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill="url(#audio-bg)" />
      <ellipse cx="140" cy="80" rx="100" ry="60" fill="url(#audio-glow)" />
      {/* Waveform bars */}
      {bars.map((h, i) => (
        <rect
          key={i}
          x={10 + i * 10.5}
          y={80 - h / 2}
          width="5"
          height={h}
          rx="2.5"
          fill="url(#audio-bar)"
        />
      ))}
      {/* Reflection */}
      {bars.map((h, i) => (
        <rect
          key={`r${i}`}
          x={10 + i * 10.5}
          y={80 + h / 2 + 2}
          width="5"
          height={h * 0.35}
          rx="2.5"
          fill="url(#audio-bar)"
          opacity="0.2"
        />
      ))}
      {/* Horizontal centre line */}
      <line x1="0" y1="80" x2="280" y2="80" stroke="#b8892a" strokeWidth="0.5" opacity="0.25" />
    </svg>
  );
}

/** WizImage — luxury image grid / aperture */
function ImageCardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="img-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b8892a" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#4a3010" stopOpacity="0.04" />
        </linearGradient>
        <radialGradient id="img-glow" cx="50%" cy="50%" r="45%">
          <stop offset="0%" stopColor="#e8c878" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#b8892a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="img-frame" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f2dfa0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7a5820" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <rect width="280" height="160" fill="url(#img-bg)" />
      <ellipse cx="140" cy="80" rx="90" ry="60" fill="url(#img-glow)" />
      {/* 3×2 image grid */}
      {[
        [20, 20, 70, 50], [100, 20, 70, 50], [180, 20, 80, 50],
        [20, 90, 80, 50], [110, 90, 70, 50], [190, 90, 70, 50],
      ].map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} rx="4" stroke="url(#img-frame)" strokeWidth="1" fill="none" opacity={0.5 - i * 0.04} />
          {/* Horizon line inside each frame */}
          <line x1={x + 6} y1={y + h * 0.6} x2={x + w - 6} y2={y + h * 0.6} stroke="#b8892a" strokeWidth="0.5" opacity="0.3" />
          {/* Subject dot */}
          <circle cx={x + w / 2} cy={y + h * 0.4} r="3" fill="#b8892a" opacity="0.25" />
        </g>
      ))}
      {/* Aperture circle */}
      <circle cx="140" cy="80" r="28" stroke="#e8c878" strokeWidth="0.75" fill="none" opacity="0.2" />
      <circle cx="140" cy="80" r="18" stroke="#e8c878" strokeWidth="0.5" fill="none" opacity="0.15" />
    </svg>
  );
}

/** WizVideo — cinematic storyboard strip */
function VideoCardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vid-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b8892a" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#4a3010" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="vid-frame" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f2dfa0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7a5820" stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id="vid-glow" cx="50%" cy="50%" r="40%">
          <stop offset="0%" stopColor="#b8892a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#b8892a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill="url(#vid-bg)" />
      <ellipse cx="140" cy="80" rx="100" ry="55" fill="url(#vid-glow)" />
      {/* Film strip top/bottom */}
      <rect x="0" y="0" width="280" height="18" fill="#000" opacity="0.4" />
      <rect x="0" y="142" width="280" height="18" fill="#000" opacity="0.4" />
      {/* Sprocket holes top */}
      {[10, 30, 50, 70, 90, 110, 130, 150, 170, 190, 210, 230, 250, 270].map((x, i) => (
        <rect key={`t${i}`} x={x} y="3" width="12" height="10" rx="2" fill="#b8892a" opacity="0.3" />
      ))}
      {/* Sprocket holes bottom */}
      {[10, 30, 50, 70, 90, 110, 130, 150, 170, 190, 210, 230, 250, 270].map((x, i) => (
        <rect key={`b${i}`} x={x} y="147" width="12" height="10" rx="2" fill="#b8892a" opacity="0.3" />
      ))}
      {/* 4 scene frames */}
      {[10, 80, 150, 200].map((x, i) => (
        <g key={i}>
          <rect x={x} y="26" width={i === 3 ? 70 : 62} height="108" rx="3" stroke="url(#vid-frame)" strokeWidth="1" fill="none" opacity={0.5 - i * 0.06} />
          {/* Horizon */}
          <line x1={x + 6} y1="90" x2={x + (i === 3 ? 64 : 56)} y2="90" stroke="#b8892a" strokeWidth="0.5" opacity="0.25" />
        </g>
      ))}
      {/* Play button in centre scene */}
      <polygon points="108,62 108,98 148,80" fill="#b8892a" opacity="0.5" />
      <circle cx="128" cy="80" r="22" stroke="#e8c878" strokeWidth="1" fill="none" opacity="0.3" />
    </svg>
  );
}

/** WizShorts — vertical phone frame with progress bar */
function ShortsCardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shorts-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b8892a" stopOpacity="0.09" />
          <stop offset="100%" stopColor="#4a3010" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="shorts-frame" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f2dfa0" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#7a5820" stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id="shorts-glow" cx="50%" cy="50%" r="40%">
          <stop offset="0%" stopColor="#b8892a" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#b8892a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill="url(#shorts-bg)" />
      {/* Three phone frames — left, centre (prominent), right */}
      {/* Left phone — slightly behind */}
      <rect x="60" y="15" width="54" height="96" rx="8" stroke="url(#shorts-frame)" strokeWidth="0.75" fill="none" opacity="0.25" />
      {/* Right phone — slightly behind */}
      <rect x="166" y="15" width="54" height="96" rx="8" stroke="url(#shorts-frame)" strokeWidth="0.75" fill="none" opacity="0.25" />
      {/* Centre phone — prominent */}
      <rect x="100" y="8" width="80" height="144" rx="10" stroke="url(#shorts-frame)" strokeWidth="1.5" fill="none" opacity="0.6" />
      <ellipse cx="140" cy="80" rx="60" ry="80" fill="url(#shorts-glow)" />
      {/* Screen area */}
      <rect x="104" y="16" width="72" height="118" rx="6" stroke="#b8892a" strokeWidth="0.5" fill="none" opacity="0.2" />
      {/* Play button */}
      <polygon points="126,60 126,100 164,80" fill="#b8892a" opacity="0.55" />
      {/* Progress bar */}
      <rect x="108" y="126" width="64" height="3" rx="1.5" fill="#4a3010" opacity="0.4" />
      <rect x="108" y="126" width="38" height="3" rx="1.5" fill="#e8c878" opacity="0.6" />
      {/* Camera notch */}
      <circle cx="140" cy="13" r="3" fill="#b8892a" opacity="0.4" />
      {/* Home indicator */}
      <rect x="128" y="148" width="24" height="3" rx="1.5" fill="#b8892a" opacity="0.35" />
    </svg>
  );
}

/** WizAnimate — isometric 3D animation frame */
function AnimateCardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="anim-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b8892a" stopOpacity="0.09" />
          <stop offset="100%" stopColor="#4a3010" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="anim-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f2dfa0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#b8892a" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="anim-left" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7a5820" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4a3010" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="anim-right" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b8892a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7a5820" stopOpacity="0.15" />
        </linearGradient>
        <radialGradient id="anim-glow" cx="50%" cy="45%" r="40%">
          <stop offset="0%" stopColor="#e8c878" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#b8892a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill="url(#anim-bg)" />
      <ellipse cx="140" cy="72" rx="90" ry="60" fill="url(#anim-glow)" />
      {/* Large isometric cube */}
      {/* Top face */}
      <polygon points="140,20 210,58 140,96 70,58" fill="url(#anim-top)" opacity="0.7" />
      <polygon points="140,20 210,58 140,96 70,58" stroke="#f2dfa0" strokeWidth="1" fill="none" opacity="0.4" />
      {/* Left face */}
      <polygon points="70,58 140,96 140,140 70,102" fill="url(#anim-left)" opacity="0.8" />
      <polygon points="70,58 140,96 140,140 70,102" stroke="#b8892a" strokeWidth="1" fill="none" opacity="0.3" />
      {/* Right face */}
      <polygon points="210,58 140,96 140,140 210,102" fill="url(#anim-right)" opacity="0.8" />
      <polygon points="210,58 140,96 140,140 210,102" stroke="#b8892a" strokeWidth="1" fill="none" opacity="0.35" />
      {/* Specular vertex */}
      <circle cx="140" cy="96" r="3.5" fill="#f2dfa0" opacity="0.8" />
      {/* Motion lines */}
      {[0, 6, 12].map((offset, i) => (
        <line key={i} x1={20 + offset} y1={80 + offset * 0.5} x2={55 + offset} y2={80 + offset * 0.5} stroke="#b8892a" strokeWidth="0.75" opacity={0.3 - i * 0.08} />
      ))}
      {/* Stars */}
      <circle cx="240" cy="25" r="2" fill="#f2dfa0" opacity="0.5" />
      <circle cx="248" cy="35" r="1.2" fill="#e8c878" opacity="0.35" />
      <circle cx="235" cy="38" r="1" fill="#d4aa48" opacity="0.3" />
    </svg>
  );
}

/** WizScript — script page with scene arrow */
function ScriptCardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="script-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b8892a" stopOpacity="0.09" />
          <stop offset="100%" stopColor="#4a3010" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="script-page" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f2dfa0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7a5820" stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id="script-glow" cx="35%" cy="50%" r="40%">
          <stop offset="0%" stopColor="#b8892a" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#b8892a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill="url(#script-bg)" />
      <ellipse cx="100" cy="80" rx="80" ry="60" fill="url(#script-glow)" />
      {/* Script page */}
      <rect x="20" y="12" width="110" height="136" rx="6" stroke="url(#script-page)" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Scene number box */}
      <rect x="28" y="22" width="28" height="20" rx="3" stroke="#b8892a" strokeWidth="1" fill="none" opacity="0.4" />
      <text x="42" y="36" textAnchor="middle" fill="#e8c878" fontSize="9" fontWeight="bold" opacity="0.6">INT.</text>
      {/* Script lines */}
      {[52, 64, 76, 88, 100, 112, 124, 136].map((y, i) => (
        <line
          key={i}
          x1="28"
          y1={y}
          x2={i % 3 === 0 ? 100 : i % 3 === 1 ? 116 : 90}
          y2={y}
          stroke="#b8892a"
          strokeWidth={i === 0 ? 1.5 : 1}
          opacity={i === 0 ? 0.6 : 0.25}
        />
      ))}
      {/* Arrow — script to scene */}
      <path
        d="M140 80 L170 80"
        stroke="#e8c878"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
      <polygon points="166,74 178,80 166,86" fill="#e8c878" opacity="0.6" />
      {/* Scene frame */}
      <rect x="182" y="30" width="78" height="56" rx="5" stroke="url(#script-page)" strokeWidth="1.5" fill="none" opacity="0.5" />
      <line x1="188" y1="62" x2="254" y2="62" stroke="#b8892a" strokeWidth="0.5" opacity="0.3" />
      <circle cx="221" cy="50" r="8" stroke="#b8892a" strokeWidth="0.75" fill="none" opacity="0.3" />
      {/* Second scene frame */}
      <rect x="182" y="96" width="78" height="52" rx="5" stroke="url(#script-page)" strokeWidth="1" fill="none" opacity="0.3" />
      <polygon points="210,108 210,136 238,122" fill="#b8892a" opacity="0.3" />
    </svg>
  );
}

// ── Product data ──────────────────────────────────────────────────────────────
const PRODUCTS: Product[] = [
  {
    name: "WizAudio",
    label: "Create Audio",
    tagline: "Studio-quality music, vocals & soundtracks",
    desc: "Produce full songs, vocals, and cinematic soundtracks in minutes — no studio required.",
    href: "/music-creator",
    emblem: <WizAudioEmblem size={56} />,
    accent: "gold",
    cardVisual: <AudioCardBg />,
  },
  {
    name: "WizImage",
    label: "Create Images",
    tagline: "Publish-ready visuals, thumbnails & artwork",
    desc: "Generate photorealistic images, thumbnails, characters, and brand visuals from any prompt.",
    href: "/wiz-image",
    emblem: <WizImageEmblem size={56} />,
    accent: "gold",
    cardVisual: <ImageCardBg />,
  },
  {
    name: "WizVideo",
    label: "Create Videos",
    tagline: "Full music videos from any track",
    desc: "Upload a song and get a complete AI-directed music video — lyrics-synced, scene by scene.",
    href: "/music-video/create",
    emblem: <WizVideoEmblem size={56} />,
    accent: "gold",
    cardVisual: <VideoCardBg />,
  },
  {
    name: "WizShorts",
    label: "Create Shorts",
    tagline: "Viral Shorts, Reels & TikToks in seconds",
    desc: "Turn any topic into a high-performing 15–60s vertical video, ready to post instantly.",
    href: "/wiz-shorts",
    emblem: <WizShortsEmblem size={56} />,
    accent: "gold",
    cardVisual: <ShortsCardBg />,
  },
  {
    name: "WizAnimate",
    label: "Create Animation",
    tagline: "Cinematic 3D animation from a single prompt",
    desc: "Create stylised 3D animation, motion graphics, and visual stories — no rigging, no timeline.",
    href: "/kids-video",
    emblem: <WizAnimateEmblem size={56} />,
    accent: "gold",
    cardVisual: <AnimateCardBg />,
  },
  {
    name: "WizScript",
    label: "Create from Text",
    tagline: "Text to scenes, storyboards & full video",
    desc: "Describe your idea and WizScript writes the storyboard, generates every scene, and renders a full video.",
    href: "/text-to-video",
    emblem: <WizScriptEmblem size={56} />,
    accent: "gold",
    cardVisual: <ScriptCardBg />,
  },
];

// ── Product card component ────────────────────────────────────────────────────
function ProductCard({ product }: { product: Product }) {
  const isGold = product.accent === "gold";
  return (
    <a
      href={product.href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-500 cursor-pointer"
      style={{
        background: "linear-gradient(160deg, #0d0d0d 0%, #080808 100%)",
        borderColor: isGold ? "rgba(184,137,42,0.18)" : "rgba(144,144,160,0.15)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = isGold ? "rgba(232,200,120,0.45)" : "rgba(192,192,204,0.35)";
        el.style.boxShadow = isGold
          ? "0 8px 40px rgba(0,0,0,0.6), 0 0 40px rgba(184,137,42,0.12), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "0 8px 40px rgba(0,0,0,0.6), 0 0 30px rgba(144,144,160,0.08), inset 0 1px 0 rgba(255,255,255,0.04)";
        el.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = isGold ? "rgba(184,137,42,0.18)" : "rgba(144,144,160,0.15)";
        el.style.boxShadow = "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)";
        el.style.transform = "translateY(0)";
      }}
    >
      {/* ── Card visual background ── */}
      <div className="relative w-full overflow-hidden" style={{ height: "160px" }}>
        {/* Background visual */}
        <div className="absolute inset-0 opacity-100 group-hover:opacity-100 transition-opacity duration-500">
          {product.cardVisual}
        </div>
        {/* Vignette overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(8,8,8,0.15) 0%, rgba(8,8,8,0.5) 70%, rgba(8,8,8,0.95) 100%)",
          }}
        />
        {/* Emblem — centred in visual area */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative flex items-center justify-center transition-transform duration-500 group-hover:scale-110"
            style={{
              filter: isGold
                ? "drop-shadow(0 0 16px rgba(184,137,42,0.35)) drop-shadow(0 4px 8px rgba(0,0,0,0.6))"
                : "drop-shadow(0 0 12px rgba(144,144,160,0.25)) drop-shadow(0 4px 8px rgba(0,0,0,0.6))",
            }}
          >
            {product.emblem}
          </div>
        </div>
        {/* Top-right badge label */}
        <div className="absolute top-3 right-3">
          <span
            className="text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded-full"
            style={{
              background: isGold ? "rgba(184,137,42,0.15)" : "rgba(144,144,160,0.12)",
              border: isGold ? "1px solid rgba(184,137,42,0.3)" : "1px solid rgba(144,144,160,0.25)",
              color: isGold ? "#d4aa48" : "#9090a0",
            }}
          >
            {product.label}
          </span>
        </div>
      </div>

      {/* ── Card content ── */}
      <div className="relative flex flex-col gap-2.5 p-5 pt-4">
        {/* Metallic product name */}
        <h3
          className={`text-xl font-black tracking-tight leading-none ${isGold ? "metallic-gold" : "metallic-silver"}`}
        >
          {product.name}
        </h3>
        {/* Tagline */}
        <p className="text-white/75 text-sm font-semibold leading-snug">
          {product.tagline}
        </p>
        {/* Description */}
        <p className="text-white/45 text-xs leading-relaxed">
          {product.desc}
        </p>
        {/* CTA */}
        <div
          className="flex items-center gap-1.5 mt-1 text-[11px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0"
          style={{ color: isGold ? "#d4aa48" : "#9090a0" }}
        >
          Start creating <ArrowRight className="w-3 h-3" />
        </div>
      </div>

      {/* ── Corner ambient glow on hover ── */}
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: isGold
            ? "radial-gradient(circle at top right, rgba(184,137,42,0.08), transparent 70%)"
            : "radial-gradient(circle at top right, rgba(144,144,160,0.06), transparent 70%)",
        }}
      />
      {/* Bottom edge glow on hover */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: isGold
            ? "linear-gradient(90deg, transparent, rgba(232,200,120,0.4), transparent)"
            : "linear-gradient(90deg, transparent, rgba(192,192,204,0.3), transparent)",
        }}
      />
    </a>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function WizProductGrid() {
  return (
    <section
      id="products"
      className="relative py-28 px-6 scroll-mt-20 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #030303 0%, #040404 50%, #030303 100%)" }}
    >
      {/* Atmospheric background depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(184,137,42,0.04) 0%, transparent 70%)",
        }}
      />
      {/* Subtle grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }}
      />
      {/* Top luxury divider */}
      <div className="luxury-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto relative">
        {/* Section header */}
        <div className="mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">WIZ AI Platform</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white leading-tight mb-4">
            Choose what you want to create
          </h2>
          <p className="text-[--color-silver-dark]/60 text-lg max-w-xl leading-relaxed">
            Six premium AI creation tools — one unified platform. No editing experience required.
          </p>
        </div>

        {/* Premium product grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.name} product={p} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <a
            href="/create"
            className="btn-primary inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-sm font-bold"
          >
            <span>Explore All Tools</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <p className="mt-4 text-white/25 text-xs">50 free credits on sign-up — no card required</p>
        </div>
      </div>

      {/* Bottom luxury divider */}
      <div className="luxury-divider absolute bottom-0 left-0 right-0" />
    </section>
  );
}
