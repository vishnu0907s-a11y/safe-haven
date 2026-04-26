-- 1. Fix RLS for rescue_records
-- Enable everyone to view records (needed for leaderboard)
DROP POLICY IF EXISTS "Parties can view rescue records" ON public.rescue_records;
CREATE POLICY "Anyone can view rescue records" ON public.rescue_records 
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow victims to insert records (when they resolve an alert)
DROP POLICY IF EXISTS "Victims can insert rescue records" ON public.rescue_records;
CREATE POLICY "Victims can insert rescue records" ON public.rescue_records 
FOR INSERT WITH CHECK (auth.uid() = victim_id);

-- Allow victims to update records (to give ratings)
DROP POLICY IF EXISTS "Victims can update rescue records" ON public.rescue_records;
CREATE POLICY "Victims can update rescue records" ON public.rescue_records 
FOR UPDATE USING (auth.uid() = victim_id);

-- 2. Leaderboard RPC
CREATE OR REPLACE FUNCTION public.get_leaderboard_stats(time_filter TEXT DEFAULT 'all-time')
RETURNS TABLE (
    responder_id UUID,
    full_name TEXT,
    role TEXT,
    avatar_url TEXT,
    total_rescues BIGINT,
    avg_response_time_ms DOUBLE PRECISION
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    -- Set time filter
    IF time_filter = 'weekly' THEN
        start_date := now() - interval '7 days';
    ELSIF time_filter = 'monthly' THEN
        start_date := now() - interval '30 days';
    ELSE
        start_date := '1970-01-01'::TIMESTAMPTZ;
    END IF;

    RETURN QUERY
    WITH stats AS (
        SELECT 
            rr.responder_id,
            COUNT(*) as total_rescues,
            AVG(EXTRACT(EPOCH FROM (rr.created_at - ea.created_at)) * 1000) as avg_response_time_ms
        FROM public.rescue_records rr
        JOIN public.emergency_alerts ea ON rr.alert_id = ea.id
        WHERE rr.created_at >= start_date
        GROUP BY rr.responder_id
    )
    SELECT 
        s.responder_id,
        p.full_name,
        COALESCE(ur.role::text, 'responder'),
        p.avatar_url,
        s.total_rescues,
        s.avg_response_time_ms
    FROM stats s
    JOIN public.profiles p ON s.responder_id = p.user_id
    LEFT JOIN public.user_roles ur ON s.responder_id = ur.user_id
    ORDER BY s.total_rescues DESC, s.avg_response_time_ms ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
