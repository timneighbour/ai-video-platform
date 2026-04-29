/**
 * WizAnimate™ — AI Character Animation Studio
 * HTML Reference Pass: mockup-wizanimate-v2.html
 * All workflow logic preserved; UI fidelity additions only.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { LandscapeHint } from "@/components/LandscapeHint";
import { WIZSOUND_TIERS, VIDEO_QUALITY_2TIER, WIZLUMINAR_CINEMATIC } from "@/lib/pricing";
import { Link } from "wouter";
import StudioAmbientLight from "@/components/StudioAmbientLight";
import AnimatedEqualiser from "@/components/AnimatedEqualiser";
import { mp } from "@/lib/mixpanel";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

// ─── Assets ──────────────────────────────────────────────────────────────────
const LOGO_IMG = "/manus-storage/wizanimate-logo-new_a84f9808.png";
const ENV_IMG = "/manus-storage/wizanimate-studio-bg_db3d45e8.jpg";

// ─── Constants ───────────────────────────────────────────────────────────────
const ACCENT = "#7c5cbf";
const ACCENT_LIGHT = "#9b7de0";
const ACCENT_DIM = "rgba(124,92,191,0.12)";
const ACCENT_BORDER = "rgba(124,92,191,0.35)";
const ACCENT_GLOW = "rgba(124,92,191,0.5)";
const GOLD = "#d4a843";
const GOLD_DIM = "rgba(212,168,67,0.12)";
const GOLD_BORDER = "rgba(212,168,67,0.3)";

const STAGES = [
  { key: "brief",      label: "Director's Brief" },
  { key: "character",  label: "Character Design" },
  { key: "storyboard", label: "Storyboard" },
  { key: "upgrade",    label: "Upgrade Preview" },
  { key: "render",     label: "Render & Export" },
] as const;
type Stage = typeof STAGES[number]["key"];

const ANIM_STYLES = [
  { id: "2dcartoon",    label: "2D Cartoon",       img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-2d-cartoon-5WEpP9ztEVzqBR82Yeit9w.webp" },
  { id: "ghibli",       label: "Studio Ghibli",    img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-studio-ghibli-Pu3nPV5TyiR4mj8mrV6Z3h.webp" },
  { id: "pixar3d",      label: "Pixar 3D",          img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-pixar-3d-CZgCHv6X9TEri5pcrSpdAS.webp" },
  { id: "anime",        label: "Anime",             img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-anime-n7c7SshgoN52BwNex7bCB4.webp" },
  { id: "stopmotion",   label: "Stop Motion",       img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-stop-motion-6iZWTvpJ8LeAttx3NeyodE.webp" },
  { id: "claymation",   label: "Claymation",        img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-claymation-8zUACV7SajWvQcaB5QZix4.webp" },
  { id: "motiongfx",    label: "Motion Graphics",   img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-motion-graphics-Y9hPNGw3MQccXsFW7H2b5J.webp" },
  { id: "whiteboard",   label: "Whiteboard",        img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-whiteboard-3JQka5rV2t2utVqvtn8A4a.webp" },
  { id: "retro80s",     label: "Retro 80s",         img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-retro-80s-BkpoNX8sTMUNAfWxnM6jaX.webp" },
  { id: "watercolour",  label: "Watercolour",       img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-watercolour-MAS2X5rJV3hzmfWfvKXgGU.webp" },
  { id: "lowpoly",      label: "Low Poly 3D",       img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-low-poly-9bKtfmaLAZH7q8SkbTLocR.webp" },
  { id: "comicbook",    label: "Comic Book",        img: "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/ALJHDNsuNA7bExFuoQZUsx/style-comic-book-EDi5vaTe3GU6xNLHzpVs3B.webp" },
];

const CHARS = [
  { id: "maya", label: "MAYA", initial: "M", status: "LOCKED", role: "LEAD", color: ACCENT },
  { id: "owl",  label: "OWL",  initial: "O", status: "LOCKED", role: null,   color: ACCENT },
  { id: "fox",  label: "FOX",  initial: "F", status: "IN PROGRESS", role: null, color: GOLD },
];

const LYRICS = [
  { time: "0:08", text: "Standing at the edge of everything I know" },
  { time: "0:16", text: "The city lights below me start to glow" },
  { time: "0:24", text: "I close my eyes and let the music take control" },
  { time: "0:32", text: "Feel the rhythm pulling at my soul" },
  { time: "0:48", text: "Every beat a heartbeat, every note a breath" },
  { time: "1:02", text: "Dancing on the line between the life and death" },
  { time: "1:18", text: "Rise up through the darkness, find the light within" },
  { time: "1:34", text: "This is where my story will begin" },
];

const SCENE_PREVIEWS = [
  { id: 1, label: "SC 01", badge: "FREE", bg: "linear-gradient(135deg,#1a2a1a,#2a3a2a)" },
  { id: 2, label: "SC 02", badge: "FREE", bg: "linear-gradient(135deg,#1a1a2a,#2a2a3a)" },
  { id: 3, label: "SC 03", badge: "AI",   bg: "linear-gradient(135deg,#2a1a1a,#3a2a2a)" },
  { id: 4, label: "SC 04", badge: "AI",   bg: "linear-gradient(135deg,#1a2a2a,#2a3a3a)" },
];

// ─── EQ Canvas ───────────────────────────────────────────────────────────────
function EQSpectrum({ tier }: { tier: "original" | "enhanced" | "cinematic" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const heights = useRef<number[]>(Array(40).fill(2));
  const targets = useRef<number[]>(Array(40).fill(2));

  const barColor = useCallback((i: number) => {
    if (tier === "cinematic") return i < 6 ? "#1a5aff" : i < 14 ? "#1a9aff" : i < 24 ? "#00cc44" : i < 32 ? GOLD : "#cc3300";
    if (tier === "enhanced") return i < 6 ? "#3a3aaa" : i < 14 ? "#4a4acc" : i < 24 ? "#2a8a44" : i < 32 ? "#8a7a33" : "#882200";
    return "#333";
  }, [tier]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function animate() {
      if (!canvas || !ctx) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const barW = W / 40 - 1;
      for (let i = 0; i < 40; i++) {
        if (Math.random() < 0.3) {
          const zone = i / 40;
          const maxH = zone < 0.15 ? 20 : zone < 0.4 ? 24 : zone < 0.7 ? 20 : 10;
          targets.current[i] = Math.random() * maxH + 2;
        }
        heights.current[i] += (targets.current[i] - heights.current[i]) * 0.22;
        ctx.fillStyle = barColor(i);
        ctx.fillRect(i * (barW + 1), H - heights.current[i], barW, heights.current[i]);
      }
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tier, barColor]);

  return <canvas ref={canvasRef} width={220} height={28} style={{ width: "100%", height: "28px", display: "block" }} />;
}// ─── Component ───────────────────────────────────────────────────────────────────────────────
export default function KidsVideo() {
  // Studio entry tracking — fires once on mount (page is auth-gated upstream)
  useEffect(() => { mp.studioEntered("WizAnimate"); }, []);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [stage, setStage]             = useState<Stage>("character");
  const [animStyle, setAnimStyle]     = useState("ghibli");
  const [brief, setBrief]             = useState("A young girl discovers a magical forest where animals can talk. She befriends a wise old owl who guides her on a journey to find a lost star. Warm, whimsical, Studio Ghibli-inspired atmosphere.");
  const [charName, setCharName]       = useState("Maya");
  const [ambience, setAmbience]       = useState(50);
  const [tier, setTier]               = useState<"original"|"enhanced"|"cinematic">("original");
  const [renderQuality, setRenderQuality] = useState("HD 1080p");
  const [renderFormat, setRenderFormat]   = useState("MP4");
  const [lipSync, setLipSync]         = useState(true);
  const [charLock, setCharLock]       = useState(true);
  const [beatSync, setBeatSync]       = useState(true);
  const [lyricOverlay, setLyricOverlay] = useState(true);
  const [colourGrade, setColourGrade] = useState(true);
  const [activeScene, setActiveScene] = useState(1);
  const [sceneCount, setSceneCount]   = useState(8);
  const [inputTab, setInputTab]       = useState(0);
  const [activeLyric, setActiveLyric] = useState(0);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [progress, setProgress]       = useState(0);
  const [duration, setDuration]       = useState("30s");
  const [cameraMove, setCameraMove]   = useState("Dynamic (AI decides)");
  const [musicSrc, setMusicSrc]       = useState("Uploaded track");
  const [audioFile, setAudioFile]     = useState<File|null>(null);
  const [audioUrl, setAudioUrl]       = useState<string>("");
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [activePreviewScene, setActivePreviewScene] = useState(1);

  const stageIndex = STAGES.findIndex(s => s.key === stage);

  // Playback simulation
  useEffect(() => {
    if (!isPlaying) return;
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { setIsPlaying(false); return 0; }
        const next = p + 0.4;
        const secs = (next / 100) * 222;
        const lyricSeconds = [8, 16, 24, 32, 48, 62, 78, 94];
        for (let i = lyricSeconds.length - 1; i >= 0; i--) {
          if (secs >= lyricSeconds[i]) { setActiveLyric(i); break; }
        }
        return next;
      });
    }, 200);
    return () => clearInterval(iv);
  }, [isPlaying]);

  const TIER_PRICE = {
    original: WIZSOUND_TIERS.ORIGINAL.price,
    enhanced: WIZSOUND_TIERS.ENHANCED.price,
    cinematic: WIZSOUND_TIERS.CINEMATIC.price,
  };

  const TIER_DESC: Record<string, string> = {
    original: "Your original uploaded track — unprocessed, as recorded.",
    enhanced: "Stereo widening, EQ mastering, and spatial depth enhancement.",
    cinematic: "Full Dolby Atmos spatial audio with cinematic post-processing.",
  };

  const selectedStyle = ANIM_STYLES.find(s => s.id === animStyle);

  // ─── Pill nav styles ────────────────────────────────────────────────────────
  const pill = (i: number) => ({
    display: "flex" as const, alignItems: "center", gap: "6px",
    padding: "10px 18px", fontSize: "10px", fontWeight: 700,
    letterSpacing: "1px", textTransform: "uppercase" as const,
    background: "none", border: "none", cursor: "pointer",
    whiteSpace: "nowrap" as const,
    borderBottom: i < stageIndex ? "2px solid #6db86d"
      : i === stageIndex ? `2px solid ${ACCENT_LIGHT}`
      : "2px solid transparent",
    color: i < stageIndex ? "#6db86d" : i === stageIndex ? ACCENT_LIGHT : "#444",
  });
  const pillNum = (i: number) => ({
    width: "18px", height: "18px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "9px", fontWeight: 900, flexShrink: 0,
    background: i < stageIndex ? "#6db86d" : i === stageIndex ? ACCENT : "#222",
    color: i < stageIndex ? "#000" : "#fff",
  });

  // Page-load auth gate: redirect unauthenticated users to sign-in
  if (!authLoading && !isAuthenticated) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#080808", color: "#ccc", fontFamily: "'Inter', sans-serif", alignItems: "center", justifyContent: "center", gap: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: `${ACCENT_DIM}`, border: `1px solid ${ACCENT_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={ACCENT_LIGHT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#fff", marginBottom: "12px" }}>WizAnimate™</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: "32px", lineHeight: 1.6 }}>Sign in to start creating AI animations.</p>
          <a href={getLoginUrl("/kids-video")} style={{ display: "inline-block", padding: "12px 32px", background: `linear-gradient(135deg, ${ACCENT_LIGHT}, ${ACCENT})`, color: "#fff", borderRadius: "12px", fontWeight: 700, fontSize: "15px", textDecoration: "none" }}>Sign in to continue</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: "#080808", color: "#ccc",
      fontFamily: "'Inter', sans-serif", overflow: "hidden",
      position: "relative",
    }}>
      {/* ── Studio Hero — Pixar Animation Studio ── */}
      <div style={{position:'relative',width:'100%',height:280,overflow:'hidden',background:'#000',flexShrink:0}}>
        <img src={ENV_IMG} alt="WizAnimate Animation Studio" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 35%',filter:`brightness(${ambience/100})`,transition:'filter 0.6s ease'}} />
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.3)',pointerEvents:'none'}} />
        <div style={{position:'absolute',inset:0,background:'linear-gradient(0deg,rgba(8,8,8,1) 0%,rgba(8,8,8,0.35) 55%,transparent 100%)',pointerEvents:'none'}} />
        <div style={{position:'absolute',top:20,left:24,zIndex:20}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:'3px',textTransform:'uppercase',color:'rgba(255,255,255,0.85)',marginBottom:5,textShadow:'0 1px 8px rgba(0,0,0,0.9)'}}>WizAnimate™ · Animation Studio</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,letterSpacing:3,color:'#ffffff',textShadow:'0 2px 32px rgba(0,0,0,0.95), 0 0 60px rgba(124,92,191,0.3)',lineHeight:1,marginBottom:6}}>ANIMATION DIRECTOR</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',fontWeight:400,letterSpacing:'0.5px'}}>Bring any character to life with AI-powered animation</div>
        </div>
        <div style={{position:'absolute',top:20,right:24,zIndex:20,display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(0,0,0,0.7)',border:'1px solid rgba(124,92,191,0.3)',borderRadius:4,padding:'4px 10px'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#7c5cbf',boxShadow:'0 0 6px #7c5cbf'}} />
            <span style={{fontSize:9,fontWeight:700,letterSpacing:'2px',color:'#9b7de0',textTransform:'uppercase'}}>STUDIO READY</span>
          </div>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: "48px",
        borderBottom: "1px solid #1a1a1a",
        background: "#0a0a0a",
        flexShrink: 0,
      }}>
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/" style={{ fontSize: "11px", color: "#555", textDecoration: "none", display: "flex", alignItems: "center", gap: "5px" }}>← Back</Link>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img src={LOGO_IMG} alt="WizAnimate" style={{ height: "22px", objectFit: "contain" }} />
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: "16px",
              letterSpacing: "2px", color: "#fff",
            }}>Wiz<span style={{ color: ACCENT_LIGHT }}>Animate</span>™</span>
          </div>
          <div style={{
            background: ACCENT_DIM, border: `1px solid ${ACCENT_BORDER}`,
            color: ACCENT_LIGHT, fontSize: "9px", fontWeight: 700, letterSpacing: "1.5px",
            padding: "3px 8px", borderRadius: "2px", textTransform: "uppercase",
          }}>Animation Studio</div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <StudioAmbientLight value={ambience} onChange={setAmbience} accentColor={ACCENT_LIGHT} />
          <div style={{
            background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "4px",
            padding: "6px 12px", fontSize: "11px", fontWeight: 700, color: GOLD,
          }}>10,000 Credits</div>
          <div style={{
            width: "32px", height: "32px", borderRadius: "50%",
            background: `linear-gradient(135deg, ${ACCENT}, #4a3a8a)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "12px", fontWeight: 700, color: "#fff",
          }}>T</div>
        </div>
      </nav>

      {/* ── Stage Bar ───────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0a0a0a", borderBottom: "1px solid #1a1a1a",
        padding: "0 20px", overflowX: "auto", flexShrink: 0,
      }}>
        {STAGES.map((s, i) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => setStage(s.key)} style={pill(i)}>
              <span style={pillNum(i)}>{i < stageIndex ? "✓" : i + 1}</span>
              {s.label}
            </button>
            {i < STAGES.length - 1 && (
              <span style={{ color: "#2a2a2a", fontSize: "10px", padding: "0 4px" }}>›</span>
            )}
          </div>
        ))}
      </div>

      {/* ── AUDIO UPLOAD BANNER ── */}
      <input ref={audioInputRef} type="file" accept="audio/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f){setAudioFile(f);setAudioUrl(URL.createObjectURL(f));setMusicSrc("Uploaded track");}}} />
      {!audioFile ? (
        <div
          onClick={() => audioInputRef.current?.click()}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files?.[0];if(f&&f.type.startsWith("audio/")){setAudioFile(f);setAudioUrl(URL.createObjectURL(f));}}}
          style={{
            flexShrink:0, cursor:"pointer", transition:"background 0.2s",
            background:"linear-gradient(90deg, rgba(124,92,191,0.14) 0%, rgba(124,92,191,0.07) 100%)",
            borderBottom:"1px solid rgba(124,92,191,0.3)",
            padding:"12px 20px", display:"flex", alignItems:"center", gap:"14px",
          }}
          onMouseEnter={e=>(e.currentTarget.style.background="linear-gradient(90deg, rgba(124,92,191,0.22) 0%, rgba(124,92,191,0.11) 100%)")}
          onMouseLeave={e=>(e.currentTarget.style.background="linear-gradient(90deg, rgba(124,92,191,0.14) 0%, rgba(124,92,191,0.07) 100%)")}
        >
          <div style={{width:"40px",height:"40px",borderRadius:"8px",background:"rgba(124,92,191,0.18)",border:"1px solid rgba(124,92,191,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>🎵</div>
          <div style={{flex:1}}>
            <div style={{fontSize:"11px",fontWeight:800,color:ACCENT_LIGHT,letterSpacing:"0.8px",marginBottom:"2px"}}>UPLOAD YOUR AUDIO TRACK TO BEGIN</div>
            <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)"}}>MP3, WAV, M4A · WizAnimate™ syncs every scene to your music, extracts lyrics, and animates to the beat</div>
          </div>
          <div style={{fontSize:"9px",fontWeight:700,color:"rgba(124,92,191,0.7)",border:"1px solid rgba(124,92,191,0.3)",padding:"5px 12px",borderRadius:"3px",flexShrink:0}}>CLICK OR DROP</div>
        </div>
      ) : (
        <div style={{flexShrink:0,background:"rgba(109,184,109,0.08)",borderBottom:"1px solid rgba(109,184,109,0.2)",padding:"8px 20px",display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"7px",height:"7px",borderRadius:"50%",background:"#6db86d",boxShadow:"0 0 6px #6db86d",animation:"wizLivePulse 1.5s infinite",flexShrink:0}} />
          <div style={{fontSize:"10px",fontWeight:700,color:"#6db86d"}}>AUDIO LOADED — {audioFile.name}</div>
          <div style={{flex:1,height:"28px"}}><AnimatedEqualiser barCount={32} color="#6db86d" height={28} alwaysAnimate={true} /></div>
          <button onClick={()=>{setAudioFile(null);setAudioUrl("");}} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:"13px"}}>×</button>
        </div>
      )}

      {/* ── 2-Column Layout ─────────────────────────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "grid", gridTemplateColumns: "1fr 340px",
        flex: 1, overflow: "hidden",
      }}>

        {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
        <div style={{ borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ── Studio Viewport ─────────────────────────────────────────── */}
          <div style={{
            position: "relative", overflow: "hidden",
            height: "360px", flexShrink: 0,
            background: "#0a0a12",
          }}>
            {/* Ambient bg */}
            <div style={{
              position: "absolute", inset: 0,
              background: `
                radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,92,191,0.12) 0%, transparent 70%),
                radial-gradient(ellipse 30% 30% at 10% 80%, rgba(124,92,191,0.06) 0%, transparent 60%),
                radial-gradient(ellipse 30% 30% at 90% 80%, rgba(212,168,67,0.04) 0%, transparent 60%)
              `,
              filter: `brightness(${ambience / 100 + 0.5})`,
              transition: "filter 0.5s ease",
            }} />
            {/* Dark overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, rgba(8,8,8,0.25) 0%, rgba(8,8,8,0.05) 35%, rgba(8,8,8,0.55) 100%)",
            }} />

            {/* ── Left monitor: After Effects timeline ── */}
            <div style={{
              position: "absolute", left: "7.5%", top: "14%",
              width: "27%", height: "52%",
              background: "rgba(8,6,18,0.88)",
              border: `1px solid ${ACCENT_BORDER}`,
              borderRadius: "2px", overflow: "hidden",
            }}>
              <div style={{
                padding: "3px 7px", fontSize: "7px", fontWeight: 700, letterSpacing: "0.5px",
                background: "rgba(30,15,50,0.95)", color: ACCENT_LIGHT,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span>After Effects — Timeline</span>
                <span style={{ color: "#444" }}>●●●</span>
              </div>
              <div style={{ padding: "6px 8px" }}>
                {["Char Layer", "BG Layer", "FX Layer", "Audio"].map((lyr, li) => (
                  <div key={lyr} style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                    <div style={{ fontSize: "7px", color: "#555", width: "44px", flexShrink: 0, textAlign: "right" }}>{lyr}</div>
                    <div style={{ flex: 1, height: "10px", background: "#141414", borderRadius: "1px", position: "relative", overflow: "hidden" }}>
                      <div style={{
                        position: "absolute", height: "100%", borderRadius: "1px",
                        left: `${[5, 0, 20, 0][li]}%`,
                        width: `${[70, 100, 55, 85][li]}%`,
                        background: [ACCENT, "rgba(74,158,255,0.7)", "rgba(212,168,67,0.7)", "rgba(109,184,109,0.7)"][li],
                        opacity: 0.85,
                      }} />
                      {/* Animated playhead */}
                      <div style={{
                        position: "absolute", top: 0, bottom: 0, width: "2px",
                        background: ACCENT_LIGHT, zIndex: 5,
                        animation: "wizPlayhead 8s linear infinite",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Centre monitor: scene preview ── */}
            <div style={{
              position: "absolute", left: "36.5%", top: "5%",
              width: "27%", height: "52%",
              background: "rgba(6,8,18,0.82)",
              border: `1px solid rgba(124,92,191,0.3)`,
              borderRadius: "2px", overflow: "hidden",
            }}>
              <div style={{
                padding: "3px 7px", fontSize: "7px", fontWeight: 700, letterSpacing: "0.5px",
                background: "rgba(8,18,30,0.95)", color: "#4a9eff",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span>Scene Preview — {selectedStyle?.label ?? "—"}</span>
                <span style={{ color: "#444" }}>▶</span>
              </div>
              <div style={{
                width: "100%", height: "calc(100% - 20px)",
                background: `linear-gradient(135deg, rgba(124,92,191,0.08), rgba(6,8,18,0.9))`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: "6px",
              }}>
                <div style={{ fontSize: "28px" }}>🎬</div>
                <div style={{ fontSize: "8px", color: "#555", letterSpacing: "1px" }}>{selectedStyle?.label?.toUpperCase() ?? "—"}</div>
              </div>
            </div>

            {/* ── Right monitor: character sheet ── */}
            <div style={{
              position: "absolute", right: "6%", top: "14%",
              width: "24%", height: "52%",
              background: "rgba(8,6,18,0.88)",
              border: `1px solid ${GOLD_BORDER}`,
              borderRadius: "2px", overflow: "hidden",
            }}>
              <div style={{
                padding: "3px 7px", fontSize: "7px", fontWeight: 700, letterSpacing: "0.5px",
                background: "rgba(30,20,8,0.95)", color: GOLD,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span>Character — {charName}</span>
                <span style={{ color: "#444" }}>🔒</span>
              </div>
              <div style={{
                width: "100%", height: "calc(100% - 20px)",
                background: `linear-gradient(135deg, rgba(212,168,67,0.06), rgba(8,6,18,0.9))`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: "4px",
              }}>
                <div style={{
                  width: "32px", height: "48px", borderRadius: "50% 50% 40% 40%",
                  background: `rgba(212,168,67,0.3)`, border: `1px solid rgba(212,168,67,0.5)`,
                }} />
                <div style={{ fontSize: "7px", color: "#555" }}>LOCKED</div>
              </div>
            </div>

            {/* REC indicator */}
            <div style={{
              position: "absolute", top: "14px", right: "18px",
              display: "flex", alignItems: "center", gap: "6px",
              background: "rgba(0,0,0,0.55)", border: "1px solid #222",
              padding: "5px 10px", borderRadius: "3px",
            }}>
              <div style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: ACCENT, boxShadow: `0 0 6px ${ACCENT_GLOW}`,
                animation: "wizRecPulse 1.2s ease-in-out infinite",
              }} />
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: ACCENT_LIGHT }}>ANIMATING</span>
            </div>

            {/* Session info */}
            <div style={{ position: "absolute", bottom: "14px", left: "18px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>Current Session</div>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px",
                fontWeight: 900, color: "#fff", letterSpacing: "1px", marginTop: "2px",
              }}>{selectedStyle?.label ?? "—"} Animation</div>
              <div style={{ fontSize: "10px", color: ACCENT_LIGHT, marginTop: "2px" }}>
                {charName} · {sceneCount} Scenes · {duration}
              </div>
            </div>

            {/* WIZ STUDIOS brand overlay */}
            <div style={{
              position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)",
              textAlign: "center", pointerEvents: "none",
            }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: "11px",
                fontWeight: 900, letterSpacing: "5px",
                color: "rgba(255,255,255,0.18)", textTransform: "uppercase",
              }}>WIZ STUDIOS</div>
              <div style={{ fontSize: "8px", letterSpacing: "2px", color: "rgba(155,125,224,0.2)", textTransform: "uppercase" }}>
                AI Animation Platform
              </div>
            </div>
          </div>

          {/* ── Timeline Rail ───────────────────────────────────────────── */}
          <div style={{
            background: "#0c0c0c", borderTop: "1px solid #1e1e1e", borderBottom: "1px solid #1e1e1e",
            padding: "10px 16px", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: "#444", textTransform: "uppercase" }}>
                Timeline — {sceneCount} Scenes
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {["⏮", "◀", "▶", "⏺"].map(btn => (
                  <button key={btn} onClick={() => btn === "▶" && setIsPlaying(p => !p)} style={{
                    background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#666",
                    fontSize: "10px", padding: "3px 8px", borderRadius: "2px", cursor: "pointer",
                  }}>{btn === "▶" && isPlaying ? "⏸" : btn}</button>
                ))}
                <div style={{
                  fontFamily: "monospace", fontSize: "11px", color: ACCENT_LIGHT,
                  background: "#0a0a0a", border: `1px solid ${ACCENT_BORDER}`,
                  padding: "2px 8px", borderRadius: "2px", letterSpacing: "1px",
                }}>
                  {String(Math.floor((progress / 100) * 90)).padStart(2, "0")}:{String(Math.floor(((progress / 100) * 90 % 1) * 60)).padStart(2, "0")}
                </div>
              </div>
            </div>
            {/* Track rows */}
            {["Video", "Audio", "FX"].map((track, ti) => (
              <div key={track} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <div style={{ fontSize: "9px", color: "#555", width: "36px", flexShrink: 0, textAlign: "right" }}>{track}</div>
                <div style={{ flex: 1, height: "14px", background: "#141414", borderRadius: "2px", position: "relative", overflow: "hidden" }}>
                  {/* Clips */}
                  {[0, 1, 2].map(ci => (
                    <div key={ci} style={{
                      position: "absolute", height: "100%", borderRadius: "2px", opacity: 0.85,
                      left: `${ci * 33 + 1}%`, width: "31%",
                      background: [ACCENT, "rgba(109,184,109,0.7)", "rgba(212,168,67,0.7)"][ti],
                      display: "flex", alignItems: "center", padding: "0 4px",
                      fontSize: "8px", fontWeight: 600, color: "rgba(255,255,255,0.7)", overflow: "hidden",
                    }}>
                      {track} {ci + 1}
                    </div>
                  ))}
                  {/* Playhead */}
                  <div style={{
                    position: "absolute", top: 0, bottom: 0, width: "2px",
                    background: ACCENT_LIGHT, zIndex: 5,
                    left: `${progress}%`,
                    transition: "left 0.2s linear",
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* ── Controls Panel ──────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Input Source tabs */}
            <div>
              <SectionLabel label="Input Source" />
              <div style={{ display: "flex", border: "1px solid #222", borderRadius: "3px", overflow: "hidden" }}>
                {["Script / Story", "Audio Track", "Image Sequence", "Reference Video"].map((tab, ti) => (
                  <button key={tab} onClick={() => setInputTab(ti)} style={{
                    flex: 1, padding: "8px 10px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px",
                    color: inputTab === ti ? ACCENT_LIGHT : "#555", cursor: "pointer", textAlign: "center",
                    background: inputTab === ti ? ACCENT_DIM : "#111",
                    borderBottom: inputTab === ti ? `2px solid ${ACCENT}` : "2px solid transparent",
                    border: "none", borderRight: ti < 3 ? "1px solid #222" : "none",
                  }}>{tab}</button>
                ))}
              </div>
            </div>

            {/* Director's Brief */}
            <div>
              <SectionLabel label="Director's Brief" />
              <div style={{
                background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: "3px", padding: "12px",
              }}>
                <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "1.5px", color: "#444", textTransform: "uppercase", marginBottom: "8px" }}>
                  Describe your animation
                </div>
                <textarea
                  value={brief} onChange={e => setBrief(e.target.value)} rows={4}
                  style={{
                    width: "100%", background: "transparent", border: "none", color: "#ccc",
                    fontSize: "12px", lineHeight: 1.6, resize: "none",
                    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                  }}
                />
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginTop: "8px", borderTop: "1px solid #1a1a1a", paddingTop: "8px",
                }}>
                  <span style={{ fontSize: "10px", color: "#444" }}>{brief.length} / 500</span>
                  <button style={{
                    background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#666",
                    fontSize: "10px", padding: "4px 10px", borderRadius: "3px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "4px",
                  }}>🎙 Speak Brief</button>
                </div>
              </div>
            </div>

            {/* Animation Style — image grid */}
            <div>
              <SectionLabel label="Animation Style" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                {ANIM_STYLES.map(s => (
                  <div key={s.id} onClick={() => setAnimStyle(s.id)} style={{
                    background: "#111",
                    border: `2px solid ${animStyle === s.id ? ACCENT : "#1e1e1e"}`,
                    borderRadius: "6px", overflow: "hidden", cursor: "pointer",
                    boxShadow: animStyle === s.id ? `0 0 12px ${ACCENT_DIM}` : "none",
                    position: "relative",
                  }}>
                    <img
                      src={s.img} alt={s.label}
                      style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                    />
                    {animStyle === s.id && (
                      <div style={{
                        position: "absolute", top: "4px", right: "4px",
                        background: ACCENT, color: "#fff", fontSize: "7px",
                        fontWeight: 700, padding: "1px 4px", borderRadius: "2px",
                      }}>✓</div>
                    )}
                    <div style={{
                      fontSize: "9px", fontWeight: 700,
                      color: animStyle === s.id ? ACCENT_LIGHT : "#888",
                      textAlign: "center", padding: "5px 4px",
                      background: animStyle === s.id ? "rgba(124,92,191,0.12)" : "#0d0d0d",
                      letterSpacing: "0.5px", textTransform: "uppercase",
                    }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Characters */}
            <div>
              <SectionLabel label="Characters" sub="— up to 10 · Upload photo, pet, or describe" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px", marginBottom: "8px" }}>
                {CHARS.map(ch => (
                  <div key={ch.id} style={{
                    background: "#111",
                    border: `2px solid ${ch.color}`,
                    borderRadius: "6px", overflow: "hidden", cursor: "pointer", position: "relative",
                  }}>
                    <div style={{
                      width: "100%", aspectRatio: "1",
                      background: ch.id === "maya"
                        ? `linear-gradient(135deg, #3a2a6a, ${ACCENT})`
                        : ch.id === "owl"
                        ? "linear-gradient(135deg, #2a3a1a, #4a7a2a)"
                        : "linear-gradient(135deg, #3a2a0a, #8a5a1a)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "20px", color: "#fff", fontWeight: 900,
                      fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "1px",
                    }}>{ch.initial}</div>
                    <div style={{ padding: "4px", textAlign: "center" }}>
                      <div style={{ fontSize: "8px", fontWeight: 700, color: ch.color }}>{ch.label}</div>
                      <div style={{ fontSize: "7px", color: ch.status === "LOCKED" ? "#6db86d" : GOLD }}>{ch.status}</div>
                    </div>
                    {ch.role && (
                      <div style={{
                        position: "absolute", top: "3px", right: "3px",
                        background: ACCENT, color: "#fff", fontSize: "7px",
                        padding: "1px 4px", borderRadius: "2px",
                      }}>{ch.role}</div>
                    )}
                  </div>
                ))}
                {/* Add character */}
                <div style={{
                  background: "#0d0d0d", border: "2px dashed #222", borderRadius: "6px",
                  cursor: "pointer", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", aspectRatio: "1", gap: "4px",
                }}>
                  <div style={{ fontSize: "18px", color: "#333", lineHeight: 1 }}>+</div>
                  <div style={{ fontSize: "7px", color: "#333", textAlign: "center" }}>Add</div>
                </div>
                <div style={{
                  background: "#0d0d0d", border: "2px dashed #1a1a1a", borderRadius: "6px",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", aspectRatio: "1", opacity: 0.3,
                }}>
                  <div style={{ fontSize: "18px", color: "#222", lineHeight: 1 }}>+</div>
                </div>
              </div>
              <div style={{ fontSize: "9px", color: "#3a3a3a", padding: "4px 0" }}>
                Character consistency lock active — no drift, no random substitutions between scenes
              </div>
            </div>

            {/* Production Settings */}
            <div>
              <SectionLabel label="Production Settings" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                {/* Duration pills */}
                <div>
                  <div style={{ fontSize: "9px", color: "#555", marginBottom: "4px" }}>Duration</div>
                  <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                    {["30s", "60s", "90s", "2m", "Custom"].map(d => (
                      <button key={d} onClick={() => setDuration(d)} style={{
                        background: duration === d ? ACCENT_DIM : "#141414",
                        border: `1px solid ${duration === d ? ACCENT_BORDER : "#1e1e1e"}`,
                        borderRadius: "2px", padding: "3px 6px", fontSize: "9px", fontWeight: 600,
                        color: duration === d ? ACCENT_LIGHT : "#555", cursor: "pointer",
                      }}>{d}</button>
                    ))}
                  </div>
                </div>
                {/* Scene counter */}
                <div>
                  <div style={{ fontSize: "9px", color: "#555", marginBottom: "4px" }}>Scenes</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button onClick={() => setSceneCount(c => Math.max(1, c - 1))} style={{
                      width: "22px", height: "22px", background: "#1a1a1a", border: "1px solid #2a2a2a",
                      color: "#666", borderRadius: "2px", cursor: "pointer", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>−</button>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#ccc", minWidth: "20px", textAlign: "center" }}>{sceneCount}</span>
                    <button onClick={() => setSceneCount(c => Math.min(20, c + 1))} style={{
                      width: "22px", height: "22px", background: "#1a1a1a", border: "1px solid #2a2a2a",
                      color: "#666", borderRadius: "2px", cursor: "pointer", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>+</button>
                  </div>
                </div>
                {/* Aspect ratio */}
                <div>
                  <div style={{ fontSize: "9px", color: "#555", marginBottom: "4px" }}>Aspect Ratio</div>
                  <select style={{
                    width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e",
                    color: "#ccc", padding: "5px", borderRadius: "3px", fontSize: "10px",
                  }}>
                    {["16:9 Widescreen", "9:16 Vertical / Shorts", "1:1 Square"].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "9px", color: "#555", marginBottom: "4px" }}>Camera Movement</div>
                  <select value={cameraMove} onChange={e => setCameraMove(e.target.value)} style={{
                    width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e",
                    color: "#ccc", padding: "5px", borderRadius: "3px", fontSize: "10px",
                  }}>
                    {["Dynamic (AI decides)", "Static shots", "Pan & zoom", "Follow character"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: "9px", color: "#555", marginBottom: "4px" }}>Music Source</div>
                  <select value={musicSrc} onChange={e => setMusicSrc(e.target.value)} style={{
                    width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e",
                    color: "#ccc", padding: "5px", borderRadius: "3px", fontSize: "10px",
                  }}>
                    {["Uploaded track", "WizAudio (generate new)", "No music"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Lyrics → Storyboard Map */}
            <div>
              <SectionLabel label="Lyrics → Storyboard Map" />
              <div style={{ maxHeight: "110px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
                {LYRICS.map((lyr, li) => (
                  <div key={li} onClick={() => setActiveLyric(li)} style={{
                    display: "flex", alignItems: "baseline", gap: "8px",
                    padding: "3px 6px", borderRadius: "2px", cursor: "pointer",
                    background: activeLyric === li ? "rgba(124,92,191,0.12)" : "transparent",
                  }}>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "#555", width: "28px", flexShrink: 0 }}>{lyr.time}</span>
                    <span style={{ fontSize: "10px", color: activeLyric === li ? "#c8a8ff" : "#666", lineHeight: 1.4 }}>{lyr.text}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "6px", fontSize: "8px", color: "#3a3a3a" }}>
                Lyrics are mapped to scenes in the storyboard — each scene shows the lyric line it animates
              </div>
            </div>

            {/* Generate */}
            <button onClick={() => mp.generationStarted("WizAnimate", undefined, brief.trim().length > 0)} style={{
              width: "100%", padding: "14px",
              background: `linear-gradient(135deg, ${ACCENT}, #5a3d9a)`,
              border: "none", borderRadius: "4px",
              color: "#fff", fontSize: "13px", fontWeight: 800,
              letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              boxShadow: `0 4px 20px rgba(124,92,191,0.3)`, flexDirection: "column",
            }}>
              GENERATE ANIMATION
              <span style={{ fontSize: "9px", fontWeight: 400, opacity: 0.7 }}>
                Build Storyboard → Animate → Upgrade Preview → Render
              </span>
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
        <div style={{ borderLeft: "1px solid #1a1a1a", overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* Scene Preview */}
          <RightSection title="Scene Preview" sub="— Free to preview">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "8px" }}>
              {SCENE_PREVIEWS.map(sp => (
                <div key={sp.id} onClick={() => setActivePreviewScene(sp.id)} style={{
                  position: "relative", borderRadius: "3px", overflow: "hidden", aspectRatio: "16/9",
                  border: `1px solid ${activePreviewScene === sp.id ? ACCENT_BORDER : "#1e1e1e"}`,
                  cursor: "pointer",
                }}>
                  <div style={{ width: "100%", height: "100%", background: sp.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{
                      width: "20px", height: "30px", borderRadius: "50% 50% 40% 40%",
                      background: sp.id <= 2 ? "rgba(212,168,67,0.3)" : "rgba(155,125,224,0.3)",
                      border: `1px solid ${sp.id <= 2 ? "rgba(212,168,67,0.5)" : "rgba(155,125,224,0.5)"}`,
                    }} />
                  </div>
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "rgba(0,0,0,0.75)", fontSize: "7px", fontWeight: 700,
                    padding: "3px 5px", textAlign: "center", letterSpacing: "0.5px", color: "#888",
                  }}>{sp.label}</div>
                  <div style={{
                    position: "absolute", top: "3px", right: "3px",
                    background: sp.badge === "FREE" ? "rgba(109,184,109,0.2)" : ACCENT_DIM,
                    border: `1px solid ${sp.badge === "FREE" ? "rgba(109,184,109,0.4)" : ACCENT_BORDER}`,
                    color: sp.badge === "FREE" ? "#6db86d" : ACCENT_LIGHT,
                    fontSize: "7px", fontWeight: 700, padding: "1px 4px", borderRadius: "2px",
                  }}>{sp.badge}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "9px", color: "#444", textAlign: "center" }}>
              First 2 scenes always free · Credits used on render
            </div>
          </RightSection>

          {/* Upgrade Preview */}
          <RightSection title="Upgrade Preview">
            <div style={{ fontSize: "8px", color: "#555", marginBottom: "8px" }}>
              Hear &amp; See the Difference — Listen only · No download
            </div>
            {/* Tier tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid rgba(124,92,191,0.1)`, marginBottom: "6px" }}>
              {(["original", "enhanced", "cinematic"] as const).map(t => (
                <button key={t} onClick={() => setTier(t)} style={{
                  flex: 1, padding: "8px 4px", background: "none", border: "none", cursor: "pointer",
                  borderBottom: tier === t ? `2px solid ${ACCENT}` : "2px solid transparent",
                  color: tier === t ? ACCENT_LIGHT : "#444",
                  fontSize: "9px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                }}>
                  {t.toUpperCase()}
                  <span style={{ fontSize: "8px", color: tier === t ? ACCENT_LIGHT : "#333" }}>{TIER_PRICE[t]}</span>
                </button>
              ))}
            </div>
            {/* Tier description */}
            <div style={{ fontSize: "9px", color: "#555", lineHeight: 1.5, marginBottom: "8px" }}>
              {TIER_DESC[tier]}
            </div>
            {/* EQ spectrum */}
            <div style={{ marginBottom: "4px" }}>
              <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "1.5px", color: "#555", textTransform: "uppercase", marginBottom: "4px" }}>
                WizSound™ — {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </div>
              <EQSpectrum tier={tier} />
            </div>
            {/* Waveform scrubber */}
            <div style={{
              position: "relative", height: "32px", background: "#0a0a0a",
              border: "1px solid #1a1a1a", borderRadius: "2px", overflow: "hidden", marginBottom: "6px",
              cursor: "pointer",
            }} onClick={e => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              setProgress(Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100)));
            }}>
              {/* Waveform bars */}
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: "1px", padding: "4px 2px" }}>
                {Array.from({ length: 80 }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, borderRadius: "1px",
                    height: `${20 + Math.sin(i * 0.4) * 8 + Math.random() * 6}px`,
                    background: i / 80 * 100 < progress ? ACCENT : "#2a2a3a",
                    opacity: 0.6 + Math.random() * 0.3,
                  }} />
                ))}
              </div>
              {/* Progress fill */}
              <div style={{
                position: "absolute", top: 0, bottom: 0, left: 0,
                width: `${progress}%`, background: "rgba(124,92,191,0.15)",
                pointerEvents: "none",
              }} />
              {/* Playhead */}
              <div style={{
                position: "absolute", top: 0, bottom: 0, width: "2px",
                background: ACCENT_LIGHT, left: `${progress}%`,
                transition: "left 0.2s linear",
              }} />
            </div>
            {/* Audio controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <button onClick={() => setIsPlaying(p => !p)} style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: ACCENT, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", color: "#fff", flexShrink: 0,
              }}>{isPlaying ? "⏸" : "▶"}</button>
              <span style={{ fontSize: "10px", color: "#555" }}>
                {String(Math.floor((progress / 100) * 222 / 60)).padStart(1, "0")}:{String(Math.floor((progress / 100) * 222 % 60)).padStart(2, "0")} / 3:42
              </span>
              <div style={{ fontSize: "8px", color: "#3a3a3a", marginLeft: "auto", display: "flex", alignItems: "center", gap: "3px" }}>
                <span>🔒</span><span>Preview only</span>
              </div>
            </div>

            {/* Visual quality frames */}
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "1.5px", color: "#555", textTransform: "uppercase", marginBottom: "6px" }}>
                WizLuminar™ — Visual Quality Preview
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                {/* Original */}
                <div style={{
                  position: "relative", borderRadius: "3px", overflow: "hidden", aspectRatio: "16/9",
                  border: "1px solid #1e1e1e", filter: "saturate(0.7) brightness(0.85)",
                }}>
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2a1a,#2a3a2a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "18px", height: "26px", borderRadius: "50% 50% 40% 40%", background: "rgba(180,150,100,0.4)", border: "1px solid rgba(180,150,100,0.5)" }} />
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.75)", fontSize: "7px", fontWeight: 700, padding: "3px 5px", textAlign: "center", color: "#555" }}>Original</div>
                </div>
                {/* Enhanced */}
                <div style={{
                  position: "relative", borderRadius: "3px", overflow: "hidden", aspectRatio: "16/9",
                  border: `1px solid ${tier === "enhanced" ? ACCENT_BORDER : "#1e1e1e"}`,
                  filter: "saturate(1.1) brightness(0.95) contrast(1.05)",
                }}>
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2e1a,#2a3e2a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "18px", height: "26px", borderRadius: "50% 50% 40% 40%", background: "rgba(200,170,110,0.5)", border: "1px solid rgba(200,170,110,0.6)" }} />
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.75)", fontSize: "7px", fontWeight: 700, padding: "3px 5px", textAlign: "center", color: ACCENT_LIGHT }}>Enhanced</div>
                </div>
                {/* Cinematic / WizLuminar */}
                <div style={{
                  position: "relative", borderRadius: "3px", overflow: "hidden", aspectRatio: "16/9",
                  border: `1px solid ${tier === "cinematic" ? GOLD_BORDER : "#1e1e1e"}`,
                  filter: "saturate(1.25) brightness(1.0) contrast(1.1)",
                }}>
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1e3020,#2e4828)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(212,168,67,0.08), transparent 70%)" }} />
                    <div style={{ width: "18px", height: "26px", borderRadius: "50% 50% 40% 40%", background: "rgba(220,185,120,0.65)", border: "1px solid rgba(220,185,120,0.8)", boxShadow: "0 0 6px rgba(212,168,67,0.3)" }} />
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.75)", fontSize: "7px", fontWeight: 700, padding: "3px 5px", textAlign: "center", color: GOLD }}>WizLuminar™</div>
                </div>
                {/* Locked download */}
                <div style={{
                  position: "relative", borderRadius: "3px", overflow: "hidden", aspectRatio: "16/9",
                  border: "1px solid #2a2a2a", background: "#0d0d0d",
                  display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "4px",
                }}>
                  <div style={{ fontSize: "18px", color: "#2a2a2a" }}>🔒</div>
                  <div style={{ fontSize: "7px", color: "#333", textAlign: "center", letterSpacing: "0.5px" }}>Download unlocks<br />after payment</div>
                </div>
              </div>
              <div style={{ marginTop: "6px", fontSize: "8px", color: "#3a3a3a", lineHeight: 1.4 }}>
                What you see in preview is exactly what renders. Same pipeline, same settings. No surprises.
              </div>
            </div>

            {/* Upgrade CTAs */}
            <button onClick={() => mp.upgradeCTAClicked("WizAnimate", "WizSound Cinematic")} style={{
              width: "100%", padding: "10px 14px", borderRadius: "3px", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #5a3d9a, #3a2a6a)",
              borderTop: `1px solid rgba(124,92,191,0.4)`,
              color: "#c8a8ff", fontSize: "11px", fontWeight: 800, letterSpacing: "0.5px",
              display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px",
            }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#9b7de0", letterSpacing: "1px" }}>WizSound™ Cinematic</div>
                <div style={{ fontSize: "8px", opacity: 0.7, marginTop: "1px" }}>Stereo widening · EQ mastering · Spatial depth</div>
              </div>
              <span style={{ fontSize: "12px", fontWeight: 900 }}>{WIZSOUND_TIERS.CINEMATIC.price}</span>
            </button>
            <button onClick={() => mp.upgradeCTAClicked("WizAnimate", "WizLuminar Cinematic")} style={{
              width: "100%", padding: "10px 14px", borderRadius: "3px", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #3a2a08, #5a4010)",
              borderTop: `1px solid rgba(212,168,67,0.35)`,
              color: "#f0c860", fontSize: "11px", fontWeight: 800, letterSpacing: "0.5px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "9px", fontWeight: 700, color: GOLD, letterSpacing: "1px" }}>WizLuminar™ Cinematic</div>
                <div style={{ fontSize: "8px", opacity: 0.7, marginTop: "1px" }}>Colour grade · Film grain · Deep blacks</div>
              </div>
              <span style={{ fontSize: "12px", fontWeight: 900 }}>{WIZLUMINAR_CINEMATIC.price}</span>
            </button>
          </RightSection>

          {/* Render Quality */}
          <RightSection title="Render Quality">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "10px", color: "#666" }}>Resolution</span>
              <div style={{ display: "flex", gap: "4px" }}>
                {VIDEO_QUALITY_2TIER.map(rq => (
                  <button key={rq.label} onClick={() => setRenderQuality(rq.label)} style={{
                    background: renderQuality === rq.label ? ACCENT_DIM : "#141414",
                    border: `1px solid ${renderQuality === rq.label ? ACCENT_BORDER : "#1e1e1e"}`,
                    borderRadius: "2px", padding: "3px 8px", fontSize: "9px", fontWeight: 600,
                    color: renderQuality === rq.label ? ACCENT_LIGHT : "#555", cursor: "pointer",
                  }}>{rq.label} {rq.price !== "Included" ? rq.price : ""}</button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: "8px", color: "#444", marginBottom: "8px" }}>
              HD included with your plan · 4K available at checkout
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontSize: "10px", color: "#666" }}>Format</span>
              <div style={{ display: "flex", gap: "4px" }}>
                {["MP4", "MOV", "WebM"].map(fmt => (
                  <button key={fmt} onClick={() => setRenderFormat(fmt)} style={{
                    background: renderFormat === fmt ? ACCENT_DIM : "#141414",
                    border: `1px solid ${renderFormat === fmt ? ACCENT_BORDER : "#1e1e1e"}`,
                    borderRadius: "2px", padding: "3px 8px", fontSize: "9px", fontWeight: 600,
                    color: renderFormat === fmt ? ACCENT_LIGHT : "#555", cursor: "pointer",
                  }}>{fmt}</button>
                ))}
              </div>
            </div>
            <button style={{
              width: "100%", padding: "10px",
              background: `linear-gradient(135deg, ${ACCENT}, #5a3d9a)`,
              border: "none", borderRadius: "3px",
              color: "#fff", fontSize: "11px", fontWeight: 900, letterSpacing: "1px", cursor: "pointer",
            }}>
              🎬 RENDER — {renderQuality}
            </button>
          </RightSection>

          {/* Production Status */}
          <RightSection title="Production Status">
            {[
              { icon: "✓", label: "Brief Received",         status: "done",    badge: "DONE" },
              { icon: "✏",  label: "Character Design",       status: "active",  badge: "IN PROGRESS" },
              { icon: "□",  label: "Storyboard Generation",  status: "pending", badge: "PENDING" },
              { icon: "□",  label: "Scene Animation",        status: "pending", badge: "PENDING" },
              { icon: "□",  label: "WizSound Processing",    status: "pending", badge: "PENDING" },
              { icon: "□",  label: "WizLuminar Grade",       status: "pending", badge: "PENDING" },
              { icon: "□",  label: "Final Render & Export",  status: "pending", badge: "PENDING" },
            ].map(step => (
              <div key={step.label} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "6px 8px", borderRadius: "3px", marginBottom: "2px",
                background: step.status === "done" ? "rgba(109,184,109,0.05)"
                  : step.status === "active" ? ACCENT_DIM
                  : "transparent",
                opacity: step.status === "pending" ? 0.4 : 1,
              }}>
                <span style={{ fontSize: "11px", width: "20px", textAlign: "center" }}>{step.icon}</span>
                <span style={{
                  fontSize: "10px", fontWeight: 600, flex: 1,
                  color: step.status === "done" ? "#6db86d" : step.status === "active" ? ACCENT_LIGHT : "#444",
                }}>{step.label}</span>
                <span style={{
                  fontSize: "8px", fontWeight: 700, padding: "2px 6px", borderRadius: "2px",
                  background: step.status === "done" ? "rgba(109,184,109,0.12)"
                    : step.status === "active" ? ACCENT_DIM : "transparent",
                  color: step.status === "done" ? "#6db86d" : step.status === "active" ? ACCENT_LIGHT : "#444",
                }}>{step.badge}</span>
              </div>
            ))}
          </RightSection>

          {/* Animation Features */}
          <RightSection title="Animation Features">
            {[
              { label: "Character Consistency Lock", val: charLock,    set: setCharLock },
              { label: "Lip Sync (dialogue scenes)", val: lipSync,     set: setLipSync },
              { label: "Lyric Overlay on Storyboard", val: lyricOverlay, set: setLyricOverlay },
              { label: "Beat-Sync Scene Cuts",        val: beatSync,   set: setBeatSync },
              { label: "Colour Grade Consistency",    val: colourGrade, set: setColourGrade },
            ].map(f => (
              <div key={f.label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px",
              }}>
                <span style={{ fontSize: "10px", color: "#777" }}>{f.label}</span>
                <button onClick={() => f.set(!f.val)} style={{
                  width: "32px", height: "16px", borderRadius: "8px",
                  background: f.val ? ACCENT : "#1e1e1e",
                  border: `1px solid ${f.val ? ACCENT : "#2a2a2a"}`,
                  cursor: "pointer", position: "relative", flexShrink: 0,
                }}>
                  <div style={{
                    position: "absolute", top: "1px",
                    left: f.val ? "17px" : "1px",
                    width: "12px", height: "12px",
                    borderRadius: "50%", background: f.val ? "#fff" : "#444",
                    transition: "left 0.2s",
                  }} />
                </button>
              </div>
            ))}
          </RightSection>

          {/* Studio Ambience */}
          <RightSection title="Studio Ambience">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1 }}>
                <div style={{ fontSize: "9px", color: "#555" }}>Studio Brightness</div>
                <input
                  type="range" min={0} max={100} value={ambience}
                  onChange={e => setAmbience(Number(e.target.value))}
                  style={{ width: "100%", accentColor: ACCENT }}
                />
              </div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: ACCENT_LIGHT, minWidth: "36px" }}>{ambience}%</div>
            </div>
          </RightSection>

        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes wizRecPulse {
          0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(124,92,191,0.4); }
          50% { opacity:0.7; box-shadow:0 0 0 4px rgba(124,92,191,0); }
        }
        @keyframes wizPlayhead {
          0% { left: 5%; }
          100% { left: 95%; }
        }
      `}</style>
      <LandscapeHint />
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function SectionLabel({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{
      fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: "#444",
      textTransform: "uppercase", marginBottom: "10px",
      display: "flex", alignItems: "center", gap: "8px",
    }}>
      {label}
      {sub && <span style={{ fontSize: "9px", color: "#555", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>{sub}</span>}
      <div style={{ flex: 1, height: "1px", background: "#1e1e1e" }} />
    </div>
  );
}

function RightSection({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid #111" }}>
      <div style={{
        fontSize: "9px", fontWeight: 700, letterSpacing: "1.5px",
        color: "#555", textTransform: "uppercase", marginBottom: "10px",
        display: "flex", alignItems: "center", gap: "6px",
      }}>
        {title}
        {sub && <span style={{ fontSize: "9px", color: "#444", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}
