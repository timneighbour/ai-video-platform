import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Sparkles, Music, Youtube, Baby, Cpu, ArrowRight, ArrowLeft, Check, Play, Download } from "lucide-react";
import { useLocation } from "wouter";

type CreatorType = "music" | "youtube" | "kids" | "other";

const CREATOR_TYPES: { id: CreatorType; icon: React.ReactNode; title: string; desc: string; color: string }[] = [
  {
    id: "music",
    icon: <Music className="w-7 h-7" />,
    title: "Music Video",
    desc: "Turn your songs into cinematic music videos",
    color: "from-pink-500 to-purple-600",
  },
  {
    id: "youtube",
    icon: <Youtube className="w-7 h-7" />,
    title: "YouTube Video",
    desc: "Create engaging content that stands out in the feed",
    color: "from-red-500 to-orange-500",
  },
  {
    id: "kids",
    icon: <Baby className="w-7 h-7" />,
    title: "Kids Video",
    desc: "Animated characters, nursery rhymes, and family content",
    color: "from-yellow-400 to-green-500",
  },
  {
    id: "other",
    icon: <Cpu className="w-7 h-7" />,
    title: "Something Else",
    desc: "Explore all AI video creation tools",
    color: "from-cyan-500 to-blue-600",
  },
];

const FREE_BENEFITS = [
  { icon: "🎬", title: "2 free videos", desc: "No credit card required" },
  { icon: "⚡", title: "Done in minutes", desc: "AI handles everything" },
  { icon: "✂️", title: "No editing needed", desc: "Just upload or describe" },
  { icon: "🎨", title: "6 video styles", desc: "Cinematic, Anime, Pixar 3D & more" },
];

const DESTINATION: Record<CreatorType, string> = {
  music: "/music-video",
  youtube: "/wizpilot",
  kids: "/wizpilot",
  other: "/dashboard",
};

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [creatorType, setCreatorType] = useState<CreatorType | null>(null);
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleCreatorSelect = (type: CreatorType) => {
    setCreatorType(type);
    setStep(2);
  };

  const handleContinue = () => {
    if (step === 2) setStep(3);
  };

  const handleStart = () => {
    if (isAuthenticated) {
      navigate(creatorType ? DESTINATION[creatorType] : "/dashboard");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#080810] via-[#0d0d1a] to-[#080810] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <a href="/" className="mb-10 flex items-center gap-2">
        <span className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">WizVid</span>
      </a>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              s < step ? "bg-green-500 text-white" : s === step ? "bg-purple-600 text-white ring-4 ring-purple-500/30" : "bg-white/10 text-white/40"
            }`}>
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 transition-all ${s < step ? "bg-green-500" : "bg-white/10"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Creator Type */}
      {step === 1 && (
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />Step 1 of 3
            </Badge>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
              What do you want to create?
            </h1>
            <p className="text-white/60 text-lg">We'll personalise your experience based on your goals.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CREATOR_TYPES.map((ct) => (
              <button
                key={ct.id}
                onClick={() => handleCreatorSelect(ct.id)}
                className={`group relative p-6 rounded-2xl border text-left transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                  creatorType === ct.id
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                }`}
                aria-pressed={creatorType === ct.id}
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${ct.color} mb-4 text-white`}>
                  {ct.icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{ct.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{ct.desc}</p>
                <ArrowRight className="absolute top-6 right-6 w-5 h-5 text-white/20 group-hover:text-white/60 transition-all group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Free Trial Preview */}
      {step === 2 && (
        <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-green-500/20 text-green-300 border-green-500/30">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />Step 2 of 3
            </Badge>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
              Start creating for free
            </h1>
            <p className="text-white/60 text-lg">No credit card required. Create your first video today.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              {FREE_BENEFITS.map((b) => (
                <div key={b.title} className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">{b.icon}</span>
                  <div>
                    <div className="text-white font-semibold text-sm">{b.title}</div>
                    <div className="text-white/40 text-xs">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-pink-500/10 to-purple-600/10 border border-purple-500/20 rounded-2xl p-5 mb-8 text-center">
            <p className="text-white/80 font-semibold">
              🎁 Your free trial includes <span className="text-pink-300">2 videos</span> — no card needed
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="border-white/20 text-white/60 hover:text-white bg-transparent hover:bg-white/10 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />Back
            </Button>
            <Button
              onClick={handleContinue}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl font-bold py-3"
            >
              Looks great! <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Sign Up / Start */}
      {step === 3 && (
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 text-center">
          <Badge className="mb-4 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />Step 3 of 3
          </Badge>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
            You're ready to create!
          </h1>
          <p className="text-white/60 text-lg mb-8">
            {isAuthenticated
              ? "You're signed in. Let's make your first video."
              : "Sign in to activate your free trial and start creating AI videos."}
          </p>

          <div className="space-y-4 mb-8">
            {[
              "✓ 2 free videos — no credit card",
              "✓ AI generates everything for you",
              "✓ Done in minutes",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-white/70 text-sm">
                <span className="text-green-400 font-bold">{item.split(" ")[0]}</span>
                <span>{item.slice(2)}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={handleStart}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-lg px-8 py-4 rounded-2xl font-bold shadow-2xl shadow-pink-500/30 hover:scale-105 transition-all h-auto"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {isAuthenticated ? "Create My First Video" : "Sign Up Free — No Card Needed"}
          </Button>

          <p className="mt-4 text-white/30 text-xs">
            ✓ No credit card required · ✓ Cancel anytime · ✓ Create videos in minutes
          </p>

          <button
            onClick={() => setStep(2)}
            className="mt-4 text-white/40 hover:text-white/60 text-sm transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />Back
          </button>
        </div>
      )}
    </div>
  );
}
