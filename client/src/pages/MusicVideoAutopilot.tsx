import { useState, useRef, useCallback, useEffect } from "react";
import { useLocalStorage, useFormPersistence } from "@/hooks/useLocalStorage";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { calculateVideoCreditCost } from "../../../shared/const";
import { useCreditGuard } from "@/hooks/useCreditGuard";
import { LowCreditBanner } from "@/components/LowCreditBanner";
import InsufficientCreditsModal from "@/components/InsufficientCreditsModal";
import CinematicUpsellModal, { CinematicScene } from "@/components/CinematicUpsellModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import AuthGate from "@/components/AuthGate";
import { CharacterManager, type Character } from "@/components/CharacterManager";
import CreditBalance from "@/components/CreditBalance";
import { Link } from "wouter";
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
} from "lucide-react";

type Step = "upload" | "storyboard" | "render";

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
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function MusicVideoAutopilot() {
  const { user, isAuthenticated } = useAuth();
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [jobId, setJobId] = useState<number | null>(null);

  // Step 1: Upload form state - PERSISTED TO LOCALSTORAGE
  const [title, setTitle] = useLocalStorage("musicVideo_title", "");
  const [audioDuration, setAudioDuration] = useLocalStorage("musicVideo_duration", 0);
  const [themePrompt, setThemePrompt] = useLocalStorage("musicVideo_theme", "");
  const [genre, setGenre] = useLocalStorage("musicVideo_genre", "");
  const [mood, setMood] = useLocalStorage("musicVideo_mood", "");
  const [selectedStyle, setSelectedStyle] = useLocalStorage("musicVideo_style", "cinematic");
  const [transcriptionText, setTranscriptionText] = useLocalStorage<string | null>("musicVideo_lyrics", null);
  const [audioFile, setAudioFile] = useState<File | null>(null); // Files can't be persisted
  const [uploadProgress, setUploadProgress] = useState<number>(0); // 0-100 for upload progress bar
  const [isUploading, setIsUploading] = useState(false);

  // Multi-character state (replaces single character + lip sync) - PERSISTED
  const [characters, setCharacters] = useLocalStorage<Character[]>("musicVideo_characters", []);

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
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-cinematic-UvoChSsK7xZ9a7MR2bUHeq.webp",
    },
    {
      id: "anime",
      label: "Anime",
      desc: "Japanese animation style",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-anime-bCLhyWeYo6mek5pWMnEUV7.webp",
    },
    {
      id: "pixar3d",
      label: "Pixar 3D",
      desc: "Vibrant 3D animation",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-pixar3d-eN2z5fKQJJTuTc3Ghd84dV.webp",
    },
    {
      id: "documentary",
      label: "Documentary",
      desc: "Authentic & raw footage",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-documentary-nyjoHJnTHZU2hdjABnnjBm.webp",
    },
    {
      id: "abstract",
      label: "Abstract",
      desc: "Artistic visual journey",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-abstract-E9NdxWuFeAHfGRiGpsbW9Y.webp",
    },
    {
      id: "vintage",
      label: "Vintage",
      desc: "Retro film aesthetic",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-vintage-iCZFjq9buUWkDWVxu3J7Qy.webp",
    },
    {
      id: "neon_noir",
      label: "Neon Noir",
      desc: "Dark cyberpunk neon glow",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-neon-noir-XR46whfoD5cgi3ADa8iDDe.webp",
    },
    {
      id: "disney",
      label: "Disney",
      desc: "Magical Disney animation",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-disney-n4CZF3mgReCEjogjqRoDKz.webp",
    },
    {
      id: "epic_fantasy",
      label: "Epic Fantasy",
      desc: "Dramatic magical landscapes",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-epic-fantasy-aaR23m63VQcBx6VzTSa7jJ.webp",
    },
    {
      id: "realistic",
      label: "Realistic",
      desc: "True-to-life photorealism",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-realistic-2wim9Wp8GGSWcE5kbukVwX.webp",
    },
    {
      id: "horror",
      label: "Horror",
      desc: "Dark, eerie & atmospheric",
      image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-horror-gsFZakWZNY3wasPTthWDBJ.webp",
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
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref guard to prevent double-click / React re-render duplicate render submissions
  const isRenderingRef = useRef(false);

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
  const [isUpgradingCinematic, setIsUpgradingCinematic] = useState(false);
  const cinematicUpgradeMutation = trpc.musicVideo.cinematicUpgrade.useMutation();
  const pollProgress = trpc.musicVideo.pollProgress.useMutation();
  const generateScenePreviewMutation = trpc.musicVideo.generateScenePreview.useMutation();
  const saveCharactersMutation = trpc.characters.saveCharacters.useMutation();
  const lockCharacterMutation = trpc.characters.lockCharacter.useMutation();
  const analysePhotoMutation = trpc.characters.analysePhoto.useMutation();
  const updateSceneLipSyncMutation = trpc.musicVideo.updateSceneLipSync.useMutation();
  const updateAllScenesLipSyncMutation = trpc.musicVideo.updateAllScenesLipSync.useMutation();
  const updateSceneLipSyncStyleMutation = trpc.musicVideo.updateSceneLipSyncStyle.useMutation();
  const regenerateSceneMutation = trpc.musicVideo.regenerateScene.useMutation();
  const retryFailedSceneMutation = trpc.musicVideo.retryFailedScene.useMutation();
  const retryAllFailedScenesMutation = trpc.musicVideo.retryAllFailedScenes.useMutation();
  const updateScenePromptMutation = trpc.musicVideo.updateScenePrompt.useMutation();

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
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, regenerating: true, status: "generating" } : s));
    try {
      await regenerateSceneMutation.mutateAsync({ sceneId, jobId });
      toast.success("Scene regeneration started", { description: "This scene will be re-rendered independently." });
    } catch (err: any) {
      setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, regenerating: false, status: "failed" } : s));
      toast.error("Failed to regenerate scene", { description: err.message });
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
    if (!audioFile || !title || !themePrompt) {
      toast.error("Missing fields", { description: "Please fill in all required fields and upload your song." });
      return;
    }

    const UPLOAD_TOAST_ID = "uploading-song";
    try {
      // Convert audio file to base64
      const arrayBuffer = await audioFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) binary += String.fromCharCode(uint8Array[i]);
      const base64 = btoa(binary);
      const mimeType = audioFile.type.includes("wav") ? "audio/wav" :
                       audioFile.type.includes("mp4") || audioFile.name.endsWith(".m4a") ? "audio/mp4" : "audio/mpeg";

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
        audioBase64: base64,
        audioMimeType: mimeType as any,
        audioDuration,
        themePrompt: enrichedThemePrompt,
        genre: genre || undefined,
        mood: mood || undefined,
        characterImageBase64,
        characterImageMimeType: characterImageMimeType as any,
        enableLipSync,
      });

      setJobId(result.jobId);
      setTotalScenes(result.sceneCount);

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
              photos: c.photos.map((p) => ({
                photoBase64: p.base64,
                photoMimeType: p.mimeType,
                isPrimary: p.isPrimary,
              })),
            })),
          });
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
                  toast.loading(`Analysing ${char.name}'s appearance...`, { id: `analyse-${char.slotIndex}` });
                  const analysis = await analysePhotoMutation.mutateAsync({
                    characterId: saved.id,
                    photoUrl: primaryPhotoUrl,
                  });

                  // Auto-lock with the AI-generated description
                  const description = char.lockedDescription.trim() || analysis.description;
                  await lockCharacterMutation.mutateAsync({
                    characterId: saved.id,
                    lockedDescription: description,
                  });
                  toast.success(`${char.name} locked`, {
                    id: `analyse-${char.slotIndex}`,
                    description: "Appearance analysed and locked from your photo.",
                  });
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
      // Dismiss the upload toast — song is uploaded, now moving to storyboard generation
      toast.dismiss(UPLOAD_TOAST_ID);
      setStoryboardGenerating(true);
      const STORYBOARD_TOAST_ID = "storyboard-generating";
      toast.loading("Generating storyboard...", { id: STORYBOARD_TOAST_ID, description: "Our AI director is crafting your scenes." });
      const storyboard = await generateStoryboardMutation.mutateAsync({ jobId: result.jobId });
      setScenes(storyboard.scenes.map((s: any) => ({ ...s, id: s.sceneIndex, status: "pending" })));
      // Dismiss the loading toast and overlay — scenes are ready
      toast.dismiss(STORYBOARD_TOAST_ID);
      setStoryboardGenerating(false);
      // Fetch actual scene IDs from server
      setStep("storyboard");
      toast.success("Storyboard ready!", { description: `${storyboard.scenes.length} scenes created. Review and edit before rendering.` });
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
  // Fetch full job data (with real scene IDs) after moving to storyboard stepp
  const jobQuery = trpc.musicVideo.getJob.useQuery(
    { jobId: jobId! },
    { enabled: !!jobId && step === "storyboard" }
  );

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
      }));
      setScenes(mappedScenes);
      // Trigger image generation for scenes that don't have a preview yet
      mappedScenes.forEach((scene) => {
        if (!scene.previewImageUrl && jobId) {
          generateScenePreviewMutation.mutateAsync({ sceneId: scene.id, jobId })
            .then(({ imageUrl }) => {
              if (imageUrl) {
                setScenes(prev => prev.map(s =>
                  s.id === scene.id ? { ...s, previewImageUrl: imageUrl, previewImageLoading: false } : s
                ));
              } else {
                setScenes(prev => prev.map(s =>
                  s.id === scene.id ? { ...s, previewImageLoading: false } : s
                ));
              }
            })
            .catch(() => {
              setScenes(prev => prev.map(s =>
                s.id === scene.id ? { ...s, previewImageLoading: false } : s
              ));
            });
        }
      });
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

  const handleRegenerateStoryboard = async () => {
    if (!jobId) return;
    const REGEN_TOAST_ID = "storyboard-regenerating";
    try {
      setStoryboardGenerating(true);
      toast.loading("Regenerating storyboard...", { id: REGEN_TOAST_ID, description: "Our AI director is crafting your scenes." });
      const storyboard = await generateStoryboardMutation.mutateAsync({ jobId });
      setScenes(storyboard.scenes.map((s: any) => ({ ...s, id: s.sceneIndex, status: "pending" })));
      toast.dismiss(REGEN_TOAST_ID);
      setStoryboardGenerating(false);
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
    // Credit guard: check if user can afford this render
    if (!checkCanAfford(creditCost, "render this video")) {
      setShowInsufficientCredits(true);
      return;
    }
    isRenderingRef.current = true;

    try {
      const result = await startRender.mutateAsync({ jobId });
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
              // Show cinematic upsell modal after a short delay
              setTimeout(() => setShowCinematicUpsell(true), 1500);
              // Check if credits are now low
              setTimeout(() => checkLowCredits(), 3000);
              return; // stop polling
            }

            if (progress.status === "failed") {
              isRenderingRef.current = false;
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
              toast.warning("Rendering is busy right now.", {
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

      if (is429) {
        toast.error("Rendering is busy right now.", {
          description: "The AI rendering service is at capacity. Please wait a moment and try again.",
        });
      } else {
        toast.error("Failed to start render", { description: err.message });
      }
    }
  };

  // Show UI first, gate generate action behind auth

  // Use explicit storyboardGenerating state (not mutation.isPending) to avoid the overlay
  // persisting after scenes have already been received and rendered
  const isGeneratingStoryboard = storyboardGenerating;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Auth Gate */}
      <AuthGate open={showAuthGate} onClose={() => setShowAuthGate(false)} featureName="create your music video" />
      {/* ===== STORYBOARD GENERATION PROGRESS OVERLAY ===== */}
      {isGeneratingStoryboard && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm">
          <div className="w-full max-w-md px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-6">
              <Film className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Creating Your Storyboard</h2>
            <p className="text-zinc-400 text-sm mb-8">Our AI director is casting characters and crafting your scenes. This takes about 60–120 seconds.</p>
            <div className="w-full bg-zinc-800 rounded-full h-2 mb-8 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-[5000ms] ease-out"
                style={{ width: createJob.isPending ? "15%" : "75%" }}
              />
            </div>
            <div className="space-y-2.5 text-left">
              {[
                { label: "Uploading your song", done: !createJob.isPending, active: createJob.isPending },
                { label: "Transcribing lyrics", done: false, active: !createJob.isPending },
                { label: "Casting characters & defining appearances", done: false, active: !createJob.isPending },
                { label: "Crafting scene descriptions", done: false, active: !createJob.isPending },
                { label: "Building your storyboard", done: false, active: !createJob.isPending },
              ].map((s, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                  s.done ? "bg-green-900/30 border-green-700/30" :
                  s.active ? "bg-purple-900/40 border-purple-600/40" :
                  "bg-zinc-900/50 border-zinc-800/50"
                }`}>
                  {s.done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  ) : s.active ? (
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-zinc-600 shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${
                    s.done ? "text-green-400" : s.active ? "text-purple-300" : "text-zinc-500"
                  }`}>{s.label}</span>
                </div>
              ))}
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
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Top nav row: Home + Dashboard links */}
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <Link href="/dashboard" className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-sm">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.05em" }}>
                MUSIC VIDEO WIZPILOT
              </h1>
              <p className="text-zinc-400 text-sm">Upload your song. Describe your vision. We'll create the video.</p>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-4">
            {(["upload", "storyboard", "render"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  step === s ? "bg-purple-600 text-white" :
                  (["upload", "storyboard", "render"].indexOf(step) > i) ? "bg-zinc-700 text-zinc-300" :
                  "bg-zinc-900 text-zinc-500"
                }`}>
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">{i + 1}</span>
                  <span className="capitalize hidden sm:inline">{s === "upload" ? "Upload & Theme" : s === "storyboard" ? "Review Storyboard" : "Render & Download"}</span>
                </div>
                {i < 2 && <ChevronRight className="w-4 h-4 text-zinc-600" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ===== STEP 1: UPLOAD ===== */}
        {step === "upload" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Audio Upload */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Upload className="w-5 h-5 text-purple-400" />
                    Upload Your Song
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragging ? "border-purple-500 bg-purple-500/10" :
                      audioFile ? "border-green-500 bg-green-500/10" :
                      "border-zinc-700 hover:border-zinc-500"
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
                            <Loader2 className="w-10 h-10 text-purple-400 mx-auto mb-2 animate-spin" />
                            <p className="text-purple-400 font-medium">Uploading & Processing...</p>
                            <Progress value={uploadProgress} className="h-2" />
                            <p className="text-zinc-400 text-sm text-center">{uploadProgress}% complete</p>
                          </div>
                        ) : (
                          <div>
                            <Check className="w-10 h-10 text-green-400 mx-auto mb-2" />
                            <p className="text-green-400 font-medium">{audioFile.name}</p>
                            <p className={`text-sm mt-1 ${audioExceedsLimit ? "text-amber-400 font-medium" : "text-zinc-400"}`}>
                              Duration: {formatDuration(audioDuration)}
                              {audioExceedsLimit && ` — exceeds your ${formatDuration(maxVideoSeconds)} plan limit`}
                            </p>
                            <p className="text-zinc-500 text-xs mt-1">Click to change</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Music className="w-10 h-10 text-zinc-500 mx-auto mb-2" />
                        <p className="text-zinc-300 font-medium">Drop your song here</p>
                        <p className="text-zinc-500 text-sm mt-1">MP3, WAV, M4A · Max 100MB · Max 6 minutes</p>
                      </div>
                    )}
                  </div>

                  {/* Audio length limit warning + upgrade prompt */}
                  {audioExceedsLimit && (
                    <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 px-4 py-3 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-amber-300 font-medium text-sm">
                          Your song is {formatDuration(audioDuration)} — your plan allows up to {formatDuration(maxVideoSeconds)}
                        </p>
                        <p className="text-amber-200/70 text-xs mt-1">
                          WizVid will use the first {formatDuration(maxVideoSeconds)} of your track.
                          {planLimits?.plan === "starter" && " Upgrade to Pro for 2-minute videos, or Creator+ for 3-minute videos."}
                          {planLimits?.plan === "pro" && " Upgrade to Creator+ for 3-minute videos."}
                        </p>
                        <a
                          href="/pricing"
                          className="inline-block mt-2 text-xs font-semibold text-amber-300 hover:text-amber-100 underline underline-offset-2 transition-colors"
                        >
                          View upgrade options →
                        </a>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-zinc-300">Song Title *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Midnight Dreams"
                      className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  {/* Lyrics / Transcription Panel — shows as soon as audio is selected */}
                  {transcriptionStatus !== "idle" && (
                    <div className="rounded-xl border border-zinc-700 overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 hover:bg-zinc-750 transition-colors"
                        onClick={() => setLyricsExpanded(!lyricsExpanded)}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-400" />
                          <span className="text-sm font-medium text-white">Detected Lyrics</span>
                          {transcriptionStatus === "transcribing" ? (
                            <Badge className="bg-yellow-900/50 text-yellow-300 border-yellow-800 text-xs">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Transcribing...
                            </Badge>
                          ) : transcriptionStatus === "done" ? (
                            <Badge className="bg-green-900/50 text-green-300 border-green-800 text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              Ready
                            </Badge>
                          ) : transcriptionStatus === "quota" ? (
                            <Badge className="bg-orange-900/50 text-orange-300 border-orange-800 text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Service busy
                            </Badge>
                          ) : (
                            <Badge className="bg-zinc-700 text-zinc-400 text-xs">Not available</Badge>
                          )}
                        </div>
                        {lyricsExpanded ? (
                          <ChevronUp className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        )}
                      </button>
                      {lyricsExpanded && (
                        <div className="px-4 py-3 bg-zinc-900/50">
                          {transcriptionStatus === "done" && transcriptionText ? (
                            <div className="space-y-2">
                              {!isEditingLyrics ? (
                                <div className="space-y-2">
                                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-zinc-800/50 p-3 rounded">
                                    {transcriptionText}
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsEditingLyrics(true)}
                                    className="w-full text-xs"
                                  >
                                    <Pencil className="w-3 h-3 mr-1" />
                                    Edit Lyrics
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Textarea
                                    value={transcriptionText}
                                    onChange={(e) => setTranscriptionText(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 text-white text-sm min-h-[100px]"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => setIsEditingLyrics(false)}
                                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
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
                            <div className="flex items-center gap-2 text-zinc-400 text-sm py-2">
                              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                              <span>AI is transcribing your song's lyrics... This takes 30–60 seconds.</span>
                            </div>
                          ) : transcriptionStatus === "quota" ? (
                            <div className="flex items-start gap-2 text-sm py-2">
                              <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-orange-300 font-medium">AI service temporarily busy</p>
                                <p className="text-zinc-400 mt-0.5">Lyrics could not be transcribed right now. You can still generate a storyboard from your theme description. Try again in a few minutes.</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-zinc-500 text-sm py-2">
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
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-pink-400" />
                    Describe Your Vision
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-zinc-300">Theme & Concept *</Label>
                    <Textarea
                      value={themePrompt}
                      onChange={(e) => setThemePrompt(e.target.value)}
                      placeholder="Describe the visual story you want. E.g. 'A lone astronaut drifting through a neon galaxy, searching for home. Dark and cinematic with purple and blue tones. Emotional and introspective.'"
                      className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[120px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-zinc-300">Genre</Label>
                      <Input
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        placeholder="e.g. Indie Rock, EDM, R&B"
                        className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300">Mood</Label>
                      <Input
                        value={mood}
                        onChange={(e) => setMood(e.target.value)}
                        placeholder="e.g. Dark, Euphoric, Melancholic"
                        className="mt-1 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                      />
                    </div>
                  </div>

                  {/* Video Style Picker */}
                  <div>
                    <Label className="text-zinc-300 mb-3 block">Video Style</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {VIDEO_STYLES.map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setSelectedStyle(style.id)}
                          className={`relative rounded-xl overflow-hidden text-left transition-all focus:outline-none group ${
                            selectedStyle === style.id
                              ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-zinc-900"
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
                            <div className={`absolute inset-0 transition-opacity ${
                              selectedStyle === style.id
                                ? "bg-purple-900/40"
                                : "bg-black/40 group-hover:bg-black/20"
                            }`} />
                            {/* Selected checkmark */}
                            {selectedStyle === style.id && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          {/* Label */}
                          <div className={`px-3 py-2 ${
                            selectedStyle === style.id ? "bg-purple-900/60" : "bg-zinc-800"
                          }`}>
                            <p className={`text-sm font-semibold ${
                              selectedStyle === style.id ? "text-purple-200" : "text-white"
                            }`}>{style.label}</p>
                            <p className="text-xs text-zinc-400">{style.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Characters & Lip Sync — multi-character */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-400" />
                    Characters & Lip Sync
                    <Badge variant="outline" className="border-zinc-600 text-zinc-400 text-xs ml-1">Optional · Up to 4</Badge>
                  </CardTitle>
                  <p className="text-zinc-500 text-xs mt-1">
                    Add up to 4 characters with reference photos. The AI will use their appearance consistently across all scenes.
                  </p>
                </CardHeader>
                <CardContent>
                  <CharacterManager
                    characters={characters}
                    onChange={setCharacters}
                    maxCharacters={4}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Summary sidebar */}
            <div className="space-y-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white text-base">Video Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Duration</span>
                    <span className="text-white">{audioDuration > 0 ? formatDuration(audioDuration) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 flex items-center gap-1.5"><Film className="w-4 h-4" /> Scenes</span>
                    <span className="text-white">{sceneCount > 0 ? sceneCount : "—"}</span>
                  </div>
                  {/* Credit cost breakdown */}
                  {audioDuration > 0 && (
                    <div className="border-t border-zinc-800 pt-3 space-y-2">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Credit Breakdown</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Standard video</span>
                        <span className="text-white">{creditBreakdown.base} Credits</span>
                      </div>
                      {hasLipSync && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400 flex items-center gap-1.5"><Mic className="w-3.5 h-3.5" /> Lip sync</span>
                          <span className="text-pink-400">+{creditBreakdown.lipSync} Credits</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm border-t border-zinc-800 pt-2 mt-1">
                        <span className="text-zinc-200 font-semibold">Total</span>
                        <span className="text-violet-300 font-bold">{creditBreakdown.total} Credits</span>
                      </div>
                    </div>
                  )}
                  {characters.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400 flex items-center gap-1.5"><User className="w-4 h-4" /> Characters</span>
                      <span className="text-blue-400">{characters.length} added</span>
                    </div>
                  )}
                  <div className="border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                    Storyboard generation is free &amp; unlimited. Credits are only used when you start rendering.
                  </div>
                </CardContent>
              </Card>

              <CreditBalance variant="card" cost={creditCost > 0 ? creditCost : undefined} />
              {/* Low credit warning — shown when balance is low or insufficient for this video */}
              <LowCreditBanner
                balance={creditBalance}
                estimatedCost={creditCost > 0 ? creditCost : undefined}
                variant="inline"
                dismissible
              />
              <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-800/50">
                <CardContent className="pt-4 pb-4">
                  <p className="text-purple-300 text-sm font-medium mb-1">How it works</p>
                  <ol className="text-zinc-400 text-xs space-y-1.5 list-decimal list-inside">
                    <li>Upload your song & describe your vision</li>
                    <li>AI transcribes lyrics & generates a free storyboard</li>
                    <li>Review & edit any scene prompts</li>
                    <li>Render all scenes (credits charged here)</li>
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
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3"
                onClick={() => { setQuotaError(null); handleUploadAndGenerate(); }}
                disabled={createJob.isPending || generateStoryboardMutation.isPending || !audioFile || !title || !themePrompt}
              >
                {createJob.isPending || generateStoryboardMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Storyboard...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate Free Storyboard</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP 2: STORYBOARD ===== */}
        {step === "storyboard" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Your Storyboard</h2>
                <p className="text-zinc-400 text-sm mt-1">{scenes.length} scenes · Review and edit any scene before rendering</p>
              </div>
              <div className="flex items-center gap-3">
                <CreditBalance variant="badge" />
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
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
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  onClick={handleStartRender}
                  disabled={startRender.isPending || scenes.length === 0}
                >
                  {startRender.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
                  ) : (
                    <><Film className="w-4 h-4 mr-2" /> Render Video ({creditCost} credits)</>
                  )}
                </Button>
              </div>
            </div>

            {/* Pre-render cinematic upgrade nudge */}
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-950/30 to-orange-950/20 px-4 py-3">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-200 flex-1">
                <span className="font-semibold">These scenes will render in standard quality.</span>{" "}
                After rendering, you can upgrade key scenes to cinematic quality for a professional finish.
              </p>
            </div>

            {/* Global Lip Sync Control */}
            <div className="mb-4 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <Mic className="w-4 h-4 text-pink-400" />
                <div>
                  <p className="text-sm font-medium text-white">Lip Sync — All Scenes</p>
                  <p className="text-xs text-zinc-500">Control when characters sing or stay cinematic</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className={`text-xs border-zinc-700 bg-transparent ${
                    globalLipSync === false ? "border-zinc-500 text-zinc-300" : "text-zinc-500"
                  } hover:bg-zinc-800`}
                  onClick={() => handleGlobalLipSyncToggle(false)}
                  disabled={updateAllScenesLipSyncMutation.isPending}
                >
                  <X className="w-3 h-3 mr-1" /> Off for all
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`text-xs border-zinc-700 bg-transparent ${
                    globalLipSync === true ? "border-pink-500 text-pink-300" : "text-zinc-500"
                  } hover:bg-zinc-800`}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scenes.map((scene) => (
                <Card key={scene.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 transition-colors overflow-hidden">
                  {/* Scene preview image */}
                  <div className="relative w-full aspect-video bg-zinc-800">
                    {scene.previewImageUrl ? (
                      <img
                        src={scene.previewImageUrl}
                        alt={`Scene ${scene.sceneIndex + 1} preview`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {scene.previewImageLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                            <span className="text-zinc-500 text-xs">Generating preview...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Film className="w-6 h-6 text-zinc-600" />
                            <span className="text-zinc-600 text-xs">No preview</span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Scene number overlay */}
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-black/70 text-white border-0 text-xs backdrop-blur-sm">
                        Scene {scene.sceneIndex + 1}
                      </Badge>
                    </div>
                    {/* Duration overlay */}
                    <div className="absolute bottom-2 right-2">
                      <span className="text-xs text-white/80 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                        {formatTime(scene.startTime)} · {scene.duration}s
                      </span>
                    </div>
                  </div>
                  <CardContent className="pt-3 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {scene.visualStyle && (
                          <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                            {scene.visualStyle}
                          </Badge>
                        )}
                      </div>
                      {/* Regenerate button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-zinc-500 hover:text-purple-300 hover:bg-zinc-800 text-xs -mr-1 shrink-0"
                        onClick={() => handleRegenerateScene(scene.id)}
                        disabled={scene.regenerating || regenerateSceneMutation.isPending}
                        title="Regenerate this scene only"
                      >
                        {scene.regenerating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                      </Button>
                    </div>

                    {/* Lyrics for this scene */}
                    {scene.lyrics && (
                      <div className="mb-3 px-3 py-2 rounded-lg bg-purple-900/20 border border-purple-800/40">
                        <p className="text-purple-300 text-xs font-medium mb-1 flex items-center gap-1">
                          <Mic className="w-3 h-3" /> Lyrics
                        </p>
                        <p className="text-zinc-300 text-xs italic leading-relaxed">"{scene.lyrics}"</p>
                      </div>
                    )}

                    {editingSceneId === scene.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-white text-sm min-h-[100px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={() => handleSaveEdit(scene.id)}
                            disabled={updateScene.isPending}
                          >
                            <Check className="w-3 h-3 mr-1" /> Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-800"
                            onClick={() => setEditingSceneId(null)}
                          >
                            <X className="w-3 h-3 mr-1" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3">{scene.prompt}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 -ml-2 text-xs"
                          onClick={() => { setEditingSceneId(scene.id); setEditPrompt(scene.prompt); }}
                        >
                          <Pencil className="w-3 h-3 mr-1" /> Edit prompt
                        </Button>
                      </div>
                    )}

                    {/* Lip Sync toggle + style selector */}
                    <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2.5">
                      {/* Toggle row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mic className={`w-3.5 h-3.5 ${scene.lipSync ? "text-pink-400" : "text-zinc-600"}`} />
                          <span className={`text-xs font-medium ${scene.lipSync ? "text-pink-300" : "text-zinc-500"}`}>
                            Lip Sync
                          </span>
                          <Badge
                            className={`text-xs px-1.5 py-0 ${
                              scene.lipSync
                                ? "bg-pink-900/40 text-pink-300 border-pink-800/60"
                                : "bg-zinc-800 text-zinc-500 border-zinc-700"
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
                        <TooltipProvider delayDuration={200}>
                          <div className="space-y-1">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium">Style</p>
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
                                          ? "bg-pink-900/50 border-pink-600 text-pink-200 font-semibold"
                                          : "bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
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
                        </TooltipProvider>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ===== STEP 3: RENDER ===== */}
        {step === "render" && (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-8 pb-8">
                {renderStatus === "completed" && finalVideoUrl ? (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Your Music Video is Ready!</h2>
                    <p className="text-zinc-400 mb-6">All {totalScenes} scenes have been rendered and assembled with your audio track.</p>

                    <video
                      src={finalVideoUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full rounded-xl mb-6 max-h-80 bg-black"
                    />

                    <div className="flex gap-3 justify-center">
                      <a href={finalVideoUrl} download target="_blank" rel="noopener noreferrer">
                        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8">
                          <Download className="w-4 h-4 mr-2" /> Download Video
                        </Button>
                      </a>
                      <Button
                        variant="outline"
                        className="border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-800"
                        onClick={() => { setStep("upload"); setJobId(null); setAudioFile(null); setTitle(""); setThemePrompt(""); setGenre(""); setMood(""); setAudioDuration(0); setScenes([]); setFinalVideoUrl(null); setCharacters([]); setTranscriptionText(null); setTranscriptionSegments([]); setTranscriptionStatus("idle"); setLyricsExpanded(false); }}
                      >
                        Create Another
                      </Button>
                    </div>
                  </div>
                ) : renderStatus === "failed" ? (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                      <X className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Render Failed</h2>
                    <p className="text-zinc-400 mb-6">Some scenes could not be generated. Please try again.</p>
                    <Button
                      variant="outline"
                      className="border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-800"
                      onClick={() => setStep("storyboard")}
                    >
                      Back to Storyboard
                    </Button>
                  </div>
                ) : (
                  <div>
                    {/* Stage pipeline */}
                    {(() => {
                      const stages = [
                        { key: "queued",     label: "Queued",           icon: <Clock className="w-4 h-4" /> },
                        { key: "rendering",  label: "Generating Scenes", icon: <Clapperboard className="w-4 h-4" /> },
                        { key: "assembling", label: "Assembling",        icon: <Layers className="w-4 h-4" /> },
                        { key: "completed",  label: "Complete",          icon: <CheckCircle2 className="w-4 h-4" /> },
                      ];
                      const stageOrder = ["queued", "rendering", "assembling", "completed"];
                      const currentIdx = stageOrder.indexOf(renderStatus === "failed" ? "rendering" : renderStatus);
                      return (
                        <div className="flex items-center justify-between mb-8 px-2">
                          {stages.map((stage, i) => {
                            const isDone    = i < currentIdx;
                            const isCurrent = i === currentIdx;
                            const isPending = i > currentIdx;
                            return (
                              <div key={stage.key} className="flex items-center flex-1">
                                <div className="flex flex-col items-center gap-1">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 ${
                                    isDone    ? "bg-purple-600 text-white" :
                                    isCurrent ? "bg-purple-500/30 text-purple-300 ring-2 ring-purple-500 ring-offset-2 ring-offset-zinc-900" :
                                                "bg-zinc-800 text-zinc-600"
                                  }`}>
                                    {isDone ? <Check className="w-4 h-4" /> : stage.icon}
                                  </div>
                                  <span className={`text-xs font-medium whitespace-nowrap ${
                                    isDone    ? "text-purple-400" :
                                    isCurrent ? "text-white" :
                                                "text-zinc-600"
                                  }`}>{stage.label}</span>
                                </div>
                                {i < stages.length - 1 && (
                                  <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all duration-700 ${
                                    i < currentIdx ? "bg-purple-600" : "bg-zinc-800"
                                  }`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Main status header */}
                    <div className="text-center mb-6">
                      <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                        {renderStatus === "assembling"
                          ? <Wand2 className="w-7 h-7 text-purple-400 animate-pulse" />
                          : <Film className="w-7 h-7 text-purple-400 animate-pulse" />}
                      </div>
                      <h2 className="text-xl font-bold text-white mb-1">
                        {renderStatus === "assembling" ? "Assembling Your Video..." : "Rendering Scenes..."}
                      </h2>
                      <p className="text-zinc-400 text-sm">
                        {renderStatus === "assembling"
                          ? "All scenes done! Stitching clips together with your audio track..."
                          : `Generating ${totalScenes} cinematic scenes — this takes 5–15 minutes.`}
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-5">
                      {(() => {
                        const pct = renderStatus === "assembling"
                          ? 100
                          : totalScenes > 0 ? Math.round((completedScenes / totalScenes) * 100) : 0;
                        const elapsedMs = renderStartTime ? Date.now() - renderStartTime : 0;
                        const elapsedMin = Math.floor(elapsedMs / 60000);
                        const elapsedSec = Math.floor((elapsedMs % 60000) / 1000);
                        const etaText = (() => {
                          if (completedScenes === 0 || totalScenes === 0) return null;
                          const msPerScene = elapsedMs / completedScenes;
                          const remaining = (totalScenes - completedScenes) * msPerScene;
                          const remMin = Math.ceil(remaining / 60000);
                          return remMin <= 1 ? "< 1 min remaining" : `~${remMin} min remaining`;
                        })();
                        return (
                          <>
                            <div className="flex justify-between items-center text-sm mb-2">
                              <span className="text-zinc-300 font-medium">
                                {renderStatus === "assembling"
                                  ? "Assembling final video"
                                  : `${completedScenes} / ${totalScenes} scenes`}
                                {failedScenes > 0 && (
                                  <span className="ml-2 text-red-400 text-xs">({failedScenes} failed)</span>
                                )}
                              </span>
                              <div className="flex items-center gap-3 text-zinc-500 text-xs">
                                {etaText && <span className="text-purple-400">{etaText}</span>}
                                <span>{elapsedMin}:{String(elapsedSec).padStart(2, "0")} elapsed</span>
                                <span className="text-zinc-300 font-semibold">{pct}%</span>
                              </div>
                            </div>
                            <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                                style={{
                                  width: `${pct}%`,
                                  background: renderStatus === "assembling"
                                    ? "linear-gradient(90deg, #7c3aed, #ec4899, #7c3aed)"
                                    : "linear-gradient(90deg, #7c3aed, #a855f7)",
                                  backgroundSize: "200% 100%",
                                  animation: pct < 100 ? "shimmer 2s linear infinite" : "none",
                                }}
                              />
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Per-scene status grid */}
                    {totalScenes > 0 && (
                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Scene Status</p>
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
                                scene.status === "completed"  ? "bg-purple-600 text-white" :
                                scene.status === "generating" ? "bg-purple-500/30 text-purple-300 ring-1 ring-purple-500 animate-pulse" :
                                scene.status === "failed"     ? "bg-red-500/20 text-red-400 ring-1 ring-red-500" :
                                                                "bg-zinc-800 text-zinc-600"
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
                        <div className="flex gap-4 text-xs text-zinc-600 mb-3">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-zinc-800 inline-block" /> Queued</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500/30 ring-1 ring-purple-500 inline-block" /> Generating</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-600 inline-block" /> Done</span>
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
                                        <p className="text-xs text-zinc-400 leading-relaxed break-words">{friendlyErr}</p>
                                      </div>

                                      {/* Action buttons */}
                                      <div className="flex gap-1.5 shrink-0">
                                        {/* Edit button */}
                                        {!isEditing && !isRetrying && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2 text-xs border-zinc-600 text-zinc-300 bg-transparent hover:bg-zinc-800"
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
                                      <div className="border-t border-red-500/20 bg-zinc-900/60 p-3 space-y-3">
                                        <p className="text-xs text-zinc-400 font-medium">Edit scene before retrying</p>

                                        {/* Visual prompt */}
                                        <div>
                                          <div className="flex items-center justify-between mb-1">
                                            <Label className="text-xs text-zinc-400">Visual Prompt</Label>
                                            <span className={`text-xs ${
                                              editFailedPrompt.length > 1800 ? "text-red-400" :
                                              editFailedPrompt.length > 1400 ? "text-yellow-400" : "text-zinc-600"
                                            }`}>{editFailedPrompt.length}/2000</span>
                                          </div>
                                          <Textarea
                                            value={editFailedPrompt}
                                            onChange={(e) => setEditFailedPrompt(e.target.value)}
                                            placeholder="Describe the visual scene..."
                                            className="text-xs min-h-[80px] bg-zinc-800/60 border-zinc-700 text-zinc-200 resize-none"
                                            maxLength={2000}
                                          />
                                          <p className="text-xs text-zinc-600 mt-1">Tip: shorter, clearer prompts often render more reliably.</p>
                                        </div>

                                        {/* Lyrics (optional) */}
                                        <div>
                                          <div className="flex items-center justify-between mb-1">
                                            <Label className="text-xs text-zinc-400">Lyrics <span className="text-zinc-600">(optional)</span></Label>
                                            <span className={`text-xs ${
                                              editFailedLyrics.length > 900 ? "text-red-400" : "text-zinc-600"
                                            }`}>{editFailedLyrics.length}/1000</span>
                                          </div>
                                          <Textarea
                                            value={editFailedLyrics}
                                            onChange={(e) => setEditFailedLyrics(e.target.value)}
                                            placeholder="Lyrics for this scene window (leave blank to keep current)"
                                            className="text-xs min-h-[50px] bg-zinc-800/60 border-zinc-700 text-zinc-200 resize-none"
                                            maxLength={1000}
                                          />
                                        </div>

                                        {/* Save & Retry / Cancel */}
                                        <div className="flex gap-2 justify-end">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-3 text-xs border-zinc-700 text-zinc-400 bg-transparent hover:bg-zinc-800"
                                            onClick={() => setEditingFailedSceneId(null)}
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            size="sm"
                                            className="h-7 px-3 text-xs bg-purple-600 hover:bg-purple-500 text-white"
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

                    <p className="text-zinc-600 text-xs text-center">
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
  );
}
