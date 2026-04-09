import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
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
import Autopilot from "./pages/Autopilot";

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
      <Route path={"/autopilot"} component={Autopilot} />
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
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
