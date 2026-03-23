import { Shield, Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-md border-b">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight leading-none">SAFE GUARD</h1>
          {user && (
            <p className="text-[11px] text-muted-foreground capitalize">{user.role} Portal</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={toggle}
          className="p-2 rounded-full hover:bg-secondary transition-colors active:scale-95"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
        </button>
        <button className="p-2 rounded-full hover:bg-secondary transition-colors active:scale-95 relative">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>
      </div>
    </header>
  );
}
