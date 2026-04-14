import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

// Crisp website ID — set via VITE_CRISP_WEBSITE_ID env var
const CRISP_WEBSITE_ID = import.meta.env.VITE_CRISP_WEBSITE_ID as string | undefined;

declare global {
  interface Window {
    $crisp: unknown[] | ((...args: unknown[]) => void);
    CRISP_WEBSITE_ID: string;
  }
}

/**
 * Push a command to Crisp safely.
 * Crisp replaces window.$crisp with a function dispatcher after boot;
 * before boot it's an array. Both shapes support the same push() API.
 */
function crispPush(cmd: unknown[]) {
  try {
    const c = window.$crisp;
    if (!c) return;
    if (typeof (c as any).push === "function") {
      (c as any).push(cmd);
    }
  } catch {
    // Crisp not ready — silently ignore
  }
}

export default function CrispChat() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!CRISP_WEBSITE_ID) return;

    // Idempotent: only initialise once per page lifetime.
    // Never overwrite $crisp if it already exists — doing so corrupts Crisp's
    // internal dispatcher and causes "U is not a function" crashes.
    if (!window.CRISP_WEBSITE_ID) {
      window.$crisp = window.$crisp || [];
      window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
    }

    // Only inject the script once — check for existing script tag
    const existing = document.querySelector('script[src="https://client.crisp.chat/l.js"]');
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://client.crisp.chat/l.js";
      script.async = true;
      document.head.appendChild(script);
      // NOTE: Do NOT remove the script on unmount — Crisp must persist for
      // the full SPA lifetime. Removing it leaves Crisp in a broken partial state.
    }

    // No cleanup — intentional. Crisp is a global singleton.
  }, []);

  // Set user identity when authenticated
  useEffect(() => {
    if (!CRISP_WEBSITE_ID || !isAuthenticated || !user) return;

    // Defer slightly to ensure Crisp has finished booting
    const timer = setTimeout(() => {
      crispPush(["set", "user:email", [user.email]]);
      crispPush(["set", "user:nickname", [user.name]]);
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user]);

  return null;
}
