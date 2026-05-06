REVOKE SELECT (uploaded_by) ON public.audio_downloads FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_audio_uploader(_audio_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uploaded_by FROM public.audio_downloads
  WHERE id = _audio_id AND public.is_app_owner();
$$;