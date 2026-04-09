import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import BackButton from "@/components/BackButton";
import { Sparkles, Music, Youtube, Baby, Cpu, ArrowRight, ArrowLeft, Check, Home } from "lucide-react";
import { useLocation } from "wouter";

const WIZVID_LOGO_FULL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/wizvid-logo-v2_02b60663.png";

const CARD_IMAGES = {
  music:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/onboarding-music-video-Lti8pizeJFuSUTkuX2SUfY.webp",
  youtube: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/onboarding-youtube-video-6X3kKvAJxkigT4BXCR4wzr.webp",
  kids:    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/onboarding-kids-video-4jtPsxNUHKapQcdfCEWTpZ.webp",
  other:   "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/onboarding-other-video-FnRcSMEshSBioqwE2ZWqnB.webp",
};

type CreatorType = "music" | "youtube" | "kids" | "other";

const CREATOR_TYPES: { id: CreatorType; icon: React.ReactNode; title: string; desc: string; accent: string }[] = [
  { id: "music",   icon: <Music className="w-5 h-5" />,   title: "Music Video",     desc: "Turn your songs into cinematic music videos",          accent: "from-purple-600/80 to-violet-900/90" },
  { id: "youtube", icon: <Youtube className="w-5 h-5" />, title: "YouTube Video",   desc: "Create engaging content that stands out in the feed",  accent: "from-red-600/70 to-slate-900/90" },
  { id: "kids",    icon: <Baby className="w-5 h-5" />,    title: "Kids Video",      desc: "Animated characters, nursery rhymes, and family content", accent: "from-pink-500/70 to-orange-900/90" },
  { id: "other",   icon: <Cpu className="w-5 h-5" />,     title: "Something Else",  desc: "Explore all AI video creation tools",                 accent: "from-blue-600/70 to-indigo-900/90" },
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

      {/* Header: Logo + Back to Home */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-12">
        <BackButton fallback="/" label="Back to Home" />

        <a href="/" className="flex items-center">
          <img
            src={WIZVID_LOGO_FULL}
            alt="WizVid"
            className="h-10 w-auto object-contain"
            style={{ minWidth: "120px" }}
          />
        </a>

        {/* Spacer to balance the flex row */}
        <div className="w-24" />
      </div>

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
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-[#a1a1aa] uppercase tracking-widest mb-4">Step 1 of 3</p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
              What do you want to create?
            </h1>
            <p className="text-[#a1a1aa] text-base">We'll personalise your experience based on your goals.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CREATOR_TYPES.map((ct) => (
              <button
                key={ct.id}
                onClick={() => handleCreatorSelect(ct.id)}
                className={`group relative overflow-hidden rounded-2xl border text-left transition-all focus:outline-none focus:ring-2 focus:ring-white/20 h-44 ${
                  creatorType === ct.id
                    ? "border-white/40 ring-2 ring-white/20"
                    : "border-white/10 hover:border-white/25"
                }`}
                aria-pressed={creatorType === ct.id}
              >
                {/* Background image */}
                <img
                  src={CARD_IMAGES[ct.id]}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t ${ct.accent} transition-opacity duration-300`} />

                {/* Darker bottom overlay for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between h-full p-5">
                  {/* Icon badge top-left */}
                  <div className="w-9 h-9 rounded-lg bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white">
                    {ct.icon}
                  </div>

                  {/* Title + desc bottom */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-white font-bold text-base">{ct.title}</h3>
                      <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-white/70 text-xs leading-relaxed">{ct.desc}</p>
                  </div>
                </div>
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
        By continuing, you agree to WizVid's{" "}
        <a href="/terms" className="underline hover:text-white transition-colors">Terms of Service</a>{" "}
        and{" "}
        <a href="/privacy" className="underline hover:text-white transition-colors">Privacy Policy</a>.
      </p>
    </div>
  );
}
