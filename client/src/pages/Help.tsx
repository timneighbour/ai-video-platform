import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageCircle,
  Mail,
  BookOpen,
  Zap,
  Music,
  Video,
  Baby,
  Bot,
  Search,
} from "lucide-react";

const FAQS = [
  {
    category: "Getting Started",
    icon: <Zap className="w-4 h-4" />,
    questions: [
      {
        q: "How do I create my first video?",
        a: "It's simple! Choose WizBeat for music videos or WizPilot for any other video. Upload your audio or enter your idea, pick a visual style, then click Generate. Your video will be ready in minutes.",
      },
      {
        q: "Do I need any editing skills?",
        a: "No — WizVid is fully automated. The AI handles everything from storyboard creation to final rendering. You just provide the input and choose a style.",
      },
      {
        q: "How long does it take to generate a video?",
        a: "Most videos are created within 2–5 minutes depending on length and complexity. You'll see a live progress bar while your video is being generated.",
      },
      {
        q: "Is there a free option?",
        a: "Yes! New accounts receive free trial credits to create your first video. No credit card required to get started.",
      },
    ],
  },
  {
    category: "WizBeat — Music Videos",
    icon: <Music className="w-4 h-4" />,
    questions: [
      {
        q: "What audio formats does WizBeat support?",
        a: "WizBeat supports MP3, WAV, M4A, and OGG audio files up to 50MB. For best results, use a high-quality stereo audio file.",
      },
      {
        q: "How does lyrics-driven video generation work?",
        a: "WizBeat automatically transcribes your song lyrics using AI. Each lyric line is mapped to a visual scene, creating a video that perfectly syncs with your music. You can also paste lyrics manually.",
      },
      {
        q: "Can I add characters to my music video?",
        a: "Yes! WizBeat supports up to 4 characters per video. Each character can have multiple reference images for visual consistency, and singing characters get AI lip-sync applied automatically.",
      },
      {
        q: "What video styles are available?",
        a: "WizBeat offers 6 styles: Cinematic (Hollywood-quality realism), Anime (Japanese animation), Pixar 3D (vibrant 3D animation), Documentary (raw authentic footage), Abstract (artistic visual journey), and Vintage (retro film aesthetic).",
      },
    ],
  },
  {
    category: "WizPilot — AI Video Creator",
    icon: <Video className="w-4 h-4" />,
    questions: [
      {
        q: "What is WizPilot?",
        a: "WizPilot is your general-purpose AI video director. Describe any video concept in text, upload reference images, or use an existing video as a starting point. WizPilot generates a cinematic storyboard and renders your complete video.",
      },
      {
        q: "What types of videos can I create with WizPilot?",
        a: "Anything — YouTube content, social media videos, ads, explainer videos, short films, product showcases, and more. WizPilot works for any video concept.",
      },
    ],
  },
  {
    category: "Kids Content",
    icon: <Baby className="w-4 h-4" />,
    questions: [
      {
        q: "Can I create kids videos and animations?",
        a: "Absolutely! WizVid is perfect for kids content creators. Use the Pixar 3D or Anime style for animated characters, or create nursery rhyme videos with WizBeat. The AI generates child-friendly visuals automatically.",
      },
      {
        q: "Is the content safe for children?",
        a: "Yes. WizVid's AI is configured to generate family-friendly content. All outputs are reviewed for appropriateness.",
      },
    ],
  },
  {
    category: "Billing & Credits",
    icon: <Zap className="w-4 h-4" />,
    questions: [
      {
        q: "How does the credit system work?",
        a: "Credits are used to generate videos. Each video generation costs credits depending on length and quality. Storyboard generation is always free — credits are only used when you render the final video.",
      },
      {
        q: "What plans are available?",
        a: "We offer three plans: Starter (£19/month, 30 videos), Pro (£49/month, unlimited videos, no watermark, 4K), and Creator+ (£99/month, priority processing, premium styles, API access).",
      },
      {
        q: "Can I cancel my subscription?",
        a: "Yes, you can cancel at any time from your Account settings. Your subscription remains active until the end of the billing period.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit and debit cards (Visa, Mastercard, Amex), Apple Pay, and Google Pay via Stripe.",
      },
    ],
  },
  {
    category: "Technical Issues",
    icon: <Bot className="w-4 h-4" />,
    questions: [
      {
        q: "Why is my video not generating?",
        a: "Check that your audio file is in a supported format (MP3, WAV, M4A) and under 50MB. If the issue persists, try refreshing the page and starting again. Contact support@wizvid.ai if the problem continues.",
      },
      {
        q: "My video quality looks low — what can I do?",
        a: "Make sure you're on the Pro or Creator+ plan for 4K export. Also ensure your input audio is high quality — the AI output quality is influenced by the input.",
      },
      {
        q: "How do I download my video?",
        a: "Once your video is generated, click the Download button on the result screen. Videos are also saved to your Projects page for 30 days.",
      },
      {
        q: "I'm getting an error message — what should I do?",
        a: "Try refreshing the page first. If the error persists, contact us at support@wizvid.ai with a screenshot and we'll resolve it quickly.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`border rounded-xl transition-all cursor-pointer ${
        open ? "border-purple-500/40 bg-purple-900/10" : "border-white/10 bg-white/3 hover:border-white/20"
      }`}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between p-5 gap-4">
        <p className="font-medium text-white/90 text-left">{q}</p>
        {open ? (
          <ChevronUp className="w-5 h-5 text-purple-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-white/40 flex-shrink-0" />
        )}
      </div>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-white/60 leading-relaxed">{a}</p>
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
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">WizVid</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
            <Link href="/music-video" className="hover:text-white transition-colors">WizBeat</Link>
            <Link href="/wizpilot" className="hover:text-white transition-colors">WizPilot</Link>
            <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/help" className="text-purple-400">Help</Link>
          </div>
          <Link href="/music-video">
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-sm px-4 py-2 rounded-lg">
              Start Free
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
            <BookOpen className="w-3 h-3 mr-1" />
            Help Centre
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            WizVid Help Centre
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Find answers instantly. If you can't find what you need, our team is here to help.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all text-lg"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: <Music className="w-5 h-5" />, label: "Music Videos", href: "/music-video" },
            { icon: <Video className="w-5 h-5" />, label: "WizPilot", href: "/wizpilot" },
            { icon: <Baby className="w-5 h-5" />, label: "Kids Content", href: "/seo/ai-kids-video-generator" },
            { icon: <MessageCircle className="w-5 h-5" />, label: "Live Chat", href: "#chat" },
          ].map((item) => (
            <Link key={item.label} href={item.href}>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-white/8 transition-all cursor-pointer text-center">
                <div className="text-purple-400 flex justify-center mb-2">{item.icon}</div>
                <p className="text-white/80 text-sm font-medium">{item.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Category Filter */}
        {!searchQuery && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !activeCategory
                  ? "bg-purple-500 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              All Topics
            </button>
            {FAQS.map((cat) => (
              <button
                key={cat.category}
                onClick={() => setActiveCategory(activeCategory === cat.category ? null : cat.category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                  activeCategory === cat.category
                    ? "bg-purple-500 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                {cat.icon}
                {cat.category}
              </button>
            ))}
          </div>
        )}

        {/* FAQ Sections */}
        {displayFAQs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/40 text-lg">No results found for "{searchQuery}"</p>
            <p className="text-white/30 text-sm mt-2">Try a different search term or contact support below</p>
          </div>
        ) : (
          <div className="space-y-10">
            {displayFAQs.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-purple-400">{cat.icon}</div>
                  <h2 className="text-xl font-bold">{cat.category}</h2>
                </div>
                <div className="space-y-3">
                  {cat.questions.map((item) => (
                    <FAQItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact Support */}
        <div className="mt-16 grid md:grid-cols-2 gap-6">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-900/40 to-pink-900/20 border border-purple-500/20 text-center">
            <MessageCircle className="w-10 h-10 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Live Chat</h3>
            <p className="text-white/60 mb-4 text-sm">Chat with our team in real time. Usually responds in under 2 minutes.</p>
            <Button
              className="bg-purple-500 hover:bg-purple-600 text-white w-full"
              onClick={() => {
                // Crisp chat open
                if (typeof window !== "undefined" && (window as any).$crisp) {
                  (window as any).$crisp.push(["do", "chat:open"]);
                }
              }}
            >
              Start Chat
            </Button>
          </div>
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
            <Mail className="w-10 h-10 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Email Support</h3>
            <p className="text-white/60 mb-4 text-sm">Send us a detailed message and we'll get back to you within 24 hours.</p>
            <a href="mailto:support@wizvid.ai">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 w-full">
                support@wizvid.ai
              </Button>
            </a>
          </div>
        </div>

        {/* SEO paragraph */}
        <div className="mt-12 p-6 rounded-2xl bg-white/3 border border-white/5">
          <p className="text-white/40 text-sm leading-relaxed">
            WizVid Help Centre — Find answers to common questions about creating AI music videos, 
            animations, YouTube content, and kids videos. Learn how to use WizBeat and WizPilot, 
            manage your subscription, and get the most out of WizVid's AI video generation platform.
            For urgent support, contact us at{" "}
            <a href="mailto:support@wizvid.ai" className="text-purple-400 hover:text-purple-300">
              support@wizvid.ai
            </a>.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <Link href="/">
            <span className="font-bold text-xl bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent cursor-pointer">WizVid</span>
          </Link>
          <p className="text-white/40 text-sm mt-2">AI Music Video Generator • Create Videos in Minutes</p>
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-white/40">
            <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
            <Link href="/music-video" className="hover:text-white/70 transition-colors">WizBeat</Link>
            <Link href="/wizpilot" className="hover:text-white/70 transition-colors">WizPilot</Link>
            <Link href="/#pricing" className="hover:text-white/70 transition-colors">Pricing</Link>
            <Link href="/help" className="text-purple-400">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
