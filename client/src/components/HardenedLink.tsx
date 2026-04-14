/**
 * HardenedLink — Chrome-extension-resilient navigation anchor.
 *
 * Problem: Some Chrome extensions intercept React/wouter click handlers,
 * silently swallowing the event and preventing navigation.
 *
 * Solution: Use `onMouseDown` (fires before extensions can intercept `onClick`)
 * to immediately set `window.location.href`. The native `href` attribute
 * provides a third layer of fallback for keyboard navigation and right-click.
 *
 * Use this for ALL primary conversion CTAs (Hero, Pricing, Navbar, Footer).
 * For non-critical nav links, the regular NavLink is fine.
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
      style={style}
      className={className}
      // onMouseDown fires before extensions can intercept onClick
      onMouseDown={(e) => {
        // Only handle primary (left) mouse button
        if (e.button === 0) {
          e.preventDefault();
          navigate();
        }
      }}
      // onClick fallback for keyboard activation (Enter key) and touch
      onClick={(e) => {
        e.preventDefault();
        navigate();
      }}
    >
      {children}
    </a>
  );
}
