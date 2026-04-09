import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Sparkles, Music, Video, Baby, Bot, ArrowRight, Check, Play } from "lucide-react";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const WIZVID_LOGO = `${CDN}/wizvid-logo_9bec645c.jpg`;

const CREATOR_TYPES = [
  { id: "musician", emoji: "🎤", label: "Musician / Artist", desc: "I want to create music videos for my songs", href: "/music-video" },
  { id: "youtuber", emoji: "🎥", label: "YouTuber", desc: "I want to create YouTube content and animations", href: "/wizpilot" },
  { id: "kids", emoji: "🧒", label: "Kids Content Creator", desc: "I create content for children and families", href: "/music-video" },
  { id: "ai_creator", emoji: "🤖", label: "AI Creator", desc: "I want to automate my video content pipeline", href: "/wizpilot" },
];

const STYLE_IMAGES = [
  { label: "Cinematic", img: `${CDN}/style-cinematic-UvoChSsK7xZ9a7MR2bUHeq.webp` },
  { label: "Anime", img: `${CDN}/style-anime-bCLhyWeYo6mek5pWMnEUV7.webp` },
  { label: "Pixar 3D", img: `${CDN}/style-pixar3d-eN2z5fKQJJTuTc3Ghd84dV.webp` },
  { label: "Vintage", img: `${CDN}/style-vintage-iCZFjq9buUWkDWVxu3J7Qy.webp` },
];

export default function Onboarding() {
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedHref, setSelectedHref] = useState("/music-video");

  const totalSteps = 3;

  return (
    <div className="min-h-screen bg-[#080810] text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <a href="/" className="flex items-center gap-2">
          <img src={WIZVID_LOGO} alt="WizVid" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-black text-lg bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">WizVid</span>
        </a>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`w-8 h-1.5 rounded-full transition-all ${s <= step ? "bg-purple-500" : "bg-white/10"}`} />
            ))}
          </div>
          <span className="text-white/40 text-sm">Step {step} of {totalSteps}</span>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full">

          {/* Step 1: Creator type */}
          {step === 1 && (
            <div className="text-center">
              <Badge className="mb-6 bg-purple-500/20 text-purple-300 border-purple-500/30 px-4 py-1.5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />Welcome to WizVid
              </Badge>
              <h1 className="text-3xl md:text-4xl font-black mb-3">What type of creator are you?</h1>
              <p className="text-white/50 mb-10">We'll personalise your experience based on your goals.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {CREATOR_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => { setSelectedType(type.id); setSelectedHref(type.href); }}
                    className={`p-6 rounded-2xl border text-left transition-all ${
                      selectedType === type.id
                        ? "border-purple-500 bg-purple-500/15 ring-1 ring-purple-500/30"
                        : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div className="text-3xl mb-3">{type.emoji}</div>
                    <div className="font-bold mb-1">{type.label}</div>
                    <div className="text-white/50 text-sm">{type.desc}</div>
                    {selectedType === type.id && (
                      <div className="mt-3 flex items-center gap-1 text-purple-400 text-sm font-semibold">
                        <Check className="w-4 h-4" /> Selected
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <Button
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-10 py-4 rounded-2xl font-bold text-lg h-auto w-full sm:w-auto"
                onClick={() => setStep(2)}
                disabled={!selectedType}
              >
                Continue <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: What you'll get */}
          {step === 2 && (
            <div className="text-center">
              <Badge className="mb-6 bg-green-500/20 text-green-300 border-green-500/30 px-4 py-1.5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />Your Free Trial
              </Badge>
              <h1 className="text-3xl md:text-4xl font-black mb-3">Start creating for free</h1>
              <p className="text-white/50 mb-10">No credit card required. Create your first video today.</p>

              <div className="bg-gradient-to-b from-white/8 to-white/3 border border-white/10 rounded-3xl p-8 mb-8 text-left">
                <h3 className="font-bold text-lg mb-6 text-center">Your free trial includes:</h3>
                <div className="space-y-4">
                  {[
                    { icon: "🎬", text: "2 free AI videos — no card needed", sub: "Experience WizVid before committing" },
                    { icon: "🎨", text: "All 6 visual styles available", sub: "Cinematic, Anime, Pixar 3D, and more" },
                    { icon: "🎵", text: "WizBeat music video maker", sub: "Turn your songs into full music videos" },
                    { icon: "🎥", text: "WizPilot AI video creator", sub: "Create any video from a text description" },
                    { icon: "⚡", text: "Unlimited storyboard generation", sub: "Plan your video before spending credits" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-start gap-4">
                      <span className="text-2xl flex-shrink-0">{item.icon}</span>
                      <div>
                        <div className="font-semibold text-white">{item.text}</div>
                        <div className="text-white/40 text-sm">{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {STYLE_IMAGES.map((style) => (
                  <div key={style.label} className="relative rounded-2xl overflow-hidden aspect-video">
                    <img src={style.img} alt={style.label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span className="absolute bottom-2 left-3 text-white text-xs font-semibold">{style.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent px-8 py-4 rounded-2xl font-semibold h-auto flex-1" onClick={() => setStep(1)}>
                  ← Back
                </Button>
                <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-10 py-4 rounded-2xl font-bold text-lg h-auto flex-1" onClick={() => setStep(3)}>
                  Looks great! <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Sign up / Start */}
          {step === 3 && (
            <div className="text-center">
              <div className="text-6xl mb-6">🚀</div>
              <h1 className="text-3xl md:text-4xl font-black mb-3">You're ready to create!</h1>
              <p className="text-white/50 mb-10">
                {isAuthenticated
                  ? "Your account is ready. Jump straight into creating your first video."
                  : "Sign in to activate your free trial and start creating AI videos."}
              </p>

              <div className="bg-gradient-to-b from-white/8 to-white/3 border border-white/10 rounded-3xl p-8 mb-8">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Free Trial</div>
                    <div className="text-white/50 text-sm">2 videos · No card required</div>
                  </div>
                </div>

                {isAuthenticated ? (
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-4 rounded-2xl font-bold text-lg h-auto" asChild>
                    <a href={selectedHref}><Play className="w-5 h-5 mr-2" />Create My First Video</a>
                  </Button>
                ) : (
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-4 rounded-2xl font-bold text-lg h-auto" asChild>
                    <a href={getLoginUrl()}><Sparkles className="w-5 h-5 mr-2" />Sign Up Free — No Card Needed</a>
                  </Button>
                )}
              </div>

              <div className="space-y-2 text-sm text-white/30">
                <p>✓ No credit card required &nbsp;·&nbsp; ✓ Cancel anytime &nbsp;·&nbsp; ✓ Create videos in minutes</p>
                <p>Already have an account? <a href={getLoginUrl()} className="text-purple-400 hover:text-purple-300">Sign in</a></p>
              </div>

              <div className="mt-8 pt-8 border-t border-white/10">
                <p className="text-white/30 text-sm mb-4">Or explore first:</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <a href="/music-video" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-pink-500/30 text-sm text-white/60 hover:text-white transition-all">
                    🎵 WizBeat Music Videos
                  </a>
                  <a href="/wizpilot" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 text-sm text-white/60 hover:text-white transition-all">
                    🎬 WizPilot AI Creator
                  </a>
                  <a href="/pricing" className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 text-sm text-white/60 hover:text-white transition-all">
                    💰 View Pricing
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
