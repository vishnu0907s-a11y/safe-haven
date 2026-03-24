import { MapPin, Phone, Shield, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSendEmergencyAlert, useRealtimeAlerts } from "@/hooks/use-emergency-alert";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const { sendAlert, cancelAlert, sending, activeAlert } = useSendEmergencyAlert();
  const { alerts, acceptAlert } = useRealtimeAlerts();

  if (!user) return null;

  const isResponder = ["driver", "police", "protector"].includes(user.role);

  return (
    <div className="px-4 space-y-4">
      {/* User profile card */}
      <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-card border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
          {user.full_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{user.full_name}</p>
          <p className="text-xs text-muted-foreground capitalize">{user.role} • {user.city}</p>
        </div>
        <div className={cn(
          "text-[10px] font-semibold px-2.5 py-1 rounded-full",
          user.verification_status === "verified"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        )}>
          {user.verification_status === "verified" ? "Verified" : "Pending"}
        </div>
      </div>

      {/* Women user: Emergency button */}
      {user.role === "women" && (
        <div className="rounded-2xl bg-card border shadow-sm p-5 text-center animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Alert Signal</p>
          </div>

          {activeAlert ? (
            <div className="space-y-3">
              <div className="w-36 h-36 mx-auto rounded-full flex items-center justify-center bg-emerald-500 text-white animate-in zoom-in-75 duration-300">
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle2 className="w-7 h-7" />
                  <span className="text-sm font-bold">Alert Active</span>
                  <span className="text-[10px]">{activeAlert.accepted_by?.length || 0} responders</span>
                </div>
              </div>
              <button
                onClick={cancelAlert}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted text-muted-foreground text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" /> Cancel Alert
              </button>
            </div>
          ) : (
            <button
              onClick={sendAlert}
              disabled={sending}
              className={cn(
                "relative w-36 h-36 mx-auto rounded-full flex items-center justify-center",
                "bg-gradient-to-b from-red-500 to-red-700 text-white shadow-xl shadow-red-500/30",
                "hover:shadow-2xl hover:shadow-red-500/40 transition-all duration-200",
                "active:scale-95 disabled:opacity-60",
                "after:absolute after:inset-0 after:rounded-full after:border-4 after:border-red-400/30 after:animate-ping"
              )}
            >
              <div className="flex flex-col items-center gap-1 z-10">
                <MapPin className="w-7 h-7" />
                <span className="text-lg font-black tracking-wide">
                  {sending ? "SENDING..." : "HELP ME"}
                </span>
              </div>
            </button>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            Press the button to send emergency alert with your GPS location
          </p>
        </div>
      )}

      {/* Responder: Incoming alerts */}
      {isResponder && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h2 className="text-sm font-semibold">Active Emergency Alerts</h2>
            {alerts.length > 0 && (
              <span className="text-[10px] font-bold bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
                {alerts.length}
              </span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="p-6 rounded-xl bg-card border text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active emergencies</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const accepted = alert.accepted_by || [];
              const hasAccepted = accepted.includes(user.user_id);
              return (
                <div key={alert.id} className="p-4 rounded-xl bg-card border border-destructive/20 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-destructive">🚨 Emergency Alert</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                      {accepted.length}/10 accepted
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
                  </div>
                  {hasAccepted ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      You accepted — navigate to victim
                    </div>
                  ) : (
                    <button
                      onClick={() => acceptAlert(alert.id)}
                      disabled={accepted.length >= 10}
                      className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors active:scale-[0.98] disabled:opacity-50"
                    >
                      Accept & Respond
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

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
    </div>
  );
}
