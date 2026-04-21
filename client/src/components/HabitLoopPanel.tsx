/**
 * HabitLoopPanel
 *
 * Shown after a build completes to encourage the user to create their next video.
 * Features:
 *   - "What's next?" heading with encouraging copy
 *   - 4 quick-start template cards (Music Video, Lyric Video, Faceless Content, Kids Story)
 *   - "Start a new video" CTA
 *
 * Keeps the user in a creation loop rather than leaving after download.
 */
import { Sparkles, Music, FileText, Eye, BookOpen, ArrowRight } from "@/lib/icons";
import { Button } from "@/components/ui/button";

interface Template {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  gradient: string;
}

const TEMPLATES: Template[] = [
  {
    id: "music-video",
    icon: <Music className="w-4 h-4" />,
    title: "WizVideo",
    description: "Turn any track into a cinematic visual story",
    href: "/music-video/create",
    gradient: "from-[#b8892a]/20 to-[#4a3010]/10",
  },
  {
    id: "lyric-video",
    icon: <FileText className="w-4 h-4" />,
    title: "Lyric Video",
    description: "Animated lyrics synced to your music",
    href: "/music-video/create",
    gradient: "from-[#b8892a]/20 to-[#2e2e36]/10",
  },
  {
    id: "faceless",
    icon: <Eye className="w-4 h-4" />,
    title: "Faceless Content",
    description: "AI visuals for YouTube & social — no camera needed",
    href: "/products/wizpilot",
    gradient: "from-[--color-gold]/10 to-[#1a1a1a]",
  },
  {
    id: "kids-story",
    icon: <BookOpen className="w-4 h-4" />,
    title: "Kids Animation",
    description: "Colourful animated videos for young audiences",
    href: "/products/wizanimate",
    gradient: "from-[#b8892a]/20 to-orange-600/10",
  },
];

interface HabitLoopPanelProps {
  className?: string;
}

export default function HabitLoopPanel({ className = "" }: HabitLoopPanelProps) {

  return (
    <div className={`rounded-xl border border-white/8 bg-white/[0.02] p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-[--color-gold] flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-white">What's next?</h3>
          <p className="text-[11px] text-white/40 mt-0.5">
            Keep the momentum going — start your next video
          </p>
        </div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {TEMPLATES.map((tpl) => (
          <a
            key={tpl.id}
            href={tpl.href}
            className={`group relative text-left rounded-lg border border-white/8 bg-gradient-to-br ${tpl.gradient} p-3 hover:border-white/16 hover:bg-white/5 transition-all duration-200 active:scale-[0.98] block`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-white/60 group-hover:text-white/80 transition-colors">
                {tpl.icon}
              </span>
              <span className="text-xs font-semibold text-white/80 group-hover:text-white transition-colors">
                {tpl.title}
              </span>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed">
              {tpl.description}
            </p>
            <ArrowRight className="absolute bottom-2.5 right-2.5 w-3 h-3 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all duration-200" />
          </a>
        ))}
      </div>

      {/* Primary CTA */}
      <a
        href="/onboarding"
        className="w-full inline-flex items-center justify-center bg-[--color-gold] hover:bg-[--color-gold]/20 text-white text-sm font-semibold h-9 rounded-lg transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
        Start a new video
      </a>
    </div>
  );
}
