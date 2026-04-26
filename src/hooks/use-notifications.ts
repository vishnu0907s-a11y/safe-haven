import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "alert" | "complaint" | "system";
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { supabaseUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!supabaseUser) return;
    
    const { data, error } = await supabase
      .from("notifications" as any)
      .select("*")
      .eq("user_id", supabaseUser.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.warn("Notifications table not ready or error:", error.message);
      return;
    }

    if (data) {
      const typedData = data as unknown as AppNotification[];
      setNotifications(typedData);
      setUnreadCount(typedData.filter(n => !n.is_read).length);
    }
  }, [supabaseUser]);

  useEffect(() => {
    fetchNotifications();

    if (!supabaseUser) return;

    // Real-time subscription
    const channel = supabase
      .channel(`user-notifications-${supabaseUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${supabaseUser.id}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Play sound
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed:", e));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseUser, fetchNotifications]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications" as any)
      .update({ is_read: true } as any)
      .eq("id", id);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!supabaseUser) return;
    const { error } = await supabase
      .from("notifications" as any)
      .update({ is_read: true } as any)
      .eq("user_id", supabaseUser.id);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const createNotification = async (userId: string, title: string, message: string, type: AppNotification["type"]) => {
    const { error } = await supabase
      .from("notifications" as any)
      .insert({
        user_id: userId,
        title,
        message,
        type,
        is_read: false
      } as any);
    
    if (error) console.error("Error creating notification:", error);
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, createNotification };
}
