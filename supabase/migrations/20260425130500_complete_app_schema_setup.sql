-- ==========================================
-- MASTER SCHEMA SETUP FOR RESQHER
-- This script creates all missing tables, 
-- storage buckets, and RLS policies.
-- ==========================================

-- 1. ENUMS AND TYPES
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'women', 'police', 'driver', 'protector');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. CORE TABLES
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    city TEXT,
    date_of_birth DATE,
    vehicle_number TEXT,
    station_name TEXT,
    avatar_url TEXT,
    verification_status public.verification_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role)
);

-- 3. FEATURE TABLES
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    status TEXT DEFAULT 'active',
    accepted_by UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evidence_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ DEFAULT now(),
    checked_out_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS public.rescue_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES public.emergency_alerts(id) ON DELETE CASCADE,
    responder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    victim_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    points_awarded DECIMAL DEFAULT 0,
    status TEXT DEFAULT 'completed',
    rating INTEGER,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.danger_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER DEFAULT 500,
    severity_level TEXT DEFAULT 'medium',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ROLE SPECIFIC TABLES (For additional metadata if needed)
CREATE TABLE IF NOT EXISTS public.women (user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS public.police (user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE, badge_number TEXT, station_name TEXT);
CREATE TABLE IF NOT EXISTS public.driver (user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE, license_number TEXT, vehicle_number TEXT);
CREATE TABLE IF NOT EXISTS public.protector (user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE, id_proof_type TEXT, id_proof_number TEXT);

-- 5. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('videos', 'videos', true) 
ON CONFLICT (id) DO NOTHING;

-- 6. RLS POLICIES (ENABLE RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescue_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.danger_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- 7. DEFINE POLICIES

-- Profiles: Users can view all, but only edit their own
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User Roles: Viewable by authenticated, editable by service_role (or trigger)
DROP POLICY IF EXISTS "User roles viewable by authenticated" ON public.user_roles;
CREATE POLICY "User roles viewable by authenticated" ON public.user_roles FOR SELECT USING (auth.role() = 'authenticated');

-- Emergency Alerts: Authenticated can insert, all authenticated can view
DROP POLICY IF EXISTS "Authenticated can create alerts" ON public.emergency_alerts;
CREATE POLICY "Authenticated can create alerts" ON public.emergency_alerts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can view alerts" ON public.emergency_alerts;
CREATE POLICY "Authenticated can view alerts" ON public.emergency_alerts FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Responders can update alerts" ON public.emergency_alerts;
CREATE POLICY "Responders can update alerts" ON public.emergency_alerts FOR UPDATE USING (auth.role() = 'authenticated');

-- Emergency Contacts: Users can only see/edit their own
DROP POLICY IF EXISTS "Users can manage own contacts" ON public.emergency_contacts;
CREATE POLICY "Users can manage own contacts" ON public.emergency_contacts FOR ALL USING (auth.uid() = user_id);

-- Evidence Videos: Users can only see/edit their own
DROP POLICY IF EXISTS "Users can manage own videos" ON public.evidence_videos;
CREATE POLICY "Users can manage own videos" ON public.evidence_videos FOR ALL USING (auth.uid() = user_id);

-- Attendance: Responders manage own attendance
DROP POLICY IF EXISTS "Responders manage own attendance" ON public.attendance;
CREATE POLICY "Responders manage own attendance" ON public.attendance FOR ALL USING (auth.uid() = user_id);

-- Rescue Records: Relevant parties can view
DROP POLICY IF EXISTS "Parties can view rescue records" ON public.rescue_records;
CREATE POLICY "Parties can view rescue records" ON public.rescue_records FOR SELECT USING (auth.role() = 'authenticated');

-- 8. AUTH TRIGGER (AUTO-CONFIRM AND SYNC)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role public.app_role;
BEGIN
  -- 2. Extract role from metadata
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'women'::public.app_role);

  -- 3. Create profile
  INSERT INTO public.profiles (user_id, full_name, phone, city, verification_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    CASE WHEN user_role = 'admin' THEN 'verified'::public.verification_status ELSE 'pending'::public.verification_status END
  )
  ON CONFLICT (user_id) DO UPDATE 
  SET full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      city = EXCLUDED.city,
      verification_status = EXCLUDED.verification_status;

  -- 4. Assign role in user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 5. Populate role-specific tables
  IF user_role = 'women' THEN
    INSERT INTO public.women (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSIF user_role = 'police' THEN
    INSERT INTO public.police (user_id, badge_number, station_name) 
    VALUES (NEW.id, NEW.raw_user_meta_data->>'badge_number', NEW.raw_user_meta_data->>'station_name') 
    ON CONFLICT DO NOTHING;
  ELSIF user_role = 'driver' THEN
    INSERT INTO public.driver (user_id, license_number, vehicle_number) 
    VALUES (NEW.id, NEW.raw_user_meta_data->>'license_number', NEW.raw_user_meta_data->>'vehicle_number') 
    ON CONFLICT DO NOTHING;
  ELSIF user_role = 'protector' THEN
    INSERT INTO public.protector (user_id, id_proof_type, id_proof_number) 
    VALUES (NEW.id, NEW.raw_user_meta_data->>'id_proof_type', NEW.raw_user_meta_data->>'id_proof_number') 
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. STORAGE POLICIES
-- Policies for 'videos' bucket
DROP POLICY IF EXISTS "Allow public read access for videos" ON storage.objects;
CREATE POLICY "Allow public read access for videos" ON storage.objects FOR SELECT USING (bucket_id = 'videos');

DROP POLICY IF EXISTS "Allow authenticated uploads for videos" ON storage.objects;
CREATE POLICY "Allow authenticated uploads for videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

-- Policies for 'documents' bucket
DROP POLICY IF EXISTS "Allow public read access for documents" ON storage.objects;
CREATE POLICY "Allow public read access for documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow authenticated uploads for documents" ON storage.objects;
CREATE POLICY "Allow authenticated uploads for documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
