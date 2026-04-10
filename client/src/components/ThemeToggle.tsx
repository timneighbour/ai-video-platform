import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme, switchable } = useTheme();

  if (!switchable || !toggleTheme) return null;

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        "flex items-center justify-center w-9 h-9 rounded-lg transition-all",
        "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
        theme === "dark"
          ? "text-white/60 hover:text-white hover:bg-white/10"
          : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/60",
      ].join(" ")}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4" aria-hidden="true" />
      )}
    </button>
  );
}
