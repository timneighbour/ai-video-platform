import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ChevronDown, ChevronUp, MessageCircle, Mail,
  Zap, Music, Video, Baby, Bot, Search
} from "lucide-react";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const WIZVID_LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-v2_02b60663.png";

const FAQS = [
  {
    category: "Getting Started",
    icon: <Zap className="w-4 h-4" />,
    questions: [
      { q: "How do I create my first video?", a: "Choose WizBeat for music videos or WizPilot for any other video. Upload your audio or enter your idea, pick a visual style, then click Generate. Your video will be ready in minutes." },
      { q: "Do I need any editing skills?", a: "No — WizVid is fully automated. The AI handles everything from storyboard creation to final rendering. You just provide the input and choose a style." },
      { q: "How long does it take to generate a video?", a: "Most videos are created within 2–5 minutes depending on length and complexity. You'll see a live progress bar while your video is being generated." },
      { q: "Is there a free option?", a: "Yes! New accounts receive free trial credits to create your first video. No credit card required to get started." },
    ],
  },
  {
    category: "WizBeat — Music Videos",
    icon: <Music className="w-4 h-4" />,
    questions: [
      { q: "What audio formats does WizBeat support?", a: "WizBeat supports MP3, WAV, M4A, and OGG audio files up to 50MB. For best results, use a high-quality stereo audio file." },
      { q: "How does lyrics-driven video generation work?", a: "WizBeat automatically transcribes your song lyrics using AI. Each lyric line is mapped to a visual scene, creating a video that perfectly syncs with your music. You can also paste lyrics manually." },
      { q: "Can I add characters to my music video?", a: "Yes! WizBeat supports up to 4 characters per video. Each character can have multiple reference images for visual consistency, and singing characters get AI lip-sync applied automatically." },
      { q: "What video styles are available?", a: "WizBeat offers 6 styles: Cinematic, Anime, Pixar 3D, Documentary, Abstract, and Vintage." },
    ],
  },
  {
    category: "WizPilot — AI Video Creator",
    icon: <Video className="w-4 h-4" />,
    questions: [
      { q: "What is WizPilot?", a: "WizPilot is your general-purpose AI video director. Describe any video concept in text, upload reference images, or use an existing video as a starting point. WizPilot generates a cinematic storyboard and renders your complete video." },
      { q: "What types of videos can I create with WizPilot?", a: "Anything — YouTube content, social media videos, ads, explainer videos, short films, product showcases, and more." },
    ],
  },
  {
    category: "Kids Content",
    icon: <Baby className="w-4 h-4" />,
    questions: [
      { q: "Can I create kids videos and animations?", a: "Absolutely! WizVid is perfect for kids content creators. Use the Pixar 3D or Anime style for animated characters, or create nursery rhyme videos with WizBeat." },
      { q: "Is the content safe for children?", a: "Yes. WizVid's AI is configured to generate family-friendly content. All outputs are reviewed for appropriateness." },
    ],
  },
  {
    category: "Billing & Credits",
    icon: <Zap className="w-4 h-4" />,
    questions: [
      { q: "How does the credit system work?", a: "Credits are used to generate videos. Storyboard generation is always free — credits are only used when you render the final video." },
      { q: "What plans are available?", a: "Starter (£19/month, 20 videos), Pro (£49/month, unlimited, no watermark, 4K), and Creator+ (£99/month, priority processing, premium styles, API access)." },
      { q: "Can I cancel my subscription?", a: "Yes, cancel at any time from your Account settings. Your subscription remains active until the end of the billing period." },
      { q: "What payment methods do you accept?", a: "Visa, Mastercard, Amex, Apple Pay, and Google Pay via Stripe." },
    ],
  },
  {
    category: "Technical Issues",
    icon: <Bot className="w-4 h-4" />,
    questions: [
      { q: "Why is my video not generating?", a: "Check that your audio file is in a supported format (MP3, WAV, M4A) and under 50MB. If the issue persists, try refreshing the page. Contact support@wizvid.ai if it continues." },
      { q: "My video quality looks low — what can I do?", a: "Make sure you're on the Pro or Creator+ plan for 4K export. Also ensure your input audio is high quality." },
      { q: "How do I download my video?", a: "Once your video is generated, click the Download button on the result screen. Videos are also saved to your Projects page for 30 days." },
      { q: "I'm getting an error message — what should I do?", a: "Try refreshing the page first. If the error persists, contact us at support@wizvid.ai with a screenshot." },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${
        open ? "border-white/15 bg-[#171717]" : "border-white/8 bg-[#0f0f0f] hover:border-white/12"
      }`}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between p-5 gap-4">
        <p className="font-medium text-white text-sm text-left">{q}</p>
        {open
          ? <ChevronUp className="w-4 h-4 text-[#a1a1aa] flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-[#a1a1aa] flex-shrink-0" />}
      </div>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-[#a1a1aa] text-sm leading-relaxed">{a}</p>
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
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <img src={WIZVID_LOGO_FULL} alt="WizVid" className="h-11 w-auto object-contain" />
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: "WizBeat", href: "/music-video" },
              { label: "WizPilot", href: "/wizpilot" },
              { label: "Pricing", href: "/pricing" },
              { label: "Help", href: "/help" },
            ].map((link) => (
              <Link key={link.label} href={link.href}>
                <span className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium cursor-pointer ${link.href === "/help" ? "text-white" : "text-[#a1a1aa] hover:text-white"}`}>
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
          <Link href="/onboarding">
            <Button className="bg-white text-black hover:bg-white/90 text-sm px-5 rounded-xl font-semibold h-9">
              Get started
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-5">Help Centre</p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            How can we help?
          </h1>
          <p className="text-[#a1a1aa] text-lg max-w-lg mx-auto">
            Find answers instantly. If you can't find what you need, our team is here to help.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa]" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#171717] border border-white/8 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder:text-[#a1a1aa] focus:outline-none focus:border-white/20 transition-all text-sm"
          />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          {[
            { icon: <Music className="w-4 h-4" />, label: "Music Videos", href: "/music-video" },
            { icon: <Video className="w-4 h-4" />, label: "WizPilot", href: "/wizpilot" },
            { icon: <Baby className="w-4 h-4" />, label: "Kids Content", href: "/seo/ai-kids-video-generator" },
            { icon: <MessageCircle className="w-4 h-4" />, label: "Live Chat", href: "#chat" },
          ].map((item) => (
            <Link key={item.label} href={item.href}>
              <div className="p-4 rounded-xl bg-[#171717] border border-white/8 hover:border-white/15 transition-all cursor-pointer text-center card-hover">
                <div className="text-[#a1a1aa] flex justify-center mb-2">{item.icon}</div>
                <p className="text-white text-xs font-medium">{item.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Category filter */}
        {!searchQuery && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                !activeCategory
                  ? "bg-white text-black"
                  : "bg-white/5 text-[#a1a1aa] hover:bg-white/8 hover:text-white border border-white/8"
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
                    ? "bg-white text-black"
                    : "bg-white/5 text-[#a1a1aa] hover:bg-white/8 hover:text-white border border-white/8"
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
            <p className="text-[#a1a1aa] text-base">No results found for "{searchQuery}"</p>
            <p className="text-[#a1a1aa]/60 text-sm mt-2">Try a different search term or contact support below</p>
          </div>
        ) : (
          <div className="space-y-10">
            {displayFAQs.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-[#a1a1aa]">{cat.icon}</div>
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
        <div className="mt-16 grid md:grid-cols-2 gap-4">
          <div className="p-7 rounded-2xl bg-[#171717] border border-white/8 text-center card-hover">
            <MessageCircle className="w-8 h-8 text-[#a1a1aa] mx-auto mb-4" />
            <h3 className="text-base font-semibold text-white mb-2">Live Chat</h3>
            <p className="text-[#a1a1aa] text-sm mb-5 leading-relaxed">Chat with our team in real time. Usually responds in under 2 minutes.</p>
            <Button
              className="bg-white text-black hover:bg-white/90 w-full rounded-xl font-semibold h-10 text-sm"
              onClick={() => {
                if (typeof window !== "undefined" && (window as any).$crisp) {
                  (window as any).$crisp.push(["do", "chat:open"]);
                }
              }}
            >
              Start Chat
            </Button>
          </div>
          <div className="p-7 rounded-2xl bg-[#171717] border border-white/8 text-center card-hover">
            <Mail className="w-8 h-8 text-[#a1a1aa] mx-auto mb-4" />
            <h3 className="text-base font-semibold text-white mb-2">Email Support</h3>
            <p className="text-[#a1a1aa] text-sm mb-5 leading-relaxed">Send us a message and we'll get back to you within 24 hours.</p>
            <a href="mailto:support@wizvid.ai">
              <Button
                variant="outline"
                className="border-white/12 text-white hover:bg-white/5 bg-transparent w-full rounded-xl h-10 text-sm font-medium"
              >
                support@wizvid.ai
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
