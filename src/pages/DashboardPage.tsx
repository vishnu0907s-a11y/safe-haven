import { MapPin, Shield, AlertTriangle, CheckCircle2, X, Clock, LogIn, LogOut, Gauge, ShieldCheck, Star, MessageSquare, Navigation } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getDistanceKm, getEta } from "@/lib/map-utils";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { useSendEmergencyAlert, useRealtimeAlerts } from "@/hooks/use-emergency-alert";
import { useAttendance } from "@/hooks/use-attendance";
import { useLiveTelemetry } from "@/hooks/use-live-telemetry";
import { useLiveLocationBroadcast } from "@/hooks/use-live-location-broadcast";
import { useEmergencyContacts } from "@/hooks/use-emergency-contacts";
import { useResolveAlert } from "@/hooks/use-rescue-records";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {

  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { FloatingActionMenu } from "@/components/FloatingActionMenu";

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
  const { activeShift, checkIn, checkOut, isEligible, checkingIn } = useAttendance();
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
        <button 
          onClick={checkIn} 
          disabled={checkingIn}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98] flex items-center justify-center gap-2 glow-primary disabled:opacity-70"
        >
          {checkingIn ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          {checkingIn ? t("loading") : t("checkInStartDuty")}
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
    try {
      for (const r of responders) {
        // Find the specific rescue record for this responder and alert
        const { data: records } = await supabase
          .from("rescue_records")
          .select("id")
          .eq("alert_id", alertId)
          .eq("responder_id", r.user_id)
          .limit(1);

        if (records && records.length > 0) {
          const rating = ratings[r.user_id] || 5;
          const feedback = feedbacks[r.user_id] || "";
          await rateResponder(records[0].id, rating, feedback);
        }
      }
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting ratings:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !submitting && !val && onClose()}>
      <DialogContent className="max-w-md w-[95%] p-0 overflow-hidden border-none bg-background/95 backdrop-blur-xl shadow-2xl rounded-3xl">
        <div className="bg-gradient-to-br from-primary/20 via-background to-accent/5 p-6 sm:p-8">
          <DialogHeader className="text-center space-y-3 mb-6">
            <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-2 glow-accent">
              <ShieldCheck className="w-8 h-8 text-accent" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {submitted ? t("thankYou") : t("rescueCompleted")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground font-medium">
              {submitted ? t("feedbackSubmitted") : t("rateResponders")}
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="space-y-6 text-center animate-in zoom-in-95 duration-300">
              <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10">
                <p className="text-sm font-medium text-accent">Your feedback helps us recognize our heroes!</p>
              </div>
              <button onClick={onClose} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/25 active:scale-[0.98] transition-all glow-primary">
                {t("done")}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="max-h-[40vh] overflow-y-auto px-1 space-y-4 custom-scrollbar">
                {responders.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto opacity-50">
                      <Navigation className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium italic">{t("noRespondersToRate")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">{responders.length} {t("responders")} helped you</p>
                    {responders.map((r) => (
                      <div key={r.user_id} className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-4 group transition-all hover:bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-black border border-primary/20 shadow-sm">{r.full_name.charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{r.full_name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight opacity-70">{r.role}</p>
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button key={s} onClick={() => setRatings((p) => ({ ...p, [r.user_id]: s }))} className="p-0.5 transition-transform active:scale-75 hover:scale-110">
                                <Star className={cn("w-5 h-5", s <= (ratings[r.user_id] || 5) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea 
                          placeholder={t("writeFeedback")} 
                          value={feedbacks[r.user_id] || ""} 
                          onChange={(e) => setFeedbacks((p) => ({ ...p, [r.user_id]: e.target.value }))} 
                          className="w-full text-xs bg-background/50 border border-border/40 rounded-xl p-3 h-16 resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-3 pt-2">
                <button 
                  onClick={handleSubmit} 
                  disabled={submitting || responders.length === 0} 
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/25 disabled:opacity-50 active:scale-[0.98] transition-all glow-primary"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t("submitting")}</span>
                    </div>
                  ) : t("submitRatings")}
                </button>
                <button onClick={onClose} className="w-full py-2 text-xs text-muted-foreground font-semibold hover:text-foreground transition-colors">{t("skipForNow")}</button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { sendAlert, cancelAlert, sending, activeAlert } = useSendEmergencyAlert();
  const { alerts, acceptAlert, cancelAcceptance } = useRealtimeAlerts();
  const { contacts, sendWhatsAppAlerts } = useEmergencyContacts();
  const navigate = useNavigate();
  const { resolveAlert } = useResolveAlert();
  const [showFeedback, setShowFeedback] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  const isResponder = user ? ["driver", "police", "protector"].includes(user.role) : false;

  // Broadcast live GPS to Supabase when on duty (responders only)
  useLiveLocationBroadcast();

  useEffect(() => {
    if (!isResponder) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.error("Position error:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isResponder]);
  const [resolvedResponders, setResolvedResponders] = useState<ResponderInfo[]>([]);
  const [resolvedAlertId, setResolvedAlertId] = useState("");
  const [sosProgress, setSosProgress] = useState(0);
  const [sosHolding, setSosHolding] = useState(false);
  const sosStartRef = useRef<number>(0);
  const sosAnimRef = useRef<number>(0);

  if (!user) return null;

  const triggerSOS = useCallback(async () => {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    
    // Start sending alert immediately (it will use the fastest available location inside)
    const alertPromise = sendAlert();
    
    // Try to get high accuracy location for WhatsApp contacts in parallel
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          enableHighAccuracy: true, 
          timeout: 3000, // Faster timeout for initial share
          maximumAge: 10000 
        });
      });
      sendWhatsAppAlerts(position.coords.latitude, position.coords.longitude);
    } catch {
      // Fallback: If high accuracy fails, use whatever sendAlert found or just send WhatsApp later
      console.warn("Fast GPS failed for WhatsApp, waiting for alert process...");
    }
    
    await alertPromise;
  }, [sendAlert, sendWhatsAppAlerts]);

  const handleSOSStart = () => {
    setSosHolding(true);
    sosStartRef.current = Date.now();
    const animate = () => {
      const progress = Math.min((Date.now() - sosStartRef.current) / 1000, 1);
      setSosProgress(progress);
      if (progress >= 1) { 
        setSosHolding(false); 
        setSosProgress(0); 
        triggerSOS(); 
        if (sosAnimRef.current) cancelAnimationFrame(sosAnimRef.current);
        return; 
      }
      sosAnimRef.current = requestAnimationFrame(animate);
    };
    sosAnimRef.current = requestAnimationFrame(animate);
  };

  const handleSOSEnd = () => { 
    setSosHolding(false); 
    setSosProgress(0); 
    if (sosAnimRef.current) cancelAnimationFrame(sosAnimRef.current); 
  };


  const handleAcceptAndNavigate = async (alertId: string) => {
    await acceptAlert(alertId);
    navigate("/map", { state: { trackingAlertId: alertId, showAlerts: true } });
  };

  const handleSafeNow = async () => {
    if (!activeAlert) return;
    
    // Explicitly fetch the latest responder list just in case real-time was slow
    const { data: latestAlert } = await supabase
      .from("sos_alerts")
      .select("accepted_by")
      .eq("id", activeAlert.id)
      .single();

    const responderIds = latestAlert?.accepted_by || activeAlert.accepted_by || [];
    let responderInfos: ResponderInfo[] = [];
    
    if (responderIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", responderIds);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", responderIds);
      
      responderInfos = (profiles || []).map((p) => ({ 
        user_id: p.user_id, 
        full_name: p.full_name, 
        role: roles?.find((r) => r.user_id === p.user_id)?.role || "responder" 
      }));
    }

    setResolvedResponders(responderInfos);
    setResolvedAlertId(activeAlert.id);
    
    // Resolve the alert in DB
    await resolveAlert(activeAlert.id, responderIds);
    
    // Close the local state
    cancelAlert();
    
    // Show feedback dialog
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
                <span className="text-[9px] text-muted-foreground">{(activeAlert.accepted_by || []).length} {t("responders")}</span>
              </div>
              
              <button onClick={() => navigate("/map")} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98] flex items-center justify-center gap-2 glow-primary">
                <MapPin className="w-5 h-5" /> Track Responders on Map
              </button>

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
                      {userPos && (
                        <span className="text-accent font-medium text-right shrink-0">
                          {getDistanceKm(userPos[0], userPos[1], alert.latitude, alert.longitude).toFixed(1)} km ({getEta(getDistanceKm(userPos[0], userPos[1], alert.latitude, alert.longitude))})
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
                    <button onClick={() => handleAcceptAndNavigate(alert.id)} disabled={accepted.length >= 10} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98] disabled:opacity-50 glow-primary">
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
      
      <FloatingActionMenu />
    </div>
  );
}
