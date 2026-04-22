import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

export function LanguageToggle({ compact }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div className={cn(
      "flex items-center rounded-full bg-[#1A1A1A] p-1 border border-white/5 shadow-lg overflow-hidden",
      compact ? "text-[10px]" : "text-xs"
    )}>
      <button
        onClick={() => setLang("en")}
        className={cn(
          "px-4 py-1.5 font-black transition-all rounded-full uppercase tracking-wider",
          lang === "en"
            ? "bg-[#6D28D9] text-white shadow-lg"
            : "text-gray-500 hover:text-gray-300"
        )}
      >
        ENG
      </button>
      <button
        onClick={() => setLang("ta")}
        className={cn(
          "px-4 py-1.5 font-black transition-all rounded-full tracking-wider",
          lang === "ta"
            ? "bg-[#6D28D9] text-white shadow-lg"
            : "text-gray-500 hover:text-gray-300"
        )}
      >
        தமிழ்
      </button>
    </div>
  );
}

