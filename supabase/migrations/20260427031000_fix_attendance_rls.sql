
-- Fix RLS for Attendance to allow Admins to see all on-duty responders
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;
CREATE POLICY "Admins can view all attendance" 
ON public.attendance FOR SELECT 
USING (public.has_role('admin', auth.uid()));

-- Also ensure everyone authenticated can see who is on duty if needed, 
-- but for now, at least Admins MUST see it.
-- We can also expand the existing policy to allow SELECT for admins
DROP POLICY IF EXISTS "Responders manage own attendance" ON public.attendance;
CREATE POLICY "Responders manage own attendance" 
ON public.attendance FOR ALL 
USING (auth.uid() = user_id OR public.has_role('admin', auth.uid()));
