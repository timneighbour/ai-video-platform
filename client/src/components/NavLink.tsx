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
 * NavLink — reliable cross-browser navigation component.
 *
 * Uses standard <a href> + onClick for navigation.
 * The previous onMouseDown → window.location.href approach was cancelling
 * navigation inside dropdowns on desktop Chrome/Safari because the window-level
 * click listener was unmounting the dropdown before navigation completed.
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
      onClick={(e) => {
        if (isExternal) return; // let browser handle external links natively
        e.preventDefault();
        if (isHashLink) {
          // Handle hash navigation
          const hash = href.includes("#") ? href.split("#")[1] : href.slice(1);
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: "smooth" });
          if (onClick) onClick();
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
