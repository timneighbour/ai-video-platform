import { ReactNode } from "react";
import { useLocation } from "wouter";

interface NavLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  [key: string]: any; // Allow additional props like id, style, etc.
}

export function NavLink({ href, className, children, onClick, ...rest }: NavLinkProps) {
  const [, navigate] = useLocation();

  const handleClick = () => {
    onClick?.();
    navigate(href);
  };

  return (
    <button onClick={handleClick} className={className} {...rest}>
      {children}
    </button>
  );
}
