import { useEffect, useRef, useCallback } from "react";
import { useSettings } from "@/lib/settings-context";
import { useAuth } from "@/lib/auth-context";
import { useSendEmergencyAlert } from "@/hooks/use-emergency-alert";
import { toast } from "sonner";

/**
 * Shake Detection using delta-acceleration method.
 * 
 * How it works:
 * 1. We track the CHANGE in acceleration between consecutive readings (delta).
 * 2. When the delta exceeds SHAKE_THRESHOLD, we count it as one "shake event".
 * 3. If we accumulate SHAKE_COUNT_REQUIRED shake events within SHAKE_DURATION_MS,
 *    it means the user has been continuously shaking for ~2 seconds → trigger SOS.
 * 4. On trigger: phone vibrates with a strong pattern and SOS alert is sent.
 */

const SHAKE_THRESHOLD = 12;        // Delta acceleration threshold (m/s²) — a firm shake produces 15-30
const SHAKE_DURATION_MS = 2000;    // Must shake continuously for 2 seconds
const SHAKE_COUNT_REQUIRED = 6;    // Number of threshold-crossings needed in the window
const COOLDOWN_MS = 15000;         // Prevent re-trigger for 15 seconds after activation
const SAMPLE_INTERVAL_MS = 100;    // Minimum time between processing motion events (throttle)

export function useShakeDetection() {
  const { shakeEnabled } = useSettings();
  const { user } = useAuth();
  const { sendAlert, sending, activeAlert } = useSendEmergencyAlert();

  // Refs to persist across renders without causing re-renders
  const lastAccel = useRef<{ x: number; y: number; z: number } | null>(null);
  const shakeTimestamps = useRef<number[]>([]);
  const isTriggering = useRef(false);
  const lastProcessTime = useRef(0);
  const listenerAdded = useRef(false);

  const triggerSOS = useCallback(() => {
    if (isTriggering.current) return;
    isTriggering.current = true;
    shakeTimestamps.current = [];

    // Strong vibration pattern: 3 pulses
    if ("vibrate" in navigator) {
      navigator.vibrate([300, 100, 300, 100, 500]);
    }

    toast.warning("🚨 Shake detected! Activating SOS...", { duration: 5000 });

    sendAlert().then(() => {
      // Additional confirmation vibration after alert sent
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100, 50, 100]);
      }
      toast.success("🆘 SOS Alert Sent! Help is on the way.", { duration: 8000 });
    }).catch((err) => {
      console.error("Shake SOS failed:", err);
      toast.error("Failed to send SOS. Try the button manually.");
    }).finally(() => {
      // Cooldown period before allowing another shake-trigger
      setTimeout(() => {
        isTriggering.current = false;
      }, COOLDOWN_MS);
    });
  }, [sendAlert]);

  useEffect(() => {
    // Only active for women users with shake enabled, not already sending/active
    const shouldListen = shakeEnabled && user?.role === "women" && !sending && !activeAlert;

    if (!shouldListen) {
      // Clean up if conditions no longer met
      if (listenerAdded.current) {
        window.removeEventListener("devicemotion", handleMotion, true);
        listenerAdded.current = false;
      }
      return;
    }

    function handleMotion(event: DeviceMotionEvent) {
      if (isTriggering.current) return;

      // Throttle: skip if we just processed
      const now = Date.now();
      if (now - lastProcessTime.current < SAMPLE_INTERVAL_MS) return;
      lastProcessTime.current = now;

      // Try acceleration first (excludes gravity), fallback to accelerationIncludingGravity
      const accel = event.acceleration || event.accelerationIncludingGravity;
      if (!accel) return;

      const { x, y, z } = accel;
      if (x == null || y == null || z == null) return;

      const prev = lastAccel.current;
      lastAccel.current = { x, y, z };

      // Need a previous reading to calculate delta
      if (!prev) return;

      // Calculate delta (change) in acceleration
      const dx = x - prev.x;
      const dy = y - prev.y;
      const dz = z - prev.z;
      const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (delta > SHAKE_THRESHOLD) {
        shakeTimestamps.current.push(now);

        // Purge old timestamps outside the window
        shakeTimestamps.current = shakeTimestamps.current.filter(
          (t) => now - t < SHAKE_DURATION_MS
        );

        // Check if enough shakes accumulated in the time window
        if (shakeTimestamps.current.length >= SHAKE_COUNT_REQUIRED) {
          triggerSOS();
        }
      }
    }

    // Request permission for iOS 13+ and start listening
    const startListening = async () => {
      // iOS 13+ requires explicit permission
      if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
        try {
          const permission = await (DeviceMotionEvent as any).requestPermission();
          if (permission !== "granted") {
            console.warn("DeviceMotion permission denied");
            return;
          }
        } catch (err) {
          console.error("DeviceMotion permission error:", err);
          return;
        }
      }

      window.addEventListener("devicemotion", handleMotion, true);
      listenerAdded.current = true;
    };

    startListening();

    return () => {
      window.removeEventListener("devicemotion", handleMotion, true);
      listenerAdded.current = false;
      lastAccel.current = null;
      shakeTimestamps.current = [];
    };
  }, [shakeEnabled, user?.role, sending, activeAlert, triggerSOS]);
}
