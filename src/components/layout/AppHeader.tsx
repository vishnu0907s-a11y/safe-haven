import { Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ProfileActionsMenu } from "@/components/ProfileActionsMenu";
import { NotificationsPopover } from "@/components/NotificationsPopover";
import { cn } from "@/lib/utils";
import resqherLogo from "@/assets/logo.png";

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-2 sm:px-4 py-2.5 sm:py-3.5 bg-transparent backdrop-blur-md border-b border-transparent">
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        <div className="p-0.5 sm:p-1 rounded-2xl bg-black glow-primary shrink-0">
          <img src={resqherLogo} alt="ResQHer" className="w-10 sm:w-14 h-auto rounded-xl" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-black tracking-tight truncate leading-tight">
            <span className="text-[#cbd5e1]">Res</span>
            <span className="text-[#a855f7]">QHer</span>
          </h1>
          {user && (
            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-muted-foreground mt-0.5 truncate">
              {t(`${user.role}Portal` as any)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <LanguageToggle compact />
        
        <NotificationsPopover />
        <button
          onClick={toggle}
          className="p-1.5 sm:p-3 rounded-full hover:bg-primary/10 transition-all active:scale-90 group"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-hover:text-primary" /> : <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-hover:text-primary" />}
        </button>
        <ProfileActionsMenu />
      </div>
    </header>
  );
}
