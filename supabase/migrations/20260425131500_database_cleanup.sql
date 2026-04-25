-- ==========================================
-- DATABASE CLEANUP SCRIPT
-- Removes redundant and unused tables
-- ==========================================

-- 1. Drop redundant tables (Role-based data is in specific singular tables like 'driver' or 'police')
DROP TABLE IF EXISTS public.admins CASCADE;
DROP TABLE IF EXISTS public.drivers CASCADE;
DROP TABLE IF EXISTS public.users CASCADE; -- We use 'profiles' and 'auth.users'

-- 2. Drop duplicate feature tables
DROP TABLE IF EXISTS public.sos_alerts CASCADE; -- We use 'emergency_alerts'

-- 3. Drop unused/placeholder tables
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE; -- 'documents' is a storage bucket, not a table
