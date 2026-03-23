import { useState } from "react";
import { MapPin, Phone, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const [alertSent, setAlertSent] = useState(false);
  const [pressing, setPressing] = useState(false);

  const handleEmergency = () => {
    setAlertSent(true);
    setTimeout(() => setAlertSent(false), 5000);
  };

  if (!user) return null;

  return (
    <div className="px-4 space-y-4">
      {/* User profile card */}
      <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-card border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
          {user.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{user.role} • {user.city}</p>
        </div>
        <div className={cn(
          "text-[10px] font-semibold px-2.5 py-1 rounded-full",
          user.verified
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        )}>
          {user.verified ? "Verified" : "Pending"}
        </div>
      </div>

      {/* Emergency section */}
      <div className="rounded-2xl bg-card border shadow-sm p-5 text-center animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        <div className="flex items-center justify-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Alert Signal</p>
        </div>

        {!alertSent ? (
          <button
            onMouseDown={() => setPressing(true)}
            onMouseUp={() => setPressing(false)}
            onMouseLeave={() => setPressing(false)}
            onTouchStart={() => setPressing(true)}
            onTouchEnd={() => setPressing(false)}
            onClick={handleEmergency}
            className={cn(
              "relative w-36 h-36 mx-auto rounded-full flex items-center justify-center",
              "bg-gradient-to-b from-red-500 to-red-700 text-white shadow-xl shadow-red-500/30",
              "hover:shadow-2xl hover:shadow-red-500/40 transition-all duration-200",
              pressing ? "scale-95" : "scale-100",
              "after:absolute after:inset-0 after:rounded-full after:border-4 after:border-red-400/30 after:animate-ping"
            )}
          >
            <div className="flex flex-col items-center gap-1 z-10">
              <MapPin className="w-7 h-7" />
              <span className="text-lg font-black tracking-wide">HELP ME</span>
            </div>
          </button>
        ) : (
          <div className="w-36 h-36 mx-auto rounded-full flex items-center justify-center bg-emerald-500 text-white animate-in zoom-in-75 duration-300">
            <div className="flex flex-col items-center gap-1">
              <CheckCircle2 className="w-7 h-7" />
              <span className="text-sm font-bold">Alert Sent!</span>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Press the button to send emergency alert to nearby responders
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
        <button className="flex items-center gap-3 p-4 rounded-xl bg-card border hover:shadow-md transition-all active:scale-[0.97]">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">SOS Call</p>
            <p className="text-[10px] text-muted-foreground">Emergency dial</p>
          </div>
        </button>
        <button className="flex items-center gap-3 p-4 rounded-xl bg-card border hover:shadow-md transition-all active:scale-[0.97]">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">Safe Zone</p>
            <p className="text-[10px] text-muted-foreground">Nearby shelters</p>
          </div>
        </button>
      </div>

      {/* Recent alerts */}
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300">
        <h2 className="text-sm font-semibold mb-3 px-1">Recent Activity</h2>
        <div className="space-y-2">
          {[
            { status: "resolved", text: "Emergency alert resolved", time: "2 hours ago" },
            { status: "active", text: "Location shared with contacts", time: "5 hours ago" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border">
              <div className={cn(
                "w-2 h-2 rounded-full",
                item.status === "resolved" ? "bg-emerald-500" : "bg-amber-500"
              )} />
              <div className="flex-1">
                <p className="text-sm">{item.text}</p>
                <p className="text-[10px] text-muted-foreground">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
