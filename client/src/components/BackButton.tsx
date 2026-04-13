import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  /** Override the fallback destination (defaults to "/") */
  fallback?: string;
  /** Override the label text (defaults to "Back") */
  label?: string;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * A consistent back-navigation link for all internal pages.
 * Renders a native <a href> so navigation works without JavaScript
 * and is consistent across all browsers.
 */
export default function BackButton({ fallback = "/", label = "Back", className = "" }: BackButtonProps) {
  return (
    <a
      href={fallback}
      className={`inline-flex items-center gap-2 text-sm text-[#a1a1aa] hover:text-white transition-colors font-medium group ${className}`}
      aria-label={label}
    >
      <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </a>
  );
}
