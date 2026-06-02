-- Revoke SELECT on uploaded_by column from public roles to prevent uploader identity exposure
REVOKE SELECT (uploaded_by) ON public.audio_downloads FROM anon, authenticated, PUBLIC;