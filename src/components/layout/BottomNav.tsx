import { Home, Map, Bell, Heart, User, LayoutDashboard, Users, BarChart3 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const userNav: NavItem[] = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Map, label: "Map", path: "/map" },
  { icon: Bell, label: "Alerts", path: "/alerts" },
  { icon: Heart, label: "Safety", path: "/safety" },
  { icon: User, label: "Profile", path: "/profile" },
];

const adminNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Bell, label: "Alerts", path: "/admin/alerts" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items = user?.role === "admin" ? adminNav : userNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-t safe-area-bottom">
      <div className="flex items-center justify-around py-1.5 px-2 max-w-lg mx-auto">
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all active:scale-95",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", active && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
