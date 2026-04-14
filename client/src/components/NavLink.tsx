import { ReactNode } from "react";
import { useLocation } from "wouter";

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  [key: string]: any;
}

/**
 * NavLink — hardened CTA component.
 *
 * PRODUCTION RULES:
 * 1. onMouseDown → window.location.href fallback (fires before extensions interfere)
 * 2. cursor: pointer ALWAYS
 * 3. pointer-events: auto ALWAYS (overrides any parent pointer-events:none)
 * 4. z-index: 10 minimum on the element
 * 5. onClick uses wouter navigate for SPA experience
 */
export function NavLink({ href, children, className = "", onClick, style, ...rest }: NavLinkProps) {
  const [, navigate] = useLocation();

  const isExternal = href.startsWith("http") || href.startsWith("mailto:");
  const isHashLink = href.startsWith("#") || (href.includes("#") && !href.startsWith("/"));

  return (
    <a
      href={href}
      className={className}
      style={{
        cursor: "pointer",
        pointerEvents: "auto",
        position: "relative",
        zIndex: 10,
        ...style,
      }}
      {...rest}
      onMouseDown={(e) => {
        // 🔥 fires BEFORE extensions interfere — hardened fallback
        if (isExternal || isHashLink) return; // let browser handle external/hash
        if (onClick) onClick();
        window.location.href = href;
      }}
      onClick={(e) => {
        if (isExternal) return; // let browser handle
        e.preventDefault();
        if (isHashLink) {
          // Handle hash navigation
          const hash = href.includes("#") ? href.split("#")[1] : href.slice(1);
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: "smooth" });
          return;
        }
        if (onClick) onClick();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}
