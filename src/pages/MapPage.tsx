import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Locate, Navigation, AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { useRealtimeAlerts } from "@/hooks/use-emergency-alert";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const victimIcon = L.divIcon({
  html: `<div style="background:#ef4444;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(239,68,68,0.6);display:flex;align-items:center;justify-content:center;animation:pulse 1.5s infinite;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  </div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const myLocationIcon = L.divIcon({
  html: `<div style="background:#eab308;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(234,179,8,0.2),0 2px 8px rgba(0,0,0,0.3);"></div>`,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function MapPage() {
  const { user } = useAuth();
  const { alerts, acceptAlert } = useRealtimeAlerts();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const myMarkerRef = useRef<L.Marker | null>(null);
  const alertMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLineRef = useRef<L.Polyline | null>(null);
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [trackingAlertId, setTrackingAlertId] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMyPos([pos.coords.latitude, pos.coords.longitude]),
      () => setMyPos([20.5937, 78.9629]),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !myPos) return;

    if (myMarkerRef.current) {
      myMarkerRef.current.setLatLng(myPos);
    } else {
      myMarkerRef.current = L.marker(myPos, { icon: myLocationIcon })
        .addTo(mapRef.current)
        .bindPopup("<span style='font-size:12px;font-weight:500;color:#eab308'>You are here</span>");
      mapRef.current.flyTo(myPos, 14, { duration: 1 });
    }
  }, [myPos]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const currentIds = new Set(alerts.map((a) => a.id));

    alertMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        map.removeLayer(marker);
        alertMarkersRef.current.delete(id);
      }
    });

    alerts.forEach((alert) => {
      const pos: [number, number] = [alert.latitude, alert.longitude];
      if (alertMarkersRef.current.has(alert.id)) {
        alertMarkersRef.current.get(alert.id)!.setLatLng(pos);
      } else {
        const marker = L.marker(pos, { icon: victimIcon })
          .addTo(map)
          .bindPopup(
            `<div style="font-size:12px"><p style="font-weight:700;color:#ef4444">🚨 Emergency</p><p>${new Date(alert.created_at).toLocaleTimeString()}</p><p>${(alert.accepted_by || []).length}/10 responders</p></div>`
          );
        alertMarkersRef.current.set(alert.id, marker);
      }
    });
  }, [alerts]);

  // Draw route line when tracking a victim
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (!trackingAlertId || !myPos) return;

    const alert = alerts.find((a) => a.id === trackingAlertId);
    if (!alert) return;

    const victimPos: [number, number] = [alert.latitude, alert.longitude];
    routeLineRef.current = L.polyline([myPos, victimPos], {
      color: "#eab308",
      weight: 3,
      opacity: 0.8,
      dashArray: "8, 8",
    }).addTo(map);

    const bounds = L.latLngBounds([myPos, victimPos]);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [trackingAlertId, myPos, alerts]);

  const handleLocate = () => {
    if (myPos && mapRef.current) {
      mapRef.current.flyTo(myPos, 16, { duration: 1 });
    }
  };

  const handleTrackVictim = useCallback((alertId: string) => {
    setTrackingAlertId((prev) => (prev === alertId ? null : alertId));
  }, []);

  const isResponder = user && ["driver", "police", "protector"].includes(user.role);

  return (
    <div className="px-4 space-y-3">
      <div className="relative h-[50vh] rounded-2xl overflow-hidden border border-border/40 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div ref={mapContainerRef} className="h-full w-full" />
        <button
          onClick={handleLocate}
          className="absolute bottom-4 right-4 z-[1000] w-10 h-10 rounded-full glass-card flex items-center justify-center hover:gold-glow transition-shadow active:scale-95"
        >
          <Locate className="w-5 h-5 text-primary" />
        </button>
        {trackingAlertId && (
          <div className="absolute top-4 left-4 z-[1000] glass-card rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary">LIVE TRACKING</span>
          </div>
        )}
      </div>

      {isResponder && alerts.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          <h2 className="label-caps mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Active Emergencies
          </h2>
          <div className="space-y-2">
            {alerts.map((alert) => {
              const accepted = alert.accepted_by || [];
              const hasAccepted = user ? accepted.includes(user.user_id) : false;
              const isTracking = trackingAlertId === alert.id;
              return (
                <div key={alert.id} className={cn("glass-card flex items-center gap-3 p-3 rounded-2xl", isTracking && "border-primary/40")}>
                  <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center text-destructive text-sm font-bold">
                    !
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">Emergency Alert</p>
                    <p className="text-[10px] text-muted-foreground">
                      {alert.latitude.toFixed(3)}, {alert.longitude.toFixed(3)} • {accepted.length} responding
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasAccepted && (
                      <button
                        onClick={() => handleTrackVictim(alert.id)}
                        className={cn(
                          "p-2 rounded-xl transition-colors active:scale-95",
                          isTracking ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                        title="Live track victim"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {hasAccepted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <button
                        onClick={() => acceptAlert(alert.id)}
                        className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isResponder && alerts.length === 0 && (
        <div className="glass-card p-5 rounded-2xl text-center animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No active emergencies nearby</p>
        </div>
      )}
    </div>
  );
}
