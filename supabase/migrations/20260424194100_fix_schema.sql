-- Fix Public Schema Tables
-- Ensure profiles and user_roles exist in the public schema

CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    city TEXT,
    date_of_birth DATE,
    avatar_url TEXT,
    aadhaar_url TEXT,
    driving_license_url TEXT,
    vehicle_number TEXT,
    station_name TEXT,
    police_id TEXT,
    address TEXT,
    verification_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns if they don't exist (in case table already exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='city') THEN
        ALTER TABLE public.profiles ADD COLUMN city TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='date_of_birth') THEN
        ALTER TABLE public.profiles ADD COLUMN date_of_birth DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='aadhaar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN aadhaar_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='driving_license_url') THEN
        ALTER TABLE public.profiles ADD COLUMN driving_license_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='vehicle_number') THEN
        ALTER TABLE public.profiles ADD COLUMN vehicle_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='station_name') THEN
        ALTER TABLE public.profiles ADD COLUMN station_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='police_id') THEN
        ALTER TABLE public.profiles ADD COLUMN police_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='address') THEN
        ALTER TABLE public.profiles ADD COLUMN address TEXT;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    PRIMARY KEY (user_id, role)
);

-- Enable RLS for these tables if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
FOR SELECT USING (true);

-- Allow users to update their own profiles
CREATE POLICY "Users can update their own profiles" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Add policy for user_roles
CREATE POLICY "User roles are viewable by authenticated users" ON public.user_roles
FOR SELECT TO authenticated USING (true);

-- Grant usage to the public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
