import { Bell, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const alerts = [
  { id: 1, type: "emergency", text: "Emergency alert from Kavita N.", time: "2 min ago", status: "active" },
  { id: 2, type: "accepted", text: "Your request was accepted by Officer Mehra", time: "15 min ago", status: "resolved" },
  { id: 3, type: "completed", text: "Rescue completed successfully", time: "1 hour ago", status: "resolved" },
  { id: 4, type: "emergency", text: "Emergency alert from Anita D.", time: "3 hours ago", status: "resolved" },
];

export default function AlertsPage() {
  return (
    <div className="px-4 space-y-4">
      <h2 className="text-sm font-semibold px-1 animate-in fade-in slide-in-from-bottom-2 duration-500">Notifications</h2>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div
            key={alert.id}
            className="flex items-start gap-3 p-4 rounded-xl bg-card border animate-in fade-in slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center mt-0.5",
              alert.type === "emergency" && "bg-red-500/10 text-red-600 dark:text-red-400",
              alert.type === "accepted" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
              alert.type === "completed" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            )}>
              {alert.type === "emergency" && <AlertTriangle className="w-4 h-4" />}
              {alert.type === "accepted" && <Bell className="w-4 h-4" />}
              {alert.type === "completed" && <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{alert.text}</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{alert.time}</span>
              </div>
            </div>
            <span className={cn(
              "w-2 h-2 rounded-full mt-2",
              alert.status === "active" ? "bg-red-500" : "bg-muted"
            )} />
          </div>
        ))}
      </div>
    </div>
  );
}
