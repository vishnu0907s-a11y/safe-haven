import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Locate, Search, Phone as PhoneIcon, Navigation, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const stationIcon = L.divIcon({
  html: `<div style="background:#3b82f6;width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(59,130,246,0.5);display:flex;align-items:center;justify-content:center;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
  </div>`,
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const myLocationIcon = L.divIcon({
  html: `<div style="background:#eab308;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 5px rgba(234,179,8,0.2),0 2px 6px rgba(0,0,0,0.3);"></div>`,
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

interface PoliceStation {
  id: number;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  phone?: string;
}

export default function PoliceStationsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const myMarkerRef = useRef<L.Marker | null>(null);
  const stationMarkersRef = useRef<L.Marker[]>([]);
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState<PoliceStation | null>(null);
  const [loadingStations, setLoadingStations] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Watch position
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMyPos([pos.coords.latitude, pos.coords.longitude]),
      () => setMyPos([13.0827, 80.2707]), // Default Chennai
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Update my marker & search nearby stations
  useEffect(() => {
    if (!mapRef.current || !myPos) return;
    if (myMarkerRef.current) {
      myMarkerRef.current.setLatLng(myPos);
    } else {
      myMarkerRef.current = L.marker(myPos, { icon: myLocationIcon })
        .addTo(mapRef.current)
        .bindPopup(`<span style='font-size:12px;font-weight:500;color:#eab308'>${t("yourLocation")}</span>`);
      mapRef.current.flyTo(myPos, 14, { duration: 1 });
      searchNearbyStations(myPos[0], myPos[1]);
    }
  }, [myPos]);

  const searchNearbyStations = useCallback(async (lat: number, lon: number) => {
    setLoadingStations(true);
    try {
      const { data, error } = await supabase.rpc("get_nearest_police_stations", {
        user_lat: lat,
        user_lon: lon,
        max_count: 15
      });

      if (error) {
        console.error("Error fetching police stations:", error);
        setStations([]);
      } else if (data) {
        const results: PoliceStation[] = data.map((s: any) => ({
          id: s.id,
          name: s.name,
          lat: s.latitude,
          lon: s.longitude,
          address: s.address,
          phone: s.phone,
        }));
        setStations(results);
        addStationMarkers(results);
      }
    } catch (err) {
      console.error(err);
      setStations([]);
    }
    setLoadingStations(false);
  }, []);

  const addStationMarkers = (stationList: PoliceStation[]) => {
    if (!mapRef.current) return;
    stationMarkersRef.current.forEach((m) => mapRef.current?.removeLayer(m));
    stationMarkersRef.current = [];
    stationList.forEach((s) => {
      const marker = L.marker([s.lat, s.lon], { icon: stationIcon })
        .addTo(mapRef.current!)
        .bindPopup(`<div style="font-size:12px"><p style="font-weight:700">${s.name}</p>${s.address ? `<p>${s.address}</p>` : ""}</div>`);
      marker.on("click", () => setSelectedStation(s));
      stationMarkersRef.current.push(marker);
    });
  };

  const handleLocate = () => {
    if (myPos && mapRef.current) mapRef.current.flyTo(myPos, 16, { duration: 1 });
  };

  const handleGetDirections = (station: PoliceStation) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}`;
    window.open(url, "_blank");
  };

  const filteredStations = stations.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Full screen map */}
      <div className="relative flex-1">
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Search bar overlay */}
        <div className="absolute top-3 left-3 right-3 z-[1000]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("searchStations")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm glass-card border-border/40"
            />
          </div>
        </div>

        {/* Locate button */}
        <button
          onClick={handleLocate}
          className="absolute bottom-4 right-4 z-[1000] w-10 h-10 rounded-full glass-card flex items-center justify-center hover:gold-glow transition-shadow active:scale-95"
        >
          <Locate className="w-5 h-5 text-primary" />
        </button>

        {/* Station detail card */}
        {selectedStation && (
          <div className="absolute bottom-16 left-3 right-3 z-[1000] glass-card rounded-2xl p-4 space-y-3 animate-in slide-in-from-bottom-3 duration-300">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-bold">{selectedStation.name}</p>
                {selectedStation.address && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{selectedStation.address}</p>
                )}
              </div>
              <button onClick={() => setSelectedStation(null)} className="text-muted-foreground text-xs">✕</button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleGetDirections(selectedStation)}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <Navigation className="w-3.5 h-3.5" /> {t("getDirections")}
              </button>
              {selectedStation.phone && (
                <a
                  href={`tel:${selectedStation.phone}`}
                  className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5 active:scale-[0.98]"
                >
                  <PhoneIcon className="w-3.5 h-3.5" /> {t("callStation")}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Nearby stations list */}
      <div className="px-4 py-3 space-y-2 max-h-[35vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="label-caps flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> {t("nearbyStations")}
          </h2>
          {loadingStations && <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
        </div>
        {filteredStations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            {loadingStations ? t("loading") : "No stations found"}
          </p>
        ) : (
          filteredStations.slice(0, 10).map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedStation(s);
                mapRef.current?.flyTo([s.lat, s.lon], 16, { duration: 0.5 });
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border hover:shadow-sm transition-shadow active:scale-[0.98] text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <MapPin className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                {s.address && <p className="text-[10px] text-muted-foreground truncate">{s.address}</p>}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
