/**
 * WizProductGrid — Luxury metallic product section for the WIZ AI homepage.
 * Each card uses brushed gold borders, polished silver highlights, bevelled depth,
 * reflective gradients, and a metallic grain texture overlay.
 */
import { ArrowRight } from "@/lib/icons";
import { mp } from "@/lib/mixpanel";
import { getProduct } from "@/lib/products";
import { WIZANIMATE_PRODUCT_PAGE } from "@/lib/routes";

import {
  WizAudioEmblem,
  WizImageEmblem,
  WizVideoEmblem,
  WizShortsEmblem,
  WizAnimateEmblem,
  WizScriptEmblem,
} from "./WizProductEmblems";

// Permanent WebP CDN URLs — no signed expiry, cacheable for 1 year by Bunny CDN
const WIZAUDIO_LOGO = `/manus-storage/wizaudio-logo-v1_1a1caef4.webp`;
const WIZIMAGE_LOGO = `/manus-storage/wizimage-logo-v1_21577b6d.webp`;
const WIZVIDEO_LOGO = `/manus-storage/wizvideo-logo-v1_a28ad483.webp`;
const WIZSHORTS_LOGO = `/manus-storage/wizshorts-logo-v1_fa835a18.webp`;
const WIZANIMATE_LOGO_V3 = `/manus-storage/wizanimate-logo-v3_e21a763d.webp`;
const WIZSCRIPT_LOGO = `/manus-storage/wizscript-logo-v1_de427063.webp`;

const CARD_BG_AUDIO = `/manus-storage/card-wizaudio-v2_19498b78.webp`;
const CARD_BG_IMAGE = `/manus-storage/create-card-image_3b89c617.webp`;
const CARD_BG_VIDEO = `/manus-storage/card-music-video-v2_ecc2ca2a.webp`;
const CARD_BG_SHORTS = `/manus-storage/card-youtube-creator-v2_d096d31d.webp`;
const CARD_BG_ANIMATE = `/manus-storage/card-wizanimate-v2_639d350e.webp`;
const CARD_BG_SCRIPT = `/manus-storage/card-text-to-video-v2_4ff464b4.webp`;

type AccentKey = "emerald" | "amber" | "violet" | "cyan" | "rose" | "orange";

// ── Accent colour system ──────────────────────────────────────────────────────
// Each accent has its own colour identity PLUS the shared gold/silver metallic frame
const ACCENTS: Record<AccentKey, {
  primary: string; mid: string; light: string;
  glow: string; glowHover: string;
  badgeBg: string; badgeBorder: string; badgeText: string;
  cardBg: string;
  // Metallic border system — accent colour blended with gold
  borderIdle: string; borderHover: string;
  // Metallic name gradient — accent colour with gold/silver highlights
  nameCss: string;
  // Bevel highlight — top-left polished edge
  bevelLight: string;
  // Inner glow for the emblem well
  emblemGlow: string;
}> = {
  emerald: {
    primary: "#0d9488", mid: "#34d399", light: "#6ee7b7",
    glow: "rgba(52,211,153,0.20)", glowHover: "rgba(52,211,153,0.35)",
    badgeBg: "rgba(52,211,153,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#6ee7b7",
    cardBg: "linear-gradient(145deg, rgba(13,148,136,0.14) 0%, rgba(5,150,105,0.05) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)",
    borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 30%, #34d399 50%, #6ee7b7 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)",
    emblemGlow: "rgba(52,211,153,0.20)",
  },
  amber: {
    primary: "#d97706", mid: "#f59e0b", light: "#fcd34d",
    glow: "rgba(245,158,11,0.20)", glowHover: "rgba(245,158,11,0.35)",
    badgeBg: "rgba(245,158,11,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#fcd34d",
    cardBg: "linear-gradient(145deg, rgba(217,119,6,0.14) 0%, rgba(236,72,153,0.06) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)",
    borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #fcd34d 30%, #f59e0b 50%, #e8d5a0 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)",
    emblemGlow: "rgba(245,158,11,0.20)",
  },
  violet: {
    primary: "#7c3aed", mid: "#a78bfa", light: "#c4b5fd",
    glow: "rgba(124,58,237,0.20)", glowHover: "rgba(124,58,237,0.35)",
    badgeBg: "rgba(124,58,237,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#c4b5fd",
    cardBg: "linear-gradient(145deg, rgba(124,58,237,0.14) 0%, rgba(96,165,250,0.06) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)",
    borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 25%, #a78bfa 50%, #c4b5fd 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)",
    emblemGlow: "rgba(124,58,237,0.20)",
  },
  cyan: {
    primary: "#0891b2", mid: "#06b6d4", light: "#67e8f9",
    glow: "rgba(6,182,212,0.20)", glowHover: "rgba(6,182,212,0.35)",
    badgeBg: "rgba(6,182,212,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#67e8f9",
    cardBg: "linear-gradient(145deg, rgba(8,145,178,0.14) 0%, rgba(14,116,144,0.05) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)",
    borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 25%, #06b6d4 50%, #67e8f9 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)",
    emblemGlow: "rgba(6,182,212,0.20)",
  },
  rose: {
    primary: "#f43f5e", mid: "#fb7185", light: "#fda4af",
    glow: "rgba(244,63,94,0.20)", glowHover: "rgba(244,63,94,0.35)",
    badgeBg: "rgba(244,63,94,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#fda4af",
    cardBg: "linear-gradient(145deg, rgba(244,63,94,0.14) 0%, rgba(251,146,60,0.06) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)",
    borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 25%, #fb7185 50%, #fda4af 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)",
    emblemGlow: "rgba(244,63,94,0.20)",
  },
  orange: {
    primary: "#d97706", mid: "#f97316", light: "#fbbf24",
    glow: "rgba(249,115,22,0.20)", glowHover: "rgba(249,115,22,0.35)",
    badgeBg: "rgba(249,115,22,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#fbbf24",
    cardBg: "linear-gradient(145deg, rgba(217,119,6,0.14) 0%, rgba(194,65,12,0.06) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)",
    borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #fbbf24 30%, #f97316 50%, #e8d5a0 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)",
    emblemGlow: "rgba(249,115,22,0.20)",
  },
};

// ── Card background visuals ───────────────────────────────────────────────────
function AudioCardBg() {
  const bars = [4, 8, 14, 20, 28, 36, 44, 38, 30, 22, 16, 10, 6, 4, 8, 14, 22, 30, 38, 44, 36, 26, 18, 12, 8];
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" opacity="0.65">
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
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" opacity="0.65">
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
      <circle cx="140" cy="80" r="22" stroke="#f59e0b" strokeWidth="0.75" fill="none" opacity="0.2" />
    </svg>
  );
}

function VideoCardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" opacity="0.65">
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
      <polygon points="120,65 120,95 155,80" fill="#a78bfa" opacity="0.3" />
    </svg>
  );
}

function ShortsCardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" opacity="0.65">
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
          <circle cx={cx} cy="18" r="2" fill="#06b6d4" opacity="0.4" />
          {i === 1 && <polygon points={`${cx - 8},65 ${cx - 8},85 ${cx + 10},75`} fill="#06b6d4" opacity="0.6" />}
        </g>
      ))}
    </svg>
  );
}

function AnimateCardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" opacity="0.65">
      <defs>
        <linearGradient id="ani-bg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.12" />
          <stop offset="60%" stopColor="#fb923c" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#c2410c" stopOpacity="0.03" />
        </linearGradient>
        <radialGradient id="ani-glow2" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill="url(#ani-bg2)" />
      <ellipse cx="140" cy="75" rx="100" ry="60" fill="url(#ani-glow2)" />
      <polygon points="140,20 210,58 140,96 70,58" stroke="#fb7185" strokeWidth="1" fill="#f43f5e" fillOpacity="0.06" opacity="0.6" />
      <polygon points="70,58 140,96 140,140 70,102" stroke="#fb7185" strokeWidth="1" fill="#f43f5e" fillOpacity="0.04" opacity="0.4" />
      <polygon points="210,58 140,96 140,140 210,102" stroke="#fb7185" strokeWidth="1" fill="#fb923c" fillOpacity="0.05" opacity="0.5" />
    </svg>
  );
}

function ScriptCardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" opacity="0.65">
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
  logoUrl?: string;
}

const PRODUCTS: Product[] = [
  // ── Position 1: WizAudio — music creation studio ──────────────────────────────────
  {
    name: getProduct("wizsound")!.name, label: "CREATE AUDIO",
    tagline: getProduct("wizsound")!.tagline,
    desc: getProduct("wizsound")!.shortDesc,
    href: getProduct("wizsound")!.studioPage, emblem: <WizAudioEmblem size={80} />, accent: "emerald",
    cardVisual: <img src={CARD_BG_AUDIO} alt="WizAudio™ AI music and audio production" className="absolute inset-0 w-full h-full object-cover opacity-60" loading="lazy" width="740" height="494" />,
    logoUrl: WIZAUDIO_LOGO,
  },
  // ── Position 2: WizVideo — flagship music video generator ───────────────────────
  {
    name: getProduct("wizvideo")!.name, label: "CREATE VIDEO",
    tagline: getProduct("wizvideo")!.tagline,
    desc: getProduct("wizvideo")!.shortDesc,
    href: getProduct("wizvideo")!.productPage, emblem: <WizVideoEmblem size={80} />, accent: "violet",
    cardVisual: <img src={CARD_BG_VIDEO} alt="WizVideo™ AI music video creation" className="absolute inset-0 w-full h-full object-cover opacity-60" loading="lazy" width="740" height="494" />,
    logoUrl: WIZVIDEO_LOGO,
  },
  // ── Position 3: WizAnimate — animation studio ─────────────────────────────────
  {
    name: getProduct("wizanimate")!.name, label: "CREATE ANIMATION",
    tagline: getProduct("wizanimate")!.tagline,
    desc: getProduct("wizanimate")!.shortDesc,
    href: WIZANIMATE_PRODUCT_PAGE, emblem: <WizAnimateEmblem size={80} />, accent: "rose",
    cardVisual: <img src={CARD_BG_ANIMATE} alt="WizAnimate™ AI character animation engine" className="absolute inset-0 w-full h-full object-cover opacity-60" loading="lazy" width="740" height="494" />,
    logoUrl: WIZANIMATE_LOGO_V3,
  },
  // ── Position 4: WizImage — visual assets ────────────────────────────────────────
  {
    name: getProduct("wizimage")!.name, label: "CREATE IMAGES",
    tagline: getProduct("wizimage")!.tagline,
    desc: getProduct("wizimage")!.shortDesc,
    href: getProduct("wizimage")!.studioPage, emblem: <WizImageEmblem size={80} />, accent: "amber",
    cardVisual: <img src={CARD_BG_IMAGE} alt="WizImage™ AI image and artwork creation" className="absolute inset-0 w-full h-full object-cover opacity-60" loading="lazy" width="740" height="494" />,
    logoUrl: WIZIMAGE_LOGO,
  },
  // ── Position 5: WizScript — cinematic control ────────────────────────────────────
  {
    name: getProduct("wizscript")!.name, label: "CREATE CINEMATIC",
    tagline: getProduct("wizscript")!.tagline,
    desc: getProduct("wizscript")!.shortDesc,
    href: getProduct("wizscript")!.studioPage, emblem: <WizScriptEmblem size={80} />, accent: "orange",
    cardVisual: <img src={CARD_BG_SCRIPT} alt="WizScript™ scene-by-scene cinematic video control" className="absolute inset-0 w-full h-full object-cover opacity-60" loading="lazy" width="740" height="494" />,
    logoUrl: WIZSCRIPT_LOGO,
  },
  // ── Position 6: WizShorts — social-first short-form video ──────────────────────
  {
    name: getProduct("wizshorts")!.name, label: "CREATE SHORTS",
    tagline: getProduct("wizshorts")!.tagline,
    desc: getProduct("wizshorts")!.shortDesc,
    href: getProduct("wizshorts")!.productPage, emblem: <WizShortsEmblem size={80} />, accent: "cyan",
    cardVisual: <img src={CARD_BG_SHORTS} alt="WizShorts™ AI short-form vertical video creator" className="absolute inset-0 w-full h-full object-cover opacity-60" loading="lazy" width="740" height="494" />,
    logoUrl: WIZSHORTS_LOGO,
  },
];

// ── Luxury metallic product card ──────────────────────────────────────────────
function ProductCard({ product }: { product: Product }) {
  const a = ACCENTS[product.accent];
  return (
    <a
      href={product.href}
      onClick={() => mp.productCardClicked(product.name)}
      className="group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-400"
      style={{
        // Deep luxury black base
        background: "linear-gradient(160deg, #0d0d0d 0%, #080808 60%, #050505 100%)",
        // Brushed gold border — the signature metallic frame
        border: `1px solid ${a.borderIdle}`,
        // Subtle depth shadow with accent glow
        boxShadow: `
          0 1px 0 0 rgba(232,213,160,0.12) inset,
          0 -1px 0 0 rgba(0,0,0,0.8) inset,
          1px 0 0 0 rgba(232,213,160,0.06) inset,
          -1px 0 0 0 rgba(0,0,0,0.6) inset,
          0 4px 24px ${a.glow},
          0 1px 0 rgba(0,0,0,0.9)
        `,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.border = `1px solid ${a.borderHover}`;
        el.style.boxShadow = `
          0 1px 0 0 rgba(232,213,160,0.30) inset,
          0 -1px 0 0 rgba(0,0,0,0.8) inset,
          1px 0 0 0 rgba(232,213,160,0.15) inset,
          -1px 0 0 0 rgba(0,0,0,0.6) inset,
          0 8px 48px ${a.glowHover},
          0 0 0 1px ${a.borderHover},
          0 2px 0 rgba(0,0,0,0.9)
        `;
        el.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.border = `1px solid ${a.borderIdle}`;
        el.style.boxShadow = `
          0 1px 0 0 rgba(232,213,160,0.12) inset,
          0 -1px 0 0 rgba(0,0,0,0.8) inset,
          1px 0 0 0 rgba(232,213,160,0.06) inset,
          -1px 0 0 0 rgba(0,0,0,0.6) inset,
          0 4px 24px ${a.glow},
          0 1px 0 rgba(0,0,0,0.9)
        `;
        el.style.transform = "translateY(0)";
      }}
    >
      {/* ── Polished bevel highlight — top edge ─────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none z-20"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${a.bevelLight} 20%, rgba(232,213,160,0.35) 50%, ${a.bevelLight} 80%, transparent 100%)` }} />

      {/* ── Polished bevel highlight — left edge ────────────────────────── */}
      <div className="absolute top-0 left-0 bottom-0 w-px pointer-events-none z-20"
        style={{ background: `linear-gradient(180deg, transparent 0%, ${a.bevelLight} 20%, rgba(232,213,160,0.20) 50%, transparent 100%)` }} />

      {/* ── Metallic grain texture overlay ──────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-10 rounded-2xl opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }} />

      {/* ── Brushed metal diagonal highlight ────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(125deg, transparent 0%, rgba(232,213,160,0.04) 30%, rgba(255,255,255,0.06) 50%, rgba(232,213,160,0.04) 70%, transparent 100%)`,
        }} />

      {/* ── Card visual background ───────────────────────────────────────── */}
      <div className="relative h-36 overflow-hidden" style={{ background: a.cardBg }}>
        {product.cardVisual}

        {/* Fade to card body */}
        <div className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none z-10"
          style={{ background: "linear-gradient(0deg, #080808 0%, transparent 100%)" }} />

        {/* Badge — metallic gold border */}
        <div className="absolute top-3 left-3 z-20">
          <span
            className="text-[9px] font-black tracking-[0.2em] uppercase px-2.5 py-1 rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(196,164,100,0.15) 0%, rgba(232,213,160,0.08) 100%)",
              border: `1px solid ${a.badgeBorder}`,
              color: a.badgeText,
              boxShadow: "0 1px 0 rgba(232,213,160,0.08) inset",
            }}>
            {product.label}
          </span>
        </div>

        {/* Emblem — bottom right, with accent glow well */}
        <div className="absolute bottom-1 right-2 z-20 opacity-90 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-2xl pointer-events-none"
              style={{ background: a.emblemGlow, transform: "scale(2)" }} />
            {product.emblem}
          </div>
        </div>
      </div>

      {/* ── Card content ─────────────────────────────────────────────────── */}
      <div className="relative flex flex-col gap-2 p-5 pt-3 z-10">
        {/* Brand logo or product name — premium treatment */}
        {product.logoUrl ? (
          <div className="flex items-end gap-2 mb-0.5">
            <img
              src={product.logoUrl}
              alt={product.name}
              className="h-9 w-auto object-contain drop-shadow-[0_0_12px_rgba(196,164,100,0.3)] group-hover:drop-shadow-[0_0_20px_rgba(196,164,100,0.5)] transition-all duration-300"
             loading="lazy" />
            <sup className="text-[9px] font-bold tracking-wider mb-2" style={{ color: "rgba(196,164,100,0.7)" }}>TM</sup>
          </div>
        ) : (
          <h3
            className="text-xl font-black tracking-tight leading-none flex items-start gap-0.5"
            style={{
              background: a.nameCss,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))",
            }}>
            {product.name}<sup className="text-[9px] font-bold mt-0.5" style={{ WebkitTextFillColor: "rgba(196,164,100,0.7)", color: "rgba(196,164,100,0.7)" }}>™</sup>
          </h3>
        )}

        {/* Tagline */}
        <p className="text-white/70 text-sm font-semibold leading-snug">{product.tagline}</p>

        {/* Description */}
        <p className="text-white/38 text-xs leading-relaxed">{product.desc}</p>

        {/* CTA — always-visible premium gold button */}
        <div className="mt-3">
          <span
            className="btn-sheen inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-300 group-hover:scale-[1.03]"
            style={{
              background: "linear-gradient(180deg, #f0d878 0%, #e8c96a 8%, #d4a832 20%, #c49a3c 45%, #a07828 70%, #7a5520 88%, #5c3d10 100%)",
              color: "#1a0f00",
              boxShadow: "0 0 16px rgba(196,164,100,0.30), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.20)",
              border: "1px solid rgba(240,216,120,0.4)",
            }}>
            Start creating <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* ── Corner glow — top right ──────────────────────────────────────── */}
      <div className="absolute top-0 right-0 w-40 h-40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"
        style={{ background: `radial-gradient(circle at top right, ${a.glowHover}, transparent 70%)` }} />

      {/* ── Bottom shimmer line ──────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20"
        style={{ background: `linear-gradient(90deg, transparent, rgba(196,164,100,0.5), ${a.mid}66, rgba(196,164,100,0.5), transparent)` }} />

      {/* ── Polished bottom bevel ────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none z-20"
        style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.9), transparent)" }} />
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
          "radial-gradient(ellipse 60% 40% at 20% 30%, rgba(52,211,153,0.025) 0%, transparent 70%)",
          "radial-gradient(ellipse 60% 40% at 80% 30%, rgba(124,58,237,0.025) 0%, transparent 70%)",
          "radial-gradient(ellipse 80% 50% at 50% 80%, rgba(249,115,22,0.025) 0%, transparent 70%)",
          "radial-gradient(ellipse 40% 30% at 50% 50%, rgba(196,164,100,0.04) 0%, transparent 70%)",
        ].join(", "),
      }} />

      {/* Subtle grain texture on section */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.018]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }} />

      <div className="luxury-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto relative">
        {/* Section header */}
        <div className="mb-16 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">WIZ AI — The Studio Suites</p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white leading-tight mb-4">
            Nine suites. Every creative format.
          </h2>
          <p className="text-white/40 text-lg max-w-xl leading-relaxed">
            WIZ AI is built around specialised AI production suites — each one engineered for a single creative discipline, each one producing finished, professional-grade output.
          </p>
        </div>

        {/* Product grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRODUCTS.map((p) => <ProductCard key={p.name} product={p} />)}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <a href="/create" onClick={() => mp.startCreatingClicked("homepage_product_grid")} className="btn-primary btn-sheen btn-sheen inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-sm font-bold">
            <span>Explore All Studios</span>
            <ArrowRight className="w-4 h-4" />
          </a>
          <p className="mt-4 text-white/25 text-xs">2 free Build Credits on sign-up — no card required. Studio-grade output from your first session.</p>
        </div>
      </div>

      <div className="luxury-divider absolute bottom-0 left-0 right-0" />
    </section>
  );
}
