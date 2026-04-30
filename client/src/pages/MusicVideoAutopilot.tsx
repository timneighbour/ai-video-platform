import React, { useState, useRef, useCallback, useEffect } from "react";
import { LandscapeHint } from "@/components/LandscapeHint";
import { RENDER_QUALITY_TIERS } from "@/lib/pricing";
import { mp } from "@/lib/mixpanel";
import { analytics } from "@/lib/analytics";
import { useLocalStorage, useFormPersistence } from "@/hooks/useLocalStorage";
import { useProjectAutoSave } from "@/hooks/useProjectResume";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { calculateVideoCreditCost } from "../../../shared/const";
import { useCreditGuard } from "@/hooks/useCreditGuard";
import { LowCreditBanner } from "@/components/LowCreditBanner";
import InsufficientCreditsModal from "@/components/InsufficientCreditsModal";
import CinematicUpsellModal, { CinematicScene } from "@/components/CinematicUpsellModal";
import PostRenderCinematicPackModal from "@/components/PostRenderCinematicPackModal";
import { RenderPaywallModal } from "@/components/RenderPaywallModal";
import { WizGenesisModal } from "@/components/WizGenesisModal";
import { PostRenderRetentionScreen } from "@/components/PostRenderRetentionScreen";
import LyricsIntelligencePanel from "@/components/LyricsIntelligencePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import GraphicEqualiser from "@/components/GraphicEqualiser";
import WizAudioPlayer from "@/components/WizAudioPlayer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import AuthGate from "@/components/AuthGate";
import StudioAmbientLight from "@/components/StudioAmbientLight";
import AnimatedEqualiser from "@/components/AnimatedEqualiser";
import { WizBrandBadge, WizBrandPostBadge } from "@/components/WizBrand";
import HabitLoopPanel from "@/components/HabitLoopPanel";
import PostRenderUpgradePanel from "@/components/PostRenderUpgradePanel";
import { CharacterManager, type Character } from "@/components/CharacterManager";
import CharacterConfirmationStep from "@/components/CharacterConfirmationStep";
import CreditBalance from "@/components/CreditBalance";
import EnhancePromptButton from "@/components/EnhancePromptButton";
import { Link } from "wouter";
import { NavLink } from "@/components/NavLink";
import { useSEO } from "@/hooks/useSEO";
import {
  Music,
  Upload,
  Sparkles,
  Film,
  Download,
  Play,
  Pencil,
  Check,
  X,
  Loader2,
  ChevronRight,
  Clock,
  Coins,
  RefreshCw,
  User,
  Mic,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Clapperboard,
  CheckCircle2,
  Layers,
  Wand2,
  Zap,
  ArrowLeft,
  LayoutDashboard,
  Heart,
  Lock,
  Unlock,
  Cpu,
  Music2,
  Info,
  Trash2,
  BookmarkCheck,
  Monitor,
  Captions,
  ShieldCheck,
  Guitar,
  Drum,
  Piano,
  Mic2,
  Plus,
  Image as ImageIcon,
  Users,
} from "@/lib/icons";
import { VoicePromptButton } from "@/components/VoicePromptButton";

type Step = "upload" | "character_confirmation" | "storyboard" | "render";

interface SceneCard {
  id: number;
  sceneIndex: number;
  startTime: number;
  duration: number;
  prompt: string;
  lyrics?: string | null;
  visualStyle: string;
  status: string;
  videoUrl?: string | null;
  previewImageUrl?: string | null;
  previewImageLoading?: boolean;
  lipSync: boolean;
  lipSyncStyle: "natural" | "expressive" | "subtle" | "dramatic" | "anime";
  regenerating?: boolean;
  characterAssignments?: string[] | null; // Names of characters in this scene e.g. ["Tim", "Greg"]
  faceValidationStatus?: "matched" | "warning" | "regenerated" | "skipped" | null;
  faceValidationScores?: string | null; // JSON string of { characterName: score }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Infer a lyric section label from the lyrics text or prompt */
function inferSceneType(lyrics?: string | null, prompt?: string): string {
  const text = ((lyrics ?? "") + " " + (prompt ?? "")).toLowerCase();
  if (text.includes("[intro]") || text.includes("intro")) return "Intro";
  if (text.includes("[outro]") || text.includes("outro") || text.includes("fade out")) return "Outro";
  if (text.includes("[bridge]") || text.includes("bridge")) return "Bridge";
  if (text.includes("[chorus]") || text.includes("chorus") || text.includes("hook")) return "Chorus";
  if (text.includes("[pre-chorus]") || text.includes("pre-chorus") || text.includes("pre chorus")) return "Pre-Chorus";
  if (text.includes("[drop]") || text.includes("drop")) return "Drop";
  if (text.includes("[verse]") || text.includes("verse")) return "Verse";
  if (text.includes("[instrumental]") || text.includes("instrumental") || text.includes("solo")) return "Instrumental";
  return "";
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/** Small connector component that fetches the build job for a given source job and renders the upgrade panel. */
function PostRenderUpgradeConnector({ jobId }: { jobId: number }) {
  const renderJobQuery = trpc.render.getRenderJobForSource.useQuery(
    { sourceJobId: jobId, sourceJobType: "music_video" },
    { staleTime: 30000 }
  );
  if (!renderJobQuery.data) return null;
  const rj = renderJobQuery.data;
  const qualityOrder = ["standard", "hd", "4k"];
  const audioOrder = ["standard", "enhanced", "cinematic"];
  const canUpgradeQuality = qualityOrder.indexOf(rj.quality) < qualityOrder.length - 1;
  const canUpgradeAudio = audioOrder.indexOf(rj.audioTier) < audioOrder.length - 1;
  if (!canUpgradeQuality && !canUpgradeAudio) return null;
  return (
    <PostRenderUpgradePanel
      renderJobId={rj.id}
      currentQuality={rj.quality as "standard" | "hd" | "4k"}
      currentAudioTier={rj.audioTier as "standard" | "enhanced" | "cinematic"}
    />
  );
}

export default function MusicVideoAutopilot() {

  useSEO({ title: "WizVideo™ — AI Music Video Director", path: "/music-video/create", description: "Upload your song and create a full AI music video. Automatic scene generation, character consistency, beat-synced visuals, and cinematic effects." });
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [ambience, setAmbience] = useState(65);
  const [step, setStep] = useLocalStorage<Step>("musicVideo_step", "upload");
  const [jobId, setJobId] = useLocalStorage<number | null>("musicVideo_jobId", null);

  // Handle URL params: ?job_id=X&render_started=true (redirected from RenderSuccess after Stripe payment)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlJobId = params.get("job_id");
    const renderStarted = params.get("render_started") === "true";
    if (urlJobId) {
      const parsedJobId = parseInt(urlJobId, 10);
      if (!isNaN(parsedJobId)) {
        setJobId(parsedJobId);
        if (renderStarted) {
          setStep("render");
          toast.success("Payment confirmed!", { description: "Your render has started. Watch the progress below." });
        }
        // Clean URL without page reload
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 1: Upload form state - PERSISTED TO LOCALSTORAGE
  const [title, setTitle] = useLocalStorage("musicVideo_title", "");
  const [audioDuration, setAudioDuration] = useLocalStorage("musicVideo_duration", 0);
  const [themePrompt, setThemePrompt] = useLocalStorage("musicVideo_theme", "");
  const [genre, setGenre] = useLocalStorage("musicVideo_genre", "");
  const [mood, setMood] = useLocalStorage("musicVideo_mood", "");
  const [selectedStyle, setSelectedStyle] = useLocalStorage("musicVideo_style", "cinematic");
  const [sceneSetting, setSceneSetting] = useLocalStorage("musicVideo_sceneSetting", "");
  const [savedCharacterIds, setSavedCharacterIds] = useState<Record<number, number>>({});
  const [transcriptionText, setTranscriptionText] = useLocalStorage<string | null>("musicVideo_lyrics", null);
  const [audioFile, setAudioFile] = useState<File | null>(null); // Files can't be persisted
  const [uploadProgress, setUploadProgress] = useState<number>(0); // 0-100 for upload progress bar
  const [isUploading, setIsUploading] = useState(false);

  // Multi-character state (replaces single character + lip sync) - PERSISTED
  const [characters, setCharacters] = useLocalStorage<Character[]>("musicVideo_characters", []);

  // Suno AI song generation state
  const [audioSourceTab, setAudioSourceTab] = useLocalStorage<"upload" | "generate">("musicVideo_audioTab", "upload");
  const [sunoPrompt, setSunoPrompt] = useLocalStorage("musicVideo_sunoPrompt", "");
  const [sunoStyle, setSunoStyle] = useLocalStorage("musicVideo_sunoStyle", "");
  const [sunoTaskId, setSunoTaskId] = useLocalStorage<number | null>("musicVideo_sunoTaskId", null);
  const [sunoPolling, setSunoPolling] = useState(false);
  const [sunoGenerating, setSunoGenerating] = useState(false);
  const [sunoTracks, setSunoTracks] = useLocalStorage<Array<{ audioUrl: string; title: string; imageUrl?: string; duration?: number }>>("musicVideo_sunoTracks", []);
  const [selectedSunoTrack, setSelectedSunoTrack] = useLocalStorage<number | null>("musicVideo_sunoTrackIdx", null);
  const [sunoGeneratedAudioUrl, setSunoGeneratedAudioUrl] = useLocalStorage<string | null>("musicVideo_sunoAudioUrl", null);

  // Transcription / lyrics state — starts immediately on audio file select
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>("idle"); // idle | transcribing | done | failed | quota
  const [quotaError, setQuotaError] = useState<string | null>(null);
  // transcriptionText is now persisted above
  const [lyricsExpanded, setLyricsExpanded] = useState(false);
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);
  // Keep segments for later use by storyboard
  const [transcriptionSegments, setTranscriptionSegments] = useState<Array<{ start: number; end: number; text: string }>>([]);
  const transcriptionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const VIDEO_STYLES = [
    {
      id: "cinematic",
      label: "Cinematic",
      desc: "Hollywood-quality realism",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-cinematic-2-h73cYMBR7EECiKvo2X9uWr.webp",
    },
    {
      id: "anime",
      label: "Anime",
      desc: "Japanese animation style",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-anime-2-7pwqdmNNtVefi3S7eVvfmK.webp",
    },
    {
      id: "pixar3d",
      label: "Stylised 3D",
      desc: "Vibrant 3D animation",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-pixar-2-kCF7GThiy6baRGQLei9RKw.webp",
    },
    {
      id: "documentary",
      label: "Documentary",
      desc: "Authentic & raw footage",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-documentary-2-JZWthvzPWVptr78ua34rZz.webp",
    },
    {
      id: "abstract",
      label: "Abstract",
      desc: "Artistic visual journey",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-abstract-1-ZjbMsSCt6wFuq7NBMAyxHR.webp",
    },
    {
      id: "vintage",
      label: "Vintage",
      desc: "Retro film aesthetic",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-vintage-1-NfTaSxo6s5jch2UiSEYkKJ.webp",
    },
    {
      id: "neon_noir",
      label: "Neon Noir",
      desc: "Dark cyberpunk neon glow",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-neon-noir-2-YErB4W3WPjcqzZRDEQe8wU.webp",
    },
    {
      id: "disney",
      label: "Magical Animated",
      desc: "Enchanting hand-drawn animation",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-disney-2-Mi3B2Fz39WFbbr2M8pYwnq.webp",
    },
    {
      id: "epic_fantasy",
      label: "Epic Fantasy",
      desc: "Dramatic magical landscapes",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-epic-fantasy-1-4xZQHj6htBWh5fPP25HQQf.webp",
    },
    {
      id: "realistic",
      label: "Realistic",
      desc: "True-to-life photorealism",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-realistic-1-3PQ9beTsYUCXpz7YnqEHJd.webp",
    },
    {
      id: "horror",
      label: "Horror",
      desc: "Dark, eerie & atmospheric",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-horror-2-6fSFhDegG4kyp5oYPwdAHa.webp",
    },
    {
      id: "storybook",
      label: "Storybook",
      desc: "Illustrated fairy-tale art",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-storybook-1-7ZWAAUFnvadJrrRgUYv4PR.webp",
    },
    {
      id: "cartoon",
      label: "Cartoon",
      desc: "Bold, colourful 2D animation",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-cartoon-1-JjFqe6Kwcbt856gJNKbqce.webp",
    },
  ];
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Storyboard state
  const [scenes, setScenes] = useState<SceneCard[]>([]);
  const [editingSceneId, setEditingSceneId] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  // Track whether storyboard generation is actively in progress
  // This is separate from mutation.isPending to avoid the overlay persisting after scenes arrive
  const [storyboardGenerating, setStoryboardGenerating] = useState(false);
  // Animated step index for storyboard generation overlay (0-4)
  const [storyboardStep, setStoryboardStep] = useState(0);
  const storyboardStepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Export format
  const [exportFormat, setExportFormat] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [includeCaptions, setIncludeCaptions] = useLocalStorage<boolean>("musicVideo_captions", false);

  // Step 3: Render state
  const [renderStatus, setRenderStatus] = useState<string>("rendering");
  const [completedScenes, setCompletedScenes] = useState(0);
  const [totalScenes, setTotalScenes] = useState(0);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [sceneStatuses, setSceneStatuses] = useState<Record<number, string>>({});
  const [failedScenes, setFailedScenes] = useState(0);
  // Per-scene statuses from pollProgress for the real-time progress grid
  const [perSceneStatuses, setPerSceneStatuses] = useState<Array<{ id: number; index: number; status: string; errorMessage?: string | null; prompt?: string; lyrics?: string | null }>>([]); 
  // Track which scenes are currently being retried
  const [retryingScenes, setRetryingScenes] = useState<Set<number>>(new Set());
  const [renderStartTime, setRenderStartTime] = useState<number | null>(null);
  const [liveElapsed, setLiveElapsed] = useState(0); // seconds, ticks every 1s during render
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref guard to prevent double-click / React re-render duplicate render submissions
  const isRenderingRef = useRef(false);
  // Live elapsed ticker — increments every second while rendering
  useEffect(() => {
    if (step === "render" && (renderStatus === "rendering" || renderStatus === "assembling" || renderStatus === "wizsound")) {
      elapsedTickerRef.current = setInterval(() => {
        setLiveElapsed(renderStartTime ? Math.floor((Date.now() - renderStartTime) / 1000) : 0);
      }, 1000);
    } else {
      if (elapsedTickerRef.current) clearInterval(elapsedTickerRef.current);
    }
    return () => { if (elapsedTickerRef.current) clearInterval(elapsedTickerRef.current); };
  }, [step, renderStatus, renderStartTime]);

  // ── Auto-save project progress every 5 seconds ──────────────────────────
  useProjectAutoSave({
    title,
    themePrompt,
    genre,
    mood,
    selectedStyle,
    audioDuration: audioDuration || undefined,
    jobId: jobId || undefined,
    step,
  });

  // Plan limits query — used to show length limit warning
  const { data: planLimits } = trpc.billing.getPlanLimits.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const maxVideoSeconds = planLimits?.maxVideoSeconds ?? 60;
  const isAdminUser = planLimits?.isAdmin === true;
  const audioExceedsLimit = !isAdminUser && audioDuration > 0 && audioDuration > maxVideoSeconds;

  const transcribeAudioDirect = trpc.musicVideo.transcribeAudioDirect.useMutation();
  const createJob = trpc.musicVideo.createJob.useMutation();
  const generateStoryboardMutation = trpc.musicVideo.generateStoryboard.useMutation();
  const updateScene = trpc.musicVideo.updateScene.useMutation();
  const startRender = trpc.musicVideo.startRender.useMutation();
  const [showInsufficientCredits, setShowInsufficientCredits] = useState(false);
  const { checkLowCredits, checkCanAfford, balance: creditBalance } = useCreditGuard();
  const [showCinematicUpsell, setShowCinematicUpsell] = useState(false);
  const [showCinematicPackModal, setShowCinematicPackModal] = useState(false);
  const [showRenderPaywall, setShowRenderPaywall] = useState(false);
  const [showLyricsIntelligence, setShowLyricsIntelligence] = useState(false);
  const [isUpgradingCinematic, setIsUpgradingCinematic] = useState(false);
  const cinematicUpgradeMutation = trpc.musicVideo.cinematicUpgrade.useMutation();
  const pollProgress = trpc.musicVideo.pollProgress.useMutation();
  const generateScenePreviewMutation = trpc.musicVideo.generateScenePreview.useMutation();
  const saveCharactersMutation = trpc.characters.saveCharacters.useMutation();
  const lockCharacterMutation = trpc.characters.lockCharacter.useMutation();
  const analysePhotoMutation = trpc.characters.analysePhoto.useMutation();
  const generateMasterPortraitMutation = trpc.musicVideo.generateMasterPortrait.useMutation();
  const updateSceneLipSyncMutation = trpc.musicVideo.updateSceneLipSync.useMutation();
  const updateAllScenesLipSyncMutation = trpc.musicVideo.updateAllScenesLipSync.useMutation();
  const updateSceneLipSyncStyleMutation = trpc.musicVideo.updateSceneLipSyncStyle.useMutation();
  const regenerateSceneMutation = trpc.musicVideo.regenerateScene.useMutation();
  const retryFailedSceneMutation = trpc.musicVideo.retryFailedScene.useMutation();
  const retryAllFailedScenesMutation = trpc.musicVideo.retryAllFailedScenes.useMutation();
  const updateScenePromptMutation = trpc.musicVideo.updateScenePrompt.useMutation();
  const deleteSceneMutation = trpc.musicVideo.deleteScene.useMutation();
  const addSceneMutation = trpc.musicVideo.addScene.useMutation();
  const reorderSceneMutation = trpc.musicVideo.reorderScene.useMutation();
  const uploadContextAssetMutation = trpc.musicVideo.uploadContextAsset.useMutation();
  const removeContextAssetMutation = trpc.musicVideo.removeContextAsset.useMutation();

  // Visual reference assets state (populated from job data)
  const [contextAssets, setContextAssets] = React.useState<Array<{ url: string; mimeType: string; type: string }>>([])
  const [artistType, setArtistType] = useLocalStorage<"solo_artist" | "band" | "animated_characters" | "solo_animated">("musicVideo_artistType", "solo_artist");
  const updateArtistTypeMutation = trpc.musicVideo.updateArtistType.useMutation();
  const [contextAssetUploading, setContextAssetUploading] = React.useState(false);

  const sunoGenerateMutation = trpc.suno.generate.useMutation();
  const sunoStatusQuery = trpc.suno.getStatus.useQuery(
    { id: sunoTaskId! },
    {
      enabled: !!sunoTaskId && sunoPolling,
      refetchInterval: sunoPolling ? 5000 : false,
      staleTime: 0,
    }
  );

  // React to Suno status query results
  useEffect(() => {
    if (!sunoPolling || !sunoStatusQuery.data) return;
    const result = sunoStatusQuery.data;
    if (result.status === "complete" && result.tracks && result.tracks.length > 0) {
      setSunoTracks(result.tracks as any);
      setSelectedSunoTrack(0);
      setSunoGeneratedAudioUrl((result.tracks[0] as any).audioUrl);
      setSunoPolling(false);
      setSunoGenerating(false);
      toast.success("Song generated!", { description: "Select a track to use it in your video." });
    } else if (result.status === "failed") {
      setSunoPolling(false);
      setSunoGenerating(false);
      toast.error("Song generation failed", { description: result.errorMessage || "Please try again." });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sunoStatusQuery.data, sunoPolling]);

  const handleSunoGenerate = async () => {
    if (!sunoPrompt.trim()) { toast.error("Please describe your song first."); return; }
    setSunoGenerating(true);
    setSunoTracks([]);
    setSelectedSunoTrack(null);
    setSunoGeneratedAudioUrl(null);
    try {
      const result = await sunoGenerateMutation.mutateAsync({
        prompt: sunoPrompt,
        style: sunoStyle || undefined,
        title: title || undefined,
      });
      setSunoTaskId(result.id);
      setSunoPolling(true);
      toast.info("Generating your song...", { description: "This usually takes 30–60 seconds." });
    } catch (err: any) {
      setSunoGenerating(false);
      toast.error("Failed to start song generation", { description: err.message });
    }
  };

  // Upsell checkout state
  const [upsellAddons, setUpsellAddons] = useState({ cinematicScenes: false, upgrade4K: false, removeWatermark: false });
  const [isUpsellCheckingOut, setIsUpsellCheckingOut] = useState(false);
  const upsellCheckoutMutation = trpc.billing.createUpsellCheckout.useMutation();
  const upsellTotal = (upsellAddons.cinematicScenes ? 5 : 0) + (upsellAddons.upgrade4K ? 3 : 0) + (upsellAddons.removeWatermark ? 2 : 0);
  const handleUpsellCheckout = async () => {
    if (!jobId || upsellTotal === 0) return;
    setIsUpsellCheckingOut(true);
    try {
      const result = await upsellCheckoutMutation.mutateAsync({
        jobId,
        addons: upsellAddons,
        origin: window.location.origin,
      });
      if (result.checkoutUrl) {
        toast.info("Redirecting to checkout...", { description: "A new tab will open for payment." });
        window.open(result.checkoutUrl, "_blank");
      }
    } catch (err: any) {
      toast.error("Checkout failed", { description: err.message || "Please try again." });
    } finally {
      setIsUpsellCheckingOut(false);
    }
  };

  // Style Lock
  const lockStyleMutation = trpc.musicVideo.lockStyle.useMutation();
  const unlockStyleMutation = trpc.musicVideo.unlockStyle.useMutation();
  const lockedStyleQuery = trpc.musicVideo.getLockedStyle.useQuery(
    { jobId: jobId! },
    { enabled: !!jobId && step === "storyboard", staleTime: 10000 }
  );
  const lockedStyle = lockedStyleQuery.data;
  const [lockingSceneId, setLockingSceneId] = useState<number | null>(null);

  const handleLockStyle = async (sceneId: number, imageUrl: string) => {
    if (!jobId) return;
    setLockingSceneId(sceneId);
    try {
      await lockStyleMutation.mutateAsync({ jobId, sceneId, imageUrl });
      await lockedStyleQuery.refetch();
      toast.success("Style locked! Future scenes will match this look.");
    } catch {
      toast.error("Failed to lock style. Please try again.");
    } finally {
      setLockingSceneId(null);
    }
  };

  const handleUnlockStyle = async () => {
    if (!jobId) return;
    try {
      await unlockStyleMutation.mutateAsync({ jobId });
      await lockedStyleQuery.refetch();
      toast.success("Style lock removed.");
    } catch {
      toast.error("Failed to remove style lock.");
    }
  };
  // Character roster for storyboard @-tag display and per-scene assignment
  const jobCharactersQuery = trpc.musicVideo.getCharactersForJob.useQuery(
    { jobId: jobId! },
    { enabled: !!jobId && (step === "storyboard" || step === "character_confirmation"), staleTime: 30000 }
  );
  const jobCharacters = jobCharactersQuery.data?.characters ?? [];
  const updateCharacterInstrumentMutation = trpc.musicVideo.updateCharacterInstrument.useMutation({
    onSuccess: () => { jobCharactersQuery.refetch(); },
    onError: (err) => { toast.error("Failed to update role", { description: err.message }); },
  });

  // Per-scene character selector dropdown state
  const [characterSelectorSceneId, setCharacterSelectorSceneId] = useState<number | null>(null);
  // Instrument role inline editing state
  const [editingRoleCharId, setEditingRoleCharId] = useState<number | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState("");

  // Edit-before-retry state (separate from storyboard edit state above)
  const [editingFailedSceneId, setEditingFailedSceneId] = useState<number | null>(null);
  const [editFailedPrompt, setEditFailedPrompt] = useState("");
  const [editFailedLyrics, setEditFailedLyrics] = useState("");

  // Global lip sync override — null means "per-scene", true/false means all scenes
  const [globalLipSync, setGlobalLipSync] = useState<boolean | null>(null);

  const handleToggleSceneLipSync = async (sceneId: number, newValue: boolean) => {
    if (!jobId) return;
    // Optimistic update
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, lipSync: newValue } : s));
    try {
      await updateSceneLipSyncMutation.mutateAsync({ sceneId, jobId, lipSync: newValue });
    } catch (err: any) {
      // Rollback on failure
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, lipSync: !newValue } : s));
      toast.error("Failed to update lip sync", { description: err.message });
    }
  };

  const handleChangeLipSyncStyle = async (sceneId: number, style: "natural" | "expressive" | "subtle" | "dramatic" | "anime") => {
    if (!jobId) return;
    const prev = scenes.find(s => s.id === sceneId)?.lipSyncStyle ?? "natural";
    // Optimistic update
    setScenes(p => p.map(s => s.id === sceneId ? { ...s, lipSyncStyle: style } : s));
    try {
      await updateSceneLipSyncStyleMutation.mutateAsync({ sceneId, jobId, lipSyncStyle: style });
    } catch (err: any) {
      // Rollback
      setScenes(p => p.map(s => s.id === sceneId ? { ...s, lipSyncStyle: prev } : s));
      toast.error("Failed to update lip sync style", { description: err.message });
    }
  };

  const handleGlobalLipSyncToggle = async (value: boolean) => {
    if (!jobId) return;
    setGlobalLipSync(value);
    // Optimistic update all scenes
    setScenes(prev => prev.map(s => ({ ...s, lipSync: value })));
    try {
      await updateAllScenesLipSyncMutation.mutateAsync({ jobId, lipSync: value });
      toast.success(value ? "Lip sync enabled for all scenes" : "Lip sync disabled for all scenes");
    } catch (err: any) {
      toast.error("Failed to update lip sync", { description: err.message });
    }
  };

  const handleRegenerateScene = async (sceneId: number) => {
    if (!jobId) return;
    // Mark scene as regenerating
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, regenerating: true, status: "generating", previewImageUrl: undefined } : s));
    try {
      // In storyboard preview mode, always call generateScenePreview (not regenerateScene which
      // starts a full video render). We clear the cached previewImageUrl first so the server
      // doesn't return the old image immediately.
      const result = await generateScenePreviewMutation.mutateAsync({ sceneId, jobId, forceRegenerate: true });
      setScenes(prev => prev.map(s => s.id === sceneId
        ? { ...s, regenerating: false, status: "preview_ready", previewImageUrl: result.imageUrl }
        : s
      ));
      toast.success("Scene preview regenerated");
    } catch (err: any) {
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, regenerating: false, status: "failed" } : s));
      // Surface the "Please assign characters" error clearly
      const msg = err?.data?.message ?? err?.message ?? "Failed to regenerate scene";
      toast.error("Cannot regenerate scene", { description: msg });
    }
  };

  // Delete a scene from the storyboard
  const handleDeleteScene = async (sceneId: number) => {
    if (!jobId) return;
    if (!confirm("Delete this scene? This cannot be undone.")) return;
    try {
      await deleteSceneMutation.mutateAsync({ sceneId, jobId });
      setScenes(prev => {
        const filtered = prev.filter(s => s.id !== sceneId);
        // Re-index locally
        return filtered.map((s, i) => ({ ...s, sceneIndex: i }));
      });
      toast.success("Scene deleted");
    } catch (err: any) {
      toast.error("Could not delete scene", { description: err?.message });
    }
  };

  // Add a new blank scene after a given index
  const handleAddScene = async (afterSceneIndex: number) => {
    if (!jobId) return;
    try {
      const result = await addSceneMutation.mutateAsync({ jobId, afterSceneIndex });
      // Insert a blank scene into local state at the correct position
      setScenes(prev => {
        const sorted = [...prev].sort((a, b) => a.sceneIndex - b.sceneIndex);
        const newScene: SceneCard = {
          id: result.sceneId,
          sceneIndex: result.sceneIndex,
          startTime: 0,
          duration: 5,
          prompt: "A new scene — describe what happens here",
          lyrics: null,
          visualStyle: "cinematic",
          status: "pending",
          videoUrl: null,
          previewImageUrl: null,
          previewImageLoading: false,
          lipSync: false,
          lipSyncStyle: "natural",
          characterAssignments: null,
        };
        // Shift all scenes after insertAt
        const shifted = sorted.map(s =>
          s.sceneIndex >= result.sceneIndex ? { ...s, sceneIndex: s.sceneIndex + 1 } : s
        );
        return [...shifted, newScene].sort((a, b) => a.sceneIndex - b.sceneIndex);
      });
      toast.success("Scene added", { description: "Edit the prompt and regenerate to customise it." });
    } catch (err: any) {
      toast.error("Could not add scene", { description: err?.message });
    }
  };

  // Upload a visual reference asset for storyboard context
  const handleUploadContextAsset = async (file: File) => {
    if (!jobId) { toast.error("Save your song first before adding visual references."); return; }
    if (contextAssets.length >= 3) { toast.error("Maximum 3 visual references allowed."); return; }
    setContextAssetUploading(true);
    try {
      const assetType = file.type.startsWith("video/") ? "video" : "image";
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadContextAssetMutation.mutateAsync({
        jobId,
        assetBase64: base64,
        mimeType: file.type,
        assetType,
      });
      setContextAssets(prev => [...prev, { url: result.url, mimeType: file.type, type: assetType }]);
      toast.success("Visual reference added", { description: `${result.total}/3 references uploaded` });
    } catch (err: any) {
      toast.error("Upload failed", { description: err?.message });
    } finally {
      setContextAssetUploading(false);
    }
  };

  const handleRemoveContextAsset = async (url: string) => {
    if (!jobId) return;
    try {
      await removeContextAssetMutation.mutateAsync({ jobId, assetUrl: url });
      setContextAssets(prev => prev.filter(a => a.url !== url));
      toast.success("Reference removed");
    } catch (err: any) {
      toast.error("Could not remove reference", { description: err?.message });
    }
  };

  // Move a scene up or down
  const handleReorderScene = async (sceneId: number, direction: "up" | "down") => {
    if (!jobId) return;
    try {
      await reorderSceneMutation.mutateAsync({ sceneId, jobId, direction });
      setScenes(prev => {
        const arr = [...prev].sort((a, b) => a.sceneIndex - b.sceneIndex);
        const idx = arr.findIndex(s => s.id === sceneId);
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= arr.length) return prev;
        const newArr = [...arr];
        [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
        return newArr.map((s, i) => ({ ...s, sceneIndex: i }));
      });
    } catch (err: any) {
      toast.error("Could not reorder scene", { description: err?.message });
    }
  };

  // No polling needed — transcription is a direct mutation that resolves when done
  // Cleanup poll interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (transcriptionPollRef.current) clearInterval(transcriptionPollRef.current);
    };
  }, []);

  // Auto-resume polling when user returns to the render step (e.g. after page refresh or redirect from RenderSuccess)
  useEffect(() => {
    if (step === "render" && jobId && !isRenderingRef.current && !finalVideoUrl) {
      // Small delay to let state settle
      const timer = setTimeout(() => {
        handleStartRenderInternal();
      }, 1500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, jobId]);

  const handleFileDrop = useCallback((file: File) => {
    const validTypes = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/m4a", "audio/x-m4a"];
    const isValid = validTypes.some(t => file.type === t || file.name.endsWith(".mp3") || file.name.endsWith(".wav") || file.name.endsWith(".m4a"));
    if (!isValid) {
      toast.error("Invalid file type", { description: "Please upload an MP3, WAV, or M4A file." });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File too large", { description: "Maximum file size is 100MB." });
      return;
    }
    setAudioFile(file);
    setIsUploading(true);
    setUploadProgress(0);
    
    // Reset transcription state for the new file
    setTranscriptionText(null);
    setTranscriptionSegments([]);
    setTranscriptionStatus("idle");
    setLyricsExpanded(false);

    // Get duration
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      const dur = Math.round(audio.duration);
      if (dur > 360) {
        toast.error("Song too long", { description: "Maximum song length is 6 minutes." });
        setAudioFile(null);
        setTranscriptionStatus("idle");
        setIsUploading(false);
        return;
      }
      setAudioDuration(dur);
      setUploadProgress(30); // Show progress

      // Immediately start transcription in the background
      setTranscriptionStatus("transcribing");
      setLyricsExpanded(true);

      // Read file as base64 and call the direct transcription mutation
      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 30) + 30; // 30-60%
          setUploadProgress(percentComplete);
        }
      };
      reader.onload = async () => {
        try {
          setUploadProgress(60); // Reading complete
          const base64 = (reader.result as string).split(",")[1];
          const mimeType = file.type.includes("wav") ? "audio/wav" :
                           file.type.includes("mp4") || file.name.endsWith(".m4a") ? "audio/mp4" : "audio/mpeg";
          const result = await transcribeAudioDirect.mutateAsync({
            audioBase64: base64,
            audioMimeType: mimeType as any,
          });
          setUploadProgress(100); // Complete
          setTimeout(() => setIsUploading(false), 500);
          setTranscriptionText(result.text);
          setTranscriptionSegments(result.segments);
          setTranscriptionStatus("done");
          // Smart vocal detection: auto-set lip sync default based on transcription
          const transcribedText = (result.text ?? "").toLowerCase().trim();
          const isInstrumental =
            !transcribedText ||
            transcribedText.length < 10 ||
            /^\[?instrumental\]?$/.test(transcribedText) ||
            /^\[music\]$/.test(transcribedText) ||
            (transcribedText.match(/\[/g) ?? []).length > 3; // mostly tags = no real lyrics
          if (globalLipSync === null) {
            // Only auto-set if user hasn't manually changed it
            setGlobalLipSync(!isInstrumental);
            if (isInstrumental) {
              toast.info("Instrumental detected", { description: "Lip sync has been turned off automatically. Enable it manually if needed." });
            } else {
              toast.success("Vocals detected", { description: "Lip sync is enabled automatically for singing characters." });
            }
          }
        } catch (err: any) {
          console.error("Transcription error:", err);
          const isQuota = err?.data?.code === "TOO_MANY_REQUESTS" || /usage exhausted|quota|rate limit|TOO_MANY/i.test(err?.message ?? "");
          if (isQuota) {
            setTranscriptionStatus("quota");
          } else {
            setTranscriptionStatus("failed");
          }
        }
      };
      reader.readAsDataURL(file);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // handleCharacterFileDrop removed — replaced by CharacterManager component

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileDrop(file);
  };

  const sceneCount = audioDuration > 0 ? Math.max(3, Math.min(45, Math.ceil(audioDuration / 8))) : 0;
  const hasLipSync = characters.some(c => c.enableLipSync);
  const creditBreakdown = calculateVideoCreditCost({
    audioDurationSeconds: audioDuration,
    cinematicSceneCount: 0, // standard render — cinematic upgrades are post-render
    enableLipSync: hasLipSync,
  });
  const creditCost = audioDuration > 0 ? creditBreakdown.total : 0;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unused = user;

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data:...;base64, prefix
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleUploadAndGenerate = async () => {
    const isSunoPath = audioSourceTab === "generate";
    if (!title || !themePrompt) {
      toast.error("Missing fields", { description: "Please fill in all required fields." });
      return;
    }
    if (!isSunoPath && !audioFile) {
      toast.error("Missing audio", { description: "Please upload your song." });
      return;
    }
    if (isSunoPath && !sunoGeneratedAudioUrl) {
      toast.error("No song selected", { description: "Please generate a song with AI first, then select a track." });
      return;
    }

    const UPLOAD_TOAST_ID = "uploading-song";
    try {
      // Determine base64 or URL path
      let base64: string | undefined;
      let mimeType: "audio/mpeg" | "audio/wav" | "audio/mp4" | "audio/ogg" | "audio/m4a" | undefined;
      let directAudioUrl: string | undefined;

      if (isSunoPath) {
        // Suno path: pass the URL directly — backend will fetch + re-upload to S3
        directAudioUrl = sunoGeneratedAudioUrl!;
      } else {
        // Upload path: convert file to base64
        const arrayBuffer = await audioFile!.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < uint8Array.length; i++) binary += String.fromCharCode(uint8Array[i]);
        base64 = btoa(binary);
        mimeType = audioFile!.type.includes("wav") ? "audio/wav" :
                         audioFile!.type.includes("mp4") || audioFile!.name.endsWith(".m4a") ? "audio/mp4" : "audio/mpeg";
      }

      // Build character data for the job (primary photo per character)
      const firstCharWithPhoto = characters.find(c => c.photos.length > 0);
      const characterImageBase64 = firstCharWithPhoto?.photos.find(p => p.isPrimary)?.base64 ?? firstCharWithPhoto?.photos[0]?.base64;
      const characterImageMimeType = firstCharWithPhoto?.photos.find(p => p.isPrimary)?.mimeType ?? firstCharWithPhoto?.photos[0]?.mimeType;
      const enableLipSync = characters.some(c => c.enableLipSync);

      toast.loading("Uploading song...", { id: UPLOAD_TOAST_ID, description: "This may take a moment." });

      // Append the selected visual style to the theme prompt so the LLM uses it
      const styleLabel = VIDEO_STYLES.find(s => s.id === selectedStyle)?.label ?? selectedStyle;
      const enrichedThemePrompt = `${themePrompt}\n\nVisual Style: ${styleLabel}`;

      const result = await createJob.mutateAsync({
        title,
        ...(directAudioUrl ? { audioUrl: directAudioUrl } : { audioBase64: base64!, audioMimeType: mimeType! }),
        audioDuration,
        themePrompt: enrichedThemePrompt,
        genre: genre || undefined,
        mood: mood || undefined,
        characterImageBase64,
        characterImageMimeType: characterImageMimeType as any,
        enableLipSync,
        sceneSetting: sceneSetting.trim() || undefined,
      });

      setJobId(result.jobId);
      setTotalScenes(result.sceneCount);
      mp.projectCreated("WizVideo");

      // Save characters (with photos) to the DB so the storyboard LLM can use them
      if (characters.length > 0) {
        try {
          const saveResult = await saveCharactersMutation.mutateAsync({
            jobId: result.jobId,
            characters: characters.map((c) => ({
              slotIndex: c.slotIndex,
              name: c.name,
              role: c.role,
              enableLipSync: c.enableLipSync,
              mode: c.mode,
              aiGeneratedImageUrl: c.aiGeneratedImageUrl || undefined,
              aiGeneratedBrief: c.aiGeneratedBrief || undefined,
              lockedDescription: c.lockedDescription || undefined,
              isLocked: c.isLocked,
              visualDetails: c.visualDetails || undefined,
              lockedOutfit: c.lockedOutfit ? { jacket: c.lockedOutfit } : undefined,
              lockedProps: c.lockedProps ? { instrument: c.lockedProps } : undefined,
              lockedPosition: c.lockedPosition || undefined,
              lockedRules: Object.keys(c.lockedRules || {}).length > 0 ? { role: c.lockedRules?.role || c.role || '', mustHave: c.lockedRules?.mustHave, allowedProps: c.lockedRules?.allowedProps, forbidden: c.lockedRules?.forbidden } : undefined,
              faceVideoUrl: c.faceVideoUrl || undefined,
              bodyBuild: c.bodyBuild ?? "average",
              photos: c.photos.map((p) => ({
                photoBase64: p.base64,
                photoMimeType: p.mimeType,
                isPrimary: p.isPrimary,
              })),
            })),
          });
          // Track saved character IDs for Re-analyse button
          const newSavedIds: Record<number, number> = {};
          for (const saved of saveResult.characters) {
            newSavedIds[saved.slotIndex] = saved.id;
          }
          setSavedCharacterIds(newSavedIds);
          // Auto-analyse and auto-lock every character that has photos
          // The vision LLM extracts a precise physical description from the uploaded photo
          // so users never need to type appearance descriptions manually
          const savedChars = saveResult.characters;
          for (const char of characters) {
            const saved = savedChars.find((s: { slotIndex: number; id: number }) => s.slotIndex === char.slotIndex);
            if (!saved) continue;

            // Find the primary photo URL — we need the server-side URL after upload
            // The saveCharacters mutation uploads photos to S3 and returns the character IDs;
            // we need to fetch the character's photos to get the S3 URL for analysis
            if (char.photos.length > 0) {
              try {
                // Use the primary photo URL returned by saveCharacters (already uploaded to S3)
                const primaryPhotoUrl = (saved as { id: number; slotIndex: number; name: string; primaryPhotoUrl?: string | null }).primaryPhotoUrl;

                if (primaryPhotoUrl) {
                  // Step 1: Analyse photo with vision LLM
                  toast.loading(`Analysing ${char.name}'s appearance...`, { id: `analyse-${char.slotIndex}` });
                  const analysis = await analysePhotoMutation.mutateAsync({
                    characterId: saved.id,
                    photoUrl: primaryPhotoUrl,
                  });

                  // Step 2: Lock character with the AI-generated description
                  const description = char.lockedDescription.trim() || analysis.description;
                  await lockCharacterMutation.mutateAsync({
                    characterId: saved.id,
                    lockedDescription: description,
                  });

                  // Step 3: Generate MASTER PORTRAIT (Photo Mode Pipeline V2)
                  // This creates the locked face anchor used in ALL future scenes.
                  // Must run before the user reaches the character confirmation step.
                  try {
                    toast.loading(`Generating master portrait for ${char.name}...`, { id: `analyse-${char.slotIndex}` });
                    await generateMasterPortraitMutation.mutateAsync({
                      characterId: saved.id,
                      jobId: result.jobId,
                    });
                    toast.success(`${char.name} ready`, {
                      id: `analyse-${char.slotIndex}`,
                      description: "Master portrait generated — face locked for all scenes.",
                    });
                  } catch (masterErr) {
                    console.warn(`[MusicVideoAutopilot] Master portrait failed for ${char.name}:`, masterErr);
                    toast.success(`${char.name} locked`, {
                      id: `analyse-${char.slotIndex}`,
                      description: "Appearance analysed and locked from your photo.",
                    });
                  }
                } else if (char.isLocked && char.lockedDescription.trim()) {
                  // Fallback: use manually typed description if no photo URL available
                  await lockCharacterMutation.mutateAsync({
                    characterId: saved.id,
                    lockedDescription: char.lockedDescription.trim(),
                  });
                }
                // (primaryPhotoUrl was null — no S3 URL available yet)
              } catch (lockErr) {
                console.warn(`[MusicVideoAutopilot] Failed to analyse/lock character ${char.name}:`, lockErr);
                toast.dismiss(`analyse-${char.slotIndex}`);
                // Fallback: use manually typed description if analysis fails
                if (char.isLocked && char.lockedDescription.trim()) {
                  try {
                    await lockCharacterMutation.mutateAsync({
                      characterId: saved.id,
                      lockedDescription: char.lockedDescription.trim(),
                    });
                  } catch {}
                }
              }
            } else if (char.isLocked && char.lockedDescription.trim()) {
              // No photos — use manually typed description
              try {
                await lockCharacterMutation.mutateAsync({
                  characterId: saved.id,
                  lockedDescription: char.lockedDescription.trim(),
                });
              } catch (lockErr) {
                console.warn("[MusicVideoAutopilot] Failed to lock character:", lockErr);
              }
            }
          }
        } catch (charErr) {
          console.warn("[MusicVideoAutopilot] Failed to save characters:", charErr);
          // Non-fatal — continue with storyboard generation
        }
      }

      // Transcription was already started when the file was selected; no need to re-trigger;
      // Dismiss the upload toast — song is uploaded
      toast.dismiss(UPLOAD_TOAST_ID);
      // If there are characters with photos or AI-generated content, go to confirmation step first
      const hasCharactersToConfirm = characters.length > 0;
      if (hasCharactersToConfirm) {
        setStep("character_confirmation");
        toast.success("Characters saved!", { description: "Review your character previews before generating the storyboard." });
      } else {
        // No characters — go straight to storyboard generation
        setStoryboardGenerating(true);
        setStoryboardStep(0);
        // Advance steps on a timer: step 0→1 at 5s, 1→2 at 15s, 2→3 at 30s, 3→4 at 55s
        const STEP_DELAYS = [5000, 15000, 30000, 55000];
        let stepIdx = 0;
        const advanceStep = () => {
          stepIdx++;
          setStoryboardStep(stepIdx);
          if (stepIdx < STEP_DELAYS.length) {
            storyboardStepTimerRef.current = setTimeout(advanceStep, STEP_DELAYS[stepIdx]);
          }
        };
        storyboardStepTimerRef.current = setTimeout(advanceStep, STEP_DELAYS[0]);
        const STORYBOARD_TOAST_ID = "storyboard-generating";
        toast.loading("Generating storyboard...", { id: STORYBOARD_TOAST_ID, description: "Our AI director is crafting your scenes." });
        const storyboard = await generateStoryboardMutation.mutateAsync({ jobId: result.jobId });
        setScenes(storyboard.scenes.map((s: any) => ({ ...s, id: s.sceneIndex, status: "pending" })));
        toast.dismiss(STORYBOARD_TOAST_ID);
        if (storyboardStepTimerRef.current) clearTimeout(storyboardStepTimerRef.current);
        setStoryboardStep(5); // all steps done
        setStoryboardGenerating(false);
        setStep("storyboard");
        mp.storyboardGenerated(storyboard.scenes.length);
        toast.success("Storyboard ready!", { description: `${storyboard.scenes.length} scenes created. Review and edit before building.` });
      }
    } catch (err: any) {
      toast.dismiss(UPLOAD_TOAST_ID);
      toast.dismiss("storyboard-generating");
      setStoryboardGenerating(false);
      const isQuota = err?.data?.code === "TOO_MANY_REQUESTS" || /usage exhausted|quota|rate limit|TOO_MANY/i.test(err?.message ?? "");
      if (isQuota) {
        setQuotaError("The AI service is temporarily unavailable due to high demand. Please wait a few minutes and try again. Your progress has been saved.");
      } else {
        toast.error("Error", { description: err.message || "Failed to create job" });
      }
    }
  };
  // Fetch full job data (with real scene IDs) after moving to storyboard step
  // Also enabled on upload step so contextAssetUrls can be loaded when resuming a job
  const jobQuery = trpc.musicVideo.getJob.useQuery(
    { jobId: jobId! },
    { enabled: !!jobId && (step === "storyboard" || step === "upload") }
  );

  // Populate contextAssets and artistType from job data when loading/resuming
  useEffect(() => {
    if (jobQuery.data?.job?.contextAssetUrls) {
      try {
        const parsed = JSON.parse(jobQuery.data.job.contextAssetUrls);
        if (Array.isArray(parsed)) setContextAssets(parsed);
      } catch { /* ignore */ }
    }
    if (jobQuery.data?.job?.artistType) {
      setArtistType(jobQuery.data.job.artistType as "solo_artist" | "band" | "animated_characters" | "solo_animated");
    }
  }, [jobQuery.data?.job?.contextAssetUrls, jobQuery.data?.job?.artistType]);

  useEffect(() => {
    if (jobQuery.data?.scenes) {
      const mappedScenes = jobQuery.data.scenes.map((s: any) => ({
        id: s.id,
        sceneIndex: s.sceneIndex,
        startTime: s.startTime,
        duration: s.duration,
        prompt: s.prompt,
        lyrics: s.lyrics,
        visualStyle: s.visualStyle ?? "",
        status: s.status,
        videoUrl: s.videoUrl,
        previewImageUrl: s.previewImageUrl ?? null,
        previewImageLoading: !s.previewImageUrl,
        lipSync: s.lipSync ?? true,
        lipSyncStyle: (s.lipSyncStyle ?? "natural") as "natural" | "expressive" | "subtle" | "dramatic" | "anime",
        regenerating: false,
        characterAssignments: s.characterAssignments
          ? (() => { try { return JSON.parse(s.characterAssignments); } catch { return null; } })()
          : null,
        faceValidationStatus: s.faceValidationStatus ?? null,
        faceValidationScores: s.faceValidationScores ?? null,
      }));
      setScenes(mappedScenes);
      // V2: Trigger image generation sequentially so each scene can use the previous scene
      // as a chained reference (reinforces character identity across scenes).
      const scenesNeedingPreview = mappedScenes.filter(s => !s.previewImageUrl);
      if (scenesNeedingPreview.length > 0 && jobId) {
        // Run sequentially: scene[0] -> scene[1] -> ... passing each result as previousSceneImageUrl
        (async () => {
          let previousSceneImageUrl: string | undefined = undefined;
          for (const scene of scenesNeedingPreview) {
            try {
              const { imageUrl } = await generateScenePreviewMutation.mutateAsync({
                sceneId: scene.id,
                jobId,
                previousSceneImageUrl, // V2: chained reference
              });
              if (imageUrl) {
                setScenes(prev => prev.map(s =>
                  s.id === scene.id ? { ...s, previewImageUrl: imageUrl, previewImageLoading: false } : s
                ));
                previousSceneImageUrl = imageUrl; // chain to next scene
              } else {
                setScenes(prev => prev.map(s =>
                  s.id === scene.id ? { ...s, previewImageLoading: false } : s
                ));
                // Don't update previousSceneImageUrl if generation failed
              }
            } catch {
              setScenes(prev => prev.map(s =>
                s.id === scene.id ? { ...s, previewImageLoading: false } : s
              ));
            }
          }
        })();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobQuery.data]);

  const handleSaveEdit = async (sceneId: number) => {
    try {
      await updateScene.mutateAsync({ sceneId, prompt: editPrompt });
      // Clear the old preview so a fresh one is generated from the new prompt
      setScenes(prev => prev.map(s =>
        s.id === sceneId
          ? { ...s, prompt: editPrompt, previewImageUrl: null, previewImageLoading: true }
          : s
      ));
      setEditingSceneId(null);
      toast.success("Scene updated", { description: "Regenerating preview image..." });
      // Regenerate the preview image for this scene
      if (jobId) {
        generateScenePreviewMutation.mutateAsync({ sceneId, jobId })
          .then(({ imageUrl }) => {
            setScenes(prev => prev.map(s =>
              s.id === sceneId ? { ...s, previewImageUrl: imageUrl ?? null, previewImageLoading: false } : s
            ));
          })
          .catch(() => {
            setScenes(prev => prev.map(s =>
              s.id === sceneId ? { ...s, previewImageLoading: false } : s
            ));
          });
      }
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
  };

  const handleToggleSceneCharacter = async (sceneId: number, characterName: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const current = scene.characterAssignments ?? [];
    const updated = current.includes(characterName)
      ? current.filter(n => n !== characterName)
      : [...current, characterName];
    // Optimistic update
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, characterAssignments: updated } : s));
    try {
      await updateScene.mutateAsync({ sceneId, prompt: scene.prompt, characterAssignments: updated });
    } catch (err: any) {
      // Rollback
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, characterAssignments: current } : s));
      toast.error("Failed to update character assignment", { description: err?.message });
    }
  };

  const handleRegenerateStoryboard = async () => {
    if (!jobId) return;
    const REGEN_TOAST_ID = "storyboard-regenerating";
    try {
      setStoryboardGenerating(true);
      setStoryboardStep(0);
      const STEP_DELAYS_REGEN = [5000, 15000, 30000, 55000];
      let stepIdxRegen = 0;
      const advanceStepRegen = () => {
        stepIdxRegen++;
        setStoryboardStep(stepIdxRegen);
        if (stepIdxRegen < STEP_DELAYS_REGEN.length) {
          storyboardStepTimerRef.current = setTimeout(advanceStepRegen, STEP_DELAYS_REGEN[stepIdxRegen]);
        }
      };
      storyboardStepTimerRef.current = setTimeout(advanceStepRegen, STEP_DELAYS_REGEN[0]);
      toast.loading("Regenerating storyboard...", { id: REGEN_TOAST_ID, description: "Our AI director is crafting your scenes." });
      const storyboard = await generateStoryboardMutation.mutateAsync({ jobId });
      setScenes(storyboard.scenes.map((s: any) => ({ ...s, id: s.sceneIndex, status: "pending" })));
      toast.dismiss(REGEN_TOAST_ID);
      if (storyboardStepTimerRef.current) clearTimeout(storyboardStepTimerRef.current);
      setStoryboardStep(5);
      setStoryboardGenerating(false);
      mp.storyboardRegenerated(storyboard.scenes.length);
      toast.success("Storyboard regenerated!", { description: `${storyboard.scenes.length} scenes ready.` });
    } catch (err: any) {
      toast.dismiss(REGEN_TOAST_ID);
      setStoryboardGenerating(false);
      toast.error("Error", { description: err.message });
    }
  };

  const handleStartRender = async () => {
    if (!isAuthenticated) {
      setShowAuthGate(true);
      return;
    }
    if (!jobId) return;
    // Prevent duplicate submissions from double-click or React re-renders
    if (isRenderingRef.current) {
      console.warn("[MusicVideo] Render already in progress, ignoring duplicate click");
      return;
    }
    // Show render paywall modal — user chooses quality/audio and pays (or uses free render)
    setShowRenderPaywall(true);
  };

  /** Called by RenderPaywallModal after payment/free render is confirmed to actually start the render */
  const handleStartRenderInternal = async () => {
    if (!jobId || isRenderingRef.current) return;
    isRenderingRef.current = true;
    analytics.renderVideoClicked("music_video_autopilot");
    // Request browser notification permission so we can notify when render completes
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch { /* silent */ }

    try {
      const result = await startRender.mutateAsync({ jobId: jobId, aspectRatio: exportFormat, includeCaptions });
      mp.buildStarted("WizVideo");
      setStep("render");
      setRenderStatus("rendering");
      if (!(result as any).duplicate) {
        setCompletedScenes(0);
        setFailedScenes(0);
        setPerSceneStatuses([]);
        setRenderStartTime(Date.now());
      }

      // Start polling with adaptive backoff on 429
      // Minimum 15s between polls (scenes take 30-120s each, no need to hammer the API)
      let pollBackoffMs = 15000;
      const MAX_POLL_BACKOFF_MS = 120000;

      const schedulePoll = () => {
        // Clear any existing timer before scheduling a new one
        if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);

        pollIntervalRef.current = setTimeout(async () => {
          try {
            const progress = await pollProgress.mutateAsync({ jobId });
            setCompletedScenes(progress.completedScenes);
            setTotalScenes(progress.totalScenes);
            setFailedScenes(progress.failedScenes);
            setRenderStatus(progress.status);
            if (progress.sceneStatuses) {
              setPerSceneStatuses((prev) => {
                // Merge: keep existing prompt/lyrics from storyboard scenes or previous poll
                const prevMap = new Map(prev.map((s) => [s.id, s]));
                return (progress.sceneStatuses as Array<{ id: number; index: number; status: string; errorMessage?: string | null }>).map((s) => ({
                  ...s,
                  // Preserve prompt/lyrics from the storyboard scenes array if available
                  prompt: prevMap.get(s.id)?.prompt ?? scenes.find((sc) => sc.id === s.id)?.prompt ?? undefined,
                  lyrics: prevMap.get(s.id)?.lyrics ?? scenes.find((sc) => sc.id === s.id)?.lyrics ?? undefined,
                }));
              });
              // Clear retrying state for scenes that are no longer failed
              setRetryingScenes((prev) => {
                const next = new Set(prev);
                progress.sceneStatuses!.forEach((s) => {
                  if (s.status !== "failed") next.delete(s.id);
                });
                return next;
              });
            }

            if (progress.status === "completed" && progress.finalVideoUrl) {
              setFinalVideoUrl(progress.finalVideoUrl);
              isRenderingRef.current = false;
              mp.buildCompleted("WizVideo");
              // In-app success notification
              toast.success("Your video is ready!", {
                description: "Your WIZ AI video has finished building. Check your email for a direct download link.",
                duration: 8000,
                action: {
                  label: "Watch Now",
                  onClick: () => window.open(progress.finalVideoUrl!, "_blank"),
                },
              });
              // Browser push notification (works even if tab is in background)
              try {
                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification("WIZ AI — Your video is ready!", {
                    body: `"${title || "Your video"}" has finished building. Click to watch.`,
                    icon: "/favicon.ico",
                    tag: "wizai-render-complete",
                  });
                }
              } catch { /* silent */ }
              // Show Cinematic Pack upsell modal first (1s delay for celebration animation)
              setTimeout(() => setShowCinematicPackModal(true), 1000);
              // Scene-level cinematic upsell shown after user dismisses the pack modal
              // (triggered from onSkip / onClose of PostRenderCinematicPackModal)
              // Check if credits are now low
              setTimeout(() => checkLowCredits(), 3000);
              return; // stop polling
            }

            if (progress.status === "failed") {
              isRenderingRef.current = false;
              mp.buildFailed("WizVideo");
              toast.error("Render failed", { description: "Some scenes could not be generated. Please try regenerating failed scenes." });
              return; // stop polling
            }

            // Good response — reset backoff and schedule next poll
            pollBackoffMs = 15000;
            schedulePoll();
          } catch (err: any) {
            const is429 =
              err?.data?.httpStatus === 429 ||
              String(err?.message).includes("429") ||
              String(err?.message).toLowerCase().includes("rate limit");

            if (is429) {
              pollBackoffMs = Math.min(pollBackoffMs * 2, MAX_POLL_BACKOFF_MS);
              console.warn(`[MusicVideo] ${new Date().toISOString()} Rate limited during polling. Backing off to ${pollBackoffMs}ms`);
              toast.warning("Building is busy right now.", {
                description: "Please wait — we'll check again shortly.",
                id: "render-rate-limit", // deduplicate toasts
              });
            } else {
              console.error("[MusicVideo] Poll error:", err);
            }
            schedulePoll(); // keep trying regardless
          }
        }, pollBackoffMs) as unknown as ReturnType<typeof setInterval>;
      };

      schedulePoll();

    } catch (err: any) {
      isRenderingRef.current = false;
      const is429 =
        err?.data?.httpStatus === 429 ||
        String(err?.message).includes("429") ||
        String(err?.message).toLowerCase().includes("rate limit");

      const isConcurrentRender = err?.data?.code === "TOO_MANY_REQUESTS" && String(err?.message).toLowerCase().includes("already have a video building");
      const isServiceUnavailable =
        err?.data?.code === "SERVICE_UNAVAILABLE" ||
        err?.data?.httpStatus === 503 ||
        String(err?.message).toLowerCase().includes("video generation service is temporarily unavailable") ||
        String(err?.message).toLowerCase().includes("all providers unavailable");

      if (isConcurrentRender) {
        toast.error("Render already in progress", {
          description: "You already have a video building. Please wait for it to complete before starting another.",
          duration: 8000,
        });
      } else if (isServiceUnavailable) {
        toast.error("Video build unavailable right now", {
          description: "We could not complete your video build right now. Your credits have not been used. Please try again shortly or contact support.",
          duration: 12000,
        });
      } else if (is429) {
        toast.error("Building is busy right now.", {
          description: "The AI rendering service is at capacity. Please wait a moment and try again.",
        });
      } else {
        toast.error("Failed to start render", { description: err.message });
      }
    }
  };

   // Show UI first, gate generate action behind auth
  // Use explicit storyboardGenerating state (not mutation.isPending) to avoid the overlay
  // persisting after scenes have already been received and rendered.
  // Safety net: if we have scenes and are on the storyboard step, the overlay must not show.
  const isGeneratingStoryboard = storyboardGenerating && !(step === "storyboard" && scenes.length > 0);

  // Page-load auth gate: show sign-in screen for logged-out users
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen studio-bg flex flex-col items-center justify-center gap-6 px-4" style={{backgroundColor:'#040810'}}>
        <div className="pointer-events-none fixed inset-0 z-0" style={{ background: "radial-gradient(ellipse 60% 45% at 75% 0%, rgba(20,184,166,0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 20% 100%, rgba(6,182,212,0.06) 0%, transparent 55%)" }} />
        <div className="env-bg"><img src="/manus-storage/env-wizvideo-film-studio_b80ecab4.jpg" alt="" /><div className="env-bg-overlay" /></div>
        <div className="text-center max-w-md relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-[--color-gold]/15 border border-[--color-gold]/30 flex items-center justify-center mx-auto mb-6"><Music2 className="w-8 h-8 text-[--color-gold]" /></div>
          <h1 className="text-3xl font-bold text-white mb-3">WizVideo™</h1>
          <p className="text-white/50 mb-8">Sign in to start creating AI music videos.</p>
          <Button className="btn-primary btn-sheen px-8 py-3 rounded-xl text-base" asChild><a href={getLoginUrl("/music-video/create")}>Sign in to continue</a></Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#080808',color:'#e0d8cc',fontFamily:"'Montserrat',sans-serif"}}>
      {/* Auth Gate */}
      <AuthGate open={showAuthGate} onClose={() => setShowAuthGate(false)} featureName="create your music video" returnPath="/music-video/create" />
      {/* ===== STORYBOARD GENERATION PROGRESS OVERLAY ===== */}
      {isGeneratingStoryboard && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm">
          <div className="w-full max-w-md px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-[--color-gold]/15 border-2 border-[--color-gold]/30 flex items-center justify-center mx-auto mb-4" style={{boxShadow:"0 0 24px rgba(139,92,246,0.35)"}}>
              <Sparkles className="w-9 h-9 text-[--color-gold] animate-pulse" />
            </div>
            <div className="flex justify-center mb-3">
              <WizBrandBadge layer="create" size="md" animated />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Creating Your Storyboard</h2>
            <p className="text-white/50 text-sm mb-8">WizCreate™ is casting characters and crafting your scenes. This takes about 60–120 seconds.</p>
            <div className="w-full bg-[rgba(24,20,16,0.9)] rounded-full h-2 mb-8 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#14b8a6] to-[#0d9488] rounded-full transition-all duration-[3000ms] ease-out"
                style={{ width: `${Math.min(95, 10 + storyboardStep * 18)}%` }}
              />
            </div>
            <div className="space-y-2.5 text-left">
              {[
                { label: "Uploading your song" },
                { label: "Transcribing lyrics" },
                { label: "Casting characters & defining appearances" },
                { label: "Crafting scene descriptions" },
                { label: "Building your storyboard" },
              ].map((s, i) => {
                const isDone = storyboardStep > i;
                const isActive = storyboardStep === i;
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                    isDone ? "bg-[--color-silver]/5 border-[--color-silver]/20" :
                    isActive ? "bg-[--color-gold]/15 border-[--color-gold]/30" :
                    "bg-[rgba(12,10,8,0.7)] border-[rgba(184,137,42,0.08)]"
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-[--color-silver] shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-[--color-gold] animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-600 shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${
                      isDone ? "text-[--color-silver]" : isActive ? "text-[--color-gold]" : "text-white/40"
                    }`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        open={showInsufficientCredits}
        onClose={() => setShowInsufficientCredits(false)}
        required={creditCost}
        balance={creditBalance}
        canReduceQuality={false}
      />
      {/* WizGenesis™ — Premium render upgrade experience (primary) */}
      {jobId && (
        <WizGenesisModal
          open={showRenderPaywall}
          onClose={() => setShowRenderPaywall(false)}
          jobId={jobId}
          jobType="music_video"
          videoTitle={title || undefined}
          onRenderConfirmed={handleStartRenderInternal}
        />
      )}
      {/* Post-Render Cinematic Pack Modal — shown immediately after render completes */}
      {finalVideoUrl && jobId && (
        <PostRenderCinematicPackModal
          open={showCinematicPackModal}
          onClose={() => setShowCinematicPackModal(false)}
          jobId={jobId}
          jobType="music_video"
          finalVideoUrl={finalVideoUrl}
          onSkip={(url) => {
            // Trigger browser download of the standard video
            const a = document.createElement("a");
            a.href = url;
            a.download = "";
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // Show scene-level cinematic upsell after a short delay
            setTimeout(() => setShowCinematicUpsell(true), 600);
          }}
        />
      )}
      {/* Cinematic Upsell Modal — shown after render completes */}
      <CinematicUpsellModal
        open={showCinematicUpsell}
        onClose={() => setShowCinematicUpsell(false)}
        scenes={scenes.map((s): CinematicScene => ({
          id: s.id,
          index: s.sceneIndex,
          prompt: s.prompt,
          previewImageUrl: s.previewImageUrl,
          status: s.status,
        }))}
        creditBalance={creditBalance}
        isUpgrading={isUpgradingCinematic}
        onUpgrade={async (sceneIds) => {
          if (!jobId) return;
          setIsUpgradingCinematic(true);
          try {
            const result = await cinematicUpgradeMutation.mutateAsync({ jobId, sceneIds });
            setShowCinematicUpsell(false);
            if (result.dispatched > 0) {
              toast.success(
                `Cinematic upgrade started for ${result.dispatched} scene${result.dispatched !== 1 ? "s" : ""}`,
                { description: "Your scenes are being re-rendered with premium quality. Use the retry panel to track progress." }
              );
              // Refresh scene statuses so the render progress grid shows the new pending scenes
              setScenes(prev => prev.map(s =>
                sceneIds.includes(s.id) ? { ...s, status: "generating" } : s
              ));
            }
            if (result.failed > 0) {
              toast.error(
                `${result.failed} scene${result.failed !== 1 ? "s" : ""} failed to start`,
                { description: `${result.creditsRefunded} credits refunded.` }
              );
            }
          } catch (err: any) {
            toast.error("Upgrade failed", { description: err?.message ?? "Please try again." });
          } finally {
            setIsUpgradingCinematic(false);
          }
        }}
      />
      {/* Lyrics Intelligence Panel — shown when user clicks Lyrics Intelligence button */}
      {showLyricsIntelligence && transcriptionText && (
        <LyricsIntelligencePanel
          lyrics={transcriptionText}
          genre={genre}
          mood={mood}
          style={selectedStyle}
          onConfirm={(blocks) => {
            console.log("[LyricsIntelligence] Confirmed blocks:", blocks.length);
            setShowLyricsIntelligence(false);
            toast.success(`${blocks.length} lyric blocks analysed`, { description: "AI has mapped emotions and visual cues for your lyrics." });
          }}
          onBack={() => setShowLyricsIntelligence(false)}
        />
      )}
      {/* Header — Production Set Hero (matches mockup-wizvideo-stages.html) */}
      {/* Top sticky nav */}
      <div className="sticky top-0 z-40" style={{background:'rgba(10,10,10,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between" style={{ position: 'relative', zIndex: 1 }}>
          <NavLink href="/" className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-xs font-medium tracking-wider uppercase">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Studio</span>
          </NavLink>
          <NavLink href="/" className="flex items-center gap-2.5">
            <img src="/manus-storage/wizai-logo-premium-transparent_ac3f550b.png" alt="WIZ AI" className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(20,184,166,0.20)]" loading="eager" decoding="async" />
            <span className="hidden sm:flex items-center gap-1.5">
              <span className="font-bold text-[16px] tracking-[2px] text-white/90" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>WIZVIDEO</span>
              <span className="text-[8px] font-bold tracking-[2px] text-[#14b8a6] px-1.5 py-0.5 rounded-sm border border-[#14b8a6]/25 uppercase" style={{ background: "rgba(20,184,166,0.08)" }}>DIRECTOR</span>
            </span>
          </NavLink>
          <div className="flex items-center gap-3">
            <StudioAmbientLight value={ambience} onChange={setAmbience} accentColor="#14b8a6" />
            <NavLink href="/dashboard" className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors">
              <LayoutDashboard className="w-4 h-4" />
            </NavLink>
          </div>
        </div>
        {/* Stage pills — clapperboard slate treatment */}
        <div className="max-w-5xl mx-auto px-4 pb-2">
          {(() => {
            const STEPS: Step[] = ["upload", "character_confirmation", "storyboard", "render"];
            const STEP_LABELS: Record<Step, string> = {
              upload: "Director's Brief",
              character_confirmation: "Character Lock",
              storyboard: "Storyboard",
              render: "Screening Room",
            };
            const STEP_SUBLABELS: Record<Step, string> = {
              upload: "Brief",
              character_confirmation: "Cast",
              storyboard: "Board",
              render: "Screen",
            };
            const currentIdx = STEPS.indexOf(step);
            const canNavigateTo = (s: Step): boolean => {
              const targetIdx = STEPS.indexOf(s);
              if (targetIdx <= currentIdx) return true;
              if (s === "character_confirmation" && jobId) return true;
              if (s === "storyboard" && scenes.length > 0) return true;
              if (s === "render" && scenes.some(sc => sc.status === "completed")) return true;
              return false;
            };
            return (
              <div className="flex items-center gap-0 overflow-x-auto pb-1">
                {STEPS.map((s, i) => {
                  const isActive = step === s;
                  const isCompleted = currentIdx > i;
                  const isAccessible = canNavigateTo(s);
                  return (
                    <React.Fragment key={s}>
                      {/* Clapperboard slate chip */}
                      <button
                        onClick={() => isAccessible && setStep(s)}
                        disabled={!isAccessible}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 0,
                          padding: 0, borderRadius: 4, overflow: 'hidden',
                          border: isActive ? '1px solid rgba(20,184,166,0.6)' : isCompleted ? '1px solid rgba(20,184,166,0.25)' : '1px solid rgba(255,255,255,0.07)',
                          boxShadow: isActive ? '0 0 10px rgba(20,184,166,0.2),inset 0 0 0 1px rgba(20,184,166,0.1)' : 'none',
                          cursor: isAccessible ? 'pointer' : 'not-allowed',
                          opacity: isAccessible ? 1 : 0.35,
                          transition: 'all 0.2s',
                          background: 'transparent',
                          flexShrink: 0,
                        }}
                      >
                        {/* Clapper badge — diagonal-stripe black square */}
                        <span style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 26, height: 26, flexShrink: 0,
                          background: isActive
                            ? 'repeating-linear-gradient(45deg,#14b8a6 0px,#14b8a6 3px,#0a0a0a 3px,#0a0a0a 7px)'
                            : isCompleted
                            ? 'repeating-linear-gradient(45deg,rgba(20,184,166,0.5) 0px,rgba(20,184,166,0.5) 3px,#0a0a0a 3px,#0a0a0a 7px)'
                            : 'repeating-linear-gradient(45deg,rgba(255,255,255,0.12) 0px,rgba(255,255,255,0.12) 3px,#0a0a0a 3px,#0a0a0a 7px)',
                          fontSize: 10, fontWeight: 800,
                          color: isActive ? '#000' : isCompleted ? '#14b8a6' : 'rgba(255,255,255,0.5)',
                          fontFamily: "'Courier Prime',monospace",
                          borderRight: isActive ? '1px solid rgba(20,184,166,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        }}>
                          {isCompleted ? '✓' : i + 1}
                        </span>
                        {/* Label area */}
                        <span style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                          padding: '3px 10px 3px 8px',
                          background: isActive ? 'rgba(20,184,166,0.08)' : isCompleted ? 'rgba(20,184,166,0.04)' : 'rgba(255,255,255,0.02)',
                        }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase',
                            color: isActive ? '#14b8a6' : isCompleted ? 'rgba(20,184,166,0.7)' : 'rgba(255,255,255,0.28)',
                            fontFamily: "'Courier Prime',monospace",
                            lineHeight: 1.2,
                          }} className="hidden sm:block">
                            {STEP_LABELS[s]}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase',
                            color: isActive ? '#14b8a6' : isCompleted ? 'rgba(20,184,166,0.7)' : 'rgba(255,255,255,0.28)',
                            fontFamily: "'Courier Prime',monospace",
                            lineHeight: 1.2,
                          }} className="sm:hidden">
                            {STEP_SUBLABELS[s]}
                          </span>
                        </span>
                      </button>
                      {/* Connector — film-strip perforation dots */}
                      {i < 3 && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 2, padding: '0 4px', flexShrink: 0,
                        }}>
                          {[0,1,2].map(d => (
                            <div key={d} style={{
                              width: 3, height: 3, borderRadius: '50%',
                              background: i < currentIdx ? 'rgba(20,184,166,0.5)' : 'rgba(255,255,255,0.1)',
                            }} />
                          ))}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
      {/* Production Set Hero — immersive studio view */}
      <div style={{position:'relative',width:'100%',height:340,overflow:'hidden',background:'#000'}}>
        <img
          src="/manus-storage/wizvideo-director-pov-v2_5af0d4ca.jpg"
          alt="WizVideo Film Production Studio"
          style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 40%',filter:`brightness(${0.3 + (ambience/100)*0.85})`,transition:'filter 0.6s ease'}}
        />
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.35)',pointerEvents:'none'}} />
        <div style={{position:'absolute',inset:0,background:'linear-gradient(0deg,rgba(8,8,8,1) 0%,rgba(8,8,8,0.4) 50%,transparent 100%)',pointerEvents:'none'}} />
        {/* Title overlay */}
        <div style={{position:'absolute',top:24,left:28,zIndex:20}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'3px',textTransform:'uppercase',color:'rgba(255,255,255,0.9)',marginBottom:6,textShadow:'0 1px 8px rgba(0,0,0,0.9)'}}>WizVideo™ · AI Studio</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:42,letterSpacing:4,color:'#ffffff',textShadow:'0 2px 32px rgba(0,0,0,0.95), 0 0 60px rgba(20,184,166,0.25)',lineHeight:1,marginBottom:8}}>MUSIC VIDEO DIRECTOR</div>
          <div style={{fontSize:13,fontWeight:600,color:'#14b8a6',letterSpacing:'1px',textShadow:'0 1px 12px rgba(0,0,0,0.8), 0 0 20px rgba(20,184,166,0.4)'}}>Character Lock · Storyboard · Screening Room</div>
        </div>
        {/* REC / READY indicator — clapperboard-style */}
        <div style={{position:'absolute',top:16,right:24,display:'flex',alignItems:'center',gap:7,background:'rgba(0,0,0,0.80)',border: step === 'render' && (renderStatus === 'rendering' || renderStatus === 'assembling' || renderStatus === 'wizsound') ? '1px solid rgba(239,68,68,0.55)' : '1px solid rgba(20,184,166,0.4)',borderRadius:3,padding:'5px 12px',zIndex:20,boxShadow: step === 'render' && (renderStatus === 'rendering' || renderStatus === 'assembling' || renderStatus === 'wizsound') ? '0 0 16px rgba(239,68,68,0.15)' : '0 0 16px rgba(20,184,166,0.12)'}}>
          <div style={{width:8,height:8,borderRadius:'50%',background: step === 'render' && (renderStatus === 'rendering' || renderStatus === 'assembling' || renderStatus === 'wizsound') ? '#ef4444' : '#14b8a6',boxShadow: step === 'render' && (renderStatus === 'rendering' || renderStatus === 'assembling' || renderStatus === 'wizsound') ? '0 0 8px #ef4444' : '0 0 8px #14b8a6',animation:'filmingBlink 1.2s ease-in-out infinite'}} />
          <div style={{fontSize:10,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color: step === 'render' && (renderStatus === 'rendering' || renderStatus === 'assembling' || renderStatus === 'wizsound') ? '#ef4444' : '#14b8a6',fontFamily:"'Courier Prime',monospace"}}>{step === 'render' && (renderStatus === 'rendering' || renderStatus === 'assembling' || renderStatus === 'wizsound') ? 'REC' : 'READY'}</div>
        </div>
        {/* Slate metadata strip — bottom of hero */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:20,display:'flex',alignItems:'center',gap:0,overflow:'hidden'}}>
          {/* Diagonal-stripe left edge — clapperboard identity */}
          <div style={{width:18,height:28,flexShrink:0,background:'repeating-linear-gradient(45deg,#14b8a6 0px,#14b8a6 4px,#000 4px,#000 9px)'}} />
          <div style={{flex:1,display:'flex',alignItems:'center',gap:0,background:'rgba(0,0,0,0.82)',borderTop:'1px solid rgba(20,184,166,0.2)',height:28,padding:'0 12px',overflow:'hidden'}}>
            {/* SCENE */}
            <div style={{display:'flex',alignItems:'center',gap:5,paddingRight:12,borderRight:'1px solid rgba(255,255,255,0.08)',marginRight:12}}>
              <span style={{fontSize:8,fontWeight:600,letterSpacing:'2px',textTransform:'uppercase',color:'rgba(255,255,255,0.6)',fontFamily:"'Courier Prime',monospace"}}>SCENE</span>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'#14b8a6',fontFamily:"'Courier Prime',monospace"}}>{step === 'upload' ? "DIRECTOR'S BRIEF" : step === 'character_confirmation' ? 'CHARACTER LOCK' : step === 'storyboard' ? 'STORYBOARD' : 'SCREENING ROOM'}</span>
            </div>
            {/* TAKE */}
            <div style={{display:'flex',alignItems:'center',gap:5,paddingRight:12,borderRight:'1px solid rgba(255,255,255,0.08)',marginRight:12}}>
              <span style={{fontSize:8,fontWeight:600,letterSpacing:'2px',textTransform:'uppercase',color:'rgba(255,255,255,0.6)',fontFamily:"'Courier Prime',monospace"}}>TAKE</span>
              <span style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.9)',fontFamily:"'Courier Prime',monospace"}}>{['upload','character_confirmation','storyboard','render'].indexOf(step) + 1}</span>
            </div>
            {/* DIRECTOR */}
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <span style={{fontSize:8,fontWeight:600,letterSpacing:'2px',textTransform:'uppercase',color:'rgba(255,255,255,0.6)',fontFamily:"'Courier Prime',monospace"}}>DIRECTOR</span>
              <span style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.85)',fontFamily:"'Courier Prime',monospace"}}>WizVideo™</span>
            </div>
            {/* Spacer + scenes count when on storyboard/render */}
            {(step === 'storyboard' || step === 'render') && scenes.length > 0 && (
              <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:5}}>
                <span style={{fontSize:8,fontWeight:600,letterSpacing:'2px',textTransform:'uppercase',color:'rgba(255,255,255,0.6)',fontFamily:"'Courier Prime',monospace"}}>SCENES</span>
                <span style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.9)',fontFamily:"'Courier Prime',monospace"}}>{String(scenes.length).padStart(2,'0')}</span>
              </div>
            )}
          </div>
          {/* Diagonal-stripe right edge */}
          <div style={{width:18,height:28,flexShrink:0,background:'repeating-linear-gradient(45deg,#14b8a6 0px,#14b8a6 4px,#000 4px,#000 9px)'}} />
        </div>
        <style>{`@keyframes filmingBlink{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
      </div>

       <div style={{background:'#080808'}}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* ===== STEP 1: UPLOAD ===== */}
              {/* ── AUDIO UPLOAD BANNER — always visible on upload step ── */}
      {step === "upload" && !audioFile && !sunoGeneratedAudioUrl && (
        <div className="flex items-center gap-4 px-6 py-4 relative z-10" style={{ background: "linear-gradient(90deg, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0.07) 100%)", borderBottom: "1px solid rgba(20,184,166,0.3)" }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.35)" }}></div>
          <div className="flex-1">
            <div className="text-sm font-bold mb-0.5" style={{ color: "#2dd4bf", letterSpacing: "0.5px" }}>UPLOAD YOUR SONG TO BEGIN</div>
            <div className="text-xs text-zinc-300">MP3, WAV, M4A · up to 50MB · WizVideo™ auto-transcribes lyrics, casts characters, and builds your storyboard</div>
          </div>
          <div className="text-xs font-bold px-4 py-2 rounded-lg flex-shrink-0" style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.3)", color: "#2dd4bf" }}>START BELOW ↓</div>
        </div>
      )}
      {step === "upload" && (audioFile || sunoGeneratedAudioUrl) && (
        <div className="flex items-center gap-3 px-6 py-3 relative z-10" style={{ background: "rgba(109,184,109,0.08)", borderBottom: "1px solid rgba(109,184,109,0.2)" }}>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
          <span className="text-xs font-bold text-green-400">AUDIO LOADED — {audioFile?.name || "Generated Track"}</span>
          <div className="flex-1 h-7 mx-4"><AnimatedEqualiser barCount={40} color="#14b8a6" height={28} alwaysAnimate={true} /></div>
        </div>
      )}

      {step === "upload" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-6">
              {/* ── Artist Type Selection ── */}
              <Card className="studio-card border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-[--color-gold]" />
                    Who's in your video?
                  </CardTitle>
                  <p className="text-xs text-white/70 mt-1">Choose your artist type to optimise character generation and lip sync</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                      { value: "solo_artist" as const, label: "Solo Artist", desc: "One main performer" },
                      { value: "band" as const, label: "Band", desc: "Multiple performers" },
                      { value: "animated_characters" as const, label: "Animated Group", desc: "Stylised 3D / anime" },
                      { value: "solo_animated" as const, label: "Solo Animated", desc: "Single animated character" },
                    ] as const).map(({ value, label, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setArtistType(value);
                          if (jobId) {
                            updateArtistTypeMutation.mutate({ jobId, artistType: value });
                          }
                        }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center ${
                          artistType === value
                            ? "border-[--color-gold]/60 bg-[--color-gold]/10 ring-1 ring-[--color-gold]/30"
                            : "border-[rgba(184,137,42,0.12)] bg-[rgba(20,16,12,0.6)] hover:border-zinc-500 hover:bg-[rgba(24,20,16,0.9)]"
                        }`}
                      >
                        <div>
                          <p className={`text-xs font-semibold ${artistType === value ? "text-[--color-gold]" : "text-white"}`}>{label}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">{desc}</p>
                        </div>
                        {artistType === value && (
                          <Check className="w-3.5 h-3.5 text-[--color-gold]" />
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Audio Source: Upload or Generate with AI */}
              <Card className="studio-card border-0">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-[rgba(184,137,42,0.12)] p-1 gap-1">
                      <button
                        onClick={() => setAudioSourceTab("upload")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          audioSourceTab === "upload"
                            ? "bg-[--color-gold] text-black"
                            : "text-white/50 hover:text-white"
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload Song
                      </button>
                      <button
                        onClick={() => setAudioSourceTab("generate")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          audioSourceTab === "generate"
                            ? "bg-[--color-gold] text-black"
                            : "text-white/50 hover:text-white"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate with AI
                      </button>
                    </div>
                    {audioSourceTab === "generate" && (
                      <span className="text-xs text-white/40 ml-auto">Powered by WizSound™ AI</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* ── Generate with WizSound™ ── */}
                  {audioSourceTab === "generate" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white/70">Describe your song</Label>
                        <Textarea
                          placeholder="e.g. Upbeat hip-hop track about chasing dreams, energetic beat, motivational lyrics"
                          value={sunoPrompt}
                          onChange={(e) => setSunoPrompt(e.target.value)}
                          className="bg-[rgba(24,20,16,0.9)] border-[rgba(184,137,42,0.12)] text-white resize-none h-20"
                          maxLength={400}
                        />
                        <p className="text-white/30 text-xs text-right">{sunoPrompt.length}/400</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/70">Music style / genre <span className="text-white/40">(optional)</span></Label>
                        <Input
                          placeholder="e.g. trap, lo-fi, cinematic orchestral, pop punk"
                          value={sunoStyle}
                          onChange={(e) => setSunoStyle(e.target.value)}
                          className="bg-[rgba(24,20,16,0.9)] border-[rgba(184,137,42,0.12)] text-white"
                          maxLength={200}
                        />
                      </div>
                      <Button
                        onClick={handleSunoGenerate}
                        disabled={sunoGenerating || !sunoPrompt.trim()}
                        className="w-full bg-[--color-gold] hover:bg-[--color-gold]/90 text-black font-semibold"
                      >
                        {sunoGenerating ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating song...</>
                        ) : (
                          <><Sparkles className="w-4 h-4 mr-2" />Generate Song</>  
                        )}
                      </Button>
                      {sunoGenerating && (
                        <div className="rounded-xl border border-[rgba(184,137,42,0.12)] bg-[rgba(20,16,12,0.6)] p-4 text-center">
                          <Loader2 className="w-8 h-8 text-[--color-gold] mx-auto mb-2 animate-spin" />
                          <p className="text-white/70 text-sm font-medium">Composing your song...</p>
                          <p className="text-white/40 text-xs mt-1">Usually takes 30–60 seconds</p>
                        </div>
                      )}
                      {sunoTracks.length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-white/70">Choose a track</Label>
                          {sunoTracks.map((track, idx) => (
                            <div
                              key={idx}
                              onClick={() => { setSelectedSunoTrack(idx); setSunoGeneratedAudioUrl(track.audioUrl); if (track.duration) setAudioDuration(Math.round(track.duration)); }}
                              className={`rounded-xl border p-3 cursor-pointer transition-all ${
                                selectedSunoTrack === idx
                                  ? "border-[--color-gold] bg-[--color-gold]/10"
                                  : "border-[rgba(184,137,42,0.12)] hover:border-zinc-500"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {track.imageUrl && (
                                  <img src={track.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-medium truncate">{track.title || `Track ${idx + 1}`}</p>
                                  {track.duration && <p className="text-white/40 text-xs">{formatDuration(Math.round(track.duration))}</p>}
                                </div>
                                {selectedSunoTrack === idx && <Check className="w-4 h-4 text-[--color-gold] shrink-0" />}
                              </div>
                              {selectedSunoTrack === idx && track.audioUrl && (
                                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                  <WizAudioPlayer
                                    audioUrl={track.audioUrl}
                                    title={track.title || `Track ${idx + 1}`}
                                    subtitle={track.duration ? formatDuration(Math.round(track.duration)) : ""}
                                    barCount={24}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                          {selectedSunoTrack !== null && (
                            <p className="text-[--color-gold] text-sm text-center font-medium flex items-center justify-center gap-1.5">
                              <Check className="w-4 h-4" />
                              Track selected — fill in the details below to continue
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* ── Upload ── */}
                  {audioSourceTab === "upload" && (
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragging ? "border-[--color-gold] bg-[--color-gold]/15" :
                      audioFile ? "border-[--color-gold] bg-[--color-gold]/10" :
                      "border-[rgba(184,137,42,0.12)] hover:border-zinc-500"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".mp3,.wav,.m4a,audio/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileDrop(f); }}
                    />
                    {audioFile ? (
                      <div>
                        {isUploading ? (
                          <div className="space-y-3">
                            <Loader2 className="w-10 h-10 text-[--color-gold] mx-auto mb-2 animate-spin" />
                            <p className="text-[--color-gold] font-medium">Uploading & Processing...</p>
                            <Progress value={uploadProgress} className="h-2" />
                            <p className="text-white/50 text-sm text-center">{uploadProgress}% complete</p>
                          </div>
                        ) : (
                          <div>
                            <Check className="w-10 h-10 text-[--color-gold] mx-auto mb-2" />
                            <p className="text-[--color-gold] font-medium">{audioFile.name}</p>
                            <p className={`text-sm mt-1 ${audioExceedsLimit ? "text-[--color-gold] font-medium" : "text-white/50"}`}>
                              Duration: {formatDuration(audioDuration)}
                              {audioExceedsLimit && ` — exceeds your ${formatDuration(maxVideoSeconds)} plan limit`}
                            </p>
                            {/* Audio Preview Player with WizAudioPlayer */}
                            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                              <WizAudioPlayer
                                audioUrl={URL.createObjectURL(audioFile)}
                                title={audioFile.name.replace(/\.[^.]+$/, "")}
                                subtitle={`${formatDuration(audioDuration)} · ${(audioFile.size / 1024 / 1024).toFixed(1)} MB`}
                                barCount={32}
                              />
                              <p className="text-white/40 text-xs mt-2 text-center">Click outside to change file</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Music className="w-10 h-10 text-white/40 mx-auto mb-2" />
                        <p className="text-white/70 font-medium">Drop your song here</p>
                        <p className="text-white/40 text-sm mt-1">MP3, WAV, M4A · Max 100MB · Max 6 minutes</p>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Audio length limit warning + upgrade prompt - only show in upload tab */}
                  {audioSourceTab === "upload" && audioExceedsLimit && (
                    <div className="rounded-xl border border-[--color-gold]/30 bg-[--color-gold]/15 px-4 py-3 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-[--color-gold] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[--color-gold] font-medium text-sm">
                          Your song is {formatDuration(audioDuration)} — your plan allows up to {formatDuration(maxVideoSeconds)}
                        </p>
                        <p className="text-[--color-gold]/70 text-xs mt-1">
                          WIZ AI will use the first {formatDuration(maxVideoSeconds)} of your track.
                          {planLimits?.plan === "starter" && " Upgrade to Basic for 2-minute videos, or Creator for 3-minute videos."}
                          {planLimits?.plan === "creator" && " Upgrade to Studio for 3-minute videos."}
                        </p>
                        <a
                          href="/pricing"
                          className="inline-block mt-2 text-xs font-semibold text-[--color-gold] hover:text-[--color-gold] underline underline-offset-2 transition-colors"
                        >
                          View upgrade options →
                        </a>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-white/70">Song Title *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Midnight Dreams"
                      className="mt-1 bg-[rgba(24,20,16,0.9)] border-[rgba(184,137,42,0.12)] text-white placeholder:text-white/40"
                    />
                  </div>

                  {/* Lyrics / Transcription Panel — shows as soon as audio is selected */}
                  {transcriptionStatus !== "idle" && (
                    <div className="rounded-xl border border-[rgba(184,137,42,0.12)] overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 bg-[rgba(24,20,16,0.9)] hover:bg-[rgba(28,24,20,0.9)] transition-colors"
                        onClick={() => setLyricsExpanded(!lyricsExpanded)}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[--color-gold]" />
                          <span className="text-sm font-medium text-white">Detected Lyrics</span>
                          {transcriptionStatus === "transcribing" ? (
                            <Badge className="bg-yellow-900/50 text-yellow-300 border-yellow-800 text-xs">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Transcribing...
                            </Badge>
                          ) : transcriptionStatus === "done" ? (
                            <Badge className="bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/20 text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              Ready
                            </Badge>
                          ) : transcriptionStatus === "quota" ? (
                            <Badge className="bg-orange-900/50 text-orange-300 border-orange-800 text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Service busy
                            </Badge>
                          ) : (
                            <Badge className="bg-[rgba(40,32,24,0.9)] text-white/50 text-xs">Not available</Badge>
                          )}
                        </div>
                        {lyricsExpanded ? (
                          <ChevronUp className="w-4 h-4 text-white/50" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-white/50" />
                        )}
                      </button>
                      {lyricsExpanded && (
                        <div className="px-4 py-3 bg-[rgba(12,10,8,0.7)]">
                          {transcriptionStatus === "done" && transcriptionText ? (
                            <div className="space-y-2">
                              {!isEditingLyrics ? (
                                <div className="space-y-2">
                                  <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-[rgba(20,16,12,0.6)] p-3 rounded">
                                    {transcriptionText}
                                  </p>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setIsEditingLyrics(true)}
                                      className="flex-1 text-xs"
                                    >
                                      <Pencil className="w-3 h-3 mr-1" />
                                      Edit Lyrics
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="flex-1 text-xs bg-gradient-to-r from-[#b8892a] to-[#2e2e36] hover:from-[#b8892a] hover:to-[#2e2e36] text-white"
                                      onClick={() => setShowLyricsIntelligence(true)}
                                    >
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      Lyrics Intelligence
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Textarea
                                    value={transcriptionText}
                                    onChange={(e) => setTranscriptionText(e.target.value)}
                                    className="bg-[rgba(24,20,16,0.9)] border-[rgba(184,137,42,0.12)] text-white text-sm min-h-[100px]"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => setIsEditingLyrics(false)}
                                      className="flex-1 bg-[--color-gold] hover:bg-[--color-gold]/80 text-white"
                                    >
                                      <Check className="w-3 h-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setIsEditingLyrics(false)}
                                      className="flex-1"
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : transcriptionStatus === "transcribing" ? (
                            <div className="flex items-center gap-2 text-white/50 text-sm py-2">
                              <Loader2 className="w-4 h-4 animate-spin text-[--color-gold]" />
                              <span>AI is transcribing your song's lyrics... This takes 30–60 seconds.</span>
                            </div>
                          ) : transcriptionStatus === "quota" ? (
                            <div className="flex items-start gap-2 text-sm py-2">
                              <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-orange-300 font-medium">AI service temporarily busy</p>
                                <p className="text-white/50 mt-0.5">Lyrics could not be transcribed right now. You can still generate a storyboard from your theme description. Try again in a few minutes.</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-white/40 text-sm py-2">
                              Could not transcribe lyrics. The storyboard will be generated from your theme description instead.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Theme & Vision */}
              <Card className="studio-card border-0 overflow-hidden">
                {/* Director's Suite terminal header */}
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-[--color-gold]/10 bg-black/40">
                  <div className="flex items-center gap-2.5">
                    <span className={`studio-led ${themePrompt.trim().length > 10 ? 'studio-led-green' : 'studio-led-off'}`} />
                    <span className="studio-label tracking-widest">DIRECTOR'S BRIEF</span>
                    <span className={`text-[10px] font-mono ${themePrompt.trim().length > 10 ? 'text-green-400' : 'text-white/20'}`}>
                      {themePrompt.trim().length > 10 ? '\u25cf VISION LOCKED' : '\u25cb AWAITING BRIEF'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <VoicePromptButton
                      toolContext="music video creation and visual storytelling"
                      onPromptReady={(refined) => setThemePrompt(refined)}
                    />
                    <EnhancePromptButton
                      prompt={themePrompt}
                      genre={genre}
                      mood={mood}
                      onEnhanced={(text) => setThemePrompt(text)}
                    />
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[--color-silver]" />
                    Describe Your Vision
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs font-mono text-white/40 uppercase tracking-widest block mb-2">Theme & Concept *</Label>
                    <Textarea
                      value={themePrompt}
                      onChange={(e) => setThemePrompt(e.target.value)}
                      placeholder="Describe the visual story you want. E.g. 'A lone astronaut drifting through a neon galaxy, searching for home. Dark and cinematic with purple and blue tones. Emotional and introspective.'"
                      className="mt-1 bg-black/30 border-[rgba(184,137,42,0.15)] text-white placeholder:text-white/25 min-h-[120px] font-mono text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white/70">Genre</Label>
                      <Input
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        placeholder="e.g. Indie Rock, EDM, R&B"
                        className="mt-1 bg-[rgba(24,20,16,0.9)] border-[rgba(184,137,42,0.12)] text-white placeholder:text-white/40"
                      />
                    </div>
                    <div>
                      <Label className="text-white/70">Mood</Label>
                      <Input
                        value={mood}
                        onChange={(e) => setMood(e.target.value)}
                        placeholder="e.g. Dark, Euphoric, Melancholic"
                        className="mt-1 bg-[rgba(24,20,16,0.9)] border-[rgba(184,137,42,0.12)] text-white placeholder:text-white/40"
                      />
                    </div>
                  </div>

                  {/* Video Style Picker */}
                  <div>
                    <Label className="text-white/70 mb-3 block">Video Style</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {VIDEO_STYLES.map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setSelectedStyle(style.id)}
                          className={`relative rounded-xl overflow-hidden text-left transition-all focus:outline-none group ${
                            selectedStyle === style.id
                              ? "ring-2 ring-[--color-gold] ring-offset-2 ring-offset-zinc-900"
                              : "ring-1 ring-zinc-700 hover:ring-zinc-500"
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="relative" style={{ aspectRatio: "3/2" }}>
                            <img
                              src={style.image}
                              alt={style.label}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            {/* Dark overlay */}
                            <div className={`absolute inset-0 transition-opacity pointer-events-none ${
                              selectedStyle === style.id
                                ? "bg-[--color-gold]/15"
                                : "bg-black/40 group-hover:bg-black/20"
                            }`} />
                            {/* Selected checkmark */}
                            {selectedStyle === style.id && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[--color-gold] flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          {/* Label */}
                          <div className={`px-3 py-2 ${
                            selectedStyle === style.id ? "bg-[--color-gold]/15" : "bg-[rgba(24,20,16,0.9)]"
                          }`}>
                            <p className={`text-sm font-semibold ${
                              selectedStyle === style.id ? "text-[--color-gold]" : "text-white"
                            }`}>{style.label}</p>
                            <p className="text-xs text-white/50">{style.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Locations / Scene Setting */}
              <Card className="studio-card border-0">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <span className="text-xl text-[--color-gold]">&#9679;</span>
                    Locations & Scene Settings
                    <Badge variant="outline" className="border-zinc-600 text-white/50 text-xs ml-1">Optional</Badge>
                  </CardTitle>
                  <p className="text-white/40 text-xs mt-1">
                    Describe where your video takes place. The AI will use these as the primary visual environments across scenes.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={sceneSetting}
                    onChange={(e) => setSceneSetting(e.target.value)}
                    placeholder={`Describe the locations and environments for your video.\n\nExamples:\n• Concert venue with dramatic stage lighting\n• Desert at golden hour, sand dunes\n• Rooftop at night with city skyline\n• Neon-lit underground club\n• Forest clearing with dappled sunlight\n• Multiple: concert stage, backstage corridor, crowd shots`}
                    className="bg-[rgba(24,20,16,0.9)] border-[rgba(184,137,42,0.12)] text-white placeholder:text-white/30 min-h-[110px] text-sm resize-none"
                    rows={5}
                  />
                  {/* Quick-pick location chips */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Concert Venue",
                      "Desert",
                      "City Rooftop",
                      "Forest",
                      "Beach at Sunset",
                      "Neon Club",
                      "Mountain Peak",
                      "Moving Train",
                      "Abandoned Fairground",
                      "Urban Streets",
                      "Space / Galaxy",
                      "Medieval Castle",
                    ].map((loc) => {
                      const label = loc;
                      const isSelected = sceneSetting.toLowerCase().includes(label.toLowerCase());
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSceneSetting(prev => prev.replace(new RegExp(label + ",?\\s*", "i"), "").trim());
                            } else {
                              setSceneSetting(prev => prev ? `${prev.trim()}, ${label}` : label);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            isSelected
                              ? "bg-[--color-gold]/15 border-[--color-gold] text-[--color-gold]"
                              : "bg-[rgba(24,20,16,0.9)] border-[rgba(184,137,42,0.12)] text-white/50 hover:border-zinc-500 hover:text-zinc-200"
                          }`}
                        >
                          {loc}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Visual Reference Assets — optional photos/videos for storyboard context */}
              <Card className="studio-card border-0">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[--color-gold]" />
                    Visual References
                    <Badge variant="outline" className="border-zinc-600 text-white/50 text-xs ml-1">Optional · Up to 3</Badge>
                  </CardTitle>
                  <p className="text-white/40 text-xs mt-1">
                    Upload photos or short video clips to guide the AI's visual style. These are used as inspiration for colour palette, mood, and aesthetic — not as source footage.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Uploaded assets grid */}
                  {contextAssets.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {contextAssets.map((asset, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden border border-[rgba(184,137,42,0.12)] aspect-video bg-[rgba(24,20,16,0.9)]">
                          {asset.type === "image" ? (
                            <img src={asset.url} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="w-8 h-8 text-white/50" />
                              <span className="text-xs text-white/50 ml-1">Video</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveContextAsset(asset.url)}
                            className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-xs text-white/70 px-1.5 py-0.5 text-center">
                            {asset.type === "image" ? "Image" : "Video"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Upload button */}
                  {contextAssets.length < 3 && (
                    <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-[rgba(184,137,42,0.12)] rounded-lg py-4 cursor-pointer transition-colors hover:border-zinc-500 hover:bg-[rgba(20,16,12,0.6)] ${
                      contextAssetUploading ? "opacity-50 pointer-events-none" : ""
                    }`}>
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/mov"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadContextAsset(file);
                          e.target.value = "";
                        }}
                        disabled={contextAssetUploading || !jobId}
                      />
                      {contextAssetUploading ? (
                        <><Loader2 className="w-4 h-4 animate-spin text-white/50" /><span className="text-white/50 text-sm">Uploading…</span></>
                      ) : (
                        <><Upload className="w-4 h-4 text-white/50" /><span className="text-white/50 text-sm">{contextAssets.length === 0 ? "Upload a photo or video clip" : `Add another (${contextAssets.length}/3)`}</span></>
                      )}
                    </label>
                  )}
                  {!jobId && (
                    <p className="text-xs text-white/30 text-center">Upload your audio first to enable visual references</p>
                  )}
                </CardContent>
              </Card>

              {/* Characters — dual mode: Photo Upload or AI Generated */}
              <Card className="studio-card border-0">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-[--color-gold]" />
                    Characters
                    <Badge variant="outline" className="border-zinc-600 text-white/50 text-xs ml-1">Optional · Up to 4</Badge>
                  </CardTitle>
                  <p className="text-white/40 text-xs mt-1">
                    Upload photos of real people or describe AI-generated characters. Each will appear consistently across all scenes.
                  </p>
                </CardHeader>
                <CardContent>
                  <CharacterManager
                    characters={characters}
                    onChange={setCharacters}
                    maxCharacters={8}
                    jobId={jobId}
                    savedCharacterIds={savedCharacterIds}
                    videoStyle={selectedStyle}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Summary sidebar */}
            <div className="space-y-4">
              <Card className="studio-card border-0">
                <CardHeader>
                  <CardTitle className="text-white text-base">Video Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Duration</span>
                    <span className="text-white">{audioDuration > 0 ? formatDuration(audioDuration) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50 flex items-center gap-1.5"><Film className="w-4 h-4" /> Scenes</span>
                    <span className="text-white">{sceneCount > 0 ? sceneCount : "—"}</span>
                  </div>
                  {/* Credit cost breakdown */}
                  {audioDuration > 0 && (
                    <div className="border-t border-[rgba(184,137,42,0.10)] pt-3 space-y-2">
                      <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Credit Breakdown</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Standard video</span>
                        <span className="text-white">{creditBreakdown.base} Credits</span>
                      </div>
                      {hasLipSync && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/50 flex items-center gap-1.5"><Mic className="w-3.5 h-3.5" /> Lip sync</span>
                          <span className="text-[--color-silver]">+{creditBreakdown.lipSync} Credits</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm border-t border-[rgba(184,137,42,0.10)] pt-2 mt-1">
                        <span className="text-zinc-200 font-semibold">Total</span>
                        <span className="text-[--color-gold] font-bold">{creditBreakdown.total} Credits</span>
                      </div>
                    </div>
                  )}
                  {characters.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50 flex items-center gap-1.5"><User className="w-4 h-4" /> Characters</span>
                      <span className="text-[--color-gold]">{characters.length} added</span>
                    </div>
                  )}
                  <div className="border-t border-[rgba(184,137,42,0.10)] pt-3 text-xs text-white/40">
                    Storyboard generation is always free. Pay only when you build your final video &amp; download.
                  </div>
                </CardContent>
              </Card>

              {/* ── HEAR & SEE THE DIFFERENCE ── */}
              <Card className="border-[--color-gold]/30 bg-gradient-to-b from-[--color-gold]/10 to-transparent">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <h3 className="text-xs font-bold text-[--color-gold] tracking-widest uppercase flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    Hear & See the Difference
                  </h3>
                  <p className="text-[10px] text-white/40">Preview all three quality tiers. No download until payment confirmed.</p>
                  <div className="space-y-1.5">
                    {['ORIGINAL', 'ENHANCED', 'CINEMATIC'].map((tier, i) => (
                      <div key={tier} className={`rounded-lg border p-2 text-xs ${i === 0 ? 'border-[--color-gold]/40 bg-[--color-gold]/15 text-white' : 'border-white/10 bg-white/5 text-white/50'}`}>
                        <div className="font-bold tracking-wider">{tier}</div>
                        <div className="text-[10px] opacity-70">{i === 0 ? 'Included' : i === 1 ? '+\u00a32.99' : '+\u00a34.99'}</div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <h4 className="text-[10px] font-bold text-white tracking-widest uppercase mb-2">WIZLUMINAR\u2122 \u2014 VISUAL QUALITY</h4>
                    <div className="grid grid-cols-3 gap-1">
                      {['ORIGINAL', 'ENHANCED', 'CINEMATIC'].map((tier, i) => (
                        <div key={tier} className={`rounded-md border p-1.5 text-center text-[9px] ${i === 0 ? 'border-[--color-gold]/40 bg-[--color-gold]/15 text-white' : 'border-white/10 bg-white/5 text-white/40'}`}>
                          <div className="font-bold">{tier}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="rounded-lg bg-gradient-to-r from-[--color-gold]/20 to-[--color-gold]/10 border border-[--color-gold]/30 p-2">
                      <div className="text-xs font-bold text-[--color-gold]">WizSound\u2122 Cinematic</div>
                      <div className="text-[10px] text-white/40">+\u00a34.99</div>
                    </div>
                    <div className="rounded-lg bg-gradient-to-r from-purple-500/20 to-purple-500/10 border border-purple-500/30 p-2">
                      <div className="text-xs font-bold text-purple-400">WizLuminar\u2122 Cinematic</div>
                      <div className="text-[10px] text-white/40">+\u00a33.99</div>
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <h4 className="text-[10px] font-bold text-white tracking-widest uppercase mb-2">RENDER QUALITY</h4>
                    <div className="grid grid-cols-3 gap-1">
                      {RENDER_QUALITY_TIERS.map((q) => ({ l: q.label, s: q.res, p: q.price })).map((q,i) => (
                        <div key={q.l} className={`rounded-md border p-1.5 text-center ${i === 1 ? 'border-[--color-gold]/40 bg-[--color-gold]/15' : 'border-white/10 bg-white/5'}`}>
                          <div className="text-xs font-bold text-white">{q.l}</div>
                          <div className="text-[9px] text-white/40">{q.s}</div>
                          <div className={`text-[9px] font-medium ${i===1?'text-[--color-gold]':'text-white/30'}`}>{q.p}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              {/* Render paywall info — replaces legacy credit balance card */}
              <Card className="bg-gradient-to-br from-[#b8892a]/20 to-[#4a3010]/10 border-[--color-gold]/30">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="w-4 h-4 text-[--color-gold]" />
                    <p className="text-[--color-gold] text-sm font-medium">Create free, pay to build</p>
                  </div>
                  <p className="text-white/50 text-xs leading-relaxed">
                    Building your storyboard is completely free. You only pay when you're ready to build and download your finished video.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-[#b8892a]/40 to-[#2e2e36]/40 border-[--color-gold]/30">
                <CardContent className="pt-4 pb-4">
                  <p className="text-[--color-gold] text-sm font-medium mb-1">How it works</p>
                  <ol className="text-white/50 text-xs space-y-1.5 list-decimal list-inside">
                    <li>Upload your song & describe your vision</li>
                    <li>AI transcribes lyrics & generates a free storyboard</li>
                    <li>Review & edit any scene prompts</li>
                    <li>Choose quality &amp; render (from £2)</li>
                    <li>Download your finished music video</li>
                  </ol>
                </CardContent>
              </Card>

              {quotaError && (
                <div className="flex items-start gap-3 rounded-xl border border-orange-800 bg-orange-950/40 px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-orange-300 font-medium text-sm">AI service temporarily busy</p>
                    <p className="text-orange-200/70 text-xs mt-0.5">{quotaError}</p>
                  </div>
                  <button
                    type="button"
                    className="text-orange-400 hover:text-orange-200 transition-colors"
                    onClick={() => setQuotaError(null)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <Button
                className="w-full btn-primary btn-sheen py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => { setQuotaError(null); handleUploadAndGenerate(); }}
                disabled={
                  createJob.isPending || generateStoryboardMutation.isPending || isUploading || !title || !themePrompt ||
                  (audioSourceTab === "upload" ? !audioFile : !sunoGeneratedAudioUrl)
                }
              >
                {createJob.isPending || generateStoryboardMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Storyboard...</>
                ) : isUploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading Song...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate Free Storyboard</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP 1.5: CHARACTER CONFIRMATION ===== */}
        {step === "character_confirmation" && jobId && (
          <CharacterConfirmationStep
            jobId={jobId}
            savedCharacterIds={savedCharacterIds}
            onApproveAll={() => {
              // All characters approved — proceed to storyboard generation
              setStoryboardGenerating(true);
              const STORYBOARD_TOAST_ID = "storyboard-generating";
              toast.loading("Generating storyboard...", { id: STORYBOARD_TOAST_ID, description: "Our AI director is crafting your scenes." });
              generateStoryboardMutation.mutateAsync({ jobId: jobId! })
                .then((storyboard) => {
                  setScenes(storyboard.scenes.map((s: any) => ({ ...s, id: s.sceneIndex, status: "pending" })));
                  toast.dismiss(STORYBOARD_TOAST_ID);
                  setStoryboardGenerating(false);
                  setStep("storyboard");
                  toast.success("Storyboard ready!", { description: `${storyboard.scenes.length} scenes created.` });
                })
                .catch((err: any) => {
                  toast.dismiss(STORYBOARD_TOAST_ID);
                  setStoryboardGenerating(false);
                  toast.error("Storyboard generation failed", { description: err?.message ?? "Please try again." });
                });
            }}
            onBack={() => setStep("upload")}
            isGeneratingStoryboard={storyboardGenerating}
          />
        )}

        {/* ===== STEP 2: STORYBOARD ===== */}
        {step === "storyboard" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Your Storyboard</h2>
                <p className="text-white/50 text-sm mt-1">{scenes.length} scenes · Review and edit any scene before building</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Credit balance badge */}
                <CreditBalance variant="badge" />
                {/* Render status badge */}
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[--color-gold]/15 border border-[--color-gold]/30 text-[--color-gold] text-xs font-medium">
                  <Download className="w-3 h-3" /> Pay to build
                </span>
                {scenes.some(sc => sc.status === "pending") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[--color-silver]/40 text-[--color-silver] hover:bg-[--color-silver]/10 bg-transparent text-xs"
                    onClick={handleStartRender}
                    disabled={startRender.isPending}
                    title="Approve all scenes and start rendering"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Approve All
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-[rgba(184,137,42,0.12)] text-white/70 hover:bg-[rgba(24,20,16,0.9)] bg-transparent"
                  onClick={() => {
                    // Storyboard is already auto-saved in DB (status: storyboard_ready).
                    // Navigate to MyProjects so user can return later.
                    toast.success("Storyboard saved!", {
                      description: "Your storyboard is saved. Return to My Projects to continue anytime.",
                    });
                    setTimeout(() => { window.location.href = "/my-projects"; }, 1500);
                  }}
                  title="Save your storyboard and return later from My Projects"
                >
                  <BookmarkCheck className="w-4 h-4 mr-2" />
                  Save &amp; Return Later
                </Button>
                <Button
                  variant="outline"
                  className="border-[rgba(184,137,42,0.12)] text-white/70 hover:bg-[rgba(24,20,16,0.9)] bg-transparent"
                  onClick={handleRegenerateStoryboard}
                  disabled={generateStoryboardMutation.isPending}
                >
                  {generateStoryboardMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Regenerate
                </Button>
                <Button
                  className="bg-gradient-to-r from-[#b8892a] to-[#2e2e36] hover:from-[#b8892a] hover:to-[#2e2e36] text-white font-semibold"
                  onClick={handleStartRender}
                  disabled={startRender.isPending || scenes.length === 0}
                >
                  {startRender.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Create your video</>
                  )}
                </Button>
              </div>
            </div>

            {/* Export Format Selection */}
            <div className="mb-4 rounded-xl studio-panel px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="w-4 h-4 text-[--color-silver]" />
                <span className="text-sm font-semibold text-white">Export Format</span>
                <span className="text-xs text-white/40 ml-1">Choose your target platform</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "16:9" as const, label: "YouTube", sub: "16:9 Landscape", icon: "▬", color: "#FF0000" },
                  { value: "9:16" as const, label: "TikTok", sub: "9:16 Portrait", icon: "▮", color: "#00F2EA" },
                  { value: "1:1" as const, label: "Instagram", sub: "1:1 Square", icon: "■", color: "#E1306C" },
                ] as const).map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => setExportFormat(fmt.value)}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-200 ${
                      exportFormat === fmt.value
                        ? "border-[--color-gold]/60 bg-[--color-gold]/10 shadow-[0_0_12px_rgba(184,137,42,0.15)]"
                        : "border-[rgba(184,137,42,0.12)] bg-[rgba(24,20,16,0.9)]/40 hover:border-zinc-600 hover:bg-[rgba(24,20,16,0.9)]/70"
                    }`}
                  >
                    {/* Aspect ratio visual */}
                    <div className="flex items-center justify-center" style={{ width: 40, height: 28 }}>
                      <div
                        className="rounded-sm border-2 transition-colors"
                        style={{
                          borderColor: exportFormat === fmt.value ? "oklch(0.72 0.14 70)" : "#52525b",
                          background: exportFormat === fmt.value ? "oklch(0.72 0.14 70 / 0.15)" : "transparent",
                          ...(fmt.value === "16:9" ? { width: 38, height: 22 } : fmt.value === "9:16" ? { width: 16, height: 28 } : { width: 24, height: 24 }),
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <div className={`text-xs font-bold ${exportFormat === fmt.value ? "text-[--color-gold]" : "text-white"}`}>{fmt.label}</div>
                      <div className="text-[10px] text-white/40 mt-0.5">{fmt.sub}</div>
                    </div>
                    {exportFormat === fmt.value && (
                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[--color-gold] flex items-center justify-center">
                        <Check className="w-2 h-2 text-black" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Pre-render cinematic upgrade nudge */}
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-[--color-gold]/30 bg-gradient-to-r from-[#b8892a]/30 to-orange-950/20 px-4 py-3">
              <Sparkles className="w-4 h-4 text-[--color-gold] flex-shrink-0" />
              <p className="text-sm text-[--color-gold] flex-1">
                <span className="font-semibold">These scenes will render in standard quality.</span>{" "}
                After buildinging, you can upgrade key scenes to cinematic quality for a professional finish.
              </p>
            </div>

            {/* Global Lip Sync Control */}
            <div className="mb-4 flex items-center justify-between rounded-xl border border-[rgba(184,137,42,0.10)] bg-[rgba(10,8,6,0.95)]/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <Mic className="w-4 h-4 text-[--color-silver]" />
                <div>
                  <p className="text-sm font-medium text-white">Lip Sync — All Scenes</p>
                  <p className="text-xs text-white/40">Control when characters sing or stay cinematic</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className={`text-xs border-[rgba(184,137,42,0.12)] bg-transparent ${
                    globalLipSync === false ? "border-zinc-500 text-white/70" : "text-white/40"
                  } hover:bg-[rgba(24,20,16,0.9)]`}
                  onClick={() => handleGlobalLipSyncToggle(false)}
                  disabled={updateAllScenesLipSyncMutation.isPending}
                >
                  <X className="w-3 h-3 mr-1" /> Off for all
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`text-xs border-[rgba(184,137,42,0.12)] bg-transparent ${
                    globalLipSync === true ? "border-[--color-gold] text-[--color-gold]" : "text-white/40"
                  } hover:bg-[rgba(24,20,16,0.9)]`}
                  onClick={() => handleGlobalLipSyncToggle(true)}
                  disabled={updateAllScenesLipSyncMutation.isPending}
                >
                  {updateAllScenesLipSyncMutation.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Mic className="w-3 h-3 mr-1" />
                  )}
                  On for all
                </Button>
              </div>
            </div>

            {/* Caption / Lyric Sync Toggle */}
            <div className="mb-4 flex items-center justify-between rounded-xl border border-[rgba(184,137,42,0.10)] bg-[rgba(10,8,6,0.95)]/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <Captions className="w-4 h-4 text-[--color-silver]" />
                <div>
                  <p className="text-sm font-medium text-white">Lyric Captions</p>
                  <p className="text-xs text-white/40">Burn synced lyrics onto the final video</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIncludeCaptions(!includeCaptions)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  includeCaptions ? "bg-[--color-gold]" : "bg-[rgba(40,32,24,0.9)]"
                }`}
                aria-checked={includeCaptions}
                role="switch"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    includeCaptions ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Character Reference Panel */}
            {jobCharacters.some(c => c.isLocked) && (
              <div className="mb-4 rounded-xl border border-[rgba(184,137,42,0.10)] bg-[rgba(10,8,6,0.95)]/60 px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">Characters in this video</span>
                  <span className="text-xs text-white/40 ml-1">Locked appearances enforced in every scene</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {jobCharacters.filter(c => c.isLocked).map((char) => {
                    // Derive instrument icon from lockedRole string
                    const roleStr = (char.lockedRole ?? char.role ?? "").toLowerCase();
                    const InstrumentIcon = roleStr.includes("drum") ? Drum
                      : roleStr.includes("guitar") || roleStr.includes("bass") ? Guitar
                      : roleStr.includes("piano") || roleStr.includes("keyboard") ? Piano
                      : roleStr.includes("sing") || roleStr.includes("vocal") || roleStr.includes("lead") ? Mic2
                      : null;
                    const isEditingThisChar = editingRoleCharId === char.id;
                    return (
                    <div key={char.slotIndex} className="flex items-start gap-3 rounded-lg border border-emerald-800/40 bg-emerald-900/10 px-3 py-2 min-w-0 max-w-[280px]">
                      {/* Avatar: use primaryPhotoUrl from DB or fallback icon */}
                      {char.primaryPhotoUrl ? (
                        <img
                          src={char.primaryPhotoUrl}
                          alt={char.name}
                          className="w-10 h-10 rounded-full object-cover border border-emerald-700/50 flex-shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-900/40 border border-emerald-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="w-5 h-5 text-emerald-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Lock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          <span className="text-sm font-semibold text-white truncate">{char.name}</span>
                        </div>
                        {/* Instrument role badge — editable inline */}
                        {isEditingThisChar ? (
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              autoFocus
                              value={editingRoleValue}
                              onChange={e => setEditingRoleValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter" && editingRoleValue.trim() && jobId) {
                                  updateCharacterInstrumentMutation.mutate({ jobId, characterId: char.id, performanceRole: editingRoleValue.trim() });
                                  setEditingRoleCharId(null);
                                } else if (e.key === "Escape") {
                                  setEditingRoleCharId(null);
                                }
                              }}
                              className="text-[10px] bg-[rgba(24,20,16,0.9)] border border-zinc-600 rounded px-2 py-0.5 text-white w-28 focus:outline-none focus:border-emerald-500"
                              placeholder="e.g. Lead Singer"
                            />
                            <button
                              onClick={() => {
                                if (editingRoleValue.trim() && jobId) {
                                  updateCharacterInstrumentMutation.mutate({ jobId, characterId: char.id, performanceRole: editingRoleValue.trim() });
                                }
                                setEditingRoleCharId(null);
                              }}
                              className="text-emerald-400 hover:text-emerald-300 text-[10px] px-1"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => setEditingRoleCharId(null)} className="text-white/40 hover:text-white/70 text-[10px] px-1">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="flex items-center gap-1 mt-1 group/role"
                            onClick={() => { setEditingRoleCharId(char.id); setEditingRoleValue(char.lockedRole ?? char.role ?? ""); }}
                            title="Click to edit instrument role"
                          >
                            {InstrumentIcon && <InstrumentIcon className="w-3 h-3 text-[--color-gold]/70 flex-shrink-0" />}
                            <span className="text-[10px] text-[--color-gold]/70 group-hover/role:text-[--color-gold] transition-colors">
                              {char.lockedRole ?? char.role ?? "Performer"}
                            </span>
                            <Pencil className="w-2.5 h-2.5 text-white/30 group-hover/role:text-white/50 transition-colors ml-0.5" />
                          </button>
                        )}
                        {/* Show a truncated snippet of the locked description as a visual cue */}
                        {char.lockedDescription && (
                          <p
                            className="text-[10px] text-white/40 truncate max-w-[200px] mt-1"
                            title={char.lockedDescription}
                          >
                            {char.lockedDescription.slice(0, 70)}{char.lockedDescription.length > 70 ? "…" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Style Lock Banner */}
            {lockedStyle?.isLocked && lockedStyle.style && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-[--color-silver]/30 bg-gradient-to-r from-[#9090a0]/40 to-[#2e2e36]/20 px-4 py-3">
                <Heart className="w-4 h-4 text-[--color-silver] flex-shrink-0 fill-[--color-gold]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[--color-silver]">Style Locked</p>
                  <p className="text-xs text-[--color-silver]/80 truncate">{lockedStyle.style.descriptor}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/50 hover:text-white hover:bg-[rgba(24,20,16,0.9)] text-xs shrink-0 gap-1"
                  onClick={handleUnlockStyle}
                  disabled={unlockStyleMutation.isPending}
                >
                  {unlockStyleMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Unlock className="w-3 h-3" />
                  )}
                  Unlock
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenes.map((scene) => (
                <React.Fragment key={scene.id}>
                  <Card className="bg-[rgba(10,8,6,0.95)] border-[rgba(184,137,42,0.10)] hover:border-zinc-600 transition-colors overflow-hidden">
                  {/* Scene preview image */}
                  <div className="relative w-full aspect-video bg-[rgba(24,20,16,0.9)]" style={{fontFamily:"'Courier Prime',monospace"}}>
                    {scene.previewImageUrl ? (
                      <img
                        src={scene.previewImageUrl}
                        alt={`Scene ${scene.sceneIndex + 1} preview`}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                    {/* Face validation status badge */}
                    {scene.faceValidationStatus && scene.faceValidationStatus !== "skipped" && (
                      <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                        scene.faceValidationStatus === "matched"
                          ? "bg-[--color-silver]/80 text-white"
                          : scene.faceValidationStatus === "warning"
                          ? "bg-[--color-gold]/15 text-white"
                          : "bg-[--color-gold]/80 text-white"
                      }`}>
                        {scene.faceValidationStatus === "matched" && <span>✓ Face Matched</span>}
                        {scene.faceValidationStatus === "warning" && <span>⚠ Face Drift</span>}
                        {scene.faceValidationStatus === "regenerated" && <span>↻ Regenerated</span>}
                      </div>
                    )}
                    {!scene.previewImageUrl && (
                      <div className="w-full h-full flex items-center justify-center">
                        {scene.previewImageLoading ? (
                          <div className="flex flex-col items-center gap-2 px-3 text-center">
                            <Loader2 className="w-6 h-6 text-[--color-gold] animate-spin" />
                            <span className="text-white/50 text-xs font-medium">
                              {editingSceneId === scene.id ? "AI is regenerating your scene..." : "Generating preview..."}
                            </span>
                            {editingSceneId !== scene.id && scene.previewImageLoading && (
                              <span className="text-white/30 text-[10px] leading-tight">
                                Edit the description below to change this scene
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Film className="w-6 h-6 text-white/30" />
                            <span className="text-white/30 text-xs">No preview</span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* AI regenerating overlay — shown when image exists but is being regenerated */}
                    {scene.previewImageUrl && scene.previewImageLoading && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 rounded-t-lg pointer-events-none">
                        <Loader2 className="w-7 h-7 text-[--color-gold] animate-spin" />
                        <span className="text-white text-xs font-medium">AI regenerating scene...</span>
                        <span className="text-white/50 text-[10px]">Applying your description</span>
                      </div>
                    )}
                    {/* ── Viewfinder overlay ── */}
                    {scene.previewImageUrl && (
                      <>
                        {/* Scanline overlay */}
                        <div style={{position:'absolute',inset:0,backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)',pointerEvents:'none',zIndex:2}} />
                        {/* Vignette */}
                        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,0.55) 100%)',pointerEvents:'none',zIndex:3}} />
                        {/* Corner brackets — TL */}
                        <div style={{position:'absolute',top:6,left:6,width:14,height:14,borderTop:'1.5px solid rgba(212,168,67,0.8)',borderLeft:'1.5px solid rgba(212,168,67,0.8)',zIndex:4}} />
                        {/* Corner brackets — TR */}
                        <div style={{position:'absolute',top:6,right:6,width:14,height:14,borderTop:'1.5px solid rgba(212,168,67,0.8)',borderRight:'1.5px solid rgba(212,168,67,0.8)',zIndex:4}} />
                        {/* Corner brackets — BL */}
                        <div style={{position:'absolute',bottom:6,left:6,width:14,height:14,borderBottom:'1.5px solid rgba(212,168,67,0.8)',borderLeft:'1.5px solid rgba(212,168,67,0.8)',zIndex:4}} />
                        {/* Corner brackets — BR */}
                        <div style={{position:'absolute',bottom:6,right:6,width:14,height:14,borderBottom:'1.5px solid rgba(212,168,67,0.8)',borderRight:'1.5px solid rgba(212,168,67,0.8)',zIndex:4}} />
                        {/* Focus crosshair */}
                        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:16,height:16,zIndex:4,pointerEvents:'none'}}>
                          <div style={{position:'absolute',top:'50%',left:0,right:0,height:1,background:'rgba(212,168,67,0.4)',transform:'translateY(-50%)'}} />
                          <div style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,background:'rgba(212,168,67,0.4)',transform:'translateX(-50%)'}} />
                        </div>
                        {/* REC indicator — top right */}
                        <div style={{position:'absolute',top:8,right:8,display:'flex',alignItems:'center',gap:4,zIndex:5}}>
                          <span style={{width:6,height:6,borderRadius:'50%',background:'#ef4444',boxShadow:'0 0 6px rgba(239,68,68,0.8)',display:'inline-block',animation:'wizLivePulse 1.2s ease-in-out infinite'}} />
                          <span style={{fontSize:8,fontWeight:700,letterSpacing:1.5,color:'rgba(255,255,255,0.9)',textShadow:'0 1px 3px rgba(0,0,0,0.8)'}}>REC</span>
                        </div>
                        {/* Scene number — top left */}
                        <div style={{position:'absolute',top:8,left:8,zIndex:5}}>
                          <span style={{fontSize:8,fontWeight:700,letterSpacing:1,color:'rgba(212,168,67,0.9)',textShadow:'0 1px 3px rgba(0,0,0,0.8)'}}>SC {String(scene.sceneIndex + 1).padStart(2,'0')}</span>
                          {inferSceneType(scene.lyrics, scene.prompt) && (
                            <span style={{marginLeft:6,fontSize:7,letterSpacing:0.5,color:'rgba(255,255,255,0.5)'}}>{inferSceneType(scene.lyrics, scene.prompt).toUpperCase()}</span>
                          )}
                        </div>
                        {/* Timecode + exposure — bottom left */}
                        <div style={{position:'absolute',bottom:8,left:8,zIndex:5,display:'flex',flexDirection:'column',gap:1}}>
                          <span style={{fontSize:8,fontWeight:600,letterSpacing:0.5,color:'rgba(255,255,255,0.7)',textShadow:'0 1px 3px rgba(0,0,0,0.8)'}}>{formatTime(scene.startTime)} · {scene.duration}s</span>
                          <span style={{fontSize:7,color:'rgba(255,255,255,0.35)',letterSpacing:0.3}}>f/2.8 · ISO 800 · 1/50</span>
                        </div>
                      </>
                    )}
                    {/* Scene number overlay (no preview state) */}
                    {!scene.previewImageUrl && (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <Badge className="bg-black/70 text-white border-0 text-xs backdrop-blur-sm">
                          Scene {scene.sceneIndex + 1}
                        </Badge>
                        {inferSceneType(scene.lyrics, scene.prompt) && (
                          <Badge className="bg-[--color-gold]/15 text-[--color-gold] border-0 text-xs backdrop-blur-sm">
                            {inferSceneType(scene.lyrics, scene.prompt)}
                          </Badge>
                        )}
                      </div>
                    )}
                    {/* Duration overlay (no preview state) */}
                    {!scene.previewImageUrl && (
                      <div className="absolute bottom-2 right-2">
                        <span className="text-xs text-white/80 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                          {formatTime(scene.startTime)} · {scene.duration}s
                        </span>
                      </div>
                    )}
                    {/* Style Lock heart button — only shown when scene has a preview image */}
                    {scene.previewImageUrl && (
                      <button
                        className={`absolute bottom-2 left-2 flex items-center justify-center w-7 h-7 rounded-full backdrop-blur-sm transition-all ${
                          lockedStyle?.likedSceneId === scene.id
                            ? "bg-[--color-silver]/10 text-white"
                            : "bg-black/60 text-white/70 hover:bg-[--color-silver]/10 hover:text-white"
                        }`}
                        title={lockedStyle?.likedSceneId === scene.id ? "Style locked from this scene" : "Lock style from this scene"}
                        onClick={() => {
                          if (lockedStyle?.likedSceneId === scene.id) {
                            handleUnlockStyle();
                          } else {
                            handleLockStyle(scene.id, scene.previewImageUrl!);
                          }
                        }}
                        disabled={lockingSceneId === scene.id || lockStyleMutation.isPending || unlockStyleMutation.isPending}
                      >
                        {lockingSceneId === scene.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              lockedStyle?.likedSceneId === scene.id ? "fill-white" : ""
                            }`}
                          />
                        )}
                      </button>
                    )}
                  </div>
                  <CardContent className="pt-3 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {scene.visualStyle && (
                          <Badge variant="outline" className="border-[rgba(184,137,42,0.12)] text-white/50 text-xs">
                            {scene.visualStyle}
                          </Badge>
                        )}
                      </div>
                      {/* Scene action buttons: Move Up, Move Down, Regenerate, Delete */}
                      <div className="flex items-center gap-1 -mr-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white/30 hover:text-white/70 hover:bg-[rgba(24,20,16,0.9)] h-7 w-7 p-0 shrink-0"
                          onClick={() => handleReorderScene(scene.id, "up")}
                          disabled={scene.sceneIndex === 0 || reorderSceneMutation.isPending}
                          title="Move scene up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white/30 hover:text-white/70 hover:bg-[rgba(24,20,16,0.9)] h-7 w-7 p-0 shrink-0"
                          onClick={() => handleReorderScene(scene.id, "down")}
                          disabled={scene.sceneIndex === scenes.length - 1 || reorderSceneMutation.isPending}
                          title="Move scene down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white/40 hover:text-[--color-gold] hover:bg-[rgba(24,20,16,0.9)] h-7 w-7 p-0 shrink-0"
                          onClick={() => handleRegenerateScene(scene.id)}
                          disabled={scene.regenerating || regenerateSceneMutation.isPending}
                          title="Regenerate this scene"
                        >
                          {scene.regenerating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white/30 hover:text-red-400 hover:bg-red-950/30 h-7 w-7 p-0 shrink-0"
                          onClick={() => handleDeleteScene(scene.id)}
                          disabled={deleteSceneMutation.isPending || scenes.length <= 1}
                          title="Delete this scene"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Lyrics are used internally for prompt building but not shown on cards to keep UI clean */}

                    {/* Always-visible scene description editor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5">
                          <Pencil className="w-3 h-3 text-white/40" />
                          <span className="text-white/40 text-xs font-medium">Scene description</span>
                        </div>
                        <EnhancePromptButton
                          prompt={editingSceneId === scene.id ? editPrompt : scene.prompt}
                          productType="music_video"
                          genre={genre}
                          mood={mood}
                          onEnhanced={(text) => { setEditingSceneId(scene.id); setEditPrompt(text); }}
                        />
                      </div>
                      <Textarea
                        value={editingSceneId === scene.id ? editPrompt : scene.prompt}
                        onChange={(e) => {
                          if (editingSceneId !== scene.id) {
                            setEditingSceneId(scene.id);
                          }
                          setEditPrompt(e.target.value);
                        }}
                        onFocus={() => {
                          if (editingSceneId !== scene.id) {
                            setEditingSceneId(scene.id);
                            setEditPrompt(scene.prompt);
                          }
                        }}
                        placeholder="Describe this scene — mood, lighting, setting, character actions..."
                        className="bg-[rgba(24,20,16,0.9)]/60 border-[rgba(184,137,42,0.12)] text-white text-xs min-h-[80px] placeholder:text-white/30 resize-none focus:border-[--color-gold] transition-colors"
                        rows={3}
                      />
                      {editingSceneId === scene.id && editPrompt !== scene.prompt && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-[--color-gold] hover:bg-[--color-gold]/80 text-white text-xs h-7"
                            onClick={() => handleSaveEdit(scene.id)}
                            disabled={updateScene.isPending || !editPrompt.trim()}
                          >
                            {updateScene.isPending
                              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving...</>
                              : <><Sparkles className="w-3 h-3 mr-1" /> Save &amp; Regenerate</>}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="border-[rgba(184,137,42,0.12)] text-white/50 hover:bg-[rgba(24,20,16,0.9)] text-xs h-7"
                            onClick={() => { setEditingSceneId(null); setEditPrompt(""); }}
                          >
                            <X className="w-3 h-3 mr-1" /> Cancel
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* @Character tags + per-scene character selector */}
                    {jobCharacters.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[rgba(184,137,42,0.10)]/60">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Assigned character tags */}
                          {(scene.characterAssignments ?? []).map((name) => {
                            const charData = jobCharacters.find((c: any) => c.name === name);
                            const isCharLocked = charData?.isLocked;
                            const charAvatarUrl = charData?.primaryPhotoUrl ?? (charData as any)?.aiGeneratedImageUrl ?? null;
                            return (
                              <div key={name} className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSceneCharacter(scene.id, name)}
                                  className="inline-flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full text-xs font-medium bg-[--color-gold]/15 text-[--color-gold] border border-[--color-gold]/30 hover:bg-red-900/40 hover:text-red-300 hover:border-red-700/60 transition-colors"
                                  title={`Remove ${name} from this scene`}
                                >
                                  {charAvatarUrl ? (
                                    <img
                                      src={charAvatarUrl}
                                      alt={name}
                                      className="w-4 h-4 rounded-full object-cover border border-[--color-gold]/40 flex-shrink-0"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  ) : (
                                    <span className="w-4 h-4 rounded-full bg-[--color-gold]/20 flex items-center justify-center flex-shrink-0 text-[8px] font-bold text-[--color-gold]">
                                      {name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                  @{name}
                                  <X className="w-2.5 h-2.5" />
                                </button>
                                {isCharLocked && (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[--color-silver]/10 text-[--color-silver] border border-[--color-silver]/20"
                                    title={`${name}'s appearance is locked for consistency`}
                                  >
                                    <Lock className="w-2 h-2" />
                                    Locked
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {/* Add character button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setCharacterSelectorSceneId(characterSelectorSceneId === scene.id ? null : scene.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(24,20,16,0.9)] text-white/40 border border-[rgba(184,137,42,0.12)] hover:border-zinc-500 hover:text-white/70 transition-colors"
                            >
                              <User className="w-2.5 h-2.5" />
                              {(scene.characterAssignments ?? []).length === 0 ? "Add character" : "+"}
                            </button>
                            {/* Dropdown */}
                            {characterSelectorSceneId === scene.id && (
                              <div className="absolute left-0 top-7 z-50 bg-[rgba(10,8,6,0.95)] border border-[rgba(184,137,42,0.12)] rounded-lg shadow-xl min-w-[160px] py-1">
                                {jobCharacters.map((char: any) => {
                                  const isAssigned = (scene.characterAssignments ?? []).includes(char.name);
                                  return (
                                    <button
                                      key={char.id}
                                      type="button"
                                      onClick={() => { handleToggleSceneCharacter(scene.id, char.name); setCharacterSelectorSceneId(null); }}
                                      className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                                        isAssigned
                                          ? "text-[--color-gold] bg-[--color-gold]/15 hover:bg-[--color-gold]/15"
                                          : "text-white/70 hover:bg-[rgba(24,20,16,0.9)]"
                                      }`}
                                    >
                                      {isAssigned ? <CheckCircle2 className="w-3 h-3 text-[--color-gold]" /> : <User className="w-3 h-3 text-white/40" />}
                                      @{char.name}
                                      {char.role && <span className="text-white/30 ml-auto">{char.role}</span>}
                                    </button>
                                  );
                                })}
                                <button
                                  type="button"
                                  onClick={() => setCharacterSelectorSceneId(null)}
                                  className="w-full text-left px-3 py-2 text-xs text-white/30 hover:bg-[rgba(24,20,16,0.9)] border-t border-[rgba(184,137,42,0.10)] mt-1"
                                >
                                  Close
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Lip Sync toggle + style selector */}
                    <div className="mt-3 pt-3 border-t border-[rgba(184,137,42,0.10)] space-y-2.5">
                      {/* Toggle row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mic className={`w-3.5 h-3.5 ${scene.lipSync ? "text-[--color-silver]" : "text-white/30"}`} />
                          <span className={`text-xs font-medium ${scene.lipSync ? "text-[--color-silver]" : "text-white/40"}`}>
                            Lip Sync
                          </span>
                          <Badge
                            className={`text-xs px-1.5 py-0 ${
                              scene.lipSync
                                ? "bg-[--color-silver]/10 text-[--color-silver] border-[--color-silver]/20"
                                : "bg-[rgba(24,20,16,0.9)] text-white/40 border-[rgba(184,137,42,0.12)]"
                            }`}
                          >
                            {scene.lipSync ? "ON" : "OFF"}
                          </Badge>
                        </div>
                        <Switch
                          checked={scene.lipSync}
                          onCheckedChange={(val) => handleToggleSceneLipSync(scene.id, val)}
                          aria-label={`Lip sync for scene ${scene.sceneIndex + 1}`}
                        />
                      </div>

                      {/* Style selector — only shown when lip sync is ON */}
                      {scene.lipSync && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-white/40 uppercase tracking-wide font-medium">Style</p>
                            <ToggleGroup
                              type="single"
                              value={scene.lipSyncStyle}
                              onValueChange={(val) => {
                                if (val) handleChangeLipSyncStyle(scene.id, val as "natural" | "expressive" | "subtle" | "dramatic" | "anime");
                              }}
                              className="flex gap-1 flex-wrap"
                            >
                              {([
                                { value: "natural",    label: "Natural",    desc: "Realistic, subtle mouth movements" },
                                { value: "expressive", label: "Expressive", desc: "Exaggerated, energetic animation" },
                                { value: "subtle",     label: "Subtle",     desc: "Minimal, almost imperceptible sync" },
                                { value: "dramatic",   label: "Dramatic",   desc: "Theatrical, intense expressions" },
                                { value: "anime",      label: "Anime",      desc: "Stylized Japanese animation lip sync" },
                              ] as const).map(({ value, label, desc }) => (
                                <Tooltip key={value}>
                                  <TooltipTrigger asChild>
                                    <ToggleGroupItem
                                      value={value}
                                      aria-label={label}
                                      className={`text-[10px] px-2 py-0.5 h-6 rounded-full border transition-all ${
                                        scene.lipSyncStyle === value
                                          ? "bg-[--color-silver]/10 border-[--color-silver]/40 text-[--color-silver] font-semibold"
                                          : "bg-[rgba(24,20,16,0.9)]/60 border-[rgba(184,137,42,0.12)] text-white/50 hover:border-zinc-500 hover:text-white/70"
                                      }`}
                                    >
                                      {label}
                                    </ToggleGroupItem>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs max-w-[160px] text-center">
                                    {desc}
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </ToggleGroup>
                          </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* ── Add Scene button between cards ── */}
                <div className="col-span-full flex items-center justify-center py-1">
                  <button
                    type="button"
                    onClick={() => handleAddScene(scene.sceneIndex)}
                    disabled={addSceneMutation.isPending}
                    title="Insert a new scene after this one"
                    className="group flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white/30 hover:text-[--color-gold] hover:bg-[rgba(24,20,16,0.9)] border border-transparent hover:border-[rgba(184,137,42,0.12)] transition-all disabled:opacity-40"
                  >
                    {addSceneMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    Add scene here
                  </button>
                </div>
                </React.Fragment>
              ))}
            </div>
            {/* Low credit warning at bottom of storyboard */}
            {creditBalance < 20 && (
              <div className="mt-6">
                <LowCreditBanner
                  balance={creditBalance}
                  estimatedCost={creditCost}
                  variant="inline"
                  dismissible
                />
              </div>
            )}
            {/* ── Sticky bottom approval bar ── */}
            <div style={{position:'sticky',bottom:0,left:0,right:0,background:'rgba(8,6,4,0.97)',borderTop:'1px solid rgba(184,137,42,0.15)',backdropFilter:'blur(12px)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,marginTop:24,zIndex:30}}>
              {/* Approval status dots */}
              <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',flex:1,minWidth:0}}>
                <span style={{fontSize:10,fontWeight:600,letterSpacing:1.5,color:'#555',textTransform:'uppercase',marginRight:4,whiteSpace:'nowrap'}}>SCENES</span>
                {scenes.slice(0,8).map((sc,i) => (
                  <div key={sc.id} title={`Scene ${i+1}: ${sc.status}`} style={{width:8,height:8,borderRadius:'50%',background: sc.previewImageUrl ? (sc.status === 'approved' ? '#6db86d' : 'rgba(212,168,67,0.9)') : '#2a2a2a',boxShadow: sc.previewImageUrl ? '0 0 6px rgba(212,168,67,0.4)' : 'none',transition:'background 0.2s',flexShrink:0}} />
                ))}
                {scenes.length > 8 && <span style={{fontSize:9,color:'#555',marginLeft:2}}>+{scenes.length-8}</span>}
                <span style={{fontSize:10,color:'#555',marginLeft:8,whiteSpace:'nowrap'}}>{scenes.filter(s=>!!s.previewImageUrl).length}/{scenes.length} ready</span>
              </div>
              {/* PROCEED TO RENDER gold CTA */}
              <button
                type="button"
                onClick={handleStartRender}
                disabled={startRender.isPending || scenes.length === 0}
                style={{background: scenes.length > 0 && !startRender.isPending ? 'linear-gradient(135deg,#d4a843,#b8892a)' : '#1a1a1a',border: scenes.length > 0 && !startRender.isPending ? 'none' : '1px solid #333',color: scenes.length > 0 && !startRender.isPending ? '#000' : '#555',padding:'12px 24px',fontSize:12,fontWeight:700,letterSpacing:2,borderRadius:3,cursor: scenes.length > 0 && !startRender.isPending ? 'pointer' : 'not-allowed',display:'flex',alignItems:'center',gap:10,transition:'all 0.2s',whiteSpace:'nowrap',flexShrink:0}}
              >
                {startRender.isPending ? (
                  <><Loader2 style={{width:14,height:14,animation:'spin 1s linear infinite'}} /> STARTING RENDER...</>
                ) : (
                  <><Clapperboard style={{width:14,height:14}} /> PROCEED TO RENDER</>
                )}
              </button>
            </div>
          </div>
        )}
        {/* ===== STEP 3: RENDER ===== */}
        {step === "render" && (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-[rgba(10,8,6,0.95)] border-[rgba(184,137,42,0.10)]">
              <CardContent className="pt-8 pb-8">
                {renderStatus === "completed" && finalVideoUrl ? (
                  <PostRenderRetentionScreen
                    finalVideoUrl={finalVideoUrl}
                    videoTitle={title || undefined}
                    jobId={jobId || undefined}
                    aspectRatio={exportFormat as "16:9" | "9:16" | "1:1"}
                    onCreateAnother={() => {
                      setStep("upload"); setJobId(null); setAudioFile(null); setTitle(""); setThemePrompt(""); setGenre(""); setMood(""); setAudioDuration(0); setScenes([]); setFinalVideoUrl(null); setCharacters([]); setTranscriptionText(null); setTranscriptionSegments([]); setTranscriptionStatus("idle"); setLyricsExpanded(false); setSceneSetting(""); setSavedCharacterIds({});
                    }}
                  />
                ) : renderStatus === "completed" && finalVideoUrl ? (
                  <div className="text-center">
                    {/* Celebration animation — fallback */}
                    <div className="relative mb-6">
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-r from-[#b8892a]/20 to-[#2e2e36]/20 animate-ping" style={{ animationDuration: '2s' }} />
                      </div>
                      <div className="relative w-20 h-20 rounded-full bg-gradient-to-r from-[#b8892a] to-[#2e2e36] flex items-center justify-center mx-auto shadow-lg shadow-[#b8892a]/30">
                        <Clapperboard className="w-10 h-10 text-white" />
                      </div>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2">Your story just came to life</h2>
                    <p className="text-white/50 mb-3 text-lg">All {totalScenes} scenes rendered and assembled with your audio track.</p>
                    <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
                      <WizBrandPostBadge layer="render" />
                      <WizBrandPostBadge layer="sound" />
                    </div>

                    {/* Video player */}
                    <div className="relative rounded-xl overflow-hidden mb-8 ring-1 ring-[--color-gold]/20">
                      <video
                        src={finalVideoUrl}
                        controls
                        autoPlay
                        muted
                        playsInline
                        className="w-full max-h-80 bg-black"
                      />
                    </div>

                    {/* Primary CTAs */}
                    <div className="flex gap-3 justify-center mb-8">
                      <Button
                        className="btn-sheen bg-gradient-to-r from-[#b8892a] to-[#2e2e36] hover:from-[#b8892a] hover:to-[#2e2e36] text-white px-6 h-12 text-base"
                        onClick={() => {
                          const video = document.querySelector('video');
                          if (video) { video.currentTime = 0; video.play(); }
                        }}
                      >
                        <Play className="w-5 h-5 mr-2" /> Play Video
                      </Button>
                      <Button
                        variant="outline"
                        className="border-[--color-gold]/30 text-[--color-gold] bg-[--color-gold]/15 hover:bg-[--color-gold]/15 px-6 h-12 text-base"
                        onClick={async () => {
                          if (!finalVideoUrl) return;
                          try {
                            // Fetch the video as a blob so the browser triggers a real download
                            const resp = await fetch(finalVideoUrl);
                            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                            const blob = await resp.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = `${title || 'wizai'}-${Date.now()}.mp4`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(blobUrl);
                          } catch {
                            // Fallback: open in new tab (user can save manually)
                            window.open(finalVideoUrl, '_blank');
                            toast.info('Video opened in new tab — right-click to save');
                          }
                        }}
                      >
                        <Download className="w-5 h-5 mr-2" /> Download
                      </Button>
                      <Button
                        variant="outline"
                        className="border-[rgba(184,137,42,0.12)]/50 text-white/50 bg-transparent hover:bg-[rgba(24,20,16,0.9)] px-4 h-12 text-sm"
                        title="Copy direct video link"
                        onClick={() => {
                          if (!finalVideoUrl) return;
                          navigator.clipboard.writeText(finalVideoUrl)
                            .then(() => toast.success('Video link copied to clipboard'))
                            .catch(() => toast.error('Could not copy link'));
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        Copy Link
                      </Button>
                      <Button
                        className="btn-sheen bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#b8892a] hover:to-[#4a3010] text-white px-6 h-12 text-base font-semibold shadow-lg shadow-[#b8892a]/30"
                        onClick={() => { setStep("upload"); setJobId(null); setAudioFile(null); setTitle(""); setThemePrompt(""); setGenre(""); setMood(""); setAudioDuration(0); setScenes([]); setFinalVideoUrl(null); setCharacters([]); setTranscriptionText(null); setTranscriptionSegments([]); setTranscriptionStatus("idle"); setLyricsExpanded(false); setSceneSetting(""); setSavedCharacterIds({}); }}
                      >
                        <Sparkles className="w-5 h-5 mr-2" /> Create Another Video
                      </Button>
                    </div>

                    {/* Upsell panel — multi-select with Stripe checkout */}
                    <div className="rounded-xl border border-[--color-gold]/30 bg-gradient-to-br from-[#b8892a]/20 to-zinc-900 p-6">
                      <h3 className="text-lg font-semibold text-[--color-gold] mb-1">Want to upgrade it?</h3>
                      <p className="text-sm text-white/50 mb-4">Select add-ons and checkout — or download as-is</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                        {/* Cinematic Scenes */}
                        <button
                          className={`flex items-center gap-3 rounded-lg border p-3 transition-all text-left group ${
                            upsellAddons.cinematicScenes
                              ? "border-[--color-gold]/30 bg-[--color-gold]/15 ring-1 ring-[--color-gold]/30"
                              : "border-[rgba(184,137,42,0.12)]/50 bg-[rgba(20,16,12,0.6)] hover:bg-[rgba(24,20,16,0.9)] hover:border-[--color-gold]/30"
                          }`}
                          onClick={() => setUpsellAddons(prev => ({ ...prev, cinematicScenes: !prev.cinematicScenes }))}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            upsellAddons.cinematicScenes ? "bg-[--color-gold]/15" : "bg-[--color-gold]/15 group-hover:bg-[--color-gold]/15"
                          }`}>
                            <Film className="w-5 h-5 text-[--color-gold]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">Cinematic Scenes</p>
                            <p className="text-xs text-white/40">+\u00a35</p>
                          </div>
                          {upsellAddons.cinematicScenes && <Check className="w-4 h-4 text-[--color-gold]" />}
                        </button>
                        {/* 4K Upgrade */}
                        <button
                          className={`flex items-center gap-3 rounded-lg border p-3 transition-all text-left group ${
                            upsellAddons.upgrade4K
                              ? "border-[--color-gold]/30 bg-[--color-gold]/15 ring-1 ring-amber-500/30"
                              : "border-[rgba(184,137,42,0.12)]/50 bg-[rgba(20,16,12,0.6)] hover:bg-[rgba(24,20,16,0.9)] hover:border-[--color-gold]/30"
                          }`}
                          onClick={() => setUpsellAddons(prev => ({ ...prev, upgrade4K: !prev.upgrade4K }))}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            upsellAddons.upgrade4K ? "bg-[--color-gold]/15" : "bg-[--color-gold]/15 group-hover:bg-[--color-gold]/15"
                          }`}>
                            <Zap className="w-5 h-5 text-[--color-gold]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">Upgrade to 4K</p>
                            <p className="text-xs text-white/40">+\u00a33</p>
                          </div>
                          {upsellAddons.upgrade4K && <Check className="w-4 h-4 text-[--color-gold]" />}
                        </button>
                        {/* Remove Watermark */}
                        <button
                          className={`flex items-center gap-3 rounded-lg border p-3 transition-all text-left group ${
                            upsellAddons.removeWatermark
                              ? "border-[--color-silver]/60 bg-[--color-silver]/10 ring-1 ring-emerald-500/30"
                              : "border-[rgba(184,137,42,0.12)]/50 bg-[rgba(20,16,12,0.6)] hover:bg-[rgba(24,20,16,0.9)] hover:border-[--color-silver]/40/30"
                          }`}
                          onClick={() => setUpsellAddons(prev => ({ ...prev, removeWatermark: !prev.removeWatermark }))}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                            upsellAddons.removeWatermark ? "bg-[--color-silver]/10" : "bg-[--color-silver]/10 group-hover:bg-[--color-silver]/10"
                          }`}>
                            <CheckCircle2 className="w-5 h-5 text-[--color-silver]" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">Remove Watermark</p>
                            <p className="text-xs text-white/40">+\u00a32</p>
                          </div>
                          {upsellAddons.removeWatermark && <Check className="w-4 h-4 text-[--color-silver]" />}
                        </button>
                      </div>
                      {/* Total + Checkout / Download as-is */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-white/50">
                          {upsellTotal > 0 ? (
                            <span>Total: <span className="text-[--color-gold] font-semibold">\u00a3{upsellTotal}</span></span>
                          ) : (
                            <span className="text-white/40">Select add-ons above</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[rgba(184,137,42,0.12)] text-white/50 bg-transparent hover:bg-[rgba(24,20,16,0.9)] text-xs"
                            onClick={async () => {
                              if (!finalVideoUrl) return;
                              try {
                                const resp = await fetch(finalVideoUrl);
                                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                                const blob = await resp.blob();
                                const blobUrl = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = blobUrl;
                                a.download = `${title || 'wizai'}-${Date.now()}.mp4`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(blobUrl);
                              } catch {
                                window.open(finalVideoUrl!, '_blank');
                                toast.info('Video opened in new tab — right-click to save');
                              }
                            }}
                          >
                            Download as-is
                          </Button>
                          <Button
                            size="sm"
                            disabled={upsellTotal === 0 || isUpsellCheckingOut}
                            className="bg-gradient-to-r from-[#b8892a] to-[#4a3010] hover:from-[#b8892a] hover:to-[#4a3010] text-white text-xs disabled:opacity-50"
                            onClick={handleUpsellCheckout}
                          >
                            {isUpsellCheckingOut ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                            Checkout £{upsellTotal}
                          </Button>
                        </div>
                      </div>
                    </div>
                    {/* Quality / WizSound upgrade panel */}
                    {jobId && <PostRenderUpgradeConnector jobId={jobId} />}
                    {/* Habit loop — encourage next creation */}
                    <HabitLoopPanel className="mt-4" />
                  </div>
                ) : renderStatus === "failed" ? (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                      <X className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Build Failed</h2>
                    <p className="text-white/50 mb-6">Some scenes could not be generated. Please try again.</p>
                    <Button
                      variant="outline"
                      className="border-[rgba(184,137,42,0.12)] text-white/70 bg-transparent hover:bg-[rgba(24,20,16,0.9)]"
                      onClick={() => setStep("storyboard")}
                    >
                      Back to Storyboard
                    </Button>
                  </div>
                ) : (
                  <div>
                    {/* Enhanced 5-stage pipeline — clapperboard header rail */}
                    {(() => {
                      const stages = [
                        { key: "queued",     label: "Analysing Audio",          icon: <Music2 className="w-4 h-4" /> },
                        { key: "rendering",  label: "Animating Scenes",         icon: <Clapperboard className="w-4 h-4" /> },
                        { key: "assembling", label: "Syncing Performance",      icon: <Layers className="w-4 h-4" /> },
                        { key: "wizsound",   label: "Enhancing Audio",          icon: <Sparkles className="w-4 h-4" /> },
                        { key: "completed",  label: "Building Final",          icon: <CheckCircle2 className="w-4 h-4" /> },
                      ];
                      const stageOrder = ["queued", "rendering", "assembling", "wizsound", "completed"];
                      // Map legacy "assembling" to cover wizsound too until server emits it
                      const effectiveStatus = renderStatus === "failed" ? "rendering" : renderStatus;
                      const currentIdx = stageOrder.indexOf(effectiveStatus);
                      return (
                        <>
                        {/* Clapperboard pipeline header rail */}
                        <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:16,overflow:'hidden',borderRadius:4,border:'1px solid rgba(20,184,166,0.15)'}}>
                          {/* Diagonal-stripe left badge */}
                          <div style={{width:20,height:32,flexShrink:0,background:'repeating-linear-gradient(45deg,#14b8a6 0px,#14b8a6 3px,#0a0a0a 3px,#0a0a0a 7px)'}} />
                          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(0,0,0,0.7)',height:32,padding:'0 12px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <Clapperboard style={{width:12,height:12,color:'#14b8a6',flexShrink:0}} />
                              <span style={{fontSize:9,fontWeight:700,letterSpacing:'2.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.55)',fontFamily:"'Courier Prime',monospace"}}>PRODUCTION PIPELINE</span>
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <span style={{fontSize:8,fontWeight:600,letterSpacing:'2px',textTransform:'uppercase',color:'rgba(255,255,255,0.25)',fontFamily:"'Courier Prime',monospace"}}>TAKE</span>
                              <span style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.6)',fontFamily:"'Courier Prime',monospace"}}>{String(completedScenes).padStart(2,'0')}/{String(totalScenes).padStart(2,'0')}</span>
                            </div>
                          </div>
                          {/* Diagonal-stripe right badge */}
                          <div style={{width:20,height:32,flexShrink:0,background:'repeating-linear-gradient(45deg,#14b8a6 0px,#14b8a6 3px,#0a0a0a 3px,#0a0a0a 7px)'}} />
                        </div>
                        <div className="flex items-center justify-between mb-8 px-2">
                          {stages.map((stage, i) => {
                            const isDone    = i < currentIdx;
                            const isCurrent = i === currentIdx;
                            return (
                              <div key={stage.key} className="flex items-center flex-1">
                                <div className="flex flex-col items-center gap-1">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 ${
                                    isDone    ? "bg-[--color-gold] text-white" :
                                    isCurrent ? "bg-[--color-gold]/15 text-[--color-gold] ring-2 ring-[--color-gold] ring-offset-2 ring-offset-zinc-900 animate-pulse" :
                                                "bg-[rgba(24,20,16,0.9)] text-white/30"
                                  }`}>
                                    {isDone ? <Check className="w-4 h-4" /> : stage.icon}
                                  </div>
                                  <span className={`text-xs font-medium whitespace-nowrap ${
                                    isDone    ? "text-[--color-gold]" :
                                    isCurrent ? "text-white" :
                                                "text-white/30"
                                  }`}>{stage.label}</span>
                                </div>
                                {i < stages.length - 1 && (
                                  <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all duration-700 ${
                                    i < currentIdx ? "bg-[--color-gold]" : "bg-[rgba(24,20,16,0.9)]"
                                  }`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        </>
                      );
                    })()}

                    {/* Main status header */}
                    <div className="text-center mb-6">
                      <div className="w-14 h-14 rounded-full bg-[--color-gold]/15 flex items-center justify-center mx-auto mb-3">
                        {renderStatus === "wizsound"
                          ? <Music2 className="w-7 h-7 text-[--color-gold] animate-pulse" />
                          : renderStatus === "assembling"
                          ? <Wand2 className="w-7 h-7 text-[--color-gold] animate-pulse" />
                          : <Film className="w-7 h-7 text-[--color-gold] animate-pulse" />}
                      </div>
                      <div className="flex justify-center mb-2">
                        {renderStatus === "wizsound"
                          ? <WizBrandBadge layer="sound" size="sm" animated />
                          : <WizBrandBadge layer="render" size="sm" animated />}
                      </div>
                      <h2 className="text-xl font-bold text-white mb-1">
                        {renderStatus === "wizsound" ? "Enhancing audio..."
                          : renderStatus === "assembling" ? "Building your animation..."
                          : "Generating your scenes..."}
                      </h2>
                      <p className="text-white/50 text-sm mb-3">
                        {renderStatus === "wizsound"
                          ? "WizSound™ is applying cinematic audio mastering to your final video..."
                          : renderStatus === "assembling"
                          ? "All scenes generated! Stitching clips together with your audio track..."
                          : `Generating ${totalScenes} cinematic scenes — this usually takes 5–15 minutes.`}
                      </p>
                      {/* Quality & audio tier badges */}
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[rgba(24,20,16,0.9)] border border-[rgba(184,137,42,0.12)] text-white/70 text-xs">
                          <Zap className="w-3 h-3 text-[--color-gold]" />
                          {totalScenes} scenes
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[rgba(24,20,16,0.9)] border border-[rgba(184,137,42,0.12)] text-white/70 text-xs">
                          <Clock className="w-3 h-3 text-[--color-gold]" />
                          {liveElapsed < 60
                            ? `${liveElapsed}s elapsed`
                            : `${Math.floor(liveElapsed / 60)}m ${liveElapsed % 60}s elapsed`}
                        </span>
                        {completedScenes > 0 && totalScenes > 0 && renderStatus === "rendering" && (() => {
                          const msPerScene = (liveElapsed * 1000) / completedScenes;
                          const remaining = (totalScenes - completedScenes) * msPerScene;
                          const remMin = Math.ceil(remaining / 60000);
                          return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[--color-gold]/15 border border-[--color-gold]/30 text-[--color-gold] text-xs">
                              <Info className="w-3 h-3" />
                              {remMin <= 1 ? "< 1 min left" : `~${remMin} min left`}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-5">
                      {(() => {
                        const pct = renderStatus === "wizsound" || renderStatus === "completed"
                          ? 100
                          : renderStatus === "assembling"
                          ? 95
                          : totalScenes > 0 ? Math.min(90, Math.round((completedScenes / totalScenes) * 90)) : 0;
                        const elapsedMin = Math.floor(liveElapsed / 60);
                        const elapsedSec = liveElapsed % 60;
                        const etaText = (() => {
                          if (completedScenes === 0 || totalScenes === 0 || renderStatus !== "rendering") return null;
                          const secPerScene = liveElapsed / completedScenes;
                          const remaining = (totalScenes - completedScenes) * secPerScene;
                          const remMin = Math.ceil(remaining / 60);
                          return remMin <= 1 ? "< 1 min remaining" : `~${remMin} min remaining`;
                        })();
                        const barGradient = renderStatus === "wizsound"
                          ? "linear-gradient(90deg, #7c3aed, #a855f7, #ec4899)"
                          : renderStatus === "assembling"
                          ? "linear-gradient(90deg, #7c3aed, #ec4899)"
                          : "linear-gradient(90deg, #6d28d9, #7c3aed, #a855f7)";
                        return (
                          <>
                            <div className="flex justify-between items-center text-sm mb-2">
                              <span className="text-white/70 font-medium">
                                {renderStatus === "wizsound" ? "Applying WizSound™ mastering"
                                  : renderStatus === "assembling" ? "Assembling final video"
                                  : `${completedScenes} / ${totalScenes} scenes`}
                                {failedScenes > 0 && (
                                  <span className="ml-2 text-red-400 text-xs">({failedScenes} failed)</span>
                                )}
                              </span>
                              <div className="flex items-center gap-3 text-white/40 text-xs">
                                {etaText && <span className="text-[--color-gold]">{etaText}</span>}
                                <span>{elapsedMin}:{String(elapsedSec).padStart(2, "0")} elapsed</span>
                                <span className="text-white/70 font-semibold">{pct}%</span>
                              </div>
                            </div>
                            <div className="relative h-3 bg-[rgba(24,20,16,0.9)] rounded-full overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                                style={{
                                  width: `${pct}%`,
                                  background: barGradient,
                                  backgroundSize: "200% 100%",
                                  animation: pct < 100 ? "shimmer 2s linear infinite" : "none",
                                }}
                              />
                              {/* Shimmer highlight overlay */}
                              {pct > 0 && pct < 100 && (
                                <div
                                  className="absolute inset-y-0 left-0 rounded-full pointer-events-none"
                                  style={{
                                    width: `${pct}%`,
                                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                                    backgroundSize: "200% 100%",
                                    animation: "shimmer 1.5s linear infinite",
                                  }}
                                />
                              )}
                            </div>
                            {/* Estimated file size */}
                            {totalScenes > 0 && (
                              <p className="text-white/30 text-xs mt-1.5 text-right">
                                Est. file size: ~{Math.round(totalScenes * 4.5)}MB
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Reassurance panel — safe to leave */}
                    <div className="mb-5 rounded-xl bg-gradient-to-r from-[#b8892a]/20 via-zinc-900 to-[#4a3010]/20 border border-[--color-gold]/30 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[--color-gold]/15 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4 text-[--color-gold]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white mb-1">Your render is in progress</p>
                          <p className="text-xs text-white/50 leading-relaxed">
                            You can safely leave this page or close the tab. We'll send you a browser notification and email when your video is ready.
                            {" "}Your progress is saved automatically.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Per-scene status grid */}
                    {totalScenes > 0 && (
                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-white/40 font-medium uppercase tracking-wide">Scene Status</p>
                          {failedScenes > 0 && jobId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs border-red-500/50 text-red-400 bg-transparent hover:bg-red-500/10 hover:text-red-300"
                              disabled={retryAllFailedScenesMutation.isPending}
                              onClick={async () => {
                                if (!jobId) return;
                                try {
                                  const result = await retryAllFailedScenesMutation.mutateAsync({ jobId });
                                  toast.success(`Retrying ${result.retriedCount} failed scene${result.retriedCount !== 1 ? "s" : ""}`);
                                  // Resume polling if it stopped
                                  isRenderingRef.current = true;
                                  setRenderStatus("rendering");
                                } catch (err: any) {
                                  toast.error("Retry failed", { description: err.message });
                                }
                              }}
                            >
                              {retryAllFailedScenesMutation.isPending
                                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Retrying...</>
                                : <><RefreshCw className="w-3 h-3 mr-1" /> Retry All Failed</>}
                            </Button>
                          )}
                        </div>

                        {/* Scene chips grid */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {(perSceneStatuses.length > 0 ? perSceneStatuses : Array.from({ length: totalScenes }, (_, i) => ({ id: i, index: i, status: "pending", errorMessage: null }))).map((scene) => (
                            <div
                              key={scene.id}
                              title={scene.status === "failed" && scene.errorMessage ? scene.errorMessage : `Scene ${scene.index + 1}: ${scene.status}`}
                              className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all duration-300 cursor-default ${
                                scene.status === "completed"  ? "bg-[--color-gold] text-white" :
                                scene.status === "generating" ? "bg-[--color-gold]/15 text-[--color-gold] ring-1 ring-[--color-gold] animate-pulse" :
                                scene.status === "failed"     ? "bg-red-500/20 text-red-400 ring-1 ring-red-500" :
                                                                "bg-[rgba(24,20,16,0.9)] text-white/30"
                              }`}
                            >
                              {scene.status === "completed"  ? <Check className="w-3 h-3" /> :
                               scene.status === "generating" ? <Loader2 className="w-3 h-3 animate-spin" /> :
                               scene.status === "failed"     ? <X className="w-3 h-3" /> :
                               <span>{scene.index + 1}</span>}
                            </div>
                          ))}
                        </div>

                        {/* Legend */}
                        <div className="flex gap-4 text-xs text-white/30 mb-3">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[rgba(24,20,16,0.9)] inline-block" /> Queued</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[--color-gold]/15 ring-1 ring-[--color-gold] inline-block" /> Generating</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[--color-gold] inline-block" /> Done</span>
                          {failedScenes > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/20 ring-1 ring-red-500 inline-block" /> Failed</span>}
                        </div>

                        {/* Failed scene detail cards with edit-before-retry */}
                        {perSceneStatuses.filter((s) => s.status === "failed").length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-red-400 font-medium">Failed Scenes</p>
                            {perSceneStatuses
                              .filter((s) => s.status === "failed")
                              .map((scene) => {
                                const isRetrying = retryingScenes.has(scene.id);
                                const isEditing = editingFailedSceneId === scene.id;
                                // Humanise the raw error message
                                const rawErr = scene.errorMessage ?? "Unknown error";
                                const friendlyErr = rawErr.includes("429") || rawErr.toLowerCase().includes("rate limit")
                                  ? "Rate limit reached — the AI rendering service was busy. Edit the prompt or retry to re-queue."
                                  : rawErr.includes("timeout") || rawErr.toLowerCase().includes("timed out")
                                  ? "Request timed out. The scene took too long to generate. Try simplifying the prompt."
                                  : rawErr.length > 200 ? rawErr.slice(0, 200) + "…" : rawErr;

                                return (
                                  <div
                                    key={scene.id}
                                    className="bg-red-500/5 border border-red-500/20 rounded-lg overflow-hidden"
                                  >
                                    {/* Header row */}
                                    <div className="flex items-start gap-3 p-3">
                                      {/* Scene number badge */}
                                      <div className="w-7 h-7 rounded-md bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                        {scene.index + 1}
                                      </div>

                                      {/* Error info */}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-red-300 mb-0.5">Scene {scene.index + 1} failed</p>
                                        <p className="text-xs text-white/50 leading-relaxed break-words">{friendlyErr}</p>
                                      </div>

                                      {/* Action buttons */}
                                      <div className="flex gap-1.5 shrink-0">
                                        {/* Edit button */}
                                        {!isEditing && !isRetrying && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2 text-xs border-zinc-600 text-white/70 bg-transparent hover:bg-[rgba(24,20,16,0.9)]"
                                            onClick={() => {
                                              setEditingFailedSceneId(scene.id);
                                              setEditFailedPrompt(scene.prompt ?? "");
                                              setEditFailedLyrics(scene.lyrics ?? "");
                                            }}
                                          >
                                            <Pencil className="w-3 h-3 mr-1" /> Edit
                                          </Button>
                                        )}

                                        {/* Retry (quick, no edit) */}
                                        {!isEditing && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2 text-xs border-red-500/40 text-red-400 bg-transparent hover:bg-red-500/10 hover:text-red-300"
                                            disabled={isRetrying}
                                            onClick={async () => {
                                              if (!jobId) return;
                                              setRetryingScenes((prev) => new Set(prev).add(scene.id));
                                              setPerSceneStatuses((prev) =>
                                                prev.map((s) => s.id === scene.id ? { ...s, status: "pending", errorMessage: null } : s)
                                              );
                                              try {
                                                await retryFailedSceneMutation.mutateAsync({ sceneId: scene.id, jobId });
                                                toast.success(`Scene ${scene.index + 1} re-queued for rendering`);
                                                isRenderingRef.current = true;
                                                setRenderStatus("rendering");
                                              } catch (err: any) {
                                                setPerSceneStatuses((prev) =>
                                                  prev.map((s) => s.id === scene.id ? { ...s, status: "failed", errorMessage: rawErr } : s)
                                                );
                                                setRetryingScenes((prev) => { const n = new Set(prev); n.delete(scene.id); return n; });
                                                toast.error("Retry failed", { description: err.message });
                                              }
                                            }}
                                          >
                                            {isRetrying
                                              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Retrying</>
                                              : <><RefreshCw className="w-3 h-3 mr-1" /> Retry</>}
                                          </Button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Inline edit form — shown when Edit is clicked */}
                                    {isEditing && (
                                      <div className="border-t border-red-500/20 bg-[rgba(10,8,6,0.95)]/60 p-3 space-y-3">
                                        <p className="text-xs text-white/50 font-medium">Edit scene before retrying</p>

                                        {/* Visual prompt */}
                                        <div>
                                          <div className="flex items-center justify-between mb-1">
                                            <Label className="text-xs text-white/50">Visual Prompt</Label>
                                            <span className={`text-xs ${
                                              editFailedPrompt.length > 1800 ? "text-red-400" :
                                              editFailedPrompt.length > 1400 ? "text-yellow-400" : "text-white/30"
                                            }`}>{editFailedPrompt.length}/2000</span>
                                          </div>
                                          <Textarea
                                            value={editFailedPrompt}
                                            onChange={(e) => setEditFailedPrompt(e.target.value)}
                                            placeholder="Describe the visual scene..."
                                            className="text-xs min-h-[80px] bg-[rgba(24,20,16,0.9)]/60 border-[rgba(184,137,42,0.12)] text-zinc-200 resize-none"
                                            maxLength={2000}
                                          />
                                          <p className="text-xs text-white/30 mt-1">Tip: shorter, clearer prompts often render more reliably.</p>
                                        </div>

                                        {/* Lyrics (optional) */}
                                        <div>
                                          <div className="flex items-center justify-between mb-1">
                                            <Label className="text-xs text-white/50">Lyrics <span className="text-white/30">(optional)</span></Label>
                                            <span className={`text-xs ${
                                              editFailedLyrics.length > 900 ? "text-red-400" : "text-white/30"
                                            }`}>{editFailedLyrics.length}/1000</span>
                                          </div>
                                          <Textarea
                                            value={editFailedLyrics}
                                            onChange={(e) => setEditFailedLyrics(e.target.value)}
                                            placeholder="Lyrics for this scene window (leave blank to keep current)"
                                            className="text-xs min-h-[50px] bg-[rgba(24,20,16,0.9)]/60 border-[rgba(184,137,42,0.12)] text-zinc-200 resize-none"
                                            maxLength={1000}
                                          />
                                        </div>

                                        {/* Save & Retry / Cancel */}
                                        <div className="flex gap-2 justify-end">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-3 text-xs border-[rgba(184,137,42,0.12)] text-white/50 bg-transparent hover:bg-[rgba(24,20,16,0.9)]"
                                            onClick={() => setEditingFailedSceneId(null)}
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="h-7 px-3 text-xs bg-[--color-gold] hover:bg-[--color-gold]/80 text-white"
                                            disabled={!editFailedPrompt.trim() || updateScenePromptMutation.isPending || isRetrying}
                                            onClick={async () => {
                                              if (!jobId || !editFailedPrompt.trim()) return;
                                              try {
                                                // 1. Persist the edited prompt
                                                await updateScenePromptMutation.mutateAsync({
                                                  sceneId: scene.id,
                                                  jobId,
                                                  prompt: editFailedPrompt.trim(),
                                                  lyrics: editFailedLyrics.trim() || undefined,
                                                });
                                                // 2. Update local perSceneStatuses with new prompt
                                                setPerSceneStatuses((prev) =>
                                                  prev.map((s) => s.id === scene.id
                                                    ? { ...s, prompt: editFailedPrompt.trim(), lyrics: editFailedLyrics.trim() || null }
                                                    : s
                                                  )
                                                );
                                                // 3. Close edit form
                                                setEditingFailedSceneId(null);
                                                // 4. Trigger retry with updated prompt
                                                setRetryingScenes((prev) => new Set(prev).add(scene.id));
                                                setPerSceneStatuses((prev) =>
                                                  prev.map((s) => s.id === scene.id ? { ...s, status: "pending", errorMessage: null } : s)
                                                );
                                                await retryFailedSceneMutation.mutateAsync({ sceneId: scene.id, jobId });
                                                toast.success(`Scene ${scene.index + 1} updated and re-queued`);
                                                isRenderingRef.current = true;
                                                setRenderStatus("rendering");
                                              } catch (err: any) {
                                                setPerSceneStatuses((prev) =>
                                                  prev.map((s) => s.id === scene.id ? { ...s, status: "failed", errorMessage: rawErr } : s)
                                                );
                                                setRetryingScenes((prev) => { const n = new Set(prev); n.delete(scene.id); return n; });
                                                toast.error("Save & Retry failed", { description: err.message });
                                              }
                                            }}
                                          >
                                            {(updateScenePromptMutation.isPending || isRetrying)
                                              ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving...</>
                                              : <><RefreshCw className="w-3 h-3 mr-1" /> Save & Retry</>}
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-white/30 text-xs text-center">
                      Each scene takes 1–3 minutes. You can leave this page — rendering continues in the background.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      </div>
      <LandscapeHint />
    </div>
  );
}

