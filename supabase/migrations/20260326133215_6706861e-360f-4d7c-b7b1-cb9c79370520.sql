
-- Emergency contacts table
CREATE TABLE public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" ON public.emergency_contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON public.emergency_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.emergency_contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.emergency_contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Danger zones / hotspots table
CREATE TABLE public.danger_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_meters int NOT NULL DEFAULT 500,
  risk_level text NOT NULL DEFAULT 'medium',
  incident_count int NOT NULL DEFAULT 1,
  last_incident_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.danger_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view danger zones" ON public.danger_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage danger zones" ON public.danger_zones FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Rescue records table (for ratings & points)
CREATE TABLE public.rescue_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL,
  victim_id uuid NOT NULL,
  responder_id uuid NOT NULL,
  points_awarded numeric NOT NULL DEFAULT 0,
  rating int CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rescue_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rescue records" ON public.rescue_records FOR SELECT TO authenticated USING (auth.uid() = responder_id OR auth.uid() = victim_id);
CREATE POLICY "System can insert rescue records" ON public.rescue_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = victim_id);
CREATE POLICY "Victims can rate" ON public.rescue_records FOR UPDATE TO authenticated USING (auth.uid() = victim_id);
CREATE POLICY "Admins can view all rescue records" ON public.rescue_records FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for danger_zones
ALTER PUBLICATION supabase_realtime ADD TABLE public.danger_zones;
