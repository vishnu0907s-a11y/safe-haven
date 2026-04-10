import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { LanguageToggle } from "@/components/LanguageToggle";

const safetyQuotes = [
  "Every woman deserves to walk freely without fear.",
  "Your safety is not a privilege — it's a right.",
  "One tap can save a life. Stay protected.",
  "Be bold, be brave, be safe — always.",
  "Together we can make every street safer.",
];

export default function WelcomePage() {
  const [phase, setPhase] = useState<"splash" | "welcome">("splash");
  const [quoteIdx, setQuoteIdx] = useState(0);
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate(50);
    const timer = setTimeout(() => setPhase("welcome"), 2800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== "splash") return;
    const interval = setInterval(() => {
      setQuoteIdx((i) => (i + 1) % safetyQuotes.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === "splash") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center splash-bg">
        <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-700 px-8">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-white">
              Res<span className="text-primary">Q</span>Her
            </h1>
            <p className="text-white/40 text-xs tracking-widest uppercase font-semibold">
              {t("tagline")}
            </p>
          </div>
          <p className="text-white/70 text-sm text-center max-w-[260px] leading-relaxed italic animate-in fade-in duration-500" key={quoteIdx}>
            "{safetyQuotes[quoteIdx]}"
          </p>
          <div className="mt-4">
            <div className="w-7 h-7 border-[2.5px] border-white/20 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between px-6 py-10 max-w-lg mx-auto w-full animate-in fade-in duration-700">
      <div className="flex items-center justify-between w-full">
        <div />
        <LanguageToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-10">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-black tracking-tight">
          Res<span className="text-primary">Q</span>Her
        </h1>
        <p className="text-muted-foreground text-sm text-center max-w-[280px] leading-relaxed">
          {t("tagline")}
        </p>
        <div className="bg-primary/5 border border-primary/10 rounded-2xl px-5 py-4 max-w-[300px]">
          <p className="text-sm text-center text-foreground/80 italic leading-relaxed">
            "Every woman has the right to feel safe — anytime, anywhere."
          </p>
        </div>
      </div>

      <div className="w-full space-y-4">
        <button
          onClick={() => navigate("/login")}
          className="w-full py-4 rounded-2xl font-bold text-base text-primary-foreground bg-primary hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm"
        >
          {t("getStarted")}
        </button>
        <p className="text-center text-[11px] text-muted-foreground">{t("protectedBy")}</p>
      </div>
    </div>
  );
}
