import { useState } from "react";
import { Heart, Phone, Plus, Trash2, UserPlus, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useEmergencyContacts } from "@/hooks/use-emergency-contacts";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function SafetyPage() {
  const { user } = useAuth();
  const { contacts, loading, addContact, removeContact } = useEmergencyContacts();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const tips = [
    "Share your live location with trusted contacts",
    "Keep emergency numbers on speed dial",
    "Stay aware of your surroundings",
    "Use well-lit and populated routes",
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
      <h2 className="label-caps px-1 animate-in fade-in slide-in-from-bottom-2 duration-500">Safety Tips</h2>

      <div className="space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        {tips.map((tip, i) => (
          <div key={i} className="glass-card flex items-center gap-3 p-3.5 rounded-2xl">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <Heart className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-sm">{tip}</p>
          </div>
        ))}
      </div>

      {/* Emergency Contacts — WOMEN ONLY */}
      {isWomen && (
        <>
          <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150">
            <h2 className="label-caps px-1">Emergency Contacts</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold active:scale-95 transition-transform"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {showForm && (
            <div className="glass-card rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="w-4 h-4 text-primary" />
                <p className="text-sm font-bold">New Contact</p>
              </div>
              <Input
                placeholder="Contact Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 text-sm bg-secondary/50 border-border/40"
              />
              <Input
                placeholder="Phone Number (with country code)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                className="h-10 text-sm bg-secondary/50 border-border/40"
              />
              <button
                onClick={handleAdd}
                disabled={!name.trim() || !phone.trim()}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                Save Contact
              </button>
            </div>
          )}

          {loading ? (
            <div className="glass-card p-6 rounded-2xl text-center">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
              <Phone className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-muted-foreground">No emergency contacts yet</p>
              <p className="text-[10px] text-muted-foreground mt-1">Add contacts to send WhatsApp alerts during emergencies</p>
            </div>
          ) : (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
              {contacts.map((contact) => (
                <div key={contact.id} className="glass-card flex items-center gap-3 p-3.5 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Phone className="w-4 h-4 text-blue-400" />
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

          <div className="glass-card rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              💡 When you press <span className="font-bold text-destructive">HELP ME</span>, the app will automatically send a WhatsApp message with your live GPS location to all your emergency contacts.
            </p>
          </div>
        </>
      )}

      <h2 className="label-caps px-1 pt-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">Emergency Numbers</h2>
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
            className="glass-card flex flex-col items-center p-4 rounded-2xl hover:gold-glow transition-all active:scale-[0.97] text-center"
          >
            <Phone className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-bold">{item.number}</p>
            <p className="text-[10px] text-muted-foreground">{item.name}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
