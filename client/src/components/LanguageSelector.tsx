import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/lib/i18n";
import { ChevronDown } from "@/lib/icons";

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ||
    LANGUAGES.find((l) => i18n.language.startsWith(l.code.split("-")[0])) ||
    LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all text-sm text-white/80 hover:text-white"
        aria-label="Select language"
      >
        <span className="text-base leading-none">{currentLang.flag}</span>
        <span className="font-medium hidden sm:inline">{currentLang.shortName}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-background border border-white/10 shadow-2xl shadow-black/50 overflow-hidden z-50">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/10 ${
                currentLang.code === lang.code
                  ? "bg-[--color-gold]/15 text-[--color-gold]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
              {currentLang.code === lang.code && (
                <span className="ml-auto text-[--color-gold] text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
