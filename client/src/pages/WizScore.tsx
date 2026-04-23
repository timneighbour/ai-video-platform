/**
 * WizScore™ — AI Scoring Studio
 * Full orchestral scoring environment: Lyndhurst Hall POV, 5-stage workflow,
 * 8 instrument tracks, score preview, Upgrade Preview panel, ambient dimmer.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";
import {
  Music2, Sparkles, Play, Pause, Download, Loader2,
  ChevronRight, ArrowLeft, Check, Volume2, Clock, Wand2,
  Film, Upload, Mic2, Plus, FileText, CheckCircle2,
  AlertCircle, Settings, Eye, Headphones, SlidersHorizontal,
} from "@/lib/icons";
import { VoicePromptButton } from "@/components/VoicePromptButton";

/* ── Constants ────────────────────────────────────────────────────────────── */
const ENV_IMG = "/manus-storage/env-scoring-stage_737b2e3f.jpg";

const SCORE_TYPES = [
  { id: "film", label: "Film Score", sub: "Feature · Short · Trailer", icon: "🎬" },
  { id: "tv", label: "TV / Series", sub: "Drama · Documentary", icon: "📺" },
  { id: "game", label: "Game Score", sub: "Adaptive · Cinematic", icon: "🎮" },
  { id: "concert", label: "Concert Work", sub: "Orchestral · Chamber", icon: "🎻" },
  { id: "backing", label: "Backing Track", sub: "Artist · Album · EP", icon: "🎸" },
  { id: "choir", label: "Choir / Vocal", sub: "Choral · A Cappella", icon: "🎤" },
];

const MOODS = [
  "Epic", "Cinematic", "Dramatic", "Emotional", "Dark", "Triumphant",
  "Haunting", "Suspense", "Romantic", "Action", "Melancholic", "Uplifting",
];

const INSTRUMENTS = [
  { name: "Strings — Full", parts: "Violins I & II, Viola, Cellos", db: "+1.2", color: "#e8c878" },
  { name: "Choir — SATB", parts: "32 Voices: Soprano, Alto, Tenor, Bass", db: "+4.0", color: "#a3e878" },
  { name: "Brass — Full", parts: "Horns, Trumpets, Trombones", db: "+0.8", color: "#78c8e8" },
  { name: "Woodwinds", parts: "Flutes, Oboes, Clarinets, Bassoons", db: "+0.1", color: "#e878a3" },
  { name: "Percussion", parts: "Timpani, Snare, Cymbals, Taiko", db: "-0.5", color: "#c878e8" },
  { name: "Piano / Keys", parts: "Grand Piano, Celesta, Harp", db: "+0.2", color: "#78e8c8" },
  { name: "Solo Cello", parts: "Lead melody, Opening theme", db: "-2.0", color: "#e8d878" },
  { name: "Organ — Pipe", parts: "Lyndhurst Hall, Organ, Pedal, Tones", db: "-12.0", color: "#e89878" },
];

type Stage = "brief" | "ensemble" | "compose" | "upgrade" | "render";
const STAGES: { id: Stage; label: string }[] = [
  { id: "brief", label: "PROJECT BRIEF" },
  { id: "ensemble", label: "ENSEMBLE" },
  { id: "compose", label: "COMPOSE & ARRANGE" },
  { id: "upgrade", label: "UPGRADE PREVIEW" },
  { id: "render", label: "RENDER & EXPORT" },
];

type RenderQuality = "hd" | "4k" | "8k";
type AudioTier = "original" | "enhanced" | "cinematic";

/* ── Waveform bar component ───────────────────────────────────────────────── */
function WaveformBar({ color, width = "100%" }: { color: string; width?: string }) {
  return (
    <div className="h-8 rounded-sm overflow-hidden relative" style={{ width, background: `${color}15` }}>
      <div className="absolute inset-0 flex items-center gap-[1px] px-1">
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: `${Math.random() * 70 + 20}%`,
              background: `linear-gradient(to top, ${color}40, ${color}cc)`,
              animationDelay: `${i * 0.02}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Spectrum Analyzer ────────────────────────────────────────────────────── */
function SpectrumAnalyzer() {
  return (
    <div className="w-full h-16 flex items-end gap-[2px] px-4 overflow-hidden">
      {Array.from({ length: 120 }).map((_, i) => {
        const h = Math.sin(i * 0.15) * 30 + Math.random() * 25 + 15;
        const hue = (i / 120) * 300;
        return (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all duration-300"
            style={{
              height: `${h}%`,
              background: `hsl(${hue}, 80%, 55%)`,
              opacity: 0.85,
            }}
          />
        );
      })}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────────────── */
export default function WizScore() {
  useSEO({
    title: "WizScore™ — AI Scoring Studio — WIZ AI",
    path: "/wizscore",
    description: "Professional AI orchestral scoring studio. Compose film scores, TV themes, and game soundtracks with 8 instrument groups, score preview, and cinematic mastering.",
  });

  const { isAuthenticated, user } = useAuth();
  const [activeStage, setActiveStage] = useState<Stage>("compose");
  const [completedStages, setCompletedStages] = useState<Stage[]>(["brief", "ensemble"]);
  const [scoreType, setScoreType] = useState("film");
  const [selectedMoods, setSelectedMoods] = useState<string[]>(["Epic", "Cinematic"]);
  const [brief, setBrief] = useState("A sweeping main title theme for an epic feature film. Opens with solo cello, building through strings to full orchestra. Choir enters at 1:20 for the emotional peak. Inspired by the grandeur of Lyndhurst Hall — rich, deep, and cinematic.");
  const [duration, setDuration] = useState("3:24");
  const [keyScale, setKeyScale] = useState("D Minor");
  const [bpm, setBpm] = useState("72");
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [isPlaying, setIsPlaying] = useState(false);
  const [timecode, setTimecode] = useState("00:01:24:08");
  const [activeTier, setActiveTier] = useState<AudioTier>("original");
  const [renderQuality, setRenderQuality] = useState<RenderQuality>("4k");
  const [ambientLevel, setAmbientLevel] = useState(70);

  const toggleMood = (m: string) => {
    setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  /* ── Auth gate ── */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen studio-bg flex items-center justify-center px-4">
        <div className="env-bg"><img src={ENV_IMG} alt="" /><div className="env-bg-overlay" /></div>
        <div className="env-ambient env-tint-gold" />
        <div className="text-center max-w-md relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-[--color-gold]/15 border border-[--color-gold]/30 flex items-center justify-center mx-auto mb-6">
            <Music2 className="w-8 h-8 text-[--color-gold]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">WizScore™</h1>
          <p className="text-white/50 mb-8">Sign in to access the AI Scoring Studio.</p>
          <Button className="btn-primary btn-sheen px-8 py-3 rounded-xl text-base" asChild>
            <a href={getLoginUrl()}>Sign in to continue</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: "#06050a" }}>
      {/* ── VR Environment: Lyndhurst Hall ── */}
      <div className="env-bg">
        <img src={ENV_IMG} alt="" />
        <div className="env-bg-overlay" />
      </div>
      <div className="env-ambient env-tint-gold" style={{ opacity: ambientLevel / 100 }} />

      {/* ══════════════ TOP NAV ══════════════ */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/40 hover:text-white/70 text-sm flex items-center gap-1.5 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Studio
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg tracking-tight">WIZSCORE</span>
              <span className="bg-[--color-gold] text-black text-[10px] font-bold px-2 py-0.5 rounded tracking-widest">AI SCORING STUDIO</span>
            </div>
          </div>
          {/* Center: genre nav */}
          <nav className="hidden md:flex items-center gap-1 text-xs text-white/40 font-semibold tracking-widest">
            {["FILM", "TV", "GAMES", "CONCERT"].map((g, i) => (
              <span key={g} className="flex items-center gap-1">
                {i > 0 && <span className="text-white/15 mx-1">·</span>}
                <span className="hover:text-white/70 cursor-pointer transition-colors">{g}</span>
              </span>
            ))}
          </nav>
          {/* Right */}
          <div className="flex items-center gap-3">
            <div className="bg-[--color-gold]/15 border border-[--color-gold]/30 rounded-full px-3 py-1 text-[--color-gold] text-xs font-bold">
              10,000 Credits
            </div>
            <div className="w-8 h-8 rounded-full bg-[--color-gold]/20 border border-[--color-gold]/30 flex items-center justify-center text-[--color-gold] text-xs font-bold">
              {user?.name?.charAt(0) || "T"}
            </div>
          </div>
        </div>

        {/* ── 5-Stage Workflow Bar ── */}
        <div className="border-t border-white/[0.04] bg-[#0a0a0f]/60">
          <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-center gap-2">
            {STAGES.map((s, i) => {
              const isActive = activeStage === s.id;
              const isDone = completedStages.includes(s.id);
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveStage(s.id)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all ${
                      isActive
                        ? "bg-[--color-gold]/20 border border-[--color-gold]/40 text-[--color-gold] shadow-[0_0_15px_rgba(184,137,42,0.2)]"
                        : isDone
                        ? "text-white/60 hover:text-white/80"
                        : "text-white/30 hover:text-white/50"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      isDone ? "bg-green-500/20 text-green-400" : isActive ? "bg-[--color-gold]/30 text-[--color-gold]" : "bg-white/10"
                    }`}>
                      {isDone ? <Check className="w-3 h-3" /> : i + 1}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STAGES.length - 1 && <ChevronRight className="w-3 h-3 text-white/15" />}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* ══════════════ SESSION INFO BAR ══════════════ */}
      <div className="relative z-10 bg-[#0a0a0f]/40 border-b border-white/[0.04]">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="studio-card rounded-lg px-4 py-2 border-l-2 border-[--color-gold]">
            <p className="text-[10px] text-white/30 font-semibold tracking-widest uppercase">Current Session</p>
            <p className="text-white font-bold text-sm italic">Echoes of Eternity — Main Title</p>
            <p className="text-white/40 text-[11px]">Feature Film · {duration} · {bpm} BPM · {keyScale} · {timeSignature}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 rounded-full px-3 py-1 text-green-400 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> ORCHESTRA READY
            </span>
            <span className="text-white/40 text-xs font-medium">CHOIR · 32 VOICES</span>
            <span className="text-white/40 text-xs font-medium">STAGE: LYNDHURST</span>
          </div>
        </div>
      </div>

      {/* ── VR Environment Hero (Lyndhurst Hall) ── */}
      <div className="relative z-10 h-[220px] overflow-hidden">
        <img
          src={ENV_IMG}
          alt="Lyndhurst Hall"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: `brightness(${0.3 + ambientLevel * 0.004}) saturate(1.3)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06050a] via-[#06050a]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0">
          <SpectrumAnalyzer />
        </div>
      </div>

      {/* ══════════════ MAIN 3-COLUMN LAYOUT ══════════════ */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_280px] gap-4">

          {/* ── LEFT SIDEBAR: Score Configuration ── */}
          <aside className="space-y-5">
            {/* 1. Score Type */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-white/70 tracking-widest uppercase mb-3">
                <span className="w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] flex items-center justify-center text-[10px] font-bold">1</span>
                Score Type
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {SCORE_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setScoreType(t.id)}
                    className={`studio-card rounded-xl p-3 text-left transition-all ${
                      scoreType === t.id
                        ? "border-[--color-gold]/40 bg-[--color-gold]/10 shadow-[0_0_12px_rgba(184,137,42,0.15)]"
                        : "hover:border-white/15"
                    }`}
                  >
                    <span className="text-lg mb-1 block">{t.icon}</span>
                    <p className="text-white/80 text-[11px] font-bold leading-tight">{t.label}</p>
                    <p className="text-white/30 text-[9px] leading-tight mt-0.5">{t.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Mood & Genre */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-white/70 tracking-widest uppercase mb-3">
                <span className="w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] flex items-center justify-center text-[10px] font-bold">2</span>
                Mood & Genre
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map(m => (
                  <button
                    key={m}
                    onClick={() => toggleMood(m)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                      selectedMoods.includes(m)
                        ? "bg-[--color-gold]/20 border-[--color-gold]/40 text-[--color-gold]"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white/60 hover:border-white/20"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Score Brief */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-white/70 tracking-widest uppercase mb-3">
                <span className="w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] flex items-center justify-center text-[10px] font-bold">3</span>
                Score Brief
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <button className="btn-primary btn-sheen px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                  <Mic2 className="w-3 h-3" /> SPEAK YOUR BRIEF
                </button>
                <span className="text-white/25 text-[10px]">or type below</span>
              </div>
              <textarea
                value={brief}
                onChange={e => setBrief(e.target.value)}
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white/70 text-xs resize-none focus:border-[--color-gold]/30 focus:outline-none transition-colors"
                placeholder="Describe your score..."
              />
            </div>

            {/* 4. Duration & Key */}
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-white/70 tracking-widest uppercase mb-3">
                <span className="w-5 h-5 rounded-full bg-[--color-gold]/20 text-[--color-gold] flex items-center justify-center text-[10px] font-bold">4</span>
                Duration & Key
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-white/30 uppercase tracking-widest font-semibold">Duration</label>
                  <input
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/70 text-xs focus:border-[--color-gold]/30 focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/30 uppercase tracking-widest font-semibold">Key / Scale</label>
                  <input
                    value={keyScale}
                    onChange={e => setKeyScale(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/70 text-xs focus:border-[--color-gold]/30 focus:outline-none mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Ambient Dimmer */}
            <div>
              <h3 className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mb-2">Ambient Lighting</h3>
              <input
                type="range"
                min={10}
                max={100}
                value={ambientLevel}
                onChange={e => setAmbientLevel(Number(e.target.value))}
                className="w-full accent-[--color-gold] h-1"
              />
              <div className="flex justify-between text-[9px] text-white/20 mt-1">
                <span>Darker</span><span>Brighter</span>
              </div>
            </div>
          </aside>

          {/* ── CENTER: Compose & Arrange ── */}
          <main className="space-y-4">
            {/* Transport Controls */}
            <div className="studio-card rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 transition-colors">
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M1 2h2v12H1zm4 6l9-6v12z"/></svg>
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-10 h-10 rounded-full bg-[--color-gold] hover:bg-[--color-gold]/80 flex items-center justify-center transition-colors shadow-[0_0_20px_rgba(184,137,42,0.3)]"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 text-black" /> : <Play className="w-4 h-4 text-black ml-0.5" />}
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  </button>
                </div>
                <span className="text-white/70 font-mono text-sm tracking-wider">{timecode}</span>
                {/* Scrub bar */}
                <div className="hidden md:flex flex-1 mx-6 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[--color-gold]/60 rounded-full" style={{ width: "42%" }} />
                </div>
                <span className="text-white/40 text-xs font-mono">BPM <span className="text-[--color-gold] font-bold">{bpm}</span> · {keyScale} · {timeSignature}</span>
              </div>
            </div>

            {/* Score Title + Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-lg tracking-tight uppercase">Echoes of Eternity — Main Title</h2>
                <p className="text-white/40 text-xs">Feature Film Score · {duration} · 8 Instrument Groups · Choir: 32 voices</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="studio-card rounded-lg px-3 py-1.5 text-[11px] text-white/50 hover:text-white/70 flex items-center gap-1.5 transition-colors">
                  <FileText className="w-3 h-3" /> Score PDF
                </button>
                <button className="studio-card rounded-lg px-3 py-1.5 text-[11px] text-white/50 hover:text-white/70 flex items-center gap-1.5 transition-colors">
                  <Download className="w-3 h-3" /> MIDI Export
                </button>
                <button className="btn-primary btn-sheen px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                  <Plus className="w-3 h-3" /> ADD INSTRUMENT
                </button>
              </div>
            </div>

            {/* 8 Instrument Tracks */}
            <div className="space-y-1.5">
              {INSTRUMENTS.map((inst, i) => (
                <div key={inst.name} className="studio-card rounded-xl p-3 flex items-center gap-3 group hover:border-white/15 transition-all">
                  {/* Name */}
                  <div className="w-[130px] flex-shrink-0">
                    <p className="text-white/80 text-xs font-bold">{inst.name}</p>
                    <p className="text-white/30 text-[9px] leading-tight">{inst.parts}</p>
                  </div>
                  {/* Waveform */}
                  <div className="flex-1">
                    <WaveformBar color={inst.color} />
                  </div>
                  {/* Controls */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-white/40 text-[10px] font-mono w-10 text-right">{inst.db}</span>
                    <button className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/50 transition-colors">
                      <Volume2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Score Preview */}
            <div className="studio-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white/60 text-xs font-bold tracking-widest uppercase">Score Preview — Bar 24-28 · Strings & Choir Entry</h3>
              </div>
              {/* Musical notation mockup */}
              <div className="bg-white/[0.03] rounded-xl p-6 mb-3">
                <div className="flex items-center justify-center gap-1">
                  {/* Treble clef + time signature */}
                  <span className="text-white/30 text-3xl font-serif mr-2">𝄞</span>
                  <span className="text-white/30 text-sm font-mono mr-4">4/4</span>
                  {/* Notes */}
                  {["𝅘𝅥", "𝅘𝅥𝅮", "𝅗𝅥", "𝅘𝅥", "𝅘𝅥𝅮", "𝅘𝅥𝅮", "𝅝", "𝅘𝅥", "𝅘𝅥𝅮", "𝅗𝅥"].map((note, i) => (
                    <span key={i} className="text-white/50 text-2xl mx-1">{note}</span>
                  ))}
                  <span className="ml-4 text-[--color-gold] text-[10px] font-bold tracking-widest uppercase">CHOIR ENTRY</span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-[10px] text-white/30">
                  <span className="italic">pp</span>
                  <span>cresc.</span>
                  <span className="italic">mf</span>
                  <span className="italic">f</span>
                </div>
              </div>
              <p className="text-white/30 text-[11px]">
                Solo cello opens <span className="italic">pp</span> · Strings build <span className="italic">cresc.</span> · Full choir entry at bar 28 · Key: {keyScale}
              </p>
            </div>
          </main>

          {/* ── RIGHT SIDEBAR: Upgrade Preview ── */}
          <aside className="space-y-4">
            {/* Hear & See the Difference */}
            <div className="studio-card rounded-2xl p-4">
              <h3 className="flex items-center gap-2 text-[--color-gold] text-xs font-bold tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" /> HEAR & SEE THE DIFFERENCE
              </h3>
              <p className="text-white/30 text-[10px] leading-relaxed mb-4">
                Listen before you commit. Preview in all three quality tiers — no download until payment confirmed.
              </p>

              {/* Audio tier tabs */}
              <div className="flex rounded-lg overflow-hidden border border-white/10 mb-4">
                {(["original", "enhanced", "cinematic"] as AudioTier[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveTier(t)}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
                      activeTier === t
                        ? "bg-white text-black"
                        : "bg-white/5 text-white/40 hover:text-white/60"
                    }`}
                  >
                    {t === "original" ? "ORIGINAL" : t === "enhanced" ? (
                      <span>ENHANCED <span className="text-[--color-gold]">+£1.99</span></span>
                    ) : (
                      <span>CINEMATIC <span className="text-[--color-gold]">+£4.99</span></span>
                    )}
                  </button>
                ))}
              </div>

              {/* Waveform preview */}
              <div className="h-12 rounded-lg overflow-hidden mb-3">
                <div className="w-full h-full flex items-end gap-[1px]">
                  {Array.from({ length: 60 }).map((_, i) => {
                    const h = Math.sin(i * 0.2) * 40 + Math.random() * 30 + 20;
                    const hue = (i / 60) * 300;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm"
                        style={{ height: `${h}%`, background: `hsl(${hue}, 70%, 50%)`, opacity: 0.7 }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Track info */}
              <p className="text-white/30 text-[9px] font-bold tracking-widest uppercase mb-1">
                WIZSCORE™ — {activeTier.toUpperCase()} MIX
              </p>
              <p className="text-white/70 text-xs font-semibold mb-2">Echoes of Eternity — Main Title</p>
              <div className="flex items-center gap-3 mb-3">
                <button className="w-8 h-8 rounded-full bg-[--color-gold] flex items-center justify-center shadow-[0_0_12px_rgba(184,137,42,0.3)]">
                  <Play className="w-3.5 h-3.5 text-black ml-0.5" />
                </button>
                <span className="text-white/40 text-[11px] font-mono">0:15 / {duration}</span>
              </div>
              <p className="text-white/25 text-[9px] leading-relaxed">
                Preview in {activeTier} quality — full mastering & spatial audio applied on payment confirmed.
              </p>
            </div>

            {/* WizLuminar Visual Quality */}
            <div className="studio-card rounded-2xl p-4">
              <h3 className="text-white/60 text-xs font-bold tracking-wider mb-3">WIZLUMINAR™ — VISUAL QUALITY</h3>
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                {["ORIGINAL", "ENHANCED", "CINEMATIC"].map((t, i) => (
                  <button
                    key={t}
                    className={`flex-1 py-2 text-[10px] font-bold tracking-wider transition-all ${
                      i === 0 ? "bg-white/10 text-white/70" : "bg-white/5 text-white/30 hover:text-white/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-3">
                {[0.3, 0.5, 0.8].map((b, i) => (
                  <div key={i} className="aspect-video rounded-lg overflow-hidden bg-white/5">
                    <img
                      src={ENV_IMG}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ filter: `brightness(${b}) saturate(${0.8 + i * 0.3})` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Upsell buttons */}
            <button className="w-full btn-primary btn-sheen py-2.5 rounded-xl text-xs font-bold flex items-center justify-between px-4">
              <span className="flex items-center gap-2">
                <Headphones className="w-3.5 h-3.5" /> WizSound™ Cinematic
              </span>
              <span>+£4.99</span>
            </button>
            <button className="w-full border border-[--color-gold]/30 bg-[--color-gold]/5 hover:bg-[--color-gold]/10 text-[--color-gold] py-2.5 rounded-xl text-xs font-bold flex items-center justify-between px-4 transition-colors">
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> WizLuminar™ Cinematic
              </span>
              <span>+£3.99</span>
            </button>

            {/* Render Quality */}
            <div className="studio-card rounded-2xl p-4">
              <h3 className="text-white/60 text-xs font-bold tracking-wider mb-3">RENDER QUALITY</h3>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: "hd" as RenderQuality, label: "HD", sub: "standard", price: "Included" },
                  { id: "4k" as RenderQuality, label: "4K", sub: "studio", price: "+£2.99" },
                  { id: "8k" as RenderQuality, label: "8K", sub: "Full Orch.", price: "+£4.99" },
                ]).map(q => (
                  <button
                    key={q.id}
                    onClick={() => setRenderQuality(q.id)}
                    className={`rounded-xl p-3 text-center transition-all border ${
                      renderQuality === q.id
                        ? "bg-[--color-gold]/15 border-[--color-gold]/40 shadow-[0_0_12px_rgba(184,137,42,0.15)]"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <p className={`text-sm font-bold ${renderQuality === q.id ? "text-[--color-gold]" : "text-white/60"}`}>{q.label}</p>
                    <p className="text-[9px] text-white/30">{q.sub}</p>
                    <p className={`text-[10px] font-bold mt-1 ${renderQuality === q.id ? "text-[--color-gold]" : "text-white/40"}`}>{q.price}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Render CTA */}
            <button className="w-full btn-primary btn-sheen py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              <Film className="w-4 h-4" /> RENDER SCORE — {renderQuality.toUpperCase()}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
