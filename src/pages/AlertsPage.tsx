import { Bell, CheckCircle2, Clock, AlertTriangle, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { useRealtimeAlerts } from "@/hooks/use-emergency-alert";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PastAlert {
  id: string;
  status: string;
  created_at: string;
  latitude: number;
  longitude: number;
  accepted_by: string[] | null;
}

export default function AlertsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { alerts: activeAlerts, acceptAlert } = useRealtimeAlerts();
  const [pastAlerts, setPastAlerts] = useState<PastAlert[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchPast = async () => {
      const query = user.role === "women"
        ? supabase.from("emergency_alerts").select("*").eq("user_id", user.user_id).neq("status", "active").order("created_at", { ascending: false }).limit(20)
        : supabase.from("emergency_alerts").select("*").neq("status", "active").order("created_at", { ascending: false }).limit(20);
      const { data } = await query;
      if (data) setPastAlerts(data);
    };
    fetchPast();
  }, [user]);

  const isResponder = user && ["driver", "police", "protector", "admin"].includes(user.role);

  return (
    <div className="px-4 space-y-4">
      {isResponder && activeAlerts.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h2 className="label-caps px-1 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            {t("liveEmergencies")}
          </h2>
          <div className="space-y-2">
            {activeAlerts.map((alert) => {
              const accepted = alert.accepted_by || [];
              const hasAccepted = user ? accepted.includes(user.user_id) : false;
              return (
                <div key={alert.id} className="glass-card p-4 rounded-2xl border-destructive/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <span className="text-sm font-bold">{t("emergency")}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
                    <span className="ml-auto">{accepted.length}/10 {t("responders")}</span>
                  </div>
                  {!hasAccepted && user?.role !== "admin" && (
                    <button
                      onClick={() => acceptAlert(alert.id)}
                      className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold active:scale-[0.98]"
                    >
                      {t("acceptRespond")}
                    </button>
                  )}
                  {hasAccepted && (
                    <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {t("accepted")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        <h2 className="label-caps px-1 mb-3">{t("alertHistory")}</h2>
        {pastAlerts.length === 0 ? (
          <div className="glass-card p-6 rounded-2xl text-center">
            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t("noPastAlerts")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pastAlerts.map((alert, i) => (
              <div
                key={alert.id}
                className="glass-card flex items-start gap-3 p-4 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-500"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center mt-0.5",
                  alert.status === "resolved" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                )}>
                  {alert.status === "resolved" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold capitalize">{alert.status}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {(alert.accepted_by || []).length} {t("responders")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
