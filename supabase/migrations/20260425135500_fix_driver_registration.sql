-- 1. Safely remove any NOT NULL constraints on role tables
-- This is often the cause of "Database error saving new user" when inserting metadata
ALTER TABLE public.driver ALTER COLUMN license_number DROP NOT NULL;
ALTER TABLE public.driver ALTER COLUMN vehicle_number DROP NOT NULL;
ALTER TABLE public.police ALTER COLUMN badge_number DROP NOT NULL;
ALTER TABLE public.police ALTER COLUMN station_name DROP NOT NULL;
ALTER TABLE public.protector ALTER COLUMN id_proof_type DROP NOT NULL;
ALTER TABLE public.protector ALTER COLUMN id_proof_number DROP NOT NULL;

-- Ensure protector has address column (since frontend sends it)
ALTER TABLE public.protector ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Update Trigger to match the EXACT metadata keys sent from LoginPage.tsx
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

  -- Populate role-specific tables
  -- Mapped strictly to LoginPage.tsx metadata keys
  IF user_role = 'women' THEN
    INSERT INTO public.women (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  
  ELSIF user_role = 'police' THEN
    INSERT INTO public.police (user_id, badge_number, station_name) 
    VALUES (NEW.id, NEW.raw_user_meta_data->>'police_id', NEW.raw_user_meta_data->>'station_name') 
    ON CONFLICT DO NOTHING;
  
  ELSIF user_role = 'driver' THEN
    INSERT INTO public.driver (user_id, license_number, vehicle_number) 
    -- UI does not send license_number text, only vehicle_number
    VALUES (NEW.id, NULL, NEW.raw_user_meta_data->>'vehicle_number') 
    ON CONFLICT DO NOTHING;
  
  ELSIF user_role = 'protector' THEN
    INSERT INTO public.protector (user_id, id_proof_type, id_proof_number, address) 
    -- UI sends address for protector
    VALUES (NEW.id, NULL, NULL, NEW.raw_user_meta_data->>'address') 
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Re-bind trigger just to be safe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
