/**
 * WizAnimate™ — AI Character Animation Studio
 * Phase 1 Reskin: Orange accent (#f97316), DAW-grid ambient environment,
 * studio monitor header identity — all workflow logic preserved.
 * 3-column: left config | centre storyboard workspace | right upgrade panel
 */
import { useState } from "react";
import { WIZSOUND_TIERS, VIDEO_QUALITY_2TIER, WIZLUMINAR_CINEMATIC } from "@/lib/pricing";
import { Link } from "wouter";

// ─── Assets ──────────────────────────────────────────────────────────────────
const LOGO_IMG = "/manus-storage/wizanimate-logo-new_a84f9808.png";

// ─── Constants ───────────────────────────────────────────────────────────────
const ACCENT = "#f97316";
const ACCENT_DIM = "rgba(249,115,22,0.15)";
const ACCENT_BORDER = "rgba(249,115,22,0.35)";
const ACCENT_GLOW = "rgba(249,115,22,0.6)";

const STAGES = [
  { key: "brief",      label: "DIRECTOR'S BRIEF" },
  { key: "character",  label: "CHARACTER DESIGN" },
  { key: "storyboard", label: "STORYBOARD" },
  { key: "upgrade",    label: "UPGRADE PREVIEW" },
  { key: "render",     label: "RENDER & EXPORT" },
] as const;
type Stage = typeof STAGES[number]["key"];

const ANIM_STYLES = [
  { id: "pixar3d",    label: "Pixar 3D",   desc: "Vibrant 3D · Expressive" },
  { id: "storybook",  label: "Storybook",  desc: "Watercolour · Illustrated" },
  { id: "disney",     label: "Disney 2D",  desc: "Classic · Fluid" },
  { id: "anime",      label: "Anime",      desc: "Japanese · Stylised" },
  { id: "cartoon",    label: "Cartoon",    desc: "Bold lines · Fun" },
  { id: "claymation", label: "Claymation", desc: "Stop-motion · Tactile" },
];

const CHAR_ARCHETYPES = ["Hero","Sidekick","Villain","Mentor","Comic Relief","Creature","Robot","Fantasy Being"];
const AGES = ["Toddler (2-4)","Child (5-8)","Pre-teen (9-12)","Teen (13-17)","Young Adult","Adult","Elder"];

const SCENES = [
  { id: 1, label: "Opening — Forest Awakening",   dur: "0:00–0:12", status: "done" },
  { id: 2, label: "Discovery — Magic Portal",      dur: "0:12–0:28", status: "active" },
  { id: 3, label: "Challenge — The Dark Cave",     dur: "0:28–0:45", status: "pending" },
  { id: 4, label: "Climax — Dragon Confrontation", dur: "0:45–1:02", status: "pending" },
  { id: 5, label: "Resolution — Homecoming",       dur: "1:02–1:15", status: "pending" },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function KidsVideo() {
  const [stage, setStage]             = useState<Stage>("storyboard");
  const [animStyle, setAnimStyle]     = useState("pixar3d");
  const [archetype, setArchetype]     = useState("Hero");
  const [age, setAge]                 = useState("Child (5-8)");
  const [brief, setBrief]             = useState("A brave young fox named Ember discovers a hidden portal in the enchanted forest. She must use her wits and courage to rescue her friends from the Shadow Realm before the moon rises. Warm, adventurous, full of wonder — inspired by Studio Ghibli's sense of magic.");
  const [charName, setCharName]       = useState("Ember");
  const [charDesc, setCharDesc]       = useState("A small fox with amber fur and bright green eyes. Wears a tiny explorer's satchel. Expressive face, large curious eyes.");
  const [ambience, setAmbience]       = useState(70);
  const [tier, setTier]               = useState<"original"|"enhanced"|"cinematic">("original");
  const [renderQuality, setRenderQuality] = useState("4K");
  const [lipSync, setLipSync]         = useState(true);
  const [charLock, setCharLock]       = useState(true);
  const [beatSync, setBeatSync]       = useState(true);
  const [activeScene, setActiveScene] = useState(2);

  const stageIndex = STAGES.findIndex(s => s.key === stage);

  const TIER_PRICE = {
    original: WIZSOUND_TIERS.ORIGINAL.price,
    enhanced: WIZSOUND_TIERS.ENHANCED.price,
    cinematic: WIZSOUND_TIERS.CINEMATIC.price,
  };

  // ─── Pill nav styles ────────────────────────────────────────────────────────
  const pill = (i: number) => ({
    display: "flex" as const, alignItems: "center", gap: "6px",
    padding: "14px 12px", fontSize: "10px", fontWeight: 700,
    letterSpacing: "1px", textTransform: "uppercase" as const,
    background: "none", border: "none", cursor: "pointer",
    whiteSpace: "nowrap" as const,
    borderBottom: i < stageIndex ? "2px solid #4ade80"
      : i === stageIndex ? `2px solid ${ACCENT}`
      : "2px solid transparent",
    color: i < stageIndex ? "#4ade80" : i === stageIndex ? ACCENT : "#444",
  });
  const pillNum = (i: number) => ({
    width: "18px", height: "18px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "9px", fontWeight: 900, flexShrink: 0,
    background: i < stageIndex ? "#4ade80" : i === stageIndex ? ACCENT : "#1a1a1a",
    color: i < stageIndex ? "#000" : "#fff",
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: "#080808", color: "#ccc",
      fontFamily: "'Inter', sans-serif", overflow: "hidden",
    }}>

      {/* ── DAW Grid ambient background ─────────────────────────────────────── */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 50% 0%, rgba(249,115,22,0.08) 0%, transparent 70%),
          radial-gradient(ellipse 40% 40% at 10% 80%, rgba(249,115,22,0.04) 0%, transparent 60%),
          radial-gradient(ellipse 40% 40% at 90% 80%, rgba(249,115,22,0.04) 0%, transparent 60%)
        `,
      }} />
      {/* Horizontal grid lines */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(249,115,22,0.04) 40px)",
      }} />
      {/* Vertical grid lines */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 79px, rgba(249,115,22,0.03) 80px)",
      }} />

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: "52px",
        borderBottom: `1px solid rgba(249,115,22,0.12)`,
        background: "rgba(8,8,8,0.95)",
        backdropFilter: "blur(12px)",
        flexShrink: 0,
      }}>
        {/* Left: logo + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <Link href="/" style={{ fontSize: "11px", color: "#555", textDecoration: "none" }}>← Back</Link>
          <div style={{ width: "1px", height: "20px", background: "#1e1e1e" }} />
          <img src={LOGO_IMG} alt="WizAnimate" style={{ height: "22px", objectFit: "contain" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: "16px",
              letterSpacing: "3px", color: "#fff", lineHeight: 1,
            }}>WizAnimate™</span>
            <span style={{ fontSize: "8px", color: "#555", letterSpacing: "2px" }}>AI CHARACTER ANIMATION STUDIO</span>
          </div>
          {/* LIVE indicator */}
          <div style={{
            display: "flex", alignItems: "center", gap: "5px",
            background: ACCENT_DIM, border: `1px solid ${ACCENT_BORDER}`,
            borderRadius: "3px", padding: "3px 8px",
          }}>
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: ACCENT, boxShadow: `0 0 6px ${ACCENT_GLOW}`,
            }} />
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: ACCENT }}>ANIMATING</span>
          </div>
        </div>

        {/* Centre: stage pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
          {STAGES.map((s, i) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center" }}>
              <button onClick={() => setStage(s.key)} style={pill(i)}>
                <span style={pillNum(i)}>{i < stageIndex ? "✓" : i + 1}</span>
                {s.label}
              </button>
              {i < STAGES.length - 1 && (
                <span style={{ color: "#2a2a2a", fontSize: "14px", userSelect: "none" }}>›</span>
              )}
            </div>
          ))}
        </div>

        {/* Right: credits + avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "11px", color: "#555" }}>⚡ 10,000 Credits</span>
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%",
            background: `linear-gradient(135deg, ${ACCENT}, #c2410c)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "12px", fontWeight: 700, color: "#fff",
          }}>T</div>
        </div>
      </nav>

      {/* ── Studio Monitor Hero Banner ───────────────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 1,
        background: `linear-gradient(180deg, rgba(249,115,22,0.06) 0%, transparent 100%)`,
        borderBottom: `1px solid rgba(249,115,22,0.1)`,
        padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        {/* Left: project meta */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div>
            <div style={{ fontSize: "8px", color: "#555", letterSpacing: "2px", marginBottom: "2px" }}>PROJECT</div>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: "20px",
              letterSpacing: "3px", color: "#fff", lineHeight: 1,
            }}>ANIMATION STUDIO — STAGE 7</div>
          </div>
          <div style={{ width: "1px", height: "32px", background: "rgba(249,115,22,0.15)" }} />
          <div style={{ display: "flex", gap: "16px" }}>
            {[
              { label: "STYLE", val: ANIM_STYLES.find(s => s.id === animStyle)?.label ?? "—" },
              { label: "CHARACTER", val: charName },
              { label: "SCENES", val: String(SCENES.length) },
              { label: "DURATION", val: "1:15" },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: "7px", color: "#555", letterSpacing: "1.5px" }}>{item.label}</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#ccc", marginTop: "1px" }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: DAW-style timecode + BPM */}
        <div style={{
          display: "flex", alignItems: "center", gap: "16px",
          background: "#050505", border: `1px solid rgba(249,115,22,0.2)`,
          borderRadius: "4px", padding: "8px 16px",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "7px", color: "#555", letterSpacing: "1.5px" }}>TIMECODE</div>
            <div style={{
              fontFamily: "monospace", fontSize: "18px", fontWeight: 700,
              color: ACCENT, letterSpacing: "2px", lineHeight: 1,
            }}>00:28:14</div>
          </div>
          <div style={{ width: "1px", height: "28px", background: "rgba(249,115,22,0.15)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "7px", color: "#555", letterSpacing: "1.5px" }}>BPM</div>
            <div style={{
              fontFamily: "monospace", fontSize: "18px", fontWeight: 700,
              color: "#ccc", letterSpacing: "2px", lineHeight: 1,
            }}>120</div>
          </div>
          <div style={{ width: "1px", height: "28px", background: "rgba(249,115,22,0.15)" }} />
          {/* Ambience slider inline */}
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ fontSize: "7px", color: "#555", letterSpacing: "1.5px" }}>AMBIENCE</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="range" min={0} max={100} value={ambience}
                onChange={e => setAmbience(Number(e.target.value))}
                style={{ width: "80px", accentColor: ACCENT }}
              />
              <span style={{ fontSize: "10px", color: ACCENT, fontWeight: 700, minWidth: "28px" }}>{ambience}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3-Column Layout ──────────────────────────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "grid", gridTemplateColumns: "280px 1fr 260px",
        flex: 1, overflow: "hidden",
      }}>

        {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
        <div style={{ borderRight: `1px solid rgba(249,115,22,0.08)`, overflowY: "auto" }}>

          {/* Director's Brief */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #111" }}>
            <SectionTitle num={1} label="DIRECTOR'S BRIEF" accent={ACCENT} />
            <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
              <button style={{
                flex: 1, background: "#0d0d0d", border: "1px solid #1e1e1e",
                color: "#777", padding: "6px", borderRadius: "3px", fontSize: "9px", cursor: "pointer",
              }}>🎙 Speak Your Brief</button>
              <button style={{
                flex: 1, background: ACCENT_DIM, border: `1px solid ${ACCENT_BORDER}`,
                color: ACCENT, padding: "6px", borderRadius: "3px", fontSize: "9px", cursor: "pointer",
              }}>✦ AI Brief</button>
            </div>
            <textarea
              value={brief} onChange={e => setBrief(e.target.value)} rows={4}
              placeholder="Describe your animation story, characters, and mood..."
              style={{
                width: "100%", background: "#0a0a0a", border: "1px solid #1a1a1a",
                color: "#ccc", padding: "8px", borderRadius: "3px", fontSize: "10px",
                resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Animation Style */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #111" }}>
            <SectionTitle num={2} label="ANIMATION STYLE" accent={ACCENT} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {ANIM_STYLES.map(s => (
                <button key={s.id} onClick={() => setAnimStyle(s.id)} style={{
                  background: animStyle === s.id ? ACCENT_DIM : "#0a0a0a",
                  border: `1px solid ${animStyle === s.id ? ACCENT_BORDER : "#1a1a1a"}`,
                  borderRadius: "4px", padding: "8px", cursor: "pointer", textAlign: "left",
                }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: animStyle === s.id ? ACCENT : "#777", marginBottom: "2px" }}>{s.label}</div>
                  <div style={{ fontSize: "8px", color: "#444" }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Characters */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #111" }}>
            <SectionTitle num={3} label="CHARACTERS" accent={ACCENT} />
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "8px", color: "#555", marginBottom: "4px" }}>CHARACTER NAME</div>
              <input
                value={charName} onChange={e => setCharName(e.target.value)}
                style={{
                  width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e",
                  color: "#ccc", padding: "7px", borderRadius: "3px", fontSize: "10px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "8px", color: "#555", marginBottom: "4px" }}>ARCHETYPE</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {CHAR_ARCHETYPES.map(a => (
                  <button key={a} onClick={() => setArchetype(a)} style={{
                    padding: "3px 7px", borderRadius: "20px", fontSize: "8px", fontWeight: 600, cursor: "pointer",
                    background: archetype === a ? ACCENT_DIM : "#0d0d0d",
                    border: `1px solid ${archetype === a ? ACCENT_BORDER : "#1e1e1e"}`,
                    color: archetype === a ? ACCENT : "#555",
                  }}>{a}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "8px", color: "#555", marginBottom: "4px" }}>AGE GROUP</div>
              <select
                value={age} onChange={e => setAge(e.target.value)}
                style={{
                  width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e",
                  color: "#ccc", padding: "7px", borderRadius: "3px", fontSize: "10px",
                }}
              >
                {AGES.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "8px", color: "#555", marginBottom: "4px" }}>VISUAL DESCRIPTION</div>
              <textarea
                value={charDesc} onChange={e => setCharDesc(e.target.value)} rows={3}
                style={{
                  width: "100%", background: "#0a0a0a", border: "1px solid #1a1a1a",
                  color: "#ccc", padding: "8px", borderRadius: "3px", fontSize: "10px",
                  resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Production Settings */}
          <div style={{ padding: "14px 16px" }}>
            <SectionTitle num={4} label="PRODUCTION SETTINGS" accent={ACCENT} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <div style={{ fontSize: "8px", color: "#555", marginBottom: "4px" }}>DURATION</div>
                <select style={{
                  width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e",
                  color: "#ccc", padding: "7px", borderRadius: "3px", fontSize: "10px",
                }}>
                  {["0:30 — Short", "1:00 — Standard", "2:00 — Extended", "Custom"].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "8px", color: "#555", marginBottom: "4px" }}>ASPECT RATIO</div>
                <select style={{
                  width: "100%", background: "#0d0d0d", border: "1px solid #1e1e1e",
                  color: "#ccc", padding: "7px", borderRadius: "3px", fontSize: "10px",
                }}>
                  {["16:9 — Widescreen", "9:16 — Vertical", "1:1 — Square", "4:3 — Classic"].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── CENTRE PANEL ─────────────────────────────────────────────────── */}
        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* Storyboard */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #111" }}>
            <div style={{
              fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: ACCENT,
              textTransform: "uppercase", marginBottom: "12px",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              STORYBOARD — {SCENES.length} SCENES
              <div style={{ flex: 1, height: "1px", background: "rgba(249,115,22,0.1)" }} />
              <span style={{ fontSize: "8px", color: "#555", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>Total: 1:15</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
              {SCENES.map(scene => (
                <button key={scene.id} onClick={() => setActiveScene(scene.id)} style={{
                  background: activeScene === scene.id ? ACCENT_DIM : "#0a0a0a",
                  border: `1px solid ${
                    activeScene === scene.id ? ACCENT_BORDER
                    : scene.status === "done" ? "rgba(74,222,128,0.2)"
                    : "#1a1a1a"
                  }`,
                  borderRadius: "6px", padding: "0", cursor: "pointer", textAlign: "left", overflow: "hidden",
                }}>
                  <div style={{
                    width: "100%", aspectRatio: "16/9",
                    background: scene.status === "done"
                      ? "linear-gradient(135deg,#0d1a0d,#0a120a)"
                      : scene.status === "active"
                      ? `linear-gradient(135deg,rgba(249,115,22,0.12),rgba(249,115,22,0.04))`
                      : "linear-gradient(135deg,#111,#0a0a0a)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px",
                  }}>
                    {scene.status === "done" ? "✅" : scene.status === "active" ? "🎬" : "⬜"}
                  </div>
                  <div style={{ padding: "6px 8px" }}>
                    <div style={{
                      fontSize: "8px", fontWeight: 700, marginBottom: "2px",
                      color: scene.status === "done" ? "#4ade80" : scene.status === "active" ? ACCENT : "#555",
                    }}>Scene {scene.id}</div>
                    <div style={{ fontSize: "8px", color: "#555", lineHeight: 1.3, marginBottom: "2px" }}>{scene.label}</div>
                    <div style={{ fontSize: "7px", color: "#333" }}>{scene.dur}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Character Preview */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #111" }}>
            <div style={{
              fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: ACCENT,
              textTransform: "uppercase", marginBottom: "12px",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              CHARACTER PREVIEW — {charName.toUpperCase()}
              <div style={{ flex: 1, height: "1px", background: "rgba(249,115,22,0.1)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {["Front View", "Side Profile", "Action Pose"].map(view => (
                <div key={view} style={{
                  background: "#0a0a0a", border: "1px solid #1a1a1a",
                  borderRadius: "6px", overflow: "hidden",
                }}>
                  <div style={{
                    width: "100%", aspectRatio: "3/4",
                    background: `linear-gradient(135deg, rgba(249,115,22,0.06), #0a0a0a)`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px",
                  }}>🦊</div>
                  <div style={{ padding: "4px 6px", fontSize: "7px", color: "#444", textAlign: "center" }}>{view}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Animation Features */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #111" }}>
            <div style={{
              fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: ACCENT,
              textTransform: "uppercase", marginBottom: "12px",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              ANIMATION FEATURES
              <div style={{ flex: 1, height: "1px", background: "rgba(249,115,22,0.1)" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Character Lock™",    desc: "Consistent character across all scenes", val: charLock,  set: setCharLock },
                { label: "Lip Sync AI",         desc: "Auto-sync dialogue to character mouth",  val: lipSync,   set: setLipSync },
                { label: "Beat-Sync Animation", desc: "Motion syncs to music beats",            val: beatSync,  set: setBeatSync },
              ].map(f => (
                <div key={f.label} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: "4px",
                }}>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#ccc" }}>{f.label}</div>
                    <div style={{ fontSize: "8px", color: "#555", marginTop: "2px" }}>{f.desc}</div>
                  </div>
                  <button onClick={() => f.set(!f.val)} style={{
                    width: "36px", height: "20px", borderRadius: "10px",
                    border: "none", cursor: "pointer",
                    background: f.val ? ACCENT : "#222",
                    position: "relative", flexShrink: 0,
                  }}>
                    <div style={{
                      position: "absolute", top: "2px",
                      left: f.val ? "18px" : "2px",
                      width: "16px", height: "16px",
                      borderRadius: "50%", background: "#fff",
                      transition: "left 0.2s",
                    }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Generate */}
          <div style={{ padding: "16px 20px" }}>
            <button style={{
              width: "100%", padding: "14px",
              background: `linear-gradient(135deg, ${ACCENT}, #c2410c)`,
              border: "none", borderRadius: "4px",
              color: "#fff", fontSize: "13px", fontWeight: 900,
              letterSpacing: "2px", textTransform: "uppercase", cursor: "pointer",
            }}>
              🎬 ANIMATE SCENE
              <div style={{ fontSize: "9px", fontWeight: 400, marginTop: "3px", opacity: 0.8 }}>
                Brief → Character Design → Storyboard → Upgrade Preview → Render
              </div>
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
        <div style={{ borderLeft: `1px solid rgba(249,115,22,0.08)`, overflowY: "auto" }}>

          {/* Upgrade Preview */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #111" }}>
            <div style={{
              fontSize: "9px", fontWeight: 700, letterSpacing: "2px",
              color: ACCENT, textTransform: "uppercase", marginBottom: "8px",
            }}>✦ UPGRADE PREVIEW</div>
            <div style={{ fontSize: "8px", color: "#555", marginBottom: "10px", lineHeight: 1.5 }}>
              See the difference before you commit. Preview all three quality tiers.
            </div>
            <div style={{ display: "flex", borderBottom: `1px solid rgba(249,115,22,0.1)`, marginBottom: "10px" }}>
              {(["original", "enhanced", "cinematic"] as const).map(t => (
                <button key={t} onClick={() => setTier(t)} style={{
                  flex: 1, padding: "8px 4px", background: "none", border: "none", cursor: "pointer",
                  borderBottom: tier === t ? `2px solid ${ACCENT}` : "2px solid transparent",
                  color: tier === t ? ACCENT : "#444",
                  fontSize: "9px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                }}>
                  {t.toUpperCase()}
                  <span style={{ fontSize: "8px", color: tier === t ? ACCENT : "#333" }}>{TIER_PRICE[t]}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", marginBottom: "10px" }}>
              {["ORIGINAL", "ENHANCED", "CINEMATIC"].map((lbl, li) => (
                <div key={lbl} style={{
                  background: "#0a0a0a",
                  border: `1px solid ${tier === lbl.toLowerCase() ? ACCENT_BORDER : "#1a1a1a"}`,
                  borderRadius: "4px", overflow: "hidden",
                }}>
                  <div style={{
                    width: "100%", aspectRatio: "16/9",
                    background: li === 0
                      ? "linear-gradient(135deg,#1a1a1a,#222)"
                      : li === 1
                      ? `linear-gradient(135deg,rgba(249,115,22,0.1),rgba(249,115,22,0.04))`
                      : `linear-gradient(135deg,rgba(249,115,22,0.18),rgba(249,115,22,0.06))`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
                  }}>
                    {li === 0 ? "🦊" : li === 1 ? "✨🦊" : "🌟🦊"}
                  </div>
                  <div style={{
                    fontSize: "7px", fontWeight: 700,
                    color: tier === lbl.toLowerCase() ? ACCENT : "#444",
                    padding: "3px", textAlign: "center",
                  }}>{lbl}</div>
                </div>
              ))}
            </div>
            <div style={{
              fontSize: "8px", color: "#333", padding: "6px",
              background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a1a",
              borderRadius: "4px", marginBottom: "10px",
            }}>🔒 Preview only — no download until payment confirmed</div>
            <button style={{
              width: "100%", padding: "10px 12px",
              background: "linear-gradient(135deg,rgba(155,89,245,0.15),rgba(155,89,245,0.08))",
              border: "1px solid rgba(155,89,245,0.3)", borderRadius: "4px",
              cursor: "pointer", display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "6px",
            }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#9b59f5", letterSpacing: "1px" }}>🎵 WizSound™ Cinematic</div>
                <div style={{ fontSize: "8px", color: "#6a3fa0", marginTop: "1px" }}>Spatial audio · Dolby Atmos</div>
              </div>
              <div style={{ fontSize: "12px", fontWeight: 900, color: "#9b59f5" }}>{WIZSOUND_TIERS.CINEMATIC.price}</div>
            </button>
            <button style={{
              width: "100%", padding: "10px 12px",
              background: "linear-gradient(135deg,rgba(212,168,67,0.12),rgba(212,168,67,0.06))",
              border: "1px solid rgba(212,168,67,0.25)", borderRadius: "4px",
              cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#d4a843", letterSpacing: "1px" }}>✨ WizLuminar™ Cinematic</div>
                <div style={{ fontSize: "8px", color: "#8a6820", marginTop: "1px" }}>Colour grade · Film grain</div>
              </div>
              <div style={{ fontSize: "12px", fontWeight: 900, color: "#d4a843" }}>{WIZLUMINAR_CINEMATIC.price}</div>
            </button>
          </div>

          {/* Render Quality */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #111" }}>
            <div style={{
              fontSize: "9px", fontWeight: 700, color: ACCENT,
              letterSpacing: "1.5px", marginBottom: "8px",
            }}>RENDER QUALITY</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "10px" }}>
              {VIDEO_QUALITY_2TIER.map(rq => (
                <button key={rq.label} onClick={() => setRenderQuality(rq.label)} style={{
                  background: renderQuality === rq.label ? ACCENT_DIM : "#0a0a0a",
                  border: `1px solid ${renderQuality === rq.label ? ACCENT_BORDER : "#1a1a1a"}`,
                  borderRadius: "4px", padding: "8px 4px", cursor: "pointer", textAlign: "center",
                }}>
                  <div style={{ fontSize: "12px", fontWeight: 900, color: renderQuality === rq.label ? ACCENT : "#666" }}>{rq.label}</div>
                  <div style={{ fontSize: "8px", color: renderQuality === rq.label ? ACCENT : "#555", marginTop: "2px" }}>{rq.price}</div>
                </button>
              ))}
            </div>
            <button style={{
              width: "100%", padding: "10px",
              background: `linear-gradient(135deg, ${ACCENT}, #c2410c)`,
              border: "none", borderRadius: "3px",
              color: "#fff", fontSize: "11px", fontWeight: 900, letterSpacing: "1px", cursor: "pointer",
            }}>
              🎬 RENDER — {renderQuality}
            </button>
          </div>

          {/* Production Status */}
          <div style={{ padding: "14px 16px" }}>
            <div style={{
              fontSize: "9px", fontWeight: 700, color: ACCENT,
              letterSpacing: "1.5px", marginBottom: "8px",
            }}>PRODUCTION STATUS</div>
            {[
              { label: "Director's Brief",    val: "✓",           done: true,  active: false },
              { label: "Character Design",     val: "✓",           done: true,  active: false },
              { label: "Storyboard",           val: "In Progress", done: false, active: true },
              { label: "WizSound™ Processing", val: "Pending",     done: false, active: false },
              { label: "WizLuminar™ Grade",    val: "Pending",     done: false, active: false },
              { label: "Render & Export",      val: "Pending",     done: false, active: false },
            ].map(step => (
              <div key={step.label} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "5px 0", borderBottom: "1px solid #0d0d0d",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{
                    width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                    background: step.done ? "#4ade80" : step.active ? ACCENT : "#2a2a2a",
                    boxShadow: step.active ? `0 0 6px ${ACCENT_GLOW}` : "none",
                  }} />
                  <span style={{ fontSize: "9px", color: step.done ? "#777" : step.active ? "#ccc" : "#444" }}>
                    {step.label}
                  </span>
                </div>
                <span style={{
                  fontSize: "8px",
                  color: step.done ? "#4ade80" : step.active ? ACCENT : "#333",
                }}>{step.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SectionTitle helper ──────────────────────────────────────────────────────
function SectionTitle({ num, label, accent }: { num: number; label: string; accent: string }) {
  return (
    <div style={{
      fontSize: "9px", fontWeight: 700, letterSpacing: "2px", color: "#444",
      textTransform: "uppercase", marginBottom: "10px",
      display: "flex", alignItems: "center", gap: "8px",
    }}>
      <div style={{
        width: "16px", height: "16px", borderRadius: "50%",
        background: accent, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "8px", fontWeight: 900,
        color: "#fff", flexShrink: 0,
      }}>{num}</div>
      {label}
      <div style={{ flex: 1, height: "1px", background: "rgba(249,115,22,0.1)" }} />
    </div>
  );
}
