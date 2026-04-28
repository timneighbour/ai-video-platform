/**
 * StudioStageFlow — Horizontal stage progress bar for all studio pages.
 * Shows numbered stages with labels, current stage highlighted, completed stages ticked.
 */
import { Check } from "@/lib/icons";

export interface Stage {
  id: string;
  label: string;
  icon?: string; // emoji shorthand
}

interface Props {
  stages: Stage[];
  currentStage: string;
  accentColor?: string;
  onStageClick?: (id: string) => void; // optional — allow clicking completed stages
  className?: string;
}

export default function StudioStageFlow({
  stages,
  currentStage,
  accentColor = "#c9a84c",
  onStageClick,
  className = "",
}: Props) {
  const currentIdx = stages.findIndex((s) => s.id === currentStage);

  return (
    <div
      className={`flex items-center gap-0 w-full overflow-x-auto ${className}`}
      style={{ scrollbarWidth: "none" }}
    >
      {stages.map((stage, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isAccessible = idx <= currentIdx;

        return (
          <div key={stage.id} className="flex items-center flex-1 min-w-0">
            {/* Stage pill */}
            <button
              disabled={!isAccessible || !onStageClick}
              onClick={() => isAccessible && onStageClick?.(stage.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 w-full min-w-0"
              style={{
                background: isCurrent
                  ? `${accentColor}18`
                  : isCompleted
                  ? "rgba(48,209,88,0.08)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  isCurrent
                    ? accentColor
                    : isCompleted
                    ? "#30d15844"
                    : "rgba(255,255,255,0.07)"
                }`,
                boxShadow: isCurrent
                  ? `0 0 12px ${accentColor}22, inset 0 0 8px ${accentColor}08`
                  : "none",
                cursor: isAccessible && onStageClick ? "pointer" : "default",
              }}
            >
              {/* Number / check */}
              <div
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: isCurrent
                    ? accentColor
                    : isCompleted
                    ? "#30d158"
                    : "rgba(255,255,255,0.08)",
                  color: isCurrent || isCompleted ? "#000" : "rgba(255,255,255,0.25)",
                  boxShadow: isCurrent ? `0 0 8px ${accentColor}88` : "none",
                }}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
              </div>

              {/* Label */}
              <div className="flex flex-col min-w-0">
                {stage.icon && (
                  <span className="text-[11px] leading-none mb-0.5">{stage.icon}</span>
                )}
                <span
                  className="text-[10px] font-bold tracking-[0.5px] truncate"
                  style={{
                    color: isCurrent
                      ? accentColor
                      : isCompleted
                      ? "#30d158"
                      : "rgba(255,255,255,0.25)",
                  }}
                >
                  {stage.label}
                </span>
              </div>
            </button>

            {/* Connector line */}
            {idx < stages.length - 1 && (
              <div
                className="h-[1px] flex-shrink-0 w-4 mx-0.5"
                style={{
                  background: isCompleted
                    ? "#30d15855"
                    : "rgba(255,255,255,0.06)",
                  transition: "background 0.4s",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
