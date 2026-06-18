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
import { useEffect } from "react";
import { X, Sparkles, Lock, Music, Video, Star } from "@/lib/icons";
import { getLoginUrl } from "@/const";
import { mp } from "@/lib/mixpanel";

interface AuthGateProps {
  open: boolean;
  onClose: () => void;
  /** Short description of what requires sign-in, e.g. "generate your music video" */
  featureName?: string;
  /** After login, redirect the user to this path (e.g. "/kids-video"). Defaults to "/". */
  returnPath?: string;
}

const BENEFITS = [
  { icon: <Sparkles className="w-4 h-4 text-[--color-gold]" />, text: "Create videos completely free — no credit card needed" },
  { icon: <Video className="w-4 h-4 text-[--color-gold-dark]" />, text: "Full cinematic music videos in minutes" },
  { icon: <Music className="w-4 h-4 text-[--color-gold]" />, text: "AI music generation with lyric-aware scenes" },
  { icon: <Star className="w-4 h-4 text-[--color-gold]" />, text: "Only pay when you're ready to build and download" },
  { icon: <Music className="w-4 h-4 text-[--color-gold-dark]" />, text: "Powered by WizSound — proprietary audio enhancement" },
];

export default function AuthGate({ open, onClose, featureName = "use this feature", returnPath }: AuthGateProps) {
  // Fire "Auth Gate Shown" once each time the modal opens
  useEffect(() => {
    if (open) {
      mp.authGateShown(featureName, window.location.pathname);
    }
  }, [open, featureName]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-background border border-[--color-gold]/[0.1] rounded-2xl shadow-2xl overflow-hidden">

        {/* Gradient top bar — gold */}
        <div className="h-1 w-full bg-gradient-to-r from-[--color-gold-dark] via-[--color-gold] to-[--color-gold-dark]" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[--color-silver-dark]/40 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-7">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-[--color-gold]/[0.08] border border-[--color-gold]/[0.15] flex items-center justify-center mb-5">
            <Lock className="w-6 h-6 text-[--color-gold]" />
          </div>

          {/* Heading */}
          <h2 className="text-xl font-bold text-white mb-2">
            Sign in to {featureName}
          </h2>
          <p className="text-[--color-silver-dark]/50 text-sm mb-6">
            Create your free WIZ AI account in seconds. No credit card required to get started.
          </p>

          {/* Benefits */}
          <ul className="space-y-3 mb-7">
            {BENEFITS.map((b, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-[--color-silver]/80">
                <span className="flex-shrink-0">{b.icon}</span>
                {b.text}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <a
            href={getLoginUrl(returnPath)}
            onClick={() => mp.authGateSignInClicked(featureName, window.location.pathname)}
            className="btn-primary btn-sheen btn-sheen block w-full text-center font-semibold py-3 rounded-xl text-sm"
          >
            <Sparkles className="inline w-4 h-4 mr-2 -mt-0.5" />
            Sign in / Create Free Account
          </a>

          <p className="text-center text-[--color-silver-dark]/30 text-xs mt-4">
            Free to create · Only pay to build · No card required
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
            {['Cancel anytime', 'You own your content', 'Secure checkout via Stripe'].map((t) => (
              <span key={t} className="text-[10px] text-[--color-silver-dark]/20 flex items-center gap-1">
                <span className="text-[--color-gold]/30">✓</span> {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
