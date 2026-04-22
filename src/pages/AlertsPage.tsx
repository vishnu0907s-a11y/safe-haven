import { Bell, CheckCircle2, Clock, AlertTriangle, MapPin, Navigation, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { useRealtimeAlerts } from "@/hooks/use-emergency-alert";
import { useLiveTelemetry } from "@/hooks/use-live-telemetry";
import { getDistanceKm, getEta } from "@/lib/map-utils";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const telemetry = useLiveTelemetry();
  const { alerts: activeAlerts, acceptAlert, cancelAcceptance } = useRealtimeAlerts();
  const [pastAlerts, setPastAlerts] = useState<PastAlert[]>([]);

  const userPos: [number, number] | null = telemetry.latitude && telemetry.longitude 
    ? [telemetry.latitude, telemetry.longitude] 
    : null;

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
              const dist = userPos ? getDistanceKm(userPos[0], userPos[1], alert.latitude, alert.longitude) : null;
              
              return (
                <div key={alert.id} className="p-4 rounded-xl bg-card/80 backdrop-blur-lg border border-destructive/20 space-y-3 glow-destructive animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-destructive/10 text-destructive border border-destructive/20 glow-destructive">
                        {alert.profiles?.full_name?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-destructive truncate">{alert.profiles?.full_name || t("emergencyAlert")}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(alert.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-semibold shrink-0">{accepted.length}/10</span>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 text-xs mt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
                      </div>
                      {dist !== null && (
                        <span className="text-accent font-medium text-right shrink-0">
                          {dist.toFixed(1)} km ({getEta(dist)})
                        </span>
                      )}
                    </div>
                  </div>

                  {alert.profiles?.phone && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 mt-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t("victimDetails")}</p>
                      <a href={`tel:${alert.profiles.phone}`} className="text-xs text-primary font-semibold hover:underline">{alert.profiles.phone}</a>
                    </div>
                  )}

                  {hasAccepted ? (
                    <div className="flex gap-2">
                      <button onClick={() => navigate("/map", { state: { trackingAlertId: alert.id, showAlerts: true } })} className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg bg-accent/10 text-accent text-xs font-medium border border-accent/20 active:scale-[0.98]">
                        <Navigation className="w-4 h-4" /> {t("acceptedNavigate")}
                      </button>
                      <button onClick={() => cancelAcceptance(alert.id)} className="px-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20 active:scale-[0.98]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={async () => {
                        await acceptAlert(alert.id);
                        navigate("/map", { state: { trackingAlertId: alert.id, showAlerts: true } });
                      }} 
                      disabled={accepted.length >= 10} 
                      className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98] disabled:opacity-50 glow-primary"
                    >
                      {t("acceptRespond")}
                    </button>
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
