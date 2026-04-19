import { useState, useEffect } from "react";
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

const WIZAI_LOGO = "/manus-storage/wizai-logo-premium-transparent_ac3f550b.png";

const HELP_NAV_PRODUCTS = [
  { name: "WizAudio", label: "Create Audio", icon: <Music2 className="w-5 h-5" />, href: "/music-creator" },
  { name: "WizImage", label: "Create Images", icon: <Image className="w-5 h-5" />, href: "/wiz-image" },
  { name: "WizVideo", label: "Create Videos", icon: <Film className="w-5 h-5" />, href: "/music-video/create" },
  { name: "WizShorts", label: "Create Shorts", icon: <Zap className="w-5 h-5" />, href: "/wiz-shorts" },
  { name: "WizAnimate", label: "Create Animation", icon: <Wand2 className="w-5 h-5" />, href: "/kids-video" },
  { name: "WizScript", label: "Create from Text", icon: <FileText className="w-5 h-5" />, href: "/text-to-video" },
];

function HelpNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#060606]/95 backdrop-blur-2xl border-b border-[--color-gold]/[0.06] shadow-[0_1px_40px_rgba(0,0,0,0.6)]"
            : "bg-[#040404]/90 backdrop-blur-xl border-b border-[--color-gold]/[0.06]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <a href="/" className="flex items-center flex-shrink-0 hover:opacity-90 transition-opacity">
            <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[4.275rem] w-auto object-contain drop-shadow-[0_0_12px_rgba(196,164,100,0.15)]" loading="eager" decoding="async" />
          </a>

          <div className="hidden md:flex items-center gap-1">
            <a href="/" className="nav-link">Home</a>
            <div
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button className="nav-link flex items-center gap-1">
                Products <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${productsOpen ? "rotate-180" : ""}`} />
              </button>
              {productsOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-[#0a0a0a]/98 backdrop-blur-2xl border border-[--color-gold]/[0.08] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] p-2 z-50">
                  {HELP_NAV_PRODUCTS.map((p) => (
                    <a
                      key={p.name}
                      href={p.href}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-[--color-gold]/[0.04] transition-colors group"
                    >
                      <span className="text-[--color-silver] opacity-60 group-hover:text-[--color-gold] group-hover:opacity-100 transition-all">{p.icon}</span>
                      <div>
                        <p className="text-[13px] font-semibold text-[--color-gold-light] group-hover:text-[--color-gold]">{p.name}</p>
                        <p className="text-[11px] text-[--color-silver-dark]/50 mt-0.5 leading-tight">{p.label}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
            <a href="/pricing" className="nav-link">Pricing</a>
            <a href="/help" className="nav-link text-[--color-gold]">Help</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <a href="/dashboard" className="btn-primary-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Dashboard
              </a>
            ) : (
              <>
                <a href={getLoginUrl()} className="text-[13px] text-[--color-silver-dark] hover:text-[--color-silver-light] transition-colors font-medium px-3 py-2">
                  Sign in
                </a>
                <a href="/onboarding" className="btn-primary-sm">
                  Start Creating
                </a>
              </>
            )}
          </div>

          <button
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[--color-gold]/[0.04] transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5 text-[--color-silver]" /> : <Menu className="w-5 h-5 text-[--color-silver]" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="absolute top-[72px] left-0 right-0 bg-[#0a0a0a]/98 backdrop-blur-2xl border-b border-[--color-gold]/[0.06] shadow-[0_16px_60px_rgba(0,0,0,0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-5 flex flex-col gap-1">
              <a href="/" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Home</a>
              <div className="mt-2 pt-2 border-t border-[--color-gold]/[0.06]">
                <p className="text-[10px] text-[--color-gold-dark]/40 font-bold uppercase tracking-[0.2em] px-4 py-2">Products</p>
                {HELP_NAV_PRODUCTS.map((p) => (
                  <a
                    key={p.name}
                    href={p.href}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-[--color-gold]/[0.04] transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="text-[--color-silver-dark]">{p.icon}</span>
                    <span className="text-[14px] font-semibold text-[--color-gold-light]">{p.name}</span>
                  </a>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-[--color-gold]/[0.06]">
                <a href="/pricing" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>Pricing</a>
                <a href="/help" className="mobile-nav-link text-[--color-gold]" onClick={() => setMobileOpen(false)}>Help</a>
              </div>
              <div className="mt-3 pt-3 border-t border-[--color-gold]/[0.08] flex flex-col gap-2">
                {isAuthenticated ? (
                  <a href="/dashboard" className="btn-primary-mobile" onClick={() => setMobileOpen(false)}>
                    <Sparkles className="w-4 h-4" /> Dashboard
                  </a>
                ) : (
                  <>
                    <a href={getLoginUrl()} className="text-center text-sm text-[--color-silver-dark] hover:text-[--color-silver-light] py-2.5 transition-colors" onClick={() => setMobileOpen(false)}>Sign in</a>
                    <a href="/onboarding" className="btn-primary-mobile" onClick={() => setMobileOpen(false)}>Start Creating</a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const FAQS = [
  {
    category: "Getting Started",
    icon: <Zap className="w-4 h-4" />,
    questions: [
      { q: "How do I create my first video?", a: "Choose WizVideo for music videos or WizScript for any other video. Upload your audio or enter your idea, pick a visual style, then click Generate. Your video will be ready in minutes." },
      { q: "Do I need any editing skills?", a: "No \u2014 WIZ AI is fully automated. The AI handles everything from storyboard creation to final rendering. You just provide the input and choose a style." },
      { q: "How long does it take to generate a video?", a: "Most videos are created within 2\u20135 minutes depending on length and complexity. You'll see a live progress bar while your video is being generated." },
      { q: "Is there a free option?", a: "Yes. WIZ AI is completely free to use \u2014 no credit card required. Storyboard generation is always free. You only pay when you're ready to render and download your finished video." },
    ],
  },
  {
    category: "WizVideo \u2014 Music Videos",
    icon: <Music className="w-4 h-4" />,
    questions: [
      { q: "What audio formats does WizVideo support?", a: "WizVideo supports MP3, WAV, M4A, and OGG audio files up to 50MB. For best results, use a high-quality stereo audio file." },
      { q: "How does lyrics-driven video generation work?", a: "WizVideo automatically transcribes your song lyrics using AI. Each lyric line is mapped to a visual scene, creating a video that perfectly syncs with your music. You can also paste lyrics manually." },
      { q: "Can I add characters to my music video?", a: "Yes. WizVideo supports up to 4 characters per video. Each character can have multiple reference images for visual consistency, and singing characters get AI lip-sync applied automatically." },
      { q: "What video styles are available?", a: "WizVideo offers a range of cinematic styles including Cinematic, Anime, 3D Animation, Documentary, Abstract, and Vintage." },
    ],
  },
  {
    category: "WizScript \u2014 AI Video Creator",
    icon: <Video className="w-4 h-4" />,
    questions: [
      { q: "What is WizScript?", a: "WizScript converts a plain-text idea into a fully structured video script and storyboard. Define your concept, and WIZ AI generates the scenes, dialogue, and visual direction automatically." },
      { q: "What types of videos can I create with WizScript?", a: "Anything \u2014 YouTube content, social media videos, ads, explainer videos, short films, product showcases, and more." },
    ],
  },
  {
    category: "WizAudio \u2014 AI Music & Audio",
    icon: <Music className="w-4 h-4" />,
    questions: [
      { q: "What is WizAudio?", a: "WizAudio is WIZ AI’s music creation engine. Describe the genre, mood, and style — WizAudio generates a full original track, complete with vocals, instrumentation, and mastering, ready to use in your video projects." },
      { q: "What genres and styles does WizAudio support?", a: "WizAudio supports a wide range of genres including pop, hip-hop, R&B, electronic, cinematic, lo-fi, jazz, classical, and more. You can describe any style in natural language." },
      { q: "Can I use WizAudio tracks in my videos?", a: "Yes. WizAudio tracks are fully compatible with WizVideo and WizScript. Generate your track in WizAudio, then use it as the audio input for your video." },
      { q: "Does WizAudio apply WizSound mastering?", a: "Yes. WizSound audio mastering is available as an optional add-on when you export your WizAudio track \u2014 WizSound Active (+\u00a31) or WizSound Spatial (+\u00a33) for cinema-grade immersive audio." },
    ],
  },
  {
    category: "WizImage \u2014 AI Image Creation",
    icon: <Zap className="w-4 h-4" />,
    questions: [
      { q: "What is WizImage?", a: "WizImage generates high-resolution, cinematic-quality images from text prompts. Use it to create visual assets, concept art, scene stills, or promotional imagery — all in seconds." },
      { q: "What image styles are available?", a: "WizImage supports photorealistic, cinematic, anime, 3D render, oil painting, watercolour, concept art, and many more styles. You can also upload a reference image to guide the style." },
      { q: "Can I use WizImage to create characters for my videos?", a: "Yes. WizImage is the recommended way to create character reference images for WizVideo. Generate your character in WizImage, then upload the image as a character reference in WizVideo for consistent appearance across scenes." },
      { q: "How many images can I generate?", a: "Each image generation consumes one render credit. You can generate multiple variations and download your favourites." },
    ],
  },
  {
    category: "WizShorts \u2014 Short-Form Content",
    icon: <Zap className="w-4 h-4" />,
    questions: [
      { q: "What is WizShorts?", a: "WizShorts is built for social-first creators. Generate vertical short-form videos optimised for TikTok, Instagram Reels, and YouTube Shorts — with captions, pacing, and visual hooks built in." },
      { q: "How long can WizShorts videos be?", a: "WizShorts generates videos up to 60 seconds in length, formatted in 9:16 vertical aspect ratio for mobile-first platforms." },
      { q: "Can I add captions to WizShorts?", a: "Yes. WizShorts automatically generates and overlays captions synced to your audio. You can customise the caption style and font." },
    ],
  },
  {
    category: "WizAnimate \u2014 AI Animation",
    icon: <Zap className="w-4 h-4" />,
    questions: [
      { q: "What is WizAnimate?", a: "WizAnimate brings AI-generated characters and scenes to life. From lyric videos to animated explainers, WizAnimate adds motion, expression, and cinematic movement to your creative projects." },
      { q: "What animation styles does WizAnimate support?", a: "WizAnimate supports 3D Animation, Anime, Cartoon, Motion Graphics, and Claymation styles. You can mix styles across scenes for a unique look." },
      { q: "Does WizAnimate support character consistency?", a: "Yes. Character consistency is available on Creator, Pro, and Studio plans, ensuring your animated characters look the same across all scenes." },
    ],
  },
  {
    category: "Kids Content",
    icon: <Baby className="w-4 h-4" />,
    questions: [
      { q: "Can I create kids videos and animations?", a: "Absolutely. WIZ AI is ideal for kids content creators. Use the 3D Animation or Anime style for animated characters, or create nursery rhyme videos with WizVideo." },
      { q: "Is the content safe for children?", a: "Yes. WIZ AI's generation pipeline is configured to produce family-friendly content. All outputs are reviewed for appropriateness." },
    ],
  },
  {
    category: "Billing & Credits",
    icon: <Zap className="w-4 h-4" />,
    questions: [
      { q: "How does the credit system work?", a: "Creating your video is always free. You only pay when you render and download the final video. Choose your quality (Standard \u00A32 / HD \u00A34 / 4K \u00A36) and optionally add WizSound audio enhancement." },
      { q: "What is WizSound?", a: "WizSound is our proprietary audio enhancement engine. WizSound Enhanced (+\u00A31) adds stereo widening and frequency EQ for a polished, fuller sound. WizSound Cinematic (+\u00A33) applies our full mastering pipeline with immersive depth and dynamic range \u2014 recommended for music videos." },
      { q: "What plans are available?", a: "Free (trial credits, no card required), Starter (\u00A39/month, 2 renders, 720p), Basic (\u00A319/month, 5 renders, 1080p HD), Creator (£35/month, 15 renders, HD + 4K), Pro (\u00A359/month, 25 renders, 4K priority), and Studio (\u00A399/month, 50 renders, 4K + API). Storyboard generation is always free on all plans." },
      { q: "Can I cancel my subscription?", a: "Yes, cancel at any time from your Account settings. Your subscription remains active until the end of the billing period." },
      { q: "What payment methods do you accept?", a: "Visa, Mastercard, Amex, Apple Pay, and Google Pay via Stripe." },
    ],
  },
  {
    category: "Technical Issues",
    icon: <Bot className="w-4 h-4" />,
    questions: [
      { q: "Why is my video not generating?", a: "Check that your audio file is in a supported format (MP3, WAV, M4A) and under 50MB. If the issue persists, try refreshing the page. Contact support@wiz-ai.io if it continues." },
      { q: "My video quality looks low \u2014 what can I do?", a: "Make sure you're on the Creator or Studio plan for 1080p/4K export. Also ensure your input audio is high quality." },
      { q: "How do I download my video?", a: "Once your video is generated, click the Download button on the result screen. Videos are also saved to your Projects page for 30 days." },
      { q: "I'm getting an error message \u2014 what should I do?", a: "Try refreshing the page first. If the error persists, contact us at support@wiz-ai.io with a screenshot." },
    ],
  },
  {
    category: "WIZ Engines",
    icon: <Zap className="w-4 h-4" />,
    questions: [
      { q: "What are the WIZ Engines?", a: "The WIZ Engines are proprietary AI layers that automatically enhance every creation on the platform. They run in the background \u2014 you do not need to configure anything. Every export benefits from all four engines." },
      { q: "What does WizGenesis\u2122 do?", a: "WizGenesis\u2122 is the core intelligence engine. It orchestrates the entire creative workflow \u2014 from storyboard generation to scene composition to final render. It is the brain that makes everything work together." },
      { q: "What does WizSound\u2122 do?", a: "WizSound\u2122 is the premium audio engine. It enhances every audio track with richer depth, spatial clarity, and cinematic presence. WizSound Active adds stereo widening and EQ. WizSound Spatial applies the full mastering pipeline with immersive depth and dynamic range." },
      { q: "What does WizLumina\u2122 do?", a: "WizLumina\u2122 is the visual enhancement engine. It applies cinematic colour grading, HDR tone mapping, and film-level polish to every frame. Your visuals go from raw AI output to cinema-ready quality automatically." },
      { q: "What does WizBoost\u2122 do?", a: "WizBoost\u2122 is the output optimisation engine. It analyses your final render and applies intelligent upscaling, compression optimisation, and platform-specific formatting. Your content arrives publish-ready for YouTube, TikTok, Instagram, and beyond." },
    ],
  },
  {
    category: "WizCreate\u2122 & Storyboard",
    icon: <Zap className="w-4 h-4" />,
    questions: [
      { q: "What is WizCreate\u2122?", a: "WizCreate\u2122 is the AI storyboard and scene-building engine at the heart of WIZ AI. When you describe your idea, WizCreate\u2122 generates a full visual storyboard \u2014 scenes, characters, and direction \u2014 in seconds. It powers every product on the platform." },
      { q: "Can I edit my storyboard before rendering?", a: "Yes. After WizCreate\u2122 generates your storyboard, you can review every scene, swap images, edit text, change styles, and reorder scenes before committing to render. You are always in control." },
      { q: "How many scenes can a storyboard have?", a: "Storyboards can have up to 30 scenes. For music videos, the number of scenes is determined by the number of lyric lines or sections in your audio." },
    ],
  },
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
      <HelpNav />

      {/* Premium hero background */}
      <div className="relative">
        <div className="absolute inset-0 h-72 pointer-events-none overflow-hidden">
          <img src="/manus-storage/help-hero-bg_a1455798.jpg" alt="" className="w-full h-full object-cover opacity-[0.18]" />
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
            <img src="/manus-storage/help-hero-bg_a1455798.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.08]" />
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
