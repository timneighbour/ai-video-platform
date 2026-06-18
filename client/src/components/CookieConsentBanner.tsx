/**
 * CookieConsentBanner — GDPR/UK PECR compliant
 *
 * Slim fixed bottom strip (≤56px collapsed). Expand to manage preferences.
 * Three actions: Accept All, Reject Non-Essential, Manage Preferences (accordion).
 *
 * Also exports <CookieSettingsButton /> for footer re-open trigger.
 */
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, Shield } from "@/lib/icons";
import {
  acceptAllCookies,
  rejectNonEssentialCookies,
  saveCustomCookiePreferences,
  hasConsentChoice,
  getStoredConsent,
} from "@/lib/cookieConsent";

// ── Global event for re-opening the banner from footer ──────────────────────
const OPEN_SETTINGS_EVENT = "wiz:open-cookie-settings";

export function openCookieSettings(): void {
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
}

// ── Category descriptions ────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "essential" as const,
    label: "Essential",
    description:
      "Required for the site to function. Includes session authentication, security tokens, and load balancing. Cannot be disabled.",
    alwaysOn: true,
  },
  {
    id: "analytics" as const,
    label: "Analytics",
    description:
      "Help us understand how visitors use WIZ AI so we can improve the product. Includes Google Analytics 4, Microsoft Clarity, and Mixpanel.",
    alwaysOn: false,
  },
  {
    id: "marketing" as const,
    label: "Marketing",
    description:
      "Used to deliver relevant ads and measure campaign performance. Includes Google Ads remarketing and Meta Pixel (when activated). Disabled until you consent.",
    alwaysOn: false,
  },
  {
    id: "functional" as const,
    label: "Functional",
    description:
      "Enhance your experience with features like remembering your preferences and language settings.",
    alwaysOn: false,
  },
];

// ── Main banner component ────────────────────────────────────────────────────
export default function CookieConsentBanner({ introActive = false }: { introActive?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [functional, setFunctional] = useState(false);

  // Show after intro completes, only if no consent stored
  useEffect(() => {
    if (introActive) return;
    if (!hasConsentChoice()) {
      setVisible(true);
    }
  }, [introActive]);

  // Listen for re-open from footer
  useEffect(() => {
    const handleOpen = () => {
      const stored = getStoredConsent();
      if (stored) {
        setAnalytics(stored.preferences.analytics);
        setMarketing(stored.preferences.marketing);
        setFunctional(stored.preferences.functional);
      }
      setShowManage(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, handleOpen);
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setVisible(false);
  };

  const handleRejectAll = () => {
    rejectNonEssentialCookies();
    setVisible(false);
  };

  const handleSavePreferences = () => {
    saveCustomCookiePreferences(analytics, marketing, functional);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999]"
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
    >
      {/* Gold top border accent */}
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(90deg, transparent, oklch(0.78 0.11 75 / 0.3), transparent)" }}
      />

      {/* Main strip */}
      <div
        style={{
          background: "rgba(0,0,0,0.88)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid oklch(0.78 0.11 75 / 0.18)",
        }}
      >
        {/* Collapsed strip — single row, max 56px */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center gap-x-4 gap-y-2 py-3 min-h-[56px]">
          {/* Left: text + cookie policy link */}
          <p className="text-[13px] text-white/60 flex-1 min-w-[180px]">
            We use cookies to improve your experience.{" "}
            <a
              href="/cookie-policy"
              className="underline text-white/50 hover:text-white/80 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cookie Policy
            </a>
          </p>

          {/* Middle: manage preferences accordion toggle */}
          <button
            type="button"
            className="flex items-center gap-1 text-[12px] text-white/40 hover:text-white/70 transition-colors whitespace-nowrap"
            onClick={() => setShowManage((v) => !v)}
          >
            {showManage ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Manage preferences
          </button>

          {/* Right: buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              className="h-8 px-3.5 rounded-lg text-[12px] font-semibold text-white/60 hover:text-white transition-colors whitespace-nowrap"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}
              onClick={handleRejectAll}
            >
              Reject non-essential
            </button>
            <button
              type="button"
              className="h-8 px-3.5 rounded-lg text-[12px] font-bold text-black transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{ background: "oklch(0.78 0.11 75)" }}
              onClick={handleAcceptAll}
            >
              Accept all
            </button>
          </div>
        </div>

        {/* Expandable manage preferences panel */}
        {showManage && (
          <div
            className="max-w-7xl mx-auto px-4 sm:px-6 pb-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="grid sm:grid-cols-2 gap-3 pt-4 mb-4">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-semibold text-white/85">{cat.label}</span>
                      {cat.alwaysOn && (
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{
                            color: "oklch(0.78 0.11 75)",
                            background: "oklch(0.78 0.11 75 / 0.10)",
                            border: "1px solid oklch(0.78 0.11 75 / 0.20)",
                          }}
                        >
                          Always on
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/35 leading-relaxed">{cat.description}</p>
                  </div>
                  <Switch
                    checked={
                      cat.alwaysOn
                        ? true
                        : cat.id === "analytics"
                        ? analytics
                        : cat.id === "marketing"
                        ? marketing
                        : functional
                    }
                    onCheckedChange={
                      cat.alwaysOn
                        ? undefined
                        : cat.id === "analytics"
                        ? setAnalytics
                        : cat.id === "marketing"
                        ? setMarketing
                        : setFunctional
                    }
                    disabled={cat.alwaysOn}
                    className="flex-shrink-0 mt-0.5 data-[state=checked]:bg-[--color-gold]"
                    aria-label={`${cat.label} cookies`}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] text-white/25 flex items-center gap-1.5 flex-1 min-w-[200px]">
                <Shield className="w-3 h-3 flex-shrink-0" />
                Your choice is stored locally and can be changed via Cookie Settings in the footer.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="h-8 px-3.5 rounded-lg text-[12px] font-semibold text-white/60 hover:text-white transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                  onClick={handleRejectAll}
                >
                  Reject non-essential
                </button>
                <button
                  type="button"
                  className="h-8 px-3.5 rounded-lg text-[12px] font-bold text-black transition-opacity hover:opacity-90"
                  style={{ background: "oklch(0.78 0.11 75)" }}
                  onClick={handleSavePreferences}
                >
                  Save preferences
                </button>
                <button
                  type="button"
                  className="h-8 px-3.5 rounded-lg text-[12px] font-bold text-black transition-opacity hover:opacity-90"
                  style={{ background: "oklch(0.78 0.11 75)" }}
                  onClick={handleAcceptAll}
                >
                  Accept all
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Cookie Settings trigger (for footer) ─────────────────────────────────────
export function CookieSettingsButton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className={className}
    >
      Cookie Settings
    </button>
  );
}
