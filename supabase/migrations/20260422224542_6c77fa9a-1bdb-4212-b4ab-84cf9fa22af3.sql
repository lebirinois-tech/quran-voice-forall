-- 1) Lock down mushaf-pages bucket: remove permissive INSERT policy applied to public role.
-- The bucket is written to ONLY by the download-mushaf-pages edge function using the service role,
-- which bypasses RLS. No client-side INSERT is needed.
DROP POLICY IF EXISTS "Service role can upload mushaf pages" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload mushaf pages" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload mushaf pages" ON storage.objects;

-- Also remove any permissive update/delete policies on mushaf-pages, if present.
DROP POLICY IF EXISTS "Service role can update mushaf pages" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete mushaf pages" ON storage.objects;

-- 2) Tighten audio_downloads DELETE/UPDATE: require allowed_uploaders membership AND ownership.
DROP POLICY IF EXISTS "Uploaders can delete their audio downloads" ON public.audio_downloads;
DROP POLICY IF EXISTS "Uploaders can update their audio downloads" ON public.audio_downloads;

CREATE POLICY "Allowed uploaders can delete their audio downloads"
ON public.audio_downloads
FOR DELETE
TO authenticated
USING (
  auth.uid() = uploaded_by
  AND EXISTS (SELECT 1 FROM public.allowed_uploaders WHERE user_id = auth.uid())
);

CREATE POLICY "Allowed uploaders can update their audio downloads"
ON public.audio_downloads
FOR UPDATE
TO authenticated
USING (
  auth.uid() = uploaded_by
  AND EXISTS (SELECT 1 FROM public.allowed_uploaders WHERE user_id = auth.uid())
)
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (SELECT 1 FROM public.allowed_uploaders WHERE user_id = auth.uid())
);

-- 3) Tighten storage object DELETE/UPDATE on audio-downloads: also require allowed_uploaders membership.
DROP POLICY IF EXISTS "Uploaders can delete their own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Uploaders can update their own audio files" ON storage.objects;

CREATE POLICY "Allowed uploaders can delete their own audio files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-downloads'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.allowed_uploaders WHERE user_id = auth.uid())
);

CREATE POLICY "Allowed uploaders can update their own audio files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audio-downloads'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (SELECT 1 FROM public.allowed_uploaders WHERE user_id = auth.uid())
);