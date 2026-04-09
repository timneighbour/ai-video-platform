import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Sparkles, Music, Youtube, Baby, Cpu, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useLocation } from "wouter";

const CDN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx";
const WIZVID_LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-v2_02b60663.png";

type CreatorType = "music" | "youtube" | "kids" | "other";

const CREATOR_TYPES: { id: CreatorType; icon: React.ReactNode; title: string; desc: string }[] = [
  { id: "music",   icon: <Music className="w-5 h-5" />,   title: "Music Video",    desc: "Turn your songs into cinematic music videos" },
  { id: "youtube", icon: <Youtube className="w-5 h-5" />, title: "YouTube Video",  desc: "Create engaging content that stands out in the feed" },
  { id: "kids",    icon: <Baby className="w-5 h-5" />,    title: "Kids Video",     desc: "Animated characters, nursery rhymes, and family content" },
  { id: "other",   icon: <Cpu className="w-5 h-5" />,     title: "Something Else", desc: "Explore all AI video creation tools" },
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

  const handleStart = () => {
    if (isAuthenticated) {
      navigate(creatorType ? DESTINATION[creatorType] : "/dashboard");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-6 py-16 font-sans">
      {/* Logo */}
      <a href="/" className="mb-12 flex items-center gap-2.5">
        <img src={WIZVID_LOGO_FULL} alt="WizVid" className="h-11 w-auto object-contain" />
      </a>

      {/* Progress indicator */}
      <div className="flex items-center gap-3 mb-12">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
              s < step
                ? "bg-white text-black"
                : s === step
                ? "bg-white text-black ring-4 ring-white/15"
                : "bg-white/8 text-[#a1a1aa] border border-white/10"
            }`}>
              {s < step ? <Check className="w-3.5 h-3.5" /> : s}
            </div>
            {s < 3 && (
              <div className={`w-10 h-px transition-all ${s < step ? "bg-white/40" : "bg-white/10"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Creator Type */}
      {step === 1 && (
        <div className="w-full max-w-xl">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">Step 1 of 3</p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
              What do you want to create?
            </h1>
            <p className="text-[#a1a1aa] text-base">We'll personalise your experience based on your goals.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CREATOR_TYPES.map((ct) => (
              <button
                key={ct.id}
                onClick={() => handleCreatorSelect(ct.id)}
                className={`group relative p-5 rounded-xl border text-left transition-all focus:outline-none focus:ring-2 focus:ring-white/20 ${
                  creatorType === ct.id
                    ? "border-white/30 bg-white/8"
                    : "border-white/8 bg-[#171717] hover:border-white/15 hover:bg-white/5"
                }`}
                aria-pressed={creatorType === ct.id}
              >
                <div className="w-9 h-9 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-[#a1a1aa] mb-3">
                  {ct.icon}
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">{ct.title}</h3>
                <p className="text-[#a1a1aa] text-xs leading-relaxed">{ct.desc}</p>
                <ArrowRight className="absolute top-5 right-5 w-4 h-4 text-white/15 group-hover:text-white/40 transition-all group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Free Trial Preview */}
      {step === 2 && (
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">Step 2 of 3</p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
              Start creating for free
            </h1>
            <p className="text-[#a1a1aa] text-base">No credit card required. Create your first video today.</p>
          </div>

          <div className="bg-[#171717] border border-white/8 rounded-2xl p-6 mb-4">
            <div className="grid grid-cols-2 gap-5">
              {FREE_BENEFITS.map((b) => (
                <div key={b.title} className="flex items-start gap-3">
                  <span className="text-xl" aria-hidden="true">{b.icon}</span>
                  <div>
                    <div className="text-white font-semibold text-sm">{b.title}</div>
                    <div className="text-[#a1a1aa] text-xs mt-0.5">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/4 border border-white/8 rounded-xl p-4 mb-8 text-center">
            <p className="text-[#a1a1aa] text-sm">
              🎁 Your free trial includes <span className="text-white font-semibold">2 videos</span> — no card needed
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="border-white/12 text-[#a1a1aa] hover:text-white bg-transparent hover:bg-white/5 rounded-xl h-11 px-5"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              className="flex-1 bg-white text-black hover:bg-white/90 rounded-xl font-semibold h-11"
            >
              Looks great! <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Sign Up / Start */}
      {step === 3 && (
        <div className="w-full max-w-sm text-center">
          <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">Step 3 of 3</p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
            You're ready to create!
          </h1>
          <p className="text-[#a1a1aa] text-base mb-8">
            {isAuthenticated
              ? "You're signed in. Let's make your first video."
              : "Sign in to activate your free trial and start creating AI videos."}
          </p>

          <div className="bg-[#171717] border border-white/8 rounded-2xl p-5 mb-8">
            {[
              "2 free videos — no card required",
              "AI handles the full creation process",
              "Download and share anywhere",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-[#a1a1aa] text-sm">{item}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={handleStart}
            className="w-full bg-white text-black hover:bg-white/90 rounded-xl font-semibold h-12 text-base shadow-lg hover:shadow-xl transition-all mb-4"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isAuthenticated ? "Start creating" : "Sign in & start free"}
          </Button>

          <button
            onClick={() => setStep(2)}
            className="text-[#a1a1aa] hover:text-white text-sm transition-colors"
          >
            ← Back
          </button>
        </div>
      )}

      {/* Footer note */}
      <p className="mt-16 text-[#a1a1aa] text-xs text-center max-w-xs">
        By continuing, you agree to WizVid's Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
