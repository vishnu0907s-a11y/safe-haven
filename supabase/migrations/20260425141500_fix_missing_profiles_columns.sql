-- Fix missing columns in profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Safe way to add verification_status if missing (using TEXT to avoid enum casting issues on existing tables)
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN verification_status TEXT DEFAULT 'pending';
EXCEPTION WHEN duplicate_column THEN
  -- Do nothing if it exists
END $$;
