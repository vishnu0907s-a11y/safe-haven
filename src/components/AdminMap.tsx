import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useI18n } from "@/lib/i18n-context";

// Fix for default Leaflet markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const alertIcon = L.divIcon({
  html: `<div style="background:#ef4444;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(239,68,68,0.6);display:flex;align-items:center;justify-content:center;animation:pulse 1.5s infinite;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  </div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const rescuerIcon = L.divIcon({
  html: `<div style="background:#22c55e;width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px rgba(34,197,94,0.6);display:flex;align-items:center;justify-content:center;animation:pulse 2s infinite;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  </div>`,
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface AdminMapProps {
  alerts: any[];
  rescuers: any[];
}

export function AdminMap({ alerts, rescuers }: AdminMapProps) {
  const { t } = useI18n();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const alertMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const rescuerMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const circlesRef = useRef<L.Circle[]>([]);

  const [showAlerts, setShowAlerts] = useState(true);
  const [showRescuers, setShowRescuers] = useState(true);
  const [filterActiveOnly, setFilterActiveOnly] = useState(true);

  // Init Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OSM',
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Sync Markers
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Filter alerts
    const visibleAlerts = showAlerts 
      ? alerts.filter(a => filterActiveOnly ? a.status === "active" : true)
      : [];

    // Clear old alert markers
    const currentAlertIds = new Set(visibleAlerts.map(a => a.id));
    alertMarkersRef.current.forEach((marker, id) => {
      if (!currentAlertIds.has(id)) { map.removeLayer(marker); alertMarkersRef.current.delete(id); }
    });

    // Clear old circles
    circlesRef.current.forEach(c => map.removeLayer(c));
    circlesRef.current = [];

    // Add new alert markers & circles
    visibleAlerts.forEach(alert => {
      if (!alert.latitude || !alert.longitude) return;
      const pos: [number, number] = [alert.latitude, alert.longitude];
      
      // Add Circle
      if (alert.status === "active") {
        const circle = L.circle(pos, {
          radius: 2000, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.1, weight: 1, dashArray: "5, 5"
        }).addTo(map);
        circlesRef.current.push(circle);
      }

      let marker = alertMarkersRef.current.get(alert.id);
      if (marker) {
        marker.setLatLng(pos);
      } else {
        marker = L.marker(pos, { icon: alertIcon }).addTo(map);
        alertMarkersRef.current.set(alert.id, marker);
      }

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px;">
          <p style="font-weight:700;font-size:14px;margin:0 0 4px;display:flex;align-items:center;gap:4px;">
            <span style="color:#ef4444;">🔴</span> ${alert.user_name || "Unknown"}
          </p>
          <p style="font-size:11px;color:#666;margin:0 0 2px;">${new Date(alert.created_at).toLocaleString()}</p>
          <p style="font-size:11px;font-weight:600;color:${alert.status === 'active' ? '#ef4444' : '#22c55e'};margin:0 0 8px;">
            ${alert.status.toUpperCase()}
          </p>
          <button style="width:100%;padding:6px;background:#ef4444;color:white;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">
            ${t("assignRescuer")}
          </button>
        </div>
      `);
    });

    // Handle Rescuers
    const visibleRescuers = showRescuers ? rescuers : [];
    const currentRescuerIds = new Set(visibleRescuers.map(r => r.id));
    rescuerMarkersRef.current.forEach((marker, id) => {
      if (!currentRescuerIds.has(id)) { map.removeLayer(marker); rescuerMarkersRef.current.delete(id); }
    });

    visibleRescuers.forEach(rescuer => {
      if (!rescuer.latitude || !rescuer.longitude) return;
      const pos: [number, number] = [rescuer.latitude, rescuer.longitude];
      
      let marker = rescuerMarkersRef.current.get(rescuer.id);
      if (marker) {
        marker.setLatLng(pos);
      } else {
        marker = L.marker(pos, { icon: rescuerIcon }).addTo(map);
        rescuerMarkersRef.current.set(rescuer.id, marker);
      }

      // Calculate nearest alert if any
      let nearestAlertDist = Infinity;
      visibleAlerts.forEach(a => {
        if (a.status === "active" && a.latitude && a.longitude) {
          const d = getDistanceKm(pos[0], pos[1], a.latitude, a.longitude);
          if (d < nearestAlertDist) nearestAlertDist = d;
        }
      });
      const distStr = nearestAlertDist !== Infinity ? `${nearestAlertDist.toFixed(1)} km from alert` : "Available";

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:160px;">
          <p style="font-weight:700;font-size:13px;margin:0 0 2px;display:flex;align-items:center;gap:4px;">
            <span style="color:#22c55e;">🟢</span> ${rescuer.full_name || "Unknown"}
          </p>
          <p style="font-size:11px;color:#666;margin:0 0 4px;text-transform:capitalize;">Role: ${rescuer.role || "Responder"}</p>
          <p style="font-size:11px;font-weight:600;color:#eab308;margin:0;">
            ${distStr}
          </p>
        </div>
      `);
    });

    // Auto-fit bounds if we have markers and map was just loaded
    if ((visibleAlerts.length > 0 || visibleRescuers.length > 0) && map.getZoom() === 5) {
      const bounds = L.latLngBounds([]);
      visibleAlerts.forEach(a => { if(a.latitude && a.longitude) bounds.extend([a.latitude, a.longitude]); });
      visibleRescuers.forEach(r => { if(r.latitude && r.longitude) bounds.extend([r.latitude, r.longitude]); });
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }

  }, [alerts, rescuers, showAlerts, showRescuers, filterActiveOnly, t]);

  return (
    <div className="relative w-full h-[65vh] rounded-2xl overflow-hidden border border-border/50 shadow-sm animate-in fade-in duration-500">
      <div ref={mapContainerRef} className="absolute inset-0" />
      
      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 z-[1000] bg-background/80 backdrop-blur-xl rounded-xl border border-border/40 p-3 flex flex-col gap-2 shadow-lg">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{t("mapView")}</h3>
        
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input 
            type="checkbox" 
            checked={showAlerts} 
            onChange={(e) => setShowAlerts(e.target.checked)}
            className="rounded border-input text-primary focus:ring-primary/20"
          />
          <span className="font-medium text-foreground">{t("showAlerts")}</span>
        </label>
        
        {showAlerts && (
          <label className="flex items-center gap-2 text-xs ml-6 cursor-pointer text-muted-foreground">
            <input 
              type="checkbox" 
              checked={filterActiveOnly} 
              onChange={(e) => setFilterActiveOnly(e.target.checked)}
              className="rounded border-input text-destructive focus:ring-destructive/20"
            />
            Active Only
          </label>
        )}

        <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
          <input 
            type="checkbox" 
            checked={showRescuers} 
            onChange={(e) => setShowRescuers(e.target.checked)}
            className="rounded border-input text-emerald-500 focus:ring-emerald-500/20"
          />
          <span className="font-medium text-foreground">{t("showRescuers")}</span>
        </label>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-background/80 backdrop-blur-xl rounded-xl border border-border/40 p-2.5 flex flex-col gap-2 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground">ALERT</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground">RESCUER</span>
        </div>
      </div>
    </div>
  );
}
