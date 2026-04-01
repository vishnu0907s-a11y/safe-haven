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

  // WhatsApp-only alert — no confirmation, instant trigger
  const sendWhatsAppAlerts = useCallback((latitude: number, longitude: number) => {
    const mapsUrl = `https://maps.google.com/maps?q=${latitude},${longitude}`;
    const message = encodeURIComponent(
      `🚨 Emergency Alert!\n\nI need help immediately.\n\n📍 My live location:\n${mapsUrl}\n\nPlease respond immediately or call emergency services.`
    );

    contacts.forEach((contact, i) => {
      const phone = contact.phone.replace(/[^0-9+]/g, "");
      const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
      setTimeout(() => {
        window.open(whatsappUrl, "_blank");
      }, i * 1500);
    });
  }, [contacts]);

  return { contacts, loading, addContact, removeContact, sendWhatsAppAlerts };
}
