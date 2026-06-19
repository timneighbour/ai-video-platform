import React from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";

const COMPARISON_ROWS = [
  { feature: "Character Lock™ — same face across all scenes", category: "Character Consistency", wizAI: true, competitor: false },
  { feature: "Costume & clothing consistency across scenes", category: "Character Consistency", wizAI: true, competitor: false },
  { feature: "Multi-character scenes with consistent identities", category: "Character Consistency", wizAI: true, competitor: false },
  { feature: "Lip sync AI — vocals matched to mouth movement", category: "Lip Sync", wizAI: true, competitor: true },
  { feature: "BPM-locked performance — movement synced to tempo", category: "Lip Sync", wizAI: true, competitor: false },
  { feature: "Vocal isolation before lip sync is applied", category: "Lip Sync", wizAI: true, competitor: false },
  { feature: "AI director — cinematic scene direction per lyric", category: "Production Quality", wizAI: true, competitor: false },
  { feature: "Instrument recognition and replication", category: "Production Quality", wizAI: true, competitor: false },
  { feature: "Voice-to-prompt creative direction", category: "Production Quality", wizAI: true, competitor: false },
  { feature: "AI music generation (WizSound™)", category: "Audio", wizAI: true, competitor: false },
  { feature: "Exact duration audio to the second", category: "Audio", wizAI: true, competitor: false },
  { feature: "Upload your own reference photo for character", category: "Workflow", wizAI: true, competitor: true },
  { feature: "Storyboard preview before rendering", category: "Workflow", wizAI: true, competitor: false },
  { feature: "Scene-level editing before final render", category: "Workflow", wizAI: true, competitor: false },
  { feature: "Free tier available — no credit card required", category: "Pricing", wizAI: true, competitor: true },
];

const CATEGORIES = ["Character Consistency", "Lip Sync", "Production Quality", "Audio", "Workflow", "Pricing"];

export default function WhyWizAI() {
  useSEO({
    title: "Why WIZ AI — vs One More Shot AI",
    path: "/why-wiz-ai",
    description:
      "WIZ AI keeps your character's face, costume and performance identical across every scene. Compare features, lip sync quality and pricing — and see why creators choose WIZ AI.",
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="pt-28 pb-16 px-6 text-center max-w-4xl mx-auto">
        <p className="text-xs tracking-[0.2em] text-amber-400/70 uppercase mb-4 font-medium">
          WIZ AI vs One More Shot AI
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
          Character consistency<br />
          <span className="text-amber-400">is the difference.</span>
        </h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8">
          One More Shot AI produces good lip sync. But when your character's face, hair, and
          costume change between scenes, the illusion breaks. WIZ AI's Character Lock™ solves this —
          keeping your artist identical from scene one to the final frame.
        </p>
        <Link href="/music-video/create">
          <button className="px-8 py-3 bg-amber-400 text-black font-semibold rounded-lg hover:bg-amber-300 transition-colors text-sm tracking-wide">
            Try WIZ AI Free
          </button>
        </Link>
      </section>

      <section className="py-16 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs tracking-[0.2em] text-amber-400/70 uppercase mb-3 font-medium">Exclusive to WIZ AI</p>
              <h2 className="text-3xl font-bold mb-4">What is Character Lock™?</h2>
              <p className="text-white/60 mb-4">
                Character Lock™ is WIZ AI's proprietary identity system. When you upload a reference
                photo of your artist, Character Lock™ extracts their facial geometry, hair style,
                skin tone, and clothing — then enforces that identity across every generated scene.
              </p>
              <p className="text-white/60 mb-4">
                Standard AI video generators re-sample character appearance on each scene generation.
                This means the same person can look subtly different in every shot — different jaw
                shape, different hair, different outfit — even when you specify the same prompt.
              </p>
              <p className="text-white/60">
                Character Lock™ prevents this at the model level. The result is a music video that
                looks like it was shot with a real actor, not assembled from separate AI generations.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { icon: "👤", title: "Face geometry locked", desc: "Same facial structure, proportions, and features in every scene." },
                { icon: "👗", title: "Costume consistency", desc: "Clothing, accessories, and styling match from opening to close." },
                { icon: "🎬", title: "Scene-to-scene continuity", desc: "Indoor stage, outdoor location, close-up — same character throughout." },
                { icon: "🎵", title: "Works with lip sync AI", desc: "Character Lock™ and lip sync run together — no trade-off." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm mb-1">{item.title}</p>
                    <p className="text-white/50 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs tracking-[0.2em] text-amber-400/70 uppercase mb-3 font-medium">Feature comparison</p>
            <h2 className="text-3xl font-bold">WIZ AI vs One More Shot AI</h2>
          </div>

          <div className="grid grid-cols-[1fr_120px_120px] gap-2 mb-2 px-4">
            <div />
            <div className="text-center text-sm font-semibold text-amber-400">WIZ AI</div>
            <div className="text-center text-sm font-semibold text-white/40">One More Shot</div>
          </div>

          {CATEGORIES.map((category) => {
            const rows = COMPARISON_ROWS.filter((r) => r.category === category);
            return (
              <div key={category} className="mb-6">
                <p className="text-xs tracking-[0.15em] text-white/30 uppercase mb-2 px-4 font-medium">{category}</p>
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  {rows.map((row, i) => (
                    <div
                      key={row.feature}
                      className={`grid grid-cols-[1fr_120px_120px] gap-2 items-center px-4 py-3 ${i < rows.length - 1 ? "border-b border-white/5" : ""}`}
                    >
                      <span className="text-sm text-white/70">{row.feature}</span>
                      <div className="flex justify-center">
                        {row.wizAI ? (
                          <span className="flex items-center gap-1 text-amber-400 text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Yes
                          </span>
                        ) : (
                          <span className="text-white/20 text-sm">—</span>
                        )}
                      </div>
                      <div className="flex justify-center">
                        {row.competitor ? (
                          <span className="flex items-center gap-1 text-white/50 text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Yes
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-white/20 text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            No
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <p className="text-xs text-white/25 text-center mt-4">
            Feature comparison based on publicly available information. Accurate as of June 2026.
          </p>
        </div>
      </section>

      <section className="py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">
            Ready to try the AI music video generator<br />
            <span className="text-amber-400">that keeps your character consistent?</span>
          </h2>
          <p className="text-white/50 mb-8">Free to start. No credit card required. Character Lock™ is included on every plan.</p>
          <Link href="/music-video/create">
            <button className="px-10 py-4 bg-amber-400 text-black font-bold rounded-lg hover:bg-amber-300 transition-colors">
              Start for Free
            </button>
          </Link>
        </div>
      </section>

      {/* SEO internal links */}
      <section className="py-8 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", marginBottom: "0.5rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Related guides</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
            {[
              { href: "/seo/ai-music-video-generator", label: "How to make an AI music video" },
              { href: "/seo/create-music-video-with-ai", label: "Create a music video with AI" },
              { href: "/seo/ai-music-video-generator-for-youtube", label: "AI music video for YouTube" },
              { href: "/seo/ai-lyric-video-generator", label: "AI lyric video generator" },
              { href: "/seo/ai-animated-music-video-maker", label: "AI animated music video maker" },
            ].map(({ href, label }) => (
              <a key={href} href={href} style={{ fontSize: "12px", color: "rgba(255,255,255,0.38)", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: "1px" }}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
