import { useLocation } from "wouter";

// Inline SVG left arrow — no Lucide dependency
const ArrowLeftSVG = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13 8H3M7 4l-4 4 4 4" />
  </svg>
);

interface BackButtonProps {
  fallback?: string;
  label?: string;
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
      <ArrowLeftSVG className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </a>
  );
}
