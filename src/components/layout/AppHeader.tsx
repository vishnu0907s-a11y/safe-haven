import { Shield, Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 glass-card border-b border-border/40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold tracking-tight text-primary">SAFE</span>
            <span className="text-[11px] font-bold tracking-wider px-2 py-0.5 rounded-md border border-border bg-secondary text-foreground">GUARD</span>
          </div>
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
