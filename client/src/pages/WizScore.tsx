/**
 * WizScore™ — AI Orchestral Score Composer
 * HTML reference pass: mockup-wizscore.html
 */
import { useState, useEffect, useRef } from "react";
import { WIZSOUND_TIERS, RENDER_QUALITY_TIERS, WIZLUMINAR_CINEMATIC } from "@/lib/pricing";
import { Link } from "wouter";
import { mp } from "@/lib/mixpanel";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const ENV_IMG = "/manus-storage/env-scoring-stage_737b2e3f.jpg";

const STAGES = [
  { key: "brief",    label: "PROJECT BRIEF" },
  { key: "ensemble", label: "ENSEMBLE" },
  { key: "compose",  label: "COMPOSE & ARRANGE" },
  { key: "upgrade",  label: "UPGRADE PREVIEW" },
  { key: "render",   label: "RENDER & EXPORT" },
] as const;
type Stage = typeof STAGES[number]["key"];

const SCORE_TYPES = [
  { id: "film",       label: "Film Score",       icon: "🎬", sub: "Feature · Short · Trailer" },
  { id: "tv",         label: "TV / Series",       icon: "📺", sub: "Drama · Documentary" },
  { id: "game",       label: "Game Score",        icon: "🎮", sub: "Adaptive · Cinematic" },
  { id: "concert",    label: "Concert Work",      icon: "🎼", sub: "Orchestral · Chamber" },
  { id: "backing",    label: "Backing Track",     icon: "🎵", sub: "Artist · Album · EP" },
  { id: "choir",      label: "Choir / Vocal",     icon: "🎙", sub: "Choral · A Cappella" },
];

const MOODS = ["Epic","Cinematic","Dramatic","Emotional","Dark","Triumphant","Haunting","Suspense","Romantic","Action","Melancholic","Uplifting"];

const ENSEMBLE_GROUPS = [
  { id: "strings",    label: "Strings",    icon: "🎻", desc: "Violins I & II · Violas · Cellos · Double Bass" },
  { id: "brass",      label: "Brass",      icon: "🎺", desc: "Horns · Trumpets · Trombones · Tuba" },
  { id: "woodwinds",  label: "Woodwinds",  icon: "🎷", desc: "Flutes · Oboes · Clarinets · Bassoons" },
  { id: "percussion", label: "Percussion", icon: "🥁", desc: "Timpani · Snare · Cymbals · Taiko" },
  { id: "choir",      label: "Choir",      icon: "🎤", desc: "Soprano · Alto · Tenor · Bass" },
  { id: "piano",      label: "Piano",      icon: "🎹", desc: "Grand Piano · Celesta · Harpsichord" },
  { id: "harp",       label: "Harp",       icon: "🪗", desc: "Concert Harp · Glissandi" },
  { id: "synth",      label: "Synth",      icon: "🎛️", desc: "Pads · Textures · Hybrid elements" },
];

const INSTRUMENT_TRACKS = [
  { name: "Strings — Full",  section: "Violins I & II · Violas · Cellos · Basses",    color: "#d4a843", vol: "-3.2" },
  { name: "Choir — SATB",    section: "32 Voices · Soprano · Alto · Tenor · Bass",    color: "#9b59f5", vol: "-6.0" },
  { name: "Brass — Full",    section: "Horns · Trumpets · Trombones · Tuba",          color: "#6db86d", vol: "-4.8" },
  { name: "Woodwinds",       section: "Flutes · Oboes · Clarinets · Bassoons",        color: "#5bc4e8", vol: "-8.1" },
  { name: "Percussion",      section: "Timpani · Snare · Cymbals · Taiko",            color: "#e05555", vol: "-5.5" },
  { name: "Piano / Keys",    section: "Grand Piano · Celesta · Harp",                 color: "#f5a623", vol: "-9.2" },
  { name: "Solo Cello",      section: "Lead melody · Opening theme",                  color: "#e8c85b", vol: "-2.0" },
  { name: "Organ — Pipe",    section: "Lyndhurst Hall Organ · Pedal tones",           color: "#888",    vol: "-12.0" },
];

const TIER_INFO: Record<string,{label:string;price:string}> = {
  original:  { label: "WIZSCORE™ — ORIGINAL MIX",  price: WIZSOUND_TIERS.ORIGINAL.price },
  enhanced:  { label: "WIZSCORE™ — ENHANCED MIX",  price: WIZSOUND_TIERS.ENHANCED.price },
  cinematic: { label: "WIZSCORE™ — CINEMATIC MIX", price: WIZSOUND_TIERS.CINEMATIC.price },
};

// ── Canvas: Console VU meter strip ──────────────────────────────────────────
function ConsoleMeterStrip() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const NUM_BARS = 48;
    const levels = Array.from({ length: NUM_BARS }, () => Math.random() * 0.6 + 0.2);
    const peaks  = [...levels];

    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const barW = (W / NUM_BARS) * 0.65;
      const gap  = (W / NUM_BARS) * 0.35;

      for (let i = 0; i < NUM_BARS; i++) {
        // drift levels
        levels[i] += (Math.random() - 0.5) * 0.08;
        levels[i] = Math.max(0.05, Math.min(1, levels[i]));
        if (levels[i] > peaks[i]) peaks[i] = levels[i];
        else peaks[i] = Math.max(levels[i], peaks[i] - 0.01);

        const x = i * (barW + gap);
        const barH = levels[i] * H;

        // gradient per bar
        const grad = ctx.createLinearGradient(0, H, 0, H - barH);
        grad.addColorStop(0, "rgba(212,168,67,0.9)");
        grad.addColorStop(0.6, "rgba(212,168,67,0.6)");
        grad.addColorStop(1, "rgba(212,168,67,0.2)");
        ctx.fillStyle = grad;
        ctx.fillRect(x, H - barH, barW, barH);

        // peak dot
        ctx.fillStyle = "rgba(212,168,67,0.95)";
        ctx.fillRect(x, H - peaks[i] * H - 2, barW, 2);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    // resize observer
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width  = canvas.offsetWidth  || 600;
    canvas.height = canvas.offsetHeight || 64;

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}

// ── Canvas: EQ Visualizer ────────────────────────────────────────────────────
function EQVisualizer({ tier }: { tier: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const NUM = 20;
    const bars = Array.from({ length: NUM }, (_, i) => ({
      h: 0.3 + Math.sin(i * 0.4) * 0.2 + Math.random() * 0.3,
    }));

    const color = tier === "cinematic" ? "#d4a843" : tier === "enhanced" ? "#9b59f5" : "#555";

    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const barW = (W / NUM) * 0.6;
      const gap  = (W / NUM) * 0.4;

      for (let i = 0; i < NUM; i++) {
        bars[i].h += (Math.random() - 0.5) * 0.06;
        bars[i].h = Math.max(0.05, Math.min(1, bars[i].h));
        const x = i * (barW + gap);
        const bh = bars[i].h * H;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x, H - bh, barW, bh);
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width  = canvas.offsetWidth  || 240;
    canvas.height = canvas.offsetHeight || 32;

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [tier]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}

// ── Track waveform mini canvas ───────────────────────────────────────────────
function TrackWaveform({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bars = Array.from({ length: 40 }, () => Math.random() * 0.8 + 0.1);

    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const bw = W / bars.length;
      for (let i = 0; i < bars.length; i++) {
        bars[i] += (Math.random() - 0.5) * 0.05;
        bars[i] = Math.max(0.05, Math.min(1, bars[i]));
        const bh = bars[i] * H;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(i * bw, (H - bh) / 2, bw * 0.7, bh);
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    }

    canvas.width  = canvas.offsetWidth  || 120;
    canvas.height = canvas.offsetHeight || 20;
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}

export default function WizScore() {
  // noindex — auth-gated studio app, not intended for search indexing
  useSEO({ title: "WizScore™ — AI Orchestral Score Composer — WIZ AI", path: "/wizscore", noindex: true });
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [stage, setStage]               = useState<Stage>("compose");
  const [scoreType, setScoreType]       = useState("film");
  const [selectedMoods, setSelectedMoods] = useState<string[]>(["Epic","Cinematic"]);
  const [scoreBrief, setScoreBrief]     = useState("A sweeping main title theme for an epic feature film. Opens with solo cello, building through strings to full orchestra. Choir enters at 1:20 for the emotional peak. Inspired by the grandeur of Lyndhurst Hall — rich, deep, cinematic. The kind of score that makes audiences feel something before a single frame appears.");
  const [duration, setDuration]         = useState("2:30 — Main title");
  const [key, setKey]                   = useState("D Minor");
  const [tempo, setTempo]               = useState("72");
  const [timeSig, setTimeSig]           = useState("4/4");
  const [ambience, setAmbience]         = useState(70);
  const [activeEnsemble, setActiveEnsemble] = useState<string[]>(["strings","brass","woodwinds","percussion","choir","piano","harp"]);
  const [tier, setTier]                 = useState<"original"|"enhanced"|"cinematic">("original");
  const [renderQuality, setRenderQuality] = useState("4K");
  const [isPlaying, setIsPlaying]       = useState(false);
  const [progress, setProgress]         = useState(35);
  const [luminarTier, setLuminarTier]   = useState("original");
  const [mutedTracks, setMutedTracks]   = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const stageIndex = STAGES.findIndex(s => s.key === stage);

  // Studio entry tracking — fires once on mount (page is auth-gated upstream)
  useEffect(() => { mp.studioEntered("WizScore"); }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => setProgress(p => p >= 100 ? 0 : p + 0.3), 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  const toggleMood     = (m: string) => setSelectedMoods(p => p.includes(m) ? p.filter(x=>x!==m) : [...p,m]);
  const toggleEnsemble = (id: string) => setActiveEnsemble(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  const toggleMute     = (name: string) => setMutedTracks(p => p.includes(name) ? p.filter(x=>x!==name) : [...p,name]);

  // Stage pill styles
  const pill = (i: number) => ({
    display:"flex",alignItems:"center",gap:"7px",padding:"6px 16px",
    fontSize:"9px",fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase" as const,
    background:"none",border:"none",cursor:"pointer",whiteSpace:"nowrap" as const,
    borderBottom: i < stageIndex ? "2px solid #6db86d" : i === stageIndex ? "2px solid #d4a843" : "2px solid transparent",
    color: i < stageIndex ? "#6db86d" : i === stageIndex ? "#d4a843" : "#444",
    transition:"color 0.2s",
  });
  const pillNum = (i: number) => ({
    width:"18px",height:"18px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
    fontSize:"9px",fontWeight:700,flexShrink:0,
    background: i < stageIndex ? "#6db86d" : i === stageIndex ? "#d4a843" : "#1a1a1a",
    color: i < stageIndex ? "#000" : i === stageIndex ? "#000" : "#555",
  });

  // Page-load auth gate: redirect unauthenticated users to sign-in
  if (!authLoading && !isAuthenticated) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#080808", color: "#e0d8cc", fontFamily: "'Montserrat',sans-serif", alignItems: "center", justifyContent: "center", gap: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#e0d8cc", marginBottom: "12px" }}>WizScore™</h1>
          <p style={{ color: "rgba(224,216,204,0.45)", marginBottom: "32px", lineHeight: 1.6 }}>Sign in to start composing AI orchestral scores.</p>
          <a href={getLoginUrl("/wizscore")} style={{ display: "inline-block", padding: "12px 32px", background: "linear-gradient(135deg, #d4a843, #b8892a)", color: "#000", borderRadius: "12px", fontWeight: 700, fontSize: "15px", textDecoration: "none" }}>Sign in to continue</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"#080808",color:"#e0d8cc",fontFamily:"'Montserrat',sans-serif",overflow:"hidden"}}>

      {/* ── Nav ── */}
      <nav style={{
        display:"flex",alignItems:"center",padding:"0 20px",height:"52px",gap:"16px",
        borderBottom:"1px solid #1e1e1e",flexShrink:0,
        background:"rgba(8,8,8,0.95)",backdropFilter:"blur(12px)",zIndex:100,
      }}>
        <Link href="/" style={{fontSize:"10px",color:"#888",textDecoration:"none",display:"flex",alignItems:"center",gap:"4px"}}>← Back</Link>
        <div style={{display:"flex",alignItems:"center",gap:"8px",borderLeft:"1px solid #222",paddingLeft:"16px"}}>
          <span style={{fontSize:"15px",fontWeight:800,color:"#d4a843",letterSpacing:"2px"}}>WizScore</span>
          <span style={{fontSize:"8px",fontWeight:700,background:"#d4a843",color:"#000",padding:"2px 6px",borderRadius:"2px",letterSpacing:"1px"}}>STUDIO</span>
        </div>
        <span style={{fontSize:"11px",fontWeight:700,color:"#888",letterSpacing:"2px",borderLeft:"1px solid #222",paddingLeft:"16px"}}>AI FILM SCORING STUDIO</span>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"10px"}}>
          <span style={{fontSize:"10px",fontWeight:700,background:"rgba(212,168,67,0.15)",border:"1px solid rgba(212,168,67,0.3)",color:"#d4a843",padding:"5px 12px",borderRadius:"3px"}}>⚡ 10,000 Credits</span>
          <div style={{width:"30px",height:"30px",borderRadius:"50%",background:"#d4a843",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:800,color:"#000"}}>T</div>
        </div>
      </nav>

      {/* ── Stage Bar (separate row) ── */}
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"center",gap:"0",
        padding:"0 20px",height:"44px",flexShrink:0,
        background:"rgba(8,8,8,0.92)",borderBottom:"1px solid #1e1e1e",
        backdropFilter:"blur(8px)",zIndex:99,
      }}>
        {STAGES.map((s,i) => (
          <div key={s.key} style={{display:"flex",alignItems:"center"}}>
            <button onClick={() => setStage(s.key)} style={pill(i)}>
              <span style={pillNum(i)}>{i < stageIndex ? "✓" : i+1}</span>
              {s.label}
            </button>
            {i < STAGES.length-1 && <span style={{color:"#222",fontSize:"10px",padding:"0 4px",userSelect:"none"}}>›</span>}
          </div>
        ))}
      </div>

      {/* ── Studio Hero ── */}
      <div style={{position:"relative",width:"100%",height:"340px",overflow:"hidden",flexShrink:0,background:"#050505"}}>
        <img src={ENV_IMG} alt="Air Studios Lyndhurst Hall — Scoring Stage" style={{
          position:"absolute",inset:0,width:"100%",height:"100%",
          objectFit:"cover",objectPosition:"center 30%",
          filter:`brightness(${ambience/100})`,
          display:"block",
        }} />
        {/* Gradient overlay */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(8,8,8,0.1) 0%,rgba(8,8,8,0.3) 60%,rgba(8,8,8,0.85) 100%)",pointerEvents:"none"}} />

        {/* Studio HUD */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>

          {/* Top-left: session HUD card */}
          <div style={{
            position:"absolute",top:"14px",left:"16px",
            background:"rgba(8,8,8,0.75)",border:"1px solid rgba(212,168,67,0.25)",
            borderRadius:"4px",padding:"10px 14px",backdropFilter:"blur(6px)",
          }}>
            <div style={{fontSize:"8px",color:"#888",letterSpacing:"1.5px",marginBottom:"4px"}}>CURRENT SESSION</div>
            <div style={{fontSize:"13px",fontWeight:800,color:"#d4a843",fontFamily:"'Playfair Display',serif"}}>
              Echoes of Eternity — Main Title
            </div>
            <div style={{fontSize:"9px",color:"#888",marginTop:"3px"}}>Feature Film · 2:24 · {tempo} BPM · {key} · {timeSig}</div>
          </div>

          {/* Top-right: status badges */}
          <div style={{position:"absolute",top:"14px",right:"16px",display:"flex",gap:"8px",alignItems:"center"}}>
            {/* ORCHESTRA READY — live pulse */}
            <div style={{
              background:"rgba(8,8,8,0.8)",border:"1px solid rgba(109,184,109,0.4)",
              borderRadius:"3px",padding:"6px 10px",fontSize:"9px",fontWeight:700,
              color:"#6db86d",letterSpacing:"1px",backdropFilter:"blur(6px)",
              display:"flex",alignItems:"center",gap:"5px",
            }}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#6db86d",boxShadow:"0 0 6px #6db86d",animation:"wizLivePulse 1.5s infinite"}} />
              ORCHESTRA READY
            </div>
            <div style={{
              background:"rgba(8,8,8,0.8)",border:"1px solid #1e1e1e",
              borderRadius:"3px",padding:"6px 10px",fontSize:"9px",fontWeight:700,
              color:"#888",letterSpacing:"1px",backdropFilter:"blur(6px)",
            }}>
              CHOIR · 32 VOICES
            </div>
            <div style={{
              background:"rgba(8,8,8,0.8)",border:"1px solid #1e1e1e",
              borderRadius:"3px",padding:"6px 10px",fontSize:"9px",fontWeight:700,
              color:"#888",letterSpacing:"1px",backdropFilter:"blur(6px)",
            }}>
              STAGE: LYNDHURST
            </div>
          </div>

          {/* Bottom: Console VU meter strip */}
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:"64px",pointerEvents:"none",padding:"0 16px 4px"}}>
            <ConsoleMeterStrip />
          </div>
        </div>
      </div>

      {/* ── 3-Column Layout ── */}
      <div style={{display:"grid",gridTemplateColumns:"320px 1fr 300px",flex:1,overflow:"hidden",borderTop:"1px solid #1e1e1e"}}>

        {/* ── LEFT PANEL ── */}
        <div style={{background:"#0f0f0f",borderRight:"1px solid #1e1e1e",overflowY:"auto",padding:"16px"}}>

          {/* Score Type */}
          <div style={{marginBottom:"20px"}}>
            <SectionTitle num={1} label="SCORE TYPE" />
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
              {SCORE_TYPES.map(st => (
                <button key={st.id} onClick={() => setScoreType(st.id)} style={{
                  background:scoreType===st.id?"rgba(212,168,67,0.15)":"#111",
                  border:`1px solid ${scoreType===st.id?"#d4a843":"#222"}`,
                  borderRadius:"4px",padding:"10px 8px",cursor:"pointer",textAlign:"center",
                  transition:"all 0.2s",
                }}>
                  <div style={{fontSize:"18px",marginBottom:"4px"}}>{st.icon}</div>
                  <div style={{fontSize:"9px",fontWeight:700,color:scoreType===st.id?"#d4a843":"#e0d8cc",letterSpacing:"0.5px",marginBottom:"2px"}}>{st.label}</div>
                  <div style={{fontSize:"8px",color:"#888"}}>{st.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mood & Genre */}
          <div style={{marginBottom:"20px"}}>
            <SectionTitle num={2} label="MOOD & GENRE" />
            <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
              {MOODS.map(m => (
                <button key={m} onClick={() => toggleMood(m)} style={{
                  fontSize:"9px",padding:"4px 8px",borderRadius:"2px",cursor:"pointer",transition:"all 0.15s",
                  background:selectedMoods.includes(m)?"rgba(212,168,67,0.15)":"#111",
                  border:`1px solid ${selectedMoods.includes(m)?"#d4a843":"#222"}`,
                  color:selectedMoods.includes(m)?"#d4a843":"#888",
                }}>{m}</button>
              ))}
            </div>
          </div>

          {/* Score Brief */}
          <div style={{marginBottom:"20px"}}>
            <SectionTitle num={3} label="SCORE BRIEF" />
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
              <button style={{
                display:"flex",alignItems:"center",gap:"6px",
                background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.35)",
                color:"#d4a843",padding:"7px 12px",borderRadius:"3px",
                fontSize:"9px",fontWeight:700,letterSpacing:"1px",cursor:"pointer",
              }}>
                <span style={{fontSize:"13px"}}>🎙</span> SPEAK YOUR BRIEF
              </button>
              <span style={{fontSize:"8px",color:"#888"}}>or type below</span>
            </div>
            <textarea
              value={scoreBrief}
              onChange={e=>setScoreBrief(e.target.value)}
              rows={4}
              placeholder="Describe the scene, emotion, or story this score needs to tell..."
              style={{
                width:"100%",background:"#111",border:"1px solid #222",color:"#e0d8cc",
                fontSize:"10px",padding:"10px",borderRadius:"3px",resize:"vertical",
                fontFamily:"'Montserrat',sans-serif",lineHeight:1.6,boxSizing:"border-box",
              }}
            />
          </div>

          {/* Duration & Key */}
          <div style={{marginBottom:"20px"}}>
            <SectionTitle num={4} label="DURATION & KEY" />
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"10px"}}>
              <div>
                <div style={{fontSize:"8px",color:"#888",marginBottom:"4px"}}>DURATION</div>
                <select value={duration} onChange={e=>setDuration(e.target.value)} style={{width:"100%",background:"#111",border:"1px solid #222",color:"#e0d8cc",padding:"7px",borderRadius:"3px",fontSize:"10px"}}>
                  {["0:30 — Trailer cue","1:00 — Short cue","2:30 — Main title","4:00 — Full scene","Custom length"].map(k=><option key={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:"8px",color:"#888",marginBottom:"4px"}}>KEY / SCALE</div>
                <select value={key} onChange={e=>setKey(e.target.value)} style={{width:"100%",background:"#111",border:"1px solid #222",color:"#e0d8cc",padding:"7px",borderRadius:"3px",fontSize:"10px"}}>
                  {["C Major","D Minor","E Minor","G Major","A Minor","B♭ Major","AI Chooses"].map(k=><option key={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
              <div>
                <div style={{fontSize:"8px",color:"#888",marginBottom:"4px"}}>TEMPO (BPM)</div>
                <input type="number" value={tempo} onChange={e=>setTempo(e.target.value)} style={{width:"100%",background:"#111",border:"1px solid #222",color:"#e0d8cc",padding:"7px",borderRadius:"3px",fontSize:"10px",boxSizing:"border-box"}} />
              </div>
              <div>
                <div style={{fontSize:"8px",color:"#888",marginBottom:"4px"}}>TIME SIGNATURE</div>
                <select value={timeSig} onChange={e=>setTimeSig(e.target.value)} style={{width:"100%",background:"#111",border:"1px solid #222",color:"#e0d8cc",padding:"7px",borderRadius:"3px",fontSize:"10px"}}>
                  {["4/4","3/4","6/8","5/4","7/8"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Studio Ambience */}
          <div style={{marginBottom:"8px"}}>
            <div style={{fontSize:"9px",fontWeight:700,color:"#d4a843",letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px",display:"flex",alignItems:"center",gap:"6px"}}>
              🔆 STUDIO AMBIENCE
              <div style={{flex:1,height:"1px",background:"#1e1e1e"}} />
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <span style={{fontSize:"9px",color:"#888",whiteSpace:"nowrap"}}>Dim</span>
              <input type="range" min={0} max={100} value={ambience} onChange={e=>setAmbience(Number(e.target.value))} style={{flex:1,accentColor:"#d4a843"}} />
              <span style={{fontSize:"9px",color:"#888",whiteSpace:"nowrap"}}>Bright</span>
              <span style={{fontSize:"9px",color:"#d4a843",fontFamily:"'Courier Prime',monospace",width:"30px",textAlign:"right"}}>{ambience}%</span>
            </div>
          </div>
        </div>

        {/* ── CENTRE PANEL ── */}
        <div style={{background:"#080808",overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:"0"}}>

          {/* Transport Bar */}
          <div style={{
            display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px",
            background:"#0d0d0d",border:"1px solid #1e1e1e",borderRadius:"4px",padding:"8px 12px",flexShrink:0,
          }}>
            <button style={{width:"28px",height:"28px",borderRadius:"50%",border:"1px solid #333",background:"#111",color:"#e0d8cc",fontSize:"10px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>⏮</button>
            <button style={{width:"28px",height:"28px",borderRadius:"50%",border:"1px solid #333",background:"#111",color:"#e0d8cc",fontSize:"10px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>◀</button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{width:"28px",height:"28px",borderRadius:"50%",border:"1px solid #d4a843",background:"#d4a843",color:"#000",fontSize:"10px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
            >{isPlaying ? "⏸" : "▶"}</button>
            <button style={{width:"28px",height:"28px",borderRadius:"50%",border:"1px solid #333",background:"#111",color:"#e0d8cc",fontSize:"10px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>▶</button>
            <button style={{width:"28px",height:"28px",borderRadius:"50%",border:"1px solid #333",background:"#111",color:"#e05555",fontSize:"10px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>⏺</button>
            <span style={{fontFamily:"'Courier Prime',monospace",fontSize:"13px",color:"#d4a843",fontWeight:700,margin:"0 8px"}}>00:01:24:08</span>
            <div style={{flex:1,height:"3px",background:"#111",borderRadius:"2px",position:"relative",cursor:"pointer",margin:"0 8px"}}>
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:`${progress}%`,background:"linear-gradient(to right,rgba(212,168,67,0.3),rgba(212,168,67,0.6))",borderRadius:"2px"}} />
              <div style={{position:"absolute",left:`${progress}%`,top:"-4px",width:"2px",height:"11px",background:"#d4a843",borderRadius:"1px"}} />
            </div>
            <span style={{fontSize:"9px",color:"#888",marginLeft:"auto",whiteSpace:"nowrap"}}>BPM <span style={{color:"#d4a843",fontWeight:700}}>{tempo}</span> · {key} · {timeSig}</span>
          </div>

          {/* Score Timeline Header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px",flexShrink:0}}>
            <div>
              <div style={{fontSize:"11px",fontWeight:700,color:"#e0d8cc",letterSpacing:"1px"}}>ECHOES OF ETERNITY — MAIN TITLE</div>
              <div style={{fontSize:"9px",color:"#888",marginTop:"2px"}}>Feature Film Score · 2:24 · 8 instrument groups · Choir: 32 voices</div>
            </div>
            <div style={{display:"flex",gap:"6px"}}>
              <button style={{padding:"5px 10px",background:"#111",border:"1px solid #222",color:"#888",fontSize:"9px",borderRadius:"3px",cursor:"pointer"}}>📄 Score PDF</button>
              <button style={{padding:"5px 10px",background:"#111",border:"1px solid #222",color:"#888",fontSize:"9px",borderRadius:"3px",cursor:"pointer"}}>🎼 MIDI Export</button>
              <button style={{padding:"5px 10px",background:"rgba(212,168,67,0.15)",border:"1px solid rgba(212,168,67,0.4)",color:"#d4a843",fontSize:"9px",borderRadius:"3px",cursor:"pointer",fontWeight:700}}>+ ADD INSTRUMENT</button>
            </div>
          </div>

          {/* Instrument Track List */}
          <div style={{display:"flex",flexDirection:"column",gap:"4px",marginBottom:"16px",flexShrink:0}}>
            {INSTRUMENT_TRACKS.map((track, idx) => (
              <div key={track.name} style={{
                display:"flex",alignItems:"center",gap:"8px",
                background: idx === 0 ? "rgba(212,168,67,0.05)" : "#0d0d0d",
                border:`1px solid ${idx === 0 ? "rgba(212,168,67,0.2)" : "#1e1e1e"}`,
                borderRadius:"3px",padding:"6px 8px",
              }}>
                <div style={{width:"4px",height:"32px",borderRadius:"2px",background:track.color,flexShrink:0}} />
                <div style={{width:"90px",flexShrink:0}}>
                  <div style={{fontSize:"9px",fontWeight:700,color:"#e0d8cc",marginBottom:"1px"}}>{track.name}</div>
                  <div style={{fontSize:"7px",color:"#555",lineHeight:1.3}}>{track.section}</div>
                </div>
                <div style={{flex:1,height:"20px",minWidth:0}}>
                  <TrackWaveform color={track.color} />
                </div>
                <div style={{fontSize:"8px",color:"#888",fontFamily:"'Courier Prime',monospace",width:"32px",textAlign:"right",flexShrink:0}}>{track.vol}</div>
                <button
                  onClick={() => toggleMute(track.name)}
                  style={{
                    width:"20px",height:"20px",borderRadius:"2px",flexShrink:0,cursor:"pointer",
                    background:mutedTracks.includes(track.name)?"rgba(224,85,85,0.2)":"#111",
                    border:`1px solid ${mutedTracks.includes(track.name)?"rgba(224,85,85,0.5)":"#222"}`,
                    color:mutedTracks.includes(track.name)?"#e05555":"#555",
                    fontSize:"7px",fontWeight:700,
                  }}
                >M</button>
              </div>
            ))}
          </div>

          {/* Notation Preview */}
          <div style={{background:"#0d0d0d",border:"1px solid #1e1e1e",borderRadius:"4px",padding:"12px",flexShrink:0}}>
            <div style={{fontSize:"8px",fontWeight:700,color:"#888",letterSpacing:"1.5px",marginBottom:"8px"}}>SCORE PREVIEW — BAR 24–28 · STRINGS & CHOIR ENTRY</div>
            <svg width="100%" height="60" viewBox="0 0 600 60" style={{display:"block"}}>
              {/* Staff lines */}
              <line x1="30" y1="10" x2="580" y2="10" stroke="#444" strokeWidth="0.8"/>
              <line x1="30" y1="18" x2="580" y2="18" stroke="#444" strokeWidth="0.8"/>
              <line x1="30" y1="26" x2="580" y2="26" stroke="#444" strokeWidth="0.8"/>
              <line x1="30" y1="34" x2="580" y2="34" stroke="#444" strokeWidth="0.8"/>
              <line x1="30" y1="42" x2="580" y2="42" stroke="#444" strokeWidth="0.8"/>
              {/* Treble clef */}
              <text x="32" y="38" fontSize="32" fill="#555" fontFamily="serif">𝄞</text>
              {/* Time sig */}
              <text x="62" y="24" fontSize="14" fill="#444" fontFamily="serif" fontWeight="bold">4</text>
              <text x="62" y="40" fontSize="14" fill="#444" fontFamily="serif" fontWeight="bold">4</text>
              {/* Bar lines */}
              <line x1="90" y1="10" x2="90" y2="42" stroke="#555" strokeWidth="0.8"/>
              <line x1="220" y1="10" x2="220" y2="42" stroke="#555" strokeWidth="0.8"/>
              <line x1="350" y1="10" x2="350" y2="42" stroke="#555" strokeWidth="0.8"/>
              <line x1="480" y1="10" x2="480" y2="42" stroke="#555" strokeWidth="0.8"/>
              <line x1="580" y1="10" x2="580" y2="42" stroke="#555" strokeWidth="1.5"/>
              {/* Notes bar 1 */}
              <ellipse cx="110" cy="26" rx="6" ry="4" fill="#444" transform="rotate(-15,110,26)"/>
              <line x1="116" y1="26" x2="116" y2="6" stroke="#444" strokeWidth="1.2"/>
              <ellipse cx="140" cy="22" rx="6" ry="4" fill="#444" transform="rotate(-15,140,22)"/>
              <line x1="146" y1="22" x2="146" y2="2" stroke="#444" strokeWidth="1.2"/>
              <ellipse cx="170" cy="18" rx="6" ry="4" fill="#444" transform="rotate(-15,170,18)"/>
              <line x1="176" y1="18" x2="176" y2="-2" stroke="#444" strokeWidth="1.2"/>
              <ellipse cx="200" cy="14" rx="6" ry="4" fill="#444" transform="rotate(-15,200,14)"/>
              <line x1="206" y1="14" x2="206" y2="-6" stroke="#444" strokeWidth="1.2"/>
              {/* Notes bar 2 — held note */}
              <ellipse cx="250" cy="10" rx="7" ry="5" fill="none" stroke="#444" strokeWidth="1.5" transform="rotate(-15,250,10)"/>
              <line x1="257" y1="10" x2="257" y2="-10" stroke="#444" strokeWidth="1.2"/>
              <line x1="257" y1="-10" x2="340" y2="-10" stroke="#444" strokeWidth="1.2"/>
              {/* Dynamic markings */}
              <text x="95" y="55" fontSize="10" fill="#666" fontFamily="serif" fontStyle="italic">pp</text>
              <text x="225" y="55" fontSize="10" fill="#666" fontFamily="serif" fontStyle="italic">cresc.</text>
              <text x="355" y="55" fontSize="10" fill="#666" fontFamily="serif" fontStyle="italic">mf</text>
              <text x="485" y="55" fontSize="10" fill="#666" fontFamily="serif" fontStyle="italic">f</text>
              {/* Choir entry marker */}
              <text x="350" y="8" fontSize="8" fill="#9b59f5" fontFamily="sans-serif" fontWeight="bold">CHOIR ENTRY</text>
              <line x1="350" y1="10" x2="350" y2="42" stroke="#9b59f5" strokeWidth="1" strokeDasharray="3,2"/>
            </svg>
            <div style={{fontSize:"8px",color:"#555",textAlign:"center",marginTop:"4px"}}>Solo cello opens pp · Strings build cresc. · Full choir entry at bar 28 · Key: D Minor</div>
          </div>

          {/* Ensemble Configuration */}
          <div style={{padding:"16px 0 0"}}>
            <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"2px",color:"#d4a843",textTransform:"uppercase",marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px"}}>
              ENSEMBLE CONFIGURATION
              <div style={{flex:1,height:"1px",background:"#1e1e1e"}} />
              <span style={{fontSize:"8px",color:"#555",fontWeight:400,letterSpacing:0,textTransform:"none"}}>{activeEnsemble.length} groups active</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px"}}>
              {ENSEMBLE_GROUPS.map(g => (
                <button key={g.id} onClick={() => toggleEnsemble(g.id)} style={{
                  background:activeEnsemble.includes(g.id)?"rgba(212,168,67,0.08)":"#0d0d0d",
                  border:`1px solid ${activeEnsemble.includes(g.id)?"rgba(212,168,67,0.3)":"#1a1a1a"}`,
                  borderRadius:"6px",padding:"10px 8px",cursor:"pointer",textAlign:"center",
                }}>
                  <div style={{fontSize:"20px",marginBottom:"4px"}}>{g.icon}</div>
                  <div style={{fontSize:"9px",fontWeight:700,color:activeEnsemble.includes(g.id)?"#d4a843":"#666",marginBottom:"2px"}}>{g.label}</div>
                  <div style={{fontSize:"7px",color:"#444",lineHeight:1.3}}>{g.desc}</div>
                  {activeEnsemble.includes(g.id) && <div style={{marginTop:"4px",fontSize:"7px",color:"#6db86d",fontWeight:700}}>✓ ACTIVE</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <div style={{padding:"16px 0 0"}}>
            <button onClick={() => mp.generationStarted("WizScore", undefined, scoreBrief.trim().length > 0)} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#d4a843,#b8902a)",border:"none",borderRadius:"4px",color:"#000",fontSize:"13px",fontWeight:900,letterSpacing:"2px",textTransform:"uppercase",cursor:"pointer"}}>
              🎬 COMPOSE SCORE
              <div style={{fontSize:"9px",fontWeight:400,marginTop:"3px",opacity:0.7}}>Brief → Ensemble → Compose → Upgrade Preview → Render</div>
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{borderLeft:"1px solid #1e1e1e",overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:"0"}}>

          {/* Upgrade Preview */}
          <div style={{borderBottom:"1px solid #141414",paddingBottom:"14px",marginBottom:"14px"}}>
            <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"2px",color:"#d4a843",textTransform:"uppercase",marginBottom:"6px"}}>🎧 HEAR & SEE THE DIFFERENCE</div>
            <div style={{fontSize:"8px",color:"#555",marginBottom:"10px",lineHeight:1.5}}>Listen before you commit. Preview your score in all three quality tiers — no download until payment confirmed.</div>

            {/* Tier tabs */}
            <div style={{display:"flex",borderBottom:"1px solid #1a1a1a",marginBottom:"10px"}}>
              {(["original","enhanced","cinematic"] as const).map(t => (
                <button key={t} onClick={() => setTier(t)} style={{
                  flex:1,padding:"8px 4px",background:"none",border:"none",cursor:"pointer",
                  borderBottom:tier===t?"2px solid #d4a843":"2px solid transparent",
                  color:tier===t?"#d4a843":"#444",
                  fontSize:"9px",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",
                }}>
                  {t.toUpperCase()}
                  <span style={{fontSize:"8px",color:tier===t?"#d4a843":"#333"}}>{TIER_INFO[t].price}</span>
                </button>
              ))}
            </div>

            {/* EQ Visualizer canvas */}
            <div style={{height:"32px",background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:"3px",overflow:"hidden",marginBottom:"8px"}}>
              <EQVisualizer tier={tier} />
            </div>

            {/* Audio player */}
            <div style={{background:"#080808",border:"1px solid #1a1a1a",borderRadius:"4px",padding:"8px 10px",marginBottom:"8px"}}>
              <div style={{fontSize:"9px",color:"#d4a843",fontWeight:700,marginBottom:"2px"}}>{TIER_INFO[tier].label}</div>
              <div style={{fontSize:"8px",color:"#555",marginBottom:"6px"}}>Echoes of Eternity — Main Title</div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <button onClick={() => setIsPlaying(!isPlaying)} style={{background:"#d4a843",border:"none",borderRadius:"50%",width:"22px",height:"22px",cursor:"pointer",fontSize:"9px",color:"#000",flexShrink:0}}>
                  {isPlaying ? "⏸" : "▶"}
                </button>
                <div style={{flex:1,height:"3px",background:"#1a1a1a",borderRadius:"2px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#d4a843,#f0c040)",borderRadius:"2px"}} />
                </div>
                <span style={{fontSize:"9px",color:"#555"}}>0:35 / 2:24</span>
              </div>
              <div style={{fontSize:"8px",color:"#333",marginTop:"4px"}}>🔒 Preview only — no download until render complete & payment confirmed</div>
            </div>

            {/* WizLuminar visual quality */}
            <div style={{marginBottom:"10px"}}>
              <div style={{fontSize:"8px",color:"#d4a843",fontWeight:700,letterSpacing:"1px",marginBottom:"6px"}}>WIZLUMINAR™ — VISUAL QUALITY</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px"}}>
                {(["ORIGINAL","ENHANCED","CINEMATIC"] as const).map((lbl,li) => (
                  <button key={lbl} onClick={() => setLuminarTier(lbl.toLowerCase())} style={{
                    background:"#0d0d0d",border:`1px solid ${luminarTier===lbl.toLowerCase()?"#d4a843":"#1a1a1a"}`,
                    borderRadius:"4px",overflow:"hidden",cursor:"pointer",padding:0,position:"relative",
                  }}>
                    <div style={{
                      width:"100%",aspectRatio:"16/9",
                      background:li===0?"linear-gradient(135deg,#1a1a1a,#2a2a2a)":li===1?"linear-gradient(135deg,#1a1208,#2a2010)":"linear-gradient(135deg,#0d0a00,#1a1400)",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",
                    }}>
                      {li===0?"🎼":li===1?"✨":"🌟"}
                    </div>
                    {/* Lock overlay on CINEMATIC if not selected */}
                    {li === 2 && luminarTier !== "cinematic" && (
                      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px"}}>🔒</div>
                    )}
                    <div style={{fontSize:"7px",fontWeight:700,color:luminarTier===lbl.toLowerCase()?"#d4a843":"#444",padding:"3px",textAlign:"center"}}>{lbl}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Upgrade CTAs */}
            <button onClick={() => mp.upgradeCTAClicked("WizScore", "WizSound Cinematic")} style={{width:"100%",padding:"10px 12px",background:"linear-gradient(135deg,rgba(155,89,245,0.15),rgba(155,89,245,0.08))",border:"1px solid rgba(155,89,245,0.3)",borderRadius:"4px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
              <span style={{fontSize:"10px",fontWeight:700,color:"#9b59f5",letterSpacing:"1px"}}>🎵 WizSound™ Cinematic</span>
              <span style={{fontSize:"12px",fontWeight:900,color:"#9b59f5"}}>{WIZSOUND_TIERS.CINEMATIC.price}</span>
            </button>
            <button onClick={() => mp.upgradeCTAClicked("WizScore", "WizLuminar Cinematic")} style={{width:"100%",padding:"10px 12px",background:"linear-gradient(135deg,rgba(212,168,67,0.12),rgba(212,168,67,0.06))",border:"1px solid rgba(212,168,67,0.25)",borderRadius:"4px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"10px",fontWeight:700,color:"#d4a843",letterSpacing:"1px"}}>✨ WizLuminar™ Cinematic</span>
              <span style={{fontSize:"12px",fontWeight:900,color:"#d4a843"}}>{WIZLUMINAR_CINEMATIC.price}</span>
            </button>
          </div>

          {/* Render Quality */}
          <div style={{borderBottom:"1px solid #141414",paddingBottom:"14px",marginBottom:"14px"}}>
            <div style={{fontSize:"9px",fontWeight:700,color:"#d4a843",letterSpacing:"1.5px",marginBottom:"8px"}}>RENDER QUALITY</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px",marginBottom:"10px"}}>
              {RENDER_QUALITY_TIERS.map(rq => {
                const sub = rq.label === "HD" ? "48kHz · 24-bit" : rq.label === "4K" ? "96kHz · 32-bit" : "192kHz · 32-bit";
                return (
                  <button key={rq.label} onClick={() => setRenderQuality(rq.label)} style={{
                    background:renderQuality===rq.label?"rgba(212,168,67,0.12)":"#0d0d0d",
                    border:`1px solid ${renderQuality===rq.label?"rgba(212,168,67,0.4)":"#1a1a1a"}`,
                    borderRadius:"4px",padding:"8px 4px",cursor:"pointer",textAlign:"center",
                  }}>
                    <div style={{fontSize:"12px",fontWeight:900,color:renderQuality===rq.label?"#d4a843":"#666"}}>{rq.label}</div>
                    <div style={{fontSize:"7px",color:"#444",margin:"2px 0"}}>{sub}</div>
                    <div style={{fontSize:"8px",color:renderQuality===rq.label?"#d4a843":"#555"}}>{rq.price}</div>
                  </button>
                );
              })}
            </div>
            <button style={{width:"100%",padding:"10px",background:"linear-gradient(135deg,#d4a843,#b8902a)",border:"none",borderRadius:"3px",color:"#000",fontSize:"11px",fontWeight:900,letterSpacing:"1px",cursor:"pointer"}}>
              🎬 RENDER SCORE — {renderQuality}
            </button>
          </div>

          {/* Production Status */}
          <div>
            <div style={{fontSize:"9px",fontWeight:700,color:"#d4a843",letterSpacing:"1.5px",marginBottom:"8px"}}>PRODUCTION STATUS</div>
            {[
              {label:"Project Brief Locked",     val:"✓",           done:true,  active:false},
              {label:"Ensemble Configured",       val:"8 groups",    done:true,  active:false},
              {label:"AI Composition",            val:"In progress", done:false, active:true},
              {label:"WizSound™ Processing",      val:"Pending",     done:false, active:false},
              {label:"WizLuminar™ Grade",         val:"Pending",     done:false, active:false},
              {label:"Final Render & Export",     val:"Pending",     done:false, active:false},
            ].map(step => (
              <div key={step.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #111"}}>
                <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                  <div style={{width:"6px",height:"6px",borderRadius:"50%",background:step.done?"#6db86d":step.active?"#d4a843":"#2a2a2a",flexShrink:0}} />
                  <span style={{fontSize:"9px",color:step.done?"#888":step.active?"#ccc":"#444"}}>{step.label}</span>
                </div>
                <span style={{fontSize:"8px",color:step.done?"#6db86d":step.active?"#d4a843":"#333"}}>{step.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer Tribute ── */}
      <div style={{
        flexShrink:0,padding:"10px 20px",
        background:"#050505",borderTop:"1px solid #1a1a1a",
        display:"flex",alignItems:"center",justifyContent:"space-between",
      }}>
        <div style={{fontSize:"9px",color:"#333"}}>
          Inspired by{" "}
          <span style={{color:"#555"}}>Air Studios Lyndhurst Hall</span> ·{" "}
          <span style={{color:"#555"}}>Abbey Road</span> ·{" "}
          <span style={{color:"#555"}}>Montserrat</span>{" "}
          — In memory of <span style={{color:"#555"}}>Sir George Martin</span>
        </div>
        <div style={{fontSize:"9px",color:"#333"}}>WizAI — The world's first AI virtual scoring studio</div>
      </div>
    </div>
  );
}

function SectionTitle({ num, label }: { num: number; label: string }) {
  return (
    <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"2px",color:"#d4a843",textTransform:"uppercase",marginBottom:"10px",display:"flex",alignItems:"center",gap:"6px"}}>
      <div style={{width:"18px",height:"18px",borderRadius:"50%",background:"#d4a843",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:900,color:"#000",flexShrink:0}}>{num}</div>
      {label}
      <div style={{flex:1,height:"1px",background:"#1e1e1e"}} />
    </div>
  );
}
