import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Shield, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { LanguageToggle } from "@/components/LanguageToggle";
import resqherLogo from "@/assets/resqher-logo.png";
import welcomeIllustration from "@/assets/welcome-illustration.png";

export default function WelcomePage() {
  const [phase, setPhase] = useState<"splash" | "welcome">("splash");
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate(50);
    const timer = setTimeout(() => setPhase("welcome"), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (phase === "splash") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center splash-bg">
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-700">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[hsl(0,70%,50%)] opacity-20 blur-3xl animate-pulse scale-150" />
            <img
              src={resqherLogo}
              alt="ResQHer Logo"
              width={160}
              height={160}
              className="relative z-10 drop-shadow-2xl logo-pulse"
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-3xl font-black tracking-tight text-white">
              Res<span className="text-[hsl(43,96%,56%)]">Q</span>Her
            </h1>
            <p className="text-white/60 text-xs tracking-widest uppercase font-semibold">
              {t("tagline")}
            </p>
          </div>
          <div className="mt-8">
            <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between px-6 py-10 max-w-lg mx-auto w-full animate-in fade-in duration-700">
      <div className="flex flex-col items-center gap-2 pt-4">
        <div className="flex items-center justify-between w-full">
          <div />
          <LanguageToggle />
        </div>
        <img src={resqherLogo} alt="ResQHer" width={88} height={88} className="drop-shadow-lg" />
        <h1 className="text-2xl font-black tracking-tight">
          <span className="text-destructive">Res</span>
          <span className="text-primary">Q</span>
          <span className="text-destructive">Her</span>
        </h1>
      </div>

      <div className="flex-1 flex items-center justify-center py-6">
        <img
          src={welcomeIllustration}
          alt="Woman with safety features"
          width={280}
          height={280}
          className="drop-shadow-md"
        />
      </div>

      <div className="w-full space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">{t("welcomeTo")}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t("tagline")}</p>
        </div>

        <div className="flex justify-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("sos")}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("tracking")}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(145,63%,42%)]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[hsl(145,63%,42%)]" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("protection")}</span>
          </div>
        </div>

        <button
          onClick={() => navigate("/login")}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] shadow-lg"
          style={{
            background: "linear-gradient(135deg, hsl(0,70%,45%), hsl(0,72%,51%), hsl(43,96%,46%))",
          }}
        >
          {t("getStarted")}
        </button>

        <p className="text-center text-[11px] text-muted-foreground">{t("protectedBy")}</p>
      </div>
    </div>
  );
}
