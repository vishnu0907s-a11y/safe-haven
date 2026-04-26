import { Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ProfileActionsMenu } from "@/components/ProfileActionsMenu";
import { cn } from "@/lib/utils";
import resqherLogo from "@/assets/logo.png";

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3.5 bg-transparent backdrop-blur-md border-b border-transparent">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-1 rounded-2xl bg-black glow-primary">
          <img src={resqherLogo} alt="ResQHer" className="w-14 h-auto rounded-xl shrink-0" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-black tracking-tight truncate leading-tight">
            <span className="text-[#cbd5e1]">Res</span>
            <span className="text-[#a855f7]">QHer</span>
          </h1>
          {user && (
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-0.5 truncate">
              {t(`${user.role}Portal` as any)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <LanguageToggle compact />
        
        {user?.role !== "admin" && (
          <button className="p-3 rounded-full hover:bg-primary/10 transition-all active:scale-90 relative group">
            <Bell className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-primary rounded-full glow-primary" />
          </button>
        )}
        <button
          onClick={toggle}
          className="p-3 rounded-full hover:bg-primary/10 transition-all active:scale-90 group"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon className="w-6 h-6 text-muted-foreground group-hover:text-primary" /> : <Sun className="w-6 h-6 text-muted-foreground group-hover:text-primary" />}
        </button>
        <ProfileActionsMenu />
      </div>
    </header>
  );
}
