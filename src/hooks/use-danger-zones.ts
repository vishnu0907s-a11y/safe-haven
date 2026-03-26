import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DangerZone {
  id: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  risk_level: string;
  incident_count: number;
  last_incident_at: string;
  expires_at: string;
  created_at: string;
}

export function useDangerZones() {
  const [zones, setZones] = useState<DangerZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("danger_zones")
      .select("*")
      .gte("expires_at", new Date().toISOString())
      .order("incident_count", { ascending: false })
      .then(({ data }) => {
        if (data) setZones(data);
        setLoading(false);
      });

    const channel = supabase
      .channel("danger-zones-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "danger_zones" }, () => {
        supabase
          .from("danger_zones")
          .select("*")
          .gte("expires_at", new Date().toISOString())
          .order("incident_count", { ascending: false })
          .then(({ data }) => {
            if (data) setZones(data);
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { zones, loading };
}
