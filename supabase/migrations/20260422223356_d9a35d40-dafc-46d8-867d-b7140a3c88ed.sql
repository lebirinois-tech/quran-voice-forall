
-- 1. Create allowed_uploaders table for server-side authorization gate
CREATE TABLE IF NOT EXISTS public.allowed_uploaders (
  user_id uuid PRIMARY KEY,
  granted_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.allowed_uploaders ENABLE ROW LEVEL SECURITY;

-- Users can check whether THEY are allowed (needed so RLS policies that join can be evaluated client-side too)
CREATE POLICY "Users can view their own allowed_uploaders entry"
ON public.allowed_uploaders
FOR SELECT
USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies = only service role (edge functions) can write

-- 2. Tighten audio_downloads INSERT policy: require allowed_uploaders membership AND owner = self
DROP POLICY IF EXISTS "Auth users can insert audio downloads" ON public.audio_downloads;

CREATE POLICY "Allowed uploaders can insert audio downloads"
ON public.audio_downloads
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (SELECT 1 FROM public.allowed_uploaders WHERE user_id = auth.uid())
);

-- 3. Fix overly permissive storage policies for audio-downloads bucket
DROP POLICY IF EXISTS "Auth users can upload audio downloads" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete audio downloads" ON storage.objects;

-- Require uploads to be inside the user's own folder (path starts with their uid) AND user is in allowed_uploaders
CREATE POLICY "Allowed uploaders can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-downloads'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.allowed_uploaders WHERE user_id = auth.uid())
);

-- Owners (folder path) can delete their own files
CREATE POLICY "Uploaders can delete their own audio files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-downloads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Owners can update their own files (metadata)
CREATE POLICY "Uploaders can update their own audio files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audio-downloads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Restrict listing of audio-downloads bucket: keep SELECT for individual file fetches, 
-- but to limit broad listing, replace public SELECT with a narrower policy (still public read of files,
-- since this is a public library). We keep public SELECT because the audio library is intentionally public.
-- The "public_bucket_allows_listing" warning is acceptable for this use case (public audio library).
