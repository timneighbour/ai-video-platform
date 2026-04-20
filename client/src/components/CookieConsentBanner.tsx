/**
 * CookieConsentBanner — GDPR/UK PECR compliant
 *
 * Shows on first visit. Three actions:
 * - Accept All
 * - Reject Non-Essential
 * - Manage Preferences (opens granular category toggles)
 *
 * Also exports <CookieSettingsButton /> for footer re-open trigger.
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X, Shield, ChevronDown, ChevronUp } from "@/lib/icons";
import {
  acceptAllCookies,
  rejectNonEssentialCookies,
  saveCustomCookiePreferences,
  hasConsentChoice,
  getStoredConsent,
  resetConsent,
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
export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [functional, setFunctional] = useState(false);

  useEffect(() => {
    // Show banner if no consent choice has been made
    if (!hasConsentChoice()) {
      setVisible(true);
    }

    // Listen for re-open from footer
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
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Cookie consent"
    >
      <div className="max-w-4xl mx-auto bg-[#0f0f0f] border border-[--color-gold]/25 rounded-2xl shadow-2xl overflow-hidden">
        {/* Gold top accent */}
        <div className="h-0.5 w-full bg-gradient-to-r from-[--color-gold]/40 via-[--color-gold] to-[--color-gold]/40" />

        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[--color-gold]/10 border border-[--color-gold]/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-[--color-gold]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white leading-tight">
                We use cookies
              </h2>
              <p className="text-sm text-[#a1a1aa] mt-1 leading-relaxed">
                WIZ AI uses cookies to improve your experience, analyse site usage, and support marketing. Essential cookies are always active. You can choose which optional cookies to allow.{" "}
                <a
                  href="/cookie-policy"
                  className="text-[--color-gold] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Cookie Policy
                </a>
                {" · "}
                <a
                  href="/privacy"
                  className="text-[--color-gold] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>

          {/* Manage Preferences (expandable) */}
          <button
            className="flex items-center gap-2 text-sm text-[#a1a1aa] hover:text-white transition-colors mb-4"
            onClick={() => setShowManage(!showManage)}
            type="button"
          >
            {showManage ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Manage preferences
          </button>

          {showManage && (
            <div className="space-y-3 mb-5 border border-white/[0.06] rounded-xl p-4 bg-white/[0.02]">
              {CATEGORIES.map((cat) => (
                <div key={cat.id} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {cat.label}
                      </span>
                      {cat.alwaysOn && (
                        <span className="text-[10px] font-medium text-[--color-gold] bg-[--color-gold]/10 border border-[--color-gold]/20 px-1.5 py-0.5 rounded-full">
                          Always on
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#71717a] mt-0.5 leading-relaxed">
                      {cat.description}
                    </p>
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
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            {showManage ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20 bg-transparent text-xs"
                  onClick={handleRejectAll}
                >
                  Reject non-essential
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[--color-gold] hover:bg-[--color-gold]/90 text-black font-semibold text-xs"
                  onClick={handleSavePreferences}
                >
                  Save preferences
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white font-semibold text-xs"
                  onClick={handleAcceptAll}
                >
                  Accept all
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20 bg-transparent text-xs"
                  onClick={handleRejectAll}
                >
                  Reject non-essential
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[--color-gold] hover:bg-[--color-gold]/90 text-black font-semibold text-xs"
                  onClick={handleAcceptAll}
                >
                  Accept all cookies
                </Button>
              </>
            )}
          </div>

          {/* GDPR note */}
          <p className="text-[10px] text-[#52525b] mt-3 flex items-center gap-1.5">
            <Shield className="w-3 h-3 flex-shrink-0" />
            Your choice is stored locally and you can change it at any time via Cookie Settings in the footer.
          </p>
        </div>
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
