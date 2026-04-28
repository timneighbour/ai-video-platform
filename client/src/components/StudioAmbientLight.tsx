/**
 * StudioAmbientLight — Ambient lighting dimmer for all studio pages.
 * Renders a compact dimmer knob/slider in the top-right corner.
 * The `brightness` value (0–100) is passed back via `onChange`.
 */
import { useState, useCallback } from "react";
import { Sun, Moon } from "@/lib/icons";

interface Props {
  value: number;          // 0–100
  onChange: (v: number) => void;
  accentColor?: string;   // hex or CSS colour — defaults to gold
  className?: string;
}

export default function StudioAmbientLight({
  value,
  onChange,
  accentColor = "#c9a84c",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") onChange(Math.min(100, value + 5));
      if (e.key === "ArrowDown") onChange(Math.max(10, value - 5));
    },
    [value, onChange]
  );

  return (
    <div className={`relative flex items-center gap-1.5 select-none ${className}`}>
      {/* Dimmer label pill */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Adjust ambient lighting"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all duration-200 hover:opacity-90"
        style={{
          background: "rgba(0,0,0,0.55)",
          border: `1px solid ${accentColor}33`,
          backdropFilter: "blur(8px)",
        }}
      >
        {value < 40 ? (
          <Moon className="w-3 h-3" style={{ color: accentColor }} />
        ) : (
          <Sun className="w-3 h-3" style={{ color: accentColor }} />
        )}
        <span
          className="text-[10px] font-bold tracking-[1.5px] uppercase font-mono"
          style={{ color: accentColor }}
        >
          Ambience
        </span>
        <span
          className="text-[10px] font-mono ml-0.5"
          style={{ color: `${accentColor}99` }}
        >
          {value}%
        </span>
      </button>

      {/* Slider popover */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl p-4 flex flex-col gap-3 shadow-2xl"
          style={{
            background: "rgba(8,6,18,0.95)",
            border: `1px solid ${accentColor}33`,
            backdropFilter: "blur(16px)",
            width: 200,
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[9px] font-bold tracking-[2px] uppercase font-mono"
              style={{ color: `${accentColor}88` }}
            >
              Studio Lighting
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-white/30 hover:text-white/60 text-xs"
            >
              ✕
            </button>
          </div>

          {/* Gradient track */}
          <div className="relative flex items-center h-6">
            <div
              className="absolute inset-y-0 left-0 right-0 rounded-full"
              style={{
                background: `linear-gradient(to right, rgba(0,0,0,0.8), ${accentColor}66)`,
                height: 6,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              onKeyDown={handleKey}
              className="w-full h-6 cursor-pointer relative z-10"
              style={{
                appearance: "none",
                background: "transparent",
                // thumb styles via CSS variable trick
              }}
            />
          </div>

          {/* Preset buttons */}
          <div className="flex gap-1.5">
            {[
              { label: "Dark", v: 20 },
              { label: "Moody", v: 45 },
              { label: "Bright", v: 80 },
            ].map(({ label, v }) => (
              <button
                key={label}
                onClick={() => onChange(v)}
                className="flex-1 py-1 rounded text-[9px] font-bold tracking-[1px] uppercase transition-all"
                style={{
                  background:
                    Math.abs(value - v) < 15
                      ? `${accentColor}22`
                      : "rgba(255,255,255,0.04)",
                  border: `1px solid ${
                    Math.abs(value - v) < 15 ? accentColor : "rgba(255,255,255,0.08)"
                  }`,
                  color:
                    Math.abs(value - v) < 15 ? accentColor : "rgba(255,255,255,0.35)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
