import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Locate, Navigation, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useRealtimeAlerts } from "@/hooks/use-emergency-alert";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const victimIcon = new L.DivIcon({
  html: `<div style="background:#ef4444;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  </div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const myLocationIcon = new L.DivIcon({
  html: `<div style="background:#3b82f6;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.2),0 2px 8px rgba(0,0,0,0.3);"></div>`,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function LocateControl({ position }: { position: [number, number] | null }) {
  const map = useMap();
  const handleLocate = () => {
    if (position) map.flyTo(position, 16, { duration: 1 });
  };
  return (
    <button
      onClick={handleLocate}
      className="absolute bottom-4 right-4 z-[1000] w-10 h-10 rounded-full bg-card border shadow-md flex items-center justify-center hover:shadow-lg transition-shadow active:scale-95"
    >
      <Locate className="w-5 h-5 text-primary" />
    </button>
  );
}

export default function MapPage() {
  const { user } = useAuth();
  const { alerts, acceptAlert } = useRealtimeAlerts();
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setMyPos([pos.coords.latitude, pos.coords.longitude]),
      () => setMyPos([20.5937, 78.9629]), // fallback: India center
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const center: [number, number] = myPos || [20.5937, 78.9629];
  const isResponder = user && ["driver", "police", "protector"].includes(user.role);

  return (
    <div className="px-4 space-y-3">
      {/* Map */}
      <div className="relative h-[50vh] rounded-2xl overflow-hidden border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <MapContainer
          center={center}
          zoom={myPos ? 14 : 5}
          className="h-full w-full z-0"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* My location */}
          {myPos && (
            <Marker position={myPos} icon={myLocationIcon}>
              <Popup><span className="text-xs font-medium">You are here</span></Popup>
            </Marker>
          )}

          {/* Victim markers from active alerts */}
          {alerts.map((alert) => (
            <Marker
              key={alert.id}
              position={[alert.latitude, alert.longitude]}
              icon={victimIcon}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-red-600">🚨 Emergency</p>
                  <p>{new Date(alert.created_at).toLocaleTimeString()}</p>
                  <p>{(alert.accepted_by || []).length}/10 responders</p>
                </div>
              </Popup>
            </Marker>
          ))}

          <LocateControl position={myPos} />
        </MapContainer>
      </div>

      {/* Alert cards below map */}
      {isResponder && alerts.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Active Emergencies
          </h2>
          <div className="space-y-2">
            {alerts.map((alert) => {
              const accepted = alert.accepted_by || [];
              const hasAccepted = user ? accepted.includes(user.user_id) : false;
              return (
                <div key={alert.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-destructive/20">
                  <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center text-destructive text-sm font-bold">
                    !
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">Emergency Alert</p>
                    <p className="text-[10px] text-muted-foreground">
                      {alert.latitude.toFixed(3)}, {alert.longitude.toFixed(3)} • {accepted.length} responding
                    </p>
                  </div>
                  {hasAccepted ? (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : (
                    <button
                      onClick={() => acceptAlert(alert.id)}
                      className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors active:scale-95"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No alerts state for responders */}
      {isResponder && alerts.length === 0 && (
        <div className="p-5 rounded-xl bg-card border text-center animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No active emergencies nearby</p>
        </div>
      )}
    </div>
  );
}
