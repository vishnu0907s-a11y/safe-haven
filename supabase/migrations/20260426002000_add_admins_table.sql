-- 1. Create the dedicated admins table
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    admin_level TEXT DEFAULT 'standard',
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Deny public access, allow admins to see their own data
CREATE POLICY "Admins can view their own data" ON public.admins
    FOR SELECT USING (auth.uid() = user_id);

-- 2. Update the bulletproof trigger to handle Admin creation automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role public.app_role;
BEGIN
  -- Extract role
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'women'::public.app_role);

  -- Create profile
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.trigger_logs (user_id, error_message) VALUES (NEW.id, 'Profiles insert failed: ' || SQLERRM);
  END;

  -- Assign role
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.trigger_logs (user_id, error_message) VALUES (NEW.id, 'User roles insert failed: ' || SQLERRM);
  END;

  -- Populate role-specific tables safely
  BEGIN
    IF user_role = 'women' THEN
      INSERT INTO public.women (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    ELSIF user_role = 'police' THEN
      INSERT INTO public.police (user_id, badge_number, station_name) 
      VALUES (NEW.id, NEW.raw_user_meta_data->>'police_id', NEW.raw_user_meta_data->>'station_name') 
      ON CONFLICT DO NOTHING;
    ELSIF user_role = 'driver' THEN
      INSERT INTO public.driver (user_id, license_number, vehicle_number) 
      VALUES (NEW.id, NULL, NEW.raw_user_meta_data->>'vehicle_number') 
      ON CONFLICT DO NOTHING;
    ELSIF user_role = 'protector' THEN
      INSERT INTO public.protector (user_id, id_proof_type, id_proof_number, address) 
      VALUES (NEW.id, NULL, NULL, NEW.raw_user_meta_data->>'address') 
      ON CONFLICT DO NOTHING;
    ELSIF user_role = 'admin' THEN
      INSERT INTO public.admins (user_id, full_name, email, admin_level)
      VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email, 'standard')
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.trigger_logs (user_id, error_message) VALUES (NEW.id, 'Role table insert failed: ' || SQLERRM);
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
