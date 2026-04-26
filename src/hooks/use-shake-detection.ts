import { useEffect, useRef } from "react";
import { useSettings } from "@/lib/settings-context";
import { useAuth } from "@/lib/auth-context";
import { useSendEmergencyAlert } from "@/hooks/use-emergency-alert";
import { toast } from "sonner";

const SHAKE_THRESHOLD = 20; // m/s^2 (Gravity is ~9.8)
const SHAKE_TIME_WINDOW = 2000; // 2 seconds of shaking required
const SHAKE_COUNT_REQUIRED = 5; // Needs to cross threshold this many times in the window

export function useShakeDetection() {
  const { shakeEnabled } = useSettings();
  const { user } = useAuth();
  const { sendAlert, sending, activeAlert } = useSendEmergencyAlert();
  
  const shakeEvents = useRef<number[]>([]);
  const isTriggering = useRef(false);

  useEffect(() => {
    // Only active for women users when shake is enabled, and not already sending/active
    if (!shakeEnabled || user?.role !== "women" || sending || activeAlert) {
      return;
    }

    const handleMotion = (event: DeviceMotionEvent) => {
      if (isTriggering.current) return;

      const { x, y, z } = event.accelerationIncludingGravity || {};
      if (x === null || y === null || z === null || x === undefined || y === undefined || z === undefined) return;

      // Calculate total acceleration vector magnitude
      const acceleration = Math.sqrt(x * x + y * y + z * z);

      if (acceleration > SHAKE_THRESHOLD) {
        const now = Date.now();
        shakeEvents.current.push(now);

        // Remove events older than the time window
        shakeEvents.current = shakeEvents.current.filter((time) => now - time < SHAKE_TIME_WINDOW);

        if (shakeEvents.current.length >= SHAKE_COUNT_REQUIRED) {
          isTriggering.current = true;
          shakeEvents.current = []; // Reset
          
          if ("vibrate" in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
          
          toast.warning("Shake detected! Activating SOS...");
          
          sendAlert().finally(() => {
            // Allow triggering again after 10 seconds of cooldown
            setTimeout(() => {
              isTriggering.current = false;
            }, 10000);
          });
        }
      }
    };

    // Request permission for iOS 13+ devices
    const requestPermissionAndListen = async () => {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        try {
          const permissionState = await (DeviceMotionEvent as any).requestPermission();
          if (permissionState === 'granted') {
            window.addEventListener("devicemotion", handleMotion, true);
          } else {
            console.warn("DeviceMotion permission denied");
          }
        } catch (error) {
          console.error("Error requesting DeviceMotion permission:", error);
        }
      } else {
        // Non-iOS 13+ devices
        window.addEventListener("devicemotion", handleMotion, true);
      }
    };

    requestPermissionAndListen();

    return () => {
      window.removeEventListener("devicemotion", handleMotion, true);
    };
  }, [shakeEnabled, user?.role, sendAlert, sending, activeAlert]);
}
