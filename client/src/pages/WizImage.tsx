import { useState } from "react";
import { mp } from "@/lib/mixpanel";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Sparkles, Download, Trash2, ImageIcon, Wand2, Loader2,
  Shuffle, ChevronRight, Star,
} from "@/lib/icons";

// ─── Style definitions with Unsplash preview images ──────────────────────────
const STYLES = [
  {
    id: "photorealistic",
    label: "Photorealistic",
    desc: "True-to-life detail",
    preview: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80",
    accent: "from-sky-500/30 to-blue-900/60",
    border: "border-sky-500/60",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    desc: "Film-grade colour",
    preview: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&q=80",
    accent: "from-amber-500/30 to-orange-900/60",
    border: "border-amber-500/60",
  },
  {
    id: "anime",
    label: "Anime",
    desc: "Japanese animation",
    preview: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80",
    accent: "from-pink-500/30 to-rose-900/60",
    border: "border-pink-500/60",
  },
  {
    id: "oil-painting",
    label: "Oil Painting",
    desc: "Classic fine art",
    preview: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80",
    accent: "from-yellow-600/30 to-amber-900/60",
    border: "border-yellow-500/60",
  },
  {
    id: "digital-art",
    label: "Digital Art",
    desc: "Concept art style",
    preview: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    accent: "from-violet-500/30 to-purple-900/60",
    border: "border-violet-500/60",
  },
  {
    id: "minimalist",
    label: "Minimalist",
    desc: "Clean & elegant",
    preview: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
    accent: "from-zinc-400/20 to-zinc-800/60",
    border: "border-zinc-400/40",
  },
  {
    id: "surreal",
    label: "Surreal",
    desc: "Dream-like worlds",
    preview: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80",
    accent: "from-teal-500/30 to-cyan-900/60",
    border: "border-teal-500/60",
  },
  {
    id: "watercolor",
    label: "Watercolor",
    desc: "Soft painted wash",
    preview: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&q=80",
    accent: "from-emerald-500/30 to-green-900/60",
    border: "border-emerald-500/60",
  },
];

// ─── Aspect ratio definitions ─────────────────────────────────────────────────
const ASPECT_RATIOS = [
  {
    id: "1:1",
    label: "Square",
    desc: "1:1",
    shape: "w-8 h-8",
    use: "Instagram",
  },
  {
    id: "16:9",
    label: "Landscape",
    desc: "16:9",
    shape: "w-10 h-[22px]",
    use: "YouTube",
  },
  {
    id: "9:16",
    label: "Portrait",
    desc: "9:16",
    shape: "w-[22px] h-10",
    use: "TikTok",
  },
  {
    id: "4:3",
    label: "Standard",
    desc: "4:3",
    shape: "w-10 h-[30px]",
    use: "Web",
  },
];

const EXAMPLE_PROMPTS = [
  "A futuristic city at night with neon lights reflecting on rain-slicked streets, ultra-detailed, 8K",
  "A lone astronaut standing on an alien planet with two moons rising above the horizon",
  "An enchanted forest with glowing mushrooms and fireflies at twilight, magical atmosphere",
  "A sleek sports car racing through a mountain pass at golden hour, cinematic motion blur",
  "A majestic dragon soaring above snow-capped mountain peaks, epic fantasy art",
  "A woman in a flowing red dress standing in a field of sunflowers at sunset, photorealistic",
];

export default function WizImage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string>("cinematic");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3">("1:1");
  const [generatedImage, setGeneratedImage] = useState<{ url: string; revisedPrompt?: string | null } | null>(null);

  const utils = trpc.useUtils();

  const { data: history, isLoading: historyLoading } = trpc.wizImage.getHistory.useQuery(
    { limit: 24 },
    { enabled: !!user }
  );

  const generateMutation = trpc.wizImage.generateImage.useMutation({
    onSuccess: (data) => {
      mp.buildCompleted("WizImage");
      setGeneratedImage({ url: data.imageUrl, revisedPrompt: data.revisedPrompt });
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
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    mp.projectCreated("WizImage");
    mp.buildStarted("WizImage");
    generateMutation.mutate({ prompt: prompt.trim(), style: selectedStyle, aspectRatio });
  };

  const handleDownload = (url: string, filename = "wiz-image.png") => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.click();
  };

  const activeStyle = STYLES.find((s) => s.id === selectedStyle) ?? STYLES[1];

  return (
    <div className="min-h-screen bg-[#080810] text-white">

      {/* ── Cinematic Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Ambient glow behind header */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-32 bg-[#b8892a]/10 blur-3xl rounded-full" />
          <div className="absolute top-0 right-1/4 w-64 h-24 bg-violet-500/8 blur-3xl rounded-full" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#c9a84c] via-[#b8892a] to-[#5a3a10] flex items-center justify-center shadow-lg shadow-[#b8892a]/20">
                <ImageIcon className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#080810] flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">WizImage™</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#b8892a]/20 text-[#c9a84c] border border-[#b8892a]/30 font-medium">
                  AI IMAGE
                </span>
              </div>
              <p className="text-[11px] text-white/40 mt-0.5">WIZ AI · World-class AI imagery</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#b8892a]/10 border border-[#b8892a]/20">
              <Star className="w-3 h-3 text-[#c9a84c] fill-[#c9a84c]" />
              <span className="text-xs text-[#c9a84c] font-medium">#1 Ranked Image AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout ──────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-6 lg:gap-8">

        {/* ── Left Panel — Controls ─────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Prompt area */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                  Describe your image
                </label>
                <button
                  onClick={() => setPrompt(EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)])}
                  className="flex items-center gap-1 text-[11px] text-[#c9a84c] hover:text-[#e0b85a] transition-colors"
                >
                  <Shuffle className="w-3 h-3" />
                  Try example
                </button>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A futuristic city at night with neon lights reflecting on rain-slicked streets…"
                className="bg-transparent border-0 border-b border-white/[0.08] rounded-none text-white placeholder:text-white/20 resize-none h-28 focus:ring-0 focus:border-[#b8892a]/40 px-0 text-sm leading-relaxed"
                maxLength={1000}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-white/20">{prompt.length}/1000</p>
                <div className="flex items-center gap-1 text-[10px] text-white/20">
                  <Sparkles className="w-3 h-3" />
                  AI-enhanced prompt
                </div>
              </div>
            </div>
          </div>

          {/* Art style selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">Art Style</label>
              <span className="text-[11px] text-[#c9a84c] font-medium">{activeStyle.label}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStyle(s.id)}
                  className={`group relative rounded-xl overflow-hidden aspect-square transition-all duration-200 ${
                    selectedStyle === s.id
                      ? `ring-2 ${s.border} ring-offset-1 ring-offset-[#080810] scale-[1.03]`
                      : "ring-1 ring-white/10 hover:ring-white/25 hover:scale-[1.02]"
                  }`}
                >
                  {/* Background image */}
                  <img
                    src={s.preview}
                    alt={s.label}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${s.accent} ${selectedStyle === s.id ? 'opacity-70' : 'opacity-80 group-hover:opacity-60'} transition-opacity`} />
                  {/* Active indicator */}
                  {selectedStyle === s.id && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#b8892a]" />
                    </div>
                  )}
                  {/* Label */}
                  <div className="absolute inset-x-0 bottom-0 p-1.5">
                    <p className="text-[9px] font-semibold text-white leading-tight text-center drop-shadow-sm">{s.label}</p>
                  </div>
                </button>
              ))}
            </div>
            {/* Style description */}
            <div className="mt-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[11px] text-white/50 text-center">{activeStyle.desc} — {activeStyle.label} style selected</p>
            </div>
          </div>

          {/* Aspect ratio selector */}
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-widest block mb-3">Aspect Ratio</label>
            <div className="grid grid-cols-4 gap-2">
              {ASPECT_RATIOS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setAspectRatio(r.id as typeof aspectRatio)}
                  className={`flex flex-col items-center gap-2.5 py-3.5 px-2 rounded-xl border transition-all duration-200 ${
                    aspectRatio === r.id
                      ? "border-[#b8892a]/60 bg-[#b8892a]/10 shadow-[0_0_12px_rgba(184,137,42,0.15)]"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  {/* Shape preview */}
                  <div className="flex items-center justify-center w-10 h-10">
                    <div
                      className={`${r.shape} rounded-sm ${
                        aspectRatio === r.id
                          ? "bg-[#b8892a]/80 shadow-[0_0_8px_rgba(184,137,42,0.4)]"
                          : "bg-white/20"
                      } transition-colors`}
                    />
                  </div>
                  <div className="text-center">
                    <p className={`text-[10px] font-bold ${aspectRatio === r.id ? "text-[#c9a84c]" : "text-white/50"}`}>{r.desc}</p>
                    <p className="text-[9px] text-white/25 mt-0.5">{r.use}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <div className="space-y-3">
            <button
              onClick={handleGenerate}
              disabled={generateMutation.isPending || !prompt.trim()}
              className={`w-full h-14 rounded-2xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2.5 relative overflow-hidden ${
                generateMutation.isPending || !prompt.trim()
                  ? "bg-white/[0.05] border border-white/10 text-white/30 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#c9a84c] via-[#b8892a] to-[#8a5e1a] text-white shadow-[0_4px_24px_rgba(184,137,42,0.35)] hover:shadow-[0_4px_32px_rgba(184,137,42,0.5)] hover:scale-[1.01] active:scale-[0.99]"
              }`}
            >
              {/* Shimmer effect */}
              {!generateMutation.isPending && prompt.trim() && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
              )}
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>WizImage is rendering…</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>Generate Image</span>
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-black/20 text-xs font-medium">2 Credits</span>
                </>
              )}
            </button>

            {!user ? (
              <p className="text-xs text-center text-white/30">
                <button
                  onClick={() => (window.location.href = getLoginUrl())}
                  className="text-[#c9a84c] hover:text-[#e0b85a] transition-colors font-medium"
                >
                  Sign in
                </button>{" "}
                to generate images — 2 free credits on sign-up
              </p>
            ) : (
              <p className="text-[11px] text-center text-white/20">
                Preview is free · Credits used only on final render
              </p>
            )}
          </div>
        </div>

        {/* ── Right Panel — Preview + Gallery ──────────────────────────────── */}
        <div className="space-y-6">

          {/* Generated image preview */}
          <div className="relative">
            <div
              className={`relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0d0d18] flex items-center justify-center ${
                aspectRatio === "16:9"
                  ? "aspect-video"
                  : aspectRatio === "9:16"
                  ? "aspect-[9/16] max-h-[560px]"
                  : aspectRatio === "4:3"
                  ? "aspect-[4/3]"
                  : "aspect-square"
              }`}
            >
              {generateMutation.isPending ? (
                <div className="flex flex-col items-center gap-5 text-white/40">
                  {/* Animated spinner */}
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-2 border-[#b8892a]/20 border-t-[#b8892a] animate-spin" />
                    <div className="absolute inset-2 rounded-full border-2 border-violet-500/20 border-b-violet-500 animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-[#c9a84c]" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-white/60">WizImage is rendering…</p>
                    <p className="text-xs text-white/25">Usually 5–15 seconds</p>
                  </div>
                  {/* Progress bar */}
                  <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#b8892a] to-violet-500 rounded-full animate-[progress_3s_ease-in-out_infinite]" />
                  </div>
                </div>
              ) : generatedImage ? (
                <>
                  <img
                    src={generatedImage.url}
                    alt="Generated"
                    className="w-full h-full object-cover"
                  />
                  {/* Action buttons */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={() => handleDownload(generatedImage.url)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-medium hover:bg-black/80 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                  {/* Style badge */}
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] px-2 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/70 font-medium">
                      {activeStyle.label}
                    </span>
                  </div>
                  {/* Revised prompt overlay */}
                  {generatedImage.revisedPrompt && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-8">
                      <p className="text-[11px] text-white/50 line-clamp-2 leading-relaxed">{generatedImage.revisedPrompt}</p>
                    </div>
                  )}
                </>
              ) : (
                /* Empty state with ambient imagery */
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  {/* Ambient grid pattern */}
                  <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                      backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                      backgroundSize: "40px 40px",
                    }}
                  />
                  {/* Center glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#b8892a]/5 rounded-full blur-3xl" />
                  <div className="relative flex flex-col items-center gap-3 text-center px-8">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-1">
                      <ImageIcon className="w-7 h-7 text-white/20" />
                    </div>
                    <p className="text-sm font-medium text-white/30">Your image will appear here</p>
                    <p className="text-xs text-white/15 max-w-[200px] leading-relaxed">
                      Describe your vision above and click Generate Image
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#c9a84c]/60">
                      <ChevronRight className="w-3 h-3" />
                      <span>2 free credits on sign-up</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gallery */}
          {user && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Your Gallery</h3>
                {history && history.length > 0 && (
                  <span className="text-[11px] text-white/30">{history.length} image{history.length !== 1 ? "s" : ""}</span>
                )}
              </div>
              {historyLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-white/[0.04] animate-pulse" />
                  ))}
                </div>
              ) : history && history.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {history.map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-white/[0.06] cursor-pointer hover:border-[#b8892a]/40 transition-all duration-200 hover:scale-[1.02]"
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.prompt}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onClick={() => setGeneratedImage({ url: img.imageUrl })}
                      />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                          <p className="text-[9px] text-white/70 line-clamp-1 flex-1 mr-1">{img.prompt}</p>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownload(img.imageUrl); }}
                              className="p-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                            >
                              <Download className="w-3 h-3 text-white" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: img.id }); }}
                              className="p-1 rounded-md bg-red-500/20 hover:bg-red-500/40 transition-colors backdrop-blur-sm"
                            >
                              <Trash2 className="w-3 h-3 text-red-300" />
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Style badge */}
                      {img.style && (
                        <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[8px] bg-black/70 text-white/70 px-1.5 py-0.5 rounded-full backdrop-blur-sm font-medium">
                            {img.style}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
                    <ImageIcon className="w-5 h-5 text-white/20" />
                  </div>
                  <p className="text-sm text-white/30 font-medium">No images yet</p>
                  <p className="text-xs text-white/15 mt-1">Generate your first image above</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shimmer + progress keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 95%; }
        }
      `}</style>
    </div>
  );
}
