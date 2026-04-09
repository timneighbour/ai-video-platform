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
 * - If the user arrived via browser history (history.length > 1), uses history.back()
 * - Otherwise falls back to the provided `fallback` path (default: "/")
 *
 * UX:
 * - Clearly visible at the top-left of the page
 * - Works on mobile and desktop
 * - Does not conflict with main navigation
 */
export default function BackButton({ fallback = "/", label = "Back", className = "" }: BackButtonProps) {
  const [, navigate] = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(fallback);
    }
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
