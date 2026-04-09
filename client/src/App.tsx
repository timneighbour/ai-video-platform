import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { WizVidLoader } from "./components/WizVidLoader";
import { useEffect, useState } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Subscribe from "./pages/Subscribe";
import Credits from "./pages/Credits";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Account from "./pages/Account";
import TextToVideo from "./pages/tools/TextToVideo";
import LipSync from "./pages/tools/LipSync";
import VideoToVideo from "./pages/tools/VideoToVideo";
import Voiceover from "./pages/tools/Voiceover";
import Autopilot from "./pages/Autopilot"; // WizPilot page
import MusicVideoAutopilot from "./pages/MusicVideoAutopilot";
import MusicVideosLanding from "./pages/MusicVideosLanding";
import Pricing from "./pages/Pricing";
import Onboarding from "./pages/Onboarding";
import Help from "./pages/Help";
import SeoLandingPage from "./pages/SeoLandingPage";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refunds from "./pages/Refunds";
import CrispChat from "./components/CrispChat";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
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
      <Route path={"/music-video"} component={MusicVideosLanding} />
      <Route path={"/music-video/create"} component={MusicVideoAutopilot} />
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
          <CrispChat />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
