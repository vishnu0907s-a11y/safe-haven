
-- Fix RLS for Super Admin Portal: Allow unauthenticated (anon) users to see user roles
-- This is necessary because the Super Admin login uses a custom vault verification 
-- instead of a standard Supabase Auth session.

DROP POLICY IF EXISTS "User roles viewable by authenticated" ON public.user_roles;
CREATE POLICY "User roles viewable by everyone" 
ON public.user_roles FOR SELECT 
USING (true);

-- Ensure profiles are also viewable (should already be true from previous migrations)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);
