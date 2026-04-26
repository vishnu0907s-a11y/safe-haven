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
    contacts.forEach((contact, index) => {
      setTimeout(() => {
        const phone = contact.phone.replace(/[^0-9+]/g, "");
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
        window.open(whatsappUrl, "_blank");
      }, index * 800); // Slightly faster
    });

    toast.info("Opening chats... Click send in each.", { duration: 4000 });
  }, [contacts]);

  // SMS alert — This IS the only way to "Automatically Select" multiple people at once
  const sendSMSAlerts = useCallback((latitude: number, longitude: number) => {
    if (contacts.length === 0) return;
    
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const messageText = `EMERGENCY SOS ALERT! I need help immediately! My location: ${mapsUrl}`;
    
    // Join all phones for the multi-recipient SMS scheme
    const phones = contacts.map(c => c.phone.replace(/[^0-9+]/g, "")).join(",");
    
    // Different schemes for iOS/Android
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const smsUrl = isIOS 
      ? `sms:${phones}&body=${encodeURIComponent(messageText)}`
      : `sms:${phones}?body=${encodeURIComponent(messageText)}`;
      
    window.location.href = smsUrl;
  }, [contacts]);

  return { contacts, loading, addContact, removeContact, sendWhatsAppAlerts, sendSMSAlerts };
}
