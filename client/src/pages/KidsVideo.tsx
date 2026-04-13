/**
 * Kids Animation Creator
 * Unified creation flow matching MusicVideoAutopilot:
 *   concept → story_input → characters → storyboard → render
 *
 * Backend: kidsVideo tRPC router (createJob → generateStoryboard → createRenderCheckout)
 * Characters: kidsVideo.generateCharacter (AI preview) + stored as referenceImageUrls on job
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Wand2, Sparkles, RefreshCw, Play, ChevronRight,
  Zap, CheckCircle2, Clock, ArrowLeft, Loader2,
  AlertCircle, Download, ExternalLink, Plus, Trash2,
  Star, Shield, Film, User, X, ImageIcon,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import CreditBalance from "@/components/CreditBalance";
import { LowCreditBanner } from "@/components/LowCreditBanner";
import { useCreditGuard } from "@/hooks/useCreditGuard";
import AuthGate from "@/components/AuthGate";
import { useAuth } from "@/_core/hooks/useAuth";
import { mp } from "@/lib/mixpanel";

// ─── Constants ────────────────────────────────────────────────────────────────

const KIDS_STYLES = [
  { id: "pixar3d",    label: "Pixar 3D",    desc: "Vibrant 3D animation",          emoji: "🎬", color: "from-blue-500 to-cyan-400" },
  { id: "disney",     label: "Disney",       desc: "Magical Disney animation",      emoji: "✨", color: "from-purple-500 to-pink-400" },
  { id: "anime",      label: "Anime",        desc: "Fun Japanese animation",        emoji: "🌸", color: "from-pink-500 to-rose-400" },
  { id: "cartoon",    label: "Cartoon",      desc: "Classic colourful cartoon",     emoji: "🎨", color: "from-orange-500 to-yellow-400" },
  { id: "storybook",  label: "Storybook",    desc: "Illustrated fairy-tale style",  emoji: "📖", color: "from-green-500 to-emerald-400" },
  { id: "claymation", label: "Claymation",   desc: "Playful clay-style animation",  emoji: "🧸", color: "from-amber-500 to-orange-400" },
] as const;

type KidsStyleId = typeof KIDS_STYLES[number]["id"];

const VIDEO_LENGTHS = [
  { id: "5s",  label: "5s",  credits: 50  },
  { id: "10s", label: "10s", credits: 100 },
  { id: "15s", label: "15s", credits: 150 },
  { id: "30s", label: "30s", credits: 300 },
  { id: "60s", label: "60s", credits: 600 },
] as const;

type VideoLengthId = typeof VIDEO_LENGTHS[number]["id"];

const SCREEN_FORMATS = [
  { id: "16:9", label: "16:9", desc: "Landscape" },
  { id: "9:16", label: "9:16", desc: "Portrait"  },
  { id: "1:1",  label: "1:1",  desc: "Square"    },
] as const;

type ScreenFormatId = typeof SCREEN_FORMATS[number]["id"];

const PROMPT_EXAMPLES = [
  "A friendly dragon who loves baking cookies and shares them with woodland animals",
  "A little astronaut exploring a colourful planet full of singing aliens",
  "A brave bunny who goes on an adventure to find the magical golden carrot",
  "A group of toy robots who come to life at night and tidy up the playroom",
  "A mermaid princess who teaches sea creatures how to read and write",
];

const HOW_IT_WORKS = [
  {
    step: "1", emoji: "✍️",
    title: "Describe Your Story",
    desc: "Type a simple story idea — or pick from our inspiration prompts. No writing experience needed.",
    color: "from-pink-500/20 to-rose-500/10 border-pink-500/30",
  },
  {
    step: "2", emoji: "🎭",
    title: "Design Your Characters",
    desc: "Describe your characters and let AI generate consistent character art for every scene.",
    color: "from-purple-500/20 to-violet-500/10 border-purple-500/30",
  },
  {
    step: "3", emoji: "🎨",
    title: "See Your Free Storyboard",
    desc: "AI instantly creates 4–6 illustrated scenes. Review, regenerate — completely free.",
    color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30",
  },
  {
    step: "4", emoji: "🔓",
    title: "Unlock Your Video",
    desc: "Render it into a full animated video with WizSound™ cinematic audio.",
    color: "from-orange-500/20 to-amber-500/10 border-orange-500/30",
  },
];

const FEATURES = [
  { icon: "🎭", title: "AI Generated Characters", desc: "Describe your characters and AI creates consistent character art across every scene." },
  { icon: "🔄", title: "Free Storyboard, Always", desc: "Generate and regenerate your storyboard as many times as you want before spending a single credit." },
  { icon: "🎵", title: "WizSound™ Cinematic Audio", desc: "Every kids video comes with AI-composed background music matched to your story's mood." },
  { icon: "🛡️", title: "Child-Safe by Design", desc: "All content is filtered and reviewed to ensure it's safe, positive, and appropriate for children." },
  { icon: "📱", title: "Any Screen Format", desc: "Landscape for TV, portrait for phones, square for social — choose the format that fits." },
  { icon: "⚡", title: "Ready in Minutes", desc: "From story idea to finished animated video in under 5 minutes. No editing skills required." },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "concept" | "story_input" | "characters" | "storyboard" | "render";

interface KidsCharacter {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  isGenerating: boolean;
}

interface StoryboardFrame {
  sceneIndex: number;
  sceneLabel: string;
  imageUrl: string;
  description: string;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const CREATION_STEPS: { key: Step; label: string }[] = [
  { key: "story_input", label: "1. Story" },
  { key: "characters",  label: "2. Characters" },
  { key: "storyboard",  label: "3. Storyboard" },
  { key: "render",      label: "4. Render" },
];

function stepIndex(step: Step): number {
  return CREATION_STEPS.findIndex((s) => s.key === step);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KidsVideo() {
  const { isAuthenticated } = useAuth();
  const { balance: creditBalance } = useCreditGuard();
  const [, setLocation] = useLocation();

  // ── Navigation state ──
  const [step, setStep] = useState<Step>("concept");
  const [showAuthGate, setShowAuthGate] = useState(false);

  // ── Story input ──
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<KidsStyleId>("pixar3d");
  const [videoLength, setVideoLength] = useState<VideoLengthId>("15s");
  const [screenFormat, setScreenFormat] = useState<ScreenFormatId>("16:9");

  // ── Characters ──
  const [characters, setCharacters] = useState<KidsCharacter[]>([
    { id: "char-1", name: "Main Character", description: "", imageUrl: null, isGenerating: false },
  ]);

  // ── Job state ──
  const [jobId, setJobId] = useState<number | null>(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [storyboardFrames, setStoryboardFrames] = useState<StoryboardFrame[]>([]);
  const [storyboardError, setStoryboardError] = useState<string | null>(null);

  // ── Render state ──
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  type RenderStatus = "not_started" | "queued" | "processing" | "completed" | "failed";
  const [renderStatus, setRenderStatus] = useState<RenderStatus>("not_started");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const utils = trpc.useUtils();
  const selectedLength = VIDEO_LENGTHS.find((v) => v.id === videoLength)!;
  const creditCost = selectedLength.credits;

  // ── Restore from URL params (post-Stripe redirect) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlJobId = params.get("jobId");
    const payment = params.get("payment");
    if (urlJobId && payment === "success") {
      const id = parseInt(urlJobId, 10);
      if (!isNaN(id)) {
        setJobId(id);
        setStep("render");
        setRenderStatus("queued");
        toast.success("Payment successful! Your video is being rendered 🎬");
        // Clean URL
        window.history.replaceState({}, "", "/kids-video");
        startPollingRender(id);
      }
    } else if (urlJobId && payment === "cancelled") {
      const id = parseInt(urlJobId, 10);
      if (!isNaN(id)) {
        setJobId(id);
        setStep("storyboard");
        toast.info("Payment cancelled — your storyboard is still here.");
        window.history.replaceState({}, "", "/kids-video");
        // Reload storyboard frames
        utils.kidsVideo.getJob.fetch({ jobId: id }).then((job) => {
          if (job.storyboardFrames?.length) {
            setStoryboardFrames(job.storyboardFrames as StoryboardFrame[]);
          }
          setPrompt(job.storyPrompt);
          setStyle(job.animationStyle as KidsStyleId);
          setVideoLength(job.videoLength as VideoLengthId);
          setScreenFormat(job.screenFormat as ScreenFormatId);
        }).catch(() => {});
      }
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Polling for render completion ──
  const startPollingRender = useCallback((id: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const job = await utils.kidsVideo.getJob.fetch({ jobId: id });
        setRenderStatus(job.renderStatus as RenderStatus);
        if (job.renderStatus === "completed" && job.videoUrl) {
          setVideoUrl(job.videoUrl);
          clearInterval(pollRef.current!);
          toast.success("🎉 Your kids video is ready!");
        } else if (job.renderStatus === "failed") {
          clearInterval(pollRef.current!);
          toast.error(job.errorMessage || "Render failed. Please contact support.");
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 8000);
  }, [utils]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Mutations ──
  const createJobMutation = trpc.kidsVideo.createJob.useMutation();
  const generateStoryboardMutation = trpc.kidsVideo.generateStoryboard.useMutation();
  const generateCharacterMutation = trpc.kidsVideo.generateCharacter.useMutation();
  const createRenderCheckoutMutation = trpc.kidsVideo.createRenderCheckout.useMutation();

  // ── Handlers ──

  const handleGoToCharacters = useCallback(() => {
    if (!prompt.trim() || prompt.length < 10) {
      toast.error("Please describe your story idea (at least 10 characters).");
      return;
    }
    setStep("characters");
  }, [prompt]);

  const handleGenerateCharacterImage = useCallback(async (charId: string) => {
    if (!isAuthenticated) { setShowAuthGate(true); return; }
    const char = characters.find((c) => c.id === charId);
    if (!char || char.description.trim().length < 5) {
      toast.error("Please describe the character first (at least 5 characters).");
      return;
    }
    setCharacters((prev) => prev.map((c) => c.id === charId ? { ...c, isGenerating: true } : c));
    try {
      const result = await generateCharacterMutation.mutateAsync({
        characterPrompt: `${char.name}: ${char.description}`,
        animationStyle: (style === "disney" ? "pixar3d" : style) as "pixar3d" | "anime" | "cartoon" | "storybook" | "claymation",
      });
      setCharacters((prev) => prev.map((c) => c.id === charId ? { ...c, imageUrl: result.imageUrl ?? null, isGenerating: false } : c));
      toast.success(`${char.name} generated! ✨`);
    } catch (err: any) {
      setCharacters((prev) => prev.map((c) => c.id === charId ? { ...c, isGenerating: false } : c));
      toast.error(err?.message || "Character generation failed.");
    }
  }, [isAuthenticated, characters, style, generateCharacterMutation]);

  const handleAddCharacter = useCallback(() => {
    if (characters.length >= 4) { toast.error("Maximum 4 characters per video."); return; }
    setCharacters((prev) => [
      ...prev,
      { id: `char-${Date.now()}`, name: `Character ${prev.length + 1}`, description: "", imageUrl: null, isGenerating: false },
    ]);
  }, [characters.length]);

  const handleRemoveCharacter = useCallback((charId: string) => {
    setCharacters((prev) => {
      if (prev.length <= 1) { toast.error("You need at least one character."); return prev; }
      return prev.filter((c) => c.id !== charId);
    });
  }, []);

  const handleGenerateStoryboard = useCallback(async () => {
    if (!isAuthenticated) { setShowAuthGate(true); return; }
    setStoryboardError(null);
    setIsCreatingJob(true);
    try {
      // Collect reference image URLs from generated characters
      const referenceImageUrls = characters
        .filter((c) => c.imageUrl)
        .map((c) => c.imageUrl as string);

      let currentJobId = jobId;
      if (!currentJobId) {
        const result = await createJobMutation.mutateAsync({
          storyPrompt: prompt,
          animationStyle: style as "pixar3d" | "disney" | "anime" | "cartoon" | "storybook" | "claymation",
          videoLength: videoLength as "5s" | "10s" | "15s" | "30s" | "60s",
          screenFormat: screenFormat as "16:9" | "9:16" | "1:1",
          referenceImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
        });
        currentJobId = result.jobId;
        setJobId(currentJobId);
      }
      setIsCreatingJob(false);
      setIsGeneratingStoryboard(true);
      setStep("storyboard");

      const result = await generateStoryboardMutation.mutateAsync({ jobId: currentJobId });
      setStoryboardFrames(result.frames as StoryboardFrame[]);
      mp.storyboardGenerated(result.frames.length);
      toast.success("Storyboard ready! Review your scenes below 🎨");
    } catch (err: any) {
      setStoryboardError(err?.message || "Storyboard generation failed. Please try again.");
      toast.error(err?.message || "Storyboard generation failed.");
    } finally {
      setIsCreatingJob(false);
      setIsGeneratingStoryboard(false);
    }
  }, [
    isAuthenticated, prompt, style, videoLength, screenFormat,
    characters, jobId, createJobMutation, generateStoryboardMutation,
  ]);

  const handleRegenerateStoryboard = useCallback(async () => {
    if (!jobId) return;
    setStoryboardError(null);
    setIsGeneratingStoryboard(true);
    try {
      const result = await generateStoryboardMutation.mutateAsync({ jobId });
      setStoryboardFrames(result.frames as StoryboardFrame[]);
      mp.storyboardRegenerated(result.frames.length);
      toast.success("Storyboard regenerated — free of charge! 🎨");
    } catch (err: any) {
      setStoryboardError(err?.message || "Regeneration failed.");
      toast.error(err?.message || "Regeneration failed.");
    } finally {
      setIsGeneratingStoryboard(false);
    }
  }, [jobId, generateStoryboardMutation]);

  const handleRenderVideo = useCallback(async () => {
    if (!isAuthenticated) { setShowAuthGate(true); return; }
    if (!jobId) { toast.error("Please generate a storyboard first."); return; }
    setIsCheckingOut(true);
    try {
      const result = await createRenderCheckoutMutation.mutateAsync({
        jobId,
        origin: window.location.origin,
      });
      if (result.checkoutUrl) {
        toast.success("Redirecting to checkout…");
        window.open(result.checkoutUrl, "_blank");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to start checkout. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  }, [isAuthenticated, jobId, createRenderCheckoutMutation]);

  const handleReset = useCallback(() => {
    setStep("concept");
    setPrompt("");
    setStyle("pixar3d");
    setVideoLength("15s");
    setScreenFormat("16:9");
    setCharacters([{ id: "char-1", name: "Main Character", description: "", imageUrl: null, isGenerating: false }]);
    setJobId(null);
    setStoryboardFrames([]);
    setStoryboardError(null);
    setRenderStatus("not_started");
    setVideoUrl(null);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const currentStepIndex = stepIndex(step);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <AuthGate open={showAuthGate} onClose={() => setShowAuthGate(false)} featureName="create your kids video" />

      {/* ── Header ── */}
      <div className="border-b border-white/10 sticky top-0 z-30 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (step === "characters") setStep("story_input");
              else if (step === "story_input") setStep("concept");
              else if (step === "storyboard") setStep("characters");
              else if (step === "render" && renderStatus === "not_started") setStep("storyboard");
              else setLocation("/");
            }}
            className="gap-2 text-muted-foreground hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">
              {step === "characters" ? "Edit Story" :
               step === "storyboard" ? "Characters" :
               step === "render" ? "Storyboard" : "Back"}
            </span>
          </Button>

          <div className="flex items-center gap-2.5">
            <span className="text-xl">🧒</span>
            <span className="font-bold text-white text-sm sm:text-base">Kids Animation Creator</span>
            <Badge className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-xs hidden sm:inline-flex">
              Child-Safe AI
            </Badge>
          </div>

          {step !== "concept" ? (
            <CreditBalance variant="badge" />
          ) : (
            <Button
              size="sm"
              onClick={() => setStep("story_input")}
              className="bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white border-0 text-xs px-4"
            >
              Start Free →
            </Button>
          )}
        </div>

        {/* Step progress bar */}
        {step !== "concept" && (
          <div className="border-t border-white/10 bg-white/[0.03]">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-1 sm:gap-2 py-2.5 overflow-x-auto scrollbar-none">
                {CREATION_STEPS.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <div
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        currentStepIndex === i
                          ? "bg-pink-600 text-white shadow-lg shadow-pink-500/30"
                          : currentStepIndex > i
                          ? "bg-green-600/30 text-green-400"
                          : "bg-white/10 text-muted-foreground"
                      }`}
                    >
                      {currentStepIndex > i
                        ? <CheckCircle2 className="h-3 w-3" />
                        : <Clock className="h-3 w-3" />}
                      <span className="whitespace-nowrap">{s.label}</span>
                    </div>
                    {i < CREATION_STEPS.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          CONCEPT PAGE (marketing landing)
      ══════════════════════════════════════════════════════════════════════ */}
      {step === "concept" && (
        <div className="overflow-x-hidden">

          {/* Hero */}
          <section className="relative py-20 sm:py-28 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-950/40 via-background to-purple-950/30 pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,_rgba(236,72,153,0.1)_0%,_transparent_70%)] pointer-events-none" />
            <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-1.5 text-xs sm:text-sm text-pink-300 mb-6">
                <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                Child-Safe AI · AI Generated Characters · Powered by WizCreate™
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
                Turn Any Story Into a
                <span className="block bg-gradient-to-r from-pink-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                  Magical Kids Animation
                </span>
              </h1>
              <p className="text-base sm:text-lg font-medium text-white/80 max-w-2xl mx-auto mb-3 leading-relaxed">
                Create stunning animated kids videos in Pixar, cartoon, or storybook styles.
              </p>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                Describe your story, design your characters with AI, and watch a beautiful animated storyboard appear — completely free. Render the full video when you're ready.
              </p>
              <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mb-10 text-sm">
                {[
                  { value: "Free", label: "Storyboard preview" },
                  { value: "6",    label: "Animation styles" },
                  { value: "4–6",  label: "Scenes per video" },
                  { value: "< 5 min", label: "To final video" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  onClick={() => setStep("story_input")}
                  className="gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white border-0 px-10 py-6 text-base font-semibold shadow-lg shadow-pink-500/25"
                >
                  <Wand2 className="h-5 w-5" />
                  Create Free Storyboard 🌈
                </Button>
                <p className="text-xs text-muted-foreground">No credit card · No sign-up required to preview</p>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-16 sm:py-20 border-t border-white/5">
            <div className="container mx-auto px-4 max-w-5xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">How It Works</h2>
                <p className="text-muted-foreground">Four steps from idea to animated video</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {HOW_IT_WORKS.map((item) => (
                  <div key={item.step} className={`rounded-2xl border bg-gradient-to-br p-5 ${item.color}`}>
                    <div className="text-3xl mb-3">{item.emoji}</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Step {item.step}</div>
                    <h3 className="text-sm font-bold text-white mb-1.5">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-amber-500/5 p-6 text-center">
                <div className="text-2xl mb-3">👀</div>
                <h3 className="text-lg font-bold text-white mb-2">"I've already seen it — now I want to unlock it."</h3>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  Your storyboard is generated instantly and for free. By the time you see your story illustrated scene-by-scene, the video already feels real.
                </p>
              </div>
            </div>
          </section>

          {/* Animation Styles */}
          <section className="py-16 sm:py-20 border-t border-white/5 bg-white/[0.02]">
            <div className="container mx-auto px-4 max-w-5xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">6 Animation Styles</h2>
                <p className="text-muted-foreground">Every style is character-consistent across all scenes</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {KIDS_STYLES.map((s) => (
                  <div
                    key={s.id}
                    className="group rounded-2xl border border-white/10 bg-white/5 p-5 text-center hover:border-pink-500/40 hover:bg-pink-500/5 transition-all cursor-pointer"
                    onClick={() => { setStyle(s.id); setStep("story_input"); }}
                  >
                    <div className="text-4xl mb-3">{s.emoji}</div>
                    <div className="font-bold text-white text-sm mb-1">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.desc}</div>
                    <div className={`mt-3 h-0.5 rounded-full bg-gradient-to-r ${s.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="py-16 sm:py-20 border-t border-white/5">
            <div className="container mx-auto px-4 max-w-5xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Everything You Need</h2>
                <p className="text-muted-foreground">Built for parents, teachers, and storytellers</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {FEATURES.map((f) => (
                  <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-white/20 hover:bg-white/[0.07] transition-all">
                    <div className="text-2xl mb-3">{f.icon}</div>
                    <h3 className="font-bold text-white text-sm mb-1.5">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className="py-16 sm:py-20 border-t border-white/5 bg-white/[0.02]">
            <div className="container mx-auto px-4 max-w-3xl text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
              <p className="text-muted-foreground mb-10">The storyboard is always free. Credits are only used when you render your final video.</p>
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                {[
                  { duration: "10s video", credits: "100 credits", note: "Perfect for social" },
                  { duration: "30s video", credits: "300 credits", note: "Great for stories" },
                  { duration: "60s video", credits: "600 credits", note: "Full short film" },
                ].map((p) => (
                  <div key={p.duration} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="font-bold text-white text-lg mb-1">{p.duration}</div>
                    <div className="text-pink-400 font-semibold text-sm mb-1">{p.credits}</div>
                    <div className="text-xs text-muted-foreground">{p.note}</div>
                  </div>
                ))}
              </div>
              <Button
                size="lg"
                onClick={() => setStep("story_input")}
                className="gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white border-0 px-10 py-6 text-base font-semibold shadow-lg shadow-pink-500/25"
              >
                <Sparkles className="h-5 w-5" />
                Start with a Free Storyboard 🌈
              </Button>
            </div>
          </section>

          {/* Trust signals */}
          <section className="py-12 border-t border-white/5">
            <div className="container mx-auto px-4 max-w-3xl">
              <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-center">
                {[
                  { icon: "🛡️", label: "Child-Safe Content" },
                  { icon: "🎭", label: "AI Characters" },
                  { icon: "🎵", label: "WizSound™ Audio" },
                  { icon: "⚡", label: "Ready in Minutes" },
                  { icon: "♾️", label: "Unlimited Previews" },
                ].map((t) => (
                  <div key={t.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t.icon}</span><span>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="py-16 sm:py-20 border-t border-white/5 bg-gradient-to-b from-background to-pink-950/20">
            <div className="container mx-auto px-4 max-w-2xl text-center">
              <div className="text-5xl mb-6">🌈</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to Create Something Magical?</h2>
              <p className="text-muted-foreground mb-8">Your child's story, brought to life in minutes. Start with a free storyboard — no credit card needed.</p>
              <Button
                size="lg"
                onClick={() => setStep("story_input")}
                className="gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white border-0 px-12 py-6 text-base font-semibold shadow-lg shadow-pink-500/25"
              >
                <Wand2 className="h-5 w-5" />
                Create Your Kids Animation →
              </Button>
              <p className="text-xs text-muted-foreground mt-4">Powered by WizCreate™ · WizSound™ · Child-Safe AI</p>
            </div>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CREATION FLOW
      ══════════════════════════════════════════════════════════════════════ */}
      {step !== "concept" && (
        <div className="container mx-auto px-4 py-6 sm:py-10 max-w-3xl">

          {/* ── STEP 1: STORY INPUT ── */}
          {step === "story_input" && (
            <div className="space-y-6 sm:space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-1.5 text-xs sm:text-sm text-pink-300 mb-4">
                  <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                  Storyboard preview is always free — pay only when you render
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">🌈 Tell Your Story</h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Describe your story idea, pick a style, and we'll create a free animated storyboard for you to review.
                </p>
              </div>

              {/* Story Prompt */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
                <label className="block text-sm font-medium text-white mb-2">
                  Story Idea <span className="text-muted-foreground">(min. 10 characters)</span>
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A friendly dragon who loves baking cookies and shares them with woodland animals…"
                  className="w-full h-28 sm:h-32 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/50 text-sm"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{prompt.length} / 1000</span>
                  {prompt.length >= 10 && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ready
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-muted-foreground mb-2">💡 Need inspiration? Try one of these:</p>
                  <div className="flex flex-wrap gap-2">
                    {PROMPT_EXAMPLES.slice(0, 3).map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(ex)}
                        className="text-xs rounded-full border border-pink-500/20 bg-pink-500/5 px-3 py-1 text-pink-300 hover:bg-pink-500/15 transition text-left"
                      >
                        {ex.slice(0, 45)}…
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Animation Style */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">Animation Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {KIDS_STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        style === s.id
                          ? "border-pink-500 bg-pink-500/20 text-white"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <div className="text-lg mb-1">{s.emoji}</div>
                      <div className="font-medium text-sm">{s.label}</div>
                      <div className="text-xs opacity-70 mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Video Length & Screen Format */}
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-3">Video Length</label>
                  <div className="grid grid-cols-5 gap-2">
                    {VIDEO_LENGTHS.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setVideoLength(v.id)}
                        className={`rounded-xl border p-2.5 text-center transition-all ${
                          videoLength === v.id
                            ? "border-pink-500 bg-pink-500/20 text-white"
                            : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <div className="font-bold text-xs sm:text-sm">{v.label}</div>
                        <div className="text-xs opacity-70 mt-0.5 hidden sm:block">{v.credits}cr</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-3">Screen Format</label>
                  <div className="flex gap-2 sm:gap-3">
                    {SCREEN_FORMATS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setScreenFormat(f.id)}
                        className={`flex-1 rounded-xl border p-3 text-center transition-all ${
                          screenFormat === f.id
                            ? "border-pink-500 bg-pink-500/20 text-white"
                            : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <div className="font-bold text-xs">{f.id}</div>
                        <div className="text-xs opacity-70 mt-0.5">{f.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="text-center">
                <Button
                  size="lg"
                  onClick={handleGoToCharacters}
                  disabled={prompt.length < 10}
                  className="gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white border-0 w-full sm:w-auto px-10 py-6 text-base font-semibold"
                >
                  Next: Design Characters
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <p className="text-xs text-muted-foreground mt-3">Free storyboard preview · No credits charged yet</p>
              </div>
            </div>
          )}

          {/* ── STEP 2: CHARACTERS ── */}
          {step === "characters" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs sm:text-sm text-purple-300 mb-4">
                  <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                  AI Generated Characters — describe them and watch them come to life
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">🎭 Design Your Characters</h2>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                  Describe each character and generate a preview image. These will be used to keep your characters consistent across all scenes.
                </p>
              </div>

              <div className="space-y-4">
                {characters.map((char, idx) => {
                  const slotColors = [
                    { ring: "ring-purple-500", bg: "bg-purple-900/20", badge: "bg-purple-900/50 text-purple-300 border-purple-800" },
                    { ring: "ring-blue-500",   bg: "bg-blue-900/20",   badge: "bg-blue-900/50 text-blue-300 border-blue-800" },
                    { ring: "ring-pink-500",   bg: "bg-pink-900/20",   badge: "bg-pink-900/50 text-pink-300 border-pink-800" },
                    { ring: "ring-amber-500",  bg: "bg-amber-900/20",  badge: "bg-amber-900/50 text-amber-300 border-amber-800" },
                  ][idx % 4];

                  return (
                    <div key={char.id} className={`rounded-2xl border border-white/10 ${slotColors.bg} p-4 sm:p-5`}>
                      {/* Character header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full ring-2 ${slotColors.ring} bg-white/10 flex items-center justify-center`}>
                            <User className="h-3.5 w-3.5 text-white" />
                          </div>
                          <Input
                            value={char.name}
                            onChange={(e) => setCharacters((prev) => prev.map((c) => c.id === char.id ? { ...c, name: e.target.value } : c))}
                            className="bg-transparent border-none text-white font-semibold text-sm p-0 h-auto focus-visible:ring-0 w-36 sm:w-48"
                            placeholder="Character name…"
                          />
                          <Badge className={`text-xs border ${slotColors.badge}`}>Character {idx + 1}</Badge>
                        </div>
                        {characters.length > 1 && (
                          <button
                            onClick={() => handleRemoveCharacter(char.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* Description */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1.5 block">Character Description</label>
                          <Textarea
                            value={char.description}
                            onChange={(e) => setCharacters((prev) => prev.map((c) => c.id === char.id ? { ...c, description: e.target.value } : c))}
                            placeholder={`e.g. A cheerful young girl with curly red hair, wearing a yellow dress and carrying a magic wand…`}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/50 min-h-[80px]"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleGenerateCharacterImage(char.id)}
                            disabled={char.isGenerating || char.description.trim().length < 5}
                            className="mt-2 gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white border-0 text-xs w-full"
                          >
                            {char.isGenerating ? (
                              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                            ) : (
                              <><Wand2 className="h-3.5 w-3.5" /> Generate Character Image ✨</>
                            )}
                          </Button>
                        </div>

                        {/* Preview image */}
                        <div>
                          {char.isGenerating ? (
                            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 aspect-square flex flex-col items-center justify-center gap-2">
                              <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
                              <span className="text-xs text-purple-300">Creating character…</span>
                            </div>
                          ) : char.imageUrl ? (
                            <div className="relative rounded-xl overflow-hidden aspect-square border border-purple-500/30">
                              <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                              <button
                                onClick={() => handleGenerateCharacterImage(char.id)}
                                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition"
                                title="Regenerate"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => char.description.trim().length >= 5 && handleGenerateCharacterImage(char.id)}
                              className="w-full rounded-xl border-2 border-dashed border-purple-500/20 bg-purple-500/5 aspect-square flex flex-col items-center justify-center gap-2 hover:border-purple-500/40 hover:bg-purple-500/10 transition group"
                            >
                              <ImageIcon className="h-8 w-8 text-muted-foreground/30 group-hover:text-purple-400 transition" />
                              <span className="text-xs text-muted-foreground/50 group-hover:text-purple-300 transition text-center px-2">
                                {char.description.trim().length >= 5
                                  ? "Click to generate character image 🎨"
                                  : "Describe the character first"}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add character */}
              {characters.length < 4 && (
                <button
                  onClick={handleAddCharacter}
                  className="w-full rounded-2xl border-2 border-dashed border-purple-500/20 bg-transparent py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-purple-500/40 hover:text-purple-300 hover:bg-purple-500/5 transition"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Character (up to 4)
                </button>
              )}

              <div className="flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-300">
                <Star className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <span>
                  Character images are optional but recommended — they help AI keep your characters consistent across all scenes. You can skip this step and generate the storyboard directly.
                </span>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("story_input")}
                  className="gap-2 border-white/20 text-white hover:bg-white/10 flex-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Story
                </Button>
                <Button
                  onClick={handleGenerateStoryboard}
                  disabled={isCreatingJob || isGeneratingStoryboard}
                  className="gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white border-0 flex-1"
                >
                  {isCreatingJob ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating job…</>
                  ) : (
                    <><Wand2 className="h-4 w-4" /> Generate Free Storyboard 🌈</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">Free storyboard preview · No credits charged yet</p>
            </div>
          )}

          {/* ── STEP 3: STORYBOARD ── */}
          {step === "storyboard" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">🎬 Your Free Storyboard</h2>
                <p className="text-sm text-muted-foreground">
                  AI-generated scenes for your story. Review and regenerate as many times as you like — completely free!
                </p>
              </div>

              {/* Generating state */}
              {isGeneratingStoryboard && (
                <div className="rounded-2xl border border-pink-500/30 bg-pink-500/5 p-8 text-center space-y-4">
                  <div className="text-4xl animate-bounce">🎨</div>
                  <div>
                    <h3 className="font-bold text-white mb-1">Creating Your Storyboard…</h3>
                    <p className="text-sm text-muted-foreground">AI is illustrating your story scenes. This takes about 30–60 seconds.</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-pink-300 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating scene illustrations…</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {storyboardError && !isGeneratingStoryboard && (
                <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Storyboard generation failed</p>
                    <p className="text-xs opacity-80">{storyboardError}</p>
                  </div>
                </div>
              )}

              {/* Storyboard frames */}
              {!isGeneratingStoryboard && storyboardFrames.length > 0 && (
                <div className="space-y-4">
                  {storyboardFrames.map((frame, i) => (
                    <div key={frame.sceneIndex} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                        <span className="text-xs font-bold text-pink-400 bg-pink-500/20 rounded-full px-2 py-0.5">
                          Scene {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-white">{frame.sceneLabel}</span>
                      </div>
                      {frame.imageUrl ? (
                        <div className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-xl overflow-hidden aspect-video">
                          <img src={frame.imageUrl} alt={frame.sceneLabel} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-xl border border-dashed border-pink-500/20 bg-pink-500/5 aspect-video flex items-center justify-center">
                          <div className="text-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                            <span className="text-xs text-muted-foreground/50">Image generation failed for this scene</span>
                          </div>
                        </div>
                      )}
                      <div className="px-4 py-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">{frame.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state while loading */}
              {!isGeneratingStoryboard && storyboardFrames.length === 0 && !storyboardError && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                  <div className="text-4xl mb-3">🎨</div>
                  <p className="text-muted-foreground text-sm">Your storyboard will appear here once generated.</p>
                  <Button
                    onClick={handleGenerateStoryboard}
                    disabled={isCreatingJob || isGeneratingStoryboard}
                    className="mt-4 gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white border-0"
                  >
                    <Wand2 className="h-4 w-4" />
                    Generate Storyboard
                  </Button>
                </div>
              )}

              {/* Render controls */}
              {!isGeneratingStoryboard && storyboardFrames.length > 0 && (
                <>
                  <LowCreditBanner balance={creditBalance} estimatedCost={creditCost} variant="inline" dismissible />

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-4 w-4 text-yellow-400" />
                        <span className="font-semibold text-white">Ready to render? 🚀</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Final render costs <span className="text-white font-semibold">{creditCost} credits</span> for {videoLength} · {screenFormat}
                      </p>
                      <div className="mt-2">
                        <CreditBalance variant="inline" cost={creditCost} />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        variant="outline"
                        onClick={handleRegenerateStoryboard}
                        disabled={isGeneratingStoryboard}
                        className="gap-2 border-white/20 text-white hover:bg-white/10 flex-1"
                      >
                        {isGeneratingStoryboard ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Regenerate Free 🎨
                      </Button>
                      <Button
                        onClick={handleRenderVideo}
                        disabled={isCheckingOut || !jobId}
                        className="gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white border-0 flex-1"
                      >
                        {isCheckingOut ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Preparing checkout…</>
                        ) : (
                          <><Play className="h-4 w-4" /> Render Video — {creditCost} Credits</>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-300">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>All content is generated to be safe and appropriate for children. AI-generated previews are free — credits are only charged when you render the final video.</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP 4: RENDER ── */}
          {step === "render" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                  {renderStatus === "completed" ? "🎉 Your Video is Ready!" :
                   renderStatus === "failed" ? "❌ Render Failed" :
                   "🎬 Rendering Your Video…"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {renderStatus === "completed" ? "Your animated kids video has been created. Watch it below!" :
                   renderStatus === "failed" ? "Something went wrong. Please contact support or try again." :
                   "Our AI is bringing your story to life! This usually takes 2–5 minutes."}
                </p>
              </div>

              {/* Rendering progress */}
              {(renderStatus === "queued" || renderStatus === "processing") && (
                <div className="rounded-2xl border border-pink-500/30 bg-pink-500/5 p-8 text-center space-y-6">
                  <div className="text-5xl animate-bounce">🎬</div>
                  <div className="space-y-3 max-w-sm mx-auto">
                    <Progress value={renderStatus === "processing" ? 65 : 20} className="h-3 rounded-full" />
                    <p className="text-sm text-pink-300 font-medium">
                      {renderStatus === "processing" ? "Rendering your scenes…" : "Queued — starting soon…"}
                    </p>
                  </div>
                  <div className="space-y-2 text-left max-w-xs mx-auto">
                    {[
                      { label: "Payment confirmed", done: true },
                    { label: "Render job queued", done: ["processing", "completed"].includes(renderStatus) },
                    { label: "Generating animation frames", done: renderStatus === ("completed" as RenderStatus) },
                    { label: "Compositing final video", done: renderStatus === ("completed" as RenderStatus) },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        {s.done ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                        ) : (
                          <Loader2 className="h-4 w-4 text-pink-400 animate-spin flex-shrink-0" />
                        )}
                        <span className={s.done ? "text-white" : "text-muted-foreground/70"}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">This page will update automatically when your video is ready 🌈</p>
                </div>
              )}

              {/* Completed video */}
              {renderStatus === "completed" && videoUrl && (
                <div className="space-y-4">
                  <div className="w-full rounded-2xl overflow-hidden border border-pink-500/30 bg-black">
                    <video src={videoUrl} controls autoPlay muted playsInline className="w-full" style={{ maxHeight: "400px" }} />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      className="gap-2 border-white/20 text-white hover:bg-white/10 flex-1"
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = videoUrl;
                        a.download = "kids-video.mp4";
                        a.click();
                        toast.success("Download started!");
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 border-white/20 text-white hover:bg-white/10 flex-1"
                      onClick={() => window.open(videoUrl, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in New Tab
                    </Button>
                    <Button
                      onClick={() => setLocation("/projects")}
                      className="gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white border-0 flex-1"
                    >
                      <Film className="h-4 w-4" />
                      View All Projects
                    </Button>
                  </div>
                </div>
              )}

              {/* Failed state */}
              {renderStatus === "failed" && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center space-y-4">
                  <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
                  <p className="text-sm text-muted-foreground">Something went wrong during rendering. Please contact support with your job ID: {jobId}</p>
                  <Button
                    variant="outline"
                    onClick={() => setStep("storyboard")}
                    className="gap-2 border-white/20 text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Storyboard
                  </Button>
                </div>
              )}

              {/* Create another */}
              <div className="text-center">
                <button
                  onClick={handleReset}
                  className="text-sm text-muted-foreground hover:text-white transition underline underline-offset-4"
                >
                  Create another kids animation 🌈
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
