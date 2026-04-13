import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { WizVidLoader } from "./components/WizVidLoader";
import { lazy, Suspense, useEffect, useState } from "react"; // useState used by App component
import { identifyUser, resetIdentity } from "@/lib/mixpanel";
import { ThemeProvider } from "./contexts/ThemeContext";

// Home is eagerly loaded — it's the LCP page
import Home from "./pages/Home";
import { trpc } from "./lib/trpc";
import CinematicEntryScreen from "./components/CinematicEntryScreen";
import GlobalMuteButton from "./components/GlobalMuteButton";

// All other pages are lazy-loaded to reduce initial JS bundle
const NotFound = lazy(() => import("@/pages/NotFound"));
const Subscribe = lazy(() => import("@/pages/Subscribe"));
const Credits = lazy(() => import("@/pages/Credits"));
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
const TextToVideoCreator = lazy(() => import("@/pages/TextToVideoCreator"));
const HowItWorks = lazy(() => import("@/pages/HowItWorks"));
const EnhancementStudio = lazy(() => import("@/pages/EnhancementStudio"));
const BatchRegeneration = lazy(() => import("@/pages/BatchRegeneration"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const BlogAdmin = lazy(() => import("@/pages/BlogAdmin"));
const LandingUK = lazy(() => import("@/pages/LandingUK"));
const LandingApp = lazy(() => import("@/pages/LandingApp"));
const LandingStudio = lazy(() => import("@/pages/LandingStudio"));
const RenderSuccess = lazy(() => import("@/pages/RenderSuccess"));

// Minimal fallback — just a dark screen while the chunk loads
function PageFallback() {
  return <div className="min-h-screen bg-[#0f0f0f]" />;
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
 * The NotFound fallback route at the bottom of the Switch handles unknown paths.
 * We intentionally do NOT redirect here so that hash links, query strings,
 * and any future routes are never silently swallowed.
 */
function SafeFallbackRouter({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Router() {
  return (
    <SafeFallbackRouter>
      <Suspense fallback={<PageFallback />}>
        <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/subscribe"} component={Subscribe} />
        <Route path={"/credits"} component={Credits} />
        <Route path={"/dashboard"} component={Dashboard} />
        <Route path={"/projects"} component={Projects} />
        <Route path={"/account"} component={Account} />
        <Route path={"/tools/text-to-video"} component={TextToVideo} />
        <Route path={"/tools/lip-sync"} component={LipSync} />
        <Route path={"/tools/video-to-video"} component={VideoToVideo} />
        <Route path={"/tools/voiceover"} component={Voiceover} />
        <Route path={"/wizpilot"} component={Autopilot} />
        <Route path={"/autopilot"} component={Autopilot} />{/* backward compat redirect */}
        <Route path={"/music-creator"} component={MusicCreator} />
        <Route path={"/music-video"} component={MusicVideosLanding} />
        <Route path={"/music-video/create"} component={MusicVideoAutopilot} />
        <Route path={"/render-history"} component={RenderHistory} />
        <Route path={"/kids-video"} component={KidsVideo} />
        <Route path={"/text-to-video"} component={TextToVideoCreator} />
        <Route path={"/enhancement-studio"} component={EnhancementStudio} />
        <Route path={"/batch-regeneration"} component={BatchRegeneration} />
        <Route path={"/pricing"} component={Pricing} />
        <Route path={"/onboarding"} component={Onboarding} />
        <Route path={"/help"} component={Help} />
        <Route path={"/how-it-works"} component={HowItWorks} />
        <Route path={"/privacy"} component={Privacy} />
        <Route path={"/terms"} component={Terms} />
        <Route path={"/refunds"} component={Refunds} />
        <Route path={"/uk"} component={LandingUK} />
        <Route path={"/app"} component={LandingApp} />
        <Route path={"/studio"} component={LandingStudio} />
        <Route path={"/blog"} component={Blog} />
        <Route path={"/blog/admin"} component={BlogAdmin} />
        <Route path={"/render/success"} component={RenderSuccess} />
        <Route path={"/blog/:slug"} component={BlogPost} />
        <Route path={"/seo/:slug"} component={SeoLandingPage} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
        </Switch>
        <PostLoginRedirect />
      </Suspense>
    </SafeFallbackRouter>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

// Use localStorage (not sessionStorage) so intro only shows once across all visits
const INTRO_SESSION_KEY = "wizvid_intro_seen_v2";

/** Fires identifyUser once the auth state is known */
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
    } else if (me === null) {
      // Explicitly logged-out — reset so anonymous events aren't merged
      resetIdentity();
    }
  }, [me?.id]);
  return null;
}

function App() {
  // Show branded preloader on initial app mount, then fade out
  const [appReady, setAppReady] = useState(false);

  // Show cinematic intro only on the very first visit (localStorage + cookie fallback)
  // Initialise synchronously so the intro renders on the FIRST paint — no flicker
  const [showIntro, setShowIntro] = useState(() => {
    try {
      // Check localStorage first
      if (localStorage.getItem(INTRO_SESSION_KEY)) return false;
    } catch { /* localStorage unavailable */ }
    // Cookie fallback for browsers that clear localStorage between sessions
    try {
      if (document.cookie.includes(INTRO_SESSION_KEY + "=true")) return false;
    } catch { /* noop */ }
    return true;
  });

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      setTimeout(() => setAppReady(true), 300);
    });
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          {/* ── Cinematic intro gate ──────────────────────────────────────
               Renders at z-[9999] and completely blocks all content below.
               The Router / homepage is mounted but invisible behind it.
               On dismiss the intro fades out and the homepage is revealed.
          ──────────────────────────────────────────────────────────────── */}
          {showIntro && (
            <CinematicEntryScreen onComplete={() => setShowIntro(false)} />
          )}
          {/* Branded preloader — only shown when intro is NOT showing */}
          {!showIntro && <WizVidLoader done={appReady} minDuration={400} />}
          <Toaster />
          <Suspense fallback={null}>
            <CrispChat />
          </Suspense>
          {/* Homepage is always mounted so it loads in the background.
              When intro is showing it is hidden behind z-[9999] overlay. */}
          <MixpanelIdentity />
          <Router />
          <GlobalMuteButton />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
