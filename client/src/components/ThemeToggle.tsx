import { Sun, Moon } from "@/lib/icons";
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
        "focus:outline-none focus:ring-2 focus:ring-[--color-gold]/50",
        theme === "dark"
          ? "text-white/60 hover:text-white hover:bg-white/10"
          : "text-muted-foreground/70 hover:text-muted-foreground/30 hover:bg-zinc-200/60",
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
