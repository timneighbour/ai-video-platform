import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { lazy, Suspense, useEffect, useState } from "react";
import { identifyUser, resetIdentity } from "@/lib/mixpanel";
import { ThemeProvider } from "./contexts/ThemeContext";

// Home is eagerly loaded — it's the LCP page
import Home from "./pages/Home";
import { trpc } from "./lib/trpc";
import GlobalMuteButton from "./components/GlobalMuteButton";
import WizVidIntro, { INTRO_SEEN_KEY } from "./components/WizVidIntro";

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
const WatchPage = lazy(() => import("@/pages/WatchPage"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const BlogAdmin = lazy(() => import("@/pages/BlogAdmin"));
const LandingUK = lazy(() => import("@/pages/LandingUK"));
const LandingApp = lazy(() => import("@/pages/LandingApp"));
const LandingStudio = lazy(() => import("@/pages/LandingStudio"));
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
const WizAI = lazy(() => import("@/pages/WizAI"));
const WizImage = lazy(() => import("@/pages/WizImage"));
const WizShorts = lazy(() => import("@/pages/WizShorts"));

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
        <Route path={"/wiz-ai"} component={WizAI} />
        <Route path={"/create"} component={Create} />
        <Route path={"/wizsync"} component={WizSync} />
        <Route path={"/wizscore"} component={WizScore} />
        <Route path={"/products/wizcreate"} component={WizCreatePage} />
        <Route path={"/products/wizanimate"} component={WizAnimatePage} />
        <Route path={"/products/wizsound"} component={WizSoundPage} />
        <Route path={"/products/wizlumina"} component={WizLuminaPage} />
        <Route path={"/products/wizgenesis"} component={WizGenesisPage} />
        <Route path={"/products/wizboost"} component={WizBoostPage} />
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
        <Route path={"/wiz-image"} component={WizImage} />
        <Route path={"/wiz-shorts"} component={WizShorts} />
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
        <Route path={"/discover"} component={Discover} />
        <Route path={"/creators"} component={Discover} />
        <Route path={"/blog/:slug"} component={BlogPost} />
        <Route path={"/seo/:slug"} component={SeoLandingPage} />
        <Route path={"/watch/:slug"} component={WatchPage} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
        </Switch>
        <PostLoginRedirect />
      </Suspense>
    </SafeFallbackRouter>
  );
}

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
      resetIdentity();
    }
  }, [me?.id]);
  return null;
}

function App() {
  // Start hidden — useEffect checks sessionStorage to avoid blocking first paint.
  // This ensures the intro NEVER mounts on refresh if already seen.
  const [showIntro, setShowIntro] = useState<boolean>(false);

  // Intro disabled — go straight to hero
  // useEffect(() => {
  //   try {
  //     const seen = sessionStorage.getItem(INTRO_SEEN_KEY);
  //     if (!seen) {
  //       setShowIntro(true);
  //     }
  //   } catch {
  //     // sessionStorage unavailable (private browsing edge case) — skip intro
  //   }
  // }, []);

  const handleIntroClose = () => {
    try { sessionStorage.setItem(INTRO_SEEN_KEY, "true"); } catch {}
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
          <MixpanelIdentity />
          <Router />
          <GlobalMuteButton />
          {/* Intro shows once per session — sessionStorage flag prevents repeat */}
          {showIntro && (
            <WizVidIntro onClose={handleIntroClose} />
          )}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
