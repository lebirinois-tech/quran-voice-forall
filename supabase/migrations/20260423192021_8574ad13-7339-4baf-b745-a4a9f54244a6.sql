-- Restrict write access to the audio-downloads storage bucket to the app owner only.
-- Public reads remain unchanged (bucket stays public for playback/download).

-- Drop any pre-existing owner policies (idempotent re-run safety)
DROP POLICY IF EXISTS "Owner can upload audio files" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update audio files" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete audio files" ON storage.objects;

-- INSERT: only the app owner can upload to audio-downloads
CREATE POLICY "Owner can upload audio files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-downloads'
  AND public.is_app_owner()
);

-- UPDATE: only the app owner can replace files in audio-downloads
CREATE POLICY "Owner can update audio files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audio-downloads'
  AND public.is_app_owner()
)
WITH CHECK (
  bucket_id = 'audio-downloads'
  AND public.is_app_owner()
);

-- DELETE: only the app owner can remove files from audio-downloads
CREATE POLICY "Owner can delete audio files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-downloads'
  AND public.is_app_owner()
);