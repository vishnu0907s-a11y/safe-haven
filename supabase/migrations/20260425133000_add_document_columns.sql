-- Add document URL columns to profiles table so the frontend update doesn't crash
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aadhaar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS driving_license_url TEXT;

-- Ensure documents bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true) 
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for documents bucket
DROP POLICY IF EXISTS "Allow authenticated uploads to documents" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to documents" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow public read from documents" ON storage.objects;
CREATE POLICY "Allow public read from documents" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'documents');
