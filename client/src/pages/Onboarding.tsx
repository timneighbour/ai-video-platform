import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, Sparkles, Play, Film, Music, Wand2, Zap, Image } from 'lucide-react';
import { mp } from '@/lib/mixpanel';
import { analytics } from '@/lib/analytics';

const CDN = '/manus-storage';

const options = [
  {
    href: '/music-video/create',
    title: 'WizVideo™',
    subtitle: 'AI Music Video Director',
    description: 'Turn your audio track into a full cinematic music video — beat-locked, colour-graded, 4K. AI storyboard, characters, and scenes.',
    isPopular: true,
    icon: Film,
    bg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-cinematic-1-7fzYSK4QF3mixYeH3YCQwJ.webp",
    bgAlt: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-cinematic-2-h73cYMBR7EECiKvo2X9uWr.webp",
    accentColor: '#b8892a',
    glowColor: 'rgba(184,137,42,0.35)',
    tag: 'Most Popular',
    tagColor: 'from-[#b8892a] to-[#e8c878]',
    stats: ['Full music video', 'AI storyboard', 'Character sync'],
  },
  {
    href: '/wiz-shorts',
    title: 'WizShorts™',
    subtitle: 'Short-Form Creator Studio',
    description: 'Platform-optimised short-form videos for TikTok, YouTube Shorts, Instagram Reels, and Snapchat — Hook/Story/CTA structure built in.',
    isPopular: false,
    icon: Play,
    bg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-documentary-1-27gSFotXB4DE92dN47HiDu.webp",
    bgAlt: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-realistic-1-3PQ9beTsYUCXpz7YnqEHJd.webp",
    accentColor: '#d946ef',
    glowColor: 'rgba(217,70,239,0.25)',
    tag: 'For Creators',
    tagColor: 'from-[#d946ef] to-[#e879f9]',
    stats: ['4 platforms', 'Auto-captions', 'Viral ready'],
  },
  {
    href: '/kids-video',
    title: 'WizAnimate™', // direct to studio
    subtitle: 'Character Animation Studio',
    description: 'Bring your characters to life with fluid AI animation — beat-matched, emotion-driven, and cinematic.',
    isPopular: false,
    icon: Sparkles,
    bg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-anime-1-V8cGaKNXBvMPgNtyuk2xCr.webp",
    bgAlt: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-pixar-1-63hx7LosqShdkEWUgxNme8.webp",
    accentColor: '#a855f7',
    glowColor: 'rgba(168,85,247,0.3)',
    tag: 'Animation',
    tagColor: 'from-[#a855f7] to-[#c084fc]',
    stats: ['Beat-matched', 'Character AI', 'Cinematic'],
  },
  {
    href: '/text-to-video',
    title: 'WizScript™',
    subtitle: 'AI Screenplay Studio',
    description: 'Turn any idea into a full cinematic video — WizScript™ writes the script, builds the scenes, and renders the video.',
    isPopular: false,
    icon: Wand2,
    bg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-epic-fantasy-1-4xZQHj6htBWh5fPP25HQQf.webp",
    bgAlt: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-neon-noir-1-GDpPcEYGEwEHgfbURRVa2k.webp",
    accentColor: '#06b6d4',
    glowColor: 'rgba(6,182,212,0.25)',
    tag: 'Text → Video',
    tagColor: 'from-[#06b6d4] to-[#67e8f9]',
    stats: ['Any idea', 'Full scenes', 'Instant'],
  },
  {
    href: '/music-creator',
    title: 'WizAudio™',
    subtitle: 'AI Music Studio',
    description: 'Generate original, royalty-free music in any style — studio-grade audio powered by WizAudio™.',
    isPopular: false,
    icon: Music,
    bg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-abstract-1-ZjbMsSCt6wFuq7NBMAyxHR.webp",
    bgAlt: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-vintage-1-NfTaSxo6s5jch2UiSEYkKJ.webp",
    accentColor: '#22c55e',
    glowColor: 'rgba(34,197,94,0.25)',
    tag: 'Audio AI',
    tagColor: 'from-[#22c55e] to-[#86efac]',
    stats: ['Any genre', 'Royalty-free', 'Studio grade'],
  },
  {
    href: '/wiz-image',
    title: 'WizImage™',
    subtitle: 'AI Visual Creator',
    description: 'Describe any image and WizImage renders it in seconds — photorealistic, cinematic, anime, oil painting, and more.',
    isPopular: false,
    icon: Image,
    bg: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-cinematic-1-7fzYSK4QF3mixYeH3YCQwJ.webp",
    bgAlt: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-anime-1-V8cGaKNXBvMPgNtyuk2xCr.webp",
    accentColor: '#6366f1',
    glowColor: 'rgba(99,102,241,0.25)',
    tag: 'Image AI',
    tagColor: 'from-[#6366f1] to-[#818cf8]',
    stats: ['8 art styles', 'Photorealistic', 'Instant'],
  },
];

const WIZAI_LOGO = "/manus-storage/wizai-logo-premium-transparent_ac3f550b.png";

const Onboarding: React.FC = () => {
  useEffect(() => { mp.onboardingStarted(); }, []);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#030303] overflow-hidden relative">

      {/* ── Cinematic background layer ─────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Deep space gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#030303] to-[#020202]" />
        {/* Ambient gold orb top-right */}
        <div
          className="absolute -top-60 right-0 w-[700px] h-[700px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #c4a464 0%, transparent 70%)' }}
        />
        {/* Ambient purple orb bottom-left */}
        <div
          className="absolute -bottom-80 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }}
        />
        {/* Subtle grid lines */}
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
        {/* Horizontal scan line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#b8892a]/20 to-transparent" />
      </div>

      {/* ── Back button ────────────────────────────────────────────────────── */}
      <div className="fixed top-6 left-6 z-50">
        <a
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/80 hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-300 group backdrop-blur-sm"
          aria-label="Go back to homepage"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-300" />
          <span className="text-xs font-medium tracking-wide">Back</span>
        </a>
      </div>

      {/* ── WIZ AI logo top-center ─────────────────────────────────────────── */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
        <img src={WIZAI_LOGO} alt="WIZ AI" className="h-[2.8rem] w-auto opacity-70" />
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-start px-4 pt-28 pb-16 sm:px-6 lg:px-8">

        {/* ── Step indicator ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#b8892a] to-[#e8c878] flex items-center justify-center text-[10px] font-bold text-black">1</div>
            <div className="w-16 h-px bg-gradient-to-r from-[#b8892a]/60 to-white/10" />
            <div className="w-6 h-6 rounded-full border border-white/15 flex items-center justify-center text-[10px] font-medium text-white/30">2</div>
          </div>
          <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#b8892a]/70 ml-2">Choose your creation type</span>
        </div>

        {/* ── Hero headline ──────────────────────────────────────────────── */}
        <div className="text-center mb-4 max-w-3xl">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05] mb-5">
            What would you like to{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #e8c878 0%, #b8892a 40%, #f2dfa0 70%, #c4a464 100%)' }}
            >
              create?
            </span>
          </h1>
          <p className="text-lg text-white/40 font-light max-w-xl mx-auto leading-relaxed">
            No editing skills needed — just describe your idea and WIZ AI does the rest.
          </p>
        </div>

        {/* ── Trust badges ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-5 mb-14 text-[11px] text-white/25 font-medium tracking-wide">
          {['No editing skills needed', 'Ready in minutes', 'Free to start'].map((item, i) => (
            <React.Fragment key={item}>
              {i > 0 && <span className="w-1 h-1 rounded-full bg-[#b8892a]/30" />}
              <span>{item}</span>
            </React.Fragment>
          ))}
        </div>

        {/* ── Cards grid ─────────────────────────────────────────────────── */}
        <div className="w-full max-w-7xl">

          {/* Top row: WizVideo (large featured) + 2 cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

            {/* ── Featured card: WizVideo ─────────────────────────────── */}
            <a
              href={options[0].href}
              onClick={() => { mp.onboardingCompleted(options[0].title); mp.productCardClicked(options[0].title); analytics.generateVideoClicked("onboarding", { tool: options[0].title }); }}
              onMouseEnter={() => setHovered(0)}
              onMouseLeave={() => setHovered(null)}
              className="lg:col-span-2 group relative rounded-3xl overflow-hidden cursor-pointer block"
              style={{ minHeight: '340px' }}
            >
              {/* Background image */}
              <div className="absolute inset-0">
                <img
                  src={hovered === 0 ? options[0].bgAlt : options[0].bg}
                  alt=""
                  className="w-full h-full object-cover transition-all duration-700 scale-100 group-hover:scale-105"
                />
                {/* Dark overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
              </div>

              {/* Gold border glow on hover */}
              <div
                className="absolute inset-0 rounded-3xl transition-opacity duration-500 opacity-0 group-hover:opacity-100 pointer-events-none"
                style={{ boxShadow: `inset 0 0 0 1.5px rgba(184,137,42,0.5), 0 0 60px rgba(184,137,42,0.15)` }}
              />

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-between p-8 sm:p-10" style={{ minHeight: '340px' }}>
                <div className="flex items-start justify-between">
                  {/* Tag */}
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${options[0].tagColor} text-[10px] font-bold text-black tracking-wide uppercase`}>
                    <Zap className="w-2.5 h-2.5" />
                    {options[0].tag}
                  </div>
                  {/* Icon circle */}
                  <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Film className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                </div>

                <div>
                  {/* Product name */}
                  <div className="mb-1">
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">{options[0].title}</span>
                    <span className="ml-3 text-lg font-light text-white/50">{options[0].subtitle}</span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-md">
                    {options[0].description}
                  </p>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mb-6">
                    {options[0].stats.map((stat) => (
                      <span key={stat} className="px-3 py-1 rounded-full bg-white/8 border border-white/10 text-white/50 text-[11px] font-medium">
                        {stat}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#b8892a] to-[#e8c878] text-black text-sm font-bold group-hover:shadow-[0_0_30px_rgba(184,137,42,0.5)] transition-all duration-300">
                      <span>Start Creating</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </a>

            {/* ── Right column: YouTube + WizAnimate ─────────────────── */}
            <div className="flex flex-col gap-5">
              {[options[1], options[2]].map((option, idx) => {
                const realIdx = idx + 1;
                const Icon = option.icon;
                return (
                  <a
                    key={option.href}
                    href={option.href}
                    onClick={() => { mp.onboardingCompleted(option.title); mp.productCardClicked(option.title); analytics.generateVideoClicked("onboarding", { tool: option.title }); }}
                    onMouseEnter={() => setHovered(realIdx)}
                    onMouseLeave={() => setHovered(null)}
                    className="group relative rounded-2xl overflow-hidden cursor-pointer block flex-1"
                    style={{ minHeight: '155px' }}
                  >
                    {/* Background */}
                    <div className="absolute inset-0">
                      <img
                        src={hovered === realIdx ? option.bgAlt : option.bg}
                        alt=""
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/25" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
                    </div>

                    {/* Accent border on hover */}
                    <div
                      className="absolute inset-0 rounded-2xl transition-opacity duration-500 opacity-0 group-hover:opacity-100 pointer-events-none"
                      style={{ boxShadow: `inset 0 0 0 1.5px ${option.accentColor}66` }}
                    />

                    {/* Content */}
                    <div className="relative z-10 h-full flex flex-col justify-between p-5" style={{ minHeight: '155px' }}>
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full bg-gradient-to-r ${option.tagColor} text-[9px] font-bold text-black tracking-wide uppercase`}>
                          {option.tag}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Icon className="w-4 h-4 text-white" strokeWidth={1.5} />
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-white mb-0.5">{option.title}</div>
                        <div className="text-xs text-white/45 mb-3">{option.subtitle}</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-white/50 group-hover:text-white/80 transition-colors">Start Creating</span>
                          <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all duration-300" />
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

           {/* Bottom row: WizScript + WizSound + WizImage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[options[3], options[4], options[5]].map((option, idx) => {
              const realIdx = idx + 3;
              const Icon = option.icon;
              return (
                <a
                  key={option.href}
                  href={option.href}
                  onClick={() => { mp.onboardingCompleted(option.title); mp.productCardClicked(option.title); analytics.generateVideoClicked("onboarding", { tool: option.title }); }}
                  onMouseEnter={() => setHovered(realIdx)}
                  onMouseLeave={() => setHovered(null)}
                  className="group relative rounded-2xl overflow-hidden cursor-pointer block"
                  style={{ minHeight: '200px' }}
                >
                  {/* Background */}
                  <div className="absolute inset-0">
                    <img
                      src={hovered === realIdx ? option.bgAlt : option.bg}
                      alt=""
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/55 to-black/20" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent" />
                  </div>

                  {/* Accent border on hover */}
                  <div
                    className="absolute inset-0 rounded-2xl transition-opacity duration-500 opacity-0 group-hover:opacity-100 pointer-events-none"
                    style={{ boxShadow: `inset 0 0 0 1.5px ${option.accentColor}55, 0 0 40px ${option.glowColor}` }}
                  />

                  {/* Content */}
                  <div className="relative z-10 h-full flex flex-col justify-between p-7" style={{ minHeight: '200px' }}>
                    <div className="flex items-start justify-between">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r ${option.tagColor} text-[10px] font-bold text-black tracking-wide uppercase`}>
                        {option.tag}
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-4.5 h-4.5 text-white" strokeWidth={1.5} />
                      </div>
                    </div>

                    <div>
                      <div className="text-2xl font-black text-white mb-0.5">{option.title}</div>
                      <div className="text-sm text-white/45 mb-3">{option.subtitle}</div>
                      <p className="text-white/45 text-xs leading-relaxed mb-4 max-w-sm">{option.description}</p>

                      {/* Stats */}
                      <div className="flex items-center gap-2 mb-4">
                        {option.stats.map((stat) => (
                          <span key={stat} className="px-2.5 py-0.5 rounded-full bg-white/6 border border-white/8 text-white/40 text-[10px] font-medium">
                            {stat}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white/50 group-hover:text-white/80 transition-colors">Start Creating</span>
                        <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all duration-300" />
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="mt-12 text-center">
          <p className="text-white/20 text-xs">
            By continuing, you agree to WIZ AI's{' '}
            <a href="/terms" className="text-white/30 hover:text-[#b8892a]/70 transition-colors font-medium underline underline-offset-2">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" className="text-white/30 hover:text-[#b8892a]/70 transition-colors font-medium underline underline-offset-2">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
