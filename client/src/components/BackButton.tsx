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
 * Hardened back-navigation link for all internal pages.
 * - onMouseDown → window.location.href fallback
 * - cursor: pointer, pointer-events: auto, z-index: 10
 * - Native <a href> for no-JS fallback
 */
export default function BackButton({ fallback = "/", label = "Back", className = "" }: BackButtonProps) {
  const [, navigate] = useLocation();

  return (
    <a
      href={fallback}
      className={`inline-flex items-center gap-2 text-sm text-[#a1a1aa] hover:text-white transition-colors font-medium group ${className}`}
      style={{ cursor: "pointer", pointerEvents: "auto", position: "relative", zIndex: 10 }}
      aria-label={label}
      onMouseDown={() => {
        window.location.href = fallback;
      }}
      onClick={(e) => {
        e.preventDefault();
        navigate(fallback);
      }}
    >
      <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </a>
  );
}
