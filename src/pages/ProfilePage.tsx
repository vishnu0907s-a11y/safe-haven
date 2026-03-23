import { useNavigate } from "react-router-dom";
import { Mail, Phone, MapPin, LogOut, ChevronRight, HelpCircle, Shield, UserCircle, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const menuItems = [
    { icon: Bell, label: "Emergency Contacts", desc: "Manage your emergency contacts" },
    { icon: Shield, label: "Verification Status", desc: user.verified ? "Documents verified" : "Verification pending" },
    { icon: HelpCircle, label: "Support & Concierge", desc: "Get help and support" },
  ];

  return (
    <div className="px-4 space-y-4">
      {/* Profile card */}
      <div className="flex flex-col items-center p-6 rounded-2xl bg-card border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
          <UserCircle className="w-12 h-12" />
        </div>
        <h2 className="text-lg font-bold">{user.name}</h2>
        <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
        <div className={cn(
          "text-[10px] font-semibold px-2.5 py-1 rounded-full mt-2",
          user.verified
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        )}>
          {user.verified ? "Verified" : "Pending Verification"}
        </div>
      </div>

      {/* Info row */}
      <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        {[
          { icon: Mail, value: user.email, label: "Email" },
          { icon: Phone, value: user.phone, label: "Phone" },
          { icon: MapPin, value: user.city, label: "City" },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center p-3 rounded-xl bg-card border text-center">
            <item.icon className="w-4 h-4 text-muted-foreground mb-1" />
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
            <p className="text-[11px] font-medium truncate w-full">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Menu items */}
      <div className="space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border hover:shadow-sm transition-all active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
              <item.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/5 transition-colors active:scale-[0.98] animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300"
      >
        <LogOut className="w-4 h-4" />
        <span className="text-sm font-medium">Sign Out</span>
      </button>
    </div>
  );
}
