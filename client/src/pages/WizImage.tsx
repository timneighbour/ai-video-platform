import { useState, useRef } from "react";
import { mp } from "@/lib/mixpanel";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import {
  Sparkles, Download, Trash2, ImageIcon, Wand2, Loader2,
  ChevronRight, Star, Upload, RefreshCw, Maximize2,
  Edit3, Layers, CheckCircle2,
} from "@/lib/icons";
import { VoicePromptButton } from "@/components/VoicePromptButton";

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_TYPES = [
  { id: "album_cover",      label: "Album Cover",      icon: "💿", sub: "Square · 3000×3000px" },
  { id: "band_photo",       label: "Band Photo",        icon: "📸", sub: "Landscape · 4K" },
  { id: "tour_poster",      label: "Tour Poster",       icon: "🎭", sub: "Portrait · A2 print" },
  { id: "social_media",     label: "Social Media",      icon: "📱", sub: "Multi-format pack" },
  { id: "merch_design",     label: "Merch Design",      icon: "👕", sub: "T-shirt · Hoodie" },
  { id: "video_thumbnail",  label: "Video Thumbnail",   icon: "🎬", sub: "16:9 · YouTube" },
];

const VISUAL_STYLE_TAGS = [
  "Cinematic", "Dark & Moody", "Photorealistic", "Painterly",
  "Neon / Cyberpunk", "Vintage / Retro", "Gothic", "Minimalist",
  "Abstract", "Surrealist", "Watercolour", "Comic / Graphic",
];

const ASPECT_RATIOS: Array<"1:1" | "16:9" | "9:16" | "4:3" | "3:4"> = ["1:1", "16:9", "9:16", "4:3", "3:4"];

const COLOUR_SWATCHES = [
  "#2d1060", "#d4a843", "#e05555", "#4a9eff",
  "#1a1a2e", "#0d0d0d", "#6db86d",
];

const VARIATIONS_OPTIONS = [1, 4, 8, 16];

const PRODUCTION_STATUS = [
  { label: "Reference analysed",        status: "done" },
  { label: "Style locked",              status: "done" },
  { label: "Prompt optimised",          status: "done" },
  { label: "AI generation — 4 variations", status: "active" },
  { label: "WizLuminar™ grade",         status: "pending" },
  { label: "4K upscale & export",       status: "pending" },
];

const RENDER_QUALITY = [
  { id: "standard", label: "Standard",       desc: "1024×1024px · Fast",          price: "Included" },
  { id: "hd",       label: "HD",             desc: "2048×2048px · Print ready",   price: "+£1.99" },
  { id: "4k",       label: "4K Ultra",       desc: "3840×3840px · Billboard",     price: "+£3.99" },
  { id: "8k",       label: "8K WizLuminar™", desc: "7680×7680px · Museum print",  price: "+£7.99" },
];

const EXPORT_FORMATS = ["PNG", "JPEG", "TIFF", "PSD", "SVG", "WEBP"];

const BG_IMAGE = "/manus-storage/wizimage-studio-bg_554e8fec.jpg";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WizImage() {
  useSEO({ title: "WizImage™ — AI Visual Creator", path: "/wiz-image", description: "Create stunning AI visuals: album covers, band photos, tour posters, merch designs and more. Powered by WizImage™ AI Visual Creator." });
  const { user } = useAuth();

  // ── State ──
  const [prompt, setPrompt] = useState("Dark cinematic album cover for a five-piece rock band. Dramatic stage lighting with deep purple and gold tones. Smoke and haze effects. Gothic atmosphere. Ultra-realistic, 8K quality, professional photography style.");
  const [imageType, setImageType] = useState("album_cover");
  const [styleTags, setStyleTags] = useState<string[]>(["Cinematic", "Dark & Moody", "Gothic"]);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3" | "3:4">("1:1");
  const [activeSwatches, setActiveSwatches] = useState<string[]>(["#2d1060", "#d4a843", "#0d0d0d"]);
  const [variations, setVariations] = useState(4);
  const [renderQuality, setRenderQuality] = useState("hd");
  const [exportFormat, setExportFormat] = useState("PNG");
  const [upgradeTier, setUpgradeTier] = useState<"original" | "enhanced" | "luminar">("original");
  const [ambience, setAmbience] = useState(72);
  const [selectedCell, setSelectedCell] = useState(0);
  const [hasRef, setHasRef] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!user) { window.location.href = getLoginUrl(); return; }
    if (!prompt.trim()) { toast.error("Please enter a prompt"); return; }
    mp.projectCreated("WizImage");
    mp.buildStarted("WizImage");
    const stylePrefix = styleTags.length > 0 ? `${styleTags.join(", ")} style. ` : "";
    generateMutation.mutate({ prompt: stylePrefix + prompt.trim(), style: imageType, aspectRatio });
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
    <div className="min-h-screen studio-bg text-white" style={{ backgroundColor: "#08080c" }}>
      {/* ── VR Environment ── */}
      <div className="env-bg" style={{ opacity: ambience / 100 }}>
        <img src={BG_IMAGE} alt="" style={{ filter: `brightness(${ambience / 100})` }} />
        <div className="env-bg-overlay" />
      </div>
      <div className="env-ambient" style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.08) 0%, transparent 70%)" }} />

      {/* ── Studio Header ── */}
      <div className="studio-header sticky top-0 z-40 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-32 bg-[#b8892a]/10 blur-3xl rounded-full" />
          <div className="absolute top-0 right-1/4 w-64 h-24 bg-violet-500/8 blur-3xl rounded-full" />
        </div>
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9a84c]/30 via-[#b8892a]/20 to-[#1a1a20] flex items-center justify-center border border-[#b8892a]/20 shadow-[0_0_12px_rgba(184,137,42,0.15)]">
                <ImageIcon className="w-5 h-5 text-[#c9a84c]" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#050508] studio-led studio-led-green" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.08em" }}>WIZIMAGE™</span>
                <span className="bg-[--color-gold] text-black text-[10px] font-bold px-2 py-0.5 rounded tracking-widest">AI VISUAL CREATOR</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="studio-led studio-led-gold" style={{ width: 6, height: 6 }} />
                <span className="studio-label">Image Studio · Systems Online</span>
              </div>
            </div>
          </div>

          {/* Stage Bar (in header, like mockup) */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "Reference", done: true },
              { label: "Image Type", done: true },
              { label: "Style & Prompt", active: true },
              { label: "Upgrade Preview" },
              { label: "Export" },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center gap-1">
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  s.active
                    ? "bg-[--color-gold]/15 border border-[--color-gold]/40 text-[--color-gold]"
                    : s.done
                    ? "text-green-400"
                    : "text-white/30 hover:text-white/50"
                }`}>
                  {s.done && <span className="text-green-400 mr-0.5">✓</span>}
                  {s.label}
                </div>
                {i < 4 && <ChevronRight className="h-3 w-3 text-white/20 flex-shrink-0" />}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#b8892a]/10 border border-[#b8892a]/20">
              <span className="text-xs text-[#c9a84c] font-medium">✦ 10,000 Credits</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[--color-gold]/20 border border-[--color-gold]/40 flex items-center justify-center text-[--color-gold] text-xs font-bold">T</div>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Left Panel | Centre Canvas | Right Panel ── */}
      <div className="max-w-[1440px] mx-auto" style={{ display: "grid", gridTemplateColumns: "340px 1fr 300px", minHeight: "calc(100vh - 64px)" }}>

        {/* ── LEFT PANEL ── */}
        <aside className="border-r border-[#d4a843]/20 bg-black/60 backdrop-blur-sm overflow-y-auto p-4 flex flex-col gap-4" style={{ maxHeight: "calc(100vh - 64px)", position: "sticky", top: 64 }}>

          {/* ① Reference Upload */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-[#7a7060] tracking-[2px] uppercase">① Reference Upload</span>
              <div className="flex-1 h-px bg-[#d4a843]/20" />
            </div>
            {!hasRef ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-purple-500/40 rounded-xl p-5 text-center cursor-pointer transition-all hover:border-purple-400/60 hover:bg-purple-500/8"
                style={{ background: "rgba(139,92,246,0.04)" }}
              >
                <div className="text-3xl mb-2">🎨</div>
                <div className="text-sm font-semibold text-purple-300 mb-1">Upload Your Reference</div>
                <div className="text-[11px] text-[#7a7060] mb-3">Band photos, artist portraits, album concepts, mood images</div>
                <button className="px-5 py-2 rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>
                  Browse & Upload
                </button>
                <div className="text-[10px] text-[#7a7060] mt-2">JPG · PNG · WEBP · RAW · up to 50MB</div>
              </div>
            ) : (
              <div className="border border-purple-500/30 rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 gap-0.5">
                  {["#1a0a2e", "#0d1a2e", "#1a0a0a"].map((bg, i) => (
                    <div key={i} className={`aspect-square relative cursor-pointer ${i === 0 ? "ring-2 ring-purple-500" : ""}`} style={{ background: `linear-gradient(135deg, ${bg}, ${bg}99)` }}>
                      {i === 0 && <div className="absolute inset-0 bg-purple-500/40 flex items-center justify-center text-white text-lg">✓</div>}
                    </div>
                  ))}
                  <div className="aspect-square border border-dashed border-purple-500/30 flex items-center justify-center text-purple-300 text-xl cursor-pointer hover:bg-purple-500/10 rounded-sm">+</div>
                </div>
                <div className="p-2.5 bg-purple-500/6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-300">band_promo_shoot.jpg</span>
                    <button onClick={() => setHasRef(false)} className="text-[10px] text-[#7a7060] underline">Replace</button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {["5 members detected", "Dark aesthetic", "Rock / Metal", "3 faces locked"].map((tag) => (
                      <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full border border-purple-500/25 text-purple-300" style={{ background: "rgba(139,92,246,0.12)" }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={() => setHasRef(true)} />
          </div>

          {/* ② Image Type */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-[#7a7060] tracking-[2px] uppercase">② Image Type</span>
              <div className="flex-1 h-px bg-[#d4a843]/20" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {IMAGE_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setImageType(t.id)}
                  className={`border rounded-lg p-2.5 text-center cursor-pointer transition-all ${
                    imageType === t.id
                      ? "border-[--color-gold] bg-[--color-gold]/8"
                      : "border-[#d4a843]/20 hover:border-[#d4a843]/40 hover:bg-[#d4a843]/4"
                  }`}
                >
                  <div className="text-lg mb-1">{t.icon}</div>
                  <div className="text-[11px] font-semibold text-[#e8e0d0]">{t.label}</div>
                  <div className="text-[9px] text-[#7a7060] mt-0.5">{t.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ③ Style & Prompt */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-[#7a7060] tracking-[2px] uppercase">③ Style & Prompt</span>
              <div className="flex-1 h-px bg-[#d4a843]/20" />
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-xs text-[#e8e0d0] placeholder:text-[#7a7060] resize-none focus:outline-none focus:border-[#d4a843]/50"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,168,67,0.2)", minHeight: 80, fontFamily: "inherit" }}
              placeholder="Describe your image... e.g. 'Dark cinematic album cover, five-piece metal band, dramatic stage lighting...'"
              maxLength={1000}
            />
            <div className="flex gap-1.5 mt-1.5">
              <button
                onClick={() => toast.info("AI prompt enhancement coming soon")}
                className="flex-1 text-center text-[10px] py-1.5 rounded-md transition-all hover:bg-[#d4a843]/15 text-[--color-gold]"
                style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.25)" }}
              >
                ✦ AI Enhance
              </button>
              <VoicePromptButton
                toolContext="AI image generation"
                onPromptReady={(refined) => setPrompt(refined)}
              />
              <button
                onClick={() => toast.info("Suggestions coming soon")}
                className="flex-1 text-center text-[10px] py-1.5 rounded-md transition-all hover:bg-[#d4a843]/15 text-[--color-gold]"
                style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.25)" }}
              >
                ↺ Suggest
              </button>
            </div>
          </div>

          {/* ④ Visual Style Tags */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-[#7a7060] tracking-[2px] uppercase">④ Visual Style</span>
              <div className="flex-1 h-px bg-[#d4a843]/20" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {VISUAL_STYLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleStyleTag(tag)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                    styleTags.includes(tag)
                      ? "border-[--color-gold] bg-[--color-gold]/10 text-[--color-gold]"
                      : "border-[#d4a843]/20 text-[#7a7060] hover:border-[#d4a843]/40 hover:text-[--color-gold]"
                  }`}
                  style={{ background: styleTags.includes(tag) ? "rgba(212,168,67,0.1)" : "rgba(255,255,255,0.04)" }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* ⑤ Aspect Ratio */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-[#7a7060] tracking-[2px] uppercase">⑤ Aspect Ratio</span>
              <div className="flex-1 h-px bg-[#d4a843]/20" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ASPECT_RATIOS.map((r) => (
                <button
                  key={r}
                  onClick={() => setAspectRatio(r)}
                  className={`text-[10px] px-2.5 py-1 rounded-md border transition-all ${
                    aspectRatio === r
                      ? "border-[--color-gold] bg-[--color-gold]/10 text-[--color-gold]"
                      : "border-[#d4a843]/20 text-[#7a7060] hover:border-[#d4a843]/40 hover:text-[--color-gold]"
                  }`}
                  style={{ background: aspectRatio === r ? "rgba(212,168,67,0.1)" : "rgba(255,255,255,0.04)" }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* ⑥ Colour Palette */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-[#7a7060] tracking-[2px] uppercase">⑥ Colour Palette</span>
              <div className="flex-1 h-px bg-[#d4a843]/20" />
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
                className="w-6 h-6 rounded-full border border-dashed border-[#7a7060] flex items-center justify-center text-[#7a7060] text-sm hover:border-[--color-gold] hover:text-[--color-gold] transition-all"
                onClick={() => toast.info("Custom colour picker coming soon")}
              >
                +
              </button>
            </div>
          </div>

          {/* ⑦ Variations */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-[#7a7060] tracking-[2px] uppercase">⑦ Variations</span>
              <div className="flex-1 h-px bg-[#d4a843]/20" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#7a7060]">Generate</span>
              <div className="flex gap-1">
                {VARIATIONS_OPTIONS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVariations(v)}
                    className={`text-[10px] px-2.5 py-1 rounded-md border transition-all ${
                      variations === v
                        ? "border-[--color-gold] bg-[--color-gold]/10 text-[--color-gold]"
                        : "border-[#d4a843]/20 text-[#7a7060] hover:border-[#d4a843]/40"
                    }`}
                    style={{ background: variations === v ? "rgba(212,168,67,0.1)" : "rgba(255,255,255,0.04)" }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-[#7a7060]">variations</span>
            </div>
          </div>

          {/* Ambient Dimmer */}
          <div className="mt-auto pt-2 border-t border-[#d4a843]/10">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#7a7060] tracking-[1px] uppercase">☀ Studio Ambience</span>
              <input
                type="range" min={20} max={100} value={ambience}
                onChange={(e) => setAmbience(Number(e.target.value))}
                className="flex-1 h-1 rounded-full cursor-pointer accent-[#d4a843]"
                style={{ background: `linear-gradient(to right, #222 0%, #d4a843 ${ambience}%, #222 ${ambience}%)` }}
              />
              <span className="text-[10px] text-[--color-gold] w-8 text-right">{ambience}%</span>
            </div>
          </div>
        </aside>

        {/* ── CENTRE PANEL: Canvas ── */}
        <div className="flex flex-col" style={{ background: "#0a0a0e", borderRight: "1px solid rgba(212,168,67,0.2)" }}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#d4a843]/20" style={{ background: "rgba(10,10,14,0.9)" }}>
            <div className="flex items-center gap-1.5">
              {[
                { icon: "↖", title: "Select", active: true },
                { icon: "🔍", title: "Zoom" },
                { icon: "⊞", title: "Compare" },
                { icon: "⛶", title: "Fullscreen" },
                { icon: "✏", title: "Edit" },
                { icon: "🖌", title: "Inpaint" },
              ].map((tool) => (
                <button
                  key={tool.title}
                  title={tool.title}
                  className={`w-8 h-8 rounded-md flex items-center justify-center text-sm transition-all ${
                    tool.active
                      ? "bg-[#d4a843]/12 border border-[--color-gold] text-[--color-gold]"
                      : "border border-[#d4a843]/20 text-[#7a7060] hover:bg-[#d4a843]/8 hover:border-[#d4a843]/30 hover:text-[--color-gold]"
                  }`}
                  style={{ background: tool.active ? "rgba(212,168,67,0.12)" : "rgba(255,255,255,0.04)" }}
                  onClick={() => toast.info(`${tool.title} tool coming soon`)}
                >
                  {tool.icon}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#7a7060]">{variations} Variations · {currentImageType.label} · {aspectRatio}</span>
              <button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !prompt.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold text-black transition-all disabled:opacity-50 btn-primary btn-sheen"
                style={{ background: "linear-gradient(135deg, #d4a843, #b8860b)" }}
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                ) : (
                  <>✦ GENERATE</>
                )}
              </button>
            </div>
          </div>

          {/* Canvas Grid */}
          <div className="flex-1 p-4" style={{ background: "#050508" }}>
            {generatedImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-0.5 h-full" style={{ minHeight: 400 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedCell(i)}
                    className={`relative rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedCell === i ? "ring-2 ring-[--color-gold]" : "ring-1 ring-white/6 hover:ring-[#d4a843]/30"
                    }`}
                    style={{ background: "#0d0d18", border: selectedCell === i ? "2px solid #d4a843" : "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {i === 0 && generatedImages[0] ? (
                      <img src={generatedImages[0]} alt="Generated" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-xs font-bold" style={{ minHeight: 180 }}>
                        VAR {String(i + 1).padStart(2, "0")}
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-2 text-[9px] text-white/50 tracking-widest">VAR {String(i + 1).padStart(2, "0")}</div>
                    <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
                      selectedCell === i ? "bg-[--color-gold] border-[--color-gold] text-black" : "border-white/30 bg-transparent"
                    }`}>
                      {selectedCell === i && "✓"}
                    </div>
                    {selectedCell === i && (
                      <div className="absolute top-1.5 left-2 bg-[#d4a843]/90 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-md">SELECTED</div>
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
                    className={`relative rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedCell === i ? "ring-2 ring-[--color-gold]" : "ring-1 ring-white/6 hover:ring-[#d4a843]/30"
                    }`}
                    style={{ background: "#0d0d18", border: selectedCell === i ? "2px solid #d4a843" : "1px solid rgba(255,255,255,0.06)", minHeight: 180 }}
                  >
                    {generateMutation.isPending && i === 0 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: "rgba(8,8,8,0.85)" }}>
                        <div className="w-8 h-8 rounded-full border-2 border-[#d4a843]/20 border-t-[#d4a843] animate-spin" />
                        <span className="text-[10px] text-[--color-gold] tracking-widest">GENERATING</span>
                        <span className="text-lg font-bold text-[--color-gold]">—</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs font-bold">
                        VAR {String(i + 1).padStart(2, "0")}
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-2 text-[9px] text-white/50 tracking-widest">VAR {String(i + 1).padStart(2, "0")}</div>
                    <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
                      selectedCell === i ? "bg-[--color-gold] border-[--color-gold] text-black" : "border-white/30 bg-transparent"
                    }`}>
                      {selectedCell === i && "✓"}
                    </div>
                    {selectedCell === i && (
                      <div className="absolute top-1.5 left-2 bg-[#d4a843]/90 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-md">SELECTED</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Canvas Bottom Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#d4a843]/20" style={{ background: "rgba(10,10,14,0.9)" }}>
            <span className="text-[11px] text-[#7a7060]">
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
                  className={`text-[10px] px-3 py-1.5 rounded-md border transition-all ${
                    btn.primary
                      ? "bg-[#d4a843]/10 border-[#d4a843]/40 text-[--color-gold] hover:bg-[#d4a843]/20"
                      : "border-[#d4a843]/20 text-[#7a7060] hover:border-[#d4a843]/30 hover:text-[--color-gold]"
                  }`}
                  style={{ background: btn.primary ? "rgba(212,168,67,0.1)" : "rgba(255,255,255,0.04)" }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <aside className="bg-black/60 backdrop-blur-sm overflow-y-auto p-3.5 flex flex-col gap-3.5" style={{ maxHeight: "calc(100vh - 64px)", position: "sticky", top: 64 }}>

          {/* Upgrade Preview */}
          <div className="rounded-xl overflow-hidden border border-[#d4a843]/25">
            <div className="px-3 py-2 text-[10px] tracking-[1.5px] text-[--color-gold] uppercase border-b border-[#d4a843]/15" style={{ background: "rgba(212,168,67,0.08)" }}>
              ✦ UPGRADE PREVIEW — SEE THE DIFFERENCE
            </div>
            <div className="flex border-b border-[#d4a843]/15">
              {(["original", "enhanced", "luminar"] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setUpgradeTier(tier)}
                  className={`flex-1 py-1.5 text-center text-[10px] border-b-2 transition-all ${
                    upgradeTier === tier
                      ? "text-[--color-gold] border-[--color-gold]"
                      : "text-[#7a7060] border-transparent hover:text-white/50"
                  }`}
                >
                  {tier === "original" ? "ORIGINAL" : tier === "enhanced" ? <>ENHANCED<br /><span className="text-[8px] text-green-400">+£2.99</span></> : <>WIZLUMINAR™<br /><span className="text-[8px] text-[--color-gold]">+£3.99</span></>}
                </button>
              ))}
            </div>
            <div className="p-2.5">
              <div className="text-[11px] text-green-400 mb-1.5">
                {upgradeTier === "original" ? "Included — no extra cost" : upgradeTier === "enhanced" ? "+£2.99 — Enhanced quality" : "+£3.99 — WizLuminar™ grade"}
              </div>
              <div className="flex flex-col gap-1 mb-2">
                {(upgradeTier === "original"
                  ? ["Standard AI generation", "1024×1024px base output", "Basic colour grading", "JPEG / PNG export"]
                  : upgradeTier === "enhanced"
                  ? ["Enhanced AI generation", "2048×2048px output", "Professional colour grading", "All export formats"]
                  : ["WizLuminar™ processing", "4K upscale output", "Cinematic LUT + HDR", "RAW / TIFF / PSD export"]
                ).map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-[10px] text-[#7a7060]">
                    <span className="text-[9px] text-[--color-gold]">→</span>{f}
                  </div>
                ))}
              </div>
              <div className="text-[9px] text-[#7a7060] mb-1.5 tracking-widest uppercase">Visual Quality Comparison</div>
              <div className="grid grid-cols-3 gap-1">
                {["Original", "Enhanced", "WizLuminar™"].map((label, i) => (
                  <div key={label} className={`rounded-md overflow-hidden relative aspect-square ${i === 2 ? "opacity-60" : ""}`} style={{ background: `linear-gradient(135deg, #1a0a2e ${i * 20}%, #2d1060, #0d0520)` }}>
                    {i === 2 && <div className="absolute inset-0 flex items-center justify-center text-lg" style={{ background: "rgba(0,0,0,0.6)" }}>🔒</div>}
                    <div className="absolute bottom-0 left-0 right-0 text-center py-0.5 text-[8px]" style={{ background: "rgba(0,0,0,0.7)", color: i === 2 ? "#d4a843" : "#7a7060" }}>{label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[9px] text-[#7a7060] p-1.5 rounded border border-[#d4a843]/15" style={{ background: "rgba(255,255,255,0.02)" }}>
                Preview only — no download until payment confirmed.
              </div>
            </div>
          </div>

          {/* WizLuminar CTA */}
          <div className="rounded-xl p-2.5 cursor-pointer transition-all hover:bg-[#d4a843]/10 border border-[#d4a843]/35" style={{ background: "linear-gradient(135deg, rgba(212,168,67,0.15), rgba(212,168,67,0.05))" }}>
            <div className="text-[11px] font-bold text-[--color-gold] mb-1">✦ WizLuminar™ Cinematic Grade</div>
            <div className="text-[10px] text-[#7a7060]">Professional colour science, HDR tone mapping, cinematic LUT, 4K upscale, noise reduction, detail enhancement</div>
            <div className="text-[13px] font-bold text-[--color-gold] mt-1.5">Add WizLuminar™ — +£3.99</div>
          </div>

          {/* Render Quality */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-[#7a7060] tracking-[2px] uppercase">Render Quality</span>
              <div className="flex-1 h-px bg-[#d4a843]/20" />
            </div>
            <div className="flex flex-col gap-1.5">
              {RENDER_QUALITY.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setRenderQuality(q.id)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg border transition-all ${
                    renderQuality === q.id
                      ? "border-[--color-gold] bg-[#d4a843]/6"
                      : "border-[#d4a843]/20 hover:border-[#d4a843]/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full border-2 ${renderQuality === q.id ? "bg-[--color-gold] border-[--color-gold]" : "border-[#7a7060]"}`} />
                    <div className="text-left">
                      <div className="text-xs font-semibold text-[#e8e0d0]">{q.label}</div>
                      <div className="text-[10px] text-[#7a7060]">{q.desc}</div>
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
              <span className="text-[9px] text-[#7a7060] tracking-[2px] uppercase">Export Format</span>
              <div className="flex-1 h-px bg-[#d4a843]/20" />
            </div>
            <div className="flex flex-wrap gap-1">
              {EXPORT_FORMATS.map((f) => (
                <button
                  key={f}
                  onClick={() => setExportFormat(f)}
                  className={`text-[10px] px-2.5 py-1 rounded-md border transition-all ${
                    exportFormat === f
                      ? "border-[--color-gold] bg-[#d4a843]/10 text-[--color-gold]"
                      : "border-[#d4a843]/20 text-[#7a7060] hover:border-[#d4a843]/30 hover:text-[--color-gold]"
                  }`}
                  style={{ background: exportFormat === f ? "rgba(212,168,67,0.1)" : "rgba(255,255,255,0.04)" }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Production Status */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] text-[#7a7060] tracking-[2px] uppercase">Production Status</span>
              <div className="flex-1 h-px bg-[#d4a843]/20" />
            </div>
            <div className="flex flex-col gap-1">
              {PRODUCTION_STATUS.map((s) => (
                <div key={s.label} className="flex items-center gap-2 py-1">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    s.status === "done" ? "bg-green-400" :
                    s.status === "active" ? "bg-[--color-gold] animate-pulse" :
                    "bg-white/10 border border-[#7a7060]"
                  }`} />
                  <span className={`text-[11px] ${
                    s.status === "done" ? "text-green-400" :
                    s.status === "active" ? "text-[--color-gold]" :
                    "text-[#7a7060]"
                  }`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !prompt.trim()}
            className="w-full py-3.5 rounded-xl font-extrabold text-sm text-black tracking-[2px] uppercase transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed btn-primary btn-sheen"
            style={{ background: "linear-gradient(135deg, #d4a843, #b8860b)", boxShadow: "0 4px 20px rgba(212,168,67,0.3)" }}
          >
            {generateMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />Generating…
              </span>
            ) : (
              "✦ CREATE IMAGE"
            )}
          </button>

          {/* Gallery (compact) */}
          {user && history && history.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] text-[#7a7060] tracking-[2px] uppercase">Recent Gallery</span>
                <div className="flex-1 h-px bg-[#d4a843]/20" />
                <span className="text-[9px] text-[#7a7060]">{history.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {history.slice(0, 8).map((img) => (
                  <div key={img.id} className="group relative aspect-square rounded-md overflow-hidden border border-white/6 cursor-pointer hover:border-[#d4a843]/40 transition-all">
                    <img src={img.imageUrl} alt={img.prompt} className="w-full h-full object-cover" onClick={() => setGeneratedImages([img.imageUrl])} />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(img.imageUrl); }} className="p-1 rounded bg-white/20 hover:bg-white/30">
                        <Download className="w-2.5 h-2.5 text-white" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: img.id }); }} className="p-1 rounded bg-red-500/20 hover:bg-red-500/40">
                        <Trash2 className="w-2.5 h-2.5 text-red-300" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!user && (
            <div className="text-center py-2">
              <button onClick={() => (window.location.href = getLoginUrl())} className="text-xs text-[--color-gold] hover:text-[#e0b85a] transition-colors font-medium">
                Sign in
              </button>
              <span className="text-[11px] text-[#7a7060]"> to generate images — 2 free credits on sign-up</span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
