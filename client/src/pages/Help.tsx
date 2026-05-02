import { WIZANIMATE_PRODUCT_PAGE, WIZAUDIO_STUDIO_PAGE, WIZIMAGE_STUDIO_PAGE, WIZSHORTS_STUDIO_PAGE, WIZSCRIPT_STUDIO_PAGE, WIZVIDEO_STUDIO_PAGE } from "@/lib/routes";
import { useState, useRef } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";
import { NavLink } from "@/components/NavLink";
import BackButton from "@/components/BackButton";
import {
  ChevronDown, ChevronUp, MessageCircle, Mail,
  Zap, Music, Video, Baby, Bot, Search, X,
  CreditCard, Shield, Headphones, Image, FileText, Globe,
  Clock, BookOpen, ExternalLink, AlertCircle
} from "@/lib/icons";
import PublicNavBar from "@/components/PublicNavBar";

const CDN = "/manus-storage";
const WIZAI_LOGO        = `${CDN}/wizai-logo-premium-transparent_ff33f09f_72ea7f44.webp`;
const LOGO_WIZVIDEO     = `${CDN}/wizvideo-logo-v1_9ec37e45.png`;
const LOGO_WIZAUDIO     = `${CDN}/wizaudio-logo-v1_f428aad0.png`;
const LOGO_WIZIMAGE     = `${CDN}/wizimage-logo-v1_83c86e5c.png`;
const LOGO_WIZSHORTS    = `${CDN}/wizshorts-logo-v1_533db978.png`;
const LOGO_WIZSCRIPT    = `${CDN}/wizscript-logo-v1_c6af5345.png`;
const LOGO_WIZANIMATE   = `${CDN}/wizanimate-logo-new_a84f9808.png`;
const LOGO_WIZCREATE    = `${CDN}/wizcreate-logo-new_85a25756.png`;
const LOGO_WIZSOUND     = `${CDN}/wizsound-logo-new_c5cced65.png`;
const LOGO_WIZLUMINA    = `${CDN}/wizlumina-logo-new_0709f3c5.png`;
const LOGO_WIZBOOST     = `${CDN}/wizboost-logo-new_93f2b48b.png`;
const LOGO_WIZGENESIS   = `${CDN}/wizgenesis-logo-new_9814b3d1.png`;

// Background images for product cards
const BG_WIZVIDEO   = `${CDN}/env-wizvideo-film-studio_b80ecab4.jpg`;
const BG_WIZAUDIO   = `${CDN}/card-wizaudio-v2_ba9bb3e1.jpg`;
const BG_WIZIMAGE   = `${CDN}/card-image-generation_155efafb.jpg`;
const BG_WIZSHORTS  = `${CDN}/hero-wizshorts_83e4e17d.jpg`;
const BG_WIZSCRIPT  = `${CDN}/hero-wizscript_d5f3a63d.jpg`;
const BG_WIZANIMATE = `${CDN}/hero-wizanimate_75dad3b8.jpg`;
const BG_PRICING    = `${CDN}/pricing-hero-bg_7e23edd2.jpg`;

// ─── FAQ DATA ────────────────────────────────────────────────────────────────
const FAQS = [
  {
    category: "Getting Started",
    icon: <Zap className="w-4 h-4" />,
    accent: "#f59e0b",
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
    accent: "#3b82f6",
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
    accent: "#8b5cf6",
    questions: [
      { q: "What is WizScript?", a: "WizScript is WIZ AI's text-to-video engine. Enter any idea, topic, or script and WizScript generates a full video — voiceover, visuals, captions, and music — automatically." },
      { q: "What types of videos can I create with WizScript?", a: "WizScript supports explainer videos, product demos, social media content, news summaries, educational videos, and more. It works for any topic or industry." },
      { q: "How long can WizScript videos be?", a: "WizScript videos can be up to 10 minutes long. Longer videos consume more Build Credits." },
    ],
  },
  {
    category: "WizAudio — AI Music & Audio",
    icon: <Headphones className="w-4 h-4" />,
    accent: "#10b981",
    questions: [
      { q: "What is WizAudio?", a: "WizAudio is WIZ AI's AI music and audio generation engine. It creates original, royalty-free music tracks in any genre, style, or mood — ready to use in your videos or download as standalone tracks." },
      { q: "What genres and styles does WizAudio support?", a: "WizAudio supports over 50 genres including Pop, Hip-Hop, Rock, Electronic, Classical, Jazz, Cinematic, Lo-Fi, and more. You can also describe a custom mood or style in plain language." },
      { q: "Can I use WizAudio tracks in my videos?", a: "Yes. Any track generated by WizAudio is royalty-free and can be used in your WIZ AI videos or downloaded for use on any platform." },
      { q: "Does WizAudio apply WizSound mastering?", a: "Yes. Every WizAudio track is automatically mastered by WizSound™, our proprietary audio enhancement engine, ensuring broadcast-quality output." },
    ],
  },
  {
    category: "WizImage — AI Image Creation",
    icon: <Image className="w-4 h-4" />,
    accent: "#c4a464",
    questions: [
      { q: "What is WizImage?", a: "WizImage is WIZ AI's AI image generation engine. Describe any scene, character, or concept and WizImage creates a high-resolution image in seconds." },
      { q: "What image styles are available?", a: "WizImage supports Photorealistic, Cinematic, Anime, 3D Render, Illustration, Watercolour, and more. You can also describe a custom style." },
      { q: "Can I use WizImage to create characters for my videos?", a: "Yes. WizImage-generated characters can be uploaded as character references in WizVideo and WizAnimate for consistent visual identity across your videos." },
      { q: "How many images can I generate?", a: "Each image generation costs 1 Build Credit. The number of images you can generate depends on your plan's monthly Build Credit allowance." },
    ],
  },
  {
    category: "WizShorts — Short-Form Content",
    icon: <Video className="w-4 h-4" />,
    accent: "#f97316",
    questions: [
      { q: "What is WizShorts?", a: "WizShorts creates vertical short-form videos optimised for TikTok, Instagram Reels, and YouTube Shorts. Enter a topic or script and WizShorts generates a complete short video with captions, music, and visuals." },
      { q: "How long can WizShorts videos be?", a: "WizShorts videos are between 15 seconds and 3 minutes long — optimised for short-form platforms." },
      { q: "Can I add captions to WizShorts?", a: "Yes. WizShorts automatically generates animated captions synced to the voiceover. You can customise the caption style, font, and position." },
    ],
  },
  {
    category: "WizAnimate — AI Animation",
    icon: <Bot className="w-4 h-4" />,
    accent: "#a855f7",
    questions: [
      { q: "What is WizAnimate?", a: "WizAnimate creates AI-powered animated videos. Describe your characters and story, and WizAnimate generates a full animated video with consistent characters, backgrounds, and motion." },
      { q: "What animation styles does WizAnimate support?", a: "WizAnimate supports 2D Cartoon, Anime, 3D Animation, Claymation, and Storybook styles." },
      { q: "Does WizAnimate support character consistency?", a: "Yes. WizAnimate uses character reference images to maintain consistent character appearance across all scenes in your animated video." },
    ],
  },
  {
    category: "Kids Content",
    icon: <Baby className="w-4 h-4" />,
    accent: "#ec4899",
    questions: [
      { q: "Can I create kids videos and animations?", a: "Yes. WIZ AI has a dedicated Kids mode available through WizAnimate. It uses child-safe prompts, bright storybook visuals, and age-appropriate content filters." },
      { q: "Is the content safe for children?", a: "All Kids mode outputs are filtered for age-appropriate content. WIZ AI does not generate violent, adult, or inappropriate content in Kids mode." },
    ],
  },
  {
    category: "Billing & Credits",
    icon: <CreditCard className="w-4 h-4" />,
    accent: "#c4a464",
    questions: [
      { q: "How does the credit system work?", a: "WIZ AI uses Build Credits. Each Build Credit = one video build or image generation. Storyboard generation is always free. Credits are included in your monthly plan and can also be purchased as one-off top-up packs." },
      { q: "What is WizSound?", a: "WizSound™ is our proprietary audio mastering engine. It automatically enhances every audio track in your video — balancing levels, reducing noise, and applying cinematic EQ. It runs automatically on every build at no extra cost." },
      { q: "What plans are available?", a: "WIZ AI offers Starter (£9/mo), Creator (£35/mo), and Studio (£99/mo) plans. All plans include monthly Build Credits, with higher plans offering more credits, faster build speeds, and higher output quality. Annual billing saves up to 30%." },
      { q: "Do unused Build Credits roll over?", a: "Monthly subscription credits do not roll over. Top-up pack credits never expire." },
      { q: "Can I cancel my subscription?", a: "Yes. You can cancel at any time from your account settings. You'll retain access to your plan until the end of the current billing period." },
      { q: "What payment methods do you accept?", a: "WIZ AI accepts all major credit and debit cards (Visa, Mastercard, Amex), Apple Pay, and Google Pay via Stripe." },
    ],
  },
  {
    category: "Technical Issues",
    icon: <AlertCircle className="w-4 h-4" />,
    accent: "#ef4444",
    questions: [
      { q: "Why is my video not generating?", a: "Check your Build Credit balance first. If you have credits, try refreshing the page and restarting the build. If the issue persists, contact support via live chat." },
      { q: "My video quality looks low — what can I do?", a: "Ensure you selected the highest quality option available on your plan. Studio plan subscribers have access to 4K output. If quality still looks low, check that your source audio is high quality (320kbps MP3 or WAV)." },
      { q: "How do I download my video?", a: "Once your video is ready, go to Render History and click the Download button next to your completed video. Videos are available in MP4 format." },
      { q: "I'm getting an error message — what should I do?", a: "Note the exact error message and contact support via live chat or email. Include your account email and the error message for fastest resolution." },
      { q: "My audio upload is failing — what file sizes are supported?", a: "Audio files must be under 50MB. Supported formats are MP3, WAV, M4A, and OGG. If your file is larger, compress it using a free tool like Audacity before uploading." },
    ],
  },
  {
    category: "WIZ Engines",
    icon: <Zap className="w-4 h-4" />,
    accent: "#f59e0b",
    questions: [
      { q: "What are the WIZ Engines?", a: "The WIZ Engines are four proprietary AI layers that automatically enhance every video and audio output on the platform: WizGenesis™ (core AI intelligence), WizSound™ (audio mastering), WizLumina™ (visual enhancement), and WizBoost™ (output optimisation)." },
      { q: "What does WizGenesis™ do?", a: "WizGenesis™ is the core AI intelligence engine. It interprets your input, generates the storyboard, directs the visual style, and coordinates all other engines to produce a coherent final output." },
      { q: "What does WizSound™ do?", a: "WizSound™ is our audio mastering engine. It automatically balances levels, reduces noise, applies cinematic EQ, and enhances the overall audio quality of every video build." },
      { q: "What does WizLumina™ do?", a: "WizLumina™ is our visual enhancement engine. It applies colour grading, sharpening, and cinematic tone-mapping to every frame of your video for a premium, broadcast-quality look." },
      { q: "What does WizBoost™ do?", a: "WizBoost™ is our output optimisation engine. It compresses and optimises your final video for the best balance of quality and file size, ensuring fast downloads and smooth playback on any device." },
    ],
  },
  {
    category: "WizCreate™ & Storyboard",
    icon: <BookOpen className="w-4 h-4" />,
    accent: "#c4a464",
    questions: [
      { q: "What is WizCreate™?", a: "WizCreate™ is the AI storyboard and scene-building engine at the heart of WIZ AI. When you describe your idea, WizCreate™ generates a full visual storyboard — scenes, characters, and direction — in seconds. It powers every product on the platform." },
      { q: "Can I edit my storyboard before building?", a: "Yes. After WizCreate™ generates your storyboard, you can review every scene, swap images, edit text, change styles, and reorder scenes before committing to build. You are always in control." },
      { q: "How many scenes can a storyboard have?", a: "Storyboards can have up to 30 scenes. For music videos, the number of scenes is determined by the number of lyric lines or sections in your audio." },
      { q: "Is storyboard generation really free?", a: "Yes — completely free, no credit card required. WizCreate™ generates your full storyboard at no cost. You only pay when you're ready to build and download the final video." },
    ],
  },
];

// ─── PRODUCT CARDS ────────────────────────────────────────────────────────────
const PRODUCTS = [
  { logo: LOGO_WIZVIDEO,   name: "WizVideo",   label: "Music Videos",     href: WIZVIDEO_STUDIO_PAGE,    bg: BG_WIZVIDEO,   gradient: "from-blue-600/80 to-blue-900/90" },
  { logo: LOGO_WIZAUDIO,   name: "WizAudio",   label: "AI Music",         href: WIZAUDIO_STUDIO_PAGE,    bg: BG_WIZAUDIO,   gradient: "from-emerald-600/80 to-emerald-900/90" },
  { logo: LOGO_WIZIMAGE,   name: "WizImage",   label: "AI Images",        href: WIZIMAGE_STUDIO_PAGE,    bg: BG_WIZIMAGE,   gradient: "from-amber-600/80 to-amber-900/90" },
  { logo: LOGO_WIZSHORTS,  name: "WizShorts",  label: "Short-Form Video", href: WIZSHORTS_STUDIO_PAGE,   bg: BG_WIZSHORTS,  gradient: "from-orange-600/80 to-orange-900/90" },
  { logo: LOGO_WIZSCRIPT,  name: "WizScript",  label: "Text-to-Video",    href: WIZSCRIPT_STUDIO_PAGE,   bg: BG_WIZSCRIPT,  gradient: "from-violet-600/80 to-violet-900/90" },
  { logo: LOGO_WIZANIMATE, name: "WizAnimate", label: "AI Animation",     href: WIZANIMATE_PRODUCT_PAGE, bg: BG_WIZANIMATE, gradient: "from-purple-600/80 to-purple-900/90" },
];

// ─── ENGINE LOGOS ─────────────────────────────────────────────────────────────
const ENGINES = [
  { logo: LOGO_WIZGENESIS, name: "WizGenesis™", desc: "Core intelligence",     color: "#ef4444" },
  { logo: LOGO_WIZSOUND,   name: "WizSound™",   desc: "Audio mastering",       color: "#10b981" },
  { logo: LOGO_WIZLUMINA,  name: "WizLumina™",  desc: "Visual enhancement",    color: "#8b5cf6" },
  { logo: LOGO_WIZBOOST,   name: "WizBoost™",   desc: "Output optimisation",   color: "#f97316" },
];

// ─── FAQ ITEM ─────────────────────────────────────────────────────────────────
function FAQItem({ q, a, accent }: { q: string; a: string; accent: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${
        open
          ? "bg-white/[0.07] border-2 shadow-lg"
          : "bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] hover:border-white/20"
      }`}
      style={open ? { borderColor: accent, boxShadow: `0 0 20px ${accent}22` } : {}}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-start justify-between gap-4 p-5">
        {open && (
          <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{ background: accent }} />
        )}
        <p className={`font-semibold text-sm text-left leading-relaxed flex-1 ${open ? "text-white" : "text-white/80 hover:text-white"}`}>{q}</p>
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
          style={open ? { background: accent + "33" } : { background: "rgba(255,255,255,0.08)" }}
        >
          {open
            ? <ChevronUp className="w-4 h-4 text-white" />
            : <ChevronDown className="w-4 h-4 text-white/60" />}
        </div>
      </div>
      {open && (
        <div className="px-6 pb-5 pt-0">
          <div className="h-px bg-white/10 mb-4" />
          <p className="text-white/70 text-sm leading-relaxed">{a}</p>
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
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border ${
        active
          ? "bg-[#c4a464] text-black border-[#c4a464] shadow-lg shadow-[#c4a464]/30"
          : "bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40"
      }`}
    >
      <span>{icon}</span>
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

  const totalQuestions = FAQS.reduce((sum, cat) => sum + cat.questions.length, 0);

  const filteredFAQs = FAQS.map(cat => ({
    ...cat,
    questions: cat.questions.filter(item => {
      const matchesSearch = !searchQuery || item.q.toLowerCase().includes(searchQuery.toLowerCase()) || item.a.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !activeCategory || cat.category === activeCategory;
      return matchesSearch && matchesCategory;
    }),
  })).filter(cat => cat.questions.length > 0);

  const totalFiltered = filteredFAQs.reduce((sum, cat) => sum + cat.questions.length, 0);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <PublicNavBar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden pt-20">
        {/* Background */}
        <div className="absolute inset-0 h-[500px] pointer-events-none">
          <img src={BG_PRICING} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,8,8,0.2) 0%, rgba(8,8,8,0.6) 60%, #080808 100%)" }} />
        </div>
        {/* Gold glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(196,164,100,0.18) 0%, transparent 70%)" }} />

        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white/80 mb-6 backdrop-blur-sm">
            <BookOpen className="w-3.5 h-3.5 text-[#c4a464]" />
            HELP CENTRE
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4 leading-tight">
            How can we <span style={{ background: "linear-gradient(135deg, #f2dfa0, #c4a464, #8a6020)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>help?</span>
          </h1>
          <p className="text-white/60 text-lg mb-8">
            {totalQuestions} answers across {FAQS.length} topics. Search below or browse by product.
          </p>

          {/* Search bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search questions, topics, or keywords…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-14 pr-12 rounded-2xl bg-white/10 border-2 border-white/20 text-white placeholder-white/40 text-base font-medium focus:outline-none focus:border-[#c4a464] focus:bg-white/[0.12] transition-all backdrop-blur-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all">
                <X className="w-3.5 h-3.5 text-white/70" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── PRODUCT QUICK LINKS ───────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 pb-10">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4 text-center">Browse by product</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {PRODUCTS.map(p => (
            <a
              key={p.name}
              href={p.href}
              className="group relative rounded-2xl overflow-hidden aspect-[4/3] flex flex-col items-center justify-end p-3 transition-all hover:scale-[1.03] hover:shadow-2xl"
            >
              {/* Background image */}
              <img src={p.bg} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${p.gradient}`} />
              {/* Logo */}
              <div className="relative z-10 flex flex-col items-center gap-1.5">
                <img src={p.logo} alt={p.name} className="h-8 w-auto object-contain drop-shadow-lg" />
                <span className="text-white/80 text-[10px] font-semibold tracking-wide">{p.label}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ── CATEGORY FILTER PILLS ─────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 pb-8">
        <div className="flex flex-wrap gap-2">
          <CategoryPill
            label="All Topics"
            icon={<Globe className="w-3.5 h-3.5" />}
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          />
          {FAQS.map(cat => (
            <CategoryPill
              key={cat.category}
              label={cat.category}
              icon={cat.icon}
              active={activeCategory === cat.category}
              onClick={() => setActiveCategory(activeCategory === cat.category ? null : cat.category)}
            />
          ))}
        </div>
      </div>

      {/* ── FAQ SECTIONS ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        {searchQuery && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white/60 text-sm">
            {totalFiltered > 0
              ? <><span className="text-white font-semibold">{totalFiltered}</span> result{totalFiltered !== 1 ? "s" : ""} for "<span className="text-[#c4a464]">{searchQuery}</span>"</>
              : <>No results for "<span className="text-[#c4a464]">{searchQuery}</span>" — try different keywords or <button onClick={() => setSearchQuery("")} className="underline text-white/80 hover:text-white">clear search</button></>
            }
          </div>
        )}

        {filteredFAQs.length === 0 && !searchQuery && (
          <div className="text-center py-16 text-white/40">No questions in this category.</div>
        )}

        <div className="space-y-10">
          {filteredFAQs.map(cat => (
            <div key={cat.category}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: cat.accent + "22", border: `1.5px solid ${cat.accent}55` }}
                >
                  <span style={{ color: cat.accent }}>{cat.icon}</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{cat.category}</h2>
                  <p className="text-white/40 text-xs">{cat.questions.length} question{cat.questions.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex-1 h-px bg-white/10 ml-2" />
              </div>
              {/* FAQ items */}
              <div className="space-y-2">
                {cat.questions.map((item, i) => (
                  <FAQItem key={i} q={item.q} a={item.a} accent={cat.accent} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── WIZ ENGINES STRIP ─────────────────────────────────────────────── */}
      <div className="border-t border-white/10 bg-white/[0.03]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2 text-center">Powering every creation</p>
          <h2 className="text-2xl font-bold text-white text-center mb-8">The WIZ Engines</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {ENGINES.map(eng => (
              <div
                key={eng.name}
                className="rounded-2xl p-5 flex flex-col items-center text-center border transition-all hover:scale-[1.02]"
                style={{ background: eng.color + "12", borderColor: eng.color + "33" }}
              >
                <img src={eng.logo} alt={eng.name} className="h-14 w-auto object-contain mb-3 drop-shadow-lg" />
                <p className="text-white font-bold text-sm mb-1">{eng.name}</p>
                <p className="text-white/50 text-xs">{eng.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SUPPORT SECTION ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-t border-white/10">
        {/* Background */}
        <img src={BG_WIZVIDEO} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(196,164,100,0.08) 0%, rgba(8,8,8,0.85) 60%)" }} />

        <div className="relative max-w-6xl mx-auto px-6 py-16 text-center">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-2">Still need help?</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Our team is here for you</h2>
          <p className="text-white/50 text-base mb-10 max-w-xl mx-auto">Can't find what you're looking for? Reach out and we'll get back to you fast.</p>

          <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {/* Live Chat */}
            <div className="rounded-2xl p-6 bg-white/[0.08] border border-white/20 hover:bg-white/[0.12] hover:border-white/30 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4 mx-auto">
                <MessageCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-white font-bold text-base mb-1">Live Chat</h3>
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-semibold">Usually under 2 minutes</span>
              </div>
              <p className="text-white/55 text-sm mb-5 leading-relaxed">Chat with our team in real time for instant answers.</p>
              <button
                onClick={() => { const el = document.querySelector("[data-crisp-chat]") as HTMLElement; if (el) el.click(); }}
                className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Start Chat
              </button>
            </div>

            {/* Email Support */}
            <div className="rounded-2xl p-6 bg-white/[0.08] border border-white/20 hover:bg-white/[0.12] hover:border-white/30 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-[#c4a464]/20 border border-[#c4a464]/40 flex items-center justify-center mb-4 mx-auto">
                <Mail className="w-6 h-6 text-[#c4a464]" />
              </div>
              <h3 className="text-white font-bold text-base mb-1">Email Support</h3>
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <Clock className="w-3 h-3 text-white/40" />
                <span className="text-white/50 text-xs">Within 24 hours</span>
              </div>
              <p className="text-white/55 text-sm mb-5 leading-relaxed">Send us a detailed message and we'll reply with a full answer.</p>
              <a
                href="mailto:support@wiz-ai.io"
                className="w-full h-10 rounded-xl bg-[#c4a464] hover:bg-[#e8c878] text-black font-semibold text-sm transition-all shadow-lg shadow-[#c4a464]/30 flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                support@wiz-ai.io
              </a>
            </div>

            {/* Policies */}
            <div className="rounded-2xl p-6 bg-white/[0.08] border border-white/20 hover:bg-white/[0.12] hover:border-white/30 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mb-4 mx-auto">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-white font-bold text-base mb-1">Policies & Legal</h3>
              <div className="flex items-center justify-center gap-1.5 mb-3">
                <ExternalLink className="w-3 h-3 text-white/40" />
                <span className="text-white/50 text-xs">Always available</span>
              </div>
              <p className="text-white/55 text-sm mb-5 leading-relaxed">Review our policies, terms, and refund guarantee.</p>
              <div className="space-y-2">
                <Link href="/privacy" className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white/70 hover:text-white hover:bg-white/15 transition-all text-xs font-medium">
                  Privacy Policy <ExternalLink className="w-3 h-3" />
                </Link>
                <Link href="/terms" className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white/70 hover:text-white hover:bg-white/15 transition-all text-xs font-medium">
                  Terms of Service <ExternalLink className="w-3 h-3" />
                </Link>
                <Link href="/refund-policy" className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white/70 hover:text-white hover:bg-white/15 transition-all text-xs font-medium">
                  Refund Policy <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-[#030303] py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-6">
            <NavLink href="/">
              <img src={WIZAI_LOGO} alt="WIZ AI" className="h-14 w-auto object-contain" />
            </NavLink>
            <div className="flex items-center gap-5 text-xs text-white/40">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            </div>
          </div>
          <div className="text-center text-xs text-white/25">
            © {new Date().getFullYear()} WIZ AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
