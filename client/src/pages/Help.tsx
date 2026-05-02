import { WIZANIMATE_PRODUCT_PAGE, WIZAUDIO_STUDIO_PAGE, WIZIMAGE_STUDIO_PAGE, WIZSHORTS_STUDIO_PAGE, WIZSCRIPT_STUDIO_PAGE, WIZVIDEO_STUDIO_PAGE } from "@/lib/routes";
import { useState, useRef, useEffect } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";
import {
  ChevronDown, ChevronUp, MessageCircle, Mail,
  Zap, Music, Video, Baby, Bot, Search, Sparkles, X,
  CreditCard, Shield, Headphones, Image, FileText, Globe,
  Clock, Star, BookOpen, ExternalLink, AlertCircle
} from "@/lib/icons";
import PublicNavBar from "@/components/PublicNavBar";

const CDN = "/manus-storage";
const WIZAI_LOGO = `${CDN}/wizai-logo-premium-transparent_ff33f09f_72ea7f44.webp`;
const LOGO_WIZVIDEO  = `${CDN}/wizvideo-logo-v1_9ec37e45.png`;
const LOGO_WIZAUDIO  = `${CDN}/wizaudio-logo-v1_f428aad0.png`;
const LOGO_WIZIMAGE  = `${CDN}/wizimage-logo-v1_83c86e5c.png`;
const LOGO_WIZSHORTS = `${CDN}/wizshorts-logo-v1_533db978.png`;
const LOGO_WIZSCRIPT = `${CDN}/wizscript-logo-v1_c6af5345.png`;
const LOGO_WIZANIMATE = `${CDN}/wizanimate-logo-new_a84f9808.png`;
const LOGO_WIZCREATE = `${CDN}/wizcreate-logo-new_85a25756.png`;
const LOGO_WIZSOUND  = `${CDN}/wizsound-logo-new_c5cced65.png`;
const LOGO_WIZLUMINA = `${CDN}/wizlumina-logo-new_0709f3c5.png`;
const LOGO_WIZBOOST  = `${CDN}/wizboost-logo-new_93f2b48b.png`;
const LOGO_WIZGENESIS = `${CDN}/wizgenesis-logo-new_9814b3d1.png`;

// ─── FAQ DATA ────────────────────────────────────────────────────────────────

const FAQS = [
  {
    category: "Getting Started",
    icon: <Zap className="w-4 h-4" />,
    color: "rgba(196,164,100,0.15)",
    border: "rgba(196,164,100,0.3)",
    questions: [
      { q: "How do I create my first video?", a: "Choose WizVideo for music videos or WizScript for any other video. Upload your audio or enter your idea, pick a visual style, then click Generate. Your storyboard is always free — you only pay when you build and download the final video." },
      { q: "Do I need any editing skills?", a: "No — WIZ AI is fully automated. The AI handles everything from storyboard creation to final building. You just provide the input and choose a style." },
      { q: "How long does it take to generate a video?", a: "Most videos are created within 2–5 minutes depending on length and complexity. You'll see a live progress bar while your video is being generated." },
      { q: "Is there a free option?", a: "Yes. WIZ AI is completely free to use — no credit card required. Storyboard generation is always free. You only pay when you're ready to build and download your finished video." },
      { q: "What makes WIZ AI different from other platforms?", a: "WIZ AI is the only platform that gives you a full storyboard preview before you spend anything. You see exactly what your video will look like — scenes, characters, and visuals — before committing to a build. Every output is also automatically enhanced by our proprietary WIZ Engines: WizGenesis™, WizSound™, WizLumina™, and WizBoost™." },
    ],
  },
  {
    category: "WizVideo — Music Videos",
    icon: <Music className="w-4 h-4" />,
    color: "rgba(60,120,220,0.15)",
    border: "rgba(60,120,220,0.3)",
    questions: [
      { q: "What audio formats does WizVideo support?", a: "WizVideo supports MP3, WAV, M4A, and OGG audio files up to 50MB. For best results, use a high-quality stereo audio file." },
      { q: "How does lyrics-driven video generation work?", a: "WizVideo automatically transcribes your song lyrics using AI. Each lyric line is mapped to a visual scene, creating a video that perfectly syncs with your music. You can also paste lyrics manually." },
      { q: "Can I add characters to my music video?", a: "Yes. WizVideo supports up to 4 characters per video. Each character can have multiple reference images for visual consistency, and singing characters get AI lip-sync applied automatically." },
      { q: "What video styles are available?", a: "WizVideo offers a range of cinematic styles including Cinematic, Anime, 3D Animation, Documentary, Abstract, and Vintage." },
      { q: "Can I customise individual scenes in my storyboard?", a: "Yes. After WizCreate™ generates your storyboard, you can swap images, edit scene descriptions, change styles, and reorder scenes before building. You are always in full control of the final look." },
    ],
  },
  {
    category: "WizScript — AI Video Creator",
    icon: <FileText className="w-4 h-4" />,
    color: "rgba(0,200,220,0.15)",
    border: "rgba(0,200,220,0.3)",
    questions: [
      { q: "What is WizScript?", a: "WizScript converts a plain-text idea into a fully structured video script and storyboard. Define your concept, and WIZ AI generates the scenes, dialogue, and visual direction automatically." },
      { q: "What types of videos can I create with WizScript?", a: "Anything — YouTube content, social media videos, ads, explainer videos, short films, product showcases, and more." },
      { q: "How long can WizScript videos be?", a: "WizScript supports videos up to 10 minutes in length. The AI automatically structures your script into scenes and paces the visuals to match." },
    ],
  },
  {
    category: "WizAudio — AI Music & Audio",
    icon: <Headphones className="w-4 h-4" />,
    color: "rgba(0,200,180,0.15)",
    border: "rgba(0,200,180,0.3)",
    questions: [
      { q: "What is WizAudio?", a: "WizAudio is WIZ AI's music creation engine. Describe the genre, mood, and style — WizAudio generates a full original track, complete with vocals, instrumentation, and mastering, ready to use in your video projects." },
      { q: "What genres and styles does WizAudio support?", a: "WizAudio supports a wide range of genres including pop, hip-hop, R&B, electronic, cinematic, lo-fi, jazz, classical, and more. You can describe any style in natural language." },
      { q: "Can I use WizAudio tracks in my videos?", a: "Yes. WizAudio tracks are fully compatible with WizVideo and WizScript. Generate your track in WizAudio, then use it as the audio input for your video." },
      { q: "Does WizAudio apply WizSound mastering?", a: "Yes. WizSound audio mastering is available as an optional add-on when you export your WizAudio track — WizSound Active (+£1) or WizSound Spatial (+£3) for cinema-grade immersive audio." },
    ],
  },
  {
    category: "WizImage — AI Image Creation",
    icon: <Image className="w-4 h-4" />,
    color: "rgba(196,164,100,0.15)",
    border: "rgba(196,164,100,0.3)",
    questions: [
      { q: "What is WizImage?", a: "WizImage generates high-resolution, cinematic-quality images from text prompts. Use it to create visual assets, concept art, scene stills, or promotional imagery — all in seconds." },
      { q: "What image styles are available?", a: "WizImage supports photorealistic, cinematic, anime, 3D render, oil painting, watercolour, concept art, and many more styles. You can also upload a reference image to guide the style." },
      { q: "Can I use WizImage to create characters for my videos?", a: "Yes. WizImage is the recommended way to create character reference images for WizVideo. Generate your character in WizImage, then upload the image as a character reference in WizVideo for consistent appearance across scenes." },
      { q: "How many images can I generate?", a: "Each image generation consumes one Build Credit. You can generate multiple variations and download your favourites." },
    ],
  },
  {
    category: "WizShorts — Short-Form Content",
    icon: <Globe className="w-4 h-4" />,
    color: "rgba(220,100,40,0.15)",
    border: "rgba(220,100,40,0.3)",
    questions: [
      { q: "What is WizShorts?", a: "WizShorts is built for social-first creators. Generate vertical short-form videos optimised for TikTok, Instagram Reels, and YouTube Shorts — with captions, pacing, and visual hooks built in." },
      { q: "How long can WizShorts videos be?", a: "WizShorts generates videos up to 60 seconds in length, formatted in 9:16 vertical aspect ratio for mobile-first platforms." },
      { q: "Can I add captions to WizShorts?", a: "Yes. WizShorts automatically generates and overlays captions synced to your audio. You can customise the caption style and font." },
    ],
  },
  {
    category: "WizAnimate — AI Animation",
    icon: <Sparkles className="w-4 h-4" />,
    color: "rgba(160,80,220,0.15)",
    border: "rgba(160,80,220,0.3)",
    questions: [
      { q: "What is WizAnimate?", a: "WizAnimate brings AI-generated characters and scenes to life. From lyric videos to animated explainers, WizAnimate adds motion, expression, and cinematic movement to your creative projects." },
      { q: "What animation styles does WizAnimate support?", a: "WizAnimate supports 3D Animation, Anime, Cartoon, Motion Graphics, and Claymation styles. You can mix styles across scenes for a unique look." },
      { q: "Does WizAnimate support character consistency?", a: "Yes. Character consistency is available on Creator, Pro, and Studio plans, ensuring your animated characters look the same across all scenes." },
    ],
  },
  {
    category: "Kids Content",
    icon: <Baby className="w-4 h-4" />,
    color: "rgba(80,180,120,0.15)",
    border: "rgba(80,180,120,0.3)",
    questions: [
      { q: "Can I create kids videos and animations?", a: "Absolutely. WIZ AI is ideal for kids content creators. Use the 3D Animation or Anime style for animated characters, or create nursery rhyme videos with WizVideo." },
      { q: "Is the content safe for children?", a: "Yes. WIZ AI's generation pipeline is configured to produce family-friendly content. All outputs are reviewed for appropriateness." },
    ],
  },
  {
    category: "Billing & Credits",
    icon: <CreditCard className="w-4 h-4" />,
    color: "rgba(196,164,100,0.15)",
    border: "rgba(196,164,100,0.3)",
    questions: [
      { q: "How does the credit system work?", a: "Creating your storyboard is always free. You only pay when you build your final video and download it. Choose your quality (Standard £2 / HD £4 / 4K £6) and optionally add WizSound audio enhancement." },
      { q: "What is WizSound?", a: "WizSound is our proprietary audio enhancement engine. WizSound Enhanced (+£1) adds stereo widening and frequency EQ for a polished, fuller sound. WizSound Cinematic (+£3) applies our full mastering pipeline with immersive depth and dynamic range — recommended for music videos." },
      { q: "What plans are available?", a: "Free (trial credits, no card required), Starter (£9/month, 2 Build Credits, 720p), Basic (£19/month, 5 Build Credits, 1080p HD), Creator (£35/month, 15 Build Credits, HD + 4K), Pro (£59/month, 25 Build Credits, 4K priority), and Studio (£99/month, 40 Build Credits, 4K + API). Storyboard generation is always free on all plans." },
      { q: "Do unused Build Credits roll over?", a: "Subscription Build Credits reset each billing cycle. Build Credit Packs (purchased separately from the dashboard) never expire and roll over indefinitely." },
      { q: "Can I cancel my subscription?", a: "Yes, cancel at any time from your Account settings. Your subscription remains active until the end of the billing period. We also offer a 7-day money-back guarantee on all plans." },
      { q: "What payment methods do you accept?", a: "Visa, Mastercard, Amex, Apple Pay, and Google Pay via Stripe. All transactions are secured and processed by Stripe." },
    ],
  },
  {
    category: "Technical Issues",
    icon: <AlertCircle className="w-4 h-4" />,
    color: "rgba(220,80,60,0.15)",
    border: "rgba(220,80,60,0.3)",
    questions: [
      { q: "Why is my video not generating?", a: "Check that your audio file is in a supported format (MP3, WAV, M4A) and under 50MB. If the issue persists, try refreshing the page. Contact support@wiz-ai.io if it continues." },
      { q: "My video quality looks low — what can I do?", a: "Make sure you're on the Creator, Pro, or Studio plan for 1080p/4K export. Also ensure your input audio is high quality — the AI uses audio characteristics to guide visual generation." },
      { q: "How do I download my video?", a: "Once your video is generated, click the Download button on the result screen. Videos are also saved to your Projects page for 30 days." },
      { q: "I'm getting an error message — what should I do?", a: "Try refreshing the page first. If the error persists, contact us at support@wiz-ai.io with a screenshot of the error. Our team typically responds within 2 hours during business hours." },
      { q: "My audio upload is failing — what file sizes are supported?", a: "Audio files must be under 50MB. MP3 files at 320kbps are recommended. If your file is larger, use a free tool like Audacity or online converter to compress it before uploading." },
    ],
  },
  {
    category: "WIZ Engines",
    icon: <Zap className="w-4 h-4" />,
    color: "rgba(196,164,100,0.15)",
    border: "rgba(196,164,100,0.3)",
    questions: [
      { q: "What are the WIZ Engines?", a: "The WIZ Engines are proprietary AI layers that automatically enhance every creation on the platform. They run in the background — you do not need to configure anything. Every export benefits from all four engines." },
      { q: "What does WizGenesis™ do?", a: "WizGenesis™ is the core intelligence engine. It orchestrates the entire creative workflow — from storyboard generation to scene composition to final build. It is the brain that makes everything work together." },
      { q: "What does WizSound™ do?", a: "WizSound™ is the premium audio engine. It enhances every audio track with richer depth, spatial clarity, and cinematic presence. WizSound Active adds stereo widening and EQ. WizSound Spatial applies the full mastering pipeline with immersive depth and dynamic range." },
      { q: "What does WizLumina™ do?", a: "WizLumina™ is the visual enhancement engine. It applies cinematic colour grading, HDR tone mapping, and film-level polish to every frame. Your visuals go from raw AI output to cinema-ready quality automatically." },
      { q: "What does WizBoost™ do?", a: "WizBoost™ is the output optimisation engine. It analyses your final build and applies intelligent upscaling, compression optimisation, and platform-specific formatting. Your content arrives publish-ready for YouTube, TikTok, Instagram, and beyond." },
    ],
  },
  {
    category: "WizCreate™ & Storyboard",
    icon: <BookOpen className="w-4 h-4" />,
    color: "rgba(196,164,100,0.15)",
    border: "rgba(196,164,100,0.3)",
    questions: [
      { q: "What is WizCreate™?", a: "WizCreate™ is the AI storyboard and scene-building engine at the heart of WIZ AI. When you describe your idea, WizCreate™ generates a full visual storyboard — scenes, characters, and direction — in seconds. It powers every product on the platform." },
      { q: "Can I edit my storyboard before building?", a: "Yes. After WizCreate™ generates your storyboard, you can review every scene, swap images, edit text, change styles, and reorder scenes before committing to build. You are always in control." },
      { q: "How many scenes can a storyboard have?", a: "Storyboards can have up to 30 scenes. For music videos, the number of scenes is determined by the number of lyric lines or sections in your audio." },
      { q: "Is storyboard generation really free?", a: "Yes — completely free, no credit card required. WizCreate™ generates your full storyboard at no cost. You only pay when you're ready to build and download the final video." },
    ],
  },
];

// ─── QUICK LINKS ─────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { logo: LOGO_WIZVIDEO,   name: "WizVideo",   label: "Music Videos",      href: WIZVIDEO_STUDIO_PAGE,  color: "rgba(60,120,220,0.12)",  border: "rgba(60,120,220,0.25)",  glow: "rgba(60,120,220,0.4)" },
  { logo: LOGO_WIZAUDIO,   name: "WizAudio",   label: "AI Music",          href: WIZAUDIO_STUDIO_PAGE,  color: "rgba(0,200,180,0.12)",   border: "rgba(0,200,180,0.25)",   glow: "rgba(0,200,180,0.4)" },
  { logo: LOGO_WIZIMAGE,   name: "WizImage",   label: "AI Images",         href: WIZIMAGE_STUDIO_PAGE,  color: "rgba(196,164,100,0.12)", border: "rgba(196,164,100,0.3)",  glow: "rgba(196,164,100,0.4)" },
  { logo: LOGO_WIZSHORTS,  name: "WizShorts",  label: "Short-Form Video",  href: WIZSHORTS_STUDIO_PAGE, color: "rgba(220,100,40,0.12)",  border: "rgba(220,100,40,0.25)",  glow: "rgba(220,100,40,0.4)" },
  { logo: LOGO_WIZSCRIPT,  name: "WizScript",  label: "Text-to-Video",     href: WIZSCRIPT_STUDIO_PAGE, color: "rgba(0,200,220,0.12)",   border: "rgba(0,200,220,0.25)",   glow: "rgba(0,200,220,0.4)" },
  { logo: LOGO_WIZANIMATE, name: "WizAnimate", label: "AI Animation",      href: WIZANIMATE_PRODUCT_PAGE, color: "rgba(160,80,220,0.12)", border: "rgba(160,80,220,0.25)", glow: "rgba(160,80,220,0.4)" },
];

// ─── ENGINE LOGOS ─────────────────────────────────────────────────────────────

const ENGINES = [
  { logo: LOGO_WIZGENESIS, name: "WizGenesis™", desc: "Core intelligence" },
  { logo: LOGO_WIZSOUND,   name: "WizSound™",   desc: "Audio mastering" },
  { logo: LOGO_WIZLUMINA,  name: "WizLumina™",  desc: "Visual enhancement" },
  { logo: LOGO_WIZBOOST,   name: "WizBoost™",   desc: "Output optimisation" },
];

// ─── FAQ ITEM ─────────────────────────────────────────────────────────────────

function FAQItem({ q, a, accentColor, accentBorder }: { q: string; a: string; accentColor: string; accentBorder: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-xl overflow-hidden transition-all duration-300 cursor-pointer group ${
        open
          ? "border border-[--color-gold]/[0.18] bg-[#0d0d0d]"
          : "border border-[--color-gold]/[0.06] bg-[#080808] hover:border-[--color-gold]/[0.12] hover:bg-[#0a0a0a]"
      }`}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-start justify-between gap-4 p-5">
        {open && (
          <div
            className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5"
            style={{ background: `linear-gradient(to bottom, ${accentBorder}, transparent)` }}
          />
        )}
        <p className={`font-semibold text-sm text-left leading-relaxed flex-1 transition-colors ${open ? "text-white" : "text-[--color-silver-light] group-hover:text-white"}`}>{q}</p>
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${open ? "bg-[--color-gold]/[0.12]" : "bg-[--color-gold]/[0.04] group-hover:bg-[--color-gold]/[0.08]"}`}>
          {open
            ? <ChevronUp className="w-3.5 h-3.5 text-[--color-gold]" />
            : <ChevronDown className="w-3.5 h-3.5 text-[--color-silver-dark]/50" />}
        </div>
      </div>
      {open && (
        <div className="px-5 pb-5 pt-0">
          <div className="h-px bg-[--color-gold]/[0.06] mb-4" />
          <p className="text-[--color-silver-dark]/70 text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── CATEGORY PILL ───────────────────────────────────────────────────────────

function CategoryPill({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
        active
          ? "bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] text-[#0a0a0a] shadow-[0_0_12px_rgba(196,164,100,0.3)]"
          : "bg-[--color-gold]/[0.04] text-[--color-silver-dark]/60 hover:bg-[--color-gold]/[0.08] hover:text-[--color-silver] border border-[--color-gold]/[0.08]"
      }`}
    >
      <span className={active ? "text-[#0a0a0a]" : "text-[--color-gold-dark]"}>{icon}</span>
      {label}
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Help() {
  useSEO({ title: "Help & FAQ — WIZ AI", path: "/help", description: "Get answers to common questions about WIZ AI. Learn how to create videos, manage credits, troubleshoot builds, and more." });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const totalQuestions = FAQS.reduce((sum, cat) => sum + cat.questions.length, 0);

  return (
    <div className="min-h-screen bg-[#040404] text-white font-sans">
      <PublicNavBar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 h-[420px] pointer-events-none">
          <img
            src="/manus-storage/env-wizvideo-film-studio_b80ecab4.jpg"
            alt=""
            className="w-full h-full object-cover opacity-[0.12]"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(4,4,4,0.3) 0%, rgba(4,4,4,0.7) 60%, #040404 100%)' }} />
        </div>
        {/* Radial gold glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(196,164,100,0.08) 0%, transparent 70%)' }} />

        <div className="max-w-5xl mx-auto px-6 pt-28 pb-0 relative z-10">
          <BackButton className="mb-8" />

          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.15] bg-[--color-gold]/[0.04]">
              <BookOpen className="w-3.5 h-3.5 text-[--color-gold-dark]" />
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark]">Help Centre</span>
            </div>
          </div>

          {/* Headline */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-4 leading-[1.1]">
              How can we <span className="metallic-gold">help?</span>
            </h1>
            <p className="text-[--color-silver-dark]/55 text-lg max-w-xl mx-auto leading-relaxed">
              {totalQuestions} answers across {FAQS.length} topics. Search below or browse by product.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-2xl mx-auto mb-12">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-silver-dark]/40 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search questions, topics, or keywords…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setActiveCategory(null); }}
              className="w-full bg-[#0c0c0c] border border-[--color-gold]/[0.1] rounded-2xl pl-11 pr-10 py-4 text-white placeholder:text-[--color-silver-dark]/30 focus:outline-none focus:border-[--color-gold]/[0.25] focus:shadow-[0_0_0_3px_rgba(196,164,100,0.06)] transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[--color-silver-dark]/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── PRODUCT QUICK LINKS ──────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 mb-14">
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[--color-silver-dark]/30 mb-4 text-center">Browse by product</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {QUICK_LINKS.map((item) => (
            <Link key={item.name} href={item.href}>
              <div
                className="group p-4 rounded-2xl border transition-all cursor-pointer text-center hover:scale-[1.03] hover:shadow-[0_8px_32px_var(--glow)]"
                style={{
                  background: item.color,
                  borderColor: item.border.replace("0.3", "0.15"),
                  // @ts-ignore
                  "--glow": item.glow,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = item.border;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = item.border.replace("0.3", "0.15");
                }}
              >
                <img src={item.logo} alt={item.name} className="w-10 h-10 object-contain mx-auto mb-2.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
                <p className="text-white text-xs font-bold leading-tight mb-0.5">{item.name}</p>
                <p className="text-[--color-silver-dark]/40 text-[10px] leading-tight">{item.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pb-24">

        {/* Category filter pills */}
        {!searchQuery && (
          <div className="flex flex-wrap gap-2 mb-10 pb-6 border-b border-[--color-gold]/[0.06]">
            <CategoryPill
              label="All Topics"
              icon={<Star className="w-3 h-3" />}
              active={!activeCategory}
              onClick={() => setActiveCategory(null)}
            />
            {FAQS.map((cat) => (
              <CategoryPill
                key={cat.category}
                label={cat.category}
                icon={cat.icon}
                active={activeCategory === cat.category}
                onClick={() => setActiveCategory(activeCategory === cat.category ? null : cat.category)}
              />
            ))}
          </div>
        )}

        {/* Search result count */}
        {searchQuery && (
          <div className="mb-6 flex items-center gap-3">
            <p className="text-[--color-silver-dark]/50 text-sm">
              {displayFAQs.reduce((sum, cat) => sum + cat.questions.length, 0)} result{displayFAQs.reduce((sum, cat) => sum + cat.questions.length, 0) !== 1 ? "s" : ""} for <span className="text-white font-medium">"{searchQuery}"</span>
            </p>
            <button onClick={() => setSearchQuery("")} className="text-xs text-[--color-gold-dark] hover:text-[--color-gold] transition-colors underline underline-offset-2">Clear</button>
          </div>
        )}

        {/* FAQ sections */}
        {displayFAQs.length === 0 ? (
          <div className="text-center py-20 border border-[--color-gold]/[0.06] rounded-2xl bg-[#080808]">
            <Search className="w-10 h-10 text-[--color-silver-dark]/20 mx-auto mb-4" />
            <p className="text-[--color-silver-dark]/60 text-base font-medium mb-2">No results for "{searchQuery}"</p>
            <p className="text-[--color-silver-dark]/30 text-sm mb-6">Try a different search term or browse by category above</p>
            <button
              onClick={() => setSearchQuery("")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.15] text-[--color-gold-dark] text-sm font-medium hover:bg-[--color-gold]/[0.12] transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {displayFAQs.map((cat) => (
              <div key={cat.category}>
                {/* Section header */}
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: cat.color, border: `1px solid ${cat.border}` }}
                  >
                    <span style={{ color: cat.border.replace("0.3", "1").replace("0.25", "1") }}>{cat.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight">{cat.category}</h2>
                    <p className="text-[10px] text-[--color-silver-dark]/35 mt-0.5">{cat.questions.length} question{cat.questions.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-[--color-gold]/[0.08] to-transparent ml-2" />
                </div>
                <div className="space-y-2">
                  {cat.questions.map((item) => (
                    <FAQItem
                      key={item.q}
                      q={item.q}
                      a={item.a}
                      accentColor={cat.color}
                      accentBorder={cat.border}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── WIZ ENGINES STRIP ──────────────────────────────────────────── */}
        {!searchQuery && !activeCategory && (
          <div className="mt-16 rounded-2xl border border-[--color-gold]/[0.1] bg-[#080808] p-6 md:p-8">
            <div className="text-center mb-6">
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[--color-gold-dark] mb-2">Powering every creation</p>
              <h3 className="text-lg font-bold text-white">The WIZ Engines</h3>
              <p className="text-[--color-silver-dark]/40 text-sm mt-1">Four proprietary AI layers that run automatically on every export</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ENGINES.map((engine) => (
                <div key={engine.name} className="text-center group">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[--color-gold]/[0.06] border border-[--color-gold]/[0.1] flex items-center justify-center group-hover:border-[--color-gold]/[0.2] transition-all">
                    <img src={engine.logo} alt={engine.name} className="w-9 h-9 object-contain drop-shadow-[0_2px_8px_rgba(196,164,100,0.2)]" />
                  </div>
                  <p className="text-white text-xs font-bold">{engine.name}</p>
                  <p className="text-[--color-silver-dark]/35 text-[10px] mt-0.5">{engine.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SUPPORT SECTION ────────────────────────────────────────────── */}
        <div className="mt-16">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03] mb-4">
              <MessageCircle className="w-3.5 h-3.5 text-[--color-gold-dark]" />
              <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-[--color-gold-dark]">Still need help?</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">Our team is here for you</h2>
            <p className="text-[--color-silver-dark]/45 text-sm max-w-md mx-auto">Can't find what you're looking for? Reach out and we'll get back to you fast.</p>
          </div>

          {/* Support cards */}
          <div className="relative rounded-2xl overflow-hidden border border-[--color-gold]/[0.12] p-6 md:p-8">
            {/* Background */}
            <img src="/manus-storage/env-wizvideo-film-studio_b80ecab4.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.06]" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#b8892a]/[0.06] via-transparent to-transparent pointer-events-none" />

            <div className="relative grid md:grid-cols-3 gap-4">
              {/* Live Chat */}
              <div className="p-6 rounded-2xl bg-[#0a0a0a]/90 border border-[--color-gold]/[0.1] hover:border-[--color-gold]/[0.22] transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.15] flex items-center justify-center mb-4 group-hover:bg-[--color-gold]/[0.12] transition-all">
                  <MessageCircle className="w-6 h-6 text-[--color-gold]" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Live Chat</h3>
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 text-xs font-medium">Usually under 2 minutes</span>
                </div>
                <p className="text-[--color-silver-dark]/45 text-sm mb-5 leading-relaxed">Chat with our team in real time for instant answers.</p>
                <button
                  className="btn-primary btn-sheen w-full rounded-xl font-semibold h-10 text-sm flex items-center justify-center gap-2"
                  onClick={() => {
                    if (typeof window !== "undefined" && (window as any).$crisp) {
                      (window as any).$crisp.push(["do", "chat:open"]);
                    }
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Start Chat
                </button>
              </div>

              {/* Email Support */}
              <div className="p-6 rounded-2xl bg-[#0a0a0a]/90 border border-[--color-gold]/[0.1] hover:border-[--color-gold]/[0.22] transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.15] flex items-center justify-center mb-4 group-hover:bg-[--color-gold]/[0.12] transition-all">
                  <Mail className="w-6 h-6 text-[--color-gold]" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Email Support</h3>
                <div className="flex items-center gap-1.5 mb-3">
                  <Clock className="w-3 h-3 text-[--color-silver-dark]/40" />
                  <span className="text-[--color-silver-dark]/40 text-xs">Within 24 hours</span>
                </div>
                <p className="text-[--color-silver-dark]/45 text-sm mb-5 leading-relaxed">Send us a detailed message and we'll reply with a full answer.</p>
                <a
                  href="mailto:support@wiz-ai.io"
                  className="inline-flex items-center justify-center w-full h-10 rounded-xl border border-[--color-gold]/[0.15] bg-[--color-gold]/[0.06] text-[--color-silver] hover:bg-[--color-gold]/[0.12] hover:text-white transition-all text-sm font-medium gap-2"
                >
                  <Mail className="w-4 h-4" />
                  support@wiz-ai.io
                </a>
              </div>

              {/* Community */}
              <div className="p-6 rounded-2xl bg-[#0a0a0a]/90 border border-[--color-gold]/[0.1] hover:border-[--color-gold]/[0.22] transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.15] flex items-center justify-center mb-4 group-hover:bg-[--color-gold]/[0.12] transition-all">
                  <Shield className="w-6 h-6 text-[--color-gold]" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Policies & Legal</h3>
                <div className="flex items-center gap-1.5 mb-3">
                  <ExternalLink className="w-3 h-3 text-[--color-silver-dark]/40" />
                  <span className="text-[--color-silver-dark]/40 text-xs">Always available</span>
                </div>
                <p className="text-[--color-silver-dark]/45 text-sm mb-5 leading-relaxed">Review our policies, terms, and refund guarantee.</p>
                <div className="space-y-2">
                  <Link href="/privacy" className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-[--color-gold]/[0.04] border border-[--color-gold]/[0.08] text-[--color-silver-dark]/60 hover:text-white hover:border-[--color-gold]/[0.15] transition-all text-xs font-medium">
                    Privacy Policy <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link href="/terms" className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-[--color-gold]/[0.04] border border-[--color-gold]/[0.08] text-[--color-silver-dark]/60 hover:text-white hover:border-[--color-gold]/[0.15] transition-all text-xs font-medium">
                    Terms of Service <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link href="/refund-policy" className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-[--color-gold]/[0.04] border border-[--color-gold]/[0.08] text-[--color-silver-dark]/60 hover:text-white hover:border-[--color-gold]/[0.15] transition-all text-xs font-medium">
                    Refund Policy <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[--color-gold]/[0.06] bg-[#030303] py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
            <NavLink href="/">
              <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[3.6rem] w-auto object-contain drop-shadow-[0_0_8px_rgba(196,164,100,0.1)]" />
            </NavLink>
            <div className="flex items-center gap-5 text-xs text-[--color-silver-dark]/30">
              <Link href="/privacy" className="hover:text-[--color-gold-dark] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-[--color-gold-dark] transition-colors">Terms of Service</Link>
              <Link href="/refund-policy" className="hover:text-[--color-gold-dark] transition-colors">Refund Policy</Link>
              <Link href="/pricing" className="hover:text-[--color-gold-dark] transition-colors">Pricing</Link>
            </div>
          </div>
          <div className="text-center text-xs text-[--color-silver-dark]/20">
            © {new Date().getFullYear()} WIZ AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
