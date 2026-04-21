import { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  [key: string]: any;
}

/**
 * NavLink — reliable cross-browser navigation component.
 *
 * Uses native <a href> navigation for all internal links.
 * This bypasses React.lazy() dynamic import failures on desktop Chrome/Safari
 * that occur when wouter's navigate() tries to load a lazy-loaded page chunk.
 *
 * External links (http/mailto) are handled natively by the browser.
 * Hash links use smooth scroll.
 */
export function NavLink({ href, children, className = "", onClick, style, ...rest }: NavLinkProps) {
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
      onClick={(e) => {
        if (isExternal) return; // let browser handle external links natively

        if (isHashLink) {
          e.preventDefault();
          const hash = href.includes("#") ? href.split("#")[1] : href.slice(1);
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: "smooth" });
          if (onClick) onClick();
          return;
        }

        // For all internal page links: let native <a href> handle navigation.
        // This is the most reliable cross-browser approach and avoids
        // React.lazy() chunk loading failures on desktop Chrome/Safari.
        if (onClick) onClick();
        // Do NOT call e.preventDefault() — allow the browser to follow the href.
      }}
    >
      {children}
    </a>
  );
}
