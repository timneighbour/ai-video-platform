/**
 * WizProductEmblems — Custom premium SVG emblems for each WIZ AI product.
 *
 * Each product has its own distinct colour accent and visual personality:
 * - WizAudio:   emerald/teal  — waveform / studio sound
 * - WizImage:   amber/magenta — aperture / image grid
 * - WizVideo:   violet/royal  — cinematic frame / film strip
 * - WizShorts:  electric cyan — vertical phone / fast motion
 * - WizAnimate: rose/coral    — 3D animation / character
 * - WizScript:  orange/gold   — storyboard / script-to-scene
 */

// ── WizAudio — Emerald/teal waveform ─────────────────────────────────────────
export function WizAudioEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="aud-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="40%" stopColor="#34d399" />
          <stop offset="60%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
        <radialGradient id="aud-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
        <filter id="aud-blur">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Ambient glow */}
      <ellipse cx="32" cy="36" rx="26" ry="18" fill="url(#aud-glow)" />
      {/* Outer ring */}
      <circle cx="32" cy="32" r="29" stroke="url(#aud-g)" strokeWidth="1" fill="none" opacity="0.35" />
      {/* Inner ring */}
      <circle cx="32" cy="32" r="21" stroke="url(#aud-g)" strokeWidth="0.6" fill="none" opacity="0.2" />
      {/* Waveform bars — centred, varying heights */}
      {[
        { x: 10, h: 8 },  { x: 14, h: 14 }, { x: 18, h: 22 },
        { x: 22, h: 32 }, { x: 26, h: 40 }, { x: 30, h: 44 },
        { x: 34, h: 40 }, { x: 38, h: 30 }, { x: 42, h: 20 },
        { x: 46, h: 12 }, { x: 50, h: 6 },
      ].map((bar, i) => (
        <rect
          key={i}
          x={bar.x - 1.5}
          y={32 - bar.h / 2}
          width="3"
          height={bar.h}
          rx="1.5"
          fill="url(#aud-g)"
          opacity={i === 5 ? 1 : 0.75}
          filter={i === 5 ? "url(#aud-blur)" : undefined}
        />
      ))}
      {/* Reflection */}
      {[
        { x: 10, h: 8 },  { x: 14, h: 14 }, { x: 18, h: 22 },
        { x: 22, h: 32 }, { x: 26, h: 40 }, { x: 30, h: 44 },
        { x: 34, h: 40 }, { x: 38, h: 30 }, { x: 42, h: 20 },
        { x: 46, h: 12 }, { x: 50, h: 6 },
      ].map((bar, i) => (
        <rect
          key={`r${i}`}
          x={bar.x - 1.5}
          y={32 + bar.h / 2 + 1}
          width="3"
          height={bar.h * 0.3}
          rx="1.5"
          fill="url(#aud-g)"
          opacity="0.15"
        />
      ))}
      {/* Centre specular */}
      <circle cx="32" cy="32" r="2.5" fill="#6ee7b7" opacity="0.9" />
    </svg>
  );
}

// ── WizImage — Amber/magenta aperture iris ────────────────────────────────────
export function WizImageEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="img-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="30%" stopColor="#f59e0b" />
          <stop offset="55%" stopColor="#fcd34d" />
          <stop offset="75%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#9d174d" />
        </linearGradient>
        <radialGradient id="img-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
          <stop offset="60%" stopColor="#ec4899" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Ambient glow */}
      <ellipse cx="32" cy="32" rx="28" ry="28" fill="url(#img-glow)" />
      {/* Outer frame */}
      <rect x="4" y="4" width="56" height="56" rx="10" stroke="url(#img-g)" strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Inner frame */}
      <rect x="11" y="11" width="42" height="42" rx="7" stroke="url(#img-g)" strokeWidth="0.6" fill="none" opacity="0.2" />
      {/* 6-blade aperture iris */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 32 + Math.cos(rad) * 9;
        const cy = 32 + Math.sin(rad) * 9;
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx="6.5"
            ry="3"
            transform={`rotate(${angle + 30}, ${cx}, ${cy})`}
            fill="url(#img-g)"
            opacity="0.6"
          />
        );
      })}
      {/* Lens ring */}
      <circle cx="32" cy="32" r="8" stroke="url(#img-g)" strokeWidth="1.5" fill="none" opacity="0.85" />
      {/* Centre lens */}
      <circle cx="32" cy="32" r="4" fill="url(#img-g)" opacity="0.95" />
      {/* Specular highlight */}
      <circle cx="29.5" cy="29.5" r="1.2" fill="white" opacity="0.5" />
      {/* Corner sparkles */}
      {[[13, 13], [51, 13], [13, 51], [51, 51]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="url(#img-g)" opacity="0.55" />
      ))}
    </svg>
  );
}

// ── WizVideo — Violet/royal blue cinematic film strip ─────────────────────────
export function WizVideoEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vid-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4c1d95" />
          <stop offset="30%" stopColor="#7c3aed" />
          <stop offset="55%" stopColor="#a78bfa" />
          <stop offset="75%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <radialGradient id="vid-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#60a5fa" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Ambient glow */}
      <ellipse cx="32" cy="32" rx="28" ry="22" fill="url(#vid-glow)" />
      {/* Film frame outer */}
      <rect x="4" y="12" width="56" height="40" rx="5" stroke="url(#vid-g)" strokeWidth="1.5" fill="none" opacity="0.45" />
      {/* Film strip top/bottom bands */}
      <rect x="4" y="12" width="56" height="7" rx="5" fill="url(#vid-g)" opacity="0.08" />
      <rect x="4" y="45" width="56" height="7" rx="5" fill="url(#vid-g)" opacity="0.08" />
      {/* Sprocket holes — top */}
      {[10, 20, 30, 40, 50].map((x, i) => (
        <rect key={`t${i}`} x={x - 2} y="14" width="5" height="4" rx="1" fill="url(#vid-g)" opacity="0.55" />
      ))}
      {/* Sprocket holes — bottom */}
      {[10, 20, 30, 40, 50].map((x, i) => (
        <rect key={`b${i}`} x={x - 2} y="46" width="5" height="4" rx="1" fill="url(#vid-g)" opacity="0.55" />
      ))}
      {/* Scene dividers */}
      <line x1="18" y1="21" x2="18" y2="43" stroke="url(#vid-g)" strokeWidth="0.75" opacity="0.3" />
      <line x1="46" y1="21" x2="46" y2="43" stroke="url(#vid-g)" strokeWidth="0.75" opacity="0.3" />
      {/* Play triangle — centre */}
      <polygon points="26,25 26,39 40,32" fill="url(#vid-g)" opacity="0.95" />
      {/* Specular on play button */}
      <polygon points="26,25 26,29 30,27" fill="white" opacity="0.2" />
      {/* Side scene horizon lines */}
      <line x1="6" y1="34" x2="16" y2="34" stroke="url(#vid-g)" strokeWidth="1" opacity="0.3" />
      <line x1="48" y1="34" x2="58" y2="34" stroke="url(#vid-g)" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

// ── WizShorts — Electric cyan vertical phone ──────────────────────────────────
export function WizShortsEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sho-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0e7490" />
          <stop offset="35%" stopColor="#06b6d4" />
          <stop offset="60%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <radialGradient id="sho-glow" cx="50%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Ambient glow */}
      <ellipse cx="32" cy="26" rx="22" ry="28" fill="url(#sho-glow)" />
      {/* Phone outer frame */}
      <rect x="17" y="3" width="30" height="58" rx="7" stroke="url(#sho-g)" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Screen area */}
      <rect x="20" y="9" width="24" height="42" rx="3" stroke="url(#sho-g)" strokeWidth="0.6" fill="none" opacity="0.25" />
      {/* Camera notch */}
      <circle cx="32" cy="6.5" r="1.5" fill="url(#sho-g)" opacity="0.55" />
      {/* Home indicator */}
      <rect x="26" y="55" width="12" height="3" rx="1.5" fill="url(#sho-g)" opacity="0.5" />
      {/* Play button */}
      <polygon points="27,23 27,37 40,30" fill="url(#sho-g)" opacity="0.95" />
      {/* Specular on play */}
      <polygon points="27,23 27,27 31,25" fill="white" opacity="0.2" />
      {/* Progress bar */}
      <rect x="21" y="46" width="22" height="1.5" rx="0.75" fill="url(#sho-g)" opacity="0.2" />
      <rect x="21" y="46" width="13" height="1.5" rx="0.75" fill="url(#sho-g)" opacity="0.8" />
      {/* Side buttons */}
      <rect x="14" y="20" width="3" height="9" rx="1.5" fill="url(#sho-g)" opacity="0.4" />
      <rect x="47" y="18" width="3" height="6" rx="1.5" fill="url(#sho-g)" opacity="0.4" />
      <rect x="47" y="26" width="3" height="6" rx="1.5" fill="url(#sho-g)" opacity="0.4" />
      {/* Speed lines — fast motion */}
      <line x1="4" y1="18" x2="13" y2="20" stroke="url(#sho-g)" strokeWidth="0.75" opacity="0.3" />
      <line x1="4" y1="22" x2="11" y2="23" stroke="url(#sho-g)" strokeWidth="0.5" opacity="0.2" />
      <line x1="4" y1="26" x2="13" y2="27" stroke="url(#sho-g)" strokeWidth="0.75" opacity="0.3" />
    </svg>
  );
}

// ── WizAnimate — Rose/coral 3D character animation ────────────────────────────
export function WizAnimateEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ani-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9f1239" />
          <stop offset="30%" stopColor="#f43f5e" />
          <stop offset="55%" stopColor="#fb7185" />
          <stop offset="75%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <radialGradient id="ani-glow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#fb923c" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Ambient glow */}
      <ellipse cx="32" cy="30" rx="26" ry="24" fill="url(#ani-glow)" />
      {/* Isometric cube — top face */}
      <polygon
        points="32,5 53,17 32,29 11,17"
        stroke="url(#ani-g)" strokeWidth="1.5" fill="url(#ani-g)" fillOpacity="0.1" opacity="0.75"
      />
      {/* Left face */}
      <polygon
        points="11,17 32,29 32,51 11,39"
        stroke="url(#ani-g)" strokeWidth="1.5" fill="url(#ani-g)" fillOpacity="0.05" opacity="0.5"
      />
      {/* Right face */}
      <polygon
        points="53,17 32,29 32,51 53,39"
        stroke="url(#ani-g)" strokeWidth="1.5" fill="url(#ani-g)" fillOpacity="0.08" opacity="0.6"
      />
      {/* Top face highlight edge */}
      <line x1="32" y1="5" x2="53" y2="17" stroke="url(#ani-g)" strokeWidth="2" opacity="0.5" />
      {/* Centre specular */}
      <circle cx="32" cy="29" r="2.5" fill="#fb7185" opacity="0.95" />
      {/* Motion trail lines */}
      <line x1="3" y1="29" x2="9" y2="29" stroke="url(#ani-g)" strokeWidth="1.2" opacity="0.4" />
      <line x1="3" y1="25" x2="7" y2="25" stroke="url(#ani-g)" strokeWidth="0.8" opacity="0.25" />
      <line x1="3" y1="33" x2="7" y2="33" stroke="url(#ani-g)" strokeWidth="0.8" opacity="0.25" />
      {/* Sparkle stars */}
      <circle cx="56" cy="9" r="1.5" fill="#fb7185" opacity="0.7" />
      <circle cx="59" cy="15" r="1" fill="#fb923c" opacity="0.5" />
      <circle cx="54" cy="5" r="1" fill="#fb7185" opacity="0.5" />
      {/* Bottom label line */}
      <line x1="19" y1="57" x2="45" y2="57" stroke="url(#ani-g)" strokeWidth="0.75" opacity="0.3" />
    </svg>
  );
}

// ── WizScript — Orange/gold storyboard script ─────────────────────────────────
export function WizScriptEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="scr-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="30%" stopColor="#d97706" />
          <stop offset="55%" stopColor="#fbbf24" />
          <stop offset="75%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <radialGradient id="scr-glow" cx="35%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d97706" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Ambient glow */}
      <ellipse cx="28" cy="32" rx="24" ry="26" fill="url(#scr-glow)" />
      {/* Script page */}
      <rect x="8" y="5" width="36" height="50" rx="4" stroke="url(#scr-g)" strokeWidth="1.5" fill="none" opacity="0.45" />
      {/* Page fold corner */}
      <path d="M44 5 L44 13 L52 13" stroke="url(#scr-g)" strokeWidth="1" fill="none" opacity="0.3" />
      <path d="M44 5 L52 13" stroke="url(#scr-g)" strokeWidth="0.75" fill="none" opacity="0.2" />
      {/* Scene number box */}
      <rect x="12" y="10" width="11" height="9" rx="2" stroke="url(#scr-g)" strokeWidth="1" fill="none" opacity="0.55" />
      <text x="17.5" y="17.5" textAnchor="middle" fill="#fbbf24" fontSize="5.5" fontWeight="bold" opacity="0.8">1</text>
      {/* Script lines */}
      {[13, 20, 27, 34, 41].map((y, i) => (
        <line
          key={i}
          x1={i === 0 ? 26 : 14}
          y1={y}
          x2={i === 1 || i === 3 ? 36 : 40}
          y2={y}
          stroke="url(#scr-g)"
          strokeWidth={i === 0 ? 1.5 : 1}
          opacity={i === 0 ? 0.8 : 0.35}
        />
      ))}
      {/* Arrow — script to scene */}
      <path
        d="M48 28 L58 28 M54 24 L58 28 L54 32"
        stroke="url(#scr-g)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* Mini scene frames */}
      <rect x="50" y="16" width="10" height="7" rx="1.5" stroke="url(#scr-g)" strokeWidth="0.75" fill="none" opacity="0.4" />
      <rect x="50" y="36" width="10" height="7" rx="1.5" stroke="url(#scr-g)" strokeWidth="0.75" fill="none" opacity="0.4" />
      {/* Specular on title line */}
      <circle cx="40" cy="13" r="1.5" fill="#fbbf24" opacity="0.75" />
    </svg>
  );
}
