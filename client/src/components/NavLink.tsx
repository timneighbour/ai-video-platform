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

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // stop full reload
    if (onClick) onClick();
    navigate(href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}
