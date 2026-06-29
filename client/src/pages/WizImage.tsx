import { useState, useRef, useEffect } from "react";
import { LandscapeHint } from "@/components/LandscapeHint";
import { IMAGE_RENDER_QUALITY, WIZLUMINA_CINEMATIC } from "@/lib/pricing";
import { mp } from "@/lib/mixpanel";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import StudioAmbientLight from "@/components/StudioAmbientLight";
import AnimatedEqualiser from "@/components/AnimatedEqualiser";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import {
  ImageIcon, Loader2, ChevronRight, Zap,
} from "@/lib/icons";
import { VoicePromptButton } from "@/components/VoicePromptButton";
import { QuickTopUpModal } from "@/components/QuickTopUpModal";
import { useCreditGuard } from "@/hooks/useCreditGuard";

// ─── Accent / Theme Tokens ────────────────────────────────────────────────────
const A = "#6366f1";          // indigo-500
const A_DIM = "rgba(99,102,241,0.12)";
const A_GLOW = "rgba(99,102,241,0.25)";
const A_BORDER = "rgba(99,102,241,0.30)";
const BG_BASE = "#04040e";    // deep navy
const BG_CANVAS = "#080818";  // canvas area
const ENV_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/env-wizimage-retoucher-NeN2P2u86dfGsfVCX8Yqrn.webp";

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_TYPES = [
  { id: "album_cover",      label: "Album Cover",      icon: "AL", sub: "Square · 3000×3000px" },
  { id: "band_photo",       label: "Band Photo",        icon: "PH", sub: "Landscape · 4K" },
  { id: "tour_poster",      label: "Tour Poster",       icon: "PO", sub: "Portrait · A2 print" },
  { id: "social_media",     label: "Social Media",      icon: "MO", sub: "Multi-format pack" },
  { id: "merch_design",     label: "Merch Design",      icon: "", sub: "T-shirt · Hoodie" },
  { id: "video_thumbnail",  label: "Video Thumbnail",   icon: "VI", sub: "16:9 · YouTube" },
  { id: "character",        label: "Character",         icon: "CH", sub: "Save to library" },
];

const VISUAL_STYLE_TAGS = [
  // Photographic / Cinematic
  "Cinematic", "Dark & Moody", "Photorealistic", "Painterly",
  "Neon / Cyberpunk", "Vintage / Retro", "Gothic", "Minimalist",
  "Abstract", "Surrealist", "Watercolour", "Comic / Graphic",
  // Animation & Cartoon
  "Pixar 3D", "Disney Animation", "Anime", "Studio Ghibli",
  "Comic Book", "Claymation", "Cartoon", "Manga",
  "Stop Motion", "Dreamworks 3D",
];

const ANIMATION_STYLES = ["Pixar 3D", "Disney Animation", "Anime", "Studio Ghibli", "Comic Book", "Claymation", "Cartoon", "Manga", "Stop Motion", "Dreamworks 3D"];

const ASPECT_RATIOS: Array<"1:1" | "16:9" | "9:16" | "4:3" | "3:4"> = ["1:1", "16:9", "9:16", "4:3", "3:4"];

const COLOUR_SWATCHES = [
  "#2d1060", "#d4a843", "#e05555", "#4a9eff",
  "#1a1a2e", "#0d0d0d", "#6db86d",
];

const VARIATIONS_OPTIONS = [1, 2, 4, 6, 8, 16];

const PRODUCTION_STATUS = [
  { label: "Reference analysed",        status: "done" },
  { label: "Style locked",              status: "done" },
  { label: "Prompt optimised",          status: "done" },
  { label: "AI generation — 4 variations", status: "active" },
  { label: "WizLumina™ grade",         status: "pending" },
  { label: "4K upscale & export",       status: "pending" },
];

const RENDER_QUALITY = [
  { id: "standard", ...IMAGE_RENDER_QUALITY.STANDARD },
  { id: "hd",       ...IMAGE_RENDER_QUALITY.HD },
  { id: "4k",       ...IMAGE_RENDER_QUALITY.UHD },
  { id: "8k",       ...IMAGE_RENDER_QUALITY.UHD8 },
];

const EXPORT_FORMATS = ["PNG", "JPEG", "TIFF", "PSD", "SVG", "WEBP"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WizImage() {
  useSEO({ title: "WizImage™ — AI Images, Art & Cover Design — WIZ AI", path: "/wiz-image", description: "Generate album covers, band photos, tour posters, merch designs, and any visual art with AI. 1 credit per image. One wallet unlocks all WIZ AI studios." });
   const { user, loading: authLoading } = useAuth();
  useEffect(() => { if (user) { mp.studioEntered("WizImage"); } }, [user]);
  const { balance: creditBalance } = useCreditGuard();
  const [topUpOpen, setTopUpOpen] = useState(false);
  // Quality mapping: standard→low, hd→medium, 4k/8k→high
  const QUALITY_MAP: Record<string, "low" | "medium" | "high"> = {
    standard: "low",
    hd: "medium",
    "4k": "high",
    "8k": "high",
  };
  const CREDITS_PER_IMAGE = 2;
  // ── State ──
  const [prompt, setPrompt] = useState("Dark cinematic album cover for a five-piece rock band. Dramatic stage lighting with deep purple and gold tones. Smoke and haze effects. Gothic atmosphere. Ultra-realistic, 8K quality, professional photography style.");
  const [imageType, setImageType] = useState("album_cover");
  const [styleTags, setStyleTags] = useState<string[]>(["Cinematic", "Dark & Moody", "Gothic"]);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3" | "3:4">("1:1");
  const [activeSwatches, setActiveSwatches] = useState<string[]>(["#2d1060", "#d4a843", "#0d0d0d"]);
  const [variations, setVariations] = useState(4);
  const [renderQuality, setRenderQuality] = useState("standard");
  const [imageSource, setImageSource] = useState<"upload" | "ai_generated" | "photo">("upload");
  const [exportFormat, setExportFormat] = useState("PNG");
  const [upgradeTier, setUpgradeTier] = useState<"original" | "enhanced" | "luminar">("original");
  const [ambience, setAmbience] = useState(72);
  const [selectedCell, setSelectedCell] = useState(0);
  const [hasRef, setHasRef] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [showSaveLibModal, setShowSaveLibModal] = useState(false);
  const [libCharName, setLibCharName] = useState("");
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [libPickerSearch, setLibPickerSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const libraryQuery = trpc.characterLibrary.list.useQuery(undefined, { enabled: showLibraryPicker });

  const saveToLibraryMut = trpc.characterLibrary.save.useMutation({
    onSuccess: (_data, vars) => {
      toast.success(`“${vars.name}” saved to Character Library!`);
      setShowSaveLibModal(false);
      setLibCharName("");
    },
    onError: (e) => toast.error(e.message),
  });

  const utils = trpc.useUtils();

  const { data: history } = trpc.wizImage.getHistory.useQuery(
    { limit: 12 },
    { enabled: !!user }
  );

  const generateMutation = trpc.wizImage.generateImage.useMutation({
    onSuccess: (data) => {
      mp.buildCompleted("WizImage");
      setGeneratedImages([data.imageUrl]);
      toast.success(`Image generated! (${data.creditsUsed} credits used)`);
      utils.wizImage.getHistory.invalidate();
    },
    onError: (err) => {
      mp.buildFailed("WizImage");
      toast.error(err.message || "Image generation failed");
    },
  });

  const deleteMutation = trpc.wizImage.deleteImage.useMutation({
    onSuccess: () => {
      toast.success("Image deleted");
      utils.wizImage.getHistory.invalidate();
    },
  });

  const handleGenerate = () => {
    if (!user) { window.location.href = getLoginUrl("/wiz-image"); return; }
    if (!prompt.trim()) { toast.error("Please enter a prompt"); return; }
    mp.projectCreated("WizImage");
    mp.buildStarted("WizImage");
    const stylePrefix = styleTags.length > 0 ? `${styleTags.join(", ")} style. ` : "";
    generateMutation.mutate(
      { prompt: stylePrefix + prompt.trim(), style: imageType, aspectRatio, quality: QUALITY_MAP[renderQuality] ?? "medium" },
      {
        onSuccess: () => {
          // Auto-prompt save to library when Character type is selected
          if (imageType === "character") {
            setTimeout(() => setShowSaveLibModal(true), 600);
          }
        },
      }
    );
  };

  const handleDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `wizimage-${imageType}-${Date.now()}.png`;
    a.target = "_blank";
    a.click();
  };

  const toggleStyleTag = (tag: string) => {
    setStyleTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const toggleSwatch = (color: string) => {
    setActiveSwatches((prev) => prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]);
  };

  const currentImageType = IMAGE_TYPES.find((t) => t.id === imageType) ?? IMAGE_TYPES[0];


  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: BG_BASE }}>

      {/* ── Ambient Environment: canvas/noise texture + indigo radial glow ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ opacity: ambience / 100 }}>
        {/* Noise texture overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat", opacity: 0.35,
        }} />
        {/* Indigo radial glow — top-right */}
        <div style={{
          position: "absolute", top: "-10%", right: "-5%",
          width: "60vw", height: "60vw",
          background: "radial-gradient(ellipse at center, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.06) 40%, transparent 70%)",
          borderRadius: "50%",
        }} />
        {/* Secondary glow — bottom-left */}
        <div style={{
          position: "absolute", bottom: "10%", left: "-10%",
          width: "40vw", height: "40vw",
          background: "radial-gradient(ellipse at center, rgba(139,92,246,0.10) 0%, transparent 65%)",
          borderRadius: "50%",
        }} />
        {/* Subtle canvas grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }} />
      </div>

      {/* ── Studio Header ── */}
      <div className="sticky top-0 z-40 overflow-hidden" style={{ background: "rgba(4,4,14,0.88)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${A_BORDER}` }}>
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

          {/* Left: Logo + identity */}
          <div className="flex items-center gap-3">
            <a href="/" className="text-white/40 hover:text-white/70 text-xs flex items-center gap-1 transition-colors mr-1">← Back</a>
            <div className="relative">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{ background: `linear-gradient(135deg, ${A_DIM}, rgba(4,4,14,0.8))`, borderColor: A_BORDER, boxShadow: `0 0 14px ${A_GLOW}` }}>
                <ImageIcon className="w-5 h-5" style={{ color: A }} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 studio-led studio-led-green" style={{ borderColor: BG_BASE }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.08em" }}>WIZIMAGE™</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded tracking-widest text-white" style={{ background: A }}>AI VISUAL CREATOR</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: A }} />
                <span className="text-[10px] text-white/40 tracking-widest uppercase font-medium">Image Studio · Systems Online</span>
              </div>
            </div>
          </div>

          {/* Centre: Stage bar — border-bottom underline style matching reference */}
          <div className="hidden md:flex items-center gap-0">
            {[
              { label: "Reference", done: true },
              { label: "Image Type", done: true },
              { label: "Style & Prompt", active: true },
              { label: "Upgrade Preview" },
              { label: "Export" },
            ].map((s) => (
              <div
                key={s.label}
                className="px-4 py-1.5 text-[11px] font-medium cursor-pointer transition-all"
                style={{
                  color: s.active ? "#d4a843" : s.done ? "#6db86d" : "rgba(255,255,255,0.35)",
                  borderBottom: s.active ? "2px solid #d4a843" : s.done ? "2px solid transparent" : "2px solid transparent",
                  letterSpacing: "0.5px",
                }}
              >
                {s.done && !s.active && <span className="mr-1">✓</span>}
                {s.label}
              </div>
            ))}
          </div>

          {/* Right: Credits + avatar */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ background: A_DIM, borderColor: A_BORDER }}>
              <span className="text-xs font-medium" style={{ color: A }}>10,000 Credits</span>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border" style={{ background: A_DIM, borderColor: A_BORDER, color: A }}>
              {user?.name?.charAt(0) || "T"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Studio Hero ── */}
      <div className="relative w-full overflow-hidden" style={{ height: 320 }}>
        {/* Background image */}
        <img
          src={ENV_IMG}
          alt="WizImage Creative Studio"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 30%", filter: `brightness(${ambience / 100})`, transition: "filter 0.6s ease" }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(4,4,14,0.1) 0%, rgba(4,4,14,0.65) 100%)" }} />
        {/* Cintiq overlay — 340×190px floating canvas preview centred in hero */}
        <div className="absolute" style={{ top: 38, left: "50%", transform: "translateX(-50%)", width: 340, height: 190, borderRadius: 4, overflow: "hidden", opacity: 0.85, border: "1px solid rgba(99,102,241,0.35)", boxShadow: "0 0 24px rgba(99,102,241,0.3)" }}>
          <div className="w-full h-full relative flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #2d1060 30%, #1a0a2e 60%, #0d0520 100%)" }}>
            {/* Animated canvas shimmer */}
            <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(99,102,241,0.03) 2px, rgba(99,102,241,0.03) 4px)` }} />
            {generateMutation.isPending ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: `rgba(99,102,241,0.3) rgba(99,102,241,0.3) rgba(99,102,241,0.3) ${A}` }} />
                <span className="text-[9px] tracking-[2px] uppercase" style={{ color: "rgba(99,102,241,0.8)" }}>Rendering</span>
              </div>
            ) : generatedImages.length > 0 ? (
              <img src={generatedImages[0]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <div className="text-2xl mb-1" style={{ opacity: 0.4 }}>{IMAGE_TYPES.find(t => t.id === imageType)?.icon ?? ""}</div>
                <div className="text-[9px] tracking-[1px] uppercase" style={{ color: "rgba(212,168,67,0.5)" }}>{currentImageType.label} · Awaiting Brief</div>
              </div>
            )}
            {/* Canvas label */}
            <div className="absolute bottom-1.5 left-2 text-[9px] tracking-[1px] uppercase" style={{ color: "rgba(212,168,67,0.7)" }}>
              {currentImageType.label.toUpperCase()} · {generateMutation.isPending ? "IN PROGRESS" : generatedImages.length > 0 ? "COMPLETE" : "STANDBY"}
            </div>
            {/* Canvas progress */}
            <div className="absolute top-1.5 right-2 text-[9px]" style={{ color: generateMutation.isPending ? "rgba(109,184,109,0.9)" : "rgba(255,255,255,0.3)" }}>
              {generateMutation.isPending ? "● GENERATING" : generatedImages.length > 0 ? "● READY" : "○ STANDBY"}
            </div>
          </div>
        </div>
        {/* Studio-info stats — bottom-left */}
        <div className="absolute flex gap-3 items-end" style={{ bottom: 16, left: 20 }}>
          {[
            { label: "Images Created", val: history?.images?.length ?? 0, sub: "This session" },
            { label: "Style", val: styleTags[0] ?? "Cinematic", sub: "Active preset", small: true },
            { label: "Resolution", val: renderQuality === "8k" ? "8K" : renderQuality === "4k" ? "4K" : renderQuality === "hd" ? "HD" : "STD", sub: renderQuality === "8k" ? "7680×7680px" : renderQuality === "4k" ? "3840×3840px" : renderQuality === "hd" ? "2048×2048px" : "1024×1024px" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg px-3 py-2" style={{ background: "rgba(4,4,14,0.8)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <div className="text-[9px] uppercase tracking-[1px]" style={{ color: "rgba(255,255,255,0.78)" }}>{stat.label}</div>
              <div className="font-bold" style={{ fontSize: stat.small ? 13 : 16, color: "#d4a843" }}>{stat.val}</div>
              <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>{stat.sub}</div>
            </div>
          ))}
        </div>
        {/* Ambient dimmer — bottom-right floating overlay */}
        <div className="absolute flex items-center gap-2.5 rounded-xl px-3.5 py-2" style={{ bottom: 16, right: 20, background: "rgba(4,4,14,0.82)", border: "1px solid rgba(99,102,241,0.25)" }}>
          <span className="text-[9px] tracking-[1px] uppercase" style={{ color: "rgba(255,255,255,0.78)" }}>☀ Studio Ambience</span>
          <input
            type="range" min={20} max={100} value={ambience}
            onChange={(e) => setAmbience(Number(e.target.value))}
            className="h-1 rounded-full cursor-pointer"
            style={{ width: 100, accentColor: "#d4a843", background: `linear-gradient(to right, #222 0%, #d4a843 ${ambience}%, #222 ${ambience}%)` }}
          />
          <span className="text-[10px] w-7 text-right" style={{ color: "#d4a843" }}>{ambience}%</span>
        </div>
      </div>

      {/* ── REFERENCE UPLOAD BANNER (top of page, always visible) ── */}
      {!hasRef ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-4 px-6 py-4 cursor-pointer transition-all relative z-10"
          style={{
            background: "linear-gradient(90deg, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0.07) 100%)",
            borderBottom: "1px solid rgba(99,102,241,0.3)",
          }}
          onMouseEnter={e=>(e.currentTarget.style.background="linear-gradient(90deg, rgba(99,102,241,0.22) 0%, rgba(99,102,241,0.11) 100%)")}
          onMouseLeave={e=>(e.currentTarget.style.background="linear-gradient(90deg, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0.07) 100%)")}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.4)" }}></div>
          <div className="flex-1">
            <div className="text-sm font-bold mb-0.5" style={{ color: "#818cf8", letterSpacing: "0.5px" }}>UPLOAD YOUR REFERENCE IMAGE TO BEGIN</div>
            <div className="text-xs text-zinc-500">Band photos, artist portraits, album concepts, mood images · JPG, PNG, WEBP, RAW · up to 50MB</div>
          </div>
          <div className="text-xs font-bold px-4 py-2 rounded-lg flex-shrink-0" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.35)", color: "#818cf8" }}>BROWSE & UPLOAD</div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-6 py-3 relative z-10" style={{ background: "rgba(109,184,109,0.08)", borderBottom: "1px solid rgba(109,184,109,0.2)" }}>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
          <span className="text-xs font-bold text-green-400">REFERENCE LOADED — band_promo_shoot.jpg</span>
          <div className="flex-1 h-7 mx-4"><AnimatedEqualiser barCount={32} color="#4ade80" height={28} alwaysAnimate={true} /></div>
          <button onClick={() => setHasRef(false)} className="text-zinc-600 hover:text-zinc-400 text-sm ml-auto">Replace ×</button>
        </div>
      )}

      {/* ── Main Layout: Left Panel | Centre Canvas | Right Panel ── */}
      <style>{`
        @media (max-width: 768px) {
          .wizimage-layout {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
          }
          .wizimage-layout aside {
            position: static !important;
            max-height: none !important;
          }
        }
      `}</style>
      <div className="relative z-10 max-w-[1440px] mx-auto wizimage-layout" style={{ display: "grid", gridTemplateColumns: "340px 1fr 300px", minHeight: "calc(100vh - 64px)" }}>

        {/* ── LEFT PANEL ── */}
        <aside className="overflow-y-auto p-4 flex flex-col gap-4" style={{ maxHeight: "calc(100vh - 64px)", position: "sticky", top: 64, background: "rgba(4,4,14,0.75)", backdropFilter: "blur(12px)", borderRight: `1px solid ${A_BORDER}` }}>

          {/* ① Image Source */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-white/30 tracking-[2px] uppercase">① Image Source</span>
              <div className="flex-1 h-px" style={{ background: A_BORDER }} />
            </div>
            <div className="flex gap-1.5 mb-3">
              {(["upload", "ai_generated", "photo"] as const).map((src) => (
                <button
                  key={src}
                  onClick={() => setImageSource(src)}
                  className="flex-1 text-[9px] py-1.5 rounded-md border transition-all font-semibold tracking-wide uppercase"
                  style={{
                    borderColor: imageSource === src ? A : A_BORDER,
                    background: imageSource === src ? A_DIM : "rgba(255,255,255,0.03)",
                    color: imageSource === src ? A : "rgba(255,255,255,0.35)",
                    boxShadow: imageSource === src ? `0 0 8px ${A_GLOW}` : "none",
                  }}
                >
                  {src === "upload" ? "📁 Upload" : src === "ai_generated" ? "✦ AI Gen" : "📷 Photo"}
                </button>
              ))}
            </div>
          </div>

          {/* ② Reference Upload */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-white/30 tracking-[2px] uppercase">② Reference</span>
              <div className="flex-1 h-px" style={{ background: A_BORDER }} />
            </div>
            {!hasRef ? (
              <div className="space-y-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all"
                  style={{ borderColor: A_BORDER, background: A_DIM }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = A)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = A_BORDER)}
                >
                  <div className="text-3xl mb-2"></div>
                  <div className="text-sm font-semibold mb-1" style={{ color: A }}>Upload Your Reference</div>
                  <div className="text-[11px] text-white/40 mb-3">Band photos, artist portraits, album concepts, mood images</div>
                  <button className="px-5 py-2 rounded-full text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${A}, #4f46e5)` }}>
                    Browse & Upload
                  </button>
                  <div className="text-[10px] text-white/30 mt-2">JPG · PNG · WEBP · RAW · up to 50MB</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowLibraryPicker(true); }}
                  className="w-full py-2 rounded-xl text-xs font-bold border transition-all"
                  style={{ borderColor: "rgba(212,168,67,0.35)", color: "#d4a843", background: "rgba(212,168,67,0.08)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(212,168,67,0.15)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(212,168,67,0.08)"; }}
                >
                  ★ Use Character from Library
                </button>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: A_BORDER }}>
                <div className="grid grid-cols-4 gap-0.5">
                  {["#1a0a2e", "#0d1a2e", "#1a0a0a"].map((bg, i) => (
                    <div key={i} className={`aspect-square relative cursor-pointer`} style={{ background: `linear-gradient(135deg, ${bg}, ${bg}99)`, outline: i === 0 ? `2px solid ${A}` : "none" }}>
                      {i === 0 && <div className="absolute inset-0 flex items-center justify-center text-white text-lg" style={{ background: `${A}40` }}>✓</div>}
                    </div>
                  ))}
                  <div className="aspect-square border border-dashed flex items-center justify-center text-xl cursor-pointer rounded-sm transition-all" style={{ borderColor: A_BORDER, color: A }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = A_DIM)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>+</div>
                </div>
                <div className="p-2.5" style={{ background: A_DIM }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: A }}>band_promo_shoot.jpg</span>
                    <button onClick={() => setHasRef(false)} className="text-[10px] text-white/40 underline">Replace</button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {["5 members detected", "Dark aesthetic", "Rock / Metal", "3 faces locked"].map((tag) => (
                      <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full border" style={{ borderColor: A_BORDER, color: A, background: A_DIM }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={() => setHasRef(true)} />
          </div>

          {/* ③ Image Type */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-white/30 tracking-[2px] uppercase">③ Image Type</span>
              <div className="flex-1 h-px" style={{ background: A_BORDER }} />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {IMAGE_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setImageType(t.id)}
                  className="border rounded-lg p-2.5 text-center cursor-pointer transition-all"
                  style={{
                    borderColor: imageType === t.id ? A : A_BORDER,
                    background: imageType === t.id ? A_DIM : "rgba(255,255,255,0.03)",
                    boxShadow: imageType === t.id ? `0 0 10px ${A_GLOW}` : "none",
                  }}
                >
                  <div className="text-lg mb-1">{t.icon}</div>
                  <div className="text-[11px] font-semibold text-white/80">{t.label}</div>
                  <div className="text-[9px] text-white/40 mt-0.5">{t.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ④ Style & Prompt */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-white/30 tracking-[2px] uppercase">④ Style & Prompt</span>
              <div className="flex-1 h-px" style={{ background: A_BORDER }} />
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-xs text-white/80 placeholder:text-white/30 resize-none focus:outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${A_BORDER}`, minHeight: 80, fontFamily: "inherit" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = A)}
              onBlur={(e) => (e.currentTarget.style.borderColor = A_BORDER)}
              placeholder="Describe your image... e.g. 'Dark cinematic album cover, five-piece metal band, dramatic stage lighting...'"
              maxLength={1000}
            />
            <div className="flex gap-1.5 mt-1.5">
              <button
                onClick={() => toast.info("AI prompt enhancement coming soon")}
                className="flex-1 text-center text-[10px] py-1.5 rounded-md transition-all"
                style={{ background: A_DIM, border: `1px solid ${A_BORDER}`, color: A }}
              >
                ✦ AI Enhance
              </button>
              <VoicePromptButton
                toolContext="AI image generation"
                onPromptReady={(refined) => setPrompt(refined)}
              />
              <button
                onClick={() => toast.info("Suggestions coming soon")}
                className="flex-1 text-center text-[10px] py-1.5 rounded-md transition-all"
                style={{ background: A_DIM, border: `1px solid ${A_BORDER}`, color: A }}
              >
                ↺ Suggest
              </button>
            </div>
          </div>

          {/* ⑤ Visual Style Tags */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-white/30 tracking-[2px] uppercase">⑤ Visual Style</span>
              <div className="flex-1 h-px" style={{ background: A_BORDER }} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <div className="w-full text-[8px] text-white/25 tracking-[2px] uppercase mb-0.5">Photographic</div>
              {VISUAL_STYLE_TAGS.filter(t => !ANIMATION_STYLES.includes(t)).map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleStyleTag(tag)}
                  className="text-[10px] px-2.5 py-1 rounded-full border transition-all"
                  style={{
                    borderColor: styleTags.includes(tag) ? A : A_BORDER,
                    background: styleTags.includes(tag) ? A_DIM : "rgba(255,255,255,0.04)",
                    color: styleTags.includes(tag) ? A : "rgba(255,255,255,0.4)",
                    boxShadow: styleTags.includes(tag) ? `0 0 8px ${A_GLOW}` : "none",
                  }}
                >
                  {tag}
                </button>
              ))}
              <div className="w-full text-[8px] text-white/25 tracking-[2px] uppercase mt-2 mb-0.5">Animation &amp; Cartoon</div>
              {ANIMATION_STYLES.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleStyleTag(tag)}
                  className="text-[10px] px-2.5 py-1 rounded-full border transition-all"
                  style={{
                    borderColor: styleTags.includes(tag) ? "#f59e0b" : A_BORDER,
                    background: styleTags.includes(tag) ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
                    color: styleTags.includes(tag) ? "#f59e0b" : "rgba(255,255,255,0.4)",
                    boxShadow: styleTags.includes(tag) ? "0 0 8px rgba(245,158,11,0.3)" : "none",
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* ⑥ Aspect Ratio */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-white/30 tracking-[2px] uppercase">⑥ Aspect Ratio</span>
              <div className="flex-1 h-px" style={{ background: A_BORDER }} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ASPECT_RATIOS.map((r) => (
                <button
                  key={r}
                  onClick={() => setAspectRatio(r)}
                  className="text-[10px] px-2.5 py-1 rounded-md border transition-all"
                  style={{
                    borderColor: aspectRatio === r ? A : A_BORDER,
                    background: aspectRatio === r ? A_DIM : "rgba(255,255,255,0.04)",
                    color: aspectRatio === r ? A : "rgba(255,255,255,0.4)",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* ⑦ Colour Palette */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-white/30 tracking-[2px] uppercase">⑦ Colour Palette</span>
              <div className="flex-1 h-px" style={{ background: A_BORDER }} />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOUR_SWATCHES.map((color) => (
                <button
                  key={color}
                  onClick={() => toggleSwatch(color)}
                  className="w-6 h-6 rounded-full transition-all"
                  style={{
                    background: color,
                    border: activeSwatches.includes(color) ? "2px solid #fff" : "2px solid transparent",
                    transform: activeSwatches.includes(color) ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
              <button
                className="w-6 h-6 rounded-full border border-dashed flex items-center justify-center text-sm transition-all"
                style={{ borderColor: A_BORDER, color: "rgba(255,255,255,0.78)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = A; e.currentTarget.style.color = A; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = A_BORDER; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
                onClick={() => toast.info("Custom colour picker coming soon")}
              >
                +
              </button>
            </div>
          </div>

          {/* ⑧ Variations */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-white/30 tracking-[2px] uppercase">⑧ Variations</span>
              <div className="flex-1 h-px" style={{ background: A_BORDER }} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/40">Generate</span>
              <div className="flex gap-1">
                {VARIATIONS_OPTIONS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVariations(v)}
                    className="text-[10px] px-2.5 py-1 rounded-md border transition-all"
                    style={{
                      borderColor: variations === v ? A : A_BORDER,
                      background: variations === v ? A_DIM : "rgba(255,255,255,0.04)",
                      color: variations === v ? A : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-white/40">variations</span>
            </div>
          </div>


        </aside>

        {/* ── CENTRE PANEL: Canvas ── */}
        <div className="flex flex-col" style={{ background: BG_CANVAS, borderRight: `1px solid ${A_BORDER}` }}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ background: "rgba(8,8,24,0.9)", borderColor: A_BORDER }}>
            <div className="flex items-center gap-1.5">
              {[
                { icon: "↖", title: "Select", active: true },
                { icon: "", title: "Zoom" },
                { icon: "⊞", title: "Compare" },
                { icon: "⛶", title: "Fullscreen" },
                { icon: "✏", title: "Edit" },
                { icon: "", title: "Inpaint" },
              ].map((tool) => (
                <button
                  key={tool.title}
                  title={tool.title}
                  className="w-8 h-8 rounded-md text-sm transition-all border"
                  style={{
                    background: tool.active ? A_DIM : "rgba(255,255,255,0.04)",
                    borderColor: tool.active ? A : A_BORDER,
                    color: tool.active ? A : "rgba(255,255,255,0.4)",
                  }}
                  onClick={() => toast.info(`${tool.title} tool coming soon`)}
                >
                  {tool.icon}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/40">{variations} Variations · {currentImageType.label} · {aspectRatio}</span>
              <button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !prompt.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${A}, #4f46e5)`, boxShadow: `0 0 18px ${A_GLOW}` }}
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                ) : (
                  <>GENERATE</>
                )}
              </button>
            </div>
          </div>

          {/* Canvas Grid */}
          <div className="flex-1 p-4" style={{ background: "#050510" }}>
            {generatedImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-0.5 h-full" style={{ minHeight: 400 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedCell(i)}
                    className="relative rounded-lg overflow-hidden cursor-pointer transition-all"
                    style={{
                      background: "#0d0d20",
                      border: selectedCell === i ? `2px solid ${A}` : "1px solid rgba(255,255,255,0.06)",
                      boxShadow: selectedCell === i ? `0 0 14px ${A_GLOW}` : "none",
                    }}
                  >
                    {i === 0 && generatedImages[0] ? (
                      <img src={generatedImages[0]} alt="Generated" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-xs font-bold" style={{ minHeight: 180 }}>
                        VAR {String(i + 1).padStart(2, "0")}
                      </div>
                    )}
                    {generateMutation.isPending && i === 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: "rgba(4,4,14,0.85)" }}>
                        <div className="w-8 h-8 rounded-full border-2 border-t-[#6366f1] animate-spin" style={{ borderColor: `${A_BORDER} ${A_BORDER} ${A_BORDER} ${A}` }} />
                        <span className="text-[10px] tracking-widest" style={{ color: A }}>GENERATING</span>
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-2 text-[9px] text-white/50 tracking-widest">VAR {String(i + 1).padStart(2, "0")}</div>
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] transition-all"
                      style={{
                        background: selectedCell === i ? A : "transparent",
                        borderColor: selectedCell === i ? A : "rgba(255,255,255,0.3)",
                        color: selectedCell === i ? "white" : "transparent",
                      }}>
                      {selectedCell === i && "✓"}
                    </div>
                    {selectedCell === i && (
                      <div className="absolute top-1.5 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ background: A }}>SELECTED</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-0.5" style={{ minHeight: 400 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedCell(i)}
                    className="relative rounded-lg overflow-hidden cursor-pointer transition-all"
                    style={{
                      background: "#0d0d20",
                      border: selectedCell === i ? `2px solid ${A}` : "1px solid rgba(255,255,255,0.06)",
                      minHeight: 180,
                      boxShadow: selectedCell === i ? `0 0 14px ${A_GLOW}` : "none",
                    }}
                  >
                    {generateMutation.isPending && i === 0 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: "rgba(4,4,14,0.85)" }}>
                        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: `${A_BORDER} ${A_BORDER} ${A_BORDER} ${A}` }} />
                        <span className="text-[10px] tracking-widest" style={{ color: A }}>GENERATING</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs font-bold">
                        VAR {String(i + 1).padStart(2, "0")}
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-2 text-[9px] text-white/50 tracking-widest">VAR {String(i + 1).padStart(2, "0")}</div>
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px]"
                      style={{
                        background: selectedCell === i ? A : "transparent",
                        borderColor: selectedCell === i ? A : "rgba(255,255,255,0.3)",
                        color: selectedCell === i ? "white" : "transparent",
                      }}>
                      {selectedCell === i && "✓"}
                    </div>
                    {selectedCell === i && (
                      <div className="absolute top-1.5 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ background: A }}>SELECTED</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Canvas Bottom Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{ background: "rgba(8,8,24,0.9)", borderColor: A_BORDER }}>
            <span className="text-[11px] text-white/40">
              {generatedImages.length > 0 ? `${variations} variations generated · VAR ${String(selectedCell + 1).padStart(2, "0")} selected` : "Awaiting generation"}
            </span>
            <div className="flex items-center gap-1.5">
              {[
                { label: "↺ Regenerate", primary: false, onClick: handleGenerate },
                { label: "✏ Edit Selected", primary: false, onClick: () => toast.info("Edit coming soon") },
                { label: "⊕ Upscale", primary: false, onClick: () => toast.info("Upscale coming soon") },
                { label: "Use This Image →", primary: true, onClick: () => generatedImages[0] && handleDownload(generatedImages[0]) },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={btn.onClick}
                  className="text-[10px] px-3 py-1.5 rounded-md border transition-all"
                  style={{
                    background: btn.primary ? A_DIM : "rgba(255,255,255,0.04)",
                    borderColor: btn.primary ? A : A_BORDER,
                    color: btn.primary ? A : "rgba(255,255,255,0.4)",
                  }}
                >
                  {btn.label}
                </button>
              ))
            }
            </div>

            {/* Save to Character Library — always visible when character type or after generation */}
            {(imageType === "character" || generatedImages.length > 0) && (
              <button
                onClick={() => {
                  if (!generatedImages.length) { toast.info("Generate a character image first"); return; }
                  setShowSaveLibModal(true);
                }}
                className="text-[10px] px-3 py-1.5 rounded-md border transition-all flex items-center gap-1.5"
                style={{
                  background: imageType === "character" ? "rgba(212,168,67,0.12)" : "rgba(255,255,255,0.04)",
                  borderColor: imageType === "character" ? "rgba(212,168,67,0.5)" : A_BORDER,
                  color: imageType === "character" ? "#d4a843" : "rgba(255,255,255,0.4)",
                  fontWeight: imageType === "character" ? 700 : 400,
                }}
              >
                ★ Save to Library
              </button>
            )}
          </div>
        </div>

        {/* Save to Library Modal */}
        {showSaveLibModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#0e0b07] shadow-2xl p-6">
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              <h2 className="text-lg font-bold text-amber-300 mb-1">Save to Character Library</h2>
              <p className="text-xs text-amber-200/50 mb-4">This image will be saved as a reusable character across WizAnimate, Music Video, and all Wiz products.</p>
              <label className="block text-xs font-semibold text-amber-400/70 uppercase tracking-widest mb-1">Character Name</label>
              <input
                value={libCharName}
                onChange={e => setLibCharName(e.target.value)}
                placeholder="e.g. Freddy the Schnauzer"
                className="w-full rounded-lg border border-amber-500/20 bg-black/40 px-3 py-2 text-sm text-amber-100 placeholder-amber-700/50 focus:outline-none focus:border-amber-400/60 mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowSaveLibModal(false)} className="flex-1 rounded-lg border border-amber-500/20 bg-transparent py-2 text-sm text-amber-400/70 hover:text-amber-300 transition-colors">Cancel</button>
                <button
                  onClick={() => {
                    if (!libCharName.trim()) { toast.error("Please enter a character name"); return; }
                    saveToLibraryMut.mutate({ name: libCharName.trim(), previewUrl: generatedImages[0] });
                  }}
                  disabled={saveToLibraryMut.isPending || !libCharName.trim()}
                  className="flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 py-2 text-sm font-bold text-black hover:from-amber-400 hover:to-yellow-300 disabled:opacity-50 transition-all"
                >
                  {saveToLibraryMut.isPending ? "Saving…" : "💾 Save Character"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── RIGHT PANEL ── */}
        <aside className="overflow-y-auto p-3.5 flex flex-col gap-3.5" style={{ maxHeight: "calc(100vh - 64px)", position: "sticky", top: 64, background: "rgba(4,4,14,0.75)", backdropFilter: "blur(12px)" }}>

          {/* Upgrade Preview */}
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: A_BORDER }}>
            <div className="px-3 py-2 text-[10px] tracking-[1.5px] uppercase border-b font-bold" style={{ background: A_DIM, borderColor: A_BORDER, color: A }}>
              ✦ UPGRADE PREVIEW — SEE THE DIFFERENCE
            </div>
            <div className="flex border-b" style={{ borderColor: A_BORDER }}>
              {(["original", "enhanced", "luminar"] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setUpgradeTier(tier)}
                  className="flex-1 py-1.5 text-center text-[10px] border-b-2 transition-all"
                  style={{
                    color: upgradeTier === tier ? A : "rgba(255,255,255,0.3)",
                    borderColor: upgradeTier === tier ? A : "transparent",
                  }}
                >
                  {tier === "original" ? "ORIGINAL" : tier === "enhanced" ? <><span>ENHANCED</span><br /><span className="text-[8px] text-green-400">{IMAGE_RENDER_QUALITY.HD.price}</span></> : <><span>WIZLUMINA™</span><br /><span className="text-[8px]" style={{ color: A }}>{WIZLUMINA_CINEMATIC.price}</span></>}
                </button>
              ))}
            </div>
            <div className="p-2.5">
              <div className="text-[11px] text-green-400 mb-1.5">
                {upgradeTier === "original" ? "Included — no extra cost" : upgradeTier === "enhanced" ? `${IMAGE_RENDER_QUALITY.HD.price} — Enhanced quality` : `${WIZLUMINA_CINEMATIC.price} — WizLumina™ grade`}
              </div>
              <div className="flex flex-col gap-1 mb-2">
                {(upgradeTier === "original"
                  ? ["Standard AI generation", "1024×1024px base output", "Basic colour grading", "JPEG / PNG export"]
                  : upgradeTier === "enhanced"
                  ? ["Enhanced AI generation", "2048×2048px output", "Professional colour grading", "All export formats"]
                  : ["WizLumina™ processing", "4K upscale output", "Cinematic LUT + HDR", "RAW / TIFF / PSD export"]
                ).map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-[10px] text-white/40">
                    <span className="text-[9px]" style={{ color: A }}>→</span>{f}
                  </div>
                ))}
              </div>
              <div className="text-[9px] text-white/30 mb-1.5 tracking-widest uppercase">Visual Quality Comparison</div>
              <div className="grid grid-cols-3 gap-1">
                {["Original", "Enhanced", "WizLumina™"].map((label, i) => (
                  <div key={label} className={`rounded-md overflow-hidden relative aspect-square ${i === 2 ? "opacity-60" : ""}`}
                    style={{ background: `linear-gradient(135deg, #0a0a20 ${i * 20}%, #1a1a40, #050518)` }}>
                    {i === 2 && <div className="absolute inset-0 flex items-center justify-center text-lg" style={{ background: "rgba(0,0,0,0.6)" }}></div>}
                    <div className="absolute bottom-0 left-0 right-0 text-center py-0.5 text-[8px]" style={{ background: "rgba(0,0,0,0.7)", color: i === 2 ? A : "rgba(255,255,255,0.4)" }}>{label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[9px] text-white/30 p-1.5 rounded border" style={{ background: "rgba(255,255,255,0.02)", borderColor: A_BORDER }}>
                Preview only — no download until payment confirmed.
              </div>
            </div>
          </div>

          {/* WizLumina CTA */}
          <div className="rounded-xl p-2.5 cursor-pointer transition-all border" style={{ background: `linear-gradient(135deg, ${A_DIM}, rgba(99,102,241,0.05))`, borderColor: A_BORDER }}
            onMouseEnter={(e) => (e.currentTarget.style.background = `linear-gradient(135deg, ${A_GLOW}, ${A_DIM})`)}
            onMouseLeave={(e) => (e.currentTarget.style.background = `linear-gradient(135deg, ${A_DIM}, rgba(99,102,241,0.05))`)}>
            <div className="text-[11px] font-bold mb-1" style={{ color: A }}>✦ WizLumina™ Cinematic Grade</div>
            <div className="text-[10px] text-white/40">Professional colour science, HDR tone mapping, cinematic LUT, 4K upscale, noise reduction, detail enhancement</div>
            <div className="text-[13px] font-bold mt-1.5" style={{ color: A }}>Add WizLumina™ — {WIZLUMINA_CINEMATIC.price}</div>
          </div>

          {/* Render Quality */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-white/30 tracking-[2px] uppercase">Render Quality</span>
              <div className="flex-1 h-px" style={{ background: A_BORDER }} />
            </div>
            <div className="flex flex-col gap-1.5">
              {RENDER_QUALITY.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setRenderQuality(q.id)}
                  className="flex items-center justify-between px-2.5 py-2 rounded-lg border transition-all"
                  style={{
                    borderColor: renderQuality === q.id ? A : A_BORDER,
                    background: renderQuality === q.id ? A_DIM : "rgba(255,255,255,0.03)",
                    boxShadow: renderQuality === q.id ? `0 0 10px ${A_GLOW}` : "none",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full border-2 transition-all"
                      style={{ background: renderQuality === q.id ? A : "transparent", borderColor: renderQuality === q.id ? A : "rgba(255,255,255,0.3)" }} />
                    <div className="text-left">
                      <div className="text-xs font-semibold text-white/80">{q.label}</div>
                      <div className="text-[10px] text-white/40">{q.desc}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-green-400">{q.price}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-white/30 tracking-[2px] uppercase">Export Format</span>
              <div className="flex-1 h-px" style={{ background: A_BORDER }} />
            </div>
            <div className="flex flex-wrap gap-1">
              {EXPORT_FORMATS.map((f) => (
                <button
                  key={f}
                  onClick={() => setExportFormat(f)}
                  className="text-[10px] px-2.5 py-1 rounded-md border transition-all"
                  style={{
                    borderColor: exportFormat === f ? A : A_BORDER,
                    background: exportFormat === f ? A_DIM : "rgba(255,255,255,0.04)",
                    color: exportFormat === f ? A : "rgba(255,255,255,0.4)",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Production Status */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-white/30 tracking-[2px] uppercase">Production Status</span>
              <div className="flex-1 h-px" style={{ background: A_BORDER }} />
            </div>
            <div className="flex flex-col gap-1">
              {PRODUCTION_STATUS.map((s) => (
                <div key={s.label} className="flex items-center gap-2 py-1">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: s.status === "done" ? "#4ade80" : s.status === "active" ? A : "rgba(255,255,255,0.2)",
                      boxShadow: s.status === "active" ? `0 0 6px ${A}` : "none",
                    }} />
                  <span className="text-[10px]" style={{ color: s.status === "done" ? "#4ade80" : s.status === "active" ? A : "rgba(255,255,255,0.3)" }}>{s.label}</span>
                  {s.status === "active" && <span className="text-[9px] text-white/30 ml-auto">In Progress</span>}
                  {s.status === "pending" && <span className="text-[9px] text-white/20 ml-auto">Pending</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Credit balance panel */}
          {user && (
            <div className="rounded-xl border px-3 py-2.5 mb-2" style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.25)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" style={{ color: A }} />
                  <span className="text-[11px] font-semibold" style={{ color: A }}>WizImage — 2 credits/image</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-white">{creditBalance.toLocaleString()}</span>
                  <span className="text-[10px] text-white/40 ml-1">balance</span>
                </div>
              </div>
              {creditBalance < CREDITS_PER_IMAGE && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-red-400">Insufficient credits — need {CREDITS_PER_IMAGE - creditBalance} more</span>
                  <button onClick={() => setTopUpOpen(true)} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg text-white" style={{ background: A }}>Top up →</button>
                </div>
              )}
            </div>
          )}

          {/* Generate CTA */}
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !prompt.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 mt-auto"
            style={{ background: `linear-gradient(135deg, ${A}, #4f46e5)`, boxShadow: `0 0 20px ${A_GLOW}` }}
          >
            {generateMutation.isPending ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generating…</span>
            ) : (
              "GENERATE IMAGE"
            )}
          </button>

          {/* History */}
          {history && history.images && history.images.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] text-white/30 tracking-[2px] uppercase">Recent Generations</span>
                <div className="flex-1 h-px" style={{ background: A_BORDER }} />
              </div>
              <div className="grid grid-cols-3 gap-1">
                {history.images.slice(0, 6).map((item: any) => (
                  <div key={item.id} className="relative aspect-square rounded-md overflow-hidden group cursor-pointer border transition-all"
                    style={{ background: "#0d0d20", borderColor: A_BORDER }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = A)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = A_BORDER)}>
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1" style={{ background: "rgba(4,4,14,0.85)" }}>
                      <button onClick={() => handleDownload(item.imageUrl)} className="text-[9px] px-1.5 py-0.5 rounded text-white" style={{ background: A }}>↓</button>
                      <button onClick={() => deleteMutation.mutate({ id: item.id })} className="text-[9px] px-1.5 py-0.5 rounded text-white bg-red-500/80">×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
      <LandscapeHint />
      <QuickTopUpModal
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        currentBalance={creditBalance}
        estimatedCost={CREDITS_PER_IMAGE}
      />

      {/* ── Library Picker Modal ── */}
      {showLibraryPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="rounded-2xl p-6 w-full max-w-lg" style={{ background: "#0d0d20", border: `1px solid ${A_BORDER}` }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold" style={{ color: "#d4a843" }}>Character Library</h3>
              <button onClick={() => { setShowLibraryPicker(false); setLibPickerSearch(""); }} className="text-white/40 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <input
              value={libPickerSearch}
              onChange={(e) => setLibPickerSearch(e.target.value)}
              placeholder="Search characters…"
              className="w-full px-3 py-2 rounded-lg text-sm text-white mb-4"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${A_BORDER}`, outline: "none" }}
            />
            {libraryQuery.isLoading ? (
              <div className="text-center py-8 text-white/40 text-sm">Loading…</div>
            ) : !libraryQuery.data?.length ? (
              <div className="text-center py-8 text-white/40 text-sm">No characters saved yet. Create one in WizAnimate or Music Video.</div>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-h-72 overflow-y-auto">
                {libraryQuery.data
                  .filter((c: any) => !libPickerSearch || c.name.toLowerCase().includes(libPickerSearch.toLowerCase()))
                  .map((char: any) => (
                    <button
                      key={char.id}
                      onClick={() => {
                        setPrompt((prev) => `${prev.trim()} Character reference: ${char.name}${char.description ? ` — ${char.description}` : ""}.`);
                        toast.success(`${char.name} added as reference`);
                        setShowLibraryPicker(false);
                        setLibPickerSearch("");
                      }}
                      className="rounded-xl overflow-hidden border transition-all text-left"
                      style={{ borderColor: A_BORDER, background: "rgba(255,255,255,0.04)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#d4a843"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = A_BORDER; }}
                    >
                      {char.photoUrl ? (
                        <img src={char.photoUrl} alt={char.name} className="w-full aspect-square object-cover" />
                      ) : (
                        <div className="w-full aspect-square flex items-center justify-center text-2xl" style={{ background: A_DIM }}>👤</div>
                      )}
                      <div className="p-2">
                        <div className="text-xs font-semibold text-white truncate">{char.name}</div>
                        {char.description && <div className="text-[10px] text-white/40 truncate mt-0.5">{char.description}</div>}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
