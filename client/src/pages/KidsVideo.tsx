/**
 * WizAnimate — AI Character Animation Studio
 * Studio app matching mockup-wizanimate-v2.html exactly
 * 3-column: left config | centre storyboard workspace | right upgrade panel
 */
import { useState, useRef } from "react";
import { WIZSOUND_TIERS, VIDEO_QUALITY_2TIER, WIZLUMINAR_CINEMATIC } from "@/lib/pricing";
import { Link } from "wouter";

const ENV_IMG = "/manus-storage/env-hollywood-studio_1da3e15e.jpg";

const STAGES = [
  { key: "brief",     label: "DIRECTOR'S BRIEF" },
  { key: "character", label: "CHARACTER DESIGN" },
  { key: "storyboard",label: "STORYBOARD" },
  { key: "upgrade",   label: "UPGRADE PREVIEW" },
  { key: "render",    label: "RENDER & EXPORT" },
] as const;
type Stage = typeof STAGES[number]["key"];

const ANIM_STYLES = [
  { id: "pixar3d",    label: "Pixar 3D",     icon: "🎭", desc: "Vibrant 3D · Expressive" },
  { id: "storybook",  label: "Storybook",    icon: "📚", desc: "Watercolour · Illustrated" },
  { id: "disney",     label: "Disney 2D",    icon: "✨", desc: "Classic · Fluid" },
  { id: "anime",      label: "Anime",        icon: "⛩️", desc: "Japanese · Stylised" },
  { id: "cartoon",    label: "Cartoon",      icon: "🎨", desc: "Bold lines · Fun" },
  { id: "claymation", label: "Claymation",   icon: "🧸", desc: "Stop-motion · Tactile" },
];

const CHAR_ARCHETYPES = ["Hero","Sidekick","Villain","Mentor","Comic Relief","Creature","Robot","Fantasy Being"];
const AGES = ["Toddler (2-4)","Child (5-8)","Pre-teen (9-12)","Teen (13-17)","Young Adult","Adult","Elder"];

const SCENES = [
  { id: 1, label: "Opening — Forest Awakening",    dur: "0:00–0:12", status: "done" },
  { id: 2, label: "Discovery — Magic Portal",       dur: "0:12–0:28", status: "active" },
  { id: 3, label: "Challenge — The Dark Cave",      dur: "0:28–0:45", status: "pending" },
  { id: 4, label: "Climax — Dragon Confrontation",  dur: "0:45–1:02", status: "pending" },
  { id: 5, label: "Resolution — Homecoming",        dur: "1:02–1:15", status: "pending" },
];

export default function KidsVideo() {
  const [stage, setStage]           = useState<Stage>("storyboard");
  const [animStyle, setAnimStyle]   = useState("pixar3d");
  const [archetype, setArchetype]   = useState("Hero");
  const [age, setAge]               = useState("Child (5-8)");
  const [brief, setBrief]           = useState("A brave young fox named Ember discovers a hidden portal in the enchanted forest. She must use her wits and courage to rescue her friends from the Shadow Realm before the moon rises. Warm, adventurous, full of wonder — inspired by Studio Ghibli's sense of magic.");
  const [charName, setCharName]     = useState("Ember");
  const [charDesc, setCharDesc]     = useState("A small fox with amber fur and bright green eyes. Wears a tiny explorer's satchel. Expressive face, large curious eyes.");
  const [ambience, setAmbience]     = useState(70);
  const [tier, setTier]             = useState<"original"|"enhanced"|"cinematic">("original");
  const [renderQuality, setRenderQuality] = useState("4K");
  const [lipSync, setLipSync]       = useState(true);
  const [charLock, setCharLock]     = useState(true);
  const [beatSync, setBeatSync]     = useState(true);
  const [activeScene, setActiveScene] = useState(2);

  const stageIndex = STAGES.findIndex(s => s.key === stage);

  const pill = (i: number) => ({
    display:"flex" as const,alignItems:"center",gap:"6px",padding:"14px 12px",
    fontSize:"10px",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase" as const,
    background:"none",border:"none",cursor:"pointer",whiteSpace:"nowrap" as const,
    borderBottom: i < stageIndex ? "2px solid #6db86d" : i === stageIndex ? "2px solid #e05c2a" : "2px solid transparent",
    color: i < stageIndex ? "#6db86d" : i === stageIndex ? "#e05c2a" : "#444",
  });
  const pillNum = (i: number) => ({
    width:"18px",height:"18px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
    fontSize:"9px",fontWeight:900,flexShrink:0,
    background: i < stageIndex ? "#6db86d" : i === stageIndex ? "#e05c2a" : "#1a1a1a",
    color: i < stageIndex ? "#000" : i === stageIndex ? "#fff" : "#555",
  });

  const TIER_PRICE = { original: WIZSOUND_TIERS.ORIGINAL.price, enhanced: WIZSOUND_TIERS.ENHANCED.price, cinematic: WIZSOUND_TIERS.CINEMATIC.price };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"#0a0a0a",color:"#ccc",fontFamily:"'Inter',sans-serif",overflow:"hidden"}}>

      {/* Nav */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",height:"48px",borderBottom:"1px solid #1a1a1a",flexShrink:0,background:"#0a0a0a",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
          <Link href="/" style={{fontSize:"11px",color:"#555",textDecoration:"none"}}>← Back</Link>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"2px",color:"#e05c2a"}}>WizAnimate</span>
          <span style={{fontSize:"9px",color:"#555",letterSpacing:"1px"}}>AI CHARACTER ANIMATION STUDIO</span>
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
          <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"#e05c2a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:700,color:"#fff"}}>T</div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{position:"relative",width:"100%",height:"180px",overflow:"hidden",flexShrink:0}}>
        <img src={ENV_IMG} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 30%",filter:`brightness(${ambience/100})`}} />
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",pointerEvents:"none"}} />
        <div style={{position:"absolute",inset:0,background:"linear-gradient(0deg,rgba(10,10,10,1) 0%,rgba(10,10,10,0.3) 50%,transparent 100%)",pointerEvents:"none"}} />
        <div style={{position:"absolute",top:"16px",left:"24px",zIndex:20}}>
          <div style={{fontSize:"9px",fontWeight:600,letterSpacing:"2.5px",textTransform:"uppercase",color:"rgba(255,255,255,0.4)",marginBottom:"3px"}}>Production</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",letterSpacing:"3px",color:"rgba(255,255,255,0.9)",textShadow:"0 2px 20px rgba(0,0,0,0.8)",lineHeight:1}}>ANIMATION STUDIO — STAGE 7</div>
        </div>
        <div style={{position:"absolute",top:"16px",right:"24px",display:"flex",alignItems:"center",gap:"7px",background:"rgba(224,92,42,0.12)",border:"1px solid rgba(224,92,42,0.3)",borderRadius:"4px",padding:"5px 10px"}}>
          <div style={{width:"7px",height:"7px",borderRadius:"50%",background:"#e05c2a",boxShadow:"0 0 8px rgba(224,92,42,0.8)"}} />
          <span style={{fontSize:"10px",fontWeight:700,letterSpacing:"2px",color:"#e05c2a"}}>ANIMATING</span>
        </div>
        <div style={{position:"absolute",bottom:"12px",left:"24px",display:"flex",gap:"16px"}}>
          <span style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",letterSpacing:"1px"}}>Style: {ANIM_STYLES.find(s=>s.id===animStyle)?.label}</span>
          <span style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",letterSpacing:"1px"}}>Character: {charName}</span>
          <span style={{fontSize:"9px",color:"rgba(255,255,255,0.3)",letterSpacing:"1px"}}>Scenes: {SCENES.length}</span>
        </div>
      </div>

      {/* 3-Column */}
      <div style={{display:"grid",gridTemplateColumns:"280px 1fr 260px",flex:1,overflow:"hidden"}}>

        {/* LEFT */}
        <div style={{borderRight:"1px solid #1a1a1a",overflowY:"auto"}}>

          {/* Director's Brief */}
          <div style={{padding:"14px 16px",borderBottom:"1px solid #141414"}}>
            <SectionTitle num={1} label="DIRECTOR'S BRIEF" accent="#e05c2a" />
            <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}>
              <button style={{flex:1,background:"#111",border:"1px solid #222",color:"#888",padding:"6px",borderRadius:"3px",fontSize:"9px",cursor:"pointer"}}>🎙 Speak Your Brief</button>
              <button style={{flex:1,background:"rgba(224,92,42,0.1)",border:"1px solid rgba(224,92,42,0.3)",color:"#e05c2a",padding:"6px",borderRadius:"3px",fontSize:"9px",cursor:"pointer"}}>✦ AI Brief</button>
            </div>
            <textarea value={brief} onChange={e=>setBrief(e.target.value)} rows={4}
              placeholder="Describe your animation story, characters, and mood..."
              style={{width:"100%",background:"#0d0d0d",border:"1px solid #1e1e1e",color:"#ccc",padding:"8px",borderRadius:"3px",fontSize:"10px",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}} />
          </div>

          {/* Animation Style */}
          <div style={{padding:"14px 16px",borderBottom:"1px solid #141414"}}>
            <SectionTitle num={2} label="ANIMATION STYLE" accent="#e05c2a" />
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
              {ANIM_STYLES.map(s => (
                <button key={s.id} onClick={() => setAnimStyle(s.id)} style={{
                  background:animStyle===s.id?"rgba(224,92,42,0.12)":"#0d0d0d",
                  border:`1px solid ${animStyle===s.id?"rgba(224,92,42,0.4)":"#1a1a1a"}`,
                  borderRadius:"4px",padding:"8px",cursor:"pointer",textAlign:"left",
                }}>
                  <div style={{fontSize:"16px",marginBottom:"2px"}}>{s.icon}</div>
                  <div style={{fontSize:"10px",fontWeight:700,color:animStyle===s.id?"#e05c2a":"#888",marginBottom:"2px"}}>{s.label}</div>
                  <div style={{fontSize:"8px",color:"#444"}}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Characters */}
          <div style={{padding:"14px 16px",borderBottom:"1px solid #141414"}}>
            <SectionTitle num={3} label="CHARACTERS" accent="#e05c2a" />
            <div style={{marginBottom:"8px"}}>
              <div style={{fontSize:"8px",color:"#555",marginBottom:"4px"}}>CHARACTER NAME</div>
              <input value={charName} onChange={e=>setCharName(e.target.value)} style={{width:"100%",background:"#111",border:"1px solid #222",color:"#ccc",padding:"7px",borderRadius:"3px",fontSize:"10px",boxSizing:"border-box"}} />
            </div>
            <div style={{marginBottom:"8px"}}>
              <div style={{fontSize:"8px",color:"#555",marginBottom:"4px"}}>ARCHETYPE</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
                {CHAR_ARCHETYPES.map(a => (
                  <button key={a} onClick={() => setArchetype(a)} style={{
                    padding:"3px 7px",borderRadius:"20px",fontSize:"8px",fontWeight:600,cursor:"pointer",
                    background:archetype===a?"rgba(224,92,42,0.15)":"#111",
                    border:`1px solid ${archetype===a?"rgba(224,92,42,0.4)":"#1e1e1e"}`,
                    color:archetype===a?"#e05c2a":"#555",
                  }}>{a}</button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:"8px"}}>
              <div style={{fontSize:"8px",color:"#555",marginBottom:"4px"}}>AGE GROUP</div>
              <select value={age} onChange={e=>setAge(e.target.value)} style={{width:"100%",background:"#111",border:"1px solid #222",color:"#ccc",padding:"7px",borderRadius:"3px",fontSize:"10px"}}>
                {AGES.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:"8px",color:"#555",marginBottom:"4px"}}>VISUAL DESCRIPTION</div>
              <textarea value={charDesc} onChange={e=>setCharDesc(e.target.value)} rows={3}
                style={{width:"100%",background:"#0d0d0d",border:"1px solid #1e1e1e",color:"#ccc",padding:"8px",borderRadius:"3px",fontSize:"10px",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}} />
            </div>
          </div>

          {/* Production Settings */}
          <div style={{padding:"14px 16px",borderBottom:"1px solid #141414"}}>
            <SectionTitle num={4} label="PRODUCTION SETTINGS" accent="#e05c2a" />
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"8px"}}>
              <div>
                <div style={{fontSize:"8px",color:"#555",marginBottom:"4px"}}>DURATION</div>
                <select style={{width:"100%",background:"#111",border:"1px solid #222",color:"#ccc",padding:"7px",borderRadius:"3px",fontSize:"10px"}}>
                  {["0:30 — Short","1:00 — Standard","2:00 — Extended","Custom"].map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:"8px",color:"#555",marginBottom:"4px"}}>ASPECT RATIO</div>
                <select style={{width:"100%",background:"#111",border:"1px solid #222",color:"#ccc",padding:"7px",borderRadius:"3px",fontSize:"10px"}}>
                  {["16:9 — Widescreen","9:16 — Vertical","1:1 — Square","4:3 — Classic"].map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Ambience */}
          <div style={{padding:"14px 16px"}}>
            <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"2px",color:"#444",textTransform:"uppercase",marginBottom:"10px"}}>🔆 STUDIO AMBIENCE</div>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{fontSize:"10px",color:"#555"}}>Dim</span>
              <input type="range" min={0} max={100} value={ambience} onChange={e=>setAmbience(Number(e.target.value))} style={{flex:1,accentColor:"#e05c2a"}} />
              <span style={{fontSize:"10px",color:"#555"}}>Bright</span>
              <span style={{fontSize:"10px",color:"#e05c2a",fontWeight:700,minWidth:"32px"}}>{ambience}%</span>
            </div>
          </div>
        </div>

        {/* CENTRE */}
        <div style={{overflowY:"auto",display:"flex",flexDirection:"column"}}>

          {/* Storyboard */}
          <div style={{padding:"16px 20px",borderBottom:"1px solid #141414"}}>
            <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"2px",color:"#e05c2a",textTransform:"uppercase",marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px"}}>
              STORYBOARD — {SCENES.length} SCENES
              <div style={{flex:1,height:"1px",background:"#1e1e1e"}} />
              <span style={{fontSize:"8px",color:"#555",fontWeight:400,letterSpacing:0,textTransform:"none"}}>Total: 1:15</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
              {SCENES.map(scene => (
                <button key={scene.id} onClick={() => setActiveScene(scene.id)} style={{
                  background:activeScene===scene.id?"rgba(224,92,42,0.08)":"#0d0d0d",
                  border:`1px solid ${activeScene===scene.id?"rgba(224,92,42,0.3)":scene.status==="done"?"rgba(109,184,109,0.2)":"#1a1a1a"}`,
                  borderRadius:"6px",padding:"0",cursor:"pointer",textAlign:"left",overflow:"hidden",
                }}>
                  <div style={{width:"100%",aspectRatio:"16/9",background:`linear-gradient(135deg,${scene.status==="done"?"#1a2a1a":scene.status==="active"?"#2a1a0a":"#111"},${scene.status==="done"?"#0d1a0d":scene.status==="active"?"#1a0d00":"#0a0a0a"})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px"}}>
                    {scene.status==="done"?"✅":scene.status==="active"?"🎬":"⬜"}
                  </div>
                  <div style={{padding:"6px 8px"}}>
                    <div style={{fontSize:"8px",fontWeight:700,color:scene.status==="done"?"#6db86d":scene.status==="active"?"#e05c2a":"#555",marginBottom:"2px"}}>Scene {scene.id}</div>
                    <div style={{fontSize:"8px",color:"#666",lineHeight:1.3,marginBottom:"2px"}}>{scene.label}</div>
                    <div style={{fontSize:"7px",color:"#444"}}>{scene.dur}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Character Preview */}
          <div style={{padding:"16px 20px",borderBottom:"1px solid #141414"}}>
            <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"2px",color:"#e05c2a",textTransform:"uppercase",marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px"}}>
              CHARACTER PREVIEW — {charName.toUpperCase()}
              <div style={{flex:1,height:"1px",background:"#1e1e1e"}} />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
              {["Front View","Side Profile","Action Pose"].map(view => (
                <div key={view} style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:"6px",overflow:"hidden"}}>
                  <div style={{width:"100%",aspectRatio:"3/4",background:"linear-gradient(135deg,#1a1208,#0d0a00)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"32px"}}>🦊</div>
                  <div style={{padding:"4px 6px",fontSize:"7px",color:"#444",textAlign:"center"}}>{view}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Animation Features */}
          <div style={{padding:"16px 20px",borderBottom:"1px solid #141414"}}>
            <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"2px",color:"#e05c2a",textTransform:"uppercase",marginBottom:"12px",display:"flex",alignItems:"center",gap:"8px"}}>
              ANIMATION FEATURES
              <div style={{flex:1,height:"1px",background:"#1e1e1e"}} />
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {[
                {label:"Character Lock™",     desc:"Consistent character across all scenes",  val:charLock,  set:setCharLock},
                {label:"Lip Sync AI",          desc:"Auto-sync dialogue to character mouth",    val:lipSync,   set:setLipSync},
                {label:"Beat-Sync Animation",  desc:"Motion syncs to music beats",              val:beatSync,  set:setBeatSync},
              ].map(f => (
                <div key={f.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px",background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:"4px"}}>
                  <div>
                    <div style={{fontSize:"10px",fontWeight:700,color:"#ccc"}}>{f.label}</div>
                    <div style={{fontSize:"8px",color:"#555",marginTop:"2px"}}>{f.desc}</div>
                  </div>
                  <button onClick={() => f.set(!f.val)} style={{
                    width:"36px",height:"20px",borderRadius:"10px",border:"none",cursor:"pointer",
                    background:f.val?"#e05c2a":"#222",position:"relative",flexShrink:0,
                  }}>
                    <div style={{position:"absolute",top:"2px",left:f.val?"18px":"2px",width:"16px",height:"16px",borderRadius:"50%",background:"#fff",transition:"left 0.2s"}} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Generate */}
          <div style={{padding:"16px 20px"}}>
            <button style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#e05c2a,#c04a20)",border:"none",borderRadius:"4px",color:"#fff",fontSize:"13px",fontWeight:900,letterSpacing:"2px",textTransform:"uppercase",cursor:"pointer"}}>
              🎬 ANIMATE SCENE
              <div style={{fontSize:"9px",fontWeight:400,marginTop:"3px",opacity:0.8}}>Brief → Character Design → Storyboard → Upgrade Preview → Render</div>
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{borderLeft:"1px solid #1a1a1a",overflowY:"auto"}}>

          {/* Upgrade Preview */}
          <div style={{padding:"14px 16px",borderBottom:"1px solid #141414"}}>
            <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"2px",color:"#e05c2a",textTransform:"uppercase",marginBottom:"8px"}}>✦ UPGRADE PREVIEW</div>
            <div style={{fontSize:"8px",color:"#555",marginBottom:"10px",lineHeight:1.5}}>See the difference before you commit. Preview all three quality tiers.</div>
            <div style={{display:"flex",borderBottom:"1px solid #1a1a1a",marginBottom:"10px"}}>
              {(["original","enhanced","cinematic"] as const).map(t => (
                <button key={t} onClick={() => setTier(t)} style={{
                  flex:1,padding:"8px 4px",background:"none",border:"none",cursor:"pointer",
                  borderBottom:tier===t?"2px solid #e05c2a":"2px solid transparent",
                  color:tier===t?"#e05c2a":"#444",
                  fontSize:"9px",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",
                }}>
                  {t.toUpperCase()}
                  <span style={{fontSize:"8px",color:tier===t?"#e05c2a":"#333"}}>{TIER_PRICE[t]}</span>
                </button>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px",marginBottom:"10px"}}>
              {["ORIGINAL","ENHANCED","CINEMATIC"].map((lbl,li) => (
                <div key={lbl} style={{background:"#0d0d0d",border:`1px solid ${tier===lbl.toLowerCase()?"#e05c2a":"#1a1a1a"}`,borderRadius:"4px",overflow:"hidden"}}>
                  <div style={{width:"100%",aspectRatio:"16/9",background:li===0?"linear-gradient(135deg,#1a1a1a,#2a2a2a)":li===1?"linear-gradient(135deg,#2a1a0a,#1a0d00)":"linear-gradient(135deg,#1a0800,#0d0400)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px"}}>
                    {li===0?"🦊":li===1?"✨🦊":"🌟🦊"}
                  </div>
                  <div style={{fontSize:"7px",fontWeight:700,color:tier===lbl.toLowerCase()?"#e05c2a":"#444",padding:"3px",textAlign:"center"}}>{lbl}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:"8px",color:"#333",padding:"6px",background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a1a",borderRadius:"4px",marginBottom:"10px"}}>🔒 Preview only — no download until payment confirmed</div>
            <button style={{width:"100%",padding:"10px 12px",background:"linear-gradient(135deg,rgba(155,89,245,0.15),rgba(155,89,245,0.08))",border:"1px solid rgba(155,89,245,0.3)",borderRadius:"4px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:"10px",fontWeight:700,color:"#9b59f5",letterSpacing:"1px"}}>🎵 WizSound™ Cinematic</div>
                <div style={{fontSize:"8px",color:"#6a3fa0",marginTop:"1px"}}>Spatial audio · Dolby Atmos</div>
              </div>
              <div style={{fontSize:"12px",fontWeight:900,color:"#9b59f5"}}>{WIZSOUND_TIERS.CINEMATIC.price}</div>
            </button>
            <button style={{width:"100%",padding:"10px 12px",background:"linear-gradient(135deg,rgba(212,168,67,0.12),rgba(212,168,67,0.06))",border:"1px solid rgba(212,168,67,0.25)",borderRadius:"4px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:"10px",fontWeight:700,color:"#d4a843",letterSpacing:"1px"}}>✨ WizLuminar™ Cinematic</div>
                <div style={{fontSize:"8px",color:"#8a6820",marginTop:"1px"}}>Colour grade · Film grain</div>
              </div>
              <div style={{fontSize:"12px",fontWeight:900,color:"#d4a843"}}>{WIZLUMINAR_CINEMATIC.price}</div>
            </button>
          </div>

          {/* Render Quality */}
          <div style={{padding:"14px 16px",borderBottom:"1px solid #141414"}}>
            <div style={{fontSize:"9px",fontWeight:700,color:"#e05c2a",letterSpacing:"1.5px",marginBottom:"8px"}}>RENDER QUALITY</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",marginBottom:"10px"}}>
              {VIDEO_QUALITY_2TIER.map(rq => (
                <button key={rq.label} onClick={() => setRenderQuality(rq.label)} style={{
                  background:renderQuality===rq.label?"rgba(224,92,42,0.12)":"#0d0d0d",
                  border:`1px solid ${renderQuality===rq.label?"rgba(224,92,42,0.4)":"#1a1a1a"}`,
                  borderRadius:"4px",padding:"8px 4px",cursor:"pointer",textAlign:"center",
                }}>
                  <div style={{fontSize:"12px",fontWeight:900,color:renderQuality===rq.label?"#e05c2a":"#666"}}>{rq.label}</div>
                  <div style={{fontSize:"8px",color:renderQuality===rq.label?"#e05c2a":"#555",marginTop:"2px"}}>{rq.price}</div>
                </button>
              ))}
            </div>
            <button style={{width:"100%",padding:"10px",background:"linear-gradient(135deg,#e05c2a,#c04a20)",border:"none",borderRadius:"3px",color:"#fff",fontSize:"11px",fontWeight:900,letterSpacing:"1px",cursor:"pointer"}}>
              🎬 RENDER — {renderQuality}
            </button>
          </div>

          {/* Production Status */}
          <div style={{padding:"14px 16px"}}>
            <div style={{fontSize:"9px",fontWeight:700,color:"#e05c2a",letterSpacing:"1.5px",marginBottom:"8px"}}>PRODUCTION STATUS</div>
            {[
              {label:"Director's Brief",      val:"✓",          done:true,  active:false},
              {label:"Character Design",       val:"✓",          done:true,  active:false},
              {label:"Storyboard",             val:"In Progress",done:false, active:true},
              {label:"WizSound™ Processing",   val:"Pending",    done:false, active:false},
              {label:"WizLuminar™ Grade",      val:"Pending",    done:false, active:false},
              {label:"Render & Export",        val:"Pending",    done:false, active:false},
            ].map(step => (
              <div key={step.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #111"}}>
                <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                  <div style={{width:"6px",height:"6px",borderRadius:"50%",background:step.done?"#6db86d":step.active?"#e05c2a":"#2a2a2a",flexShrink:0}} />
                  <span style={{fontSize:"9px",color:step.done?"#888":step.active?"#ccc":"#444"}}>{step.label}</span>
                </div>
                <span style={{fontSize:"8px",color:step.done?"#6db86d":step.active?"#e05c2a":"#333"}}>{step.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ num, label, accent }: { num: number; label: string; accent: string }) {
  return (
    <div style={{fontSize:"9px",fontWeight:700,letterSpacing:"2px",color:"#444",textTransform:"uppercase",marginBottom:"10px",display:"flex",alignItems:"center",gap:"8px"}}>
      <div style={{width:"16px",height:"16px",borderRadius:"50%",background:accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:900,color:"#fff",flexShrink:0}}>{num}</div>
      {label}
      <div style={{flex:1,height:"1px",background:"#1e1e1e"}} />
    </div>
  );
}
