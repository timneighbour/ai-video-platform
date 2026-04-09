import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface BackButtonProps {
  /** Override the fallback destination (defaults to "/") */
  fallback?: string;
  /** Override the label text (defaults to "Back") */
  label?: string;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * A consistent back-navigation button for all internal pages.
 *
 * Behaviour:
 * - Navigates to the `fallback` path (default: "/")
 * - Uses the wouter router so it stays within the SPA without a full reload
 *
 * Note: We intentionally do NOT use window.history.back() because
 * `history.length` is unreliable in SPAs — it counts all browser history
 * entries, not just in-app navigation, so users who land directly on a page
 * would be sent to an external site rather than the WizVid homepage.
 */
export default function BackButton({ fallback = "/", label = "Back", className = "" }: BackButtonProps) {
  const [, navigate] = useLocation();

  const handleBack = () => {
    navigate(fallback);
  };

  return (
    <button
      onClick={handleBack}
      className={`inline-flex items-center gap-2 text-sm text-[#a1a1aa] hover:text-white transition-colors font-medium group ${className}`}
      aria-label={label}
    >
      <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </button>
  );
}
