/**
 * App.tsx — App-level providers, analytics, and shell.
 *
 * Route definitions have been extracted to routes.tsx (ISS-024).
 * This file only handles:
 *   - Global providers (ThemeProvider, TooltipProvider)
 *   - Analytics trackers (WizAnalytics, Mixpanel, GA4)
 *   - Intro screen / cookie banner / PWA install banner
 *   - The top-level Router() wrapper
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { lazy, Suspense, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { identifyUser, resetIdentity, mp } from "@/lib/mixpanel";
import { usePaymentReturnRefresh } from "@/hooks/usePaymentReturnRefresh";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useLocation } from "wouter";

import { trpc } from "./lib/trpc";
import { wizAnalytics } from "./lib/wizAnalytics";
import { trackPageView } from "@/lib/analytics";
import GlobalMuteButton from "./components/GlobalMuteButton";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import CinematicIntroScreen from "./components/CinematicIntroScreen";
import { INTRO_SESSION_KEY } from "@/lib/introReplay";

import { AppRoutes, PageFallback, PostLoginRedirect } from "./routes";

const CrispChat = lazy(() => import("@/components/CrispChat"));

// ─── Utility components ───────────────────────────────────────────────────────

/** Globally invalidates credit balance when user returns to the tab after Stripe checkout */
function PaymentReturnRefresh() {
  usePaymentReturnRefresh();
  return null;
}

// Routes that should not be indexed by search engines
const PRIVATE_ROUTE_PREFIXES = [
  "/dashboard", "/projects", "/account", "/settings",
  "/music-video/create", "/render-history", "/batch-regeneration",
  "/enhancement-studio", "/tools/", "/wizscore", "/wizsync",
  "/music-creator", "/wiz-image", "/wiz-shorts", "/kids-video", "/characters",
  "/text-to-video", "/onboarding", "/credits", "/subscribe",
  "/wizpilot", "/autopilot",
];

function NoIndexGuard() {
  const [path] = useLocation();
  const isPrivate = PRIVATE_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix));
  if (!isPrivate) return null;
  return (
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );
}

/** Initialises first-party analytics and tracks page views on route change */
function WizAnalyticsTracker() {
  const { data: me } = trpc.auth.me.useQuery();
  const [location] = useLocation();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (me !== undefined) {
      wizAnalytics.init(me?.id ?? undefined);
      setInitialized(true);
    }
  }, [me?.id, me]);

  useEffect(() => {
    if (initialized) {
      wizAnalytics.page(location);
      trackPageView(location);
    }
  }, [location, initialized]);

  return null;
}

/** Fires identifyUser once the auth state is known, and signUpCompleted for brand-new users */
function MixpanelIdentity() {
  const { data: me } = trpc.auth.me.useQuery();
  useEffect(() => {
    if (me?.id) {
      identifyUser(me.id, {
        name: me.name ?? undefined,
        email: me.email ?? undefined,
        plan: (me as Record<string, unknown>).subscriptionPlan as string | undefined,
        role: "Musician",
      });
      const createdAt = (me as Record<string, unknown>).createdAt;
      if (createdAt) {
        const ageMs = Date.now() - new Date(createdAt as string).getTime();
        const firedKey = `wizai_signup_fired_${me.id}`;
        if (ageMs < 120_000 && !sessionStorage.getItem(firedKey)) {
          sessionStorage.setItem(firedKey, "1");
          mp.signUpCompleted();
        }
      }
    } else if (me === null) {
      resetIdentity();
    }
  }, [me?.id]);
  return null;
}

// ─── Router ───────────────────────────────────────────────────────────────────

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <AppRoutes />
      <PostLoginRedirect />
    </Suspense>
  );
}

// ─── Intro screen helpers ─────────────────────────────────────────────────────

/** Stripe return params that indicate the user is coming back from a checkout flow */
const STRIPE_RETURN_PARAMS = ["success", "canceled", "subscription", "credits", "topup", "bundle_purchased", "credits_purchased", "session_id", "upsell_success", "upsell_canceled", "render_canceled", "topup=success", "topup=canceled"];

function isStripeReturn(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return STRIPE_RETURN_PARAMS.some(p => params.has(p));
}

function shouldShowIntroOnLoad(): boolean {
  if (typeof window === "undefined") return false;
  const isHomepage = window.location.pathname === "/" || window.location.pathname === "";
  if (!isHomepage) return false;
  // Never show intro when returning from Stripe checkout
  if (isStripeReturn()) return false;
  const ua = navigator.userAgent.toLowerCase();
  const isBot = /googlebot|lighthouse|chrome-lighthouse|pagespeed|adsbot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|applebot|msnbot|semrushbot|ahrefsbot|dotbot|petalbot|bytespider|gptbot|chatgpt|ccbot|anthropic|claudebot|headlesschrome/.test(ua);
  const isPageSpeed = !!(window as any).__lighthouse || !!(window as any).__pagespeed ||
    document.documentElement.hasAttribute("data-lighthouse") ||
    navigator.webdriver === true;
  if (isBot || isPageSpeed) return false;
  try {
    return !localStorage.getItem(INTRO_SESSION_KEY);
  } catch {
    return false;
  }
}

// ─── App root ─────────────────────────────────────────────────────────────────

function App() {
  const [showIntro, setShowIntro] = useState<boolean>(() => shouldShowIntroOnLoad());

  useEffect(() => {
    const isHomepage = window.location.pathname === "/" || window.location.pathname === "";
    if (!isHomepage) return;
    // Skip intro when returning from Stripe checkout
    if (isStripeReturn()) return;
    const ua = navigator.userAgent.toLowerCase();
    const isBot = /googlebot|lighthouse|chrome-lighthouse|pagespeed|adsbot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|applebot|msnbot|semrushbot|ahrefsbot|dotbot|petalbot|bytespider|gptbot|chatgpt|ccbot|anthropic|claudebot|headlesschrome/.test(ua);
    const isPageSpeed = !!(window as any).__lighthouse || !!(window as any).__pagespeed ||
      document.documentElement.hasAttribute('data-lighthouse') ||
      navigator.webdriver === true;
    if (isBot || isPageSpeed) return;
    try {
      const seen = localStorage.getItem(INTRO_SESSION_KEY);
      if (!seen) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setShowIntro(true);
          });
        });
      }
    } catch {
      // localStorage unavailable — skip intro
    }
  }, []);

  useEffect(() => {
    const handleReplay = () => setShowIntro(true);
    window.addEventListener("wizai:replay-intro", handleReplay);
    return () => window.removeEventListener("wizai:replay-intro", handleReplay);
  }, []);

  const handleIntroClose = () => setShowIntro(false);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={null}>
            <CrispChat />
          </Suspense>
          <WizAnalyticsTracker />
          <PaymentReturnRefresh />
          <MixpanelIdentity />
          <NoIndexGuard />
          <Router />
          <GlobalMuteButton />
          {showIntro && (
            <CinematicIntroScreen onComplete={handleIntroClose} />
          )}
          <CookieConsentBanner introActive={showIntro} />
          <PWAInstallBanner />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
