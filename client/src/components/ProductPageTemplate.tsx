/**
 * ProductPageTemplate — reusable layout for all WIZ AI product module pages
 * Premium rebuild: full-bleed hero image, image-backed step cards, unmissable CTAs
 */
import React, { ReactNode } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";
import {
  ArrowRight, Check, ChevronRight, Sparkles,
  Upload, Cpu, Layout, CheckCircle, FileText, Music, PlayCircle, ArrowRightCircle,
  Zap, ShieldCheck, Film, Video, Eye, Star, Brain, Layers, Download,
  Settings, Send, BarChart2, RefreshCw, Link2, Wand2,
} from "@/lib/icons";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  upload: Upload, cpu: Cpu, layout: Layout, "check-circle": CheckCircle,
  "file-text": FileText, music: Music, "play-circle": PlayCircle,
  "arrow-right-circle": ArrowRightCircle, zap: Zap, "shield-check": ShieldCheck,
  film: Film, video: Video, eye: Eye, sparkles: Sparkles, star: Star,
  brain: Brain, wand: Wand2, layers: Layers, download: Download,
  settings: Settings, send: Send, "bar-chart": BarChart2,
  refresh: RefreshCw, link: Link2,
};

export interface ProductStep {
  num: string;
  title: string;
  desc: string;
  icon: string; // Lucide key or https:// image URL
  image?: string; // optional step illustration image
}

export interface ProductBenefit {
  title: string;
  desc: string;
}

export interface ProductFeature {
  title: string;
  desc: string;
  icon: string;
  image?: string; // optional feature illustration image
}

export interface RelatedProduct {
  name: string;
  href: string;
  colour: string;
}

export interface ProductPageProps {
  name: string;
  role: string;
  tagline: string;
  headline: string;
  subheadline: string;
  logo: string;
  accentFrom: string;
  accentTo: string;
  accentGlow: string;
  borderColour: string;
  bgColour: string;
  badgeClass: string;
  ctaHref: string;
  ctaLabel: string;
  whatItDoes: string;
  capabilities: string[];
  howItWorks: ProductStep[];
  benefits: ProductBenefit[];
  keyFeatures?: ProductFeature[];
  exampleOutput?: ReactNode;
  heroImage?: string;
  related: RelatedProduct[];
}

const WIZAI_LOGO = "/manus-storage/wizai-logo-premium-transparent_ac3f550b.png";

export default function ProductPageTemplate(props: ProductPageProps) {
  const {
    name, role, tagline, headline, subheadline, logo,
    ctaHref, ctaLabel, whatItDoes, capabilities, howItWorks, benefits,
    keyFeatures, exampleOutput, heroImage, related,
  } = props;

  const seoPath = ctaHref.startsWith("/") ? ctaHref.replace(/\/create$/, "") : `/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`;
  useSEO({
    title: `${name} — ${tagline} | WIZ AI`,
    path: seoPath,
    description: subheadline,
  });

  return (
    <div className="bg-[#040404] text-white min-h-screen overflow-x-hidden">

      {/* ── Sticky Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-[--color-gold]/[0.08] bg-[#040404]/95 backdrop-blur-xl px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallback="/" label="Back" />
            <div className="h-5 w-px bg-[--color-gold]/[0.12]" />
            <div className="flex items-center gap-3">
              <img src={logo} alt={name} className="h-9 w-auto object-contain" loading="lazy"
                style={{ filter: "drop-shadow(0 0 8px rgba(196,164,100,0.20))" }} />
              <div className="hidden sm:flex flex-col">
                <span className="text-[11px] font-black tracking-[0.18em] uppercase text-[--color-gold]">{name}</span>
                <span className="text-[9px] tracking-[0.12em] uppercase text-[--color-silver-dark]/40">{tagline}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NavLink href="/" className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[--color-silver-dark]/60 hover:text-[--color-silver] transition-colors">
              Home
            </NavLink>
            <NavLink
              href={ctaHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-[--color-gold] text-black hover:bg-[--color-gold-light] transition-all shadow-[0_0_20px_rgba(196,164,100,0.25)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {ctaLabel}
            </NavLink>
          </div>
        </div>
      </nav>

      {/* ── Full-Bleed Hero ── */}
      <section className="relative min-h-[70vh] flex flex-col justify-end overflow-hidden">
        {/* Hero background image */}
        {heroImage ? (
          <div className="absolute inset-0">
            <img src={heroImage} alt={name} className="w-full h-full object-cover" loading="eager" />
            {/* Multi-layer dark overlay for text legibility */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(4,4,4,0.45) 0%, rgba(4,4,4,0.20) 40%, rgba(4,4,4,0.75) 75%, rgba(4,4,4,0.98) 100%)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(196,164,100,0.06) 0%, transparent 70%)" }} />
          </div>
        ) : (
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 70% at 50% 20%, rgba(196,164,100,0.10) 0%, transparent 60%)" }} />
        )}

        {/* Grain texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.018]"
          style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 256 256\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noise)\"/%3E%3C/svg%3E')" }} />

        {/* Hero content — bottom-anchored */}
        <div className="relative max-w-5xl mx-auto px-6 pb-20 pt-32 text-center w-full">
          {/* Product logo — large, glowing */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 blur-3xl opacity-30"
                style={{ background: "radial-gradient(circle, rgba(196,164,100,0.7) 0%, transparent 70%)", transform: "scale(2.5)" }} />
              <img
                src={logo}
                alt={name}
                className="relative h-24 md:h-32 w-auto object-contain"
                style={{ filter: "drop-shadow(0 0 40px rgba(196,164,100,0.35)) drop-shadow(0 0 12px rgba(196,164,100,0.20))" }}
                loading="eager"
              />
            </div>
          </div>

          {/* Role pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.25] bg-[--color-gold]/[0.08] text-[11px] font-bold tracking-[0.22em] uppercase text-[--color-gold] mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[--color-gold] animate-pulse" />
            {role} · {tagline}
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-[3.5rem] lg:text-[4rem] font-black tracking-tight leading-[1.06] mb-5 metallic-gold drop-shadow-[0_2px_24px_rgba(0,0,0,0.8)]">
            {headline}
          </h1>
          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
            {subheadline}
          </p>

          {/* CTAs — unmissable */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <NavLink
              href={ctaHref}
              className="inline-flex items-center gap-3 px-12 py-5 rounded-full font-black text-base transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #c4a464 0%, #d4b878 40%, #c9a84c 70%, #b8943a 100%)",
                color: "#1a1200",
                boxShadow: "0 0 40px rgba(196,164,100,0.45), 0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
                border: "1.5px solid rgba(212,184,120,0.6)",
              }}
            >
              <Sparkles className="w-5 h-5" style={{ color: "#1a1200" }} />
              {ctaLabel}
              <ArrowRight className="w-5 h-5" style={{ color: "#1a1200" }} />
            </NavLink>
            <NavLink
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-sm text-white/80 border border-white/20 bg-white/[0.06] backdrop-blur-sm hover:border-[--color-gold]/40 hover:text-white hover:bg-white/[0.10] transition-all"
            >
              Explore all modules <ChevronRight className="w-4 h-4" />
            </NavLink>
          </div>
        </div>
      </section>

      {/* ── What It Does ── */}
      <section className="py-24 px-6 bg-[#060606]">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.15] bg-[--color-gold]/[0.04] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold] mb-8">
            <img src={logo} alt={name} className="h-4 w-auto object-contain" loading="lazy" />
            What {name} Does
          </div>
          <div className="grid md:grid-cols-2 gap-14 items-start">
            <div>
              <p className="text-[--color-silver]/75 text-lg leading-relaxed mb-8">{whatItDoes}</p>
              <ul className="space-y-3.5">
                {capabilities.map((cap) => (
                  <li key={cap} className="flex items-start gap-3.5">
                    <div className="w-5 h-5 rounded-full bg-[--color-gold]/[0.12] border border-[--color-gold]/[0.25] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-[--color-gold]" />
                    </div>
                    <span className="text-[--color-silver]/75 text-sm leading-relaxed">{cap}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Hero image panel */}
            <div className="rounded-3xl border border-[--color-gold]/[0.10] overflow-hidden relative" style={{ minHeight: 320 }}>
              {heroImage ? (
                <>
                  <img src={heroImage} alt={name} className="w-full h-full object-cover" style={{ minHeight: 320 }} loading="lazy" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(4,4,4,0.0) 50%, rgba(4,4,4,0.7) 100%)" }} />
                  <div className="absolute bottom-5 left-5 flex items-center gap-2.5 bg-black/70 backdrop-blur-md rounded-2xl px-4 py-2.5 border border-[--color-gold]/[0.15]">
                    <img src={logo} alt={name} className="h-8 w-auto object-contain" loading="lazy" />
                    <div>
                      <div className="text-xs font-black text-[--color-gold] tracking-wide">{name}</div>
                      <div className="text-[10px] text-[--color-silver-dark]/50">{role}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-[#0a0a0a] p-10 flex flex-col items-center justify-center" style={{ minHeight: 320 }}>
                  <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(196,164,100,0.08) 0%, transparent 70%)" }} />
                  <img src={logo} alt={name} className="h-24 w-auto object-contain relative z-10 mb-4" loading="lazy"
                    style={{ filter: "drop-shadow(0 0 24px rgba(196,164,100,0.20))" }} />
                  <div className="text-sm font-bold text-[--color-gold] relative z-10">{name}</div>
                  <div className="text-xs text-[--color-silver-dark]/30 relative z-10 mt-1">{role}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.15] bg-[--color-gold]/[0.04] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold] mb-5">
              How It Works
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">
              From input to output — step by step
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {howItWorks.map((step, i) => {
              const Icon = ICON_MAP[step.icon];
              return (
                <div key={step.num} className="relative rounded-3xl border border-[--color-gold]/[0.10] bg-[#0a0a0a] hover:border-[--color-gold]/[0.22] hover:bg-[--color-gold]/[0.025] transition-all duration-300 group overflow-hidden">
                  {/* Step image or icon header */}
                  {step.image ? (
                    <div className="relative h-40 overflow-hidden">
                      <img src={step.image} alt={step.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(10,10,10,1) 100%)" }} />
                      <div className="absolute top-3 left-3 w-8 h-8 rounded-xl bg-black/70 backdrop-blur-sm border border-[--color-gold]/[0.20] flex items-center justify-center">
                        <span className="text-[10px] font-black text-[--color-gold] font-mono">{step.num}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-36 flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[--color-gold]/[0.04] to-transparent">
                      <div className="text-[5rem] font-black leading-none text-[--color-gold]/[0.06] absolute top-2 right-3 select-none pointer-events-none">{step.num}</div>
                      <div className="w-14 h-14 rounded-2xl bg-[--color-gold]/[0.10] border border-[--color-gold]/[0.18] flex items-center justify-center group-hover:bg-[--color-gold]/[0.18] transition-colors relative z-10">
                        {step.icon.startsWith("http") ? (
                          <img src={step.icon} alt={step.title} className="w-7 h-7 object-contain" loading="lazy" />
                        ) : Icon ? (
                          <Icon className="w-7 h-7 text-[--color-gold]" />
                        ) : (
                          <span className="text-xl text-[--color-gold]">{step.icon}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Text content */}
                  <div className="p-5">
                    {!step.image && (
                      <div className="text-[10px] font-mono font-bold text-[--color-gold]/60 mb-2 tracking-[0.2em]">STEP {step.num}</div>
                    )}
                    <h3 className="text-sm font-bold text-white mb-2 group-hover:text-[--color-gold-light] transition-colors">{step.title}</h3>
                    <p className="text-xs text-[--color-silver-dark]/55 leading-relaxed">{step.desc}</p>
                  </div>
                  {/* Connector arrow */}
                  {i < howItWorks.length - 1 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <ChevronRight className="w-5 h-5 text-[--color-gold]/[0.25]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Key Benefits ── */}
      <section className="py-24 px-6 bg-[#060606]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.15] bg-[--color-gold]/[0.04] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold] mb-5">
              Key Benefits
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white">
              Why {name} changes everything
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b, idx) => (
              <div key={b.title} className="p-7 rounded-3xl border border-[--color-gold]/[0.08] bg-[#0a0a0a] hover:border-[--color-gold]/[0.18] hover:bg-[--color-gold]/[0.02] transition-all duration-300 group">
                <div className="w-8 h-8 rounded-xl bg-[--color-gold]/[0.10] border border-[--color-gold]/[0.18] flex items-center justify-center mb-4 group-hover:bg-[--color-gold]/[0.18] transition-colors">
                  <span className="text-[11px] font-black text-[--color-gold] font-mono">{String(idx + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="text-sm font-bold text-[--color-gold] mb-2.5 group-hover:text-[--color-gold-light] transition-colors">{b.title}</h3>
                <p className="text-xs text-[--color-silver-dark]/55 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Features ── */}
      {keyFeatures && keyFeatures.length > 0 && (
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.15] bg-[--color-gold]/[0.04] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold] mb-5">
                Key Features
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                What makes {name} different
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {keyFeatures.map((feat) => {
                const Icon = ICON_MAP[feat.icon];
                return (
                  <div key={feat.title} className="group rounded-3xl border border-[--color-gold]/[0.08] bg-[#0a0a0a] hover:border-[--color-gold]/[0.20] hover:bg-[--color-gold]/[0.025] transition-all duration-300 overflow-hidden">
                    {feat.image ? (
                      <div className="relative h-44 overflow-hidden">
                        <img src={feat.image} alt={feat.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(10,10,10,1) 100%)" }} />
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center bg-gradient-to-br from-[--color-gold]/[0.04] to-transparent">
                        <div className="w-14 h-14 rounded-2xl bg-[--color-gold]/[0.10] border border-[--color-gold]/[0.18] flex items-center justify-center group-hover:bg-[--color-gold]/[0.18] transition-colors">
                          {Icon ? <Icon className="w-7 h-7 text-[--color-gold]" /> : <Sparkles className="w-7 h-7 text-[--color-gold]" />}
                        </div>
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-sm font-bold text-white mb-2 group-hover:text-[--color-gold-light] transition-colors">{feat.title}</h3>
                      <p className="text-xs text-[--color-silver-dark]/55 leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Example Output ── */}
      {exampleOutput && (
        <section className="py-24 px-6 bg-[#060606]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.15] bg-[--color-gold]/[0.04] text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold] mb-5">
                Example Output
              </div>
              <h2 className="text-3xl font-extrabold text-white">See it in action</h2>
            </div>
            {exampleOutput}
          </div>
        </section>
      )}

      {/* ── Mid-page CTA band ── */}
      <section className="relative py-20 px-6 overflow-hidden">
        {heroImage && (
          <div className="absolute inset-0">
            <img src={heroImage} alt={name} className="w-full h-full object-cover object-center" loading="lazy" />
            <div className="absolute inset-0" style={{ background: "rgba(4,4,4,0.88)" }} />
          </div>
        )}
        <div className="relative max-w-3xl mx-auto text-center">
          <img src={logo} alt={name} className="h-16 w-auto object-contain mx-auto mb-6" loading="lazy"
            style={{ filter: "drop-shadow(0 0 24px rgba(196,164,100,0.30))" }} />
          <h2 className="text-2xl md:text-3xl font-black text-white mb-4">Ready to use {name}?</h2>
          <p className="text-[--color-silver-dark]/55 mb-8 text-base">Start creating cinematic AI content today — no experience required.</p>
          <NavLink
            href={ctaHref}
            className="inline-flex items-center gap-3 px-14 py-5 rounded-full font-black text-base transition-all hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #c4a464 0%, #d4b878 40%, #c9a84c 70%, #b8943a 100%)",
              color: "#1a1200",
              boxShadow: "0 0 50px rgba(196,164,100,0.50), 0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
              border: "1.5px solid rgba(212,184,120,0.6)",
            }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "#1a1200" }} />
            {ctaLabel}
            <ArrowRight className="w-5 h-5" style={{ color: "#1a1200" }} />
          </NavLink>
        </div>
      </section>

      {/* ── Related Modules ── */}
      <section className="py-20 px-6 bg-[#060606]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-white mb-2">Part of the WIZ AI Engine</h2>
            <p className="text-[--color-silver-dark]/40 text-sm">Each module works in sequence — explore the full pipeline</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {related.map((r) => (
              <NavLink
                key={r.name}
                href={r.href}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[--color-gold]/[0.10] bg-[--color-gold]/[0.03] text-sm font-semibold text-[--color-silver-dark]/70 hover:text-[--color-gold] hover:border-[--color-gold]/[0.25] hover:bg-[--color-gold]/[0.06] transition-all"
              >
                {r.name} <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[--color-gold]/[0.06] bg-[#030303] py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
            <NavLink href="/">
              <img src={WIZAI_LOGO} alt="WIZ AI" className="h-14 w-auto object-contain drop-shadow-[0_0_8px_rgba(196,164,100,0.10)]" loading="lazy" />
            </NavLink>
            <div className="flex flex-wrap items-center gap-5 text-xs text-[--color-silver-dark]/30">
              <Link href="/privacy" className="hover:text-[--color-gold-dark] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-[--color-gold-dark] transition-colors">Terms of Service</Link>
              <Link href="/refunds" className="hover:text-[--color-gold-dark] transition-colors">Refund Policy</Link>
              <Link href="/cookie-policy" className="hover:text-[--color-gold-dark] transition-colors">Cookie Policy</Link>
              <button onClick={() => window.dispatchEvent(new CustomEvent('wiz:open-cookie-settings'))} className="hover:text-[--color-gold-dark] transition-colors bg-transparent border-0 p-0 cursor-pointer text-xs text-[--color-silver-dark]/30">Cookie Settings</button>
              <Link href="/help" className="hover:text-[--color-gold-dark] transition-colors">Help</Link>
            </div>
          </div>
          <div className="luxury-divider" />
          <p className="text-center text-xs text-[--color-silver-dark]/25 pt-6">&copy; 2026 WIZ AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
