-- 1. Create Role Enums (if not exists)
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('women', 'police', 'driver', 'protector', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Role Tables (if not exists)
CREATE TABLE IF NOT EXISTS public.women (user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE, aadhaar_url TEXT);
CREATE TABLE IF NOT EXISTS public.police (user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE, badge_number TEXT, station_name TEXT, aadhaar_url TEXT, police_id_url TEXT);
CREATE TABLE IF NOT EXISTS public.driver (user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE, license_number TEXT, vehicle_number TEXT, aadhaar_url TEXT, driving_license_url TEXT);
CREATE TABLE IF NOT EXISTS public.protector (user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE, id_proof_type TEXT, id_proof_number TEXT, aadhaar_url TEXT);

-- 3. Replace the handle_new_user Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role public.app_role;
BEGIN
  -- Extract role from metadata, default to 'women'
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'women'::public.app_role);

  -- Create profile
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

  -- Assign role in user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Populate role-specific tables (This is what routes data to women, police, driver tables!)
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

-- 4. Re-bind the Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
