import React from 'react';
import { Music, Play, Sparkles, Wand2, Waves, ArrowRight, ArrowLeft } from 'lucide-react';

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
    isPopular: false,
  },
  {
    href: '/kids-video',
    icon: Sparkles,
    title: 'Kids Animation Creator',
    description: 'Create stunning animated kids videos in Pixar, cartoon, or storybook styles',
    color: 'from-pink-600 to-rose-600',
    borderColor: 'hover:border-pink-500/50',
    isPopular: false,
  },
  {
    href: '/text-to-video',
    icon: Wand2,
    title: 'Text to Video',
    description: 'Turn your ideas into cinematic videos with AI-powered visual storytelling',
    color: 'from-blue-600 to-cyan-600',
    borderColor: 'hover:border-blue-500/50',
    isPopular: false,
  },
  {
    href: '/music-creator',
    icon: Waves,
    title: 'AI Music Generator',
    description: 'Generate original, royalty-free music powered by Suno AI in any style',
    color: 'from-emerald-600 to-teal-600',
    borderColor: 'hover:border-emerald-500/50',
    isPopular: false,
  },
];

const Onboarding: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black overflow-hidden">
      {/* Back button */}
      <div className="fixed top-6 left-6 z-50">
        <a
          href="/"
          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors duration-300 group"
          aria-label="Go back to homepage"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="text-sm font-medium">Back</span>
        </a>
      </div>

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        {/* Header section */}
        <div className="text-center mb-20 max-w-3xl">
          <div className="inline-block mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <p className="text-sm font-semibold text-purple-300">Step 1 of 2 – Choose your creation type</p>
          </div>

          <h1 className="text-6xl sm:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
            Choose what you want to create
          </h1>

          <p className="text-xl text-slate-300 font-light mb-8">
            No editing skills needed — just describe your video and WizVid does the rest
          </p>

          <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
            <span>✨ No editing skills needed</span>
            <span className="text-slate-600">•</span>
            <span>⚡ Ready in minutes</span>
            <span className="text-slate-600">•</span>
            <span>🎬 Just describe your video</span>
          </div>
        </div>

        {/* Options Grid */}
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {options.map((option, index) => {
            const Icon = option.icon;
            return (
              <a
                key={index}
                href={option.href}
                className="group relative h-full transition-all duration-500 hover:-translate-y-2 outline-none block"
              >
                {/* Gradient glow background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-40 rounded-2xl blur-2xl transition-all duration-500 pointer-events-none`} />

                {/* Main card container */}
                <div className={`relative h-full bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-slate-700/40 ${option.borderColor} rounded-2xl p-8 transition-all duration-500 group-hover:shadow-2xl overflow-hidden ${
                  option.isPopular ? 'ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20' : ''
                }`}>
                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
                  </div>

                  {/* Popular badge */}
                  {option.isPopular && (
                    <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-xs font-semibold text-white pointer-events-none">
                      Most popular
                    </div>
                  )}

                  {/* Icon */}
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

                  {/* CTA */}
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

        {/* Footer */}
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
