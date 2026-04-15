import { useState } from "react";
import { Heart, Phone, Plus, Trash2, UserPlus, Shield, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { useEmergencyContacts } from "@/hooks/use-emergency-contacts";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function SafetyPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { contacts, loading, addContact, removeContact } = useEmergencyContacts();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const tips = [
    t("tip1"),
    t("tip2"),
    t("tip3"),
    t("tip4"),
  ];

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) return;
    await addContact(name.trim(), phone.trim());
    setName("");
    setPhone("");
    setShowForm(false);
  };

  const isWomen = user?.role === "women";

  return (
    <div className="px-4 space-y-4">
      {/* Emergency Contacts — WOMEN ONLY (moved above tips) */}
      {isWomen && (
        <>
          <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-3 duration-500">
            <h2 className="label-caps px-1">{t("emergencyContacts")}</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold active:scale-95 transition-transform glow-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("add")}
            </button>
          </div>

          {showForm && (
            <div className="rounded-2xl bg-card/80 backdrop-blur-lg border glow-border p-4 space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="w-4 h-4 text-primary" />
                <p className="text-sm font-bold">{t("newContact")}</p>
              </div>
              <Input
                placeholder={t("contactNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-sm bg-secondary/50 border-border/40"
              />
              <Input
                placeholder={t("phoneWithCountry")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                className="h-10 text-sm bg-secondary/50 border-border/40"
              />
              <button
                onClick={handleAdd}
                disabled={!name.trim() || !phone.trim()}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform glow-primary"
              >
                {t("saveContact")}
              </button>
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl bg-card/80 backdrop-blur-lg border glow-border p-6 text-center">
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="rounded-2xl bg-card/80 backdrop-blur-lg border glow-border p-8 text-center animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
              <Phone className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-muted-foreground">{t("noContactsYet")}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{t("addContactsWhatsApp")}</p>
            </div>
          ) : (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
              {contacts.map((contact) => (
                <div key={contact.id} className="rounded-2xl bg-card/80 backdrop-blur-lg border glow-border flex items-center gap-3 p-3.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 glow-primary">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{contact.name}</p>
                    <p className="text-[10px] text-muted-foreground">{contact.phone}</p>
                  </div>
                  <button
                    onClick={() => removeContact(contact.id)}
                    className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl bg-card/80 backdrop-blur-lg border glow-border p-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              💡 {t("helpMeInfo")}
            </p>
          </div>
        </>
      )}

      {/* Emergency Numbers */}
      <h2 className="label-caps px-1 pt-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">{t("emergencyNumbers")}</h2>
      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300">
        {[
          { name: t("womenHelpline"), number: "1091" },
          { name: t("police"), number: "100" },
          { name: t("ambulance"), number: "108" },
          { name: t("childHelpline"), number: "1098" },
        ].map((item) => (
          <a
            key={item.number}
            href={`tel:${item.number}`}
            className="rounded-2xl bg-card/80 backdrop-blur-lg border glow-border flex flex-col items-center p-4 hover:glow-primary transition-all active:scale-[0.97] text-center"
          >
            <Phone className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-bold">{item.number}</p>
            <p className="text-[10px] text-muted-foreground">{item.name}</p>
          </a>
        ))}
      </div>

      {/* Safety Tips — LAST */}
      <h2 className="label-caps px-1 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">{t("safetyTips")}</h2>
      <div className="space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-400">
        {tips.map((tip, i) => (
          <div key={i} className="rounded-2xl bg-card/80 backdrop-blur-lg border glow-border flex items-center gap-3 p-3.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 glow-primary">
              <Heart className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-sm">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
