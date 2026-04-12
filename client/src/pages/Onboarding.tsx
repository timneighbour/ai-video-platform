import React from 'react';
import { Music, Play, Sparkles, Wand2, Waves, ArrowRight, ArrowLeft } from 'lucide-react';

/**
 * BULLETPROOF ONBOARDING NAVIGATION
 * 
 * Design principles:
 * - Each option is a pure <a> tag with href (no state, no delays, no disabled states)
 * - No click interference: no overlays, no pointer-events tricks, no z-index conflicts
 * - Visual feedback via CSS hover states only (no JavaScript state)
 * - Back button is a simple <a> tag to /
 * - No animation wrappers that could intercept clicks
 * - No setTimeout delays that create race conditions
 * 
 * This implementation prioritizes reliability over animation polish.
 * Navigation CANNOT break, regardless of UI changes.
 */

const Onboarding: React.FC = () => {
  // Log navigation attempts for debugging
  const handleNavigation = (href: string) => {
    console.log(`[Onboarding Navigation] Attempting to navigate to: ${href}`);
  };

  const options = [
    {
      href: '/music-video/create',
      icon: Music,
      title: 'WizBeat · Music Video Creator',
      description: 'Turn your lyrics and audio into a full cinematic music video — with AI storyboard, characters, and scenes',
      color: 'from-purple-600 to-pink-600',
      borderColor: 'hover:border-purple-500/50',
      isPopular: true,
    },
    {
      href: '/wizpilot',
      icon: Play,
      title: 'YouTube Video Creator',
      description: 'Auto-enhance your YouTube videos with AI editing, music, and professional polish',
      color: 'from-red-600 to-orange-600',
      borderColor: 'hover:border-red-500/50',
    },
    {
      href: '/kids-video',
      icon: Sparkles,
      title: 'Kids Video Maker',
      description: 'Create safe, fun, and educational videos designed specifically for children',
      color: 'from-pink-600 to-rose-600',
      borderColor: 'hover:border-pink-500/50',
    },
    {
      href: '/text-to-video',
      icon: Wand2,
      title: 'Text to Video',
      description: 'Turn your ideas into cinematic videos with AI-powered visual storytelling',
      color: 'from-blue-600 to-cyan-600',
      borderColor: 'hover:border-blue-500/50',
    },
    {
      href: '/music-creator',
      icon: Waves,
      title: 'AI Music Generator',
      description: 'Generate original, royalty-free music powered by Suno AI in any style',
      color: 'from-emerald-600 to-teal-600',
      borderColor: 'hover:border-emerald-500/50',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black overflow-hidden">
      {/* Back button - pure anchor tag, no state */}
      <div className="fixed top-6 left-6 z-50">
        <a
          href="/"
          onClick={() => handleNavigation('/')}
          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors duration-300 group"
          aria-label="Go back to homepage"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="text-sm font-medium">Back</span>
        </a>
      </div>

      {/* Animated background elements - pointer-events-none to prevent interference */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        {/* Header section */}
        <div className="text-center mb-20 max-w-3xl">
          {/* Progress indicator */}
          <div className="inline-block mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <p className="text-sm font-semibold text-purple-300">Step 1 of 2 – Choose your creation type</p>
          </div>

          <h1 className="text-6xl sm:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
            Choose what you want to create
          </h1>

          <p className="text-xl text-slate-300 font-light mb-8">
            WizVid does the rest
          </p>

          {/* Trust line */}
          <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
            <span>✨ No editing skills needed</span>
            <span className="text-slate-600">•</span>
            <span>⚡ Ready in minutes</span>
          </div>
          <p className="text-slate-500 text-sm mt-6">Your video will be ready in minutes</p>
        </div>

        {/* Options Grid - Each option is a pure <a> tag */}
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {options.map((option, index) => {
            const Icon = option.icon;

            return (
              <a
                key={index}
                href={option.href}
                onClick={() => handleNavigation(option.href)}
                className="group relative h-full transition-all duration-500 hover:-translate-y-2 cursor-pointer outline-none block"
              >
                {/* Gradient glow background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-40 rounded-2xl blur-2xl transition-all duration-500 pointer-events-none`} />

                {/* Main card container - NO nested clickable elements */}
                <div className={`relative h-full bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-slate-700/40 ${option.borderColor} rounded-2xl p-8 transition-all duration-500 group-hover:shadow-2xl overflow-hidden ${
                  option.isPopular ? 'ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20' : ''
                }`}>
                  {/* Shine effect on hover - pointer-events-none */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                  </div>

                  {/* Popular badge */}
                  {option.isPopular && (
                    <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-xs font-semibold text-white pointer-events-none">
                      Most popular
                    </div>
                  )}

                  {/* Icon container with gradient background */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${option.color} p-3 mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg pointer-events-none`}>
                    <Icon className="w-full h-full text-white" strokeWidth={1.5} />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-slate-50 transition-colors duration-300 pointer-events-none">
                    {option.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-400 text-sm leading-relaxed mb-8 group-hover:text-slate-300 transition-colors duration-300 pointer-events-none">
                    {option.description}
                  </p>

                  {/* CTA with animated arrow */}
                  <div className="flex items-center justify-between pointer-events-none">
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors duration-300">
                      Get Started
                    </span>
                    <div className="w-8 h-8 rounded-full bg-slate-700/50 group-hover:bg-slate-600 flex items-center justify-center transition-all duration-300 group-hover:translate-x-1">
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors duration-300" />
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Footer section */}
        <div className="text-center text-slate-500 text-xs">
          <p>
            By continuing, you agree to WizVid's{' '}
            <a href="/terms" className="text-slate-400 hover:text-slate-200 transition-colors font-medium">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" className="text-slate-400 hover:text-slate-200 transition-colors font-medium">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
