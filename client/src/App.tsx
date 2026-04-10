import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { WizVidLoader } from "./components/WizVidLoader";
import { lazy, Suspense, useEffect, useState } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";

// Home is eagerly loaded — it's the LCP page
import Home from "./pages/Home";

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

// Minimal fallback — just a dark screen while the chunk loads
function PageFallback() {
  return <div className="min-h-screen bg-[#0f0f0f]" />;
}

function Router() {
  return (
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
        <Route path={"/pricing"} component={Pricing} />
        <Route path={"/onboarding"} component={Onboarding} />
        <Route path={"/help"} component={Help} />
        <Route path={"/privacy"} component={Privacy} />
        <Route path={"/terms"} component={Terms} />
        <Route path={"/refunds"} component={Refunds} />
        <Route path={"/seo/:slug"} component={SeoLandingPage} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  // Show branded preloader on initial app mount, then fade out
  const [appReady, setAppReady] = useState(false);
  useEffect(() => {
    // Mark ready after first paint + a short settle delay
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
          {/* Branded preloader — fades out once app has mounted */}
          <WizVidLoader done={appReady} minDuration={600} />
          <Toaster />
          <Suspense fallback={null}>
            <CrispChat />
          </Suspense>
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
