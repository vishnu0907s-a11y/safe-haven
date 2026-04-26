import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/hooks/use-notifications";
import { toast } from "sonner";
import { getFastLocation } from "@/lib/location-utils";
import { getDistanceKm } from "@/lib/map-utils";

const ADMIN_LOCATION = { lat: 13.0827, lng: 80.2707 };

export interface Complaint {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: "open" | "resolved";
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  profiles?: { full_name: string; phone: string | null; avatar_url: string | null };
}

export function useComplaints() {
  const { supabaseUser, user } = useAuth();
  const { createNotification } = useNotifications();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === "admin";

  const fetchComplaints = useCallback(async () => {
    if (!supabaseUser) return;
    setLoading(true);
    try {
      let query = supabase
        .from("complaints" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = (query as any).eq("user_id", supabaseUser.id);
      }

      const { data, error } = await (query as any);
      if (error) {
        // Table may not exist yet — silently fail
        console.warn("Complaints table not ready:", error.message);
        setComplaints([]);
        return;
      }

      if (data && data.length > 0 && isAdmin) {
        const uids = [...new Set((data as any[]).map((c: any) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, avatar_url")
          .in("user_id", uids as string[]);

        const enriched = (data as any[]).map((c: any) => ({
          ...c,
          profiles: profiles?.find((p) => p.user_id === c.user_id) || null,
        }));

        // Filter by 30km radius from admin location
        const nearby = enriched.filter((c: any) => {
          if (!c.latitude || !c.longitude) return true;
          return getDistanceKm(ADMIN_LOCATION.lat, ADMIN_LOCATION.lng, c.latitude, c.longitude) <= 30;
        });

        setComplaints(nearby as Complaint[]);
      } else {
        setComplaints((data || []) as Complaint[]);
      }
    } catch (err) {
      console.error("Error fetching complaints:", err);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, [supabaseUser, isAdmin]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const submitComplaint = useCallback(
    async (title: string, description: string): Promise<boolean> => {
      if (!supabaseUser) return false;
      setSubmitting(true);
      try {
        let lat: number | null = null;
        let lng: number | null = null;
        try {
          const pos = await getFastLocation();
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {}

        const { error } = await supabase.from("complaints" as any).insert({
          user_id: supabaseUser.id,
          title,
          description,
          status: "open",
          latitude: lat,
          longitude: lng,
        } as any);

        if (error) throw error;
        
        // Notify Admins
        const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
        if (admins) {
          admins.forEach(adm => {
            createNotification(adm.user_id, "📝 NEW COMPLAINT", `New complaint from user: ${title}`, "complaint");
          });
        }

        toast.success("Complaint submitted successfully!");
        fetchComplaints();
        return true;
      } catch (err: any) {
        toast.error(err?.message || "Failed to submit complaint");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [supabaseUser, fetchComplaints]
  );

  const resolveComplaint = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("complaints" as any)
      .update({ status: "resolved" } as any)
      .eq("id", id);
    if (error) {
      toast.error("Failed to resolve complaint");
    } else {
      const complaint = complaints.find(c => c.id === id);
      if (complaint) {
        createNotification(complaint.user_id, "✅ COMPLAINT RESOLVED", `Your complaint "${complaint.title}" has been marked as resolved.`, "complaint");
      }
      toast.success("Complaint marked as resolved!");
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "resolved" } : c))
      );
    }
  }, []);

  return { complaints, loading, submitting, submitComplaint, resolveComplaint, refetch: fetchComplaints };
}
