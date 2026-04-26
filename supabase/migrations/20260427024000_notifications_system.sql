
-- 1. Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('alert', 'complaint', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true); 

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- 4. TRIGGER: Notify Responders on New SOS
CREATE OR REPLACE FUNCTION public.notify_responders_on_sos()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT user_id, '🚨 NEW SOS ALERT', 'A new emergency alert has been raised! Help is needed.', 'alert'
    FROM public.user_roles
    WHERE role IN ('driver', 'police', 'protector');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_responders ON public.emergency_alerts;
CREATE TRIGGER trigger_notify_responders
AFTER INSERT ON public.emergency_alerts
FOR EACH ROW EXECUTE FUNCTION public.notify_responders_on_sos();

-- 5. TRIGGER: Notify Victim on Rescue Acceptance
CREATE OR REPLACE FUNCTION public.notify_victim_on_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.accepted_by IS DISTINCT FROM NEW.accepted_by AND array_length(NEW.accepted_by, 1) > coalesce(array_length(OLD.accepted_by, 1), 0)) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (NEW.user_id, '✅ RESCUE ACCEPTED', 'A responder is coming to help you! Stay calm.', 'alert');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_victim ON public.emergency_alerts;
CREATE TRIGGER trigger_notify_victim
AFTER UPDATE ON public.emergency_alerts
FOR EACH ROW EXECUTE FUNCTION public.notify_victim_on_acceptance();

-- 6. TRIGGER: Notify User on Complaint Resolution
CREATE OR REPLACE FUNCTION public.notify_user_on_complaint_resolve()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status = 'open' AND NEW.status = 'resolved') THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (NEW.user_id, '✅ COMPLAINT RESOLVED', 'Your complaint "' || NEW.title || '" has been resolved by Admin.', 'complaint');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_complaint_resolve ON public.complaints;
CREATE TRIGGER trigger_notify_complaint_resolve
AFTER UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.notify_user_on_complaint_resolve();
