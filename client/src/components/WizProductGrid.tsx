/**
 * WizProductGrid — Premium Product Suite section for the WIZ AI homepage.
 *
 * Architecture:
 * - Tabbed navigation: CREATE / ENHANCE / GROW
 * - 10 products across 3 categories
 * - Each card features an AI-generated app UI screenshot as the hero visual
 * - Luxury metallic card treatment: brushed gold borders, bevel highlights, grain overlay
 * - Hover: lift + glow + border intensification
 */
import { useState } from "react";
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

/* ── CDN asset constants ─────────────────────────────────────────────────── */
// Product logos
const WIZAUDIO_LOGO    = `/manus-storage/wizaudio-logo-v1_1a1caef4.webp`;
const WIZIMAGE_LOGO    = `/manus-storage/wizimage-logo-v1_21577b6d.webp`;
const WIZVIDEO_LOGO    = `/manus-storage/wizvideo-logo-v1_a28ad483.webp`;
const WIZSHORTS_LOGO   = `/manus-storage/wizshorts-logo-v1_fa835a18.webp`;
const WIZANIMATE_LOGO  = `/manus-storage/wizanimate-logo-v3_e21a763d.webp`;
const WIZSCRIPT_LOGO   = `/manus-storage/wizscript-logo-v1_de427063.webp`;

// App UI screenshots — generated at 2752×1536, served as compressed WebP
const APP_WIZSOUND   = `/manus-storage/app-wizsound-ui_4f315efe.jpg`;
const APP_WIZIMAGE   = `/manus-storage/app-wizimage-ui_ec33bf0e.jpg`;
const APP_WIZVIDEO   = `/manus-storage/app-wizvideo-ui_dbf7067e.jpg`;
const APP_WIZANIMATE = `/manus-storage/app-wizanimate-ui_c9a0c5a3.jpg`;
const APP_WIZSCORE   = `/manus-storage/app-wizscore-ui_e0fe68c8.jpg`;
const APP_WIZSHORTS  = `/manus-storage/app-wizshorts-ui_72a24104.jpg`;
const APP_WIZSCRIPT  = `/manus-storage/app-wizscript-ui_10255d84.jpg`;
const APP_WIZPILOT   = `/manus-storage/app-wizpilot-ui_1d3c99de.jpg`;
const APP_WIZSYNC    = `/manus-storage/app-wizsync-ui_47625d68.jpg`;
const APP_WIZGENESIS = `/manus-storage/app-wizgenesis-ui_80694353.jpg`;

/* ── Accent colour system ────────────────────────────────────────────────── */
type AccentKey = "emerald" | "amber" | "violet" | "cyan" | "rose" | "orange" | "crimson" | "gold" | "purple" | "teal";

interface Accent {
  primary: string; mid: string; light: string;
  glow: string; glowHover: string;
  badgeBg: string; badgeBorder: string; badgeText: string;
  cardBg: string;
  borderIdle: string; borderHover: string;
  nameCss: string;
  bevelLight: string;
  emblemGlow: string;
}

const ACCENTS: Record<AccentKey, Accent> = {
  emerald: {
    primary: "#0d9488", mid: "#34d399", light: "#6ee7b7",
    glow: "rgba(52,211,153,0.20)", glowHover: "rgba(52,211,153,0.35)",
    badgeBg: "rgba(52,211,153,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#6ee7b7",
    cardBg: "linear-gradient(145deg, rgba(13,148,136,0.18) 0%, rgba(5,150,105,0.06) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)", borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 30%, #34d399 50%, #6ee7b7 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)", emblemGlow: "rgba(52,211,153,0.20)",
  },
  amber: {
    primary: "#d97706", mid: "#f59e0b", light: "#fcd34d",
    glow: "rgba(245,158,11,0.20)", glowHover: "rgba(245,158,11,0.35)",
    badgeBg: "rgba(245,158,11,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#fcd34d",
    cardBg: "linear-gradient(145deg, rgba(217,119,6,0.18) 0%, rgba(236,72,153,0.06) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)", borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #fcd34d 30%, #f59e0b 50%, #e8d5a0 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)", emblemGlow: "rgba(245,158,11,0.20)",
  },
  violet: {
    primary: "#7c3aed", mid: "#a78bfa", light: "#c4b5fd",
    glow: "rgba(124,58,237,0.20)", glowHover: "rgba(124,58,237,0.35)",
    badgeBg: "rgba(124,58,237,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#c4b5fd",
    cardBg: "linear-gradient(145deg, rgba(124,58,237,0.18) 0%, rgba(96,165,250,0.06) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)", borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 25%, #a78bfa 50%, #c4b5fd 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)", emblemGlow: "rgba(124,58,237,0.20)",
  },
  cyan: {
    primary: "#0891b2", mid: "#06b6d4", light: "#67e8f9",
    glow: "rgba(6,182,212,0.20)", glowHover: "rgba(6,182,212,0.35)",
    badgeBg: "rgba(6,182,212,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#67e8f9",
    cardBg: "linear-gradient(145deg, rgba(8,145,178,0.18) 0%, rgba(14,116,144,0.06) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)", borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 25%, #06b6d4 50%, #67e8f9 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)", emblemGlow: "rgba(6,182,212,0.20)",
  },
  rose: {
    primary: "#f43f5e", mid: "#fb7185", light: "#fda4af",
    glow: "rgba(244,63,94,0.20)", glowHover: "rgba(244,63,94,0.35)",
    badgeBg: "rgba(244,63,94,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#fda4af",
    cardBg: "linear-gradient(145deg, rgba(244,63,94,0.18) 0%, rgba(251,146,60,0.06) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)", borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 25%, #fb7185 50%, #fda4af 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)", emblemGlow: "rgba(244,63,94,0.20)",
  },
  orange: {
    primary: "#d97706", mid: "#f97316", light: "#fbbf24",
    glow: "rgba(249,115,22,0.20)", glowHover: "rgba(249,115,22,0.35)",
    badgeBg: "rgba(249,115,22,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#fbbf24",
    cardBg: "linear-gradient(145deg, rgba(217,119,6,0.18) 0%, rgba(194,65,12,0.06) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)", borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #fbbf24 30%, #f97316 50%, #e8d5a0 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)", emblemGlow: "rgba(249,115,22,0.20)",
  },
  crimson: {
    primary: "#dc2626", mid: "#ef4444", light: "#fca5a5",
    glow: "rgba(239,68,68,0.20)", glowHover: "rgba(239,68,68,0.35)",
    badgeBg: "rgba(239,68,68,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#fca5a5",
    cardBg: "linear-gradient(145deg, rgba(220,38,38,0.18) 0%, rgba(180,20,20,0.06) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)", borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 25%, #ef4444 50%, #fca5a5 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)", emblemGlow: "rgba(239,68,68,0.20)",
  },
  gold: {
    primary: "#b45309", mid: "#d4af37", light: "#e8d5a0",
    glow: "rgba(212,175,55,0.25)", glowHover: "rgba(212,175,55,0.45)",
    badgeBg: "rgba(212,175,55,0.12)", badgeBorder: "rgba(212,175,55,0.45)", badgeText: "#e8d5a0",
    cardBg: "linear-gradient(145deg, rgba(180,83,9,0.20) 0%, rgba(212,175,55,0.08) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(212,175,55,0.30)", borderHover: "rgba(212,175,55,0.65)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #f0d878 25%, #d4af37 50%, #e8d5a0 75%, #c4a464 100%)",
    bevelLight: "rgba(240,216,120,0.28)", emblemGlow: "rgba(212,175,55,0.30)",
  },
  purple: {
    primary: "#6d28d9", mid: "#8b5cf6", light: "#c4b5fd",
    glow: "rgba(139,92,246,0.20)", glowHover: "rgba(139,92,246,0.35)",
    badgeBg: "rgba(139,92,246,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#c4b5fd",
    cardBg: "linear-gradient(145deg, rgba(109,40,217,0.18) 0%, rgba(91,33,182,0.06) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)", borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 25%, #8b5cf6 50%, #c4b5fd 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)", emblemGlow: "rgba(139,92,246,0.20)",
  },
  teal: {
    primary: "#0f766e", mid: "#14b8a6", light: "#5eead4",
    glow: "rgba(20,184,166,0.20)", glowHover: "rgba(20,184,166,0.35)",
    badgeBg: "rgba(20,184,166,0.10)", badgeBorder: "rgba(196,164,100,0.35)", badgeText: "#5eead4",
    cardBg: "linear-gradient(145deg, rgba(15,118,110,0.18) 0%, rgba(20,184,166,0.06) 60%, rgba(0,0,0,0) 100%)",
    borderIdle: "rgba(196,164,100,0.22)", borderHover: "rgba(196,164,100,0.55)",
    nameCss: "linear-gradient(135deg, #c4a464 0%, #e8d5a0 25%, #14b8a6 50%, #5eead4 65%, #c4a464 100%)",
    bevelLight: "rgba(232,213,160,0.18)", emblemGlow: "rgba(20,184,166,0.20)",
  },
};

/* ── Product data ────────────────────────────────────────────────────────── */
interface Product {
  name: string;
  label: string;
  tagline: string;
  desc: string;
  href: string;
  accent: AccentKey;
  appScreenshot: string;
  logoUrl?: string;
  emblem?: React.ReactNode;
  category: "create" | "enhance" | "grow";
  /** Short feature bullets shown on card hover */
  features: string[];
}

const PRODUCTS: Product[] = [
  // ── CREATE ────────────────────────────────────────────────────────────────
  {
    name: getProduct("wizsound")!.name,
    label: "AUDIO",
    tagline: getProduct("wizsound")!.tagline,
    desc: "Describe a mood, genre, or scene — WizAudio™ generates a full original track with studio-grade mastering in seconds.",
    href: getProduct("wizsound")!.studioPage,
    accent: "emerald",
    appScreenshot: APP_WIZSOUND,
    logoUrl: WIZAUDIO_LOGO,
    emblem: <WizAudioEmblem size={64} />,
    category: "create",
    features: ["Original songs & scores", "Studio-grade mastering", "Cinematic & ambient styles", "Instant download"],
  },
  {
    name: getProduct("wizvideo")!.name,
    label: "VIDEO",
    tagline: getProduct("wizvideo")!.tagline,
    desc: "Upload your track and WizVideo™ builds a full music video — storyboard, scenes, characters, and cinematic visuals synced to every beat.",
    href: getProduct("wizvideo")!.productPage,
    accent: "violet",
    appScreenshot: APP_WIZVIDEO,
    logoUrl: WIZVIDEO_LOGO,
    emblem: <WizVideoEmblem size={64} />,
    category: "create",
    features: ["Beat-synced scene cuts", "Character consistency lock", "6-scene storyboard", "4K export"],
  },
  {
    name: getProduct("wizanimate")!.name,
    label: "ANIMATION",
    tagline: getProduct("wizanimate")!.tagline,
    desc: "Bring characters and scenes to life with AI-powered animation. Beat-matched motion, emotion-driven performance, cinematic movement.",
    href: WIZANIMATE_PRODUCT_PAGE,
    accent: "rose",
    appScreenshot: APP_WIZANIMATE,
    logoUrl: WIZANIMATE_LOGO,
    emblem: <WizAnimateEmblem size={64} />,
    category: "create",
    features: ["Emotion-driven performance", "Beat-matched motion", "Cinematic & anime styles", "No rigging required"],
  },
  {
    name: getProduct("wizimage")!.name,
    label: "IMAGES",
    tagline: getProduct("wizimage")!.tagline,
    desc: "Describe any image and WizImage™ renders it in seconds. Photorealistic, cinematic, anime, oil painting — 8 art styles.",
    href: getProduct("wizimage")!.studioPage,
    accent: "amber",
    appScreenshot: APP_WIZIMAGE,
    logoUrl: WIZIMAGE_LOGO,
    emblem: <WizImageEmblem size={64} />,
    category: "create",
    features: ["8 distinct art styles", "Photorealistic & cinematic", "Instant generation", "HD & 4K output"],
  },
  {
    name: getProduct("wizscript")!.name,
    label: "CINEMATIC",
    tagline: getProduct("wizscript")!.tagline,
    desc: "Write each scene yourself for full creative control. WizScript™ generates every scene individually from your direction.",
    href: getProduct("wizscript")!.studioPage,
    accent: "orange",
    appScreenshot: APP_WIZSCRIPT,
    logoUrl: WIZSCRIPT_LOGO,
    emblem: <WizScriptEmblem size={64} />,
    category: "create",
    features: ["Scene-by-scene control", "Screenplay formatting", "Visual storyboard output", "Full creative direction"],
  },
  {
    name: getProduct("wizshorts")!.name,
    label: "SHORTS",
    tagline: getProduct("wizshorts")!.tagline,
    desc: "Produce scroll-stopping vertical short-form videos for TikTok, Instagram Reels, and YouTube Shorts — with captions and visual hooks built in.",
    href: getProduct("wizshorts")!.productPage,
    accent: "cyan",
    appScreenshot: APP_WIZSHORTS,
    logoUrl: WIZSHORTS_LOGO,
    emblem: <WizShortsEmblem size={64} />,
    category: "create",
    features: ["TikTok · Reels · Shorts", "Hook strength scoring", "Animated captions", "One-click multi-platform export"],
  },
  // ── ENHANCE ───────────────────────────────────────────────────────────────
  {
    name: getProduct("wizscore")!.name,
    label: "SCORE",
    tagline: getProduct("wizscore")!.tagline,
    desc: "Upload a video and WizScore™ generates an original music track perfectly matched to its mood, pacing, and visual energy.",
    href: getProduct("wizscore")!.studioPage,
    accent: "crimson",
    appScreenshot: APP_WIZSCORE,
    category: "enhance",
    features: ["Mood & energy detection", "BPM & key matching", "Stem separation", "Original score generation"],
  },
  {
    name: "WizGenesis™",
    label: "RENDER",
    tagline: "Cinematic Scene Building Engine",
    desc: "WizGenesis™ is the rendering core of WIZ AI — 4K cinematic output with character consistency lock, colour grading, and film-grain texture.",
    href: "/products/wizgenesis",
    accent: "gold",
    appScreenshot: APP_WIZGENESIS,
    category: "enhance",
    features: ["4K cinematic output", "Character consistency lock", "WizLumina™ colour grading", "Film-grain & lens effects"],
  },
  // ── GROW ──────────────────────────────────────────────────────────────────
  {
    name: getProduct("wizpilot")!.name,
    label: "AUTOMATE",
    tagline: getProduct("wizpilot")!.tagline,
    desc: "Describe your idea in plain text and WizPilot™ builds the full video script and storyboard automatically — from concept to scenes in seconds.",
    href: getProduct("wizpilot")!.studioPage,
    accent: "purple",
    appScreenshot: APP_WIZPILOT,
    category: "grow",
    features: ["One-prompt full pipeline", "Auto script & storyboard", "5-stage workflow engine", "Zero manual steps"],
  },
  {
    name: getProduct("wizsync")!.name,
    label: "SYNC",
    tagline: getProduct("wizsync")!.tagline,
    desc: "Upload audio and WizSync™ separates stems, detects speakers with timestamps, and maps each voice to a character ready for AI lip-sync.",
    href: getProduct("wizsync")!.studioPage,
    accent: "teal",
    appScreenshot: APP_WIZSYNC,
    category: "grow",
    features: ["Stem separation (4 tracks)", "Speaker diarisation", "Character lip-sync mapping", "Multi-language support"],
  },
];

/* ── Tab configuration ───────────────────────────────────────────────────── */
type TabId = "create" | "enhance" | "grow";

interface Tab {
  id: TabId;
  label: string;
  headline: string;
  sub: string;
  count: number;
}

const TABS: Tab[] = [
  {
    id: "create",
    label: "CREATE",
    headline: "Six studios. Every creative format.",
    sub: "From music and video to animation, images, scripts, and short-form content — WIZ AI covers every format a serious creator needs.",
    count: 6,
  },
  {
    id: "enhance",
    label: "ENHANCE",
    headline: "Cinematic quality. Built in.",
    sub: "WizScore™ adds the perfect original soundtrack to any video. WizGenesis™ renders every scene in 4K with studio-grade colour grading.",
    count: 2,
  },
  {
    id: "grow",
    label: "GROW",
    headline: "Automate. Sync. Distribute.",
    sub: "WizPilot™ automates your entire production pipeline from a single prompt. WizSync™ maps voices to characters for AI lip-sync at scale.",
    count: 2,
  },
];

/* ── Product card ────────────────────────────────────────────────────────── */
function ProductCard({ product }: { product: Product }) {
  const a = ACCENTS[product.accent];

  return (
    <a
      href={product.href}
      onClick={() => mp.productCardClicked(product.name)}
      className="group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-400 focus:outline-none"
      style={{
        background: "linear-gradient(160deg, #0d0d0d 0%, #080808 60%, #050505 100%)",
        border: `1px solid ${a.borderIdle}`,
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
        el.style.transform = "translateY(-5px)";
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
      {/* ── Polished bevel — top edge ──────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none z-20"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${a.bevelLight} 20%, rgba(232,213,160,0.35) 50%, ${a.bevelLight} 80%, transparent 100%)` }} />

      {/* ── Polished bevel — left edge ─────────────────────────────────── */}
      <div className="absolute top-0 left-0 bottom-0 w-px pointer-events-none z-20"
        style={{ background: `linear-gradient(180deg, transparent 0%, ${a.bevelLight} 20%, rgba(232,213,160,0.20) 50%, transparent 100%)` }} />

      {/* ── Metallic grain overlay ─────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-10 rounded-2xl opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }} />

      {/* ── Brushed metal diagonal highlight on hover ──────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(125deg, transparent 0%, rgba(232,213,160,0.04) 30%, rgba(255,255,255,0.05) 50%, rgba(232,213,160,0.04) 70%, transparent 100%)` }} />

      {/* ── App screenshot hero ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ height: "180px", background: a.cardBg }}>
        <img
          src={product.appScreenshot}
          alt={`${product.name} app interface`}
          className="absolute inset-0 w-full h-full object-cover object-top opacity-80 group-hover:opacity-95 group-hover:scale-[1.03] transition-all duration-700"
          loading="lazy"
          width="1376"
          height="768"
        />

        {/* Gradient fade to card body */}
        <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none z-10"
          style={{ background: "linear-gradient(0deg, #080808 0%, rgba(8,8,8,0.6) 60%, transparent 100%)" }} />

        {/* Category badge — top left */}
        <div className="absolute top-3 left-3 z-20">
          <span
            className="text-[9px] font-black tracking-[0.22em] uppercase px-2.5 py-1 rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(196,164,100,0.15) 0%, rgba(232,213,160,0.08) 100%)",
              border: `1px solid ${a.badgeBorder}`,
              color: a.badgeText,
              boxShadow: "0 1px 0 rgba(232,213,160,0.08) inset",
            }}>
            {product.label}
          </span>
        </div>

        {/* Emblem — bottom right */}
        {product.emblem && (
          <div className="absolute bottom-2 right-3 z-20 opacity-80 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-2xl pointer-events-none"
                style={{ background: a.emblemGlow, transform: "scale(2.5)" }} />
              {product.emblem}
            </div>
          </div>
        )}
      </div>

      {/* ── Card content ───────────────────────────────────────────────── */}
      <div className="relative flex flex-col gap-2 p-5 pt-3 z-10 flex-1">
        {/* Product logo or name */}
        {product.logoUrl ? (
          <div className="flex items-end gap-2 mb-0.5">
            <img
              src={product.logoUrl}
              alt={product.name}
              className="h-8 w-auto object-contain drop-shadow-[0_0_12px_rgba(196,164,100,0.3)] group-hover:drop-shadow-[0_0_20px_rgba(196,164,100,0.5)] transition-all duration-300"
              loading="lazy"
            />
            <sup className="text-[9px] font-bold tracking-wider mb-1.5" style={{ color: "rgba(196,164,100,0.7)" }}>TM</sup>
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
            {product.name}
            <sup className="text-[9px] font-bold mt-0.5" style={{ WebkitTextFillColor: "rgba(196,164,100,0.7)", color: "rgba(196,164,100,0.7)" }}>™</sup>
          </h3>
        )}

        {/* Tagline */}
        <p className="text-white/65 text-sm font-semibold leading-snug">{product.tagline}</p>

        {/* Description */}
        <p className="text-white/38 text-xs leading-relaxed">{product.desc}</p>

        {/* Feature bullets — visible on hover */}
        <ul className="mt-1 space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 max-h-0 group-hover:max-h-40 overflow-hidden">
          {product.features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-[11px]" style={{ color: a.light }}>
              <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: a.mid }} />
              {f}
            </li>
          ))}
        </ul>

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA */}
        <div className="mt-3">
          <span
            className="btn-sheen inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-300 group-hover:scale-[1.03]"
            style={{
              background: "linear-gradient(180deg, #f0d878 0%, #e8c96a 8%, #d4a832 20%, #c49a3c 45%, #a07828 70%, #7a5520 88%, #5c3d10 100%)",
              color: "#1a0f00",
              boxShadow: "0 0 16px rgba(196,164,100,0.30), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.20)",
              border: "1px solid rgba(240,216,120,0.4)",
            }}>
            Open Studio <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* ── Corner glow — top right ────────────────────────────────────── */}
      <div className="absolute top-0 right-0 w-40 h-40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"
        style={{ background: `radial-gradient(circle at top right, ${a.glowHover}, transparent 70%)` }} />

      {/* ── Bottom shimmer line ────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20"
        style={{ background: `linear-gradient(90deg, transparent, rgba(196,164,100,0.5), ${a.mid}66, rgba(196,164,100,0.5), transparent)` }} />

      {/* ── Polished bottom bevel ──────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none z-20"
        style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.9), transparent)" }} />
    </a>
  );
}

/* ── Tab button ──────────────────────────────────────────────────────────── */
function TabButton({ tab, active, onClick }: { tab: Tab; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center gap-1 px-6 py-3 rounded-xl transition-all duration-300 focus:outline-none group/tab"
      style={{
        background: active
          ? "linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(196,164,100,0.06) 100%)"
          : "transparent",
        border: active
          ? "1px solid rgba(212,175,55,0.30)"
          : "1px solid transparent",
        boxShadow: active
          ? "0 0 24px rgba(212,175,55,0.12), 0 1px 0 rgba(232,213,160,0.15) inset"
          : "none",
      }}
    >
      {/* Tab label */}
      <span
        className="text-[11px] font-black tracking-[0.25em] uppercase transition-all duration-300"
        style={{
          background: active
            ? "linear-gradient(90deg, #d4af37, #e8d5a0, #d4af37)"
            : "rgba(255,255,255,0.35)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {tab.label}
      </span>

      {/* Product count pill */}
      <span
        className="text-[9px] font-bold px-2 py-0.5 rounded-full transition-all duration-300"
        style={{
          background: active ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.06)",
          color: active ? "#d4af37" : "rgba(255,255,255,0.25)",
          border: active ? "1px solid rgba(212,175,55,0.25)" : "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {tab.count} {tab.count === 1 ? "studio" : "studios"}
      </span>

      {/* Active underline */}
      {active && (
        <div
          className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, #d4af37, transparent)" }}
        />
      )}
    </button>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export default function WizProductGrid() {
  const [activeTab, setActiveTab] = useState<TabId>("create");

  const currentTab = TABS.find(t => t.id === activeTab)!;
  const visibleProducts = PRODUCTS.filter(p => p.category === activeTab);

  return (
    <section
      id="products"
      className="relative py-28 px-6 scroll-mt-20 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #030303 0%, #050505 50%, #030303 100%)" }}
    >
      {/* ── Atmospheric depth ──────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: [
          "radial-gradient(ellipse 60% 40% at 20% 30%, rgba(52,211,153,0.022) 0%, transparent 70%)",
          "radial-gradient(ellipse 60% 40% at 80% 30%, rgba(124,58,237,0.022) 0%, transparent 70%)",
          "radial-gradient(ellipse 80% 50% at 50% 80%, rgba(249,115,22,0.022) 0%, transparent 70%)",
          "radial-gradient(ellipse 40% 30% at 50% 50%, rgba(196,164,100,0.04) 0%, transparent 70%)",
        ].join(", "),
      }} />

      {/* ── Grain texture ──────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.018]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
        }} />

      <div className="luxury-divider absolute top-0 left-0 right-0" />

      <div className="max-w-7xl mx-auto relative">

        {/* ── Section header ─────────────────────────────────────────────── */}
        <div className="mb-12 reveal">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-[--color-gold-dark] mb-4">
            WIZ AI — The Product Suite
          </p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight text-white leading-tight mb-3">
                {currentTab.headline}
              </h2>
              <p className="text-white/40 text-base max-w-2xl leading-relaxed">
                {currentTab.sub}
              </p>
            </div>
            {/* Tab navigation */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {TABS.map(tab => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  active={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Product grid ───────────────────────────────────────────────── */}
        <div
          key={activeTab}
          className={`grid gap-5 ${
            visibleProducts.length === 2
              ? "sm:grid-cols-2 max-w-3xl"
              : visibleProducts.length <= 3
              ? "sm:grid-cols-2 lg:grid-cols-3"
              : "sm:grid-cols-2 lg:grid-cols-3"
          }`}
          style={{ animation: "fadeInUp 0.35s ease forwards" }}
        >
          {visibleProducts.map(p => (
            <ProductCard key={p.name} product={p} />
          ))}
        </div>

        {/* ── Bottom CTA ─────────────────────────────────────────────────── */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-white/25 text-xs">
              2 free Build Credits on sign-up — no card required.
            </p>
            <p className="text-white/15 text-xs mt-0.5">
              Studio-grade output from your first session.
            </p>
          </div>
          <a
            href="/create"
            onClick={() => mp.startCreatingClicked("homepage_product_grid")}
            className="btn-primary btn-sheen inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-sm font-bold flex-shrink-0"
          >
            <span>Explore All Studios</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="luxury-divider absolute bottom-0 left-0 right-0" />

      {/* ── Fade-in animation ──────────────────────────────────────────── */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
