import React, { useEffect } from 'react';
import { Music, Play, Sparkles, Wand2, Waves, ArrowRight, ArrowLeft } from 'lucide-react';
import { mp } from '@/lib/mixpanel';

const options = [
  {
    href: '/music-video/create',
    icon: Music,
    title: 'WizVideo · Music Video Creator',
    description: 'Turn your lyrics and audio into a full cinematic music video — with AI storyboard, characters, and scenes.',
    isPopular: true,
  },
  {
    href: '/wizpilot',
    icon: Play,
    title: 'YouTube Video Creator',
    description: 'Auto-enhance your YouTube videos with AI editing, music, and professional polish.',
    isPopular: false,
  },
  {
    href: '/products/wizanimate',
    icon: Sparkles,
    title: 'WizAnimate',
    description: 'Bring your characters to life with fluid AI animation — beat-matched, emotion-driven, and cinematic.',
    isPopular: false,
  },
  {
    href: '/text-to-video',
    icon: Wand2,
    title: 'Text to Video',
    description: 'Turn your ideas into cinematic videos with AI-powered visual storytelling.',
    isPopular: false,
  },
  {
    href: '/music-creator',
    icon: Waves,
    title: 'AI Music Generator',
    description: 'Generate original, royalty-free music in any style — powered by WizAudio.',
    isPopular: false,
  },
];

const Onboarding: React.FC = () => {
  useEffect(() => { mp.onboardingStarted(); }, []);
  return (
    <div className="min-h-screen bg-[#040404] overflow-hidden">
      {/* Back button */}
      <div className="fixed top-6 left-6 z-50">
        <a
          href="/"
          className="flex items-center gap-2 px-4 py-2 text-[--color-silver-dark]/50 hover:text-[--color-silver] transition-colors duration-300 group"
          aria-label="Go back to homepage"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="text-sm font-medium">Back</span>
        </a>
      </div>

      {/* Ambient background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[--color-gold]/[0.04] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[--color-gold]/[0.03] rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        {/* Header section */}
        <div className="text-center mb-20 max-w-3xl">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-[--color-gold]/[0.12] bg-[--color-gold]/[0.03]">
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[--color-gold-dark]">Step 1 of 2 — Choose your creation type</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
            What would you like to <span className="metallic-gold">create?</span>
          </h1>

          <p className="text-xl text-[--color-silver-dark]/50 font-light mb-8">
            No editing skills needed — just describe your video and WIZ AI does the rest.
          </p>

          <div className="flex items-center justify-center gap-4 text-xs text-[--color-silver-dark]/35">
            <span>No editing skills needed</span>
            <span className="text-[--color-gold]/[0.15]">·</span>
            <span>Ready in minutes</span>
            <span className="text-[--color-gold]/[0.15]">·</span>
            <span>Just describe your video</span>
          </div>
        </div>

        {/* Options Grid */}
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {options.map((option, index) => {
            const Icon = option.icon;
            return (
              <a
                key={index}
                href={option.href}
                onClick={() => { mp.onboardingCompleted(option.title); mp.productCardClicked(option.title); }}
                className="group relative h-full transition-all duration-500 hover:-translate-y-1 outline-none block"
              >
                {/* Main card container */}
                <div className={`relative h-full bg-[#0a0a0a] border border-[--color-gold]/[0.06] hover:border-[--color-gold]/[0.15] rounded-2xl p-8 transition-all duration-500 overflow-hidden ${
                  option.isPopular ? 'ring-1 ring-[--color-gold]/[0.2]' : ''
                }`}>
                  {/* Subtle glow on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: "radial-gradient(ellipse 80% 80% at 50% 0%, rgba(196,164,100,0.04) 0%, transparent 60%)" }}
                  />

                  {/* Popular badge */}
                  {option.isPopular && (
                    <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-[--color-gold-dark] to-[--color-gold] rounded-full text-[10px] font-bold text-[#0a0a0a] tracking-wide uppercase pointer-events-none">
                      Most popular
                    </div>
                  )}

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-[--color-gold]/[0.06] border border-[--color-gold]/[0.1] p-3 mb-6 group-hover:scale-105 transition-transform duration-500 pointer-events-none">
                    <Icon className="w-full h-full text-[--color-gold]" strokeWidth={1.5} />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-3 pointer-events-none">
                    {option.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[--color-silver-dark]/45 text-sm leading-relaxed mb-8 pointer-events-none">
                    {option.description}
                  </p>

                  {/* CTA */}
                  <div className="flex items-center justify-between pointer-events-none">
                    <span className="text-sm font-semibold text-[--color-silver-dark]/50 group-hover:text-[--color-gold] transition-colors duration-300">
                      Start Creating
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[--color-gold]/[0.06] group-hover:bg-[--color-gold]/[0.12] flex items-center justify-center transition-all duration-300 group-hover:translate-x-1">
                      <ArrowRight className="w-4 h-4 text-[--color-gold-dark]" />
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-[--color-silver-dark]/25 text-xs">
          <p>
            By continuing, you agree to WIZ AI's{' '}
            <a href="/terms" className="text-[--color-silver-dark]/35 hover:text-[--color-gold-dark] transition-colors font-medium">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" className="text-[--color-silver-dark]/35 hover:text-[--color-gold-dark] transition-colors font-medium">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
