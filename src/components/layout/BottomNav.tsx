import { Home, Map, Bell, Heart, User, LayoutDashboard, Users, BarChart3, Trophy, Video } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  labelKey: string;
  path: string;
}

const womenNav: NavItem[] = [
  { icon: Home, labelKey: "home", path: "/dashboard" },
  { icon: Map, labelKey: "map", path: "/map" },
  { icon: Video, labelKey: "record", path: "/record" },
  { icon: Heart, labelKey: "safety", path: "/safety" },
  { icon: User, labelKey: "profile", path: "/profile" },
];

const responderNav: NavItem[] = [
  { icon: Home, labelKey: "home", path: "/dashboard" },
  { icon: Map, labelKey: "map", path: "/map" },
  { icon: Trophy, labelKey: "points", path: "/points" },
  { icon: Bell, labelKey: "alerts", path: "/alerts" },
  { icon: User, labelKey: "profile", path: "/profile" },
];

const adminNav: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "dashboard", path: "/admin" },
  { icon: Users, labelKey: "users", path: "/admin/users" },
  { icon: Bell, labelKey: "alerts", path: "/admin/alerts" },
  { icon: BarChart3, labelKey: "analytics", path: "/admin/analytics" },
  { icon: User, labelKey: "profile", path: "/profile" },
];

interface BottomNavProps {
  floating?: boolean;
}

export function BottomNav({ floating }: BottomNavProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const items = user?.role === "admin"
    ? adminNav
    : user?.role === "women"
    ? womenNav
    : responderNav;

  return (
    <nav className={cn(
      "fixed z-50",
      floating
        ? "bottom-5 left-5 right-5 bg-background/80 backdrop-blur-xl rounded-2xl border border-border/30 shadow-xl"
        : "bottom-0 left-0 right-0 glass-card border-t border-border/40 safe-area-bottom"
    )}>
      <div className={cn("flex items-center justify-around py-2 px-2", !floating && "max-w-lg mx-auto")}>
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all active:scale-95",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", active && "stroke-[2.5px]")} />
              <span className={cn("text-[9px] font-bold tracking-[0.1em]", active && "text-primary")}>
                {t(item.labelKey as any)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
