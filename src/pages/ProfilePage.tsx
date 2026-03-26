import { useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, LogOut, ChevronRight, HelpCircle, Shield, Bell, Bus, Moon, Sun } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const menuItems = [
    { icon: Bell, label: "Emergency Contacts", desc: "Manage your emergency contacts", path: "/emergency-contacts" },
    { icon: Shield, label: "Verification Status", desc: user.verification_status === "verified" ? "Documents verified" : "Verification pending" },
    { icon: HelpCircle, label: "Support & Concierge", desc: "Get help and support" },
  ];

  return (
    <div className="px-4 space-y-4">
      {/* Info row */}
      <div className="glass-card rounded-2xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="label-caps mb-1">Email Registry</p>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium truncate">{user.email}</p>
            </div>
          </div>
          <div>
            <p className="label-caps mb-1">Phone Line</p>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">{user.phone || "Not set"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Location info */}
      <div className="glass-card rounded-2xl p-5 space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        <div>
          <p className="label-caps mb-2">Fleet Association</p>
          <div className="flex items-center justify-between">
            <p className="text-base font-bold">{user.city || "Not assigned"}</p>
            <Bus className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        <div className="h-px bg-border" />
        <div>
          <p className="label-caps mb-2">Role Assignment</p>
          <div className="flex items-center justify-between">
            <p className="text-base font-bold capitalize">{user.role}</p>
            <MapPin className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Theme toggle */}
      <div className="glass-card rounded-2xl p-5 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            <div>
              <p className="text-sm font-semibold">Dark Mode</p>
              <p className="text-[10px] text-muted-foreground">Toggle app theme</p>
            </div>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggle} />
        </div>
      </div>

      {/* Diagnostics & settings */}
      <div className="glass-card rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
        <p className="label-caps mb-1">Diagnostics & Settings</p>
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => item.path && navigate(item.path)}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-secondary/50 border border-border/40 hover:border-primary/30 transition-all active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <item.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}

        {/* Status badges */}
        <div className="flex items-center gap-2 pt-2">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border",
            user.verification_status === "verified"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-amber-500/30 bg-amber-500/10 text-amber-400"
          )}>
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              user.verification_status === "verified" ? "bg-emerald-400" : "bg-amber-400"
            )} />
            {user.verification_status === "verified" ? "VERIFIED" : "PENDING"}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border border-blue-500/30 bg-blue-500/10 text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            GPS RELAY
          </div>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors active:scale-[0.98] animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300 font-bold text-sm"
      >
        <LogOut className="w-4 h-4" />
        SIGN OUT
      </button>
    </div>
  );
}
