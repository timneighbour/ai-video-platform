/**
 * WizScore — AI Orchestral Score Composer
 * Studio app matching mockup-wizscore.html exactly
 */
import { useState, useEffect, useRef } from "react";
import { WIZSOUND_TIERS, RENDER_QUALITY_TIERS, WIZLUMINAR_CINEMATIC } from "@/lib/pricing";
import { Link } from "wouter";

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
  { id: "orchestral", label: "Full Orchestra",    sub: "Strings · Brass · Woodwinds · Percussion · Choir" },
  { id: "chamber",    label: "Chamber Ensemble",  sub: "String quartet · Piano · Winds" },
  { id: "electronic", label: "Electronic Score",  sub: "Synths · Beats · Hybrid" },
  { id: "piano",      label: "Solo Piano",         sub: "Grand piano · Intimate" },
  { id: "hybrid",     label: "Hybrid Cinematic",  sub: "Orchestra + Electronic" },
  { id: "choir",      label: "Choral",             sub: "SATB choir · A cappella" },
];

const MOODS  = ["Epic","Melancholic","Triumphant","Mysterious","Romantic","Tense","Hopeful","Dark","Playful","Spiritual"];
const GENRES = ["Cinematic","Classical","Trailer","Documentary","Game Score","TV Drama","Horror","Fantasy","Sci-Fi","Romance"];

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

const TIER_INFO: Record<string,{label:string;price:string}> = {
  original:  { label: "WIZSCORE™ — ORIGINAL MIX",  price: WIZSOUND_TIERS.ORIGINAL.price },
  enhanced:  { label: "WIZSCORE™ — ENHANCED MIX",  price: WIZSOUND_TIERS.ENHANCED.price },
  cinematic: { label: "WIZSCORE™ — CINEMATIC MIX", price: WIZSOUND_TIERS.CINEMATIC.price },
};

export default function WizScore() {
  const [stage, setStage]               = useState<Stage>("compose");
  const [scoreType, setScoreType]       = useState("orchestral");
  const [selectedMoods, setSelectedMoods] = useState<string[]>(["Epic","Melancholic"]);
  const [selectedGenre, setSelectedGenre] = useState("Cinematic");
  const [scoreBrief, setScoreBrief]     = useState("A sweeping main title theme for an epic feature film. Opens with solo cello, building through strings to full orchestra. Choir enters at 1:20 for the emotional peak. Inspired by the grandeur of Lyndhurst Hall — rich, deep, cinematic.");
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
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const stageIndex = STAGES.findIndex(s => s.key === stage);

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

  const pill = (i: number) => ({
    display:"flex",alignItems:"center",gap:"6px",padding:"14px 12px",
    fontSize:"10px",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase" as const,
    background:"none",border:"none",cursor:"pointer",whiteSpace:"nowrap" as const,
    borderBottom: i < stageIndex ? "2px solid #6db86d" : i === stageIndex ? "2px solid #d4a843" : "2px solid transparent",
    color: i < stageIndex ? "#6db86d" : i === stageIndex ? "#d4a843" : "#444",
  });
  const pillNum = (i: number) => ({
    width:"18px",height:"18px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
    fontSize:"9px",fontWeight:900,flexShrink:0,
    background: i < stageIndex ? "#6db86d" : i === stageIndex ? "#d4a843" : "#1a1a1a",
    color: i < stageIndex ? "#000" : i === stageIndex ? "#000" : "#555",
  });

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"#0a0a0a",color:"#ccc",fontFamily:"'Inter',sans-serif",overflow:"hidden"}}>

      {/* ── Nav ── */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",height:"48px",borderBottom:"1px solid #1a1a1a",flexShrink:0,background:"#0a0a0a",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
          <Link href="/" style={{fontSize:"11px",color:"#555",textDecoration:"none"}}>← Back</Link>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"2px",color:"#d4a843"}}>WizScore</span>
          <span style={{fontSize:"9px",color:"#555",letterSpacing:"1px"}}>AI ORCHESTRAL COMPOSER</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"0"}}>
          {STAGES.map((s,i) => (
            <div key={s.key} style={{display:"flex",alignItems:"center"}}>
              <button onClick={() => setStage(s.key)} style={pill(i)}>
                <span style={pillNum(i)}>{i < stageIndex ? "✓" : i+1}</span>
                {s.label}
              </button>
              {i < STAGES.length-1 && <span style={{color:"#2a2a2a",fontSize:"14px",userSelect:"none"}}>›</span>}
            </div>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <span style={{fontSize:"11px",color:"#555"}}>⚡ 10,000 Credits</span>
          <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"#d4a843",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:700,color:"#000"}}>T</div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{position:"relative",width:"100%",height:"180px",overflow:"hidden",flexShrink:0}}>
        <img src={ENV_IMG} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 30%",filter:`brightness(${ambience/100})`}} />
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",pointerEvents:"none"}} />
        <div style={{position:"absolute",inset:0,background:"linear-gradient(0deg,rgba(10,10,10,1) 0%,rgba(10,10,10,0.3) 50%,transparent 100%)",pointerEvents:"none"}} />
        <div style={{position:"absolute",top:"16px",left:"24px",zIndex:20}}>
          <div style={{fontSize:"9px",fontWeight:600,letterSpacing:"2.5px",textTransform:"uppercase",color:"rgba(255,255,255,0.4)",marginBottom:"3px"}}>Session</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",letterSpacing:"3px",color:"rgba(255,255,255,0.9)",textShadow:"0 2px 20px rgba(0,0,0,0.8)",lineHeight:1}}>SCORING STAGE — ABBEY ROAD</div>
        </div>
        <div style={{position:"absolute",top:"16px",right:"24px",display:"flex",alignItems:"center",gap:"7px",background:"rgba(212,168,67,0.12)",border:"1px solid rgba(212,168,67,0.3)",borderRadius:"4px",padding:"5px 10px"}}>
          <div style={{width:"7px",height:"7px",borderRadius:"50%",background:"#d4a843",boxShadow:"0 0 8px rgba(212,168,67,0.8)"}} />
          <span style={{fontSize:"10px",fontWeight:700,letterSpacing:"2px",color:"#d4a843"}}>COMPOSING</span>
        </div>
      </div>

      {/* ── 3-Column ── */}
      <div style={{display:"grid",gridTemplateColumns:"280px 1fr 260px",flex:1,overflow:"hidden"}}>

        {/* LEFT */}
        <div style={{borderRight:"1px solid #1a1a1a",overflowY:"auto"}}>

          {/* Score Type */}
          <div style={{padding:"14px 16px",borderBottom:"1px solid #141414"}}>
            <SectionTitle num={1} label="SCORE TYPE" />
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
              {SCORE_TYPES.map(st => (
                <button key={st.id} onClick={() => setScoreType(st.id)} style={{
                  background:scoreType===st.id?"rgba(212,168,67,0.12)":"#0d0d0d",
                  border:`1px solid ${scoreType===st.id?"rgba(212,168,67,0.4)":"#1a1a1a"}`,
                  borderRadius:"4px",padding:"8px",cursor:"pointer",textAlign:"left",
                }}>
                  <div style={{fontSize:"10px",fontWeight:700,color:scoreType===st.id?"#d4a843":"#888",marginBottom:"2px"}}>{st.label}</div>
                  <div style={{fontSize:"8px",color:"#444",lineHeight:1.3}}>{st.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mood & Genre */}
          <div style={{padding:"14px 16px",borderBottom:"1px solid #141414"}}>
            <SectionTitle num={2} label="MOOD & GENRE" />
            <div style={{fontSize:"8px",color:"#555",marginBottom:"6px"}}>MOOD (select multiple)</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginBottom:"10px"}}>
              {MOODS.map(m => (
                <button key={m} onClick={() => toggleMood(m)} style={{
                  padding:"4px 8px",borderRadius:"20px",fontSize:"9px",fontWeight:600,cursor:"pointer",
                  background:selectedMoods.includes(m)?"rgba(212,168,67,0.15)":"#111",
                  border:`1px solid ${selectedMoods.includes(m)?"rgba(212,168,67,0.4)":"#1e1e1e"}`,
                  color:selectedMoods.includes(m)?"#d4a843":"#555",
                }}>{m}</button>
              ))}
            </div>
            <div style={{fontSize:"8px",color:"#555",marginBottom:"6px"}}>GENRE</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
              {GENRES.map(g => (
                <button key={g} onClick={() => setSelectedGenre(g)} style={{
                  padding:"4px 8px",borderRadius:"20px",fontSize:"9px",fontWeight:600,cursor:"pointer",
                  background:selectedGenre===g?"rgba(155,89,245,0.15)":"#111",
                  border:`1px solid ${selectedGenre===g?"rgba(155,89,245,0.4)":"#1e1e1e"}`,
                  color:selectedGenre===g?"#9b59f5":"#555",
                }}>{g}</button>
              ))}
            </div>
          </div>

          {/* Score Brief */}
          <div style={{padding:"14px 16px",borderBottom:"1px solid #141414"}}>
            <SectionTitle num={3} label="SCORE BRIEF" />
            <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}>
              <button style={{flex:1,background:"#111",border:"1px solid #222",color:"#888",padding:"6px",borderRadius:"3px",fontSize:"9px",cursor:"pointer"}}>🎙 Speak Your Brief</button>
              <button style={{flex:1,background:"rgba(212,168,67,0.1)",border:"1px solid rgba(212,168,67,0.3)",color:"#d4a843",padding:"6px",borderRadius:"3px",fontSize:"9px",cursor:"pointer"}}>✦ AI Compose Brief</button>
            </div>
            <textarea value={scoreBrief} onChange={e=>setScoreBrief(e.target.value)} rows={4}
              placeholder="Describe the scene, emotion, or story this score needs to tell..."
              style={{width:"100%",background:"#0d0d0d",border:"1px solid #1e1e1e",color:"#ccc",padding:"8px",borderRadius:"3px",fontSize:"10px",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}} />
          </div>

          {/* Duration & Key */}
          <div style={{padding:"14px 16px",borderBottom:"1px solid #141414"}}>
            <SectionTitle num={4} label="DURATION & KEY" />
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"8px"}}>
              <div>
                <div style={{fontSize:"8px",color:"#555",marginBottom:"4px"}}>DURATION</div>
                <select value={duration} onChange={e=>setDuration(e.target.value)} style={{width:"100%",background:"#111",border:"1px solid #222",color:"#ccc",padding:"7px",borderRadius:"3px",fontSize:"10px"}}>
                  {["0:30 — Trailer cue","1:00 — Short cue","2:30 — Main title","4:00 — Full scene","Custom length"].map(k=><option key={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:"8px",color:"#555",marginBottom:"4px"}}>KEY / SCALE</div>
                <select value={key} onChange={e=>setKey(e.target.value)} style={{width:"100%",background:"#111",border:"1px solid #222",color:"#ccc",padding:"7px",borderRadius:"3px",fontSize:"10px"}}>
                  {["C Major","D Minor","E Minor","G Major","A Minor","B♭ Major","AI Chooses"].map(k=><option key={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
              <div>
                <div style={{fontSize:"8px",color:"#555",marginBottom:"4px"}}>TEMPO (BPM)</div>
                <input type="number" value={tempo} onChange={e=>setTempo(e.target.value)} style={{width:"100%",background:"#111",border:"1px solid #222",color:"#ccc",padding:"7px",borderRadius:"3px",fontSize:"10px",boxSizing:"border-box"}} />
              </div>
              <div>
                <div style={{fontSize:"8px",color:"#555",marginBottom:"4px"}}>TIME SIGNATURE</div>
                <select value={timeSig} onChange={e=>setTimeSig(e.target.value)} style={{width:"100%",background:"#111",border:"1px solid #222",color:"#ccc",padding:"7px",borderRadius:"3px",fontSize:"10px"}}>
                  {["4/4","3/4","6/8","5/4","7/8"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Ambience */}
          <div style={{padding:"14px 16px"}}>
            <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"2px",color:"#444",textTransform:"uppercase",marginBottom:"10px"}}>🔆 STUDIO AMBIENCE</div>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{fontSize:"10px",color:"#555"}}>Dim</span>
              <input type="range" min={0} max={100} value={ambience} onChange={e=>setAmbience(Number(e.target.value))} style={{flex:1,accentColor:"#d4a843"}} />
              <span style={{fontSize:"10px",color:"#555"}}>Bright</span>
              <span style={{fontSize:"10px",color:"#d4a843",fontWeight:700,minWidth:"32px"}}>{ambience}%</span>
            </div>
          </div>
        </div>

        {/* CENTRE */}
        <div style={{overflowY:"auto",display:"flex",flexDirection:"column"}}>

          {/* Ensemble */}
          <div style={{padding:"16px 20px",borderBottom:"1px solid #141414"}}>
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

          {/* Score Preview */}
          <div style={{padding:"16px 20px",borderBottom:"1px solid #141414"}}>
            <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"2px",color:"#d4a843",textTransform:"uppercase",marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px"}}>
              SCORE PREVIEW — DYNAMIC STRUCTURE
              <div style={{flex:1,height:"1px",background:"#1e1e1e"}} />
            </div>
            <div style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:"6px",padding:"12px",marginBottom:"8px"}}>
              <svg width="100%" height="60" style={{display:"block"}}>
                <defs>
                  <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#9b59f5" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="#d4a843" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#d4a843" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
                <path d="M 0 55 Q 100 50 150 40 Q 200 30 250 20 Q 300 10 350 5 Q 400 2 450 5 Q 500 8 550 15" stroke="url(#sg)" strokeWidth="2" fill="none" />
                <text x="10" y="58" fill="#555" fontSize="8" fontFamily="sans-serif">pp</text>
                <text x="160" y="35" fill="#9b59f5" fontSize="8" fontFamily="sans-serif">mf</text>
                <text x="340" y="12" fill="#d4a843" fontSize="8" fontFamily="sans-serif" fontWeight="bold">fff</text>
                <text x="345" y="8" fill="#9b59f5" fontSize="7" fontFamily="sans-serif">CHOIR ENTRY</text>
                <line x1="350" y1="10" x2="350" y2="42" stroke="#9b59f5" strokeWidth="1" strokeDasharray="3,2" />
              </svg>
              <div style={{fontSize:"8px",color:"#444",textAlign:"center",marginTop:"4px"}}>Solo cello opens pp · Strings build cresc. · Full choir entry at bar 28 · Key: D Minor</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
              {[
                {name:"STRINGS",    color:"#7c5cbf"},
                {name:"BRASS",      color:"#d4a843"},
                {name:"WOODWINDS",  color:"#4a9eff"},
                {name:"CHOIR",      color:"#9b59f5"},
                {name:"PERCUSSION", color:"#e05c2a"},
              ].map(track => (
                <div key={track.name} style={{display:"flex",alignItems:"center",gap:"8px"}}>
                  <span style={{fontSize:"7px",color:"#444",width:"64px",textAlign:"right",flexShrink:0}}>{track.name}</span>
                  <div style={{flex:1,height:"8px",background:"#111",borderRadius:"2px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:"70%",background:track.color,opacity:0.4,borderRadius:"1px"}} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate */}
          <div style={{padding:"16px 20px"}}>
            <button style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#d4a843,#b8902a)",border:"none",borderRadius:"4px",color:"#000",fontSize:"13px",fontWeight:900,letterSpacing:"2px",textTransform:"uppercase",cursor:"pointer"}}>
              🎬 COMPOSE SCORE
              <div style={{fontSize:"9px",fontWeight:400,marginTop:"3px",opacity:0.7}}>Brief → Ensemble → Compose → Upgrade Preview → Render</div>
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{borderLeft:"1px solid #1a1a1a",overflowY:"auto"}}>

          {/* Upgrade Preview */}
          <div style={{padding:"14px 16px",borderBottom:"1px solid #141414"}}>
            <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"2px",color:"#d4a843",textTransform:"uppercase",marginBottom:"8px"}}>🎧 HEAR & SEE THE DIFFERENCE</div>
            <div style={{fontSize:"8px",color:"#555",marginBottom:"10px",lineHeight:1.5}}>Listen before you commit. Preview your score in all three quality tiers.</div>
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
            <div style={{display:"flex",alignItems:"flex-end",gap:"2px",height:"32px",marginBottom:"8px"}}>
              {[0.3,0.5,0.7,0.9,0.8,0.6,0.95,0.85,0.7,0.5,0.8,0.9,0.75,0.6,0.4,0.7,0.85,0.65,0.5,0.3].map((h,i) => (
                <div key={i} style={{flex:1,background:tier==="cinematic"?"#d4a843":tier==="enhanced"?"#9b59f5":"#555",height:`${h*100}%`,borderRadius:"1px 1px 0 0",opacity:0.7}} />
              ))}
            </div>
            <div style={{background:"#080808",border:"1px solid #1a1a1a",borderRadius:"4px",padding:"8px 10px",marginBottom:"8px"}}>
              <div style={{fontSize:"9px",color:"#d4a843",fontWeight:700,marginBottom:"4px"}}>{TIER_INFO[tier].label}</div>
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
              <div style={{fontSize:"8px",color:"#333",marginTop:"4px"}}>🔒 Preview only — no download until render complete</div>
            </div>
            <div style={{marginBottom:"10px"}}>
              <div style={{fontSize:"8px",color:"#d4a843",fontWeight:700,letterSpacing:"1px",marginBottom:"6px"}}>WIZLUMINAR™ — VISUAL QUALITY</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px"}}>
                {["ORIGINAL","ENHANCED","CINEMATIC"].map((lbl,li) => (
                  <button key={lbl} onClick={() => setLuminarTier(lbl.toLowerCase())} style={{
                    background:"#0d0d0d",border:`1px solid ${luminarTier===lbl.toLowerCase()?"#d4a843":"#1a1a1a"}`,
                    borderRadius:"4px",overflow:"hidden",cursor:"pointer",padding:0,
                  }}>
                    <div style={{width:"100%",aspectRatio:"16/9",background:li===0?"linear-gradient(135deg,#1a1a1a,#2a2a2a)":li===1?"linear-gradient(135deg,#1a1208,#2a2010)":"linear-gradient(135deg,#0d0a00,#1a1400)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px"}}>
                      {li===0?"🎼":li===1?"✨":"🌟"}
                    </div>
                    <div style={{fontSize:"7px",fontWeight:700,color:luminarTier===lbl.toLowerCase()?"#d4a843":"#444",padding:"3px",textAlign:"center"}}>{lbl}</div>
                  </button>
                ))}
              </div>
            </div>
            <button style={{width:"100%",padding:"10px 12px",background:"linear-gradient(135deg,rgba(155,89,245,0.15),rgba(155,89,245,0.08))",border:"1px solid rgba(155,89,245,0.3)",borderRadius:"4px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:"10px",fontWeight:700,color:"#9b59f5",letterSpacing:"1px"}}>🎵 WizSound™ Cinematic</div>
                <div style={{fontSize:"8px",color:"#6a3fa0",marginTop:"1px"}}>Spatial audio · Dolby Atmos · Immersive mix</div>
              </div>
              <div style={{fontSize:"12px",fontWeight:900,color:"#9b59f5"}}>{WIZSOUND_TIERS.CINEMATIC.price}</div>
            </button>
            <button style={{width:"100%",padding:"10px 12px",background:"linear-gradient(135deg,rgba(212,168,67,0.12),rgba(212,168,67,0.06))",border:"1px solid rgba(212,168,67,0.25)",borderRadius:"4px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:"10px",fontWeight:700,color:"#d4a843",letterSpacing:"1px"}}>✨ WizLuminar™ Cinematic</div>
                <div style={{fontSize:"8px",color:"#8a6820",marginTop:"1px"}}>Colour grade · Film grain · Visual sync</div>
              </div>
              <div style={{fontSize:"12px",fontWeight:900,color:"#d4a843"}}>{WIZLUMINAR_CINEMATIC.price}</div>
            </button>
          </div>

          {/* Render Quality */}
          <div style={{padding:"14px 16px",borderBottom:"1px solid #141414"}}>
            <div style={{fontSize:"9px",fontWeight:700,color:"#d4a843",letterSpacing:"1.5px",marginBottom:"8px"}}>RENDER QUALITY</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px",marginBottom:"10px"}}>
              {RENDER_QUALITY_TIERS.map(rq => ({ label: rq.label, sub: rq.label === "HD" ? "48kHz · 24-bit" : rq.label === "4K" ? "96kHz · 32-bit" : "192kHz · 32-bit", price: rq.price })).map(rq => (
                <button key={rq.label} onClick={() => setRenderQuality(rq.label)} style={{
                  background:renderQuality===rq.label?"rgba(212,168,67,0.12)":"#0d0d0d",
                  border:`1px solid ${renderQuality===rq.label?"rgba(212,168,67,0.4)":"#1a1a1a"}`,
                  borderRadius:"4px",padding:"8px 4px",cursor:"pointer",textAlign:"center",
                }}>
                  <div style={{fontSize:"12px",fontWeight:900,color:renderQuality===rq.label?"#d4a843":"#666"}}>{rq.label}</div>
                  <div style={{fontSize:"7px",color:"#444",margin:"2px 0"}}>{rq.sub}</div>
                  <div style={{fontSize:"8px",color:renderQuality===rq.label?"#d4a843":"#555"}}>{rq.price}</div>
                </button>
              ))}
            </div>
            <button style={{width:"100%",padding:"10px",background:"linear-gradient(135deg,#d4a843,#b8902a)",border:"none",borderRadius:"3px",color:"#000",fontSize:"11px",fontWeight:900,letterSpacing:"1px",cursor:"pointer"}}>
              🎬 RENDER SCORE — {renderQuality}
            </button>
          </div>

          {/* Production Status */}
          <div style={{padding:"14px 16px"}}>
            <div style={{fontSize:"9px",fontWeight:700,color:"#d4a843",letterSpacing:"1.5px",marginBottom:"8px"}}>PRODUCTION STATUS</div>
            {[
              {label:"Project Brief Locked",     val:"✓",           done:true,  active:false},
              {label:"Ensemble Configured",       val:"8 groups",    done:true,  active:false},
              {label:"Compose & Arrange",         val:"In Progress", done:false, active:true},
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
    </div>
  );
}

function SectionTitle({ num, label }: { num: number; label: string }) {
  return (
    <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"2px",color:"#444",textTransform:"uppercase",marginBottom:"10px",display:"flex",alignItems:"center",gap:"8px"}}>
      <div style={{width:"16px",height:"16px",borderRadius:"50%",background:"#d4a843",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:900,color:"#000",flexShrink:0}}>{num}</div>
      {label}
      <div style={{flex:1,height:"1px",background:"#1e1e1e"}} />
    </div>
  );
}
