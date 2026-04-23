/**
 * Kids Animation Creator — Premium Rebuild
 * Unified creation flow matching MusicVideoAutopilot:
 *   concept → story_input → characters → storyboard → render
 *
 * Features:
 *  - Character Lock System (species/colour/features/outfit + photo upload)
 *  - Audio Upload (kids songs, narration, voice recordings)
 *  - 6 Premium Animation Style Cards with hover animations
 *  - Per-scene storyboard editing and regeneration
 *  - WizBrand premium UI elements
 *  - Final video build flow with Stripe checkout
 */
import { analytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Wand2, Sparkles, RefreshCw, Play, ChevronRight,
  Zap, CheckCircle2, Clock, ArrowLeft, Loader2,
  AlertCircle, Download, ExternalLink, Plus, Trash2,
  Star, Shield, Film, User, X, ImageIcon, Upload,
  Music, Lock, Eye, Pencil, RotateCcw, Camera,
  ChevronDown, ChevronUp,
} from "@/lib/icons";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import CreditBalance from "@/components/CreditBalance";
import { LowCreditBanner } from "@/components/LowCreditBanner";
import { useCreditGuard } from "@/hooks/useCreditGuard";
import AuthGate from "@/components/AuthGate";
import { useAuth } from "@/_core/hooks/useAuth";
import { mp } from "@/lib/mixpanel";
import { WizBrandBadge } from "@/components/WizBrand";
import { useSEO } from "@/hooks/useSEO";

// ─── Constants ────────────────────────────────────────────────────────────────

const KIDS_STYLES = [
  {
    id: "pixar3d",
    label: "Stylised 3D",
    desc: "Vibrant 3D animation",
    gradient: "from-blue-600 via-cyan-500 to-blue-400",
    glow: "shadow-[--color-gold]/40",
    border: "border-[--color-gold]/60",
    bg: "bg-[--color-gold]/10",
    selectedBg: "bg-[--color-gold]/15",
    example: "Vibrant · Colourful · Expressive",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/kids-style-pixar3d-NTKiSeKEePTZ64eY2dVzqo.webp",
  },
  {
    id: "disney",
    label: "Magical Cinematic",
    desc: "Magical cinematic animation",
    gradient: "from-[#b8892a] via-[#e8c878] to-[#2e2e36]",
    glow: "shadow-[#b8892a]/40",
    border: "border-[--color-gold]/30",
    bg: "bg-[--color-gold]/15",
    selectedBg: "bg-[--color-gold]/15",
    example: "Enchanted · Magical · Cinematic",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/kids-style-disney-Ps9izwb4mjU6QbawNJEZ9C.webp",
  },
  {
    id: "anime",
    label: "Japanese Anime-Inspired",
    desc: "Japanese animation style",
    gradient: "from-[#9090a0] via-rose-500 to-red-400",
    glow: "shadow-[--color-gold]/40",
    border: "border-[--color-gold]/60",
    bg: "bg-[--color-silver]/10",
    selectedBg: "bg-[--color-silver]/10",
    example: "Expressive · Detailed · Vibrant",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/kids-style-anime-iGDqmnXkbWropdM7MmSEPe.webp",
  },
  {
    id: "cartoon",
    label: "Classic Cartoon",
    desc: "Classic colourful animation",
    gradient: "from-orange-500 via-amber-500 to-yellow-400",
    glow: "shadow-orange-500/40",
    border: "border-orange-500/60",
    bg: "bg-orange-950/40",
    selectedBg: "bg-orange-600/20",
    example: "Colourful · Fun · Family-friendly",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/kids-style-cartoon-g3SpesBvzubV27y7fGnGuq.webp",
  },
  {
    id: "storybook",
    label: "Storybook",
    desc: "Illustrated fairy-tale style",
    gradient: "from-green-600 via-emerald-500 to-teal-400",
    glow: "shadow-[--color-silver]/40",
    border: "border-[--color-silver]/60",
    bg: "bg-[--color-silver]/10",
    selectedBg: "bg-[--color-silver]/15",
    example: "Illustrated · Whimsical · Timeless",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/kids-style-storybook-6Mx6JpiaevStuWQin5HEod.webp",
  },
  {
    id: "claymation",
    label: "Clay Animation",
    desc: "Playful clay-style animation",
    gradient: "from-[#b8892a] via-orange-500 to-red-400",
    glow: "shadow-amber-500/40",
    border: "border-[--color-gold]/30",
    bg: "bg-[--color-gold]/15",
    selectedBg: "bg-[--color-gold]/15",
    example: "Tactile · Playful · Handcrafted",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/kids-style-claymation-ihKTHjJ2NDdPcS9ekpiaNN.webp",
  },
  {
    id: "ghibli",
    label: "Classic Fairytale Animation",
    desc: "Painterly hand-drawn magic",
    gradient: "from-emerald-600 via-teal-500 to-cyan-400",
    glow: "shadow-emerald-500/40",
    border: "border-emerald-500/60",
    bg: "bg-emerald-950/40",
    selectedBg: "bg-emerald-600/20",
    example: "Painterly · Dreamy · Magical",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80",
  },
  {
    id: "pixar_movie",
    label: "Premium 3D Animation",
    desc: "Photorealistic 3D characters",
    gradient: "from-sky-600 via-blue-500 to-indigo-400",
    glow: "shadow-sky-500/40",
    border: "border-sky-500/60",
    bg: "bg-sky-950/40",
    selectedBg: "bg-sky-600/20",
    example: "Photorealistic · Expressive · Cinematic",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80",
  },
  {
    id: "manga",
    label: "Graphic Novel",
    desc: "Black & white comic art style",
    gradient: "from-gray-600 via-slate-500 to-zinc-400",
    glow: "shadow-slate-500/40",
    border: "border-slate-500/60",
    bg: "bg-slate-950/40",
    selectedBg: "bg-slate-600/20",
    example: "Bold · Graphic · High-contrast",
    image: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=600&q=80",
  },
  {
    id: "retro80s",
    label: "Retro Cartoon",
    desc: "Neon synthwave cartoon style",
    gradient: "from-purple-600 via-pink-500 to-rose-400",
    glow: "shadow-purple-500/40",
    border: "border-purple-500/60",
    bg: "bg-purple-950/40",
    selectedBg: "bg-purple-600/20",
    example: "Neon · Retro · Action-packed",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80",
  },
  {
    id: "watercolor",
    label: "Storybook Watercolour",
    desc: "Soft painterly illustration",
    gradient: "from-pink-500 via-rose-400 to-orange-300",
    glow: "shadow-pink-500/40",
    border: "border-pink-500/60",
    bg: "bg-pink-950/40",
    selectedBg: "bg-pink-600/20",
    example: "Soft · Gentle · Illustrated",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=80",
  },
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
    step: "1", emoji: "",
    title: "Describe Your Story",
    desc: "Type a simple story idea — or pick from our inspiration prompts. No writing experience needed.",
    color: "from-[#9090a0]/20 to-[#2e2e36]/10 border-[--color-silver]/30",
  },
  {
    step: "2", emoji: "",
    title: "Lock Your Characters",
    desc: "Define species, colour, and features. AI enforces strict character consistency across every scene.",
    color: "from-[#b8892a]/20 to-[#4a3010]/10 border-[--color-gold]/30",
  },
  {
    step: "3", emoji: "",
    title: "See Your Free Storyboard",
    desc: "AI instantly creates 4–6 illustrated scenes. Review, edit, regenerate — completely free.",
    color: "from-blue-500/20 to-[#2e2e36]/10 border-blue-500/30",
  },
  {
    step: "4", emoji: "",
    title: "Unlock Your Video",
    desc: "Build it into a full animated video with WizSound™ cinematic audio.",
    color: "from-orange-500/20 to-[#4a3010]/10 border-orange-500/30",
  },
];

const FEATURES = [
  { title: "Character Lock System", desc: "Define species, colour, features, and outfit. AI enforces strict consistency — no variation between scenes." },
  { title: "Photo Reference Upload", desc: "Upload a photo of your pet or character. AI uses it as the base identity for every scene." },
  { title: "Audio Upload", desc: "Upload kids songs, narration, or voice recordings. Supports lip sync compatibility." },
  { title: "Free Storyboard, Always", desc: "Generate and regenerate your storyboard as many times as you want before spending a single credit." },
  { title: "12 Animation Styles", desc: "Stylised 3D, Magical Cinematic, Japanese Anime-Inspired, Classic Cartoon, Storybook, Clay Animation, Classic Fairytale, Premium 3D, Graphic Novel, Retro Cartoon, Storybook Watercolour — each with distinct visual character." },
  { title: "Child-Safe by Design", desc: "All content is filtered and reviewed to ensure it's safe, positive, and appropriate for children." },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "concept" | "story_input" | "characters" | "storyboard" | "render";

interface KidsCharacter {
  id: string;
  name: string;
  // Character lock fields
  species: string;
  colour: string;
  features: string;
  outfit: string;
  // Legacy description (combined from lock fields)
  description: string;
  // Visuals
  imageUrl: string | null;
  photoUrl: string | null;
  isGenerating: boolean;
  isUploadingPhoto: boolean;
  // UI state
  expanded: boolean;
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
  { key: "render",      label: "4. Build" },
];

function stepIndex(step: Step): number {
  return CREATION_STEPS.findIndex((s) => s.key === step);
}

function buildCharacterDescription(char: KidsCharacter): string {
  const parts: string[] = [];
  if (char.species.trim()) parts.push(char.species.trim());
  if (char.colour.trim()) parts.push(`${char.colour.trim()} colouring`);
  if (char.features.trim()) parts.push(char.features.trim());
  if (char.outfit.trim()) parts.push(`wearing ${char.outfit.trim()}`);
  return parts.join(", ") || char.description;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KidsVideo() {

  useSEO({ title: "AI Kids Video & Animation Creator — WIZ AI", path: "/kids-video", description: "Create safe, fun AI-animated videos for kids. Nursery rhymes, cartoons, and educational content in Pixar, Disney, and storybook styles. No editing skills needed." });
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

  // ── Audio upload ──
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // ── Characters ──
  const [characters, setCharacters] = useState<KidsCharacter[]>([
    {
      id: "char-1",
      name: "Main Character",
      species: "",
      colour: "",
      features: "",
      outfit: "",
      description: "",
      imageUrl: null,
      photoUrl: null,
      isGenerating: false,
      isUploadingPhoto: false,
      expanded: true,
    },
  ]);

  // ── Storyboard editing ──
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null);
  const [editingSceneText, setEditingSceneText] = useState("");
  const [regeneratingSceneIndex, setRegeneratingSceneIndex] = useState<number | null>(null);

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
  const selectedStyle = KIDS_STYLES.find((s) => s.id === style)!;

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
        toast.success("Payment successful! Your video is being built ");
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
          toast.success("– Your kids animation is ready!");
        } else if (job.renderStatus === "failed") {
          clearInterval(pollRef.current!);
          toast.error(job.errorMessage || "Build failed. Please contact support.");
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
  const uploadCharacterPhotoMutation = trpc.kidsVideo.uploadCharacterPhoto.useMutation();
  const regenerateSceneMutation = trpc.kidsVideo.regenerateScene.useMutation();
  const createRenderCheckoutMutation = trpc.kidsVideo.createRenderCheckout.useMutation();
  const addSceneMutation = trpc.kidsVideo.addScene.useMutation();
  const deleteSceneMutation = trpc.kidsVideo.deleteScene.useMutation();

  // ── Scene add/remove handlers ──
  const handleAddScene = useCallback(async (afterSceneIndex?: number) => {
    if (!jobId) return;
    try {
      const result = await addSceneMutation.mutateAsync({ jobId, afterSceneIndex });
      if (result.frames) setStoryboardFrames(result.frames as StoryboardFrame[]);
      toast.success("Scene added");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to add scene");
    }
  }, [jobId, addSceneMutation]);

  const handleDeleteScene = useCallback(async (sceneIndex: number) => {
    if (!jobId) return;
    try {
      const result = await deleteSceneMutation.mutateAsync({ jobId, sceneIndex });
      if (result.frames) setStoryboardFrames(result.frames as StoryboardFrame[]);
      toast.success("Scene removed");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to remove scene");
    }
  }, [jobId, deleteSceneMutation]);

  // ── Audio handlers ──
  const handleAudioFile = useCallback((file: File) => {
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      toast.error("Audio file must be under 16MB.");
      return;
    }
    const allowed = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a", "audio/mp4", "audio/webm"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|webm)$/i)) {
      toast.error("Supported formats: MP3, WAV, OGG, M4A, WebM.");
      return;
    }
    setAudioFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Strip data URL prefix to get base64
      const base64 = result.split(",")[1];
      setAudioBase64(base64);
      setAudioMimeType(file.type || "audio/mpeg");
    };
    reader.readAsDataURL(file);
    toast.success(`Audio added: ${file.name}`);
  }, []);

  // ── Photo upload handler ──
  const handlePhotoUpload = useCallback(async (charId: string, file: File) => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) { toast.error("Photo must be under 10MB."); return; }
    setCharacters((prev) => prev.map((c) => c.id === charId ? { ...c, isUploadingPhoto: true } : c));
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const char = characters.find((c) => c.id === charId);
      const result = await uploadCharacterPhotoMutation.mutateAsync({
        photoBase64: base64,
        mimeType: (file.type as "image/jpeg" | "image/png" | "image/webp") || "image/jpeg",
        characterName: char?.name || "character",
      });
      setCharacters((prev) => prev.map((c) => c.id === charId ? { ...c, photoUrl: result.photoUrl, imageUrl: result.photoUrl, isUploadingPhoto: false } : c));
      toast.success("Photo uploaded! This will be used as the character reference. ");
    } catch (err: any) {
      setCharacters((prev) => prev.map((c) => c.id === charId ? { ...c, isUploadingPhoto: false } : c));
      toast.error(err?.message || "Photo upload failed.");
    }
  }, [uploadCharacterPhotoMutation]);

  // ── Character handlers ──
  const handleGenerateCharacterImage = useCallback(async (charId: string) => {
    if (!isAuthenticated) { setShowAuthGate(true); return; }
    const char = characters.find((c) => c.id === charId);
    if (!char) return;
    const desc = buildCharacterDescription(char);
    if (desc.trim().length < 5) {
      toast.error("Please fill in at least the species or description first.");
      return;
    }
    setCharacters((prev) => prev.map((c) => c.id === charId ? { ...c, isGenerating: true } : c));
    try {
      const result = await generateCharacterMutation.mutateAsync({
        characterPrompt: `${char.name}: ${desc}`,
        animationStyle: style as "pixar3d" | "disney" | "anime" | "cartoon" | "storybook" | "claymation" | "ghibli" | "pixar_movie" | "manga" | "retro80s" | "watercolor",

      });
      setCharacters((prev) => prev.map((c) => c.id === charId ? { ...c, imageUrl: result.imageUrl ?? null, isGenerating: false } : c));
      toast.success(`${char.name} generated! `);
    } catch (err: any) {
      setCharacters((prev) => prev.map((c) => c.id === charId ? { ...c, isGenerating: false } : c));
      toast.error(err?.message || "Character generation failed.");
    }
  }, [isAuthenticated, characters, style, generateCharacterMutation]);

  const handleAddCharacter = useCallback(() => {
    if (characters.length >= 4) { toast.error("Maximum 4 characters per video."); return; }
    setCharacters((prev) => [
      ...prev,
      {
        id: `char-${Date.now()}`,
        name: `Character ${prev.length + 1}`,
        species: "", colour: "", features: "", outfit: "", description: "",
        imageUrl: null, photoUrl: null,
        isGenerating: false, isUploadingPhoto: false, expanded: true,
      },
    ]);
  }, [characters.length]);

  const handleRemoveCharacter = useCallback((charId: string) => {
    setCharacters((prev) => {
      if (prev.length <= 1) { toast.error("You need at least one character."); return prev; }
      return prev.filter((c) => c.id !== charId);
    });
  }, []);

  // ── Storyboard handlers ──
  const handleGenerateStoryboard = useCallback(async () => {
    if (!isAuthenticated) { setShowAuthGate(true); return; }
    setStoryboardError(null);
    setIsCreatingJob(true);
    try {
      const referenceImageUrls = characters
        .filter((c) => c.imageUrl)
        .map((c) => c.imageUrl as string);

      const characterLockData = characters
        .filter((c) => buildCharacterDescription(c).trim().length >= 5)
        .map((c) => ({
          id: c.id,
          name: c.name,
          species: c.species,
          colour: c.colour,
          features: c.features,
          outfit: c.outfit,
          photoUrl: c.photoUrl ?? undefined,
          lockedPrompt: buildCharacterDescription(c),
        }));

      let currentJobId = jobId;
      if (!currentJobId) {
        const result = await createJobMutation.mutateAsync({
          storyPrompt: prompt,
          animationStyle: style as "pixar3d" | "disney" | "anime" | "cartoon" | "storybook" | "claymation" | "ghibli" | "pixar_movie" | "manga" | "retro80s" | "watercolor",
          videoLength: videoLength as "5s" | "10s" | "15s" | "30s" | "60s",
          screenFormat: screenFormat as "16:9" | "9:16" | "1:1",
          referenceImageUrls: referenceImageUrls.length > 0 ? referenceImageUrls : undefined,
          characterLockData: characterLockData.length > 0 ? characterLockData : undefined,
          audioBase64: audioBase64 ?? undefined,
          audioMimeType: (audioMimeType as "audio/mpeg" | "audio/wav" | "audio/mp4" | "audio/ogg" | undefined) ?? undefined,
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
      toast.success("Storyboard ready! Review your scenes below ");
    } catch (err: any) {
      setStoryboardError(err?.message || "Storyboard generation failed. Please try again.");
      toast.error(err?.message || "Storyboard generation failed.");
    } finally {
      setIsCreatingJob(false);
      setIsGeneratingStoryboard(false);
    }
  }, [
    isAuthenticated, prompt, style, videoLength, screenFormat,
    characters, jobId, audioBase64, audioMimeType,
    createJobMutation, generateStoryboardMutation,
  ]);

  const handleRegenerateStoryboard = useCallback(async () => {
    if (!jobId) return;
    setStoryboardError(null);
    setIsGeneratingStoryboard(true);
    try {
      const result = await generateStoryboardMutation.mutateAsync({ jobId });
      setStoryboardFrames(result.frames as StoryboardFrame[]);
      mp.storyboardRegenerated(result.frames.length);
      toast.success("Storyboard regenerated — free of charge! ");
    } catch (err: any) {
      setStoryboardError(err?.message || "Regeneration failed.");
      toast.error(err?.message || "Regeneration failed.");
    } finally {
      setIsGeneratingStoryboard(false);
    }
  }, [jobId, generateStoryboardMutation]);

  const handleRegenerateScene = useCallback(async (sceneIndex: number, customPrompt?: string) => {
    if (!jobId) return;
    setRegeneratingSceneIndex(sceneIndex);
    try {
      const result = await regenerateSceneMutation.mutateAsync({
        jobId,
        sceneIndex,
        customPrompt,
      });
      setStoryboardFrames((prev) => prev.map((f) =>
        f.sceneIndex === sceneIndex
          ? { ...f, imageUrl: result.imageUrl ?? f.imageUrl }
          : f
      ));
      toast.success(`Scene ${sceneIndex + 1} regenerated! `);
    } catch (err: any) {
      toast.error(err?.message || "Scene regeneration failed.");
    } finally {
      setRegeneratingSceneIndex(null);
      setEditingSceneIndex(null);
    }
  }, [jobId, regenerateSceneMutation]);

  const handleRenderVideo = useCallback(async () => {
    if (!isAuthenticated) { setShowAuthGate(true); return; }
    if (!jobId) { toast.error("Please generate a storyboard first."); return; }
    analytics.renderVideoClicked("kids_video");
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
    setAudioFile(null);
    setAudioBase64(null);
    setAudioMimeType(null);
    setCharacters([{
      id: "char-1", name: "Main Character",
      species: "", colour: "", features: "", outfit: "", description: "",
      imageUrl: null, photoUrl: null,
      isGenerating: false, isUploadingPhoto: false, expanded: true,
    }]);
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
    <div className="min-h-screen studio-bg text-white" style={{backgroundColor:'#06050a'}}>
      {/* ── VR Environment: Animation Render Farm ── */}
      <div className="env-bg">
        <img src="/manus-storage/env-hollywood-studio_1da3e15e.jpg" alt="" />
        <div className="env-bg-overlay" />
      </div>
      <div className="env-ambient env-tint-cinematic" />

      <AuthGate open={showAuthGate} onClose={() => setShowAuthGate(false)} featureName="create your kids animation" />

      {/* ── Header ── */}
      <div className="studio-header sticky top-0 z-30">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <button
            type="button"
            onClick={() => {
              if (step === "characters") setStep("story_input");
              else if (step === "story_input") setStep("concept");
              else if (step === "storyboard") setStep("characters");
              else if (step === "render" && renderStatus === "not_started") setStep("storyboard");
              else { window.location.href = "/"; }
            }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">
              {step === "characters" ? "Edit Story" :
               step === "storyboard" ? "Characters" :
               step === "render" ? "Storyboard" : "Back"}
            </span>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.08em" }}>WIZANIMATE</span>
            <span className="bg-[--color-gold] text-black text-[10px] font-bold px-2 py-0.5 rounded tracking-widest">AI ANIMATION ENGINE</span>
          </div>

          {step !== "concept" ? (
            <CreditBalance variant="badge" />
          ) : (
            <Button
              size="sm"
              onClick={() => setStep("story_input")}
              className="bg-gradient-to-r from-[#9090a0] to-orange-500 hover:from-[#9090a0] hover:to-orange-400 text-white border-0 text-xs px-4"
            >
              Start Creating
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
                          ? "bg-[--color-gold] text-white shadow-lg shadow-[#b8892a]/30"
                          : currentStepIndex > i
                          ? "bg-[--color-silver]/15 text-[--color-silver]"
                          : "bg-white/10 text-muted-foreground"
                      }`}
                    >
                      {currentStepIndex > i ? <CheckCircle2 className="h-3 w-3" /> : null}
                      {s.label}
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
          CONCEPT / LANDING PAGE
      ══════════════════════════════════════════════════════════════════════ */}
      {step === "concept" && (
        <div>
          {/* Hero */}
          <section className="relative py-20 sm:py-28 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#9090a0]/30 via-background to-[#4a3010]/20 pointer-events-none" />
            <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full bg-[--color-silver]/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 right-1/4 w-48 h-48 rounded-full bg-[--color-gold]/15 blur-3xl pointer-events-none" />
            <div className="container mx-auto px-4 max-w-4xl text-center relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-[--color-silver]/30 bg-[--color-silver]/10 px-4 py-1.5 text-xs sm:text-sm text-[--color-silver] mb-6">
                <Lock className="h-3.5 w-3.5" />
                Character Lock System · Strict Scene Consistency
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                WizAnimate™
                <span className="block bg-gradient-to-r from-[#e8c878] via-[#f2dfa0] to-[#b8892a] bg-clip-text text-transparent">
                  Character Animation
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Bring your characters to life with fluid, beat-matched AI animation — studio-quality output in minutes.
              </p>
              <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-sm text-muted-foreground mb-10">
                {[
                  { value: "12", label: "Animation styles" },
                  { value: "Free", label: "Storyboard preview" },
                  { value: "100%", label: "Child-safe content" },
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
                  className="gap-2 bg-gradient-to-r from-[#b8892a] to-[#e8c878] hover:from-[#e8c878] hover:to-[#b8892a] text-white border-0 px-10 py-6 text-base font-semibold shadow-lg shadow-[#b8892a]/25"
                >
                  <Wand2 className="h-5 w-5" />
                  Create Free Storyboard
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
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center mb-3">
                    <span className="text-lg font-bold text-[--color-gold]">{item.step}</span>
                  </div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Step {item.step}</div>
                    <h3 className="text-sm font-bold text-white mb-1.5">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Animation Styles — Premium Cards */}
          <section className="py-16 sm:py-20 border-t border-white/5 bg-white/[0.02]">
            <div className="container mx-auto px-4 max-w-5xl">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">12 Animation Styles</h2>
                <p className="text-muted-foreground">Every style is character-consistent across all scenes</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {KIDS_STYLES.map((s) => (
                  <div
                    key={s.id}
                    className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:${s.glow} hover:${s.border} border-white/10`}
                    onClick={() => { setStyle(s.id); setStep("story_input"); }}
                  >
                    {/* Style preview image */}
                    <div className="relative h-32 sm:h-36 overflow-hidden">
                      <img
                        src={s.image}
                        alt={s.label}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    </div>
                    {/* Text content */}
                    <div className={`${s.bg} p-3 text-center`}>
                      <div className="font-bold text-white text-sm mb-0.5">{s.label}</div>
                      <div className="text-xs text-muted-foreground mb-1">{s.desc}</div>
                      <div className="text-[10px] text-muted-foreground/50 italic leading-tight">{s.example}</div>
                    </div>
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${s.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
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
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[--color-gold]/20 to-[--color-gold]/5 border border-[--color-gold]/20 flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5 text-[--color-gold]" />
                  </div>
                  {/* icon field removed */}
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
              <p className="text-muted-foreground mb-10">The storyboard is always free. Credits are only used when you build your final video.</p>
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                {[
                  { duration: "10s video", credits: "100 credits", note: "Perfect for social" },
                  { duration: "30s video", credits: "300 credits", note: "Great for stories" },
                  { duration: "60s video", credits: "600 credits", note: "Full short film" },
                ].map((p) => (
                  <div key={p.duration} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="font-bold text-white text-lg mb-1">{p.duration}</div>
                    <div className="text-[--color-silver] font-semibold text-sm mb-1">{p.credits}</div>
                    <div className="text-xs text-muted-foreground">{p.note}</div>
                  </div>
                ))}
              </div>
              <Button
                size="lg"
                onClick={() => setStep("story_input")}
                className="gap-2 bg-gradient-to-r from-[#b8892a] to-[#e8c878] hover:from-[#e8c878] hover:to-[#b8892a] text-white border-0 px-10 py-6 text-base font-semibold shadow-lg shadow-[#b8892a]/25"
              >
                <Sparkles className="h-5 w-5" />
                Start with a Free Storyboard
              </Button>
            </div>
          </section>

          {/* Trust signals */}
          <section className="py-12 border-t border-white/5">
            <div className="container mx-auto px-4 max-w-3xl">
              <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-center">
                {[
                  "Child-Safe Content",
                  "Character Lock",
                  "Photo Upload",
                  "Audio Upload",
                  "Unlimited Previews",
                ].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-[--color-gold] flex-shrink-0" /><span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="py-16 sm:py-20 border-t border-white/5 bg-gradient-to-b from-background to-[#2e2e36]/20">
            <div className="container mx-auto px-4 max-w-2xl text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[--color-gold]/20 to-orange-500/20 border border-[--color-gold]/20 flex items-center justify-center mb-6 mx-auto">
                <Sparkles className="w-8 h-8 text-[--color-gold]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to Create Something Magical?</h2>
              <p className="text-muted-foreground mb-8">Your child's story, brought to life in minutes. Start with a free storyboard — no credit card needed.</p>
              <Button
                size="lg"
                onClick={() => setStep("story_input")}
                className="gap-2 bg-gradient-to-r from-[#9090a0] to-orange-500 hover:from-[#9090a0] hover:to-orange-400 text-white border-0 px-12 py-6 text-base font-semibold shadow-lg shadow-pink-500/25"
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
        <div className="container mx-auto px-4 py-6 sm:py-10">
          <div className="grid lg:grid-cols-[220px_1fr_300px] gap-6 max-w-7xl mx-auto">
            {/* ── LEFT SIDEBAR: Config Summary ── */}
            <aside className="hidden lg:block space-y-4 sticky top-20 self-start">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-4">
                <h3 className="text-xs font-bold text-[--color-gold] tracking-widest uppercase">Project Config</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Style</div>
                    <div className="text-sm text-white font-medium">{selectedStyle?.label || 'Stylised 3D'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration</div>
                    <div className="text-sm text-white font-medium">{videoLength}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Format</div>
                    <div className="text-sm text-white font-medium">{screenFormat}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Characters</div>
                    <div className="text-sm text-white font-medium">{characters.length} defined</div>
                  </div>
                  {audioFile && (
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Audio</div>
                      <div className="text-sm text-green-400 font-medium truncate">{audioFile.name}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 space-y-3">
                <h3 className="text-xs font-bold text-[--color-gold] tracking-widest uppercase">Credits</h3>
                <div className="text-2xl font-bold text-white">{creditCost}</div>
                <div className="text-xs text-muted-foreground">credits for final render</div>
                <div className="text-[10px] text-muted-foreground border-t border-white/10 pt-3 mt-2">
                  Storyboard preview is always free. You only pay when you build your final video.
                </div>
              </div>
            </aside>
            {/* ── CENTER: Main Workspace ── */}
            <div className="max-w-3xl mx-auto w-full">

          {/* ── STEP 1: STORY INPUT ── */}
          {step === "story_input" && (
            <div className="space-y-6 sm:space-y-8">
              <div className="text-center">
                <WizBrandBadge layer="create" animated className="mb-4" />
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Tell Your Story</h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Describe your story idea, pick an animation style, and we'll create a free storyboard for you to review.
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
                  <p className="text-xs text-muted-foreground mb-2">– Need inspiration? Try one of these:</p>
                  <div className="flex flex-wrap gap-2">
                    {PROMPT_EXAMPLES.slice(0, 3).map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(ex)}
                        className="text-xs rounded-full border border-[--color-silver]/20 bg-[--color-silver]/10 px-3 py-1 text-[--color-silver] hover:bg-[--color-silver]/10 transition text-left"
                      >
                        {ex.slice(0, 45)}…
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Animation Style — Premium Cards with Thumbnails */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">Animation Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {KIDS_STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={`group relative rounded-xl border overflow-hidden text-left transition-all duration-200 ${
                        style === s.id
                          ? `${s.border} shadow-lg ${s.glow} ring-2 ring-white/20`
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      {/* Thumbnail image */}
                      <div className="relative h-24 overflow-hidden">
                        <img
                          src={s.image}
                          alt={s.label}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Selected tick */}
                        {style === s.id && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </div>
                        )}
                      </div>
                      {/* Text content */}
                      <div className={`p-2.5 ${style === s.id ? s.selectedBg : "bg-white/5"}`}>
                        <div className={`font-semibold text-sm mb-0.5 ${style === s.id ? "text-white" : "text-muted-foreground group-hover:text-white"}`}>
                          {s.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70 leading-tight">{s.desc}</div>
                      </div>
                      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${s.gradient} transition-opacity duration-200 ${style === s.id ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`} />
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
                            ? "border-pink-500 bg-[--color-silver]/10 text-white"
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
                            ? "border-pink-500 bg-[--color-silver]/10 text-white"
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

              {/* Audio Upload */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Music className="h-4 w-4 text-[--color-silver]" />
                  <span className="text-sm font-medium text-white">Upload Audio</span>
                  <Badge className="bg-white/10 text-muted-foreground border-white/10 text-xs">Optional</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Add kids songs, narration, or voice recordings. Supports lip sync compatibility. Max 16MB.
                </p>
                {audioFile ? (
                  <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-3">
                    <Music className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium truncate">{audioFile.name}</div>
                      <div className="text-xs text-muted-foreground">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                    <button
                      onClick={() => { setAudioFile(null); setAudioBase64(null); setAudioMimeType(null); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition flex-shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                      isDraggingAudio
                        ? "border-[--color-gold]/60 bg-[--color-silver]/10"
                        : "border-white/10 hover:border-[--color-silver]/30 hover:bg-[--color-silver]/10"
                    }`}
                    onClick={() => audioInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingAudio(true); }}
                    onDragLeave={() => setIsDraggingAudio(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingAudio(false);
                      const file = e.dataTransfer.files[0];
                      if (file) handleAudioFile(file);
                    }}
                  >
                    <Upload className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      <span className="text-[--color-silver] font-medium">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">MP3, WAV, OGG, M4A, WebM · Max 16MB</p>
                  </div>
                )}
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAudioFile(file);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* CTA */}
              <div className="text-center">
                <Button
                  size="lg"
                  onClick={handleGoToCharacters}
                  disabled={prompt.length < 10}
                  className="gap-2 bg-gradient-to-r from-[#9090a0] to-orange-500 hover:from-[#9090a0] hover:to-orange-400 text-white border-0 w-full sm:w-auto px-10 py-6 text-base font-semibold"
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
                <div className="inline-flex items-center gap-2 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/15 px-4 py-1.5 text-xs sm:text-sm text-[--color-gold] mb-4">
                  <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                  Character Lock System — strict consistency across all scenes
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">– Design Your Characters</h2>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                  Define your characters precisely. The AI will enforce these details in every scene — no variation allowed.
                </p>
              </div>

              {/* Character Lock explainer */}
              <div className="rounded-2xl border border-[--color-gold]/30 bg-[--color-gold]/15 p-4 flex items-start gap-3">
                <Lock className="h-4 w-4 text-[--color-gold] mt-0.5 flex-shrink-0" />
                <div className="text-xs text-[--color-gold] leading-relaxed">
                  <span className="font-semibold text-[--color-gold]">How Character Lock works:</span> Fill in species, colour, features, and outfit. The AI uses these as strict rules — your character must appear <em>identical</em> in every scene. Upload a reference photo for even stronger consistency.
                </div>
              </div>

              <div className="space-y-4">
                {characters.map((char, idx) => {
                  const slotColors = [
                    { ring: "ring-purple-500", bg: "bg-[--color-gold]/15", badge: "bg-[--color-gold]/15 text-[--color-gold] border-purple-800", accent: "text-[--color-gold]", border: "border-[--color-gold]/30" },
                    { ring: "ring-blue-500",   bg: "bg-blue-900/20",   badge: "bg-blue-900/50 text-blue-300 border-blue-800",     accent: "text-blue-400",   border: "border-blue-500/30" },
                    { ring: "ring-pink-500",   bg: "bg-[--color-silver]/10",   badge: "bg-[--color-silver]/10 text-[--color-silver] border-pink-800",     accent: "text-[--color-silver]",   border: "border-[--color-silver]/30" },
                    { ring: "ring-amber-500",  bg: "bg-[--color-gold]/15",  badge: "bg-[--color-gold]/15 text-[--color-gold] border-amber-800",  accent: "text-[--color-gold]",  border: "border-[--color-gold]/30" },
                  ][idx % 4];

                  const isLocked = !!(char.species || char.colour || char.features || char.outfit);
                  const desc = buildCharacterDescription(char);

                  return (
                    <div key={char.id} className={`rounded-2xl border ${isLocked ? slotColors.border : "border-white/10"} ${slotColors.bg} overflow-hidden transition-all`}>
                      {/* Character header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full ring-2 ${slotColors.ring} bg-white/10 flex items-center justify-center flex-shrink-0`}>
                            {char.imageUrl ? (
                              <img src={char.imageUrl} alt={char.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <User className="h-3.5 w-3.5 text-white" />
                            )}
                          </div>
                          <Input
                            value={char.name}
                            onChange={(e) => setCharacters((prev) => prev.map((c) => c.id === char.id ? { ...c, name: e.target.value } : c))}
                            className="bg-transparent border-none text-white font-semibold text-sm p-0 h-auto focus-visible:ring-0 w-36 sm:w-48"
                            placeholder="Character name…"
                          />
                          <Badge className={`text-xs border ${slotColors.badge} hidden sm:inline-flex`}>Character {idx + 1}</Badge>
                          {isLocked && (
                            <div className="flex items-center gap-1 text-xs text-green-400">
                              <Lock className="h-3 w-3" />
                              <span className="hidden sm:inline">Locked</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setCharacters((prev) => prev.map((c) => c.id === char.id ? { ...c, expanded: !c.expanded } : c))}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition"
                          >
                            {char.expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                          {characters.length > 1 && (
                            <button
                              onClick={() => handleRemoveCharacter(char.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {char.expanded && (
                        <div className="p-4 sm:p-5 space-y-4">
                          <div className="grid sm:grid-cols-2 gap-4">
                            {/* Character Lock Fields */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Lock className={`h-3.5 w-3.5 ${slotColors.accent}`} />
                                <span className="text-xs font-semibold text-white">Character Lock Fields</span>
                              </div>

                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Species / Type *</label>
                                <Input
                                  value={char.species}
                                  onChange={(e) => setCharacters((prev) => prev.map((c) => c.id === char.id ? { ...c, species: e.target.value } : c))}
                                  placeholder="e.g. black miniature schnauzer, young girl, robot"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground/60 text-sm h-9"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Colour / Colouring *</label>
                                <Input
                                  value={char.colour}
                                  onChange={(e) => setCharacters((prev) => prev.map((c) => c.id === char.id ? { ...c, colour: e.target.value } : c))}
                                  placeholder="e.g. solid black fur, curly red hair, bright blue"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground/60 text-sm h-9"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Features</label>
                                <Input
                                  value={char.features}
                                  onChange={(e) => setCharacters((prev) => prev.map((c) => c.id === char.id ? { ...c, features: e.target.value } : c))}
                                  placeholder="e.g. bushy eyebrows, big round eyes, pointy ears"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground/60 text-sm h-9"
                                />
                              </div>

                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Outfit / Accessories</label>
                                <Input
                                  value={char.outfit}
                                  onChange={(e) => setCharacters((prev) => prev.map((c) => c.id === char.id ? { ...c, outfit: e.target.value } : c))}
                                  placeholder="e.g. red scarf, yellow dress, astronaut suit"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground/60 text-sm h-9"
                                />
                              </div>

                              {desc.trim().length >= 5 && (
                                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-2.5">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Lock className="h-3 w-3 text-green-400" />
                                    <span className="text-xs font-medium text-green-300">Lock Preview</span>
                                  </div>
                                  <p className="text-xs text-green-200/80 leading-relaxed">{desc}</p>
                                </div>
                              )}
                            </div>

                            {/* Character Visual */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Eye className={`h-3.5 w-3.5 ${slotColors.accent}`} />
                                <span className="text-xs font-semibold text-white">Character Visual</span>
                              </div>

                              {/* Photo Upload */}
                              <div>
                                <label className="text-xs text-muted-foreground mb-1.5 block">Reference Photo (optional)</label>
                                {char.isUploadingPhoto ? (
                                  <div className="rounded-xl border border-[--color-gold]/30 bg-[--color-gold]/15 h-20 flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 text-[--color-gold] animate-spin" />
                                    <span className="text-xs text-[--color-gold]">Uploading…</span>
                                  </div>
                                ) : char.photoUrl ? (
                                  <div className="relative rounded-xl overflow-hidden border border-[--color-gold]/30 h-20">
                                    <img src={char.photoUrl} alt="Reference" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                                      <button
                                        onClick={() => setCharacters((prev) => prev.map((c) => c.id === char.id ? { ...c, photoUrl: null } : c))}
                                        className="p-1.5 rounded-lg bg-red-500/80 text-white"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                    <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
                                      <Camera className="h-2.5 w-2.5 text-green-400" />
                                      <span className="text-xs text-green-300">Photo set</span>
                                    </div>
                                  </div>
                                ) : (
                                  <label className="cursor-pointer block">
                                    <div className="rounded-xl border-2 border-dashed border-white/10 bg-white/5 h-20 flex flex-col items-center justify-center gap-1.5 hover:border-[--color-gold]/30 hover:bg-[--color-gold]/15 transition">
                                      <Camera className="h-5 w-5 text-muted-foreground/40" />
                                      <span className="text-xs text-muted-foreground/60">Upload pet/character photo</span>
                                    </div>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handlePhotoUpload(char.id, file);
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                )}
                              </div>

                              {/* AI Generated Preview */}
                              <div>
                                <label className="text-xs text-muted-foreground mb-1.5 block">AI Character Preview</label>
                                {char.isGenerating ? (
                                  <div className="rounded-xl border border-[--color-gold]/30 bg-[--color-gold]/15 aspect-square flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="h-8 w-8 text-[--color-gold] animate-spin" />
                                    <span className="text-xs text-[--color-gold]">Creating character…</span>
                                  </div>
                                ) : char.imageUrl && !char.photoUrl ? (
                                  <div className="relative rounded-xl overflow-hidden aspect-square border border-[--color-gold]/30">
                                    <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                                    <button
                                      onClick={() => handleGenerateCharacterImage(char.id)}
                                      className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition"
                                      title="Regenerate"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : !char.photoUrl ? (
                                  <button
                                    onClick={() => desc.trim().length >= 5 && handleGenerateCharacterImage(char.id)}
                                    className="w-full rounded-xl border-2 border-dashed border-[--color-gold]/30 bg-[--color-gold]/15 aspect-square flex flex-col items-center justify-center gap-2 hover:border-[--color-gold]/30 hover:bg-[--color-gold]/15 transition group"
                                  >
                                    <ImageIcon className="h-8 w-8 text-muted-foreground/30 group-hover:text-[--color-gold] transition" />
                                    <span className="text-xs text-muted-foreground/50 group-hover:text-[--color-gold] transition text-center px-2">
                                      {desc.trim().length >= 5
                                        ? "Click to generate character image "
                                        : "Fill in species & colour first"}
                                    </span>
                                  </button>
                                ) : null}

                                {desc.trim().length >= 5 && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleGenerateCharacterImage(char.id)}
                                    disabled={char.isGenerating}
                                    className="mt-2 gap-2 bg-gradient-to-r from-[#b8892a] to-[#2e2e36] hover:from-[#b8892a] hover:to-[#2e2e36] text-white border-0 text-xs w-full"
                                  >
                                    {char.isGenerating ? (
                                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                                    ) : (
                                      <><Wand2 className="h-3.5 w-3.5" /> Generate Character Image </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add character */}
              {characters.length < 4 && (
                <button
                  onClick={handleAddCharacter}
                  className="w-full rounded-2xl border-2 border-dashed border-[--color-gold]/30 bg-transparent py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-[--color-gold]/30 hover:text-[--color-gold] hover:bg-[--color-gold]/15 transition"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Character (up to 4)
                </button>
              )}

              <div className="flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-300">
                <Star className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <span>
                  Character definitions are optional but strongly recommended — they enforce strict consistency across all scenes. You can skip this step and generate the storyboard directly.
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
                  className="gap-2 bg-gradient-to-r from-[#9090a0] to-orange-500 hover:from-[#9090a0] hover:to-orange-400 text-white border-0 flex-1"
                >
                  {isCreatingJob ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating job…</>
                  ) : (
                    <><Wand2 className="h-4 w-4" /> Generate Free Storyboard</>
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
                <div className="inline-flex items-center gap-2 rounded-full border border-[--color-silver]/30 bg-[--color-silver]/10 px-4 py-1.5 text-xs sm:text-sm text-[--color-silver] mb-4">
                  <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                  {selectedStyle.label} · {videoLength} · {screenFormat}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">– Your Free Storyboard</h2>
                <p className="text-sm text-muted-foreground">
                  AI-generated scenes for your story. Edit descriptions, regenerate individual scenes, or regenerate all — completely free!
                </p>
              </div>

              {/* Generating state */}
              {isGeneratingStoryboard && (
                <div className="rounded-2xl border border-[--color-silver]/30 bg-[--color-silver]/10 p-8 text-center space-y-4">
                  <div className="text-4xl animate-bounce"></div>
                  <div>
                    <h3 className="font-bold text-white mb-1">Creating Your Storyboard…</h3>
                    <p className="text-sm text-muted-foreground">AI is illustrating your story scenes. This takes about 30–60 seconds.</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[--color-silver] text-sm">
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
                    <React.Fragment key={frame.sceneIndex}>
                    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[--color-silver] bg-[--color-silver]/10 rounded-full px-2 py-0.5">
                            Scene {i + 1}
                          </span>
                          <span className="text-sm font-semibold text-white">{frame.sceneLabel}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (editingSceneIndex === frame.sceneIndex) {
                                setEditingSceneIndex(null);
                              } else {
                                setEditingSceneIndex(frame.sceneIndex);
                                setEditingSceneText(frame.description);
                              }
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition"
                            title="Edit scene description"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRegenerateScene(frame.sceneIndex)}
                            disabled={regeneratingSceneIndex === frame.sceneIndex}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-[--color-silver] hover:bg-[--color-silver]/10 transition"
                            title="Regenerate this scene"
                          >
                            {regeneratingSceneIndex === frame.sceneIndex ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteScene(frame.sceneIndex)}
                            disabled={storyboardFrames.length <= 1 || deleteSceneMutation.isPending}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-30"
                            title="Remove this scene"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {frame.imageUrl ? (
                        <div className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-xl overflow-hidden aspect-video relative">
                          <img src={frame.imageUrl} alt={frame.sceneLabel} className="w-full h-full object-cover" />
                          {regeneratingSceneIndex === frame.sceneIndex && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                              <div className="text-center">
                                <Loader2 className="h-8 w-8 text-[--color-silver] animate-spin mx-auto mb-2" />
                                <span className="text-xs text-[--color-silver]">Regenerating scene…</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-xl border border-dashed border-[--color-silver]/20 bg-[--color-silver]/10 aspect-video flex items-center justify-center">
                          <div className="text-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                            <span className="text-xs text-muted-foreground/50">Image generation failed for this scene</span>
                          </div>
                        </div>
                      )}

                      <div className="px-4 py-3">
                        {editingSceneIndex === frame.sceneIndex ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingSceneText}
                              onChange={(e) => setEditingSceneText(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-pink-500/50 min-h-[80px]"
                              placeholder="Describe what should happen in this scene…"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleRegenerateScene(frame.sceneIndex, editingSceneText)}
                                disabled={regeneratingSceneIndex === frame.sceneIndex || editingSceneText.trim().length < 5}
                                className="gap-1.5 bg-gradient-to-r from-[#9090a0] to-orange-500 hover:from-[#9090a0] hover:to-orange-400 text-white border-0 text-xs flex-1"
                              >
                                {regeneratingSceneIndex === frame.sceneIndex ? (
                                  <><Loader2 className="h-3 w-3 animate-spin" /> Regenerating…</>
                                ) : (
                                  <><Wand2 className="h-3 w-3" /> Regenerate with New Description</>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingSceneIndex(null)}
                                className="border-white/20 text-white hover:bg-white/10 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground leading-relaxed">{frame.description}</p>
                        )}
                      </div>
                    </div>
                    {/* Add Scene between cards */}
                    <button
                      onClick={() => handleAddScene(frame.sceneIndex)}
                      disabled={addSceneMutation.isPending}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-dashed border-white/10 text-xs text-muted-foreground hover:text-white hover:border-white/30 hover:bg-white/5 transition disabled:opacity-30"
                    >
                      <Plus className="h-3 w-3" />
                      Add scene here
                    </button>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Empty state while loading */}
              {!isGeneratingStoryboard && storyboardFrames.length === 0 && !storyboardError && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                  <div className="text-4xl mb-3"></div>
                  <p className="text-muted-foreground text-sm">Your storyboard will appear here once generated.</p>
                  <Button
                    onClick={handleGenerateStoryboard}
                    disabled={isCreatingJob || isGeneratingStoryboard}
                    className="mt-4 gap-2 bg-gradient-to-r from-[#9090a0] to-orange-500 hover:from-[#9090a0] hover:to-orange-400 text-white border-0"
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
                        <span className="font-semibold text-white">Ready to build? </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Final build costs <span className="text-white font-semibold">{creditCost} credits</span> for {videoLength} · {screenFormat} · {selectedStyle.label}
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
                        Regenerate All 
                      </Button>
                      <Button
                        onClick={handleRenderVideo}
                        disabled={isCheckingOut || !jobId}
                        className="gap-2 bg-gradient-to-r from-[#9090a0] to-orange-500 hover:from-[#9090a0] hover:to-orange-400 text-white border-0 flex-1"
                      >
                        {isCheckingOut ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Preparing checkout…</>
                        ) : (
                          <><Play className="h-4 w-4" /> Build Video — {creditCost} Credits</>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-300">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>All content is generated to be safe and appropriate for children. AI-generated previews are free — credits are only charged when you build the final video.</span>
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
                  {renderStatus === "completed" ? "– Your Animation is Ready!" :
                   renderStatus === "failed" ? "Build Failed" :
                   "– Building Your Animation…"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {renderStatus === "completed" ? "Your animated kids video has been created. Watch it below!" :
                   renderStatus === "failed" ? "Something went wrong. Please contact support or try again." :
                   "Our AI is bringing your story to life! This usually takes 2–5 minutes."}
                </p>
              </div>

              {/* Rendering progress */}
              {(renderStatus === "queued" || renderStatus === "processing") && (
                <div className="rounded-2xl border border-[--color-silver]/30 bg-[--color-silver]/10 p-8 text-center space-y-6">
                  <div className="text-5xl animate-bounce"></div>
                  <div className="space-y-3 max-w-sm mx-auto">
                    <Progress value={renderStatus === "processing" ? 65 : 20} className="h-3 rounded-full" />
                    <p className="text-sm text-[--color-silver] font-medium">
                      {renderStatus === "processing" ? "Building your scenes…" : "Queued — starting soon…"}
                    </p>
                  </div>
                  <div className="space-y-2 text-left max-w-xs mx-auto">
                    {[
                      { label: "Payment confirmed", done: true },
                      { label: "Build job queued", done: (renderStatus as string) === "processing" || (renderStatus as string) === "completed" },
                      { label: "Generating animation frames", done: (renderStatus as string) === "completed" },
                      { label: "Compositing final video", done: (renderStatus as string) === "completed" },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        {s.done ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                        ) : (
                          <Loader2 className="h-4 w-4 text-[--color-silver] animate-spin flex-shrink-0" />
                        )}
                        <span className={s.done ? "text-white" : "text-muted-foreground/70"}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">This page will update automatically when your animation is ready.</p>
                </div>
              )}

              {/* Completed video */}
              {renderStatus === "completed" && videoUrl && (
                <div className="space-y-4">
                  <div className="w-full rounded-2xl overflow-hidden border border-[--color-silver]/30 bg-black">
                    <video src={videoUrl} controls autoPlay muted playsInline className="w-full" style={{ maxHeight: "400px" }} />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      className="gap-2 border-white/20 text-white hover:bg-white/10 flex-1"
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = videoUrl;
                        a.download = "kids-animation.mp4";
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
                    <a
                      href="/projects"
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#9090a0] to-orange-500 hover:from-[#9090a0] hover:to-orange-400 text-white flex-1 px-4 py-2 text-sm font-medium transition-all"
                    >
                      <Film className="h-4 w-4" />
                      View All Projects
                    </a>
                  </div>
                </div>
              )}

              {/* Failed state */}
              {renderStatus === "failed" && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center space-y-4">
                  <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
                  <p className="text-sm text-muted-foreground">Something went wrong during the build process. Please contact support with your job ID: {jobId}</p>
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
                  Create another kids animation
                </button>
              </div>
            </div>
          )}

            </div>
            {/* ── RIGHT SIDEBAR: Upgrade Preview ── */}
            <aside className="hidden lg:block space-y-4 sticky top-20 self-start">
              <div className="rounded-2xl border border-[--color-gold]/30 bg-gradient-to-b from-[--color-gold]/10 to-transparent backdrop-blur-sm p-4">
                <h3 className="text-xs font-bold text-[--color-gold] tracking-widest uppercase flex items-center gap-2 mb-4">
                  <Sparkles className="h-3.5 w-3.5" />
                  Hear & See the Difference
                </h3>
                <p className="text-[10px] text-muted-foreground mb-4">
                  Listen before you render. Preview is active in all three quality tiers — no download until payment confirmed.
                </p>
                {/* Audio Quality Tiers */}
                <div className="space-y-2 mb-4">
                  {['ORIGINAL', 'ENHANCED', 'CINEMATIC'].map((tier, i) => (
                    <button
                      key={tier}
                      className={`w-full text-left rounded-lg border p-2.5 text-xs transition-all ${
                        i === 0
                          ? 'border-[--color-gold]/40 bg-[--color-gold]/15 text-white'
                          : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/20'
                      }`}
                    >
                      <div className="font-bold tracking-wider">{tier}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">
                        {i === 0 ? 'Included' : i === 1 ? '+£3.99' : '+£4.99'}
                      </div>
                    </button>
                  ))}
                </div>
                {/* Visual Quality */}
                <div className="border-t border-white/10 pt-4 mb-4">
                  <h4 className="text-[10px] font-bold text-white tracking-widest uppercase mb-3">WIZLUMINAR™ — VISUAL QUALITY</h4>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['ORIGINAL', 'ENHANCED', 'CINEMATIC'].map((tier, i) => (
                      <div key={tier} className={`rounded-lg border p-2 text-center text-[10px] ${
                        i === 0 ? 'border-[--color-gold]/40 bg-[--color-gold]/15 text-white' : 'border-white/10 bg-white/5 text-muted-foreground'
                      }`}>
                        <div className="font-bold">{tier}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Upsell Buttons */}
                <div className="space-y-2">
                  <button className="w-full rounded-lg bg-gradient-to-r from-[--color-gold]/20 to-[--color-gold]/10 border border-[--color-gold]/30 p-2.5 text-left">
                    <div className="text-xs font-bold text-[--color-gold]">WizSound™ Cinematic</div>
                    <div className="text-[10px] text-muted-foreground">+£4.99</div>
                  </button>
                  <button className="w-full rounded-lg bg-gradient-to-r from-purple-500/20 to-purple-500/10 border border-purple-500/30 p-2.5 text-left">
                    <div className="text-xs font-bold text-purple-400">WizLuminar™ Cinematic</div>
                    <div className="text-[10px] text-muted-foreground">+£3.99</div>
                  </button>
                </div>
              </div>
              {/* Render Quality */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
                <h3 className="text-xs font-bold text-white tracking-widest uppercase mb-3">RENDER QUALITY</h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'HD', sub: '1080p', price: 'Included' },
                    { label: '4K', sub: '2160p', price: '+£2.99' },
                    { label: '8K', sub: '4320p', price: '+£4.99' },
                  ].map((q, i) => (
                    <div key={q.label} className={`rounded-lg border p-2.5 text-center cursor-pointer transition-all ${
                      i === 1 ? 'border-[--color-gold]/40 bg-[--color-gold]/15 ring-1 ring-[--color-gold]/30' : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}>
                      <div className="text-sm font-bold text-white">{q.label}</div>
                      <div className="text-[10px] text-muted-foreground">{q.sub}</div>
                      <div className={`text-[10px] mt-1 font-medium ${i === 1 ? 'text-[--color-gold]' : 'text-muted-foreground'}`}>{q.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
  // ── Handler defined after JSX to avoid hoisting issues ───
  function handleGoToCharacters() {
    if (!prompt.trim() || prompt.length < 10) {
      toast.error("Please describe your story idea (at least 10 characters).");
      return;
    }
    setStep("characters");
  }
}
