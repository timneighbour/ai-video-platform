/**
 * QuickStartScreen — Instant First-Win Experience
 *
 * Shown after the user selects a studio in Onboarding (step 2).
 * Presents a pre-filled demo prompt for the chosen studio and lets
 * the user launch it with one click — no typing required.
 *
 * The "Generate Demo Project" button navigates to the studio with
 * ?demo=1&prompt=<encoded> so the studio pre-fills the prompt on mount.
 */
import React, { useState } from "react";
import { Sparkles, ArrowRight, ChevronLeft, Zap, Clock, Gift } from "@/lib/icons";

// ── Per-studio demo prompts ───────────────────────────────────────────────────
export interface StudioOption {
  href: string;
  title: string;
  subtitle: string;
  accentColor: string;
  glowColor: string;
  bg: string;
  demoPrompt: string;
  demoLabel: string;   // short human-readable label shown in the prompt card
  promptField: string; // which field gets pre-filled (for user info)
}

export const STUDIO_DEMOS: Record<string, StudioOption> = {
  "/music-video/create": {
    href: "/music-video/create",
    title: "WizVideo™",
    subtitle: "AI Music Video Director",
    accentColor: "#f59e0b",
    glowColor: "rgba(245,158,11,0.25)",
    bg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-cinematic-1-7fzYSK4QF3mixYeH3YCQwJ.webp",
    demoPrompt: "A cinematic music video for an epic orchestral track — sweeping mountain landscapes, golden hour light, slow motion drone shots, dramatic clouds",
    demoLabel: "Epic Cinematic Music Video",
    promptField: "Visual Theme",
  },
  "/text-to-video": {
    href: "/text-to-video",
    title: "WizScript™",
    subtitle: "AI Screenplay Studio",
    accentColor: "#7c3aed",
    glowColor: "rgba(124,58,237,0.25)",
    bg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-neon-noir-1-GDpPcEYGEwEHgfbURRVa2k.webp",
    demoPrompt: "A lone astronaut walks across a red Martian landscape at golden hour, cinematic slow motion, dust swirling in the wind, vast silence",
    demoLabel: "Cinematic Sci-Fi Short",
    promptField: "Video Prompt",
  },
  "/wiz-shorts": {
    href: "/wiz-shorts",
    title: "WizShorts™",
    subtitle: "AI Shorts Creator",
    accentColor: "#d946ef",
    glowColor: "rgba(217,70,239,0.25)",
    bg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-abstract-1-ZjbMsSCt6wFuq7NBMAyxHR.webp",
    demoPrompt: "5 things nobody tells you about starting a YouTube channel — the real secrets behind going viral",
    demoLabel: "Viral YouTube Short",
    promptField: "Video Topic",
  },
  "/kids-video": {
    href: "/kids-video",
    title: "WizAnimate™",
    subtitle: "AI Character Animation Studio",
    accentColor: "#7c5cbf",
    glowColor: "rgba(124,92,191,0.25)",
    bg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-studio-ghibli-Pu3nPV5TyiR4mj8mrV6Z3h.webp",
    demoPrompt: "A young girl discovers a magical forest where animals can talk. She befriends a wise old owl who guides her on a journey to find a lost star. Warm, whimsical, Studio Ghibli-inspired atmosphere.",
    demoLabel: "Magical Adventure Animation",
    promptField: "Story Brief",
  },
  "/music-creator": {
    href: "/music-creator",
    title: "WizAudio™",
    subtitle: "AI Music Studio",
    accentColor: "#22c55e",
    glowColor: "rgba(34,197,94,0.25)",
    bg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-vintage-1-NfTaSxo6s5jch2UiSEYkKJ.webp",
    demoPrompt: "An uplifting cinematic orchestral track with swelling strings, epic brass, and a triumphant finale — perfect for a movie trailer",
    demoLabel: "Epic Orchestral Track",
    promptField: "Music Description",
  },
  "/wiz-image": {
    href: "/wiz-image",
    title: "WizImage™",
    subtitle: "AI Visual Creator",
    accentColor: "#6366f1",
    glowColor: "rgba(99,102,241,0.25)",
    bg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-cinematic-1-7fzYSK4QF3mixYeH3YCQwJ.webp",
    demoPrompt: "A photorealistic portrait of a futuristic city at night, neon reflections on wet cobblestones, cinematic depth of field, golden hour glow on the horizon",
    demoLabel: "Cinematic City Portrait",
    promptField: "Image Prompt",
  },
  "/wizscore": {
    href: "/wizscore",
    title: "WizScore™",
    subtitle: "AI Video-to-Music Engine",
    accentColor: "#e11d48",
    glowColor: "rgba(225,29,72,0.25)",
    bg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-documentary-1-27gSFotXB4DE92dN47HiDu.webp",
    demoPrompt: "Upload any video and WizScore™ generates a perfectly matched original soundtrack",
    demoLabel: "AI Video Soundtrack",
    promptField: "Video Upload",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface QuickStartScreenProps {
  studio: StudioOption;
  onBack: () => void;
}

export function QuickStartScreen({ studio, onBack }: QuickStartScreenProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(studio.demoPrompt);

  const handleLaunch = () => {
    setIsLaunching(true);
    const url = `${studio.href}?demo=1&prompt=${encodeURIComponent(editedPrompt)}`;
    // Small delay for the launch animation to play
    setTimeout(() => {
      window.location.href = url;
    }, 600);
  };

  const handleSkip = () => {
    window.location.href = studio.href;
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden relative flex flex-col items-center justify-center px-4 py-16">
      {/* ── Cinematic background ─────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Studio background image with heavy vignette */}
        <img
          src={studio.bg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.08]"
          style={{ filter: "blur(2px)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        {/* Accent orb behind the card */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.07]"
          style={{ background: `radial-gradient(circle, ${studio.accentColor} 0%, transparent 70%)` }}
        />
        {/* Scan line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>

      {/* ── Back button ──────────────────────────────────────────────────── */}
      <div className="fixed top-6 left-6 z-50">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/80 hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-300 group backdrop-blur-sm"
        >
          <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-300" />
          <span className="text-xs font-medium tracking-wide">Back</span>
        </button>
      </div>

      {/* ── Step indicator ───────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center gap-3 mb-10">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[10px] font-bold text-white/40">1</div>
          <div className="w-16 h-px bg-gradient-to-r from-primary/60 to-primary/60" />
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${studio.accentColor}, ${studio.accentColor}cc)` }}
          >2</div>
        </div>
        <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-primary/70 ml-2">Your first creation</span>
      </div>

      {/* ── Main card ────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-2xl">
        {/* Studio badge */}
        <div className="flex items-center justify-center mb-6">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold tracking-wide"
            style={{
              background: `${studio.glowColor}`,
              borderColor: `${studio.accentColor}40`,
              color: studio.accentColor,
            }}
          >
            <Zap className="w-3 h-3" />
            {studio.title} · {studio.subtitle}
          </div>
        </div>

        {/* Headline */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.05] mb-4">
            Let's create your{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, #e8c878 0%, #b8892a 40%, #f2dfa0 70%, #c4a464 100%)` }}
            >
              first video
            </span>
          </h1>
          <p className="text-base text-white/40 font-light max-w-md mx-auto leading-relaxed">
            We've pre-filled a demo prompt for you. Hit generate and see WIZ AI in action — no typing required.
          </p>
        </div>

        {/* Prompt card */}
        <div
          className="relative rounded-2xl border p-6 mb-6"
          style={{
            background: "rgba(255,255,255,0.025)",
            borderColor: `${studio.accentColor}30`,
            boxShadow: `0 0 40px ${studio.glowColor}`,
          }}
        >
          {/* Label */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/30">
              {studio.promptField} — {studio.demoLabel}
            </span>
            <span
              className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full"
              style={{ background: `${studio.glowColor}`, color: studio.accentColor }}
            >
              Pre-filled
            </span>
          </div>

          {/* Editable prompt textarea */}
          <textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            rows={3}
            className="w-full bg-transparent text-white/80 text-sm leading-relaxed resize-none outline-none placeholder-white/20 font-light"
            style={{ caretColor: studio.accentColor }}
          />

          {/* Edit hint */}
          <p className="text-[10px] text-white/20 mt-2">
            Feel free to edit the prompt above, or just hit generate to see the demo.
          </p>
        </div>

        {/* What happens next */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Sparkles, label: "AI builds your storyboard", sub: "Instant" },
            { icon: Clock,    label: "Preview in seconds",        sub: "No wait" },
            { icon: Gift,     label: "Free to try",               sub: "No card needed" },
          ].map(({ icon: Icon, label, sub }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] text-center"
            >
              <Icon className="w-4 h-4 text-white/30" />
              <span className="text-[11px] text-white/50 font-medium leading-tight">{label}</span>
              <span className="text-[10px] text-white/25">{sub}</span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleLaunch}
            disabled={isLaunching || !editedPrompt.trim()}
            className="w-full flex items-center justify-center gap-3 py-4 px-8 rounded-2xl font-bold text-base tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isLaunching
                ? `linear-gradient(135deg, ${studio.accentColor}99, ${studio.accentColor}66)`
                : `linear-gradient(135deg, ${studio.accentColor}, ${studio.accentColor}cc)`,
              boxShadow: isLaunching ? "none" : `0 8px 32px ${studio.glowColor}`,
              color: "#fff",
            }}
          >
            {isLaunching ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Launching {studio.title}…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Demo Project</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            onClick={handleSkip}
            className="text-xs text-white/25 hover:text-white/50 transition-colors duration-200 py-1"
          >
            Skip — explore {studio.title} on my own
          </button>
        </div>
      </div>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center gap-5 mt-12 text-[10px] text-white/20 font-medium tracking-wide">
        {["No credit card required", "You own your content", "Cancel anytime"].map((item, i) => (
          <React.Fragment key={item}>
            {i > 0 && <span className="w-1 h-1 rounded-full bg-white/15" />}
            <span>{item}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
