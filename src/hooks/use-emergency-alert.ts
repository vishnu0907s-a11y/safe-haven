import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAttendance } from "@/hooks/use-attendance";
import { useNotifications } from "@/hooks/use-notifications";
import { toast } from "sonner";
import { getFastLocation } from "@/lib/location-utils";

interface EmergencyAlert {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  status: string;
  accepted_by: string[] | null;
  created_at: string;
  profiles?: { full_name: string; phone: string | null };
}

export function useSendEmergencyAlert() {
  const { supabaseUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [activeAlert, setActiveAlert] = useState<EmergencyAlert | null>(null);

  useEffect(() => {
    if (!supabaseUser) return;
    
    // Initial fetch
    supabase
      .from("emergency_alerts")
      .select("*")
      .eq("user_id", supabaseUser.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setActiveAlert(data[0]);
      });

    // Real-time subscription for this user's alerts
    const channel = supabase
      .channel(`my-active-alert-${supabaseUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "emergency_alerts",
          filter: `user_id=eq.${supabaseUser.id}`,
        },
        (payload) => {
          const updated = payload.new as EmergencyAlert;
          if (updated.status === "active") {
            setActiveAlert(updated);
          } else {
            setActiveAlert(null);
          }
        }
      )
      .subscribe();

    // Fallback polling (every 3 seconds) for robust delivery even if WebSockets fail
    const pollInterval = setInterval(() => {
      supabase
        .from("emergency_alerts")
        .select("*")
        .eq("user_id", supabaseUser.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .then(({ data }) => {
          setActiveAlert((prev) => {
            const newAlert = data && data.length > 0 ? data[0] : null;
            if (!prev && !newAlert) return prev;
            if (prev && !newAlert) return null;
            if (!prev && newAlert) return newAlert;
            if (prev && newAlert && (prev.id !== newAlert.id || prev.status !== newAlert.status || (prev.accepted_by?.length || 0) !== (newAlert.accepted_by?.length || 0))) {
              return newAlert;
            }
            return prev;
          });
        });
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [supabaseUser]);

  const sendAlert = useCallback(async () => {
    if (!supabaseUser) return;
    setSending(true);
    try {
      // Fast location fetch - wait max 2 seconds for high accuracy
      let position;
      try {
        position = await getFastLocation({ timeout: 2000 });
      } catch (e) {
        console.warn("Fast GPS failed, using last known or low accuracy...");
        position = await getFastLocation({ enableHighAccuracy: false, timeout: 5000 });
      }
      
      const { data, error } = await supabase
        .from("emergency_alerts")
        .insert({
          user_id: supabaseUser.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          status: "active",
        })
        .select()
        .single();

      if (error) {
        console.error("SOS Alert Error:", error);
        if (error.message.includes("schema cache")) {
          toast.error("Database table 'emergency_alerts' is missing. Please run the SQL setup script in Supabase.");
        } else {
          throw error;
        }
        return;
      }
      
      setActiveAlert(data as EmergencyAlert);
      toast.success("Emergency alert sent! Help is on the way.");
    } catch (err: unknown) {
      console.error("SOS Trigger Error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to send alert");
    } finally {
      setSending(false);
    }
  }, [supabaseUser]);


  const cancelAlert = useCallback(async () => {
    if (!activeAlert) return;
    await supabase
      .from("emergency_alerts")
      .update({ status: "resolved" })
      .eq("id", activeAlert.id);
    setActiveAlert(null);
    toast.info("Alert cancelled.");
  }, [activeAlert]);

  return { sendAlert, cancelAlert, sending, activeAlert };
}

export function useRealtimeAlerts() {
  const { user } = useAuth();
  const { activeShift } = useAttendance();
  const { createNotification } = useNotifications();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const isResponder = user && ["driver", "police", "protector", "admin"].includes(user.role);
  // Only show alerts to on-duty rescuers (admins see all)
  const isOnDuty = user?.role === "admin" || !!activeShift;

  const fetchAlerts = useCallback(async () => {
    try {
      const { data: rawAlerts } = await supabase
        .from("emergency_alerts")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (rawAlerts && rawAlerts.length > 0) {
        const uids = [...new Set(rawAlerts.map(a => a.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", uids);

        const enriched = rawAlerts.map(a => ({
          ...a,
          profiles: profiles?.find(p => p.user_id === a.user_id) || null
        }));
        setAlerts((prev) => {
          // Check if anything actually changed to prevent UI flicker
          const isDifferent = prev.length !== enriched.length || prev.some((p, i) => {
            const e = enriched[i];
            if (p.id !== e.id) return true;
            if (p.status !== e.status) return true;
            if ((p.accepted_by?.length || 0) !== (e.accepted_by?.length || 0)) return true;
            return false;
          });
          return isDifferent ? (enriched as EmergencyAlert[]) : prev;
        });
      } else {
        setAlerts((prev) => prev.length === 0 ? prev : []);
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isResponder || !isOnDuty) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    fetchAlerts();

    const channel = supabase
      .channel("emergency-alerts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_alerts" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const newAlert = payload.new as EmergencyAlert;
            // Fetch profile for the new alert
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, phone")
              .eq("user_id", newAlert.user_id)
              .single();
            
            const enrichedAlert = { ...newAlert, profiles: profile || { full_name: "Unknown", phone: null } };
            setAlerts((prev) => {
              if (prev.find(a => a.id === enrichedAlert.id)) return prev;
              return [enrichedAlert as EmergencyAlert, ...prev];
            });
            
            // Notification for responders
            if (isResponder && isOnDuty) {
              createNotification(user.user_id, "🚨 NEW SOS ALERT", `Help needed for ${profile?.full_name || "a user"}! Check your dashboard.`, "alert");
            }
            
            toast.warning(`🚨 New alert from ${profile?.full_name || "someone"}!`, { duration: 8000 });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as EmergencyAlert;
            if (updated.status === "resolved") {
              // Instantly remove resolved alerts
              setAlerts((prev) => prev.filter((a) => a.id !== updated.id));
            } else {
              setAlerts((prev) =>
                prev.map((a) => (a.id === updated.id ? { ...updated, profiles: a.profiles } : a))
              );
            }
          } else if (payload.eventType === "DELETE") {
            setAlerts((prev) => prev.filter((a) => a.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    // Fallback polling (every 4 seconds) for robust delivery and bypassing missing Realtime configs
    const pollInterval = setInterval(() => {
      fetchAlerts();
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [isResponder, isOnDuty, fetchAlerts]);

  const acceptAlert = useCallback(
    async (alertId: string) => {
      if (!user) return;
      const alert = alerts.find((a) => a.id === alertId);
      if (!alert) return;

      const currentAccepted = alert.accepted_by || [];
      if (currentAccepted.length >= 10) {
        toast.error("Maximum responders reached.");
        return;
      }
      if (currentAccepted.includes(user.user_id)) {
        toast.info("You already accepted this alert.");
        return;
      }

      const { error } = await supabase
        .from("emergency_alerts")
        .update({ accepted_by: [...currentAccepted, user.user_id] })
        .eq("id", alertId);

      if (error) {
        toast.error("Failed to accept alert.");
      } else {
        // Notification for the victim
        createNotification(alert.user_id, "✅ RESCUE ACCEPTED", `${user.full_name || "A responder"} is coming to help you!`, "alert");
        toast.success("Alert accepted! Navigate to the victim.");
      }
    },
    [user, alerts]
  );

  const cancelAcceptance = useCallback(
    async (alertId: string) => {
      if (!user) return;
      const alert = alerts.find((a) => a.id === alertId);
      if (!alert) return;

      const currentAccepted = alert.accepted_by || [];
      if (!currentAccepted.includes(user.user_id)) return;

      const { error } = await supabase
        .from("emergency_alerts")
        .update({ accepted_by: currentAccepted.filter(id => id !== user.user_id) })
        .eq("id", alertId);

      if (error) {
        toast.error("Failed to cancel response.");
      } else {
        toast.info("Response cancelled.");
      }
    },
    [user, alerts]
  );

  return { alerts, loading, acceptAlert, cancelAcceptance };
}
