import { useLocation } from "wouter";

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
 * Smart back-navigation button.
 * Uses window.history.back() so users return to exactly where they came from.
 * Falls back to fallback path if there is no browser history entry.
 */
export default function BackButton({ fallback = "/", label = "Back", className = "" }: BackButtonProps) {
  const [, navigate] = useLocation();

  const handleBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(fallback);
    }
  };

  return (
    <a
      href={fallback}
      className={`inline-flex items-center gap-2 text-sm text-[#a1a1aa] hover:text-white transition-colors font-medium group ${className}`}
      style={{ cursor: "pointer", pointerEvents: "auto", position: "relative", zIndex: 10 }}
      aria-label={label}
      onClick={handleBack}
    >
      <ArrowLeftSVG className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </a>
  );
}
