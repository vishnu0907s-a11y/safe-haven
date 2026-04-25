-- Update handle_new_user to be more robust and auto-confirm emails
-- This migration ensures that all users are auto-confirmed and their profiles are created instantly.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Auto-confirm email for all users
  -- This allows them to log in immediately without verification.
  UPDATE auth.users 
  SET email_confirmed_at = now(),
      confirmed_at = now(),
      last_sign_in_at = now()
  WHERE id = NEW.id;

  -- 2. Insert into profiles with all metadata from raw_user_meta_data
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    phone, 
    city, 
    date_of_birth, 
    vehicle_number, 
    station_name, 
    police_id, 
    address,
    verification_status
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'city',
    CASE 
      WHEN NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL AND NEW.raw_user_meta_data->>'date_of_birth' <> ''
      THEN (NEW.raw_user_meta_data->>'date_of_birth')::DATE 
      ELSE NULL 
    END,
    NEW.raw_user_meta_data->>'vehicle_number',
    NEW.raw_user_meta_data->>'station_name',
    NEW.raw_user_meta_data->>'police_id',
    NEW.raw_user_meta_data->>'address',
    CASE 
      WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'verified'
      ELSE COALESCE(NEW.raw_user_meta_data->>'verification_status', 'pending')
    END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    city = EXCLUDED.city,
    date_of_birth = EXCLUDED.date_of_birth,
    vehicle_number = EXCLUDED.vehicle_number,
    station_name = EXCLUDED.station_name,
    police_id = EXCLUDED.police_id,
    address = EXCLUDED.address,
    verification_status = EXCLUDED.verification_status;
  
  -- 3. Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id, 
    COALESCE((NEW.raw_user_meta_data->>'role')::TEXT, 'women')::public.app_role
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
