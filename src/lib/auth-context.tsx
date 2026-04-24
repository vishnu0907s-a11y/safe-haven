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
    try {
      const [{ data: profile }, { data: roleData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", authUser.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", authUser.id).maybeSingle(),
      ]);

      if (profile) {
        const userRole = (roleData?.role || authUser.user_metadata?.role || "women") as UserRole;
        setUser({
          ...profile,
          role: userRole,
          email: authUser.email || "",
        });
      } else {
        const userRole = (roleData?.role || authUser.user_metadata?.role || "women") as UserRole;
        setUser({
          user_id: authUser.id,
          full_name: authUser.user_metadata?.full_name || "User",
          role: userRole,
          email: authUser.email || "",
          verification_status: "pending" as const
        } as any);
      }
    } catch (err) {
      console.error("fetchProfile error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        await fetchProfile(session.user);
      } else {
        setSupabaseUser(null);
        setUser(null);
        setLoading(false);
      }
    });

    // Safety timeout to prevent infinite loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Login Error Details:", error);
      return { error: error.message };
    }
    return {};
  }, []);

  const refreshProfile = useCallback(async () => {
    if (supabaseUser) await fetchProfile(supabaseUser);
  }, [supabaseUser, fetchProfile]);

  const register = useCallback(async (email: string, password: string, role: UserRole, metadata: Record<string, string>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: metadata.full_name, role },
        emailRedirectTo: window.location.origin,
      },
    });
    
    if (error) return { error: error.message };

    const newUser = data.user;
    if (newUser) {
      console.log("New user created in Auth:", newUser.id);
      // FORCE sync to tables
      const { error: pErr } = await supabase.from("profiles").upsert({
        user_id: newUser.id,
        full_name: metadata.full_name || 'User',
        phone: metadata.phone || null,
        city: metadata.city || null,
        date_of_birth: metadata.date_of_birth || null,
        vehicle_number: metadata.vehicle_number || null,
        station_name: metadata.station_name || null,
        police_id: metadata.police_id || null,
        address: metadata.address || null,
        verification_status: (role === 'admin' ? 'verified' : (metadata.verification_status || 'pending')) as "pending" | "verified" | "rejected"
      } as any, { onConflict: 'user_id' });

      if (pErr) {
        console.error("Profile sync error:", pErr);
        return { error: "Failed to create database profile: " + pErr.message };
      }

      const { error: rErr } = await supabase.from("user_roles").upsert({
        user_id: newUser.id,
        role: role
      }, { onConflict: 'user_id' });

      if (rErr) {
        console.error("Role sync error:", rErr);
        return { error: "Failed to assign user role: " + rErr.message };
      }
      
      console.log("Database sync successful for role:", role);
      // Refresh to ensure session has the profile
      await fetchProfile(newUser);
    }
    
    return {};
  }, [fetchProfile]);

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
