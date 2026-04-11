import React from 'react';
import { Music, Youtube, Sparkles, FileText, Zap } from 'lucide-react';

const Onboarding: React.FC = () => {
  const options = [
    {
      href: '/music-video/create',
      icon: Music,
      title: 'Music Video',
      description: 'Create stunning AI-powered music videos with character consistency and smart editing',
      color: 'from-purple-500 to-pink-500',
    },
    {
      href: '/wizpilot',
      icon: Youtube,
      title: 'YouTube Video',
      description: 'Transform your YouTube content into polished, edited videos with AI enhancement',
      color: 'from-red-500 to-orange-500',
    },
    {
      href: '/kids-video',
      icon: Sparkles,
      title: 'Kids Video',
      description: 'Create safe, engaging, and educational videos designed for children',
      color: 'from-pink-500 to-rose-500',
    },
    {
      href: '/text-to-video',
      icon: FileText,
      title: 'Text to Video',
      description: 'Turn your ideas into cinematic videos with AI-powered visual storytelling',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      href: '/music-creator',
      icon: Zap,
      title: 'AI Music Generator',
      description: 'Generate original, royalty-free music powered by Suno AI',
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 max-w-2xl">
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4 tracking-tight">
            What do you want to create?
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 font-light">
            We'll personalise your experience based on your creative goals.
          </p>
        </div>

        {/* Options Grid */}
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {options.map((option, index) => {
            const Icon = option.icon;
            return (
              <a
                key={index}
                href={option.href}
                className="group relative h-full transition-all duration-300 hover:-translate-y-2"
              >
                {/* Gradient glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-30 rounded-2xl blur-xl transition-all duration-300`} />
                
                {/* Main card */}
                <div className="relative h-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 group-hover:border-slate-600/80 rounded-2xl p-8 transition-all duration-300 group-hover:shadow-2xl overflow-hidden">
                  
                  {/* Icon container */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${option.color} p-3 mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon className="w-full h-full text-white" strokeWidth={1.5} />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-slate-100 transition-colors duration-300">
                    {option.title}
                  </h3>
                  
                  <p className="text-slate-400 text-sm leading-relaxed mb-6 group-hover:text-slate-300 transition-colors duration-300">
                    {option.description}
                  </p>

                  {/* CTA indicator */}
                  <div className="flex items-center text-sm font-semibold text-slate-300 group-hover:text-white transition-colors duration-300">
                    <span>Get Started</span>
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Footer text */}
        <div className="text-center text-slate-500 text-sm">
          <p>
            By continuing, you agree to WizVid's{' '}
            <a href="/terms" className="text-slate-300 hover:text-white transition-colors">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" className="text-slate-300 hover:text-white transition-colors">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
