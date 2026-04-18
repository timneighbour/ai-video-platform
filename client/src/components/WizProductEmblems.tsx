/**
 * WizProductEmblems — Custom premium SVG emblems for each WIZ AI product.
 * Each emblem is a self-contained SVG that uses the luxury gold/silver metallic
 * gradient system to match the WIZ AI logo material style.
 */

// ── Shared gradient defs reused across all emblems ──────────────────────────
const GOLD_ID = "wiz-gold-g";
const SILVER_ID = "wiz-silver-g";
const GOLD_GLOW_ID = "wiz-gold-glow";
const SILVER_GLOW_ID = "wiz-silver-glow";

function SharedDefs() {
  return (
    <defs>
      {/* Brushed metallic gold — matches logo */}
      <linearGradient id={GOLD_ID} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4a3010" />
        <stop offset="15%" stopColor="#7a5820" />
        <stop offset="35%" stopColor="#b8892a" />
        <stop offset="50%" stopColor="#e8c878" />
        <stop offset="57%" stopColor="#f2dfa0" />
        <stop offset="65%" stopColor="#d4aa48" />
        <stop offset="80%" stopColor="#9a7228" />
        <stop offset="100%" stopColor="#4a3010" />
      </linearGradient>
      {/* Polished silver — matches logo */}
      <linearGradient id={SILVER_ID} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2e2e36" />
        <stop offset="15%" stopColor="#5a5a68" />
        <stop offset="35%" stopColor="#9090a0" />
        <stop offset="50%" stopColor="#e4e4ec" />
        <stop offset="57%" stopColor="#f4f4f8" />
        <stop offset="65%" stopColor="#c0c0cc" />
        <stop offset="80%" stopColor="#7a7a8a" />
        <stop offset="100%" stopColor="#2e2e36" />
      </linearGradient>
      {/* Gold ambient glow filter */}
      <filter id={GOLD_GLOW_ID} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      {/* Silver ambient glow filter */}
      <filter id={SILVER_GLOW_ID} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  );
}

// ── WizAudio — Premium waveform / studio sound ────────────────────────────────
export function WizAudioEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />
      {/* Outer ring */}
      <circle cx="32" cy="32" r="30" stroke={`url(#${GOLD_ID})`} strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Inner ring */}
      <circle cx="32" cy="32" r="22" stroke={`url(#${GOLD_ID})`} strokeWidth="0.75" fill="none" opacity="0.2" />
      {/* Waveform bars — varying heights for audio feel */}
      {[
        { x: 12, h: 10, y: 27 },
        { x: 16, h: 18, y: 23 },
        { x: 20, h: 28, y: 18 },
        { x: 24, h: 36, y: 14 },
        { x: 28, h: 40, y: 12 },
        { x: 32, h: 44, y: 10 },
        { x: 36, h: 38, y: 13 },
        { x: 40, h: 30, y: 17 },
        { x: 44, h: 20, y: 22 },
        { x: 48, h: 12, y: 26 },
        { x: 52, h: 8,  y: 28 },
      ].map((bar, i) => (
        <rect
          key={i}
          x={bar.x - 1.5}
          y={bar.y}
          width="3"
          height={bar.h}
          rx="1.5"
          fill={`url(#${GOLD_ID})`}
          opacity={0.7 + (i === 5 ? 0.3 : 0)}
        />
      ))}
      {/* Centre specular dot */}
      <circle cx="32" cy="32" r="3" fill={`url(#${GOLD_ID})`} opacity="0.9" />
    </svg>
  );
}

// ── WizImage — Luxury image grid / aperture ───────────────────────────────────
export function WizImageEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />
      {/* Outer frame */}
      <rect x="4" y="4" width="56" height="56" rx="10" stroke={`url(#${GOLD_ID})`} strokeWidth="1.5" fill="none" opacity="0.35" />
      {/* Inner frame */}
      <rect x="10" y="10" width="44" height="44" rx="7" stroke={`url(#${GOLD_ID})`} strokeWidth="0.75" fill="none" opacity="0.2" />
      {/* Aperture blades — 6-blade camera iris */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 32 + Math.cos(rad) * 10;
        const cy = 32 + Math.sin(rad) * 10;
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx="6"
            ry="3"
            transform={`rotate(${angle + 30}, ${cx}, ${cy})`}
            fill={`url(#${GOLD_ID})`}
            opacity="0.55"
          />
        );
      })}
      {/* Centre lens */}
      <circle cx="32" cy="32" r="7" stroke={`url(#${GOLD_ID})`} strokeWidth="1.5" fill="none" opacity="0.8" />
      <circle cx="32" cy="32" r="3.5" fill={`url(#${GOLD_ID})`} opacity="0.95" />
      {/* Corner stars */}
      {[[14, 14], [50, 14], [14, 50], [50, 50]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill={`url(#${GOLD_ID})`} opacity="0.5" />
      ))}
    </svg>
  );
}

// ── WizVideo — Cinematic frame / storyboard strip ─────────────────────────────
export function WizVideoEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />
      {/* Film frame outer */}
      <rect x="4" y="12" width="56" height="40" rx="5" stroke={`url(#${GOLD_ID})`} strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Film sprocket holes — left */}
      {[17, 25, 33, 41, 49].map((y, i) => (
        <rect key={`l${i}`} x="6" y={y} width="5" height="4" rx="1" fill={`url(#${GOLD_ID})`} opacity="0.5" />
      ))}
      {/* Film sprocket holes — right */}
      {[17, 25, 33, 41, 49].map((y, i) => (
        <rect key={`r${i}`} x="53" y={y} width="5" height="4" rx="1" fill={`url(#${GOLD_ID})`} opacity="0.5" />
      ))}
      {/* Scene dividers */}
      <line x1="16" y1="14" x2="16" y2="50" stroke={`url(#${GOLD_ID})`} strokeWidth="0.75" opacity="0.3" />
      <line x1="32" y1="14" x2="32" y2="50" stroke={`url(#${GOLD_ID})`} strokeWidth="0.75" opacity="0.3" />
      <line x1="48" y1="14" x2="48" y2="50" stroke={`url(#${GOLD_ID})`} strokeWidth="0.75" opacity="0.3" />
      {/* Play triangle — centre scene */}
      <polygon
        points="27,26 27,38 39,32"
        fill={`url(#${GOLD_ID})`}
        opacity="0.9"
      />
      {/* Horizon lines in side scenes */}
      <line x1="18" y1="35" x2="30" y2="35" stroke={`url(#${GOLD_ID})`} strokeWidth="1" opacity="0.3" />
      <line x1="34" y1="35" x2="46" y2="35" stroke={`url(#${GOLD_ID})`} strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

// ── WizShorts — Vertical phone frame / short-form ─────────────────────────────
export function WizShortsEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />
      {/* Phone outer frame */}
      <rect x="18" y="4" width="28" height="56" rx="7" stroke={`url(#${GOLD_ID})`} strokeWidth="1.5" fill="none" opacity="0.45" />
      {/* Screen area */}
      <rect x="21" y="10" width="22" height="38" rx="3" stroke={`url(#${GOLD_ID})`} strokeWidth="0.75" fill="none" opacity="0.25" />
      {/* Home indicator */}
      <rect x="27" y="52" width="10" height="3" rx="1.5" fill={`url(#${GOLD_ID})`} opacity="0.5" />
      {/* Camera notch */}
      <circle cx="32" cy="7.5" r="1.5" fill={`url(#${GOLD_ID})`} opacity="0.5" />
      {/* Play button */}
      <polygon points="27,24 27,36 39,30" fill={`url(#${GOLD_ID})`} opacity="0.9" />
      {/* TikTok-style progress bar */}
      <rect x="22" y="44" width="20" height="1.5" rx="0.75" fill={`url(#${GOLD_ID})`} opacity="0.2" />
      <rect x="22" y="44" width="12" height="1.5" rx="0.75" fill={`url(#${GOLD_ID})`} opacity="0.7" />
      {/* Side buttons */}
      <rect x="15" y="22" width="3" height="8" rx="1.5" fill={`url(#${GOLD_ID})`} opacity="0.35" />
      <rect x="46" y="20" width="3" height="6" rx="1.5" fill={`url(#${GOLD_ID})`} opacity="0.35" />
      <rect x="46" y="28" width="3" height="6" rx="1.5" fill={`url(#${GOLD_ID})`} opacity="0.35" />
    </svg>
  );
}

// ── WizAnimate — Stylised 3D animation frame ──────────────────────────────────
export function WizAnimateEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />
      {/* 3D cube — isometric perspective */}
      {/* Top face */}
      <polygon
        points="32,6 52,17 32,28 12,17"
        stroke={`url(#${GOLD_ID})`}
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      {/* Left face */}
      <polygon
        points="12,17 32,28 32,50 12,39"
        stroke={`url(#${GOLD_ID})`}
        strokeWidth="1.5"
        fill="none"
        opacity="0.4"
      />
      {/* Right face */}
      <polygon
        points="52,17 32,28 32,50 52,39"
        stroke={`url(#${GOLD_ID})`}
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
      {/* Top face fill — subtle */}
      <polygon
        points="32,6 52,17 32,28 12,17"
        fill={`url(#${GOLD_ID})`}
        opacity="0.08"
      />
      {/* Right face fill */}
      <polygon
        points="52,17 32,28 32,50 52,39"
        fill={`url(#${GOLD_ID})`}
        opacity="0.12"
      />
      {/* Centre specular */}
      <circle cx="32" cy="28" r="2.5" fill={`url(#${GOLD_ID})`} opacity="0.9" />
      {/* Motion lines */}
      <line x1="4" y1="32" x2="10" y2="32" stroke={`url(#${GOLD_ID})`} strokeWidth="1" opacity="0.3" />
      <line x1="4" y1="28" x2="8" y2="28" stroke={`url(#${GOLD_ID})`} strokeWidth="0.75" opacity="0.2" />
      <line x1="4" y1="36" x2="8" y2="36" stroke={`url(#${GOLD_ID})`} strokeWidth="0.75" opacity="0.2" />
      {/* Stars */}
      <circle cx="56" cy="10" r="1.5" fill={`url(#${GOLD_ID})`} opacity="0.6" />
      <circle cx="58" cy="16" r="1" fill={`url(#${GOLD_ID})`} opacity="0.4" />
      <circle cx="54" cy="6" r="1" fill={`url(#${GOLD_ID})`} opacity="0.4" />
      {/* Bottom label line */}
      <line x1="20" y1="56" x2="44" y2="56" stroke={`url(#${GOLD_ID})`} strokeWidth="0.75" opacity="0.25" />
    </svg>
  );
}

// ── WizScript — Script-to-scene storyboard ────────────────────────────────────
export function WizScriptEmblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <SharedDefs />
      {/* Script page */}
      <rect x="10" y="6" width="36" height="48" rx="4" stroke={`url(#${GOLD_ID})`} strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Page curl shadow */}
      <path d="M46 46 L46 54 L38 54 Q46 54 46 46Z" stroke={`url(#${GOLD_ID})`} strokeWidth="1" fill="none" opacity="0.25" />
      {/* Script lines */}
      {[14, 20, 26, 32, 38].map((y, i) => (
        <line
          key={i}
          x1="16"
          y1={y}
          x2={i === 1 || i === 3 ? 36 : 40}
          y2={y}
          stroke={`url(#${GOLD_ID})`}
          strokeWidth="1.5"
          opacity={i === 0 ? 0.8 : 0.4}
        />
      ))}
      {/* Scene number box */}
      <rect x="14" y="10" width="10" height="8" rx="2" stroke={`url(#${GOLD_ID})`} strokeWidth="1" fill="none" opacity="0.5" />
      <text x="19" y="17" textAnchor="middle" fill="url(#wiz-gold-g)" fontSize="5" fontWeight="bold" opacity="0.7">1</text>
      {/* Arrow — script to scene */}
      <path
        d="M50 32 L58 32 M54 28 L58 32 L54 36"
        stroke={`url(#${GOLD_ID})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {/* Mini scene frame */}
      <rect x="52" y="20" width="8" height="6" rx="1.5" stroke={`url(#${GOLD_ID})`} strokeWidth="0.75" fill="none" opacity="0.35" />
      <rect x="52" y="38" width="8" height="6" rx="1.5" stroke={`url(#${GOLD_ID})`} strokeWidth="0.75" fill="none" opacity="0.35" />
      {/* Specular on title line */}
      <circle cx="40" cy="14" r="1.5" fill={`url(#${GOLD_ID})`} opacity="0.7" />
    </svg>
  );
}
