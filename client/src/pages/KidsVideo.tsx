/**
 * WizAnimate™ — AI Character Animation Studio
 * Full rewrite: Wiz engine badges, gender selector, WizSound CTA,
 * auto-transcription, story prompt, full inline video preview + scene edit panel
 */
import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { LandscapeHint } from "@/components/LandscapeHint";
import { mp } from "@/lib/mixpanel";
import { QuickTopUpModal } from "@/components/QuickTopUpModal";
import { useCreditGuard } from "@/hooks/useCreditGuard";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { WizGenesisModal } from "@/components/WizGenesisModal";
import { Link, useLocation } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { Music, Users, Palette, FileText, Film, Zap } from "@/lib/icons";

// ─── Assets ──────────────────────────────────────────────────────────────────
const LOGO_IMG = "/manus-storage/wizanimate-logo-new_a84f9808_a089857a.png";
const ENV_IMG  = "/manus-storage/wizanimate-studio-pov-v2_e5827366.jpg";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const ACCENT        = "#7c5cbf";
const ACCENT_LIGHT  = "#9b7de0";
const ACCENT_DIM    = "rgba(124,92,191,0.12)";
const ACCENT_BORDER = "rgba(124,92,191,0.35)";
const GOLD          = "#d4a843";
const GOLD_DIM      = "rgba(212,168,67,0.10)";
const GOLD_BORDER   = "rgba(212,168,67,0.30)";
const GREEN         = "#6db86d";
const GREEN_DIM     = "rgba(109,184,109,0.10)";
const GREEN_BORDER  = "rgba(109,184,109,0.30)";

// ─── Wiz engine badge colours ─────────────────────────────────────────────────
const ENGINE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  WizGenesis:  { bg: "rgba(124,92,191,0.15)", border: "rgba(124,92,191,0.4)", text: "#9b7de0" },
  WizCreate:   { bg: "rgba(212,168,67,0.12)",  border: "rgba(212,168,67,0.35)",  text: "#d4a843" },
  WizSync:     { bg: "rgba(80,180,220,0.12)",  border: "rgba(80,180,220,0.35)",  text: "#50b4dc" },
  WizAdora:    { bg: "rgba(220,100,180,0.12)", border: "rgba(220,100,180,0.35)", text: "#dc64b4" },
  WizLumina:   { bg: "rgba(100,220,160,0.12)", border: "rgba(100,220,160,0.35)", text: "#64dca0" },
  WizSound:    { bg: "rgba(255,140,60,0.12)",  border: "rgba(255,140,60,0.35)",  text: "#ff8c3c" },
};

// EQ bars for audio visualiser
const EQ_BARS = [0.4, 0.7, 1.0, 0.8, 0.6, 0.9, 0.5, 0.75, 0.95, 0.65];

// ─── Animation styles ─────────────────────────────────────────────────────────
const ANIM_STYLES = [
  { id: "2dcartoon",   label: "2D Cartoon",      img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-2d-cartoon-5WEpP9ztEVzqBR82Yeit9w.webp" },
  { id: "ghibli",      label: "Studio Ghibli",   img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-studio-ghibli-Pu3nPV5TyiR4mj8mrV6Z3h.webp" },
  { id: "pixar3d",     label: "Pixar 3D",         img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-pixar-3d-CZgCHv6X9TEri5pcrSpdAS.webp" },
  { id: "anime",       label: "Anime",            img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-anime-n7c7SshgoN52BwNex7bCB4.webp" },
  { id: "stopmotion",  label: "Stop Motion",      img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-stop-motion-6iZWTvpJ8LeAttx3NeyodE.webp" },
  { id: "claymation",  label: "Claymation",       img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-claymation-8zUACV7SajWvQcaB5QZix4.webp" },
  { id: "motiongfx",   label: "Motion Graphics",  img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-motion-graphics-Y9hPNGw3MQccXsFW7H2b5J.webp" },
  { id: "whiteboard",  label: "Whiteboard",       img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-whiteboard-3JQka5rV2t2utVqvtn8A4a.webp" },
  { id: "retro80s",    label: "Retro 80s",        img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-retro-80s-BkpoNX8sTMUNAfWxnM6jaX.webp" },
  { id: "watercolour", label: "Watercolour",      img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-watercolour-MAS2X5rJV3hzmfWfvKXgGU.webp" },
  { id: "lowpoly",     label: "Low Poly 3D",      img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-low-poly-9bKtfmaLAZH7q8SkbTLocR.webp" },
  { id: "comicbook",   label: "Comic Book",       img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-comic-book-EDi5vaTe3GU6xNLHzpVs3B.webp" },
];

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { key: "audio",      num: 1, label: "Audio Track",          engine: "WizSound"   },
  { key: "characters", num: 2, label: "Characters & Style",   engine: "WizSync"    },
  { key: "brief",      num: 3, label: "Story & Storyboard",   engine: "WizGenesis" },
  { key: "render",     num: 4, label: "Render",               engine: "WizLumina"  },
] as const;
const STEP_ICONS: Record<string, ReactNode> = {
  audio:      <Music className="w-3.5 h-3.5" />,
  characters: <Users className="w-3.5 h-3.5" />,
  brief:      <FileText className="w-3.5 h-3.5" />,
  render:     <Zap className="w-3.5 h-3.5" />,
};
type Step = typeof STEPS[number]["key"];

// ─── Character type ───────────────────────────────────────────────────────────
interface Character {
  id: string;
  name: string;
  description: string;
  gender: "male" | "female" | "neutral";
  photoUrl: string | null;
  locked: boolean;
  role: string;       // e.g. "Lead Guitarist", "Drummer", "Backing Vocalist"
  willSing: boolean;  // Whether this character lip-syncs/sings in the video
}

// ─── Scene edit type (post-render) ────────────────────────────────────────────
interface SceneEdit {
  index: number;
  prompt: string;
  editing: boolean;
}

// ─── GEN stages ───────────────────────────────────────────────────────────────
const GEN_STAGES = [
  "Analysing your brief…",
  "Designing characters…",
  "Building storyboard…",
  "Rendering animation frames…",
  "Applying style pass…",
  "Compositing final video…",
  "Finalising output…",
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function KidsVideo() {
  useEffect(() => { mp.studioEntered("WizAnimate"); }, []);
  useSEO({ title: "WizAnimate™ — AI Character Animation Studio | WIZ AI", path: "/kids-video", description: "Create beat-matched AI character animations with WizAnimate™. Upload your audio, lock your characters, and generate a cinematic animated video with lip-sync and consistent characters." });

  const { isAuthenticated } = useAuth();
  const { balance: creditBalance } = useCreditGuard();
  const [, navigate] = useLocation();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [showPreRenderModal, setShowPreRenderModal] = useState(false);

  // ── Step navigation ──────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("audio");
  const stepIdx = STEPS.findIndex(s => s.key === step);

  // ── Audio ────────────────────────────────────────────────────────────────
  const [audioFile, setAudioFile]           = useState<File | null>(null);
  const [audioUrl, setAudioUrl]             = useState<string>("");
  const [audioDuration, setAudioDuration]   = useState<number>(0);
  const [audioName, setAudioName]           = useState<string>("");
  const [lyrics, setLyrics]                 = useState<string>("");
  const [lyricsLoading, setLyricsLoading]   = useState(false);
  const audioInputRef                       = useRef<HTMLInputElement>(null);
  const audioElRef                          = useRef<HTMLAudioElement>(null);

  const uploadAudioMutation = trpc.kidsVideo.uploadAudio.useMutation({
    onSuccess: (data) => {
      // After upload, transcribe
      transcribeMutation.mutate({ audioUrl: data.audioUrl });
    },
    onError: () => {
      setLyricsLoading(false);
    },
  });

  const transcribeMutation = trpc.kidsVideo.transcribeAudio.useMutation({
    onSuccess: (data) => {
      if (data.text) {
        setLyrics(data.text);
        toast.success("Lyrics auto-transcribed from your audio track!");
      }
      setLyricsLoading(false);
    },
    onError: () => {
      setLyricsLoading(false);
    },
  });

  const handleAudioUpload = useCallback((file: File) => {
    setAudioFile(file);
    setAudioName(file.name.replace(/\.[^.]+$/, ""));
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    const el = new Audio(url);
    el.addEventListener("loadedmetadata", () => {
      setAudioDuration(Math.round(el.duration));
    });
    // Auto-transcribe: only for files ≤ 16 MB to stay within server limit
    if (file.size <= 16 * 1024 * 1024) {
      setLyricsLoading(true);
      const mimeMap: Record<string, "audio/mpeg" | "audio/wav" | "audio/mp4" | "audio/ogg" | "audio/webm"> = {
        "audio/mpeg": "audio/mpeg",
        "audio/mp3":  "audio/mpeg",
        "audio/wav":  "audio/wav",
        "audio/mp4":  "audio/mp4",
        "audio/ogg":  "audio/ogg",
        "audio/webm": "audio/webm",
      };
      const mimeType = mimeMap[file.type] ?? "audio/mpeg";
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        uploadAudioMutation.mutate({ audioBase64: base64, audioMimeType: mimeType, fileName: file.name });
      };
      reader.readAsDataURL(file);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAudioDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("audio/")) handleAudioUpload(file);
  }, [handleAudioUpload]);

  // ── Characters ───────────────────────────────────────────────────────────
  const [characters, setCharacters] = useState<Character[]>([]);
  const [leadCharacterId, setLeadCharacterId] = useState<string | null>(null);
  const [addingChar, setAddingChar] = useState(false);
  const [newCharName, setNewCharName] = useState("");
  const [newCharDesc, setNewCharDesc] = useState("");
  const [newCharGender, setNewCharGender] = useState<"male" | "female" | "neutral">("neutral");
  const charPhotoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addCharacter = useCallback(() => {
    if (!newCharName.trim()) return;
    const id = `char_${Date.now()}`;
    setCharacters(prev => [...prev, {
      id,
      name: newCharName.trim(),
      description: newCharDesc.trim(),
      gender: newCharGender,
      photoUrl: null,
      locked: false,
      role: "",
      willSing: false,
    }]);
    setNewCharName("");
    setNewCharDesc("");
    setNewCharGender("neutral");
    setAddingChar(false);
  }, [newCharName, newCharDesc, newCharGender]);

  const removeCharacter = useCallback((id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateCharacter = useCallback((id: string, patch: Partial<Character>) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const handleCharPhoto = useCallback((id: string, file: File) => {
    const url = URL.createObjectURL(file);
    updateCharacter(id, { photoUrl: url });
  }, [updateCharacter]);

  // ── Style ────────────────────────────────────────────────────────────────
  const [animStyle, setAnimStyle] = useState("ghibli");

  // ── Brief / Lyrics ───────────────────────────────────────────────────────
  const [brief, setBrief] = useState("");
  const [sceneCount, setSceneCount] = useState(8);
  const [autoSceneCount, setAutoSceneCount] = useState(false);
  const [duration, setDuration] = useState("30s");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [cameraMove, setCameraMove] = useState("Dynamic (AI decides)");
  const [beatSync, setBeatSync] = useState(true);
  const [colourGrade, setColourGrade] = useState(true);
  const [lipSync, setLipSync] = useState(true);
  const [lyricOverlay, setLyricOverlay] = useState(false);

  // ── Generation ───────────────────────────────────────────────────────────
  const [genProjectId, setGenProjectId]   = useState<number | null>(null);
  const [genVideoUrl, setGenVideoUrl]     = useState<string | null>(null);
  const [genProgress, setGenProgress]     = useState(0);
  const [genStageIdx, setGenStageIdx]     = useState(0);
  const [genError, setGenError]           = useState<string | null>(null);
  const [isGenerating, setIsGenerating]   = useState(false);
  const [previewConfirmed, setPreviewConfirmed] = useState(false);
  const genPollRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const genStageRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  // When Auto is on, calculate optimal scenes: ~1 scene per 8s of audio, min 4, max 25
  const effectiveSceneCount = autoSceneCount && audioDuration > 0
    ? Math.min(25, Math.max(4, Math.round(audioDuration / 8)))
    : sceneCount;
  const kidsCreditCost = effectiveSceneCount * 50;

  // ── Scene edit state (post-render) ───────────────────────────────────────
  const [sceneEdits, setSceneEdits] = useState<SceneEdit[]>([]);
  const [showScenePanel, setShowScenePanel] = useState(false);

  const stopGen = useCallback(() => {
    if (genStageRef.current) clearInterval(genStageRef.current);
    if (genPollRef.current) clearTimeout(genPollRef.current);
  }, []);
  useEffect(() => () => stopGen(), [stopGen]);

  const utils = trpc.useUtils();
  const startGenPolling = useCallback((pid: number) => {
    let backoffMs = 8000;
    const MAX_BACKOFF = 60000;
    const schedulePoll = () => {
      genPollRef.current = setTimeout(async () => {
        try {
          const result = await utils.billing.checkVideoStatus.fetch({ projectId: pid });
          if (result.status === "completed" && result.videoUrl) {
            stopGen();
            setGenProgress(100);
            setGenVideoUrl(result.videoUrl);
            setIsGenerating(false);
            toast.success("Your animation is ready! 🎬");
            mp.generationCompleted("WizAnimate");
            return;
          } else if (result.status === "failed") {
            stopGen();
            setGenError(result.error || "Animation generation failed. Please try again.");
            setIsGenerating(false);
            toast.error(result.error || "Animation generation failed.");
            mp.generationFailed("WizAnimate", "generation_failed");
            return;
          }
          backoffMs = 8000;
          schedulePoll();
        } catch {
          backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF);
          schedulePoll();
        }
      }, backoffMs) as unknown as ReturnType<typeof setTimeout>;
    };
    schedulePoll();
  }, [utils, stopGen]);

  const createJobMutation = trpc.kidsVideo.createJob.useMutation();

  const generateMutation = trpc.billing.generateVideo.useMutation({
    onSuccess: (data) => {
      if (data.projectId) {
        setGenProjectId(data.projectId);
        startGenPolling(data.projectId);
      }
      if (data.status === "completed") {
        stopGen();
        setGenProgress(100);
        setIsGenerating(false);
        toast.success("Your animation is ready! 🎬");
      }
    },
    onError: (err) => {
      stopGen();
      const msg = err.message || "Generation failed. Please try again.";
      setGenError(msg);
      setIsGenerating(false);
      toast.error(msg);
      mp.generationFailed("WizAnimate", "generation_error");
    },
  });

  const handleStartRealRender = useCallback(() => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl("/kids-video");
      return;
    }
    if (!brief.trim() || brief.trim().length < 10) {
      toast.error("Please enter a story description of at least 10 characters.");
      return;
    }
    setGenError(null);
    setGenVideoUrl(null);
    setGenProjectId(null);
    setGenProgress(5);
    setGenStageIdx(0);
    setIsGenerating(true);
    setPreviewConfirmed(false);
    mp.generationStarted("WizAnimate");
    let idx = 0;
    genStageRef.current = setInterval(() => {
      idx = Math.min(idx + 1, GEN_STAGES.length - 1);
      setGenStageIdx(idx);
      setGenProgress(Math.min(5 + idx * 13, 92));
      if (idx === GEN_STAGES.length - 1) clearInterval(genStageRef.current!);
    }, 7000);
    const selectedStyleLabel = ANIM_STYLES.find(s => s.id === animStyle)?.label ?? animStyle;
    const leadChar = characters.find(c => c.id === leadCharacterId);
    const charSummary = characters.map(c => {
      const isLead = c.id === leadCharacterId;
      const roleTag = c.role ? `, ${c.role}` : "";
      const singsTag = c.willSing ? ", SINGS/LIP-SYNCS" : "";
      const leadTag = isLead ? ", LEAD VOCALIST/SINGER" : "";
      return `${c.name} (${c.gender}${roleTag}${leadTag}${singsTag}) — ${c.description}`;
    }).join("; ");
    const fullPrompt = [
      `${selectedStyleLabel} animated video:`,
      brief.trim(),
      `Animation style: ${selectedStyleLabel}.`,
      leadChar ? `Lead vocalist/singer: ${leadChar.name}.` : "",
      charSummary ? `Characters: ${charSummary}.` : "",
      lyrics ? `Lyrics/story beats: ${lyrics.slice(0, 400)}.` : "",
      "High quality, smooth animation, vibrant colours, cinematic composition.",
    ].filter(Boolean).join(" ");
    // Persist job to DB with audio and character lock data (fire-and-forget)
    const characterLockData = characters.map(c => ({
      id: c.id,
      name: c.name,
      species: "human",
      colour: "",
      features: c.description,
      outfit: "",
      photoUrl: c.photoUrl ?? undefined,
      lockedPrompt: `${c.name} (${c.gender}${c.role ? `, ${c.role}` : ""}${c.willSing ? ", sings" : ""}) — ${c.description}`,
    }));
    // Persist job asynchronously — don't block generation
    if (audioUrl && audioUrl.startsWith("http")) {
      createJobMutation.mutate({
        storyPrompt: fullPrompt,
        animationStyle: ["pixar3d","disney","anime","cartoon","storybook","claymation","ghibli","pixar_movie","manga","retro80s","watercolor"].includes(animStyle)
          ? (animStyle as "pixar3d" | "disney" | "anime" | "cartoon" | "storybook" | "claymation" | "ghibli" | "pixar_movie" | "manga" | "retro80s" | "watercolor")
          : "pixar3d",
        videoLength: (["5s","10s","15s","30s","60s"].includes(duration) ? duration : "30s") as "5s" | "10s" | "15s" | "30s" | "60s",
        characterLockData,
      });
    }
    generateMutation.mutate({
      toolType: "text_to_video",
      prompt: fullPrompt,
      options: {
        style: animStyle,
        duration,
        animationPreset: "character_animation",
        sceneCount: effectiveSceneCount,
      },
    });
  }, [isAuthenticated, brief, animStyle, duration, effectiveSceneCount, characters, lyrics, generateMutation, stopGen, audioUrl, leadCharacterId, createJobMutation]);

  // ── Ambient dimmer ─────────────────────────────────────────────────────
  // 0.35 = dark cinematic, 0.75 = bright studio
  const [ambience, setAmbience] = useState(0.65);

  // ── Character preview state ──────────────────────────────────────────────
  const [charPreviewLoading, setCharPreviewLoading] = useState<Record<string, boolean>>({});
  const [charPreviewUrls, setCharPreviewUrls] = useState<Record<string, string>>({});

  const charPreviewMutation = trpc.kidsVideo.generateCharacterPreview.useMutation({
    onSuccess: (data, variables) => {
      setCharPreviewUrls(prev => ({ ...prev, [(variables as any)._charId]: data.previewUrl }));
      setCharPreviewLoading(prev => ({ ...prev, [(variables as any)._charId]: false }));
      toast.success("Character preview generated! Adjust the description if needed, then lock.");
    },
    onError: (_err, variables) => {
      setCharPreviewLoading(prev => ({ ...prev, [(variables as any)._charId]: false }));
      toast.error("Preview generation failed. Please try again.");
    },
  });

  const handlePreviewCharacter = useCallback((char: Character) => {
    if (!animStyle) { toast.error("Please select an animation style first."); return; }
    setCharPreviewLoading(prev => ({ ...prev, [char.id]: true }));
    charPreviewMutation.mutate({
      _charId: char.id,
      characterName: char.name,
      description: char.description || char.name,
      gender: char.gender,
      animationStyle: animStyle,
      photoUrl: char.photoUrl && !char.photoUrl.startsWith("blob:") ? char.photoUrl : undefined,
    } as any);
  }, [animStyle, charPreviewMutation]);

  // ── Save to Library ────────────────────────────────────────────────────────
  const saveToLibraryMutation = trpc.characterLibrary.save.useMutation({
    onSuccess: (_, variables) => {
      toast.success(`“${variables.name}” saved to your Character Library!`);
    },
    onError: (e) => toast.error(`Failed to save: ${e.message}`),
  });
  const handleSaveToLibrary = useCallback((char: Character) => {
    const previewUrl = charPreviewUrls[char.id];
    saveToLibraryMutation.mutate({
      name: char.name,
      description: char.description || undefined,
      gender: char.gender,
      animStyle: animStyle || undefined,
      photoUrl: char.photoUrl && !char.photoUrl.startsWith("blob:") ? char.photoUrl : undefined,
      previewUrl: previewUrl || undefined,
      tags: animStyle ? `wizanimate,${animStyle}` : "wizanimate",
    });
  }, [charPreviewUrls, animStyle, saveToLibraryMutation]);

  // ── Add from Library picker ───────────────────────────────────────────────
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const { data: libraryChars } = trpc.characterLibrary.list.useQuery(
    undefined,
    { enabled: showLibraryPicker }
  );
  const incrementUseCount = trpc.characterLibrary.incrementUseCount.useMutation();
  const handleAddFromLibrary = useCallback((libChar: NonNullable<typeof libraryChars>[number]) => {
    const newId = `char_${Date.now()}`;
    setCharacters(prev => [...prev, {
      id: newId,
      name: libChar.name,
      description: libChar.description ?? "",
      gender: (libChar.gender as "male" | "female" | "neutral") ?? "neutral",
      photoUrl: libChar.photoUrl ?? null,
      locked: false,
      role: "",
      willSing: false,
    }]);
    if (libChar.previewUrl) {
      setCharPreviewUrls(prev => ({ ...prev, [newId]: libChar.previewUrl! }));
    }
    if (!animStyle && libChar.animStyle) setAnimStyle(libChar.animStyle);
    incrementUseCount.mutate({ id: libChar.id });
    setShowLibraryPicker(false);
    toast.success(`“${libChar.name}” added from your library!`);
  }, [animStyle, incrementUseCount]);

  // ── Demo pre-fill ─────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1" && params.get("prompt")) {
      setBrief(params.get("prompt") as string);
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const selectedStyle = ANIM_STYLES.find(s => s.id === animStyle);

  // ─── Scene edit helpers ────────────────────────────────────────────────────
  /** Split lyrics into per-scene chunks so each scene card shows its lyric line */
  const getLyricForScene = useCallback((sceneIdx: number, total: number): string | null => {
    if (!lyrics.trim()) return null;
    const lines = lyrics.split(/\n+/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;
    // Distribute lines evenly across scenes
    const linesPerScene = Math.max(1, Math.ceil(lines.length / total));
    const start = sceneIdx * linesPerScene;
    const chunk = lines.slice(start, start + linesPerScene);
    return chunk.length > 0 ? chunk.join("\n") : null;
  }, [lyrics]);

  const initSceneEdits = useCallback(() => {
    const edits: SceneEdit[] = Array.from({ length: effectiveSceneCount }, (_, i) => ({
      index: i,
      prompt: `Scene ${i + 1}: ${brief.slice(0, 60)}…`,
      editing: false,
    }));
    setSceneEdits(edits);
    setShowScenePanel(true);
  }, [effectiveSceneCount, brief]);
  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "#080808",
      color: "#e0e0e0",
      fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ── Studio Hero ─────────────────────────────────────────────────── */}
      <div style={{ position: "relative", width: "100%", height: 400, overflow: "hidden", flexShrink: 0 }}>
        <img src={ENV_IMG} alt="WizAnimate Studio" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center 35%",
          filter: `brightness(${ambience})`,
          transition: "filter 0.4s ease",
        }} />
        {/* Warm amber radial glow overlay */}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 80%, rgba(212,168,67,${ambience * 0.18}) 0%, transparent 70%)` }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg,#080808 0%,rgba(8,8,8,0.15) 55%,transparent 100%)" }} />
        {/* Top nav */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px", zIndex: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/" style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>← Back</Link>
            <img src={LOGO_IMG} alt="WizAnimate" style={{ height: 24, objectFit: "contain" }} />
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 2, color: "#fff" }}>
              Wiz<span style={{ color: ACCENT_LIGHT }}>Animate</span>™
            </span>
            <div style={{
              background: ACCENT_DIM, border: `1px solid ${ACCENT_BORDER}`,
              color: ACCENT_LIGHT, fontSize: 9, fontWeight: 700, letterSpacing: "1.5px",
              padding: "3px 8px", borderRadius: 2, textTransform: "uppercase",
            }}>Animation Studio</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 4,
              padding: "5px 12px", fontSize: 11, fontWeight: 700, color: GOLD,
            }}>{(creditBalance ?? 0).toLocaleString()} Credits</div>
            <button onClick={() => setTopUpOpen(true)} style={{
              background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`,
              color: GOLD, fontSize: 10, fontWeight: 700, padding: "5px 12px",
              borderRadius: 4, cursor: "pointer",
            }}>+ Top Up</button>
          </div>
        </div>
        {/* Hero title */}
        <div style={{ position: "absolute", bottom: 28, left: 24, zIndex: 20 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, letterSpacing: 4,
            color: "#fff", textShadow: "0 2px 40px rgba(0,0,0,0.98)", lineHeight: 1,
          }}>ANIMATION STUDIO</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 6, letterSpacing: "0.5px" }}>
            Upload your track · Build &amp; lock your characters · Choose your style · Generate
          </div>
          {/* Wiz engine row */}
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {["WizGenesis","WizCreate","WizSync","WizAdora","WizLumina","WizSound"].map(eng => (
              <div key={eng} style={{
                fontSize: 8, fontWeight: 700, letterSpacing: "0.8px",
                padding: "2px 7px", borderRadius: 2,
                background: ENGINE_COLORS[eng].bg,
                border: `1px solid ${ENGINE_COLORS[eng].border}`,
                color: ENGINE_COLORS[eng].text,
                textTransform: "uppercase",
              }}>{eng}™</div>
            ))}
          </div>
        </div>
        {/* Ambient dimmer + VU meters */}
        <div style={{ position: "absolute", bottom: 20, right: 24, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          {/* VU meter dots */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3 }}>
            {[14,18,22,28,22,18,14,10].map((h, i) => (
              <div key={i} style={{
                width: 4, height: h,
                background: i < 5 ? GREEN : GOLD,
                borderRadius: 2,
                opacity: 0.7 + (i % 3) * 0.1,
                animation: `vuPulse${i % 3} 1.${2+i}s ease-in-out infinite alternate`,
              }} />
            ))}
          </div>
          {/* Ambient dimmer */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: "6px 12px", backdropFilter: "blur(8px)" }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Ambience</span>
            <input
              type="range" min={0.3} max={0.85} step={0.05}
              value={ambience}
              onChange={e => setAmbience(parseFloat(e.target.value))}
              style={{ width: 80, accentColor: GOLD, cursor: "pointer" }}
            />
            <span style={{ fontSize: 9, color: GOLD, fontWeight: 700, minWidth: 24 }}>{Math.round(ambience * 100)}%</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, boxShadow: `0 0 8px ${GREEN}`, animation: "vuPulse0 2s ease-in-out infinite alternate" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>Studio Ready</span>
          </div>
        </div>
      </div>

      {/* ── Step Bar ────────────────────────────────────────────────────── */}
      <div style={{
        background: "#0c0c0c", borderBottom: "1px solid #1a1a1a",
        display: "flex", alignItems: "stretch", flexShrink: 0, overflowX: "auto",
      }}>
        {STEPS.map((s, i) => {
          const isActive = s.key === step;
          const isDone   = i < stepIdx;
          const ec       = ENGINE_COLORS[s.engine];
          return (
            <button
              key={s.key}
              onClick={() => setStep(s.key)}
              style={{
                flex: 1, minWidth: 120,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "14px 12px",
                background: isActive ? ACCENT_DIM : "transparent",
                border: "none",
                borderBottom: isActive ? `2px solid ${ACCENT_LIGHT}` : "2px solid transparent",
                borderRight: "1px solid #1a1a1a",
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: isDone ? "#2a4a2a" : isActive ? ACCENT : "#1a1a1a",
                border: `1px solid ${isDone ? "#4a8a4a" : isActive ? ACCENT_LIGHT : "#2a2a2a"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isDone ? 12 : 11,
                color: isDone ? GREEN : isActive ? "#fff" : "#555",
                fontWeight: 700, flexShrink: 0,
              }}>
                {isDone ? "✓" : STEP_ICONS[s.key]}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? ACCENT_LIGHT : isDone ? GREEN : "#555", letterSpacing: "0.5px", textAlign: "center", whiteSpace: "nowrap" }}>
                {s.num}. {s.label}
              </div>
              {/* Engine badge */}
              <div style={{
                fontSize: 8, fontWeight: 700, letterSpacing: "0.8px",
                padding: "2px 6px", borderRadius: 2,
                background: ec.bg, border: `1px solid ${ec.border}`, color: ec.text,
                textTransform: "uppercase", whiteSpace: "nowrap",
              }}>{s.engine}™</div>
            </button>
          );
        })}
      </div>

      {/* ── Step Content ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>

        {/* === STEP 1: AUDIO ============================================== */}
        {step === "audio" && (
          <div>
            <StepHeader
              icon={<Music className="w-4 h-4" />}
              title="Upload Your Audio Track"
              sub="The animation will be timed to the full length of your track"
              engine="WizSound"
            />

            {/* WizSound CTA — create a track */}
            <div style={{
              background: ENGINE_COLORS.WizSound.bg,
              border: `1px solid ${ENGINE_COLORS.WizSound.border}`,
              borderRadius: 10, padding: "16px 20px", marginBottom: 20,
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: ENGINE_COLORS.WizSound.text, marginBottom: 2 }}>
                  🎶 Don't have a track yet?
                </div>
                <div style={{ fontSize: 12, color: "#888" }}>
                  Create a custom AI-generated audio track with <strong style={{ color: ENGINE_COLORS.WizSound.text }}>WizSound™</strong> — then come back and load it here.
                </div>
              </div>
              <button
                onClick={() => navigate("/wiz-sound")}
                style={{
                  background: ENGINE_COLORS.WizSound.bg,
                  border: `1px solid ${ENGINE_COLORS.WizSound.border}`,
                  color: ENGINE_COLORS.WizSound.text,
                  padding: "9px 20px", borderRadius: 6,
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >Open WizSound™ →</button>
            </div>

            {/* Drop zone */}
            {!audioFile ? (
              <div
                onDrop={handleAudioDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => audioInputRef.current?.click()}
                style={{
                  border: `2px dashed ${ACCENT_BORDER}`, borderRadius: 12,
                  padding: "60px 40px", textAlign: "center", cursor: "pointer",
                  background: ACCENT_DIM, transition: "all 0.2s", marginBottom: 24,
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Drop your audio track here</div>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>MP3, WAV, AAC, FLAC, OGG — up to 50MB</div>
                <div style={{
                  display: "inline-block", background: ACCENT, color: "#fff",
                  padding: "10px 28px", borderRadius: 6, fontSize: 13, fontWeight: 700,
                }}>Browse Files</div>
              </div>
            ) : (
              <div style={{
                background: "#0e0e0e", border: `1px solid ${ACCENT_BORDER}`,
                borderRadius: 12, padding: 24, marginBottom: 24,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 8,
                    background: `linear-gradient(135deg, ${ACCENT}, #4a3a8a)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, flexShrink: 0,
                  }}>🎵</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{audioName}</div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {audioDuration > 0 && (
                        <div style={{ fontSize: 12, color: ACCENT_LIGHT }}>
                          ⏱ {formatDuration(audioDuration)} — animation will match this length
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "#555" }}>
                        {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setAudioFile(null); setAudioUrl(""); setAudioDuration(0); setAudioName(""); setLyrics(""); }}
                    style={{
                      background: "#1a1a1a", border: "1px solid #2a2a2a",
                      color: "#666", padding: "6px 14px", borderRadius: 6,
                      cursor: "pointer", fontSize: 12,
                    }}
                  >Remove</button>
                </div>
                {/* Audio player */}
                <audio ref={audioElRef} src={audioUrl} controls style={{ width: "100%", borderRadius: 6 }} />
                {audioDuration > 0 && (
                  <div style={{
                    marginTop: 16, padding: "12px 16px",
                    background: "rgba(124,92,191,0.08)", border: `1px solid ${ACCENT_BORDER}`,
                    borderRadius: 8, fontSize: 13, color: ACCENT_LIGHT,
                  }}>
                    ✓ Track duration detected: <strong>{formatDuration(audioDuration)}</strong> — your animation will be exactly this length.
                    Scenes will be distributed evenly across the track.
                  </div>
                )}
              </div>
            )}

            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleAudioUpload(f); }}
            />

            {/* Lyrics / transcript */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#aaa", letterSpacing: "0.5px" }}>
                  LYRICS / TRANSCRIPT
                </div>
                <span style={{ fontSize: 11, fontWeight: 400, color: "#555" }}>
                  Scenes will be timed to match each lyric line
                </span>
                {lyricsLoading && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 11, color: ACCENT_LIGHT,
                    background: ACCENT_DIM, border: `1px solid ${ACCENT_BORDER}`,
                    padding: "3px 10px", borderRadius: 4,
                  }}>
                    <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
                    WizSound™ auto-transcribing…
                  </div>
                )}
              </div>
              <textarea
                value={lyrics}
                onChange={e => setLyrics(e.target.value)}
                placeholder={"Paste your song lyrics or story narration here...\n\nEach line or section will be used to time the animation scenes to the music.\n\nTip: Upload your audio above and WizSound™ will auto-transcribe the lyrics for you."}
                rows={8}
                style={{
                  width: "100%", background: "#0e0e0e",
                  border: "1px solid #2a2a2a", borderRadius: 8,
                  color: "#ccc", fontSize: 14, lineHeight: 1.7,
                  padding: "14px 16px", resize: "vertical",
                  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <StepNav
              onNext={() => setStep("characters")}
              nextLabel="Continue to Characters →"
              nextDisabled={!audioFile}
              nextHint={!audioFile ? "Upload an audio track to continue" : undefined}
            />
          </div>
        )}

        {/* === STEP 2: CHARACTERS ======================================== */}
        {step === "characters" && (
          <div>
            <StepHeader
              icon={<Users className="w-4 h-4" />}
              title="Build Your Characters"
              sub="Upload a photo of anyone or anything — we'll animate them in your chosen style"
              engine="WizSync"
            />

            {/* Animation style selector — pick style first, then preview characters in it */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#666", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
                🎨 Step 1 of 2 — Choose Animation Style
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 8 }}>
                {ANIM_STYLES.map(s => {
                  const isSel = animStyle === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setAnimStyle(s.id)}
                      style={{
                        borderRadius: 8, overflow: "hidden",
                        border: `2px solid ${isSel ? GOLD : "#1e1e1e"}`,
                        cursor: "pointer", background: "#0e0e0e",
                        boxShadow: isSel ? `0 0 16px rgba(212,168,67,0.25)` : "none",
                        transition: "all 0.2s", position: "relative",
                      }}
                    >
                      <div style={{ height: 100, overflow: "hidden" }}>
                        <img src={s.img} alt={s.label} style={{
                          width: "100%", height: "100%", objectFit: "cover",
                          filter: isSel ? "none" : "brightness(0.6) saturate(0.7)",
                          transition: "filter 0.2s",
                        }} />
                      </div>
                      <div style={{
                        padding: "7px 10px",
                        background: isSel ? GOLD_DIM : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: isSel ? GOLD : "#888" }}>{s.label}</span>
                        {isSel && <span style={{ fontSize: 10, color: GOLD }}>✓</span>}
                      </div>
                      {isSel && (
                        <div style={{
                          position: "absolute", top: 6, right: 6,
                          background: GOLD, color: "#1a0f00",
                          fontSize: 8, fontWeight: 700, padding: "2px 6px",
                          borderRadius: 3, letterSpacing: "0.8px",
                        }}>SELECTED</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {animStyle && (
                <div style={{
                  padding: "8px 14px", background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`,
                  borderRadius: 6, fontSize: 12, color: GOLD,
                }}>
                  ✨ <strong>{ANIM_STYLES.find(s => s.id === animStyle)?.label}</strong> selected — click “Preview in Style” on any character below to see how they’ll look
                </div>
              )}
            </div>

            {/* WizSync info */}
            <div style={{
              background: ENGINE_COLORS.WizSync.bg,
              border: `1px solid ${ENGINE_COLORS.WizSync.border}`,
              borderRadius: 8, padding: "12px 16px", marginBottom: 20,
              fontSize: 12, color: ENGINE_COLORS.WizSync.text,
            }}>
              <strong>WizSync™</strong> — Character lip-sync and facial animation engine. Set each character’s voice type so WizSync™ can assign the correct vocal register for lip-sync animation.
            </div>

            {/* Add from Library button */}
            {isAuthenticated && (
              <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
                <button
                  onClick={() => setShowLibraryPicker(true)}
                  style={{
                    padding: "9px 16px", background: "rgba(124,92,191,0.12)",
                    border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_LIGHT,
                    borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
                    letterSpacing: "0.03em",
                  }}
                >
                  📚 Add from My Character Library
                </button>
                <span style={{ fontSize: 11, color: "#555" }}>or build a new character below</span>
              </div>
            )}

            {/* Library Picker Modal */}
            {showLibraryPicker && (
              <div style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
                zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
                padding: 20,
              }} onClick={() => setShowLibraryPicker(false)}>
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: "#0f0f0f", border: "1px solid #2a2a2a",
                    borderRadius: 16, padding: 24, maxWidth: 720, width: "100%",
                    maxHeight: "80vh", overflowY: "auto",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#e0e0e0" }}>My Character Library</div>
                      <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>Select a saved character to add to this project</div>
                    </div>
                    <button onClick={() => setShowLibraryPicker(false)} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer" }}>×</button>
                  </div>
                  {!libraryChars || libraryChars.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#444" }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>🎭</div>
                      <div style={{ fontSize: 14, marginBottom: 8 }}>No saved characters yet</div>
                      <div style={{ fontSize: 12, color: "#333" }}>Build and lock characters, then save them to your library for reuse</div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                      {libraryChars.map(lc => (
                        <div
                          key={lc.id}
                          onClick={() => handleAddFromLibrary(lc)}
                          style={{
                            borderRadius: 10, overflow: "hidden",
                            border: "1px solid #1e1e1e", cursor: "pointer",
                            background: "#0a0a0a", transition: "all 0.2s",
                          }}
                        >
                          <div style={{ height: 120, background: "#111", overflow: "hidden" }}>
                            {lc.previewUrl ? (
                              <img src={lc.previewUrl} alt={lc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : lc.photoUrl ? (
                              <img src={lc.photoUrl} alt={lc.name} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.7)" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
                                {lc.gender === "male" ? "👨" : lc.gender === "female" ? "👩" : "🧑"}
                              </div>
                            )}
                          </div>
                          <div style={{ padding: "8px 10px" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#e0e0e0", marginBottom: 3 }}>{lc.name}</div>
                            {lc.animStyle && <div style={{ fontSize: 10, color: GOLD }}>{ANIM_STYLES.find(s => s.id === lc.animStyle)?.label ?? lc.animStyle}</div>}
                            <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{lc.gender}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Character cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginBottom: 24 }}>
              {characters.map(char => (
                <div key={char.id} style={{
                  background: "#0e0e0e",
                  border: `1px solid ${char.locked ? "#4a8a4a" : "#2a2a2a"}`,
                  borderRadius: 12, overflow: "hidden",
                  boxShadow: char.locked ? "0 0 16px rgba(109,184,109,0.15)" : "none",
                }}>
                  {/* Photo zone */}
                  <div
                    style={{
                      height: 180, background: "#141414",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", position: "relative", overflow: "hidden",
                    }}
                    onClick={() => charPhotoRefs.current[char.id]?.click()}
                  >
                    {char.photoUrl ? (
                      <>
                        <img src={char.photoUrl} alt={char.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {char.locked && (
                          <div style={{
                            position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <div style={{
                              background: "rgba(109,184,109,0.9)", color: "#fff",
                              padding: "8px 20px", borderRadius: 6,
                              fontSize: 13, fontWeight: 700, letterSpacing: "1px",
                            }}>✓ CHARACTER LOCKED</div>
                          </div>
                        )}
                        {!char.locked && (
                          <div style={{
                            position: "absolute", bottom: 0, left: 0, right: 0,
                            background: "rgba(0,0,0,0.7)", padding: "6px 10px",
                            fontSize: 11, color: "#aaa", textAlign: "center",
                          }}>Click to replace photo</div>
                        )}
                      </>
                    ) : (
                      <div style={{ textAlign: "center", color: "#444" }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>Upload Photo</div>
                        <div style={{ fontSize: 11, color: "#333", marginTop: 4 }}>Person, pet, object — anything</div>
                      </div>
                    )}
                    <input
                      ref={el => { charPhotoRefs.current[char.id] = el; }}
                      type="file" accept="image/*" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleCharPhoto(char.id, f); }}
                    />
                  </div>

                  {/* Character details */}
                  <div style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <input
                        value={char.name}
                        onChange={e => updateCharacter(char.id, { name: e.target.value })}
                        placeholder="Character name"
                        style={{
                          flex: 1, background: "#141414", border: "1px solid #2a2a2a",
                          borderRadius: 6, color: "#fff", fontSize: 14, fontWeight: 600,
                          padding: "7px 10px", fontFamily: "inherit", outline: "none",
                        }}
                      />
                      {char.locked && (
                        <div style={{
                          background: GREEN_DIM, border: `1px solid ${GREEN_BORDER}`,
                          color: GREEN, fontSize: 9, fontWeight: 700,
                          padding: "3px 8px", borderRadius: 4, letterSpacing: "1px", whiteSpace: "nowrap",
                        }}>LOCKED</div>
                      )}
                    </div>

                    {/* Gender / voice type selector — WizSync */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.8px", marginBottom: 6, textTransform: "uppercase" }}>
                        WizSync™ Voice Type
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {(["male", "female", "neutral"] as const).map(g => (
                          <button
                            key={g}
                            onClick={() => updateCharacter(char.id, { gender: g })}
                            style={{
                              flex: 1, padding: "6px 4px",
                              background: char.gender === g ? ENGINE_COLORS.WizSync.bg : "#141414",
                              border: `1px solid ${char.gender === g ? ENGINE_COLORS.WizSync.border : "#2a2a2a"}`,
                              color: char.gender === g ? ENGINE_COLORS.WizSync.text : "#555",
                              borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600,
                              textTransform: "capitalize",
                            }}
                          >{g === "male" ? "♂ Male" : g === "female" ? "♀ Female" : "⊙ Neutral"}</button>
                        ))}
                      </div>
                    </div>

                    {/* Role field */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.8px", marginBottom: 6, textTransform: "uppercase" }}>
                        Performance Role
                      </div>
                      <input
                        value={char.role}
                        onChange={e => updateCharacter(char.id, { role: e.target.value })}
                        placeholder="e.g. Lead Guitarist, Drummer, Backing Vocalist"
                        disabled={char.locked}
                        style={{
                          width: "100%", background: "#141414", border: "1px solid #2a2a2a",
                          borderRadius: 6, color: char.locked ? "#555" : "#bbb", fontSize: 12,
                          padding: "7px 10px", fontFamily: "inherit", outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    {/* willSing toggle */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 10px", background: char.willSing ? "rgba(212,168,67,0.08)" : "#0d0d0d", borderRadius: 6, border: `1px solid ${char.willSing ? GOLD_BORDER : "#1e1e1e"}` }}>
                      <button
                        onClick={() => !char.locked && updateCharacter(char.id, { willSing: !char.willSing })}
                        disabled={char.locked}
                        style={{
                          width: 36, height: 20, borderRadius: 10, border: "none", cursor: char.locked ? "not-allowed" : "pointer",
                          background: char.willSing ? GOLD : "#2a2a2a",
                          position: "relative", flexShrink: 0, transition: "background 0.2s",
                        }}
                        title={char.willSing ? "Click to disable lip-sync for this character" : "Click to enable lip-sync/singing for this character"}
                      >
                        <span style={{
                          position: "absolute", top: 2, left: char.willSing ? 18 : 2,
                          width: 16, height: 16, borderRadius: "50%", background: "#fff",
                          transition: "left 0.2s",
                        }} />
                      </button>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: char.willSing ? GOLD : "#555" }}>🎤 Sings / Lip-Syncs</div>
                        <div style={{ fontSize: 10, color: "#444" }}>Enable WizSync™ lip-sync for this character</div>
                      </div>
                    </div>
                    <textarea
                      value={char.description}
                      onChange={e => updateCharacter(char.id, { description: e.target.value })}
                      placeholder="Describe appearance, personality, outfit, role in the story..."
                      rows={3}
                      style={{
                        width: "100%", background: "#141414",
                        border: "1px solid #2a2a2a", borderRadius: 6,
                        color: "#bbb", fontSize: 13, lineHeight: 1.5,
                        padding: "8px 10px", resize: "none",
                        fontFamily: "inherit", outline: "none",
                        boxSizing: "border-box", marginBottom: 10,
                      }}
                    />
                    {/* Character preview image */}
                    {charPreviewUrls[char.id] && (
                      <div style={{ marginBottom: 10, borderRadius: 8, overflow: "hidden", border: `1px solid ${GOLD_BORDER}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, padding: "5px 10px", background: GOLD_DIM, letterSpacing: "0.8px" }}>
                          ✨ STYLE PREVIEW — {ANIM_STYLES.find(s => s.id === animStyle)?.label ?? animStyle}
                        </div>
                        <img
                          src={charPreviewUrls[char.id]}
                          alt={`${char.name} style preview`}
                          style={{ width: "100%", display: "block", maxHeight: 200, objectFit: "cover" }}
                        />
                        <div style={{ fontSize: 11, color: "#666", padding: "6px 10px", background: "#0a0a0a" }}>
                          Adjust the description above and regenerate if needed, then lock.
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {/* Preview in Style button */}
                      <button
                        onClick={() => handlePreviewCharacter(char)}
                        disabled={charPreviewLoading[char.id] || char.locked}
                        style={{
                          flex: 1, minWidth: 120, padding: "8px 10px",
                          background: charPreviewLoading[char.id] ? GOLD_DIM : GOLD_DIM,
                          border: `1px solid ${GOLD_BORDER}`,
                          color: char.locked ? "#555" : GOLD,
                          borderRadius: 6, cursor: char.locked ? "not-allowed" : "pointer",
                          fontSize: 11, fontWeight: 700, opacity: char.locked ? 0.5 : 1,
                        }}
                      >
                        {charPreviewLoading[char.id] ? "⏳ Generating…" : charPreviewUrls[char.id] ? "🔄 Regenerate Preview" : "🎨 Preview in Style"}
                      </button>
                      <button
                        onClick={() => updateCharacter(char.id, { locked: !char.locked })}
                        style={{
                          flex: 1, minWidth: 100, padding: "8px 10px",
                          background: char.locked ? GREEN_DIM : ACCENT_DIM,
                          border: `1px solid ${char.locked ? GREEN_BORDER : ACCENT_BORDER}`,
                          color: char.locked ? GREEN : ACCENT_LIGHT,
                          borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700,
                        }}
                      >{char.locked ? "✓ Locked In" : "🔒 Lock Character"}</button>
                      <button
                        onClick={() => setLeadCharacterId(id => id === char.id ? null : char.id)}
                        style={{
                          padding: "8px 10px",
                          background: leadCharacterId === char.id ? "rgba(255,180,0,0.15)" : "#1a1a1a",
                          border: `1px solid ${leadCharacterId === char.id ? GOLD_BORDER : "#2a2a2a"}`,
                          color: leadCharacterId === char.id ? GOLD : "#666",
                          borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700,
                        }}
                        title="Mark as lead vocalist/singer"
                      >{leadCharacterId === char.id ? "🎤 Lead Singer" : "🎤 Set as Lead"}</button>
                      <button
                        onClick={() => removeCharacter(char.id)}
                        style={{
                          padding: "8px 10px", background: "#1a1a1a",
                          border: "1px solid #2a2a2a", color: "#666",
                          borderRadius: 6, cursor: "pointer", fontSize: 11,
                        }}
                      >Remove</button>
                    </div>
                    {/* Save to Library */}
                    {isAuthenticated && (
                      <button
                        onClick={() => handleSaveToLibrary(char)}
                        disabled={saveToLibraryMutation.isPending}
                        style={{
                          marginTop: 6, width: "100%", padding: "7px 10px",
                          background: "rgba(212,168,67,0.08)",
                          border: `1px solid ${GOLD_BORDER}`,
                          color: GOLD, borderRadius: 6, cursor: "pointer",
                          fontSize: 11, fontWeight: 600, letterSpacing: "0.03em",
                          opacity: saveToLibraryMutation.isPending ? 0.5 : 1,
                        }}
                      >
                        {saveToLibraryMutation.isPending ? "Saving…" : "💾 Save to Character Library"}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add character card */}
              {characters.length < 10 && !addingChar && (
                <div
                  onClick={() => setAddingChar(true)}
                  style={{
                    border: "2px dashed #2a2a2a", borderRadius: 12,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    minHeight: 320, cursor: "pointer", background: "transparent",
                    transition: "all 0.2s", gap: 8,
                  }}
                >
                  <div style={{ fontSize: 40, color: "#333" }}>+</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#444" }}>Add Character</div>
                  <div style={{ fontSize: 11, color: "#333" }}>{characters.length}/10 characters</div>
                </div>
              )}
            </div>

            {/* Add character form */}
            {addingChar && (
              <div style={{
                background: "#0e0e0e", border: `1px solid ${ACCENT_BORDER}`,
                borderRadius: 12, padding: 24, marginBottom: 24,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT_LIGHT, marginBottom: 16, letterSpacing: "1px" }}>NEW CHARACTER</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>Character Name</label>
                    <input
                      value={newCharName}
                      onChange={e => setNewCharName(e.target.value)}
                      placeholder="e.g. Luna, Max, The Dragon..."
                      autoFocus
                      style={{
                        width: "100%", background: "#141414",
                        border: "1px solid #2a2a2a", borderRadius: 6,
                        color: "#fff", fontSize: 14, padding: "10px 12px",
                        fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>Role in Story</label>
                    <input
                      placeholder="e.g. Hero, Sidekick, Villain..."
                      style={{
                        width: "100%", background: "#141414",
                        border: "1px solid #2a2a2a", borderRadius: 6,
                        color: "#fff", fontSize: 14, padding: "10px 12px",
                        fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
                {/* Gender selector in add form */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>WizSync™ Voice Type</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["male", "female", "neutral"] as const).map(g => (
                      <button
                        key={g}
                        onClick={() => setNewCharGender(g)}
                        style={{
                          flex: 1, padding: "8px",
                          background: newCharGender === g ? ENGINE_COLORS.WizSync.bg : "#141414",
                          border: `1px solid ${newCharGender === g ? ENGINE_COLORS.WizSync.border : "#2a2a2a"}`,
                          color: newCharGender === g ? ENGINE_COLORS.WizSync.text : "#555",
                          borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
                          textTransform: "capitalize",
                        }}
                      >{g === "male" ? "♂ Male" : g === "female" ? "♀ Female" : "⊙ Neutral"}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 6 }}>Appearance & Personality</label>
                  <textarea
                    value={newCharDesc}
                    onChange={e => setNewCharDesc(e.target.value)}
                    placeholder="Describe what they look like, their personality, outfit, any special features..."
                    rows={3}
                    style={{
                      width: "100%", background: "#141414",
                      border: "1px solid #2a2a2a", borderRadius: 6,
                      color: "#ccc", fontSize: 13, lineHeight: 1.5,
                      padding: "10px 12px", resize: "vertical",
                      fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => { setAddingChar(false); setNewCharName(""); setNewCharDesc(""); setNewCharGender("neutral"); }}
                    style={{
                      flex: 1, padding: "10px", background: "#1a1a1a",
                      border: "1px solid #2a2a2a", color: "#666",
                      borderRadius: 6, cursor: "pointer", fontSize: 13,
                    }}
                  >Cancel</button>
                  <button
                    onClick={addCharacter}
                    disabled={!newCharName.trim()}
                    style={{
                      flex: 2, padding: "10px",
                      background: newCharName.trim() ? ACCENT : "#1a1a1a",
                      border: "none", color: newCharName.trim() ? "#fff" : "#444",
                      borderRadius: 6, cursor: newCharName.trim() ? "pointer" : "not-allowed",
                      fontSize: 13, fontWeight: 700,
                    }}
                  >Add Character</button>
                </div>
              </div>
            )}

            {characters.length === 0 && !addingChar && (
              <div style={{
                padding: "20px 24px",
                background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`,
                borderRadius: 8, fontSize: 13, color: "#888", marginBottom: 24,
              }}>
                💡 <strong style={{ color: GOLD }}>Tip:</strong> You can skip characters and describe them in your story brief instead — or add up to 10 characters for consistent faces across every scene.
              </div>
            )}

            <StepNav
              onBack={() => setStep("audio")}
              onNext={() => setStep("brief")}
              nextLabel="Continue to Story →"
            />
          </div>
        )}

        {/* === STEP 4: BRIEF / LYRICS ===================================== */}
        {step === "brief" && (
          <div>
            <StepHeader
              icon={<FileText className="w-4 h-4" />}
              title="Story & Production Settings"
              sub="Tell us what happens in your animation and configure the output"
              engine="WizGenesis"
            />

            {/* WizGenesis info */}
            <div style={{
              background: ENGINE_COLORS.WizGenesis.bg,
              border: `1px solid ${ENGINE_COLORS.WizGenesis.border}`,
              borderRadius: 8, padding: "12px 16px", marginBottom: 20,
              fontSize: 12, color: ENGINE_COLORS.WizGenesis.text,
            }}>
              <strong>WizGenesis™</strong> — Story intelligence engine. Your brief and lyrics are analysed to generate a scene-by-scene storyboard that matches the music's rhythm, mood, and narrative arc.
            </div>

            {/* Story brief */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#aaa", display: "block", marginBottom: 8, letterSpacing: "0.5px" }}>
                STORY BRIEF
                <span style={{ fontSize: 11, fontWeight: 400, color: "#555", marginLeft: 8 }}>What happens in your animation?</span>
              </label>
              <textarea
                value={brief}
                onChange={e => setBrief(e.target.value)}
                placeholder={"Describe what happens in your animation...\n\nExample: A young girl discovers a magical forest where animals can talk. She befriends a wise old owl who guides her on a journey to find a lost star. Warm, whimsical atmosphere with golden light filtering through the trees."}
                rows={6}
                style={{
                  width: "100%", background: "#0e0e0e",
                  border: `1px solid ${brief.trim().length >= 10 ? ACCENT_BORDER : "#2a2a2a"}`,
                  borderRadius: 8, color: "#ccc", fontSize: 14, lineHeight: 1.7,
                  padding: "14px 16px", resize: "vertical",
                  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 11, color: brief.trim().length >= 10 ? "#555" : "#8a4a4a", marginTop: 6 }}>
                {brief.trim().length} characters {brief.trim().length < 10 ? `— need at least ${10 - brief.trim().length} more` : "— ✓ good to go"}
              </div>
            </div>

            {/* Lyrics review (from Step 1) */}
            {lyrics && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#aaa", letterSpacing: "0.5px" }}>
                    LYRICS / NARRATION
                  </label>
                  <div style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.8px",
                    padding: "2px 6px", borderRadius: 2,
                    background: ENGINE_COLORS.WizSound.bg,
                    border: `1px solid ${ENGINE_COLORS.WizSound.border}`,
                    color: ENGINE_COLORS.WizSound.text,
                    textTransform: "uppercase",
                  }}>WizSound™ Synced</div>
                </div>
                <div style={{
                  background: "#0e0e0e", border: "1px solid #1e1e1e",
                  borderRadius: 8, padding: "14px 16px",
                  fontSize: 13, color: "#888", lineHeight: 1.8,
                  maxHeight: 180, overflowY: "auto",
                  whiteSpace: "pre-wrap",
                }}>
                  {lyrics.slice(0, 600)}{lyrics.length > 600 ? "…" : ""}
                </div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                  Each lyric line will be matched to a scene — scenes cut on the beat.
                  <button
                    onClick={() => setStep("audio")}
                    style={{ background: "none", border: "none", color: ACCENT_LIGHT, cursor: "pointer", fontSize: 11, padding: "0 4px" }}
                  >Edit lyrics ↗</button>
                </div>
              </div>
            )}

            {/* Production settings grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
              <SettingCard label="Number of Scenes">
                {/* Auto toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <button
                    onClick={() => setAutoSceneCount(v => !v)}
                    style={{
                      padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                      background: autoSceneCount ? ACCENT : "#1a1a1a",
                      border: `1px solid ${autoSceneCount ? ACCENT_LIGHT : "#2a2a2a"}`,
                      color: autoSceneCount ? "#fff" : "#666", cursor: "pointer", letterSpacing: "0.5px",
                    }}
                  >AUTO</button>
                  {autoSceneCount && (
                    <span style={{ fontSize: 11, color: GOLD }}>
                      AI will choose {audioDuration > 0 ? `~${Math.min(25, Math.max(4, Math.round(audioDuration / 8)))} scenes` : "optimal count"}
                    </span>
                  )}
                </div>
                {!autoSceneCount && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={() => setSceneCount(c => Math.max(1, c - 1))} style={counterBtn}>−</button>
                    <span style={{ fontSize: 24, fontWeight: 700, color: "#fff", minWidth: 40, textAlign: "center" }}>{sceneCount}</span>
                    <button onClick={() => setSceneCount(c => Math.min(25, c + 1))} style={counterBtn}>+</button>
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>
                  {effectiveSceneCount * 50} credits · ~{audioDuration > 0 ? Math.round(audioDuration / effectiveSceneCount) : Math.round(30 / effectiveSceneCount)}s per scene
                </div>
              </SettingCard>

              <SettingCard label="Duration Override">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["15s", "30s", "60s", "90s", "Auto"].map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      style={{
                        padding: "6px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600,
                        background: duration === d ? ACCENT : "#1a1a1a",
                        border: `1px solid ${duration === d ? ACCENT_LIGHT : "#2a2a2a"}`,
                        color: duration === d ? "#fff" : "#666",
                        cursor: "pointer",
                      }}
                    >{d}</button>
                  ))}
                </div>
                {audioDuration > 0 && (
                  <div style={{ fontSize: 11, color: ACCENT_LIGHT, marginTop: 6 }}>
                    Track: {formatDuration(audioDuration)} — select "Auto" to match
                  </div>
                )}
              </SettingCard>

              <SettingCard label="Aspect Ratio">
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[["16:9", "Widescreen"], ["9:16", "Vertical / Shorts"], ["1:1", "Square"]].map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => setAspectRatio(val)}
                      style={{
                        padding: "7px 12px", borderRadius: 4, fontSize: 12,
                        background: aspectRatio === val ? ACCENT_DIM : "#141414",
                        border: `1px solid ${aspectRatio === val ? ACCENT_BORDER : "#2a2a2a"}`,
                        color: aspectRatio === val ? ACCENT_LIGHT : "#666",
                        cursor: "pointer", textAlign: "left",
                        display: "flex", justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{val}</span>
                      <span style={{ opacity: 0.7 }}>{lbl}</span>
                    </button>
                  ))}
                </div>
              </SettingCard>

              <SettingCard label="Camera Movement">
                <select
                  value={cameraMove}
                  onChange={e => setCameraMove(e.target.value)}
                  style={{
                    width: "100%", background: "#141414",
                    border: "1px solid #2a2a2a", borderRadius: 6,
                    color: "#ccc", padding: "8px 10px", fontSize: 13,
                    fontFamily: "inherit", outline: "none",
                  }}
                >
                  {["Dynamic (AI decides)", "Static shots", "Pan & zoom", "Follow character", "Drone / aerial"].map(o => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </SettingCard>
            </div>

            {/* Toggles */}
            <div style={{
              background: "#0e0e0e", border: "1px solid #1e1e1e",
              borderRadius: 10, padding: 20, marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 14 }}>Production Options</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Beat-Sync Scene Cuts",      sub: "Cuts timed to the music beat",      val: beatSync,    set: setBeatSync,    live: true  },
                  { label: "Colour Grade Consistency",  sub: "Same grade across all scenes",      val: colourGrade, set: setColourGrade, live: true  },
                  { label: "Lyric Overlay",             sub: "Show lyrics on screen",             val: lyricOverlay,  set: setLyricOverlay,  live: true  },
                  { label: "Lip Sync (WizSync™)",       sub: "Character mouths match audio",      val: lipSync,       set: setLipSync,       live: true  },
                ].map(f => (
                  <div key={f.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, color: f.live ? "#ccc" : "#444" }}>{f.label}</div>
                      <div style={{ fontSize: 11, color: "#444" }}>{f.sub}</div>
                      {!f.live && <div style={{ fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: "0.5px" }}>COMING SOON</div>}
                    </div>
                    <button
                      onClick={() => f.live && f.set(!f.val)}
                      style={{
                        width: 40, height: 22, borderRadius: 11, flexShrink: 0,
                        background: !f.live ? "#111" : f.val ? ACCENT : "#1e1e1e",
                        border: `1px solid ${!f.live ? "#1a1a1a" : f.val ? ACCENT : "#2a2a2a"}`,
                        cursor: f.live ? "pointer" : "not-allowed",
                        position: "relative", opacity: f.live ? 1 : 0.4,
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 2,
                        left: f.val && f.live ? 20 : 2,
                        width: 16, height: 16, borderRadius: "50%",
                        background: f.val && f.live ? "#fff" : "#444",
                        transition: "left 0.2s",
                      }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <StepNav
              onBack={() => setStep("characters")}
              onNext={() => setStep("render")}
              nextLabel="Generate Animation →"
              nextDisabled={brief.trim().length < 10}
              nextHint={brief.trim().length < 10 ? "Add a story brief to continue" : undefined}
            />
          </div>
        )}

        {/* === STEP 6: RENDER =================================================================== */}
        {step === "render" && (
          <div>
            <StepHeader
              icon={<Zap className="w-4 h-4" />}
              title="Ready to Render"
              sub="Review your settings and start generating your animation"
              engine="WizLumina"
            />

            {/* WizLumina info */}
            <div style={{
              background: ENGINE_COLORS.WizLumina.bg,
              border: `1px solid ${ENGINE_COLORS.WizLumina.border}`,
              borderRadius: 8, padding: "12px 16px", marginBottom: 20,
              fontSize: 12, color: ENGINE_COLORS.WizLumina.text,
            }}>
              <strong>WizLumina™</strong> — Final render & compositing engine. Assembles all scenes, applies colour grading, beat-sync cuts, and audio mix. Preview the full video before downloading — editing and scene changes are always free.
            </div>

            {/* Summary */}
            <div style={{
              background: "#0e0e0e", border: "1px solid #2a2a2a",
              borderRadius: 12, padding: 24, marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>Project Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                {[
                  { label: "Audio Track",      value: audioName || "No audio",                           icon: "🎵" },
                  { label: "Duration",         value: audioDuration > 0 ? formatDuration(audioDuration) : duration, icon: "⏱" },
                  { label: "Characters",       value: `${characters.length} defined`,                    icon: "🎭" },
                  { label: "Animation Style",  value: selectedStyle?.label ?? animStyle,                 icon: "🎨" },
                  { label: "Scenes",           value: `${sceneCount} scenes`,                            icon: "🎞" },
                  { label: "Aspect Ratio",     value: aspectRatio,                                       icon: "📐" },
                ].map(item => (
                  <div key={item.label} style={{
                    background: "#141414", border: "1px solid #1e1e1e",
                    borderRadius: 8, padding: "12px 14px",
                  }}>
                    <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>{item.icon} {item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#ddd" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Credit cost */}
            <div style={{
              background: creditBalance !== null && creditBalance >= kidsCreditCost
                ? GREEN_DIM : "rgba(220,80,80,0.06)",
              border: `1px solid ${creditBalance !== null && creditBalance >= kidsCreditCost ? GREEN_BORDER : "#8a4a4a"}`,
              borderRadius: 10, padding: "16px 20px", marginBottom: 24,
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#ddd" }}>
                  Cost: <span style={{ color: GOLD }}>{kidsCreditCost.toLocaleString()} credits</span>
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                  Balance: {(creditBalance ?? 0).toLocaleString()} credits
                  {creditBalance !== null && creditBalance < kidsCreditCost && (
                    <span style={{ color: "#cc4444", marginLeft: 8 }}>
                      — {(kidsCreditCost - creditBalance).toLocaleString()} short
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                  ✓ Preview, review, and scene edits are always free — credits only charged on render
                </div>
              </div>
              {creditBalance !== null && creditBalance < kidsCreditCost && (
                <button
                  onClick={() => setTopUpOpen(true)}
                  style={{
                    background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`,
                    color: GOLD, padding: "8px 20px", borderRadius: 6,
                    cursor: "pointer", fontSize: 13, fontWeight: 700,
                  }}
                >Top Up Credits</button>
              )}
            </div>

            {/* Generation progress */}
            {isGenerating && (
              <div style={{
                background: "#0e0e0e", border: `1px solid ${ACCENT_BORDER}`,
                borderRadius: 12, padding: 28, marginBottom: 24, textAlign: "center",
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: ACCENT_LIGHT, marginBottom: 8 }}>
                  {GEN_STAGES[genStageIdx]}
                </div>
                <div style={{ height: 6, background: "#1a1a1a", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_LIGHT})`,
                    width: `${genProgress}%`, transition: "width 0.5s ease",
                  }} />
                </div>
                <div style={{ fontSize: 12, color: "#555" }}>{genProgress}% complete</div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 8 }}>
                  WizGenesis™ · WizCreate™ · WizAdora™ · WizSync™ · WizLumina™
                </div>
              </div>
            )}

            {/* Error */}
            {genError && (
              <div style={{
                background: "rgba(220,80,80,0.08)", border: "1px solid #8a4a4a",
                borderRadius: 8, padding: "14px 18px", marginBottom: 24,
                fontSize: 13, color: "#cc6666",
              }}>
                ⚠ {genError}
              </div>
            )}

            {/* ── Full Video Preview (FREE) ─────────────────────────────── */}
            {genVideoUrl && (
              <div style={{
                background: "#0e0e0e", border: "1px solid #4a8a4a",
                borderRadius: 12, padding: 24, marginBottom: 24,
              }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: GREEN, marginBottom: 4 }}>
                      ✓ Animation Ready — Full Preview
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      Watch the full video below. Not happy with a scene? Edit and re-render individual scenes for free.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => { if (!showScenePanel) initSceneEdits(); setShowScenePanel(v => !v); }}
                      style={{
                        background: ACCENT_DIM, border: `1px solid ${ACCENT_BORDER}`,
                        color: ACCENT_LIGHT, padding: "8px 16px", borderRadius: 6,
                        cursor: "pointer", fontSize: 12, fontWeight: 700,
                      }}
                    >{showScenePanel ? "Hide Scene Editor" : "✏ Edit Scenes (Free)"}</button>
                    {previewConfirmed && (
                      <a
                        href={genVideoUrl}
                        download="wizanimate-output.mp4"
                        style={{
                          display: "inline-block",
                          background: GREEN, color: "#fff",
                          padding: "8px 20px", borderRadius: 6,
                          fontSize: 12, fontWeight: 700, textDecoration: "none",
                        }}
                      >⬇ Download MP4</a>
                    )}
                  </div>
                </div>

                {/* Video player — full preview */}
                <div style={{
                  background: "#000", borderRadius: 10, overflow: "hidden",
                  border: "1px solid #1e1e1e", marginBottom: 16,
                  position: "relative",
                }}>
                  <video
                    src={genVideoUrl}
                    controls
                    style={{ width: "100%", display: "block", maxHeight: 520 }}
                    onPlay={() => setPreviewConfirmed(true)}
                  />
                  {!previewConfirmed && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "rgba(0,0,0,0.6)",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                      gap: 12,
                    }}>
                      <div style={{ fontSize: 56 }}>▶</div>
                      <div style={{ fontSize: 14, color: "#ccc", fontWeight: 600 }}>Click to preview your full animation</div>
                      <div style={{ fontSize: 12, color: "#666" }}>Watch before you download — edit any scene for free</div>
                    </div>
                  )}
                </div>

                {/* Confirm download */}
                {!previewConfirmed && (
                  <div style={{
                    background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`,
                    borderRadius: 8, padding: "12px 16px",
                    fontSize: 13, color: "#aaa",
                  }}>
                    💡 Watch the full preview above first. Once you're happy, the download button will appear.
                  </div>
                )}

                {/* Scene editor panel */}
                {showScenePanel && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT_LIGHT, marginBottom: 12, letterSpacing: "0.5px" }}>
                      SCENE EDITOR — Edit prompts, remove scenes, or re-render individual scenes
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {sceneEdits.map((se, i) => {
                        const sceneLyric = getLyricForScene(i, sceneEdits.length);
                        return (
                        <div key={i} style={{
                          background: "#141414", border: "1px solid #2a2a2a",
                          borderRadius: 8, padding: 14,
                        }}>
                          {/* Lyric strip — shows which lyric line this scene covers */}
                          {sceneLyric && (
                            <div style={{
                              marginBottom: 10, padding: "8px 12px",
                              background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`,
                              borderRadius: 6, display: "flex", alignItems: "flex-start", gap: 8,
                            }}>
                              <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>🎵</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", color: GOLD, textTransform: "uppercase", marginBottom: 3 }}>Lyrics — Scene {i + 1}</div>
                                <div style={{ fontSize: 12, color: "#bba060", lineHeight: 1.5, whiteSpace: "pre-wrap", fontFamily: "'Courier Prime', monospace" }}>{sceneLyric}</div>
                              </div>
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: se.editing ? 10 : 0 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: 6,
                              background: ACCENT_DIM, border: `1px solid ${ACCENT_BORDER}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 11, fontWeight: 700, color: ACCENT_LIGHT, flexShrink: 0,
                            }}>{i + 1}</div>
                            {!se.editing ? (
                              <div style={{ flex: 1, fontSize: 13, color: "#aaa" }}>{se.prompt}</div>
                            ) : (
                              <textarea
                                value={se.prompt}
                                onChange={e => setSceneEdits(prev => prev.map((x, j) => j === i ? { ...x, prompt: e.target.value } : x))}
                                rows={2}
                                style={{
                                  flex: 1, background: "#0e0e0e",
                                  border: `1px solid ${ACCENT_BORDER}`, borderRadius: 6,
                                  color: "#ccc", fontSize: 13, padding: "8px 10px",
                                  fontFamily: "inherit", outline: "none", resize: "vertical",
                                }}
                              />
                            )}
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              <button
                                onClick={() => setSceneEdits(prev => prev.map((x, j) => j === i ? { ...x, editing: !x.editing } : x))}
                                style={{
                                  background: se.editing ? ACCENT_DIM : "#1a1a1a",
                                  border: `1px solid ${se.editing ? ACCENT_BORDER : "#2a2a2a"}`,
                                  color: se.editing ? ACCENT_LIGHT : "#666",
                                  padding: "5px 10px", borderRadius: 5,
                                  cursor: "pointer", fontSize: 11, fontWeight: 600,
                                }}
                              >{se.editing ? "Save" : "✏ Edit"}</button>
                              <button
                                onClick={() => { toast.info(`Re-rendering scene ${i + 1}… (free)`); }}
                                style={{
                                  background: GREEN_DIM, border: `1px solid ${GREEN_BORDER}`,
                                  color: GREEN, padding: "5px 10px", borderRadius: 5,
                                  cursor: "pointer", fontSize: 11, fontWeight: 600,
                                }}
                              >↺ Re-render</button>
                              <button
                                onClick={() => setSceneEdits(prev => prev.filter((_, j) => j !== i))}
                                style={{
                                  background: "#1a1a1a", border: "1px solid #2a2a2a",
                                  color: "#666", padding: "5px 10px", borderRadius: 5,
                                  cursor: "pointer", fontSize: 11,
                                }}
                              >✕</button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                    {sceneEdits.length > 0 && (
                      <button
                        onClick={() => {
                          toast.info("Applying scene edits and re-rendering…");
                          setShowScenePanel(false);
                          handleStartRealRender();
                        }}
                        style={{
                          marginTop: 14, width: "100%", padding: "12px",
                          background: `linear-gradient(135deg, ${ACCENT}, #5a3a9a)`,
                          border: "none", color: "#fff", borderRadius: 8,
                          cursor: "pointer", fontSize: 13, fontWeight: 700,
                        }}
                      >Apply Edits & Re-render (Free)</button>
                    )}
                  </div>
                )}

                {/* Download button (shown after preview) */}
                {previewConfirmed && (
                  <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a
                      href={genVideoUrl}
                      download="wizanimate-output.mp4"
                      style={{
                        flex: 1, display: "block", textAlign: "center",
                        background: GREEN, color: "#fff",
                        padding: "12px 24px", borderRadius: 6,
                        fontSize: 14, fontWeight: 700, textDecoration: "none",
                      }}
                    >⬇ Download MP4</a>
                    <button
                      onClick={() => {
                        setGenVideoUrl(null);
                        setGenProjectId(null);
                        setGenProgress(0);
                        setPreviewConfirmed(false);
                        setShowScenePanel(false);
                        setStep("audio");
                        toast.success("Ready to create a new animation!");
                      }}
                      style={{
                        background: "#1a1a1a", border: "1px solid #2a2a2a",
                        color: "#666", padding: "12px 20px", borderRadius: 6,
                        cursor: "pointer", fontSize: 13, fontWeight: 600,
                      }}
                    >+ New Animation</button>
                  </div>
                )}
              </div>
            )}

            {/* Render button */}
            {!isGenerating && !genVideoUrl && (
              <button
                onClick={() => {
                  if (!isAuthenticated) { window.location.href = getLoginUrl("/kids-video"); return; }
                  setShowPreRenderModal(true);
                }}
                disabled={brief.trim().length < 10}
                style={{
                  width: "100%", padding: "18px 24px",
                  background: brief.trim().length >= 10
                    ? `linear-gradient(135deg, ${ACCENT}, #5a3a9a)` : "#1a1a1a",
                  border: "none",
                  color: brief.trim().length >= 10 ? "#fff" : "#444",
                  borderRadius: 10,
                  cursor: brief.trim().length >= 10 ? "pointer" : "not-allowed",
                  fontSize: 16, fontWeight: 700, letterSpacing: "1px",
                  boxShadow: brief.trim().length >= 10 ? `0 4px 24px rgba(124,92,191,0.4)` : "none",
                  transition: "all 0.2s",
                }}
              >
                🎬 Generate Animation — {kidsCreditCost.toLocaleString()} Credits
              </button>
            )}

            {isGenerating && (
              <button
                onClick={() => { stopGen(); setIsGenerating(false); }}
                style={{
                  width: "100%", padding: "14px 24px",
                  background: "#1a1a1a", border: "1px solid #2a2a2a",
                  color: "#666", borderRadius: 10, cursor: "pointer",
                  fontSize: 14, fontWeight: 600,
                }}
              >Cancel Generation</button>
            )}

            <div style={{ marginTop: 16 }}>
              <button onClick={() => setStep("brief")} style={{
                background: "none", border: "none", color: "#555",
                cursor: "pointer", fontSize: 13, padding: 0,
              }}>← Back to Story Settings</button>
            </div>
          </div>
        )}
      </div>

      <LandscapeHint />
      <QuickTopUpModal open={topUpOpen} onOpenChange={v => setTopUpOpen(v)} currentBalance={creditBalance ?? 0} />
      <WizGenesisModal
        open={showPreRenderModal}
        onClose={() => setShowPreRenderModal(false)}
        jobId={0}
        jobType="kids_video"
        videoTitle={undefined}
        sceneCount={sceneCount}
        creditCost={kidsCreditCost}
        onRenderConfirmed={() => { setShowPreRenderModal(false); handleStartRealRender(); }}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StepHeader({ icon, title, sub, engine }: { icon: ReactNode; title: string; sub: string; engine: keyof typeof ENGINE_COLORS }) {
  const ec = ENGINE_COLORS[engine];
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>{title}</h2>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "1px",
          padding: "3px 8px", borderRadius: 3,
          background: ec.bg, border: `1px solid ${ec.border}`, color: ec.text,
          textTransform: "uppercase", whiteSpace: "nowrap",
        }}>Powered by {engine}™</div>
      </div>
      <p style={{ fontSize: 14, color: "#666", margin: 0, paddingLeft: 40 }}>{sub}</p>
      <div style={{ height: 1, background: "#1e1e1e", marginTop: 20 }} />
    </div>
  );
}

// ─── Storyboard Preview Step ─────────────────────────────────────────────────
interface StoryboardScene {
  sceneIndex: number;
  sceneLabel: string;
  description: string;
  lyricCue: string;
  mood: string;
}

function StoryboardPreviewStep({
  brief, lyrics, animStyle, sceneCount, audioDuration,
  leadCharacterName, characters, onBack, onNext,
}: {
  brief: string;
  lyrics: string;
  animStyle: string;
  sceneCount: number;
  audioDuration: number;
  leadCharacterName?: string;
  characters: Array<{ name: string; description: string; isLead: boolean }>;
  onBack: () => void;
  onNext: () => void;
}) {
  const [scenes, setScenes] = useState<StoryboardScene[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [saved, setSaved] = useState(false);

  const [storyboardTitle, setStoryboardTitle] = useState("");
  const [showSavedList, setShowSavedList] = useState(false);

  const previewMutation = trpc.kidsVideo.previewStoryboard.useMutation({
    onSuccess: (data) => setScenes(data.scenes),
  });

  const saveMutation = trpc.kidsVideo.saveStoryboard.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const { data: savedList, refetch: refetchSaved } = trpc.kidsVideo.listStoryboards.useQuery(undefined, { enabled: showSavedList });
  const deleteMutation = trpc.kidsVideo.deleteStoryboard.useMutation({ onSuccess: () => refetchSaved() });

  // Auto-generate on mount
  useEffect(() => {
    if (brief.trim().length >= 10) {
      previewMutation.mutate({
        brief,
        lyrics: lyrics || undefined,
        animStyle,
        sceneCount,
        audioDuration: audioDuration > 0 ? audioDuration : undefined,
        leadCharacterName: leadCharacterName || undefined,
        characters: characters.length > 0 ? characters : undefined,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditText(scenes[idx]?.description ?? "");
  };

  const saveEdit = (idx: number) => {
    setScenes(prev => prev.map((s, i) => i === idx ? { ...s, description: editText } : s));
    setEditingIdx(null);
  };

  const handleSaveStoryboard = () => {
    const title = storyboardTitle.trim() || `Storyboard ${new Date().toLocaleDateString()}`;
    saveMutation.mutate({
      title,
      brief,
      lyrics: lyrics || undefined,
      animStyle,
      sceneCount,
      scenes: JSON.stringify(scenes),
    });
  };

  const ACCENT = "#7c5cbf";
  const GOLD = "#c9a227";
  const GOLD_BORDER = "rgba(201,162,39,0.3)";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: "1px", marginBottom: 4 }}>STEP 5 · WIZBOARD™</div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff" }}>Storyboard Preview</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>Review and edit your scene-by-scene storyboard before rendering</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => previewMutation.mutate({ brief, lyrics: lyrics || undefined, animStyle, sceneCount, audioDuration: audioDuration > 0 ? audioDuration : undefined, leadCharacterName: leadCharacterName || undefined, characters: characters.length > 0 ? characters : undefined })}
            disabled={previewMutation.isPending}
            style={{ padding: "8px 14px", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#999", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
          >{previewMutation.isPending ? "⏳ Generating…" : "🔄 Regenerate"}</button>
          <button
            onClick={() => { setShowSavedList(s => !s); }}
            style={{ padding: "8px 14px", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#999", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
          >📂 My Storyboards</button>
          <button
            onClick={handleSaveStoryboard}
            disabled={scenes.length === 0 || saveMutation.isPending}
            style={{ padding: "8px 14px", background: saved ? "rgba(109,184,109,0.15)" : "rgba(201,162,39,0.1)", border: `1px solid ${saved ? "rgba(109,184,109,0.3)" : GOLD_BORDER}`, color: saved ? "#6db86d" : GOLD, borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 }}
          >{saveMutation.isPending ? "Saving…" : saved ? "✓ Saved!" : "💾 Save Storyboard"}</button>
        </div>
      </div>

      {/* Title input for saving */}
      {scenes.length > 0 && (
        <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Storyboard title (optional)"
            value={storyboardTitle}
            onChange={e => setStoryboardTitle(e.target.value)}
            style={{ flex: 1, background: "#0e0e0e", border: "1px solid #2a2a2a", borderRadius: 6, color: "#ccc", fontSize: 13, padding: "8px 12px" }}
          />
        </div>
      )}

      {/* Saved storyboards panel */}
      {showSavedList && (
        <div style={{ background: "#0a0a0a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12 }}>My Saved Storyboards</div>
          {!savedList || savedList.length === 0 ? (
            <div style={{ fontSize: 12, color: "#555" }}>No saved storyboards yet. Generate and save one above.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {savedList.map(sb => (
                <div key={sb.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#141414", borderRadius: 6, padding: "10px 14px" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{sb.title}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{sb.sceneCount} scenes · {new Date(sb.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        try { setScenes(JSON.parse(sb.scenes)); setShowSavedList(false); } catch {}
                      }}
                      style={{ padding: "6px 12px", background: ACCENT, border: "none", color: "#fff", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                    >Load</button>
                    <button
                      onClick={() => deleteMutation.mutate({ id: sb.id })}
                      style={{ padding: "6px 12px", background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff5050", borderRadius: 5, cursor: "pointer", fontSize: 11 }}
                    >Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {previewMutation.isPending && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎥</div>
          <div style={{ fontSize: 14, color: ACCENT }}>WizBoard™ is generating your storyboard…</div>
          <div style={{ fontSize: 12, color: "#444", marginTop: 6 }}>Analysing your brief, lyrics, and characters</div>
        </div>
      )}

      {previewMutation.isError && (
        <div style={{ padding: 16, background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 8, color: "#ff5050", fontSize: 13, marginBottom: 16 }}>
          Failed to generate storyboard. <button onClick={() => previewMutation.mutate({ brief, lyrics: lyrics || undefined, animStyle, sceneCount })} style={{ background: "none", border: "none", color: "#ff8080", cursor: "pointer", textDecoration: "underline" }}>Try again</button>
        </div>
      )}

      {scenes.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
          {scenes.map((scene, idx) => (
            <div key={idx} style={{ background: "#0e0e0e", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "hidden" }}>
              {/* Scene header */}
              <div style={{ background: "#141414", padding: "10px 14px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: 10, color: ACCENT, fontWeight: 700, letterSpacing: "0.5px" }}>SCENE {scene.sceneIndex + 1}</span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 2 }}>{scene.sceneLabel}</div>
                </div>
                <span style={{ fontSize: 10, color: "#555", background: "#1a1a1a", padding: "3px 8px", borderRadius: 4 }}>{scene.mood}</span>
              </div>
              {/* Scene description */}
              <div style={{ padding: 14 }}>
                {editingIdx === idx ? (
                  <div>
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={4}
                      style={{ width: "100%", background: "#1a1a1a", border: "1px solid #3a3a3a", borderRadius: 6, color: "#fff", fontSize: 12, padding: 10, resize: "vertical", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => saveEdit(idx)} style={{ flex: 1, padding: "7px", background: ACCENT, border: "none", color: "#fff", borderRadius: 5, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Save</button>
                      <button onClick={() => setEditingIdx(null)} style={{ flex: 1, padding: "7px", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#666", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: "#ccc", lineHeight: 1.6 }}>{scene.description}</p>
                    {scene.lyricCue && (
                      <div style={{ fontSize: 11, color: GOLD, fontStyle: "italic", borderLeft: `2px solid ${GOLD_BORDER}`, paddingLeft: 8, marginBottom: 10 }}>&#x201C;{scene.lyricCue}&#x201D;</div>
                    )}
                    <button
                      onClick={() => startEdit(idx)}
                      style={{ width: "100%", padding: "7px", background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888", borderRadius: 5, cursor: "pointer", fontSize: 11 }}
                    >✏️ Edit Scene</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid #1a1a1a" }}>
        <button onClick={onBack} style={{ background: "none", border: "1px solid #2a2a2a", color: "#666", padding: "10px 20px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>← Back</button>
        <button
          onClick={onNext}
          style={{ background: `linear-gradient(135deg, #7c5cbf, #5a3a9a)`, border: "none", color: "#fff", padding: "12px 28px", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 4px 16px rgba(124,92,191,0.3)" }}
        >Continue to Render →</button>
      </div>
    </div>
  );
}

function StepNav({
  onBack, onNext, nextLabel, nextDisabled, nextHint,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  nextHint?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid #1a1a1a" }}>
      {onBack ? (
        <button onClick={onBack} style={{
          background: "none", border: "1px solid #2a2a2a",
          color: "#666", padding: "10px 20px", borderRadius: 6,
          cursor: "pointer", fontSize: 13,
        }}>← Back</button>
      ) : <div />}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <button
          onClick={onNext}
          disabled={nextDisabled}
          style={{
            background: nextDisabled ? "#1a1a1a" : `linear-gradient(135deg, #7c5cbf, #5a3a9a)`,
            border: "none",
            color: nextDisabled ? "#444" : "#fff",
            padding: "12px 28px", borderRadius: 6,
            cursor: nextDisabled ? "not-allowed" : "pointer",
            fontSize: 14, fontWeight: 700,
            boxShadow: nextDisabled ? "none" : "0 4px 16px rgba(124,92,191,0.3)",
          }}
        >{nextLabel}</button>
        {nextHint && <div style={{ fontSize: 11, color: "#555" }}>{nextHint}</div>}
      </div>
    </div>
  );
}

function SettingCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#0e0e0e", border: "1px solid #1e1e1e",
      borderRadius: 10, padding: "16px 18px",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>{label}</div>
      {children}
    </div>
  );
}

const counterBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 6,
  background: "#1a1a1a", border: "1px solid #2a2a2a",
  color: "#aaa", fontSize: 18, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

