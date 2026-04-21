import { useState, useEffect } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";
import {
  ChevronDown, ChevronUp, MessageCircle, Mail,
  Zap, Music, Music2, Video, Baby, Bot, Search, Sparkles,
  Film, Image, Wand2, FileText, Menu, X
} from "@/lib/icons";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import PublicNavBar from "@/components/PublicNavBar";

const WIZAI_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizai-logo-premium-transparent_ac3f550b.png";

const HELP_NAV_PRODUCTS = [
  { name: "WizAudio", label: "Create Audio", icon: <Music2 className="w-5 h-5" />, href: "/music-creator" },
  { name: "WizImage", label: "Create Images", icon: <Image className="w-5 h-5" />, href: "/wiz-image" },
  { name: "WizVideo", label: "Create Videos", icon: <Film className="w-5 h-5" />, href: "/music-video/create" },
  { name: "WizShorts", label: "Create Shorts", icon: <Zap className="w-5 h-5" />, href: "/wiz-shorts" },
  { name: "WizAnimate", label: "Create Animation", icon: <Wand2 className="w-5 h-5" />, href: "/wiz-animate" },
  { name: "WizScript", label: "Create from Text", icon: <FileText className="w-5 h-5" />, href: "/text-to-video" },
];


function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${
        open ? "border-[--color-gold]/[0.15] bg-[#0e0e0e]" : "border-[--color-gold]/[0.06] bg-[#0a0a0a] hover:border-[--color-gold]/[0.1]"
      }`}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between p-5 gap-4">
        <p className="font-medium text-[--color-silver-light] text-sm text-left">{q}</p>
        {open
          ? <ChevronUp className="w-4 h-4 text-[--color-silver-dark]/40 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-[--color-silver-dark]/40 flex-shrink-0" />}
      </div>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-[--color-silver-dark]/60 text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function Help() {
  useSEO({ title: "Help & FAQ — WIZ AI", path: "/help", description: "Get answers to common questions about WIZ AI. Learn how to create videos, manage credits, troubleshoot renders, and more." });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredFAQs = FAQS.map((cat) => ({
    ...cat,
    questions: cat.questions.filter(
      (q) =>
        !searchQuery ||
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.questions.length > 0);

  const displayFAQs = activeCategory
    ? filteredFAQs.filter((c) => c.category === activeCategory)
    : filteredFAQs;

  return (
    <div className="min-h-screen bg-[#040404] text-white font-sans">
      {/* Nav (matches homepage) */}
      <PublicNavBar />

      {/* Premium hero background */}
      <div className="relative">
        <div className="absolute inset-0 h-72 pointer-events-none overflow-hidden">
          <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/help-hero-bg_a1455798.jpg" alt="" className="w-full h-full object-cover opacity-[0.18]" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(4,4,4,0.2) 0%, rgba(4,4,4,0.8) 70%, #040404 100%)' }} />
        </div>

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-20 relative z-10">
        <BackButton className="mb-6" />
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] mb-6">
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark]">Help Centre</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            How can we <span className="metallic-gold">help?</span>
          </h1>
          <p className="text-[--color-silver-dark]/50 text-lg max-w-lg mx-auto">
            Find answers instantly. If you can't find what you need, our team is here to help.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-silver-dark]/40" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[--color-gold]/[0.08] rounded-xl pl-11 pr-4 py-3.5 text-white placeholder:text-[--color-silver-dark]/30 focus:outline-none focus:border-[--color-gold]/[0.2] transition-all text-sm"
          />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          {[
            { icon: <Music className="w-4 h-4" />, label: "Music Videos", href: "/music-video/create" },
            { icon: <Video className="w-4 h-4" />, label: "AI Video", href: "/wizpilot" },
            { icon: <Baby className="w-4 h-4" />, label: "Kids Content", href: "/kids-video" },
          ].map((item) => (
            <Link key={item.label} href={item.href}>
              <div className="p-4 rounded-xl bg-[#0a0a0a] border border-[--color-gold]/[0.1] hover:border-[--color-gold]/[0.3] hover:bg-[--color-gold]/[0.04] transition-all cursor-pointer text-center group">
                <div className="text-[--color-gold-dark] group-hover:text-[--color-gold] flex justify-center mb-2 transition-colors">{item.icon}</div>
                <p className="text-[--color-silver-light] text-xs font-medium group-hover:text-white transition-colors">{item.label}</p>
              </div>
            </Link>
          ))}
          <div
            key="live-chat"
            onClick={() => { if (typeof window !== "undefined" && (window as any).$crisp) { (window as any).$crisp.push(["do", "chat:open"]); } }}
            className="p-4 rounded-xl bg-[#0a0a0a] border border-[--color-gold]/[0.06] hover:border-[--color-gold]/[0.15] transition-all cursor-pointer text-center"
          >
            <div className="text-[--color-gold-dark] flex justify-center mb-2"><MessageCircle className="w-4 h-4" /></div>
            <p className="text-[--color-silver-light] text-xs font-medium">Live Chat</p>
          </div>
        </div>

        {/* Category filter */}
        {!searchQuery && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                !activeCategory
                  ? "bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a]"
                  : "bg-[--color-gold]/[0.04] text-[--color-silver-dark]/60 hover:bg-[--color-gold]/[0.08] hover:text-[--color-silver] border border-[--color-gold]/[0.06]"
              }`}
            >
              All Topics
            </button>
            {FAQS.map((cat) => (
              <button
                key={cat.category}
                onClick={() => setActiveCategory(activeCategory === cat.category ? null : cat.category)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeCategory === cat.category
                    ? "bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a]"
                    : "bg-[--color-gold]/[0.04] text-[--color-silver-dark]/60 hover:bg-[--color-gold]/[0.08] hover:text-[--color-silver] border border-[--color-gold]/[0.06]"
                }`}
              >
                {cat.icon}
                {cat.category}
              </button>
            ))}
          </div>
        )}

        {/* FAQ sections */}
        {displayFAQs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[--color-silver-dark]/60 text-base">No results found for "{searchQuery}"</p>
            <p className="text-[--color-silver-dark]/35 text-sm mt-2">Try a different search term or contact support below</p>
          </div>
        ) : (
          <div className="space-y-10">
            {displayFAQs.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-[--color-gold-dark]">{cat.icon}</div>
                  <h2 className="text-base font-semibold text-white">{cat.category}</h2>
                </div>
                <div className="space-y-2">
                  {cat.questions.map((item) => (
                    <FAQItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact support */}
        <div className="mt-16">
          <div className="relative rounded-2xl overflow-hidden border border-[--color-gold]/[0.15] p-8 mb-6">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/help-hero-bg_a1455798.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.08]" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#b8892a]/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Still need help?</h2>
              <p className="text-[--color-silver-dark]/50 text-sm">Our team is ready to assist you</p>
            </div>
            <div className="relative grid md:grid-cols-2 gap-4">
              <div className="p-6 rounded-xl bg-[#0a0a0a]/80 border border-[--color-gold]/[0.12] text-center hover:border-[--color-gold]/[0.25] transition-all">
                <div className="w-12 h-12 rounded-xl bg-[--color-gold]/[0.1] border border-[--color-gold]/[0.15] flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6 text-[--color-gold]" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">Live Chat</h3>
                <p className="text-[--color-silver-dark]/50 text-sm mb-5 leading-relaxed">Chat with our team in real time. Usually responds in under 2 minutes.</p>
                <button
                  className="btn-primary btn-sheen w-full rounded-xl font-semibold h-10 text-sm flex items-center justify-center"
                  onClick={() => {
                    if (typeof window !== "undefined" && (window as any).$crisp) {
                      (window as any).$crisp.push(["do", "chat:open"]);
                    }
                  }}
                >
                  Start Chat
                </button>
              </div>
              <div className="p-6 rounded-xl bg-[#0a0a0a]/80 border border-[--color-gold]/[0.12] text-center hover:border-[--color-gold]/[0.25] transition-all">
                <div className="w-12 h-12 rounded-xl bg-[--color-gold]/[0.1] border border-[--color-gold]/[0.15] flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-[--color-gold]" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">Email Support</h3>
                <p className="text-[--color-silver-dark]/50 text-sm mb-5 leading-relaxed">Send us a message and we'll get back to you within 24 hours.</p>
                <a
                  href="mailto:support@wiz-ai.io"
                  className="inline-flex items-center justify-center w-full h-10 rounded-xl border border-[--color-gold]/[0.15] bg-[--color-gold]/[0.06] text-[--color-silver] hover:bg-[--color-gold]/[0.12] hover:text-white transition-all text-sm font-medium"
                >
                  support@wiz-ai.io
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>{/* end relative hero wrapper */}

      {/* Footer */}
      <footer className="border-t border-[--color-gold]/[0.06] bg-[#030303] py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
            <NavLink href="/">
              <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[3.6rem] w-auto object-contain drop-shadow-[0_0_8px_rgba(196,164,100,0.1)]" />
            </NavLink>
            <div className="flex items-center gap-5 text-xs text-[--color-silver-dark]/30">
              <Link href="/privacy" className="hover:text-[--color-gold-dark] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-[--color-gold-dark] transition-colors">Terms of Service</Link>
              <Link href="/refunds" className="hover:text-[--color-gold-dark] transition-colors">Refund Policy</Link>
              <Link href="/pricing" className="hover:text-[--color-gold-dark] transition-colors">Pricing</Link>
            </div>
          </div>
          <div className="luxury-divider" />
          <p className="text-center text-xs text-[--color-silver-dark]/25 pt-6">&copy; 2026 WIZ AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
