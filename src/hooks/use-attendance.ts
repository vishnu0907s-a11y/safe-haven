import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { getFastLocation } from "@/lib/location-utils";

interface AttendanceRecord {
  id: string;
  user_id: string;
  checked_in_at: string;
  checked_out_at: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
}

export function useAttendance() {
  const { supabaseUser, user } = useAuth();
  const [activeShift, setActiveShift] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const isEligible = user && user.role !== "women";

  useEffect(() => {
    if (!supabaseUser || !isEligible) {
      setLoading(false);
      return;
    }
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", supabaseUser.id)
      .eq("status", "active")
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setActiveShift(data[0] as AttendanceRecord);
        setLoading(false);
      });
  }, [supabaseUser, isEligible]);

  const [checkingIn, setCheckingIn] = useState(false);

  const checkIn = useCallback(async () => {
    if (!supabaseUser) return;
    setCheckingIn(true);
    try {
      const position = await getFastLocation();

      const { data, error } = await supabase
        .from("attendance")
        .insert({
          user_id: supabaseUser.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      setActiveShift(data as AttendanceRecord);
      toast.success("Checked in successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to check in");
    } finally {
      setCheckingIn(false);
    }
  }, [supabaseUser]);

  const checkOut = useCallback(async () => {
    if (!activeShift) return;
    const { error } = await supabase
      .from("attendance")
      .update({ status: "completed", checked_out_at: new Date().toISOString() })
      .eq("id", activeShift.id);

    if (error) {
      toast.error("Failed to check out");
    } else {
      setActiveShift(null);
      toast.success("Checked out successfully!");
    }
  }, [activeShift]);

  return { activeShift, loading, checkIn, checkOut, isEligible, checkingIn };
}
