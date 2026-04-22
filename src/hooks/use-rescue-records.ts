import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export interface RescueRecord {
  id: string;
  alert_id: string;
  victim_id: string;
  responder_id: string;
  points_awarded: number;
  rating: number | null;
  feedback: string | null;
  created_at: string;
}

export function useRescueRecords() {
  const { supabaseUser } = useAuth();
  const [records, setRecords] = useState<RescueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseUser) return;
    supabase
      .from("rescue_records")
      .select("*")
      .eq("responder_id", supabaseUser.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setRecords(data);
        setLoading(false);
      });
  }, [supabaseUser]);

  const totalPoints = records.reduce((sum, r) => sum + Number(r.points_awarded), 0);
  const rescueCount = records.length;
  const avgRating = records.filter((r) => r.rating).length > 0
    ? records.filter((r) => r.rating).reduce((sum, r) => sum + (r.rating || 0), 0) / records.filter((r) => r.rating).length
    : 0;

  return { records, loading, totalPoints, rescueCount, avgRating };
}

export function useResolveAlert() {
  const { supabaseUser } = useAuth();

  const resolveAlert = useCallback(async (alertId: string, acceptedBy: string[]) => {
    if (!supabaseUser) return;

    // Mark alert as resolved
    await supabase
      .from("sos_alerts")
      .update({ status: "resolved" })
      .eq("id", alertId);

    // Distribute points
    const pointsPerResponder = acceptedBy.length > 0 ? 10 / acceptedBy.length : 0;

    // Create rescue records for each responder
    const records = acceptedBy.map((responderId) => ({
      alert_id: alertId,
      victim_id: supabaseUser.id,
      responder_id: responderId,
      points_awarded: pointsPerResponder,
    }));

    if (records.length > 0) {
      await supabase.from("rescue_records").insert(records);
    }

    toast.success("You're safe! Responders have been notified.");
  }, [supabaseUser]);

  const rateResponder = useCallback(async (recordId: string, rating: number, feedback?: string) => {
    const updateData: Record<string, any> = { rating };
    if (feedback) updateData.feedback = feedback;
    
    const { error } = await supabase
      .from("rescue_records")
      .update(updateData)
      .eq("id", recordId);

    if (error) {
      toast.error("Failed to submit rating");
    } else {
      toast.success("Rating submitted!");
    }
  }, []);

  return { resolveAlert, rateResponder };
}
