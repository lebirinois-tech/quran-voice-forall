
-- Create a security definer function to check if the current user is the app owner
CREATE OR REPLACE FUNCTION public.is_app_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) = 'lebirinois@gmail.com'
  );
$$;

-- Ensure the owner is in allowed_uploaders (in case they sign in)
INSERT INTO public.allowed_uploaders (user_id)
SELECT id FROM auth.users WHERE lower(email) = 'lebirinois@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- ===== audio_downloads table: restrict to owner only =====
DROP POLICY IF EXISTS "Allowed uploaders can insert audio downloads" ON public.audio_downloads;
DROP POLICY IF EXISTS "Allowed uploaders can update their audio downloads" ON public.audio_downloads;
DROP POLICY IF EXISTS "Allowed uploaders can delete their audio downloads" ON public.audio_downloads;

CREATE POLICY "Only owner can insert audio downloads"
ON public.audio_downloads
FOR INSERT
TO authenticated
WITH CHECK (public.is_app_owner() AND auth.uid() = uploaded_by);

CREATE POLICY "Only owner can update audio downloads"
ON public.audio_downloads
FOR UPDATE
TO authenticated
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

CREATE POLICY "Only owner can delete audio downloads"
ON public.audio_downloads
FOR DELETE
TO authenticated
USING (public.is_app_owner());

-- ===== Storage bucket audio-downloads: restrict writes to owner only =====
DROP POLICY IF EXISTS "Allowed uploaders can upload audio files" ON storage.objects;
DROP POLICY IF EXISTS "Allowed uploaders can update audio files" ON storage.objects;
DROP POLICY IF EXISTS "Allowed uploaders can delete audio files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own audio files" ON storage.objects;

CREATE POLICY "Only owner can upload audio files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-downloads' AND public.is_app_owner());

CREATE POLICY "Only owner can update audio files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'audio-downloads' AND public.is_app_owner())
WITH CHECK (bucket_id = 'audio-downloads' AND public.is_app_owner());

CREATE POLICY "Only owner can delete audio files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'audio-downloads' AND public.is_app_owner());
