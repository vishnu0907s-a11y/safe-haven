import { useEffect, useRef, useState, useCallback, lazy } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Locate, Navigation, AlertTriangle, CheckCircle2, Eye, Signal, SignalZero, SignalLow, Gauge, Shield } from "lucide-react";
import { useRealtimeAlerts } from "@/hooks/use-emergency-alert";
import { useDangerZones } from "@/hooks/use-danger-zones";
import { useLiveTelemetry } from "@/hooks/use-live-telemetry";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
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
  html: `<div style="width:30px;height:30px;border-radius:50%;background:rgba(234,179,8,0.25);display:flex;align-items:center;justify-content:center;animation:pulse 2s infinite;">
    <div style="width:14px;height:14px;border-radius:50%;background:#eab308;border:2.5px solid white;box-shadow:0 0 10px rgba(234,179,8,0.6);"></div>
  </div>`,
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const policeIcon = L.divIcon({
  html: `<div style="background:#3b82f6;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(59,130,246,0.5);display:flex;align-items:center;justify-content:center;">
    <span style="font-size:14px;">🚔</span>
  </div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getEta(distKm: number) {
  const minutes = Math.round((distKm / 30) * 60);
  if (minutes < 1) return "<1 min";
  return `~${minutes} min`;
}

interface PoliceStation {
  id: number;
  name: string;
  lat: number;
  lon: number;
  phone?: string;
}

export default function MapPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { alerts, acceptAlert } = useRealtimeAlerts();
  const { zones } = useDangerZones();
  const telemetry = useLiveTelemetry();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const myMarkerRef = useRef<L.Marker | null>(null);
  const alertMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLineRef = useRef<L.Polyline | null>(null);
  const dangerCirclesRef = useRef<L.Circle[]>([]);
  const policeMarkersRef = useRef<L.Marker[]>([]);
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [trackingAlertId, setTrackingAlertId] = useState<string | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showPolice, setShowPolice] = useState(false);
  const [policeStations, setPoliceStations] = useState<PoliceStation[]>([]);
  const [loadingPolice, setLoadingPolice] = useState(false);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OSM &copy; CARTO',
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Watch position
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMyPos([pos.coords.latitude, pos.coords.longitude]),
      () => setMyPos([20.5937, 78.9629]),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // My marker
  useEffect(() => {
    if (!mapRef.current || !myPos) return;
    if (myMarkerRef.current) {
      myMarkerRef.current.setLatLng(myPos);
    } else {
      myMarkerRef.current = L.marker(myPos, { icon: myLocationIcon }).addTo(mapRef.current);
      mapRef.current.flyTo(myPos, 14, { duration: 1 });
    }
  }, [myPos]);

  // Alert markers
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const currentIds = new Set(alerts.map((a) => a.id));
    alertMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { map.removeLayer(marker); alertMarkersRef.current.delete(id); }
    });
    alerts.forEach((alert) => {
      const pos: [number, number] = [alert.latitude, alert.longitude];
      if (alertMarkersRef.current.has(alert.id)) {
        alertMarkersRef.current.get(alert.id)!.setLatLng(pos);
      } else {
        const marker = L.marker(pos, { icon: victimIcon }).addTo(map);
        alertMarkersRef.current.set(alert.id, marker);
      }
    });
  }, [alerts]);

  // Danger zones
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    dangerCirclesRef.current.forEach((c) => map.removeLayer(c));
    dangerCirclesRef.current = [];
    zones.forEach((zone) => {
      const color = zone.risk_level === "high" ? "#ef4444" : "#f97316";
      const circle = L.circle([zone.latitude, zone.longitude], {
        radius: zone.radius_meters, color, fillColor: color, fillOpacity: 0.15, weight: 2, opacity: 0.5,
      }).addTo(map);
      dangerCirclesRef.current.push(circle);
    });
  }, [zones]);

  // Route line
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }
    if (!trackingAlertId || !myPos) return;
    const alert = alerts.find((a) => a.id === trackingAlertId);
    if (!alert) return;
    const victimPos: [number, number] = [alert.latitude, alert.longitude];
    routeLineRef.current = L.polyline([myPos, victimPos], {
      color: "#FFD700", weight: 4, opacity: 0.9, dashArray: "10, 8",
    }).addTo(map);
    map.fitBounds(L.latLngBounds([myPos, victimPos]), { padding: [60, 60] });
  }, [trackingAlertId, myPos, alerts]);

  // Police stations toggle
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear existing police markers
    policeMarkersRef.current.forEach((m) => map.removeLayer(m));
    policeMarkersRef.current = [];

    if (!showPolice || policeStations.length === 0) return;

    policeStations.forEach((station) => {
      const marker = L.marker([station.lat, station.lon], { icon: policeIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:160px;">
            <p style="font-weight:700;font-size:13px;margin:0 0 6px;">${station.name || "Police Station"}</p>
            <div style="display:flex;gap:6px;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}" target="_blank" style="flex:1;text-align:center;padding:6px;background:#eab308;color:#000;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none;">${t("getDirections")}</a>
              ${station.phone ? `<a href="tel:${station.phone}" style="flex:1;text-align:center;padding:6px;background:#3b82f6;color:#fff;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none;">${t("callStation")}</a>` : ""}
            </div>
          </div>
        `);
      policeMarkersRef.current.push(marker);
    });
  }, [showPolice, policeStations, t]);

  // Fetch police stations when toggled
  const fetchPoliceStations = useCallback(async () => {
    if (!myPos) return;
    setLoadingPolice(true);
    try {
      const [lat, lon] = myPos;
      const query = `[out:json][timeout:10];node["amenity"="police"](around:5000,${lat},${lon});out body;`;
      const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await res.json();
      const stations: PoliceStation[] = (data.elements || []).map((el: any) => ({
        id: el.id,
        name: el.tags?.name || "Police Station",
        lat: el.lat,
        lon: el.lon,
        phone: el.tags?.phone || el.tags?.["contact:phone"],
      }));
      setPoliceStations(stations);
    } catch {
      setPoliceStations([]);
    }
    setLoadingPolice(false);
  }, [myPos]);

  const togglePolice = () => {
    const next = !showPolice;
    setShowPolice(next);
    if (next && policeStations.length === 0) fetchPoliceStations();
  };

  const handleLocate = () => {
    if (myPos && mapRef.current) mapRef.current.flyTo(myPos, 16, { duration: 1 });
  };

  const handleTrackVictim = useCallback((alertId: string) => {
    setTrackingAlertId((prev) => (prev === alertId ? null : alertId));
  }, []);

  const isResponder = user && ["driver", "police", "protector"].includes(user.role);

  const signalIcon = telemetry.signalStatus === "connected"
    ? <Signal className="w-3.5 h-3.5 text-emerald-400" />
    : telemetry.signalStatus === "weak"
    ? <SignalLow className="w-3.5 h-3.5 text-primary" />
    : <SignalZero className="w-3.5 h-3.5 text-destructive" />;

  const signalLabel = telemetry.signalStatus === "connected" ? "CONNECTED" : telemetry.signalStatus === "weak" ? "WEAK" : "SIGNAL LOST";
  const signalColor = telemetry.signalStatus === "connected" ? "text-emerald-400" : telemetry.signalStatus === "weak" ? "text-primary" : "text-destructive";

  return (
    <div className="fixed inset-0 z-0">
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Floating status bar */}
      <div className="absolute top-14 left-4 right-4 z-[1000] bg-background/80 backdrop-blur-xl rounded-2xl border border-border/30 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          {signalIcon}
          <span className={cn("text-[10px] font-bold tracking-wider", signalColor)}>{signalLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-foreground">{telemetry.speed} <span className="text-[9px] text-muted-foreground">KM/H</span></span>
        </div>
        {trackingAlertId && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-bold text-primary">TRACKING</span>
          </div>
        )}
      </div>

      {/* Danger zone legend */}
      {zones.length > 0 && (
        <div className="absolute top-28 left-4 z-[1000] bg-background/70 backdrop-blur-lg rounded-xl border border-border/20 px-3 py-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-destructive" /><span className="text-[9px] text-muted-foreground">High</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-[9px] text-muted-foreground">Medium</span></div>
        </div>
      )}

      {/* FAB - Police Station toggle */}
      <button
        onClick={togglePolice}
        className={cn(
          "absolute bottom-44 right-5 z-[1000] w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all",
          showPolice
            ? "bg-blue-500 text-white"
            : "bg-primary text-primary-foreground"
        )}
      >
        {loadingPolice ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Shield className="w-6 h-6" />
        )}
      </button>

      {/* Police station count badge */}
      {showPolice && policeStations.length > 0 && (
        <div className="absolute bottom-[196px] right-5 z-[1000] bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {policeStations.length} 🚔
        </div>
      )}

      {/* FAB - Locate */}
      <button
        onClick={handleLocate}
        className="absolute bottom-28 right-5 z-[1000] w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl active:scale-95 transition-transform"
      >
        <Locate className="w-6 h-6" />
      </button>

      {/* FAB - Toggle alerts panel (responders only) */}
      {isResponder && alerts.length > 0 && (
        <button
          onClick={() => setShowAlerts(!showAlerts)}
          className="absolute bottom-28 left-5 z-[1000] w-14 h-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-xl active:scale-95 transition-transform"
        >
          <AlertTriangle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{alerts.length}</span>
        </button>
      )}

      {/* Alerts panel (slide-up) */}
      {isResponder && showAlerts && alerts.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 z-[1000] max-h-[40vh] overflow-y-auto space-y-2 animate-in slide-in-from-bottom-4 duration-300">
          {alerts.map((alert) => {
            const accepted = alert.accepted_by || [];
            const hasAccepted = user ? accepted.includes(user.user_id) : false;
            const isTracking = trackingAlertId === alert.id;
            let distText = "";
            let etaText = "";
            if (myPos) {
              const d = getDistanceKm(myPos[0], myPos[1], alert.latitude, alert.longitude);
              distText = d < 1 ? `${(d * 1000).toFixed(0)}m` : `${d.toFixed(1)} km`;
              etaText = getEta(d);
            }
            return (
              <div key={alert.id} className={cn("bg-background/85 backdrop-blur-xl border border-border/30 p-3 rounded-2xl shadow-lg", isTracking && "border-primary/50")}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-destructive/15 flex items-center justify-center text-destructive text-sm font-bold shrink-0">!</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{t("emergencyAlert")}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {accepted.length} {t("responding")}{distText && ` • ${distText}`}{etaText && ` • ETA ${etaText}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {hasAccepted && (
                      <button onClick={() => handleTrackVictim(alert.id)} className={cn("p-2 rounded-xl transition-colors active:scale-95", isTracking ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {hasAccepted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <button onClick={() => acceptAlert(alert.id)} className="p-2 rounded-xl bg-primary text-primary-foreground active:scale-95">
                        <Navigation className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No emergencies badge for responders */}
      {isResponder && alerts.length === 0 && (
        <div className="absolute bottom-28 left-5 z-[1000] bg-background/80 backdrop-blur-xl rounded-full border border-border/20 px-3 py-2 flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-medium text-muted-foreground">All clear</span>
        </div>
      )}
    </div>
  );
}
