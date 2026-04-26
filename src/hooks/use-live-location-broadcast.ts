import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAttendance } from "@/hooks/use-attendance";
import { useSettings } from "@/lib/settings-context";

const BROADCAST_INTERVAL_MS = 4000; // Push location every 4 seconds

/**
 * Hook for RESPONDERS: broadcasts their live GPS to Supabase.
 * Only runs when the responder is on duty (active shift).
 * Cleans up (deletes row) when they check out or unmount.
 */
export function useLiveLocationBroadcast() {
  const { supabaseUser, user } = useAuth();
  const { activeShift } = useAttendance();
  const { locationAllowed } = useSettings();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number; heading: number | null; speed: number | null; accuracy: number | null } | null>(null);

  const isResponder = user && ["driver", "police", "protector"].includes(user.role);
  const isOnDuty = !!activeShift;

  const upsertLocation = async () => {
    if (!supabaseUser || !lastPosRef.current) return;
    const { lat, lng, heading, speed, accuracy } = lastPosRef.current;

    await supabase.from("live_locations" as any).upsert(
      {
        user_id: supabaseUser.id,
        latitude: lat,
        longitude: lng,
        heading,
        speed,
        accuracy,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "user_id" }
    );
  };

  const removeLocation = async () => {
    if (!supabaseUser) return;
    await supabase
      .from("live_locations" as any)
      .delete()
      .eq("user_id", supabaseUser.id);
  };

  useEffect(() => {
    if (!isResponder || !isOnDuty || !supabaseUser || !locationAllowed) return;

    // Watch GPS position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastPosRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed ? pos.coords.speed * 3.6 : null, // m/s → km/h
          accuracy: pos.coords.accuracy,
        };
      },
      (err) => console.warn("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    // Push to Supabase every 4 seconds
    intervalRef.current = setInterval(upsertLocation, BROADCAST_INTERVAL_MS);

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      removeLocation(); // Clean up on unmount / check-out
    };
  }, [isResponder, isOnDuty, supabaseUser, locationAllowed]);
}
