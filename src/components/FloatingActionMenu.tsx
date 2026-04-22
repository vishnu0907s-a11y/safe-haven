import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MapPin, Phone, Video, X, Bell, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

import { useAuth } from "@/lib/auth-context";

export function FloatingActionMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();

  const isResponder = user && ["driver", "police", "protector"].includes(user.role);

  const menuItems = isResponder ? [
    { icon: MessageSquare, label: t("raiseComplaint" as any) || "Raise Complaint", path: "/complaint", color: "text-orange-500", bg: "bg-orange-500/10" },
    { icon: MapPin, label: t("liveMap") || "Live Map", path: "/map", color: "text-green-500", bg: "bg-green-500/10" },
    { icon: Bell, label: t("alerts") || "Alerts", path: "/alerts", color: "text-red-500", bg: "bg-red-500/10" },
  ] : [
    { icon: Phone, label: t("emergencyContacts") || "Contacts", path: "/emergency-contacts", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: MapPin, label: t("liveMap") || "Live Map", path: "/map", color: "text-green-500", bg: "bg-green-500/10" },
    { icon: Video, label: t("recordVideo") || "Record", path: "/record", color: "text-red-500", bg: "bg-red-500/10" },
  ];

  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="flex flex-col items-end gap-3 mb-2 animate-in slide-in-from-bottom-5 fade-in duration-200">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                navigate(item.path);
                setIsOpen(false);
              }}
              className="flex items-center gap-3 bg-card/90 backdrop-blur border shadow-lg rounded-full pr-1 pl-4 py-1 hover:bg-accent/10 transition-colors"
            >
              <span className="text-sm font-medium">{item.label}</span>
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", item.bg, item.color)}>
                <item.icon className="w-5 h-5" />
              </div>
            </button>
          ))}
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25 transition-transform duration-200 active:scale-95",
          isOpen ? "bg-secondary text-foreground rotate-45" : "bg-primary"
        )}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
