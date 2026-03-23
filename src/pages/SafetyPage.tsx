import { Heart, Phone, MapPin, Shield } from "lucide-react";

export default function SafetyPage() {
  const tips = [
    "Share your live location with trusted contacts",
    "Keep emergency numbers on speed dial",
    "Stay aware of your surroundings",
    "Use well-lit and populated routes",
  ];

  return (
    <div className="px-4 space-y-4">
      <h2 className="text-sm font-semibold px-1 animate-in fade-in slide-in-from-bottom-2 duration-500">Safety Tips</h2>

      <div className="space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-card border">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-sm">{tip}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold px-1 pt-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">Emergency Numbers</h2>
      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300">
        {[
          { name: "Women Helpline", number: "1091" },
          { name: "Police", number: "100" },
          { name: "Ambulance", number: "108" },
          { name: "Child Helpline", number: "1098" },
        ].map((item) => (
          <a
            key={item.number}
            href={`tel:${item.number}`}
            className="flex flex-col items-center p-4 rounded-xl bg-card border hover:shadow-md transition-all active:scale-[0.97] text-center"
          >
            <Phone className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-semibold">{item.number}</p>
            <p className="text-[10px] text-muted-foreground">{item.name}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
