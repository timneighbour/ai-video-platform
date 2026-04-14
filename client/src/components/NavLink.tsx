import { ReactNode } from "react";
import { useLocation } from "wouter";

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  [key: string]: any;
}

export function NavLink({ href, children, className = "", onClick, ...rest }: NavLinkProps) {
  const [, navigate] = useLocation();

  return (
    <a
      href={href}
      className={className}
      {...rest}
      onMouseDown={() => {
        // 🔥 fires BEFORE extensions interfere
        if (onClick) onClick();
        window.location.href = href;
      }}
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}
