import { MapPin, Shield, AlertTriangle, CheckCircle2, X, Clock, LogIn, LogOut, Gauge, ShieldCheck, Star, MessageSquare, Video } from "lucide-react";
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
import resqherLogo from "@/assets/resqher-logo.png";
import { toast } from "sonner";

function TelemetryCard() {
  const telemetry = useLiveTelemetry();
  const { t } = useI18n();

  const signalColor =
    telemetry.signalStatus === "connected"
      ? "text-emerald-400"
      : telemetry.signalStatus === "weak"
      ? "text-amber-400"
      : "text-destructive";

  const signalLabel =
    telemetry.signalStatus === "connected"
      ? t("signalActive")
      : telemetry.signalStatus === "weak"
      ? t("weakSignal")
      : t("signalLost");

  return (
    <div className="glass-card rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150">
      <div className="flex items-center justify-between mb-3">
        <p className="label-caps text-emerald-400">{t("liveTelemetry")}</p>
        <p className="label-caps text-muted-foreground">{t("groundSpeed")}</p>
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
          <p className="label-caps text-emerald-400/70">{t("efficiencyStatus")}</p>
          <p className="text-sm font-bold text-emerald-400">
            {telemetry.speed > 0 ? t("routeActive") : t("optimalRoute")}
          </p>
        </div>
      </div>
    </div>
  );
}

function AttendanceCard() {
  const { activeShift, checkIn, checkOut, isEligible } = useAttendance();
  const { t } = useI18n();
  if (!isEligible) return null;

  return (
    <div className="glass-card rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <p className="label-caps">{t("attendance")}</p>
      </div>
      {activeShift ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-400">{t("onDuty")}</p>
              <p className="text-[10px] text-muted-foreground">
                {t("since")} {new Date(activeShift.checked_in_at).toLocaleTimeString()}
              </p>
            </div>
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <button
            onClick={checkOut}
            className="w-full py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold border border-destructive/20 hover:bg-destructive/20 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {t("checkOut")}
          </button>
        </div>
      ) : (
        <button
          onClick={checkIn}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          {t("checkInStartDuty")}
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
  const { t } = useI18n();
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
          <p className="text-xl font-black">{t("thankYou")}</p>
          <p className="text-sm text-muted-foreground">{t("feedbackSubmitted")}</p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.98] transition-transform"
          >
            {t("done")}
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
          <p className="text-lg font-black">{t("rescueCompleted")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("rateResponders")}</p>
        </div>

        {responders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center">{t("noRespondersToRate")}</p>
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
                  placeholder={t("writeFeedback")}
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
          {submitting ? t("submitting") : t("submitRatings")}
        </button>
        <button
          onClick={onClose}
          className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("skipForNow")}
        </button>
      </div>
    </div>
  );
}

// Video Recording Component for Women Users
function VideoRecorder({ autoStart }: { autoStart?: boolean }) {
  const { t } = useI18n();
  const { supabaseUser } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        stream.getTracks().forEach((t) => t.stop());
        await uploadVideo(blob);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast.error("Camera access denied");
    }
  }, []);

  useEffect(() => {
    if (autoStart) startRecording();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [autoStart]);

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadVideo = async (blob: Blob) => {
    if (!supabaseUser) return;
    setUploading(true);
    const fileName = `${supabaseUser.id}/emergency-${Date.now()}.webm`;
    const { error } = await supabase.storage.from("videos").upload(fileName, blob);
    setUploading(false);
    if (error) {
      toast.error(t("videoUploadFailed"));
    } else {
      toast.success(t("videoSaved"));
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-250">
      <div className="flex items-center gap-2 mb-3">
        <Video className="w-4 h-4 text-destructive" />
        <p className="label-caps">{t("liveVideoRecording")}</p>
      </div>
      {isRecording ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-bold text-destructive">{t("recordingInProgress")}</span>
          </div>
          <button
            onClick={stopRecording}
            className="w-full py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold border border-destructive/20 hover:bg-destructive/20 transition-colors active:scale-[0.98]"
          >
            {t("stopRecording")}
          </button>
        </div>
      ) : uploading ? (
        <div className="flex items-center gap-2 py-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">{t("loading")}</span>
        </div>
      ) : (
        <button
          onClick={startRecording}
          className="w-full py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold border border-destructive/20 hover:bg-destructive/20 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Video className="w-4 h-4" />
          {t("startRecording")}
        </button>
      )}
      <p className="text-[10px] text-muted-foreground mt-2">{t("videoNote")}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { sendAlert, cancelAlert, sending, activeAlert } = useSendEmergencyAlert();
  const { alerts, acceptAlert } = useRealtimeAlerts();
  const { sendWhatsAppAlerts } = useEmergencyContacts();
  const { resolveAlert } = useResolveAlert();
  const [showFeedback, setShowFeedback] = useState(false);
  const [resolvedResponders, setResolvedResponders] = useState<ResponderInfo[]>([]);
  const [resolvedAlertId, setResolvedAlertId] = useState("");
  const [sosProgress, setSosProgress] = useState(0);
  const [sosHolding, setSosHolding] = useState(false);
  const [autoRecordVideo, setAutoRecordVideo] = useState(false);
  const sosTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sosStartRef = useRef<number>(0);
  const sosAnimRef = useRef<number>(0);

  if (!user) return null;

  const isResponder = ["driver", "police", "protector"].includes(user.role);

  const triggerSOS = async () => {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    setAutoRecordVideo(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      const { latitude, longitude } = position.coords;
      await sendAlert();
      sendWhatsAppAlerts(latitude, longitude);
    } catch {
      await sendAlert();
    }
  };

  const handleSOSStart = () => {
    setSosHolding(true);
    sosStartRef.current = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - sosStartRef.current;
      const progress = Math.min(elapsed / 2000, 1);
      setSosProgress(progress);
      
      if (progress >= 1) {
        setSosHolding(false);
        setSosProgress(0);
        triggerSOS();
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

  const handleSafeNow = async () => {
    if (!activeAlert) return;
    const responderIds = activeAlert.accepted_by || [];
    setAutoRecordVideo(false);

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
            {user.verification_status === "verified" ? t("verified") : t("pending")}
          </div>
        </div>
      </div>

      {/* Telemetry for responders */}
      {isResponder && <TelemetryCard />}

      {/* Attendance for non-women */}
      <AttendanceCard />

      {/* Women user: SOS Hold-to-Activate + Safe Now */}
      {user.role === "women" && (
        <div className="glass-card rounded-2xl p-6 text-center animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <p className="label-caps">{t("alertSignal")}</p>
          </div>

          {activeAlert ? (
            <div className="space-y-3 mt-4">
              <div className="w-36 h-36 mx-auto rounded-full flex items-center justify-center bg-emerald-500 text-white animate-in zoom-in-75 duration-300 gold-glow">
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle2 className="w-7 h-7" />
                  <span className="text-sm font-bold">{t("alertActive")}</span>
                  <span className="text-[10px]">{activeAlert.accepted_by?.length || 0} {t("responders")}</span>
                </div>
              </div>

              <button
                onClick={handleSafeNow}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white text-sm font-black hover:bg-emerald-600 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                {t("imSafeNow")}
              </button>

              <button
                onClick={() => { cancelAlert(); setAutoRecordVideo(false); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary text-muted-foreground text-xs font-medium hover:bg-destructive/20 hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" /> {t("cancelAlert")}
              </button>
            </div>
          ) : (
            <div className="mt-4">
              {/* Modern SOS Button with Hold-to-Activate */}
              <div className="relative w-40 h-40 mx-auto">
                {/* Pulse rings */}
                <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: "radial-gradient(circle, hsl(0 72% 51% / 0.4), transparent 70%)" }} />
                <div className="absolute inset-[-8px] rounded-full animate-pulse opacity-30" style={{ background: "radial-gradient(circle, hsl(340 80% 55% / 0.3), transparent 70%)" }} />
                
                {/* Progress ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="76" fill="none" stroke="hsl(0 72% 51% / 0.2)" strokeWidth="4" />
                  <circle
                    cx="80" cy="80" r="76" fill="none"
                    stroke="url(#sosGradient)" strokeWidth="4"
                    strokeDasharray={`${sosProgress * 477.5} 477.5`}
                    strokeLinecap="round"
                    className="transition-none"
                  />
                  <defs>
                    <linearGradient id="sosGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(0, 72%, 51%)" />
                      <stop offset="100%" stopColor="hsl(340, 80%, 55%)" />
                    </linearGradient>
                  </defs>
                </svg>

                <button
                  onMouseDown={handleSOSStart}
                  onMouseUp={handleSOSEnd}
                  onMouseLeave={handleSOSEnd}
                  onTouchStart={handleSOSStart}
                  onTouchEnd={handleSOSEnd}
                  onTouchCancel={handleSOSEnd}
                  disabled={sending}
                  className={cn(
                    "absolute inset-2 rounded-full flex flex-col items-center justify-center z-10",
                    "text-white shadow-2xl select-none",
                    "transition-transform duration-150",
                    sosHolding ? "scale-95" : "hover:scale-[1.02]",
                    "disabled:opacity-60"
                  )}
                  style={{
                    background: "linear-gradient(135deg, hsl(0, 72%, 51%), hsl(340, 80%, 55%))",
                    boxShadow: sosHolding
                      ? "0 0 40px hsl(0 72% 51% / 0.5), 0 0 80px hsl(340 80% 55% / 0.3), inset 0 0 20px hsl(0 0% 0% / 0.2)"
                      : "0 0 30px hsl(0 72% 51% / 0.3), 0 0 60px hsl(0 72% 51% / 0.1)",
                  }}
                >
                  <img src={resqherLogo} alt="" className="w-10 h-10 mb-1 drop-shadow-lg" />
                  <span className="text-lg font-black tracking-wider">
                    {sending ? t("sending") : "SOS"}
                  </span>
                  <span className="text-[9px] font-medium opacity-80 mt-0.5">
                    {t("sosHoldToActivate")}
                  </span>
                </button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground mt-5">
            {t("pressToSend")}
          </p>
        </div>
      )}

      {/* Video Recording for Women */}
      {user.role === "women" && (
        <VideoRecorder autoStart={autoRecordVideo} />
      )}

      {/* Responder: Incoming alerts */}
      {isResponder && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h2 className="label-caps text-destructive/80">{t("activeEmergencyAlerts")}</h2>
            {alerts.length > 0 && (
              <span className="text-[9px] font-bold bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
                {alerts.length}
              </span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="glass-card p-6 rounded-2xl text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("noActiveEmergencies")}</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const accepted = alert.accepted_by || [];
              const hasAccepted = accepted.includes(user.user_id);

              return (
                <div key={alert.id} className="glass-card p-4 rounded-2xl border-destructive/20 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-destructive">🚨 {t("emergencyAlert")}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-[9px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">
                      {accepted.length}/10 {t("accepted")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
                  </div>
                  {hasAccepted ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                      {t("acceptedNavigate")}
                    </div>
                  ) : (
                    <button
                      onClick={() => acceptAlert(alert.id)}
                      disabled={accepted.length >= 10}
                      className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors active:scale-[0.98] disabled:opacity-50"
                    >
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
      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
        <button className="glass-card flex items-center gap-3 p-4 rounded-2xl hover:gold-glow transition-all active:scale-[0.97]">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <MapPin className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold">{t("liveMap")}</p>
            <p className="text-[10px] text-muted-foreground">{t("trackLocation")}</p>
          </div>
        </button>
        <button className="glass-card flex items-center gap-3 p-4 rounded-2xl hover:gold-glow transition-all active:scale-[0.97]">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold">{t("safeZone")}</p>
            <p className="text-[10px] text-muted-foreground">{t("nearbyShelters")}</p>
          </div>
        </button>
      </div>
    </div>
  );
}
