import { useState, useEffect, useRef } from "react";

interface TelemetryData {
  speed: number; // km/h
  signalStatus: "connected" | "lost" | "weak";
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

export function useLiveTelemetry() {
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    speed: 0,
    signalStatus: "lost",
    latitude: null,
    longitude: null,
    accuracy: null,
  });
  const lastPosRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, accuracy } = pos.coords;
        let computedSpeed = 0;

        if (speed !== null && speed >= 0) {
          computedSpeed = Math.round(speed * 3.6); // m/s to km/h
        } else if (lastPosRef.current) {
          const dt = (Date.now() - lastPosRef.current.time) / 1000;
          if (dt > 0) {
            const dist = haversine(lastPosRef.current.lat, lastPosRef.current.lng, latitude, longitude);
            computedSpeed = Math.round((dist / dt) * 3.6);
          }
        }

        lastPosRef.current = { lat: latitude, lng: longitude, time: Date.now() };

        const signalStatus: TelemetryData["signalStatus"] =
          accuracy !== null && accuracy < 30 ? "connected" : accuracy !== null && accuracy < 100 ? "weak" : "lost";

        setTelemetry({
          speed: Math.min(computedSpeed, 999),
          signalStatus,
          latitude,
          longitude,
          accuracy,
        });
      },
      () => {
        setTelemetry((prev) => ({ ...prev, signalStatus: "lost", speed: 0 }));
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return telemetry;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
