/**
 * WIZ AI — Icon Library
 * All icons are inline SVGs. No Lucide dependency.
 * Import from "@/lib/icons" wherever icons are needed.
 */
import React from "react";

type SVGProps = { className?: string; style?: React.CSSProperties; fill?: string; stroke?: string };

export const ArrowRight = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
);
export const ArrowLeft = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 8H3M7 4l-4 4 4 4" /></svg>
);
export const ChevronDown = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6l5 5 5-5" /></svg>
);
export const ChevronUp = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10l5-5 5 5" /></svg>
);
export const ChevronRight = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5" /></svg>
);
export const Check = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 8.5l3.5 3.5 7-7" /></svg>
);
export const CheckCircle2 = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M5 8.5l2 2 4-4" /></svg>
);
export const X = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
);
export const Play = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 3.5l9 4.5-9 4.5V3.5z" /></svg>
);
export const Pause = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
);
export const Download = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 2v9M4.5 7.5L8 11l3.5-3.5M2 13h12" /></svg>
);
export const Search = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" /><path d="M10 10l3.5 3.5" /></svg>
);
export const Menu = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" /></svg>
);
export const Shield = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.5L2 4v4c0 3.3 2.5 5.5 6 6 3.5-.5 6-2.7 6-6V4L8 1.5z" /></svg>
);
export const CreditCard = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1.5" y="3.5" width="13" height="9" rx="1.5" /><path d="M1.5 6.5h13" /></svg>
);
export const RefreshCcw = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 7A6.5 6.5 0 0114 9M14.5 9A6.5 6.5 0 012 7M1.5 4v3h3M14.5 12v-3h-3" /></svg>
);
export const RefreshCw = RefreshCcw;
export const Users = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="5" r="2.5" /><path d="M1 13c0-2.8 2.2-5 5-5s5 2.2 5 5" /><circle cx="12" cy="5" r="2" /><path d="M15 13c0-2.2-1.3-4-3-4.5" /></svg>
);
export const Star = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7L8 1z" /></svg>
);
export const Crown = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 12h13l-2-7-3.5 4L8 4 7 9 3.5 5l-2 7z" /></svg>
);
export const Zap = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M9.5 1L3 9h5.5L6.5 15 13 7H7.5L9.5 1z" /></svg>
);
export const Sparkles = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1l1 3h3l-2.5 2 1 3L8 7.5 5.5 9l1-3L4 4h3L8 1zM3 11l.5 1.5L5 13l-1.5.5L3 15l-.5-1.5L1 13l1.5-.5L3 11zM13 2l.5 1.5L15 4l-1.5.5L13 6l-.5-1.5L11 4l1.5-.5L13 2z" /></svg>
);
export const Wand2 = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 2l4 4-8 8-4-4 8-8z" /><path d="M14 8l-2-2M2 14l2-2M8 2l-2 2" /></svg>
);
export const Music2 = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 13V3l5 1.5v2L9 5" /><circle cx="5" cy="13" r="2" /><circle cx="12" cy="11.5" r="2" /></svg>
);
export const Music = Music2;
export const Film = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1.5" y="3" width="13" height="10" rx="1" /><path d="M5 3v10M11 3v10M1.5 6h13M1.5 10h13" /></svg>
);
export const Image = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" /><circle cx="5.5" cy="6" r="1.5" /><path d="M1.5 11l3.5-3.5 3 3 2-2 4 4" /></svg>
);
export const FileText = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 1.5H3.5A1.5 1.5 0 002 3v10a1.5 1.5 0 001.5 1.5h9A1.5 1.5 0 0014 13V6.5L9 1.5z" /><path d="M9 1.5V6.5H14M5 9h6M5 11.5h4" /></svg>
);
export const Package = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.5l6 3v7l-6 3-6-3v-7l6-3z" /><path d="M8 1.5v13M2 4.5l6 3 6-3" /></svg>
);
export const Globe = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M8 1.5C6.5 4 6 6 6 8s.5 4 2 6.5M8 1.5C9.5 4 10 6 10 8s-.5 4-2 6.5M1.5 8h13" /></svg>
);
export const Layers = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.5l6.5 3.5L8 8.5 1.5 5 8 1.5z" /><path d="M1.5 8.5L8 12l6.5-3.5" /><path d="M1.5 11.5L8 15l6.5-3.5" /></svg>
);
export const Eye = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" /><circle cx="8" cy="8" r="2" /></svg>
);
export const Palette = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><circle cx="5" cy="6" r="1" fill="currentColor" /><circle cx="9" cy="5" r="1" fill="currentColor" /><circle cx="11" cy="8.5" r="1" fill="currentColor" /><circle cx="5" cy="10.5" r="1" fill="currentColor" /></svg>
);
export const Sun = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" /></svg>
);
export const GripVertical = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="5.5" cy="4" r="1.2" /><circle cx="5.5" cy="8" r="1.2" /><circle cx="5.5" cy="12" r="1.2" /><circle cx="10.5" cy="4" r="1.2" /><circle cx="10.5" cy="8" r="1.2" /><circle cx="10.5" cy="12" r="1.2" /></svg>
);
export const Volume2 = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 20 14" fill="none" aria-hidden="true"><path d="M1 7h2M4 4v6M7 2v10M10 5v4M13 3v8M16 4v6M19 7h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
);
export const VolumeX = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 20 14" fill="none" aria-hidden="true"><path d="M1 7h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" /><path d="M7 4l6 6M13 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
);
export const Headphones = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 9V8a6 6 0 0112 0v1" /><rect x="1.5" y="9" width="3" height="5" rx="1.5" /><rect x="11.5" y="9" width="3" height="5" rx="1.5" /></svg>
);
export const Radio = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="2" /><path d="M4.5 4.5a5 5 0 017 7M3 3a7.5 7.5 0 0110 10" /></svg>
);
export const Clock = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M8 4.5V8l2.5 2.5" /></svg>
);
export const Bell = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.5a4.5 4.5 0 014.5 4.5c0 3 1 4 1 4H2.5s1-1 1-4A4.5 4.5 0 018 1.5z" /><path d="M6.5 13.5a1.5 1.5 0 003 0" /></svg>
);
export const Share2 = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12.5" cy="3" r="1.5" /><circle cx="3" cy="8" r="1.5" /><circle cx="12.5" cy="13" r="1.5" /><path d="M4.5 7.5l6.5-3.5M4.5 8.5l6.5 3.5" /></svg>
);
export const MessageCircle = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 8A6 6 0 112 8a6 6 0 0112 0z" /><path d="M5 14l1.5-3" /></svg>
);
export const Mail = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1.5" y="3.5" width="13" height="9" rx="1.5" /><path d="M1.5 5l6.5 4.5L14.5 5" /></svg>
);
export const Baby = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="5" r="3" /><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" /></svg>
);
export const Bot = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="5" width="12" height="9" rx="2" /><path d="M5 5V3.5a3 3 0 016 0V5" /><circle cx="6" cy="9.5" r="1" fill="currentColor" /><circle cx="10" cy="9.5" r="1" fill="currentColor" /><path d="M6 12h4" /></svg>
);
export const Youtube = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M14.5 4.5s-.2-1.3-.8-1.8c-.7-.8-1.5-.8-1.9-.8C10 1.8 8 1.8 8 1.8s-2 0-3.8.1c-.4 0-1.2 0-1.9.8-.6.5-.8 1.8-.8 1.8S1.3 6 1.3 7.5v1.4c0 1.5.2 3 .2 3s.2 1.3.8 1.8c.7.8 1.7.7 2.1.8C5.7 14.7 8 14.7 8 14.7s2 0 3.8-.2c.4 0 1.2 0 1.9-.8.6-.5.8-1.8.8-1.8s.2-1.5.2-3V7.5c0-1.5-.2-3-.2-3zM6.5 10.5v-5l5 2.5-5 2.5z" /></svg>
);
export const Plus = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 2v12M2 8h12" /></svg>
);
export const TrendingUp = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12l4-4 3 3 5-6" /><path d="M10 5h4v4" /></svg>
);
export const Clapperboard = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1.5" y="5" width="13" height="9" rx="1.5" /><path d="M1.5 5L4 2h8l2.5 3" /><path d="M6 2L4 5M10 2l-2 3" /></svg>
);
export const Settings = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="2.5" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" /></svg>
);
export const AlertTriangle = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.5L1 14h14L8 1.5z" /><path d="M8 6v4M8 11.5v.5" /></svg>
);
export const Loader2 = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={`${className} animate-spin`} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 1.5A6.5 6.5 0 1114.5 8" /></svg>
);
export const Trash2 = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 4h12M5.5 4V2.5h5V4M6 7v5M10 7v5M3 4l.8 9.5A1 1 0 004.8 14h6.4a1 1 0 001-.9L13 4" /></svg>
);
export const PenLine = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 2l4 4-7 7H3v-4l7-7z" /><path d="M1.5 14h13" /></svg>
);
export const Upload = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 10V2M4.5 5.5L8 2l3.5 3.5M2 13h12" /></svg>
);
export const UploadCloud = Upload;
export const Video = Film;

// ── Extended icon set ──────────────────────────────────────────────────────────
export const User = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="5.5" r="3" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" /></svg>
);
export const UserCircle2 = User;
export const Lock = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="7" width="10" height="8" rx="1.5" /><path d="M5 7V5a3 3 0 016 0v2" /></svg>
);
export const LockOpen = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="7" width="10" height="8" rx="1.5" /><path d="M5 7V5a3 3 0 016 0" /></svg>
);
export const Unlock = LockOpen;
export const ShieldCheck = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.5L2 4v4c0 3.3 2.5 5.5 6 6 3.5-.5 6-2.7 6-6V4L8 1.5z" /><path d="M5.5 8l2 2 3-3" /></svg>
);
export const ShieldAlert = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.5L2 4v4c0 3.3 2.5 5.5 6 6 3.5-.5 6-2.7 6-6V4L8 1.5z" /><path d="M8 6v3M8 10.5v.5" /></svg>
);
export const AlertCircle = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M8 5v4M8 10.5v.5" /></svg>
);
export const Info = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M8 7v5M8 5v.5" /></svg>
);
export const ImageIcon = Image;
export const ImagePlus = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1.5" y="2.5" width="11" height="9" rx="1.5" /><path d="M11 1v4M13 3h-4" /><path d="M1.5 8l3-3 3 3 2-2 3 3" /></svg>
);
export const Camera = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 5.5A1.5 1.5 0 013 4h1.5l1-2h5l1 2H13a1.5 1.5 0 011.5 1.5v6A1.5 1.5 0 0113 13H3a1.5 1.5 0 01-1.5-1.5v-6z" /><circle cx="8" cy="9" r="2.5" /></svg>
);
export const Mic = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="1.5" width="6" height="8" rx="3" /><path d="M2.5 8a5.5 5.5 0 0011 0M8 13.5v2" /></svg>
);
export const Mic2 = Mic;
export const LayoutDashboard = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1.5" y="1.5" width="5.5" height="7" rx="1" /><rect x="9" y="1.5" width="5.5" height="4" rx="1" /><rect x="9" y="7.5" width="5.5" height="7" rx="1" /><rect x="1.5" y="10.5" width="5.5" height="4" rx="1" /></svg>
);
export const LogOut = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2H3a1.5 1.5 0 00-1.5 1.5v9A1.5 1.5 0 003 14h3M10.5 11l3.5-3.5L10.5 4M14 7.5H6" /></svg>
);
export const PanelLeft = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="13" rx="1.5" /><path d="M6 1.5v13" /></svg>
);
export const FolderOpen = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 4.5A1.5 1.5 0 013 3h3l2 2h5a1.5 1.5 0 011.5 1.5v6A1.5 1.5 0 0113 14H3a1.5 1.5 0 01-1.5-1.5v-9z" /><path d="M1.5 8.5h13" /></svg>
);
export const Home = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 7L8 1.5 14.5 7V14H10V10H6v4H1.5V7z" /></svg>
);
export const BookOpen = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3.5C6.5 2.5 4 2 1.5 2.5v11C4 13 6.5 13.5 8 14.5c1.5-1 4-1.5 6.5-1V2.5C12 2 9.5 2.5 8 3.5z" /><path d="M8 3.5v11" /></svg>
);
export const PlayCircle = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M6.5 5.5l5 2.5-5 2.5V5.5z" fill="currentColor" stroke="none" /></svg>
);
export const ExternalLink = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 2h5v5M14 2L7 9M6.5 3H3a1.5 1.5 0 00-1.5 1.5v9A1.5 1.5 0 003 15h9a1.5 1.5 0 001.5-1.5V10" /></svg>
);
export const Circle = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /></svg>
);
export const Maximize2 = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 2h4v4M6 14H2v-4M14 2l-5 5M2 14l5-5" /></svg>
);
export const Subtitles = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" /><path d="M4 8h8M4 11h5" /></svg>
);
export const Captions = Subtitles;
export const Brain = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 2C5.8 2 4 3.8 4 6c0 .8.2 1.5.6 2.1C3.7 8.5 3 9.4 3 10.5 3 12 4.1 13 5.5 13H8" /><path d="M8 2c2.2 0 4 1.8 4 4 0 .8-.2 1.5-.6 2.1.9.4 1.6 1.3 1.6 2.4 0 1.5-1.1 2.5-2.5 2.5H8" /><path d="M8 2v11" /></svg>
);
export const Rocket = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.5c2 0 4.5 2 4.5 6.5L10 11H6L3.5 8C3.5 3.5 6 1.5 8 1.5z" /><path d="M6 11l-1.5 3.5M10 11l1.5 3.5M5.5 8a2.5 2.5 0 005 0" /></svg>
);
export const Activity = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 8h3l2-5 3 10 2-5h4" /></svg>
);
export const BarChart2 = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M3 13V7M8 13V3M13 13V9" /></svg>
);
export const CheckCircle = CheckCircle2;
export const ChevronLeft = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3l-5 5 5 5" /></svg>
);
export const Copy = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="1.5" /><path d="M3 11H2a1.5 1.5 0 01-1.5-1.5v-8A1.5 1.5 0 012 0h8A1.5 1.5 0 0111.5 1.5V3" /></svg>
);
export const Database = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><ellipse cx="8" cy="4" rx="6" ry="2.5" /><path d="M2 4v8c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V4" /><path d="M2 8c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" /></svg>
);
export const Edit3 = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.5 2l3.5 3.5-8 8H2.5V10l8-8z" /><path d="M1.5 14.5h13" /></svg>
);
export const Pencil = Edit3;
export const EyeOff = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M2 2l12 12M6.5 6.6A3 3 0 009.4 9.5M4.5 4.6C2.9 5.7 1.5 8 1.5 8s2.5 5 6.5 5c1.3 0 2.5-.4 3.5-1M7 3.1C7.3 3 7.7 3 8 3c4 0 6.5 5 6.5 5s-.5 1-1.5 2" /></svg>
);
export const FileVideo = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 1.5H3.5A1.5 1.5 0 002 3v10a1.5 1.5 0 001.5 1.5h9A1.5 1.5 0 0014 13V6.5L9 1.5z" /><path d="M9 1.5V6.5H14" /><path d="M6 9.5l4 2-4 2V9.5z" fill="currentColor" stroke="none" /></svg>
);
export const Flame = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.5c0 3-3 4-3 7a3 3 0 006 0c0-2-1.5-3-1.5-5C9.5 4.5 10 6 10 6c1-1 1.5-2.5 1.5-4.5" /></svg>
);
export const Gem = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 14L1.5 6.5l2-4h9l2 4L8 14z" /><path d="M1.5 6.5h13" /></svg>
);
export const Gift = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1.5" y="6" width="13" height="8.5" rx="1" /><rect x="1.5" y="3.5" width="13" height="2.5" rx="1" /><path d="M8 3.5V14.5M5.5 3.5C5.5 2 6.5 1 8 1s2.5 1 2.5 2.5" /></svg>
);
export const Guitar = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="10" r="3" /><path d="M8.5 7.5l4-4M11 2l3 3-1.5 1.5L9.5 3.5 11 2z" /></svg>
);
export const Drum = Guitar;
export const Piano = Guitar;
export const Heart = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 13.5C8 13.5 1.5 9.5 1.5 5.5A3.5 3.5 0 018 3.8 3.5 3.5 0 0114.5 5.5C14.5 9.5 8 13.5 8 13.5z" /></svg>
);
export const History = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 8a6 6 0 106-6H6" /><path d="M2 4v4h4" /><path d="M8 5v3.5l2 2" /></svg>
);
export const Infinity = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M5.5 8C5.5 6.3 6.3 5 8 5s4 3 5.5 3-2.5 3-4 3-4-3-5.5-3z" /><path d="M5.5 8c0 1.7-.8 3-2.5 3S.5 9.7.5 8 1.3 5 3 5s2.5 1.3 2.5 3z" /></svg>
);
export const Instagram = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="3" /><circle cx="8" cy="8" r="3" /><circle cx="11.5" cy="4.5" r="0.5" fill="currentColor" /></svg>
);
export const Twitter = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M14.5 2.5s-1 .5-2 .7A3 3 0 008.5 6c-3 0-5.5-2-7-4 0 0-.5 2 1 3.5-.5 0-1.5-.5-1.5-.5s0 2 2 3c-.5.5-1.5 0-1.5 0s.5 2 2.5 2.5C3.5 11 2 11.5 2 11.5s1.5 2 5 2c4 0 7-3.5 7-7v-.5c.5-.5 1-1.5 .5-3z" /></svg>
);
export const Rss = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M2 3c6 0 11 5 11 11M2 7c4 0 7 3 7 7" /><circle cx="3" cy="13" r="1.5" fill="currentColor" /></svg>
);
export const Send = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2L1.5 7l5 2.5M14 2L9 14.5l-2.5-5M14 2L6.5 9.5" /></svg>
);
export const Shuffle = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 4h3l7 8h3M14.5 4h-3l-2-2M14.5 12h-3l-2 2M1.5 12h3" /></svg>
);
export const SkipBack = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3 3h1.5v10H3V3zM5.5 8l7-5v10l-7-5z" /></svg>
);
export const SkipForward = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11.5 3h1.5v10h-1.5V3zM10.5 8l-7-5v10l7-5z" /></svg>
);
export const SlidersHorizontal = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M1.5 4h13M1.5 8h13M1.5 12h13" /><circle cx="5" cy="4" r="1.5" fill="currentColor" stroke="none" /><circle cx="10" cy="8" r="1.5" fill="currentColor" stroke="none" /><circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none" /></svg>
);
export const Smartphone = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="1" width="8" height="14" rx="2" /><path d="M7 12.5h2" /></svg>
);
export const Monitor = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1.5" y="2" width="13" height="9" rx="1.5" /><path d="M5.5 14.5h5M8 11v3.5" /></svg>
);
export const StopCircle = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><rect x="5.5" y="5.5" width="5" height="5" rx="1" fill="currentColor" stroke="none" /></svg>
);
export const XCircle = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" /></svg>
);
export const TrendingDown = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 4l4 4 3-3 5 6" /><path d="M10 11h4v-4" /></svg>
);
export const Waves = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M1 8c1-2 2-2 3 0s2 2 3 0 2-2 3 0 2 2 3 0" /></svg>
);
export const Cloud = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M12.5 10.5a3 3 0 00-1-5.8 4.5 4.5 0 00-8.5 2 3 3 0 001.5 5.8h8z" /></svg>
);
export const Cpu = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1" /><path d="M6 1.5V4M10 1.5V4M6 12v2.5M10 12v2.5M1.5 6H4M1.5 10H4M12 6h2.5M12 10h2.5" /></svg>
);
export const Coins = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><ellipse cx="6" cy="5.5" rx="4.5" ry="2" /><path d="M1.5 5.5v3c0 1.1 2 2 4.5 2s4.5-.9 4.5-2v-3" /><ellipse cx="10" cy="10.5" rx="4.5" ry="2" /><path d="M5.5 10.5v.5c0 1.1 2 2 4.5 2s4.5-.9 4.5-2v-3" /></svg>
);
export const Key = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="5.5" cy="6.5" r="3.5" /><path d="M8.5 9.5l5.5 5.5M11 12l2 2" /></svg>
);
export const Layout = LayoutDashboard;
export const Link2 = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5L7 4" /><path d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5L9 12" /></svg>
);
export const MessageSquare = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 2.5h12a1 1 0 011 1v8a1 1 0 01-1 1H5l-3.5 2V3.5a1 1 0 011-1z" /></svg>
);
export const Minus = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 8h10" /></svg>
);
export const Moon = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M13 10A6 6 0 016 3a6 6 0 100 10 6 6 0 007-3z" /></svg>
);
export const PartyPopper = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 14.5l5-10 5 5-10 5z" /><path d="M9 4l1.5-2M12 7l2-1.5M10.5 10l2 1.5M7 2.5l1 2" /></svg>
);
export const RotateCcw = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 8A6 6 0 1114 8" /><path d="M2 4v4h4" /></svg>
);
export const ArrowUp = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 13V3M4 7l4-4 4 4" /></svg>
);
export const ArrowDownCircle = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M8 5v6M5.5 9l2.5 2.5 2.5-2.5" /></svg>
);
export const ArrowRightCircle = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M5 8h6M9 5.5l2.5 2.5-2.5 2.5" /></svg>
);
export const BookmarkCheck = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 2h10v12l-5-3-5 3V2z" /><path d="M5.5 7l2 2 3-3" /></svg>
);
export const CalendarDays = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="12" rx="1.5" /><path d="M1.5 6.5h13M5 1v3M11 1v3" /><path d="M4 9.5h1M7.5 9.5h1M11 9.5h1M4 12.5h1M7.5 12.5h1M11 12.5h1" /></svg>
);
export const CalendarIcon = CalendarDays;
export const Anchor = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="8" cy="4" r="2" /><path d="M8 6v9M4 9H2a6 6 0 0012 0h-2" /></svg>
);
export const MapPin = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6z"/><circle cx="12" cy="8" r="2"/></svg>
);

export const Save = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1z" /><path d="M11 2v4H5V2" /><rect x="3" y="9" width="10" height="5" rx="0.5" /></svg>
);
export const Archive = ({ className = "w-4 h-4", style }: SVGProps) => (
  <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="3" rx="0.75" /><path d="M2.5 4.5v9a1 1 0 001 1h9a1 1 0 001-1v-9" /><path d="M6 8h4" /></svg>
);
