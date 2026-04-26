import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  created_at: string;
}

export function useEmergencyContacts() {
  const { supabaseUser } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!supabaseUser) return;
    const { data } = await supabase
      .from("emergency_contacts")
      .select("*")
      .eq("user_id", supabaseUser.id)
      .order("created_at", { ascending: true });
    if (data) setContacts(data);
    setLoading(false);
  }, [supabaseUser]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const addContact = useCallback(async (name: string, phone: string) => {
    if (!supabaseUser) return;
    const { error } = await supabase
      .from("emergency_contacts")
      .insert({ user_id: supabaseUser.id, name, phone });
    if (error) {
      toast.error("Failed to add contact");
    } else {
      toast.success("Contact added");
      fetchContacts();
    }
  }, [supabaseUser, fetchContacts]);

  const removeContact = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("emergency_contacts")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Failed to remove contact");
    } else {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast.success("Contact removed");
    }
  }, []);

  // WhatsApp alert — send to ALL contacts
  const sendWhatsAppAlerts = useCallback(async (latitude: number, longitude: number) => {
    if (contacts.length === 0) return;

    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const messageText = `🚨 *EMERGENCY SOS ALERT* 🚨\n\nI need help immediately! My live location is shown below.\n\n📍 *My Location:* ${mapsUrl}\n\nPlease respond or call emergency services right away!`;
    const encodedMessage = encodeURIComponent(messageText);

    // 1. Try Native Share API (Best for Mobile, allows multi-select in WhatsApp)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "EMERGENCY SOS",
          text: messageText,
        });
        return; // If share successful, stop here
      } catch (err) {
        console.log("Share API cancelled or failed, falling back to direct links...");
      }
    }

    // 2. Sequential Opener (Fallback)
    // Browsers block multiple window.open calls. We'll use a small delay and 
    // try to open each contact. Note: User might need to allow popups.
    contacts.forEach((contact, index) => {
      setTimeout(() => {
        const phone = contact.phone.replace(/[^0-9+]/g, "");
        // Use api.whatsapp.com for better cross-platform support
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
        
        // Open in a new tab/app
        const win = window.open(whatsappUrl, "_blank");
        if (!win && index === 0) {
          // If even the first one fails, try a direct navigation as a last resort
          window.location.href = whatsappUrl;
        }
      }, index * 1000); // 1s delay to try and bypass simple popup blockers
    });

    if (contacts.length > 1) {
      toast.info("Opening emergency chats... Please click send in each.", { duration: 5000 });
    }
  }, [contacts]);

  return { contacts, loading, addContact, removeContact, sendWhatsAppAlerts };
}
