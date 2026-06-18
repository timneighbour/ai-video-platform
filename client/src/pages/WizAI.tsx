import { Link } from "wouter";
import { useEffect, useRef } from "react";

/* ── WIZ AI — Parent Brand Homepage ─────────────────────────────────────────
   Premium, minimal, cinematic. Apple / Netflix feel.
   Deep black / charcoal background, subtle violet / blue accents.
   ────────────────────────────────────────────────────────────────────────── */

const PRODUCTS = [
  {
    name: "WIZ AI",
    tagline: "Turn ideas into cinematic AI videos.",
    description: "Full music videos, animations, and visual stories — generated from a single prompt.",
    href: "/",
    gradient: "from-violet-500 to-purple-600",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth={1.5}>
        <path d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "WizSound",
    tagline: "Immersive audio that adds depth and impact.",
    description: "Spatial audio mastering — cinema-grade enhancement for every build.",
    href: "/products/wizsound",
    gradient: "from-indigo-500 to-blue-600",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth={1.5}>
        <path d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "WizPilot",
    tagline: "Automation for the creative workflow.",
    description: "AI-guided creation — describe your vision and let WizPilot orchestrate the full pipeline.",
    href: "/products/wizpilot",
    gradient: "from-fuchsia-500 to-pink-600",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth={1.5}>
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "WizGenesis",
    tagline: "The intelligence engine that understands your vision.",
    description: "Character consistency, scene accuracy, and prompt enhancement — the brain behind every build.",
    href: "/products/wizgenesis",
    gradient: "from-amber-500 to-orange-600",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Describe the idea", description: "Tell the AI what you want to create — a music video, animation, cinematic short, or anything else." },
  { step: "02", title: "AI builds the foundation", description: "The platform generates a full storyboard with scenes, characters, and creative direction." },
  { step: "03", title: "Refine, render and export", description: "Preview every scene, adjust the details, then render in HD or 4K and download." },
];

const WHY_WIZ = [
  { title: "No editing experience needed", description: "Describe your vision in plain language. The AI handles every technical detail." },
  { title: "Faster creative output", description: "Go from idea to finished video in minutes, not days or weeks." },
  { title: "One ecosystem", description: "Video, audio, animation, and distribution — all connected in a single platform." },
  { title: "Built for creators", description: "Designed for musicians, storytellers, YouTubers, and brands who want professional results." },
];

/* Subtle animated gradient orbs for background depth */
function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[--color-gold]/15 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute top-2/3 right-0 w-80 h-80 bg-blue-600/6 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: "12s", animationDelay: "2s" }} />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[--color-gold]/15 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: "10s", animationDelay: "4s" }} />
    </div>
  );
}

/* Fade-in on scroll observer */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("opacity-100", "translate-y-0");
          el.classList.remove("opacity-0", "translate-y-8");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function FadeSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useFadeIn();
  return (
    <div ref={ref} className={`opacity-0 translate-y-8 transition-all duration-700 ease-out ${className}`}>
      {children}
    </div>
  );
}

export default function WizAI() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white antialiased">
      <BackgroundOrbs />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="https://www.wiz-ai.io" className="text-xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Wiz</span>
            <span className="text-white/90"> AI</span>
          </a>
          <div className="flex items-center gap-8">
            <Link href="/" className="text-sm text-white/60 hover:text-white transition-colors">WIZ AI</Link>
            <Link href="/products/wizsound" className="text-sm text-white/60 hover:text-white transition-colors">WizSound</Link>
            <Link href="/products/wizpilot" className="text-sm text-white/60 hover:text-white transition-colors">WizPilot</Link>
            <Link href="/pricing" className="text-sm text-white/60 hover:text-white transition-colors">Pricing</Link>
            <Link href="/onboarding" className="text-sm font-medium px-4 py-2 rounded-full bg-white text-black hover:bg-white/90 transition-colors">
              Start Creating
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-40 pb-32 px-6 text-center">
        <FadeSection>
          <p className="text-xs tracking-[0.3em] uppercase text-[--color-gold]/80 mb-6">Creative Intelligence Platform</p>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] max-w-4xl mx-auto">
            Create anything.{" "}
            <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-fuchsia-400 bg-clip-text text-transparent">
              Instantly.
            </span>
          </h1>
          <p className="mt-8 text-lg sm:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
            WIZ AI is the creative intelligence platform behind next-generation video, audio and automated creation.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#products" className="px-8 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors">
              Explore Products
            </a>
            <Link href="/onboarding" className="px-8 py-3.5 rounded-full border border-white/15 text-white/80 font-medium text-sm hover:bg-white/5 transition-colors">
              Start Creating
            </Link>
          </div>
        </FadeSection>
      </section>

      {/* ── Products ────────────────────────────────────────────────────── */}
      <section id="products" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeSection>
            <p className="text-xs tracking-[0.3em] uppercase text-white/30 text-center mb-4">The Ecosystem</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
              Four engines. One platform.
            </h2>
          </FadeSection>
          <div className="grid md:grid-cols-2 gap-6">
            {PRODUCTS.map((product, i) => (
              <FadeSection key={product.name}>
                <Link href={product.href}>
                  <div
                    className="group relative rounded-2xl border border-white/8 bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-all duration-300 cursor-pointer h-full"
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${product.gradient} mb-5`}>
                      <span className="text-white">{product.icon}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-white transition-colors">
                      {product.name}<span className="text-white/30">™</span>
                    </h3>
                    <p className="text-white/70 font-medium mb-2">{product.tagline}</p>
                    <p className="text-white/40 text-sm leading-relaxed">{product.description}</p>
                    <div className="mt-5 text-sm text-white/30 group-hover:text-white/60 transition-colors flex items-center gap-1.5">
                      Explore
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <FadeSection>
            <p className="text-xs tracking-[0.3em] uppercase text-white/30 text-center mb-4">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
              Three steps. Zero complexity.
            </h2>
          </FadeSection>
          <div className="space-y-12">
            {HOW_IT_WORKS.map((item, i) => (
              <FadeSection key={item.step}>
                <div className="flex gap-8 items-start" style={{ transitionDelay: `${i * 100}ms` }}>
                  <span className="text-4xl font-bold text-white/10 shrink-0 w-16 text-right">{item.step}</span>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-white/50 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why WIZ AI ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <FadeSection>
            <p className="text-xs tracking-[0.3em] uppercase text-white/30 text-center mb-4">Why WIZ AI</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
              Built for the next generation of creators.
            </h2>
          </FadeSection>
          <div className="grid sm:grid-cols-2 gap-8">
            {WHY_WIZ.map((item, i) => (
              <FadeSection key={item.title}>
                <div className="p-6 rounded-xl border border-white/5 bg-white/[0.015]" style={{ transitionDelay: `${i * 80}ms` }}>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{item.description}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center border-t border-white/5">
        <FadeSection>
          <p className="text-white/30 text-sm mb-6">The future of creation is already here.</p>
          <h2 className="text-4xl sm:text-5xl font-bold mb-10">
            Ready to create?
          </h2>
          <Link href="/onboarding" className="inline-flex px-10 py-4 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition-colors">
            Start Creating
          </Link>
        </FadeSection>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-sm font-bold">
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Wiz</span>
              <span className="text-white/90"> AI</span>
            </span>
            <p className="text-xs text-white/30 mt-1">Creative Intelligence Platform</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link href="/" className="hover:text-white transition-colors">WIZ AI</Link>
            <Link href="/products/wizsound" className="hover:text-white transition-colors">WizSound</Link>
            <Link href="/products/wizpilot" className="hover:text-white transition-colors">WizPilot</Link>
            <Link href="/products/wizgenesis" className="hover:text-white transition-colors">WizGenesis</Link>
          </div>
          <p className="text-xs text-white/20">© 2026 WIZ AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
