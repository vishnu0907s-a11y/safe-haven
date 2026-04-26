-- Fix RLS Policies for Admin Management

-- 1. Ensure has_role function exists
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Add Update Policy for Admins on Profiles
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE USING (public.has_role('admin', auth.uid()));

-- 3. Add Delete Policy for Admins on Profiles
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
CREATE POLICY "Admins can delete any profile" ON public.profiles
FOR DELETE USING (public.has_role('admin', auth.uid()));

-- 4. Ensure admins can view all user roles (already exists but making sure)
DROP POLICY IF EXISTS "User roles viewable by authenticated" ON public.user_roles;
CREATE POLICY "User roles viewable by authenticated" ON public.user_roles 
FOR SELECT USING (auth.role() = 'authenticated');
