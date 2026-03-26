import { useState } from "react";
import { Phone, Plus, Trash2, UserPlus } from "lucide-react";
import { useEmergencyContacts } from "@/hooks/use-emergency-contacts";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function EmergencyContactsPage() {
  const { contacts, loading, addContact, removeContact } = useEmergencyContacts();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) return;
    await addContact(name.trim(), phone.trim());
    setName("");
    setPhone("");
    setShowForm(false);
  };

  return (
    <div className="px-4 space-y-4">
      <div className="flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-500">
        <h2 className="label-caps">Emergency Contacts</h2>
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
            placeholder="Phone Number"
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
        <div className="glass-card p-8 rounded-2xl text-center animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          <Phone className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-muted-foreground">No emergency contacts yet</p>
          <p className="text-[10px] text-muted-foreground mt-1">Add contacts to auto-call during emergencies</p>
        </div>
      ) : (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
          {contacts.map((contact) => (
            <div key={contact.id} className="glass-card flex items-center gap-3 p-3.5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Phone className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{contact.name}</p>
                <p className="text-[10px] text-muted-foreground">{contact.phone}</p>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={`tel:${contact.phone}`}
                  className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => removeContact(contact.id)}
                  className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-200">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          💡 When you press <span className="font-bold text-destructive">HELP ME</span>, the app will automatically attempt to call police (100) and all your emergency contacts listed above.
        </p>
      </div>
    </div>
  );
}
