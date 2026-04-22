import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LiveResponderLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  updated_at: string;
  // Joined fields
  full_name?: string;
  role?: string;
}

/**
 * Hook for WOMEN users: subscribes to real-time responder locations.
 * Filters to only show responders who accepted the given alertId.
 * Uses Supabase Realtime — instant updates without polling.
 */
export function useLiveLocationSubscribe(acceptedByIds: string[]) {
  const [responderLocations, setResponderLocations] = useState<LiveResponderLocation[]>([]);

  useEffect(() => {
    if (acceptedByIds.length === 0) {
      setResponderLocations([]);
      return;
    }

    // Initial fetch
    const fetchLocations = async () => {
      const { data: locations } = await supabase
        .from("live_locations" as any)
        .select("*")
        .in("user_id", acceptedByIds);

      if (!locations || locations.length === 0) {
        setResponderLocations([]);
        return;
      }

      const uids = (locations as any[]).map((l: any) => l.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", uids);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", uids);

      setResponderLocations(
        (locations as any[]).map((l: any) => ({
          ...l,
          full_name: profiles?.find((p) => p.user_id === l.user_id)?.full_name || "Responder",
          role: roles?.find((r) => r.user_id === l.user_id)?.role || "protector",
        }))
      );
    };

    fetchLocations();

    // Real-time subscription
    const channel = supabase
      .channel("live-responder-locations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_locations",
        },
        (payload) => {
          const updated = payload.new as any;
          if (!updated || !acceptedByIds.includes(updated.user_id)) return;

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setResponderLocations((prev) => {
              const exists = prev.find((r) => r.user_id === updated.user_id);
              if (exists) {
                // Smoothly update position
                return prev.map((r) =>
                  r.user_id === updated.user_id
                    ? { ...r, ...updated }
                    : r
                );
              } else {
                // Fetch profile for new responder
                supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("user_id", updated.user_id)
                  .single()
                  .then(({ data }) => {
                    setResponderLocations((prev2) =>
                      prev2.map((r) =>
                        r.user_id === updated.user_id
                          ? { ...r, full_name: data?.full_name || "Responder" }
                          : r
                      )
                    );
                  });
                return [
                  ...prev,
                  { ...updated, full_name: "Responder", role: "protector" },
                ];
              }
            });
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as any;
            setResponderLocations((prev) =>
              prev.filter((r) => r.user_id !== deleted.user_id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [JSON.stringify(acceptedByIds)]);

  return responderLocations;
}
