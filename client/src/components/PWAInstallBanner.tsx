/**
 * PWAInstallBanner
 *
 * Shows a subtle bottom banner on mobile devices prompting the user to
 * install WIZ AI as a home screen app. Appears after 30 seconds on the
 * site, only on mobile, and only if the browser supports PWA install.
 *
 * On iOS Safari (which doesn't fire beforeinstallprompt), shows a manual
 * "Add to Home Screen" instruction instead.
 */
import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";

// Detect iOS Safari
function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as any).MSStream
  );
}

// Detect if already installed as standalone PWA
function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed or dismissed this session
    if (isStandalone()) return;
    if (sessionStorage.getItem("pwa-banner-dismissed")) return;

    // Android/Chrome: listen for the native install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner after 30s delay
      setTimeout(() => setShowBanner(true), 30_000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // iOS Safari: show manual guide after 30s on mobile
    if (isIOS()) {
      const timer = setTimeout(() => {
        setShowIOSGuide(true);
        setShowBanner(true);
      }, 30_000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (!showBanner || dismissed) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-safe-area-inset-bottom"
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      <div
        className="mx-auto max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #13131f 0%, #1a1a2e 100%)",
          border: "1px solid rgba(196,164,100,0.3)",
        }}
      >
        {/* Gold top accent line */}
        <div style={{ height: "2px", background: "linear-gradient(90deg, #c4a464, #e8c97a, #c4a464)" }} />

        <div className="p-4 flex items-start gap-3">
          {/* App icon */}
          <img
            src="/manus-storage/pwa-icon-192_21bad29f.png"
            alt="WIZ AI"
            className="w-12 h-12 rounded-xl flex-shrink-0"
            style={{ border: "1px solid rgba(196,164,100,0.2)" }}
          />

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span
                className="text-sm font-bold"
                style={{ color: "#c4a464", letterSpacing: "0.5px" }}
              >
                WIZ AI
              </span>
              <button
                onClick={handleDismiss}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 -mr-1 -mt-1"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>

            {showIOSGuide ? (
              <>
                <p className="text-xs text-zinc-300 mb-2 leading-relaxed">
                  Add WIZ AI to your home screen for the best experience.
                </p>
                <p className="text-xs text-zinc-500 leading-relaxed flex items-center gap-1">
                  Tap <Share size={11} className="inline text-[#c4a464]" /> then{" "}
                  <strong className="text-zinc-400">"Add to Home Screen"</strong>
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-zinc-300 mb-3 leading-relaxed">
                  Install WIZ AI for instant access — create videos, music &amp; images from your home screen.
                </p>
                <button
                  onClick={handleInstall}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: "linear-gradient(135deg, #c4a464, #e8c97a)",
                    color: "#080810",
                  }}
                >
                  <Download size={12} />
                  Add to Home Screen
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
