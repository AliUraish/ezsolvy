-- Create storage buckets for EzSolvy
-- Run this after initial Supabase setup

-- Source files bucket (user uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('source-files', 'source-files', false)
ON CONFLICT (id) DO NOTHING;

-- Derived files bucket (OCR results, layout data)
INSERT INTO storage.buckets (id, name, public)
VALUES ('derived', 'derived', false)
ON CONFLICT (id) DO NOTHING;

-- Assets bucket (diagrams, images from NanoBanana)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Exports bucket (generated PDFs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for source-files
CREATE POLICY "Users can upload to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'source-files' AND
  (storage.foldername(name))[1] = ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id'))
);

CREATE POLICY "Users can read their org files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'source-files' AND
  (storage.foldername(name))[1] = ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id'))
);

CREATE POLICY "Users can delete their org files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'source-files' AND
  (storage.foldername(name))[1] = ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id'))
);

-- Storage policies for derived
CREATE POLICY "Service role can insert derived files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'derived');

CREATE POLICY "Users can read their org derived files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'derived' AND
  (storage.foldername(name))[1] = ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id'))
);

-- Storage policies for assets (public)
CREATE POLICY "Assets are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

CREATE POLICY "Service role can insert assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assets');

-- Storage policies for exports
CREATE POLICY "Service role can insert exports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'exports');

CREATE POLICY "Users can read their org exports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exports' AND
  (storage.foldername(name))[1] = ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id'))
);

