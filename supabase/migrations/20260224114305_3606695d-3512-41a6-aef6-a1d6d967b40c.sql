
-- Create storage bucket for audio downloads
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-downloads', 'audio-downloads', true);

-- Allow public read access
CREATE POLICY "Public read access for audio downloads"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-downloads');

-- Allow authenticated users to upload (admin)
CREATE POLICY "Auth users can upload audio downloads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-downloads' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete their uploads
CREATE POLICY "Auth users can delete audio downloads"
ON storage.objects FOR DELETE
USING (bucket_id = 'audio-downloads' AND auth.uid() IS NOT NULL);

-- Create audio_downloads table for metadata
CREATE TABLE public.audio_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'recitation',
  file_url TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audio_downloads ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Anyone can view audio downloads"
ON public.audio_downloads FOR SELECT
USING (true);

-- Only authenticated users can insert
CREATE POLICY "Auth users can insert audio downloads"
ON public.audio_downloads FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only uploader can update
CREATE POLICY "Uploaders can update their audio downloads"
ON public.audio_downloads FOR UPDATE
USING (auth.uid() = uploaded_by);

-- Only uploader can delete
CREATE POLICY "Uploaders can delete their audio downloads"
ON public.audio_downloads FOR DELETE
USING (auth.uid() = uploaded_by);

-- Timestamp trigger
CREATE TRIGGER update_audio_downloads_updated_at
BEFORE UPDATE ON public.audio_downloads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
