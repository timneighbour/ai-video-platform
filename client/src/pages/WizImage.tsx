import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Download, Trash2, ImageIcon, Wand2, Loader2 } from "lucide-react";

const STYLES = [
  { id: "photorealistic", label: "Photorealistic", emoji: "" },
  { id: "cinematic", label: "Cinematic", emoji: "" },
  { id: "anime", label: "Anime", emoji: "" },
  { id: "oil-painting", label: "Oil Painting", emoji: "" },
  { id: "digital-art", label: "Digital Art", emoji: "💻" },
  { id: "minimalist", label: "Minimalist", emoji: "◻" },
  { id: "surreal", label: "Surreal", emoji: "🌀" },
  { id: "watercolor", label: "Watercolor", emoji: "💧" },
];

const ASPECT_RATIOS = [
  { id: "1:1", label: "Square", desc: "1:1", icon: "⬛" },
  { id: "16:9", label: "Landscape", desc: "16:9", icon: "▬" },
  { id: "9:16", label: "Portrait", desc: "9:16", icon: "▮" },
  { id: "4:3", label: "Standard", desc: "4:3", icon: "▭" },
];

const EXAMPLE_PROMPTS = [
  "A futuristic city at night with neon lights reflecting on rain-slicked streets",
  "A lone astronaut standing on an alien planet with two moons rising",
  "An enchanted forest with glowing mushrooms and fireflies at twilight",
  "A sleek sports car racing through a mountain pass at golden hour",
  "A majestic dragon soaring above snow-capped mountain peaks",
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
      setGeneratedImage({ url: data.imageUrl, revisedPrompt: data.revisedPrompt });
      toast.success(`Image generated! (${data.creditsUsed} credits used)`);
      utils.wizImage.getHistory.invalidate();
    },
    onError: (err) => {
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
    generateMutation.mutate({ prompt: prompt.trim(), style: selectedStyle, aspectRatio });
  };

  const handleDownload = (url: string, filename = "wiz-image.png") => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0d0d14]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b8892a] to-[#4a3010] flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">WizImage</h1>
              <p className="text-xs text-white/50">WIZ AI · World-class AI imagery</p>
            </div>
          </div>
          <Badge variant="outline" className="border-[--color-gold]/30 text-[--color-gold] text-xs">
            #1 Ranked Image AI
          </Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8">
        {/* Left — Controls */}
        <div className="space-y-6">
          {/* Prompt */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70">Describe your image</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A futuristic city at night with neon lights..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none h-28 focus:border-[--color-gold]/30 focus:ring-violet-500/20"
              maxLength={1000}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/30">{prompt.length}/1000</p>
              <button
                onClick={() => setPrompt(EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)])}
                className="text-xs text-[--color-gold] hover:text-[--color-gold] transition-colors"
              >
                Try example
              </button>
            </div>
          </div>

          {/* Style */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-white/70">Art style</label>
            <div className="grid grid-cols-4 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStyle(s.id)}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    selectedStyle === s.id
                      ? "border-violet-500 bg-[--color-gold]/15 text-white"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="text-lg mb-1">{s.emoji}</div>
                  <div className="text-[10px] font-medium leading-tight">{s.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-white/70">Aspect ratio</label>
            <div className="grid grid-cols-4 gap-2">
              {ASPECT_RATIOS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setAspectRatio(r.id as typeof aspectRatio)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    aspectRatio === r.id
                      ? "border-violet-500 bg-[--color-gold]/15 text-white"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="text-lg mb-1">{r.icon}</div>
                  <div className="text-[10px] font-medium">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !prompt.trim()}
            className="w-full h-12 bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#b8892a] hover:to-[#4a3010] text-white font-semibold text-base rounded-xl border-0 transition-all"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating with Grok Aurora...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Generate Image · 2 Credits
              </>
            )}
          </Button>

          {!user && (
            <p className="text-xs text-center text-white/40">
              <button onClick={() => (window.location.href = getLoginUrl())} className="text-[--color-gold] hover:underline">
                Sign in
              </button>{" "}
              to generate images
            </p>
          )}
        </div>

        {/* Right — Preview + Gallery */}
        <div className="space-y-6">
          {/* Current Generation */}
          <div
            className={`relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center ${
              aspectRatio === "16:9" ? "aspect-video" : aspectRatio === "9:16" ? "aspect-[9/16] max-h-[600px]" : "aspect-square"
            }`}
          >
            {generateMutation.isPending ? (
              <div className="flex flex-col items-center gap-4 text-white/50">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-[--color-gold]/30 border-t-violet-500 animate-spin" />
                  <Sparkles className="w-6 h-6 text-[--color-gold] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-sm">Grok Aurora is creating your image...</p>
                <p className="text-xs text-white/30">Usually takes 5–15 seconds</p>
              </div>
            ) : generatedImage ? (
              <>
                <img
                  src={generatedImage.url}
                  alt="Generated"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <button
                    onClick={() => handleDownload(generatedImage.url)}
                    className="p-2 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:bg-black/80 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                {generatedImage.revisedPrompt && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-xs text-white/60 line-clamp-2">{generatedImage.revisedPrompt}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-white/30">
                <ImageIcon className="w-12 h-12" />
                <p className="text-sm">Your generated image will appear here</p>
              </div>
            )}
          </div>

          {/* Gallery */}
          {user && (
            <div>
              <h3 className="text-sm font-medium text-white/70 mb-3">Your gallery</h3>
              {historyLoading ? (
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : history && history.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {history.map((img) => (
                    <div key={img.id} className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 cursor-pointer">
                      <img
                        src={img.imageUrl}
                        alt={img.prompt}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onClick={() => setGeneratedImage({ url: img.imageUrl })}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDownload(img.imageUrl)}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate({ id: img.id })}
                          className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-300" />
                        </button>
                      </div>
                      {img.style && (
                        <div className="absolute top-1.5 left-1.5">
                          <span className="text-[9px] bg-black/60 text-white/70 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                            {img.style}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-white/30">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No images yet — generate your first one above</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
