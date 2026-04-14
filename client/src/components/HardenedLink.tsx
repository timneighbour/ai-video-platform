/**
 * HardenedLink — Chrome-extension-resilient navigation anchor.
 *
 * PRODUCTION RULES:
 * 1. onMouseDown → window.location.href (fires before extensions intercept)
 * 2. cursor: pointer ALWAYS
 * 3. pointer-events: auto ALWAYS
 * 4. z-index: 10 minimum
 */
import { ReactNode } from "react";

interface HardenedLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  /** Optional extra action to run before navigating (e.g. analytics) */
  onBeforeNavigate?: () => void;
}

export function HardenedLink({
  href,
  children,
  className = "",
  id,
  style,
  onBeforeNavigate,
}: HardenedLinkProps) {
  const navigate = () => {
    if (onBeforeNavigate) onBeforeNavigate();
    window.location.href = href;
  };

  return (
    <a
      href={href}
      id={id}
      style={{
        cursor: "pointer",
        pointerEvents: "auto",
        position: "relative",
        zIndex: 10,
        ...style,
      }}
      className={className}
      onMouseDown={(e) => {
        if (e.button === 0) {
          e.preventDefault();
          navigate();
        }
      }}
      onClick={(e) => {
        e.preventDefault();
        navigate();
      }}
    >
      {children}
    </a>
  );
}
