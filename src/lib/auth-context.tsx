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
    setLoading(true);
    try {
      console.log("Fetching profile and roles for:", authUser.id);
      
      const { data: profile, error: pErr } = await supabase.from("profiles").select("*").eq("user_id", authUser.id).maybeSingle();
      if (pErr) console.error("Profile fetch error:", pErr);
      
      const { data: roleData, error: rErr } = await supabase.from("user_roles").select("role").eq("user_id", authUser.id).maybeSingle();
      if (rErr) console.error("Role fetch error:", rErr);

      console.log("Profile and role data fetched:", { profile, roleData });

      // Merge data: Prefer database profile, then auth metadata, then defaults
      setUser({
        id: profile?.id || authUser.id,
        user_id: authUser.id,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || "User",
        email: authUser.email!,
        phone: profile?.phone || authUser.user_metadata?.phone || null,
        city: profile?.city || authUser.user_metadata?.city || null,
        role: (roleData?.role as any) || (authUser.user_metadata?.role as any) || "women",
        verification_status: (profile?.verification_status as any) || "pending",
        avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
        aadhaar_url: profile?.aadhaar_url || authUser.user_metadata?.aadhaar_url || null,
        driving_license_url: profile?.driving_license_url || authUser.user_metadata?.driving_license_url || null,
        vehicle_number: profile?.vehicle_number || authUser.user_metadata?.vehicle_number || null,
        station_name: profile?.station_name || authUser.user_metadata?.station_name || null,
        police_id: profile?.police_id || authUser.user_metadata?.police_id || null,
        address: profile?.address || authUser.user_metadata?.address || null,
        date_of_birth: profile?.date_of_birth || authUser.user_metadata?.date_of_birth || null,
        created_at: profile?.created_at || new Date().toISOString(),
        updated_at: profile?.updated_at || new Date().toISOString(),
      } as UserProfile);

    } catch (err) {
      console.error("fetchProfile error:", err);
      // Minimal fallback to avoid infinite loading screen
      setUser({
        id: authUser.id,
        user_id: authUser.id,
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || "User",
        email: authUser.email!,
        role: (authUser.user_metadata?.role as any) || "women",
        verification_status: "pending",
        phone: authUser.user_metadata?.phone || null,
        city: authUser.user_metadata?.city || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.id);
      if (session?.user) {
        setSupabaseUser(session.user);
        fetchProfile(session.user);
      } else {
        setSupabaseUser(null);
        setUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Safety timeout increased and only fires if we're still loading
    const timer = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn("Auth loading safety timeout fired");
          return false;
        }
        return prev;
      });
    }, 10000);

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
        data: { ...metadata, role },
        emailRedirectTo: window.location.origin,
      },
    });
    
    if (error) return { error: error.message };

    const newUser = data.user;
    if (newUser) {
      console.log("New user created in Auth:", newUser.id);
    }
    
    return { user: data.user, session: data.session };
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, supabaseUser, loading, login, register, logout, isAuthenticated: !!supabaseUser, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
