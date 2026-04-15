import { MapPin, Shield, AlertTriangle, CheckCircle2, X, Clock, LogIn, LogOut, Gauge, ShieldCheck, Star, MessageSquare } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { useSendEmergencyAlert, useRealtimeAlerts } from "@/hooks/use-emergency-alert";
import { useAttendance } from "@/hooks/use-attendance";
import { useLiveTelemetry } from "@/hooks/use-live-telemetry";
import { useEmergencyContacts } from "@/hooks/use-emergency-contacts";
import { useResolveAlert } from "@/hooks/use-rescue-records";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

function TelemetryCard() {
  const telemetry = useLiveTelemetry();
  const { t } = useI18n();

  return (
    <div className="rounded-xl bg-card/80 backdrop-blur-lg border glow-border p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="label-caps">{t("liveTelemetry")}</p>
        <div className={cn("w-2 h-2 rounded-full", telemetry.signalStatus === "connected" ? "bg-accent glow-accent" : "bg-destructive animate-pulse")} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-primary">{telemetry.speed}</span>
        <span className="text-xs text-muted-foreground">KM/H</span>
      </div>
    </div>
  );
}

function AttendanceCard() {
  const { activeShift, checkIn, checkOut, isEligible } = useAttendance();
  const { t } = useI18n();
  if (!isEligible) return null;

  return (
    <div className="rounded-xl bg-card/80 backdrop-blur-lg border glow-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <p className="label-caps">{t("attendance")}</p>
      </div>
      {activeShift ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-accent">{t("onDuty")}</p>
              <p className="text-[10px] text-muted-foreground">{t("since")} {new Date(activeShift.checked_in_at).toLocaleTimeString()}</p>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse glow-accent" />
          </div>
          <button onClick={checkOut} className="w-full py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold border border-destructive/20 flex items-center justify-center gap-2 active:scale-[0.98]">
            <LogOut className="w-4 h-4" /> {t("checkOut")}
          </button>
        </div>
      ) : (
        <button onClick={checkIn} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98] flex items-center justify-center gap-2 glow-primary">
          <LogIn className="w-4 h-4" /> {t("checkInStartDuty")}
        </button>
      )}
    </div>
  );
}

interface ResponderInfo { user_id: string; full_name: string; role: string; }

function RescueCompleteDialog({ responders, alertId, open, onClose }: { responders: ResponderInfo[]; alertId: string; open: boolean; onClose: () => void; }) {
  const { rateResponder } = useResolveAlert();
  const { t } = useI18n();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    for (const r of responders) {
      const { data: records } = await supabase.from("rescue_records").select("id").eq("alert_id", alertId).eq("responder_id", r.user_id).limit(1);
      if (records && records.length > 0) {
        await rateResponder(records[0].id, ratings[r.user_id] || 5, feedbacks[r.user_id] || undefined);
      }
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            {submitted ? t("thankYou") : t("rescueCompleted")}
          </DialogTitle>
          <DialogDescription>{submitted ? t("feedbackSubmitted") : t("rateResponders")}</DialogDescription>
        </DialogHeader>
        {submitted ? (
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold glow-primary">{t("done")}</button>
        ) : (
          <div className="space-y-4">
            {responders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">{t("noRespondersToRate")}</p>
            ) : responders.map((r) => (
              <div key={r.user_id} className="p-3 rounded-xl bg-secondary/50 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{r.full_name.charAt(0)}</div>
                  <div>
                    <p className="text-sm font-medium">{r.full_name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{r.role}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setRatings((p) => ({ ...p, [r.user_id]: s }))} className="p-0.5 active:scale-90">
                      <Star className={cn("w-5 h-5", s <= (ratings[r.user_id] || 0) ? "text-warning fill-warning" : "text-muted-foreground")} />
                    </button>
                  ))}
                </div>
                <textarea placeholder={t("writeFeedback")} value={feedbacks[r.user_id] || ""} onChange={(e) => setFeedbacks((p) => ({ ...p, [r.user_id]: e.target.value }))} className="w-full text-sm bg-background border border-border rounded-lg p-2 h-14 resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            ))}
            <button onClick={handleSubmit} disabled={submitting} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60 glow-primary">
              {submitting ? t("submitting") : t("submitRatings")}
            </button>
            <button onClick={onClose} className="w-full py-1.5 text-xs text-muted-foreground">{t("skipForNow")}</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { sendAlert, cancelAlert, sending, activeAlert } = useSendEmergencyAlert();
  const { alerts, acceptAlert } = useRealtimeAlerts();
  const { contacts, sendWhatsAppAlerts } = useEmergencyContacts();
  const { resolveAlert } = useResolveAlert();
  const [showFeedback, setShowFeedback] = useState(false);
  const [resolvedResponders, setResolvedResponders] = useState<ResponderInfo[]>([]);
  const [resolvedAlertId, setResolvedAlertId] = useState("");
  const [sosProgress, setSosProgress] = useState(0);
  const [sosHolding, setSosHolding] = useState(false);
  const sosStartRef = useRef<number>(0);
  const sosAnimRef = useRef<number>(0);

  if (!user) return null;
  const isResponder = ["driver", "police", "protector"].includes(user.role);

  const triggerSOS = async () => {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      await sendAlert();
      sendWhatsAppAlerts(position.coords.latitude, position.coords.longitude);
    } catch {
      await sendAlert();
    }
  };

  const handleSOSStart = () => {
    setSosHolding(true);
    sosStartRef.current = Date.now();
    const animate = () => {
      const progress = Math.min((Date.now() - sosStartRef.current) / 1000, 1);
      setSosProgress(progress);
      if (progress >= 1) { setSosHolding(false); setSosProgress(0); triggerSOS(); return; }
      sosAnimRef.current = requestAnimationFrame(animate);
    };
    sosAnimRef.current = requestAnimationFrame(animate);
  };

  const handleSOSEnd = () => { setSosHolding(false); setSosProgress(0); if (sosAnimRef.current) cancelAnimationFrame(sosAnimRef.current); };

  const handleSafeNow = async () => {
    if (!activeAlert) return;
    const responderIds = activeAlert.accepted_by || [];
    let responderInfos: ResponderInfo[] = [];
    if (responderIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", responderIds);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", responderIds);
      responderInfos = (profiles || []).map((p) => ({ user_id: p.user_id, full_name: p.full_name, role: roles?.find((r) => r.user_id === p.user_id)?.role || "responder" }));
    }
    setResolvedResponders(responderInfos);
    setResolvedAlertId(activeAlert.id);
    await resolveAlert(activeAlert.id, responderIds);
    cancelAlert();
    setShowFeedback(true);
  };

  return (
    <div className="px-4 space-y-4">
      <RescueCompleteDialog responders={resolvedResponders} alertId={resolvedAlertId} open={showFeedback} onClose={() => setShowFeedback(false)} />

      {/* Profile card */}
      <div className="rounded-xl bg-card/80 backdrop-blur-lg border glow-border p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg glow-primary">{user.full_name.charAt(0)}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{user.full_name}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{user.role} • {user.city}</p>
        </div>
        <span className={cn("text-[9px] font-semibold px-2 py-1 rounded-full", user.verification_status === "verified" ? "bg-accent/10 text-accent glow-accent" : "bg-warning/10 text-warning")}>
          {user.verification_status === "verified" ? t("verified") : t("pending")}
        </span>
      </div>

      {isResponder && <TelemetryCard />}
      <AttendanceCard />

      {/* SOS Section — Women — NO card wrapper, just the button with glow */}
      {user.role === "women" && (
        <div className="text-center py-4">
          <p className="label-caps mb-4">{t("alertSignal")}</p>

          {activeAlert ? (
            <div className="space-y-3">
              <div className="w-28 h-28 mx-auto rounded-full bg-accent/10 border-2 border-accent flex flex-col items-center justify-center glow-accent">
                <CheckCircle2 className="w-6 h-6 text-accent" />
                <span className="text-xs font-semibold text-accent mt-1">{t("alertActive")}</span>
                <span className="text-[9px] text-muted-foreground">{activeAlert.accepted_by?.length || 0} {t("responders")}</span>
              </div>
              <button onClick={handleSafeNow} className="w-full py-3 rounded-xl bg-accent text-accent-foreground text-sm font-semibold active:scale-[0.98] flex items-center justify-center gap-2 glow-accent">
                <ShieldCheck className="w-5 h-5" /> {t("imSafeNow")}
              </button>
              <button onClick={() => cancelAlert()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium">
                <X className="w-3 h-3" /> {t("cancelAlert")}
              </button>
            </div>
          ) : (
            <div>
              {/* SOS button with glow — no card box behind it */}
              <div className="relative w-36 h-36 mx-auto">
                {/* Outer glow ring */}
                <div className="absolute inset-[-16px] rounded-full bg-destructive/8 animate-pulse-ring" />
                <div className="absolute inset-[-8px] rounded-full bg-destructive/5 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />

                {/* Progress ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 144 144">
                  <circle cx="72" cy="72" r="68" fill="none" stroke="hsl(var(--destructive) / 0.1)" strokeWidth="3" />
                  <circle cx="72" cy="72" r="68" fill="none" stroke="hsl(var(--destructive))" strokeWidth="3"
                    strokeDasharray={`${sosProgress * 427} 427`} strokeLinecap="round" className="transition-none" />
                </svg>

                <button
                  onMouseDown={handleSOSStart} onMouseUp={handleSOSEnd} onMouseLeave={handleSOSEnd}
                  onTouchStart={handleSOSStart} onTouchEnd={handleSOSEnd} onTouchCancel={handleSOSEnd}
                  disabled={sending}
                  className={cn(
                    "absolute inset-2 rounded-full flex flex-col items-center justify-center z-10",
                    "bg-destructive text-destructive-foreground select-none animate-sos-glow",
                    sosHolding ? "scale-95" : "hover:scale-[1.02]",
                    "transition-transform duration-150 disabled:opacity-60"
                  )}
                >
                  <Shield className="w-7 h-7 mb-1" />
                  <span className="text-base font-black tracking-wide">
                    {sending ? t("sending") : "HELP ME"}
                  </span>
                  <span className="text-[8px] font-medium opacity-70 mt-0.5">Hold 1 sec</span>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-4">{t("pressToSend")}</p>
            </div>
          )}
        </div>
      )}

      {/* Responder: Incoming alerts */}
      {isResponder && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <p className="label-caps">{t("activeEmergencyAlerts")}</p>
            {alerts.length > 0 && <span className="text-[9px] font-semibold bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full glow-destructive">{alerts.length}</span>}
          </div>
          {alerts.length === 0 ? (
            <div className="p-6 rounded-xl bg-card/80 backdrop-blur-lg border glow-border text-center">
              <CheckCircle2 className="w-7 h-7 text-accent mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("noActiveEmergencies")}</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const accepted = alert.accepted_by || [];
              const hasAccepted = accepted.includes(user.user_id);
              return (
                <div key={alert.id} className="p-4 rounded-xl bg-card/80 backdrop-blur-lg border border-destructive/20 space-y-3 glow-destructive">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-destructive">🚨 {t("emergencyAlert")}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(alert.created_at).toLocaleString()}</p>
                    </div>
                    <span className="text-[9px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-semibold">{accepted.length}/10</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
                  </div>
                  {hasAccepted ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/10 text-accent text-xs font-medium border border-accent/20">
                      <CheckCircle2 className="w-4 h-4" /> {t("acceptedNavigate")}
                    </div>
                  ) : (
                    <button onClick={() => acceptAlert(alert.id)} disabled={accepted.length >= 10} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98] disabled:opacity-50 glow-primary">
                      {t("acceptRespond")}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="flex items-center gap-3 p-3.5 rounded-xl bg-card/80 backdrop-blur-lg border glow-border active:scale-[0.97] transition-transform">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center glow-primary"><MapPin className="w-4 h-4 text-primary" /></div>
          <div className="text-left">
            <p className="text-sm font-medium">{t("liveMap")}</p>
            <p className="text-[10px] text-muted-foreground">{t("trackLocation")}</p>
          </div>
        </button>
        <button className="flex items-center gap-3 p-3.5 rounded-xl bg-card/80 backdrop-blur-lg border glow-border active:scale-[0.97] transition-transform">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center glow-accent"><Shield className="w-4 h-4 text-accent" /></div>
          <div className="text-left">
            <p className="text-sm font-medium">{t("safeZone")}</p>
            <p className="text-[10px] text-muted-foreground">{t("nearbyShelters")}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
