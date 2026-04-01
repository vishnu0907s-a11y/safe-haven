import { MapPin, Shield, AlertTriangle, CheckCircle2, X, Clock, LogIn, LogOut, Gauge, ShieldCheck, Star, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useSendEmergencyAlert, useRealtimeAlerts } from "@/hooks/use-emergency-alert";
import { useAttendance } from "@/hooks/use-attendance";
import { useLiveTelemetry } from "@/hooks/use-live-telemetry";
import { useEmergencyContacts } from "@/hooks/use-emergency-contacts";
import { useResolveAlert } from "@/hooks/use-rescue-records";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function TelemetryCard() {
  const telemetry = useLiveTelemetry();

  const signalColor =
    telemetry.signalStatus === "connected"
      ? "text-emerald-400"
      : telemetry.signalStatus === "weak"
      ? "text-amber-400"
      : "text-destructive";

  const signalLabel =
    telemetry.signalStatus === "connected"
      ? "SIGNAL ACTIVE"
      : telemetry.signalStatus === "weak"
      ? "WEAK SIGNAL"
      : "SIGNAL LOST";

  return (
    <div className="glass-card rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150">
      <div className="flex items-center justify-between mb-3">
        <p className="label-caps text-emerald-400">Live Telemetry</p>
        <p className="label-caps text-muted-foreground">Ground Speed</p>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full", telemetry.signalStatus === "connected" ? "bg-emerald-400" : telemetry.signalStatus === "weak" ? "bg-amber-400 animate-pulse" : "bg-destructive animate-pulse")} />
          <span className={cn("text-sm font-bold", signalColor)}>{signalLabel}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-primary">{telemetry.speed}</span>
          <span className="text-xs font-bold text-muted-foreground">KM/H</span>
        </div>
      </div>
      <div className="mt-3 glass-card rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
          <Gauge className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="label-caps text-emerald-400/70">Efficiency Status</p>
          <p className="text-sm font-bold text-emerald-400">
            {telemetry.speed > 0 ? "Route Active" : "Optimal Route Flow Predicted"}
          </p>
        </div>
      </div>
    </div>
  );
}

function AttendanceCard() {
  const { activeShift, checkIn, checkOut, isEligible } = useAttendance();
  if (!isEligible) return null;

  return (
    <div className="glass-card rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <p className="label-caps">Attendance</p>
      </div>
      {activeShift ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-400">On Duty</p>
              <p className="text-[10px] text-muted-foreground">
                Since {new Date(activeShift.checked_in_at).toLocaleTimeString()}
              </p>
            </div>
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <button
            onClick={checkOut}
            className="w-full py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold border border-destructive/20 hover:bg-destructive/20 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Check Out
          </button>
        </div>
      ) : (
        <button
          onClick={checkIn}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          Check In — Start Duty
        </button>
      )}
    </div>
  );
}

interface ResponderInfo {
  user_id: string;
  full_name: string;
  role: string;
}

function RescueCompleteScreen({
  responders,
  alertId,
  onClose,
}: {
  responders: ResponderInfo[];
  alertId: string;
  onClose: () => void;
}) {
  const { rateResponder } = useResolveAlert();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    for (const r of responders) {
      const { data: records } = await supabase
        .from("rescue_records")
        .select("id")
        .eq("alert_id", alertId)
        .eq("responder_id", r.user_id)
        .limit(1);

      if (records && records.length > 0) {
        const rating = ratings[r.user_id] || 5;
        const feedback = feedbacks[r.user_id] || undefined;
        await rateResponder(records[0].id, rating, feedback);
      }
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="glass-card rounded-2xl p-6 w-full max-w-sm text-center animate-in zoom-in-95 duration-200 space-y-4">
          <ShieldCheck className="w-14 h-14 text-emerald-400 mx-auto" />
          <p className="text-xl font-black">Thank You!</p>
          <p className="text-sm text-muted-foreground">Your feedback has been submitted.</p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.98] transition-transform"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card rounded-2xl p-5 w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
          <p className="text-lg font-black">Rescue Completed</p>
          <p className="text-xs text-muted-foreground mt-1">Rate the responders who helped you</p>
        </div>

        {responders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center">No responders to rate.</p>
        ) : (
          <div className="space-y-3">
            {responders.map((r) => (
              <div key={r.user_id} className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-sm border border-primary/20">
                    {r.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{r.full_name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{r.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setRatings((prev) => ({ ...prev, [r.user_id]: s }))}
                      className="p-0.5 transition-transform active:scale-90"
                    >
                      <Star
                        className={cn(
                          "w-6 h-6 transition-colors",
                          s <= (ratings[r.user_id] || 0)
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Write feedback (optional)..."
                  value={feedbacks[r.user_id] || ""}
                  onChange={(e) => setFeedbacks((prev) => ({ ...prev, [r.user_id]: e.target.value }))}
                  className="w-full text-sm bg-secondary/50 border border-border/40 rounded-xl p-3 h-16 resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-black hover:bg-primary/90 transition-colors active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit Ratings"}
        </button>
        <button
          onClick={onClose}
          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { sendAlert, cancelAlert, sending, activeAlert } = useSendEmergencyAlert();
  const { alerts, acceptAlert } = useRealtimeAlerts();
  const { sendWhatsAppAlerts } = useEmergencyContacts();
  const { resolveAlert } = useResolveAlert();
  const [showFeedback, setShowFeedback] = useState(false);
  const [resolvedResponders, setResolvedResponders] = useState<ResponderInfo[]>([]);
  const [resolvedAlertId, setResolvedAlertId] = useState("");

  if (!user) return null;

  const isResponder = ["driver", "police", "protector"].includes(user.role);

  // One-tap WhatsApp-only emergency (no calls, no confirmation)
  const handleSOS = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      const { latitude, longitude } = position.coords;

      // Send alert to database
      await sendAlert();

      // Send WhatsApp messages only — no phone calls
      sendWhatsAppAlerts(latitude, longitude);
    } catch {
      // If location fails, still send alert
      await sendAlert();
    }
  };

  const handleSafeNow = async () => {
    if (!activeAlert) return;
    const responderIds = activeAlert.accepted_by || [];

    let responderInfos: ResponderInfo[] = [];
    if (responderIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", responderIds);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", responderIds);

      responderInfos = (profiles || []).map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        role: roles?.find((r) => r.user_id === p.user_id)?.role || "responder",
      }));
    }

    setResolvedResponders(responderInfos);
    setResolvedAlertId(activeAlert.id);
    await resolveAlert(activeAlert.id, responderIds);
    cancelAlert();
    setShowFeedback(true);
  };

  return (
    <div className="px-4 space-y-4">
      {showFeedback && (
        <RescueCompleteScreen
          responders={resolvedResponders}
          alertId={resolvedAlertId}
          onClose={() => setShowFeedback(false)}
        />
      )}

      {/* User profile card */}
      <div className="glass-card rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-primary font-black text-lg">
            {user.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground truncate">{user.full_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="label-caps">{user.role}</span>
              <span className="text-muted-foreground text-[10px]">•</span>
              <span className="text-[10px] text-muted-foreground">{user.city}</span>
            </div>
          </div>
          <div className={cn(
            "text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
            user.verification_status === "verified"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
          )}>
            {user.verification_status === "verified" ? "Verified" : "Pending"}
          </div>
        </div>
      </div>

      {/* Telemetry for responders */}
      {isResponder && <TelemetryCard />}

      {/* Attendance for non-women */}
      <AttendanceCard />

      {/* Women user: Emergency button + Safe Now */}
      {user.role === "women" && (
        <div className="glass-card rounded-2xl p-6 text-center animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <p className="label-caps">Alert Signal</p>
          </div>

          {activeAlert ? (
            <div className="space-y-3 mt-4">
              <div className="w-36 h-36 mx-auto rounded-full flex items-center justify-center bg-emerald-500 text-white animate-in zoom-in-75 duration-300 gold-glow">
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle2 className="w-7 h-7" />
                  <span className="text-sm font-bold">Alert Active</span>
                  <span className="text-[10px]">{activeAlert.accepted_by?.length || 0} responders</span>
                </div>
              </div>

              <button
                onClick={handleSafeNow}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white text-sm font-black hover:bg-emerald-600 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                I'M SAFE NOW
              </button>

              <button
                onClick={cancelAlert}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary text-muted-foreground text-xs font-medium hover:bg-destructive/20 hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" /> Cancel Alert
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <button
                onClick={handleSOS}
                disabled={sending}
                className={cn(
                  "relative w-36 h-36 mx-auto rounded-full flex items-center justify-center",
                  "bg-gradient-to-b from-red-500 to-red-700 text-white shadow-xl",
                  "hover:shadow-2xl transition-all duration-200",
                  "active:scale-95 disabled:opacity-60",
                  "after:absolute after:inset-0 after:rounded-full after:border-4 after:border-red-400/30 after:animate-ping"
                )}
                style={{ boxShadow: "0 0 30px rgba(239,68,68,0.3), 0 0 60px rgba(239,68,68,0.1)" }}
              >
                <div className="flex flex-col items-center gap-1 z-10">
                  <MapPin className="w-7 h-7" />
                  <span className="text-lg font-black tracking-wide">
                    {sending ? "SENDING..." : "HELP ME"}
                  </span>
                </div>
              </button>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground mt-5">
            Press to send emergency alert via WhatsApp with your live GPS location
          </p>
        </div>
      )}

      {/* Responder: Incoming alerts (only shown if on duty) */}
      {isResponder && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h2 className="label-caps text-destructive/80">Active Emergency Alerts</h2>
            {alerts.length > 0 && (
              <span className="text-[9px] font-bold bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
                {alerts.length}
              </span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="glass-card p-6 rounded-2xl text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active emergencies</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const accepted = alert.accepted_by || [];
              const hasAccepted = accepted.includes(user.user_id);

              return (
                <div key={alert.id} className="glass-card p-4 rounded-2xl border-destructive/20 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-destructive">🚨 Emergency Alert</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-[9px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">
                      {accepted.length}/10 accepted
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
                  </div>
                  {hasAccepted ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                      Accepted — navigate to victim on Map
                    </div>
                  ) : (
                    <button
                      onClick={() => acceptAlert(alert.id)}
                      disabled={accepted.length >= 10}
                      className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors active:scale-[0.98] disabled:opacity-50"
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

      {/* Quick actions — no phone call for women */}
      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
        <button className="glass-card flex items-center gap-3 p-4 rounded-2xl hover:gold-glow transition-all active:scale-[0.97]">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <MapPin className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold">Live Map</p>
            <p className="text-[10px] text-muted-foreground">Track location</p>
          </div>
        </button>
        <button className="glass-card flex items-center gap-3 p-4 rounded-2xl hover:gold-glow transition-all active:scale-[0.97]">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold">Safe Zone</p>
            <p className="text-[10px] text-muted-foreground">Nearby shelters</p>
          </div>
        </button>
      </div>
    </div>
  );
}
