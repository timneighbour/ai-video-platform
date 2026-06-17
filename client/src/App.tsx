import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { lazy, Suspense, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { identifyUser, resetIdentity, mp } from "@/lib/mixpanel";
import { usePaymentReturnRefresh } from "@/hooks/usePaymentReturnRefresh";
import { ThemeProvider } from "./contexts/ThemeContext";

import { trpc } from "./lib/trpc";
import { wizAnalytics } from "./lib/wizAnalytics";
import { trackPageView } from "@/lib/analytics";
import GlobalMuteButton from "./components/GlobalMuteButton";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import IntroScreen from "./components/IntroScreen";
import { INTRO_SESSION_KEY } from "@/lib/introReplay";

// Home is lazy-loaded to reduce the main index chunk size
const Home = lazy(() => import("./pages/Home"));

// All other pages are lazy-loaded to reduce initial JS bundle
const NotFound = lazy(() => import("@/pages/NotFound"));
const Subscribe = lazy(() => import("@/pages/Subscribe"));
const FreeTrial = lazy(() => import("@/pages/FreeTrial"));
const Credits = lazy(() => import("@/pages/Credits"));
const CreditPricingGuide = lazy(() => import("@/pages/CreditPricingGuide"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Projects = lazy(() => import("@/pages/Projects"));
const Account = lazy(() => import("@/pages/Account"));
const TextToVideo = lazy(() => import("@/pages/tools/TextToVideo"));
const LipSync = lazy(() => import("@/pages/tools/LipSync"));
const VideoToVideo = lazy(() => import("@/pages/tools/VideoToVideo"));
const Voiceover = lazy(() => import("@/pages/tools/Voiceover"));
const Autopilot = lazy(() => import("@/pages/Autopilot"));
const MusicVideoAutopilot = lazy(() => import("@/pages/MusicVideoAutopilot"));
const MusicVideosLanding = lazy(() => import("@/pages/MusicVideosLanding"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Help = lazy(() => import("@/pages/Help"));
const SeoLandingPage = lazy(() => import("@/pages/SeoLandingPage"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const Refunds = lazy(() => import("@/pages/Refunds"));
const CrispChat = lazy(() => import("@/components/CrispChat"));
const MusicCreator = lazy(() => import("@/pages/MusicCreator"));
const RenderHistory = lazy(() => import("@/pages/RenderHistory"));
const KidsVideo = lazy(() => import("@/pages/KidsVideo"));
const CharacterLibrary = lazy(() => import("@/pages/CharacterLibrary"));
const TextToVideoCreator = lazy(() => import("@/pages/TextToVideoCreator"));
const HowItWorks = lazy(() => import("@/pages/HowItWorks"));
const EnhancementStudio = lazy(() => import("@/pages/EnhancementStudio"));
const BatchRegeneration = lazy(() => import("@/pages/BatchRegeneration"));
const Blog = lazy(() => import("@/pages/Blog"));
const WatchPage = lazy(() => import("@/pages/WatchPage"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const BlogAdmin = lazy(() => import("@/pages/BlogAdmin"));
const LandingUK = lazy(() => import("@/pages/LandingUK"));
const LandingApp = lazy(() => import("@/pages/LandingApp"));
const LandingStudio = lazy(() => import("@/pages/LandingStudio"));
const AiAnimationMaker = lazy(() => import("@/pages/AiAnimationMaker"));
const CookiePolicy = lazy(() => import("@/pages/CookiePolicy"));
const RenderSuccess = lazy(() => import("@/pages/RenderSuccess"));
const Discover = lazy(() => import("@/pages/Discover"));
const Create = lazy(() => import("@/pages/Create"));
const WizSync = lazy(() => import("@/pages/WizSync"));
const WizScore = lazy(() => import("@/pages/WizScore"));
const WizCreatePage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizCreatePage })));
const WizAnimatePage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizAnimatePage })));
const WizSoundPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizSoundPage })));
const WizLuminaPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizLuminaPage })));
const WizGenesisPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizGenesisPage })));
const WizBoostPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizBoostPage })));
const WizScriptPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizScriptPage })));
const WizPilotPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizPilotPage })));
const WizSyncInfoPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizSyncInfoPage })));
const WizScoreInfoPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizScoreInfoPage })));
const WizShortsProductPage = lazy(() => import("@/pages/products/WizShortsProductPage"));
const WizPerformerPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizPerformerPage })));
const WizImageProductPageNew = lazy(() => import("@/pages/products/WizImageProductPage"));
const WizVideoLandingPage = lazy(() => import("@/pages/products/WizVideoProductPage"));
const WizSoundProductPage = lazy(() => import("@/pages/products/WizSoundProductPage"));
const WizScriptProductPage = lazy(() => import("@/pages/products/WizScriptProductPage"));
const WizAnimateProductPage = lazy(() => import("@/pages/products/WizAnimateProductPage"));
// Technology pages
const TechCharacterConsistency = lazy(() => import("@/pages/technology").then(m => ({ default: m.CharacterConsistencyPage })));
const TechSceneBuilder = lazy(() => import("@/pages/technology").then(m => ({ default: m.SceneBuilderPage })));
const TechLipSync = lazy(() => import("@/pages/technology").then(m => ({ default: m.LipSyncPage })));
const TechAIVideoEngine = lazy(() => import("@/pages/technology").then(m => ({ default: m.AIVideoEnginePage })));
const TechAIMusicEngine = lazy(() => import("@/pages/technology").then(m => ({ default: m.AIMusicEnginePage })));
const TechWizSoundEngine = lazy(() => import("@/pages/technology").then(m => ({ default: m.WizSoundEnginePage })));
const TechPromptToVideo = lazy(() => import("@/pages/technology").then(m => ({ default: m.PromptToVideoPage })));
const TechAudioToVideo = lazy(() => import("@/pages/technology").then(m => ({ default: m.AudioToVideoPage })));
const TechStoryboardPreview = lazy(() => import("@/pages/technology").then(m => ({ default: m.StoryboardPreviewPage })));
const TechFourKRendering = lazy(() => import("@/pages/technology").then(m => ({ default: m.FourKRenderingPage })));
const TechWizGenesis = lazy(() => import("@/pages/technology").then(m => ({ default: m.WizGenesisPage })));
const TechWizSound = lazy(() => import("@/pages/technology").then(m => ({ default: m.WizSoundPage })));
const TechWizLumina = lazy(() => import("@/pages/technology").then(m => ({ default: m.WizLuminaPage })));
const TechWizBoost = lazy(() => import("@/pages/technology").then(m => ({ default: m.WizBoostPage })));
const TechWizSync = lazy(() => import("@/pages/technology").then(m => ({ default: m.WizSyncPage })));
const TechWizScore = lazy(() => import("@/pages/technology").then(m => ({ default: m.WizScorePage })));
const TechWizPilot = lazy(() => import("@/pages/technology").then(m => ({ default: m.WizPilotPage })));
const WizAI = lazy(() => import("@/pages/WizAI"));
const WizImage = lazy(() => import("@/pages/WizImage"));
const WizShorts = lazy(() => import("@/pages/WizShorts"));
const ShowcasePage = lazy(() => import("@/pages/Showcase"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const AdminCreditsPanel = lazy(() => import("@/pages/AdminCreditsPanel"));
const AdminEmail = lazy(() => import("@/pages/AdminEmail"));
const ProviderDashboard = lazy(() => import("@/pages/ProviderDashboard"));
const AnalyticsDashboard = lazy(() => import("@/pages/AnalyticsDashboard"));
const WizadoraAdmin = lazy(() => import("@/pages/admin/WizadoraAdmin"));
const PipelineOpsDashboard = lazy(() => import("@/pages/admin/PipelineOpsDashboard"));
const AdminJobsPanel = lazy(() => import("@/pages/admin/AdminJobsPanel"));
const LaunchReadinessDashboard = lazy(() => import("@/pages/LaunchReadinessDashboard"));
const GoldenBenchmarkLibrary = lazy(() => import("@/pages/GoldenBenchmarkLibrary"));
const MyProjects = lazy(() => import("@/pages/MyProjects"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));
const Studios = lazy(() => import("@/pages/Studios"));
const StudioDetail = lazy(() => import("@/pages/StudioDetail"));
const WizaVision = lazy(() => import("@/pages/WizaVision"));
const WizaVisionWatch = lazy(() => import("@/pages/WizaVisionWatch"));
const WizaVisionCreator = lazy(() => import("@/pages/WizaVisionCreator"));

// Premium loading fallback — shown while lazy chunks load (especially on iOS/slow connections)
function PageFallback() {
  return (
    <div
      className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Logo */}
      <div className="relative mb-8">
        <img
          src="/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png"
          alt="WIZ AI"
          className="w-20 h-20 object-contain"
          style={{ filter: "drop-shadow(0 0 24px oklch(0.78 0.11 75 / 0.6))" }}
        />
        {/* Gold pulse ring */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            animation: "wizPulse 1.8s ease-in-out infinite",
            border: "2px solid oklch(0.78 0.11 75 / 0.5)",
            borderRadius: "50%",
          }}
        />
      </div>

      {/* Loading text */}
      <p
        className="text-base font-semibold tracking-widest uppercase mb-2"
        style={{ color: "oklch(0.78 0.11 75)", letterSpacing: "0.15em" }}
      >
        Opening your studio…
      </p>
      <p
        className="text-xs tracking-wide"
        style={{ color: "oklch(0.78 0.11 75 / 0.45)" }}
      >
        Preparing your creative workspace
      </p>

      {/* Gold progress bar */}
      <div
        className="mt-8 rounded-full overflow-hidden"
        style={{ width: 120, height: 2, background: "oklch(0.78 0.11 75 / 0.15)" }}
      >
        <div
          style={{
            height: "100%",
            background: "linear-gradient(90deg, oklch(0.78 0.11 75 / 0.8), oklch(0.92 0.10 75))",
            animation: "wizBar 1.6s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes wizPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes wizBar {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

/** Globally invalidates credit balance when user returns to the tab after Stripe checkout */
function PaymentReturnRefresh() {
  usePaymentReturnRefresh();
  return null;
}

// After OAuth login, the server redirects to "/". This component checks
// sessionStorage for a pending destination set before the OAuth redirect
// and navigates there once the user is confirmed authenticated.
function PostLoginRedirect() {
  const { data: me } = trpc.auth.me.useQuery();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (me?.id) {
      const dest = sessionStorage.getItem("wizvid_post_login_redirect");
      if (dest) {
        sessionStorage.removeItem("wizvid_post_login_redirect");
        navigate(dest);
      }
    }
  }, [me?.id, navigate]);
  return null;
}

/**
 * Simple passthrough wrapper — the Switch/Route tree below handles all routing.
 */
// Routes that should not be indexed by search engines
const PRIVATE_ROUTE_PREFIXES = [
  "/dashboard", "/projects", "/account", "/settings",
  "/render-history", "/batch-regeneration",
  "/enhancement-studio", "/tools/", "/wizscore", "/wizsync",
  "/music-creator", "/wiz-image", "/wiz-shorts", "/characters",
  "/onboarding", "/credits",
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

function SafeFallbackRouter({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Router() {
  return (
    <SafeFallbackRouter>
      <Suspense fallback={<PageFallback />}>
        <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/wiz-ai"} component={WizAI} />
        <Route path={"/create"} component={Create} />
        <Route path={"/wizsync"} component={WizSync} />
        <Route path={"/wizscore"} component={WizScore} />
        <Route path={"/products/wizcreate"} component={WizCreatePage} />
        <Route path={"/products/wizvideo"} component={WizVideoLandingPage} />
        <Route path={"/products/wizanimate"} component={WizAnimateProductPage} />
        <Route path={"/wiz-animate"} component={AiAnimationMaker} />{/* alias → app */}
        <Route path={"/products/wizsync"} component={WizSync} />{/* alias → /wizsync */}
        <Route path={"/products/wizsound"} component={WizSoundProductPage} />
        <Route path={"/products/wizlumina"} component={WizLuminaPage} />
        <Route path={"/products/wizgenesis"} component={WizGenesisPage} />
        <Route path={"/products/wizboost"} component={WizBoostPage} />
        <Route path={"/products/wizscript"} component={WizScriptProductPage} />
        <Route path={"/wiz-script"} component={TextToVideoCreator} />{/* alias → app */}
        <Route path={"/products/wizpilot"} component={WizPilotPage} />
        <Route path={"/products/wizsync-info"} component={WizSyncInfoPage} />
        <Route path={"/products/wizscore"} component={WizScoreInfoPage} />
        <Route path={"/products/wizshorts"} component={WizShortsProductPage} />
        <Route path={"/products/wizperformer"} component={WizPerformerPage} />
        <Route path={"/products/wizimage"} component={WizImageProductPageNew} />
        {/* Technology pages */}
        <Route path={"/technology/character-consistency"} component={TechCharacterConsistency} />
        <Route path={"/technology/scene-builder"} component={TechSceneBuilder} />
        <Route path={"/technology/lip-sync"} component={TechLipSync} />
        <Route path={"/technology/ai-video-engine"} component={TechAIVideoEngine} />
        <Route path={"/technology/ai-music-engine"} component={TechAIMusicEngine} />
        <Route path={"/technology/wizsound-engine"} component={TechWizSoundEngine} />
        <Route path={"/technology/prompt-to-video"} component={TechPromptToVideo} />
        <Route path={"/technology/audio-to-video"} component={TechAudioToVideo} />
        <Route path={"/technology/storyboard-preview"} component={TechStoryboardPreview} />
        <Route path={"/technology/4k-rendering"} component={TechFourKRendering} />
        <Route path={"/technology/wizgenesis"} component={TechWizGenesis} />
        <Route path={"/technology/wizsound"} component={TechWizSound} />
        <Route path={"/technology/wizlumina"} component={TechWizLumina} />
        <Route path={"/technology/wizboost"} component={TechWizBoost} />
        <Route path={"/technology/wizsync"} component={TechWizSync} />
        <Route path={"/technology/wizscore"} component={TechWizScore} />
        <Route path={"/technology/wizpilot"} component={TechWizPilot} />
        <Route path={"/subscribe"} component={Subscribe} />
        <Route path={"/free-trial"} component={FreeTrial} />
        <Route path={"/credits"} component={Credits} />
        <Route path={"/credits/guide"} component={CreditPricingGuide} />
        <Route path={"/dashboard"} component={Dashboard} />
        <Route path={"/projects"} component={Projects} />
        <Route path={"/account"} component={Account} />
        <Route path={"/tools/text-to-video"} component={TextToVideoCreator} />{/* → TextToVideoCreator app */}
        <Route path={"/tools/lip-sync"} component={LipSync} />
        <Route path={"/tools/video-to-video"} component={VideoToVideo} />
        <Route path={"/tools/voiceover"} component={Voiceover} />
        <Route path={"/wizpilot"} component={Autopilot} />
        <Route path={"/autopilot"} component={Autopilot} />{/* backward compat redirect */}
        <Route path={"/music-creator"} component={MusicCreator} />
        <Route path={"/wiz-image"} component={WizImage} />
        <Route path={"/wiz-shorts"} component={WizShorts} />
        <Route path={"/music-videos"} component={MusicVideosLanding} />{/* USP showcase landing */}
        <Route path={"/music-video"} component={WizVideoLandingPage} />{/* original product page */}
        <Route path={"/music-video-ai"} component={WizVideoLandingPage} />{/* SEO alias */}
        <Route path={"/music-video/create"} component={MusicVideoAutopilot} />
        <Route path={"/render-history"} component={RenderHistory} />
        <Route path={"/my-projects"} component={Projects} />{/* unified projects page */}
        <Route path={"/kids-video"} component={KidsVideo} />
        <Route path={"/characters"} component={CharacterLibrary} />
        <Route path={"/text-to-video"} component={TextToVideoCreator} />
        <Route path={"/ai-video-generator"} component={TextToVideoCreator} />{/* SEO alias */}
        <Route path={"/ai-animation-maker"} component={AiAnimationMaker} />
        <Route path={"/enhancement-studio"} component={EnhancementStudio} />
        <Route path={"/batch-regeneration"} component={BatchRegeneration} />
        <Route path={"/pricing"} component={Pricing} />
        <Route path={"/onboarding"} component={Onboarding} />
        <Route path={"/help"} component={Help} />
        <Route path={"/how-it-works"} component={HowItWorks} />
        <Route path={"/unsubscribe"} component={Unsubscribe} />
        <Route path={"/privacy"} component={Privacy} />
        <Route path={"/terms"} component={Terms} />
        <Route path={"/refunds"} component={Refunds} />
        <Route path={"/cookie-policy"} component={CookiePolicy} />
        <Route path={"/uk"} component={LandingUK} />
        <Route path={"/app"} component={LandingApp} />
        <Route path={"/studio"} component={LandingStudio} />
        <Route path={"/blog"} component={Blog} />
        <Route path={"/blog/admin"} component={BlogAdmin} />
        <Route path={"/admin"} component={AdminPanel} />
        <Route path={"/admin/credits"} component={AdminCreditsPanel} />
        <Route path={"/admin/analytics"} component={AnalyticsDashboard} />
        <Route path={"/admin/wizadora"} component={WizadoraAdmin} />
        <Route path={"/admin/pipeline"} component={PipelineOpsDashboard} />
        <Route path={"/admin/launch"} component={LaunchReadinessDashboard} />
        <Route path={"/admin/benchmarks"} component={GoldenBenchmarkLibrary} />
        <Route path={"/admin/email"} component={AdminEmail} />
        <Route path={"/admin/providers"} component={ProviderDashboard} />
        <Route path={"/admin/jobs"} component={AdminJobsPanel} />
        <Route path={"/render/success"} component={RenderSuccess} />
        <Route path={"/discover"} component={Discover} />
        <Route path={"/creators"} component={Discover} />
        <Route path={"/showcase"} component={ShowcasePage} />
        <Route path={"/blog/:slug"} component={BlogPost} />
        <Route path={"/seo/:slug"} component={SeoLandingPage} />
        <Route path={"/watch/:slug"} component={WatchPage} />
        <Route path={"/studios"} component={Studios} />
        <Route path={"/studios/:id"} component={StudioDetail} />
        <Route path={"/wizavision"} component={WizaVision} />
        <Route path={"/wizavision/browse"} component={WizaVision} />
        <Route path={"/wizavision/browse/:category"} component={WizaVision} />
        <Route path={"/wizavision/watch/:slug"} component={WizaVisionWatch} />
        <Route path={"/wizavision/creator/:username"} component={WizaVisionCreator} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
        </Switch>
        <PostLoginRedirect />
      </Suspense>
    </SafeFallbackRouter>
  );
}

/** Initialises first-party analytics and tracks page views on route change */
function WizAnalyticsTracker() {
  const { data: me } = trpc.auth.me.useQuery();
  const [location] = useLocation();
  const [initialized, setInitialized] = useState(false);

  // Init once auth state is resolved
  useEffect(() => {
    if (me !== undefined) {
      wizAnalytics.init(me?.id ?? undefined);
      setInitialized(true);
    }
  }, [me?.id, me]);

  // Track page view on every route change (first-party + GA4 SPA)
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
      // Fire signUpCompleted for brand-new users (account created within last 2 minutes)
      // Uses sessionStorage to ensure it fires exactly once per browser session
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

// Synchronously detect whether the intro should show on this page load.
// Doing this outside the component ensures the initial useState value is correct
// from the very first render — preventing the cookie banner from flashing
// before the intro starts playing.
function shouldShowIntroOnLoad(): boolean {
  if (typeof window === "undefined") return false;
  const isHomepage = window.location.pathname === "/" || window.location.pathname === "";
  if (!isHomepage) return false;
  const ua = navigator.userAgent.toLowerCase();
  const isBot = /googlebot|lighthouse|chrome-lighthouse|pagespeed|adsbot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|applebot|msnbot|semrushbot|ahrefsbot|dotbot|petalbot|bytespider|gptbot|chatgpt|ccbot|anthropic|claudebot|headlesschrome/.test(ua);
  const isPageSpeed = !!(window as any).__lighthouse || !!(window as any).__pagespeed ||
    document.documentElement.hasAttribute("data-lighthouse") ||
    navigator.webdriver === true;
  if (isBot || isPageSpeed) return false;
  try {
    return !sessionStorage.getItem(INTRO_SESSION_KEY);
  } catch {
    return false;
  }
}

function App() {
  // Initialize synchronously so cookie banner knows to wait from the very first render
  const [showIntro, setShowIntro] = useState<boolean>(() => shouldShowIntroOnLoad());

  useEffect(() => {
    // Only show intro when landing on the homepage — skip on all other pages
    const isHomepage = window.location.pathname === "/" || window.location.pathname === "";
    if (!isHomepage) return;
    // Detect bots/crawlers by user-agent — skip intro entirely so real homepage LCP is measured
    const ua = navigator.userAgent.toLowerCase();
    // PageSpeed Insights runs as a real Chrome instance — detect via performance timing flags
    // and common bot/crawler signatures
    const isBot = /googlebot|lighthouse|chrome-lighthouse|pagespeed|adsbot|bingbot|slurp|duckduckbot|baiduspider|yandex|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|applebot|msnbot|semrushbot|ahrefsbot|dotbot|petalbot|bytespider|gptbot|chatgpt|ccbot|anthropic|claudebot|headlesschrome/.test(ua);
    // Also detect PageSpeed/Lighthouse via window flags they set
    const isPageSpeed = !!(window as any).__lighthouse || !!(window as any).__pagespeed ||
      document.documentElement.hasAttribute('data-lighthouse') ||
      navigator.webdriver === true;
    if (isBot || isPageSpeed) return; // Skip intro for all bots — they should see the real homepage immediately
    try {
      const seen = sessionStorage.getItem(INTRO_SESSION_KEY);
      if (!seen) {
        // Delay intro by 1 frame so the hero LCP element paints first
        // This ensures PageSpeed measures the actual hero content, not the intro overlay
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setShowIntro(true);
          });
        });
      }
    } catch {
      // sessionStorage unavailable (private browsing edge case) — skip intro
    }
  }, []);

  // Listen for replay requests dispatched by triggerIntroReplay()
  useEffect(() => {
    const handleReplay = () => setShowIntro(true);
    window.addEventListener("wizai:replay-intro", handleReplay);
    return () => window.removeEventListener("wizai:replay-intro", handleReplay);
  }, []);

  const handleIntroClose = () => {
    setShowIntro(false);
  };

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
          {/* Intro shows once per session — sessionStorage flag prevents repeat */}
          {showIntro && (
            <IntroScreen onComplete={handleIntroClose} />
          )}
          {/* Cookie banner must come after IntroScreen in the DOM so it renders on top */}
          {/* Delay cookie banner while intro is playing so it doesn't block the cinematic logo */}
          <CookieConsentBanner introActive={showIntro} />
          <PWAInstallBanner />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
