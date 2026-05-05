import { useState, useMemo } from "react";
import { Link } from "wouter";
import PublicNavBar from "@/components/PublicNavBar";
import { useSEO } from "@/hooks/useSEO";
import { ChevronDown, Search, MessageCircle, Mail, FileText, Zap, Music, Image, Film, Sparkles, Video, BookOpen, CreditCard, Settings, Star, Play } from "lucide-react";

const CDN = "/manus-storage";

// ── Product logos ────────────────────────────────────────────────────────────
const LOGOS = {
  wizvideo:  `${CDN}/wizvideo-logo-v1_9ec37e45.png`,
  wizaudio:  `${CDN}/wizaudio-logo-v1_f428aad0.png`,
  wizimage:  `${CDN}/wizimage-logo-v1_83c86e5c.png`,
  wizshorts: `${CDN}/wizshorts-logo-v1_533db978.png`,
  wizscript: `${CDN}/wizscript-logo-v1_c6af5345.png`,
  wizanimate:`${CDN}/wizanimate-logo-new_a84f9808.png`,
  wizgenesis:`${CDN}/wizgenesis-logo-new_9814b3d1.png`,
  wizsound:  `${CDN}/wizsound-logo-new_c5cced65.png`,
  wizlumina: `${CDN}/wizlumina-logo-new_0709f3c5.png`,
  wizboost:  `${CDN}/wizboost-logo-new_93f2b48b.png`,
  wizcreate: `${CDN}/wizcreate-logo-new_85a25756.png`,
};

// ── Hero images for product cards ────────────────────────────────────────────
const HEROES = {
  wizvideo:  `${CDN}/app-wizvideo-ui-v2_126b7056.jpg`,
  wizaudio:  `${CDN}/app-wizsound-ui_4f315efe.jpg`,
  wizimage:  `${CDN}/app-wizimage-ui_ec33bf0e.jpg`,
  wizshorts: `${CDN}/app-wizshorts-ui-v2_be36b6fa.jpg`,
  wizscript: `${CDN}/hero-wizscript_d5f3a63d.jpg`,
  wizanimate:`${CDN}/hero-wizanimate_75dad3b8.jpg`,
};

// ── FAQ data ─────────────────────────────────────────────────────────────────
type FAQ = { q: string; a: string };
type Category = {
  id: string;
  label: string;
  icon: React.ReactNode;
  accent: string;       // Tailwind bg class for pill active state
  accentText: string;   // text colour for active pill
  borderColor: string;  // left border on open accordion
  faqs: FAQ[];
};

const CATEGORIES: Category[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: <Zap className="w-4 h-4" />,
    accent: "bg-amber-400",
    accentText: "text-black",
    borderColor: "border-amber-400",
    faqs: [
      { q: "How do I create my first video?", a: "Sign up, choose a plan, then head to WizVideo — Music Videos. Upload your track, let WizCreate™ build your storyboard, review the scenes, and hit Build. Your video will be ready in minutes." },
      { q: "Do I need any editing skills?", a: "None at all. WIZ AI handles everything — storyboarding, scene generation, audio sync, and colour grading — automatically. You just provide the music and creative direction." },
      { q: "How long does it take to generate a video?", a: "Most videos complete in 3–8 minutes depending on length, quality setting, and current server load. 4K renders may take slightly longer." },
      { q: "Is there a free option?", a: "Yes. Every new account receives free trial credits so you can explore the platform before subscribing. No credit card required to start." },
      { q: "What makes WIZ AI different from other platforms?", a: "WIZ AI is the only platform that combines lyrics-driven storyboarding, character consistency, professional audio mastering (WizSound™), and 4K cinematic output in a single pipeline — no stitching together separate tools." },
    ],
  },
  {
    id: "wizvideo",
    label: "WizVideo — Music Videos",
    icon: <Music className="w-4 h-4" />,
    accent: "bg-blue-500",
    accentText: "text-white",
    borderColor: "border-blue-500",
    faqs: [
      { q: "What audio formats does WizVideo support?", a: "WizVideo accepts MP3, WAV, FLAC, AAC, and M4A files up to 50 MB. For best results use a high-quality MP3 or WAV at 320 kbps or higher." },
      { q: "How does lyrics-driven video generation work?", a: "Paste your lyrics and WizCreate™ analyses them line by line, generating scene descriptions that match the mood, imagery, and narrative of your song. Each scene is then rendered individually and assembled into a seamless video." },
      { q: "Can I add characters to my music video?", a: "Yes. Upload a reference image and WIZ AI will maintain that character's appearance consistently across all scenes in your video." },
      { q: "What video styles are available?", a: "Over 40 styles including Cinematic Realism, Anime, Dark Fantasy, Neon Noir, Studio Performance, Lyric Video, Abstract, and more. New styles are added regularly." },
      { q: "Can I customise individual scenes in my storyboard?", a: "Yes. After WizCreate™ generates your storyboard, you can edit the description of any scene, change its style, or regenerate it individually before building the full video." },
    ],
  },
  {
    id: "wizscript",
    label: "WizScript — AI Video Creator",
    icon: <Film className="w-4 h-4" />,
    accent: "bg-violet-500",
    accentText: "text-white",
    borderColor: "border-violet-500",
    faqs: [
      { q: "What is WizScript?", a: "WizScript is WIZ AI's text-to-video engine. Write a script or prompt, and WizScript generates a fully produced video — voiceover, visuals, and music — automatically." },
      { q: "What types of videos can I create with WizScript?", a: "Explainer videos, social media content, product demos, educational videos, short films, and more. WizScript is ideal for content creators, marketers, and educators." },
      { q: "How long can WizScript videos be?", a: "WizScript supports videos up to 5 minutes in length. Longer formats are on the roadmap." },
    ],
  },
  {
    id: "wizaudio",
    label: "WizAudio — AI Music & Audio",
    icon: <Music className="w-4 h-4" />,
    accent: "bg-emerald-500",
    accentText: "text-white",
    borderColor: "border-emerald-500",
    faqs: [
      { q: "What is WizAudio?", a: "WizAudio is WIZ AI's AI music generation engine. Describe the mood, genre, and tempo you want, and WizAudio composes an original track — ready to use in your videos or download." },
      { q: "What genres and styles does WizAudio support?", a: "Hip-hop, pop, rock, electronic, cinematic, ambient, jazz, classical, lo-fi, and dozens more. You can also blend genres for unique results." },
      { q: "Can I use WizAudio tracks in my videos?", a: "Yes. Any track you generate with WizAudio can be used directly in WizVideo or WizScript. You own the commercial rights to all generated audio." },
      { q: "Does WizAudio apply WizSound mastering?", a: "Yes. Every WizAudio track is automatically processed through WizSound™, WIZ AI's professional audio mastering engine, for broadcast-ready quality." },
    ],
  },
  {
    id: "wizimage",
    label: "WizImage — AI Image Creation",
    icon: <Image className="w-4 h-4" />,
    accent: "bg-orange-500",
    accentText: "text-white",
    borderColor: "border-orange-500",
    faqs: [
      { q: "What is WizImage?", a: "WizImage generates high-resolution AI images from text prompts. Use them as scene references, character portraits, album artwork, thumbnails, or standalone creative pieces." },
      { q: "What image styles are available?", a: "Photorealistic, cinematic, anime, illustration, oil painting, concept art, dark fantasy, neon, and more. You can also specify aspect ratio and resolution." },
      { q: "Can I use WizImage to create characters for my videos?", a: "Yes. Generate a character portrait in WizImage, then upload it as a character reference in WizVideo for consistent character appearance across all scenes." },
      { q: "How many images can I generate?", a: "Image generation costs credits. Each plan includes a monthly credit allowance, and you can top up at any time from the Credits page." },
    ],
  },
  {
    id: "wizshorts",
    label: "WizShorts — Short-Form Content",
    icon: <Play className="w-4 h-4" />,
    accent: "bg-rose-500",
    accentText: "text-white",
    borderColor: "border-rose-500",
    faqs: [
      { q: "What is WizShorts?", a: "WizShorts creates vertical short-form videos optimised for TikTok, Instagram Reels, and YouTube Shorts. Generate engaging content in seconds from a prompt or existing video." },
      { q: "How long can WizShorts videos be?", a: "WizShorts produces videos between 15 seconds and 3 minutes, optimised for vertical (9:16) format." },
      { q: "Can I add captions to WizShorts?", a: "Yes. WizShorts automatically generates and burns in animated captions, with multiple style options to match your brand." },
    ],
  },
  {
    id: "wizanimate",
    label: "WizAnimate — AI Animation",
    icon: <Sparkles className="w-4 h-4" />,
    accent: "bg-purple-500",
    accentText: "text-white",
    borderColor: "border-purple-500",
    faqs: [
      { q: "What is WizAnimate?", a: "WizAnimate generates animated videos from text prompts or images. Create anime, 3D animation, motion graphics, and more — no animation skills required." },
      { q: "What animation styles does WizAnimate support?", a: "Anime, 3D CGI, 2D cartoon, motion graphics, stop-motion, claymation, and cinematic animation. New styles are added regularly." },
      { q: "Does WizAnimate support character consistency?", a: "Yes. Upload a character reference image and WizAnimate will maintain that character's appearance consistently across all scenes." },
    ],
  },
  {
    id: "kids",
    label: "Kids Content",
    icon: <Star className="w-4 h-4" />,
    accent: "bg-pink-500",
    accentText: "text-white",
    borderColor: "border-pink-500",
    faqs: [
      { q: "Can I create kids videos and animations?", a: "Yes. WIZ AI includes dedicated kids-friendly styles and content filters. Select 'Kids & Family' as your content category when creating to ensure age-appropriate outputs." },
      { q: "Is the content safe for children?", a: "All content generated under the Kids & Family category is filtered through WIZ AI's safety system to ensure it is appropriate for children. You can also review and edit every scene before building." },
    ],
  },
  {
    id: "billing",
    label: "Billing & Credits",
    icon: <CreditCard className="w-4 h-4" />,
    accent: "bg-yellow-500",
    accentText: "text-black",
    borderColor: "border-yellow-500",
    faqs: [
      { q: "How does the credit system work?", a: "Build Credits are consumed when you generate a video. Each plan includes a monthly allowance. 1 Build Credit = 1 video render. Additional credits can be purchased as top-up packs at any time." },
      { q: "What is WizSound?", a: "WizSound™ is WIZ AI's professional audio mastering engine. It automatically enhances the audio quality of every video you produce — improving clarity, depth, and loudness to broadcast standards." },
      { q: "What plans are available?", a: "Starter (£9/mo — 2 Build Credits), Creator (£35/mo — 15 Build Credits), and Studio (£99/mo — 40 Build Credits). Annual plans offer up to 30% savings. See the Pricing page for full details." },
      { q: "Do unused Build Credits roll over?", a: "Build Credits do not roll over between billing periods. We recommend choosing a plan that matches your typical monthly usage, or purchasing top-up packs when needed." },
      { q: "Can I cancel my subscription?", a: "Yes, you can cancel at any time from your account settings. Your subscription remains active until the end of the current billing period." },
      { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards (Visa, Mastercard, Amex), Apple Pay, and Google Pay via Stripe. All payments are processed securely." },
    ],
  },
  {
    id: "technical",
    label: "Technical Issues",
    icon: <Settings className="w-4 h-4" />,
    accent: "bg-slate-500",
    accentText: "text-white",
    borderColor: "border-slate-400",
    faqs: [
      { q: "Why is my video not generating?", a: "Check that you have sufficient Build Credits and that your audio file meets the format requirements (MP3/WAV, under 50 MB). If the issue persists, try refreshing the page or contact support via Live Chat." },
      { q: "My video quality looks low — what can I do?", a: "Ensure you have selected HD or 4K quality in the render settings. Quality options depend on your plan — Studio plan unlocks 4K. Also check that your source audio is high quality." },
      { q: "How do I download my video?", a: "Once your video is ready, go to Render History, click on your video, and use the Download button. Videos are available in MP4 format." },
      { q: "I'm getting an error message — what should I do?", a: "Note the error message and contact our support team via Live Chat or email at support@wiz-ai.io. Include your account email and a description of what you were doing when the error occurred." },
      { q: "My audio upload is failing — what file sizes are supported?", a: "Audio files must be under 50 MB. Supported formats: MP3, WAV, FLAC, AAC, M4A. If your file is larger, compress it using a free tool like Audacity before uploading." },
    ],
  },
  {
    id: "engines",
    label: "WIZ Engines",
    icon: <Zap className="w-4 h-4" />,
    accent: "bg-cyan-500",
    accentText: "text-black",
    borderColor: "border-cyan-400",
    faqs: [
      { q: "What are the WIZ Engines?", a: "The WIZ Engines are the four AI systems that power every creation on WIZ AI: WizGenesis™ (creative intelligence), WizSound™ (audio mastering), WizLumina™ (visual enhancement), and WizBoost™ (output optimisation)." },
      { q: "What does WizGenesis™ do?", a: "WizGenesis™ is the creative brain of WIZ AI. It analyses your input — lyrics, prompts, scripts — and generates the creative direction, scene descriptions, and visual concepts that drive your video." },
      { q: "What does WizSound™ do?", a: "WizSound™ processes every audio track through professional mastering algorithms — enhancing clarity, depth, stereo width, and loudness to broadcast and streaming standards." },
      { q: "What does WizLumina™ do?", a: "WizLumina™ applies cinematic colour grading, contrast enhancement, and visual polish to every frame of your video — giving it the look of a professionally colour-graded production." },
      { q: "What does WizBoost™ do?", a: "WizBoost™ optimises your final video for quality, file size, and platform compatibility — ensuring it looks perfect whether you're uploading to YouTube, TikTok, Instagram, or any other platform." },
    ],
  },
  {
    id: "wizcreate",
    label: "WizCreate™ & Storyboard",
    icon: <BookOpen className="w-4 h-4" />,
    accent: "bg-teal-500",
    accentText: "text-white",
    borderColor: "border-teal-400",
    faqs: [
      { q: "What is WizCreate™?", a: "WizCreate™ is WIZ AI's intelligent storyboard engine. It analyses your lyrics or script and automatically generates a complete visual storyboard — one scene per section — ready for you to review and customise." },
      { q: "Can I edit my storyboard before building?", a: "Yes. After WizCreate™ generates your storyboard, you can edit any scene description, change styles, reorder scenes, or regenerate individual scenes before committing to a full build." },
      { q: "How many scenes can a storyboard have?", a: "Storyboards can have between 4 and 24 scenes depending on your track length and plan. Studio plan supports the maximum scene count." },
      { q: "Is storyboard generation really free?", a: "Yes. Generating a storyboard with WizCreate™ is always free. You only spend Build Credits when you click Build to render the final video." },
    ],
  },
];

const ALL_FAQS_COUNT = CATEGORIES.reduce((n, c) => n + c.faqs.length, 0);

// ── Product quick-link cards ──────────────────────────────────────────────────
const PRODUCT_CARDS = [
  { label: "Music Videos", logo: LOGOS.wizvideo,  hero: HEROES.wizvideo,  href: "/music-video/create", from: "#1e3a8a", to: "#3b82f6" },
  { label: "AI Music",     logo: LOGOS.wizaudio,  hero: HEROES.wizaudio,  href: "/audio/create",       from: "#064e3b", to: "#10b981" },
  { label: "AI Images",    logo: LOGOS.wizimage,  hero: HEROES.wizimage,  href: "/image/create",       from: "#7c2d12", to: "#f97316" },
  { label: "Short-Form",   logo: LOGOS.wizshorts, hero: HEROES.wizshorts, href: "/shorts/create",      from: "#881337", to: "#f43f5e" },
  { label: "Text-to-Video",logo: LOGOS.wizscript, hero: HEROES.wizscript, href: "/script/create",      from: "#3b0764", to: "#a855f7" },
  { label: "AI Animation", logo: LOGOS.wizanimate,hero: HEROES.wizanimate,href: "/animate/create",     from: "#1e1b4b", to: "#6366f1" },
];

// ── Engine cards ──────────────────────────────────────────────────────────────
const ENGINES = [
  { name: "WizGenesis™", tagline: "Core Intelligence",    logo: LOGOS.wizgenesis, bg: "from-red-900 to-red-700",     glow: "#ef4444" },
  { name: "WizSound™",   tagline: "Audio Mastering",      logo: LOGOS.wizsound,   bg: "from-emerald-900 to-emerald-700", glow: "#10b981" },
  { name: "WizLumina™",  tagline: "Visual Enhancement",   logo: LOGOS.wizlumina,  bg: "from-purple-900 to-purple-700",   glow: "#a855f7" },
  { name: "WizBoost™",   tagline: "Output Optimisation",  logo: LOGOS.wizboost,   bg: "from-orange-900 to-orange-700",   glow: "#f97316" },
];

// ── Accordion item ────────────────────────────────────────────────────────────
function AccordionItem({ faq, borderColor }: { faq: FAQ; borderColor: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-xl border transition-all duration-200 cursor-pointer select-none overflow-hidden
        ${open
          ? `border-l-4 ${borderColor} border-t border-r border-b border-white/20 bg-white/[0.07]`
          : "border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20"
        }`}
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <span className="text-white font-medium text-sm sm:text-base leading-snug">{faq.q}</span>
        <ChevronDown
          className={`w-5 h-5 flex-shrink-0 text-white/60 transition-transform duration-200 ${open ? "rotate-180 text-white" : ""}`}
        />
      </div>
      {open && (
        <div className="px-5 pb-5 text-white/75 text-sm sm:text-base leading-relaxed border-t border-white/10 pt-4">
          {faq.a}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Help() {
  useSEO({ title: "Help & FAQ — WIZ AI", path: "/help", description: "Find answers to all your questions about WIZ AI products, billing, and technical support." });

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return CATEGORIES.map(cat => ({
      ...cat,
      faqs: cat.faqs.filter(f =>
        (!q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)) &&
        (activeCategory === "all" || activeCategory === cat.id)
      ),
    })).filter(cat => cat.faqs.length > 0);
  }, [query, activeCategory]);

  const totalShown = filtered.reduce((n, c) => n + c.faqs.length, 0);

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <PublicNavBar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-amber-500/10 blur-[120px]" />
          <div className="absolute top-20 left-1/4 w-[300px] h-[300px] rounded-full bg-blue-600/10 blur-[80px]" />
          <div className="absolute top-20 right-1/4 w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[80px]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase text-white/80 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Help Centre
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4">
            How can we{" "}
            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              help?
            </span>
          </h1>
          <p className="text-white/60 text-lg mb-8">
            {ALL_FAQS_COUNT} answers across {CATEGORIES.length} topics. Search below or browse by product.
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search questions, topics, or keywords…"
              className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-white/40 text-sm focus:outline-none focus:border-amber-400/60 focus:bg-white/15 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs font-medium"
              >
                Clear
              </button>
            )}
          </div>
          {query && (
            <p className="mt-3 text-white/50 text-sm">
              {totalShown === 0 ? "No results found." : `${totalShown} result${totalShown !== 1 ? "s" : ""} found`}
            </p>
          )}
        </div>
      </section>

      {/* ── Product quick-link cards ──────────────────────────────────────── */}
      {!query && (
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-4 text-center">Browse by product</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {PRODUCT_CARDS.map(p => (
              <Link key={p.label} href={p.href}>
                <div
                  className="group relative rounded-2xl overflow-hidden aspect-square cursor-pointer"
                  style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
                >
                  {/* Background image */}
                  <img
                    src={p.hero}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity duration-300"
                    loading="lazy"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${p.from}ee 30%, transparent)` }} />
                  {/* Content */}
                  <div className="relative h-full flex flex-col items-center justify-end p-3 pb-4">
                    <img src={p.logo} alt={p.label} className="w-10 h-10 object-contain mb-2 drop-shadow-lg" loading="lazy" />
                    <span className="text-white text-xs font-bold text-center leading-tight drop-shadow">{p.label}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Category filter pills ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-10">
        <div className="flex flex-wrap gap-2 justify-center">
          {/* All Topics pill */}
          <button
            onClick={() => setActiveCategory("all")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 border
              ${activeCategory === "all"
                ? "bg-amber-400 text-black border-amber-400 shadow-lg shadow-amber-400/30"
                : "bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40"
              }`}
          >
            <Video className="w-3.5 h-3.5" />
            All Topics
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 border
                ${activeCategory === cat.id
                  ? `${cat.accent} ${cat.accentText} border-transparent shadow-lg`
                  : "bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/40"
                }`}
            >
              {cat.icon}
              <span className="hidden sm:inline">{cat.label}</span>
              <span className="sm:hidden">{cat.label.split(" — ")[0].replace("WizVideo", "WizVideo").replace("WizScript", "WizScript").replace("WizAudio", "WizAudio").replace("WizImage", "WizImage").replace("WizShorts", "WizShorts").replace("WizAnimate", "WizAnimate")}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── FAQ sections ─────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-20 space-y-12">
        {filtered.map(cat => (
          <div key={cat.id}>
            {/* Section header */}
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl ${cat.accent} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                <span className={cat.accentText}>{cat.icon}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{cat.label}</h2>
                <p className="text-white/40 text-xs">{cat.faqs.length} question{cat.faqs.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            {/* Accordions */}
            <div className="space-y-2">
              {cat.faqs.map((faq, i) => (
                <AccordionItem key={i} faq={faq} borderColor={cat.borderColor} />
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white/40 text-lg">No results for "{query}"</p>
            <button onClick={() => setQuery("")} className="mt-4 text-amber-400 text-sm hover:underline">Clear search</button>
          </div>
        )}
      </section>

      {/* ── WIZ Engines strip ────────────────────────────────────────────── */}
      {!query && (
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="text-center mb-8">
            <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-2">Powering every creation</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">The WIZ Engines</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {ENGINES.map(e => (
              <div
                key={e.name}
                className={`relative rounded-2xl bg-gradient-to-br ${e.bg} p-6 flex flex-col items-center text-center border border-white/10 overflow-hidden`}
                style={{ boxShadow: `0 0 40px ${e.glow}22` }}
              >
                <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 50% 0%, ${e.glow}, transparent 70%)` }} />
                <img src={e.logo} alt={e.name} className="w-14 h-14 object-contain mb-3 relative z-10 drop-shadow-lg" loading="lazy" />
                <h3 className="text-white font-bold text-sm relative z-10">{e.name}</h3>
                <p className="text-white/60 text-xs mt-1 relative z-10">{e.tagline}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Support section ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-24">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/30 to-purple-950/30 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-blue-600/15 blur-[100px]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-3">Still need help?</p>
          <h2 className="text-3xl sm:text-4xl font-black mb-3">Our team is here for you</h2>
          <p className="text-white/60 mb-10 max-w-xl mx-auto">Can't find what you're looking for? Reach out and we'll get back to you fast.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Live Chat */}
            <div className="rounded-2xl bg-white/[0.06] border border-white/15 p-6 flex flex-col items-center text-center hover:bg-white/[0.10] transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-1">Live Chat</h3>
              <p className="text-emerald-400 text-xs font-semibold mb-3 flex items-center gap-1.5 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Usually under 2 minutes
              </p>
              <p className="text-white/60 text-sm mb-5 flex-1">Chat with our team in real time for instant answers.</p>
              <button
                onClick={() => { const c = (window as any).$crisp; if (c) c.push(["do", "chat:open"]); }}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Start Chat
              </button>
            </div>

            {/* Email */}
            <div className="rounded-2xl bg-white/[0.06] border border-white/15 p-6 flex flex-col items-center text-center hover:bg-white/[0.10] transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
                <Mail className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-1">Email Support</h3>
              <p className="text-amber-400 text-xs font-semibold mb-3">Within 24 hours</p>
              <p className="text-white/60 text-sm mb-5 flex-1">Send us a detailed message and we'll reply with a full answer.</p>
              <a
                href="mailto:support@wiz-ai.io"
                className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                support@wiz-ai.io
              </a>
            </div>

            {/* Policies */}
            <div className="rounded-2xl bg-white/[0.06] border border-white/15 p-6 flex flex-col items-center text-center hover:bg-white/[0.10] transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-white font-bold text-lg mb-1">Policies & Legal</h3>
              <p className="text-blue-400 text-xs font-semibold mb-3">Always available</p>
              <p className="text-white/60 text-sm mb-5 flex-1">Review our policies, terms, and refund guarantee.</p>
              <div className="w-full space-y-2">
                <a href="/privacy" className="flex items-center justify-between w-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors">
                  Privacy Policy <span className="text-white/40">→</span>
                </a>
                <a href="/terms" className="flex items-center justify-between w-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors">
                  Terms of Service <span className="text-white/40">→</span>
                </a>
                <a href="/refunds" className="flex items-center justify-between w-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors">
                  Refund Policy <span className="text-white/40">→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer placeholder */}
    </div>
  );
}
