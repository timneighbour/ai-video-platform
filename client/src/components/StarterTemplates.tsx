/**
 * StarterTemplates — Per-studio template gallery
 *
 * Shows 4 template cards at the top of each studio's blank/setup state.
 * Each card has a preview image, label, category badge, and one-click start.
 * Clicking a template pre-fills the studio's prompt field.
 *
 * Usage:
 *   <StarterTemplates studio="wizvideo" onSelect={(prompt) => setThemePrompt(prompt)} />
 */
import React, { useState } from "react";
import { Sparkles, ChevronRight, Zap } from "lucide-react";

// ── CDN base ──────────────────────────────────────────────────────────────────
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";

// ── Template definitions ──────────────────────────────────────────────────────
export interface StarterTemplate {
  id: string;
  label: string;
  category: string;
  prompt: string;
  preview: string;   // image URL
  accent: string;    // hex accent colour
}

export const STUDIO_TEMPLATES: Record<string, StarterTemplate[]> = {
  wizvideo: [
    {
      id: "cinematic-trailer",
      label: "Cinematic Trailer",
      category: "Epic",
      prompt: "A sweeping cinematic trailer — dramatic orchestral music, golden hour landscapes, slow motion hero shots, lens flares, epic scale",
      preview: `${CDN}/style-cinematic-1-7fzYSK4QF3mixYeH3YCQwJ.webp`,
      accent: "#b8892a",
    },
    {
      id: "music-video",
      label: "Music Video",
      category: "Pop",
      prompt: "A vibrant pop music video — neon city lights, dynamic dance sequences, fast cuts, bold colour grading, electric atmosphere",
      preview: `${CDN}/style-neon-noir-1-GDpPcEYGEwEHgfbURRVa2k.webp`,
      accent: "#d946ef",
    },
    {
      id: "documentary",
      label: "Documentary Style",
      category: "Real",
      prompt: "A cinematic documentary — handheld camera, natural light, intimate close-ups, authentic storytelling, muted colour palette",
      preview: `${CDN}/style-documentary-1-27gSFotXB4DE92dN47HiDu.webp`,
      accent: "#6b7280",
    },
    {
      id: "epic-fantasy",
      label: "Epic Fantasy",
      category: "Fantasy",
      prompt: "An epic fantasy music video — ancient forests, magical creatures, sweeping orchestral score, mystical lighting, cinematic grandeur",
      preview: `${CDN}/style-epic-fantasy-1-4xZQHj6htBWh5fPP25HQQf.webp`,
      accent: "#7c3aed",
    },
  ],
  wizshorts: [
    {
      id: "viral-tips",
      label: "Viral Tips Video",
      category: "Education",
      prompt: "5 things nobody tells you about starting a YouTube channel — the real secrets behind going viral",
      preview: `${CDN}/style-abstract-1-ZjbMsSCt6wFuq7NBMAyxHR.webp`,
      accent: "#d946ef",
    },
    {
      id: "product-showcase",
      label: "Product Showcase",
      category: "Brand",
      prompt: "A 60-second product showcase for a premium skincare brand — clean aesthetic, soft lighting, luxury feel, before and after",
      preview: `${CDN}/style-realistic-1-3PQ9beTsYUCXpz7YnqEHJd.webp`,
      accent: "#e11d48",
    },
    {
      id: "motivation",
      label: "Motivation Reel",
      category: "Lifestyle",
      prompt: "A high-energy motivational reel — sunrise workouts, city hustle, success mindset, powerful quotes, cinematic b-roll",
      preview: `${CDN}/style-cinematic-2-h73cYMBR7EECiKvo2X9uWr.webp`,
      accent: "#f59e0b",
    },
    {
      id: "travel",
      label: "Travel Vlog Short",
      category: "Travel",
      prompt: "A 30-second travel vlog short for Tokyo — neon streets, street food, temples at dawn, fast cuts, ambient city sounds",
      preview: `${CDN}/style-cinematic-1-7fzYSK4QF3mixYeH3YCQwJ.webp`,
      accent: "#06b6d4",
    },
  ],
  wizscript: [
    {
      id: "sci-fi",
      label: "Sci-Fi Short",
      category: "Sci-Fi",
      prompt: "A lone astronaut walks across a red Martian landscape at golden hour, cinematic slow motion, dust swirling in the wind, vast silence",
      preview: `${CDN}/style-cinematic-1-7fzYSK4QF3mixYeH3YCQwJ.webp`,
      accent: "#06b6d4",
    },
    {
      id: "neon-noir",
      label: "Neon Noir",
      category: "Noir",
      prompt: "A rain-soaked neon-lit alley at midnight — a detective in a trench coat, reflections on wet cobblestones, jazz saxophone, cinematic depth of field",
      preview: `${CDN}/style-neon-noir-1-GDpPcEYGEwEHgfbURRVa2k.webp`,
      accent: "#e11d48",
    },
    {
      id: "nature",
      label: "Nature Documentary",
      category: "Nature",
      prompt: "A cinematic nature documentary about the Amazon rainforest — lush canopy, exotic wildlife, morning mist, David Attenborough narration style",
      preview: `${CDN}/style-documentary-1-27gSFotXB4DE92dN47HiDu.webp`,
      accent: "#22c55e",
    },
    {
      id: "fantasy",
      label: "Epic Fantasy",
      category: "Fantasy",
      prompt: "A dragon soars over a medieval kingdom at dusk — castle spires, golden light, sweeping orchestral score, cinematic aerial shots",
      preview: `${CDN}/style-epic-fantasy-1-4xZQHj6htBWh5fPP25HQQf.webp`,
      accent: "#7c3aed",
    },
  ],
  wizanimate: [
    {
      id: "magical-adventure",
      label: "Magical Adventure",
      category: "Ghibli",
      prompt: "A young girl discovers a magical forest where animals can talk. She befriends a wise old owl who guides her on a journey to find a lost star. Warm, whimsical, Studio Ghibli-inspired atmosphere.",
      preview: `${CDN}/style-studio-ghibli-Pu3nPV5TyiR4mj8mrV6Z3h.webp`,
      accent: "#7c5cbf",
    },
    {
      id: "superhero",
      label: "Superhero Origin",
      category: "Action",
      prompt: "A teenage boy discovers he has the power to control lightning. His first day mastering his powers — Pixar 3D style, vibrant colours, action-packed sequences.",
      preview: `${CDN}/style-pixar-1-63hx7LosqShdkEWUgxNme8.webp`,
      accent: "#f59e0b",
    },
    {
      id: "space-explorer",
      label: "Space Explorer",
      category: "Sci-Fi",
      prompt: "A brave young astronaut and her robot companion explore an alien planet filled with glowing plants and friendly creatures. Anime style, vibrant, wonder-filled.",
      preview: `${CDN}/style-anime-1-V8cGaKNXBvMPgNtyuk2xCr.webp`,
      accent: "#06b6d4",
    },
    {
      id: "ocean-adventure",
      label: "Ocean Adventure",
      category: "Adventure",
      prompt: "A curious mermaid discovers an underwater city of light. She must solve an ancient puzzle to restore the ocean's magic. Watercolour style, soft pastels, dreamy atmosphere.",
      preview: `${CDN}/style-abstract-1-ZjbMsSCt6wFuq7NBMAyxHR.webp`,
      accent: "#22c55e",
    },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

interface StarterTemplatesProps {
  studio: keyof typeof STUDIO_TEMPLATES;
  onSelect: (prompt: string) => void;
  accentColor?: string;
  className?: string;
}

export function StarterTemplates({ studio, onSelect, accentColor = "#b8892a", className = "" }: StarterTemplatesProps) {
  const templates = STUDIO_TEMPLATES[studio] ?? [];
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (templates.length === 0) return null;

  return (
    <div className={`w-full ${className}`}>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
        <span className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: `${accentColor}99` }}>
          Start with a template
        </span>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {templates.map((tpl) => {
          const isHovered = hoveredId === tpl.id;
          return (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl.prompt)}
              onMouseEnter={() => setHoveredId(tpl.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group relative rounded-xl overflow-hidden text-left transition-all duration-300 focus:outline-none"
              style={{
                aspectRatio: "16/9",
                boxShadow: isHovered
                  ? `0 0 0 1.5px ${tpl.accent}80, 0 8px 24px ${tpl.accent}30`
                  : "0 0 0 1px rgba(255,255,255,0.06)",
                transform: isHovered ? "translateY(-2px)" : "translateY(0)",
              }}
            >
              {/* Preview image */}
              <img
                src={tpl.preview}
                alt={tpl.label}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
                style={{ transform: isHovered ? "scale(1.06)" : "scale(1)" }}
              />
              {/* Dark overlay */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.15) 100%)`,
                  opacity: isHovered ? 0.95 : 0.8,
                }}
              />
              {/* Accent overlay on hover */}
              {isHovered && (
                <div
                  className="absolute inset-0 opacity-[0.12]"
                  style={{ background: `radial-gradient(circle at 50% 100%, ${tpl.accent}, transparent 70%)` }}
                />
              )}

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-between p-2.5">
                {/* Category badge */}
                <div className="self-start">
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wide uppercase"
                    style={{
                      background: `${tpl.accent}25`,
                      border: `1px solid ${tpl.accent}40`,
                      color: tpl.accent,
                    }}
                  >
                    {tpl.category}
                  </span>
                </div>

                {/* Label + CTA */}
                <div>
                  <p className="text-white text-[11px] font-bold leading-tight mb-1.5">{tpl.label}</p>
                  <div
                    className="flex items-center gap-1 transition-all duration-200"
                    style={{ opacity: isHovered ? 1 : 0.5 }}
                  >
                    <Zap className="w-2.5 h-2.5" style={{ color: tpl.accent }} />
                    <span className="text-[9px] font-semibold" style={{ color: tpl.accent }}>
                      Use template
                    </span>
                    <ChevronRight className="w-2.5 h-2.5" style={{ color: tpl.accent }} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mt-4 mb-1">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-[10px] text-white/20 font-medium">or describe your own idea below</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>
    </div>
  );
}
