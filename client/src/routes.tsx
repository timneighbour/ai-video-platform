/**
 * routes.tsx — ISS-024: Route modularisation
 *
 * All lazy page imports and the <Switch> route tree have been extracted from
 * App.tsx into this file so that App.tsx stays focused on app-level concerns
 * (providers, analytics, intro screen) rather than routing details.
 *
 * Usage in App.tsx:
 *   import { AppRoutes, PageFallback, PostLoginRedirect } from "./routes";
 */
import { lazy, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { trpc } from "./lib/trpc";

// ─── Page Fallback ────────────────────────────────────────────────────────────

export function PageFallback() {
  return (
    <div
      className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="relative mb-8">
        <img
          src="/manus-storage/wizai-logo-v3_e7823047_6b9d9155.png"
          alt="WIZ AI"
          className="w-20 h-20 object-contain"
          style={{ filter: "drop-shadow(0 0 24px oklch(0.78 0.11 75 / 0.6))" }}
        />
        <span
          className="absolute inset-0 rounded-full"
          style={{
            animation: "wizPulse 1.8s ease-in-out infinite",
            border: "2px solid oklch(0.78 0.11 75 / 0.5)",
            borderRadius: "50%",
          }}
        />
      </div>
      <p
        className="text-base font-semibold tracking-widest uppercase mb-2"
        style={{ color: "oklch(0.78 0.11 75)", letterSpacing: "0.15em" }}
      >
        Opening your studio…
      </p>
      <p className="text-xs tracking-wide" style={{ color: "oklch(0.78 0.11 75 / 0.45)" }}>
        Preparing your creative workspace
      </p>
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

// ─── Post-login redirect helper ───────────────────────────────────────────────

export function PostLoginRedirect() {
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

// ─── Lazy page imports ────────────────────────────────────────────────────────

// Core
const Home = lazy(() => import("./pages/Home"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Subscribe = lazy(() => import("@/pages/Subscribe"));
const Credits = lazy(() => import("@/pages/Credits"));
const CreditPricingGuide = lazy(() => import("@/pages/CreditPricingGuide"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Projects = lazy(() => import("@/pages/Projects"));
const Account = lazy(() => import("@/pages/Account"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Help = lazy(() => import("@/pages/Help"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));
const RenderSuccess = lazy(() => import("@/pages/RenderSuccess"));
const Discover = lazy(() => import("@/pages/Discover"));
const ShowcasePage = lazy(() => import("@/pages/Showcase"));

// Legal / info
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const Refunds = lazy(() => import("@/pages/Refunds"));
const CookiePolicy = lazy(() => import("@/pages/CookiePolicy"));
const SeoLandingPage = lazy(() => import("@/pages/SeoLandingPage"));

// Tools
const LipSync = lazy(() => import("@/pages/tools/LipSync"));
const VideoToVideo = lazy(() => import("@/pages/tools/VideoToVideo"));
const Voiceover = lazy(() => import("@/pages/tools/Voiceover"));
const Autopilot = lazy(() => import("@/pages/Autopilot"));
const MusicVideoAutopilot = lazy(() => import("@/pages/MusicVideoAutopilot"));
const MusicVideosLanding = lazy(() => import("@/pages/MusicVideosLanding"));
const MusicCreator = lazy(() => import("@/pages/MusicCreator"));
const RenderHistory = lazy(() => import("@/pages/RenderHistory"));
const KidsVideo = lazy(() => import("@/pages/KidsVideo"));
const CharacterLibrary = lazy(() => import("@/pages/CharacterLibrary"));
const TextToVideoCreator = lazy(() => import("@/pages/TextToVideoCreator"));
const HowItWorks = lazy(() => import("@/pages/HowItWorks"));
const EnhancementStudio = lazy(() => import("@/pages/EnhancementStudio"));
const BatchRegeneration = lazy(() => import("@/pages/BatchRegeneration"));
const AiAnimationMaker = lazy(() => import("@/pages/AiAnimationMaker"));
const WizSync = lazy(() => import("@/pages/WizSync"));
const WizScore = lazy(() => import("@/pages/WizScore"));
const WizAI = lazy(() => import("@/pages/WizAI"));
const WizImage = lazy(() => import("@/pages/WizImage"));
const WizShorts = lazy(() => import("@/pages/WizShorts"));
const Create = lazy(() => import("@/pages/Create"));

// Blog
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const BlogAdmin = lazy(() => import("@/pages/BlogAdmin"));
const WatchPage = lazy(() => import("@/pages/WatchPage"));

// Landing pages
const LandingUK = lazy(() => import("@/pages/LandingUK"));
const LandingApp = lazy(() => import("@/pages/LandingApp"));
const LandingStudio = lazy(() => import("@/pages/LandingStudio"));

// Studios
const Studios = lazy(() => import("@/pages/Studios"));
const StudioDetail = lazy(() => import("@/pages/StudioDetail"));

// WizaVision
const WizaVision = lazy(() => import("@/pages/WizaVision"));
const WizaVisionWatch = lazy(() => import("@/pages/WizaVisionWatch"));
const WizaVisionCreator = lazy(() => import("@/pages/WizaVisionCreator"));

// Product pages
const WizCreatePage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizCreatePage })));
const WizLuminaPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizLuminaPage })));
const WizGenesisPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizGenesisPage })));
const WizBoostPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizBoostPage })));
const WizPilotPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizPilotPage })));
const WizSyncInfoPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizSyncInfoPage })));
const WizScoreInfoPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizScoreInfoPage })));
const WizPerformerPage = lazy(() => import("@/pages/products").then(m => ({ default: m.WizPerformerPage })));
const WizShortsProductPage = lazy(() => import("@/pages/products/WizShortsProductPage"));
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

// Admin pages
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

// ─── Route tree ───────────────────────────────────────────────────────────────

/**
 * AppRoutes renders the full <Switch> route tree.
 * Render this inside a <Suspense fallback={<PageFallback />}> in App.tsx.
 */
export function AppRoutes() {
  return (
    <Switch>
      {/* Core */}
      <Route path={"/"} component={Home} />
      <Route path={"/wiz-ai"} component={WizAI} />
      <Route path={"/create"} component={Create} />
      <Route path={"/wizsync"} component={WizSync} />
      <Route path={"/wizscore"} component={WizScore} />

      {/* Product pages */}
      <Route path={"/products/wizcreate"} component={WizCreatePage} />
      <Route path={"/products/wizvideo"} component={WizVideoLandingPage} />
      <Route path={"/products/wizanimate"} component={WizAnimateProductPage} />
      <Route path={"/wiz-animate"} component={AiAnimationMaker} />
      <Route path={"/products/wizsync"} component={WizSync} />
      <Route path={"/products/wizsound"} component={WizSoundProductPage} />
      <Route path={"/products/wizlumina"} component={WizLuminaPage} />
      <Route path={"/products/wizgenesis"} component={WizGenesisPage} />
      <Route path={"/products/wizboost"} component={WizBoostPage} />
      <Route path={"/products/wizscript"} component={WizScriptProductPage} />
      <Route path={"/wiz-script"} component={TextToVideoCreator} />
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

      {/* Subscription & credits */}
      <Route path={"/subscribe"} component={Subscribe} />
      <Route path={"/credits"} component={Credits} />
      <Route path={"/credits/guide"} component={CreditPricingGuide} />
      <Route path={"/pricing"} component={Pricing} />

      {/* User dashboard */}
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/projects"} component={Projects} />
      <Route path={"/account"} component={Account} />
      <Route path={"/my-projects"} component={Projects} />
      <Route path={"/render-history"} component={RenderHistory} />
      <Route path={"/onboarding"} component={Onboarding} />
      <Route path={"/unsubscribe"} component={Unsubscribe} />
      <Route path={"/render/success"} component={RenderSuccess} />

      {/* Tools */}
      <Route path={"/tools/text-to-video"} component={TextToVideoCreator} />
      <Route path={"/tools/lip-sync"} component={LipSync} />
      <Route path={"/tools/video-to-video"} component={VideoToVideo} />
      <Route path={"/tools/voiceover"} component={Voiceover} />
      <Route path={"/wizpilot"} component={Autopilot} />
      <Route path={"/autopilot"} component={Autopilot} />
      <Route path={"/music-creator"} component={MusicCreator} />
      <Route path={"/wiz-image"} component={WizImage} />
      <Route path={"/wiz-shorts"} component={WizShorts} />
      <Route path={"/music-videos"} component={MusicVideosLanding} />
      <Route path={"/music-video"} component={WizVideoLandingPage} />
      <Route path={"/music-video-ai"} component={WizVideoLandingPage} />
      <Route path={"/music-video/create"} component={MusicVideoAutopilot} />
      <Route path={"/kids-video"} component={KidsVideo} />
      <Route path={"/characters"} component={CharacterLibrary} />
      <Route path={"/text-to-video"} component={TextToVideoCreator} />
      <Route path={"/ai-video-generator"} component={TextToVideoCreator} />
      <Route path={"/ai-animation-maker"} component={AiAnimationMaker} />
      <Route path={"/enhancement-studio"} component={EnhancementStudio} />
      <Route path={"/batch-regeneration"} component={BatchRegeneration} />

      {/* Info / help */}
      <Route path={"/help"} component={Help} />
      <Route path={"/how-it-works"} component={HowItWorks} />

      {/* Legal */}
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/refunds"} component={Refunds} />
      <Route path={"/cookie-policy"} component={CookiePolicy} />

      {/* Landing pages */}
      <Route path={"/uk"} component={LandingUK} />
      <Route path={"/app"} component={LandingApp} />
      <Route path={"/studio"} component={LandingStudio} />

      {/* Blog & content */}
      <Route path={"/blog"} component={Blog} />
      <Route path={"/blog/admin"} component={BlogAdmin} />
      <Route path={"/blog/:slug"} component={BlogPost} />
      <Route path={"/seo/:slug"} component={SeoLandingPage} />
      <Route path={"/watch/:slug"} component={WatchPage} />
      <Route path={"/discover"} component={Discover} />
      <Route path={"/creators"} component={Discover} />
      <Route path={"/showcase"} component={ShowcasePage} />

      {/* Studios */}
      <Route path={"/studios"} component={Studios} />
      <Route path={"/studios/:id"} component={StudioDetail} />

      {/* WizaVision */}
      <Route path={"/wizavision"} component={WizaVision} />
      <Route path={"/wizavision/browse"} component={WizaVision} />
      <Route path={"/wizavision/browse/:category"} component={WizaVision} />
      <Route path={"/wizavision/watch/:slug"} component={WizaVisionWatch} />
      <Route path={"/wizavision/creator/:username"} component={WizaVisionCreator} />

      {/* Admin */}
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

      {/* 404 */}
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}
