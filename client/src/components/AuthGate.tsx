/**
 * AuthGate — reusable sign-in prompt modal.
 *
 * Usage:
 *   const [showAuthGate, setShowAuthGate] = useState(false);
 *   <AuthGate open={showAuthGate} onClose={() => setShowAuthGate(false)} featureName="generate music" />
 *
 * When the user is not signed in and tries to use a protected feature,
 * show this modal instead of silently redirecting.
 */
import { X, Sparkles, Lock, Music, Video, Star } from "lucide-react";
import { getLoginUrl } from "@/const";

interface AuthGateProps {
  open: boolean;
  onClose: () => void;
  /** Short description of what requires sign-in, e.g. "generate your music video" */
  featureName?: string;
}

const BENEFITS = [
  { icon: <Sparkles className="w-4 h-4 text-violet-400" />, text: "2 free videos — no credit card needed" },
  { icon: <Music className="w-4 h-4 text-pink-400" />,     text: "AI music generation powered by Suno" },
  { icon: <Video className="w-4 h-4 text-blue-400" />,     text: "Full cinematic music videos in minutes" },
  { icon: <Star className="w-4 h-4 text-yellow-400" />,    text: "Preview every scene before you render" },
];

export default function AuthGate({ open, onClose, featureName = "use this feature" }: AuthGateProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* Gradient top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-pink-500 to-blue-500" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-7">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mb-5">
            <Lock className="w-6 h-6 text-violet-400" />
          </div>

          {/* Heading */}
          <h2 className="text-xl font-bold text-white mb-2">
            Sign in to {featureName}
          </h2>
          <p className="text-[#a1a1aa] text-sm mb-6">
            Create your free WizVid account in seconds. No credit card required to get started.
          </p>

          {/* Benefits */}
          <ul className="space-y-3 mb-7">
            {BENEFITS.map((b, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex-shrink-0">{b.icon}</span>
                {b.text}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <a
            href={getLoginUrl()}
            className="block w-full text-center bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            <Sparkles className="inline w-4 h-4 mr-2 -mt-0.5" />
            Sign in / Create Free Account
          </a>

          <p className="text-center text-[#71717a] text-xs mt-4">
            Free to start · 2 free videos included · No card required
          </p>
        </div>
      </div>
    </div>
  );
}
