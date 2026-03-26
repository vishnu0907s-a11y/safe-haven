import { Home, Map, Bell, Heart, User, LayoutDashboard, Users, BarChart3, Trophy } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const womenNav: NavItem[] = [
  { icon: Home, label: "HOME", path: "/dashboard" },
  { icon: Map, label: "MAP", path: "/map" },
  { icon: Bell, label: "ALERTS", path: "/alerts" },
  { icon: Heart, label: "SAFETY", path: "/safety" },
  { icon: User, label: "PROFILE", path: "/profile" },
];

const responderNav: NavItem[] = [
  { icon: Home, label: "HOME", path: "/dashboard" },
  { icon: Map, label: "MAP", path: "/map" },
  { icon: Trophy, label: "POINTS", path: "/points" },
  { icon: Bell, label: "ALERTS", path: "/alerts" },
  { icon: User, label: "PROFILE", path: "/profile" },
];

const adminNav: NavItem[] = [
  { icon: LayoutDashboard, label: "DASHBOARD", path: "/admin" },
  { icon: Users, label: "USERS", path: "/admin/users" },
  { icon: Bell, label: "ALERTS", path: "/admin/alerts" },
  { icon: BarChart3, label: "ANALYTICS", path: "/admin/analytics" },
  { icon: User, label: "PROFILE", path: "/profile" },
];

export function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items = user?.role === "admin"
    ? adminNav
    : user?.role === "women"
    ? womenNav
    : responderNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/40 safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
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
              <span className={cn("text-[9px] font-bold tracking-[0.1em]", active && "text-primary")}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
