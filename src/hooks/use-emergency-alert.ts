import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAttendance } from "@/hooks/use-attendance";
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
      .from("sos_alerts")
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
          table: "sos_alerts",
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseUser]);

  const sendAlert = useCallback(async () => {
    if (!supabaseUser) return;
    setSending(true);
    try {
      // Optimistically start the process
      const positionPromise = getFastLocation();
      
      const position = await positionPromise;

      const { data, error } = await supabase
        .from("sos_alerts")
        .insert({
          user_id: supabaseUser.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      setActiveAlert(data as any);
      toast.success("Emergency alert sent! Help is on the way.");
    } catch (err: any) {
      if (err?.code === 1) {
        toast.error("Location access denied. Please enable GPS.");
      } else {
        toast.error(err?.message || "Failed to send alert");
      }
    } finally {
      setSending(false);
    }
  }, [supabaseUser]);

  const cancelAlert = useCallback(async () => {
    if (!activeAlert) return;
    await supabase
      .from("sos_alerts")
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
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const isResponder = user && ["driver", "police", "protector", "admin"].includes(user.role);
  // Only show alerts to on-duty rescuers (admins see all)
  const isOnDuty = user?.role === "admin" || !!activeShift;

  const fetchAlerts = useCallback(async () => {
    try {
      const { data: rawAlerts } = await supabase
        .from("sos_alerts")
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
        setAlerts(enriched as any);
      } else {
        setAlerts([]);
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
        { event: "*", schema: "public", table: "sos_alerts" },
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
              return [enrichedAlert as any, ...prev];
            });
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

    return () => {
      supabase.removeChannel(channel);
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
        .from("sos_alerts")
        .update({ accepted_by: [...currentAccepted, user.user_id] })
        .eq("id", alertId);

      if (error) {
        toast.error("Failed to accept alert.");
      } else {
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
        .from("sos_alerts")
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
