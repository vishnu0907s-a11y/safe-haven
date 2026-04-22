import { Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { LanguageToggle } from "@/components/LanguageToggle";
import resqherLogo from "@/assets/logo.png";

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-3 py-2.5 glass-card border-b border-border/40">
      <div className="flex items-center gap-2 min-w-0">
        <img src={resqherLogo} alt="ResQHer" className="w-12 h-auto rounded-xl shrink-0" />
        <div className="min-w-0">
          <h1 className="text-sm font-extrabold tracking-tight truncate">
            <span className="text-[#cbd5e1]">Res</span>
            <span className="text-[#a855f7]">QHer</span>
          </h1>
          {user && (
            <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5 truncate">{user.role} Portal</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <LanguageToggle compact />
        {user?.role !== "admin" && (
          <button className="p-2 rounded-full hover:bg-secondary transition-colors active:scale-95 relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </button>
        )}
        <button
          onClick={toggle}
          className="p-2 rounded-full hover:bg-secondary transition-colors active:scale-95"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-muted-foreground" />}
        </button>
      </div>
    </header>
  );
}
