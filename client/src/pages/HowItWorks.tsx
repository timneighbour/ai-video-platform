import { Sparkles, ArrowLeft, Wand2, Film, Download, Users, MessageSquare, CheckCircle2, Clock, Bell, Share2 } from "lucide-react";
import { Link } from "wouter";

// ── CDN assets ────────────────────────────────────────────────────────────────
const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const WIZVID_LOGO_FULL = `${CDN}/wizvid-logo-transparent_fcdb69d6.png`;
const STEP_IMAGES = {
  upload: `${CDN}/step1-upload-audio-byRxxURESoxMZYpCB7FKpm.webp`,
  styles: `${CDN}/step2-style-collage-P6HWeTbd9g6UsLFLRWYJEi.webp`,
  render: `${CDN}/step3-ai-generated-scene-5QTx7hBMWwzLqpgwATS24U.webp`,
};

// ── 5-step pipeline ───────────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  {
    num: "01",
    icon: <MessageSquare className="w-6 h-6" />,
    color: "violet",
    title: "Prompt",
    headline: "Describe your video idea",
    desc: "Type a prompt, upload your audio, or let AI generate the music. WizVid understands natural language — no technical skills needed.",
    details: [
      "Upload your song or describe your concept",
      "Choose from 11 cinematic styles (Cinematic, Anime, Pixar 3D, Neon Noir, and more)",
      "Set mood, genre, and visual direction",
    ],
    badge: "Free to start",
    badgeColor: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  },
  {
    num: "02",
    icon: <Wand2 className="w-6 h-6" />,
    color: "blue",
    title: "Storyboard",
    headline: "AI builds your full storyboard",
    desc: "In under 30 seconds, WizVid generates a complete scene-by-scene storyboard with AI images, scene descriptions, and visual prompts.",
    details: [
      "Full storyboard generated instantly — no waiting",
      "Each scene has its own image, prompt, and timing",
      "Edit any scene prompt or swap the visual style",
    ],
    badge: "Completely free",
    badgeColor: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  },
  {
    num: "03",
    icon: <Film className="w-6 h-6" />,
    color: "emerald",
    title: "Preview",
    headline: "Review every scene before you pay",
    desc: "See exactly what your video will look like before spending a single credit. Edit, regenerate, or approve each scene individually.",
    details: [
      "Preview every scene image — no surprises",
      "Regenerate any scene you're not happy with",
      "Approve the full storyboard before rendering",
    ],
    badge: "No credits needed",
    badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  },
  {
    num: "04",
    icon: <Download className="w-6 h-6" />,
    color: "amber",
    title: "Full Render",
    headline: "Render your video in HD or 4K",
    desc: "When you're happy with the storyboard, click Render. WizVid animates every scene, syncs audio, and delivers your complete video.",
    details: [
      "Choose HD (1080p) or 4K resolution",
      "WizSound audio enhancement included",
      "WizLumina visual grading for cinematic quality",
    ],
    badge: "Credits used here",
    badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  },
  {
    num: "05",
    icon: <Users className="w-6 h-6" />,
    color: "fuchsia",
    title: "Share",
    headline: "Download, share, and grow",
    desc: "Download your video instantly. Share to YouTube, Instagram, TikTok, or publish to the WizVid platform to grow your audience with WizBoost.",
    details: [
      "Download MP4 immediately after render",
      "Share directly to social platforms",
      "Publish to WizVid and grow with WizBoost",
    ],
    badge: "Your video, your rights",
    badgeColor: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25",
  },
];

const COLOR_MAP: Record<string, { ring: string; bg: string; text: string; line: string }> = {
  violet: { ring: "border-violet-500/40", bg: "bg-violet-500/10", text: "text-violet-300", line: "bg-violet-500/20" },
  blue:   { ring: "border-blue-500/40",   bg: "bg-blue-500/10",   text: "text-blue-300",   line: "bg-blue-500/20" },
  emerald:{ ring: "border-emerald-500/40",bg: "bg-emerald-500/10",text: "text-emerald-300",line: "bg-emerald-500/20" },
  amber:  { ring: "border-amber-500/40",  bg: "bg-amber-500/10",  text: "text-amber-300",  line: "bg-amber-500/20" },
  fuchsia:{ ring: "border-fuchsia-500/40",bg: "bg-fuchsia-500/10",text: "text-fuchsia-300",line: "bg-fuchsia-500/20" },
};

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/8 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </a>
          <Link href="/">
            <img src={WIZVID_LOGO_FULL} alt="WizVid" className="h-12 w-auto object-contain absolute left-1/2 -translate-x-1/2" />
          </Link>
          <a
            href="/music-video"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm px-5 py-2 rounded-xl font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Start Creating
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-6">
          How it works
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-5 leading-[1.05]">
          From idea to video<br />
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">in five steps</span>
        </h1>
        <p className="text-white/50 text-lg max-w-xl mx-auto mb-8">
          WizVid handles the entire creation pipeline — you just describe what you want.
        </p>

        {/* Pipeline strip */}
        <div className="flex items-center justify-center gap-0 flex-wrap">
          {PIPELINE_STEPS.map((step, i) => {
            const c = COLOR_MAP[step.color];
            return (
              <div key={step.num} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${c.ring} ${c.bg}`}>
                  <span className={`text-xs font-bold ${c.text}`}>{step.title}</span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="w-6 h-px bg-white/15 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 5-step detailed walkthrough ── */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <div className="space-y-0">
          {PIPELINE_STEPS.map((step, i) => {
            const c = COLOR_MAP[step.color];
            return (
              <div key={step.num} className="flex gap-6">
                {/* Timeline */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full border-2 ${c.ring} ${c.bg} flex items-center justify-center ${c.text}`}>
                    {step.icon}
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div className={`w-0.5 flex-1 ${c.line} mt-2 mb-2 min-h-[40px]`} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-10">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-white/30 tracking-widest font-mono">STEP {step.num}</span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${step.badgeColor}`}>
                      {step.badge}
                    </span>
                  </div>
                  <h2 className={`text-xl font-bold mb-1 ${c.text}`}>{step.title}</h2>
                  <h3 className="text-lg font-semibold text-white mb-3">{step.headline}</h3>
                  <p className="text-white/50 text-sm leading-relaxed mb-4">{step.desc}</p>
                  <ul className="space-y-2">
                    {step.details.map((d) => (
                      <li key={d} className="flex items-start gap-2.5 text-sm text-white/65">
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${c.text}`} />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Render queue explainer ── */}
      <div className="border-t border-white/8 bg-[#0d0d0d] py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">After you click Render</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">What happens during rendering?</h2>
            <p className="text-white/45 text-sm max-w-lg mx-auto">Your video goes through four processing stages. You'll be notified when it's ready.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: <Clock className="w-5 h-5" />, stage: "Queued", desc: "Your job enters the render queue. Position is based on your plan tier.", color: "text-white/50" },
              { icon: <Wand2 className="w-5 h-5" />, stage: "Rendering", desc: "AI animates each scene from your approved storyboard images.", color: "text-violet-300" },
              { icon: <Film className="w-5 h-5" />, stage: "Finalising", desc: "Scenes are assembled, audio is synced, and WizSound/WizLumina are applied.", color: "text-blue-300" },
              { icon: <CheckCircle2 className="w-5 h-5" />, stage: "Complete", desc: "Your video is ready. Download instantly or share directly from WizVid.", color: "text-emerald-300" },
            ].map((item) => (
              <div key={item.stage} className="flex gap-4 p-4 rounded-xl bg-white/4 border border-white/8">
                <div className={`flex-shrink-0 mt-0.5 ${item.color}`}>{item.icon}</div>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${item.color}`}>{item.stage}</p>
                  <p className="text-xs text-white/45 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-violet-500/8 border border-violet-500/20 flex items-start gap-3">
            <Bell className="w-4 h-4 text-violet-300 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-white/60">
              <span className="text-white/80 font-medium">Email notification</span> — We'll send you an email when your render is complete, so you don't need to stay on the page.
            </p>
          </div>
        </div>
      </div>

      {/* ── WizBoost teaser ── */}
      <div className="border-t border-white/8 py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-xs font-semibold uppercase tracking-wider mb-6">
            WizBoost
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">
            Create videos. Build your audience.
          </h2>
          <p className="text-white/45 text-sm max-w-lg mx-auto mb-8">
            After rendering, WizBoost connects your content to real viewers, creators, and fans — helping you grow while you create.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: <Share2 className="w-3.5 h-3.5" />, label: "Share to YouTube, Instagram, TikTok" },
              { icon: <Users className="w-3.5 h-3.5" />, label: "Publish to WizVid platform" },
              { icon: <Sparkles className="w-3.5 h-3.5" />, label: "Grow your fanbase" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/65">
                <span className="text-fuchsia-400">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="border-t border-white/8 bg-gradient-to-b from-[#0a0a0a] to-[#0f0f0f] py-20 px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-4">
          Ready to create your video?
        </h2>
        <p className="text-white/45 text-lg mb-8 max-w-md mx-auto">
          Preview your full storyboard for free — no credit card required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/music-video"
            className="inline-flex items-center justify-center bg-white text-black hover:bg-white/90 text-base px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Start Creating
          </a>
          <a
            href="/creators"
            className="inline-flex items-center justify-center border border-white/15 text-white hover:bg-white/5 bg-transparent text-base px-8 py-3 rounded-xl font-medium transition-colors"
          >
            <Film className="w-4 h-4 mr-2" />
            View Examples
          </a>
        </div>
      </div>
    </div>
  );
}
