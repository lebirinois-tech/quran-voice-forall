-- Create storage bucket for Mushaf pages
INSERT INTO storage.buckets (id, name, public)
VALUES ('mushaf-pages', 'mushaf-pages', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to Mushaf pages
CREATE POLICY "Public can view mushaf pages"
ON storage.objects
FOR SELECT
USING (bucket_id = 'mushaf-pages');

-- Allow service role to upload pages (for edge function)
CREATE POLICY "Service role can upload mushaf pages"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'mushaf-pages');