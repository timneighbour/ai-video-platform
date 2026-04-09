import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

// Crisp website ID — set via VITE_CRISP_WEBSITE_ID env var
const CRISP_WEBSITE_ID = import.meta.env.VITE_CRISP_WEBSITE_ID as string | undefined;

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

export default function CrispChat() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!CRISP_WEBSITE_ID) return;

    // Initialise Crisp
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      document.head.removeChild(script);
    };
  }, []);

  // Set user identity when authenticated
  useEffect(() => {
    if (!CRISP_WEBSITE_ID || !isAuthenticated || !user) return;
    if (!window.$crisp) return;

    try {
      (window.$crisp as unknown[]).push(["set", "user:email", [user.email]]);
      (window.$crisp as unknown[]).push(["set", "user:nickname", [user.name]]);
    } catch {
      // Crisp may not be loaded yet
    }
  }, [isAuthenticated, user]);

  return null;
}
