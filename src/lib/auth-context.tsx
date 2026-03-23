import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type UserRole = "women" | "driver" | "police" | "protector" | "admin";

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  aadhaar_url: string | null;
  driving_license_url: string | null;
  vehicle_number: string | null;
  station_name: string | null;
  police_id: string | null;
  address: string | null;
  verification_status: "pending" | "verified" | "rejected";
  role: UserRole;
  email: string;
}

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, role: UserRole, metadata: Record<string, string>) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (authUser: SupabaseUser) => {
    const [{ data: profile }, { data: roleData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", authUser.id).single(),
      supabase.from("user_roles").select("role").eq("user_id", authUser.id).single(),
    ]);

    if (profile && roleData) {
      setUser({
        ...profile,
        role: roleData.role as UserRole,
        email: authUser.email || "",
      });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (supabaseUser) await fetchProfile(supabaseUser);
  }, [supabaseUser, fetchProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        // Defer profile fetch to avoid Supabase deadlock
        setTimeout(() => fetchProfile(session.user), 0);
      } else {
        setSupabaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const register = useCallback(async (email: string, password: string, role: UserRole, metadata: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: metadata.full_name, role },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };

    // Update profile with additional fields after signup
    const { data: { user: newUser } } = await supabase.auth.getUser();
    if (newUser) {
      const updateData: Record<string, string | null> = {};
      if (metadata.phone) updateData.phone = metadata.phone;
      if (metadata.city) updateData.city = metadata.city;
      if (metadata.date_of_birth) updateData.date_of_birth = metadata.date_of_birth;
      if (metadata.vehicle_number) updateData.vehicle_number = metadata.vehicle_number;
      if (metadata.station_name) updateData.station_name = metadata.station_name;
      if (metadata.police_id) updateData.police_id = metadata.police_id;
      if (metadata.address) updateData.address = metadata.address;

      if (Object.keys(updateData).length > 0) {
        await supabase.from("profiles").update(updateData).eq("user_id", newUser.id);
      }
    }

    return {};
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, supabaseUser, loading, login, register, logout, isAuthenticated: !!user, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
