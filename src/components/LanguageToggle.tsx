import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

export function LanguageToggle({ compact }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div className={cn(
      "flex items-center rounded-full border border-border/60 overflow-hidden",
      compact ? "text-[9px]" : "text-xs"
    )}>
      <button
        onClick={() => setLang("en")}
        className={cn(
          "px-2 py-1 font-bold transition-colors",
          compact ? "px-1.5 py-0.5" : "px-2.5 py-1",
          lang === "en"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:text-foreground"
        )}
      >
        {t("english")}
      </button>
      <button
        onClick={() => setLang("ta")}
        className={cn(
          "px-2 py-1 font-bold transition-colors",
          compact ? "px-1.5 py-0.5" : "px-2.5 py-1",
          lang === "ta"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:text-foreground"
        )}
      >
        {t("tamil")}
      </button>
    </div>
  );
}
