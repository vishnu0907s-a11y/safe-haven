
-- Create videos storage bucket for emergency recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', false);

-- RLS: Users can upload their own videos
CREATE POLICY "Users can upload own videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Users can view own videos
CREATE POLICY "Users can view own videos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: Admins can view all videos
CREATE POLICY "Admins can view all videos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'));

-- Users CANNOT delete videos (no DELETE policy)
