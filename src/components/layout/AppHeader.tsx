import { Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import resqherLogo from "@/assets/resqher-logo.png";

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 glass-card border-b border-border/40">
      <div className="flex items-center gap-3">
        <img src={resqherLogo} alt="ResQHer" width={56} height={56} className="drop-shadow-md" />
        <div>
          <h1 className="text-base font-extrabold tracking-tight">
            <span className="text-destructive">Res</span>
            <span className="text-primary">Q</span>
            <span className="text-destructive">Her</span>
          </h1>
          {user && (
            <p className="label-caps mt-0.5">{user.role} Portal</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button className="p-2 rounded-full hover:bg-secondary transition-colors active:scale-95 relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>
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
