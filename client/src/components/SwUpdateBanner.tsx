/**
 * SwUpdateBanner
 *
 * Listens for the "SW_ACTIVATED" message posted by the service worker when a new
 * version has been installed and activated. Shows a slim gold banner at the top of
 * the viewport with a one-tap "Update now" button.
 *
 * Flow:
 * 1. User visits the site — old SW serves cached assets (fast).
 * 2. Browser detects sw.js has changed (new CACHE_VERSION from build stamp).
 * 3. New SW installs in the background, then activates (because old SW removed
 *    skipWaiting from install — activation now happens on next navigation OR when
 *    the user taps "Update now" which triggers SKIP_WAITING).
 * 4. On activation, SW posts SW_ACTIVATED to all open tabs.
 * 5. This component receives the message and shows the banner.
 * 6. User taps "Update now" → page reloads → fresh bundle served.
 */

import { useEffect, useState } from "react";

export function SwUpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Listen for the SW_ACTIVATED message from the service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "SW_ACTIVATED") {
        setNewVersion(event.data.version ?? null);
        setShowBanner(true);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    // Also detect when a new SW is waiting (covers the case where the SW was
    // already waiting before this component mounted)
    const checkForWaiting = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        setShowBanner(true);
      }
    };
    checkForWaiting();

    // Watch for new SW installations
    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New SW installed and waiting — show banner
            setShowBanner(true);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleUpdate = async () => {
    if (!("serviceWorker" in navigator)) return;

    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      // Tell the waiting SW to skip waiting and activate immediately
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    // Reload once the new SW has taken control
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    }, { once: true });

    // Fallback: reload after a short delay if controllerchange doesn't fire
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: "linear-gradient(90deg, oklch(0.22 0.04 75) 0%, oklch(0.18 0.03 75) 100%)",
        borderBottom: "1px solid oklch(0.78 0.11 75 / 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "10px 16px",
        boxShadow: "0 2px 16px oklch(0.78 0.11 75 / 0.15)",
      }}
    >
      {/* Gold dot indicator */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "oklch(0.78 0.11 75)",
          flexShrink: 0,
          boxShadow: "0 0 6px oklch(0.78 0.11 75 / 0.6)",
        }}
      />

      <p
        style={{
          margin: 0,
          fontSize: "13px",
          fontWeight: 500,
          color: "oklch(0.90 0.08 75)",
          letterSpacing: "0.01em",
        }}
      >
        A new version of WIZ AI is available
        {newVersion ? (
          <span style={{ opacity: 0.5, fontSize: "11px", marginLeft: 6 }}>
            v{newVersion.slice(-6)}
          </span>
        ) : null}
      </p>

      <button
        onClick={handleUpdate}
        style={{
          background: "oklch(0.78 0.11 75)",
          color: "oklch(0.12 0.02 75)",
          border: "none",
          borderRadius: "6px",
          padding: "5px 14px",
          fontSize: "12px",
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          flexShrink: 0,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
      >
        Update now
      </button>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss update notification"
        style={{
          background: "transparent",
          border: "none",
          color: "oklch(0.78 0.11 75 / 0.5)",
          cursor: "pointer",
          fontSize: "16px",
          lineHeight: 1,
          padding: "2px 4px",
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
