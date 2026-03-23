import { MapPin, Navigation, Locate } from "lucide-react";

export default function MapPage() {
  return (
    <div className="px-4 space-y-4">
      {/* Map placeholder */}
      <div className="relative h-[50vh] rounded-2xl bg-secondary border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="text-sm font-medium">Live Map</p>
            <p className="text-xs text-muted-foreground mt-1">Map integration will appear here</p>
          </div>
        </div>

        {/* Locate button */}
        <button className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-card border shadow-md flex items-center justify-center hover:shadow-lg transition-shadow active:scale-95">
          <Locate className="w-5 h-5 text-primary" />
        </button>
      </div>

      {/* Nearby responders */}
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        <h2 className="text-sm font-semibold mb-3">Nearby Responders</h2>
        <div className="space-y-2">
          {[
            { name: "Officer Mehra", role: "Police", distance: "0.8 km", status: "On duty" },
            { name: "Rajesh K.", role: "Driver", distance: "1.2 km", status: "Available" },
            { name: "Sunita P.", role: "Protector", distance: "1.5 km", status: "Available" },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                {r.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-[10px] text-muted-foreground">{r.role} • {r.distance}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-muted-foreground">{r.status}</span>
              </div>
              <button className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors active:scale-95">
                <Navigation className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
