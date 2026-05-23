-- Drop duplicate owner storage policies on audio-downloads bucket
DROP POLICY IF EXISTS "Owner can upload audio files" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update audio files" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete audio files" ON storage.objects;

-- Re-assert column-level revoke on audio_downloads.uploaded_by for public roles
REVOKE SELECT (uploaded_by) ON public.audio_downloads FROM anon, authenticated, PUBLIC;