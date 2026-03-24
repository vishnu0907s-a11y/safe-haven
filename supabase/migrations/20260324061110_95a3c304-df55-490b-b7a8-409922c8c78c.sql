-- Enable realtime for emergency_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_alerts;

-- Allow responders (driver, police, protector) to update alerts (accept)
CREATE POLICY "Responders can accept alerts"
ON public.emergency_alerts
FOR UPDATE
TO authenticated
USING (
  status = 'active' AND (
    has_role(auth.uid(), 'driver') OR
    has_role(auth.uid(), 'police') OR
    has_role(auth.uid(), 'protector')
  )
)
WITH CHECK (
  status = 'active' AND (
    has_role(auth.uid(), 'driver') OR
    has_role(auth.uid(), 'police') OR
    has_role(auth.uid(), 'protector')
  )
);